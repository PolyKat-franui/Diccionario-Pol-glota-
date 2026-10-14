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
  await ctx.addInitScript(() => { window.__sinSorpresas = true; }); // los diamantes al azar podrían tapar botones
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
  await page.locator('.nodo:not(.raiz) .neurona').first().waitFor();
  assert.equal(await page.locator('.nodo:not(.raiz) .neurona').count(), 13);
  const conv = page.locator('.nodo:not(.raiz) .neurona', { hasText: 'Conversación y vida social' });
  assert.match(await conv.innerText(), /269 tarjetas/);
  await page.waitForTimeout(1200); // termina la animación de entrada
  await foto(page, '03-celular-temas');
  await sinScrollHorizontal(page, 'temas');
  assert.ok((await page.locator('#red .axon').count()) >= 13, 'la red dibuja sus conexiones');
  paso('13 mega temas en red de neuronas; Conversación y vida social con 269 tarjetas');

  await conv.click();
  await page.waitForURL(/#\/tema\//);
  await page.locator('#difs .dif-opcion').first().waitFor();
  assert.equal(await page.locator('.tema').count(), 0, 'sin subtemas');
  await page.locator('#difs [data-dif=facil]').click();
  assert.equal(await page.locator('#difs [data-dif=facil]').getAttribute('aria-checked'), 'true');
  await page.locator('#difs [data-dif=todas]').click();
  await foto(page, '04-celular-tema');
  paso('Tema: dificultad con íconos, sin subtemas');

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

  // Tutorial guiado por Kitty en la primera sesión: tocar la tarjeta lo hace avanzar
  await page.locator('#tutorial .tut-burbuja').waitFor();
  assert.match(await page.locator('#tutorial').innerText(), /Toca la tarjeta/);
  await foto(page, '05b-celular-tutorial');
  await primera.locator('.revelar').click();
  await page.waitForTimeout(500);
  assert.ok(await primera.evaluate((el) => el.classList.contains('revelada')));
  assert.match(await page.locator('#tutorial').innerText(), /Desliza/);
  for (let i = 0; i < 3; i++) await page.locator('#tut-avanzar').click();
  assert.equal(await page.locator('#tutorial').isHidden(), true);
  paso('Tutorial de Kitty: 4 pasos, avanza al tocar la tarjeta y se cierra con «¡Entendido!»');
  await primera.locator('.btn-fav').click();
  assert.equal(await primera.locator('.btn-fav').getAttribute('aria-pressed'), 'true');
  await foto(page, '06-celular-tarjeta-revelada');
  paso('Tocar revela la traducción; corazón guarda en favoritos');

  await primera.locator('.btn-fav').click();
  assert.equal(await primera.locator('.btn-fav').getAttribute('aria-pressed'), 'false');
  await primera.locator('.tarjeta-centro').dblclick();
  assert.equal(await primera.locator('.btn-fav').getAttribute('aria-pressed'), 'true');
  assert.equal(await primera.locator('.corazon-grande').count(), 1);
  await foto(page, '06b-celular-doble-toque');
  await page.waitForTimeout(1000);
  await primera.locator('.tarjeta-centro').dblclick();
  assert.equal(await primera.locator('.btn-fav').getAttribute('aria-pressed'), 'true', 'el doble toque solo marca, no quita');
  paso('Doble toque en la tarjeta = favorito, con corazón grande');

  await primera.locator('.btn-sabe').click();
  await page.waitForFunction(() => document.querySelector('#chip-tokens span:last-child').textContent === '1');
  assert.match(await primera.locator('.nivel').innerText(), /Media/);
  assert.equal(await page.locator('#chip-racha span').innerText(), '0', 'la racha sube recién con 20 palabras');
  assert.ok(await page.locator('#chip-tokens .moneda').evaluate((m) => m.classList.contains('gira')), 'la moneda gira al ganar tokens');
  await imagenesCargadas(page, 'tarjeta');
  paso('"Lo sé" → +1 Kitty token (la moneda gira), nivel "Media"; la racha aún no sube');

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
  await page.waitForURL(/#\/menu/);
  paso('Recargar la página: el progreso no se pierde y no se vuelve a pedir la cuenta');

  // Deslizar a la derecha = «Lo sé»; al completar 10 palabras en el día sale el premio de tragamonedas
  await page.goto(`${URL_APP}#/estudiar?mega=${encodeURIComponent('Conversación y vida social')}&dif=todas`);
  const tarjeta1 = page.locator('#feed .slide').first();
  await tarjeta1.locator('.palabra').waitFor();
  await page.waitForTimeout(500);
  const caja = await tarjeta1.locator('.palabra').boundingBox();
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  for (let dx = 0; dx <= 180; dx += 30) await page.mouse.move(caja.x + caja.width / 2 + dx, caja.y + caja.height / 2 + 4);
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('#feed .slide')?.dataset.r === 'si');
  for (let i = 0; i < 12 && !(await page.locator('.premio-capa').count()); i++) {
    await page.waitForTimeout(650);
    await page.keyboard.press('ArrowRight');
  }
  await page.locator('.premio-capa').waitFor();
  await page.waitForFunction(() => document.querySelector('#premio-num')?.textContent === '+10', null, { timeout: 5000 });
  await page.waitForTimeout(400);
  await foto(page, '07b-celular-premio');
  await page.locator('#premio-ok').click();
  await page.locator('.premio-capa').waitFor({ state: 'detached' });
  paso('Deslizar → «Lo sé»; a las 10 palabras del día sale el premio (+10 monedas)');

  await page.goto(`${URL_APP}#/aprender`);
  await page.locator('.barra .marca').click();
  await page.waitForURL(/#\/menu/);
  await page.locator('#menu-jugar').waitFor();
  assert.ok(await page.locator('#barra').isHidden(), 'el menú va a pantalla completa');
  assert.match(await page.locator('.menu-hoy').textContent(), /1\d palabras/);
  await page.waitForTimeout(2600);
  await foto(page, '07c-celular-menu');
  await imagenesCargadas(page, 'menú principal');
  await page.locator('#menu-kitty').click({ force: true });
  await page.locator('.menu-instalar').click();
  await page.locator('#modal .pasos-instalar li').first().waitFor();
  assert.ok(await page.locator('#modal .pasos-instalar li').count() >= 2, 'pasos para instalar');
  await page.waitForTimeout(300);
  await foto(page, '07d-celular-instalar');
  await page.locator('#modal-cerrar').click();
  assert.ok(await page.evaluate(() => navigator.serviceWorker.ready.then((r) => !!r.active)), 'service worker activo');
  const man = await page.evaluate(() => fetch('manifest.webmanifest').then((r) => r.json()));
  assert.equal(man.short_name, 'Franui');
  assert.ok(!(await page.locator('#menu-historia').evaluate((b) => b.classList.contains('vista'))), 'historia sin ver: anillo de color');
  await page.locator('#menu-historia').click();
  await page.locator('.historia .historia-frase').waitFor();
  const fraseHoy = await page.locator('.historia .historia-frase').innerText();
  assert.ok(fraseHoy.length > 2);
  await page.waitForTimeout(400);
  await foto(page, '07e-celular-historia');
  await page.locator('.historia-zona.der').click();
  await page.locator('.historia-trad').waitFor();
  await page.locator('.historia-zona.der').click();
  await page.locator('.historia-fav').click();
  assert.equal(await page.locator('.historia-fav').getAttribute('aria-pressed'), 'true');
  await page.locator('.historia-cerrar').click();
  assert.equal(await page.locator('.historia-capa').count(), 0);
  assert.ok(await page.locator('#menu-historia').evaluate((b) => b.classList.contains('vista')), 'historia vista: anillo gris');
  await page.locator('#menu-historia').click();
  assert.equal(await page.locator('.historia .historia-frase').innerText(), fraseHoy, 'misma frase todo el día');
  await page.keyboard.press('Escape');
  paso('Historia del día de Kitty: frase, traducción y guardar en favoritos; misma frase todo el día');

  await page.locator('#menu-temas').click();
  await page.waitForURL(/#\/aprender/);
  paso('Tocar el logo abre el menú principal animado; «Descargar la app» muestra los pasos; service worker activo');

  await page.goto(`${URL_APP}#/favoritos`);
  await page.locator('.fila-fav').first().waitFor();
  assert.equal(await page.locator('.fila-fav').count(), 2, 'la palabra de la tarjeta y la frase de la historia');
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
  await page.locator('[data-modal=cosmeticos]').click();
  await page.locator('#modal .moneda').waitFor();
  await imagenesCargadas(page, 'cosméticos');
  await foto(page, '10b-celular-cosmeticos');
  await page.locator('#modal-cerrar').click();
  await page.goto(`${URL_APP}#/estudiar?mega=${encodeURIComponent('Conversación y vida social')}&dif=todas`);
  await page.locator('#feed .slide .palabra').first().waitFor();
  await foto(page, '11-celular-tarjeta-oscuro');
  paso('Modo oscuro');

  // Paletas extra de Ajustes: Tamarindo y Medianoche, en claro y oscuro
  for (const pal of ['tamarindo', 'medianoche']) {
    for (const tema of ['claro', 'oscuro']) {
      await page.goto(`${URL_APP}#/ajustes`);
      await page.locator(`[data-tema=${tema}]`).click();
      await page.locator(`.paletas [data-paleta=${pal}]`).click();
      assert.equal(await page.evaluate(() => document.documentElement.dataset.paleta), pal);
      assert.equal(await page.locator(`.paletas [data-paleta=${pal}]`).getAttribute('aria-checked'), 'true');
      await foto(page, `16-ajustes-${pal}-${tema}`);
      await page.goto(`${URL_APP}#/estudiar?mega=${encodeURIComponent('Conversación y vida social')}&dif=todas`);
      await page.locator('#feed .slide .palabra').first().waitFor();
      await foto(page, `16-tarjeta-${pal}-${tema}`);
    }
  }
  await page.goto(`${URL_APP}#/ajustes`);
  await page.locator('.paletas [data-paleta=higo]').click();
  await page.locator('[data-tema=oscuro]').click();
  await sinScrollHorizontal(page, 'ajustes con 5 paletas');
  paso('Paletas Tamarindo y Medianoche (claro y oscuro) en Ajustes');

  assert.ok(await page.locator('.tabbar a[href="#/novedades"]').evaluate((a) => a.classList.contains('con-aviso')), 'aviso de novedad sin ver');
  await page.locator('.tabbar a[href="#/novedades"]').click();
  await page.locator('.nov-hero').waitFor();
  assert.match(await page.locator('.nov-version').innerText(), /^v\d/);
  await page.waitForTimeout(900);
  await foto(page, '12b-celular-novedades');
  assert.ok(!(await page.locator('.tabbar a[href="#/novedades"]').evaluate((a) => a.classList.contains('con-aviso'))), 'el aviso se apaga al verla');
  paso('Novedades: aviso en la pestaña, tarjeta de nueva versión y el aviso se apaga');

  await page.goto(`${URL_APP}#/ranking`);
  await page.locator('.ranking').waitFor();
  await foto(page, '12-celular-ranking');
  await page.goto(`${URL_APP}#/conservar?demo=1`);
  await page.locator('.opcion').first().waitFor();
  assert.match(await page.locator('.opcion').first().innerText(), /240 tokens/);
  await foto(page, '13-celular-conservar');
  paso('Ranking y "¿Qué avance conservo?" (demo)');

  // Meta diaria de 5 palabras en Ajustes
  await page.goto(`${URL_APP}#/ajustes`);
  assert.equal(await page.locator('[data-meta]').count(), 0, 'la meta ya no se elige');
  assert.match(await page.locator('.meta-fija').innerText(), /20 palabras/);
  await page.locator('#aj-hora').fill('21:15');
  await page.locator('#aj-hora').dispatchEvent('change');
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.locator('#aj-calendario').click()]);
  assert.equal(descarga.suggestedFilename(), 'franui-recordatorio.ics');
  const ics = await (await import('node:fs/promises')).readFile(await descarga.path(), 'utf8');
  assert.match(ics, /T211500[\s\S]*RRULE:FREQ=DAILY/);
  await page.locator('#aj-recordatorio').click();
  await page.waitForFunction(() => !document.querySelector('#aj-recordatorio').checked, null, { timeout: 5000 });
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).ajustes.recordatorio), false, 'sin permiso de notificaciones queda apagado');
  await foto(page, '12b-celular-recordatorio');
  paso('Recordatorio diario: «Agregar al calendario» descarga un evento diario a la hora elegida');
  // Racha de 6 días que viene de ayer (se escribe con la app cerrada para que no la pise el autoguardado)
  await page.goto('about:blank');
  const editor = await ctx.newPage();
  await editor.goto(URL_APP.replace('/app/', '/'));
  await editor.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('franui:v1'));
    const ayer = new Date(Date.now() - 864e5);
    const pad = (n) => String(n).padStart(2, '0');
    s.racha = { actual: 6, mejor: 6, ultimoDia: `${ayer.getFullYear()}-${pad(ayer.getMonth() + 1)}-${pad(ayer.getDate())}` };
    const hoy = new Date();
    s.diario = { dia: `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`, revisadas: 19, premios: 1 }; // a 1 palabra de la meta
    s.cofre = 0;
    localStorage.setItem('franui:v1', JSON.stringify(s));
  });
  await editor.close();
  await page.goto(`${URL_APP}#/menu`);
  assert.match(await page.locator('.menu-flor').getAttribute('src'), /flor-3\.svg/, '19 de 20: casi en flor');
  const antesCofre = await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).tokens);
  await page.goto(`${URL_APP}#/estudiar?mega=${encodeURIComponent('Conversación y vida social')}&dif=todas`);
  await page.locator('#feed .slide .palabra').first().waitFor();
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowRight');
  // la palabra 20 del día: primero el premio de 20 palabras, después Kitty baila y luego el cofre de 7 días
  await page.locator('#premio-ok').click({ timeout: 6000 });
  await page.locator('.baile-capa').waitFor({ timeout: 5000 });
  assert.match(await page.locator('.baile').innerText(), /Racha del día cumplida[\s\S]*7 días seguidos/);
  await page.waitForTimeout(700);
  await foto(page, '13a-celular-baile-kitty');
  assert.match(await page.locator('#baile-kitty').getAttribute('src'), /caras\//);
  await page.locator('#baile-ok').click();
  await page.locator('.cofre-capa').waitFor({ timeout: 5000 });
  await page.waitForTimeout(400);
  await foto(page, '13b-celular-cofre');
  await page.locator('#cofre-abrir').click();
  await page.locator('#cofre-monto:not([hidden])').waitFor();
  assert.match(await page.locator('#cofre-abrir img').getAttribute('src'), /cofre-abierto/);
  await page.waitForTimeout(500);
  await foto(page, '13c-celular-cofre-abierto');
  await page.locator('#cofre-ok').click();
  await page.locator('.cofre-capa').waitFor({ state: 'detached' });
  assert.match(await page.locator('#feed-flor').getAttribute('src'), /sakura\.svg/);
  assert.equal(await page.locator('#chip-racha span').innerText(), '7');
  const despuesCofre = await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).tokens);
  assert.ok(despuesCofre - antesCofre >= 50 + 15, `el cofre da 50 monedas (${despuesCofre - antesCofre})`);
  paso('Palabra 20 del día → premio, Kitty baila por la racha 7 y cofre (+50); la sakura florece');

  // Jardín de Sakura: pestaña propia, tienda de Kitty, abono que lo hace crecer, decorar arrastrando
  await page.locator('.tabbar a[href="#/jardin"]').click();
  await page.waitForURL(/#\/jardin/);
  await page.locator('#escena .escena-arbol').waitFor();
  const crecInicial = await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).jardin.crecimiento);
  assert.ok(crecInicial >= 5, `estudiar riega el sakura (${crecInicial})`);
  await page.locator('.jardin-tabs a', { hasText: 'Tienda de Kitty' }).click();
  await page.locator('[data-comprar="abono"]').waitFor();
  const crecAntes = await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).jardin.crecimiento);
  await page.locator('[data-comprar="abono"]').click();
  if (await page.locator('#sube-ok').waitFor({ timeout: 1500 }).then(() => true, () => false)) await page.locator('#sube-ok').click(); // el abono puede subir de nivel el sakura
  await page.locator('[data-comprar="mantel"]').click();
  await page.locator('#toast', { hasText: 'Mantel de picnic' }).waitFor();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('franui:v1')).jardin.tiene.mantel === true); // guardado automático
  const jar = await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).jardin);
  assert.equal(jar.crecimiento, crecAntes + 10);
  assert.equal(jar.tiene.mantel, true);
  if (await page.locator('#sube-ok').count()) await page.locator('#sube-ok').click();
  await foto(page, '13d-celular-tienda');
  await page.locator('.jardin-tabs a', { hasText: 'Mi jardín' }).click();
  await page.locator('.escena-decor[data-id=mantel]').waitFor();
  await page.locator('#j-decorar').click();
  const m0 = await page.locator('.escena-decor[data-id=mantel]').boundingBox();
  await page.mouse.move(m0.x + 10, m0.y + 5); await page.mouse.down();
  await page.mouse.move(m0.x + 40, m0.y - 30, { steps: 5 }); await page.mouse.up();
  await page.waitForTimeout(500);
  const pos = await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).jardin.pos.mantel);
  assert.ok(pos && pos[1] < 80, `el mantel se movió (${pos})`);
  await foto(page, '13e-celular-jardin');
  // Caquitas de Kitty: aparecen con el tiempo y tocarlas limpia el jardín (+3 tokens)
  await page.goto('about:blank');
  const ed4 = await ctx.newPage();
  await ed4.goto(URL_APP.replace('/app/', '/'));
  await ed4.evaluate(() => { const s = JSON.parse(localStorage.getItem('franui:v1')); s.jardin.caquitas = []; s.jardin.ultimaCaquita = Date.now() - 7 * 3.6e6; localStorage.setItem('franui:v1', JSON.stringify(s)); });
  await ed4.close();
  await page.goto(`${URL_APP}#/menu`);
  assert.match(await page.locator('#menu-jardin').innerText(), /2 caquitas/);
  await page.goto(`${URL_APP}#/jardin`);
  await page.locator('[data-caquita]').first().waitFor();
  assert.equal(await page.locator('[data-caquita]').count(), 2);
  assert.match(await page.locator('#escena-kitty').getAttribute('src'), /avergonzada/);
  await foto(page, '13e2-celular-caquitas');
  const tokCaq = await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).tokens);
  await page.locator('[data-caquita]').first().click();
  await page.locator('#toast', { hasText: 'Jardín limpio' }).waitFor();
  if (await page.locator('#sube-ok').count()) await page.locator('#sube-ok').click();
  await page.locator('[data-caquita]').first().click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('franui:v1')).jardin.caquitas.length === 0);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).tokens), tokCaq + 6);
  assert.match(await page.locator('#escena-kitty').getAttribute('src'), /feliz/);
  paso('Caquitas de Kitty: aparecen cada 3 h, tocarlas limpia el jardín y da +3 tokens');
  await imagenesCargadas(page, 'jardín');
  paso('Jardín de Sakura: estudiar lo riega, la tienda vende abono y adornos, y se decora arrastrando');

  // «¡Dominada!»: todas las palabras vistas quedan a un paso del máximo y vencidas → la primera que sepa se domina
  await page.goto('about:blank');
  const ed2 = await ctx.newPage();
  await ed2.goto(URL_APP.replace('/app/', '/'));
  await ed2.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('franui:v1'));
    for (const prog of Object.values(s.progreso)) for (const e of Object.values(prog)) { e.c = 4; e.d = 0; }
    localStorage.setItem('franui:v1', JSON.stringify(s));
  });
  await ed2.close();
  await page.goto(`${URL_APP}#/estudiar?mega=${encodeURIComponent('Conversación y vida social')}&dif=todas`);
  await page.locator('#feed .slide .palabra').first().waitFor();
  for (let i = 0; i < 12 && !(await page.locator('.dominada-capa').count()); i++) { await page.waitForTimeout(700); await page.keyboard.press('ArrowRight'); }
  await page.locator('.dominada-capa').waitFor({ timeout: 3000 });
  assert.match(await page.locator('.dominada').innerText(), /¡Dominada!/);
  assert.match(await page.locator('.dominada').innerText(), /\+5 Kitty tokens/);
  await page.waitForTimeout(900);
  await foto(page, '13f-celular-dominada');
  await page.locator('#dom-seguir').click();
  assert.equal(await page.locator('.dominada-capa').count(), 0);
  paso('Al llegar al nivel máximo, pantalla «¡Dominada!» con +5 tokens');

  // Estudio libre: elegir palabras ya vistas (dominadas) y repasarlas sin mover el calendario
  await page.goto(`${URL_APP}#/libre`);
  await page.locator('#libre-lista li').first().waitFor();
  await page.locator('.libre-chips [data-nivel=dominada]').click();
  await page.locator('#libre-lista .libre-fila').first().waitFor();
  const filaLibre = page.locator('#libre-lista .libre-fila').first();
  const palabraLibre = await filaLibre.locator('strong').innerText();
  await page.locator('#libre-q').fill(palabraLibre.slice(0, 4));
  await page.locator('#libre-lista .libre-fila', { hasText: palabraLibre }).first().locator('input').check();
  assert.match(await page.locator('#libre-ir').innerText(), /Estudiar 1/);
  await foto(page, '13f2-celular-estudio-libre');
  const idLibre = await page.locator('#libre-lista input:checked').first().getAttribute('value');
  const antesLibre = await page.evaluate((id) => { const s = JSON.parse(localStorage.getItem('franui:v1')); return s.progreso[s.aprendiendo][id]; }, idLibre);
  await page.locator('#libre-ir').click();
  await page.locator('#feed .slide .palabra').first().waitFor();
  assert.equal(await page.locator('#feed .slide:not(.fin)').count(), 1);
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction((id) => { const s = JSON.parse(localStorage.getItem('franui:v1')); return s.progreso[s.aprendiendo][id].u !== undefined; }, idLibre);
  await page.waitForTimeout(400);
  const despuesLibre = await page.evaluate((id) => { const s = JSON.parse(localStorage.getItem('franui:v1')); return s.progreso[s.aprendiendo][id]; }, idLibre);
  assert.deepEqual(despuesLibre, antesLibre, 'estudio libre: el calendario de la palabra no cambia');
  paso('Estudio libre: buscar y elegir una palabra dominada, repasarla sin mover su calendario');

  // Diamante sorpresa: con el azar a favor aparece, cruza la pantalla y al tocarlo se gana
  await page.goto(`${URL_APP}#/estudiar?mega=${encodeURIComponent('Comida y bebida')}&dif=todas`);
  await page.locator('#feed .slide .palabra').first().waitFor();
  const diamAntes = await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).diamantes ?? 0);
  await page.evaluate(() => { window.__sinSorpresas = false; Math.random = () => 0.001; });
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowRight');
  await page.locator('.diamante-vuela').waitFor({ timeout: 5000 });
  await foto(page, '13f3-celular-diamante');
  await page.locator('.diamante-vuela').dispatchEvent('click');
  await page.waitForFunction((n) => (JSON.parse(localStorage.getItem('franui:v1')).diamantes ?? 0) === n + 1, diamAntes);
  await page.locator('#toast', { hasText: 'diamante' }).waitFor();
  await page.goto(`${URL_APP}#/jardin?t=tienda`);
  const diamTienda = await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).diamantes);
  await page.locator('#cambiar-diamante').click();
  await page.locator('#toast', { hasText: '+150' }).waitFor();
  await page.waitForFunction((n) => JSON.parse(localStorage.getItem('franui:v1')).diamantes === n - 1, diamTienda);
  paso('Diamante sorpresa: aparece de vez en cuando, se atrapa tocándolo y se cambia por 150 tokens');

  // Mundo de sakuras: con el sakura en nivel 4 se abren estanque y faroles; el mirador sigue bloqueado
  await page.goto('about:blank');
  const ed3 = await ctx.newPage();
  await ed3.goto(URL_APP.replace('/app/', '/'));
  await ed3.evaluate(() => { const s = JSON.parse(localStorage.getItem('franui:v1')); s.jardin.crecimiento = 130; s.jardin.fondo = 'dia'; localStorage.setItem('franui:v1', JSON.stringify(s)); });
  await ed3.close();
  await page.goto(`${URL_APP}#/jardin?t=mundo`);
  await page.locator('#mundo-tira').waitFor();
  assert.equal(await page.locator('.mundo-espacio').count(), 4);
  assert.equal(await page.locator('.mundo-espacio.bloqueado').count(), 1);
  assert.match(await page.locator('[data-espacio=mirador]').innerText(), /nivel 6/);
  await imagenesCargadas(page, 'mundo');
  await page.locator('#mundo-sig').click();
  await page.waitForFunction(() => document.querySelector('.mundo-puntos button[data-ir="1"]').getAttribute('aria-current') === 'true');
  await page.locator('[data-koi]').first().dispatchEvent('click'); // el koi nada: se toca con un evento directo
  assert.ok(await page.locator('[data-koi]').first().evaluate((b) => b.classList.contains('salta')), 'el koi salta');
  await page.waitForTimeout(400);
  await foto(page, '13g-celular-mundo-estanque');
  await page.locator('.mundo-puntos button[data-ir="2"]').click();
  await page.waitForFunction(() => document.querySelector('.mundo-puntos button[data-ir="2"]').getAttribute('aria-current') === 'true');
  for (const f of await page.locator('[data-farol]').all()) await f.click();
  assert.ok(await page.locator('[data-espacio=faroles]').evaluate((e) => e.classList.contains('brilla')), 'todos los faroles encendidos');
  await page.locator('#toast', { hasText: 'brilla' }).waitFor();
  await foto(page, '13h-celular-mundo-faroles');
  await sinScrollHorizontal(page, 'mundo');
  paso('Mundo de sakuras: espacios que se recorren, koi que saltan, faroles que se encienden y el mirador bloqueado hasta nivel 6');

  await page.goto(`${URL_APP}#/ajustes`);
  await page.locator('#btn-nativo').click();
  await page.locator('#capa-idiomas .arana').waitFor();
  await foto(page, '17-celular-idioma-app');
  await page.locator('#capa-idiomas [data-nativo=en]').click();
  await page.locator('.tabbar a', { hasText: 'Learn' }).waitFor();
  await page.goto(`${URL_APP}#/aprender`);
  await page.getByRole('heading', { name: 'What do you want to learn?' }).waitFor(); // inglés ya no puede ser el idioma a aprender
  await page.locator('.idioma[data-code=es]').click();
  await page.locator('.nodo:not(.raiz) .neurona', { hasText: 'Conversation & social life' }).waitFor();
  paso('Idioma nativo inglés: interfaz en inglés y se aprende español');

  // Borrar progreso: se confirma dentro de la app (no con confirm(), que algunos navegadores bloquean)
  await page.goto(`${URL_APP}#/ajustes`);
  assert.ok((await tokens(page)) > 0);
  await page.locator('#aj-borrar').click();
  await page.locator('#modal #aj-borrar-si').click();
  await page.waitForFunction(() => document.querySelector('#chip-tokens span:last-child').innerText === '0');
  paso('Borrar progreso con confirmación dentro de la app');
  await ctx.close();

  // ---------------- Tablet y computador ----------------
  for (const [nombre, viewport] of [['tablet', { width: 820, height: 1180 }], ['computador', { width: 1440, height: 900 }]]) {
    const { ctx: c, page: p } = await nuevaPagina(viewport);
    await p.goto(URL_APP);
    await p.getByRole('button', { name: 'Continuar sin cuenta' }).click();
    await p.locator('.idioma[data-code=fr]').click();
    await p.locator('.nodo:not(.raiz) .neurona').first().waitFor();
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
