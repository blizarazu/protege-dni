# Plan: Protege DNI v1

> **Estado:** completado
> **Para trabajadores agénticos:** SUB-SKILL OBLIGATORIA: ejecutar con `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans`, tarea a tarea. Ritmo TDD (`→ FAIL` antes de `→ PASS`). Los pasos usan casillas `- [ ]` para el seguimiento.

**Objetivo:** construir Protege DNI v1, una PWA estática en React que añade una marca de agua a la copia de un DNI, permite ocultar datos y la exporta aplanada (PDF o JPG), con todo el procesamiento en el navegador.

**Arquitectura:** web estática (Vite + React 19 + TypeScript). La lógica vive en `src/core/` (funciones sin React, probadas en un Chromium real con Vitest en modo navegador); la interfaz en `src/ui/`; los textos largos en `src/contenido/`. pdf.js rasteriza los PDF, Canvas 2D aplica recuadros, marca y grises, y pdf-lib genera el PDF de salida. Una CSP en `<meta>` y la PWA (offline) garantizan que nada sale del dispositivo.

**Stack:** React 19.3, TypeScript 7.0 (compilador nativo), Vite 8.3, pdfjs-dist 6.4, pdf-lib 1.17, vite-plugin-pwa 2.0, Vitest 5 (modo navegador con Playwright), Playwright 1.64, oxlint.

**Especificación:** `docs/superpowers/specs/2026-10-10-protege-dni-design.md`. El ejecutor debe leerla entera antes de empezar; este plan la concreta y, donde se aparta de ella, lo dice en «Decisiones tomadas al planificar».

---

## Contexto

Protege DNI nace de un script Python (`docs/referencia/marca_agua_dni.py`) que añade una marca de agua «quemada» a la copia de un DNI. El autor quiere convertirlo en una web gratuita, de código abierto, usable en escritorio y móvil, con un requisito indispensable: **el documento nunca sale del dispositivo**. La especificación recoge el diseño acordado; este resumen existe para que el ejecutor no tenga que reconstruir la conversación.

### Decisiones acordadas con el autor (no reabrir)

- Nombre: **Protege DNI**. Repositorio en `~/Development/Personal/protege-dni`, rama principal `main`, todavía **sin remoto**.
- Tecnología: PWA web con **React** (el autor conoce Angular, pero prefiere React para un proyecto pequeño). Nada de Flutter, React Native ni apps nativas en la v1 (Capacitor queda para una posible v3).
- Alojamiento previsto: **GitHub Pages**, con despliegue por GitHub Actions.
- Una sola pantalla con vista previa en vivo y 5 pasos plegables (Documento, Ocultar datos, Texto de la marca, Opciones de seguridad, Exportar) y dos páginas informativas (Buenas prácticas y ¿Cómo puedo comprobarlo?).
- Texto de la marca **guiado** (caso + destinatario + finalidad + referencia + fecha) o **libre**.
- Cada opción explica qué aporta a la seguridad («ⓘ ¿Por qué importa?») y muestra un aviso ⚠️ cuando reduce la seguridad (tabla de la sección 4 de la especificación).
- Ocultar datos con recuadros negros dibujados a mano, con una guía de qué se puede ocultar y qué no.
- Valores por defecto seguros: opacidad 40 %, densidad normal, escala de grises, PDF.
- Fuentes de las buenas prácticas: AEPD, INCIBE, OCU, Genbeta (consejos de la Policía Nacional), Maldita y Agencia Tributaria. **Antes de publicar** hay que verificar cada enlace y contrastar la guía de ocultación con la descripción oficial del DNI (tarea 17).
- Licencia MIT.

### Decisiones tomadas al planificar (se apartan o concretan la especificación)

Todas se verificaron con un prototipo desechable el 2026-10-10 con las versiones fijadas abajo.

1. **TypeScript 7.0.2** (compilador nativo), no la 6 que trae la plantilla `react-ts` de Vite 8. Verificado con la configuración de este plan: `tsc -b` funciona igual, detecta los errores (código de salida 1) y es unas 4 veces más rápido (0,5 s frente a 1,9 s en el prototipo). Ninguna herramienta del proyecto usa la API de TypeScript en JavaScript (Vite, Vitest y Playwright transpilan por su cuenta; oxlint es independiente), así que no hay incompatibilidades. Si en el futuro se añade una herramienta que dependa de esa API (por ejemplo, typescript-eslint), habrá que comprobar que admite la 7.
2. **pdf.js 6** ya no tiene `isEvalSupported`; en su lugar se configuran `wasmUrl` e `iccUrl` además de `standardFontDataUrl` y `cMapUrl`. `page.render()` exige el parámetro `canvas`.
3. `cargarArchivo(fichero, pedirContrasena, maxPaginas)` devuelve `{ paginas, omitidas }` para no rasterizar páginas que superen el límite de 10.
4. **Exportación en dos pasos:** «Generar copia protegida» y, después, «Compartir» / «Descargar». Motivo: Safari en iOS rechaza `navigator.share()` si se llama tras una espera asíncrona larga; así el clic de compartir llama a `share()` de inmediato.
5. La opacidad se guarda como **porcentaje entero** (10–90).
6. El aviso `sin-fecha` salta también si «Incluir fecha» está activada pero la fecha está vacía.
7. `base: './'` en Vite: rutas relativas, válidas en la raíz y en `/<repo>/` de GitHub Pages sin configurar nada.
8. Dibujar recuadros solo está activo **mientras el paso 2 está abierto**, para no crear recuadros al hacer scroll en el móvil.
9. Un único CSS global (`src/estilos.css`) en lugar de CSS Modules; las etiquetas cortas de la interfaz van en los componentes y los textos largos en `src/contenido/`.
10. Las imágenes (`ImageBitmap`) de páginas eliminadas se liberan en un efecto tras el render (`useLiberarImagenes`), no en el reducer (que debe ser puro).
11. Con pdf-lib, el `Blob` del PDF se crea con `new Blob([new Uint8Array(bytes)])`: `new Blob([bytes])` no compila (TypeScript 7 exige un `Uint8Array<ArrayBuffer>`).
12. Los recuadros se pintan con **redondeo hacia fuera** a píxeles enteros, para que no quede ningún píxel parcialmente visible.
13. Antes de pintar la página se rellena de blanco: las zonas transparentes de un PNG saldrían negras en el JPEG.

### Piezas existentes que hay que reutilizar (no reinventar)

- `docs/referencia/marca_agua_dni.py`: algoritmo de referencia de la marca (tamaño `min(ancho, alto)/45` con mínimo de 7 pt, filas cada 2,6 × tamaño, filas impares desplazadas media línea, giro de 30°, color gris oscuro, JPEG calidad 85). `src/core/marca.ts` lo porta tal cual.
- Herramientas instaladas en la máquina del autor: Node 24, npm 11, `gh` autenticado como `blizarazu`, `qpdf`, `pdftoppm` (poppler) y ImageMagick (`magick`). Los navegadores de Playwright se descargan en la tarea 1.

## Objetivo (qué ve el usuario al terminar)

Al abrir la web, el usuario ve el distintivo «🔒 Tu documento no sale de este dispositivo», carga un PDF o una foto (o la hace con la cámara en el móvil), tapa los datos que no hacen falta, elige un caso y escribe el destinatario, ajusta la opacidad, la densidad y el color con explicaciones y avisos, y genera una copia protegida que descarga o comparte. La app funciona sin conexión tras la primera visita, no hace peticiones a otros dominios y no guarda nada.

## Arquitectura y flujo de datos

```
File (PDF / imagen) ──cargarArchivo──▶ Pagina[] (ImageBitmap + tamaño en pt)
                                            │  (estado: useReducer en App)
            recuadros (0..1) ◀── EditorRecuadros (pointer events, solo con el paso 2 abierto)
                                            │
textoMarca(estado) ─┐                       ▼
opciones ───────────┼──▶ procesarPagina: fondo blanco → imagen → recuadros negros → marca → grises
                    │        ├─ vista previa: lado máximo 1200 px, 150 ms de retardo
                    │        └─ exportación: resolución completa
                    └──▶ generarFicheros: canvas → JPEG 0,85 → (pdf-lib) PDF sin metadatos │ JPG por página
                                            │
                              puedeCompartir? → navigator.share  │  descargar (<a download>)
```

- `src/core/`: lógica pura o de canvas, sin React. Probada con Vitest en Chromium.
- `src/estado/estado.ts`: tipos del estado, acciones, reducer puro y selectores (`paginaActual`, `textoMarca`, `avisosDe`).
- `src/contenido/`: textos largos (explicaciones, avisos, guía, buenas prácticas, fuentes, errores, privacidad, plantillas).
- `src/ui/`: componentes React; `Editor` compone la vista previa y los 5 pasos.
- Pruebas de extremo a extremo (Playwright) contra el **build de producción** (`vite preview`), con CSP y service worker reales.

## Especificación (contratos)

Los tipos de `src/core/tipos.ts` (tarea 1) y las firmas de cada módulo aparecen en el bloque **Interfaces** de cada tarea. Resumen de firmas públicas:

| Módulo | Exporta |
|---|---|
| `core/limites.ts` | `MAXIMO_PAGINAS=10`, `LADO_MAXIMO_IMAGEN=4096`, `PPP_RASTERIZADO=200`, `PIXELES_POR_PUNTO`, `LADO_MAXIMO_VISTA=1200`, `RETARDO_VISTA_MS=150`, `LONGITUD_MAXIMA_TEXTO=200`, `CALIDAD_JPEG=0.85`, `OPACIDAD_MINIMA=10`, `OPACIDAD_MAXIMA=90` |
| `core/texto.ts` | `construirTexto(d: DatosGuiados): string`, `formatearFecha(f: Date): string`, `isoAFecha(iso: string): string`, `fechaAIso(fecha: string): string`, `SEPARADOR`, `CIERRE` |
| `core/avisos.ts` | `evaluarAvisos(e: EntradaAvisos): Aviso[]`, `EntradaAvisos`, `UMBRAL_OPACIDAD_BAJA=25`, `UMBRAL_OPACIDAD_ALTA=70`, `MINIMO_TEXTO_LIBRE=20` |
| `core/geometria.ts` | `Rect`, `normalizar`, `aPixeles`, `aPixelesEnteros`, `esRecuadroValido`, `recuadroEn`, `escalaParaLadoMaximo`, `TAMANO_MINIMO_RECUADRO` |
| `core/nombres.ts` | `nombresDeSalida(fecha: Date, formato: Formato, numPaginas: number): string[]` |
| `core/marca.ts` | `dibujarMarca`, `tamanoFuente`, `FACTORES_DENSIDAD`, `ANGULO_MARCA`, `COLOR_MARCA`, `FUENTE_MARCA` |
| `core/procesar.ts` | `procesarPagina(pagina, texto, opciones, ladoMaximo?): HTMLCanvasElement`, `aGrises`, `OpcionesProcesado` |
| `core/cargar.ts` | `cargarArchivo`, `ErrorCarga`, `CodigoErrorCarga`, `PedirContrasena`, `ResultadoCarga`, `esPdf` |
| `core/exportar.ts` | `canvasAJpeg`, `pdfDesdeJpegs`, `generarFicheros`, `puedeCompartir`, `compartir`, `descargar`, `PRODUCTOR`, `PaginaJpeg` |
| `estado/estado.ts` | `Estado`, `Accion`, `estadoInicial(hoy: Date)`, `reducir`, `paginaActual`, `textoMarca`, `avisosDe` |

## Restricciones globales

Se aplican a todas las tareas aunque la tarea no las repita.

- **Privacidad (R1, indispensable):** ninguna petición de red a otro origen; ningún recurso externo (fuentes, CDNs, analíticas, iconos remotos). Prohibido usar `localStorage`, `sessionStorage`, IndexedDB o cookies. Ningún dato del documento en mensajes de error ni en `console.*`.
- **Nunca datos reales:** las pruebas usan solo los DNI ficticios de `tests/fixtures/` (datos inventados). Prohibido usar, abrir o copiar el DNI real del autor.
- **TypeScript estricto** (`strict: true`) con `erasableSyntaxOnly`: **no** usar `enum`, `namespace` ni propiedades de parámetro en constructores.
- **Textos en castellano** con tildes, eñes y signos de apertura correctos (`¿`, `¡`, `«»`).
- **Comandos** desde la raíz del worktree. Puerto 4173 reservado para `vite preview` de las pruebas e2e.
- **Puerta antes de cada commit:** `npm run lint && npm run typecheck && npm test`, más la especificación e2e de la tarea con `npx playwright test <fichero> --project=escritorio --project=android`.
- **WebKit en local:** el proyecto `iphone` de Playwright necesita `libavif16` y `libmanette-0.2-0`, que no están instaladas. **No ejecutes `sudo`.** Si hacen falta, pide al usuario que ejecute `! sudo apt-get install libavif16 libmanette-0.2-0`; mientras tanto, ejecuta e2e con `--project=escritorio --project=android`. En CI se instalan solas.
- **Commits:** al menos uno por tarea, mensaje en castellano con prefijo convencional (`feat:`, `test:`, `fix:`, `docs:`, `chore:`, `ci:`) y la línea de atribución que indique tu entorno.
- **Sin publicar nada:** no crear el repositorio en GitHub, no hacer `push` ni activar Pages sin confirmación explícita del autor (sección «Publicación»).
- **Versiones fijadas** con `--save-exact`; no actualizar dependencias durante la v1.

## Foco de revisión

Cinco entradas que la especificación implica pero no detalla, y que más probablemente romperían la app a un usuario. Cada una tiene su prueba en la tarea indicada.

1. **PDF con páginas rotadas** (`/Rotate 90`, típico de escáneres): la página debe salir con ancho y alto intercambiados, no deformada. → prueba en la tarea 6.
2. **PNG con transparencia** (capturas de pantalla): las zonas transparentes deben salir blancas, no negras, en el JPEG. → prueba en la tarea 5.
3. **Texto libre con solo espacios:** debe contar como vacío; la exportación queda bloqueada con «Escribe el texto de la marca de agua.». → pruebas en las tareas 8 y 14.
4. **«Incluir fecha» activada con la fecha borrada:** el texto no lleva fecha, así que debe saltar el aviso `sin-fecha`. → prueba en la tarea 3.
5. **Cambiar algo después de generar la copia:** la copia generada queda obsoleta; «Compartir» y «Descargar» deben desaparecer hasta volver a generar. → prueba en la tarea 14.

Además, en la verificación manual (tarea 18): compartir desde Safari en iPhone, que no se puede automatizar.

## Worktree

Primer paso de la ejecución, antes de la tarea 1. El checkout principal se queda en `main`.

```bash
cd ~/Development/Personal/protege-dni
git checkout main
git remote -v                      # hoy no hay remoto: no hay nada que traer.
                                   # Si ya existe un remoto: git pull origin main (obligatorio)
git check-ignore -q .claude/worktrees || { printf '.claude/worktrees/\n' >> .gitignore; git add .gitignore; git commit -m "chore: ignorar los worktrees de trabajo"; }
git add docs/superpowers/plans/2026-10-10-protege-dni-v1.md   # el plan debe estar en main antes de crear el worktree
git diff --cached --quiet || git commit -m "docs: plan de implementación de Protege DNI v1"
git worktree add .claude/worktrees/protege-dni-v1 -b feat/protege-dni-v1
cd .claude/worktrees/protege-dni-v1
git rev-parse --abbrev-ref HEAD    # debe imprimir feat/protege-dni-v1
```

Avisos:

- Si usas una herramienta nativa de worktrees (por ejemplo `EnterWorktree`), la rama se llamará `worktree-<slug>`. **Comprueba la rama real** con `git rev-parse --abbrev-ref HEAD` antes de cualquier `push` o PR, y usa ese nombre.
- Las dependencias **no se heredan**: la tarea 1 ejecuta `npm install` dentro del worktree.
- Si delegas tareas en subagentes, **comprueba que sus commits están en este worktree** (`git -C ~/Development/Personal/protege-dni/.claude/worktrees/protege-dni-v1 log --oneline -3`) antes de dar una tarea por hecha.

## Enrutado de modelos

| Tarea | Modelo | Motivo |
|---|---|---|
| 1 · Andamiaje | **Haiku 5.5** | Ficheros y comandos literales; sin decisiones propias. |
| 2 · Texto de la marca y plantillas | **Haiku 5.5** | Funciones puras pequeñas con código y pruebas completos en el plan. Escalar a Sonnet 5.5 si una prueba falla sin causa evidente. |
| 3 · Reglas de avisos | **Haiku 5.5** | Igual que la 2: reglas tabuladas con pruebas de límites ya escritas. |
| 4 · Geometría y nombres | **Haiku 5.5** | Igual que la 2. |
| 5 · Marca y procesado | **Sonnet 5.5** | Canvas, coordenadas giradas y comprobaciones de píxeles. Escalar a Opus 5.5 si los casos límite se resisten. |
| 6 · Carga de PDF e imágenes | **Sonnet 5.5** | pdf.js, contraseñas, límites y errores asíncronos. Escalar a Opus 5.5 si los casos límite se resisten. |
| 7 · Exportación | **Sonnet 5.5** | pdf-lib, JPEG, Web Share y descargas. |
| 8 · Estado (reducer) | **Sonnet 5.5** | Reglas de selección y límites sutiles. |
| 9 · Esqueleto de la interfaz y páginas informativas | **Sonnet 5.5** | Interfaz, accesibilidad y e2e. |
| 10 · Paso 1 y vista previa | **Sonnet 5.5** | Interfaz con asincronía (contraseña, varias cargas) y e2e. |
| 11 · Paso 2 · ocultar datos | **Sonnet 5.5** | Pointer events y coordenadas. Escalar a Opus 5.5 si los casos límite se resisten. |
| 12 · Paso 3 · texto | **Sonnet 5.5** | Formulario controlado y e2e. |
| 13 · Paso 4 · opciones | **Sonnet 5.5** | Formulario y e2e de píxeles. |
| 14 · Paso 5 · exportar | **Sonnet 5.5** | Flujo en dos pasos y análisis del PDF exportado. |
| 15 · Pruebas de privacidad y PWA | **Sonnet 5.5** | e2e de red, modo sin conexión y almacenamiento. |
| 16 · CI, README y licencia | **Haiku 5.5** | Ficheros literales. |
| 17 · Verificación de contenidos | **Sonnet 5.5** | Requiere leer fuentes y juzgar si respaldan cada afirmación. |
| 18 · Integración, revisión y verificación final | **Opus 5.5** (esfuerzo `xhigh`) | Única pasada cara: revisión global frente a la especificación, verificación visual y depuración transversal. |

Último recurso: si un problema resiste a Opus 5.5 tras varios intentos, escalar a **Fable 5.1**.

## Orden y paralelización

```
T1 ─┬─ T2 ─┐
    ├─ T3 ─┼──────────────── T8 ── T9 ── T10 ── T11 ── T12 ── T13 ── T14 ── T15 ──┐
    └─ T4 ─┼─ T5 ─┬─ T7 ─────────────────────────────────────────▲               ├─ T18
           │      │                                               │               │
           └─ T6 ─┴───────────────── (T10 necesita T6) ──────────┘               │
T16 (en cualquier momento tras T1) ───────────────────────────────────────────────┤
T17 (tras T9 y antes de T18) ─────────────────────────────────────────────────────┘
```

- **En paralelo tras T1:** T2, T3 y T4. **Tras T4:** T5 y T6 en paralelo. T7 necesita T4 y T5. T8 necesita T2, T3 y T4.
- **En serie:** T9 → T10 → T11 → T12 → T13 → T14, porque todas modifican `src/ui/Editor.tsx`. T10 necesita T6; T14 necesita T7.
- T15 después de T14. T16 puede hacerse en cualquier momento tras T1. T17 después de T9. T18 al final.

## Mapa de archivos

Todo es nuevo (el repositorio solo tiene `docs/`).

```
.gitignore                       T1 (amplía la línea creada en §Worktree)
.oxlintrc.json                   T1
package.json, package-lock.json  T1
tsconfig.json                    T1
tsconfig.app.json                T1
tsconfig.node.json               T1
index.html                       T1
vite.config.ts                   T1
vitest.config.ts                 T1
playwright.config.ts             T1
scripts/copiar-pdfjs.mjs         T1
public/icono.svg, icono-maskable.svg, icono-192.png, icono-512.png, icono-maskable-512.png   T1
src/main.tsx                     T1
src/App.tsx                      T1 → T9 → T10
src/estilos.css                  T1 → T9
src/core/tipos.ts                T1
src/core/limites.ts              T1
src/core/texto.ts (+ .test.ts)               T2
src/contenido/plantillas.ts                  T2
src/core/avisos.ts (+ .test.ts)              T3
src/contenido/avisos.ts                      T3
src/core/geometria.ts (+ .test.ts)           T4
src/core/nombres.ts (+ .test.ts)             T4
src/core/marca.ts                            T5
src/core/procesar.ts (+ .test.ts)            T5
tests/fixtures/generar.mjs + ficheros        T6
src/core/cargar.ts (+ .test.ts)              T6
src/core/exportar.ts (+ .test.ts)            T7
src/estado/estado.ts (+ .test.ts)            T8
src/contenido/fuentes.ts, buenasPracticas.ts, explicaciones.ts, privacidad.ts   T9
src/ui/useRutaHash.ts, Cabecera.tsx, Paso.tsx, Aviso.tsx, EnlacesFuentes.tsx, PorQueImporta.tsx,
       PaginaBuenasPracticas.tsx, PaginaComoComprobarlo.tsx, Editor.tsx       T9
tests/e2e/utilidades.ts, tests/e2e/inicio.spec.ts                             T1 (inicio) / T9
src/contenido/errores.ts                                                      T10
src/ui/VistaPrevia.tsx, Miniatura.tsx, DialogoContrasena.tsx, PasoDocumento.tsx, useLiberarImagenes.ts   T10
tests/e2e/documento.spec.ts                                                   T10
src/contenido/guiaOcultar.ts, src/ui/EditorRecuadros.tsx, GuiaOcultar.tsx, PasoOcultar.tsx               T11
tests/e2e/ocultar.spec.ts                                                     T11
src/ui/PasoTexto.tsx, tests/e2e/texto.spec.ts                                 T12
src/ui/PasoOpciones.tsx, tests/e2e/opciones.spec.ts                           T13
src/ui/PasoExportar.tsx, tests/e2e/exportar.spec.ts                           T14
tests/e2e/privacidad.spec.ts                                                  T15
.github/workflows/ci.yml, README.md, LICENSE                                  T16
docs/verificacion-contenidos.md (+ ajustes en src/contenido/)                 T17
```

---

## Tareas

### Tarea 1 — Andamiaje del proyecto (Haiku 5.5)

**Archivos:**
- Crear: `.oxlintrc.json`, `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `scripts/copiar-pdfjs.mjs`, `public/icono.svg`, `public/icono-maskable.svg`, iconos PNG, `src/main.tsx`, `src/App.tsx`, `src/estilos.css`, `src/core/tipos.ts`, `src/core/limites.ts`
- Modificar: `.gitignore`
- Prueba: `tests/e2e/inicio.spec.ts`

**Interfaces:**
- Consume: nada.
- Produce: los tipos de `src/core/tipos.ts` y las constantes de `src/core/limites.ts` (literales abajo), que usan todas las tareas siguientes. Scripts npm: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `e2e`.

Andamiaje: no hay un `→ FAIL` previo con sentido; la prueba de humo se escribe y debe pasar al terminar.

- [ ] **Paso 1: `.gitignore` completo** (sustituye al de una línea creado en §Worktree)

```gitignore
# Dependencias y builds
node_modules
dist
dist-ssr
*.local
*.log

# Recursos de pdf.js copiados en cada build (scripts/copiar-pdfjs.mjs)
public/pdfjs

# Resultados de pruebas
test-results
playwright-report
blob-report
**/__screenshots__

# Worktrees de trabajo
.claude/worktrees/

# Editor
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
```

- [ ] **Paso 2: `package.json`**

```json
{
  "name": "protege-dni",
  "private": true,
  "version": "0.1.0",
  "description": "Marca de agua y ocultación de datos para copias del DNI, 100 % en el navegador.",
  "license": "MIT",
  "type": "module",
  "scripts": {
    "predev": "node scripts/copiar-pdfjs.mjs",
    "dev": "vite",
    "prebuild": "node scripts/copiar-pdfjs.mjs",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "oxlint",
    "typecheck": "tsc -b",
    "pretest": "node scripts/copiar-pdfjs.mjs",
    "test": "vitest run",
    "e2e": "playwright test"
  }
}
```

- [ ] **Paso 3: instalar dependencias con versiones exactas y los navegadores de Playwright**

```bash
npm install --save-exact react@19.3.0 react-dom@19.3.0 pdfjs-dist@6.4.299 pdf-lib@1.17.1
npm install --save-exact --save-dev typescript@7.0.2 vite@8.3.4 @vitejs/plugin-react@6.1.2 @types/react@19.3.0 @types/react-dom@19.3.0 @types/node@24.19.1 oxlint@1.87.0 vite-plugin-pwa@2.0.0 vitest@5.0.3 @vitest/browser-playwright@5.0.3 playwright@1.64.0 @playwright/test@1.64.0
npx playwright install chromium webkit
```

Esperado: sin errores de npm. La instalación de WebKit puede mostrar «Host system is missing dependencies»: es normal (ver Restricciones globales).

- [ ] **Paso 4: configuración de TypeScript y oxlint**

`tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client", "vite-plugin-pwa/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "types": ["node"],
    "skipLibCheck": true,
    "module": "nodenext",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts", "tests/e2e"]
}
```

`.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

- [ ] **Paso 5: Vite, Vitest, Playwright y la copia de recursos de pdf.js**

`scripts/copiar-pdfjs.mjs`:

```js
// Copia a public/pdfjs los recursos que pdf.js carga en tiempo de ejecución,
// para servirlos desde el propio origen (nada de CDNs).
import { cpSync, rmSync } from 'node:fs'

const destino = 'public/pdfjs'
rmSync(destino, { recursive: true, force: true })
for (const carpeta of ['standard_fonts', 'cmaps', 'wasm', 'iccs']) {
  cpSync(`node_modules/pdfjs-dist/${carpeta}`, `${destino}/${carpeta}`, { recursive: true })
}
```

`vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Política de seguridad: solo recursos y conexiones del propio origen.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

// Solo en el build: el servidor de desarrollo de Vite necesita scripts en línea.
function csp(): Plugin {
  return {
    name: 'protege-dni-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  }
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    csp(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Protege DNI',
        short_name: 'Protege DNI',
        description: 'Añade una marca de agua a la copia de tu DNI y oculta datos antes de compartirla. Todo se procesa en tu dispositivo.',
        lang: 'es',
        display: 'standalone',
        start_url: './',
        scope: './',
        theme_color: '#1f3a5f',
        background_color: '#ffffff',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,webmanifest,pfb,ttf,wasm,icc}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/pdfjs/cmaps/'),
            handler: 'CacheFirst',
            options: { cacheName: 'pdfjs-cmaps' },
          },
        ],
      },
    }),
  ],
})
```

`vitest.config.ts`:

```ts
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

// Las pruebas unitarias se ejecutan en un Chromium real: core/ usa canvas, ImageBitmap y pdf.js.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
})
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://localhost:4173/', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
  ],
})
```

- [ ] **Paso 6: `index.html`, iconos y punto de entrada**

`index.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icono.svg" />
    <link rel="apple-touch-icon" href="/icono-192.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Añade una marca de agua a la copia de tu DNI y oculta datos antes de compartirla. Todo se procesa en tu dispositivo." />
    <meta name="theme-color" content="#1f3a5f" />
    <title>Protege DNI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`public/icono.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1f3a5f"/>
  <path d="M256 64 104 124v108c0 100 64 178 152 216 88-38 152-116 152-216V124z" fill="#ffffff"/>
  <rect x="166" y="196" width="180" height="120" rx="14" fill="#1f3a5f"/>
  <rect x="184" y="216" width="48" height="60" rx="6" fill="#ffffff"/>
  <rect x="246" y="222" width="82" height="12" rx="6" fill="#ffffff"/>
  <rect x="246" y="246" width="66" height="12" rx="6" fill="#ffffff"/>
  <rect x="246" y="270" width="74" height="12" rx="6" fill="#ffffff"/>
