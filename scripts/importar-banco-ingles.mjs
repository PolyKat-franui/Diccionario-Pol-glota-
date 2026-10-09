// Importa el banco de inglés de Francisca (banco_palabras_ingles.tsv) al formato del repo.
// Columnas esperadas: palabra, tipo, mega_tema, tema, nivel, rango_1000, fuentes.
// Conserva los ids que ya existen (misma palabra + tipo) para no perder progreso ni traducciones.
// Uso: node scripts/importar-banco-ingles.mjs ruta/a/banco_palabras_ingles.tsv
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTsv, writeTsv } from './tsv.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error('Uso: node scripts/importar-banco-ingles.mjs ruta/a/banco_palabras_ingles.tsv');
  process.exit(1);
}

const conceptosPath = join(ROOT, 'banco', 'conceptos.tsv');
const enPath = join(ROOT, 'banco', 'traducciones', 'en.tsv');
const key = (r) => `${r.palabra.toLowerCase()}|${r.tipo.toLowerCase()}`;

const previos = existsSync(conceptosPath) ? readTsv(conceptosPath) : [];
const idPorClave = new Map(previos.map((c) => [key(c), c.id]));
const ipaPrevio = new Map((existsSync(enPath) ? readTsv(enPath) : []).map((r) => [r.id, r.ipa]));
let siguiente = previos.reduce((max, c) => Math.max(max, Number(c.id.slice(2)) || 0), 0) + 1;

const nuevos = readTsv(src);
const faltan = ['palabra', 'tipo', 'mega_tema'].filter((c) => !(c in (nuevos[0] ?? {})));
if (faltan.length) {
  console.error(`Faltan columnas: ${faltan.join(', ')}`);
  process.exit(1);
}

const vistos = new Set();
const conceptos = [];
for (const r of nuevos) {
  if (!r.palabra) continue;
  const k = key(r);
  if (vistos.has(k)) { console.warn(`Repetida (se omite): ${r.palabra} [${r.tipo}]`); continue; }
  vistos.add(k);
  const id = idPorClave.get(k) ?? `en${String(siguiente++).padStart(4, '0')}`;
  conceptos.push({ ...r, id });
}

writeTsv(conceptosPath, ['id', 'palabra', 'tipo', 'mega_tema', 'tema', 'nivel', 'rango_1000', 'fuentes'], conceptos);
writeTsv(enPath, ['id', 'texto', 'ipa', 'estado', 'fuente'],
  conceptos.map((c) => ({ id: c.id, texto: c.palabra, ipa: ipaPrevio.get(c.id) ?? '', estado: 'revisada', fuente: 'banco_ingles' })));
console.log(`✓ ${conceptos.length} conceptos importados. Ahora: node scripts/build-banco.mjs`);
