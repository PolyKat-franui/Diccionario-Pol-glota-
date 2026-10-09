// Servidor local mínimo para probar la app: node scripts/servir.mjs [puerto]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

export function servir(puerto = 5173) {
  const server = createServer(async (req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const archivo = normalize(join(RAIZ, ruta.endsWith('/') ? ruta + 'index.html' : ruta));
    if (!archivo.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
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
  console.log(`Franui en http://localhost:${puerto}  (Ctrl+C para salir)`);
}