</svg>
```

`public/icono-maskable.svg` (mismo dibujo al 70 %, fondo a sangre para el recorte de Android):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1f3a5f"/>
  <g transform="translate(76.8 76.8) scale(0.7)">
    <path d="M256 64 104 124v108c0 100 64 178 152 216 88-38 152-116 152-216V124z" fill="#ffffff"/>
    <rect x="166" y="196" width="180" height="120" rx="14" fill="#1f3a5f"/>
    <rect x="184" y="216" width="48" height="60" rx="6" fill="#ffffff"/>
    <rect x="246" y="222" width="82" height="12" rx="6" fill="#ffffff"/>
    <rect x="246" y="246" width="66" height="12" rx="6" fill="#ffffff"/>
    <rect x="246" y="270" width="74" height="12" rx="6" fill="#ffffff"/>
  </g>
</svg>
```

```bash
magick -background none -density 300 public/icono.svg -resize 192x192 public/icono-192.png
magick -background none -density 300 public/icono.svg -resize 512x512 public/icono-512.png
magick -background none -density 300 public/icono-maskable.svg -resize 512x512 public/icono-maskable-512.png
file public/*.png
```

Esperado: tres PNG de 192×192, 512×512 y 512×512.

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './estilos.css'

// Registro del service worker sin scripts en línea (compatible con la CSP).
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx` (provisional; la tarea 9 lo sustituye):

```tsx
export default function App() {
  return (
    <main>
      <h1>Protege DNI</h1>
    </main>
  )
}
```

`src/estilos.css` (provisional; la tarea 9 lo sustituye):

```css
:root {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

body {
  margin: 0;
}
```

- [ ] **Paso 7: tipos y constantes compartidos**

`src/core/limites.ts`:

```ts
/** Límites y constantes de procesado compartidos por toda la app. */
export const MAXIMO_PAGINAS = 10
export const LADO_MAXIMO_IMAGEN = 4096
export const PPP_RASTERIZADO = 200
export const PIXELES_POR_PUNTO = PPP_RASTERIZADO / 72
export const LADO_MAXIMO_VISTA = 1200
export const RETARDO_VISTA_MS = 150
export const LONGITUD_MAXIMA_TEXTO = 200
export const CALIDAD_JPEG = 0.85
export const OPACIDAD_MINIMA = 10
export const OPACIDAD_MAXIMA = 90
```

`src/core/tipos.ts`:

```ts
/** Recuadro de ocultación en coordenadas relativas a la página (0..1). */
export type Recuadro = { id: string; x: number; y: number; ancho: number; alto: number }

export type Pagina = {
  id: string
  /** Página rasterizada (PDF a 200 ppp) o foto, ya reducida si hacía falta. */
  imagen: ImageBitmap
  anchoPx: number
  altoPx: number
  /** Tamaño de la página en puntos PDF, para la exportación. */
  anchoPt: number
  altoPt: number
  recuadros: Recuadro[]
}

export type CasoId = 'alquiler' | 'banco' | 'suministros' | 'administracion' | 'empleo' | 'otro'

export type DatosGuiados = {
  caso: CasoId
  destinatario: string
  finalidad: string
  referencia: string
  incluirFecha: boolean
  /** Formato dd/mm/aaaa. */
  fecha: string
}

export type ModoTexto = 'guiado' | 'libre'
export type Densidad = 'baja' | 'normal' | 'alta'
export type Formato = 'pdf' | 'jpg'

export type Opciones = {
  /** Porcentaje entero entre 10 y 90. */
  opacidad: number
  densidad: Densidad
  color: boolean
  formato: Formato
}

export type IdAviso =
  | 'sin-destinatario'
  | 'sin-finalidad'
  | 'sin-fecha'
  | 'texto-libre-corto'
  | 'opacidad-baja'
  | 'opacidad-alta'
  | 'densidad-baja'
  | 'color'
  | 'sin-recuadros'
  | 'varias-paginas'

export type NivelAviso = 'riesgo' | 'consejo'
export type NumeroPaso = 1 | 2 | 3 | 4 | 5

export type Aviso = { id: IdAviso; nivel: NivelAviso; mensaje: string; paso: NumeroPaso }
```

- [ ] **Paso 8: prueba de humo e2e**

`tests/e2e/inicio.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('la app carga con su título y su política de seguridad', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Protege DNI')
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("connect-src 'self'")
})
```

- [ ] **Paso 9: verificar**

```bash
npm run lint
npm run typecheck
npm test
npx playwright test tests/e2e/inicio.spec.ts --project=escritorio --project=android
ls dist/sw.js dist/manifest.webmanifest dist/pdfjs/standard_fonts | head -3
```

Esperado: lint sin errores; `typecheck` sin salida; Vitest «No test files found» con código 0; **2 passed** en Playwright; existen `dist/sw.js` y `dist/manifest.webmanifest`.

- [ ] **Paso 10: commit**

```bash
git add .gitignore .oxlintrc.json package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json index.html vite.config.ts vitest.config.ts playwright.config.ts scripts public src tests
git commit -m "chore: andamiaje de Protege DNI con Vite, React, PWA, CSP y pruebas"
```

**Criterio de aceptación:** `npm run lint && npm run typecheck && npm test && npx playwright test tests/e2e/inicio.spec.ts --project=escritorio` termina con código 0.

---

### Tarea 2 — Texto de la marca y plantillas (Haiku 5.5)

**Archivos:**
- Crear: `src/core/texto.ts`, `src/contenido/plantillas.ts`
- Prueba: `src/core/texto.test.ts`

**Interfaces:**
- Consume: `DatosGuiados`, `CasoId` de `src/core/tipos.ts`.
- Produce: `construirTexto(d: DatosGuiados): string`, `formatearFecha(fecha: Date): string`, `isoAFecha(iso: string): string`, `fechaAIso(fecha: string): string`, `SEPARADOR = ' · '`, `CIERRE = 'No válida para otro uso'`; `PLANTILLAS` (lista ordenada de `{ id, etiqueta, finalidad }`) y `finalidadSugerida(caso: CasoId): string`.

- [ ] **Paso 1: escribir las pruebas**

`src/core/texto.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { finalidadSugerida, PLANTILLAS } from '../contenido/plantillas'
import { construirTexto, fechaAIso, formatearFecha, isoAFecha } from './texto'
import type { DatosGuiados } from './tipos'

const base: DatosGuiados = {
  caso: 'suministros',
  destinatario: 'E-DISTRIBUCIÓN',
  finalidad: 'cambio de titular o de datos del suministro',
  referencia: 'CUPS ES0031000000000000XX',
  incluirFecha: true,
  fecha: '10/10/2026',
}

describe('construirTexto', () => {
  it('une todas las partes con « · » y termina con el cierre', () => {
    expect(construirTexto(base)).toBe(
      'Copia para E-DISTRIBUCIÓN · Solo para cambio de titular o de datos del suministro · CUPS ES0031000000000000XX · 10/10/2026 · No válida para otro uso',
    )
  })

  it('omite las partes vacías o con solo espacios', () => {
    expect(construirTexto({ ...base, destinatario: '   ', referencia: '' })).toBe(
      'Solo para cambio de titular o de datos del suministro · 10/10/2026 · No válida para otro uso',
    )
  })

  it('no incluye la fecha si está desactivada', () => {
    expect(construirTexto({ ...base, referencia: '', incluirFecha: false })).toBe(
      'Copia para E-DISTRIBUCIÓN · Solo para cambio de titular o de datos del suministro · No válida para otro uso',
    )
  })

  it('no incluye la fecha si está vacía aunque esté activada', () => {
    expect(construirTexto({ ...base, fecha: '' })).not.toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('recorta los espacios de cada campo', () => {
    expect(
      construirTexto({ ...base, destinatario: '  BANCO X  ', finalidad: '', referencia: '', incluirFecha: false }),
    ).toBe('Copia para BANCO X · No válida para otro uso')
  })

  it('sin datos queda solo el cierre', () => {
    expect(construirTexto({ ...base, destinatario: '', finalidad: '', referencia: '', incluirFecha: false })).toBe(
      'No válida para otro uso',
    )
  })
})

describe('fechas', () => {
  it('formatearFecha usa dd/mm/aaaa con ceros a la izquierda', () => {
    expect(formatearFecha(new Date(2026, 0, 5))).toBe('05/01/2026')
  })

  it('convierte entre ISO y dd/mm/aaaa', () => {
    expect(isoAFecha('2026-10-10')).toBe('10/10/2026')
    expect(fechaAIso('10/10/2026')).toBe('2026-10-10')
  })

  it('devuelve cadena vacía si la entrada está incompleta', () => {
    expect(isoAFecha('')).toBe('')
    expect(fechaAIso('10/2026')).toBe('')
  })
})

describe('plantillas', () => {
  it('cubren todos los casos en el orden del selector', () => {
    expect(PLANTILLAS.map((p) => p.id)).toEqual(['alquiler', 'banco', 'suministros', 'administracion', 'empleo', 'otro'])
  })

  it('sugieren la finalidad del caso y ninguna para «Otro»', () => {
    expect(finalidadSugerida('suministros')).toBe('cambio de titular o de datos del suministro')
    expect(finalidadSugerida('otro')).toBe('')
  })
})
```

- [ ] **Paso 2: ejecutar** — `npx vitest run src/core/texto.test.ts` → **FAIL** (no se resuelven `./texto` ni `../contenido/plantillas`).

- [ ] **Paso 3: implementar**

`src/core/texto.ts`:

```ts
import type { DatosGuiados } from './tipos'

export const SEPARADOR = ' · '
export const CIERRE = 'No válida para otro uso'

/** Construye el texto de la marca a partir de los datos guiados (sección 3.4 de la especificación). */
export function construirTexto(datos: DatosGuiados): string {
  const partes: string[] = []
  const destinatario = datos.destinatario.trim()
  const finalidad = datos.finalidad.trim()
  const referencia = datos.referencia.trim()
  const fecha = datos.fecha.trim()
  if (destinatario) partes.push(`Copia para ${destinatario}`)
  if (finalidad) partes.push(`Solo para ${finalidad}`)
  if (referencia) partes.push(referencia)
  if (datos.incluirFecha && fecha) partes.push(fecha)
  partes.push(CIERRE)
  return partes.join(SEPARADOR)
}

const dosCifras = (n: number) => String(n).padStart(2, '0')

export function formatearFecha(fecha: Date): string {
  return `${dosCifras(fecha.getDate())}/${dosCifras(fecha.getMonth() + 1)}/${fecha.getFullYear()}`
}

/** `aaaa-mm-dd` (valor de `<input type="date">`) → `dd/mm/aaaa`. */
export function isoAFecha(iso: string): string {
  const [anio, mes, dia] = iso.split('-')
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : ''
}

/** `dd/mm/aaaa` → `aaaa-mm-dd`. */
export function fechaAIso(fecha: string): string {
  const [dia, mes, anio] = fecha.split('/')
  return anio && mes && dia ? `${anio}-${mes}-${dia}` : ''
}
```

`src/contenido/plantillas.ts`:

```ts
import type { CasoId } from '../core/tipos'

export type Plantilla = { id: CasoId; etiqueta: string; finalidad: string }

/** Casos del modo guiado, en el orden en que aparecen en el selector. */
export const PLANTILLAS: readonly Plantilla[] = [
  { id: 'alquiler', etiqueta: 'Alquiler de vivienda', finalidad: 'solicitud de alquiler de vivienda' },
  { id: 'banco', etiqueta: 'Banco o entidad financiera', finalidad: 'verificación de identidad como cliente' },
  {
    id: 'suministros',
    etiqueta: 'Suministros (luz, agua, gas, telecomunicaciones)',
    finalidad: 'cambio de titular o de datos del suministro',
  },
  { id: 'administracion', etiqueta: 'Trámite con la Administración', finalidad: 'trámite administrativo' },
  { id: 'empleo', etiqueta: 'Empleo', finalidad: 'proceso de contratación' },
  { id: 'otro', etiqueta: 'Otro', finalidad: '' },
]

export function finalidadSugerida(caso: CasoId): string {
  return PLANTILLAS.find((p) => p.id === caso)?.finalidad ?? ''
}
```

- [ ] **Paso 4: ejecutar** — `npx vitest run src/core/texto.test.ts` → **PASS** (11 pruebas).

- [ ] **Paso 5: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add src/core/texto.ts src/core/texto.test.ts src/contenido/plantillas.ts
git commit -m "feat: construcción del texto de la marca y plantillas de casos"
```

**Criterio de aceptación:** `npx vitest run src/core/texto.test.ts` → 11 passed.

---

### Tarea 3 — Reglas de avisos (Haiku 5.5)

**Archivos:**
- Crear: `src/core/avisos.ts`, `src/contenido/avisos.ts`
- Prueba: `src/core/avisos.test.ts`

**Interfaces:**
- Consume: `Aviso`, `IdAviso`, `DatosGuiados`, `ModoTexto`, `Opciones` de `src/core/tipos.ts`.
- Produce: `type EntradaAvisos = { modoTexto; datosGuiados; textoLibre; opciones; numPaginas; numRecuadros }`, `evaluarAvisos(e: EntradaAvisos): Aviso[]` (orden fijo: los del paso 3, luego los del 4, luego `sin-recuadros` y `varias-paginas`), `MENSAJES_AVISO: Record<IdAviso, string>`.

- [ ] **Paso 1: escribir las pruebas**

`src/core/avisos.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MENSAJES_AVISO } from '../contenido/avisos'
import { evaluarAvisos, type EntradaAvisos } from './avisos'

const segura: EntradaAvisos = {
  modoTexto: 'guiado',
  datosGuiados: {
    caso: 'banco',
    destinatario: 'BANCO X',
    finalidad: 'verificación de identidad como cliente',
    referencia: '',
    incluirFecha: true,
    fecha: '10/10/2026',
  },
  textoLibre: '',
  opciones: { opacidad: 40, densidad: 'normal', color: false, formato: 'pdf' },
  numPaginas: 1,
  numRecuadros: 1,
}

const ids = (e: EntradaAvisos) => evaluarAvisos(e).map((a) => a.id)
const conDatos = (cambios: Partial<EntradaAvisos['datosGuiados']>): EntradaAvisos => ({
  ...segura,
  datosGuiados: { ...segura.datosGuiados, ...cambios },
})
const conOpciones = (cambios: Partial<EntradaAvisos['opciones']>): EntradaAvisos => ({
  ...segura,
  opciones: { ...segura.opciones, ...cambios },
})

describe('evaluarAvisos', () => {
  it('una configuración segura no genera avisos', () => {
    expect(evaluarAvisos(segura)).toEqual([])
  })

  it('modo guiado: destinatario, finalidad y fecha', () => {
    expect(ids(conDatos({ destinatario: '  ' }))).toEqual(['sin-destinatario'])
    expect(ids(conDatos({ finalidad: '' }))).toEqual(['sin-finalidad'])
    expect(ids(conDatos({ incluirFecha: false }))).toEqual(['sin-fecha'])
  })

  it('avisa sin fecha si «Incluir fecha» está activada pero la fecha está vacía', () => {
    expect(ids(conDatos({ fecha: ' ' }))).toEqual(['sin-fecha'])
  })

  it('modo libre: avisa con menos de 20 caracteres sin contar los espacios de los lados', () => {
    const libre = (texto: string): EntradaAvisos => ({ ...segura, modoTexto: 'libre', textoLibre: texto })
    expect(ids(libre('COPIA'))).toEqual(['texto-libre-corto'])
    expect(ids(libre(`   ${'x'.repeat(19)}   `))).toEqual(['texto-libre-corto'])
    expect(ids(libre('x'.repeat(20)))).toEqual([])
  })

  it('modo libre no evalúa los campos guiados', () => {
    const e: EntradaAvisos = {
      ...conDatos({ destinatario: '', finalidad: '', incluirFecha: false }),
      modoTexto: 'libre',
      textoLibre: 'Copia para BANCO X · solo apertura de cuenta',
    }
    expect(ids(e)).toEqual([])
  })

  it('opacidad: límites 25 % y 70 %', () => {
    expect(ids(conOpciones({ opacidad: 25 }))).toEqual([])
    expect(ids(conOpciones({ opacidad: 24 }))).toEqual(['opacidad-baja'])
    expect(ids(conOpciones({ opacidad: 70 }))).toEqual([])
    expect(evaluarAvisos(conOpciones({ opacidad: 71 }))).toEqual([
      { id: 'opacidad-alta', nivel: 'consejo', paso: 4, mensaje: MENSAJES_AVISO['opacidad-alta'] },
    ])
  })

  it('densidad baja y color son riesgos del paso 4', () => {
    expect(evaluarAvisos(conOpciones({ densidad: 'baja' }))).toEqual([
      { id: 'densidad-baja', nivel: 'riesgo', paso: 4, mensaje: MENSAJES_AVISO['densidad-baja'] },
    ])
    expect(ids(conOpciones({ color: true }))).toEqual(['color'])
  })

  it('sin recuadros solo aconseja si hay páginas', () => {
    expect(evaluarAvisos({ ...segura, numRecuadros: 0 })).toEqual([
      { id: 'sin-recuadros', nivel: 'consejo', paso: 2, mensaje: MENSAJES_AVISO['sin-recuadros'] },
    ])
    expect(ids({ ...segura, numPaginas: 0, numRecuadros: 0 })).toEqual([])
  })

  it('con 2 o más páginas aconseja enviar solo las caras pedidas', () => {
    expect(evaluarAvisos({ ...segura, numPaginas: 2 })).toEqual([
      { id: 'varias-paginas', nivel: 'consejo', paso: 1, mensaje: MENSAJES_AVISO['varias-paginas'] },
    ])
  })

  it('los riesgos del texto son del paso 3', () => {
    expect(evaluarAvisos(conDatos({ destinatario: '' }))[0]).toMatchObject({ nivel: 'riesgo', paso: 3 })
  })
})
```

- [ ] **Paso 2: ejecutar** — `npx vitest run src/core/avisos.test.ts` → **FAIL** (no existen los módulos).

- [ ] **Paso 3: implementar**

`src/contenido/avisos.ts`:

```ts
import type { IdAviso } from '../core/tipos'

export const MENSAJES_AVISO: Record<IdAviso, string> = {
  'sin-destinatario': 'Sin destinatario, la copia sirve para cualquier trámite.',
  'sin-finalidad': 'Sin finalidad, la copia sirve para cualquier uso.',
  'sin-fecha': 'Sin fecha, la copia no caduca y puede reutilizarse dentro de años.',
  'texto-libre-corto': 'Un texto tan corto o genérico (por ejemplo, «COPIA») no indica para quién ni para qué es.',
  'opacidad-baja': 'La marca es tan tenue que es fácil borrarla.',
  'opacidad-alta': 'Puede que no se lean los datos y te rechacen el documento.',
  'densidad-baja': 'Quedan zonas sin cubrir que se pueden recortar.',
  color: 'En color es más fácil manipular la copia o imprimirla como si fuera el original.',
  'sin-recuadros': 'Si el trámite no necesita la firma u otros datos, ocúltalos con un recuadro.',
  'varias-paginas': 'Envía las dos caras solo si te las piden.',
}
```

`src/core/avisos.ts`:

```ts
import { MENSAJES_AVISO } from '../contenido/avisos'
import type { Aviso, DatosGuiados, IdAviso, ModoTexto, NivelAviso, NumeroPaso, Opciones } from './tipos'

export type EntradaAvisos = {
  modoTexto: ModoTexto
  datosGuiados: DatosGuiados
  textoLibre: string
  opciones: Opciones
  numPaginas: number
  numRecuadros: number
}

export const UMBRAL_OPACIDAD_BAJA = 25
export const UMBRAL_OPACIDAD_ALTA = 70
export const MINIMO_TEXTO_LIBRE = 20

/** Reglas de la sección 4 de la especificación. Nunca bloquean: solo informan. */
export function evaluarAvisos(e: EntradaAvisos): Aviso[] {
  const avisos: Aviso[] = []
  const anadir = (id: IdAviso, nivel: NivelAviso, paso: NumeroPaso) =>
    avisos.push({ id, nivel, paso, mensaje: MENSAJES_AVISO[id] })

  if (e.modoTexto === 'guiado') {
    const d = e.datosGuiados
    if (!d.destinatario.trim()) anadir('sin-destinatario', 'riesgo', 3)
    if (!d.finalidad.trim()) anadir('sin-finalidad', 'riesgo', 3)
    if (!d.incluirFecha || !d.fecha.trim()) anadir('sin-fecha', 'riesgo', 3)
  } else if (e.textoLibre.trim().length < MINIMO_TEXTO_LIBRE) {
    anadir('texto-libre-corto', 'riesgo', 3)
  }

  if (e.opciones.opacidad < UMBRAL_OPACIDAD_BAJA) anadir('opacidad-baja', 'riesgo', 4)
  if (e.opciones.opacidad > UMBRAL_OPACIDAD_ALTA) anadir('opacidad-alta', 'consejo', 4)
  if (e.opciones.densidad === 'baja') anadir('densidad-baja', 'riesgo', 4)
  if (e.opciones.color) anadir('color', 'riesgo', 4)

  if (e.numPaginas > 0 && e.numRecuadros === 0) anadir('sin-recuadros', 'consejo', 2)
  if (e.numPaginas >= 2) anadir('varias-paginas', 'consejo', 1)
  return avisos
}
```

- [ ] **Paso 4: ejecutar** — `npx vitest run src/core/avisos.test.ts` → **PASS** (10 pruebas).

- [ ] **Paso 5: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add src/core/avisos.ts src/core/avisos.test.ts src/contenido/avisos.ts
git commit -m "feat: reglas de avisos de seguridad"
```

**Criterio de aceptación:** `npx vitest run src/core/avisos.test.ts` → 10 passed.

---

### Tarea 4 — Geometría y nombres de salida (Haiku 5.5)

**Archivos:**
- Crear: `src/core/geometria.ts`, `src/core/nombres.ts`
- Prueba: `src/core/geometria.test.ts`, `src/core/nombres.test.ts`

**Interfaces:**
- Consume: `Recuadro`, `Formato` de `src/core/tipos.ts`.
- Produce:
  - `type Rect = Omit<Recuadro, 'id'>`
  - `normalizar(x1, y1, x2, y2, ancho, alto): Rect` (píxeles de un arrastre en cualquier dirección → relativo y recortado a [0, 1])
  - `aPixeles(r: Rect, ancho, alto): Rect`
  - `aPixelesEnteros(r: Rect, ancho, alto): Rect` (redondeo hacia fuera)
  - `esRecuadroValido(r: Rect): boolean` (ancho y alto ≥ `TAMANO_MINIMO_RECUADRO = 0.01`)
  - `recuadroEn(recuadros: Recuadro[], x, y): Recuadro | undefined` (coordenadas relativas; devuelve el de encima, es decir, el último)
  - `escalaParaLadoMaximo(ancho, alto, ladoMaximo): number` (≤ 1)
  - `nombresDeSalida(fecha: Date, formato: Formato, numPaginas: number): string[]`

- [ ] **Paso 1: escribir las pruebas**

`src/core/geometria.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  aPixeles,
  aPixelesEnteros,
  escalaParaLadoMaximo,
  esRecuadroValido,
  normalizar,
  recuadroEn,
} from './geometria'

describe('normalizar', () => {
  it('convierte un arrastre de izquierda a derecha y de arriba abajo', () => {
    expect(normalizar(100, 50, 300, 150, 400, 200)).toEqual({ x: 0.25, y: 0.25, ancho: 0.5, alto: 0.5 })
  })

  it('da el mismo resultado en las cuatro direcciones de arrastre', () => {
    const esperado = { x: 0.25, y: 0.25, ancho: 0.5, alto: 0.5 }
    expect(normalizar(300, 150, 100, 50, 400, 200)).toEqual(esperado)
    expect(normalizar(300, 50, 100, 150, 400, 200)).toEqual(esperado)
    expect(normalizar(100, 150, 300, 50, 400, 200)).toEqual(esperado)
  })

  it('recorta a los bordes si el arrastre sale de la página', () => {
    expect(normalizar(-50, -20, 500, 300, 400, 200)).toEqual({ x: 0, y: 0, ancho: 1, alto: 1 })
  })
})

describe('conversión a píxeles', () => {
  it('aPixeles escala sin redondear', () => {
    expect(aPixeles({ x: 0.25, y: 0.5, ancho: 0.5, alto: 0.25 }, 400, 200)).toEqual({ x: 100, y: 100, ancho: 200, alto: 50 })
  })

  it('aPixelesEnteros redondea hacia fuera', () => {
    expect(aPixelesEnteros({ x: 0.1003, y: 0.1003, ancho: 0.2, alto: 0.2 }, 300, 300)).toEqual({
      x: 30,
      y: 30,
      ancho: 61,
      alto: 61,
    })
  })
})

describe('validez y selección', () => {
  it('un toque sin arrastre no es un recuadro válido', () => {
    expect(esRecuadroValido({ x: 0.5, y: 0.5, ancho: 0, alto: 0 })).toBe(false)
    expect(esRecuadroValido({ x: 0.5, y: 0.5, ancho: 0.009, alto: 0.2 })).toBe(false)
    expect(esRecuadroValido({ x: 0.5, y: 0.5, ancho: 0.01, alto: 0.01 })).toBe(true)
  })

  it('recuadroEn devuelve el de encima (el último) que contiene el punto', () => {
    const a = { id: 'a', x: 0, y: 0, ancho: 0.5, alto: 0.5 }
    const b = { id: 'b', x: 0.25, y: 0.25, ancho: 0.5, alto: 0.5 }
    expect(recuadroEn([a, b], 0.3, 0.3)?.id).toBe('b')
    expect(recuadroEn([a, b], 0.1, 0.1)?.id).toBe('a')
    expect(recuadroEn([a, b], 0.9, 0.9)).toBeUndefined()
  })
})

describe('escalaParaLadoMaximo', () => {
  it('reduce solo si el lado mayor supera el máximo', () => {
    expect(escalaParaLadoMaximo(5000, 1000, 4096)).toBeCloseTo(4096 / 5000)
    expect(escalaParaLadoMaximo(1000, 5000, 4096)).toBeCloseTo(4096 / 5000)
    expect(escalaParaLadoMaximo(800, 600, 4096)).toBe(1)
  })
})
```

`src/core/nombres.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { nombresDeSalida } from './nombres'

describe('nombresDeSalida', () => {
  const fecha = new Date(2026, 9, 5)

  it('un único PDF con la fecha', () => {
    expect(nombresDeSalida(fecha, 'pdf', 3)).toEqual(['copia-protegida-2026-10-05.pdf'])
  })

  it('un JPG por página, numerados desde 1', () => {
    expect(nombresDeSalida(fecha, 'jpg', 2)).toEqual([
      'copia-protegida-2026-10-05-p1.jpg',
      'copia-protegida-2026-10-05-p2.jpg',
    ])
  })
})
```

- [ ] **Paso 2: ejecutar** — `npx vitest run src/core/geometria.test.ts src/core/nombres.test.ts` → **FAIL**.

- [ ] **Paso 3: implementar**

`src/core/geometria.ts`:

```ts
import type { Recuadro } from './tipos'

export type Rect = Omit<Recuadro, 'id'>

/** Lado mínimo (relativo) para considerar que hubo arrastre y no un simple toque. */
export const TAMANO_MINIMO_RECUADRO = 0.01

const limitar = (v: number) => Math.min(1, Math.max(0, v))

/** Arrastre en píxeles (en cualquier dirección) → rectángulo relativo recortado a la página. */
export function normalizar(x1: number, y1: number, x2: number, y2: number, ancho: number, alto: number): Rect {
  const izquierda = limitar(Math.min(x1, x2) / ancho)
  const derecha = limitar(Math.max(x1, x2) / ancho)
  const arriba = limitar(Math.min(y1, y2) / alto)
  const abajo = limitar(Math.max(y1, y2) / alto)
  return { x: izquierda, y: arriba, ancho: derecha - izquierda, alto: abajo - arriba }
}

export function aPixeles(r: Rect, ancho: number, alto: number): Rect {
  return { x: r.x * ancho, y: r.y * alto, ancho: r.ancho * ancho, alto: r.alto * alto }
}

/** Rectángulo en píxeles enteros que contiene por completo al recuadro (redondeo hacia fuera). */
export function aPixelesEnteros(r: Rect, ancho: number, alto: number): Rect {
  const x0 = Math.floor(r.x * ancho)
  const y0 = Math.floor(r.y * alto)
  const x1 = Math.ceil((r.x + r.ancho) * ancho)
  const y1 = Math.ceil((r.y + r.alto) * alto)
  return { x: x0, y: y0, ancho: x1 - x0, alto: y1 - y0 }
}

export function esRecuadroValido(r: Rect): boolean {
  return r.ancho >= TAMANO_MINIMO_RECUADRO && r.alto >= TAMANO_MINIMO_RECUADRO
}

/** Recuadro que contiene el punto relativo (x, y); si se solapan, el último dibujado. */
export function recuadroEn(recuadros: Recuadro[], x: number, y: number): Recuadro | undefined {
  for (let i = recuadros.length - 1; i >= 0; i--) {
    const r = recuadros[i]
    if (x >= r.x && x <= r.x + r.ancho && y >= r.y && y <= r.y + r.alto) return r
  }
  return undefined
}

export function escalaParaLadoMaximo(ancho: number, alto: number, ladoMaximo: number): number {
  return Math.min(1, ladoMaximo / Math.max(ancho, alto))
}
```

`src/core/nombres.ts`:

```ts
import type { Formato } from './tipos'

const dosCifras = (n: number) => String(n).padStart(2, '0')

/** No reutiliza el nombre del fichero original: suele contener el nombre de la persona. */
export function nombresDeSalida(fecha: Date, formato: Formato, numPaginas: number): string[] {
  const dia = `${fecha.getFullYear()}-${dosCifras(fecha.getMonth() + 1)}-${dosCifras(fecha.getDate())}`
  if (formato === 'pdf') return [`copia-protegida-${dia}.pdf`]
  return Array.from({ length: numPaginas }, (_, i) => `copia-protegida-${dia}-p${i + 1}.jpg`)
}
```

- [ ] **Paso 4: ejecutar** — `npx vitest run src/core/geometria.test.ts src/core/nombres.test.ts` → **PASS** (10 pruebas).

- [ ] **Paso 5: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add src/core/geometria.ts src/core/geometria.test.ts src/core/nombres.ts src/core/nombres.test.ts
git commit -m "feat: geometría de recuadros y nombres de los ficheros exportados"
```

**Criterio de aceptación:** `npx vitest run src/core/geometria.test.ts src/core/nombres.test.ts` → 10 passed.

---

### Tarea 5 — Marca de agua y procesado de páginas (Sonnet 5.5)

> Escalar a Opus 5.5 si los casos límite se resisten.

**Archivos:**
- Crear: `src/core/marca.ts`, `src/core/procesar.ts`
- Prueba: `src/core/procesar.test.ts`

**Interfaces:**
- Consume: `Pagina`, `Opciones`, `Densidad`, `Recuadro` (tipos); `PIXELES_POR_PUNTO` (limites); `aPixelesEnteros`, `escalaParaLadoMaximo` (geometria).
- Produce:
  - `tamanoFuente(ancho, alto, densidad, pixelesPorPunto = PIXELES_POR_PUNTO): number`
  - `dibujarMarca(ctx: CanvasRenderingContext2D, ancho, alto, texto: string, opacidad: number /* 10..90 */, densidad: Densidad, pixelesPorPunto = PIXELES_POR_PUNTO): void`
  - `type OpcionesProcesado = Pick<Opciones, 'opacidad' | 'densidad' | 'color'>`
  - `aGrises(ctx, ancho, alto): void`
  - `procesarPagina(pagina: Pagina, texto: string, opciones: OpcionesProcesado, ladoMaximo?: number): HTMLCanvasElement`

- [ ] **Paso 1: escribir las pruebas**

`src/core/procesar.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { tamanoFuente } from './marca'
import { procesarPagina, type OpcionesProcesado } from './procesar'
import type { Pagina, Recuadro } from './tipos'

const TEXTO = 'Copia para PRUEBA · Solo para test · 10/10/2026 · No válida para otro uso'
const GRISES: OpcionesProcesado = { opacidad: 40, densidad: 'normal', color: false }
const COLOR: OpcionesProcesado = { ...GRISES, color: true }

async function crearPagina(
  ancho: number,
  alto: number,
  relleno: string | null,
  recuadros: Recuadro[] = [],
): Promise<Pagina> {
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')!
  if (relleno) {
    ctx.fillStyle = relleno
    ctx.fillRect(0, 0, ancho, alto)
  }
  return {
    id: 'p',
    imagen: await createImageBitmap(lienzo),
    anchoPx: ancho,
    altoPx: alto,
    anchoPt: (ancho * 72) / 200,
    altoPt: (alto * 72) / 200,
    recuadros,
  }
}

function datos(lienzo: HTMLCanvasElement, x = 0, y = 0, ancho = lienzo.width, alto = lienzo.height) {
  return lienzo.getContext('2d')!.getImageData(x, y, ancho, alto).data
}

/** Valor mínimo y máximo de los canales RGB (sin alfa). */
function extremos(d: Uint8ClampedArray) {
  let minimo = 255
  let maximo = 0
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      minimo = Math.min(minimo, d[i + c])
      maximo = Math.max(maximo, d[i + c])
    }
  }
  return { minimo, maximo }
}

function oscuros(d: Uint8ClampedArray, umbral = 235) {
  let n = 0
  for (let i = 0; i < d.length; i += 4) if (d[i] < umbral) n++
  return n
}

describe('tamanoFuente', () => {
  it('es proporcional a la página con un mínimo de 7 pt', () => {
    expect(tamanoFuente(1654, 2339, 'normal', 200 / 72)).toBeCloseTo(1654 / 45)
    expect(tamanoFuente(100, 100, 'normal', 200 / 72)).toBeCloseTo((7 * 200) / 72)
    expect(tamanoFuente(1654, 2339, 'baja', 200 / 72)).toBeCloseTo((1654 / 45) * 1.3)
  })
})

describe('procesarPagina', () => {
  it('sin texto no dibuja marca', async () => {
    const r = procesarPagina(await crearPagina(300, 200, '#ffffff'), '', GRISES)
    expect(extremos(datos(r)).minimo).toBe(255)
  })

  it('la marca cubre todo el documento (cuadrícula 4 × 4)', async () => {
    const r = procesarPagina(await crearPagina(800, 600, '#ffffff'), TEXTO, GRISES)
    for (let fila = 0; fila < 4; fila++) {
      for (let col = 0; col < 4; col++) {
        expect(oscuros(datos(r, col * 200, fila * 150, 200, 150))).toBeGreaterThan(0)
      }
    }
  })

  it('más densidad, más superficie marcada', async () => {
    const pagina = await crearPagina(800, 600, '#ffffff')
    const cuenta = (densidad: OpcionesProcesado['densidad']) =>
      oscuros(datos(procesarPagina(pagina, TEXTO, { ...GRISES, densidad })))
    expect(cuenta('alta')).toBeGreaterThan(cuenta('normal'))
    expect(cuenta('normal')).toBeGreaterThan(cuenta('baja'))
  })

  it('más opacidad, marca más oscura', async () => {
    const pagina = await crearPagina(400, 300, '#ffffff')
    const minimo = (opacidad: number) => extremos(datos(procesarPagina(pagina, TEXTO, { ...GRISES, opacidad }))).minimo
    expect(minimo(80)).toBeLessThan(minimo(20))
  })

  it('en escala de grises R = G = B en todos los píxeles', async () => {
    const d = datos(procesarPagina(await crearPagina(200, 200, '#ff0000'), TEXTO, GRISES))
    let distintos = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] !== d[i + 1] || d[i + 1] !== d[i + 2]) distintos++
    expect(distintos).toBe(0)
  })

  it('con color se conserva el color fuera de la marca', async () => {
    const d = datos(procesarPagina(await crearPagina(200, 200, '#ff0000'), TEXTO, COLOR))
    let rojos = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 60) rojos++
    expect(rojos).toBeGreaterThan(0)
  })

  it('los recuadros son opacos: dentro solo queda negro y la marca tenue', async () => {
    const recuadro = { id: 'r', x: 0.25, y: 0.25, ancho: 0.5, alto: 0.5 }
    const r = procesarPagina(await crearPagina(400, 300, '#ff0000', [recuadro]), TEXTO, COLOR)
    expect(extremos(datos(r, 100, 75, 200, 150)).maximo).toBeLessThanOrEqual(12)
  })

  it('los recuadros se redondean hacia fuera a píxeles enteros', async () => {
    const recuadro = { id: 'r', x: 0.1003, y: 0.1003, ancho: 0.2, alto: 0.2 }
    const r = procesarPagina(await crearPagina(300, 300, '#ff0000', [recuadro]), '', COLOR)
    expect(extremos(datos(r, 30, 30, 61, 61)).maximo).toBe(0)
  })

  it('las zonas transparentes de un PNG salen blancas', async () => {
    const r = procesarPagina(await crearPagina(100, 100, null), '', COLOR)
    expect(extremos(datos(r, 10, 10, 1, 1)).minimo).toBe(255)
  })

  it('la vista previa respeta el lado máximo; la exportación usa la resolución completa', async () => {
    const pagina = await crearPagina(2400, 1200, '#ffffff')
    const vista = procesarPagina(pagina, TEXTO, GRISES, 1200)
    expect([vista.width, vista.height]).toEqual([1200, 600])
    const completa = procesarPagina(pagina, TEXTO, GRISES)
    expect([completa.width, completa.height]).toEqual([2400, 1200])
  })
})
```

- [ ] **Paso 2: ejecutar** — `npx vitest run src/core/procesar.test.ts` → **FAIL** (no existen `./marca` ni `./procesar`).

- [ ] **Paso 3: implementar**

`src/core/marca.ts` (porta `dibujar_marca` de `docs/referencia/marca_agua_dni.py`):

```ts
import { PIXELES_POR_PUNTO } from './limites'
import type { Densidad } from './tipos'

export const FACTORES_DENSIDAD: Record<Densidad, { tamano: number; paso: number }> = {
  baja: { tamano: 1.3, paso: 3.6 },
  normal: { tamano: 1, paso: 2.6 },
  alta: { tamano: 0.85, paso: 2.1 },
}

/** −30°: con el eje y del canvas hacia abajo, el texto sube de izquierda a derecha. */
export const ANGULO_MARCA = -Math.PI / 6
export const COLOR_MARCA = 'rgb(25, 25, 25)'
export const FUENTE_MARCA = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const SEPARACION = '     '

export function tamanoFuente(
  ancho: number,
  alto: number,
  densidad: Densidad,
  pixelesPorPunto: number = PIXELES_POR_PUNTO,
): number {
  return Math.max(7 * pixelesPorPunto, Math.min(ancho, alto) / 45) * FACTORES_DENSIDAD[densidad].tamano
}

/** Texto diagonal repetido sobre toda la superficie; las filas impares se desplazan media línea. */
export function dibujarMarca(
  ctx: CanvasRenderingContext2D,
  ancho: number,
  alto: number,
  texto: string,
  opacidad: number,
  densidad: Densidad,
  pixelesPorPunto: number = PIXELES_POR_PUNTO,
): void {
  if (!texto.trim()) return
  const tamano = tamanoFuente(ancho, alto, densidad, pixelesPorPunto)
  const paso = tamano * FACTORES_DENSIDAD[densidad].paso
  ctx.save()
  ctx.globalAlpha = opacidad / 100
  ctx.fillStyle = COLOR_MARCA
  ctx.font = `${tamano}px ${FUENTE_MARCA}`
  const linea = texto + SEPARACION
  const anchoLinea = ctx.measureText(linea).width
  // Se rellena un cuadrado que cubre la página incluso después de girarlo.
  const radio = Math.hypot(ancho, alto)
  const fila = linea.repeat(Math.ceil((2 * radio) / anchoLinea) + 2)
  ctx.translate(ancho / 2, alto / 2)
  ctx.rotate(ANGULO_MARCA)
  for (let y = -radio, i = 0; y < radio; y += paso, i++) {
    ctx.fillText(fila, -radio - (i % 2) * (anchoLinea / 2), y)
  }
  ctx.restore()
}
```

`src/core/procesar.ts`:

```ts
import { aPixelesEnteros, escalaParaLadoMaximo } from './geometria'
import { PIXELES_POR_PUNTO } from './limites'
import { dibujarMarca } from './marca'
import type { Opciones, Pagina } from './tipos'

export type OpcionesProcesado = Pick<Opciones, 'opacidad' | 'densidad' | 'color'>

/** Luminancia BT.601, igual en los tres canales. Se evita `ctx.filter`, poco fiable en Safari. */
export function aGrises(ctx: CanvasRenderingContext2D, ancho: number, alto: number): void {
  const imagen = ctx.getImageData(0, 0, ancho, alto)
  const p = imagen.data
  for (let i = 0; i < p.length; i += 4) {
    const y = Math.round(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2])
    p[i] = y
    p[i + 1] = y
    p[i + 2] = y
  }
  ctx.putImageData(imagen, 0, 0)
}

/**
 * Orden fijo: fondo blanco → imagen → recuadros negros → marca → grises.
 * Sin `ladoMaximo`: resolución completa (exportación). Con él: vista previa reducida.
 */
export function procesarPagina(
  pagina: Pagina,
  texto: string,
  opciones: OpcionesProcesado,
  ladoMaximo?: number,
): HTMLCanvasElement {
  const escala = ladoMaximo ? escalaParaLadoMaximo(pagina.anchoPx, pagina.altoPx, ladoMaximo) : 1
  const ancho = Math.max(1, Math.round(pagina.anchoPx * escala))
  const alto = Math.max(1, Math.round(pagina.altoPx * escala))
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('El navegador no permite dibujar en un canvas 2D')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ancho, alto)
  ctx.drawImage(pagina.imagen, 0, 0, ancho, alto)

  ctx.fillStyle = '#000000'
  for (const recuadro of pagina.recuadros) {
    const p = aPixelesEnteros(recuadro, ancho, alto)
    ctx.fillRect(p.x, p.y, p.ancho, p.alto)
  }

  dibujarMarca(ctx, ancho, alto, texto, opciones.opacidad, opciones.densidad, PIXELES_POR_PUNTO * escala)

  if (!opciones.color) aGrises(ctx, ancho, alto)
  return lienzo
}
```

- [ ] **Paso 4: ejecutar** — `npx vitest run src/core/procesar.test.ts` → **PASS** (11 pruebas).

- [ ] **Paso 5: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add src/core/marca.ts src/core/procesar.ts src/core/procesar.test.ts
git commit -m "feat: marca de agua diagonal, recuadros opacos y escala de grises"
```

**Criterio de aceptación:** `npx vitest run src/core/procesar.test.ts` → 11 passed.

---

### Tarea 6 — Carga de PDF e imágenes (Sonnet 5.5)

> Escalar a Opus 5.5 si los casos límite se resisten.

**Archivos:**
- Crear: `tests/fixtures/generar.mjs` y los ficheros que genera (`dni-ficticio.pdf`, `dni-ficticio-2-paginas.pdf`, `dni-ficticio-cifrado.pdf`, `dni-ficticio.jpg`, `dni-ficticio-exif.jpg`, `no-es-un-pdf.pdf`, `texto.txt`), `src/core/cargar.ts`
- Prueba: `src/core/cargar.test.ts`

**Interfaces:**
- Consume: `Pagina` (tipos); `LADO_MAXIMO_IMAGEN`, `MAXIMO_PAGINAS`, `PPP_RASTERIZADO` (limites); `escalaParaLadoMaximo` (geometria).
- Produce:
  - `type CodigoErrorCarga = 'tipo' | 'heic' | 'pdf-danado' | 'imagen-danada' | 'cancelado'`
  - `class ErrorCarga extends Error { readonly codigo: CodigoErrorCarga }`
  - `type PedirContrasena = (incorrecta: boolean) => Promise<string | null>` (`null` = cancelar)
  - `type ResultadoCarga = { paginas: Pagina[]; omitidas: number }`
  - `cargarArchivo(fichero: File, pedirContrasena: PedirContrasena, maxPaginas = MAXIMO_PAGINAS): Promise<ResultadoCarga>`
  - `esPdf(fichero: File): boolean`
- Geometría de los fixtures (la usan las tareas 10–15): página A4 de 595 × 842 pt; cuadrado **rojo** en x 100–200 pt, y 100–200 pt (desde arriba); cuadrado **azul** en x 400–500 pt, y 100–200 pt; contraseña del PDF cifrado: `clave-de-prueba`.

- [ ] **Paso 1: generador de DNI ficticios**

`tests/fixtures/generar.mjs`:

```js
// Genera los DNI FICTICIOS que usan las pruebas. Ningún dato es real.
// Requiere qpdf y poppler-utils (pdftoppm). Ejecutar: node tests/fixtures/generar.mjs
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const dir = new URL('.', import.meta.url).pathname
const A4 = { ancho: 595, alto: 842 }
// Coordenadas «desde arriba», en puntos PDF. Las pruebas dependen de ellas.
const CUADRADO_ROJO = { x: 100, y: 100, lado: 100 }
const CUADRADO_AZUL = { x: 400, y: 100, lado: 100 }

async function crearPdf(paginas) {
  const doc = await PDFDocument.create({ updateMetadata: false })
  const fuente = await doc.embedFont(StandardFonts.Helvetica)
  const desdeArriba = (y, alto) => A4.alto - y - alto
  for (let n = 0; n < paginas; n++) {
    const p = doc.addPage([A4.ancho, A4.alto])
    p.drawRectangle({ x: CUADRADO_ROJO.x, y: desdeArriba(CUADRADO_ROJO.y, CUADRADO_ROJO.lado), width: CUADRADO_ROJO.lado, height: CUADRADO_ROJO.lado, color: rgb(1, 0, 0) })
    p.drawRectangle({ x: CUADRADO_AZUL.x, y: desdeArriba(CUADRADO_AZUL.y, CUADRADO_AZUL.lado), width: CUADRADO_AZUL.lado, height: CUADRADO_AZUL.lado, color: rgb(0, 0, 1) })
    p.drawRectangle({ x: 100, y: desdeArriba(300, 160), width: 400, height: 160, color: rgb(0.85, 0.92, 1), borderColor: rgb(0, 0, 0), borderWidth: 1 })
    const lineas = [
      'DOCUMENTO DE PRUEBA - DATOS FICTICIOS',
      'APELLIDOS: ESPAÑOL ESPAÑOL',
      'NOMBRE: CARMEN',
      'DNI 99999999R',
      `VALIDEZ 01 01 2031 - PÁGINA ${n + 1}`,
    ]
    lineas.forEach((t, i) => p.drawText(t, { x: 120, y: desdeArriba(330 + i * 24, 0), size: 14, font: fuente }))
  }
  return doc.save()
}

// Inserta un segmento APP1 «Exif» mínimo tras el SOI, para comprobar que la app lo elimina.
function conExif(jpeg) {
  const tiff = Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
  const carga = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff])
  const cabecera = Buffer.from([0xff, 0xe1, (carga.length + 2) >> 8, (carga.length + 2) & 0xff])
  return Buffer.concat([jpeg.subarray(0, 2), cabecera, carga, jpeg.subarray(2)])
}

