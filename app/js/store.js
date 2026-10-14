// Estado y progreso de la persona. Se guarda solo (autoguardado) en el navegador.
// Con cuenta de Google, además se sube a la nube (ver nube.js y docs/NUBE.md).
import { responder } from './srs.js';
import { jardinInicial } from './jardin.js';

export const CLAVE = 'franui:v1';
export const TOKENS_POR_TARJETA = 1;
export const TOKENS_POR_SESION = 5;

export const PALETAS = ['higo', 'piedra', 'carbon', 'tamarindo', 'medianoche'];

export function estadoInicial() {
  return {
    version: 1,
    perfil: { nombre: '', cuenta: null, elegido: false }, // cuenta: null = sin cuenta (invitado)
    ajustes: { nativo: null, tema: 'sistema', paleta: 'higo', escala: 1, brillo: 1, ipa: true, sonido: true, meta: 10, ranking: true, recordatorio: false, horaRecordatorio: '20:00' }, // meta: palabras al día · ranking: aparecer en el ranking (con cuenta)
    aprendiendo: null,
    tokens: 0,
    ejercicios: 0,
    sesiones: 0,
    racha: { actual: 0, mejor: 0, ultimoDia: null },
    diario: { dia: null, revisadas: 0, premios: 0 }, // palabras revisadas hoy y premios cobrados
    progreso: {},   // { idioma: { idConcepto: estadoSRS } }
    favoritos: {},  // { idioma: [idConcepto, ...] }
    sugerencias: [], // { texto, fecha, enviada }
    jardin: jardinInicial(), // Jardín de Sakura (ver jardin.js)
    cofre: 0,             // último día de racha (7, 14, 21…) en que se abrió un cofre
    tutorialVisto: false, // tutorial guiado por Kitty (primera sesión)
    novedadVista: null,   // última versión de Novedades que se abrió
    actualizado: 0,
  };
}

