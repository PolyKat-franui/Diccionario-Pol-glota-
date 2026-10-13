// Servidor local mínimo: la web en "/" y la app en "/app/".
// Uso: node scripts/servir.mjs [puerto]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(RAIZ, 'web');
const APP = join(RAIZ, 'app');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

/** "/app/x" → app/x ; "/x" → web/x. Devuelve null si intenta salir de la carpeta. */
export function resolver(ruta) {
  const enApp = ruta === '/app' || ruta.startsWith('/app/');
  const base = enApp ? APP : WEB;
  let resto = enApp ? ruta.slice(4) || '/' : ruta;
  if (resto.endsWith('/')) resto += 'index.html';
  const archivo = normalize(join(base, resto));
  return archivo.startsWith(base) ? archivo : null;
}

export function servir(puerto = 5173) {
  const server = createServer(async (req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (ruta === '/app') { res.writeHead(301, { Location: '/app/' }).end(); return; }
    const archivo = resolver(ruta);
    if (!archivo) { res.writeHead(403).end(); return; }
    try {
      const data = await readFile(archivo);
      res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    } catch {
      res.writeHead(404).end('No encontrado');
    }
  });
  return new Promise((ok) => server.listen(puerto, () => ok(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const puerto = Number(process.argv[2]) || 5173;
  await servir(puerto);
  console.log(`Web:  http://localhost:${puerto}/\nApp:  http://localhost:${puerto}/app/\n(Ctrl+C para salir)`);
}
