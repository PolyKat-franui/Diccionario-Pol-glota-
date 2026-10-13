// Franui — interfaz. Rutas con # (funciona en cualquier hosting estático, p. ej. GitHub Pages).
import { t, tn, setIdiomaUI, tMega, tTipo, nombreIdioma, IDIOMAS_UI, MEGA_TEMAS } from './i18n.js';
import * as store from './store.js';
import { PALETAS } from './store.js';
import { dificultad } from './srs.js';
import { armarSesion, practicaLibre, ordenar, grupoDificultad, bloques, bloqueActual, REINSERTAR_EN, MAX_REPETICIONES } from './sesion.js';
import * as banco from './banco.js';
import { hablar } from './voz.js';
import { ICON } from './iconos.js';
import { sonido, activarSonido } from './sonido.js';
import { buscar, fraseConocida, normalizar } from './kitty.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vista = $('#vista');

let S = store.cargar();
let idiomas = [];
let sesion = null;
let primeraCarga = true;

// ---------- Guardado automático ----------
let timerGuardar = null;
function guardar() {
  clearTimeout(timerGuardar);
  timerGuardar = setTimeout(() => store.guardar(S), 150);
}
const guardarYa = () => { clearTimeout(timerGuardar); store.guardar(S); };
addEventListener('pagehide', guardarYa);
document.addEventListener('visibilitychange', () => { if (document.hidden) guardarYa(); });

// ---------- Ajustes visuales ----------
function aplicarAjustes() {
  const a = S.ajustes;
  const root = document.documentElement;
  if (a.tema === 'sistema') root.removeAttribute('data-theme');
  else root.dataset.theme = a.tema === 'oscuro' ? 'dark' : 'light';
  root.dataset.paleta = a.paleta;
  activarSonido(a.sonido);
  root.style.setProperty('--escala', a.escala);
  $('#capa-brillo').style.opacity = String(Math.max(0, 1 - a.brillo));
  root.lang = a.nativo;
  setIdiomaUI(a.nativo);
}

function nativoInicial() {
  const nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
  return IDIOMAS_UI.includes(nav) ? nav : 'es';
}

// ---------- Avisos ----------
let timerToast = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => el.classList.remove('visible'), 3200);
}

function modal(titulo, html) {
  $('#modal-titulo').textContent = titulo;
  $('#modal-cuerpo').innerHTML = html;
  $('#modal-cerrar').textContent = t('cerrar');
  $('#modal').showModal();
}

// ---------- Marco: barra superior, pestañas, Kitty ----------
const NAV = [
  ['aprender', ICON.libro],
  ['favoritos', ICON.corazon],
  ['ranking', ICON.trofeo],
  ['novedades', ICON.brillo],
];

/** Ruta de una expresión de Kitty (ver app/assets/caras/caras.json). */
const cara = (nombre) => `assets/caras/${nombre}.svg`;
let tokensVistos = null;

function actualizarChips() {
  const racha = store.rachaVigente(S.racha);
  const chipR = $('#chip-racha');
  chipR.querySelector('span').textContent = racha;
  chipR.setAttribute('aria-label', tn('racha_n', racha));
  chipR.title = tn('racha_n', racha);
  const chipT = $('#chip-tokens');
  chipT.querySelector('span:last-child').textContent = S.tokens;
  // la moneda gira cuando ganas Kitty tokens
  if (tokensVistos !== null && S.tokens > tokensVistos) {
    const m = chipT.querySelector('.moneda');
    m.classList.remove('gira'); void m.offsetWidth; m.classList.add('gira');
  }
  tokensVistos = S.tokens;
  chipT.setAttribute('aria-label', t('tokens_n', { n: S.tokens }));
  chipT.title = t('tokens_n', { n: S.tokens });
}

function pintarMarco(ruta) {
  const enInicio = ruta === 'inicio';
  $('#barra').hidden = enInicio;
  $('#tabbar').hidden = enInicio;
  $('#kitty-fab').hidden = enInicio;
  const activa = ruta === 'tema' || ruta === 'estudiar' || ruta === 'idiomas' ? 'aprender' : ruta;
  const links = NAV.map(([k, icon]) =>
    `<a href="#/${k}" ${k === activa ? 'aria-current="page"' : ''}>${icon}<span>${t('nav_' + k)}</span></a>`).join('');
  $('#nav-sup').innerHTML = links;
  $('#tabbar').innerHTML = links;
  actualizarChips();
  $('#lbl-nativo').textContent = t('idioma_nativo');
  $('#sel-nativo').innerHTML = IDIOMAS_UI.map((c) =>
    `<option value="${c}" ${c === S.ajustes.nativo ? 'selected' : ''} title="${esc(nombreIdioma(c, c))}">${c.toUpperCase()}</option>`).join('');
  const inicial = (S.perfil.nombre || '').trim().charAt(0).toUpperCase();
  const avatar = $('#avatar');
  avatar.innerHTML = inicial ? esc(inicial) : ICON.usuario;
  avatar.setAttribute('aria-label', t('perfil'));
  const aj = $('#btn-ajustes');
  aj.innerHTML = ICON.ajustes;
  aj.setAttribute('aria-label', t('nav_ajustes'));
  $('#kitty-fab').setAttribute('aria-label', t('kitty_abrir'));
  $('#kitty-cerrar').innerHTML = ICON.cerrar;
  $('#kitty-cerrar').setAttribute('aria-label', t('cerrar'));
  $('#kitty-enviar').innerHTML = ICON.enviar;
  $('#kitty-enviar').setAttribute('aria-label', t('aj_enviar'));
  $('#kitty-input').placeholder = t('kitty_placeholder');
  $('#kitty-input').setAttribute('aria-label', t('kitty_placeholder'));
  $('#kitty-modo').textContent = t('kitty_modo');
}

function cambiarNativo(code) {
  if (!IDIOMAS_UI.includes(code)) return;
  S.ajustes.nativo = code;
  if (S.aprendiendo === code) S.aprendiendo = null;
  guardar();
  aplicarAjustes();
  kittyEntradas = null;
  router();
}
$('#sel-nativo').addEventListener('change', (e) => cambiarNativo(e.target.value));

// ---------- Router ----------
function leerRuta() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const partes = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { nombre: partes[0] || '', args: partes.slice(1), q: new URLSearchParams(qs || '') };
}

const RUTAS = {
  inicio: vistaInicio,
  conservar: vistaConservar,
  idiomas: vistaIdiomas,
  aprender: vistaAprender,
  tema: vistaTema,
  estudiar: vistaEstudiar,
  favoritos: vistaFavoritos,
  ranking: vistaRanking,
  novedades: vistaNovedades,
  ajustes: vistaAjustes,
};

async function router() {
  const r = leerRuta();
  if (!S.perfil.elegido && r.nombre !== 'inicio' && r.nombre !== 'conservar') return void location.replace('#/inicio');
  if (!RUTAS[r.nombre]) return void location.replace('#/aprender');
  cerrarSesion();
  document.body.dataset.ruta = r.nombre;
  pintarMarco(r.nombre);
  await RUTAS[r.nombre](r);
  if (!primeraCarga) vista.focus({ preventScroll: true });
  primeraCarga = false;
  if (r.nombre !== 'estudiar') scrollTo(0, 0);
}
addEventListener('hashchange', router);
// Clic suave en botones y enlaces (los sonidos especiales se suman encima)
document.addEventListener('pointerdown', (e) => { if (e.target.closest('button, a, [role="radio"], input[type="checkbox"], select')) sonido.toque(); }, { passive: true });

/** Navega; si ya estamos en esa dirección, vuelve a dibujar la vista. */
function ir(hash) {
  if (location.hash === hash) router();
  else location.hash = hash;
}

function cargando() {
  vista.innerHTML = '<div class="cargando" aria-busy="true"><img src="assets/corazon.svg" alt="" width="52" height="48"></div>';
}

