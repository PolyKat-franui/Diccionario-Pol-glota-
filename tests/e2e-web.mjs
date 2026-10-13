// Prueba de punta a punta de la página web (Playwright + Chromium).
// Uso: NODE_PATH=$(npm root -g) node tests/e2e-web.mjs [carpeta-capturas]
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { servir } from '../scripts/servir.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const CAPTURAS = process.argv[2] || 'capturas-e2e';
mkdirSync(CAPTURAS, { recursive: true });
const PUERTO = 5198;
const URL_WEB = `http://localhost:${PUERTO}/`;
const server = await servir(PUERTO);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errores = [];
let pasos = 0;
const paso = (m) => console.log(`  ✓ ${++pasos}. ${m}`);

async function pagina(viewport, extra = {}) {
  const ctx = await browser.newContext({ viewport, locale: 'es-CL', ...extra });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|net::ERR/.test(m.text())) errores.push(`console: ${m.text()}`); });
  return { ctx, page };
}
/** Todas las imágenes visibles cargaron (sin archivos faltantes). */
const imagenesCargadas = async (page, donde) => {
  const rotas = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
  assert.deepEqual(rotas, [], `${donde}: imágenes que no cargan`);
};
const sinScrollHorizontal = async (page, donde) => {
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.ok(sw <= iw, `${donde}: scroll horizontal (${sw} > ${iw})`);
};
// Baja por toda la página para disparar las animaciones de aparición.
const recorrer = async (page) => {
  const alto = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < alto; y += 500) { await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y); await page.waitForTimeout(120); }
  await page.waitForTimeout(1200);
};

try {
  for (const [nombre, viewport, extra] of [
    ['celular', { width: 390, height: 844 }, { isMobile: true, hasTouch: true }],
    ['tablet', { width: 820, height: 1180 }, {}],
    ['computador', { width: 1440, height: 900 }, {}],
  ]) {
    const { ctx, page } = await pagina(viewport, extra);
    await page.goto(URL_WEB);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${CAPTURAS}/web-${nombre}-portada.png` });
    await sinScrollHorizontal(page, nombre);
    await recorrer(page);
    await sinScrollHorizontal(page, `${nombre} (al final)`);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${CAPTURAS}/web-${nombre}-completa.png`, fullPage: true });
    paso(`Formato ${nombre}: sin scroll horizontal`);

    if (nombre === 'celular') {
      await page.locator('#menu-btn').click();
      await page.locator('#menu-movil a', { hasText: 'Creadora' }).click();
      assert.equal(await page.locator('#menu-movil').isHidden(), true);
      paso('Menú del celular abre y lleva a la sección');
    }
    await ctx.close();
  }

  const { ctx, page } = await pagina({ width: 1440, height: 900 });
  await page.goto(URL_WEB);
  assert.equal(await page.locator('.nav-links a').count(), 7);
  await recorrer(page);

  assert.equal(await page.locator('#lista-idiomas .idioma').count(), 12);
  assert.match(await page.locator('#lista-idiomas .idioma.nuevo').innerText(), /Alemán[\s\S]*Nuevo/);
  assert.match(await page.locator('#lista-idiomas .idioma.proximamente').first().innerText(), /Próximamente/);
  paso('Idiomas leídos del mismo archivo que la app (alemán Nuevo, otros Próximamente)');

  assert.ok(await page.locator('#lista-novedades .hito').count() >= 1);
  assert.match(await page.locator('#lista-novedades').innerText(), /Primera versión de prueba/);
  paso('Novedades compartidas con la app');

  const flaps = await page.locator('.flap').evaluateAll((els) => els.map((e) => e.textContent));
  assert.deepEqual(flaps, ['5000', '6', '13', '10']);
  paso('Cifras reales con efecto de tablero (5000 · 6 · 13 · 10)');

  await page.locator('#manifiesto').scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollBy({ top: 400, behavior: 'instant' }));
  await page.waitForTimeout(700);
  const encendidas = await page.locator('#manifiesto span.on').count();
  assert.ok(encendidas > 10, `manifiesto: ${encendidas} palabras encendidas`);
  paso('Manifiesto se enciende al hacer scroll');

  await page.locator('#kitty-fab').click();
  await page.locator('#kitty-preguntas button', { hasText: '¿Qué idiomas tiene?' }).click();
  await page.locator('.msg-kitty', { hasText: 'alemán' }).waitFor();
  await page.screenshot({ path: `${CAPTURAS}/web-kitty.png` });
  await page.locator('#kitty-cerrar').click();
  paso('Kitty responde preguntas frecuentes');

  assert.equal(await page.locator('#caras-galeria img').count(), 14);
  await page.locator('#caras-galeria').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.locator('.kitty-seccion').screenshot({ path: `${CAPTURAS}/web-kitty-expresiones.png` });
  await imagenesCargadas(page, 'web');
  paso('Galería con las 14 expresiones de Kitty; todas las imágenes cargan');

  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('.hero-cta a', { hasText: 'Empezar ahora' }).click();
  await page.waitForURL(/\/app\/#\/inicio/);
  await page.getByRole('button', { name: 'Continuar sin cuenta' }).waitFor();
  paso('"Empezar ahora" abre la app');
  await ctx.close();

  const { ctx: c2, page: p2 } = await pagina({ width: 390, height: 844 }, { colorScheme: 'dark' });
  await p2.goto(URL_WEB);
  await p2.waitForTimeout(1500);
  await p2.screenshot({ path: `${CAPTURAS}/web-celular-oscuro.png` });
  await c2.close();
  paso('Modo oscuro según el sistema');

  assert.deepEqual(errores, [], 'errores en la consola');
  paso('Sin errores de JavaScript');
  console.log(`\n✓ ${pasos} pasos OK (web). Capturas en ${CAPTURAS}/`);
} catch (e) {
  console.error('\n✗ Falló:', e.message, errores.length ? `\n${errores.join('\n')}` : '');
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
