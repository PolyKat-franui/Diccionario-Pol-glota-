// Cuenta de Google + guardado en la nube, con Firebase simulado (sin internet ni proyecto real).
// Se reemplazan nube-config.js y los módulos de gstatic por versiones falsas que guardan en localStorage.
// Uso: NODE_PATH=$(npm root -g) node tests/e2e-nube.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { servir } from '../scripts/servir.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const server = await servir(5198);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-CL', serviceWorkers: 'block' });
// Nube simulada: los documentos viven en window.__docs (persisten en localStorage aparte)
const FAKE = {
  'firebase-app.js': 'export const initializeApp = (c) => ({ c });',
  'firebase-auth.js': `
    const u = { uid: 'u1', email: 'fran@example.com', displayName: 'Francisca S' };
    let actual = localStorage.getItem('__sim_login') ? u : null;
    export class GoogleAuthProvider { setCustomParameters() {} }
    export const getAuth = () => ({ get currentUser() { return actual; }, authStateReady: async () => {} });
    export const signInWithPopup = async () => { actual = u; localStorage.setItem('__sim_login', '1'); return { user: u }; };
    export const signOut = async () => { actual = null; localStorage.removeItem('__sim_login'); };`,
  'firebase-firestore.js': `
    const leer = () => JSON.parse(localStorage.getItem('__sim_docs') || '{}');
    export const getFirestore = () => ({});
    export const doc = (db, col, id) => col + '/' + id;
    export const getDoc = async (k) => { const d = leer()[k]; return { exists: () => !!d, data: () => d }; };
    export const setDoc = async (k, v) => { const d = leer(); d[k] = v; localStorage.setItem('__sim_docs', JSON.stringify(d)); };
    export const updateDoc = async (k, v) => { const d = leer(); d[k] = { ...d[k], ...v }; localStorage.setItem('__sim_docs', JSON.stringify(d)); };
    export const deleteDoc = async (k) => { const d = leer(); delete d[k]; localStorage.setItem('__sim_docs', JSON.stringify(d)); };
    export const collection = (db, col) => col;
    export const orderBy = (campo) => ({ campo });
    export const limit = (n) => ({ n });
    export const query = (col, ...ops) => ({ col, ops });
    export const getDocs = async ({ col, ops }) => {
      const campo = ops.find((o) => o.campo)?.campo, n = ops.find((o) => o.n)?.n ?? 99;
      const filas = Object.entries(leer()).filter(([k]) => k.startsWith(col + '/')).map(([k, v]) => ({ id: k.slice(col.length + 1), data: () => v }));
      filas.sort((a, b) => (b.data()[campo] ?? 0) - (a.data()[campo] ?? 0));
      return { docs: filas.slice(0, n) };
    };`,
};
await ctx.route('**/js/nube-config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const FIREBASE = { apiKey: 'x', projectId: 'sim' }; export const CREADORA = 'fran@example.com';" }));
await ctx.route('https://www.gstatic.com/firebasejs/**', (r) => r.fulfill({ contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: FAKE[r.request().url().split('/').pop()] }));
let page = await ctx.newPage();
const errores = []; page.on('pageerror', (e) => errores.push(e.message));
const U = 'http://localhost:5198/app/';
await page.goto(U);
await page.locator('#btn-google').click();
await page.waitForURL(/#\/idiomas/);
console.log('✓ Entrar con Google (primera vez) → elegir idioma');
await page.locator('.nodo-idioma[data-code=en]').click();
await page.waitForURL(/#\/aprender/);
await page.locator('#red .neurona').first().waitFor();
await page.goto(`${U}#/ajustes`);
await page.locator('dd', { hasText: 'fran@example.com' }).waitFor();
await page.locator('#aj-salir').waitFor();
console.log('✓ Ajustes muestra la cuenta y «Cerrar sesión»');
// estudiar 3 tarjetas → se sube a la nube
await page.goto(`${U}#/estudiar?dif=todas`);
await page.locator('#feed .slide .palabra').first().waitFor();
if (await page.locator('#tut-saltar').count()) await page.locator('#tut-saltar').click();
for (let i = 0; i < 3; i++) { await page.waitForTimeout(600); await page.keyboard.press('ArrowRight'); }
await page.waitForFunction(() => { const d = JSON.parse(localStorage.getItem('__sim_docs') || '{}')['progreso/u1']; return d && JSON.parse(d.datos).ejercicios >= 1 && JSON.parse(d.datos).ejercicios === JSON.parse(localStorage.getItem('franui:v1')).ejercicios; }, null, { timeout: 10000 });
console.log('✓ El avance se sube a la nube');
// "otro celular": borrar avance local (pero no la nube) y entrar de nuevo
const docs = await page.evaluate(() => localStorage.getItem('__sim_docs'));
await page.close();
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-CL', serviceWorkers: 'block' });
await ctx2.addInitScript((d) => { if (!localStorage.getItem('__sim_docs')) localStorage.setItem('__sim_docs', d); }, docs);
await ctx2.route('**/js/nube-config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const FIREBASE = { apiKey: 'x', projectId: 'sim' }; export const CREADORA = 'fran@example.com';" }));
await ctx2.route('https://www.gstatic.com/firebasejs/**', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE[r.request().url().split('/').pop()] }));
page = await ctx2.newPage(); page.on('pageerror', (e) => errores.push(e.message));
await page.goto(U);
await page.locator('#btn-google').click();
await page.waitForURL(/#\/menu/);
const ej = await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).ejercicios);
assert.ok(ej >= 1, 'trae el avance de la nube');
console.log('✓ Celular nuevo: entra con Google y recupera el avance (' + ej + ' ejercicios)');
// conflicto: la nube cambia por fuera
await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('__sim_docs')); const e = JSON.parse(d['progreso/u1'].datos); e.ejercicios = 99; e.tokens = 500; d['progreso/u1'].datos = JSON.stringify(e); localStorage.setItem('__sim_docs', JSON.stringify(d)); });
await page.reload();
await page.waitForURL(/#\/conservar/);
await page.locator('[data-eleccion=cuenta]').click();
await page.waitForFunction(() => JSON.parse(localStorage.getItem('franui:v1')).tokens === 500);
assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('franui:v1')).perfil.cuenta.email), 'fran@example.com');
console.log('✓ Avances distintos → «¿Qué avance conservo?» y se queda con el de la cuenta');
// Ranking real: mi fila se publica sin el correo, aparecen otras personas ordenadas y se puede ocultar
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('__sim_docs'));
  const hoy = new Date(); const pad = (n) => String(n).padStart(2, '0');
  const dia = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
  d['ranking/ana'] = { nombre: 'Ana', racha: 9, dia, palabras: 3, nivel: 4, actualizado: 1 };
  d['ranking/beto'] = { nombre: 'Beto', racha: 30, dia: '2020-01-01', palabras: 900, nivel: 1, actualizado: 1 }; // racha vencida
  localStorage.setItem('__sim_docs', JSON.stringify(d));
});
await page.goto(`${U}#/ranking`);
await page.locator('.ranking li.yo').waitFor();
const nombres = await page.locator('.ranking li strong').allInnerTexts();
assert.equal(nombres[0], 'Ana', `la racha vencida de Beto cuenta 0 (${nombres})`);
const miFila = await page.evaluate(() => JSON.parse(localStorage.getItem('__sim_docs'))['ranking/u1']);
assert.ok(miFila && miFila.nombre && !JSON.stringify(miFila).includes('@'), 'mi fila se publica sin el correo');
await page.locator('[data-campo=palabras]').click();
await page.waitForFunction(() => document.querySelector('.ranking li strong')?.textContent === 'Beto');
await page.locator('[data-campo=nivel]').click();
await page.waitForFunction(() => document.querySelector('.ranking li strong')?.textContent === 'Ana');
console.log('✓ Ranking real: racha, palabras y jardín, con otras personas y sin el correo');
// Liga semanal: solo personas de mi liga y de esta semana, ordenadas por XP
await page.evaluate(async () => {
  const { semanaISO } = await import('./js/store.js');
  const d = JSON.parse(localStorage.getItem('__sim_docs'));
  const base = { racha: 0, dia: '', palabras: 0, nivel: 0, actualizado: 1 };
  d['ranking/carla'] = { ...base, nombre: 'Carla', liga: 0, semana: semanaISO(), xp: 500 };
  d['ranking/dani'] = { ...base, nombre: 'Dani', liga: 2, semana: semanaISO(), xp: 999 }; // otra liga
  d['ranking/eli'] = { ...base, nombre: 'Eli', liga: 0, semana: '2020-W01', xp: 800 }; // otra semana
  localStorage.setItem('__sim_docs', JSON.stringify(d));
});
await page.locator('[data-campo=xp]').click();
await page.locator('.liga-card').waitFor();
await page.waitForFunction(() => document.querySelector('.ranking li strong')?.textContent === 'Carla');
const enLiga = await page.locator('.ranking li strong').allInnerTexts();
assert.equal(enLiga.length, 2, `solo mi liga y semana (${enLiga})`);
assert.match(await page.locator('.liga-card').innerText(), /Liga Brote[\s\S]*XP esta semana/);
const miXP = await page.evaluate(() => JSON.parse(localStorage.getItem('__sim_docs'))['ranking/u1']);
assert.ok(Number.isInteger(miXP.xp) && miXP.liga === 0 && /^\d{4}-W\d{2}$/.test(miXP.semana), 'mi fila publica liga, semana y XP');
await page.waitForTimeout(300); await page.screenshot({ path: 'capturas-e2e/nube-liga.png' });
console.log('✓ Liga semanal: solo mi liga y esta semana, por XP');
await page.goto(`${U}#/ajustes`);
await page.locator('#aj-ranking').uncheck();
await page.waitForFunction(() => !JSON.parse(localStorage.getItem('__sim_docs'))['ranking/u1']);
console.log('✓ Se puede salir del ranking desde Ajustes');
await page.locator('#aj-salir').click();
await page.locator('#aj-google').waitFor();
console.log('✓ Cerrar sesión');
// Buzón: sin cuenta se puede enviar; la sugerencia llega a la nube y solo la creadora la ve
await page.locator('#aj-sug').fill('Me encanta Kitty, ¿pueden agregar japonés?');
await page.locator('#f-sug button[type=submit]').click();
await page.locator('#toast', { hasText: 'le llegó a Francisca' }).waitFor();
const sug = await page.evaluate(() => Object.entries(JSON.parse(localStorage.getItem('__sim_docs'))).filter(([k]) => k.startsWith('sugerencias/')));
assert.equal(sug.length, 1);
assert.equal(sug[0][1].texto, 'Me encanta Kitty, ¿pueden agregar japonés?');
assert.equal(sug[0][1].leida, false);
assert.ok(!('uid' in sug[0][1]) && !JSON.stringify(sug[0][1]).includes('@'), 'sin cuenta: sin uid ni correo');
assert.equal(await page.locator('.buzon-acceso').count(), 0, 'sin cuenta no se ve el buzón');
console.log('✓ Sugerencia sin cuenta: llega a la nube');
await page.locator('#aj-google').click();
await page.waitForURL(/#\/menu/);
await page.goto(`${U}#/ajustes`);
await page.locator('.buzon-acceso').waitFor();
await page.locator('.buzon-acceso').click();
await page.locator('.buzon-lista li').first().waitFor();
assert.match(await page.locator('.buzon-lista').innerText(), /agregar japonés[\s\S]*/);
assert.match(await page.locator('.buzon').innerText(), /1 sin leer/);
await page.screenshot({ path: 'capturas-e2e/nube-buzon.png' });
await page.locator('[data-leer]').first().click();
await page.waitForFunction(() => Object.entries(JSON.parse(localStorage.getItem('__sim_docs'))).some(([k, v]) => k.startsWith('sugerencias/') && v.leida === true));
assert.match(await page.locator('[data-leer]').first().innerText(), /no leída/, 'el botón cambia a «Marcar como no leída»');
assert.match(await page.locator('.buzon').innerText(), /0 sin leer/, 'el contador baja');
assert.ok(await page.locator('.buzon-lista li').first().evaluate((li) => li.classList.contains('leida')), 'la tarjeta queda como leída');
await page.locator('[data-leer]').first().click();
await page.waitForFunction(() => Object.entries(JSON.parse(localStorage.getItem('__sim_docs'))).some(([k, v]) => k.startsWith('sugerencias/') && v.leida === false));
assert.match(await page.locator('.buzon').innerText(), /1 sin leer/, 'y se puede volver a marcar como no leída');
await page.locator('[data-borrar]').first().click();
await page.locator('#buzon-borrar-si').click();
await page.waitForFunction(() => !Object.keys(JSON.parse(localStorage.getItem('__sim_docs'))).some((k) => k.startsWith('sugerencias/')));
await page.locator('.buzon .aviso').waitFor();
console.log('✓ Buzón de la creadora: ve, marca como leída y borra');
assert.deepEqual(errores, []);
console.log('✓ Sin errores de JavaScript\n\n✓ Nube (simulada) OK');
await browser.close(); server.close();
