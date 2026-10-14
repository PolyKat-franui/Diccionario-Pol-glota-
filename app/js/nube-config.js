// Configuración de la nube (Firebase: cuenta de Google + guardado del avance).
// Si fuera null, la app funciona igual y guarda el avance solo en este navegador.
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
// Proyecto «franui-polykat» (creado por Francisca el 2026-10-13).
export const FIREBASE = {
  apiKey: 'AIzaSyAewfjpZOy3pJtHcMpcV4Sbc9QekMNV2n0',
  authDomain: 'franui-polykat.firebaseapp.com',
  projectId: 'franui-polykat',
  storageBucket: 'franui-polykat.firebasestorage.app',
  messagingSenderId: '642024887872',
  appId: '1:642024887872:web:2ef4bd540d50aa7e5e31a5',
};

// Cuenta de la creadora: solo ella ve el buzón de sugerencias (también en firestore.rules).
export const CREADORA = 'fransanhueza206@gmail.com';
