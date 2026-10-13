// Íconos de la app instalable (pantalla de inicio): la sakura pixel art al centro, sobre carmesí (paleta Higo).
//   app/assets/app/icono-192.png · icono-512.png      (ícono normal)
//   app/assets/app/icono-maskable-512.png             (Android recorta en círculo/gota: la flor va más chica)
//   app/assets/app/apple-touch-icon.png (180)         (iPhone / iPad)
//   app/assets/app/favicon-32.png                     (pestaña del navegador)
// La sakura (23×23) se dibuja siempre a escala entera para que los pixeles no se deformen.
// Uso: node scripts/iconos-app.mjs   (también corre con npm run build)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { sakura } from './arte-iconos.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(RAIZ, 'app', 'assets', 'app');
export const CARMESI = '#9E2A3A';     // --primary de Higo
const CARMESI_LUZ = '#B8384A';        // centro un poco más claro (halo suave detrás de la flor)

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// ---------- PNG mínimo (RGB, sin dependencias) ----------
const TABLA_CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xFFFFFFFF; for (const b of buf) c = TABLA_CRC[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function bloque(tipo, datos) {
  const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
  const td = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([largo, td, crc]);
}
export function png(ancho, alto, pixel) {
  const crudo = Buffer.alloc((ancho * 3 + 1) * alto);
  for (let y = 0; y < alto; y++) {
    crudo[y * (ancho * 3 + 1)] = 0;
    for (let x = 0; x < ancho; x++) crudo.set(pixel(x, y), y * (ancho * 3 + 1) + 1 + x * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0); ihdr.writeUInt32BE(alto, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloque('IHDR', ihdr), bloque('IDAT', deflateSync(crudo, { level: 9 })), bloque('IEND', Buffer.alloc(0))]);
}

/** Ícono cuadrado de `lado` px con la sakura a escala entera `k`, centrada. */
export function icono(lado, k, { halo = true } = {}) {
  const { filas, colores } = sakura();
  const n = filas.length;
  const x0 = Math.floor((lado - n * k) / 2), y0 = Math.floor((lado - n * k) / 2);
  const fondo = rgb(CARMESI), luz = rgb(CARMESI_LUZ);
  const radioHalo = n * k * 0.56;
  return png(lado, lado, (x, y) => {
    const fx = Math.floor((x - x0) / k), fy = Math.floor((y - y0) / k);
    const ch = fy >= 0 && fy < n && fx >= 0 && fx < n ? filas[fy][fx] : '.';
    if (ch !== '.' && colores[ch]) return rgb(colores[ch]);
    // halo escalonado (en pasos de k px, para que combine con el pixel art)
    if (halo) {
      const cx = Math.floor((x - lado / 2) / k) * k, cy = Math.floor((y - lado / 2) / k) * k;
      if (Math.hypot(cx, cy) < radioHalo) return luz;
    }
    return fondo;
  });
}

export const ICONOS_APP = {
  'icono-192.png': () => icono(192, 6),            // 138 px de flor
  'icono-512.png': () => icono(512, 16),           // 368 px
  'icono-maskable-512.png': () => icono(512, 11),  // 253 px: cabe en la zona segura (círculo del 80 %)
  'apple-touch-icon.png': () => icono(180, 6),
  'favicon-32.png': () => icono(32, 1, { halo: false }),
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(OUT, { recursive: true });
  for (const [nombre, f] of Object.entries(ICONOS_APP)) writeFileSync(join(OUT, nombre), f());
  console.log(`✓ ${Object.keys(ICONOS_APP).length} íconos de la app en app/assets/app/`);
}
