// Convierte el banco (TSV) en los JSON que usa la app.
//   banco/conceptos.tsv              -> app/data/banco/conceptos.json
//   banco/traducciones/<idioma>.tsv  -> app/data/banco/<idioma>.json
//   banco/ejemplos/<idioma>.tsv      -> app/data/banco/ej-<idioma>.json
// Valida: ids únicos, traducciones con concepto existente, estado válido.
// Uso: node scripts/build-banco.mjs [--check]   (--check valida sin escribir)
import { readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTsv, splitMulti } from './tsv.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BANCO = join(ROOT, 'banco');
const OUT = join(ROOT, 'app', 'data', 'banco');
const ESTADOS = new Set(['borrador', 'revisada']);
const checkOnly = process.argv.includes('--check');

const errors = [];
const conceptos = readTsv(join(BANCO, 'conceptos.tsv'));
const ids = new Set();
for (const c of conceptos) {
  if (!c.id) errors.push(`conceptos.tsv:${c._line} sin id`);
  if (ids.has(c.id)) errors.push(`conceptos.tsv:${c._line} id repetido ${c.id}`);
  ids.add(c.id);
  if (!c.mega_tema) errors.push(`conceptos.tsv:${c._line} sin mega_tema`);
}

// Formato compacto: [id, tipos[], mega_temas[], temas[], rango_1000 (0 = sin rango), nivel]
const conceptosJson = conceptos.map((c) => [
  c.id, splitMulti(c.tipo), splitMulti(c.mega_tema), splitMulti(c.tema), Number(c.rango_1000) || 0, c.nivel || '',
]);

const idiomas = {};
const reporte = [];
for (const file of readdirSync(join(BANCO, 'traducciones')).filter((f) => f.endsWith('.tsv')).sort()) {
  const lang = file.replace('.tsv', '');
  const rows = readTsv(join(BANCO, 'traducciones', file));
  const seen = new Set();
  const out = {};
  let revisadas = 0;
  for (const r of rows) {
    const where = `traducciones/${file}:${r._line}`;
    if (!ids.has(r.id)) errors.push(`${where} id ${r.id} no existe en conceptos.tsv`);
    if (seen.has(r.id)) errors.push(`${where} id repetido ${r.id}`);
    if (!ESTADOS.has(r.estado)) errors.push(`${where} estado "${r.estado}" (usa borrador o revisada)`);
    if (!r.texto) continue; // fila sin traducir todavía
    seen.add(r.id);
    if (r.estado === 'revisada') revisadas++;
    // [texto, ipa, 1 si es borrador]
    out[r.id] = r.estado === 'revisada' ? [r.texto, r.ipa] : [r.texto, r.ipa, 1];
  }
  idiomas[lang] = out;
  const total = Object.keys(out).length;
  reporte.push(`${lang}: ${total}/${conceptos.length} traducidas, ${revisadas} revisadas, ${total - revisadas} borrador`);
}

// Ejemplos: banco/ejemplos/<idioma>.tsv (id, ejemplo, nota, estado, fuente)
// -> app/data/banco/ej-<idioma>.json  { id: [ejemplo, nota, 1 si es borrador] }
// La palabra de la tarjeta va marcada con *asteriscos* una sola vez.
const ejemplos = {};
const dirEj = join(BANCO, 'ejemplos');
if (existsSync(dirEj)) {
  for (const file of readdirSync(dirEj).filter((f) => f.endsWith('.tsv')).sort()) {
    const lang = file.replace('.tsv', '');
    const out = {};
    for (const r of readTsv(join(dirEj, file))) {
      const where = `ejemplos/${file}:${r._line}`;
      if (!ids.has(r.id)) errors.push(`${where} id ${r.id} no existe en conceptos.tsv`);
      if (out[r.id]) errors.push(`${where} id repetido ${r.id}`);
      if (!ESTADOS.has(r.estado)) errors.push(`${where} estado "${r.estado}" (usa borrador o revisada)`);
      if (!r.ejemplo) continue;
      if ((r.ejemplo.match(/\*/g) || []).length !== 2) errors.push(`${where} el ejemplo debe marcar la palabra con *…* una vez`);
      out[r.id] = r.estado === 'revisada' ? [r.ejemplo, r.nota || ''] : [r.ejemplo, r.nota || '', 1];
    }
    ejemplos[lang] = out;
    reporte.push(`${lang}: ${Object.keys(out).length} ejemplos`);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} error(es) en el banco:\n  ` + errors.slice(0, 50).join('\n  '));
  process.exit(1);
}

console.log(`✓ Banco válido: ${conceptos.length} conceptos\n  ` + reporte.join('\n  '));
if (!checkOnly) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'conceptos.json'), JSON.stringify(conceptosJson));
  for (const [lang, data] of Object.entries(idiomas)) writeFileSync(join(OUT, `${lang}.json`), JSON.stringify(data));
  for (const [lang, data] of Object.entries(ejemplos)) writeFileSync(join(OUT, `ej-${lang}.json`), JSON.stringify(data));
  console.log(`  → escrito en app/data/banco/`);
}
