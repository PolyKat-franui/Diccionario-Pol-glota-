// Configuración de la nube (Firebase: cuenta de Google + guardado del avance).
// Mientras sea null, la app funciona igual y guarda el avance solo en este navegador.
//
// Para activarla (ver docs/NUBE.md): crea el proyecto en https://console.firebase.google.com,
// registra una app web y pega aquí el objeto `firebaseConfig` que te muestra. Estos datos
// no son secretos (cualquier app web los muestra); la seguridad la dan las reglas de Firestore.
//
// export const FIREBASE = {
//   apiKey: '…',
//   authDomain: 'tu-proyecto.firebaseapp.com',
//   projectId: 'tu-proyecto',
//   appId: '…',
// };
export const FIREBASE = null;