/** Une lo guardado con los valores por defecto (sirve como migración simple). */
export function normalizar(data) {
  const base = estadoInicial();
  if (!data || typeof data !== 'object') return base;
  const ajustes = { ...base.ajustes, ...data.ajustes };
  if (!PALETAS.includes(ajustes.paleta)) ajustes.paleta = base.ajustes.paleta; // paletas antiguas → la actual
  if (!METAS.includes(ajustes.meta)) ajustes.meta = base.ajustes.meta;
  return {
    ...base,
    ...data,
    perfil: { ...base.perfil, ...data.perfil },
    ajustes,
    racha: { ...base.racha, ...data.racha },
    diario: { ...base.diario, ...data.diario },
    jardin: { ...base.jardin, ...data.jardin },
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

/**
 * Sakura de reserva (tienda de Kitty): si no estudiaste ayer (o varios días), cada una cubre un día perdido
 * y la racha sigue. Se usa al abrir la app y al estudiar. Devuelve cuántas se usaron.
 */
export function usarProtectores(estado, ahora = Date.now()) {
  const r = estado.racha;
  const j = estado.jardin;
  if (!r.ultimoDia || !r.actual || !j?.protectores) return 0;
  const ayer = diaAnterior(ahora);
  if (r.ultimoDia >= ayer) return 0; // estudió ayer u hoy: nada que cubrir
  const [a, m, d] = r.ultimoDia.split('-').map(Number);
  let perdidos = 0;
  for (let k = 1; diaLocal(new Date(a, m - 1, d + k).getTime()) <= ayer; k++) perdidos++;
  if (perdidos > j.protectores) return 0; // no alcanzan: la racha se pierde y las reservas se guardan
  j.protectores -= perdidos;
  r.ultimoDia = ayer;
  return perdidos;
}

/** Racha que se muestra: si pasó más de un día sin estudiar, ya se perdió. */
export function rachaVigente(racha, ahora = Date.now()) {
  if (!racha.ultimoDia) return 0;
  return racha.ultimoDia === diaLocal(ahora) || racha.ultimoDia === diaAnterior(ahora) ? racha.actual : 0;
}

// ---------- Meta diaria y cofres ----------
export const METAS = [5, 10, 20];
export const ETAPAS_FLOR = 4; // brote, capullo, abriendo, casi en flor → sakura (meta cumplida)
/** Etapa de la sakura del día (0…4) según las palabras revisadas hoy y la meta. */
export function etapaFlor(revisadas, meta) {
  return Math.min(ETAPAS_FLOR, Math.floor((Math.max(0, revisadas) / Math.max(1, meta)) * ETAPAS_FLOR));
}
export const COFRE_CADA = 7;
export const monedasCofre = (n) => 50 + 25 * (n - 1); // 1.er cofre 50, 2.º 75, 3.º 100…
/** Cada 7 días de racha se abre un cofre (una sola vez por hito). Devuelve { dias, monedas } o null. */
export function abrirCofre(estado) {
  const dias = estado.racha.actual;
  if (!dias || dias % COFRE_CADA !== 0 || estado.cofre === dias) return null;
  const monedas = monedasCofre(dias / COFRE_CADA);
  estado.cofre = dias;
  estado.tokens += monedas;
  return { dias, monedas };
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
  usarProtectores(estado, ahora);
  marcarDiaEstudiado(estado.racha, ahora);
  return TOKENS_POR_TARJETA;
}

// ---------- Premios incrementales (estilo juego incremental) ----------
// Cada PREMIO_CADA palabras revisadas en el día se cobra un premio; cada premio vale 1,5× el anterior:
// 10, 15, 23, 34, 51, 76… monedas. El contador vuelve a cero al día siguiente.
export const PREMIO_CADA = 10;
export const premioDeNivel = (k) => Math.round(10 * 1.5 ** (k - 1));

/** Suma una palabra revisada hoy. Si se completa un múltiplo de 10, cobra el premio y lo devuelve. */
export function contarRevision(estado, ahora = Date.now()) {
  const hoy = diaLocal(ahora);
  if (estado.diario.dia !== hoy) estado.diario = { dia: hoy, revisadas: 0, premios: 0 };
  const d = estado.diario;
  d.revisadas += 1;
  if (d.revisadas % PREMIO_CADA !== 0) return null;
  const nivel = d.revisadas / PREMIO_CADA;
  const monedas = premioDeNivel(nivel);
  d.premios = nivel;
  estado.tokens += monedas;
  return { nivel, monedas, revisadas: d.revisadas, siguiente: premioDeNivel(nivel + 1) };
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
/**
 * Al entrar con una cuenta: qué hacer con el avance de la nube (`remota`) y el de este navegador.
 * 'subir' = la nube toma el del navegador · 'bajar' = el navegador toma el de la nube
 * 'preguntar' = los dos tienen avance distinto → pantalla «¿Qué avance conservo?»
 */
export function decidirAlEntrar(remota, local) {
  if (!remota) return 'subir';
  const r = normalizar(remota);
  const vacio = (e) => e.ejercicios === 0 && e.tokens === 0;
  if (hayConflicto(r, local)) return 'preguntar';
  if (vacio(local)) return vacio(r) ? 'subir' : 'bajar';
  if (vacio(r)) return 'subir';
  return (r.actualizado || 0) > (local.actualizado || 0) ? 'bajar' : 'subir';
}
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

// ---------- Historia del día de Kitty ----------
/** Índice estable para un día (YYYY-MM-DD): la misma frase todo el día, otra al siguiente. */
export function indiceDelDia(dia, n) {
  if (!n) return -1;
  let h = 2166136261;
  for (const c of dia) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % n;
}
export const historiaVista = (estado, ahora = Date.now()) => estado.historia?.dia === diaLocal(ahora);
export function marcarHistoriaVista(estado, ahora = Date.now()) {
  estado.historia = { dia: diaLocal(ahora) };
}

/** Premio por dominar una palabra (pantalla «¡Dominada!»). */
export const BONO_DOMINADA = 5;
