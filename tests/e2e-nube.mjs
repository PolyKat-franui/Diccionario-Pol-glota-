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
    export const setDoc = async (k, v) => { const d = leer(); d[k] = v; localStorage.setItem('__sim_docs', JSON.stringify(d)); };`,
};
await ctx.route('**/js/nube-config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const FIREBASE = { apiKey: 'x', projectId: 'sim' };" }));
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
await ctx2.route('**/js/nube-config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const FIREBASE = { apiKey: 'x', projectId: 'sim' };" }));
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
await page.goto(`${U}#/ajustes`);
await page.locator('#aj-salir').click();
await page.locator('#aj-google').waitFor();
console.log('✓ Cerrar sesión');
assert.deepEqual(errores, []);
console.log('✓ Sin errores de JavaScript\n\n✓ Nube (simulada) OK');
await browser.close(); server.close();