writeFileSync(`${dir}dni-ficticio.pdf`, await crearPdf(1))
writeFileSync(`${dir}dni-ficticio-2-paginas.pdf`, await crearPdf(2))
execFileSync('qpdf', ['--encrypt', 'clave-de-prueba', 'propietario', '256', '--', `${dir}dni-ficticio.pdf`, `${dir}dni-ficticio-cifrado.pdf`])
execFileSync('pdftoppm', ['-jpeg', '-r', '100', '-singlefile', `${dir}dni-ficticio.pdf`, `${dir}dni-ficticio`])
writeFileSync(`${dir}dni-ficticio-exif.jpg`, conExif(readFileSync(`${dir}dni-ficticio.jpg`)))
writeFileSync(`${dir}no-es-un-pdf.pdf`, '%PDF-1.7\nesto no es un PDF válido\n')
writeFileSync(`${dir}texto.txt`, 'un fichero de texto\n')
console.log('Fixtures generados en', dir)
```

```bash
node tests/fixtures/generar.mjs
file tests/fixtures/*
```

Esperado: `dni-ficticio.jpg` de 827 × 1170; `dni-ficticio-exif.jpg` muestra «Exif standard»; el PDF cifrado existe.

- [ ] **Paso 2: escribir las pruebas**

`src/core/cargar.test.ts`:

```ts
import { degrees, PDFDocument } from 'pdf-lib'
import { describe, expect, it, vi } from 'vitest'
import cifradoUrl from '../../tests/fixtures/dni-ficticio-cifrado.pdf?url'
import dosPaginasUrl from '../../tests/fixtures/dni-ficticio-2-paginas.pdf?url'
import jpgUrl from '../../tests/fixtures/dni-ficticio.jpg?url'
import pdfUrl from '../../tests/fixtures/dni-ficticio.pdf?url'
import danadoUrl from '../../tests/fixtures/no-es-un-pdf.pdf?url'
import { cargarArchivo, type PedirContrasena } from './cargar'

async function fichero(url: string, nombre: string, tipo: string): Promise<File> {
  const blob = await (await fetch(url)).blob()
  return new File([blob], nombre, { type: tipo })
}

const sinContrasena = (): PedirContrasena => vi.fn(async () => null)

function pixel(imagen: ImageBitmap, x: number, y: number) {
  const lienzo = document.createElement('canvas')
  lienzo.width = imagen.width
  lienzo.height = imagen.height
  const ctx = lienzo.getContext('2d')!
  ctx.drawImage(imagen, 0, 0)
  return Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3))
}

describe('cargarArchivo · PDF', () => {
  it('rasteriza a 200 ppp y conserva el tamaño en puntos', async () => {
    const pedir = sinContrasena()
    const { paginas, omitidas } = await cargarArchivo(await fichero(pdfUrl, 'dni.pdf', 'application/pdf'), pedir)
    expect(omitidas).toBe(0)
    expect(paginas).toHaveLength(1)
    const [p] = paginas
    expect([p.anchoPx, p.altoPx]).toEqual([1653, 2339])
    expect([p.anchoPt, p.altoPt]).toEqual([595, 842])
    expect(p.recuadros).toEqual([])
    const [r, g] = pixel(p.imagen, Math.round((150 * 200) / 72), Math.round((150 * 200) / 72))
    expect(r).toBeGreaterThan(200)
    expect(g).toBeLessThan(60)
    expect(pedir).not.toHaveBeenCalled()
  })

  it('no rasteriza más páginas de las que caben', async () => {
    const f = await fichero(dosPaginasUrl, 'dos.pdf', 'application/pdf')
    const { paginas, omitidas } = await cargarArchivo(f, sinContrasena(), 1)
    expect(paginas).toHaveLength(1)
    expect(omitidas).toBe(1)
  })

  it('respeta la rotación de la página', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([595, 842]).setRotation(degrees(90))
    const f = new File([new Uint8Array(await doc.save())], 'rotado.pdf', { type: 'application/pdf' })
    const [p] = (await cargarArchivo(f, sinContrasena())).paginas
    expect([Math.round(p.anchoPt), Math.round(p.altoPt)]).toEqual([842, 595])
    expect([p.anchoPx, p.altoPx]).toEqual([2339, 1653])
  })

  it('pide la contraseña y vuelve a pedirla si es incorrecta', async () => {
    const pedir = vi.fn<PedirContrasena>().mockResolvedValueOnce('mala').mockResolvedValueOnce('clave-de-prueba')
    const { paginas } = await cargarArchivo(await fichero(cifradoUrl, 'cifrado.pdf', 'application/pdf'), pedir)
    expect(paginas).toHaveLength(1)
    expect(pedir.mock.calls).toEqual([[false], [true]])
  })

  it('cancelar la contraseña lanza ErrorCarga «cancelado»', async () => {
    const f = await fichero(cifradoUrl, 'cifrado.pdf', 'application/pdf')
    await expect(cargarArchivo(f, sinContrasena())).rejects.toMatchObject({ name: 'ErrorCarga', codigo: 'cancelado' })
  })

  it('un PDF dañado lanza «pdf-danado»', async () => {
    const f = await fichero(danadoUrl, 'roto.pdf', 'application/pdf')
    await expect(cargarArchivo(f, sinContrasena())).rejects.toMatchObject({ codigo: 'pdf-danado' })
  })
})

describe('cargarArchivo · imágenes y tipos', () => {
  it('carga un JPG tratándolo como un escaneo a 200 ppp', async () => {
    const [p] = (await cargarArchivo(await fichero(jpgUrl, 'dni.jpg', 'image/jpeg'), sinContrasena())).paginas
    expect([p.anchoPx, p.altoPx]).toEqual([827, 1170])
    expect(p.anchoPt).toBeCloseTo((827 * 72) / 200)
  })

  it('reduce las imágenes cuyo lado mayor supera 4096 px', async () => {
    const lienzo = document.createElement('canvas')
    lienzo.width = 5000
    lienzo.height = 1000
    const blob: Blob = await new Promise((ok) => lienzo.toBlob((b) => ok(b!), 'image/png'))
    const [p] = (await cargarArchivo(new File([blob], 'grande.png', { type: 'image/png' }), sinContrasena())).paginas
    expect([p.anchoPx, p.altoPx]).toEqual([4096, 819])
  })

  it('rechaza tipos no admitidos', async () => {
    const f = new File(['hola'], 'notas.txt', { type: 'text/plain' })
    await expect(cargarArchivo(f, sinContrasena())).rejects.toMatchObject({ codigo: 'tipo' })
  })

  it('un HEIC que el navegador no decodifica lanza «heic»', async () => {
    const f = new File([new Uint8Array([1, 2, 3])], 'foto.heic', { type: 'image/heic' })
    await expect(cargarArchivo(f, sinContrasena())).rejects.toMatchObject({ codigo: 'heic' })
  })

  it('una imagen dañada lanza «imagen-danada»', async () => {
    const f = new File([new Uint8Array([0xff, 0xd8, 1, 2])], 'rota.jpg', { type: 'image/jpeg' })
    await expect(cargarArchivo(f, sinContrasena())).rejects.toMatchObject({ codigo: 'imagen-danada' })
  })
})
```

- [ ] **Paso 3: ejecutar** — `npx vitest run src/core/cargar.test.ts` → **FAIL** (no existe `./cargar`).

- [ ] **Paso 4: implementar**

`src/core/cargar.ts`:

```ts
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { escalaParaLadoMaximo } from './geometria'
import { LADO_MAXIMO_IMAGEN, MAXIMO_PAGINAS, PPP_RASTERIZADO } from './limites'
import type { Pagina } from './tipos'

export type CodigoErrorCarga = 'tipo' | 'heic' | 'pdf-danado' | 'imagen-danada' | 'cancelado'

export class ErrorCarga extends Error {
  readonly codigo: CodigoErrorCarga

  constructor(codigo: CodigoErrorCarga) {
    super(`Error de carga: ${codigo}`)
    this.name = 'ErrorCarga'
    this.codigo = codigo
  }
}

/** Pide la contraseña al usuario; `incorrecta` indica que la anterior falló; `null` = cancelar. */
export type PedirContrasena = (incorrecta: boolean) => Promise<string | null>
export type ResultadoCarga = { paginas: Pagina[]; omitidas: number }

export function esPdf(fichero: File): boolean {
  return fichero.type === 'application/pdf' || /\.pdf$/i.test(fichero.name)
}

function esHeic(fichero: File): boolean {
  return /^image\/hei[cf]$/.test(fichero.type) || /\.hei[cf]$/i.test(fichero.name)
}

function esImagen(fichero: File): boolean {
  return fichero.type.startsWith('image/') || /\.(jpe?g|png|webp|hei[cf])$/i.test(fichero.name)
}

/** Recursos de pdf.js servidos desde el propio origen (scripts/copiar-pdfjs.mjs). */
function recursoPdfjs(carpeta: string): string {
  return new URL(`${import.meta.env.BASE_URL}pdfjs/${carpeta}/`, document.baseURI).href
}

