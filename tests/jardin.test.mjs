// Jardín de Sakura y tienda de Kitty.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import * as J from '../app/js/jardin.js';
import * as store from '../app/js/store.js';

const conTokens = (n) => { const s = store.estadoInicial(); s.tokens = n; return s; };
const dia = (d, h = 10) => new Date(2026, 9, d, h).getTime();

test('el árbol sube de nivel cada vez más lento (incremental)', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(J.umbral), [0, 10, 28, 60, 119, 224, 413, 753]);
  assert.equal(J.nivelDe(0), 0);
  assert.equal(J.nivelDe(9), 0);
  assert.equal(J.nivelDe(10), 1);
  assert.equal(J.nivelDe(753), 7);
  assert.equal(J.nivelDe(752), 6);
  assert.equal(J.etapaDe(12), 7); // después de la etapa 7 sigue el mismo dibujo
});

test('comprar abono hace crecer el árbol y descuenta tokens', () => {
  const s = conTokens(20);
  const r = J.comprar(s, 'abono');
  assert.deepEqual(r, { ok: true, antes: 0, despues: 1 });
  assert.equal(s.tokens, 5);
  assert.equal(s.jardin.crecimiento, 10);
  assert.deepEqual(J.comprar(s, 'abono'), { ok: false, motivo: 'monedas' });
});

test('decoraciones: se compran una vez, se pueden ocultar y mover dentro de la escena', () => {
  const s = conTokens(200);
  assert.equal(J.comprar(s, 'mantel').ok, true);
  assert.deepEqual(J.comprar(s, 'mantel'), { ok: false, motivo: 'tienes' });
  assert.equal(J.alternarVisible(s.jardin, 'mantel'), false);
  assert.equal(J.alternarVisible(s.jardin, 'mantel'), true);
  assert.deepEqual(J.posicion(s.jardin, 'mantel'), [6, 80]);
  assert.deepEqual(J.mover(s.jardin, 'mantel', 200, -5), [96 - 30, 0]); // no se sale
  assert.equal(J.comprar(s, 'noche').ok, true);
  assert.equal(s.jardin.fondo, 'noche');
});

test('producción pasiva: nivel × bono por objetos, se junta hasta 8 horas', () => {
  const s = conTokens(0);
  s.jardin.crecimiento = J.umbral(3); // nivel 3
  J.iniciar(s, dia(1, 8));
  assert.equal(J.pendiente(s.jardin, dia(1, 10)), 6); // 2 h × 3/h
  s.jardin.tiene = { mantel: true, farol: true };     // +20 %
  assert.equal(J.produccionPorHora(s.jardin), 3.6);
  assert.equal(J.pendiente(s.jardin, dia(2, 8)), Math.floor(8 * 3.6)); // tope de 8 h
  assert.equal(J.recoger(s, dia(2, 8)), 28);
  assert.equal(s.tokens, 28);
  assert.equal(J.pendiente(s.jardin, dia(2, 8)), 0);
});

test('sakura de reserva: cubre los días perdidos si alcanza; si no, no se gasta', () => {
  const s = conTokens(200);
  assert.equal(J.comprar(s, 'protector').ok, true);
  assert.equal(J.comprar(s, 'protector').ok, true);
  assert.deepEqual(J.comprar(s, 'protector'), { ok: false, motivo: 'max' });
  s.racha = { actual: 5, mejor: 5, ultimoDia: store.diaLocal(dia(10)) };
  // no estudió el 11; el 12 estudia → la reserva cubre el 11
  const completarDia = (d) => { store.registrarRespuesta(s, 'en', 'x', true, d); for (let i = 0; i < store.META_DIA; i++) store.contarRevision(s, d); };
  completarDia(dia(12));
  assert.equal(s.racha.actual, 6);
  assert.equal(s.jardin.protectores, 1);
  // no estudia el 13, 14 ni 15 → 3 días perdidos, solo tiene 1: se pierde la racha y la reserva queda
  completarDia(dia(16));
  assert.equal(s.racha.actual, 1);
  assert.equal(s.jardin.protectores, 1);
});

test('el jardín se guarda y se recupera con valores por defecto', () => {
  const s = store.normalizar({ jardin: { crecimiento: 30 } });
  assert.equal(s.jardin.crecimiento, 30);
  assert.equal(s.jardin.fondo, 'dia');
  assert.deepEqual(s.jardin.tiene, {});
});

test('cada objeto de la tienda tiene su dibujo con el tamaño del catálogo', () => {
  for (const o of J.CATALOGO) {
    const ruta = new URL(`../app/assets/jardin/${o.id}.svg`, import.meta.url);
    assert.ok(existsSync(ruta), `falta app/assets/jardin/${o.id}.svg`);
    const [, w, h] = readFileSync(ruta, 'utf8').match(/viewBox="0 0 (\d+) (\d+)"/);
    assert.deepEqual([Number(w), Number(h)], [o.w, o.h], o.id);
  }
});

test('caquitas: una cada 3 h (máx. 3), limpiarlas da tokens y abono', async () => {
  const J = await import('../app/js/jardin.js');
  const st = await import('../app/js/store.js');
  const e = st.estadoInicial();
  const h = 3.6e6, t0 = 1_000_000_000_000;
  assert.equal(J.aparecerCaquitas(e.jardin, t0), 0, 'la primera vez solo empieza a contar');
  assert.equal(J.aparecerCaquitas(e.jardin, t0 + 2 * h), 0);
  assert.equal(J.aparecerCaquitas(e.jardin, t0 + 3 * h, () => 0.5), 1);
  assert.equal(J.aparecerCaquitas(e.jardin, t0 + 30 * h, () => 0.1), 2, 'nunca más de 3');
  assert.equal(e.jardin.caquitas.length, 3);
  for (const [x, y] of e.jardin.caquitas) { assert.ok(x >= 0 && x + J.CAQUITA.w <= 96 && y >= 60 && y + J.CAQUITA.h <= 96); assert.ok(x <= 36 || x >= 52, 'no sobre el tronco'); }
  const tokens = e.tokens, crec = e.jardin.crecimiento;
  const r = J.limpiarCaquita(e, 0);
  assert.equal(e.tokens, tokens + 3);
  assert.equal(e.jardin.crecimiento, crec + 1);
  assert.equal(e.jardin.caquitas.length, 2);
  assert.equal(e.jardin.limpiadas, 1);
  assert.ok(r);
  assert.equal(J.limpiarCaquita(e, 5), null);
});
