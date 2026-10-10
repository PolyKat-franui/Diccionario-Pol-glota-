// Pixel art de Franui: bien formado, al día y siempre mostrado sin deformar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COLORES, cara, EXPRESIONES } from '../scripts/kitty-arte.mjs';
import { ICONOS } from '../scripts/arte-iconos.mjs';
import { archivos } from '../scripts/kitty.mjs';

const R = (p) => new URL(`../${p}`, import.meta.url);
const leer = (p) => readFileSync(R(p), 'utf8');

const dibujos = {
  ...Object.fromEntries(Object.keys(EXPRESIONES).map((k) => [`cara:${k}`, { filas: cara(k), colores: COLORES }])),
  ...Object.fromEntries(Object.entries(ICONOS).map(([k, f]) => [k, f()])),
};

test('Kitty son sus 14 expresiones', () => {
  assert.equal(Object.keys(EXPRESIONES).length, 14);
  assert.ok(EXPRESIONES.feliz, 'la cara feliz es el logo');
});

for (const [nombre, { filas, colores }] of Object.entries(dibujos)) {
  test(`pixel art bien formado: ${nombre}`, () => {
    assert.ok(filas.every((f) => f.length === filas[0].length), 'todas las filas del mismo ancho');
    const desconocidos = [...new Set(filas.join(''))].filter((ch) => ch !== '.' && !colores[ch]);
    assert.deepEqual(desconocidos, [], 'solo colores definidos');
  });
}

test('la sakura y la estrella son simétricas', () => {
  // en la estrella se ignoran las caras claras/oscuras y el brillo (son asimétricos a propósito)
  for (const f of [...ICONOS.sakura().filas, ...ICONOS.estrella().filas]) {
    const forma = f.replace(/[Dh]/g, 'Y');
    assert.equal(forma, [...forma].reverse().join(''));
  }
});

test('los archivos de app/assets están al día (si falla: node scripts/kitty.mjs)', () => {
  for (const [ruta, contenido] of Object.entries(archivos())) assert.equal(leer(`app/assets/${ruta}`), contenido, ruta);
});

// ---------- que no se deformen: cada <img> a escala entera de su tamaño real ----------
const tamano = (svg) => { const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/); return [Number(m[1]), Number(m[2])]; };
function assetDe(src) {
  if (/cara\(|caras\//.test(src)) return 'caras/feliz.svg';
  const m = src.match(/assets\/([\w-]+\.svg)/);
  return m ? m[1] : null;
}
for (const archivo of ['app/index.html', 'app/js/main.js', 'web/index.html', 'web/web.js']) {
  test(`imágenes a escala entera: ${archivo}`, () => {
    const imgs = [...leer(archivo).matchAll(/<img[^>]*?src="([^"]+)"[^>]*?width="(\d+)" height="(\d+)"/g)];
    assert.ok(imgs.length > 0);
    for (const [, src, w, h] of imgs) {
      const asset = assetDe(src);
      if (!asset) continue;
      const [aw, ah] = tamano(leer(`app/assets/${asset}`));
      const k = Number(w) / aw;
      assert.ok(Number.isInteger(k) && Number(h) === ah * k, `${src}: ${w}×${h} no es múltiplo entero de ${aw}×${ah}`);
    }
  });
}