async function cargarPdf(fichero: File, pedirContrasena: PedirContrasena, maxPaginas: number): Promise<ResultadoCarga> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const tarea = pdfjs.getDocument({
    data: new Uint8Array(await fichero.arrayBuffer()),
    standardFontDataUrl: recursoPdfjs('standard_fonts'),
    cMapUrl: recursoPdfjs('cmaps'),
    wasmUrl: recursoPdfjs('wasm'),
    iccUrl: recursoPdfjs('iccs'),
  })
  let cancelado = false
  tarea.onPassword = (actualizar: (clave: string) => void, motivo: number) => {
    void pedirContrasena(motivo === pdfjs.PasswordResponses.INCORRECT_PASSWORD).then((clave) => {
      if (clave === null) {
        cancelado = true
        void tarea.destroy() // rechaza tarea.promise
      } else {
        actualizar(clave)
      }
    })
  }

  let documento: Awaited<typeof tarea.promise>
  try {
    documento = await tarea.promise
  } catch {
    throw new ErrorCarga(cancelado ? 'cancelado' : 'pdf-danado')
  }

  try {
    const total = Math.min(documento.numPages, Math.max(0, maxPaginas))
    const paginas: Pagina[] = []
    for (let n = 1; n <= total; n++) {
      const pagina = await documento.getPage(n)
      const enPuntos = pagina.getViewport({ scale: 1 }) // respeta /Rotate
      const vista = pagina.getViewport({ scale: PPP_RASTERIZADO / 72 })
      const lienzo = document.createElement('canvas')
      lienzo.width = Math.round(vista.width)
      lienzo.height = Math.round(vista.height)
      const ctx = lienzo.getContext('2d')
      if (!ctx) throw new ErrorCarga('pdf-danado')
      await pagina.render({ canvas: lienzo, canvasContext: ctx, viewport: vista }).promise
      paginas.push({
        id: crypto.randomUUID(),
        imagen: await createImageBitmap(lienzo),
        anchoPx: lienzo.width,
        altoPx: lienzo.height,
        anchoPt: enPuntos.width,
        altoPt: enPuntos.height,
        recuadros: [],
      })
      pagina.cleanup()
      lienzo.width = 0
      lienzo.height = 0
    }
    return { paginas, omitidas: documento.numPages - total }
  } catch (error) {
    if (error instanceof ErrorCarga) throw error
    throw new ErrorCarga('pdf-danado')
  } finally {
    await documento.destroy()
  }
}

async function cargarImagen(fichero: File): Promise<Pagina> {
  let original: ImageBitmap
  try {
    original = await createImageBitmap(fichero) // aplica la orientación EXIF
  } catch {
    throw new ErrorCarga(esHeic(fichero) ? 'heic' : 'imagen-danada')
  }
  let imagen = original
  const escala = escalaParaLadoMaximo(original.width, original.height, LADO_MAXIMO_IMAGEN)
  if (escala < 1) {
    // Reducción con canvas: Safari no admite resizeWidth/resizeHeight en createImageBitmap.
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.round(original.width * escala)
    lienzo.height = Math.round(original.height * escala)
    lienzo.getContext('2d')?.drawImage(original, 0, 0, lienzo.width, lienzo.height)
    imagen = await createImageBitmap(lienzo)
    original.close()
    lienzo.width = 0
    lienzo.height = 0
  }
  return {
    id: crypto.randomUUID(),
    imagen,
    anchoPx: imagen.width,
    altoPx: imagen.height,
    anchoPt: (imagen.width * 72) / PPP_RASTERIZADO,
    altoPt: (imagen.height * 72) / PPP_RASTERIZADO,
    recuadros: [],
  }
}

export async function cargarArchivo(
  fichero: File,
  pedirContrasena: PedirContrasena,
  maxPaginas: number = MAXIMO_PAGINAS,
): Promise<ResultadoCarga> {
  if (esPdf(fichero)) return cargarPdf(fichero, pedirContrasena, maxPaginas)
  if (esImagen(fichero)) {
    if (maxPaginas <= 0) return { paginas: [], omitidas: 1 }
    return { paginas: [await cargarImagen(fichero)], omitidas: 0 }
  }
  throw new ErrorCarga('tipo')
}
```

- [ ] **Paso 5: ejecutar** — `npx vitest run src/core/cargar.test.ts` → **PASS** (11 pruebas).

Si pdf.js muestra avisos del tipo «Unable to load font data» en la consola de Vitest, no es un fallo: las pruebas solo comprueban formas y colores.

- [ ] **Paso 6: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add tests/fixtures src/core/cargar.ts src/core/cargar.test.ts
git commit -m "feat: carga de PDF (con contraseña y rotación) e imágenes con límites"
```

**Criterio de aceptación:** `npx vitest run src/core/cargar.test.ts` → 11 passed, y `tests/fixtures/` contiene los 7 ficheros generados y `generar.mjs`.

---

### Tarea 7 — Exportación (Sonnet 5.5)

**Archivos:**
- Crear: `src/core/exportar.ts`
- Prueba: `src/core/exportar.test.ts`

**Interfaces:**
- Consume: `procesarPagina` (procesar); `nombresDeSalida` (nombres); `CALIDAD_JPEG` (limites); `Pagina`, `Opciones` (tipos).
- Produce:
  - `PRODUCTOR = 'Protege DNI'`
  - `type PaginaJpeg = { jpeg: Blob; anchoPt: number; altoPt: number }`
  - `canvasAJpeg(lienzo: HTMLCanvasElement): Promise<Blob>`
  - `pdfDesdeJpegs(paginas: PaginaJpeg[]): Promise<Blob>`
  - `generarFicheros(paginas: Pagina[], texto: string, opciones: Opciones, fecha: Date): Promise<File[]>` (procesa página a página para limitar memoria)
  - `puedeCompartir(ficheros: File[], nav?: Partial<Pick<Navigator, 'share' | 'canShare'>>): boolean`
  - `compartir(ficheros: File[], nav?: Pick<Navigator, 'share'>): Promise<'compartido' | 'cancelado'>`
  - `descargar(ficheros: File[]): void`

- [ ] **Paso 1: escribir las pruebas**

`src/core/exportar.test.ts`:

```ts
import { PDFDocument } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canvasAJpeg, compartir, descargar, generarFicheros, pdfDesdeJpegs, puedeCompartir } from './exportar'
import type { Opciones, Pagina } from './tipos'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

function lienzo(ancho: number, alto: number, color = '#ff0000'): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = ancho
  c.height = alto
  const ctx = c.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, ancho, alto)
  return c
}

async function pagina(ancho: number, alto: number): Promise<Pagina> {
  return {
    id: crypto.randomUUID(),
    imagen: await createImageBitmap(lienzo(ancho, alto)),
    anchoPx: ancho,
    altoPx: alto,
    anchoPt: (ancho * 72) / 200,
    altoPt: (alto * 72) / 200,
    recuadros: [],
  }
}

const OPCIONES: Opciones = { opacidad: 40, densidad: 'normal', color: false, formato: 'pdf' }
const FECHA = new Date(2026, 9, 10)
const bytesDe = async (b: Blob) => new Uint8Array(await b.arrayBuffer())
const contieneExif = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes).includes('Exif')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('canvasAJpeg', () => {
  it('genera un JPEG sin segmento EXIF', async () => {
    const bytes = await bytesDe(await canvasAJpeg(lienzo(50, 50)))
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8])
    expect(contieneExif(bytes)).toBe(false)
  })
})

describe('pdfDesdeJpegs', () => {
  it('una página por imagen, con su tamaño y sin metadatos identificativos', async () => {
    const jpegs = [
      { jpeg: await canvasAJpeg(lienzo(100, 140)), anchoPt: 595, altoPt: 842 },
      { jpeg: await canvasAJpeg(lienzo(140, 100)), anchoPt: 842, altoPt: 595 },
    ]
    const pdf = await pdfDesdeJpegs(jpegs)
    expect(pdf.type).toBe('application/pdf')
    const doc = await PDFDocument.load(await bytesDe(pdf), { updateMetadata: false })
    expect(doc.getPageCount()).toBe(2)
    expect(doc.getPage(0).getSize()).toEqual({ width: 595, height: 842 })
    expect(doc.getPage(1).getSize()).toEqual({ width: 842, height: 595 })
    expect(doc.getProducer()).toBe('Protege DNI')
    expect(doc.getTitle()).toBeUndefined()
    expect(doc.getAuthor()).toBeUndefined()
  })

  it('el PDF no tiene texto extraíble ni XMP', async () => {
    const pdf = await pdfDesdeJpegs([{ jpeg: await canvasAJpeg(lienzo(100, 100)), anchoPt: 100, altoPt: 100 }])
    const documento = await pdfjs.getDocument({ data: await bytesDe(pdf) }).promise
    const texto = await (await documento.getPage(1)).getTextContent()
    expect(texto.items).toHaveLength(0)
    expect((await documento.getMetadata()).metadata).toBeNull()
  })
})

describe('generarFicheros', () => {
  it('PDF: un fichero con el nombre fechado', async () => {
    const ficheros = await generarFicheros([await pagina(200, 280), await pagina(200, 280)], 'Copia para PRUEBA', OPCIONES, FECHA)
    expect(ficheros.map((f) => [f.name, f.type])).toEqual([['copia-protegida-2026-10-10.pdf', 'application/pdf']])
    const doc = await PDFDocument.load(await bytesDe(ficheros[0]))
    expect(doc.getPageCount()).toBe(2)
  })

  it('JPG: un fichero por página', async () => {
    const ficheros = await generarFicheros([await pagina(200, 280), await pagina(200, 280)], 'Copia para PRUEBA', { ...OPCIONES, formato: 'jpg' }, FECHA)
    expect(ficheros.map((f) => [f.name, f.type])).toEqual([
      ['copia-protegida-2026-10-10-p1.jpg', 'image/jpeg'],
      ['copia-protegida-2026-10-10-p2.jpg', 'image/jpeg'],
    ])
  })
})

describe('compartir y descargar', () => {
  const ficheros = [new File(['x'], 'copia.pdf', { type: 'application/pdf' })]

  it('puedeCompartir exige share y canShare', () => {
    expect(puedeCompartir(ficheros, {})).toBe(false)
    expect(puedeCompartir(ficheros, { share: async () => {}, canShare: () => false })).toBe(false)
    expect(puedeCompartir(ficheros, { share: async () => {}, canShare: () => true })).toBe(true)
  })

  it('compartir distingue cancelación de error', async () => {
    expect(await compartir(ficheros, { share: async () => {} })).toBe('compartido')
    const cancelar = async () => {
      throw new DOMException('cancelado', 'AbortError')
    }
    expect(await compartir(ficheros, { share: cancelar })).toBe('cancelado')
    const fallar = async () => {
      throw new DOMException('no permitido', 'NotAllowedError')
    }
    await expect(compartir(ficheros, { share: fallar })).rejects.toThrow('no permitido')
  })

  it('descargar pulsa un enlace por fichero con su nombre', () => {
    const nombres: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      nombres.push(this.download)
    })
    descargar([...ficheros, new File(['y'], 'otra.jpg', { type: 'image/jpeg' })])
    expect(nombres).toEqual(['copia.pdf', 'otra.jpg'])
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })
})
```

- [ ] **Paso 2: ejecutar** — `npx vitest run src/core/exportar.test.ts` → **FAIL** (no existe `./exportar`).

- [ ] **Paso 3: implementar**

`src/core/exportar.ts`:

```ts
import { PDFDocument } from 'pdf-lib'
import { CALIDAD_JPEG } from './limites'
import { nombresDeSalida } from './nombres'
import { procesarPagina } from './procesar'
import type { Opciones, Pagina } from './tipos'

export const PRODUCTOR = 'Protege DNI'

export type PaginaJpeg = { jpeg: Blob; anchoPt: number; altoPt: number }

/** Al recodificar en JPEG desaparecen los metadatos EXIF (incluida la ubicación GPS). */
export function canvasAJpeg(lienzo: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo codificar el JPEG'))), 'image/jpeg', CALIDAD_JPEG),
  )
}

/** PDF de imágenes a página completa; sin título, autor, asunto, palabras clave ni XMP. */
export async function pdfDesdeJpegs(paginas: PaginaJpeg[]): Promise<Blob> {
  const documento = await PDFDocument.create({ updateMetadata: false })
  documento.setProducer(PRODUCTOR)
  documento.setCreator(PRODUCTOR)
  for (const p of paginas) {
    const imagen = await documento.embedJpg(new Uint8Array(await p.jpeg.arrayBuffer()))
    documento.addPage([p.anchoPt, p.altoPt]).drawImage(imagen, { x: 0, y: 0, width: p.anchoPt, height: p.altoPt })
  }
  return new Blob([new Uint8Array(await documento.save())], { type: 'application/pdf' })
}

/** Procesa página a página (para limitar la memoria) y devuelve los ficheros listos. */
export async function generarFicheros(paginas: Pagina[], texto: string, opciones: Opciones, fecha: Date): Promise<File[]> {
  const nombres = nombresDeSalida(fecha, opciones.formato, paginas.length)
  const jpegs: PaginaJpeg[] = []
  for (const pagina of paginas) {
    const lienzo = procesarPagina(pagina, texto, opciones)
    jpegs.push({ jpeg: await canvasAJpeg(lienzo), anchoPt: pagina.anchoPt, altoPt: pagina.altoPt })
    lienzo.width = 0
    lienzo.height = 0
  }
  if (opciones.formato === 'pdf') {
    return [new File([await pdfDesdeJpegs(jpegs)], nombres[0], { type: 'application/pdf' })]
  }
  return jpegs.map((j, i) => new File([j.jpeg], nombres[i], { type: 'image/jpeg' }))
}

export function puedeCompartir(
  ficheros: File[],
  nav: Partial<Pick<Navigator, 'share' | 'canShare'>> = navigator,
): boolean {
  return typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: ficheros })
}

/** Debe llamarse directamente desde el clic: Safari exige la activación del usuario. */
export async function compartir(
  ficheros: File[],
  nav: Pick<Navigator, 'share'> = navigator,
): Promise<'compartido' | 'cancelado'> {
  try {
    await nav.share({ files: ficheros, title: 'Copia protegida' })
    return 'compartido'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelado'
    throw error
  }
}

export function descargar(ficheros: File[]): void {
  for (const fichero of ficheros) {
    const url = URL.createObjectURL(fichero)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = fichero.name
    enlace.rel = 'noopener'
    document.body.append(enlace)
    enlace.click()
    enlace.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}
```

- [ ] **Paso 4: ejecutar** — `npx vitest run src/core/exportar.test.ts` → **PASS** (8 pruebas).

- [ ] **Paso 5: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add src/core/exportar.ts src/core/exportar.test.ts
git commit -m "feat: exportación a PDF o JPG sin metadatos, compartir y descargar"
```

**Criterio de aceptación:** `npx vitest run src/core/exportar.test.ts` → 8 passed.

---

### Tarea 8 — Estado de la aplicación (Sonnet 5.5)

**Archivos:**
- Crear: `src/estado/estado.ts`
- Prueba: `src/estado/estado.test.ts`

**Interfaces:**
- Consume: `construirTexto`, `formatearFecha` (texto); `evaluarAvisos` (avisos); `finalidadSugerida` (contenido/plantillas); `MAXIMO_PAGINAS`, `LONGITUD_MAXIMA_TEXTO`, `OPACIDAD_MINIMA`, `OPACIDAD_MAXIMA` (limites); tipos.
- Produce:
  - `type Estado = { paginas: Pagina[]; paginaSeleccionada: string | null; recuadroSeleccionado: string | null; modoTexto: ModoTexto; datosGuiados: DatosGuiados; textoLibre: string; opciones: Opciones }`
  - `type Accion` (unión con `tipo`): `anadir-paginas`, `eliminar-pagina`, `mover-pagina`, `seleccionar-pagina`, `anadir-recuadro`, `seleccionar-recuadro`, `eliminar-recuadro`, `quitar-recuadros`, `cambiar-modo-texto`, `cambiar-caso`, `cambiar-datos-guiados`, `cambiar-texto-libre`, `editar-a-mano`, `cambiar-opciones` (campos exactos en el código).
  - `estadoInicial(hoy: Date): Estado`, `reducir(estado, accion): Estado` (puro), `paginaActual(e): Pagina | undefined`, `textoMarca(e): string`, `avisosDe(e): Aviso[]`.

- [ ] **Paso 1: escribir las pruebas**

`src/estado/estado.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Pagina } from '../core/tipos'
import { avisosDe, estadoInicial, paginaActual, reducir, textoMarca, type Estado } from './estado'

const HOY = new Date(2026, 9, 10)
const pagina = (id: string): Pagina => ({
  id,
  imagen: {} as ImageBitmap,
  anchoPx: 100,
  altoPx: 100,
  anchoPt: 36,
  altoPt: 36,
  recuadros: [],
})
const conPaginas = (...ids: string[]): Estado =>
  reducir(estadoInicial(HOY), { tipo: 'anadir-paginas', paginas: ids.map(pagina) })
const recuadro = (id: string) => ({ id, x: 0.1, y: 0.1, ancho: 0.2, alto: 0.2 })

describe('estadoInicial', () => {
  it('parte de valores seguros y la fecha de hoy', () => {
    const e = estadoInicial(HOY)
    expect(e.opciones).toEqual({ opacidad: 40, densidad: 'normal', color: false, formato: 'pdf' })
    expect(e.modoTexto).toBe('guiado')
    expect(e.datosGuiados).toEqual({
      caso: 'otro',
      destinatario: '',
      finalidad: '',
      referencia: '',
      incluirFecha: true,
      fecha: '10/10/2026',
    })
    expect(e.paginas).toEqual([])
    expect(e.paginaSeleccionada).toBeNull()
  })
})

describe('páginas', () => {
  it('añadir selecciona la primera nueva si no había selección', () => {
    const e = conPaginas('a', 'b')
    expect(e.paginas.map((p) => p.id)).toEqual(['a', 'b'])
    expect(e.paginaSeleccionada).toBe('a')
    expect(reducir(e, { tipo: 'anadir-paginas', paginas: [pagina('c')] }).paginaSeleccionada).toBe('a')
  })

  it('nunca supera 10 páginas', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `p${i}`)
    expect(conPaginas(...ids).paginas).toHaveLength(10)
  })

  it('eliminar la seleccionada selecciona la vecina, o nada si no quedan', () => {
    let e = conPaginas('a', 'b', 'c')
    e = reducir(e, { tipo: 'seleccionar-pagina', id: 'c' })
    e = reducir(e, { tipo: 'eliminar-pagina', id: 'c' })
    expect(e.paginaSeleccionada).toBe('b')
    e = reducir(e, { tipo: 'seleccionar-pagina', id: 'a' })
    e = reducir(e, { tipo: 'eliminar-pagina', id: 'a' })
    expect(e.paginaSeleccionada).toBe('b')
    e = reducir(e, { tipo: 'eliminar-pagina', id: 'b' })
    expect(e.paginaSeleccionada).toBeNull()
  })

  it('mover intercambia con la vecina y no hace nada en los extremos', () => {
    const e = conPaginas('a', 'b')
    expect(reducir(e, { tipo: 'mover-pagina', id: 'a', direccion: 1 }).paginas.map((p) => p.id)).toEqual(['b', 'a'])
    expect(reducir(e, { tipo: 'mover-pagina', id: 'a', direccion: -1 })).toBe(e)
    expect(reducir(e, { tipo: 'mover-pagina', id: 'b', direccion: 1 })).toBe(e)
  })

  it('cambiar de página quita la selección de recuadro', () => {
    let e = conPaginas('a', 'b')
    e = reducir(e, { tipo: 'anadir-recuadro', paginaId: 'a', recuadro: recuadro('r1') })
    expect(e.recuadroSeleccionado).toBe('r1')
    e = reducir(e, { tipo: 'seleccionar-pagina', id: 'b' })
    expect(e.recuadroSeleccionado).toBeNull()
  })
})

describe('recuadros', () => {
  it('añadir, eliminar y quitar todos', () => {
    let e = conPaginas('a')
    e = reducir(e, { tipo: 'anadir-recuadro', paginaId: 'a', recuadro: recuadro('r1') })
    e = reducir(e, { tipo: 'anadir-recuadro', paginaId: 'a', recuadro: recuadro('r2') })
    expect(paginaActual(e)?.recuadros.map((r) => r.id)).toEqual(['r1', 'r2'])
    e = reducir(e, { tipo: 'eliminar-recuadro', paginaId: 'a', id: 'r2' })
    expect(e.recuadroSeleccionado).toBeNull()
    expect(paginaActual(e)?.recuadros.map((r) => r.id)).toEqual(['r1'])
    e = reducir(e, { tipo: 'quitar-recuadros', paginaId: 'a' })
    expect(paginaActual(e)?.recuadros).toEqual([])
  })
})

describe('texto', () => {
  it('elegir caso rellena la finalidad sugerida', () => {
    const e = reducir(estadoInicial(HOY), { tipo: 'cambiar-caso', caso: 'alquiler' })
    expect(e.datosGuiados).toMatchObject({ caso: 'alquiler', finalidad: 'solicitud de alquiler de vivienda' })
  })

  it('editar a mano pasa al modo libre con el texto generado', () => {
    let e = reducir(estadoInicial(HOY), { tipo: 'cambiar-datos-guiados', cambios: { destinatario: 'BANCO X' } })
    e = reducir(e, { tipo: 'editar-a-mano' })
    expect(e.modoTexto).toBe('libre')
    expect(e.textoLibre).toBe('Copia para BANCO X · 10/10/2026 · No válida para otro uso')
  })

  it('el texto libre se limita a 200 caracteres', () => {
    const e = reducir(estadoInicial(HOY), { tipo: 'cambiar-texto-libre', texto: 'x'.repeat(250) })
    expect(e.textoLibre).toHaveLength(200)
  })

  it('textoMarca: en modo libre recorta espacios y un texto solo de espacios queda vacío', () => {
    let e = reducir(estadoInicial(HOY), { tipo: 'cambiar-modo-texto', modo: 'libre' })
    e = reducir(e, { tipo: 'cambiar-texto-libre', texto: '   ' })
    expect(textoMarca(e)).toBe('')
    e = reducir(e, { tipo: 'cambiar-texto-libre', texto: '  Copia para X  ' })
    expect(textoMarca(e)).toBe('Copia para X')
  })
})

describe('opciones y avisos', () => {
  it('la opacidad se limita a 10–90 y se redondea', () => {
    const e = estadoInicial(HOY)
    expect(reducir(e, { tipo: 'cambiar-opciones', cambios: { opacidad: 5 } }).opciones.opacidad).toBe(10)
    expect(reducir(e, { tipo: 'cambiar-opciones', cambios: { opacidad: 95 } }).opciones.opacidad).toBe(90)
    expect(reducir(e, { tipo: 'cambiar-opciones', cambios: { opacidad: 42.4 } }).opciones.opacidad).toBe(42)
  })

  it('avisosDe cuenta los recuadros de todas las páginas', () => {
    let e = conPaginas('a', 'b')
    expect(avisosDe(e).map((a) => a.id)).toContain('sin-recuadros')
    e = reducir(e, { tipo: 'anadir-recuadro', paginaId: 'b', recuadro: recuadro('r1') })
    expect(avisosDe(e).map((a) => a.id)).not.toContain('sin-recuadros')
  })
})
```

- [ ] **Paso 2: ejecutar** — `npx vitest run src/estado/estado.test.ts` → **FAIL** (no existe `./estado`).

- [ ] **Paso 3: implementar**

`src/estado/estado.ts`:

```ts
import { finalidadSugerida } from '../contenido/plantillas'
import { evaluarAvisos } from '../core/avisos'
import { LONGITUD_MAXIMA_TEXTO, MAXIMO_PAGINAS, OPACIDAD_MAXIMA, OPACIDAD_MINIMA } from '../core/limites'
import { construirTexto, formatearFecha } from '../core/texto'
import type { Aviso, CasoId, DatosGuiados, ModoTexto, Opciones, Pagina, Recuadro } from '../core/tipos'

export type Estado = {
  paginas: Pagina[]
  paginaSeleccionada: string | null
  recuadroSeleccionado: string | null
  modoTexto: ModoTexto
  datosGuiados: DatosGuiados
  textoLibre: string
  opciones: Opciones
}

export type Accion =
  | { tipo: 'anadir-paginas'; paginas: Pagina[] }
  | { tipo: 'eliminar-pagina'; id: string }
  | { tipo: 'mover-pagina'; id: string; direccion: -1 | 1 }
  | { tipo: 'seleccionar-pagina'; id: string }
  | { tipo: 'anadir-recuadro'; paginaId: string; recuadro: Recuadro }
  | { tipo: 'seleccionar-recuadro'; id: string | null }
  | { tipo: 'eliminar-recuadro'; paginaId: string; id: string }
  | { tipo: 'quitar-recuadros'; paginaId: string }
  | { tipo: 'cambiar-modo-texto'; modo: ModoTexto }
  | { tipo: 'cambiar-caso'; caso: CasoId }
  | { tipo: 'cambiar-datos-guiados'; cambios: Partial<Omit<DatosGuiados, 'caso'>> }
  | { tipo: 'cambiar-texto-libre'; texto: string }
  | { tipo: 'editar-a-mano' }
  | { tipo: 'cambiar-opciones'; cambios: Partial<Opciones> }

export function estadoInicial(hoy: Date): Estado {
  return {
    paginas: [],
    paginaSeleccionada: null,
    recuadroSeleccionado: null,
    modoTexto: 'guiado',
    datosGuiados: {
      caso: 'otro',
      destinatario: '',
      finalidad: '',
      referencia: '',
      incluirFecha: true,
      fecha: formatearFecha(hoy),
    },
    textoLibre: '',
    opciones: { opacidad: 40, densidad: 'normal', color: false, formato: 'pdf' },
  }
}

const limitarOpacidad = (v: number) => Math.min(OPACIDAD_MAXIMA, Math.max(OPACIDAD_MINIMA, Math.round(v)))

function actualizarPagina(estado: Estado, id: string, cambio: (p: Pagina) => Pagina): Estado {
  return { ...estado, paginas: estado.paginas.map((p) => (p.id === id ? cambio(p) : p)) }
}

/** Reducer puro: no libera imágenes ni toca el DOM (ver useLiberarImagenes). */
export function reducir(estado: Estado, accion: Accion): Estado {
  switch (accion.tipo) {
    case 'anadir-paginas': {
      const nuevas = accion.paginas.slice(0, Math.max(0, MAXIMO_PAGINAS - estado.paginas.length))
      if (nuevas.length === 0) return estado
      return {
        ...estado,
        paginas: [...estado.paginas, ...nuevas],
        paginaSeleccionada: estado.paginaSeleccionada ?? nuevas[0].id,
      }
    }
    case 'eliminar-pagina': {
      const indice = estado.paginas.findIndex((p) => p.id === accion.id)
      if (indice === -1) return estado
      const paginas = estado.paginas.filter((p) => p.id !== accion.id)
      const seleccionada =
        estado.paginaSeleccionada === accion.id
          ? (paginas[Math.min(indice, paginas.length - 1)]?.id ?? null)
          : estado.paginaSeleccionada
      return {
        ...estado,
        paginas,
        paginaSeleccionada: seleccionada,
        recuadroSeleccionado: seleccionada === estado.paginaSeleccionada ? estado.recuadroSeleccionado : null,
      }
    }
    case 'mover-pagina': {
      const i = estado.paginas.findIndex((p) => p.id === accion.id)
      const j = i + accion.direccion
      if (i === -1 || j < 0 || j >= estado.paginas.length) return estado
      const paginas = [...estado.paginas]
      ;[paginas[i], paginas[j]] = [paginas[j], paginas[i]]
      return { ...estado, paginas }
    }
    case 'seleccionar-pagina':
      if (!estado.paginas.some((p) => p.id === accion.id)) return estado
      return {
        ...estado,
        paginaSeleccionada: accion.id,
        recuadroSeleccionado: accion.id === estado.paginaSeleccionada ? estado.recuadroSeleccionado : null,
      }
    case 'anadir-recuadro':
      return {
        ...actualizarPagina(estado, accion.paginaId, (p) => ({ ...p, recuadros: [...p.recuadros, accion.recuadro] })),
        recuadroSeleccionado: accion.recuadro.id,
      }
    case 'seleccionar-recuadro':
      return { ...estado, recuadroSeleccionado: accion.id }
    case 'eliminar-recuadro':
      return {
        ...actualizarPagina(estado, accion.paginaId, (p) => ({
          ...p,
          recuadros: p.recuadros.filter((r) => r.id !== accion.id),
        })),
        recuadroSeleccionado: estado.recuadroSeleccionado === accion.id ? null : estado.recuadroSeleccionado,
      }
    case 'quitar-recuadros':
      return { ...actualizarPagina(estado, accion.paginaId, (p) => ({ ...p, recuadros: [] })), recuadroSeleccionado: null }
    case 'cambiar-modo-texto':
      return { ...estado, modoTexto: accion.modo }
    case 'cambiar-caso':
      return {
        ...estado,
        datosGuiados: { ...estado.datosGuiados, caso: accion.caso, finalidad: finalidadSugerida(accion.caso) },
      }
    case 'cambiar-datos-guiados':
      return { ...estado, datosGuiados: { ...estado.datosGuiados, ...accion.cambios } }
    case 'cambiar-texto-libre':
      return { ...estado, textoLibre: accion.texto.slice(0, LONGITUD_MAXIMA_TEXTO) }
    case 'editar-a-mano':
      return {
        ...estado,
        modoTexto: 'libre',
        textoLibre: construirTexto(estado.datosGuiados).slice(0, LONGITUD_MAXIMA_TEXTO),
      }
    case 'cambiar-opciones': {
      const opciones = { ...estado.opciones, ...accion.cambios }
      return { ...estado, opciones: { ...opciones, opacidad: limitarOpacidad(opciones.opacidad) } }
    }
  }
}

