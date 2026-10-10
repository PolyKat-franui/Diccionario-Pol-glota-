# Recomendaciones de la IA — Franui

Fecha: 2026-10-09. Respuestas cortas a cada punto de "Recomendaciones de la IA".
Lo marcado **(verificar)** no lo pude comprobar desde aquí: revísalo antes de decidir.

---

## 1. Guardar el progreso

**Hoy (hecho):** el progreso se guarda solo en el navegador (`localStorage`), cada vez
que respondes una tarjeta. Probado: recargar la página no lo borra.
Límite: si cambias de celular o borras los datos del navegador, se pierde.

**Siguiente paso recomendado: Supabase** (gratis al inicio).
- Cuentas con usuario + contraseña y con Google (ya trae ambos).
- Base de datos Postgres: una fila de progreso por persona.
- "Row Level Security": cada persona solo ve su progreso.
- Al entrar, si la cuenta y el navegador tienen avances distintos → pantalla
  "¿Qué avance conservo?" (ya está hecha, hoy en modo demo).
- Sirve también para el ranking y el buzón de sugerencias.

Alternativa: Firebase (Google). Funciona igual de bien; Supabase es más simple de
mover si un día cambias de proveedor.

## 2. Puntos de guardado (no perder trabajo)

- **Un commit por paso que funciona** (ya lo hago así). Para volver atrás:
  `git revert <commit>` deshace un cambio sin borrar historia.
- **Etiquetas de versión:** `git tag v0.1.0` en cada versión que funcione.
  Para ver una versión vieja: `git checkout v0.1.0`.
- **Una rama por bloque de trabajo** y un Pull Request para unirla a `main`.
  Si un bloque no te gusta, simplemente no se une.
- GitHub guarda todo en la nube: aunque se pierda el computador, nada se pierde.

## 3. Traducir y confirmar que la traducción es real

Estados de cada traducción (columna `estado`): `borrador` → `revisada`.
Hoy (2026-10-10): las 5.000 filas traducidas por IA a 5 idiomas (es, pt, fr, it, de), todas `borrador`.
Falta la revisión con una fuente confiable.

Método recomendado, de más barato a más seguro:
1. **Wiktionary** (vía kaikki.org, que lo entrega como datos ordenados): traducciones
   e IPA de palabras sueltas. Gratis.
2. **Segunda fuente** para comparar: DeepL API Free (500.000 caracteres al mes
   **(verificar el límite actual)**; el banco completo en 5 idiomas usa unos 400.000).
   Para frases: Tatoeba.
3. Si las dos fuentes **coinciden** → alta confianza (se revisa rápido).
   Si **no coinciden** → va primero a revisión humana.
4. **Revisión humana**: una persona nativa marca `revisada`. Más adelante, una
   pantalla de revisión dentro de la app (solo para ti o revisores).

Ojo: el sandbox donde trabajo hoy bloquea Wiktionary y kaikki.org. Para automatizarlo
aquí hay que permitir esos dominios en la configuración de red del entorno.

## 4. Almacenar el banco y automatizar la traducción

Ya está armado así:
- **Fuente de verdad = archivos TSV en git** (`banco/`). Se pueden abrir en Excel o
  Google Sheets y git muestra cada cambio, fila por fila.
- **Un archivo por idioma**, unido por `id` al concepto en inglés. Agregar un idioma
  = agregar un archivo, sin tocar los demás.
- `npm run build` convierte los TSV en JSON livianos (~130 KB por idioma). La app
  descarga solo los dos idiomas que estás usando.
- `npm test` valida que no falten ids, que no haya repetidos y que el banco inglés
  siga cerrado en 5.000 filas.

Automatización recomendada (siguiente bloque):
- Un script que pida a Wiktionary + DeepL las filas vacías y las escriba como
  `borrador`, con la fuente en la columna `fuente`.
- **GitHub Actions**: cada vez que cambie un TSV, corre build + pruebas sola.
- **n8n** (opcional): flujo visual que, por ejemplo, manda las sugerencias del buzón a tu correo o a Notion.
- Cuando haya miles de revisiones de la comunidad: pasar el banco a la base de datos (Supabase).

## 5. Plan por bloques

