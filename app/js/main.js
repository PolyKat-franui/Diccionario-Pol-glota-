// Franui — interfaz. Rutas con # (funciona en cualquier hosting estático, p. ej. GitHub Pages).
import { traspasado } from './traspaso.js'; // primero: puede traer el avance desde la dirección antigua
import { t, tn, setIdiomaUI, tMega, tTipo, nombreIdioma, IDIOMAS_UI, MEGA_TEMAS } from './i18n.js';
import * as store from './store.js';
import { PALETAS } from './store.js';
import { dificultad } from './srs.js';
import { armarSesion, practicaLibre, filtrarLibre, ordenar, grupoDificultad, bloques, bloqueActual, REINSERTAR_EN, MAX_REPETICIONES } from './sesion.js';
import * as banco from './banco.js';
import { hablar } from './voz.js';
import { ICON } from './iconos.js';
import { sonido, activarSonido } from './sonido.js';
import { musica } from './musica.js';
import { sembrarAdornos, sembrarVisitantes, estallido, lluvia } from './adornos.js';
import { buscar, fraseConocida, normalizar } from './kitty.js';
import * as nube from './nube.js';
import * as J from './jardin.js';
import * as rec from './recordatorio.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vista = $('#vista');

let S = store.cargar();
let idiomas = [];
let sesion = null;
let primeraCarga = true;
let ultimaVersion = null;      // versión más nueva de Novedades (para el aviso en la pestaña)
let tutorialAlRevelar = null;  // el tutorial avanza cuando se revela la primera tarjeta

// ---------- Guardado automático ----------
let timerGuardar = null;
function guardar() {
  clearTimeout(timerGuardar);
  timerGuardar = setTimeout(() => { store.guardar(S); subirPronto(); publicarRecordatorio(); }, 150);
}
/** Le cuenta al service worker si hoy ya estudiaste (para no avisar de más). */
function publicarRecordatorio() {
  const a = S.ajustes;
  if (!a.recordatorio) return;
  rec.publicarEstado({ activo: true, hora: a.horaRecordatorio, ultimoDiaEstudio: S.racha.ultimoDia, titulo: t('rec_noti_titulo'), texto: t('rec_noti_texto') }).catch(() => {});
}
function descargarCalendario() {
  const a = S.ajustes;
  const ics = rec.crearICS({ hora: a.horaRecordatorio, titulo: t('rec_evento'), descripcion: t('rec_noti_texto'), url: new URL('./', location.href).href });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  enlace.download = 'franui-recordatorio.ics';
  document.body.append(enlace); enlace.click(); enlace.remove();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 4000);
}
const guardarYa = () => { clearTimeout(timerGuardar); store.guardar(S); subirYa(); };

// ---------- Nube (cuenta de Google) ----------
// Con cuenta, cada cambio se sube unos segundos después (y al cerrar o esconder la app).
// Solo se sube si hay cambios sin enviar: así un celular olvidado abierto no pisa lo estudiado en otro.
let timerNube = null;
let sinSubir = false;
let cuentaPendiente = null; // avance de la nube que espera la pantalla «¿Qué avance conservo?»
const conCuenta = () => S.perfil.cuenta?.tipo === 'google' && nube.nubeLista();
function subirYa(forzar = false) {
  clearTimeout(timerNube);
  if (!conCuenta() || (!sinSubir && !forzar)) return;
  sinSubir = false;
  nube.guardarAvance(S.perfil.cuenta.uid, S).catch(() => { sinSubir = true; });
  publicarMiRanking();
}
/** Fila pública del ranking: solo nombre y números (nunca el correo). Se puede apagar en Ajustes. */
const filaRanking = () => ({
  nombre: (S.perfil.nombre || S.perfil.cuenta?.nombre?.split(' ')[0] || 'Polyglot').trim().slice(0, 30),
  racha: store.rachaVigente(S.racha),
  dia: S.racha.ultimoDia || '',
  palabras: store.resumen(S).palabras,
  nivel: J.nivelDe(S.jardin.crecimiento),
  actualizado: Date.now(),
  liga: S.liga.nivel,
  semana: S.liga.semana || store.semanaISO(),
  xp: S.liga.semana === store.semanaISO() ? S.liga.xp : 0,
});
function publicarMiRanking() {
  if (!conCuenta() || S.ajustes.ranking === false) return;
  nube.publicarRanking(S.perfil.cuenta.uid, filaRanking()).catch(() => {});
}
function subirPronto() {
  if (!conCuenta() || cuentaPendiente) return;
  sinSubir = true;
  clearTimeout(timerNube);
  timerNube = setTimeout(subirYa, 4000);
}
/** Une el avance de la nube con el del navegador según store.decidirAlEntrar. Devuelve la acción. */
function sincronizar(remota, cuenta) {
  const accion = store.decidirAlEntrar(remota, S);
  if (accion === 'bajar') {
    const perfil = { ...S.perfil }, nativo = S.ajustes.nativo;
    S = store.normalizar(remota);
    S.perfil = { ...S.perfil, ...perfil, cuenta };
    S.ajustes.nativo ||= nativo;
    aplicarAjustes();
  } else if (accion === 'preguntar') {
    cuentaPendiente = store.normalizar(remota);
  }
  S.perfil.cuenta = cuenta;
  store.guardar(S);
  if (accion === 'subir') subirYa(true);
  return accion;
}
/** Botón «Entrar con Google» (portada y Ajustes). */
async function conectarGoogle() {
  if (!nube.nubeLista()) return void toast(t('login_pronto'));
  try {
    const cuenta = await nube.entrarConGoogle();
    const remota = await nube.leerAvance(cuenta.uid);
    S.perfil.elegido = true;
    if (!S.perfil.nombre && cuenta.nombre) S.perfil.nombre = cuenta.nombre.split(' ')[0];
    const accion = sincronizar(remota, cuenta);
    toast(t('nube_conectada', { email: cuenta.email }));
    if (accion === 'preguntar') return void ir('#/conservar');
    ir(S.aprendiendo ? '#/menu' : '#/idiomas');
  } catch (e) {
    if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') return;
    toast(t('nube_error'));
  }
}
async function salirDeGoogle() {
  try { subirYa(); await nube.salir(); } catch { /* sin conexión: igual se cierra aquí */ }
  S.perfil.cuenta = null;
  guardar();
  toast(t('nube_salio'));
  router();
}
/** Al abrir la app con cuenta: trae lo más nuevo de la nube (p. ej. lo que estudiaste en otro celular). */
async function sincronizarAlAbrir() {
  if (!conCuenta()) return;
  try {
    const cuenta = await nube.sesionActual();
    if (!cuenta) { S.perfil.cuenta = null; guardar(); return; }
    const accion = sincronizar(await nube.leerAvance(cuenta.uid), cuenta);
    if (accion === 'preguntar') ir('#/conservar');
    else if (accion === 'bajar') router();
  } catch { /* sin conexión: se sigue con el avance de este navegador */ }
}
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
  ['jardin', ICON.arbol],
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
  const enInicio = ruta === 'inicio' || ruta === 'menu' || ruta === 'instalar'; // pantallas a pantalla completa, sin barra
  $('#barra').hidden = enInicio;
  $('#tabbar').hidden = enInicio;
  $('#kitty-fab').hidden = enInicio;
  const activa = ruta === 'tema' || ruta === 'estudiar' || ruta === 'idiomas' ? 'aprender' : ruta;
  const links = NAV.map(([k, icon]) =>
    `<a href="#/${k}" ${k === activa ? 'aria-current="page"' : ''}>${icon}<span>${t('nav_' + k)}</span></a>`).join('');
  $('#nav-sup').innerHTML = links;
  $('#tabbar').innerHTML = links;
  marcarAvisoNovedades();
  actualizarChips();
  const bn = $('#btn-nativo');
  bn.innerHTML = `<span class="monograma pequeno" aria-hidden="true">${S.ajustes.nativo.toUpperCase()}</span>`;
  bn.setAttribute('aria-label', `${t('idioma_nativo')}: ${nombreIdioma(S.ajustes.nativo)}`);
  bn.title = t('idioma_nativo');
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
$('#btn-nativo').addEventListener('click', abrirRedNativo);

