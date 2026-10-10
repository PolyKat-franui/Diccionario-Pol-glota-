// Estado y progreso de la persona. Se guarda solo (autoguardado) en el navegador.
// La capa "nube" (cuenta) se conecta aquí más adelante: ver docs/RECOMENDACIONES.md.
import { responder } from './srs.js';

export const CLAVE = 'franui:v1';
export const TOKENS_POR_TARJETA = 1;
export const TOKENS_POR_SESION = 5;

export const PALETAS = ['higo', 'piedra', 'carbon', 'tamarindo', 'medianoche'];

export function estadoInicial() {
  return {
    version: 1,
    perfil: { nombre: '', cuenta: null, elegido: false }, // cuenta: null = sin cuenta (invitado)
    ajustes: { nativo: null, tema: 'sistema', paleta: 'higo', escala: 1, brillo: 1, ipa: true },
    aprendiendo: null,
    tokens: 0,
    ejercicios: 0,
    sesiones: 0,
    racha: { actual: 0, mejor: 0, ultimoDia: null },
    progreso: {},   // { idioma: { idConcepto: estadoSRS } }
    favoritos: {},  // { idioma: [idConcepto, ...] }
    sugerencias: [], // { texto, fecha, enviada }
    actualizado: 0,
  };
}

/** Une lo guardado con los valores por defecto (sirve como migración simple). */
export function normalizar(data) {
  const base = estadoInicial();
  if (!data || typeof data !== 'object') return base;
  const ajustes = { ...base.ajustes, ...data.ajustes };
  if (!PALETAS.includes(ajustes.paleta)) ajustes.paleta = base.ajustes.paleta; // paletas antiguas → la actual
  return {
    ...base,
    ...data,
    perfil: { ...base.perfil, ...data.perfil },
    ajustes,
    racha: { ...base.racha, ...data.racha },
  };
}

// Leer localStorage puede lanzar un error (modo privado, vistas incrustadas): se lee dentro del try.
const almacen = () => globalThis.localStorage;

export function cargar(storage) {
  try {
    const raw = (storage ?? almacen())?.getItem(CLAVE);
    return normalizar(raw ? JSON.parse(raw) : null);
  } catch {
    return estadoInicial();
  }
}

export function guardar(estado, storage, ahora = Date.now()) {
  estado.actualizado = ahora;
  try {
    (storage ?? almacen())?.setItem(CLAVE, JSON.stringify(estado));
    return true;
  } catch {
    return false; // modo privado o almacenamiento lleno: la app sigue funcionando
  }
}

// ---------- Racha ----------
const pad = (n) => String(n).padStart(2, '0');
export function diaLocal(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function diaAnterior(ts) {
  const d = new Date(ts);
  return diaLocal(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).getTime());
}

/** Se llama al estudiar una tarjeta: el primer estudio del día suma (o reinicia) la racha. */
export function marcarDiaEstudiado(racha, ahora = Date.now()) {
  const hoy = diaLocal(ahora);
  if (racha.ultimoDia === hoy) return racha;
  racha.actual = racha.ultimoDia === diaAnterior(ahora) ? racha.actual + 1 : 1;
  racha.ultimoDia = hoy;
  racha.mejor = Math.max(racha.mejor, racha.actual);
  return racha;
}

/** Racha que se muestra: si pasó más de un día sin estudiar, ya se perdió. */
export function rachaVigente(racha, ahora = Date.now()) {
  if (!racha.ultimoDia) return 0;
  return racha.ultimoDia === diaLocal(ahora) || racha.ultimoDia === diaAnterior(ahora) ? racha.actual : 0;
}

// ---------- Estudio ----------
export function progresoDe(estado, idioma) {
  estado.progreso[idioma] ??= {};
  return estado.progreso[idioma];
}

/** Registra "lo sé" / "repasar": SRS + Kitty tokens + ejercicios + racha. Devuelve tokens ganados. */
export function registrarRespuesta(estado, idioma, id, sabia, ahora = Date.now()) {
  const prog = progresoDe(estado, idioma);
  prog[id] = responder(prog[id], sabia, ahora);
  estado.tokens += TOKENS_POR_TARJETA;
  estado.ejercicios += 1;
  marcarDiaEstudiado(estado.racha, ahora);
  return TOKENS_POR_TARJETA;
}

export function terminarSesion(estado) {
  estado.sesiones += 1;
  estado.tokens += TOKENS_POR_SESION;
  return TOKENS_POR_SESION;
}

// ---------- Favoritos ----------
export function esFavorito(estado, idioma, id) {
  return (estado.favoritos[idioma] ?? []).includes(id);
}
export function alternarFavorito(estado, idioma, id) {
  const lista = (estado.favoritos[idioma] ??= []);
  const i = lista.indexOf(id);
  if (i === -1) lista.unshift(id); else lista.splice(i, 1);
  return i === -1;
}

// ---------- ¿Qué avance conservo? ----------
export function resumen(estado, ahora = Date.now()) {
  const palabras = Object.values(estado.progreso).reduce((n, p) => n + Object.keys(p).length, 0);
  return {
    tokens: estado.tokens,
    ejercicios: estado.ejercicios,
    racha: rachaVigente(estado.racha, ahora),
    palabras,
    actualizado: estado.actualizado,
  };
}

/** Hay conflicto si la cuenta y el navegador tienen avances distintos y ambos tienen algo. */
export function hayConflicto(cuenta, navegador) {
  if (!cuenta || !navegador) return false;
  const a = resumen(cuenta), b = resumen(navegador);
  const vacio = (r) => r.ejercicios === 0 && r.tokens === 0;
  if (vacio(a) || vacio(b)) return false;
  return a.ejercicios !== b.ejercicios || a.tokens !== b.tokens || a.palabras !== b.palabras;
}

/** Se conserva uno; el otro se reemplaza (como pide la especificación). */
export function elegirAvance(cuenta, navegador, eleccion) {
  const elegido = eleccion === 'cuenta' ? cuenta : navegador;
  return normalizar(JSON.parse(JSON.stringify(elegido)));
}

// ---------- Sugerencias ----------
export function agregarSugerencia(estado, texto, ahora = Date.now()) {
  const limpio = String(texto ?? '').trim().slice(0, 2000);
  if (!limpio) return false;
  estado.sugerencias.push({ texto: limpio, fecha: ahora, enviada: false });
  return true;
}