| Bloque | Qué incluye | Estado |
|---|---|---|
| 1 | App base: tarjetas deslizables, SRS, Kumon, tokens, racha, favoritos, Kitty diccionario, ajustes, 6 idiomas de interfaz, banco importado | **Hecho** |
| 2 | Página web promocional (misma estética, sección de la creadora, novedades) + nueva paleta y tipografía | **Hecho** |
| 2b | Kitty en 14 expresiones (cara feliz = logo), sakuras para la racha, moneda, estrella, cerezas, mensaje | **Hecho** |
| 3 | Traducción completa del banco (borrador IA hecho) + revisión con fuente confiable + pantalla de revisión | **En curso** |
| 4 | Cuentas en la nube (Supabase): Google, sincronizar avance, ranking real, buzón de sugerencias | |
| 5 | Kitty con IA real (servidor propio que guarda la clave) | |
| 6 | App instalable (PWA) y sin internet; publicar en un dominio | |
| 7 | Mejor audio (Wiktionary / texto a voz) y reconocimiento de voz | |
| 8 | Tienda de cosméticos, juegos, apps en tiendas (Capacitor) | |

Regla: no empezar un bloque hasta probar el anterior con uso real.

## 6. Apps, plugins y skills

| Nombre | ¿Sirve? | Comentario |
|---|---|---|
| Skill `franui` | Sí, ya creada | `.claude/skills/franui/SKILL.md`: tu especificación. Claude la lee antes de trabajar. |
| Playwright | Sí, ya se usa | Prueba la app en un navegador real (celular, tablet, computador). |
| Frontend Design | Sí | Skill de Anthropic para interfaces más cuidadas. |
| Claude Mem / MemPlace | Opcional | Memoria entre sesiones. Este repo ya guarda el contexto en la skill y `CLAUDE.md`. |
| Omni Route, Headrom, Task Observer, Claude Code Setup | **(verificar)** | No pude confirmar qué hacen ni quién los publica. Un plugin ejecuta código en tu equipo: revisa autor, repositorio y permisos antes de instalar. |
| Supabase | Sí | Cuentas, base de datos, ranking. |
| DeepL API | Sí | Segunda fuente de traducción. |
| Canva / Figma | Sí | Logos, redes sociales, maquetas. (Canva ya está conectado aquí.) |
| Notion | Sí | Bitácora de decisiones y tareas. (Ya está conectado aquí.) |

## 7. Git

Ya funciona así: un commit con mensaje claro después de cada paso que funciona,
en la rama de trabajo. Las pruebas (`npm test`) se corren antes de cada commit.

## 8. Apartado legal (página web y app)

No soy abogado: usa esto como lista de chequeo y valídalo con un abogado antes de lanzar.

- **Política de privacidad:** qué datos guardas (usuario, correo, progreso), para qué,
  dónde (p. ej. Supabase), cuánto tiempo, y cómo pedir borrarlos.
  En Chile: Ley 19.628 y la nueva Ley 21.719 de protección de datos personales,
  que entra en vigencia en diciembre de 2026 **(verificar fecha)**. Si hay usuarios en
  Europa: RGPD.
- **Términos y condiciones:** reglas de uso, cuentas, contenido de la comunidad,
  límites de responsabilidad (las traducciones pueden tener errores).
- **Política de cookies:** si solo usas almacenamiento técnico (como hoy), basta
  informarlo. Si agregas analítica o publicidad, necesitas aviso y consentimiento.
- **Devoluciones:** solo cuando vendas cosméticos o suscripciones. En Chile aplica la
  Ley del Consumidor (19.496) y el derecho a retracto en compras en línea **(verificar)**.
- **reCAPTCHA de Google:** si lo usas y ocultas la insignia, debes mostrar el texto
  "Este sitio está protegido por reCAPTCHA y se aplican la Política de Privacidad y
  los Términos de Servicio de Google".
- **Menores de edad:** si la app es para niños, hay reglas adicionales de consentimiento.
- **Licencias del banco (importante para una startup):**
  - Wiktionary es CC BY-SA: hay que dar crédito y lo derivado se comparte con la misma licencia.
  - Tatoeba es CC BY: hay que dar crédito.
  - Varias palabras vienen de listas de Cambridge (YLE, PET): revisa sus términos antes
    de un uso comercial **(verificar)**.
