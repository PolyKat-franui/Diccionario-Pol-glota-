// Prueba de punta a punta en Chromium (Playwright): recorre la app como una persona.
// Uso: NODE_PATH=$(npm root -g) node tests/e2e.mjs [carpeta-capturas]
//      (o instala playwright en el proyecto: npm i -D playwright)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { servir } from '../scripts/servir.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const CAPTURAS = process.argv[2] || 'capturas-e2e';
mkdirSync(CAPTURAS, { recursive: true });

const PUERTO = 5199;
const URL_APP = `http://localhost:${PUERTO}/app/`;
const server = await servir(PUERTO);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errores = [];
let pasos = 0;
const paso = (msg) => console.log(`  ✓ ${++pasos}. ${msg}`);

let ultimaPagina = null; // para guardar una captura si algo falla
async function nuevaPagina(viewport, extra = {}) {
  const ctx = await browser.newContext({ viewport, locale: 'es-CL', ...extra });
  const page = await ctx.newPage();
  ultimaPagina = page;
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_TUNNEL|net::ERR/.test(m.text())) errores.push(`console: ${m.text()}`);
  });
  return { ctx, page };
}
const foto = (page, nombre) => page.screenshot({ path: `${CAPTURAS}/${nombre}.png` });
const tokens = (page) => page.locator('#chip-tokens span:last-child').innerText().then(Number);
/** Todas las imágenes visibles cargaron (sin archivos faltantes). */
const imagenesCargadas = async (page, donde) => {
  const rotas = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
  assert.deepEqual(rotas, [], `${donde}: imágenes que no cargan`);
};
const sinScrollHorizontal = async (page, donde) => {
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.ok(sw <= iw, `${donde}: hay scroll horizontal (${sw} > ${iw})`);
};

