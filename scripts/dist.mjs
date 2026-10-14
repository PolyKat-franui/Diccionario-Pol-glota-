// Arma la carpeta dist/ lista para publicar: web en la raíz y app en /app.
// Si sitio.json dice "pausado": true, publica solo la pantalla «Volvemos pronto» (web y app),
// y un service worker que limpia la app instalada. El código de la app no se toca.
import { rmSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const sitio = () => JSON.parse(readFileSync(join(RAIZ, 'sitio.json'), 'utf8'));

/** Copia la pantalla de pausa (con sus estilos e imágenes) en `destino`. */
function pantallaPausa(destino, legal = 'legal/') {
  mkdirSync(join(destino, 'css'), { recursive: true });
  mkdirSync(join(destino, 'assets', 'caras'), { recursive: true });
  mkdirSync(join(destino, 'assets', 'app'), { recursive: true });
  writeFileSync(join(destino, 'index.html'), readFileSync(join(RAIZ, 'pausa', 'index.html'), 'utf8').replaceAll('LEGAL/', legal));
  for (const f of ['tokens.css', 'logo.css']) cpSync(join(RAIZ, 'app', 'css', f), join(destino, 'css', f));
  cpSync(join(RAIZ, 'app', 'assets', 'caras', 'con_sueno.svg'), join(destino, 'assets', 'caras', 'con_sueno.svg'));
  cpSync(join(RAIZ, 'app', 'assets', 'app', 'favicon-32.png'), join(destino, 'assets', 'app', 'favicon-32.png'));
}

export function armar(destino = join(RAIZ, 'dist'), { pausado = sitio().pausado } = {}) {
  rmSync(destino, { recursive: true, force: true });
  if (pausado) {
    pantallaPausa(destino);
    pantallaPausa(join(destino, 'app'), '../legal/');
    cpSync(join(RAIZ, 'pausa', 'sw.js'), join(destino, 'app', 'sw.js'));
    cpSync(join(RAIZ, 'web', 'legal'), join(destino, 'legal'), { recursive: true }); // los textos legales siguen visibles
    return 'pausa';
  }
  cpSync(join(RAIZ, 'web'), destino, { recursive: true });
  cpSync(join(RAIZ, 'app'), join(destino, 'app'), { recursive: true });
  return 'completo';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const modo = armar();
  console.log(modo === 'pausa'
    ? '⏸ dist/ en PAUSA: web y app muestran «Volvemos pronto» (sitio.json → "pausado": false para reactivar)'
    : '✓ dist/ listo para publicar (web en /, app en /app/)');
}
