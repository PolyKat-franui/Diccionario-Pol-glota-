# Cuenta de Google y guardado en la nube (Firebase)

**Activa desde el 2026-10-13:** proyecto `franui-polykat`, configuración en `app/js/nube-config.js`.
Verificado: dominio `polykat-franui.github.io` autorizado, Google habilitado y reglas de Firestore
que niegan leer sin sesión. Falta probar el login real en un celular.

## Cómo funciona

- «Entrar con Google» (portada o Ajustes) abre la ventana de Google.
- El avance se guarda en Firestore, en el documento `progreso/{uid}` de cada persona.
- Cada cambio se sube unos segundos después, y también al cerrar o esconder la app.
- Al abrir la app en otro celular, se trae el avance más nuevo.
- Si la nube y el navegador tienen avances distintos, sale «¿Qué avance conservo?».
- Ranking: al guardar se publica `ranking/{uid}` = { nombre, racha, dia, palabras, nivel, actualizado }.
  Se puede apagar en Ajustes («Aparecer en el ranking») y entonces la fila se borra.
- Gratis: el plan Spark de Firebase alcanza de sobra al comienzo.

## Pasos (una sola vez, ~10 minutos)

1. Entra a https://console.firebase.google.com con tu cuenta de Google → **Agregar proyecto**
   (nombre: `franui-polykat`; Google Analytics no es necesario).
2. **Authentication** → Comenzar → pestaña *Sign-in method* → **Google** → Habilitar → Guardar.
3. **Authentication → Configuración → Dominios autorizados** → Agregar dominio:
   `polykat-franui.github.io`
4. **Firestore Database** → Crear base de datos → modo **producción** → región `southamerica-east1`
   (o la más cercana).
5. Firestore → pestaña **Reglas** → borra todo, pega el contenido de **`firestore.rules`** (en la raíz del
   repositorio) y **Publica**. Esas reglas protegen el avance de cada persona (`progreso/{uid}`) y el
   **ranking** (`ranking/{uid}`: lo ve quien inició sesión; cada uno escribe solo su fila, con nombre y números).
   Si cambian las reglas en el repositorio, hay que volver a pegarlas aquí.

6. ⚙️ **Configuración del proyecto** → *Tus apps* → ícono web `</>` → nombre `franui-polykat` → Registrar.
   Copia el objeto `firebaseConfig` que aparece.
7. Pégalo en `app/js/nube-config.js` (o mándamelo y lo pego yo):

   ```js
   export const FIREBASE = { apiKey: '…', authDomain: '…', projectId: '…', appId: '…' };
   ```

Esos datos **no son secretos** (toda app web los muestra). La seguridad la dan las reglas
del paso 5: cada persona solo puede leer y escribir su propio avance.