try {
  // ---------------- Celular ----------------
  const { ctx, page } = await nuevaPagina({ width: 390, height: 844 }, { isMobile: true, hasTouch: true });
  await page.goto(URL_APP);
  await page.waitForURL(/#\/inicio/);
  await page.getByRole('button', { name: 'Continuar sin cuenta' }).waitFor();
  await foto(page, '01-celular-inicio');
  await sinScrollHorizontal(page, 'inicio');
  paso('Inicio: entrar, crear cuenta, Google e invitado');

  await page.locator('[name=usuario]').fill('Fran');
  await page.locator('[name=clave]').fill('123');
  await page.locator('#btn-login').click();
  assert.match(await page.locator('#login-error').innerText(), /6 caracteres/);
  paso('Contraseña de menos de 6 caracteres → aviso');

  await page.getByRole('button', { name: 'Continuar sin cuenta' }).click();
  await page.waitForURL(/#\/idiomas/);
  await page.locator('.idioma').first().waitFor();
  assert.equal(await page.locator('.idioma[data-code=es]').count(), 0, 'el idioma nativo no debe aparecer para aprender');
  assert.match(await page.locator('.idioma[data-code=de]').innerText(), /Nuevo/);
  assert.equal(await page.locator('.idioma[data-code=ja]').getAttribute('aria-disabled'), 'true');
  await foto(page, '02-celular-idiomas');
  await sinScrollHorizontal(page, 'idiomas');
  paso('Idiomas: alemán "Nuevo", japonés "Próximamente" bloqueado');

  await page.locator('.idioma[data-code=en]').click();
  await page.waitForURL(/#\/aprender/);
  await page.locator('.mega').first().waitFor();
  assert.equal(await page.locator('.mega').count(), 13);
  const conv = page.locator('.mega', { hasText: 'Conversación y vida social' });
  assert.match(await conv.innerText(), /269 tarjetas/);
  await page.waitForTimeout(1200); // termina la animación de entrada
  await foto(page, '03-celular-temas');
  await sinScrollHorizontal(page, 'temas');
  paso('13 mega temas; Conversación y vida social con 269 tarjetas');

  await conv.click();
  await page.waitForURL(/#\/tema\//);
  await page.locator('.tema').first().waitFor();
  await page.locator('#difs [data-dif=facil]').click();
  assert.equal(await page.locator('#difs [data-dif=facil]').getAttribute('aria-checked'), 'true');
  await page.locator('#difs [data-dif=todas]').click();
  await foto(page, '04-celular-tema');
  paso('Tema: dificultad y bloques');

  await page.locator('#btn-empezar').click();
  await page.waitForURL(/#\/estudiar/);
  const primera = page.locator('#feed .slide').first();
  await primera.locator('.palabra').waitFor();
  const totalInicial = await page.locator('#feed .slide:not(.fin)').count();
  assert.equal(totalInicial, 10);
  assert.match(await primera.locator('.nivel').innerText(), /Nueva/);
  await foto(page, '05-celular-tarjeta');
  await sinScrollHorizontal(page, 'tarjeta');
  paso('Sesión de 10 tarjetas, ícono "Nueva" con texto');

  await primera.locator('.revelar').click();
  await page.waitForTimeout(500);
  assert.ok(await primera.evaluate((el) => el.classList.contains('revelada')));
  await primera.locator('.btn-fav').click();
  assert.equal(await primera.locator('.btn-fav').getAttribute('aria-pressed'), 'true');
  await foto(page, '06-celular-tarjeta-revelada');
  paso('Tocar revela la traducción; corazón guarda en favoritos');

  await primera.locator('.btn-sabe').click();
  await page.waitForFunction(() => document.querySelector('#chip-tokens span:last-child').textContent === '1');
  assert.match(await primera.locator('.nivel').innerText(), /Media/);
  assert.equal(await page.locator('#chip-racha span').innerText(), '1');
  assert.ok(await page.locator('#chip-tokens .moneda').evaluate((m) => m.classList.contains('gira')), 'la moneda gira al ganar tokens');
  await imagenesCargadas(page, 'tarjeta');
  paso('"Lo sé" → +1 Kitty token (la moneda gira), nivel "Media", racha 1');

  await page.waitForTimeout(900);
  const segunda = page.locator('#feed .slide').nth(1);
  await segunda.locator('.btn-repasar').click();
  await page.waitForFunction(() => document.querySelector('#chip-tokens span:last-child').textContent === '2');
  assert.equal(await page.locator('#feed .slide:not(.fin)').count(), totalInicial + 1, 'la fallada debe volver a salir');
  assert.match(await segunda.locator('.nivel').innerText(), /Difícil/);
  paso('"Repasar" → nivel "Difícil" y la tarjeta vuelve a salir en la sesión');

  // Deslizar hasta el final sin marcar el resto (cuenta como "repasar")
  for (let i = 0; i < 40 && !(await page.locator('#slide-fin .fin-card').count()); i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(450);
  }
  await page.locator('#slide-fin .fin-card').waitFor();
  const finTokens = await tokens(page);
  const respondidas = await page.locator('#feed .slide[data-r]').count();
  assert.equal(finTokens, respondidas + 5, 'tokens = 1 por tarjeta + 5 por la sesión');
  await page.waitForTimeout(800);
  await foto(page, '07-celular-fin-sesion');
  assert.match(await page.locator('#slide-fin .cara-grande').getAttribute('src'), /caras\/(celebrando|muy_feliz)\.svg/);
  await imagenesCargadas(page, 'fin de sesión');
  paso(`Fin de sesión: ${respondidas} tarjetas, ${finTokens} Kitty tokens, Kitty celebra`);

  await page.reload();
  await page.waitForFunction((n) => document.querySelector('#chip-tokens span:last-child')?.textContent === String(n), finTokens);
  assert.ok(!page.url().includes('#/inicio'), 'la cuenta solo se pide la primera vez');
  await page.goto(URL_APP);
  await page.waitForURL(/#\/aprender/);
  paso('Recargar la página: el progreso no se pierde y no se vuelve a pedir la cuenta');

  await page.goto(`${URL_APP}#/favoritos`);
  await page.locator('.fila-fav').first().waitFor();
  assert.equal(await page.locator('.fila-fav').count(), 1);
  await foto(page, '08-celular-favoritos');
  paso('Favoritos muestra la palabra con corazón');

  await page.goto(`${URL_APP}#/aprender`);
  await page.locator('#kitty-fab').click();
  await page.locator('#kitty-input').fill('gracias');
  await page.locator('#kitty-input').press('Enter');
  await page.locator('.msg-kitty', { hasText: 'thank' }).first().waitFor();
  await page.waitForTimeout(500);
  await foto(page, '09-celular-kitty');
  assert.equal(await page.locator('#kitty-msgs .msg-fila .msg-cara').first().getAttribute('src'), 'assets/caras/muy_feliz.svg');
  assert.equal(await page.locator('#kitty-cara').getAttribute('src'), 'assets/caras/feliz.svg');
  await page.locator('#kitty-input').fill('zzqqxx');
  await page.locator('#kitty-input').press('Enter');
  await page.waitForFunction(() => document.querySelector('#kitty-cara').getAttribute('src').includes('confundida'));
  await imagenesCargadas(page, 'chat de Kitty');
  await page.locator('#kitty-cerrar').click();
  paso('Kitty encuentra «gracias» → «thank you» y cambia de cara (feliz / confundida)');

  await page.goto(`${URL_APP}#/ajustes`);
  await page.locator('[data-tema=oscuro]').click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await foto(page, '10-celular-ajustes-oscuro');
  await page.goto(`${URL_APP}#/estudiar?mega=${encodeURIComponent('Conversación y vida social')}&dif=todas`);
  await page.locator('#feed .slide .palabra').first().waitFor();
  await foto(page, '11-celular-tarjeta-oscuro');
  paso('Modo oscuro');

  await page.goto(`${URL_APP}#/ranking`);
  await page.locator('.ranking').waitFor();
  await foto(page, '12-celular-ranking');
  await page.goto(`${URL_APP}#/conservar?demo=1`);
  await page.locator('.opcion').first().waitFor();
  assert.match(await page.locator('.opcion').first().innerText(), /240 tokens/);
  await foto(page, '13-celular-conservar');
  paso('Ranking y "¿Qué avance conservo?" (demo)');

  await page.goto(`${URL_APP}#/ajustes`);
  await page.locator('#sel-nativo').selectOption('en');
  await page.locator('.tabbar a', { hasText: 'Learn' }).waitFor();
  await page.goto(`${URL_APP}#/aprender`);
  await page.getByRole('heading', { name: 'What do you want to learn?' }).waitFor(); // inglés ya no puede ser el idioma a aprender
  await page.locator('.idioma[data-code=es]').click();
  await page.locator('.mega', { hasText: 'Conversation & social life' }).waitFor();
  paso('Idioma nativo inglés: interfaz en inglés y se aprende español');
  await ctx.close();

  // ---------------- Tablet y computador ----------------
  for (const [nombre, viewport] of [['tablet', { width: 820, height: 1180 }], ['computador', { width: 1440, height: 900 }]]) {
    const { ctx: c, page: p } = await nuevaPagina(viewport);
    await p.goto(URL_APP);
    await p.getByRole('button', { name: 'Continuar sin cuenta' }).click();
    await p.locator('.idioma[data-code=fr]').click();
    await p.locator('.mega').first().waitFor();
    await sinScrollHorizontal(p, nombre);
    await p.waitForTimeout(1200);
    await foto(p, `14-${nombre}-temas`);
    await p.goto(`${URL_APP}#/estudiar?mega=${encodeURIComponent('Conversación y vida social')}&dif=todas`);
    await p.locator('#feed .slide .palabra').first().waitFor();
    await p.locator('#feed .slide').first().locator('.revelar').click();
    await p.waitForTimeout(500);
    await foto(p, `15-${nombre}-tarjeta`);
    await c.close();
    paso(`Formato ${nombre} (${viewport.width}×${viewport.height}), francés`);
  }

  assert.deepEqual(errores, [], 'errores en la consola');
  paso('Sin errores de JavaScript en la consola');
  console.log(`\n✓ ${pasos} pasos OK. Capturas en ${CAPTURAS}/`);
} catch (e) {
  await ultimaPagina?.screenshot({ path: `${CAPTURAS}/FALLO.png` }).catch(() => {});
  console.error('\n✗ Falló:', e.message, errores.length ? `\nErrores de consola:\n${errores.join('\n')}` : '');
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
