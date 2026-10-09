// Accesibilidad: contraste mínimo 4,5:1 en el texto (WCAG AA), en modo claro y oscuro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/css/tokens.css', import.meta.url), 'utf8');
const bloque = (selector) => {
  const i = css.indexOf(selector);
  const fin = css.indexOf('}', i);
  return Object.fromEntries([...css.slice(i, fin).matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
};
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const claro = bloque(':root {');
const oscuro = { ...claro, ...bloque(':root[data-theme="dark"] {') };
const paletas = {
  champagne: { ...claro, ...bloque(':root[data-paleta="champagne"]') },
  lavanda: { ...claro, ...bloque(':root[data-paleta="lavanda"]') },
};

for (const [nombre, p] of Object.entries({ claro, oscuro, ...paletas })) {
  test(`contraste ≥ 4,5:1 — ${nombre}`, () => {
    const pares = [['ink', 'bg'], ['ink', 'surface'], ['ink', 'surface-2'], ['ink-soft', 'bg'], ['ink-soft', 'surface'],
      ['on-primary', 'primary'], ['primary', 'surface'],
      ...['d-nueva', 'd-dificil', 'd-media', 'd-facil', 'd-dominada'].map((d) => [d, 'surface'])];
    for (const [a, b] of pares) {
      const c = contraste(p[a], p[b]);
      assert.ok(c >= 4.5, `${a} sobre ${b}: ${c.toFixed(2)}:1`);
    }
  });
}
