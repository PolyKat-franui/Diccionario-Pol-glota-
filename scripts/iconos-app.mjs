// Íconos de la app instalable (pantalla de inicio): una sakura grande en curvas, sobre carmesí con halo.
// (Dentro de la app la sakura sigue siendo pixel art; afuera el ícono se ve suave y nítido a cualquier tamaño.)
//   app/assets/app/icono-192.png · icono-512.png      (ícono normal)
//   app/assets/app/icono-maskable-512.png             (Android recorta en círculo/gota: la flor va más chica)
//   app/assets/app/apple-touch-icon.png (180)         (iPhone / iPad)
//   app/assets/app/favicon-32.png                     (pestaña del navegador)
// Uso: node scripts/iconos-app.mjs   (también corre con npm run build)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(RAIZ, 'app', 'assets', 'app');
export const CARMESI = '#9E2A3A';     // --primary de Higo

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

// ---------- Sakura en curvas (vector calculado a mano, con suavizado) ----------
// Coordenadas en unidades del ícono (0..1, centro 0.5). `escala` agranda todo (1 = cabe en la zona segura del 80 %).
const mezclar = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
const C = {
  fondoCentro: rgb('#C7344B'), fondoBorde: rgb('#8A1F31'), halo: rgb('#E2566C'),
  petaloPunta: rgb('#FFF1F5'), petaloBase: rgb('#F59AB5'), borde: rgb('#E57C9C'),
  centro: rgb('#F6C453'), estambre: rgb('#B8324F'), antera: rgb('#FFD873'),
};
function colorSakura(px, py, escala) {
  const dx = (px - 0.5) / escala, dy = (py - 0.5) / escala;
  const r = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  // fondo: carmesí brillante al centro, más profundo en los bordes, con un halo suave detrás de la flor
  let col = mezclar(C.fondoCentro, C.fondoBorde, Math.hypot(px - 0.5, py - 0.5) / 0.7);
  col = mezclar(col, C.halo, (1 - r / 0.46) * 0.55);
  // 5 pétalos (elipses con muesca en la punta); uno apunta hacia arriba
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    const u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a);
    const e = ((u - 0.215) / 0.19) ** 2 + (v / 0.135) ** 2;
    const muesca = u > 0.355 + Math.abs(v) * 1.5; // muesca en «V» de la flor de cerezo
    if (e <= 1 && !muesca) {
      let p = mezclar(C.petaloBase, C.petaloPunta, (u - 0.05) / 0.25);
      if (e > 0.82) p = mezclar(p, C.borde, (e - 0.82) / 0.18 * 0.7); // borde suave
      col = p;
    }
  }
  // estambres finos y centro dorado (como la moneda)
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5 + Math.PI / 10;
    const u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a);
    if (u > 0 && u < 0.115 && Math.abs(v) < 0.006) col = C.estambre;
    if (Math.hypot(u - 0.12, v) < 0.016) col = C.antera;
  }
  if (r < 0.05) col = mezclar(C.centro, C.antera, 1 - r / 0.05);
  void ang;
  return col;
}

/** Ícono cuadrado de `lado` px con la sakura en curvas; 4×4 muestras por pixel para bordes suaves. */
export function icono(lado, escala = 1) {
  const N = 4;
  return png(lado, lado, (x, y) => {
    const suma = [0, 0, 0];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const c = colorSakura((x + (i + 0.5) / N) / lado, (y + (j + 0.5) / N) / lado, escala);
      suma[0] += c[0]; suma[1] += c[1]; suma[2] += c[2];
    }
    return suma.map((v) => Math.round(v / (N * N)));
  });
}

export const ICONOS_APP = {
  'icono-192.png': () => icono(192, 1.06),           // la flor ocupa casi todo el ícono
  'icono-512.png': () => icono(512, 1.06),
  'icono-maskable-512.png': () => icono(512, 1),     // cabe en la zona segura (círculo del 80 %)
  'apple-touch-icon.png': () => icono(180, 1.06),
  'favicon-32.png': () => icono(32, 1.2),
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(OUT, { recursive: true });
  for (const [nombre, f] of Object.entries(ICONOS_APP)) writeFileSync(join(OUT, nombre), f());
  console.log(`✓ ${Object.keys(ICONOS_APP).length} íconos de la app en app/assets/app/`);
}
