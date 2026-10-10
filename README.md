# Protege DNI

Añade una marca de agua a la copia de tu DNI, oculta los datos que el trámite no necesita y expórtala aplanada (PDF o JPG) antes de compartirla.

**Tu documento no sale de tu dispositivo:** todo se procesa en el navegador. No hay servidor que reciba nada.

## Cómo comprobar la privacidad

- La web es un conjunto de ficheros estáticos; no existe ningún sitio al que se suba el documento.
- Tras la primera visita funciona en modo avión (PWA).
- La página declara una política de seguridad (CSP) que bloquea las conexiones a otros dominios.
- Sin cookies ni analíticas, y nada de tu documento se guarda: al cerrar la pestaña, todo desaparece. El navegador solo guarda los ficheros de la propia app (en la caché del service worker), para que funcione sin conexión.
- Las pruebas automáticas (`tests/e2e/privacidad.spec.ts`) comprueban que ninguna petición sale del propio origen y que la caché solo contiene ficheros de la app.

## Desarrollo

Requisitos: Node 24.

```bash
npm install
npx playwright install chromium webkit
npm run dev          # servidor de desarrollo
npm run build        # build de producción en dist/
npm run lint
npm run typecheck
npm test             # pruebas unitarias (Vitest en Chromium)
npm run e2e          # pruebas de extremo a extremo (Playwright, contra el build)
```

En Linux, el proyecto `iphone` (WebKit) necesita `sudo apt-get install libavif16 libmanette-0.2-0`. Sin ellas: `npx playwright test --project=escritorio --project=android`.

Los DNI de prueba de `tests/fixtures/` son **ficticios** y se regeneran con `node tests/fixtures/generar.mjs` (requiere `qpdf` y `poppler-utils`).

## Limitaciones conocidas

- Dibujar recuadros de ocultación requiere ratón o pantalla táctil (no hay alternativa con teclado en la v1).
- La marca de agua disuade, pero no es infalible.

## Comprobación manual antes de publicar

En un Android con Chrome y en un iPhone con Safari:

- [ ] «Hacer foto» abre la cámara y la foto aparece en la vista previa.
- [ ] «Compartir» abre la hoja de compartir del sistema con el fichero.
- [ ] La app se puede instalar en la pantalla de inicio.
- [ ] Con el modo avión activado, la app instalada carga, procesa y exporta.

## Licencia

MIT
