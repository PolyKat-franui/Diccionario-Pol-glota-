// Agrega traducciones (hechas por IA) al banco, marcadas como borrador.
// Entrada: archivo con líneas "id|es|pt|fr|it|de" (una por concepto).
// No pisa traducciones ya revisadas por una persona.
// Uso: node scripts/agregar-traducciones.mjs archivo.txt
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTsv, writeTsv } from './tsv.mjs';

const BANCO = join(dirname(fileURLToPath(import.meta.url)), '..', 'banco');
const IDIOMAS = ['es', 'pt', 'fr', 'it', 'de'];
const archivo = process.argv[2];
if (!archivo || !existsSync(archivo)) { console.error('Uso: node scripts/agregar-traducciones.mjs archivo.txt'); process.exit(1); }

const ids = new Set(readTsv(join(BANCO, 'conceptos.tsv')).map((c) => c.id));
const errores = [];
const nuevas = {};
readFileSync(archivo, 'utf8').split(/\r?\n/).forEach((linea, i) => {
  if (!linea.trim()) return;
  const partes = linea.split('|').map((p) => p.trim());
  if (partes.length !== 6) return errores.push(`línea ${i + 1}: ${partes.length} campos (se esperan 6): ${linea}`);
  if (!ids.has(partes[0])) return errores.push(`línea ${i + 1}: id desconocido ${partes[0]}`);
  if (partes.slice(1).some((p) => !p || /\t/.test(p))) return errores.push(`línea ${i + 1}: traducción vacía o con tabulación`);
  if (nuevas[partes[0]]) return errores.push(`línea ${i + 1}: id repetido ${partes[0]}`);
  nuevas[partes[0]] = partes.slice(1);
});
if (errores.length) { console.error(errores.join('\n')); process.exit(1); }

const H = ['id', 'texto', 'ipa', 'estado', 'fuente'];
let agregadas = 0, protegidas = 0;
IDIOMAS.forEach((l, k) => {
  const ruta = join(BANCO, 'traducciones', `${l}.tsv`);
  const filas = new Map(readTsv(ruta).map((r) => [r.id, r]));
  for (const [id, textos] of Object.entries(nuevas)) {
    if (filas.get(id)?.estado === 'revisada') { protegidas++; continue; }
    filas.set(id, { id, texto: textos[k], ipa: filas.get(id)?.ipa ?? '', estado: 'borrador', fuente: 'ia' });
    agregadas++;
  }
  writeTsv(ruta, H, [...filas.values()].sort((a, b) => a.id.localeCompare(b.id)));
});
console.log(`✓ ${Object.keys(nuevas).length} conceptos (${agregadas} traducciones) agregados como borrador${protegidas ? `, ${protegidas} revisadas sin tocar` : ''}`);
