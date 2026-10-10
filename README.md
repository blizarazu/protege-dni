# Protege DNI

Añade una marca de agua a la copia de tu DNI, oculta los datos que el trámite no necesita y expórtala aplanada (PDF o JPG) antes de compartirla.

**Tu documento no sale de tu dispositivo:** todo se procesa en el navegador. No hay servidor que reciba nada.

## Cómo comprobar la privacidad

- La web es un conjunto de ficheros estáticos; no existe ningún sitio al que se suba el documento.
- Tras la primera visita funciona en modo avión (PWA).
- La página declara una política de seguridad (CSP) que impide que cargue o envíe nada a otros dominios.
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
- En JPG se genera un fichero por página, y se descarga con un botón por página («Descargar página 1», «Descargar página 2»…), porque Chrome bloquea las descargas sucesivas lanzadas por un solo clic. El PDF reúne todas las páginas en un solo fichero.
- La marca de agua disuade, pero no es infalible.

## Comprobación manual antes de publicar

En un Android con Chrome y en un iPhone con Safari:

- [ ] «Hacer foto» abre la cámara y la foto aparece en la vista previa.
- [ ] Con el paso 2 abierto, arrastrar el dedo sobre la vista previa dibuja un recuadro (la página no se desplaza mientras dibujas) y tapa el dato.
- [ ] «Compartir» abre la hoja de compartir del sistema con el fichero.
- [ ] Con dos páginas en JPG, «Descargar página 1» y «Descargar página 2» guardan cada una su fichero, sin que el navegador pida permiso.
- [ ] Cancelar la hoja de compartir no muestra ningún error.
- [ ] El selector «Caso» funciona en iPhone.
- [ ] Una foto vertical y una horizontal salen con la orientación correcta.
- [ ] Tras «Hacer foto», comprobar si queda una copia en la galería (depende de la app de cámara).
- [ ] La app se puede instalar en la pantalla de inicio.
- [ ] Con el modo avión activado, la app instalada carga, procesa y exporta.
- [ ] En iPhone, con la app instalada y el modo avión activado, carga y exporta (el service worker de WebKit solo se prueba a mano).

Nota: en el móvil hay que probar sobre HTTPS (GitHub Pages) o sobre `localhost` con la redirección de puertos de `chrome://inspect`. Sobre HTTP en la red local fallan `crypto.randomUUID`, el service worker y Web Share.

## Licencia

MIT
