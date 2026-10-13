// Cuenta de Google y guardado del avance en la nube (Firebase Auth + Firestore).
// El SDK se descarga solo cuando hace falta, así la app no pesa más para quien no usa cuenta.
// Cada persona tiene un documento progreso/{uid} que solo ella puede leer y escribir.
import { FIREBASE } from './nube-config.js';

const VERSION = '10.12.2';
const CDN = `https://www.gstatic.com/firebasejs/${VERSION}`;
let listo = null;

export const nubeLista = () => !!FIREBASE;

function cargarSdk() {
  if (!FIREBASE) return Promise.reject(new Error('sin-config'));
  listo ??= Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
  ]).then(([app, auth, fs]) => {
    const a = app.initializeApp(FIREBASE);
    return { auth, fs, au: auth.getAuth(a), db: fs.getFirestore(a) };
  }).catch((e) => { listo = null; throw e; });
  return listo;
}

const cuentaDe = (u) => u && { tipo: 'google', uid: u.uid, email: u.email ?? '', nombre: u.displayName ?? '' };

/** Abre la ventana de Google. Devuelve { tipo, uid, email, nombre }. */
export async function entrarConGoogle() {
  const { auth, au } = await cargarSdk();
  const prov = new auth.GoogleAuthProvider();
  prov.setCustomParameters({ prompt: 'select_account' });
  const r = await auth.signInWithPopup(au, prov);
  return cuentaDe(r.user);
}

/** Espera a saber si la sesión de Google sigue abierta (al recargar la página). */
export async function sesionActual() {
  const { auth, au } = await cargarSdk();
  await au.authStateReady();
  return cuentaDe(au.currentUser);
}

export async function salir() {
  const { auth, au } = await cargarSdk();
  await auth.signOut(au);
}

/** Avance guardado en la nube (o null si es la primera vez). */
export async function leerAvance(uid) {
  const { fs, db } = await cargarSdk();
  const snap = await fs.getDoc(fs.doc(db, 'progreso', uid));
  if (!snap.exists()) return null;
  try { return JSON.parse(snap.data().datos); } catch { return null; }
}

/** Sube el avance completo (un solo documento, como texto JSON). */
export async function guardarAvance(uid, estado) {
  const { fs, db } = await cargarSdk();
  await fs.setDoc(fs.doc(db, 'progreso', uid), {
    datos: JSON.stringify(estado),
    actualizado: estado.actualizado || Date.now(),
    version: estado.version || 1,
  });
}