// ---------- Inicio: entrar / crear cuenta / invitado ----------
function vistaInicio() {
  let modo = 'entrar';
  vista.innerHTML = `
    <section class="inicio">
      <div class="inicio-hero">
        <img class="inicio-kitty" src="assets/caras/feliz.svg" alt="Kitty" width="80" height="64">
        <h1 class="marca-completa"><span class="logo apilado"><span class="logo-a">Polyglok</span> <span class="logo-b">in progress</span></span><span class="marca-linea" aria-hidden="true"></span><span class="eslogan">Be fluent in multiple languages</span></h1>
      </div>
      <div class="card inicio-card">
        <div class="seg" role="tablist">
          <button role="tab" type="button" data-modo="entrar" aria-selected="true">${t('login_entrar')}</button>
          <button role="tab" type="button" data-modo="crear" aria-selected="false">${t('login_crear')}</button>
        </div>
        <form id="f-login" novalidate>
          <label class="campo"><span>${t('login_usuario')}</span>
            <input name="usuario" autocomplete="username" maxlength="30" required></label>
          <label class="campo"><span>${t('login_clave')}</span>
            <input name="clave" type="password" minlength="6" autocomplete="current-password" aria-describedby="ayuda-clave" required>
            <small id="ayuda-clave">${t('login_clave_min')}</small></label>
          <p class="error" id="login-error" role="alert"></p>
          <button class="btn primario ancho" type="submit" id="btn-login">${t('login_entrar')}</button>
        </form>
        <div class="separador"><span>${t('login_o')}</span></div>
        <button class="btn ancho" type="button" id="btn-google">${ICON.google}<span>${t('login_google')}</span></button>
        <button class="btn fantasma ancho" type="button" id="btn-invitado">${t('login_invitado')}</button>
        <p class="suave centro pequeno">${t('login_invitado_nota')}</p>
      </div>
      <label class="campo inicio-idioma"><span>${t('idioma_nativo')}</span>
        <select id="inicio-nativo">${IDIOMAS_UI.map((c) => `<option value="${c}" ${c === S.ajustes.nativo ? 'selected' : ''}>${esc(nombreIdioma(c, c))}</option>`).join('')}</select>
      </label>
    </section>`;

  $$('.seg [role=tab]').forEach((b) => b.addEventListener('click', () => {
    modo = b.dataset.modo;
    $$('.seg [role=tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $('#btn-login').textContent = t(modo === 'entrar' ? 'login_entrar' : 'login_crear');
    $('[name=clave]').autocomplete = modo === 'entrar' ? 'current-password' : 'new-password';
  }));
  $('#inicio-nativo').addEventListener('change', (e) => cambiarNativo(e.target.value));

  const continuar = (nombre = '') => {
    S.perfil.elegido = true;
    if (nombre) S.perfil.nombre = nombre;
    guardar();
    ir(S.aprendiendo ? '#/aprender' : '#/idiomas');
  };
  $('#f-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const usuario = String(f.get('usuario') || '').trim();
    const clave = String(f.get('clave') || '');
    const err = !usuario ? t('login_error_usuario') : clave.length < 6 ? t('login_error_clave') : '';
    $('#login-error').textContent = err;
    if (err) return;
    // Las cuentas reales necesitan un servidor (ver docs/RECOMENDACIONES.md). La contraseña no se guarda.
    toast(t('login_pronto'));
    continuar(usuario);
  });
  $('#btn-google').addEventListener('click', () => toast(t('login_pronto')));
  $('#btn-invitado').addEventListener('click', () => continuar());
}

// ---------- ¿Qué avance conservo? ----------
function cuentaDeMuestra() {
  const demo = store.estadoInicial();
  demo.tokens = 240; demo.ejercicios = 180;
  demo.racha = { actual: 12, mejor: 15, ultimoDia: store.diaLocal(Date.now()) };
  demo.progreso = { en: Object.fromEntries(Array.from({ length: 95 }, (_, i) => [`demo${i}`, { c: 1, d: 0, v: 1, a: 1, f: 0 }])) };
  return demo;
}

function vistaConservar(r) {
  const demo = r.q.get('demo') === '1';
  const cuenta = demo ? cuentaDeMuestra() : null; // con cuentas reales: vendrá del servidor
  if (!cuenta || (!demo && !store.hayConflicto(cuenta, S))) return void (location.hash = '#/aprender');
  const linea = (est) => t('cons_linea', store.resumen(est));
  vista.innerHTML = `
    <section class="pagina angosta">
      <h1 class="display">${t('cons_titulo')}</h1>
      <p class="suave">${t('cons_texto')}</p>
      ${demo ? `<p class="aviso">${t('cons_demo')}</p>` : ''}
      <div class="opciones-avance">
        <button class="opcion" data-eleccion="cuenta">${ICON.usuario}<strong>${t('cons_cuenta')}</strong><span>${esc(linea(cuenta))}</span></button>
        <button class="opcion" data-eleccion="navegador">${ICON.libro}<strong>${t('cons_navegador')}</strong><span>${esc(linea(S))}</span></button>
      </div>
    </section>`;
  $$('.opcion').forEach((b) => b.addEventListener('click', () => {
    if (!demo) { S = store.elegirAvance(cuenta, S, b.dataset.eleccion); guardar(); }
    else toast(`✓ ${b.querySelector('strong').textContent}`);
    ir('#/aprender');
  }));
}

// ---------- Idiomas ----------
async function cargarIdiomas() {
  if (!idiomas.length) idiomas = (await (await fetch('data/idiomas.json')).json()).idiomas;
  return idiomas;
}

async function vistaIdiomas() {
  await cargarIdiomas();
  const nativo = S.ajustes.nativo;
  const tarjetas = idiomas.filter((i) => i.code !== nativo).map((i) => {
    const pronto = i.estado === 'proximamente';
    const etiqueta = i.code === S.aprendiendo ? `<span class="tag tag-activo">${t('aprendiendo')}</span>`
      : i.estado === 'nuevo' ? `<span class="tag tag-nuevo">${t('estado_nuevo')}</span>`
        : pronto ? `<span class="tag tag-pronto">${t('estado_pronto')}</span>` : '';
    return `<button class="idioma ${pronto ? 'pronto' : ''} ${i.estado === 'nuevo' ? 'nuevo' : ''}" data-code="${i.code}" ${pronto ? 'aria-disabled="true"' : ''}>
        <span class="monograma" aria-hidden="true">${i.code.toUpperCase()}</span>
        <span class="idioma-txt"><strong>${esc(nombreIdioma(i.code))}</strong><small lang="${i.code}">${esc(nombreIdioma(i.code, i.code))}</small></span>
        ${etiqueta}
      </button>`;
  }).join('');
  vista.innerHTML = `
    <section class="pagina">
      <p class="sobretitulo">${t('nav_aprender')}</p>
      <h1 class="display">${t('idiomas_titulo')}</h1>
      <p class="suave">${t('idiomas_sub')}</p>
      <div class="grid-idiomas">${tarjetas}</div>
    </section>`;
  $$('.idioma').forEach((b) => b.addEventListener('click', () => {
    if (b.getAttribute('aria-disabled') === 'true') return toast(t('estado_pronto'));
    S.aprendiendo = b.dataset.code;
    guardar();
    ir('#/aprender');
  }));
}

// ---------- Temas (13 mega temas) como red de neuronas ----------
const ICON_NIVEL = { nueva: ICON.nueva, dificil: ICON.dificil, media: ICON.media, facil: ICON.facil, dominada: ICON.dominada };
const ICON_DIF = { todas: ICON.todas, facil: ICON.facil, medio: ICON.media, dificil: ICON.dificil };
/** Insignia de dificultad: ícono + texto, en el color de su nivel. */
const insignia = (niv) => `<span class="nivel" data-nivel="${niv}">${ICON_NIVEL[niv]}<span>${t('niv_' + niv)}</span></span>`;
const colorTema = (mega) => `var(--tema-${MEGA_TEMAS.indexOf(mega) + 1})`;
const CARRILES = [0, 1, 2, 1]; // zigzag de la red: izquierda, centro, derecha, centro…