export function paginaActual(estado: Estado): Pagina | undefined {
  return estado.paginas.find((p) => p.id === estado.paginaSeleccionada)
}

/** Texto final de la marca. En modo libre, un texto solo de espacios cuenta como vacío. */
export function textoMarca(estado: Estado): string {
  return estado.modoTexto === 'guiado' ? construirTexto(estado.datosGuiados) : estado.textoLibre.trim()
}

export function avisosDe(estado: Estado): Aviso[] {
  return evaluarAvisos({
    modoTexto: estado.modoTexto,
    datosGuiados: estado.datosGuiados,
    textoLibre: estado.textoLibre,
    opciones: estado.opciones,
    numPaginas: estado.paginas.length,
    numRecuadros: estado.paginas.reduce((n, p) => n + p.recuadros.length, 0),
  })
}
```

- [ ] **Paso 4: ejecutar** — `npx vitest run src/estado/estado.test.ts` → **PASS** (13 pruebas).

- [ ] **Paso 5: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add src/estado
git commit -m "feat: estado de la aplicación con reducer puro y selectores"
```

**Criterio de aceptación:** `npm test` → todas las pruebas unitarias pasan (texto, avisos, geometría, nombres, procesar, cargar, exportar y estado).

---

### Tarea 9 — Esqueleto de la interfaz y páginas informativas (Sonnet 5.5)

**Archivos:**
- Crear: `src/contenido/fuentes.ts`, `src/contenido/buenasPracticas.ts`, `src/contenido/explicaciones.ts`, `src/contenido/privacidad.ts`, `src/ui/useRutaHash.ts`, `src/ui/Cabecera.tsx`, `src/ui/Paso.tsx`, `src/ui/Aviso.tsx`, `src/ui/EnlacesFuentes.tsx`, `src/ui/PorQueImporta.tsx`, `src/ui/PaginaBuenasPracticas.tsx`, `src/ui/PaginaComoComprobarlo.tsx`, `src/ui/Editor.tsx`, `tests/e2e/utilidades.ts`
- Modificar (sustituir entero): `src/App.tsx`, `src/estilos.css`, `tests/e2e/inicio.spec.ts`

**Interfaces:**
- Consume: `Aviso` (tipos).
- Produce:
  - `<Paso numero titulo abiertoInicial? onToggle?(abierto) children?>`: un `<details class="paso">` cuyo `<summary>` contiene el número y el título.
  - `<Aviso aviso>` y `<ListaAvisos avisos>`: cada aviso es un `<p class="aviso aviso--{nivel}" data-aviso="{id}">`.
  - `<PorQueImporta id: IdExplicacion>`: desplegable «ⓘ ¿Por qué importa?».
  - `<EnlacesFuentes fuentes>`: enlaces externos con `target="_blank" rel="noopener noreferrer"`.
  - `useRutaHash(): 'editor' | 'buenas-practicas' | 'como-comprobarlo'`.
  - Contenido: `FUENTES`, `IdFuente`, `BUENAS_PRACTICAS`, `EXPLICACIONES`, `IdExplicacion`, `DISTINTIVO`, `URL_REPOSITORIO`, `MENSAJE_TRAS_EXPORTAR`, `PUNTOS_COMPROBACION`.
  - `tests/e2e/utilidades.ts`: helpers que usan todas las especificaciones e2e posteriores (firmas en el código).

- [ ] **Paso 1: escribir las pruebas e2e**

`tests/e2e/utilidades.ts` (completo; varias funciones se usan a partir de la tarea 10):

```ts
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, type Locator, type Page } from '@playwright/test'
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

export const DIRECTORIO_FIXTURES = fileURLToPath(new URL('../fixtures/', import.meta.url))
export const fixture = (nombre: string): string => `${DIRECTORIO_FIXTURES}${nombre}`

/** Geometría del DNI ficticio A4 (tests/fixtures/generar.mjs), en coordenadas relativas. */
export const CENTRO_ROJO: [number, number] = [0.252, 0.178]
export const CENTRO_AZUL: [number, number] = [0.756, 0.178]
export const ROJO_INTERIOR = { x: 0.19, y: 0.135, ancho: 0.12, alto: 0.085 }
export const AZUL_INTERIOR = { x: 0.69, y: 0.135, ancho: 0.13, alto: 0.085 }
/** Arrastre que cubre el cuadrado rojo con margen. */
export const ARRASTRE_SOBRE_ROJO: [[number, number], [number, number]] = [
  [0.15, 0.1],
  [0.36, 0.26],
]

export function vigilarConsola(page: Page): string[] {
  const errores: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text())
  })
  page.on('pageerror', (e) => errores.push(String(e)))
  return errores
}

export function paso(page: Page, titulo: string): Locator {
  return page.locator('details.paso').filter({ has: page.locator(':scope > summary', { hasText: titulo }) })
}

export async function abrirPaso(page: Page, titulo: string): Promise<void> {
  const detalles = paso(page, titulo)
  if (!(await detalles.evaluate((d: HTMLDetailsElement) => d.open))) {
    await detalles.locator(':scope > summary').click()
  }
}

export async function cargar(page: Page, ...nombres: string[]): Promise<void> {
  await page.getByLabel('Elegir archivo').setInputFiles(nombres.map(fixture))
}

export function lienzoVista(page: Page): Locator {
  return page.locator('canvas[aria-label^="Vista previa"]')
}

export async function esperarVistaPrevia(page: Page): Promise<void> {
  await expect(lienzoVista(page)).toHaveAttribute('data-renderizado', 'si')
}

export async function pixelVista(page: Page, fx: number, fy: number): Promise<[number, number, number]> {
  return lienzoVista(page).evaluate(
    (c: HTMLCanvasElement, [x, y]) => {
      const d = c.getContext('2d')!.getImageData(Math.floor(c.width * x), Math.floor(c.height * y), 1, 1).data
      return [d[0], d[1], d[2]] as [number, number, number]
    },
    [fx, fy] as const,
  )
}

export async function dibujarRecuadro(page: Page, desde: [number, number], hasta: [number, number]): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0))
  const caja = (await page.getByTestId('editor-recuadros').boundingBox())!
  await page.mouse.move(caja.x + caja.width * desde[0], caja.y + caja.height * desde[1])
  await page.mouse.down()
  await page.mouse.move(caja.x + caja.width * hasta[0], caja.y + caja.height * hasta[1], { steps: 5 })
  await page.mouse.up()
}

export async function tocarVista(page: Page, punto: [number, number]): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0))
  const caja = (await page.getByTestId('editor-recuadros').boundingBox())!
  await page.mouse.click(caja.x + caja.width * punto[0], caja.y + caja.height * punto[1])
}

export async function generarYDescargar(page: Page): Promise<{ bytes: Uint8Array; nombre: string }> {
  await abrirPaso(page, 'Exportar')
  await page.getByRole('button', { name: 'Generar copia protegida' }).click()
  const boton = page.getByRole('button', { name: 'Descargar' })
  await expect(boton).toBeVisible()
  const descarga = page.waitForEvent('download')
  await boton.click()
  const d = await descarga
  return { bytes: new Uint8Array(await readFile((await d.path())!)), nombre: d.suggestedFilename() }
}

export async function analizarPdf(bytes: Uint8Array) {
  const pdf = await getDocument({ data: bytes.slice() }).promise
  const paginas = pdf.numPages
  let items = 0
  for (let n = 1; n <= paginas; n++) items += (await (await pdf.getPage(n)).getTextContent()).items.length
  const meta = await pdf.getMetadata()
  await pdf.destroy()
  return { paginas, items, info: meta.info as Record<string, unknown>, xmp: meta.metadata }
}

export async function jpegsDelPdf(bytes: Uint8Array): Promise<Uint8Array[]> {
  const doc = await PDFDocument.load(bytes)
  const jpegs: Uint8Array[] = []
  for (const [, objeto] of doc.context.enumerateIndirectObjects()) {
    if (objeto instanceof PDFRawStream && objeto.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
      jpegs.push(objeto.contents)
    }
  }
  return jpegs
}

export type Region = { x: number; y: number; ancho: number; alto: number }

/** Decodifica el JPEG en el navegador y resume los píxeles de una región relativa. */
export async function estadisticasJpeg(page: Page, jpeg: Uint8Array, region: Region = { x: 0, y: 0, ancho: 1, alto: 1 }) {
  const base64 = Buffer.from(jpeg).toString('base64')
  return page.evaluate(
    async ({ base64, region }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const imagen = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }))
      const lienzo = new OffscreenCanvas(imagen.width, imagen.height)
      const ctx = lienzo.getContext('2d')!
      ctx.drawImage(imagen, 0, 0)
      const x = Math.floor(region.x * imagen.width)
      const y = Math.floor(region.y * imagen.height)
      const w = Math.max(1, Math.floor(region.ancho * imagen.width))
      const h = Math.max(1, Math.floor(region.alto * imagen.height))
      const d = ctx.getImageData(x, y, w, h).data
      let maximo = 0
      let maxDiferenciaCanales = 0
      let r = 0
      let g = 0
      let b = 0
      for (let i = 0; i < d.length; i += 4) {
        maximo = Math.max(maximo, d[i], d[i + 1], d[i + 2])
        maxDiferenciaCanales = Math.max(maxDiferenciaCanales, Math.abs(d[i] - d[i + 1]), Math.abs(d[i + 1] - d[i + 2]), Math.abs(d[i] - d[i + 2]))
        r += d[i]
        g += d[i + 1]
        b += d[i + 2]
      }
      const n = d.length / 4
      return { maximo, maxDiferenciaCanales, mediaR: r / n, mediaG: g / n, mediaB: b / n }
    },
    { base64, region },
  )
}

export function contieneExif(bytes: Uint8Array): boolean {
  return Buffer.from(bytes).includes(Buffer.from('Exif'))
}
```

`tests/e2e/inicio.spec.ts` (sustituir entero):

```ts
import { expect, test } from '@playwright/test'
import { paso, vigilarConsola } from './utilidades.ts'

test('la app carga con su título y su política de seguridad', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Protege DNI')
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("connect-src 'self'")
})

test('muestra el distintivo de privacidad y los cinco pasos', async ({ page }) => {
  const errores = vigilarConsola(page)
  await page.goto('/')
  await expect(page.getByText('Tu documento no sale de este dispositivo')).toBeVisible()
  for (const titulo of ['Documento', 'Ocultar datos (opcional)', 'Texto de la marca', 'Opciones de seguridad', 'Exportar']) {
    await expect(paso(page, titulo)).toBeVisible()
  }
  await expect(paso(page, 'Documento')).toHaveAttribute('open', '')
  expect(errores).toEqual([])
})

test('navega a buenas prácticas, con fuentes seguras, y vuelve', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Buenas prácticas' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Buenas prácticas para compartir tu DNI' })).toBeVisible()
  await expect(page.locator('.lista-practicas > li')).toHaveCount(9)
  const externos = page.locator('a[target="_blank"]')
  expect(await externos.count()).toBeGreaterThan(0)
  for (const enlace of await externos.all()) await expect(enlace).toHaveAttribute('rel', 'noopener noreferrer')
  await page.getByRole('link', { name: 'Volver al editor' }).click()
  await expect(paso(page, 'Documento')).toBeVisible()
})

test('explica cómo comprobar que el documento no sale del dispositivo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: '¿Cómo puedo comprobarlo?' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('¿Cómo puedo comprobar')
  await expect(page.getByRole('heading', { level: 2, name: 'Pruébalo en modo avión' })).toBeVisible()
})
```

- [ ] **Paso 2: ejecutar** — `npx playwright test tests/e2e/inicio.spec.ts --project=escritorio` → **FAIL** (falla la compilación: no existe `paso` en un `utilidades.ts` sin crear, o no aparecen el distintivo ni los pasos).

- [ ] **Paso 3: contenidos**

`src/contenido/fuentes.ts`:

```ts
export type IdFuente = 'aepd-informe' | 'incibe-caso' | 'incibe-017' | 'ocu' | 'policia-genbeta' | 'maldita' | 'aeat-soporte'

export type Fuente = { titulo: string; url: string }

/** Verificadas en la tarea 17 antes de publicar. */
export const FUENTES: Record<IdFuente, Fuente> = {
  'aepd-informe': {
    titulo: 'AEPD — Informe 0048/2023 sobre la copia del DNI',
    url: 'https://www.aepd.es/documento/2023-0048.pdf',
  },
  'incibe-caso': {
    titulo: 'INCIBE — Caso real: suplantado con su DNI',
    url: 'https://www.incibe.es/linea-de-ayuda-en-ciberseguridad/casos-reales/tras-ser-suplantado-con-su-dni-acaba-debiendo-impuestos-la-agencia-tributaria',
  },
  'incibe-017': {
    titulo: 'INCIBE — Línea de Ayuda en Ciberseguridad (017)',
    url: 'https://www.incibe.es/linea-de-ayuda-en-ciberseguridad',
  },
  ocu: {
    titulo: 'OCU — Compartir el DNI con seguridad',
    url: 'https://www.ocu.org/consumo-familia/derechos-consumidor/noticias/compartir-dni-con-seguridad/',
  },
  'policia-genbeta': {
    titulo: 'Genbeta — La Policía explica cómo compartir una imagen del DNI',
    url: 'https://www.genbeta.com/seguridad/policia-explica-como-compartir-imagen-tu-dni-internet-para-evitar-ser-victima-estafas',
  },
  maldita: {
    titulo: 'Maldita — Cómo compartir una foto del DNI de forma segura',
    url: 'https://maldita.es/malditatecnologia/20240709/compartir-forma-segura-foto-dni-recop/',
  },
  'aeat-soporte': {
    titulo: 'Agencia Tributaria — Número de soporte y fechas del DNI',
    url: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/firma-digital-sistema-clave-pin-tecnica/incidencias-tecnicas-clave-pin/obtencion-fecha-dni.html',
  },
}
```

`src/contenido/buenasPracticas.ts`:

```ts
import type { IdFuente } from './fuentes'

export type BuenaPractica = { titulo: string; detalle: string; fuentes: IdFuente[] }

export const BUENAS_PRACTICAS: readonly BuenaPractica[] = [
  {
    titulo: 'Pregunta antes si de verdad necesitan una copia.',
    detalle: 'La AEPD considera excesivo pedirla solo para identificar a alguien; a veces basta con enseñar el DNI o identificarse con certificado digital.',
    fuentes: ['aepd-informe'],
  },
  {
    titulo: 'Envía solo la cara que te pidan.',
    detalle: 'Cuantos menos datos circulen, menos se puede hacer con la copia si se filtra.',
    fuentes: ['ocu'],
  },
  {
    titulo: 'Pon una marca de agua.',
    detalle: 'Indica el destinatario, la finalidad y la fecha, y haz que cubra todo el documento.',
    fuentes: ['ocu', 'maldita'],
  },
  {
    titulo: 'Envíala en blanco y negro.',
    detalle: 'Con menos detalle es más difícil manipularla o hacerla pasar por un original.',
    fuentes: ['policia-genbeta', 'ocu'],
  },
  {
    titulo: 'Oculta los datos que el trámite no necesite.',
    detalle: 'Por ejemplo, la firma o el número de soporte, salvo que te los pidan.',
    fuentes: ['ocu', 'maldita'],
  },
  {
    titulo: 'Usa formatos aplanados.',
    detalle: 'En una imagen o en un PDF de imagen, lo que tapas no se puede recuperar quitando capas.',
    fuentes: ['ocu'],
  },
  {
    titulo: 'Envíala por canales oficiales.',
    detalle: 'Nunca por redes sociales, y no la dejes guardada en la nube ni en los chats.',
    fuentes: ['maldita'],
  },
  {
    titulo: 'Si sospechas un uso fraudulento, actúa.',
    detalle: 'Contacta con la entidad, denúncialo y llama al 017, la línea de ayuda en ciberseguridad de INCIBE.',
    fuentes: ['ocu', 'incibe-017', 'incibe-caso'],
  },
  {
    titulo: 'La marca de agua disuade, pero no es infalible.',
    detalle: 'Reduce el riesgo; no lo elimina.',
    fuentes: [],
  },
]
```

`src/contenido/explicaciones.ts`:

```ts
import type { IdFuente } from './fuentes'

export type IdExplicacion =
  | 'destinatario'
  | 'finalidad'
  | 'referencia'
  | 'fecha'
  | 'opacidad'
  | 'densidad'
  | 'color'
  | 'ocultar'
  | 'formato'

export const EXPLICACIONES: Record<IdExplicacion, { texto: string; fuentes: IdFuente[] }> = {
  destinatario: {
    texto: 'Indicar a quién va dirigida la copia hace que cualquier otra persona o empresa que la reciba vea que no es para ella y la rechace.',
    fuentes: [],
  },
  finalidad: {
    texto: 'Limita la copia a un trámite concreto. Si alguien intenta usarla para otra cosa (abrir una cuenta, pedir un préstamo…), el texto lo delata.',
    fuentes: [],
  },
  referencia: {
    texto: 'Un número de expediente, de contrato o un CUPS ata la copia a un único trámite. Es opcional, pero refuerza mucho la protección.',
    fuentes: [],
  },
  fecha: {
    texto: 'Una copia sin fecha puede reutilizarse indefinidamente. Con fecha, quien la reciba meses después sabrá que no se hizo para su trámite.',
    fuentes: [],
  },
  opacidad: {
    texto: 'Una marca muy tenue es fácil de borrar con un editor o con inteligencia artificial; una muy intensa puede impedir leer los datos y hacer que rechacen el documento. Entre el 30 % y el 60 % es un buen equilibrio.',
    fuentes: [],
  },
  densidad: {
    texto: 'La marca se repite por todo el documento para que no se pueda recortar una zona limpia. Con densidad baja quedan huecos más grandes.',
    fuentes: [],
  },
  color: {
    texto: 'La Policía Nacional y la OCU recomiendan enviar la copia en blanco y negro: con menos detalle es más difícil manipularla o hacerla pasar por un original.',
    fuentes: ['policia-genbeta', 'ocu'],
  },
  ocultar: {
    texto: 'Tapar lo que el trámite no necesita reduce lo que se puede hacer con la copia si se filtra. Los recuadros se integran en la imagen y no se pueden quitar.',
    fuentes: ['ocu', 'maldita'],
  },
  formato: {
    texto: 'Tanto el PDF como el JPG se generan como una imagen plana: sin texto seleccionable, sin capas y sin metadatos (tampoco la ubicación GPS de la foto).',
    fuentes: [],
  },
}
```

`src/contenido/privacidad.ts`:

```ts
export const DISTINTIVO = '🔒 Tu documento no sale de este dispositivo. Todo se procesa en tu navegador.'

export const URL_REPOSITORIO = 'https://github.com/blizarazu/protege-dni'

export const MENSAJE_TRAS_EXPORTAR =
  'Listo. Cuando ya no la necesites, borra la copia de tus descargas y de los chats donde la hayas enviado.'

export const PUNTOS_COMPROBACION: readonly { titulo: string; texto: string }[] = [
  {
    titulo: 'No hay servidor que reciba nada',
    texto: 'Esta web es un conjunto de ficheros estáticos. No existe ningún sitio al que se suba tu documento: todo ocurre dentro de tu navegador.',
  },
  {
    titulo: 'Pruébalo en modo avión',
    texto: 'Después de la primera visita, la app funciona sin conexión. Activa el modo avión y verás que puedes proteger tu documento igual.',
  },
  {
    titulo: 'El navegador lo impide',
    texto: 'La página declara una política de seguridad (CSP) que hace que el propio navegador bloquee cualquier conexión a otros dominios.',
  },
  {
    titulo: 'Puedes revisarlo',
    texto: 'El código es público. Si sabes usar las herramientas de desarrollo del navegador, abre la pestaña Red: al procesar el documento no se hace ninguna petición a otros sitios.',
  },
  {
    titulo: 'Nada se guarda',
    texto: 'Sin cookies, sin analíticas y sin almacenamiento. Al cerrar la pestaña, todo desaparece.',
  },
]
```

- [ ] **Paso 4: componentes**

`src/ui/useRutaHash.ts`:

```ts
import { useEffect, useState } from 'react'

export type Ruta = 'editor' | 'buenas-practicas' | 'como-comprobarlo'

export function rutaDesdeHash(hash: string): Ruta {
  if (hash === '#/buenas-practicas') return 'buenas-practicas'
  if (hash === '#/como-comprobarlo') return 'como-comprobarlo'
  return 'editor'
}

/** Navegación por hash: funciona en GitHub Pages sin configuración del servidor. */
export function useRutaHash(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(() => rutaDesdeHash(window.location.hash))
  useEffect(() => {
    const alCambiar = () => {
      setRuta(rutaDesdeHash(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])
  return ruta
}
```

`src/ui/Cabecera.tsx`:

```tsx
import { DISTINTIVO } from '../contenido/privacidad'

export function Cabecera() {
  return (
    <header className="cabecera">
      <a className="cabecera__nombre" href="#/">
        Protege DNI
      </a>
      <p className="distintivo">
        {DISTINTIVO} <a href="#/como-comprobarlo">¿Cómo puedo comprobarlo?</a>
      </p>
      <nav aria-label="Principal">
        <a href="#/buenas-practicas">Buenas prácticas</a>
      </nav>
    </header>
  )
}
```

`src/ui/Paso.tsx`:

```tsx
import type { ReactNode } from 'react'

type Props = {
  numero: number
  titulo: string
  abiertoInicial?: boolean
  onToggle?: (abierto: boolean) => void
  children?: ReactNode
}

export function Paso({ numero, titulo, abiertoInicial = false, onToggle, children }: Props) {
  return (
    <details className="paso" open={abiertoInicial} onToggle={(e) => onToggle?.(e.currentTarget.open)}>
      <summary>
        <span className="paso__numero" aria-hidden="true">
          {numero}
        </span>
        {titulo}
      </summary>
      <div className="paso__cuerpo">{children}</div>
    </details>
  )
}
```

`src/ui/Aviso.tsx`:

```tsx
import type { Aviso as TipoAviso } from '../core/tipos'

export function Aviso({ aviso }: { aviso: TipoAviso }) {
  const riesgo = aviso.nivel === 'riesgo'
  return (
    <p className={`aviso aviso--${aviso.nivel}`} data-aviso={aviso.id}>
      <span aria-hidden="true">{riesgo ? '⚠️' : 'ℹ️'}</span>
      <span>
        <span className="visualmente-oculto">{riesgo ? 'Riesgo: ' : 'Consejo: '}</span>
        {aviso.mensaje}
      </span>
    </p>
  )
}

export function ListaAvisos({ avisos }: { avisos: TipoAviso[] }) {
  if (avisos.length === 0) return null
  return (
    <div className="avisos">
      {avisos.map((a) => (
        <Aviso key={a.id} aviso={a} />
      ))}
    </div>
  )
}
```

`src/ui/EnlacesFuentes.tsx`:

```tsx
import { FUENTES, type IdFuente } from '../contenido/fuentes'

export function EnlacesFuentes({ fuentes }: { fuentes: readonly IdFuente[] }) {
  if (fuentes.length === 0) return null
  return (
    <span className="fuentes">
      Fuentes:{' '}
      {fuentes.map((id, i) => (
        <span key={id}>
          {i > 0 && ', '}
          <a href={FUENTES[id].url} target="_blank" rel="noopener noreferrer">
            {FUENTES[id].titulo}
          </a>
        </span>
      ))}
    </span>
  )
}
```

`src/ui/PorQueImporta.tsx`:

```tsx
import { EXPLICACIONES, type IdExplicacion } from '../contenido/explicaciones'
import { EnlacesFuentes } from './EnlacesFuentes'

export function PorQueImporta({ id }: { id: IdExplicacion }) {
  const { texto, fuentes } = EXPLICACIONES[id]
  return (
    <details className="por-que">
      <summary>ⓘ ¿Por qué importa?</summary>
      <p>
        {texto} <EnlacesFuentes fuentes={fuentes} />
      </p>
    </details>
  )
}
```

`src/ui/PaginaBuenasPracticas.tsx`:

```tsx
import { BUENAS_PRACTICAS } from '../contenido/buenasPracticas'
import { EnlacesFuentes } from './EnlacesFuentes'

export function PaginaBuenasPracticas() {
  return (
    <main className="pagina-info">
      <h1>Buenas prácticas para compartir tu DNI</h1>
      <ol className="lista-practicas">
        {BUENAS_PRACTICAS.map((p) => (
          <li key={p.titulo}>
            <strong>{p.titulo}</strong> {p.detalle}
            <EnlacesFuentes fuentes={p.fuentes} />
          </li>
        ))}
      </ol>
      <p>
        <a href="#/">Volver al editor</a>
      </p>
    </main>
  )
}
```

`src/ui/PaginaComoComprobarlo.tsx`:

```tsx
import { PUNTOS_COMPROBACION, URL_REPOSITORIO } from '../contenido/privacidad'

export function PaginaComoComprobarlo() {
  return (
    <main className="pagina-info">
      <h1>¿Cómo puedo comprobar que mi documento no sale de mi dispositivo?</h1>
      {PUNTOS_COMPROBACION.map((p) => (
        <section key={p.titulo}>
          <h2>{p.titulo}</h2>
          <p>{p.texto}</p>
        </section>
      ))}
      <p>
        <a href={URL_REPOSITORIO} target="_blank" rel="noopener noreferrer">
          Ver el código en GitHub
        </a>
      </p>
      <p>
        <a href="#/">Volver al editor</a>
      </p>
    </main>
  )
}
```

`src/ui/Editor.tsx` (esqueleto; las tareas 10–14 rellenan cada paso):

```tsx
import { Paso } from './Paso'

export function Editor() {
  return (
    <main className="editor">
      <section className="editor__vista" aria-label="Vista previa" />
      <div className="editor__pasos">
        <Paso numero={1} titulo="Documento" abiertoInicial />
        <Paso numero={2} titulo="Ocultar datos (opcional)" />
        <Paso numero={3} titulo="Texto de la marca" />
        <Paso numero={4} titulo="Opciones de seguridad" />
        <Paso numero={5} titulo="Exportar" />
      </div>
    </main>
  )
}
```

`src/App.tsx` (sustituir entero):

```tsx
import { Cabecera } from './ui/Cabecera'
import { Editor } from './ui/Editor'
import { PaginaBuenasPracticas } from './ui/PaginaBuenasPracticas'
import { PaginaComoComprobarlo } from './ui/PaginaComoComprobarlo'
import { useRutaHash } from './ui/useRutaHash'

export default function App() {
  const ruta = useRutaHash()
  return (
    <>
      <Cabecera />
      {ruta === 'buenas-practicas' && <PaginaBuenasPracticas />}
      {ruta === 'como-comprobarlo' && <PaginaComoComprobarlo />}
      {/* El editor sigue montado (oculto) para no perder lo que el usuario estaba haciendo. */}
      <div hidden={ruta !== 'editor'}>
        <Editor />
      </div>
    </>
  )
}
```