// ---------- Red de idiomas en forma de araña (pantalla completa) ----------
/** Dibuja una araña: un idioma al centro y los demás alrededor, unidos por hilos y una tela. */
function htmlArana(centro, nodos) {
  const n = nodos.length;
  const pos = nodos.map((_, i) => {
    const a = (-90 + (360 * i) / n) * (Math.PI / 180);
    return [50 + 39 * Math.cos(a), 50 + 40 * Math.sin(a)];
  });
  const anillo = (k) => pos.map(([x, y]) => `${(50 + (x - 50) * k).toFixed(2)},${(50 + (y - 50) * k).toFixed(2)}`).join(' ');
  return `
    <div class="arana" style="--n:${n}">
      <svg class="arana-hilos" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon class="tela" points="${anillo(1)}"/><polygon class="tela" points="${anillo(0.66)}"/><polygon class="tela" points="${anillo(0.33)}"/>
        ${pos.map(([x, y], i) => `<line class="hilo" x1="50" y1="50" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" pathLength="100" style="--i:${i}"/>`).join('')}
      </svg>
      <div class="arana-centro">${centro}</div>
      ${nodos.map((html, i) => `<div class="arana-nodo" style="left:${pos[i][0].toFixed(2)}%;top:${pos[i][1].toFixed(2)}%;--i:${i};--c:var(--nodo-${(i % 6) + 1})">${html}</div>`).join('')}
    </div>`;
}

function abrirRedNativo() {
  const capa = $('#capa-idiomas');
  const actual = S.ajustes.nativo;
  const nodos = IDIOMAS_UI.filter((c) => c !== actual).map((c) =>
    `<button type="button" class="nodo-idioma" data-nativo="${c}"><span class="monograma" aria-hidden="true">${c.toUpperCase()}</span><span class="nodo-nombre" lang="${c}">${esc(nombreIdioma(c, c))}</span></button>`);
  capa.innerHTML = `
    <div class="arana-cabeza">
      <h2 id="capa-idiomas-titulo">${t('idioma_nativo')}</h2>
      <button class="icon-btn" type="button" id="capa-idiomas-cerrar" aria-label="${t('cerrar')}">${ICON.cerrar}</button>
    </div>
    ${htmlArana(`<span class="monograma grande" aria-hidden="true">${actual.toUpperCase()}</span><strong lang="${actual}">${esc(nombreIdioma(actual, actual))}</strong>`, nodos)}`;
  capa.hidden = false;
  const cerrar = () => { capa.hidden = true; $('#btn-nativo').focus(); };
  $('#capa-idiomas-cerrar').addEventListener('click', cerrar);
  capa.onkeydown = (e) => { if (e.key === 'Escape') cerrar(); };
  $$('[data-nativo]', capa).forEach((b) => b.addEventListener('click', () => { capa.hidden = true; cambiarNativo(b.dataset.nativo); }));
  $('[data-nativo]', capa)?.focus();
}

// ---------- Router ----------
function leerRuta() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const partes = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { nombre: partes[0] || '', args: partes.slice(1), q: new URLSearchParams(qs || '') };
}

const RUTAS = {
  inicio: vistaInicio,
  menu: vistaMenu,
  instalar: vistaInstalar,
  jardin: vistaJardin,
  buzon: vistaBuzon,
  libre: vistaLibre,
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
  if (!S.perfil.elegido && !['inicio', 'conservar', 'instalar'].includes(r.nombre)) return void location.replace('#/inicio');
  if (!RUTAS[r.nombre]) return void location.replace('#/menu');
  cerrarSesion();
  document.body.dataset.ruta = r.nombre;
  pintarMarco(r.nombre);
  await RUTAS[r.nombre](r);
  avisoDescarga(r.nombre);
  if (!primeraCarga) vista.focus({ preventScroll: true });
  primeraCarga = false;
  if (r.nombre !== 'estudiar') scrollTo(0, 0);
}
addEventListener('hashchange', router);
sembrarAdornos($('#adornos'), { cantidad: 10 });
sembrarVisitantes($('#adornos'), { nubes: 2, abejas: 1 });
// Estallido de sakuras y monedas al elegir un tema o un idioma
document.addEventListener('click', (e) => {
  if (e.target.closest('.neurona:not(.vacio), .nodo-idioma:not([aria-disabled="true"])')) estallido(e.clientX, e.clientY);
});

function marcarAvisoNovedades() {
  const hay = ultimaVersion && S.novedadVista !== ultimaVersion && !store.esNovato(S);
  $$('a[href="#/novedades"]').forEach((a) => a.classList.toggle('con-aviso', !!hay));
}
fetch('data/novedades.json').then((r) => r.json()).then((d) => { ultimaVersion = d.novedades[0]?.version ?? null; marcarAvisoNovedades(); }).catch(() => {});
// Clic suave en botones y enlaces (los sonidos especiales se suman encima)
// La música (si está encendida) parte con el primer toque: los navegadores no dejan sonar antes.
document.addEventListener('pointerdown', () => { if (S.ajustes.musica) musica(true); }, { once: true, passive: true });
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
        <h1 class="marca-completa"><span class="logo apilado"><span class="logo-b">Polykat</span> <span class="logo-a">Franui</span></span><span class="marca-linea" aria-hidden="true"></span><span class="eslogan">Be fluent in multiple languages</span></h1>
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
    ir(S.aprendiendo ? '#/menu' : '#/idiomas');
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
  $('#btn-google').addEventListener('click', conectarGoogle);
  $('#btn-invitado').addEventListener('click', () => continuar());
}

// ---------- Menú principal (estilo juego) ----------
/** Historia del día de Kitty (como Instagram): 3 pantallas que avanzan solas; una frase nueva cada día. */
async function abrirHistoria() {
  const meta = S.aprendiendo, nativo = S.ajustes.nativo;
  if (!meta) { location.hash = '#/idiomas'; return; }
  await banco.prepararPar(meta, nativo);
  const frases = banco.disponibles(meta, nativo).filter((c) => c.tipos.includes('frase'));
  if (!frases.length) { toast(t('hist_sin')); return; }
  const c = frases[store.indiceDelDia(store.diaLocal(Date.now()), frases.length)];
  const frase = banco.texto(meta, c.id).texto, trad = banco.texto(nativo, c.id).texto;
  store.marcarHistoriaVista(S); guardar();
  $('#menu-historia')?.classList.add('vista');
  const pantallas = [
    `<img class="historia-kitty" src="${cara('feliz')}" alt="" width="80" height="64"><p class="historia-dice">${t('hist_k1')}</p>
     <p class="historia-frase" lang="${meta}">${esc(frase)}</p>
     <button class="icon-btn historia-audio" type="button" aria-label="${t('escuchar')}">${ICON.audio}</button>`,
    `<p class="historia-dice">${t('hist_signif')}</p><p class="historia-frase" lang="${meta}">${esc(frase)}</p>
     <p class="historia-trad" lang="${nativo}">${esc(trad)}</p>`,
    `<img class="historia-kitty" src="${cara('guino')}" alt="" width="80" height="64"><p class="historia-dice">${t('hist_k3')}</p>
     <button class="btn primario historia-fav" type="button" aria-pressed="${store.esFavorito(S, meta, c.id)}">${ICON.corazon}<span>${t(store.esFavorito(S, meta, c.id) ? 'hist_guardada' : 'hist_guardar')}</span></button>`,
  ];
  const capa = document.createElement('div');
  capa.className = 'historia-capa'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-label', t('hist_titulo'));
  capa.innerHTML = `<div class="historia">
      <div class="historia-barras">${pantallas.map(() => '<i></i>').join('')}</div>
      <div class="historia-cabeza"><span>${t('hist_titulo')}</span><button class="icon-btn historia-cerrar" type="button" aria-label="${t('hist_cerrar')}">${ICON.cerrar}</button></div>
      <div class="historia-cuerpo" aria-live="polite"></div>
      <button class="historia-zona izq" type="button" aria-label="${t('hist_ant')}"></button><button class="historia-zona der" type="button" aria-label="${t('hist_sig')}"></button>
    </div>`;
  document.body.append(capa);
  let i = 0, timer = null;
  const cerrar = () => { clearTimeout(timer); capa.remove(); document.removeEventListener('keydown', teclas); $('#menu-historia')?.focus(); };
  const ir = (n) => { if (n >= pantallas.length) return cerrar(); i = Math.max(0, n); pintar(); };
  const pintar = () => {
    clearTimeout(timer);
    $('.historia-cuerpo', capa).innerHTML = pantallas[i];
    $$('.historia-barras i', capa).forEach((b, k) => { b.className = k < i ? 'llena' : ''; });
    const barra = $$('.historia-barras i', capa)[i]; void barra.offsetWidth; barra.className = 'llenando';
    if (i < pantallas.length - 1) timer = setTimeout(() => ir(i + 1), 6000);
    $('.historia-audio', capa)?.addEventListener('click', (e) => { e.stopPropagation(); if (!hablar(frase, meta)) toast(t('sin_voz')); });
    $('.historia-fav', capa)?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!store.esFavorito(S, meta, c.id)) { store.alternarFavorito(S, meta, c.id); guardar(); sonido.like(); estallarCorazones(e.currentTarget); }
      e.currentTarget.setAttribute('aria-pressed', 'true');
      $('span', e.currentTarget).textContent = t('hist_guardada');
    });
  };
  const teclas = (e) => { if (e.key === 'Escape') cerrar(); else if (e.key === 'ArrowRight') ir(i + 1); else if (e.key === 'ArrowLeft') ir(i - 1); };
  document.addEventListener('keydown', teclas);
  $('.historia-cerrar', capa).addEventListener('click', cerrar);
  $('.historia-zona.izq', capa).addEventListener('click', () => ir(i - 1));
  $('.historia-zona.der', capa).addEventListener('click', () => ir(i + 1));
  pintar();
  $('.historia-cerrar', capa).focus();
}

function vistaMenu() {
  if (J.aparecerCaquitas(S.jardin)) guardar();
  const racha = store.rachaVigente(S.racha);
  const hoy = hoyRevisadas();
  const meta = S.ajustes.meta;
  const faltan = store.PREMIO_CADA - (hoy % store.PREMIO_CADA);
  const letras = [...'FRANUI'].map((l, i) => `<span style="--i:${i}">${l}</span>`).join('');
  const boton = (href, icon, texto, id) => `<a class="menu-btn" href="${href}" id="${id}">${icon}<span>${texto}</span></a>`;
  vista.innerHTML = `
    <section class="menu-juego">
      <div class="menu-escena">
        <h1 class="menu-logo" aria-label="Franui Polykat">
          <span class="menu-sub" aria-hidden="true"><span class="menu-tipeo">Polykat</span></span>
          <span class="menu-letras" aria-hidden="true">${letras}</span>
          <span class="menu-linea" aria-hidden="true"></span>
        </h1>
        <p class="eslogan menu-eslogan">Be fluent in multiple languages</p>
        <p class="tanzaku" aria-label="Tanzaku">${t('tz_' + store.indiceDelDia(store.diaLocal(Date.now()), 7))}</p>
        <button class="menu-kitty" type="button" id="menu-kitty" aria-label="Kitty">
          <img src="${cara(racha ? 'muy_feliz' : 'feliz')}" alt="" width="160" height="128">
        </button>
      </div>
      <button class="menu-historia ${store.historiaVista(S) ? 'vista' : ''}" type="button" id="menu-historia" aria-label="${t('hist_abrir')}">
        <span class="historia-anillo"><img src="${cara('guino')}" alt="" width="40" height="32"></span>
        <span>${t('hist_titulo')}</span>
      </button>
      <a class="menu-jardin" href="#/jardin" id="menu-jardin">
        <span class="menu-jardin-arbol"><img src="${srcArbol(J.nivelDe(S.jardin.crecimiento))}" alt="" width="64" height="64"></span>
        <span class="menu-jardin-txt"><small>${t('jar_titulo')}</small><strong>${esc(nombreEtapa(J.nivelDe(S.jardin.crecimiento)))} · ${t('jar_nivel', { n: J.nivelDe(S.jardin.crecimiento) })}</strong>
          <span>${S.jardin.caquitas?.length ? tn('caq_aviso_n', S.jardin.caquitas.length) : J.pendiente(S.jardin) ? t('jar_listos', { n: J.pendiente(S.jardin) }) : t('jar_ir')}</span></span>
        ${ICON.flecha}
      </a>
      <ul class="menu-stats">
        <li><img src="assets/sakura.svg" alt="" width="23" height="23"><span>${tn('racha_n', racha)}</span></li>
        <li><img src="assets/moneda.svg" alt="" width="24" height="24"><span>${t('tokens_n', { n: S.tokens })}</span></li>
        <li class="menu-diamantes"><img src="assets/diamante.svg" alt="" width="25" height="19"><span>${tn('dia_n', S.diamantes ?? 0)}</span></li>
        <li class="menu-hoy">
          <img class="menu-flor" src="${srcFlor(etapaHoy())}" alt="" width="46" height="46">
          <span>${t('menu_hoy', { n: hoy })}</span>
          <span class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="${meta}" aria-valuenow="${Math.min(hoy, meta)}" aria-label="${t('meta_progreso', { n: Math.min(hoy, meta), m: meta })}"><i style="width:${Math.min(100, (hoy / meta) * 100)}%"></i></span>
          <small>${hoy >= meta ? t('meta_lista') : t('meta_progreso', { n: hoy, m: meta })} · ${t('menu_premio', { n: faltan })}</small>
        </li>
      </ul>
      <nav class="menu-botones" aria-label="${t('menu_titulo')}">
        <a class="menu-jugar" id="menu-jugar" href="${S.aprendiendo ? '#/estudiar?dif=todas' : '#/idiomas'}">${ICON.jugar}<span>${t('menu_jugar')}</span></a>
        ${boton('#/aprender', ICON.libro, t('menu_temas'), 'menu-temas')}
        ${boton('#/libre', ICON.todas, t('libre_titulo'), 'menu-libre')}
        ${boton('#/favoritos', ICON.corazon, t('nav_favoritos'), 'menu-favoritos')}
        ${boton('#/ranking', ICON.trofeo, t('nav_ranking'), 'menu-ranking')}
        ${boton('#/idiomas', `<span class="monograma pequeno" aria-hidden="true">${esc((S.aprendiendo || '?').toUpperCase())}</span>`, t('menu_idioma'), 'menu-idioma')}
        ${boton('#/novedades', ICON.estrella, t('nav_novedades'), 'menu-novedades')}
        ${boton('#/ajustes', ICON.ajustes, t('nav_ajustes'), 'menu-ajustes')}
      </nav>
      ${botonInstalar()}
    </section>`;
  marcarAvisoNovedades();
  $('#menu-historia').addEventListener('click', abrirHistoria);
  // Tocar una letra de FRANUI: salta y suena una moneda (cada letra un poco más aguda)
  $('.menu-letras').addEventListener('click', (e) => {
    const l = e.target.closest('span[style]');
    if (!l) return;
    l.classList.remove('salta'); void l.offsetWidth; l.classList.add('salta');
    sonido.moneda(0, Number(l.style.getPropertyValue('--i')) * 2);
  });
  // Tocar a Kitty: salta, cambia de cara y suelta sakuras y monedas
  const CARAS = ['celebrando', 'guino', 'enamorada', 'sorprendida', 'muy_feliz'];
  let n = 0;
  $('#menu-kitty').addEventListener('click', (e) => {
    const b = e.currentTarget;
    b.querySelector('img').src = cara(CARAS[n++ % CARAS.length]);
    b.classList.remove('salta'); void b.offsetWidth; b.classList.add('salta');
    sonido.moneda(0, n % 5);
    const r = b.getBoundingClientRect();
    estallido(r.left + r.width / 2, r.top + r.height / 3, { cantidad: 12 });
  });
}

// ---------- Jardín de Sakura y tienda de Kitty ----------
const nombreEtapa = (nivel) => t(`etapa_${J.etapaDe(nivel)}`);
const srcArbol = (nivel) => `assets/jardin/arbol-${J.etapaDe(nivel)}.svg`;
const nombreObjeto = (id) => t(`it_${id.replace(/-/g, '_')}`);
/** Estudiar riega el sakura; si sube de nivel durante la sesión, solo un aviso (sin interrumpir). */
function regarJardin(n) {
  const { antes, despues } = J.crecer(S, n);
  if (despues > antes) setTimeout(() => toast(espacioNuevo(antes, despues) ?? t('jar_sube_toast', { n: despues })), 1200);
}
/** Si subir de nivel abrió un espacio del mundo, el texto del aviso. */
function espacioNuevo(antes, despues) {
  const e = J.MUNDO.find((m) => m.nivel > antes && m.nivel <= despues);
  return e ? t('mundo_nuevo', { nombre: t('mundo_' + e.id) }) : null;
}
function celebrarNivel(nivel) {
  document.querySelector('.premio-capa')?.remove();
  const capa = document.createElement('div');
  capa.className = 'premio-capa jardin-sube';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-labelledby', 'sube-titulo');
  capa.innerHTML = `
    <div class="premio-caja">
      <p class="premio-titulo" id="sube-titulo">${t('jar_sube_titulo')}</p>
      <img class="sube-arbol" src="${srcArbol(nivel)}" alt="" width="192" height="192">
      <p class="premio-texto">${t('jar_sube_texto', { n: nivel, nombre: nombreEtapa(nivel), p: J.produccionPorHora(S.jardin) })}</p>
      ${J.MUNDO.some((m) => m.nivel === nivel) ? `<p class="premio-texto"><strong>${espacioNuevo(nivel - 1, nivel)}</strong></p><a class="btn grande" href="#/jardin?t=mundo&e=${J.MUNDO.find((m) => m.nivel === nivel).id}" id="sube-mundo">${ICON.mapa}<span>${t('jar_tab_mundo')}</span></a>` : ''}
      <button class="btn primario grande" type="button" id="sube-ok">${t('premio_ok')}</button>
    </div>`;
  document.body.append(capa);
  sonido.premio();
  lluvia({ cantidad: 30, monedas: 0.15 });
  const cerrar = () => { capa.classList.add('saliendo'); setTimeout(() => capa.remove(), 300); };
  $('#sube-ok', capa).addEventListener('click', cerrar);
  $('#sube-mundo', capa)?.addEventListener('click', cerrar);
  capa.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
  $('#sube-ok', capa).focus({ preventScroll: true });
}

let modoDecorar = false;
function vistaJardin(r) {
  J.iniciar(S);
  guardar();
  const tab = ['tienda', 'mundo'].includes(r.q.get('t')) ? r.q.get('t') : 'jardin';
  const j = S.jardin;
  const nivel = J.nivelDe(j.crecimiento);
  const desde = J.umbral(nivel), hasta = J.umbral(nivel + 1);
  vista.innerHTML = `
    <section class="pagina jardin">
      <header class="jardin-cabeza">
        <p class="sobretitulo">${t('jar_titulo')}</p>
        <h1 class="display">${esc(nombreEtapa(nivel))}</h1>
        <p class="jardin-datos"><span class="tag">${t('jar_nivel', { n: nivel })}</span> <span>${t('jar_prod', { n: J.produccionPorHora(j) })}</span></p>
      </header>
      <div class="seg jardin-tabs" role="tablist">
        <a role="tab" href="#/jardin" aria-selected="${tab === 'jardin'}">${ICON.arbol}<span>${t('jar_tab_jardin')}</span></a>
        <a role="tab" href="#/jardin?t=tienda" aria-selected="${tab === 'tienda'}">${ICON.tienda}<span>${t('jar_tab_tienda')}</span></a>
        <a role="tab" href="#/jardin?t=mundo" aria-selected="${tab === 'mundo'}" id="tab-mundo">${ICON.mapa}<span>${t('jar_tab_mundo')}</span></a>
      </div>
      ${tab === 'tienda' ? htmlTienda() : tab === 'mundo' ? '<div class="mundo" id="mundo"></div>' : `
        <div class="escena-marco" id="escena-marco"><div class="escena" id="escena"></div></div>
        <div class="jardin-crece">
          <span>${t('jar_crece', { n: j.crecimiento - desde, m: hasta - desde })}</span>
          <span class="progreso"><i style="width:${Math.min(100, ((j.crecimiento - desde) / (hasta - desde)) * 100)}%"></i></span>
        </div>
        <div class="jardin-acciones">
          <button class="btn primario grande" type="button" id="j-recoger"></button>
          <button class="btn" type="button" id="j-decorar" aria-pressed="${modoDecorar}">${modoDecorar ? t('jar_listo') : t('jar_decorar')}</button>
        </div>
        <div class="jardin-decorar" id="j-panel" ${modoDecorar ? '' : 'hidden'}></div>
        <p class="suave pequeno jardin-como">${t('jar_como')}</p>`}
    </section>`;
  if (tab === 'tienda') return activarTienda();
  if (tab === 'mundo') return dibujarMundo(r.q.get('e'));
  dibujarEscena();
  pintarRecoger();
  pintarPanelDecorar();
  $('#j-recoger').addEventListener('click', () => {
    const n = J.recoger(S);
    if (!n) return;
    guardar();
    sonido.monedas(Math.min(6, 2 + Math.floor(n / 5)));
    const r0 = $('#j-recoger').getBoundingClientRect();
    estallido(r0.left + r0.width / 2, r0.top, { cantidad: 12 });
    actualizarChips(); pulsoChip();
    pintarRecoger();
  });
  $('#j-decorar').addEventListener('click', () => { modoDecorar = !modoDecorar; vistaJardin(r); });
  clearInterval(vistaJardin.timer);
  vistaJardin.timer = setInterval(() => { if (!$('#j-recoger')) return clearInterval(vistaJardin.timer); pintarRecoger(); }, 30000);
}
function pintarRecoger() {
  const b = $('#j-recoger');
  if (!b) return;
  const n = J.pendiente(S.jardin);
  const lleno = S.jardin.cosecha && Date.now() - S.jardin.cosecha >= J.MAX_HORAS * 3.6e6;
  b.disabled = n === 0;
  b.innerHTML = n ? `<img src="assets/moneda.svg" alt="" width="24" height="24"><span>${t('jar_recoger', { n })}</span>` : `<span>${t('jar_nada')}</span>`;
  b.classList.toggle('lleno', !!lleno && n > 0);
  b.title = lleno ? t('jar_lleno') : '';
}

/** Mundo de sakuras: espacios de 96×96 a escala entera que se recorren deslizando de lado. */
function dibujarMundo(inicial) {
  const caja = $('#mundo');
  if (!caja) return;
  const j = S.jardin;
  const nivel = J.nivelDe(j.crecimiento);
  const abiertos = J.espaciosAbiertos(j);
  const k = Math.max(2, Math.min(5, Math.floor(Math.min(caja.clientWidth, 480) / 96)));
  const cielo = j.fondo;
  const im = (src, x, y, w, h, extra = '', clase = '') => `<img src="${src}" alt="" width="${w * k}" height="${h * k}" class="${clase}" style="left:${x * k}px;top:${y * k}px;${extra}" draggable="false">`;
  const contenido = (e) => {
    if (e.id === 'te') return im(`assets/jardin/fondo-${cielo}.svg`, 0, 0, 96, 96) + im(srcArbol(nivel), 16, 8, 64, 64);
    let h = im(`assets/jardin/${e.id}-${cielo}.svg`, 0, 0, 96, 96);
    if (e.id === 'estanque') h += [[24, 80, 1, 0], [50, 86, 2, 1.8]].map(([x, y, n, r]) => `<button type="button" class="mundo-koi" data-koi style="left:${x * k}px;top:${y * k}px;--r:-${r}s" aria-label="Koi"><img src="assets/jardin/koi-${n}.svg" alt="" width="${12 * k}" height="${6 * k}"></button>`).join('');
    if (e.id === 'faroles') h += J.FAROLES_CALLE.map((f, i) => `<button type="button" class="mundo-farol ${cielo === 'noche' ? 'on' : ''}" data-farol="${i}" aria-pressed="${cielo === 'noche'}" aria-label="${t('mundo_faroles')} ${i + 1}" style="left:${f.x * k}px;top:${f.y * k}px"><img src="assets/jardin/farol-calle${cielo === 'noche' ? '-on' : ''}.svg" alt="" width="${8 * f.e * k}" height="${14 * f.e * k}"></button>`).join('');
    return h;
  };
  caja.style.setProperty('--k', k);
  caja.innerHTML = `
    <div class="mundo-tira" id="mundo-tira" tabindex="0">
      ${J.MUNDO.map((e) => {
        const ok = abiertos.includes(e.id);
        return `<figure class="mundo-espacio ${ok ? '' : 'bloqueado'}" data-espacio="${e.id}" aria-label="${t('mundo_' + e.id)}">
          <div class="mundo-escena escena" style="width:${96 * k}px;height:${96 * k}px">${contenido(e)}
            ${ok ? (e.id === 'estanque' ? im('assets/caras/feliz.svg', 38, 53, 20, 16, '', 'mundo-kitty quieta') : im('assets/caras/feliz.svg', 4, 78, 20, 16, '', 'mundo-kitty')) : `<div class="mundo-candado">${ICON.candado}<span>${t('mundo_bloq', { n: e.nivel })}</span></div>`}
          </div>
          <figcaption><strong>${t('mundo_' + e.id)}</strong><span>${ok ? t('mundo_' + e.id + '_t') : t('mundo_bloq', { n: e.nivel })}</span></figcaption>
        </figure>`;
      }).join('')}
    </div>
    <div class="mundo-nav">
      <button class="icon-btn" type="button" id="mundo-ant" aria-label="${t('mundo_ant')}">${ICON.atras}</button>
      <div class="mundo-puntos">${J.MUNDO.map((e, i) => `<button type="button" data-ir="${i}" aria-label="${t('mundo_ir', { nombre: t('mundo_' + e.id) })}"><i></i></button>`).join('')}</div>
      <button class="icon-btn" type="button" id="mundo-sig" aria-label="${t('mundo_sig')}">${ICON.flecha}</button>
    </div>`;
  const tira = $('#mundo-tira');
  const espacios = $$('.mundo-espacio', tira);
  const actual = () => Math.round(tira.scrollLeft / tira.clientWidth);
  const ir = (i, suave = true) => { i = Math.max(0, Math.min(espacios.length - 1, i)); tira.scrollTo({ left: i * tira.clientWidth, behavior: suave && !sinMovimiento() ? 'smooth' : 'auto' }); };
  const marcar = () => {
    const i = actual();
    $$('.mundo-puntos button').forEach((b, k2) => b.setAttribute('aria-current', String(k2 === i)));
    $('#mundo-ant').disabled = i === 0; $('#mundo-sig').disabled = i === espacios.length - 1;
  };
  tira.addEventListener('scroll', () => { clearTimeout(dibujarMundo.t); dibujarMundo.t = setTimeout(marcar, 80); }, { passive: true });
  tira.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); ir(actual() + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); ir(actual() - 1); } });
  $('#mundo-ant').addEventListener('click', () => ir(actual() - 1));
  $('#mundo-sig').addEventListener('click', () => ir(actual() + 1));
  $$('.mundo-puntos button').forEach((b) => b.addEventListener('click', () => ir(Number(b.dataset.ir))));
  // Koi: saltan al tocarlos
  $$('[data-koi]', tira).forEach((b) => b.addEventListener('click', () => {
    b.classList.remove('salta'); void b.offsetWidth; b.classList.add('salta');
    sonido.moneda(0, 6);
  }));
  // Faroles: se encienden al tocarlos; con todos encendidos, la calle brilla
  $$('[data-farol]', tira).forEach((b) => b.addEventListener('click', () => {
    const on = !b.classList.contains('on');
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    $('img', b).src = `assets/jardin/farol-calle${on ? '-on' : ''}.svg`;
    if (on) sonido.toque();
    const todos = $$('[data-farol]', tira).every((x) => x.classList.contains('on'));
    $('[data-espacio="faroles"]', tira).classList.toggle('brilla', todos);
    if (todos && on) toast(t('mundo_luz'));
  }));
  // Mirador: tocar el paisaje suelta pétalos
  $('[data-espacio="mirador"]:not(.bloqueado) .mundo-escena', tira)?.addEventListener('click', () => { lluvia({ cantidad: 22, monedas: 0 }); sonido.like(); });
  const i0 = Math.max(0, J.MUNDO.findIndex((e) => e.id === inicial));
  requestAnimationFrame(() => { ir(i0, false); marcar(); });
}

/** Escena a escala entera: 96×96 pixeles lógicos × k (3 en celular, 4 en computador). */
function dibujarEscena() {
  const marco = $('#escena-marco');
  const esc0 = $('#escena');
  if (!marco || !esc0) return;
  const j = S.jardin;
  const k = Math.max(2, Math.min(5, Math.floor(marco.clientWidth / J.ESCENA.w)));
  esc0.style.setProperty('--k', k);
  esc0.style.width = esc0.style.height = `${J.ESCENA.w * k}px`;
  esc0.classList.toggle('decorando', modoDecorar);
  if (J.aparecerCaquitas(j)) guardar();
  const nivel = J.nivelDe(j.crecimiento);
  const img = (src, x, y, w, h, extra = '') => `<img src="${src}" alt="" width="${w * k}" height="${h * k}" style="left:${x * k}px;top:${y * k}px;${extra}"`;
  const decor = J.CATALOGO.filter((o) => o.tipo === 'decor' && j.tiene[o.id] && !j.ocultos[o.id]);
  const colgantes = ['chochin', 'furin', 'columpio', 'teru'];
  const petalos = Math.min(18, 2 + nivel + (j.tiene.petalos ? 10 : 0));
  const azar = (i, s) => { const v = Math.sin(i * 91.7 + s * 13.1) * 9999; return v - Math.floor(v); };
  esc0.innerHTML = `
    ${img(`assets/jardin/fondo-${j.fondo}.svg`, 0, 0, 96, 96)} class="escena-fondo">
    ${img(srcArbol(nivel), 16, 8, 64, 64, 'z-index:70')} class="escena-arbol" id="escena-arbol">
    ${decor.map((o) => { const [x, y] = J.posicion(j, o.id); return `${img(`assets/jardin/${o.id}.svg`, x, y, o.w, o.h, `z-index:${colgantes.includes(o.id) ? 150 : y + o.h}`)} class="escena-decor ${['furin', 'teru', 'koinobori'].includes(o.id) ? 'meciendo' : ''} ${j.fondo === 'noche' && ['farol', 'chochin'].includes(o.id) ? 'brilla-noche' : ''}" data-id="${o.id}" draggable="false">`; }).join('')}
    ${img(`assets/caras/${j.caquitas?.length ? 'avergonzada' : 'feliz'}.svg`, 54, 68, 20, 16, 'z-index:84')} class="escena-kitty" id="escena-kitty">
    ${(j.caquitas ?? []).map(([x, y], i) => `<button type="button" class="escena-caquita" data-caquita="${i}" aria-label="${t('caq_label')}" style="left:${(x + J.CAQUITA.w / 2) * k}px;top:${(y + J.CAQUITA.h / 2) * k}px;z-index:${y + J.CAQUITA.h}"><img src="assets/jardin/caquita.svg" alt="" width="${J.CAQUITA.w * k}" height="${J.CAQUITA.h * k}"></button>`).join('')}
    ${Array.from({ length: petalos }, (_, i) => img('assets/jardin/petalo.svg', Math.round(6 + azar(i, 1) * 80), -4, 4, 3,
      `--dur:${(7 + azar(i, 2) * 7).toFixed(1)}s;--retraso:-${(azar(i, 3) * 14).toFixed(1)}s;--vaiven:${Math.round(8 + azar(i, 4) * 16) * k}px;--caida:${100 * k}px;z-index:160`) + ' class="escena-petalo">').join('')}
    ${j.tiene.mariposas ? [0, 1].map((i) => img('assets/jardin/mariposas.svg', 20 + i * 40, 30 + i * 12, 9, 7, `--retraso:-${i * 3}s;z-index:170`) + ' class="escena-mariposa">').join('') : ''}
    ${j.tiene.luciernagas ? Array.from({ length: 7 }, (_, i) => img('assets/jardin/luciernagas.svg', Math.round(8 + azar(i, 5) * 80), Math.round(30 + azar(i, 6) * 50), 5, 5,
      `--retraso:-${(azar(i, 7) * 4).toFixed(1)}s;z-index:165`) + ' class="escena-luciernaga">').join('') : ''}`;
  // Tocar el árbol: se mece y suelta pétalos · tocar a Kitty: dice algo
  $('#escena-arbol').addEventListener('click', (e) => {
    const a = e.currentTarget; a.classList.remove('mece'); void a.offsetWidth; a.classList.add('mece');
    sonido.toque(); estallido(e.clientX, e.clientY, { cantidad: 6 });
  });
  // Caquitas: tocarlas limpia el jardín (+tokens y abono natural)
  $$('[data-caquita]', esc0).forEach((b) => b.addEventListener('click', (e) => {
    const r0 = b.getBoundingClientRect();
    const res = J.limpiarCaquita(S, Number(b.dataset.caquita));
    if (!res) return;
    guardar();
    sonido.monedas(3);
    estallido(r0.left + r0.width / 2, r0.top + r0.height / 2, { cantidad: 10 });
    toast(t('caq_limpia', { n: res.tokens }));
    actualizarChips(); pulsoChip();
    if (res.despues > res.antes) celebrarNivel(res.despues);
    dibujarEscena();
  }));
  let iK = 0;
  $('#escena-kitty').addEventListener('click', (e) => {
    const frases = ['jar_k1', 'jar_k2', 'jar_k3'];
    if (S.jardin.caquitas?.length) return toast(t('caq_k'));
    toast(t(frases[iK++ % frases.length]));
    e.currentTarget.src = cara(['muy_feliz', 'guino', 'enamorada'][iK % 3]);
  });
  if (modoDecorar) $$('.escena-decor', esc0).forEach((el) => activarArrastre(el, k));
}
function activarArrastre(el, k) {
  let x0 = 0, y0 = 0, px = 0, py = 0, activo = false;
  el.addEventListener('pointerdown', (e) => {
    activo = true; el.setPointerCapture(e.pointerId); el.classList.add('arrastrando');
    x0 = e.clientX; y0 = e.clientY; px = parseInt(el.style.left, 10) / k; py = parseInt(el.style.top, 10) / k;
  });
  el.addEventListener('pointermove', (e) => {
    if (!activo) return;
    const o = J.objeto(el.dataset.id);
    const x = Math.max(0, Math.min(J.ESCENA.w - o.w, Math.round(px + (e.clientX - x0) / k)));
    const y = Math.max(0, Math.min(J.ESCENA.h - o.h, Math.round(py + (e.clientY - y0) / k)));
    el.style.left = `${x * k}px`; el.style.top = `${y * k}px`;
  });
  const soltar = () => {
    if (!activo) return;
    activo = false; el.classList.remove('arrastrando');
    J.mover(S.jardin, el.dataset.id, parseInt(el.style.left, 10) / k, parseInt(el.style.top, 10) / k);
    guardar(); sonido.toque();
    dibujarEscena();
  };
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
}
function pintarPanelDecorar() {
  const p = $('#j-panel');
  if (!p || !modoDecorar) return;
  const j = S.jardin;
  const decor = J.CATALOGO.filter((o) => o.tipo === 'decor' && j.tiene[o.id]);
  const fondos = J.FONDOS.filter((f) => f === 'dia' || j.tiene[f]);
  p.innerHTML = `
    <p class="suave pequeno">${t('jar_arrastra')}</p>
    ${fondos.length > 1 ? `<p class="etiqueta">${t('jar_fondo')}</p><div class="seg" role="radiogroup" aria-label="${t('jar_fondo')}">
      ${fondos.map((f) => `<button type="button" role="radio" aria-checked="${j.fondo === f}" data-fondo="${f}">${f === 'dia' ? t('jar_fondo_dia') : nombreObjeto(f)}</button>`).join('')}</div>` : ''}
    ${decor.length ? `<div class="decor-lista">${decor.map((o) => `<button type="button" class="decor-chip" data-ver="${o.id}" aria-pressed="${!j.ocultos[o.id]}">
      <img src="assets/jardin/${o.id}.svg" alt="" width="${o.w * (o.h > 14 ? 1 : 2)}" height="${o.h * (o.h > 14 ? 1 : 2)}"><span>${esc(nombreObjeto(o.id))}</span></button>`).join('')}</div>`
      : `<p>${t('jar_sin_decor')} <a href="#/jardin?t=tienda">${t('jar_tab_tienda')}</a></p>`}`;
  $$('[data-fondo]', p).forEach((b) => b.addEventListener('click', () => { j.fondo = b.dataset.fondo; guardar(); dibujarEscena(); pintarPanelDecorar(); }));
  $$('[data-ver]', p).forEach((b) => b.addEventListener('click', () => { J.alternarVisible(j, b.dataset.ver); guardar(); dibujarEscena(); pintarPanelDecorar(); }));
}

const SECCIONES_TIENDA = ['abono', 'decor', 'ambiente', 'fondo', 'especial'];
function htmlTienda() {
  const j = S.jardin;
  const tarjeta = (o) => {
    const motivo = J.motivoNoCompra(S, o.id);
    const k = o.w <= 9 ? 4 : o.w <= 16 ? 3 : 2;
    const boton = motivo === 'tienes' ? `<span class="tienda-tienes">${ICON.check}${t('tienda_tienes')}</span>`
      : motivo === 'max' ? `<span class="tienda-tienes">${t('tienda_max')}</span>`
        : `<button class="btn ${motivo ? '' : 'primario'} tienda-comprar" type="button" data-comprar="${o.id}" ${motivo ? 'aria-disabled="true"' : ''}>
            <img src="assets/moneda.svg" alt="" width="24" height="24"><span>${o.precio}</span></button>
           ${motivo === 'monedas' ? `<small class="suave">${t('tienda_faltan', { n: o.precio - S.tokens })}</small>` : ''}`;
    return `<li class="tienda-item ${motivo === 'tienes' ? 'tenido' : ''}">
      <span class="tienda-icono"><img src="assets/jardin/${o.id}.svg" alt="" width="${o.w * k}" height="${o.h * k}"></span>
      <span class="tienda-txt"><strong>${esc(nombreObjeto(o.id))}</strong><small>${esc(t(`itd_${o.id.replace(/-/g, '_')}`))}</small>
        ${o.tipo === 'especial' ? `<small class="tag">${t('tienda_reservas', { n: j.protectores })}</small>` : ''}</span>
      <span class="tienda-precio">${boton}</span>
    </li>`;
  };
  return `<div class="tienda">
    <p class="tienda-saldo"><img src="assets/moneda.svg" alt="" width="24" height="24"><strong>${S.tokens}</strong> <span class="suave">Kitty tokens</span>
      <img src="assets/diamante.svg" alt="" width="25" height="19"><strong id="saldo-diamantes">${S.diamantes ?? 0}</strong> <span class="suave">${t('dia_titulo')}</span></p>
    <div class="card tienda-diamantes">
      <img src="assets/diamante.svg" alt="" width="75" height="57">
      ${S.diamantes ? `<button class="btn primario" type="button" id="cambiar-diamante">${t('dia_cambiar', { n: store.DIAMANTE_TOKENS })}</button>` : `<p class="suave pequeno">${t('dia_sin')}</p>`}
    </div>
    ${SECCIONES_TIENDA.map((sec) => `<h2 class="tienda-seccion">${t(`tienda_${sec}`)}</h2>
      <ul class="tienda-lista">${J.CATALOGO.filter((o) => o.tipo === sec).map(tarjeta).join('')}</ul>`).join('')}
  </div>`;
}
function activarTienda() {
  $('#cambiar-diamante')?.addEventListener('click', () => {
    if (!store.cambiarDiamante(S)) return;
    guardar(); sonido.brillo(); sonido.monedas(4);
    toast(t('dia_cambiado', { n: store.DIAMANTE_TOKENS }));
    actualizarChips(); pulsoChip();
    vistaJardin({ q: new URLSearchParams('t=tienda') });
  });
  $$('[data-comprar]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.comprar;
    const res = J.comprar(S, id);
    if (!res.ok) { sonido.quitar(); b.classList.remove('niega'); void b.offsetWidth; b.classList.add('niega'); return; }
    guardar();
    sonido.monedas(3);
    const r0 = b.getBoundingClientRect();
    estallido(r0.left + r0.width / 2, r0.top + r0.height / 2, { cantidad: 10 });
    toast(t('tienda_comprado', { nombre: nombreObjeto(id) }));
    actualizarChips();
    const y = scrollY;
    vistaJardin({ q: new URLSearchParams('t=tienda') });
    scrollTo(0, y);
    if (res.despues > res.antes) setTimeout(() => celebrarNivel(res.despues), 350);
  }));
}
addEventListener('resize', () => { if (document.body.dataset.ruta === 'jardin') dibujarEscena(); });

// ---------- Instalar la app en la pantalla de inicio ----------
// Chrome/Edge/Android avisan con «beforeinstallprompt» y se instala con un toque.
// iPhone/iPad (Safari) y otros navegadores no tienen ese aviso: se muestran los pasos.
let avisoInstalar = null;
const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); avisoInstalar = e; });
addEventListener('appinstalled', () => { avisoInstalar = null; toast(t('inst_lista')); $$('.btn-instalar').forEach((b) => b.remove()); $('#aviso-descarga')?.remove(); });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
// Navegadores dentro de otras apps (Instagram, TikTok, Facebook…): ahí no se puede instalar.
const enOtraApp = () => /Instagram|FBAN|FBAV|FB_IAB|musical_ly|TikTok|Bytedance|Line\/|Snapchat|LinkedInApp|Twitter/i.test(navigator.userAgent);

// Aviso grande «Descarga la app»: aparece abajo mientras no esté instalada (se puede cerrar por 3 días).
const CLAVE_AVISO = 'franui:aviso-descarga';
function avisoDescarga(ruta) {
  $('#aviso-descarga')?.remove();
  document.body.classList.remove('con-aviso-descarga');
  if (instalada() || ['estudiar', 'instalar'].includes(ruta)) return;
  let cerrado = 0;
  try { cerrado = Number(localStorage.getItem(CLAVE_AVISO)) || 0; } catch { /* sin almacenamiento */ }
  if (Date.now() - cerrado < 3 * 864e5) return;
  const el = document.createElement('div');
  el.id = 'aviso-descarga'; el.className = 'aviso-descarga'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', t('inst_boton'));
  el.innerHTML = `
    <img src="assets/app/icono-192.png" alt="" width="52" height="52">
    <div class="aviso-txt"><strong>${t('inst_aviso_titulo')}</strong><small>${t('inst_aviso_sub')}</small></div>
    <button class="btn primario btn-instalar" type="button">${ICON.descargar}<span>${t('inst_aviso_boton')}</span></button>
    <button class="icon-btn aviso-cerrar" type="button" aria-label="${t('inst_aviso_cerrar')}">${ICON.cerrar}</button>`;
  $('.aviso-cerrar', el).addEventListener('click', () => {
    try { localStorage.setItem(CLAVE_AVISO, String(Date.now())); } catch { /* sin almacenamiento */ }
    el.remove(); document.body.classList.remove('con-aviso-descarga');
  });
  document.body.append(el);
  document.body.classList.add('con-aviso-descarga');
}

const iconoApp = () => '<span class="icono-app" aria-hidden="true"><img src="assets/app/icono-192.png" alt="" width="96" height="96"></span>';
async function instalarApp() {
  if (instalada()) return void toast(t('inst_ya'));
  if (avisoInstalar) {
    avisoInstalar.prompt();
    const { outcome } = await avisoInstalar.userChoice.catch(() => ({}));
    avisoInstalar = null;
    if (outcome === 'accepted') { sonido.premio(); lluvia({ cantidad: 24 }); }
    return;
  }
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  const pasos = enOtraApp() ? ['inst_otra_1', 'inst_otra_2', 'inst_otra_3'] : ios ? ['inst_ios_1', 'inst_ios_2', 'inst_ios_3'] : android ? ['inst_and_1', 'inst_and_2', 'inst_and_3'] : ['inst_pc_1', 'inst_pc_2'];
  modal(t('inst_titulo'), `
    <div class="instalar">
      ${iconoApp()}
      <p class="suave">${t('inst_texto')}</p>
      <ol class="pasos-instalar">${pasos.map((k) => `<li>${t(k)}</li>`).join('')}</ol>
    </div>`);
}
function vistaInstalar(r) {
  (S.perfil.elegido ? vistaMenu : vistaInicio)(r);
  setTimeout(instalarApp, 700);
}
const botonInstalar = (clase = 'menu-instalar') => (instalada() ? '' :
  `<button class="btn-instalar ${clase}" type="button">${ICON.descargar}<span>${t('inst_boton')}</span></button>`);
document.addEventListener('click', (e) => { if (e.target.closest('.btn-instalar')) instalarApp(); });

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
  const cuenta = demo ? cuentaDeMuestra() : cuentaPendiente; // avance de la cuenta de Google
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
    if (!demo) {
      const perfil = { ...S.perfil };
      S = store.elegirAvance(cuenta, S, b.dataset.eleccion);
      S.perfil = { ...S.perfil, cuenta: perfil.cuenta, elegido: true };
      cuentaPendiente = null;
      aplicarAjustes(); store.guardar(S); subirYa(true);
    }
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
  const nodos = idiomas.filter((i) => i.code !== nativo).map((i) => {
    const pronto = i.estado === 'proximamente';
    const etiqueta = i.code === S.aprendiendo ? `<span class="tag tag-activo">${t('aprendiendo')}</span>`
      : i.estado === 'nuevo' ? `<span class="tag tag-nuevo">${t('estado_nuevo')}</span>`
        : pronto ? `<span class="tag tag-pronto">${t('estado_pronto')}</span>` : '';
    return `<button type="button" class="nodo-idioma idioma ${pronto ? 'pronto' : ''} ${i.estado === 'nuevo' ? 'nuevo' : ''} ${i.code === S.aprendiendo ? 'activo' : ''}" data-code="${i.code}" ${pronto ? 'aria-disabled="true"' : ''}>
        <span class="monograma" aria-hidden="true">${i.code.toUpperCase()}</span>
        <span class="nodo-nombre">${esc(nombreIdioma(i.code))}</span>${etiqueta}
      </button>`;
  });
  const centro = `<span class="monograma grande" aria-hidden="true">${nativo.toUpperCase()}</span><strong>${esc(nombreIdioma(nativo))}</strong><small>${t('idioma_nativo')}</small>`;
  vista.innerHTML = `
    <section class="pagina pagina-arana">
      <p class="sobretitulo">${t('nav_aprender')}</p>
      <h1 class="display">${t('idiomas_titulo')}</h1>
      <p class="suave">${t('idiomas_sub')}</p>
      ${htmlArana(centro, nodos)}
    </section>`;
  $$('.nodo-idioma').forEach((b) => b.addEventListener('click', () => {
    if (b.getAttribute('aria-disabled') === 'true') return toast(t('estado_pronto'));
    sonido.moneda();
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
/** Cada tema toma uno de los 6 colores de la paleta elegida (--nodo-1…6). */
const colorTema = (mega) => `var(--nodo-${(MEGA_TEMAS.indexOf(mega) % 6) + 1})`;
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
        ${store.esNovato(S)
          ? `<a class="btn primario libre-btn empieza-btn" href="#/estudiar?${new URLSearchParams({ mega: MEGA_TEMAS[0], dif: 'todas' })}" id="empieza-aqui">${ICON.jugar}<span>${t('empieza_aqui')}</span></a>`
          : `<a class="btn libre-btn" href="#/libre" id="ir-libre">${ICON.libro}<span>${t('libre_abrir')}</span></a>`}
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
  ocultarTutorial();
  if (!sesion) return;
  sesion.observer?.disconnect();
  sesion = null;
}

function idsParaEstudiar(q, meta, nativo) {
  const lista = banco.disponibles(meta, nativo);
  if (q.get('ids')) { const elegidos = new Set(q.get('ids').split(',')); return lista.filter((c) => elegidos.has(c.id)).map((c) => c.id); }
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
  const libre = r.q.get('libre') === '1' || r.q.get('fav') === '1' || !!r.q.get('ids');
  const plan = r.q.get('ids') ? { cola: ids, motivo: 'normal' } : libre ? { cola: practicaLibre({ ids, progreso: prog }), motivo: 'normal' } : armarSesion({ ids, progreso: prog });
  const volverA = r.q.get('ids') ? '#/libre' : r.q.get('mega') ? `#/tema/${encodeURIComponent(r.q.get('mega'))}` : r.q.get('fav') ? '#/favoritos' : '#/aprender';

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

  sesion = { meta, nativo, libre, sabias: 0, repasar: 0, tokens: 0, reps: {}, actual: 0, k: 0, terminada: false, ruta: location.hash, volverA };
  vista.innerHTML = `
    <section class="feed" id="feed" aria-label="${t('nav_aprender')}">
      <div class="feed-progreso" aria-hidden="true"><span class="progreso"><i id="feed-barra"></i></span><span id="feed-cuenta"></span><img class="feed-flor" id="feed-flor" src="assets/flor-0.svg" alt="" width="23" height="23"></div>
      ${plan.cola.map((id, i) => htmlSlide(id, i === 0)).join('')}
      <article class="slide fin" id="slide-fin" aria-live="polite"></article>
    </section>`;
  const feed = $('#feed');
  feed.addEventListener('click', clickFeed);
  feed.addEventListener('click', detectarDobleToque);
  activarDeslizar(feed);
  if (!S.tutorialVisto) setTimeout(iniciarTutorial, 500);
  sesion.observer = new IntersectionObserver(alVerSlide, { root: feed, threshold: 0.6 });
  $$('.slide', feed).forEach((s) => sesion.observer.observe(s));
  actualizarCuenta();
  pintarFlor();
}

