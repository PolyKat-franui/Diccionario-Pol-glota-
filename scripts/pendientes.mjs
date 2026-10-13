// Lista los conceptos de un mega tema que aún no tienen traducción en todos los idiomas.
// Uso: node scripts/pendientes.mjs "Comida y bebida" [desde] [cantidad]
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTsv, splitMulti } from './tsv.mjs';

const BANCO = join(dirname(fileURLToPath(import.meta.url)), '..', 'banco');
const IDIOMAS = ['es', 'pt', 'fr', 'it', 'de'];
const [mega, desde = 0, cantidad = 100000] = process.argv.slice(2);

const hechos = IDIOMAS.map((l) => new Set(readTsv(join(BANCO, 'traducciones', `${l}.tsv`)).filter((r) => r.texto).map((r) => r.id)));
const pendientes = readTsv(join(BANCO, 'conceptos.tsv'))
  .filter((c) => !mega || splitMulti(c.mega_tema).includes(mega))
  .filter((c) => hechos.some((h) => !h.has(c.id)));
console.error(`${pendientes.length} pendientes${mega ? ` en «${mega}»` : ''}`);
for (const c of pendientes.slice(Number(desde), Number(desde) + Number(cantidad))) console.log(`${c.id}\t${c.palabra}\t${c.tipo}\t${c.tema}`);