`src/estilos.css` (sustituir entero; incluye las clases que usan las tareas 10–14):

```css
:root {
  --color-primario: #1f3a5f;
  --color-primario-claro: #e8eef6;
  --color-texto: #1b1f24;
  --color-suave: #55606b;
  --color-borde: #d5dbe2;
  --color-fondo: #f6f8fa;
  --color-superficie: #ffffff;
  --color-riesgo-fondo: #fff4ce;
  --color-riesgo-borde: #9a6d00;
  --color-consejo-fondo: #eef1f4;
  --color-consejo-borde: #7a8693;
  --color-error: #b3261e;
  --color-exito: #1e6b3a;
  --radio: 10px;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  color: var(--color-texto);
  background: var(--color-fondo);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
}

a {
  color: var(--color-primario);
}

h1 {
  font-size: 1.5rem;
}

h2 {
  font-size: 1.2rem;
}

.visualmente-oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* Cabecera */
.cabecera {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 16px;
  padding: 10px 16px;
  background: var(--color-primario);
  color: #fff;
}

.cabecera a {
  color: #fff;
}

.cabecera__nombre {
  font-size: 1.15rem;
  font-weight: 700;
  text-decoration: none;
}

.distintivo {
  margin: 0;
  font-size: 0.9rem;
}

/* Editor */
.editor {
  display: grid;
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}

@media (min-width: 900px) {
  .editor {
    grid-template-columns: minmax(340px, 440px) 1fr;
    align-items: start;
  }

  .editor__pasos {
    order: 1;
  }

  .editor__vista {
    order: 2;
    position: sticky;
    top: 72px;
  }
}

/* Pasos */
.paso {
  margin-bottom: 12px;
  background: var(--color-superficie);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio);
}

.paso > summary {
  padding: 12px 16px;
  font-weight: 600;
  cursor: pointer;
}

.paso__numero {
  display: inline-grid;
  place-items: center;
  width: 1.6em;
  height: 1.6em;
  margin-right: 6px;
  border-radius: 50%;
  background: var(--color-primario);
  color: #fff;
  font-size: 0.85rem;
}

.paso__cuerpo {
  padding: 0 16px 16px;
}

/* Controles */
.boton {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border: 1px solid var(--color-primario);
  border-radius: 8px;
  background: var(--color-primario);
  color: #fff;
  font: inherit;
  cursor: pointer;
}

.boton--secundario {
  background: var(--color-superficie);
  color: var(--color-primario);
}

.boton:disabled,
.boton:has(input:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.boton:focus-within {
  outline: 3px solid #8fb3e0;
  outline-offset: 2px;
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}

.campo {
  display: grid;
  gap: 4px;
  margin-bottom: 12px;
}

.campo input[type="text"],
.campo input[type="date"],
.campo input[type="password"],
.campo select,
.campo textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-borde);
  border-radius: 6px;
  font: inherit;
}

.campo--casilla {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contador {
  justify-self: end;
  font-size: 0.85rem;
  color: var(--color-suave);
}

.grupo-radio {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 0 12px;
  padding: 0;
  border: 0;
}

.grupo-radio legend {
  margin-bottom: 4px;
  font-weight: 600;
}

.texto-generado {
  display: block;
  margin: 4px 0 8px;
  padding: 10px;
  border-radius: 8px;
  background: var(--color-primario-claro);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

/* Avisos y explicaciones */
.aviso {
  display: flex;
  gap: 8px;
  margin: 8px 0;
  padding: 8px 12px;
  border-left: 4px solid;
  border-radius: 8px;
  font-size: 0.95rem;
}

.aviso--riesgo {
  background: var(--color-riesgo-fondo);
  border-color: var(--color-riesgo-borde);
}

.aviso--consejo {
  background: var(--color-consejo-fondo);
  border-color: var(--color-consejo-borde);
}

.por-que {
  margin: -4px 0 12px;
  font-size: 0.92rem;
  color: var(--color-suave);
}

.por-que summary {
  color: var(--color-primario);
  cursor: pointer;
}

.fuentes {
  display: block;
  margin-top: 4px;
  font-size: 0.85rem;
  color: var(--color-suave);
}

.error {
  color: var(--color-error);
  font-weight: 600;
}

.exito {
  color: var(--color-exito);
  font-weight: 600;
}

.nota,
.ocupado {
  color: var(--color-suave);
}

.ocupado {
  font-style: italic;
}

/* Documento */
.zona-soltar {
  padding: 16px;
  border: 2px dashed var(--color-borde);
  border-radius: var(--radio);
  text-align: center;
}

.zona-soltar--activa {
  border-color: var(--color-primario);
  background: var(--color-primario-claro);
}

.zona-soltar .acciones {
  justify-content: center;
}

.miniaturas {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.miniatura {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px;
  border: 1px solid var(--color-borde);
  border-radius: 8px;
}

.miniatura--seleccionada {
  border-color: var(--color-primario);
  box-shadow: 0 0 0 2px var(--color-primario-claro);
}

.miniatura__ver {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}

.miniatura__ver canvas {
  width: 48px;
  height: auto;
  border: 1px solid var(--color-borde);
}

.miniatura .acciones {
  margin: 0;
}

.miniatura .boton {
  padding: 6px 10px;
}

/* Vista previa y recuadros */
.vista-previa {
  padding: 8px;
  background: var(--color-superficie);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio);
}

.vista-previa__vacia {
  padding: 48px 16px;
  text-align: center;
  color: var(--color-suave);
}

.vista-previa__lienzo {
  position: relative;
}

.vista-previa canvas {
  display: block;
  width: 100%;
  height: auto;
}

.editor-recuadros {
  position: absolute;
  inset: 0;
  cursor: crosshair;
  touch-action: none;
}

.editor-recuadros__recuadro {
  position: absolute;
  outline: 2px dashed #e0a800;
}

.editor-recuadros__recuadro--seleccionado {
  outline: 3px solid #e0a800;
}

.editor-recuadros__arrastre {
  position: absolute;
  background: rgb(0 0 0 / 0.6);
  outline: 2px dashed #e0a800;
}

.guia {
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-fondo);
  font-size: 0.92rem;
}

.guia h3 {
  margin-top: 0;
  font-size: 1rem;
}

.guia h4 {
  margin: 12px 0 4px;
  font-size: 0.95rem;
}

.guia ul {
  margin: 0;
  padding-left: 20px;
}

/* Exportar */
.resumen-avisos__titulo {
  margin: 8px 0;
  font-size: 1rem;
}

.preparado {
  margin-top: 8px;
  padding: 12px;
  border-radius: 8px;
  background: var(--color-primario-claro);
}

/* Páginas informativas */
.pagina-info {
  max-width: 760px;
  margin: 0 auto;
  padding: 16px;
}

.lista-practicas li {
  margin-bottom: 12px;
}

dialog {
  width: calc(100% - 32px);
  max-width: 380px;
  padding: 16px;
  border: 1px solid var(--color-borde);
  border-radius: var(--radio);
}

dialog::backdrop {
  background: rgb(0 0 0 / 0.4);
}
```

- [ ] **Paso 5: ejecutar** — `npx playwright test tests/e2e/inicio.spec.ts --project=escritorio --project=android` → **PASS** (8 pruebas: 4 por proyecto).

- [ ] **Paso 6: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add src tests/e2e
git commit -m "feat: esqueleto de la interfaz, distintivo de privacidad y páginas informativas"
```

**Criterio de aceptación:** `npx playwright test tests/e2e/inicio.spec.ts --project=escritorio --project=android` → 8 passed.

---

### Tarea 10 — Paso 1 (Documento) y vista previa (Sonnet 5.5)

**Archivos:**
- Crear: `src/contenido/errores.ts`, `src/ui/useLiberarImagenes.ts`, `src/ui/VistaPrevia.tsx`, `src/ui/Miniatura.tsx`, `src/ui/DialogoContrasena.tsx`, `src/ui/PasoDocumento.tsx`
- Modificar (sustituir entero): `src/App.tsx`, `src/ui/Editor.tsx`
- Prueba: `tests/e2e/documento.spec.ts`

**Interfaces:**
- Consume: `cargarArchivo`, `ErrorCarga` (cargar); `procesarPagina` (procesar); `LADO_MAXIMO_VISTA`, `RETARDO_VISTA_MS`, `MAXIMO_PAGINAS` (limites); `Estado`, `Accion`, `estadoInicial`, `reducir`, `paginaActual`, `textoMarca`, `avisosDe` (estado); `Paso`, `ListaAvisos` (tarea 9).
- Produce:
  - `MENSAJES_ERROR: Record<'tipo' | 'heic' | 'pdf-danado' | 'imagen-danada' | 'limite' | 'desconocido' | 'exportar' | 'compartir', string>`
  - `<VistaPrevia pagina numero total texto opciones children?>`: un `<canvas role="img" aria-label="Vista previa de la página N de M">` que pone `data-renderizado="si"` al terminar cada render, y debajo los `children` superpuestos.
  - `<PasoDocumento estado despachar avisos>`, `<DialogoContrasena abierto incorrecta onAceptar onCancelar>`, `<Miniatura imagen etiqueta>`, `useLiberarImagenes(paginas)`.
  - Etiquetas accesibles que usan las pruebas: «Elegir archivo», «Hacer foto», «Ver página N», «Subir página N», «Bajar página N», «Eliminar página N», diálogo «Este PDF está protegido», campo «Contraseña del PDF», botones «Abrir» y «Cancelar».

- [ ] **Paso 1: escribir las pruebas e2e**

`tests/e2e/documento.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { CENTRO_AZUL, cargar, esperarVistaPrevia, paso, pixelVista, vigilarConsola } from './utilidades.ts'

test.describe('Paso 1 · Documento', () => {
  test('carga un PDF y muestra la vista previa en escala de grises', async ({ page }) => {
    const errores = vigilarConsola(page)
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await expect(page.getByRole('button', { name: 'Ver página 1' })).toBeVisible()
    const [r, g, b] = await pixelVista(page, ...CENTRO_AZUL)
    expect(Math.abs(r - g)).toBeLessThanOrEqual(1)
    expect(Math.abs(g - b)).toBeLessThanOrEqual(1)
    expect(errores).toEqual([])
  })

  test('carga una foto JPG', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.jpg')
    await esperarVistaPrevia(page)
    await expect(page.getByRole('button', { name: 'Ver página 1' })).toBeVisible()
  })

  test('pide la contraseña de un PDF cifrado y la vuelve a pedir si es incorrecta', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio-cifrado.pdf')
    const dialogo = page.getByRole('dialog', { name: 'Este PDF está protegido' })
    await expect(dialogo).toBeVisible()
    await dialogo.getByLabel('Contraseña del PDF').fill('mala')
    await dialogo.getByRole('button', { name: 'Abrir' }).click()
    await expect(dialogo.getByRole('alert')).toHaveText('Contraseña incorrecta')
    await dialogo.getByLabel('Contraseña del PDF').fill('clave-de-prueba')
    await dialogo.getByRole('button', { name: 'Abrir' }).click()
    await expect(dialogo).toBeHidden()
    await esperarVistaPrevia(page)
  })

  test('cancelar la contraseña no carga nada ni muestra error', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio-cifrado.pdf')
    const dialogo = page.getByRole('dialog', { name: 'Este PDF está protegido' })
    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialogo).toBeHidden()
    await expect(page.getByRole('button', { name: 'Ver página 1' })).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('rechaza un archivo no compatible y avisa de un PDF dañado', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'texto.txt')
    await expect(page.getByRole('alert')).toHaveText('Este tipo de archivo no es compatible. Usa PDF, JPG o PNG.')
    await cargar(page, 'no-es-un-pdf.pdf')
    await expect(page.getByRole('alert')).toHaveText('No se ha podido leer el PDF. Comprueba que no esté dañado.')
  })

  test('varias páginas: aviso, reordenar y eliminar', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio-2-paginas.pdf')
    await expect(page.getByRole('button', { name: 'Ver página 2' })).toBeVisible()
    // Acotado al paso 1: desde la tarea 14 el mismo aviso aparece también en el resumen del paso 5.
    const aviso = paso(page, 'Documento').getByText('Envía las dos caras solo si te las piden.')
    await expect(aviso).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ver página 1' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Bajar página 1' }).click()
    await expect(page.getByRole('button', { name: 'Ver página 2' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Eliminar página 1' }).click()
    await expect(page.getByRole('button', { name: /^Ver página \d+$/ })).toHaveCount(1)
    await expect(aviso).toHaveCount(0)
  })

  test('no admite más de 10 páginas', async ({ page }) => {
    await page.goto('/')
    await cargar(page, ...Array<string>(6).fill('dni-ficticio-2-paginas.pdf'))
    await expect(page.getByRole('alert')).toHaveText('Solo se admiten 10 páginas.')
    await expect(page.getByRole('button', { name: /^Ver página \d+$/ })).toHaveCount(10)
  })

  test('en móvil ofrece hacer una foto', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'escritorio', 'Solo en dispositivos táctiles')
    await page.goto('/')
    await expect(page.getByText('Hacer foto')).toBeVisible()
  })
})
```

- [ ] **Paso 2: ejecutar** — `npx playwright test tests/e2e/documento.spec.ts --project=escritorio` → **FAIL** (no existe «Elegir archivo»).

- [ ] **Paso 3: implementar**

`src/contenido/errores.ts`:

```ts
import type { CodigoErrorCarga } from '../core/cargar'

type ClaveError = Exclude<CodigoErrorCarga, 'cancelado'> | 'limite' | 'desconocido' | 'exportar' | 'compartir'

/** Nunca incluyen datos del documento. */
export const MENSAJES_ERROR: Record<ClaveError, string> = {
  tipo: 'Este tipo de archivo no es compatible. Usa PDF, JPG o PNG.',
  heic: 'Tu navegador no puede abrir fotos HEIC. Expórtala como JPG o usa «Hacer foto».',
  'pdf-danado': 'No se ha podido leer el PDF. Comprueba que no esté dañado.',
  'imagen-danada': 'No se ha podido abrir la imagen. Comprueba que no esté dañada.',
  limite: 'Solo se admiten 10 páginas.',
  desconocido: 'No se ha podido abrir el archivo.',
  exportar: 'No se ha podido generar el archivo. Prueba con menos páginas o recarga la página.',
  compartir: 'No se ha podido compartir. Prueba con «Descargar».',
}
```

`src/ui/useLiberarImagenes.ts`:

```ts
import { useEffect, useRef } from 'react'
import type { Pagina } from '../core/tipos'

/** Libera la memoria de las imágenes de páginas eliminadas, cuando ya no se pintan. */
export function useLiberarImagenes(paginas: Pagina[]): void {
  const anteriores = useRef<Pagina[]>([])
  useEffect(() => {
    const vigentes = new Set(paginas.map((p) => p.imagen))
    for (const p of anteriores.current) if (!vigentes.has(p.imagen)) p.imagen.close()
    anteriores.current = paginas
  }, [paginas])
}
```

`src/ui/VistaPrevia.tsx`:

```tsx
import { useEffect, useRef, type ReactNode } from 'react'
import { LADO_MAXIMO_VISTA, RETARDO_VISTA_MS } from '../core/limites'
import { procesarPagina } from '../core/procesar'
import type { Opciones, Pagina } from '../core/tipos'

type Props = {
  pagina: Pagina | undefined
  numero: number
  total: number
  texto: string
  opciones: Opciones
  children?: ReactNode
}

export function VistaPrevia({ pagina, numero, total, texto, opciones, children }: Props) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const { opacidad, densidad, color } = opciones

  useEffect(() => {
    const destino = lienzo.current
    if (!pagina || !destino) return
    destino.dataset.renderizado = 'no'
    const temporizador = window.setTimeout(() => {
      const resultado = procesarPagina(pagina, texto, { opacidad, densidad, color }, LADO_MAXIMO_VISTA)
      destino.width = resultado.width
      destino.height = resultado.height
      destino.getContext('2d')?.drawImage(resultado, 0, 0)
      resultado.width = 0
      resultado.height = 0
      destino.dataset.renderizado = 'si'
    }, RETARDO_VISTA_MS)
    return () => window.clearTimeout(temporizador)
  }, [pagina, texto, opacidad, densidad, color])

  if (!pagina) {
    return (
      <div className="vista-previa vista-previa__vacia">Aquí verás la copia protegida cuando cargues un documento.</div>
    )
  }
  return (
    <div className="vista-previa">
      <div className="vista-previa__lienzo">
        <canvas ref={lienzo} role="img" aria-label={`Vista previa de la página ${numero} de ${total}`} />
        {children}
      </div>
    </div>
  )
}
```

`src/ui/Miniatura.tsx`:

```tsx
import { useEffect, useRef } from 'react'

export function Miniatura({ imagen, etiqueta }: { imagen: ImageBitmap; etiqueta: string }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = lienzo.current
    if (!c) return
    const escala = 96 / Math.max(imagen.width, imagen.height)
    c.width = Math.max(1, Math.round(imagen.width * escala))
    c.height = Math.max(1, Math.round(imagen.height * escala))
    c.getContext('2d')?.drawImage(imagen, 0, 0, c.width, c.height)
  }, [imagen])
  return <canvas ref={lienzo} role="img" aria-label={etiqueta} />
}
```

`src/ui/DialogoContrasena.tsx`:

```tsx
import { useEffect, useId, useRef, useState } from 'react'

type Props = {
  abierto: boolean
  incorrecta: boolean
  onAceptar: (clave: string) => void
  onCancelar: () => void
}