function resumenMega(lista, mega, prog) {
  const ids = lista.filter((c) => c.megas.includes(mega)).map((c) => c.id);
  const vistas = ids.filter((id) => (prog[id]?.c ?? 0) >= 1).length;
  return { ids, pct: ids.length ? Math.round((vistas / ids.length) * 100) : 0 };
}

async function vistaAprender() {
  if (!S.aprendiendo) return vistaIdiomas();
  const meta = S.aprendiendo, nativo = S.ajustes.nativo;
  cargando();
  await banco.prepararPar(meta, nativo);
  const lista = banco.disponibles(meta, nativo);
  const prog = store.progresoDe(S, meta);
  const nodos = MEGA_TEMAS.map((m, i) => {
    const { ids, pct } = resumenMega(lista, m, prog);
    const vacio = !ids.length;
    return `<li class="nodo carril-${CARRILES[i % 4]}" style="--c:${colorTema(m)};--i:${i + 1}">
        <a class="neurona ${vacio ? 'vacio' : ''}" href="#/tema/${encodeURIComponent(m)}" ${vacio ? 'aria-disabled="true" tabindex="-1"' : ''}>
          <span class="neurona-soma" role="progressbar" aria-label="${esc(tMega(m))}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" style="--p:${pct}"><span class="neurona-pct">${pct}%</span></span>
          <span class="neurona-txt"><strong>${esc(tMega(m))}</strong><small>${vacio ? t('traduccion_en_camino') : tn('tarjetas_n', ids.length)}</small></span>
        </a>
      </li>`;
  }).join('');
  vista.innerHTML = `
    <section class="pagina">
      <div class="cabecera-aprender">
        <div>
          <p class="sobretitulo">${t('aprendiendo')} · <span lang="${meta}">${esc(nombreIdioma(meta))}</span></p>
          <h1 class="display">${t('temas_titulo')}</h1>
          <p class="suave">${t('temas_sub')}</p>
        </div>
      </div>
      <div class="red" id="red">
        <svg class="red-sinapsis" aria-hidden="true"></svg>
        <ol class="red-nodos">
          <li class="nodo carril-1 raiz" style="--c:var(--primary);--i:0">
            <a class="neurona" href="#/idiomas" aria-label="${t('cambiar_idioma')}">
              <span class="neurona-soma"><span class="neurona-pct">${meta.toUpperCase()}</span></span>
              <span class="neurona-txt"><strong lang="${meta}">${esc(nombreIdioma(meta))}</strong><small>${t('cambiar_idioma')}</small></span>
            </a>
          </li>
          ${nodos}
        </ol>
      </div>
    </section>`;
  $$('.neurona.vacio').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); toast(t('traduccion_en_camino')); }));
  dibujarSinapsis();
}

/** Une las neuronas con curvas (axones) y líneas finas (dendritas); un impulso recorre cada axón. */
function dibujarSinapsis() {
  const red = $('#red');
  if (!red) return;
  const svg = $('.red-sinapsis', red);
  const caja = red.getBoundingClientRect();
  const nodos = $$('.nodo', red);
  const pts = nodos.map((n) => { const r = $('.neurona-soma', n).getBoundingClientRect(); return [r.left - caja.left + r.width / 2, r.top - caja.top + r.height / 2]; });
  const curva = ([x1, y1], [x2, y2]) => { const my = (y1 + y2) / 2; return `M${x1.toFixed(1)} ${y1.toFixed(1)}C${x1.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`; };
  let html = '';
  for (let i = 0; i + 2 < pts.length; i++) html += `<path class="dendrita" d="${curva(pts[i], pts[i + 2])}"/>`;
  for (let i = 0; i + 1 < pts.length; i++) {
    const c = nodos[i + 1].style.getPropertyValue('--c');
    html += `<path class="axon" style="--c:${c}" d="${curva(pts[i], pts[i + 1])}"/><path class="impulso" style="--c:${c};--i:${i}" pathLength="100" d="${curva(pts[i], pts[i + 1])}"/>`;
  }
  svg.setAttribute('viewBox', `0 0 ${caja.width.toFixed(0)} ${caja.height.toFixed(0)}`);
  svg.innerHTML = html;
}
let timerRed = 0;
addEventListener('resize', () => { clearTimeout(timerRed); timerRed = setTimeout(dibujarSinapsis, 120); });

// ---------- Un mega tema: dificultad y empezar (sin subtemas, decisión 2026-10-13) ----------
async function vistaTema(r) {
  const mega = r.args[0];
  if (!S.aprendiendo || !MEGA_TEMAS.includes(mega)) return void (location.hash = '#/aprender');
  const meta = S.aprendiendo, nativo = S.ajustes.nativo;
  cargando();
  await banco.prepararPar(meta, nativo);
  const lista = banco.disponibles(meta, nativo);
  const base = lista.filter((c) => c.megas.includes(mega));
  const prog = store.progresoDe(S, meta);
  const { pct } = resumenMega(lista, mega, prog);
  let dif = 'todas';

  const pintar = () => {
    const sel = dif === 'todas' ? base : base.filter((c) => grupoDificultad(c) === dif);
    const ids = ordenar(sel).map((c) => c.id);
    const bl = bloques(ids);
    const dominadas = ids.filter((id) => dificultad(prog[id]) === 'dominada').length;
    $('#tema-info').textContent = ids.length
      ? `${tn('tarjetas_n', ids.length)} · ${t('bloque_n', { n: bloqueActual(bl, prog) + 1, total: bl.length })}${dominadas ? ' · ' + t('dominadas_n', { n: dominadas }) : ''}`
      : '—';
    const cuenta = (d) => (d === 'todas' ? base.length : base.filter((c) => grupoDificultad(c) === d).length);
    $('#difs').innerHTML = ['todas', 'facil', 'medio', 'dificil'].map((d) =>
      `<button type="button" class="dif-opcion" role="radio" aria-checked="${d === dif}" data-dif="${d}" ${cuenta(d) ? '' : 'disabled'}>
        ${ICON_DIF[d]}<span>${t('dif_' + d)}</span><small>${cuenta(d)}</small></button>`).join('');
    $$('#difs button').forEach((b) => b.addEventListener('click', () => { dif = b.dataset.dif; pintar(); }));
    $('#btn-empezar').disabled = !ids.length;
  };

  vista.innerHTML = `
    <section class="pagina angosta tema-pagina" style="--c:${colorTema(mega)}">
      <a class="volver" href="#/aprender">${ICON.atras}<span>${t('volver')}</span></a>
      <div class="tema-cabeza">
        <span class="neurona-soma grande" role="progressbar" aria-label="${esc(tMega(mega))}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" style="--p:${pct}"><span class="neurona-pct">${pct}%</span></span>
        <div><h1 class="display">${esc(tMega(mega))}</h1><p class="suave" id="tema-info"></p></div>
      </div>
      <p class="sobretitulo" id="lbl-dif">${t('dificultad')}</p>
      <div class="difs" id="difs" role="radiogroup" aria-labelledby="lbl-dif"></div>
      <div class="cta-fija"><button class="btn primario grande" id="btn-empezar">${t('empezar')}</button></div>
    </section>`;
  pintar();
  $('#btn-empezar').addEventListener('click', () => { location.hash = `#/estudiar?${new URLSearchParams({ mega, dif })}`; });
}

// ---------- Estudiar: feed de tarjetas que se deslizan ----------
function cerrarSesion() {
  if (!sesion) return;
  sesion.observer?.disconnect();
  sesion = null;
}

