// Cambio de dirección: la página antigua manda el avance en el enlace (#traspaso=…) y aquí se guarda.
// Se importa antes que todo en main.js, para que el avance quede listo antes de cargar el estado.
// Solo se usa si en esta dirección todavía no hay avance (nunca pisa uno existente).
const CLAVE = 'franui:v1';
export let traspasado = false;
try {
  const m = location.hash.match(/^#traspaso=([A-Za-z0-9_-]+)$/);
  if (m) {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    JSON.parse(json); // que sea válido
    if (!localStorage.getItem(CLAVE)) { localStorage.setItem(CLAVE, json); traspasado = true; }
    history.replaceState(null, '', location.pathname + location.search);
  }
} catch { /* enlace dañado: se sigue sin traspaso */ }
