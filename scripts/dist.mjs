// Arma la carpeta dist/ lista para publicar: web en la raíz y app en /app.
import { rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');
rmSync(DIST, { recursive: true, force: true });
cpSync(join(RAIZ, 'web'), DIST, { recursive: true });
cpSync(join(RAIZ, 'app'), join(DIST, 'app'), { recursive: true });
console.log('✓ dist/ listo para publicar (web en /, app en /app/)');