function idsParaEstudiar(q, meta, nativo) {
  const lista = banco.disponibles(meta, nativo);
  if (q.get('fav') === '1') {
    const favs = new Set(S.favoritos[meta] ?? []);
    return ordenar(lista.filter((c) => favs.has(c.id))).map((c) => c.id);
  }
  const mega = q.get('mega'), tema = q.get('tema'), dif = q.get('dif') || 'todas';
  return ordenar(lista.filter((c) => (!mega || c.megas.includes(mega))
    && (!tema || c.temas.includes(tema))
    && (dif === 'todas' || grupoDificultad(c) === dif))).map((c) => c.id);
}

async function vistaEstudiar(r) {
  if (!S.aprendiendo) return void (location.hash = '#/idiomas');
  const meta = S.aprendiendo, nativo = S.ajustes.nativo;
  cargando();
  await banco.prepararPar(meta, nativo);
  const ids = idsParaEstudiar(r.q, meta, nativo);
  const prog = store.progresoDe(S, meta);
  const libre = r.q.get('libre') === '1' || r.q.get('fav') === '1';
  const plan = libre ? { cola: practicaLibre({ ids, progreso: prog }), motivo: 'normal' } : armarSesion({ ids, progreso: prog });
  const volverA = r.q.get('mega') ? `#/tema/${encodeURIComponent(r.q.get('mega'))}` : r.q.get('fav') ? '#/favoritos' : '#/aprender';

  if (!ids.length || !plan.cola.length) {
    const q = new URLSearchParams(r.q); q.set('libre', '1');
    vista.innerHTML = `
      <section class="pagina angosta centro vacio-estado">
        <img class="cara-grande" src="${cara(ids.length ? 'orgullosa' : 'pensando')}" alt="" width="80" height="64">
        <h1 class="display">${ids.length ? t('aldia_titulo') : t('traduccion_en_camino')}</h1>
        <p class="suave">${ids.length ? t('aldia_texto') : t('vacio_tema')}</p>
        <div class="acciones">
          ${ids.length ? `<a class="btn primario" href="#/estudiar?${q}">${t('practicar')}</a>` : ''}
          <a class="btn" href="${volverA}">${t('cambiar_tema')}</a>
        </div>
      </section>`;
    return;
  }

  sesion = { meta, nativo, sabias: 0, repasar: 0, tokens: 0, reps: {}, actual: 0, k: 0, terminada: false, ruta: location.hash, volverA };
  vista.innerHTML = `
    <section class="feed" id="feed" aria-label="${t('nav_aprender')}">
      <div class="feed-progreso" aria-hidden="true"><span class="progreso"><i id="feed-barra"></i></span><span id="feed-cuenta"></span></div>
      ${plan.cola.map((id, i) => htmlSlide(id, i === 0)).join('')}
      <article class="slide fin" id="slide-fin" aria-live="polite"></article>
    </section>`;
  const feed = $('#feed');
  feed.addEventListener('click', clickFeed);
  activarDeslizar(feed);
  sesion.observer = new IntersectionObserver(alVerSlide, { root: feed, threshold: 0.6 });
  $$('.slide', feed).forEach((s) => sesion.observer.observe(s));
  actualizarCuenta();
}

function htmlSlide(id, primera = false) {
  const { meta, nativo } = sesion;
  const c = banco.concepto(id);
  const a = banco.texto(meta, id), b = banco.texto(nativo, id);
  const niv = dificultad(store.progresoDe(S, meta)[id]);
  const fav = store.esFavorito(S, meta, id);
  const k = sesion.k++;
  return `
    <article class="slide" data-id="${id}" data-k="${k}">
      <div class="tarjeta">
        <div class="tarjeta-top">
          ${insignia(niv)}
          <span class="tipo">${c.tipos.map((x) => esc(tTipo(x))).join(' · ')}</span>
        </div>
        <div class="tarjeta-centro">
          <h2 class="palabra" lang="${meta}">${esc(a.texto)}</h2>
          ${a.ipa && S.ajustes.ipa ? `<p class="ipa" lang="${meta}" title="IPA">/${esc(a.ipa)}/</p>` : ''}
          <button class="revelar" type="button" aria-expanded="false">
            <span class="traduccion" lang="${nativo}" aria-hidden="true">${esc(b.texto)}</span>
            <span class="revelar-hint">${t('toca_ver')}</span>
          </button>
          ${a.borrador || b.borrador ? `<span class="borrador">${t('borrador')}</span>` : ''}
        </div>
        <div class="riel">
          <button class="riel-btn btn-fav" type="button" aria-pressed="${fav}" aria-label="${t(fav ? 'quitar_favorito' : 'favorito')}">${fav ? ICON.corazonLleno : ICON.corazon}</button>
          <button class="riel-btn btn-audio" type="button" aria-label="${t('escuchar')}">${ICON.audio}</button>
        </div>
        <button class="kitty-ayuda" type="button" aria-label="${t('kitty_abrir')}"><img src="assets/caras/feliz.svg" alt="" width="60" height="48"></button>
        <span class="sello sello-no" aria-hidden="true">${ICON.repetir}${t('repasar')}</span>
        <span class="sello sello-si" aria-hidden="true">${ICON.check}${t('lo_se')}</span>
        <div class="tarjeta-acciones">
          <button class="btn btn-repasar" type="button"><span aria-hidden="true">←</span>${ICON.repetir}<span>${t('repasar')}</span></button>
          <button class="btn primario btn-sabe" type="button">${ICON.check}<span>${t('lo_se')}</span><span aria-hidden="true">→</span></button>
        </div>
        ${primera ? `<p class="hint-deslizar" aria-hidden="true">${t('desliza_lados')}</p>` : ''}
      </div>
    </article>`;
}

function slidesDeFeed() { return $$('#feed .slide:not(.fin)'); }

function actualizarCuenta() {
  const slides = slidesDeFeed();
  const hechas = slides.filter((s) => s.dataset.r).length;
  $('#feed-cuenta').textContent = `${hechas} / ${slides.length}`;
  $('#feed-barra').style.width = `${(hechas / slides.length) * 100}%`;
}

function responderSlide(slide, sabia, auto = false) {
  if (!sesion || slide.dataset.r) return;
  const { meta } = sesion;
  const id = slide.dataset.id;
  slide.dataset.r = sabia ? 'si' : 'no';
  sesion.tokens += store.registrarRespuesta(S, meta, id, sabia);
  sabia ? sesion.sabias++ : sesion.repasar++;
  if (!auto) {
    sonido.moneda(0.05, sabia ? 2 : 0);
    volarMonedas(slide, sabia ? 3 : 1);
    const premio = store.contarRevision(S);
    if (premio) { sesion.tokens += premio.monedas; setTimeout(() => mostrarPremio(premio), 700); }
  }
  const niv = dificultad(store.progresoDe(S, meta)[id]);
  $('.nivel', slide).outerHTML = insignia(niv);
  if (!auto) flotar(slide, '+1');

  if (!sabia) {
    sesion.reps[id] = (sesion.reps[id] ?? 0) + 1;
    // "Repasar" vuelve hasta 2 veces; una tarjeta solo deslizada, 1 vez (para no inflar la sesión).
    if (sesion.reps[id] <= (auto ? 1 : MAX_REPETICIONES)) {
      const slides = slidesDeFeed();
      const pos = Math.max(slides.indexOf(slide) + REINSERTAR_EN, sesion.actual + 1);
      const tmp = document.createElement('div');
      tmp.innerHTML = htmlSlide(id);
      const nueva = tmp.firstElementChild;
      (slides[pos] ?? $('#slide-fin')).before(nueva);
      sesion.observer.observe(nueva);
    }
  }
  guardar();
  actualizarChips();
  actualizarCuenta();
  if (!auto) setTimeout(() => irA(1), 380);
}