- **Fotos:** usa fotos tuyas o con licencia; si aparecen otras personas, pide permiso por escrito.
- **Frases que NO se deben usar** (publicidad engañosa):
  - Cifras inventadas: "+1 millón de usuarios", "4,9 estrellas".
  - Testimonios inventados o con fotos de stock como si fueran personas reales.
  - Promesas imposibles: "habla fluido en 7 días", "nunca olvidarás".
  - "Certificado oficial" o "nivel garantizado".
  - "Traducciones 100 % exactas" (hoy son borradores).
  - Logos de medios o empresas que no te han mencionado.

## 9. Dashboards desde Excel

- **Rápido y gratis:** sube el Excel a Google Sheets → conéctalo a **Looker Studio**.
  El dashboard se actualiza solo cuando cambias la planilla.
- **Más potente:** Power BI (mejor si ya usas Microsoft).
- **A medida:** te puedo armar un dashboard interactivo (página web) que lee tu
  Google Sheet. Envíame el Excel o dime qué columnas tiene.

## 10. Diseño de mejor calidad

Aplicado en esta versión: mucho espacio, una acción principal por pantalla, serif de
lujo + sans legible, movimientos suaves con curva de aceleración, respeto de
"reducir movimiento" del sistema, contraste ≥ 4,5:1 comprobado con una prueba automática.

- **Emil Kowalski:** sus principios (animaciones cortas, con resorte, que se sienten
  físicas) son buenos para el deslizar de tarjetas. Sus librerías (Sonner, Vaul) son
  de React: sirven si la app pasa a React.
- **"Impeccable", "Taste skill":** **(verificar)** no pude confirmar cuáles son exactamente.

## 11. Estilos de animación

| Estilo | Recomendación | Dónde |
|---|---|---|
| Pixel art | **Sí** (identidad) | Kitty, racha, cosméticos, logros |
| Kinetic type | **Sí** | Web: "hola · hello · bonjour…" que cambia en grande |
| Split flap | **Sí** | Web: contador de palabras/idiomas estilo aeropuerto (viaje + idiomas) |
| Particles | Sí, con medida | Celebraciones (ya: lluvia de sakuras al terminar sesión) |
| Glassmorphism | Sutil | Barra superior (ya aplicada) |
| Liquid morph | Opcional | Botón de Kitty, transición entre pantallas |
| Art deco | Opcional | Detalles dorados en la web (encaja con "lujo") |
| Clay 3D, Isometric, Wireframe 3D, Blueprint | No por ahora | Pesados y lejos de la estética limpia |
| Neo brutalism | No | Contradice "lujo y limpio" |

## 12. Páginas para efectos

- **Anime.js:** la mejor opción hoy (funciona sin React, liviana).
- **reactbits.dev, Skiper UI:** componentes muy lindos, pero de React.
- **v0, Bolt:** generan prototipos rápidos; útiles para probar ideas, no para el código final.
- **n8n:** automatizaciones (traducción, sugerencias → correo/Notion).
- **manus.im:** agente general; no aporta mucho a este proyecto frente a Claude Code.

## 13. Ruta de la app (recomendaciones)

1. **Cuenta antes de estudiar** (decidido 2026-10-09): se pide solo la primera vez y la
   sesión queda guardada. Mantener ese paso lo más corto posible: "Continuar sin cuenta" visible.
2. **Botón "Continuar"** en la portada: un toque y vuelves a tu último tema.
3. **Meta diaria Kaizen:** elegir 1, 3 o 5 minutos al día; la sakura florece al cumplirla.
4. **Mini prueba de nivel** (5 tarjetas) para saltar lo que ya sabes.
5. **"Varios idiomas a la vez":** modo donde la misma tarjeta muestra la palabra en dos
   idiomas que estás aprendiendo (p. ej. francés + italiano). Es el diferenciador de Franui.
6. **Kitty con IA:** necesita un servidor propio que guarde la clave de la API.
   Ojo: no existe una forma oficial de "usar la cuenta de Google" de una persona para
   hablar con Claude, ChatGPT o Gemini desde otra app; cada proveedor cobra por API.
   Propuesta: un modelo pequeño y barato, con límite de mensajes diarios por persona.
