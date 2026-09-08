# Invitación digital - Lizbeth 41

Primera versión funcional de la invitación web para el cumpleaños 41 de Lizbeth.

## Cómo abrir localmente

Abre `index.html` directamente en el navegador.

También puedes servir la carpeta con cualquier servidor estático si prefieres probarla como sitio web:

```bash
npx serve .
```

No requiere instalación de dependencias para funcionar.

## Estructura

```text
index.html
css/styles.css
js/app.js
js/countdown.js
js/rsvp.js
data/config.js
assets/images/
assets/icons/
assets/reference/
```

## Configuración editable

Los datos principales están centralizados en `data/config.js`:

- Nombre y edad
- Fecha y hora
- Lugar y dirección
- Número de WhatsApp
- Enlaces base de mapas
- Rutas de imágenes
- Textos principales

Para activar el botón de WhatsApp, agrega el número en formato internacional, sin signos ni espacios:

```js
WHATSAPP_NUMBER: "525512345678"
```

Mientras el número esté vacío, el botón muestra un aviso controlado y no inventa contacto.

## Imágenes provisionales

Las imágenes actuales son placeholders SVG locales, no base64. Están en `assets/images/` y se pueden reemplazar después por fotografías reales o archivos optimizados.

Archivos sugeridos para reemplazo:

- `hero-hacienda.svg`
- `lizbeth-placeholder.svg`
- `oaxaca-textiles.svg`
- `ceramica-oaxaquena.svg`
- `gastronomia-oaxaquena.svg`
- `velas-hacienda.svg`
- `hacienda-location.svg`
- `dress-code-placeholder.svg`

Si se cambian nombres o extensiones, actualiza las rutas en `data/config.js` y en `index.html`.

## Funcionalidad incluida

- Invitación web responsive y mobile-first.
- Navegación suave desde portada.
- Animaciones de aparición al hacer scroll.
- Respeto a `prefers-reduced-motion`.
- Contador regresivo hacia el 17 de julio de 2027 a las 7:00 PM.
- Modal de inspiración para dress code.
- RSVP progresivo en modo demostración.
- Selección de asistencia para persona, pareja, familia o grupo familiar.
- Generación dinámica de nombres de asistentes.
- Pantalla de revisión.
- Folio local de demostración y pase visual con placeholder de QR.
- Enlaces a Google Maps y Waze construidos con la dirección, sin coordenadas inventadas.
- Placeholder controlado para WhatsApp.

## Modo demostración

Esta versión no guarda información en un backend real. El RSVP existe solo en el navegador durante la sesión.

Pendiente para fases posteriores:

- Guardar RSVP en backend o servicio externo.
- Generar tokens persistentes.
- Generar QR real con únicamente identificador/token.
- Consultar RSVP.
- Registrar llegada/check-in.
- Asignar mesas.

## Publicación en GitHub Pages

El proyecto es estático y compatible con GitHub Pages. No usa build step, frameworks ni dependencias pesadas.

Para publicar después:

1. Sube los archivos al repositorio.
2. Configura GitHub Pages desde la rama deseada.
3. Reemplaza imágenes provisionales antes de compartir públicamente.
4. Configura `WHATSAPP_NUMBER` si ya existe contacto confirmado.