function irA(delta) {
  const todas = $$('#feed .slide');
  const destino = todas[Math.min(Math.max(sesion.actual + delta, 0), todas.length - 1)];
  destino?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

function alVerSlide(entries) {
  if (!sesion) return;
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const todas = $$('#feed .slide');
    const i = todas.indexOf(e.target);
    const avanzo = i > sesion.actual;
    sesion.actual = i;
    // Deslizar sin marcar = "repasar": la tarjeta vuelve a salir (como pide la especificación).
    if (avanzo) todas.slice(0, i).forEach((s) => { if (!s.classList.contains('fin') && !s.dataset.r) responderSlide(s, false, true); });
    if (e.target.id === 'slide-fin') terminar();
  }
}

function terminar() {
  if (!sesion || sesion.terminada) return;
  sesion.terminada = true;
  sesion.tokens += store.terminarSesion(S);
  sonido.fin();
  guardar();
  actualizarChips();
  const racha = store.rachaVigente(S.racha);
  $('#slide-fin').innerHTML = `
    <div class="tarjeta fin-card">
      <div class="lluvia" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<img src="assets/sakura.svg" alt="" width="23" height="23" style="--i:${i}">`).join('')}</div>
      <img class="cara-grande" src="${cara(sesion.sabias >= sesion.repasar ? 'celebrando' : 'muy_feliz')}" alt="" width="80" height="64">
      <h2 class="display">${t('fin_titulo')}</h2>
      <dl class="stats">
        <div><dt>${t('fin_sabias')}</dt><dd>${sesion.sabias}</dd></div>
        <div><dt>${t('fin_repasar')}</dt><dd>${sesion.repasar}</dd></div>
        <div><dt>${t('fin_tokens')}</dt><dd>+${sesion.tokens}</dd></div>
      </dl>
      <p class="racha-fin"><img src="assets/sakura.svg" alt="" width="46" height="46">${tn('racha_n', racha)}</p>
      <div class="acciones">
        <button class="btn primario" type="button" id="btn-otra">${t('otra_sesion')}</button>
        <a class="btn" href="${sesion.volverA}">${t('cambiar_tema')}</a>
      </div>
    </div>`;
  $('#btn-otra').addEventListener('click', () => router());
}

function flotar(slide, texto) {
  const el = document.createElement('span');
  el.className = 'flotante';
  el.innerHTML = `<img src="assets/moneda.svg" alt="" width="24" height="24">${texto}`;
  el.setAttribute('aria-hidden', 'true');
  $('.tarjeta', slide).append(el);
  setTimeout(() => el.remove(), 900);
}

const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Responde con animación: la tarjeta sale volando a la derecha (Lo sé) o a la izquierda (Repasar). */
function lanzarTarjeta(slide, sabia) {
  if (!sesion || slide.dataset.r) return;
  const tarj = $('.tarjeta', slide);
  sonido.deslizar(sabia);
  if (!sinMovimiento()) {
    tarj.classList.add('volando');
    tarj.style.setProperty('--sw', sabia ? 1 : -1);
    tarj.style.transform = `translateX(${sabia ? 125 : -125}vw) rotate(${sabia ? 22 : -22}deg)`;
    setTimeout(() => { tarj.classList.remove('volando', 'arrastrando'); tarj.style.transform = ''; tarj.style.removeProperty('--sw'); }, 1100);
  }
  responderSlide(slide, sabia);
}

/** Deslizar la tarjeta con el dedo o el mouse: → Lo sé, ← Repasar. El scroll vertical sigue pasando tarjetas. */
let ignorarClick = false;
function activarDeslizar(feed) {
  let d = null;
  const UMBRAL = 90;
  feed.addEventListener('pointerdown', (e) => {
    const tarj = e.target.closest('.tarjeta');
    if (!tarj || e.button > 0 || e.target.closest('.riel, .kitty-ayuda, .tarjeta-acciones, a')) return;
    const slide = tarj.closest('.slide');
    if (!slide || slide.classList.contains('fin') || slide.dataset.r) return;
    d = { tarj, slide, x0: e.clientX, y0: e.clientY, dx: 0, activo: false, id: e.pointerId };
  });
  feed.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.activo) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        d.activo = true;
        d.tarj.setPointerCapture?.(d.id);
        d.tarj.classList.add('arrastrando');
      } else if (Math.abs(dy) > 12) { d = null; return; } else return;
    }
    d.dx = dx;
    d.tarj.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
    d.tarj.style.setProperty('--sw', Math.max(-1, Math.min(1, dx / UMBRAL)).toFixed(2));
  });
  const soltar = () => {
    if (!d) return;
    const { tarj, slide, dx, activo } = d;
    d = null;
    if (!activo) return;
    ignorarClick = true;
    setTimeout(() => { ignorarClick = false; }, 60);
    if (Math.abs(dx) >= UMBRAL) lanzarTarjeta(slide, dx > 0);
    else {
      tarj.classList.remove('arrastrando');
      tarj.style.transform = '';
      tarj.style.removeProperty('--sw');
    }
  };
  feed.addEventListener('pointerup', soltar);
  feed.addEventListener('pointercancel', soltar);
}

/** Monedas que vuelan de la tarjeta al contador de arriba. */
function volarMonedas(origen, n = 1) {
  const destino = $('#chip-tokens .moneda');
  if (!destino || sinMovimiento()) return;
  const a = $('.tarjeta', origen)?.getBoundingClientRect() ?? origen.getBoundingClientRect();
  const b = destino.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const m = document.createElement('img');
    m.src = 'assets/moneda.svg'; m.alt = ''; m.width = 24; m.height = 24; m.className = 'moneda-vuela';
    const x0 = a.left + a.width / 2 - 12 + (Math.random() - 0.5) * 80;
    const y0 = a.top + a.height * 0.45 - 12 + (Math.random() - 0.5) * 50;
    m.style.left = `${x0}px`; m.style.top = `${y0}px`;
    document.body.append(m);
    const dx = b.left - x0, dy = b.top - y0;
    m.animate([
      { transform: 'translate(0, 0) scale(.4) rotate(0)', opacity: 0 },
      { transform: `translate(${dx * 0.25}px, ${dy * 0.25 - 60}px) scale(1.5) rotate(180deg)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${dx}px, ${dy}px) scale(.9) rotate(540deg)`, opacity: 1 },
    ], { duration: 720, delay: i * 90, easing: 'cubic-bezier(.45, 0, .55, 1)', fill: 'forwards' })
      .finished.then(() => { m.remove(); pulsoChip(); }).catch(() => m.remove());
  }
}
function pulsoChip() {
  const chip = $('#chip-tokens');
  chip.classList.remove('cobra'); void chip.offsetWidth; chip.classList.add('cobra');
}

/** Corazones que saltan al marcar favorito. */
function estallarCorazones(boton) {
  if (sinMovimiento()) return;
  for (let i = 0; i < 6; i++) {
    const h = document.createElement('span');
    h.className = 'chispa-corazon'; h.setAttribute('aria-hidden', 'true'); h.innerHTML = ICON.corazonLleno;
    h.style.setProperty('--a', `${i * 60 + Math.random() * 20}deg`);
    boton.append(h);
    setTimeout(() => h.remove(), 700);
  }
}

/** Ventana de premio estilo tragamonedas: 3 rodillos que se detienen en monedas y lluvia de monedas. */
const SIMBOLOS = [['moneda', 48, 48], ['sakura', 46, 46], ['estrella', 42, 42], ['cerezas', 36, 34], ['corazon', 39, 36]];
function mostrarPremio(p) {
  document.querySelector('.premio-capa')?.remove();
  const tira = () => {
    const celdas = Array.from({ length: 14 }, () => SIMBOLOS[1 + Math.floor(Math.random() * 4)]);
    celdas.push(SIMBOLOS[0]);
    return celdas.map(([n, w, h]) => `<span class="celda-rodillo"><img src="assets/${n}.svg" alt="" width="${w}" height="${h}"></span>`).join('');
  };
  const capa = document.createElement('div');
  capa.className = 'premio-capa';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-labelledby', 'premio-titulo');
  capa.innerHTML = `
    <div class="premio-caja">
      <p class="premio-titulo" id="premio-titulo">${t('premio_titulo')}</p>
      <div class="rodillos" aria-hidden="true">${[0, 1, 2].map((i) => `<div class="rodillo"><div class="tira" style="--i:${i}">${tira()}</div></div>`).join('')}</div>
      <p class="premio-monto"><img src="assets/moneda.svg" alt="" width="48" height="48"><span id="premio-num" aria-live="polite">+${p.monedas}</span></p>
      <p class="premio-texto">${t('premio_texto', { n: p.revisadas })}</p>
      <p class="suave">${t('premio_siguiente', { n: p.revisadas + store.PREMIO_CADA, m: p.siguiente })}</p>
      <button class="btn primario grande" type="button" id="premio-ok">${t('premio_ok')}</button>
    </div>
    <div class="lluvia-monedas" aria-hidden="true"></div>`;
  document.body.append(capa);
  const cerrar = () => { capa.classList.add('saliendo'); setTimeout(() => capa.remove(), 300); actualizarChips(); pulsoChip(); };
  $('#premio-ok', capa).addEventListener('click', () => { sonido.monedas(4); cerrar(); });
  capa.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
  $('#premio-ok', capa).focus({ preventScroll: true });
  if (sinMovimiento()) { sonido.premio(); return; }
  sonido.rodillos(1.5);
  [0.9, 1.2, 1.5].forEach((t0) => sonido.tope(t0));
  const num = $('#premio-num', capa);
  num.textContent = '+0';
  setTimeout(() => {
    sonido.premio();
    capa.classList.add('ganado');
    const inicio = performance.now();
    const contar = (ahora) => {
      const k = Math.min(1, (ahora - inicio) / 900);
      num.textContent = `+${Math.round(p.monedas * k)}`;
      if (k < 1) requestAnimationFrame(contar);
    };
    requestAnimationFrame(contar);
    $('.lluvia-monedas', capa).innerHTML = Array.from({ length: 28 }, (_, i) =>
      `<img src="assets/moneda.svg" alt="" width="24" height="24" style="--x:${Math.random() * 100}%;--d:${(Math.random() * 0.9).toFixed(2)}s;--r:${Math.round(Math.random() * 720)}deg;--i:${i}">`).join('');
  }, 1600);
}

function clickFeed(e) {
  if (ignorarClick) return;
  const slide = e.target.closest('.slide');
  if (!slide || slide.classList.contains('fin')) return;
  const id = slide.dataset.id;
  if (e.target.closest('.revelar')) {
    const b = e.target.closest('.revelar');
    b.setAttribute('aria-expanded', 'true');
    $('.traduccion', b).removeAttribute('aria-hidden');
    if (!slide.classList.contains('revelada')) sonido.voltear();
    slide.classList.add('revelada');
  } else if (e.target.closest('.btn-sabe')) lanzarTarjeta(slide, true);
  else if (e.target.closest('.btn-repasar')) lanzarTarjeta(slide, false);
  else if (e.target.closest('.btn-audio')) {
    if (!hablar(banco.texto(sesion.meta, id).texto, sesion.meta)) toast(t('sin_voz'));
  } else if (e.target.closest('.kitty-ayuda')) kittyAbrir();
  else if (e.target.closest('.btn-fav')) {
    const on = store.alternarFavorito(S, sesion.meta, id);
    guardar();
    if (on) { sonido.like(); estallarCorazones(e.target.closest('.btn-fav')); } else sonido.quitar();
    $$(`#feed .slide[data-id="${id}"] .btn-fav`).forEach((b) => {
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', t(on ? 'quitar_favorito' : 'favorito'));
      b.innerHTML = on ? ICON.corazonLleno : ICON.corazon;
      b.classList.toggle('pop', on);
    });
  }
}

