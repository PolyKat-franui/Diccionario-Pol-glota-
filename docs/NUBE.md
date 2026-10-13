# Cuenta de Google y guardado en la nube (Firebase)

El código ya está listo (`app/js/nube.js`). Solo falta crear el proyecto de Firebase
y pegar su configuración en `app/js/nube-config.js`. Mientras no esté, la app guarda
el avance solo en el navegador (como hasta ahora).

## Cómo funciona

- «Entrar con Google» (portada o Ajustes) abre la ventana de Google.
- El avance se guarda en Firestore, en el documento `progreso/{uid}` de cada persona.
- Cada cambio se sube unos segundos después, y también al cerrar o esconder la app.
- Al abrir la app en otro celular, se trae el avance más nuevo.
- Si la nube y el navegador tienen avances distintos, sale «¿Qué avance conservo?».
- Gratis: el plan Spark de Firebase alcanza de sobra al comienzo.

## Pasos (una sola vez, ~10 minutos)

1. Entra a https://console.firebase.google.com con tu cuenta de Google → **Agregar proyecto**
   (nombre: `polyglok`; Google Analytics no es necesario).
2. **Authentication** → Comenzar → pestaña *Sign-in method* → **Google** → Habilitar → Guardar.
3. **Authentication → Configuración → Dominios autorizados** → Agregar dominio:
   `franciscasanhueza.github.io`
4. **Firestore Database** → Crear base de datos → modo **producción** → región `southamerica-east1`
   (o la más cercana).
5. Firestore → pestaña **Reglas** → pega esto y **Publica**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /progreso/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

6. ⚙️ **Configuración del proyecto** → *Tus apps* → ícono web `</>` → nombre `polyglok` → Registrar.
   Copia el objeto `firebaseConfig` que aparece.
7. Pégalo en `app/js/nube-config.js` (o mándamelo y lo pego yo):

   ```js
   export const FIREBASE = { apiKey: '…', authDomain: '…', projectId: '…', appId: '…' };
   ```

Esos datos **no son secretos** (toda app web los muestra). La seguridad la dan las reglas
del paso 5: cada persona solo puede leer y escribir su propio avance.