const EMOJI_MEGA = {
  'Conversación y vida social': '💬', 'Lenguaje, números y tiempo': '🔢', 'Personas y relaciones': '👪',
  'Cuerpo, salud y emociones': '💗', 'Comida y bebida': '🍙', 'Hogar y vida diaria': '🏠', 'Ropa y compras': '👘',
  'Lugares y viajes': '🗺️', 'Naturaleza y animales': '🌿', 'Trabajo, estudios y sociedad': '💼',
  'Ocio, arte y tecnología': '🎨', 'Descripción y formas': '🔷', 'Acciones y mente': '🧠',
};

/** *palabra* → <mark>palabra</mark> (el resto escapado). */
const marcar = (s) => esc(s).replace(/\*([^*]+)\*/, '<mark>$1</mark>');

/** Oración de ejemplo: aparece discreta al revelar; la nota de Kitty se abre solo si la persona curiosea. */
function htmlEjemplo(id, meta, nativo) {
  const a = banco.ejemplo(meta, id), b = banco.ejemplo(nativo, id);
  if (!a) return '';
  const nota = meta === 'en' ? b?.nota : '';
  return `
          <div class="ejemplo" aria-hidden="true">
            <p class="ej-meta" lang="${meta}">${marcar(a.ejemplo)}<button class="ej-audio" type="button" aria-label="${t('ej_escuchar')}">${ICON.audio}</button></p>
            ${b ? `<p class="ej-nativo" lang="${nativo}">${marcar(b.ejemplo)}</p>` : ''}
            ${nota ? `<details class="ej-nota"><summary>💡 ${t('ej_ojo')}</summary><p>${marcar(nota)}</p></details>` : ''}
          </div>`;
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
          <span class="chip-tema"><span aria-hidden="true">${EMOJI_MEGA[c.megas[0]] ?? '🌸'}</span>${esc(tMega(c.megas[0]))}</span>
          <span class="tipo">${c.tipos.map((x) => esc(tTipo(x))).join(' · ')}</span>
        </div>
        <div class="tarjeta-centro">
          <h2 class="palabra" lang="${meta}">${esc(a.texto)}</h2>
          ${a.ipa && S.ajustes.ipa ? `<p class="ipa" lang="${meta}" title="IPA">/${esc(a.ipa)}/</p>` : ''}
          <button class="revelar" type="button" aria-expanded="false">
            <span class="traduccion" lang="${nativo}" aria-hidden="true">${esc(b.texto)}</span>
            <span class="revelar-hint">${t('toca_ver')}</span>
          </button>
          ${htmlEjemplo(id, meta, nativo)}
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

// ---------- Sakura del día, racha y cofres ----------
const hoyRevisadas = () => (S.diario?.dia === store.diaLocal(Date.now()) ? S.diario.revisadas : 0);
const etapaHoy = () => store.etapaFlor(hoyRevisadas(), S.ajustes.meta);
const srcFlor = (e) => (e >= store.ETAPAS_FLOR ? 'assets/sakura.svg' : `assets/flor-${e}.svg`);
/** Sakura chica junto a la barra de la sesión: crece con cada palabra hasta la meta. */
function pintarFlor(crece = false) {
  const img = $('#feed-flor');
  if (!img) return;
  img.src = srcFlor(etapaHoy());
  img.title = t('meta_progreso', { n: Math.min(hoyRevisadas(), S.ajustes.meta), m: S.ajustes.meta });
  img.setAttribute('aria-label', img.title);
  if (crece) { img.classList.remove('crece'); void img.offsetWidth; img.classList.add('crece'); }
}
/** Primer estudio del día: la racha sube con una lluvia de sakuras; cada 7 días, un cofre. */
/** Racha del día cumplida (20 palabras): Kitty baila a pantalla completa; después, el cofre si toca. */
function celebrarRacha() {
  if (document.querySelector('.premio-capa')) return setTimeout(celebrarRacha, 400); // espera a que se cobre el premio
  const n = store.rachaVigente(S.racha);
  pulsoChip();
  const cofre = store.abrirCofre(S);
  if (cofre) guardar();
  bailarKitty(n, () => { if (cofre) setTimeout(() => mostrarCofre(cofre), 300); });
}
function bailarKitty(n, alCerrar) {
  document.querySelector('.baile-capa')?.remove();
  const capa = document.createElement('div');
  capa.className = 'baile-capa'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-labelledby', 'baile-titulo');
  capa.innerHTML = `<div class="baile">
      <div class="baile-pista" aria-hidden="true">
        <span class="baile-nota n1">♪</span><span class="baile-nota n2">♫</span><span class="baile-nota n3">♪</span>
        <img class="baile-kitty" id="baile-kitty" src="${cara('celebrando')}" alt="" width="160" height="128">
        <span class="baile-sombra"></span>
      </div>
      <h2 class="baile-titulo" id="baile-titulo">${t('baile_titulo')}</h2>
      <p class="baile-racha"><img src="assets/sakura.svg" alt="" width="46" height="46"><strong>${tn('baile_dias_n', n)}</strong></p>
      <p>${t('baile_texto')}</p>
      <button class="btn primario grande" type="button" id="baile-ok">${t('baile_ok')}</button>
    </div>`;
  document.body.append(capa);
  sonido.fin();
  lluvia({ cantidad: 40, monedas: 0.3, dur: 3200 });
  // Kitty cambia de cara al ritmo del baile
  const caras = ['celebrando', 'muy_feliz', 'guino', 'enamorada'];
  let i = 0;
  const ritmo = sinMovimiento() ? null : setInterval(() => { const k = $('#baile-kitty'); if (!k) return clearInterval(ritmo); k.src = cara(caras[++i % caras.length]); }, 450);
  const cerrar = () => { clearInterval(ritmo); capa.remove(); alCerrar?.(); };
  $('#baile-ok').addEventListener('click', cerrar);
  capa.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
  $('#baile-ok').focus();
}
/** Cofre: se sacude, se abre al tocarlo y suelta monedas. */
function mostrarCofre({ dias, monedas }) {
  document.querySelector('.cofre-capa')?.remove();
  const capa = document.createElement('div');
  capa.className = 'premio-capa cofre-capa';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-labelledby', 'cofre-titulo');
  capa.innerHTML = `
    <div class="premio-caja">
      <p class="premio-titulo" id="cofre-titulo">${t('cofre_titulo')}</p>
      <p class="premio-texto">${t('cofre_texto', { n: dias })}</p>
      <button class="cofre-boton" type="button" id="cofre-abrir" aria-label="${t('cofre_abrir')}">
        <img src="assets/cofre.svg" alt="" width="120" height="100">
      </button>
      <p class="premio-monto" hidden id="cofre-monto"><img src="assets/moneda.svg" alt="" width="48" height="48"><span>+${monedas}</span></p>
      <button class="btn primario grande" type="button" id="cofre-ok">${t('cofre_abrir')}</button>
    </div>`;
  document.body.append(capa);
  let abierto = false;
  const cerrar = () => { capa.classList.add('saliendo'); setTimeout(() => capa.remove(), 300); actualizarChips(); pulsoChip(); };
  const abrir = () => {
    if (abierto) return cerrar();
    abierto = true;
    const b = $('#cofre-abrir', capa);
    b.classList.add('abierto');
    $('img', b).src = 'assets/cofre-abierto.svg';
    $('#cofre-monto', capa).hidden = false;
    $('#cofre-ok', capa).textContent = t('premio_ok');
    sonido.premio();
    const r = b.getBoundingClientRect();
    estallido(r.left + r.width / 2, r.top + r.height / 3, { cantidad: 16 });
    lluvia({ cantidad: 24, monedas: 0.8 });
  };
  $('#cofre-abrir', capa).addEventListener('click', abrir);
  $('#cofre-ok', capa).addEventListener('click', abrir);
  capa.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
  $('#cofre-ok', capa).focus({ preventScroll: true });
}

function responderSlide(slide, sabia, auto = false) {
  if (!sesion || slide.dataset.r) return;
  const { meta } = sesion;
  const id = slide.dataset.id;
  slide.dataset.r = sabia ? 'si' : 'no';
  const diaAntes = S.racha.ultimoDia;
  const nivAntes = dificultad(store.progresoDe(S, meta)[id]);
  sesion.tokens += (sesion.libre ? store.registrarPractica : store.registrarRespuesta)(S, meta, id, sabia);
  if (S.tutorialVisto && store.esNovato(S)) { if (!sabia) pista('kitty', 'tut_k4'); else pista('monedas', 'tut_k3'); }
  sabia ? sesion.sabias++ : sesion.repasar++;
  if (!auto) {
    sonido.moneda(0.05, sabia ? 2 : 0);
    volarMonedas(slide, sabia ? 3 : 1);
    const etapa = etapaHoy();
    const premio = store.contarRevision(S);
    if (premio) { sesion.tokens += premio.monedas; setTimeout(() => mostrarPremio(premio), 700); }
    if (etapaHoy() !== etapa) pintarFlor(true);
    regarJardin(J.CRECE_POR_PALABRA);
    if (S.diario.revisadas === S.ajustes.meta) regarJardin(J.CRECE_POR_META);
    if (S.diario.revisadas === store.DIAMANTE_PALABRAS) setTimeout(() => celebrarDiamante(t('dia_50')), premio ? 1600 : 600);
    else if (!window.__sinSorpresas && !store.esNovato(S) && store.tocaDiamante(S)) setTimeout(aparecerDiamante, 900 + Math.random() * 2500);
    if (S.racha.ultimoDia !== diaAntes) setTimeout(celebrarRacha, premio ? 1200 : 500);
  }
  const niv = dificultad(store.progresoDe(S, meta)[id]);
  $('.nivel', slide).outerHTML = insignia(niv);
  if (!auto && niv === 'dominada' && nivAntes !== 'dominada') {
    S.tokens += store.BONO_DOMINADA; sesion.tokens += store.BONO_DOMINADA;
    setTimeout(() => mostrarDominada(id, meta), 500);
  }
  if (!auto) flotar(slide, '+1');

  if (!sabia) {
    sesion.reps[id] = (sesion.reps[id] ?? 0) + 1;
    // "Repasar" vuelve hasta 2 veces (las saltadas se marcan al terminar y ya no vuelven).
    if (!sesion.terminada && sesion.reps[id] <= MAX_REPETICIONES) {
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
  if (!sesion) return; // se salió de la sesión antes de que avanzara
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
    sesion.actual = i;
    // Pasar una tarjeta sin marcar cuenta como "repasar", pero recién al terminar:
    // así se puede volver atrás con el scroll y responderla.
    if (e.target.id === 'slide-fin') terminar();
  }
}

function terminar() {
  if (!sesion || sesion.terminada) return;
  sesion.terminada = true;
  slidesDeFeed().forEach((sl) => { if (!sl.dataset.r) responderSlide(sl, false, true); });
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

/** Pantalla «¡Dominada!» (como el match de Tinder): la palabra y su traducción chocan y Kitty celebra. */
function mostrarDominada(id, meta) {
  document.querySelector('.dominada-capa')?.remove();
  const nativo = S.ajustes.nativo;
  const palabra = banco.texto(meta, id)?.texto ?? '', trad = banco.texto(nativo, id)?.texto ?? '';
  const total = Object.values(store.progresoDe(S, meta)).filter((e) => dificultad(e) === 'dominada').length;
  const capa = document.createElement('div');
  capa.className = 'dominada-capa'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-labelledby', 'dom-titulo');
  capa.innerHTML = `<div class="dominada">
      <h2 id="dom-titulo" class="dominada-titulo">${t('dom_titulo')}</h2>
      <div class="dominada-par" aria-hidden="true">
        <span class="dominada-burbuja izq" lang="${meta}">${esc(palabra)}</span>
        <img class="dominada-kitty" src="${cara('orgullosa')}" alt="" width="100" height="80">
        <span class="dominada-burbuja der" lang="${nativo}">${esc(trad)}</span>
      </div>
      <p>${t('dom_texto', { palabra: esc(palabra) })}</p>
      <p class="dominada-bono"><img src="assets/moneda.svg" alt="" width="24" height="24">${t('dom_bono', { n: store.BONO_DOMINADA })}</p>
      <small>${t('dom_total', { n: total })}</small>
      <button class="btn primario grande" type="button" id="dom-seguir">${t('dom_seguir')}</button>
    </div>`;
  document.body.append(capa);
  sonido.like();
  lluvia({ cantidad: 30, monedas: 0.4 });
  const cerrar = () => { capa.remove(); actualizarChips(); };
  $('#dom-seguir').addEventListener('click', cerrar);
  capa.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
  $('#dom-seguir').focus();
}

/** Diamante sorpresa: cruza la pantalla unos segundos; si lo tocas a tiempo, es tuyo. */
function aparecerDiamante() {
  if (!sesion || document.querySelector('.diamante-vuela')) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'diamante-vuela'; b.setAttribute('aria-label', t('dia_atrapa'));
  b.innerHTML = '<img src="assets/diamante.svg" alt="" width="75" height="57">';
  b.style.top = `${18 + Math.random() * 50}vh`;
  b.style.setProperty('--dir', Math.random() < 0.5 ? 1 : -1);
  document.body.append(b);
  sonido.toque();
  const fuera = setTimeout(() => b.remove(), 3600);
  b.addEventListener('click', (e) => {
    clearTimeout(fuera);
    const r0 = b.getBoundingClientRect();
    b.remove();
    estallido(r0.left + r0.width / 2, r0.top + r0.height / 2, { cantidad: 14 });
    store.ganarDiamante(S);
    guardar();
    celebrarDiamante(t('dia_ganado'));
  });
}
function celebrarDiamante(texto) {
  sonido.brillo();
  toast(texto);
  if (sinMovimiento()) return;
  const d = document.createElement('img');
  d.src = 'assets/diamante.svg'; d.alt = ''; d.width = 125; d.height = 95; d.className = 'diamante-gana';
  document.body.append(d);
  setTimeout(() => d.remove(), 1600);
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

// ---------- Tutorial guiado por Kitty (en la primera sesión) ----------
const PASOS_TUT = [
  { texto: 'tut_k1', cara: 'muy_feliz', objetivo: (sl) => sl && $('.revelar', sl) },
  { texto: 'tut_k2', cara: 'guino', objetivo: (sl) => sl && $('.tarjeta', sl) },
];
// Lo demás se cuenta cuando pasa (no todo de golpe al principio)
function pista(clave, texto) {
  if (S.pistas[clave]) return;
  S.pistas[clave] = true; guardar();
  setTimeout(() => toast(t(texto)), 700);
}
function ocultarTutorial() {
  const capa = $('#tutorial');
  if (capa) { capa.hidden = true; capa.innerHTML = ''; }
  $$('.tut-foco').forEach((e) => e.classList.remove('tut-foco'));
  tutorialAlRevelar = null;
}
function iniciarTutorial() {
  if (!sesion || S.tutorialVisto) return;
  const capa = $('#tutorial');
  let i = 0;
  const terminar = () => { ocultarTutorial(); S.tutorialVisto = true; guardar(); };
  const avanzar = () => { i += 1; if (i >= PASOS_TUT.length) terminar(); else pintar(); };
  const pintar = () => {
    const paso = PASOS_TUT[i];
    const slide = $$('#feed .slide')[sesion?.actual ?? 0];
    $$('.tut-foco').forEach((e) => e.classList.remove('tut-foco'));
    paso.objetivo(slide)?.classList.add('tut-foco');
    const ultimo = i === PASOS_TUT.length - 1;
    capa.innerHTML = `
      <div class="tut-burbuja" role="dialog" aria-label="Kitty" aria-live="polite">
        <img src="${cara(paso.cara)}" alt="" width="60" height="48">
        <div class="tut-cuerpo">
          <p>${t(paso.texto)}</p>
          <div class="tut-acciones">
            <span class="tut-pasos" aria-hidden="true">${PASOS_TUT.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>
            ${ultimo ? '' : `<button class="btn pequeno" type="button" id="tut-saltar">${t('tut_saltar')}</button>`}
            <button class="btn primario pequeno" type="button" id="tut-avanzar">${t(ultimo ? 'tut_listo' : 'tut_siguiente')}</button>
          </div>
        </div>
      </div>`;
    capa.hidden = false;
    $('#tut-avanzar').addEventListener('click', avanzar);
    $('#tut-saltar')?.addEventListener('click', terminar);
  };
  tutorialAlRevelar = () => { if (i === 0) avanzar(); };
  pintar();
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
    $('.ejemplo', slide)?.removeAttribute('aria-hidden');
    if (!slide.classList.contains('revelada')) sonido.voltear();
    slide.classList.add('revelada');
    tutorialAlRevelar?.();
  } else if (e.target.closest('.btn-sabe')) lanzarTarjeta(slide, true);
  else if (e.target.closest('.btn-repasar')) lanzarTarjeta(slide, false);
  else if (e.target.closest('.ej-audio')) {
    const ej = banco.ejemplo(sesion.meta, id);
    if (ej && !hablar(ej.ejemplo.replace(/\*/g, ''), sesion.meta)) toast(t('sin_voz'));
  } else if (e.target.closest('.btn-audio')) {
    if (!hablar(banco.texto(sesion.meta, id).texto, sesion.meta)) toast(t('sin_voz'));
  } else if (e.target.closest('.kitty-ayuda')) kittyAbrir();
  else if (e.target.closest('.btn-fav')) alternarFav(slide, id, e.target.closest('.btn-fav'));
}

/** Marca o quita favorito y actualiza el corazón de la tarjeta. forzar=true solo marca (doble toque). */
function alternarFav(slide, id, origen, forzar = false) {
  if (forzar && store.esFavorito(S, sesion.meta, id)) return true;
  const on = store.alternarFavorito(S, sesion.meta, id);
  guardar();
  if (on) { sonido.like(); estallarCorazones(origen ?? $('.btn-fav', slide)); } else sonido.quitar();
  $$(`#feed .slide[data-id="${id}"] .btn-fav`).forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', t(on ? 'quitar_favorito' : 'favorito'));
    b.innerHTML = on ? ICON.corazonLleno : ICON.corazon;
    b.classList.toggle('pop', on);
  });
  return on;
}

let ultimoToque = null;
/** Dos toques seguidos (< 320 ms, cerca) en la misma tarjeta; funciona igual con dedo y mouse. */
function detectarDobleToque(e) {
  if (ignorarClick) return;
  const ahora = performance.now();
  const u = ultimoToque;
  ultimoToque = { t: ahora, x: e.clientX, y: e.clientY, tarj: e.target.closest('.tarjeta') };
  if (u && u.tarj && u.tarj === ultimoToque.tarj && ahora - u.t < 320 && Math.hypot(e.clientX - u.x, e.clientY - u.y) < 40) {
    ultimoToque = null;
    dobleToqueFeed(e);
  }
}

/** Doble toque en la tarjeta = favorito, con un corazón grande que salta donde tocaste (como Instagram). */
function dobleToqueFeed(e) {
  const tarj = e.target.closest('.tarjeta');
  if (!tarj || e.target.closest('button:not(.revelar), a, details, .riel, .tarjeta-acciones')) return;
  const slide = tarj.closest('.slide');
  if (!slide || slide.classList.contains('fin')) return;
  e.preventDefault();
  window.getSelection?.()?.removeAllRanges();
  alternarFav(slide, slide.dataset.id, null, true);
  if (sinMovimiento()) return;
  const r = tarj.getBoundingClientRect();
  const h = document.createElement('span');
  h.className = 'corazon-grande'; h.setAttribute('aria-hidden', 'true'); h.innerHTML = ICON.corazonLleno;
  h.style.left = `${e.clientX - r.left}px`; h.style.top = `${e.clientY - r.top}px`;
  tarj.append(h);
  setTimeout(() => h.remove(), 900);
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
let campoRanking = 'racha';
const IMG_LIGA = ['flor-0', 'flor-1', 'flor-3', 'sakura'];
/** Tarjeta de la liga semanal: insignia, XP de la semana, cuánto falta para subir y cuándo cierra. */
function cabeceraLiga() {
  store.actualizarLiga(S);
  const l = S.liga, max = l.nivel === store.LIGAS.length - 1;
  const dias = store.diasParaCierre();
  const pct = Math.min(100, (l.xp / store.SUBE_LIGA) * 100);
  const peldanos = store.LIGAS.map((n, i) => `<li class="${i === l.nivel ? 'actual' : i < l.nivel ? 'pasada' : ''}"><img src="assets/${IMG_LIGA[i]}.svg" alt="" width="46" height="46"><span>${t('liga_' + n)}</span></li>`).join('');
  return `<div class="card liga-card">
      <ol class="liga-peldanos" aria-label="${t('rank_xp')}">${peldanos}</ol>
      <h2>${t('liga_' + store.LIGAS[l.nivel])}</h2>
      <p class="liga-xp"><strong>${t('liga_xp', { n: l.xp })}</strong> · ${dias === 1 ? t('liga_dias_1') : t('liga_dias_n', { n: dias })}</p>
      <span class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="${store.SUBE_LIGA}" aria-valuenow="${Math.min(l.xp, store.SUBE_LIGA)}" aria-label="${t('liga_xp', { n: l.xp })}"><i style="width:${pct}%"></i></span>
      <small>${max ? t('liga_max', { n: store.BAJA_LIGA }) : t('liga_meta', { n: store.SUBE_LIGA })}</small>
      <p class="suave pequeno">${t("liga_como")}</p>
    </div>`;
}

async function vistaRanking() {
  const campo = campoRanking;
  const yo = filaRanking();
  const uid = S.perfil.cuenta?.uid;
  const ayer = store.diaLocal(Date.now() - 864e5);
  // La racha guardada se «vence» si esa persona no estudió ni hoy ni ayer
  const valor = (f) => (campo === 'racha' ? (f.dia && f.dia >= ayer ? f.racha : 0) : f[campo] ?? 0);
  const icono = { racha: '<img src="assets/sakura.svg" alt="" width="23" height="23">', palabras: ICON.libro, nivel: ICON.arbol, xp: ICON.estrella }[campo];
  const sem = store.semanaISO();
  const deMiLiga = (f) => campo !== 'xp' || (f.semana === sem && (f.liga ?? 0) === S.liga.nivel);
  const fila = (f, puesto) => `
    <li class="${f.uid && f.uid === uid ? 'yo' : ''}"><span class="puesto">${puesto}</span>
      <span class="avatar">${esc((f.nombre || '?').charAt(0).toUpperCase())}</span>
      <strong>${esc(f.nombre || '?')}${f.uid === uid ? ` <small>(${t('rank_tu')})</small>` : ''}</strong>
      <span class="chip">${icono}<span>${campo === 'nivel' ? t('jar_nivel', { n: valor(f) }) : campo === 'xp' ? `${valor(f)} XP` : valor(f)}</span></span></li>`;
  const tabs = nube.CAMPOS_RANKING.map((c) => `<button role="tab" type="button" data-campo="${c}" aria-selected="${c === campo}">${t(c === 'racha' ? 'rank_t_racha' : 'rank_' + c)}</button>`).join('');
  const marco = (contenido) => {
    vista.innerHTML = `
      <section class="pagina angosta">
        <h1 class="display">${t('rank_titulo')}</h1>
        <div class="seg ranking-tabs" role="tablist">${tabs}</div>
        ${campo === 'xp' ? cabeceraLiga() : ''}
        ${contenido}
      </section>`;
    $$('[data-campo]').forEach((b) => b.addEventListener('click', () => { campoRanking = b.dataset.campo; vistaRanking(); }));
  };
  if (!conCuenta()) {
    marco(`<ol class="ranking">${fila({ ...yo, nombre: S.perfil.nombre || t('rank_tu'), uid: 'yo' }, 1).replace('class=""', 'class="yo"')}</ol>
      <p class="aviso">${t(nube.nubeLista() ? 'rank_entra' : 'rank_pronto')}</p>
      ${nube.nubeLista() ? `<button class="btn primario ancho" type="button" id="rank-google">${ICON.google}<span>${t('login_google')}</span></button>` : ''}`);
    $('#rank-google')?.addEventListener('click', conectarGoogle);
    return;
  }
  marco('<div class="cargando" aria-busy="true"><img src="assets/corazon.svg" alt="" width="52" height="48"></div>');
  try {
    if (S.ajustes.ranking !== false) await nube.publicarRanking(uid, yo);
    let filas = (await nube.leerRanking(campo)).filter(deMiLiga);
    if (campoRanking !== campo) return; // cambió de pestaña mientras cargaba
    if (S.ajustes.ranking !== false && !filas.some((f) => f.uid === uid)) filas.push({ ...yo, uid });
    filas = filas.map((f) => (f.uid === uid ? { ...f, ...yo, uid } : f)).sort((x, y) => valor(y) - valor(x));
    const mio = filas.findIndex((f) => f.uid === uid);
    marco(`
      <ol class="ranking">${filas.map((f, i) => fila(f, i + 1)).join('')}</ol>
      ${filas.length <= 1 ? `<p class="aviso">${t(campo === 'xp' ? 'liga_solo' : 'rank_vacio')}</p>` : ''}
      ${S.ajustes.ranking === false ? `<p class="aviso">${t('rank_oculto')}</p>` : mio >= 0 ? `<p class="suave centro">${t('rank_puesto', { n: mio + 1 })}</p>` : ''}`);
  } catch {
    marco(`<ol class="ranking">${fila({ ...yo, uid }, 1)}</ol><p class="aviso">${t('rank_error')}</p>`);
  }
}

// ---------- Estudio libre: elegir qué repasar sin mover el calendario ----------
const libreFiltro = { texto: '', mega: '', nivel: 'vistas', elegidos: new Set() };
const MAX_LIBRE_LISTA = 120, MAX_LIBRE_SESION = 40;
async function vistaLibre() {
  if (!S.aprendiendo) return void (location.hash = '#/idiomas');
  const meta = S.aprendiendo, nativo = S.ajustes.nativo;
  cargando();
  await banco.prepararPar(meta, nativo);
  const prog = store.progresoDe(S, meta);
  const todos = ordenar(banco.disponibles(meta, nativo));
  const nivelDe = (id) => dificultad(prog[id]);
  const textos = (id) => [banco.texto(meta, id)?.texto ?? '', banco.texto(nativo, id)?.texto ?? ''];
  const f = libreFiltro;
  const chips = [['vistas', t('libre_f_vistas')], ['dominada', t('niv_dominada')], ['facil', t('niv_facil')], ['media', t('niv_media')], ['dificil', t('niv_dificil')], ['favoritos', t('libre_f_favoritos')], ['todas', t('libre_f_todas')]];
  vista.innerHTML = `
    <section class="pagina angosta libre">
      <h1 class="display">${t('libre_titulo')}</h1>
      <p class="suave">${t('libre_texto')}</p>
      <label class="campo"><span>${t('libre_buscar')}</span><input type="search" id="libre-q" value="${esc(f.texto)}" autocomplete="off" enterkeyhint="search"></label>
      <label class="campo"><span>${t('libre_tema')}</span><select id="libre-tema"><option value="">${t('libre_todos_temas')}</option>${MEGA_TEMAS.map((m) => `<option value="${esc(m)}" ${m === f.mega ? 'selected' : ''}>${esc(tMega(m))}</option>`).join('')}</select></label>
      <div class="libre-chips" role="radiogroup" aria-label="${t('libre_titulo')}">${chips.map(([v, l]) => `<button type="button" role="radio" data-nivel="${v}" aria-checked="${f.nivel === v}">${l}</button>`).join('')}</div>
      <div class="libre-barra"><span id="libre-cuenta"></span><button class="btn pequeno" type="button" id="libre-marcar"></button></div>
      <ul class="libre-lista" id="libre-lista"></ul>
      <p class="suave pequeno" id="libre-mas"></p>
      <div class="libre-acciones">
        <button class="btn" type="button" id="libre-azar">${t('libre_azar')}</button>
        <button class="btn primario grande" type="button" id="libre-ir"></button>
      </div>
    </section>`;
  let visibles = [];
  const pintar = () => {
    visibles = filtrarLibre(todos, { ...f, favoritos: new Set(S.favoritos[meta] ?? []) }, { nivelDe, textos });
    const mostrar = visibles.slice(0, MAX_LIBRE_LISTA);
    $('#libre-cuenta').textContent = tn('libre_n', visibles.length);
    $('#libre-lista').innerHTML = mostrar.length ? mostrar.map((c) => `
      <li><label class="libre-fila"><input type="checkbox" value="${c.id}" ${f.elegidos.has(c.id) ? 'checked' : ''}>
        <span class="libre-palabra"><strong lang="${meta}">${esc(banco.texto(meta, c.id).texto)}</strong><small lang="${nativo}">${esc(banco.texto(nativo, c.id).texto)}</small></span>
        ${insignia(nivelDe(c.id))}</label></li>`).join('') : `<li class="aviso">${t('libre_vacio')}</li>`;
    $('#libre-mas').textContent = visibles.length > MAX_LIBRE_LISTA ? t('libre_mas', { n: MAX_LIBRE_LISTA, m: visibles.length }) : '';
    $$('#libre-lista input').forEach((i) => i.addEventListener('change', () => { i.checked ? f.elegidos.add(i.value) : f.elegidos.delete(i.value); botones(); }));
    botones();
  };
  const botones = () => {
    const n = Math.min(f.elegidos.size, MAX_LIBRE_SESION);
    $('#libre-ir').disabled = !n;
    $('#libre-ir').textContent = t('libre_estudiar', { n });
    $('#libre-marcar').textContent = f.elegidos.size ? t('libre_desmarcar') : t('libre_marcar');
  };
  const ir = (ids) => { location.hash = `#/estudiar?${new URLSearchParams({ ids: ids.slice(0, MAX_LIBRE_SESION).join(',') })}`; };
  $('#libre-q').addEventListener('input', (e) => { f.texto = e.target.value; pintar(); });
  $('#libre-tema').addEventListener('change', (e) => { f.mega = e.target.value; pintar(); });
  $$('.libre-chips [data-nivel]', vista).forEach((b) => b.addEventListener('click', () => {
    f.nivel = b.dataset.nivel; $$('.libre-chips [data-nivel]', vista).forEach((x) => x.setAttribute('aria-checked', String(x === b))); pintar();
  }));
  $('#libre-marcar').addEventListener('click', () => {
    if (f.elegidos.size) f.elegidos.clear(); else visibles.slice(0, MAX_LIBRE_SESION).forEach((c) => f.elegidos.add(c.id));
    pintar();
  });
  $('#libre-ir').addEventListener('click', () => ir([...f.elegidos]));
  $('#libre-azar').addEventListener('click', () => {
    const base = visibles.length ? visibles : todos;
    ir([...base].sort(() => Math.random() - 0.5).slice(0, 10).map((c) => c.id));
  });
  pintar();
}

// ---------- Buzón de sugerencias ----------
const esCreadora = () => conCuenta() && S.perfil.cuenta.email?.toLowerCase() === nube.CREADORA;
let enviando = null;
/** Envía a la nube las sugerencias guardadas que aún no salieron. Devuelve cuántas se enviaron. */
function enviarSugerenciasPendientes() {
  if (enviando) return enviando;
  enviando = (async () => {
    if (!nube.nubeLista()) return 0;
    let n = 0;
    for (const s of S.sugerencias.filter((x) => !x.enviada)) {
      try {
        await nube.enviarSugerencia({ texto: s.texto, fecha: s.fecha, idioma: S.ajustes.nativo || '', version: ultimaVersion || '',
          ...(conCuenta() ? { uid: S.perfil.cuenta.uid, nombre: (S.perfil.nombre || '').slice(0, 30) } : {}) });
        s.enviada = true; n++;
      } catch { break; }
    }
    if (n) guardarYa();
    return n;
  })().finally(() => { enviando = null; });
  return enviando;
}
window.addEventListener('online', () => enviarSugerenciasPendientes());

/** Solo para la creadora: lee, marca y borra las sugerencias. */
async function vistaBuzon() {
  if (!esCreadora()) { location.hash = '#/ajustes'; return; }
  vista.innerHTML = `<section class="pagina angosta"><h1 class="display">${t('buzon_titulo')}</h1><div class="cargando" aria-busy="true"><img src="assets/corazon.svg" alt="" width="52" height="48"></div></section>`;
  let lista;
  try { lista = await nube.leerSugerencias(); } catch {
    vista.innerHTML = `<section class="pagina angosta"><h1 class="display">${t('buzon_titulo')}</h1><p class="aviso">${t('buzon_error')}</p></section>`; return;
  }
  const fecha = (ms) => new Date(ms).toLocaleString(S.ajustes.nativo || 'es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const sinLeer = lista.filter((x) => !x.leida).length;
  vista.innerHTML = `
    <section class="pagina angosta buzon">
      <h1 class="display">${t('buzon_titulo')}</h1>
      ${lista.length ? `<p class="suave">${tn('buzon_nuevas_n', sinLeer)}</p>` : `<p class="aviso">${t('buzon_vacio')}</p>`}
      <ul class="buzon-lista">${lista.map((x) => `
        <li class="card ${x.leida ? 'leida' : 'nueva'}" data-id="${esc(x.id)}">
          <p class="buzon-meta">${x.leida ? '' : `<span class="tag">${t('niv_nueva')}</span>`}<strong>${esc(x.nombre || t('buzon_anonimo'))}</strong>
            <span class="suave">· ${fecha(x.fecha)} · ${esc((x.idioma || '?').toUpperCase())}${x.version ? ` · v${esc(x.version)}` : ''}</span></p>
          <p class="buzon-texto">${esc(x.texto)}</p>
          <div class="buzon-acciones">
            <button class="btn pequeno" type="button" data-leer>${t(x.leida ? 'buzon_no_leida' : 'buzon_leida')}</button>
            <button class="btn fantasma pequeno" type="button" data-borrar>${t('buzon_borrar')}</button>
          </div>
        </li>`).join('')}</ul>
    </section>`;
  $$('.buzon-lista li').forEach((li) => {
    const x = lista.find((y) => y.id === li.dataset.id);
    $('[data-leer]', li).addEventListener('click', async () => { await nube.marcarSugerencia(x.id, !x.leida).catch(() => toast(t('buzon_error'))); vistaBuzon(); });
    $('[data-borrar]', li).addEventListener('click', () => {
      modal(t('buzon_borrar'), `<p class="buzon-texto">${esc(x.texto)}</p><button class="btn peligro ancho" type="button" id="buzon-borrar-si">${t('buzon_borrar')}</button>`);
      $('#buzon-borrar-si').addEventListener('click', async () => {
        $('#modal').close();
        await nube.borrarSugerencia(x.id).then(() => toast(t('buzon_borrar_ok'))).catch(() => toast(t('buzon_error')));
        vistaBuzon();
      });
    });
  });
}

// ---------- Novedades ----------
async function vistaNovedades() {
  const data = await (await fetch('data/novedades.json')).json();
  const [ultima, ...resto] = data.novedades;
  const fecha = (f) => new Date(f + 'T12:00').toLocaleDateString(S.ajustes.nativo, { day: 'numeric', month: 'long', year: 'numeric' });
  ultimaVersion = ultima.version;
  if (S.novedadVista !== ultima.version) { S.novedadVista = ultima.version; guardar(); }
  marcarAvisoNovedades();
  const confeti = [['sakura', 23, 23], ['estrella', 21, 21], ['moneda', 24, 24], ['corazon', 26, 24], ['sakura', 23, 23], ['estrella', 21, 21], ['moneda', 24, 24], ['cerezas', 18, 17]]
    .map(([n, w, h], i) => `<img src="assets/${n}.svg" alt="" width="${w}" height="${h}" style="--i:${i}">`).join('');
  const anteriores = resto.map((n) => `
    <li class="novedad">
      <details>
        <summary><span class="nov-pill">v${esc(n.version)}</span><span lang="es">${esc(n.titulo)}</span><time datetime="${n.fecha}">${fecha(n.fecha)}</time></summary>
        <ul lang="es">${n.cambios.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      </details>
    </li>`).join('');
  vista.innerHTML = `
    <section class="pagina angosta">
      <h1 class="display">${t('nov_titulo')}</h1>
      <article class="nov-hero">
        <div class="nov-confeti" aria-hidden="true">${confeti}</div>
        <p class="nov-etiqueta">${ICON.brillo}<span>${t('nov_nueva')}</span></p>
        <p class="nov-version">v${esc(ultima.version)}</p>
        <h2 lang="es">${esc(ultima.titulo)}</h2>
        <p class="nov-fecha"><time datetime="${ultima.fecha}">${fecha(ultima.fecha)}</time></p>
        <ul class="nov-cambios" lang="es">${ultima.cambios.map((c, i) => `<li style="--i:${i}">${ICON.check}<span>${esc(c)}</span></li>`).join('')}</ul>
      </article>
      ${resto.length ? `<h2 class="nov-sub">${t('nov_anteriores')}</h2><ol class="novedades">${anteriores}</ol>` : ''}
    </section>`;
  sonido.fin();
}

// ---------- Ajustes ----------
function vistaAjustes() {
  const a = S.ajustes;
  const opcion = (grupo, valor, texto, actual) => `<button type="button" role="radio" aria-checked="${valor === actual}" data-${grupo}="${valor}">${texto}</button>`;
  const pendientes = S.sugerencias.filter((s) => s.enviada).length;
  vista.innerHTML = `
    <section class="pagina angosta ajustes">
      <h1 class="display">${t('aj_titulo')}</h1>

      <div class="card">
        <h2>${t('perfil')}</h2>
        <label class="campo"><span>${t('aj_nombre')}</span><input id="aj-nombre" maxlength="30" value="${esc(S.perfil.nombre)}" autocomplete="nickname"></label>
        <dl class="datos">
          <div><dt>${t('aj_cuenta')}</dt><dd>${S.perfil.cuenta ? `${esc(S.perfil.cuenta.email)}<br><small class="suave">${t('nube_guardando')}</small>` : t('aj_invitado')}</dd></div>
          <div><dt>${t('rank_racha')}</dt><dd>${store.rachaVigente(S.racha)}</dd></div>
          <div><dt>${t('aj_mejor_racha')}</dt><dd>${S.racha.mejor}</dd></div>
          <div><dt>Kitty tokens</dt><dd>${S.tokens}</dd></div>
        </dl>
        ${S.perfil.cuenta ? `<label class="interruptor"><input type="checkbox" id="aj-ranking" ${a.ranking !== false ? 'checked' : ''}><span>${t('aj_ranking')}</span></label>` : ''}
        ${S.perfil.cuenta ? `<button class="btn fantasma ancho" type="button" id="aj-salir">${t('aj_salir')}</button>`
          : `<button class="btn ancho" type="button" id="aj-google">${ICON.google}<span>${t('aj_google')}</span></button>`}
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
        <label class="interruptor"><input type="checkbox" id="aj-musica" ${a.musica ? 'checked' : ''}><span>${t('aj_musica')}</span></label>
      </div>

      <div class="card">
        <h2>${t('rec_titulo')}</h2>
        <label class="interruptor"><input type="checkbox" id="aj-recordatorio" ${a.recordatorio ? 'checked' : ''}><span>${t('rec_activar')}</span></label>
        <label class="campo"><span>${t('rec_hora')}</span><input type="time" id="aj-hora" value="${esc(a.horaRecordatorio)}" step="900"></label>
        <button class="btn ancho" type="button" id="aj-calendario">${ICON.calendario}<span>${t('rec_calendario')}</span></button>
        <p class="suave pequeno">${t('rec_cal_nota')}</p>
      </div>

      <div class="card">
        <h2>${t('aj_app')}</h2>
        <div class="fila-app">${iconoApp()}<p class="suave">${instalada() ? t('inst_ya') : t('inst_texto')}</p></div>
        ${botonInstalar('btn ancho')}
      </div>

      <div class="card">
        <h2>${t('aj_meta')}</h2>
        <p class="meta-fija"><strong>${t('meta_n', { n: store.META_DIA })}</strong> · ${t('aj_meta_fija')}</p>
        <p class="flores-meta" aria-hidden="true">${[0, 1, 2, 3, 4].map((e) => `<img src="${srcFlor(e)}" alt="" width="23" height="23">`).join('<span>›</span>')}</p>
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

      ${esCreadora() ? `<a class="card buzon-acceso" href="#/buzon">${ICON.enviar}<span>${t('buzon_abrir')}</span>${ICON.flecha}</a>` : ''}
      <div class="card">
        <h2>${t('aj_sugerencias')}</h2>
        <form id="f-sug">
          <label class="campo"><span>${t('aj_sug_texto')}</span><textarea id="aj-sug" rows="3" maxlength="2000" required></textarea></label>
          <button class="btn primario" type="submit">${ICON.enviar}<span>${t('aj_enviar')}</span></button>
          ${pendientes ? `<p class="suave pequeno">✓ ${pendientes}</p>` : ''}
        </form>
      </div>

      <div class="card lista-enlaces">
        <button type="button" id="aj-tutorial">${t('tut_ver')}${ICON.flecha}</button>
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
  $('#aj-google')?.addEventListener('click', conectarGoogle);
  $('#aj-salir')?.addEventListener('click', salirDeGoogle);
  $('#aj-ranking')?.addEventListener('change', (e) => {
    a.ranking = e.target.checked;
    guardar();
    if (a.ranking) publicarMiRanking();
    else if (conCuenta()) nube.borrarRanking(S.perfil.cuenta.uid).catch(() => {});
  });
  $$('[data-tema]').forEach((b) => b.addEventListener('click', () => { a.tema = b.dataset.tema; guardar(); aplicarAjustes(); vistaAjustes(); }));
  $$('.paletas [data-paleta]').forEach((b) => b.addEventListener('click', () => { a.paleta = b.dataset.paleta; guardar(); aplicarAjustes(); vistaAjustes(); }));
  $('#aj-escala').addEventListener('input', (e) => { a.escala = Number(e.target.value); $('#o-escala').textContent = `${Math.round(a.escala * 100)}%`; aplicarAjustes(); guardar(); });
  $('#aj-brillo').addEventListener('input', (e) => { a.brillo = Number(e.target.value); $('#o-brillo').textContent = `${Math.round(a.brillo * 100)}%`; aplicarAjustes(); guardar(); });
  $('#aj-ipa').addEventListener('change', (e) => { a.ipa = e.target.checked; guardar(); });
  $('#aj-recordatorio').addEventListener('change', async (e) => {
    if (!e.target.checked) { a.recordatorio = false; guardar(); rec.desactivarAvisos().catch(() => {}); rec.publicarEstado({ activo: false }).catch(() => {}); return; }
    const r = await rec.activarAvisos().catch(() => 'no-soporta');
    a.recordatorio = r === 'ok';
    e.target.checked = a.recordatorio;
    guardar();
    toast(r === 'ok' ? t('rec_ok', { h: a.horaRecordatorio }) : t(r === 'sin-permiso' ? 'rec_sin_permiso' : 'rec_no_soporta'));
  });
  $('#aj-hora').addEventListener('change', (e) => { if (e.target.value) { a.horaRecordatorio = e.target.value; guardar(); } });
  $('#aj-calendario').addEventListener('click', descargarCalendario);
  $('#aj-musica').addEventListener('change', (e) => { a.musica = e.target.checked; musica(a.musica); guardar(); });
  $('#aj-sonido').addEventListener('change', (e) => { a.sonido = e.target.checked; activarSonido(a.sonido); guardar(); if (a.sonido) sonido.moneda(); });
  $('#aj-nativo').addEventListener('change', (e) => cambiarNativo(e.target.value));
  $('#f-sug').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!store.agregarSugerencia(S, $('#aj-sug').value)) return;
    guardarYa();
    enviarSugerenciasPendientes().then((n) => { toast(t(n ? 'sug_enviada' : 'sug_pendiente')); vistaAjustes(); });
  });
  $$('[data-modal]').forEach((b) => b.addEventListener('click', () => {
    const m = b.dataset.modal;
    if (m === 'cosmeticos') abrirCosmeticos();
    if (m === 'apoyar') modal(t('aj_apoyar'), `<p>${t('aj_apoyar_texto')}</p>`);
    if (m === 'legal') modal(t('aj_legal'), `<p>${t('legal_texto')}</p>
      <ul class="enlaces-legales" lang="es"><li><a href="../legal/privacidad.html" target="_blank" rel="noopener">Política de privacidad</a></li>
      <li><a href="../legal/terminos.html" target="_blank" rel="noopener">Términos y condiciones</a></li>
      <li><a href="../legal/cookies.html" target="_blank" rel="noopener">Política de cookies</a></li></ul>`);
  }));
  function abrirCosmeticos() {
    modal(t('aj_cosmeticos'), `<p>${t('aj_cos_texto')}</p><p class="chip"><img class="moneda" src="assets/moneda.svg" alt="" width="24" height="24">${S.tokens}</p>`);
  }
  // Confirmación dentro de la app (sin confirm(): no funciona en todos los navegadores ni en vistas incrustadas)
  $('#aj-tutorial').addEventListener('click', () => {
    S.tutorialVisto = false; guardar();
    location.hash = S.aprendiendo ? `#/estudiar?${new URLSearchParams({ mega: MEGA_TEMAS[0], dif: 'todas' })}` : '#/idiomas';
  });
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
if (store.usarProtectores(S)) { store.guardar(S); setTimeout(() => toast(t('protector_usado')), 1500); }
if (traspasado) setTimeout(() => toast(t('traspaso_ok')), 1200);
setTimeout(() => enviarSugerenciasPendientes(), 3000);
{ const c = store.actualizarLiga(S); if (c === 'sube' || c === 'baja') { store.guardar(S); setTimeout(() => toast(t(c === 'sube' ? 'liga_sube' : 'liga_baja', { liga: t('liga_' + store.LIGAS[S.liga.nivel]) })), 2200); } }
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', aplicarAjustes);
router();
sincronizarAlAbrir();