document.addEventListener('keydown', (e) => {
  if (!sesion || e.target.closest('input, textarea, select, dialog') || e.metaKey || e.ctrlKey) return;
  const slide = $$('#feed .slide')[sesion.actual];
  const accion = { ArrowDown: () => irA(1), j: () => irA(1), ArrowUp: () => irA(-1), k: () => irA(-1),
    1: () => slide && $('.btn-repasar', slide)?.click(), 2: () => slide && $('.btn-sabe', slide)?.click(),
    ArrowLeft: () => slide && $('.btn-repasar', slide)?.click(), ArrowRight: () => slide && $('.btn-sabe', slide)?.click(),
    ' ': () => slide && $('.revelar', slide)?.click(), f: () => slide && $('.btn-fav', slide)?.click(),
    p: () => slide && $('.btn-audio', slide)?.click() }[e.key];
  if (accion) { e.preventDefault(); accion(); }
});

// ---------- Favoritos (separados por idioma) ----------
async function vistaFavoritos(r) {
  const nativo = S.ajustes.nativo;
  const conFavs = Object.keys(S.favoritos).filter((l) => l !== nativo && (S.favoritos[l] ?? []).length);
  const pedido = r?.q?.get('l');
  const meta = conFavs.includes(pedido) ? pedido : conFavs.includes(S.aprendiendo) ? S.aprendiendo : conFavs[0];
  if (!meta) {
    vista.innerHTML = `
      <section class="pagina angosta">
        <h1 class="display">${t('fav_titulo')}</h1>
        <div class="vacio-estado centro"><img class="cara-grande" src="${cara('enamorada')}" alt="" width="80" height="64"><p class="suave">${t('fav_vacio')}</p></div>
      </section>`;
    return;
  }
  cargando();
  await banco.prepararPar(meta, nativo);
  const ids = (S.favoritos[meta] ?? []).filter((id) => banco.texto(meta, id) && banco.texto(nativo, id));
  const prog = store.progresoDe(S, meta);
  const pestanas = conFavs.map((l) => `<a class="pestana-idioma" href="#/favoritos?l=${l}" ${l === meta ? 'aria-current="page"' : ''}>
      <span class="monograma pequeno" aria-hidden="true">${l.toUpperCase()}</span><span lang="${l}">${esc(nombreIdioma(l))}</span><small>${S.favoritos[l].length}</small></a>`).join('');
  const filas = ids.map((id) => `<li class="fila-fav" data-id="${id}">
        <button class="icon-btn btn-audio" type="button" aria-label="${t('escuchar')}">${ICON.audio}</button>
        <div><strong lang="${meta}">${esc(banco.texto(meta, id).texto)}</strong><span lang="${nativo}">${esc(banco.texto(nativo, id).texto)}</span></div>
        ${insignia(dificultad(prog[id]))}
        <button class="icon-btn btn-quitar" type="button" aria-label="${t('quitar_favorito')}">${ICON.corazonLleno}</button>
      </li>`).join('');
  vista.innerHTML = `
    <section class="pagina angosta">
      <h1 class="display">${t('fav_titulo')}</h1>
      <nav class="pestanas-idioma" aria-label="${t('fav_titulo')}">${pestanas}</nav>
      <button class="btn primario" type="button" id="btn-fav-estudiar">${t('fav_estudiar')}</button>
      <ul class="lista-fav">${filas}</ul>
    </section>`;
  $('#btn-fav-estudiar').addEventListener('click', () => { S.aprendiendo = meta; guardar(); location.hash = '#/estudiar?fav=1'; });
  $$('.fila-fav').forEach((li) => {
    $('.btn-audio', li).addEventListener('click', () => { if (!hablar(banco.texto(meta, li.dataset.id).texto, meta)) toast(t('sin_voz')); });
    $('.btn-quitar', li).addEventListener('click', () => {
      store.alternarFavorito(S, meta, li.dataset.id); guardar();
      vistaFavoritos({ q: new URLSearchParams({ l: meta }) });
    });
  });
}

