import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../app/js/store.js';

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const dia = (d, h = 10) => new Date(2026, 9, d, h).getTime();

test('el progreso se guarda y sigue ahí al volver a abrir la app', () => {
  const storage = memoria();
  const s = store.cargar(storage);
  s.perfil.elegido = true;
  s.aprendiendo = 'en';
  store.registrarRespuesta(s, 'en', 'en1972', true, dia(9));
  store.alternarFavorito(s, 'en', 'en1972');
  assert.ok(store.guardar(s, storage));
  const otraVez = store.cargar(storage);
  assert.equal(otraVez.tokens, 1);
  assert.equal(otraVez.progreso.en.en1972.c, 1);
  assert.deepEqual(otraVez.favoritos.en, ['en1972']);
  assert.equal(otraVez.aprendiendo, 'en');
});

test('datos dañados o almacenamiento bloqueado no rompen la app', () => {
  const rota = { getItem: () => '{no es json', setItem: () => { throw new Error('lleno'); } };
  const s = store.cargar(rota);
  assert.equal(s.tokens, 0);
  assert.equal(store.guardar(s, rota), false);
});

test('racha: suma días seguidos, no duplica el mismo día y se reinicia tras un día sin estudiar', () => {
  const r = { actual: 0, mejor: 0, ultimoDia: null };
  store.marcarDiaEstudiado(r, dia(1));
  store.marcarDiaEstudiado(r, dia(1, 22));
  store.marcarDiaEstudiado(r, dia(2));
  store.marcarDiaEstudiado(r, dia(3));
  assert.equal(r.actual, 3);
  assert.equal(store.rachaVigente(r, dia(4)), 3);  // ayer estudió: la racha sigue viva
  assert.equal(store.rachaVigente(r, dia(5)), 0);  // un día completo sin estudiar
  store.marcarDiaEstudiado(r, dia(5));
  assert.equal(r.actual, 1);
  assert.equal(r.mejor, 3);
});

test('Kitty tokens: +1 por tarjeta y +5 al terminar la sesión', () => {
  const s = store.estadoInicial();
  store.registrarRespuesta(s, 'en', 'a', true, dia(9));
  store.registrarRespuesta(s, 'en', 'b', false, dia(9));
  store.terminarSesion(s);
  assert.equal(s.tokens, 7);
  assert.equal(s.ejercicios, 2);
  assert.equal(s.racha.actual, 0, 'la racha no sube por estudiar una tarjeta');
});

test('racha del día: se cumple al revisar 20 palabras, no antes', () => {
  const s = store.estadoInicial();
  for (let i = 0; i < 19; i++) store.contarRevision(s, dia(9));
  assert.equal(s.racha.actual, 0);
  store.contarRevision(s, dia(9));
  assert.equal(s.racha.actual, 1);
  for (let i = 0; i < 30; i++) store.contarRevision(s, dia(9));
  assert.equal(s.racha.actual, 1, 'un día cuenta una vez');
  for (let i = 0; i < 20; i++) store.contarRevision(s, dia(10));
  assert.equal(s.racha.actual, 2);
});

test('favoritos: el corazón agrega y quita', () => {
  const s = store.estadoInicial();
  assert.equal(store.alternarFavorito(s, 'fr', 'x'), true);
  assert.ok(store.esFavorito(s, 'fr', 'x'));
  assert.equal(store.alternarFavorito(s, 'fr', 'x'), false);
  assert.ok(!store.esFavorito(s, 'fr', 'x'));
});

test('¿Qué avance conservo?: detecta avances distintos y conserva el elegido', () => {
  const cuenta = store.estadoInicial(); cuenta.tokens = 50; cuenta.ejercicios = 40;
  const nav = store.estadoInicial(); nav.tokens = 3; nav.ejercicios = 3;
  assert.ok(store.hayConflicto(cuenta, nav));
  assert.ok(!store.hayConflicto(cuenta, store.estadoInicial())); // navegador vacío: no hay que preguntar
  assert.equal(store.elegirAvance(cuenta, nav, 'cuenta').tokens, 50);
  assert.equal(store.elegirAvance(cuenta, nav, 'navegador').tokens, 3);
});