export function DialogoContrasena({ abierto, incorrecta, onAceptar, onCancelar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [clave, setClave] = useState('')
  const id = useId()

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  function cancelar() {
    setClave('')
    onCancelar()
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${id}-titulo`}
      onCancel={(e) => {
        e.preventDefault()
        cancelar()
      }}
    >
      {/* Sin acción: se cancela el envío (la CSP tiene form-action 'none'). */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const valor = clave
          setClave('')
          onAceptar(valor)
        }}
      >
        <h2 id={`${id}-titulo`}>Este PDF está protegido</h2>
        {incorrecta && (
          <p className="error" role="alert">
            Contraseña incorrecta
          </p>
        )}
        <div className="campo">
          <label htmlFor={`${id}-clave`}>Contraseña del PDF</label>
          <input id={`${id}-clave`} type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus />
        </div>
        <div className="acciones">
          <button className="boton" type="submit">
            Abrir
          </button>
          <button className="boton boton--secundario" type="button" onClick={cancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
  )
}
```

`src/ui/PasoDocumento.tsx`:

```tsx
import { useState, type ChangeEvent, type Dispatch } from 'react'
import { MENSAJES_ERROR } from '../contenido/errores'
import { cargarArchivo, ErrorCarga } from '../core/cargar'
import { MAXIMO_PAGINAS } from '../core/limites'
import type { Aviso as TipoAviso } from '../core/tipos'
import type { Accion, Estado } from '../estado/estado'
import { ListaAvisos } from './Aviso'
import { DialogoContrasena } from './DialogoContrasena'
import { Miniatura } from './Miniatura'

const ACEPTADOS = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif'

type Peticion = { incorrecta: boolean; resolver: (clave: string | null) => void }
type Props = { estado: Estado; despachar: Dispatch<Accion>; avisos: TipoAviso[] }

const esTactil = () => window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0

export function PasoDocumento({ estado, despachar, avisos }: Props) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [peticion, setPeticion] = useState<Peticion | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [tactil] = useState(esTactil)

  const pedirContrasena = (incorrecta: boolean) =>
    new Promise<string | null>((resolver) => setPeticion({ incorrecta, resolver }))

  async function procesar(ficheros: File[]) {
    if (ficheros.length === 0) return
    setError(null)
    setOcupado(true)
    let total = estado.paginas.length
    try {
      for (const fichero of ficheros) {
        const capacidad = MAXIMO_PAGINAS - total
        if (capacidad <= 0) {
          setError(MENSAJES_ERROR.limite)
          break
        }
        try {
          const { paginas, omitidas } = await cargarArchivo(fichero, pedirContrasena, capacidad)
          total += paginas.length
          if (paginas.length > 0) despachar({ tipo: 'anadir-paginas', paginas })
          if (omitidas > 0) {
            setError(MENSAJES_ERROR.limite)
            break
          }
        } catch (e) {
          if (e instanceof ErrorCarga) {
            const codigo = e.codigo
            if (codigo !== 'cancelado') setError(MENSAJES_ERROR[codigo])
          } else {
            setError(MENSAJES_ERROR.desconocido)
          }
        }
      }
    } finally {
      setOcupado(false)
    }
  }

  function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const ficheros = Array.from(e.target.files ?? [])
    e.target.value = '' // permite volver a elegir el mismo fichero
    void procesar(ficheros)
  }

  const total = estado.paginas.length
  return (
    <>
      <div
        className={`zona-soltar${arrastrando ? ' zona-soltar--activa' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          void procesar(Array.from(e.dataTransfer.files))
        }}
      >
        <p>Carga la copia de tu DNI (PDF, JPG o PNG). También puedes arrastrarla aquí.</p>
        <div className="acciones">
          <label className="boton">
            Elegir archivo
            <input className="visualmente-oculto" type="file" accept={ACEPTADOS} multiple onChange={alElegir} disabled={ocupado} />
          </label>
          {tactil && (
            <label className="boton boton--secundario">
              Hacer foto
              <input className="visualmente-oculto" type="file" accept="image/*" capture="environment" onChange={alElegir} disabled={ocupado} />
            </label>
          )}
        </div>
      </div>
      {ocupado && (
        <p className="ocupado" role="status">
          Procesando…
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {total > 0 && (
        <ol className="miniaturas" aria-label="Páginas">
          {estado.paginas.map((p, i) => {
            const seleccionada = p.id === estado.paginaSeleccionada
            return (
              <li key={p.id} className={`miniatura${seleccionada ? ' miniatura--seleccionada' : ''}`}>
                <button
                  type="button"
                  className="miniatura__ver"
                  aria-label={`Ver página ${i + 1}`}
                  aria-pressed={seleccionada}
                  onClick={() => despachar({ tipo: 'seleccionar-pagina', id: p.id })}
                >
                  <Miniatura imagen={p.imagen} etiqueta={`Miniatura de la página ${i + 1}`} />
                  <span>Página {i + 1}</span>
                </button>
                <div className="acciones">
                  <button type="button" className="boton boton--secundario" aria-label={`Subir página ${i + 1}`} disabled={i === 0} onClick={() => despachar({ tipo: 'mover-pagina', id: p.id, direccion: -1 })}>
                    ↑
                  </button>
                  <button type="button" className="boton boton--secundario" aria-label={`Bajar página ${i + 1}`} disabled={i === total - 1} onClick={() => despachar({ tipo: 'mover-pagina', id: p.id, direccion: 1 })}>
                    ↓
                  </button>
                  <button type="button" className="boton boton--secundario" aria-label={`Eliminar página ${i + 1}`} onClick={() => despachar({ tipo: 'eliminar-pagina', id: p.id })}>
                    Eliminar
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      <ListaAvisos avisos={avisos} />
      <DialogoContrasena
        abierto={peticion !== null}
        incorrecta={peticion?.incorrecta ?? false}
        onAceptar={(clave) => {
          peticion?.resolver(clave)
          setPeticion(null)
        }}
        onCancelar={() => {
          peticion?.resolver(null)
          setPeticion(null)
        }}
      />
    </>
  )
}
```

`src/ui/Editor.tsx` (sustituir entero):

```tsx
import type { Dispatch } from 'react'
import type { NumeroPaso } from '../core/tipos'
import { avisosDe, paginaActual, textoMarca, type Accion, type Estado } from '../estado/estado'
import { Paso } from './Paso'
import { PasoDocumento } from './PasoDocumento'
import { useLiberarImagenes } from './useLiberarImagenes'
import { VistaPrevia } from './VistaPrevia'

type Props = { estado: Estado; despachar: Dispatch<Accion> }

export function Editor({ estado, despachar }: Props) {
  useLiberarImagenes(estado.paginas)
  const avisos = avisosDe(estado)
  const delPaso = (paso: NumeroPaso) => avisos.filter((a) => a.paso === paso)
  const texto = textoMarca(estado)
  const pagina = paginaActual(estado)
  const numero = pagina ? estado.paginas.indexOf(pagina) + 1 : 0

  return (
    <main className="editor">
      <section className="editor__vista" aria-label="Vista previa">
        <VistaPrevia pagina={pagina} numero={numero} total={estado.paginas.length} texto={texto} opciones={estado.opciones} />
      </section>
      <div className="editor__pasos">
        <Paso numero={1} titulo="Documento" abiertoInicial>
          <PasoDocumento estado={estado} despachar={despachar} avisos={delPaso(1)} />
        </Paso>
        <Paso numero={2} titulo="Ocultar datos (opcional)" />
        <Paso numero={3} titulo="Texto de la marca" />
        <Paso numero={4} titulo="Opciones de seguridad" />
        <Paso numero={5} titulo="Exportar" />
      </div>
    </main>
  )
}
```

`src/App.tsx` (sustituir entero):

```tsx
import { useReducer } from 'react'
import { estadoInicial, reducir } from './estado/estado'
import { Cabecera } from './ui/Cabecera'
import { Editor } from './ui/Editor'
import { PaginaBuenasPracticas } from './ui/PaginaBuenasPracticas'
import { PaginaComoComprobarlo } from './ui/PaginaComoComprobarlo'
import { useRutaHash } from './ui/useRutaHash'

export default function App() {
  const ruta = useRutaHash()
  const [estado, despachar] = useReducer(reducir, undefined, () => estadoInicial(new Date()))
  return (
    <>
      <Cabecera />
      {ruta === 'buenas-practicas' && <PaginaBuenasPracticas />}
      {ruta === 'como-comprobarlo' && <PaginaComoComprobarlo />}
      {/* El editor sigue montado (oculto) para no perder lo que el usuario estaba haciendo. */}
      <div hidden={ruta !== 'editor'}>
        <Editor estado={estado} despachar={despachar} />
      </div>
    </>
  )
}
```

- [ ] **Paso 4: ejecutar** — `npx playwright test tests/e2e/documento.spec.ts tests/e2e/inicio.spec.ts --project=escritorio --project=android` → **PASS**.

Si «en móvil ofrece hacer una foto» falla en `android`, comprueba con `page.evaluate(() => navigator.maxTouchPoints)` que la emulación táctil está activa antes de tocar el código.

- [ ] **Paso 5: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add src tests/e2e
git commit -m "feat: paso de documento con carga, contraseña, miniaturas y vista previa en vivo"
```

**Criterio de aceptación:** `npx playwright test tests/e2e/documento.spec.ts --project=escritorio --project=android` → todas pasan (la de «Hacer foto» se omite en escritorio).

---

### Tarea 11 — Paso 2 · Ocultar datos (Sonnet 5.5)

> Escalar a Opus 5.5 si los casos límite se resisten.

**Archivos:**
- Crear: `src/contenido/guiaOcultar.ts`, `src/ui/EditorRecuadros.tsx`, `src/ui/GuiaOcultar.tsx`, `src/ui/PasoOcultar.tsx`
- Modificar (sustituir entero): `src/ui/Editor.tsx`
- Prueba: `tests/e2e/ocultar.spec.ts`

**Interfaces:**
- Consume: `normalizar`, `esRecuadroValido`, `recuadroEn` (geometria); `Paso` con `onToggle`; acciones `anadir-recuadro`, `seleccionar-recuadro`, `eliminar-recuadro` y `quitar-recuadros`.
- Produce:
  - `<EditorRecuadros recuadros seleccionado onAnadir(r: Recuadro) onSeleccionar(id | null)>`: capa `data-testid="editor-recuadros"` superpuesta a la vista previa. Solo se monta con el paso 2 abierto.
  - `<PasoOcultar estado despachar avisos>` y `<GuiaOcultar>`.
  - Contenido: `INTRO_GUIA`, `GUIA_OCULTAR`, `CIERRE_GUIA`.
  - Textos que usan las pruebas: «Recuadros en esta página: N», botones «Eliminar recuadro» y «Quitar todos», y los tres títulos de la guía.

- [ ] **Paso 1: escribir las pruebas e2e**

`tests/e2e/ocultar.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import {
  abrirPaso,
  ARRASTRE_SOBRE_ROJO,
  CENTRO_ROJO,
  cargar,
  dibujarRecuadro,
  esperarVistaPrevia,
  paso,
  pixelVista,
  tocarVista,
} from './utilidades.ts'

const AVISO = 'Si el trámite no necesita la firma u otros datos, ocúltalos con un recuadro.'

test.describe('Paso 2 · Ocultar datos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
  })

  test('con el paso cerrado no se pueden dibujar recuadros', async ({ page }) => {
    await expect(page.getByTestId('editor-recuadros')).toHaveCount(0)
  })

  test('dibujar un recuadro tapa el dato en la vista previa', async ({ page }) => {
    await abrirPaso(page, 'Ocultar datos')
    const bloque = paso(page, 'Ocultar datos')
    await expect(bloque.getByText(AVISO)).toBeVisible()
    expect((await pixelVista(page, ...CENTRO_ROJO))[0]).toBeGreaterThan(50)
    await dibujarRecuadro(page, ...ARRASTRE_SOBRE_ROJO)
    await expect(bloque.getByText('Recuadros en esta página: 1')).toBeVisible()
    await expect.poll(async () => (await pixelVista(page, ...CENTRO_ROJO))[0]).toBeLessThanOrEqual(15)
    await expect(bloque.getByText(AVISO)).toHaveCount(0)
  })

  test('eliminar el recuadro seleccionado y quitar todos', async ({ page }) => {
    await abrirPaso(page, 'Ocultar datos')
    const bloque = paso(page, 'Ocultar datos')
    await dibujarRecuadro(page, ...ARRASTRE_SOBRE_ROJO)
    await bloque.getByRole('button', { name: 'Eliminar recuadro' }).click()
    await expect(bloque.getByText('Recuadros en esta página: 0')).toBeVisible()
    await expect.poll(async () => (await pixelVista(page, ...CENTRO_ROJO))[0]).toBeGreaterThan(50)
    await dibujarRecuadro(page, [0.1, 0.4], [0.3, 0.5])
    await dibujarRecuadro(page, [0.5, 0.4], [0.7, 0.5])
    await expect(bloque.getByText('Recuadros en esta página: 2')).toBeVisible()
    await bloque.getByRole('button', { name: 'Quitar todos' }).click()
    await expect(bloque.getByText('Recuadros en esta página: 0')).toBeVisible()
  })

  test('un toque no crea recuadros: selecciona o deselecciona', async ({ page }) => {
    await abrirPaso(page, 'Ocultar datos')
    const bloque = paso(page, 'Ocultar datos')
    const eliminar = bloque.getByRole('button', { name: 'Eliminar recuadro' })
    await dibujarRecuadro(page, ...ARRASTRE_SOBRE_ROJO)
    await tocarVista(page, [0.8, 0.8])
    await expect(eliminar).toBeDisabled()
    await expect(bloque.getByText('Recuadros en esta página: 1')).toBeVisible()
    await tocarVista(page, CENTRO_ROJO)
    await expect(eliminar).toBeEnabled()
  })

  test('muestra la guía de qué se puede ocultar', async ({ page }) => {
    await abrirPaso(page, 'Ocultar datos')
    const bloque = paso(page, 'Ocultar datos')
    await expect(bloque.getByRole('heading', { name: '✅ Normalmente puedes ocultarlo, salvo que te lo pidan expresamente' })).toBeVisible()
    await expect(bloque.getByRole('heading', { name: '⚠️ Ocúltalo solo si sabes que no lo necesitan' })).toBeVisible()
    await expect(bloque.getByRole('heading', { name: '⛔ No lo ocultes: te lo rechazarán' })).toBeVisible()
  })
})
```

- [ ] **Paso 2: ejecutar** — `npx playwright test tests/e2e/ocultar.spec.ts --project=escritorio` → **FAIL** (el paso 2 está vacío).

- [ ] **Paso 3: implementar**

`src/contenido/guiaOcultar.ts` (texto del apéndice A.3 de la especificación; la tarea 17 lo contrasta con fuentes oficiales):

```ts
export type GrupoGuia = {
  nivel: 'ocultable' | 'con-cuidado' | 'no-ocultar'
  titulo: string
  elementos: { dato: string; detalle: string }[]
}

export const INTRO_GUIA =
  'Oculta solo lo que el trámite no necesita. Si tapas de más, te pueden pedir que lo envíes otra vez, y entonces habrá dos copias circulando.'

export const GUIA_OCULTAR: readonly GrupoGuia[] = [
  {
    nivel: 'ocultable',
    titulo: '✅ Normalmente puedes ocultarlo, salvo que te lo pidan expresamente',
    elementos: [
      { dato: 'CAN', detalle: 'el código de 6 cifras de los DNI electrónicos. Sirve para leer el chip y en una copia no aporta nada.' },
      { dato: 'Número de soporte', detalle: 'identifica la tarjeta física y cambia con cada renovación. Algunos servicios lo usan para validar el documento: tápalo solo si no te lo piden.' },
      { dato: 'Firma', detalle: 'ocultarla evita que la copien, y rara vez se compara con una copia.' },
      { dato: 'Nombre de los padres y lugar de nacimiento', detalle: '(en los DNI que los incluyen) se usan a menudo como preguntas de seguridad y casi nunca hacen falta.' },
      { dato: 'Domicilio', detalle: 'salvo que el trámite sea precisamente acreditar dónde vives.' },
    ],
  },
  {
    nivel: 'con-cuidado',
    titulo: '⚠️ Ocúltalo solo si sabes que no lo necesitan',
    elementos: [
      { dato: 'Fotografía', detalle: 'es lo que permite comprobar que el documento es tuyo. INCIBE sugiere pixelarla, pero muchas entidades la exigen.' },
      { dato: 'Zona de lectura mecánica', detalle: '(las líneas con «<<<» del reverso) repite tus datos, pero algunas entidades la leen de forma automática. Si te piden el reverso, suele ser por esta zona o por el domicilio.' },
    ],
  },
  {
    nivel: 'no-ocultar',
    titulo: '⛔ No lo ocultes: te lo rechazarán',
    elementos: [
      { dato: 'Nombre y apellidos, número de DNI, fecha de nacimiento y fecha de validez', detalle: 'son los datos que identifican el documento y demuestran que está en vigor.' },
    ],
  },
]

export const CIERRE_GUIA = 'Si dudas, pregunta a la entidad qué datos necesita antes de enviarlo.'
```

`src/ui/GuiaOcultar.tsx`:

```tsx
import { useId } from 'react'
import { CIERRE_GUIA, GUIA_OCULTAR, INTRO_GUIA } from '../contenido/guiaOcultar'

export function GuiaOcultar() {
  const id = useId()
  return (
    <section className="guia" aria-labelledby={id}>
      <h3 id={id}>Qué puedes ocultar</h3>
      <p>{INTRO_GUIA}</p>
      {GUIA_OCULTAR.map((grupo) => (
        <div key={grupo.nivel}>
          <h4>{grupo.titulo}</h4>
          <ul>
            {grupo.elementos.map((e) => (
              <li key={e.dato}>
                <strong>{e.dato}:</strong> {e.detalle}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p>{CIERRE_GUIA}</p>
    </section>
  )
}
```

`src/ui/EditorRecuadros.tsx`:

```tsx
import { useState, type PointerEvent } from 'react'
import { esRecuadroValido, normalizar, recuadroEn, type Rect } from '../core/geometria'
import type { Recuadro } from '../core/tipos'

type Arrastre = { x1: number; y1: number; x2: number; y2: number; ancho: number; alto: number }
type Props = {
  recuadros: Recuadro[]
  seleccionado: string | null
  onAnadir: (recuadro: Recuadro) => void
  onSeleccionar: (id: string | null) => void
}

const estilo = (r: Rect) => ({
  left: `${r.x * 100}%`,
  top: `${r.y * 100}%`,
  width: `${r.ancho * 100}%`,
  height: `${r.alto * 100}%`,
})

/** Capa sobre la vista previa: arrastrar crea un recuadro; tocar selecciona o deselecciona. */
export function EditorRecuadros({ recuadros, seleccionado, onAnadir, onSeleccionar }: Props) {
  const [arrastre, setArrastre] = useState<Arrastre | null>(null)

  function punto(e: PointerEvent<HTMLDivElement>) {
    const caja = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - caja.left, y: e.clientY - caja.top, ancho: caja.width, alto: caja.height }
  }

  function alPulsar(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = punto(e)
    setArrastre({ x1: p.x, y1: p.y, x2: p.x, y2: p.y, ancho: p.ancho, alto: p.alto })
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    if (!arrastre) return
    const p = punto(e)
    setArrastre({ ...arrastre, x2: p.x, y2: p.y })
  }

  function alSoltar(e: PointerEvent<HTMLDivElement>) {
    if (!arrastre) return
    const p = punto(e)
    const relativo = normalizar(arrastre.x1, arrastre.y1, p.x, p.y, p.ancho, p.alto)
    setArrastre(null)
    if (esRecuadroValido(relativo)) onAnadir({ id: crypto.randomUUID(), ...relativo })
    else onSeleccionar(recuadroEn(recuadros, p.x / p.ancho, p.y / p.alto)?.id ?? null)
  }

  const enCurso = arrastre
    ? normalizar(arrastre.x1, arrastre.y1, arrastre.x2, arrastre.y2, arrastre.ancho, arrastre.alto)
    : null

  return (
    <div
      className="editor-recuadros"
      data-testid="editor-recuadros"
      onPointerDown={alPulsar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={() => setArrastre(null)}
    >
      {recuadros.map((r) => (
        <div
          key={r.id}
          className={`editor-recuadros__recuadro${r.id === seleccionado ? ' editor-recuadros__recuadro--seleccionado' : ''}`}
          style={estilo(r)}
        />
      ))}
      {enCurso && <div className="editor-recuadros__arrastre" style={estilo(enCurso)} />}
    </div>
  )
}
```

`src/ui/PasoOcultar.tsx`:

```tsx
import type { Dispatch } from 'react'
import type { Aviso as TipoAviso } from '../core/tipos'
import { paginaActual, type Accion, type Estado } from '../estado/estado'
import { ListaAvisos } from './Aviso'
import { GuiaOcultar } from './GuiaOcultar'
import { PorQueImporta } from './PorQueImporta'

type Props = { estado: Estado; despachar: Dispatch<Accion>; avisos: TipoAviso[] }

export function PasoOcultar({ estado, despachar, avisos }: Props) {
  const pagina = paginaActual(estado)
  const seleccionado = estado.recuadroSeleccionado
  return (
    <>
      {pagina ? (
        <>
          <p>Arrastra sobre la vista previa para tapar un dato con un recuadro negro. Toca un recuadro para seleccionarlo.</p>
          <p role="status">Recuadros en esta página: {pagina.recuadros.length}</p>
          <div className="acciones">
            <button
              type="button"
              className="boton boton--secundario"
              disabled={!seleccionado}
              onClick={() => seleccionado && despachar({ tipo: 'eliminar-recuadro', paginaId: pagina.id, id: seleccionado })}
            >
              Eliminar recuadro
            </button>
            <button
              type="button"
              className="boton boton--secundario"
              disabled={pagina.recuadros.length === 0}
              onClick={() => despachar({ tipo: 'quitar-recuadros', paginaId: pagina.id })}
            >
              Quitar todos
            </button>
          </div>
        </>
      ) : (
        <p>Primero carga un documento.</p>
      )}
      <PorQueImporta id="ocultar" />
      <ListaAvisos avisos={avisos} />
      <GuiaOcultar />
    </>
  )
}
```

`src/ui/Editor.tsx` (sustituir entero):

```tsx
import { useState, type Dispatch } from 'react'
import type { NumeroPaso } from '../core/tipos'
import { avisosDe, paginaActual, textoMarca, type Accion, type Estado } from '../estado/estado'
import { EditorRecuadros } from './EditorRecuadros'
import { Paso } from './Paso'
import { PasoDocumento } from './PasoDocumento'
import { PasoOcultar } from './PasoOcultar'
import { useLiberarImagenes } from './useLiberarImagenes'
import { VistaPrevia } from './VistaPrevia'

type Props = { estado: Estado; despachar: Dispatch<Accion> }

export function Editor({ estado, despachar }: Props) {
  useLiberarImagenes(estado.paginas)
  // Dibujar solo con el paso 2 abierto: evita crear recuadros al hacer scroll en el móvil.
  const [ocultarActivo, setOcultarActivo] = useState(false)
  const avisos = avisosDe(estado)
  const delPaso = (paso: NumeroPaso) => avisos.filter((a) => a.paso === paso)
  const texto = textoMarca(estado)
  const pagina = paginaActual(estado)
  const numero = pagina ? estado.paginas.indexOf(pagina) + 1 : 0

  return (
    <main className="editor">
      <section className="editor__vista" aria-label="Vista previa">
        <VistaPrevia pagina={pagina} numero={numero} total={estado.paginas.length} texto={texto} opciones={estado.opciones}>
          {ocultarActivo && pagina && (
            <EditorRecuadros
              recuadros={pagina.recuadros}
              seleccionado={estado.recuadroSeleccionado}
              onAnadir={(recuadro) => despachar({ tipo: 'anadir-recuadro', paginaId: pagina.id, recuadro })}
              onSeleccionar={(id) => despachar({ tipo: 'seleccionar-recuadro', id })}
            />
          )}
        </VistaPrevia>
      </section>
      <div className="editor__pasos">
        <Paso numero={1} titulo="Documento" abiertoInicial>
          <PasoDocumento estado={estado} despachar={despachar} avisos={delPaso(1)} />
        </Paso>
        <Paso numero={2} titulo="Ocultar datos (opcional)" onToggle={setOcultarActivo}>
          <PasoOcultar estado={estado} despachar={despachar} avisos={delPaso(2)} />
        </Paso>
        <Paso numero={3} titulo="Texto de la marca" />
        <Paso numero={4} titulo="Opciones de seguridad" />
        <Paso numero={5} titulo="Exportar" />
      </div>
    </main>
  )
}
```

- [ ] **Paso 4: ejecutar** — `npx playwright test tests/e2e/ocultar.spec.ts tests/e2e/documento.spec.ts --project=escritorio --project=android` → **PASS**.

- [ ] **Paso 5: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add src tests/e2e
git commit -m "feat: ocultar datos con recuadros dibujados y guía de qué ocultar"
```

**Criterio de aceptación:** `npx playwright test tests/e2e/ocultar.spec.ts --project=escritorio --project=android` → 10 passed.

---

### Tarea 12 — Paso 3 · Texto de la marca (Sonnet 5.5)

**Archivos:**
- Crear: `src/ui/PasoTexto.tsx`
- Modificar: `src/ui/Editor.tsx` (un import y una línea)
- Prueba: `tests/e2e/texto.spec.ts`

**Interfaces:**
- Consume: `PLANTILLAS` (contenido/plantillas); `construirTexto`, `fechaAIso`, `isoAFecha` (texto); `LONGITUD_MAXIMA_TEXTO` (limites); acciones `cambiar-modo-texto`, `cambiar-caso`, `cambiar-datos-guiados`, `cambiar-texto-libre` y `editar-a-mano`; `PorQueImporta`, `ListaAvisos`.
- Produce: `<PasoTexto estado despachar avisos>`. Etiquetas que usan las pruebas: radios «Guiado» y «Libre»; campos «Caso», «Destinatario», «Finalidad», «Referencia (opcional)», casilla «Incluir fecha», campo «Fecha», salida «Texto generado», botón «Editar a mano», área «Texto de la marca de agua» con contador «N/200».

- [ ] **Paso 1: escribir las pruebas e2e**

`tests/e2e/texto.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { abrirPaso, paso } from './utilidades.ts'

test.describe('Paso 3 · Texto de la marca', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await abrirPaso(page, 'Texto de la marca')
  })

  test('el modo guiado construye el texto y quita los avisos', async ({ page }) => {
    const bloque = paso(page, 'Texto de la marca')
    await expect(bloque.getByText('Sin destinatario, la copia sirve para cualquier trámite.')).toBeVisible()
    await bloque.getByLabel('Caso').selectOption('suministros')
    await expect(bloque.getByLabel('Finalidad')).toHaveValue('cambio de titular o de datos del suministro')
    await bloque.getByLabel('Destinatario').fill('E-DISTRIBUCIÓN')
    await bloque.getByLabel('Fecha', { exact: true }).fill('2026-10-10')
    await expect(bloque.getByLabel('Texto generado')).toHaveText(
      'Copia para E-DISTRIBUCIÓN · Solo para cambio de titular o de datos del suministro · 10/10/2026 · No válida para otro uso',
    )
    await expect(bloque.locator('[data-aviso]')).toHaveCount(0)
  })

  test('sin fecha avisa y oculta el campo de fecha', async ({ page }) => {
    const bloque = paso(page, 'Texto de la marca')
    await bloque.getByLabel('Incluir fecha').uncheck()
    await expect(bloque.getByText('Sin fecha, la copia no caduca y puede reutilizarse dentro de años.')).toBeVisible()
    await expect(bloque.getByLabel('Fecha', { exact: true })).toHaveCount(0)
  })

  test('«Editar a mano» pasa al modo libre con el texto generado', async ({ page }) => {
    const bloque = paso(page, 'Texto de la marca')
    await bloque.getByLabel('Destinatario').fill('BANCO X')
    await bloque.getByRole('button', { name: 'Editar a mano' }).click()
    await expect(bloque.getByLabel('Libre')).toBeChecked()
    await expect(bloque.getByLabel('Texto de la marca de agua')).toHaveValue(/^Copia para BANCO X · /)
  })

  test('un texto libre corto avisa; el texto se limita a 200 caracteres', async ({ page }) => {
    const bloque = paso(page, 'Texto de la marca')
    await bloque.getByLabel('Libre').check()
    const area = bloque.getByLabel('Texto de la marca de agua')
    await area.fill('COPIA')
    await expect(bloque.getByText('Un texto tan corto o genérico (por ejemplo, «COPIA») no indica para quién ni para qué es.')).toBeVisible()
    await expect(bloque.getByText('5/200')).toBeVisible()
    await area.fill('x'.repeat(250))
    await expect(area).toHaveValue('x'.repeat(200))
  })
})
```

- [ ] **Paso 2: ejecutar** — `npx playwright test tests/e2e/texto.spec.ts --project=escritorio` → **FAIL**.

- [ ] **Paso 3: implementar**

`src/ui/PasoTexto.tsx`:

```tsx
import { useId, type Dispatch } from 'react'
import { PLANTILLAS } from '../contenido/plantillas'
import { LONGITUD_MAXIMA_TEXTO } from '../core/limites'
import { construirTexto, fechaAIso, isoAFecha } from '../core/texto'
import type { Aviso as TipoAviso, CasoId, DatosGuiados } from '../core/tipos'
import type { Accion, Estado } from '../estado/estado'
import { ListaAvisos } from './Aviso'
import { PorQueImporta } from './PorQueImporta'

type Props = { estado: Estado; despachar: Dispatch<Accion>; avisos: TipoAviso[] }

export function PasoTexto({ estado, despachar, avisos }: Props) {
  const id = useId()
  const d = estado.datosGuiados
  const cambiar = (cambios: Partial<Omit<DatosGuiados, 'caso'>>) => despachar({ tipo: 'cambiar-datos-guiados', cambios })

  return (
    <>
      <fieldset className="grupo-radio">
        <legend>Modo</legend>
        <label>
          <input type="radio" name="modo-texto" checked={estado.modoTexto === 'guiado'} onChange={() => despachar({ tipo: 'cambiar-modo-texto', modo: 'guiado' })} />{' '}
          Guiado
        </label>
        <label>
          <input type="radio" name="modo-texto" checked={estado.modoTexto === 'libre'} onChange={() => despachar({ tipo: 'cambiar-modo-texto', modo: 'libre' })} />{' '}
          Libre
        </label>
      </fieldset>

      {estado.modoTexto === 'guiado' ? (
        <>
          <div className="campo">
            <label htmlFor={`${id}-caso`}>Caso</label>
            <select id={`${id}-caso`} value={d.caso} onChange={(e) => despachar({ tipo: 'cambiar-caso', caso: e.target.value as CasoId })}>
              {PLANTILLAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor={`${id}-destinatario`}>Destinatario</label>
            <input id={`${id}-destinatario`} type="text" value={d.destinatario} placeholder="p. ej. E-DISTRIBUCIÓN" onChange={(e) => cambiar({ destinatario: e.target.value })} />
          </div>
          <PorQueImporta id="destinatario" />
          <div className="campo">
            <label htmlFor={`${id}-finalidad`}>Finalidad</label>
            <input id={`${id}-finalidad`} type="text" value={d.finalidad} onChange={(e) => cambiar({ finalidad: e.target.value })} />
          </div>
          <PorQueImporta id="finalidad" />
          <div className="campo">
            <label htmlFor={`${id}-referencia`}>Referencia (opcional)</label>
            <input id={`${id}-referencia`} type="text" value={d.referencia} placeholder="Nº de expediente, contrato, CUPS…" onChange={(e) => cambiar({ referencia: e.target.value })} />
          </div>
          <PorQueImporta id="referencia" />
          <label className="campo campo--casilla">
            <input type="checkbox" checked={d.incluirFecha} onChange={(e) => cambiar({ incluirFecha: e.target.checked })} /> Incluir fecha
          </label>
          {d.incluirFecha && (
            <div className="campo">
              <label htmlFor={`${id}-fecha`}>Fecha</label>
              <input id={`${id}-fecha`} type="date" value={fechaAIso(d.fecha)} onChange={(e) => cambiar({ fecha: isoAFecha(e.target.value) })} />
            </div>
          )}
          <PorQueImporta id="fecha" />
          <p>Texto de la marca:</p>
          <output className="texto-generado" aria-label="Texto generado">
            {construirTexto(d)}
          </output>
          <button type="button" className="boton boton--secundario" onClick={() => despachar({ tipo: 'editar-a-mano' })}>
            Editar a mano
          </button>
        </>
      ) : (
        <div className="campo">
          <label htmlFor={`${id}-libre`}>Texto de la marca de agua</label>
          <textarea id={`${id}-libre`} rows={3} maxLength={LONGITUD_MAXIMA_TEXTO} value={estado.textoLibre} onChange={(e) => despachar({ tipo: 'cambiar-texto-libre', texto: e.target.value })} />
          <span className="contador">
            {estado.textoLibre.length}/{LONGITUD_MAXIMA_TEXTO}
          </span>
        </div>
      )}
      <ListaAvisos avisos={avisos} />
    </>
  )
}
```

En `src/ui/Editor.tsx`:
- añadir `import { PasoTexto } from './PasoTexto'` junto a los demás imports de `./Paso…`;
- sustituir la línea `<Paso numero={3} titulo="Texto de la marca" />` por:

```tsx
        <Paso numero={3} titulo="Texto de la marca">
          <PasoTexto estado={estado} despachar={despachar} avisos={delPaso(3)} />
        </Paso>
```

- [ ] **Paso 4: ejecutar** — `npx playwright test tests/e2e/texto.spec.ts --project=escritorio --project=android` → **PASS** (8 pruebas).

- [ ] **Paso 5: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add src tests/e2e
git commit -m "feat: texto de la marca en modo guiado o libre"
```

**Criterio de aceptación:** `npx playwright test tests/e2e/texto.spec.ts --project=escritorio --project=android` → 8 passed.

---

### Tarea 13 — Paso 4 · Opciones de seguridad (Sonnet 5.5)

**Archivos:**
- Crear: `src/ui/PasoOpciones.tsx`
- Modificar: `src/ui/Editor.tsx` (un import y una línea)
- Prueba: `tests/e2e/opciones.spec.ts`

**Interfaces:**
- Consume: acción `cambiar-opciones`; `OPACIDAD_MINIMA`, `OPACIDAD_MAXIMA` (limites); `PorQueImporta`, `ListaAvisos`.
- Produce: `<PasoOpciones opciones despachar avisos>`. Etiquetas que usan las pruebas: deslizador «Opacidad» (10–90, paso 5), radios «Baja», «Normal» y «Alta» bajo «Densidad de la marca», casilla «Mantener el color».

- [ ] **Paso 1: escribir las pruebas e2e**

`tests/e2e/opciones.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { abrirPaso, CENTRO_AZUL, cargar, esperarVistaPrevia, paso, pixelVista } from './utilidades.ts'

test.describe('Paso 4 · Opciones de seguridad', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await abrirPaso(page, 'Opciones de seguridad')
  })

  test('la opacidad avisa por debajo del 25 % y aconseja por encima del 70 %', async ({ page }) => {
    const bloque = paso(page, 'Opciones de seguridad')
    const opacidad = bloque.getByLabel('Opacidad')
    await opacidad.fill('20')
    await expect(bloque.getByText('La marca es tan tenue que es fácil borrarla.')).toBeVisible()
    await opacidad.fill('75')
    await expect(bloque.getByText('Puede que no se lean los datos y te rechacen el documento.')).toBeVisible()
    await opacidad.fill('40')
    await expect(bloque.locator('[data-aviso]')).toHaveCount(0)
    await expect(bloque.getByText('40 %')).toBeVisible()
  })

  test('la densidad baja avisa', async ({ page }) => {
    const bloque = paso(page, 'Opciones de seguridad')
    await bloque.getByLabel('Baja').check()
    await expect(bloque.getByText('Quedan zonas sin cubrir que se pueden recortar.')).toBeVisible()
  })

  test('«Mantener el color» avisa y la vista previa recupera el color', async ({ page }) => {
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    const [r0, , b0] = await pixelVista(page, ...CENTRO_AZUL)
    expect(Math.abs(b0 - r0)).toBeLessThanOrEqual(1)
    const bloque = paso(page, 'Opciones de seguridad')
    await bloque.getByLabel('Mantener el color').check()
    await expect(bloque.getByText('En color es más fácil manipular la copia o imprimirla como si fuera el original.')).toBeVisible()
    await expect.poll(async () => {
      const [r, , b] = await pixelVista(page, ...CENTRO_AZUL)
      return b - r
    }).toBeGreaterThan(80)
  })

  test('«¿Por qué importa?» explica la opción', async ({ page }) => {
    const bloque = paso(page, 'Opciones de seguridad')
    await bloque.getByText('ⓘ ¿Por qué importa?').first().click()
    await expect(bloque.getByText('Entre el 30 % y el 60 % es un buen equilibrio.')).toBeVisible()
  })
})
```

- [ ] **Paso 2: ejecutar** — `npx playwright test tests/e2e/opciones.spec.ts --project=escritorio` → **FAIL**.

- [ ] **Paso 3: implementar**

`src/ui/PasoOpciones.tsx`:

```tsx
import { useId, type Dispatch } from 'react'
import { OPACIDAD_MAXIMA, OPACIDAD_MINIMA } from '../core/limites'
import type { Aviso as TipoAviso, Densidad, Opciones } from '../core/tipos'
import type { Accion } from '../estado/estado'
import { ListaAvisos } from './Aviso'
import { PorQueImporta } from './PorQueImporta'

const DENSIDADES: { valor: Densidad; etiqueta: string }[] = [
  { valor: 'baja', etiqueta: 'Baja' },
  { valor: 'normal', etiqueta: 'Normal' },
  { valor: 'alta', etiqueta: 'Alta' },
]

type Props = { opciones: Opciones; despachar: Dispatch<Accion>; avisos: TipoAviso[] }

export function PasoOpciones({ opciones, despachar, avisos }: Props) {
  const id = useId()
  const cambiar = (cambios: Partial<Opciones>) => despachar({ tipo: 'cambiar-opciones', cambios })
  return (
    <>
      <div className="campo">
        <label htmlFor={`${id}-opacidad`}>Opacidad</label>
        <input
          id={`${id}-opacidad`}
          type="range"
          min={OPACIDAD_MINIMA}
          max={OPACIDAD_MAXIMA}
          step={5}
          value={opciones.opacidad}
          aria-valuetext={`${opciones.opacidad} %`}
          onChange={(e) => cambiar({ opacidad: Number(e.target.value) })}
        />
        <output htmlFor={`${id}-opacidad`}>{opciones.opacidad} %</output>
      </div>
      <PorQueImporta id="opacidad" />
      <fieldset className="grupo-radio">
        <legend>Densidad de la marca</legend>
        {DENSIDADES.map((d) => (
          <label key={d.valor}>
            <input type="radio" name="densidad" checked={opciones.densidad === d.valor} onChange={() => cambiar({ densidad: d.valor })} /> {d.etiqueta}
          </label>
        ))}
      </fieldset>
      <PorQueImporta id="densidad" />
      <label className="campo campo--casilla">
        <input type="checkbox" checked={opciones.color} onChange={(e) => cambiar({ color: e.target.checked })} /> Mantener el color
      </label>
      <PorQueImporta id="color" />
      <ListaAvisos avisos={avisos} />
    </>
  )
}
```

En `src/ui/Editor.tsx`:
- añadir `import { PasoOpciones } from './PasoOpciones'`;
- sustituir la línea `<Paso numero={4} titulo="Opciones de seguridad" />` por:

```tsx
        <Paso numero={4} titulo="Opciones de seguridad">
          <PasoOpciones opciones={estado.opciones} despachar={despachar} avisos={delPaso(4)} />
        </Paso>
```

- [ ] **Paso 4: ejecutar** — `npx playwright test tests/e2e/opciones.spec.ts --project=escritorio --project=android` → **PASS** (8 pruebas).

- [ ] **Paso 5: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add src tests/e2e
git commit -m "feat: opciones de opacidad, densidad y color con explicaciones y avisos"
```

**Criterio de aceptación:** `npx playwright test tests/e2e/opciones.spec.ts --project=escritorio --project=android` → 8 passed.

---

### Tarea 14 — Paso 5 · Exportar (Sonnet 5.5)

**Archivos:**
- Crear: `src/ui/PasoExportar.tsx`
- Modificar: `src/ui/Editor.tsx` (un import y una línea)
- Prueba: `tests/e2e/exportar.spec.ts`

**Interfaces:**
- Consume: `generarFicheros`, `puedeCompartir`, `compartir`, `descargar` (exportar); `MENSAJES_ERROR` (errores); `MENSAJE_TRAS_EXPORTAR` (privacidad); acción `cambiar-opciones` (formato); `ListaAvisos`, `PorQueImporta`.
- Produce: `<PasoExportar estado despachar texto avisos>` con:
  - radios «PDF» y «JPG»;
  - resumen «Avisos activos (N)» o «Sin avisos: la configuración es segura.»;
  - botón «Generar copia protegida» (deshabilitado sin documento o sin texto, con el motivo escrito);
  - tras generar, «Compartir» (solo si `puedeCompartir`) y «Descargar»;
  - mensaje final `MENSAJE_TRAS_EXPORTAR`.
  - La copia generada queda **obsoleta** en cuanto cambian las páginas, el texto o las opciones: sus botones desaparecen.

- [ ] **Paso 1: escribir las pruebas e2e**

`tests/e2e/exportar.spec.ts`:

```ts
import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import {
  abrirPaso,
  analizarPdf,
  ARRASTRE_SOBRE_ROJO,
  AZUL_INTERIOR,
  cargar,
  contieneExif,
  dibujarRecuadro,
  esperarVistaPrevia,
  estadisticasJpeg,
  fixture,
  generarYDescargar,
  jpegsDelPdf,
  paso,
  ROJO_INTERIOR,
  vigilarConsola,
} from './utilidades.ts'

test.describe('Paso 5 · Exportar', () => {
  test('sin documento no se puede generar', async ({ page }) => {
    await page.goto('/')
    await abrirPaso(page, 'Exportar')
    const bloque = paso(page, 'Exportar')
    await expect(bloque.getByRole('button', { name: 'Generar copia protegida' })).toBeDisabled()
    await expect(bloque.getByText('Carga un documento para poder exportarlo.')).toBeVisible()
  })

  test('exporta un PDF aplanado, sin texto ni metadatos y con los datos tapados', async ({ page }) => {
    const errores = vigilarConsola(page)
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Ocultar datos')
    await dibujarRecuadro(page, ...ARRASTRE_SOBRE_ROJO)
    await abrirPaso(page, 'Texto de la marca')
    await paso(page, 'Texto de la marca').getByLabel('Destinatario').fill('EMPRESA DE PRUEBA')
    const { bytes, nombre } = await generarYDescargar(page)
    expect(nombre).toMatch(/^copia-protegida-\d{4}-\d{2}-\d{2}\.pdf$/)
    const analisis = await analizarPdf(bytes)
    expect(analisis.paginas).toBe(1)
    expect(analisis.items).toBe(0)
    expect(analisis.info.Producer).toBe('Protege DNI')
    for (const campo of ['Title', 'Author', 'Subject', 'Keywords']) expect(analisis.info[campo]).toBeUndefined()
    expect(analisis.xmp).toBeNull()
    const [jpeg] = await jpegsDelPdf(bytes)
    expect((await estadisticasJpeg(page, jpeg, ROJO_INTERIOR)).maximo).toBeLessThanOrEqual(60)
    expect((await estadisticasJpeg(page, jpeg)).maxDiferenciaCanales).toBeLessThanOrEqual(3)
    await expect(page.getByText('Listo. Cuando ya no la necesites')).toBeVisible()
    expect(errores).toEqual([])
  })

  test('con «Mantener el color» el PDF conserva el color', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Opciones de seguridad')
    await paso(page, 'Opciones de seguridad').getByLabel('Mantener el color').check()
    const { bytes } = await generarYDescargar(page)
    const [jpeg] = await jpegsDelPdf(bytes)
    const azul = await estadisticasJpeg(page, jpeg, AZUL_INTERIOR)
    expect(azul.mediaB - azul.mediaR).toBeGreaterThan(80)
  })

  test('exporta JPG sin metadatos EXIF', async ({ page }) => {
    expect(contieneExif(new Uint8Array(await readFile(fixture('dni-ficticio-exif.jpg'))))).toBe(true)
    await page.goto('/')
    await cargar(page, 'dni-ficticio-exif.jpg')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Exportar')
    await paso(page, 'Exportar').getByLabel('JPG').check()
    const { bytes, nombre } = await generarYDescargar(page)
    expect(nombre).toMatch(/^copia-protegida-\d{4}-\d{2}-\d{2}-p1\.jpg$/)
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8])
    expect(contieneExif(bytes)).toBe(false)
  })

  test('un texto libre vacío o solo con espacios bloquea la exportación', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Texto de la marca')
    const texto = paso(page, 'Texto de la marca')
    await texto.getByLabel('Libre').check()
    await texto.getByLabel('Texto de la marca de agua').fill('   ')
    await abrirPaso(page, 'Exportar')
    const bloque = paso(page, 'Exportar')
    await expect(bloque.getByRole('button', { name: 'Generar copia protegida' })).toBeDisabled()
    await expect(bloque.getByText('Escribe el texto de la marca de agua.')).toBeVisible()
  })

  test('cambiar una opción después de generar obliga a generar de nuevo', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Exportar')
    const bloque = paso(page, 'Exportar')
    await bloque.getByRole('button', { name: 'Generar copia protegida' }).click()
    await expect(bloque.getByRole('button', { name: 'Descargar' })).toBeVisible()
    await abrirPaso(page, 'Opciones de seguridad')
    await paso(page, 'Opciones de seguridad').getByLabel('Opacidad').fill('50')
    await expect(bloque.getByRole('button', { name: 'Descargar' })).toHaveCount(0)
    await expect(bloque.getByRole('button', { name: 'Generar copia protegida' })).toBeEnabled()
  })

  test('resume los avisos activos', async ({ page }) => {
    await page.goto('/')
    await cargar(page, 'dni-ficticio.pdf')
    await esperarVistaPrevia(page)
    await abrirPaso(page, 'Exportar')
    // Por defecto: sin destinatario, sin finalidad y sin recuadros.
    await expect(paso(page, 'Exportar').getByText('Avisos activos (3)')).toBeVisible()
  })
})
```

- [ ] **Paso 2: ejecutar** — `npx playwright test tests/e2e/exportar.spec.ts --project=escritorio` → **FAIL**.

- [ ] **Paso 3: implementar**

`src/ui/PasoExportar.tsx`:

```tsx
import { useState, type Dispatch } from 'react'
import { MENSAJES_ERROR } from '../contenido/errores'
import { MENSAJE_TRAS_EXPORTAR } from '../contenido/privacidad'
import { compartir, descargar, generarFicheros, puedeCompartir } from '../core/exportar'
import type { Aviso as TipoAviso, Formato } from '../core/tipos'
import type { Accion, Estado } from '../estado/estado'
import { ListaAvisos } from './Aviso'
import { PorQueImporta } from './PorQueImporta'

const FORMATOS: { valor: Formato; etiqueta: string }[] = [
  { valor: 'pdf', etiqueta: 'PDF' },
  { valor: 'jpg', etiqueta: 'JPG' },
]

/** Copia generada junto con las entradas que la produjeron, para detectar si quedó obsoleta. */
type Preparado = { ficheros: File[]; paginas: Estado['paginas']; texto: string; opciones: Estado['opciones'] }
type Props = { estado: Estado; despachar: Dispatch<Accion>; texto: string; avisos: TipoAviso[] }

export function PasoExportar({ estado, despachar, texto, avisos }: Props) {
  const [preparado, setPreparado] = useState<Preparado | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState(false)

  const vigente =
    preparado &&
    preparado.paginas === estado.paginas &&
    preparado.texto === texto &&
    preparado.opciones === estado.opciones
      ? preparado
      : null
  const bloqueo =
    estado.paginas.length === 0
      ? 'Carga un documento para poder exportarlo.'
      : texto === ''
        ? 'Escribe el texto de la marca de agua.'
        : null

  async function generar() {
    setError(null)
    setHecho(false)
    setOcupado(true)
    try {
      const ficheros = await generarFicheros(estado.paginas, texto, estado.opciones, new Date())
      setPreparado({ ficheros, paginas: estado.paginas, texto, opciones: estado.opciones })
    } catch {
      setError(MENSAJES_ERROR.exportar)
    } finally {
      setOcupado(false)
    }
  }

  // Se llama directamente desde el clic, sin esperas previas: Safari lo exige para compartir.
  async function alCompartir(ficheros: File[]) {
    setError(null)
    try {
      if ((await compartir(ficheros)) === 'compartido') setHecho(true)
    } catch {
      setError(MENSAJES_ERROR.compartir)
    }
  }

  function alDescargar(ficheros: File[]) {
    descargar(ficheros)
    setHecho(true)
  }

  return (
    <>
      <fieldset className="grupo-radio">
        <legend>Formato</legend>
        {FORMATOS.map((f) => (
          <label key={f.valor}>
            <input
              type="radio"
              name="formato"
              checked={estado.opciones.formato === f.valor}
              onChange={() => despachar({ tipo: 'cambiar-opciones', cambios: { formato: f.valor } })}
            />{' '}
            {f.etiqueta}
          </label>
        ))}
      </fieldset>
      <PorQueImporta id="formato" />

      <section aria-label="Resumen de avisos" aria-live="polite">
        <h3 className="resumen-avisos__titulo">
          {avisos.length === 0 ? 'Sin avisos: la configuración es segura.' : `Avisos activos (${avisos.length})`}
        </h3>
        <ListaAvisos avisos={avisos} />
      </section>

      {bloqueo && <p className="nota">{bloqueo}</p>}
      <div className="acciones">
        <button type="button" className="boton" disabled={bloqueo !== null || ocupado} onClick={() => void generar()}>
          {ocupado ? 'Generando…' : 'Generar copia protegida'}
        </button>
      </div>

      {vigente && (
        <div className="preparado">
          <p>Copia lista: {vigente.ficheros.map((f) => f.name).join(', ')}</p>
          <div className="acciones">
            {puedeCompartir(vigente.ficheros) && (
              <button type="button" className="boton" onClick={() => void alCompartir(vigente.ficheros)}>
                Compartir
              </button>
            )}
            <button type="button" className="boton boton--secundario" onClick={() => alDescargar(vigente.ficheros)}>
              Descargar
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {hecho && vigente && (
        <p className="exito" role="status">
          {MENSAJE_TRAS_EXPORTAR}
        </p>
      )}
    </>
  )
}
```

En `src/ui/Editor.tsx`:
- añadir `import { PasoExportar } from './PasoExportar'`;
- sustituir la línea `<Paso numero={5} titulo="Exportar" />` por:

```tsx
        <Paso numero={5} titulo="Exportar">
          <PasoExportar estado={estado} despachar={despachar} texto={texto} avisos={avisos} />
        </Paso>
```

Tras este cambio, el bloque de pasos de `Editor.tsx` debe quedar exactamente así:

```tsx
      <div className="editor__pasos">
        <Paso numero={1} titulo="Documento" abiertoInicial>
          <PasoDocumento estado={estado} despachar={despachar} avisos={delPaso(1)} />
        </Paso>
        <Paso numero={2} titulo="Ocultar datos (opcional)" onToggle={setOcultarActivo}>
          <PasoOcultar estado={estado} despachar={despachar} avisos={delPaso(2)} />
        </Paso>
        <Paso numero={3} titulo="Texto de la marca">
          <PasoTexto estado={estado} despachar={despachar} avisos={delPaso(3)} />
        </Paso>
        <Paso numero={4} titulo="Opciones de seguridad">
          <PasoOpciones opciones={estado.opciones} despachar={despachar} avisos={delPaso(4)} />
        </Paso>
        <Paso numero={5} titulo="Exportar">
          <PasoExportar estado={estado} despachar={despachar} texto={texto} avisos={avisos} />
        </Paso>
      </div>
```

- [ ] **Paso 4: ejecutar** — `npx playwright test tests/e2e/exportar.spec.ts --project=escritorio --project=android` → **PASS** (14 pruebas).

- [ ] **Paso 5: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
npx playwright test --project=escritorio --project=android
git add src tests/e2e
git commit -m "feat: exportación en dos pasos con resumen de avisos, compartir y descargar"
```

**Criterio de aceptación:** `npx playwright test --project=escritorio --project=android` → todas las especificaciones e2e pasan.

---

### Tarea 15 — Pruebas de privacidad y PWA (Sonnet 5.5)

Tarea de verificación: se espera que las pruebas pasen a la primera. **Si una falla, es un defecto real de privacidad: corregir el código, no la prueba.**

**Archivos:**
- Prueba: `tests/e2e/privacidad.spec.ts`
- Modificar: lo que haga falta si alguna prueba revela un defecto.

**Interfaces:**
- Consume: helpers de `tests/e2e/utilidades.ts`.
- Produce: la evidencia automatizada de R1 (criterio de éxito 1 de la especificación).

- [ ] **Paso 1: escribir las pruebas**

`tests/e2e/privacidad.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test'
import {
  abrirPaso,
  analizarPdf,
  ARRASTRE_SOBRE_ROJO,
  cargar,
  dibujarRecuadro,
  esperarVistaPrevia,
  generarYDescargar,
  vigilarConsola,
} from './utilidades.ts'

async function flujoCompleto(page: Page) {
  await cargar(page, 'dni-ficticio.pdf')
  await esperarVistaPrevia(page)
  await abrirPaso(page, 'Ocultar datos')
  await dibujarRecuadro(page, ...ARRASTRE_SOBRE_ROJO)
  return generarYDescargar(page)
}

test.describe('Privacidad', () => {
  test('ninguna petición sale del propio origen y no hay errores de CSP', async ({ page, context, baseURL }) => {
    const errores = vigilarConsola(page)
    const origenes = new Set<string>()
    context.on('request', (peticion) => {
      const url = peticion.url()
      if (!/^(data|blob):/.test(url)) origenes.add(new URL(url).origin)
    })
    await page.goto('/')
    await flujoCompleto(page)
    expect([...origenes]).toEqual([new URL(baseURL!).origin])
    expect(errores).toEqual([])
  })

  test('no guarda nada en el navegador', async ({ page }) => {
    await page.goto('/')
    await flujoCompleto(page)
    const almacen = await page.evaluate(async () => ({
      local: localStorage.length,
      sesion: sessionStorage.length,
      cookies: document.cookie,
      bases: (await indexedDB.databases()).map((b) => b.name),
    }))
    expect(almacen).toEqual({ local: 0, sesion: 0, cookies: '', bases: [] })
  })

  test('funciona sin conexión tras la primera visita', async ({ page, context, browserName }) => {
    test.skip(browserName === 'webkit', 'El service worker de WebKit en Playwright no es fiable; se verifica a mano (tarea 18)')
    await page.goto('/')
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
    await context.setOffline(true)
    await page.reload()
    const { bytes } = await flujoCompleto(page)
    expect((await analizarPdf(bytes)).paginas).toBe(1)
  })

  test('es instalable: manifest con nombre, idioma, iconos y modo standalone', async ({ page, request, baseURL }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    const manifest = await (await request.get(new URL(href!, baseURL).href)).json()
    expect(manifest).toMatchObject({ name: 'Protege DNI', lang: 'es', display: 'standalone' })
    expect(manifest.icons).toHaveLength(3)
  })
})
```

- [ ] **Paso 2: ejecutar** — `npx playwright test tests/e2e/privacidad.spec.ts --project=escritorio --project=android` → **PASS** esperado (8 pruebas). Si algo falla, depura con `superpowers:systematic-debugging` y corrige el código.

- [ ] **Paso 3: puerta y commit**

```bash
npm run lint && npm run typecheck && npm test
git add tests/e2e src
git commit -m "test: privacidad (red, almacenamiento, CSP), modo sin conexión e instalación"
```

**Criterio de aceptación:** `npx playwright test tests/e2e/privacidad.spec.ts --project=escritorio --project=android` → 8 passed.

---

### Tarea 16 — CI, README y licencia (Haiku 5.5)

**Archivos:**
- Crear: `.github/workflows/ci.yml`, `README.md`, `LICENSE`

**Interfaces:**
- Consume: scripts npm de la tarea 1.
- Produce: CI que, en cada PR y en `main`, ejecuta lint, typecheck, pruebas unitarias y e2e (con WebKit); en `main`, publica `dist/` en GitHub Pages.

- [ ] **Paso 1: workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  pruebas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium webkit
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run e2e
      - if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: informe-playwright
          path: playwright-report
          retention-days: 7

  publicar:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: pruebas
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.despliegue.outputs.page_url }}
    concurrency:
      group: pages
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist
      - id: despliegue
        uses: actions/deploy-pages@v5
```

- [ ] **Paso 2: `LICENSE`** (texto MIT estándar)

```text
MIT License

Copyright (c) 2026 Beñat Lizarazu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Paso 3: `README.md`**

````markdown
# Protege DNI

Añade una marca de agua a la copia de tu DNI, oculta los datos que el trámite no necesita y expórtala aplanada (PDF o JPG) antes de compartirla.

**Tu documento no sale de tu dispositivo:** todo se procesa en el navegador. No hay servidor que reciba nada.

## Cómo comprobar la privacidad

- La web es un conjunto de ficheros estáticos; no existe ningún sitio al que se suba el documento.
- Tras la primera visita funciona en modo avión (PWA).
- La página declara una política de seguridad (CSP) que bloquea las conexiones a otros dominios.
- Sin cookies, analíticas ni almacenamiento: al cerrar la pestaña, todo desaparece.
- Las pruebas automáticas (`tests/e2e/privacidad.spec.ts`) comprueban que ninguna petición sale del propio origen.

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
````

- [ ] **Paso 4: validar el workflow**

```bash
npx --yes @action-validator/cli@0.6.0 .github/workflows/ci.yml
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML válido')"
```

Esperado: sin errores en el validador y «YAML válido».

- [ ] **Paso 5: commit**

```bash
git add .github README.md LICENSE
git commit -m "ci: pruebas y despliegue en GitHub Pages; README y licencia MIT"
```

**Criterio de aceptación:** los dos comandos del paso 4 terminan con código 0.

---

### Tarea 17 — Verificación de contenidos (Sonnet 5.5)

Obligatoria antes de publicar (sección 5 de la especificación). **No inventes URLs**: solo enlaces que hayas abierto y leído.

**Archivos:**
- Crear: `docs/verificacion-contenidos.md`
- Modificar, si hace falta: `src/contenido/fuentes.ts`, `src/contenido/guiaOcultar.ts`, `src/contenido/buenasPracticas.ts`, `src/contenido/explicaciones.ts` (y las pruebas e2e cuyo texto cambie)

**Interfaces:**
- Consume: contenido de las tareas 9 y 11.
- Produce: un informe que justifica cada fuente y cada afirmación de la guía.

- [ ] **Paso 1: enlaces.** Abre con WebFetch cada URL de `src/contenido/fuentes.ts` y, para cada una, anota en `docs/verificacion-contenidos.md` una fila con: id, URL, si responde (sí/no), la afirmación de la app que respalda (busca dónde se usa con `grep -rn "<id>" src/contenido`), si la respalda (sí, parcialmente o no) y una cita breve. `incibe-017` no se comprobó durante el diseño.
- [ ] **Paso 2: guía de ocultación.** Contrasta cada dato de `GUIA_OCULTAR` con la descripción oficial del DNI de la Policía Nacional (portal oficial del DNI electrónico: búscalo, no lo supongas): existencia del CAN y del número de soporte en el DNI 3.0 y 4.0, del nombre de los padres y del lugar de nacimiento, y del domicilio en el reverso. Ajusta la redacción («en los DNI que lo incluyen») donde un dato no exista en todas las versiones.
- [ ] **Paso 3: corregir.** Si una fuente no existe o no respalda la afirmación, sustitúyela por una fuente fiable que sí lo haga, o suaviza la afirmación. Actualiza las pruebas e2e cuyo texto exacto cambie.
- [ ] **Paso 4: verificar.**

```bash
npm run lint && npm run typecheck && npm test
npx playwright test --project=escritorio --project=android
```

- [ ] **Paso 5: commit**

```bash
git add docs/verificacion-contenidos.md src tests
git commit -m "docs: verificación de fuentes y de la guía de ocultación"
```

**Criterio de aceptación:** `docs/verificacion-contenidos.md` tiene una fila por cada id de `FUENTES` y una por cada dato de `GUIA_OCULTAR`, y ninguna marcada como «no respalda» sin que se haya corregido; las pruebas pasan.

---

### Tarea 18 — Integración, revisión y verificación final (Opus 5.5, esfuerzo `xhigh`)

La única pasada cara del plan. Revisa la rama entera frente a la especificación, verifica de forma visual y depura lo transversal.

**Archivos:** los que haga falta corregir.

- [ ] **Paso 1: todo en verde.**

```bash
npm ci
npm run lint && npm run typecheck && npm test
npx playwright test --project=escritorio --project=android
npx playwright test --project=iphone   # solo si el usuario instaló las librerías de WebKit
```

- [ ] **Paso 2: cobertura de la especificación.** Recorre `docs/superpowers/specs/2026-10-10-protege-dni-design.md` sección a sección (1.1 R1–R11, 1.3, 3.1–3.8, 4, 5, 6.1–6.10, 7, 8, 9) y anota para cada punto el fichero o prueba que lo cumple. Todo hueco se corrige o se documenta como limitación en el README.
- [ ] **Paso 3: revisión de código.** Usa `superpowers:requesting-code-review` sobre la rama completa (`git diff main...HEAD`), con foco en:
  - privacidad: ninguna dependencia ni código que haga peticiones, use almacenamiento o registre datos del documento;
  - casos límite del «Foco de revisión»;
  - accesibilidad: etiquetas, foco, contraste y avisos con texto.
- [ ] **Paso 4: verificación visual.** Con `npm run build && npx vite preview --port 4173` y el navegador (Playwright MCP o headed), haz capturas a 390 × 844 y a 1280 × 800 de: inicio, cada paso abierto, un PDF y una foto cargados, un recuadro dibujado y la copia exportada. Comprueba que:
  - la marca **sube de izquierda a derecha**, cubre todo el documento y deja leer los datos con opacidad 40 %;
  - la vista previa y el fichero exportado se ven igual (mismas proporciones de la marca);
  - la maquetación no tiene scroll horizontal en móvil y la cabecera fija no tapa la vista previa;
  - los avisos ⚠️ e ℹ️ son legibles.
- [ ] **Paso 5: corregir** lo encontrado y repetir el paso 1.
- [ ] **Paso 6: actualizar** el ledger y el estado del plan a «completado», y hacer commit (`fix:` o `chore:` según corresponda).
- [ ] **Paso 7: informe al usuario** con: resumen de lo construido, resultado de las pruebas (con salida), capturas clave, limitaciones conocidas, la lista de comprobación manual en Android e iPhone que **el usuario debe hacer** (README, sección «Comprobación manual»), y la pregunta explícita de si quiere publicar (sección «Publicación»).

**Criterio de aceptación:** paso 1 en verde, sin huecos de especificación sin documentar y con el informe entregado al usuario.

---

## Verificación end-to-end

Comandos que, juntos, demuestran que la v1 está terminada (desde la raíz del worktree):

```bash
npm ci
npm run lint                       # 0 errores
npm run typecheck                  # sin salida
npm test                           # todas las pruebas unitarias pasan
npx playwright test --project=escritorio --project=android   # todas las e2e pasan
npm run build && ls dist/sw.js dist/manifest.webmanifest
grep -c "Content-Security-Policy" dist/index.html            # 1
```

Más la lista de comprobación manual del README en dispositivos reales, que hace el usuario.

## Publicación (requiere confirmación explícita del autor)

No ejecutar nada de esta sección sin un «sí» del autor en la conversación. Crear el repositorio público es irreversible a efectos prácticos.

1. Integrar la rama con `superpowers:finishing-a-development-branch` (merge a `main` local).
2. Tras la confirmación:

```bash
cd ~/Development/Personal/protege-dni
gh repo create protege-dni --public --source . --remote origin --push
gh api -X POST repos/blizarazu/protege-dni/pages -f build_type=workflow
gh run watch
```

3. Si el repositorio acaba en otra URL, actualizar `URL_REPOSITORIO` en `src/contenido/privacidad.ts`.

## Ledger de progreso

Marca cada tarea al terminarla, con el hash del commit, para que otra sesión pueda continuar.

| # | Tarea | Modelo | Estado | Commit |
|---|---|---|---|---|
| — | Worktree creado (`feat/protege-dni-v1`) | — | [x] | rama desde `8a0fd73` |
| 1 | Andamiaje | Haiku 5.5 | [x] | `8a0fd73..86cce1c` |
| 2 | Texto de la marca y plantillas | Haiku 5.5 | [x] | `86cce1c..ff7c619` |
| 3 | Reglas de avisos | Haiku 5.5 | [x] | `ff7c619..ec8b01a` |
| 4 | Geometría y nombres | Haiku 5.5 | [x] | `ec8b01a..cef1a74` |
| 5 | Marca y procesado | Sonnet 5.5 | [x] | `cef1a74..7c8ba24` |
| 6 | Carga de PDF e imágenes | Sonnet 5.5 | [x] | `7c8ba24..c3373b2` |
| 7 | Exportación | Sonnet 5.5 | [x] | `c3373b2..534210b` |
| 8 | Estado | Sonnet 5.5 | [x] | `534210b..4776983` |
| 9 | Esqueleto de la interfaz | Sonnet 5.5 | [x] | `4776983..746435a` |
| 10 | Paso 1 y vista previa | Sonnet 5.5 | [x] | `746435a..7590cb3` |
| 11 | Paso 2 · ocultar datos | Sonnet 5.5 | [x] | `7590cb3..d664db4` |
| 12 | Paso 3 · texto | Sonnet 5.5 | [x] | `d664db4..c46e8a5` |
| 13 | Paso 4 · opciones | Sonnet 5.5 | [x] | `c46e8a5..2523bc1` |
| 14 | Paso 5 · exportar | Sonnet 5.5 | [x] | `2523bc1..2ae811f` |
| 15 | Privacidad y PWA | Sonnet 5.5 | [x] | `2ae811f..a919e97` |
| 16 | CI, README y licencia | Haiku 5.5 | [x] | `a919e97..fdee999` |
| 17 | Verificación de contenidos | Sonnet 5.5 | [x] | `fdee999..a847460` |
| 18 | Integración y verificación final | Opus 5.5 | [x] | `a847460..eb2412d` + `docs:` del ledger |