// ---------- Ranking ----------
function vistaRanking() {
  const racha = store.rachaVigente(S.racha);
  vista.innerHTML = `
    <section class="pagina angosta">
      <h1 class="display">${t('rank_titulo')}</h1>
      <div class="seg" role="tablist">
        <button role="tab" type="button" aria-selected="true">${t('rank_racha')}</button>
        <button role="tab" type="button" aria-selected="false" aria-disabled="true" id="tab-palabras">${t('rank_palabras')} · ${t('pronto')}</button>
      </div>
      <ol class="ranking">
        <li class="yo"><span class="puesto">1</span><span class="avatar">${esc((S.perfil.nombre || '').charAt(0).toUpperCase()) || ICON.usuario}</span>
          <strong>${esc(S.perfil.nombre || t('rank_tu'))}</strong>
          <span class="chip"><img src="assets/sakura.svg" alt="" width="23" height="23">${racha}</span></li>
      </ol>
      <p class="aviso">${t('rank_pronto')}</p>
    </section>`;
  $('#tab-palabras').addEventListener('click', () => toast(t('pronto')));
}

// ---------- Novedades ----------
async function vistaNovedades() {
  const data = await (await fetch('data/novedades.json')).json();
  const items = data.novedades.map((n) => `
    <li class="novedad">
      <p class="sobretitulo"><time datetime="${n.fecha}">${new Date(n.fecha + 'T12:00').toLocaleDateString(S.ajustes.nativo, { day: 'numeric', month: 'long', year: 'numeric' })}</time> · v${esc(n.version)}</p>
      <h2 lang="es">${esc(n.titulo)}</h2>
      <ul lang="es">${n.cambios.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </li>`).join('');
  vista.innerHTML = `<section class="pagina angosta"><h1 class="display">${t('nov_titulo')}</h1><ol class="novedades">${items}</ol></section>`;
}

// ---------- Ajustes ----------
function vistaAjustes() {
  const a = S.ajustes;
  const opcion = (grupo, valor, texto, actual) => `<button type="button" role="radio" aria-checked="${valor === actual}" data-${grupo}="${valor}">${texto}</button>`;
  const pendientes = S.sugerencias.filter((s) => !s.enviada).length;
  vista.innerHTML = `
    <section class="pagina angosta ajustes">
      <h1 class="display">${t('aj_titulo')}</h1>

      <div class="card">
        <h2>${t('perfil')}</h2>
        <label class="campo"><span>${t('aj_nombre')}</span><input id="aj-nombre" maxlength="30" value="${esc(S.perfil.nombre)}" autocomplete="nickname"></label>
        <dl class="datos">
          <div><dt>${t('aj_cuenta')}</dt><dd>${t('aj_invitado')}</dd></div>
          <div><dt>${t('rank_racha')}</dt><dd>${store.rachaVigente(S.racha)}</dd></div>
          <div><dt>${t('aj_mejor_racha')}</dt><dd>${S.racha.mejor}</dd></div>
          <div><dt>Kitty tokens</dt><dd>${S.tokens}</dd></div>
        </dl>
        <button class="btn ancho" type="button" id="aj-google">${ICON.google}<span>${t('aj_google')}</span></button>
        <a class="enlace pequeno" href="#/conservar?demo=1">${t('cons_titulo')} (demo)</a>
      </div>

      <div class="card">
        <h2>${t('aj_apariencia')}</h2>
        <p class="etiqueta" id="lbl-tema">${t('aj_tema')}</p>
        <div class="seg" role="radiogroup" aria-labelledby="lbl-tema">
          ${opcion('tema', 'sistema', t('aj_sistema'), a.tema)}${opcion('tema', 'claro', t('aj_claro'), a.tema)}${opcion('tema', 'oscuro', t('aj_oscuro'), a.tema)}
        </div>
        <p class="etiqueta" id="lbl-paleta">${t('aj_paleta')}</p>
        <div class="paletas" role="radiogroup" aria-labelledby="lbl-paleta">
          ${PALETAS.map((p) => `<button type="button" role="radio" aria-checked="${p === a.paleta}" data-paleta="${p}"><i class="muestra muestra-${p}" aria-hidden="true"></i>${t('pal_' + p)}</button>`).join('')}
        </div>
        <label class="campo"><span>${t('aj_letra')} · <output id="o-escala">${Math.round(a.escala * 100)}%</output></span>
          <input type="range" id="aj-escala" min="0.9" max="1.3" step="0.05" value="${a.escala}"></label>
        <label class="campo"><span>${t('aj_brillo')} · <output id="o-brillo">${Math.round(a.brillo * 100)}%</output></span>
          <input type="range" id="aj-brillo" min="0.5" max="1" step="0.05" value="${a.brillo}"></label>
        <label class="interruptor"><input type="checkbox" id="aj-ipa" ${a.ipa ? 'checked' : ''}><span>${t('aj_ipa')}</span></label>
        <label class="interruptor"><input type="checkbox" id="aj-sonido" ${a.sonido ? 'checked' : ''}><span>${t('aj_sonido')}</span></label>
      </div>

      <div class="card">
        <h2>${t('idioma_nativo')}</h2>
        <label class="campo"><span class="sr-only">${t('idioma_nativo')}</span>
          <select id="aj-nativo">${IDIOMAS_UI.map((c) => `<option value="${c}" ${c === a.nativo ? 'selected' : ''}>${esc(nombreIdioma(c, c))}</option>`).join('')}</select></label>
        <a class="btn fantasma ancho" href="#/idiomas">${t('aprendiendo')}: ${S.aprendiendo ? esc(nombreIdioma(S.aprendiendo)) : '—'}</a>
      </div>

      <div class="card">
        <h2>${t('aj_kitty')}</h2>
        <p class="suave">${t('aj_kitty_texto')}</p>
      </div>

      <div class="card">
        <h2>${t('aj_sugerencias')}</h2>
        <form id="f-sug">
          <label class="campo"><span>${t('aj_sug_texto')}</span><textarea id="aj-sug" rows="3" maxlength="2000" required></textarea></label>
          <button class="btn primario" type="submit">${ICON.enviar}<span>${t('aj_enviar')}</span></button>
          ${pendientes ? `<p class="suave pequeno">✓ ${pendientes}</p>` : ''}
        </form>
      </div>

      <div class="card lista-enlaces">
        <button type="button" data-modal="tutorial">${t('aj_tutorial')}${ICON.flecha}</button>
        <a href="#/favoritos">${t('fav_titulo')}${ICON.flecha}</a>
        <a href="#/novedades">${t('nov_titulo')}${ICON.flecha}</a>
        <button type="button" data-modal="cosmeticos">${t('aj_cosmeticos')} <span class="tag tag-pronto">${t('pronto')}</span>${ICON.flecha}</button>
        <button type="button" data-modal="apoyar">${t('aj_apoyar')} <span class="tag tag-pronto">${t('pronto')}</span>${ICON.flecha}</button>
        <button type="button" data-modal="legal">${t('aj_legal')}${ICON.flecha}</button>
      </div>

      <button class="btn peligro ancho" type="button" id="aj-borrar">${t('aj_borrar')}</button>
      <p class="suave pequeno centro">${t('aj_guardado_auto')}</p>
    </section>`;

  $('#aj-nombre').addEventListener('input', (e) => { S.perfil.nombre = e.target.value.trim(); guardar(); pintarMarco('ajustes'); });
  $('#aj-google').addEventListener('click', () => toast(t('login_pronto')));
  $$('[data-tema]').forEach((b) => b.addEventListener('click', () => { a.tema = b.dataset.tema; guardar(); aplicarAjustes(); vistaAjustes(); }));
  $$('.paletas [data-paleta]').forEach((b) => b.addEventListener('click', () => { a.paleta = b.dataset.paleta; guardar(); aplicarAjustes(); vistaAjustes(); }));
  $('#aj-escala').addEventListener('input', (e) => { a.escala = Number(e.target.value); $('#o-escala').textContent = `${Math.round(a.escala * 100)}%`; aplicarAjustes(); guardar(); });
  $('#aj-brillo').addEventListener('input', (e) => { a.brillo = Number(e.target.value); $('#o-brillo').textContent = `${Math.round(a.brillo * 100)}%`; aplicarAjustes(); guardar(); });
  $('#aj-ipa').addEventListener('change', (e) => { a.ipa = e.target.checked; guardar(); });
  $('#aj-sonido').addEventListener('change', (e) => { a.sonido = e.target.checked; activarSonido(a.sonido); guardar(); if (a.sonido) sonido.moneda(); });
  $('#aj-nativo').addEventListener('change', (e) => cambiarNativo(e.target.value));
  $('#f-sug').addEventListener('submit', (e) => {
    e.preventDefault();
    if (store.agregarSugerencia(S, $('#aj-sug').value)) { guardar(); toast(t('aj_sug_ok')); vistaAjustes(); }
  });
  $$('[data-modal]').forEach((b) => b.addEventListener('click', () => {
    const m = b.dataset.modal;
    if (m === 'tutorial') modal(t('aj_tutorial'), `<ol class="tutorial">${[1, 2, 3, 4, 5].map((n) => `<li>${t('tut_' + n)}</li>`).join('')}</ol>`);
    if (m === 'cosmeticos') abrirCosmeticos();
    if (m === 'apoyar') modal(t('aj_apoyar'), `<p>${t('aj_apoyar_texto')}</p>`);
    if (m === 'legal') modal(t('aj_legal'), `<p>${t('legal_texto')}</p>`);
  }));
  function abrirCosmeticos() {
    modal(t('aj_cosmeticos'), `<p>${t('aj_cos_texto')}</p><p class="chip"><img class="moneda" src="assets/moneda.svg" alt="" width="24" height="24">${S.tokens}</p>`);
  }
  // Confirmación dentro de la app (sin confirm(): no funciona en todos los navegadores ni en vistas incrustadas)
  $('#aj-borrar').addEventListener('click', () => {
    modal(t('aj_borrar'), `<p>${t('aj_borrar_confirmar')}</p><button class="btn peligro ancho" type="button" id="aj-borrar-si">${t('aj_borrar')}</button>`);
    $('#aj-borrar-si').addEventListener('click', () => {
      $('#modal').close();
      const ajustes = S.ajustes;
      S = store.estadoInicial();
      S.ajustes = ajustes;
      S.perfil.elegido = true;
      guardarYa();
      router();
    });
  });
}