test('cuenta de Google: subir, bajar o preguntar qué avance conservar', () => {
  const vacio = store.estadoInicial();
  const nube = store.estadoInicial(); nube.tokens = 50; nube.ejercicios = 40; nube.actualizado = 200;
  const nav = store.estadoInicial(); nav.tokens = 3; nav.ejercicios = 3; nav.actualizado = 100;
  assert.equal(store.decidirAlEntrar(null, nav), 'subir');           // primera vez: la nube toma el navegador
  assert.equal(store.decidirAlEntrar(nube, vacio), 'bajar');         // celular nuevo: trae el avance de la nube
  assert.equal(store.decidirAlEntrar(vacio, nav), 'subir');
  assert.equal(store.decidirAlEntrar(nube, nav), 'preguntar');       // los dos tienen avance distinto
  const igual = JSON.parse(JSON.stringify(nube)); igual.actualizado = 300;
  assert.equal(store.decidirAlEntrar(nube, igual), 'subir');         // mismo avance: gana el más reciente
});

test('sugerencias: se guardan sin texto vacío', () => {
  const s = store.estadoInicial();
  assert.equal(store.agregarSugerencia(s, '   '), false);
  assert.equal(store.agregarSugerencia(s, 'Agregar japonés'), true);
  assert.equal(s.sugerencias[0].enviada, false);
});

test('normalizar completa campos nuevos en datos antiguos', () => {
  const s = store.normalizar({ tokens: 9, ajustes: { tema: 'oscuro' } });
  assert.equal(s.tokens, 9);
  assert.equal(s.ajustes.tema, 'oscuro');
  assert.equal(s.ajustes.paleta, 'higo');
  assert.equal(store.normalizar({ ajustes: { paleta: 'lavanda' } }).ajustes.paleta, 'higo');
  assert.deepEqual(s.racha, { actual: 0, mejor: 0, ultimoDia: null });
});

test('premios incrementales: 10, 15, 23, 34… monedas', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(store.premioDeNivel), [10, 15, 23, 34, 51]);
});

test('cada 10 palabras revisadas en el día se cobra un premio, y al día siguiente se reinicia', () => {
  const s = store.estadoInicial();
  const dia1 = new Date(2026, 9, 13, 10).getTime();
  const premios = [];
  for (let i = 0; i < 25; i++) { const p = store.contarRevision(s, dia1); if (p) premios.push(p); }
  assert.deepEqual(premios.map((p) => [p.revisadas, p.monedas, p.siguiente]), [[10, 10, 15], [20, 15, 23]]);
  assert.equal(s.tokens, 25);
  assert.equal(s.diario.revisadas, 25);
  const dia2 = new Date(2026, 9, 14, 9).getTime();
  assert.equal(store.contarRevision(s, dia2), null);
  assert.equal(s.diario.revisadas, 1);
  assert.equal(s.diario.premios, 0);
});

test('la sakura del día florece por etapas hasta cumplir la meta', () => {
  assert.equal(store.etapaFlor(0, 10), 0);
  assert.equal(store.etapaFlor(3, 10), 1);
  assert.equal(store.etapaFlor(5, 10), 2);
  assert.equal(store.etapaFlor(9, 10), 3);
  assert.equal(store.etapaFlor(10, 10), 4);
  assert.equal(store.etapaFlor(40, 10), 4);
  assert.equal(store.etapaFlor(5, 5), 4);
  assert.equal(store.normalizar({ ajustes: { meta: 5 } }).ajustes.meta, 20); // la meta es fija: 20
});

test('cofre de monedas cada 7 días de racha, una sola vez por hito', () => {
  const s = store.estadoInicial();
  s.racha.actual = 6;
  assert.equal(store.abrirCofre(s), null);
  s.racha.actual = 7;
  assert.deepEqual(store.abrirCofre(s), { dias: 7, monedas: 50 });
  assert.equal(s.tokens, 50);
  assert.equal(store.abrirCofre(s), null); // ya se abrió hoy
  s.racha.actual = 14;
  assert.deepEqual(store.abrirCofre(s), { dias: 14, monedas: 75 });
});

test('historia del día: índice estable por día y cambia entre días', async () => {
  const st = await import('../app/js/store.js');
  const a = st.indiceDelDia('2026-10-14', 626);
  assert.equal(a, st.indiceDelDia('2026-10-14', 626));
  assert.ok(a >= 0 && a < 626);
  const dias = new Set(['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'].map((d) => st.indiceDelDia(d, 626)));
  assert.ok(dias.size >= 4, 'días distintos dan frases distintas');
  assert.equal(st.indiceDelDia('2026-10-14', 0), -1);
  const e = {};
  assert.equal(st.historiaVista(e), false);
  st.marcarHistoriaVista(e);
  assert.equal(st.historiaVista(e), true);
});