// ---------- Kitty (chat) ----------
let kittyEntradas = null;
let ultimaFrase = null;

/** Mensaje en el chat. Los de Kitty llevan su cara (expresión) al lado. */
function kittyMsg(html, de = 'kitty', expresion = 'feliz') {
  const el = document.createElement('p');
  el.className = `msg msg-${de}`;
  el.innerHTML = html;
  let fila = el;
  if (de === 'kitty') {
    fila = document.createElement('div');
    fila.className = 'msg-fila';
    fila.innerHTML = `<img class="msg-cara" src="${cara(expresion)}" alt="" width="40" height="32">`;
    fila.append(el);
    $('#kitty-cara').src = cara(expresion);
  }
  $('#kitty-msgs').append(fila);
  fila.scrollIntoView({ block: 'end' });
}

async function entradasKitty() {
  if (!S.aprendiendo) return [];
  const meta = S.aprendiendo, nativo = S.ajustes.nativo;
  if (kittyEntradas?.par === meta + nativo) return kittyEntradas.lista;
  await banco.prepararPar(meta, nativo);
  const lista = banco.disponibles(meta, nativo).map((c) => ({
    id: c.id, tipos: c.tipos, meta: banco.texto(meta, c.id).texto, nativo: banco.texto(nativo, c.id).texto,
    borrador: banco.texto(meta, c.id).borrador || banco.texto(nativo, c.id).borrador,
  }));
  kittyEntradas = { par: meta + nativo, lista };
  return lista;
}

const fichaKitty = (e) => `<span lang="${S.aprendiendo}">«${esc(e.meta)}»</span> → <span lang="${S.ajustes.nativo}">«${esc(e.nativo)}»</span>
  <small>${t('kitty_tipo')}: ${e.tipos.map((x) => esc(tTipo(x))).join(', ')}${e.borrador ? ' · ' + t('borrador') : ''}</small>`;

async function kittyResponder(texto) {
  const entradas = await entradasKitty();
  if (!S.aprendiendo) return kittyMsg(esc(t('idiomas_titulo')), 'kitty', 'pensando');
  const q = normalizar(texto);
  if (q === normalizar(t('kitty_palabra_frase')) || q === 'frase' || q === 'phrase') {
    const f = fraseConocida(entradas, store.progresoDe(S, S.aprendiendo), ultimaFrase);
    if (!f) return kittyMsg(esc(t('kitty_sin_frase')), 'kitty', 'pensando');
    ultimaFrase = f.id;
    return kittyMsg(`${esc(t('kitty_frase'))}<br>${fichaKitty(f)}`, 'kitty', 'guino');
  }
  const r = buscar(texto, entradas);
  if (r.length) kittyMsg(r.map(fichaKitty).join('<br>'), 'kitty', 'feliz');
  else kittyMsg(esc(t('kitty_no', { q: texto })), 'kitty', 'confundida');
}

function kittyAbrir() {
  const panel = $('#kitty-panel');
  if (!$('#kitty-msgs').childElementCount) kittyMsg(esc(t('kitty_hola')), 'kitty', 'muy_feliz');
  const rapidas = [`<button type="button" class="chip" data-r="frase">${esc(t('kitty_palabra_frase'))}</button>`];
  const slide = sesion ? $$('#feed .slide')[sesion.actual] : null;
  if (slide && !slide.classList.contains('fin')) rapidas.unshift(`<button type="button" class="chip" data-r="esta">${esc(t('kitty_esta'))}</button>`);
  $('#kitty-rapidas').innerHTML = rapidas.join('');
  $$('#kitty-rapidas button').forEach((b) => b.addEventListener('click', async () => {
    if (b.dataset.r === 'frase') { kittyMsg(esc(t('kitty_palabra_frase')), 'yo'); kittyResponder(t('kitty_palabra_frase')); return; }
    const id = slide.dataset.id;
    const e = (await entradasKitty()).find((x) => x.id === id);
    kittyMsg(esc(t('kitty_esta')), 'yo');
    const ipa = banco.texto(S.aprendiendo, id).ipa;
    if (e) kittyMsg(`${fichaKitty(e)}${ipa ? `<br><small>IPA: /${esc(ipa)}/</small>` : ''}`, 'kitty', 'orgullosa');
  }));
  panel.showModal();
  $('#kitty-input').focus();
}
$('#kitty-fab').addEventListener('click', kittyAbrir);
$('#kitty-cerrar').addEventListener('click', () => $('#kitty-panel').close());
$('#kitty-panel').addEventListener('click', (e) => { if (e.target.id === 'kitty-panel') e.target.close(); });
$('#kitty-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#kitty-input');
  const texto = input.value.trim();
  if (!texto) return;
  kittyMsg(esc(texto), 'yo');
  input.value = '';
  kittyResponder(texto);
});

// ---------- Arranque ----------
S.ajustes.nativo ??= nativoInicial();
aplicarAjustes();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', aplicarAjustes);
router();
