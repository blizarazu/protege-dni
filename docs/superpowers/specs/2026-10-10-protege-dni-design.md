# Protege DNI — Especificación de diseño

- **Fecha:** 2026-10-10
- **Estado:** pendiente de revisión por el autor
- **Referencia del algoritmo:** `docs/referencia/marca_agua_dni.py` (script Python validado del que nace el proyecto)

## 1. Objetivo

Aplicación web gratuita y de código abierto para preparar la copia de un DNI antes de compartirla: añade una marca de agua que indica para quién y para qué es la copia, permite ocultar datos que el trámite no necesita, la pasa a escala de grises y la exporta "aplanada" (todo convertido en imagen). **Todo el procesamiento ocurre en el navegador del usuario: el documento nunca sale de su dispositivo.** Además, guía al usuario con buenas prácticas y le avisa cuando una opción reduce la seguridad.

### 1.1 Requisitos pedidos por el autor

| Id | Requisito |
|---|---|
| R1 | **Indispensable:** todo el proceso en local. El documento no se sube a ningún servidor. |
| R2 | Web estática alojable gratis (GitHub Pages o similar). |
| R3 | Mismo resultado que el script de referencia: marca diagonal repetida, integrada en la imagen, PDF sin texto ni metadatos. |
| R4 | Texto de la marca guiado (la herramienta lo construye con 2-3 datos) o libre. Genérico: sirve para cualquier trámite, no solo para el caso que originó el proyecto. |
| R5 | Opciones de opacidad y de color / escala de grises. |
| R6 | Ocultar datos, con una guía de qué se puede ocultar y qué no. |
| R7 | En móvil, hacer una foto del DNI con la cámara. |
| R8 | Un único código para escritorio y móvil. |
| R9 | Cada opción explica qué aporta a la seguridad; si el usuario elige una opción insegura, se muestra un aviso (triángulo amarillo) con el riesgo concreto. |
| R10 | Sección de buenas prácticas para compartir el DNI, con referencias. |
| R11 | Destacar que todo se procesa en local. |

### 1.2 Supuestos (confirmados en la conversación de diseño)

- Herramienta pública, para cualquier persona. Solo en castellano en la v1, con los textos centralizados para poder traducirlos.
- Sin cuentas, sin backend y sin persistencia de ningún tipo (ni documento, ni texto, ni preferencias).
- Exporta en PDF y en JPG.
- Pensada para el DNI español, pero el nombre de módulos y la estructura de contenidos no deben impedir ampliarla a otros documentos y países.

### 1.3 Criterios de éxito

1. Un test automatizado demuestra que, durante todo el flujo, **ninguna petición de red sale del propio origen**, y que la app funciona con la red cortada tras la primera visita.
2. El PDF exportado no tiene texto extraíble ni metadatos identificativos; las zonas ocultadas son negras en los píxeles; la salida en escala de grises no contiene color.
3. En un móvil Android (Chrome) y un iPhone (Safari) se puede: hacer la foto, tapar la firma, generar la marca en modo guiado y compartir el PDF por la hoja de compartir del sistema.
4. La app se puede instalar como PWA en móvil y escritorio.

## 2. Fuera de alcance de la v1

- Recorte y corrección de perspectiva de la foto; detección automática de los bordes del carné (v2, posiblemente con OpenCV.js/jscanify cargado bajo demanda).
- Componer anverso y reverso en una sola página (v2).
- Proponer recuadros de ocultación en las posiciones estándar de los campos del DNI (v2, requiere el recorte).
- OCR o detección automática de datos.
- Pixelado o desenfoque: en la v1 solo hay recuadros negros opacos (el pixelado de texto puede ser reversible).
- Apps nativas (v3, solo si hace falta: empaquetar la misma web con Capacitor y usar el escáner nativo).
- Otros idiomas, documentos y países.
- Cualquier tipo de persistencia, analítica o cookies.

## 3. Experiencia de usuario

### 3.1 Estructura de la pantalla

Una sola pantalla de edición, válida para escritorio y móvil, más dos páginas informativas.

- **Cabecera fija:** nombre de la app, distintivo «🔒 Tu documento no sale de este dispositivo» con enlace a «¿Cómo puedo comprobarlo?», y enlace a «Buenas prácticas».
- **Vista previa en vivo** del resultado final de la página seleccionada (con marca, recuadros y grises aplicados).
  - Escritorio (ancho ≥ 900 px): dos columnas; pasos a la izquierda, vista previa a la derecha.
  - Móvil: vista previa arriba y pasos debajo.
- **Pasos numerados y plegables** (1 a 5). Se pueden abrir en cualquier orden; el paso 1 está abierto al inicio.
- **Navegación por hash:** `#/` (editor), `#/buenas-practicas`, `#/como-comprobarlo`. El estado del editor vive en el componente raíz y no se pierde al visitar las páginas informativas.

### 3.2 Paso 1 · Documento

- Botón «Elegir archivo»: `accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"`, selección múltiple.
- Botón «Hacer foto» (`<input type="file" accept="image/*" capture="environment">`), visible solo en dispositivos táctiles (`matchMedia('(pointer: coarse)')`).
- Arrastrar y soltar en escritorio.
- Cada archivo añade sus páginas al final. Límite total: 10 páginas.
- Lista de miniaturas con acciones: seleccionar (cambia la vista previa), subir, bajar y eliminar.

### 3.3 Paso 2 · Ocultar datos (opcional)

- Sobre la vista previa de la página seleccionada, el usuario dibuja recuadros arrastrando con el dedo o el ratón (Pointer Events).
- Un recuadro se selecciona tocándolo y se elimina con un botón «Eliminar recuadro». Botón «Quitar todos» para la página actual.
- Los recuadros se pintan en negro opaco (`#000`) y quedan integrados en la imagen exportada.
- Debajo de los controles se muestra la **guía de ocultación** (texto exacto en el apéndice A.3), y la instrucción del paso remite a ella (ajustado durante la implementación: la guía mide unos 1300 px en móvil y, encima, alejaría los botones de la vista previa).

### 3.4 Paso 3 · Texto de la marca

Dos modos, conmutables: **Guiado** (por defecto) y **Libre**.

**Modo guiado**

- Selector de caso. Al elegirlo rellena la finalidad (el usuario puede editarla):

  | Caso | Finalidad sugerida |
  |---|---|
  | Alquiler de vivienda | solicitud de alquiler de vivienda |
  | Banco o entidad financiera | verificación de identidad como cliente |
  | Suministros (luz, agua, gas, telecomunicaciones) | cambio de titular o de datos del suministro |
  | Trámite con la Administración | trámite administrativo |
  | Empleo | proceso de contratación |
  | Otro | *(vacío)* |

- Campos: **Destinatario** (p. ej. «E-DISTRIBUCIÓN»), **Finalidad**, **Referencia** opcional (nº de expediente, contrato, CUPS…), **Incluir fecha** (casilla, activada) y **Fecha** (por defecto hoy, formato `dd/mm/aaaa`).
- Plantilla: se unen con « · » solo las partes no vacías:
  1. `Copia para {destinatario}`
  2. `Solo para {finalidad}`
  3. `{referencia}`
  4. `{fecha}` (si «Incluir fecha» está activada)
  5. `No válida para otro uso` (siempre)

  Ejemplo: `Copia para E-DISTRIBUCIÓN · Solo para cambio de titular o de datos del suministro · CUPS ES0031… · 10/10/2026 · No válida para otro uso`
- El texto generado se muestra debajo, en solo lectura, con un botón «Editar a mano» que cambia al modo libre con ese texto ya escrito.

**Modo libre**

- Un área de texto (máx. 200 caracteres) con el texto completo de la marca.

Si el texto final queda vacío, el botón de exportar se desactiva con el mensaje «Escribe el texto de la marca de agua».

### 3.5 Paso 4 · Opciones de seguridad

| Opción | Control | Por defecto |
|---|---|---|
| Opacidad | deslizador 10 %–90 %, paso 5 % | 40 % |
| Densidad de la marca | baja / normal / alta | normal |
| Mantener el color | interruptor | desactivado (escala de grises) |

Cada opción tiene su desplegable «ⓘ ¿Por qué importa?» (textos en el apéndice A.1) y, cuando aplica, su aviso (sección 4).

### 3.6 Paso 5 · Exportar

- Formato: **PDF** (por defecto) o **JPG**.
- Botón principal:
  - Si `navigator.canShare({ files })` es cierto: «Compartir» (Web Share API) y, al lado, un enlace secundario «Descargar».
  - Si no: «Descargar».
- PDF: un solo fichero con todas las páginas. JPG: un fichero por página; con más de una página, en lugar de un único «Descargar» hay un botón por página («Descargar página 1», …) y la nota «Descarga cada página por separado.» (ajustado durante la implementación: Chrome bloquea las descargas sucesivas lanzadas por un solo clic). El mensaje final aparece cuando se han descargado todas.
- Nombre de los ficheros: `copia-protegida-AAAA-MM-DD.pdf` / `copia-protegida-AAAA-MM-DD-p{n}.jpg`. **No se reutiliza el nombre del fichero original**, que a menudo contiene el nombre de la persona.
- Junto al botón, resumen de los avisos activos (solo informativo, no bloquea).
- Tras exportar: «Listo. Cuando ya no la necesites, borra la copia de tus descargas y de los chats donde la hayas enviado.»
- Si el usuario cancela la hoja de compartir (`AbortError`), no se muestra ningún error.

### 3.7 Página «Buenas prácticas»

Lista de consejos, cada uno con su fuente (apéndice A.4 y sección 5).

### 3.8 Página «¿Cómo puedo comprobarlo?»

Explica, en lenguaje llano:

- **No hay servidor que reciba nada:** la web es un conjunto de ficheros estáticos; no existe ningún sitio al que se suba el documento.
- **Pruébalo en modo avión:** tras la primera visita, la app funciona sin conexión.
- **El navegador lo impide:** la página declara una política de seguridad (CSP) que impide que cargue o envíe nada a otros dominios (ajustado durante la implementación: la CSP en `<meta>` no cubre el worker de pdf.js ni el service worker, así que no se afirma que el navegador bloquee todas las conexiones).
- **Puedes revisarlo:** el código es público en GitHub (enlace al repositorio). Para usuarios avanzados: en las herramientas de desarrollo, pestaña Red, se ve que al procesar el documento no se hace ninguna petición.
- **Nada del documento se guarda:** sin cookies ni analíticas, y el documento, el texto y las opciones solo están en la memoria de la pestaña; al cerrarla, todo desaparece. El navegador solo guarda los ficheros de la propia app para que funcione sin conexión (ajustado durante la implementación).

## 4. Avisos de seguridad

Dos niveles:

- **Riesgo** — triángulo amarillo ⚠️: la configuración reduce la seguridad.
- **Consejo** — icono ℹ️ gris: recomendación.

Los avisos nunca bloquean la exportación. Se muestran junto a la opción que los provoca y en el resumen del paso 5. El texto del aviso siempre está escrito (no se transmite solo con color o icono) y el resumen usa `aria-live="polite"`.

| Id | Nivel | Condición | Mensaje |
|---|---|---|---|
| `sin-destinatario` | riesgo | modo guiado y destinatario vacío | Sin destinatario, la copia sirve para cualquier trámite. |
| `sin-finalidad` | riesgo | modo guiado y finalidad vacía | Sin finalidad, la copia sirve para cualquier uso. |
| `sin-fecha` | riesgo | modo guiado y «Incluir fecha» desactivada | Sin fecha, la copia no caduca y puede reutilizarse dentro de años. |
| `texto-libre-corto` | riesgo | modo libre y texto (sin espacios a los lados) de menos de 20 caracteres | Un texto tan corto o genérico (por ejemplo, «COPIA») no indica para quién ni para qué es. |
| `opacidad-baja` | riesgo | opacidad < 25 % | La marca es tan tenue que es fácil borrarla. |
| `opacidad-alta` | consejo | opacidad > 70 % | Puede que no se lean los datos y te rechacen el documento. |
| `densidad-baja` | riesgo | densidad = baja | Quedan zonas sin cubrir que se pueden recortar. |
| `color` | riesgo | mantener el color activado | En color es más fácil manipular la copia o imprimirla como si fuera el original. |
| `sin-recuadros` | consejo | hay páginas y ninguna tiene recuadros | Si el trámite no necesita la firma u otros datos, ocúltalos. *(enlace a la guía del paso 2)* |
| `varias-paginas` | consejo | 2 o más páginas | Envía las dos caras solo si te las piden. |

## 5. Contenido y fuentes

Todas las referencias viven en `src/contenido/fuentes.ts` y se muestran como enlaces externos (`rel="noopener noreferrer"`, abren en pestaña nueva; la navegación no está limitada por la CSP).

| Id | Fuente | URL |
|---|---|---|
| `aepd-informe` | AEPD — Informe 0048/2023 sobre la copia del DNI | https://www.aepd.es/documento/2023-0048.pdf |
| `incibe-caso` | INCIBE — Caso real: suplantado con su DNI | https://www.incibe.es/linea-de-ayuda-en-ciberseguridad/casos-reales/tras-ser-suplantado-con-su-dni-acaba-debiendo-impuestos-la-agencia-tributaria |
| `incibe-017` | INCIBE — Línea de Ayuda en Ciberseguridad (017) | https://www.incibe.es/linea-de-ayuda-en-ciberseguridad |
| `ocu` | OCU — Compartir el DNI con seguridad | https://www.ocu.org/consumo-familia/derechos-consumidor/noticias/compartir-dni-con-seguridad/ |
| `policia-genbeta` | Genbeta — La Policía explica cómo compartir una imagen del DNI | https://www.genbeta.com/seguridad/policia-explica-como-compartir-imagen-tu-dni-internet-para-evitar-ser-victima-estafas |
| `maldita` | Maldita — Cómo compartir una foto del DNI de forma segura | https://maldita.es/malditatecnologia/20240709/compartir-forma-segura-foto-dni-recop/ |
| `aeat-soporte` | Agencia Tributaria — Número de soporte y fechas del DNI | https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/firma-digital-sistema-clave-pin-tecnica/incidencias-tecnicas-clave-pin/obtencion-fecha-dni.html |

**Verificaciones obligatorias antes de publicar** (tarea explícita del plan):

1. Abrir cada URL y comprobar que existe y que respalda la afirmación que se le atribuye. `incibe-017` no se comprobó durante el diseño.
2. Contrastar la guía de ocultación (A.3) con la descripción oficial del DNI de la Policía Nacional (portal oficial del DNI electrónico), en especial: el CAN, el número de soporte, el nombre de los padres y el lugar de nacimiento según la versión del DNI. Si algún dato no existe en la versión actual, se indica «en los DNI que lo incluyen».

## 6. Arquitectura

### 6.1 Stack

- **React 19 + TypeScript (modo estricto) + Vite.** Sin librería de estado ni de componentes; `useReducer` y CSS propio (CSS Modules).
- **pdfjs-dist** para leer PDFs, cargado con `import()` dinámico solo cuando se abre un PDF. Worker propio servido desde el mismo origen (`pdfjs-dist/build/pdf.worker.min.mjs?url`).
- **pdf-lib** para generar el PDF de salida.
- **vite-plugin-pwa** (Workbox, `generateSW`) para el modo offline e instalable.
- **Vitest** (pruebas unitarias) y **Playwright** (pruebas de extremo a extremo).
- Fuentes del sistema (`system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`). Ningún recurso externo.
- Versiones: las últimas estables al implementar, fijadas en `package-lock.json`.
- Licencia: MIT.

### 6.2 Estructura de carpetas

```
protege-dni/
├── index.html                  # CSP inyectada solo en el build de producción
├── vite.config.ts
├── public/                     # iconos de la PWA
├── src/
│   ├── main.tsx
│   ├── App.tsx                 # estado raíz (useReducer) y rutas por hash
│   ├── estado/
│   │   └── estado.ts           # tipos del estado, acciones y reducer
│   ├── core/                   # lógica sin React; probada de forma aislada
│   │   ├── tipos.ts
│   │   ├── cargar.ts           # File -> Pagina[]
│   │   ├── texto.ts            # DatosGuiados -> string
│   │   ├── marca.ts            # dibuja la marca en un contexto 2D
│   │   ├── procesar.ts         # Pagina + config -> canvas final
│   │   ├── avisos.ts           # estado -> Aviso[]
│   │   ├── geometria.ts        # coordenadas relativas <-> píxeles
│   │   └── exportar.ts         # canvases -> Blob PDF / JPG; compartir o descargar
│   ├── contenido/              # todos los textos visibles
│   │   ├── plantillas.ts       # casos del modo guiado
│   │   ├── explicaciones.ts    # «¿Por qué importa?»
│   │   ├── avisos.ts           # mensajes de los avisos
│   │   ├── guiaOcultar.ts
│   │   ├── buenasPracticas.ts
│   │   └── fuentes.ts
│   └── ui/
│       ├── Cabecera.tsx
│       ├── VistaPrevia.tsx
│       ├── EditorRecuadros.tsx
│       ├── PasoDocumento.tsx
│       ├── PasoOcultar.tsx
│       ├── PasoTexto.tsx
│       ├── PasoOpciones.tsx
│       ├── PasoExportar.tsx
│       ├── Aviso.tsx
│       ├── PorQueImporta.tsx
│       ├── DialogoContrasena.tsx
│       ├── PaginaBuenasPracticas.tsx
│       └── PaginaComoComprobarlo.tsx
├── tests/
│   ├── fixtures/               # DNI ficticios (nunca datos reales) y su script generador
│   └── e2e/
└── docs/
```

### 6.3 Tipos principales

```ts
type Recuadro = { id: string; x: number; y: number; ancho: number; alto: number }; // relativos a la página, 0..1

type Pagina = {
  id: string;
  imagen: ImageBitmap;     // página rasterizada (PDF a 200 ppp) o foto
  anchoPx: number;
  altoPx: number;
  anchoPt: number;         // tamaño de página en puntos PDF para la exportación
  altoPt: number;
  recuadros: Recuadro[];
};

type CasoId = 'alquiler' | 'banco' | 'suministros' | 'administracion' | 'empleo' | 'otro';

type DatosGuiados = {
  caso: CasoId;
  destinatario: string;
  finalidad: string;
  referencia: string;
  incluirFecha: boolean;
  fecha: string;           // dd/mm/aaaa
};

type Densidad = 'baja' | 'normal' | 'alta';

type Opciones = { opacidad: number; densidad: Densidad; color: boolean; formato: 'pdf' | 'jpg' };

type Aviso = { id: string; nivel: 'riesgo' | 'consejo'; mensaje: string; paso: 1 | 2 | 3 | 4 | 5 };
```

### 6.4 Funciones de `core/`

| Función | Contrato |
|---|---|
| `cargarArchivo(file, pedirContrasena)` | Devuelve `Pagina[]`. PDF: rasteriza cada página a 200 ppp; `anchoPt`/`altoPt` son los de la página original (respetando su rotación). Imagen: la decodifica con `createImageBitmap` (respeta la orientación EXIF), la reduce si su lado mayor supera 4096 px y fija `anchoPt = anchoPx · 72 / 200` (ídem alto), es decir, la trata como un escaneo a 200 ppp. `pedirContrasena: () => Promise<string \| null>` se usa si el PDF está cifrado; `null` cancela. |
| `construirTexto(datos)` | Aplica la plantilla de 3.4. Función pura. |
| `dibujarMarca(ctx, ancho, alto, texto, opacidad, densidad)` | Dibuja la marca sobre el contexto (algoritmo en 6.5). |
| `procesarPagina(pagina, texto, opciones, ladoMaximo?)` | Devuelve un canvas con el resultado final. Sin `ladoMaximo` usa la resolución completa (exportación); con él, reduce la escala (vista previa). |
| `evaluarAvisos(estado)` | Aplica las reglas de la sección 4. Función pura. |
| `aPixeles(recuadro, ancho, alto)` / `normalizar(x1, y1, x2, y2, ancho, alto)` | Conversión de coordenadas; `normalizar` admite arrastres en cualquier dirección y recorta a [0, 1]. |
| `exportarPdf(canvases, tamañosPt)` / `exportarJpg(canvas)` | Devuelven `Blob`. |
| `compartirODescargar(ficheros)` | Web Share API si está disponible; si no, descarga con `<a download>` y revoca la URL tras usarla. |

### 6.5 Algoritmo de procesado (equivalente al script de referencia)

Orden fijo por página:

1. **Base:** dibujar la imagen de la página en un canvas del tamaño de destino.
2. **Recuadros:** rellenar cada recuadro en negro opaco.
3. **Marca de agua:**
   - `tam = max(7 · s, min(ancho, alto) / 45) · factorTam`, donde `s` = píxeles por punto (200/72 en PDFs; en fotos, el equivalente a 200 ppp).
   - `paso = tam · factorPaso` (separación entre filas).
   - Densidad: `normal` → factorTam 1, factorPaso 2,6 · `alta` → 0,85 y 2,1 · `baja` → 1,3 y 3,6.
   - `línea = texto + "     "`; se repite hasta cubrir `2 · hypot(ancho, alto)`.
   - Filas desde `centro.y − radio` hasta `centro.y + radio` (`radio = hypot(ancho, alto)`), empezando en `x = centro.x − radio`; las filas impares se desplazan a la izquierda la mitad de la anchura medida de una `línea`, para que los huecos no queden alineados.
   - Todo el bloque gira 30° alrededor del centro, con el texto **ascendente de izquierda a derecha**.
   - Color `rgb(25, 25, 25)` con `globalAlpha = opacidad`; fuente del sistema, peso normal.
4. **Escala de grises** (si `color` es falso): recorrer los píxeles con `getImageData` y aplicar `y = 0,299 R + 0,587 G + 0,114 B`. No usar `ctx.filter`, que no es fiable en todos los Safari.
5. **Codificación:** `canvas.toBlob('image/jpeg', 0.85)`. Al recodificar se eliminan los metadatos EXIF (incluida la ubicación GPS).

Exportación PDF con pdf-lib: `PDFDocument.create({ updateMetadata: false })`; por cada página, `embedJpg` y `addPage([anchoPt, altoPt])` con la imagen a página completa; productor y creador «Protege DNI»; sin título, autor ni palabras clave.

Vista previa: el mismo `procesarPagina` con `ladoMaximo = 1200`, recalculado con un retardo de 150 ms tras cada cambio. Como los tamaños son relativos, la vista previa es proporcionalmente idéntica a la exportación.

### 6.6 Estado y flujo de datos

- Estado raíz: `paginas`, `paginaSeleccionada`, `modoTexto`, `datosGuiados`, `textoLibre`, `opciones`, `ocupado`, `error`.
- Derivados (no se guardan): `textoMarca` y `avisos`.
- Al eliminar una página se llama a `imagen.close()`. Las URLs de objeto se revocan siempre tras usarse.
- No se escribe nada en `localStorage`, `sessionStorage`, IndexedDB ni cookies.

### 6.7 Configuración de pdf.js

- `isEvalSupported: false` (compatible con la CSP sin `unsafe-eval`).
- `standardFontDataUrl` y `cMapUrl` apuntando a copias servidas desde el propio origen (copiadas de `pdfjs-dist` en el build).
- Contraseña: `loadingTask.onPassword` abre `DialogoContrasena`; si la contraseña es incorrecta, se vuelve a pedir con el mensaje «Contraseña incorrecta»; cancelar descarta el fichero.

### 6.8 Privacidad, CSP y PWA

CSP en `<meta http-equiv="Content-Security-Policy">`, inyectada solo en el build de producción (un plugin de Vite con `apply: 'build'`, para no romper el servidor de desarrollo):

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:;
font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self';
object-src 'none'; base-uri 'none'; form-action 'none'
```

Si alguna dependencia necesita relajar una directiva, se documenta el motivo en el código y en el README.

PWA:

- Manifest: nombre «Protege DNI», `lang: "es"`, `display: "standalone"`, `start_url` y `scope` relativos, iconos 192/512 y versión `maskable`.
- Precaché de todo el build, incluidos el worker de pdf.js y las fuentes estándar; los cMaps, con caché en tiempo de ejecución.
- `registerType: 'autoUpdate'`. El service worker se registra desde `main.tsx` con `virtual:pwa-register`, sin scripts en línea, para que funcione con la CSP.
- `base` de Vite configurable para servir desde `/<repo>/` en GitHub Pages.

### 6.9 Errores

| Caso | Comportamiento |
|---|---|
| Tipo de fichero no admitido | «Este tipo de archivo no es compatible. Usa PDF, JPG o PNG.» |
| HEIC que el navegador no sabe decodificar | «Tu navegador no puede abrir fotos HEIC. Expórtala como JPG o usa “Hacer foto”.» |
| PDF dañado | «No se ha podido leer el PDF. Comprueba que no esté dañado.» |
| PDF con contraseña | Se pide la contraseña (6.7). |
| Más de 10 páginas en total | Se añaden hasta llegar a 10 y se avisa: «Solo se admiten 10 páginas.» |
| Fallo al exportar | «No se ha podido generar el archivo. Prueba con menos páginas o recarga la página.» |

Los errores se muestran en una zona `role="alert"` del paso afectado y nunca incluyen el contenido del documento.

### 6.10 Accesibilidad

- HTML semántico, etiquetas en todos los controles, pasos navegables con teclado, contraste AA.
- Los avisos llevan siempre texto, no solo icono o color.
- Limitación conocida de la v1: dibujar recuadros requiere puntero (ratón o táctil). Queda documentado en el README.

## 7. Pruebas

### 7.1 Unitarias (Vitest)

- `construirTexto`: todas las combinaciones de campos vacíos o rellenos, fecha activada o no.
- `evaluarAvisos`: cada regla se activa en su condición y no fuera de ella (incluidos los límites 25 %, 70 % y 20 caracteres).
- `geometria`: conversión ida y vuelta; arrastres en las cuatro direcciones; recorte a [0, 1].
- Nombres de fichero de exportación.

### 7.2 Extremo a extremo (Playwright)

Proyectos: Chromium de escritorio, Chromium con emulación de Pixel y WebKit con emulación de iPhone.

Fixtures en `tests/fixtures/`: DNI **ficticio** (datos inventados, p. ej. «ESPAÑOL ESPAÑOL, CARMEN», «99999999R») en PDF, en JPG y en PDF cifrado con contraseña. Se generan con un script documentado en la misma carpeta y se versionan.

| Test | Comprueba |
|---|---|
| Flujo completo PDF | Cargar PDF → dibujar un recuadro → modo guiado → exportar PDF. El fichero descargado tiene el nº de páginas esperado, no tiene texto extraíble ni título, autor o asunto en los metadatos; los píxeles dentro del recuadro son negros (≤ 10 en cada canal); en escala de grises R = G = B en todo el documento. |
| Flujo JPG | Cargar JPG → exportar JPG; el fichero no contiene EXIF. |
| Red | Se registran todas las peticiones del flujo completo; **todas tienen el mismo origen que la app**. |
| Offline | Primera visita, esperar al service worker, `context.setOffline(true)`, recargar y completar el flujo. |
| Avisos | Opacidad 20 % → aviso `opacidad-baja`; color → `color`; quitar fecha → `sin-fecha`; volver a valores seguros → desaparecen. |
| Contraseña | Cargar el PDF cifrado → se pide contraseña → una contraseña errónea vuelve a pedirla → la correcta carga la página. |

### 7.3 Comprobación manual antes de publicar

En un Android con Chrome y un iPhone con Safari: «Hacer foto», hoja de compartir, instalación como PWA y uso en modo avión. La lista de comprobación queda en el README.

## 8. Despliegue

- Repositorio público en GitHub.
- GitHub Actions:
  - En cada pull request: instalar dependencias, `tsc --noEmit`, Vitest, Playwright y build.
  - En `main`: lo mismo y, si todo pasa, publicar en GitHub Pages (`actions/upload-pages-artifact` + `actions/deploy-pages`).
- README en castellano: qué es, privacidad, cómo comprobarlo, desarrollo local, limitaciones y licencia.

## 9. Riesgos y notas

- **Límite de canvas en iOS:** Safari limita el área de un canvas (~16,7 MP). Se mitiga reduciendo las imágenes a 4096 px de lado mayor y rasterizando los PDF a 200 ppp.
- **Memoria en móvil con varias páginas:** límite de 10 páginas y liberación de `ImageBitmap` al eliminar.
- **La marca de agua no es infalible:** herramientas de IA pueden intentar borrarla. La marca densa, repetida y sobre todo el documento lo dificulta, y la app lo dice con honestidad en las buenas prácticas.
- **Herramientas parecidas** (para inspirarse y diferenciarse): KopieID (app oficial neerlandesa), IDprotect-standalone (web offline), CCDOC (Portugal, código abierto), DocProtect e IDShield (iOS), SaferLayer y la herramienta web de Sinologic. Protege DNI se diferencia por: código abierto y verificable, una sola web para escritorio y móvil, guía de seguridad integrada con avisos y orientación específica para el DNI español.

## Apéndice A · Textos iniciales

Textos de partida; se pueden pulir durante la implementación sin cambiar su sentido.

### A.1 «¿Por qué importa?»

- **Destinatario:** Indicar a quién va dirigida la copia hace que cualquier otra persona o empresa que la reciba vea que no es para ella y la rechace.
- **Finalidad:** Limita la copia a un trámite concreto. Si alguien intenta usarla para otra cosa (abrir una cuenta, pedir un préstamo…), el texto lo delata.
- **Referencia:** Un número de expediente, de contrato o un CUPS ata la copia a un único trámite. Es opcional, pero refuerza mucho la protección.
- **Fecha:** Una copia sin fecha puede reutilizarse indefinidamente. Con fecha, quien la reciba meses después sabrá que no se hizo para su trámite.
- **Opacidad:** Una marca muy tenue es fácil de borrar con un editor o con inteligencia artificial; una muy intensa puede impedir leer los datos y hacer que rechacen el documento. Entre el 30 % y el 60 % es un buen equilibrio.
- **Densidad:** La marca se repite por todo el documento para que no se pueda recortar una zona limpia. Con densidad baja quedan huecos más grandes.
- **Color:** La Policía Nacional y la OCU recomiendan enviar la copia en blanco y negro: con menos detalle es más difícil manipularla o hacerla pasar por un original.
- **Ocultar datos:** Tapar lo que el trámite no necesita reduce lo que se puede hacer con la copia si se filtra. Los recuadros se integran en la imagen y no se pueden quitar.
- **Formato:** Tanto el PDF como el JPG se generan como una imagen plana: sin texto seleccionable, sin capas y sin metadatos (tampoco la ubicación GPS de la foto).

### A.2 Distintivo de privacidad

«🔒 Tu documento no sale de este dispositivo. Todo se procesa en tu navegador.»

### A.3 Guía de ocultación (paso 2)

> Oculta solo lo que el trámite no necesita. Si tapas de más, te pueden pedir que lo envíes otra vez, y entonces habrá dos copias circulando.
>
> **✅ Normalmente puedes ocultarlo, salvo que te lo pidan expresamente**
> - **CAN:** el código de 6 cifras de los DNI electrónicos. Sirve para leer el chip y en una copia no aporta nada.
> - **Número de soporte:** identifica la tarjeta física y cambia con cada renovación. Algunos servicios lo usan para validar el documento: tápalo solo si no te lo piden.
> - **Firma:** ocultarla evita que la copien, y rara vez se compara con una copia.
> - **Nombre de los padres y lugar de nacimiento** (en los DNI que los incluyen): se usan a menudo como preguntas de seguridad y casi nunca hacen falta.
> - **Domicilio:** salvo que el trámite sea precisamente acreditar dónde vives.
>
> **⚠️ Ocúltalo solo si sabes que no lo necesitan**
> - **Fotografía:** es lo que permite comprobar que el documento es tuyo. INCIBE sugiere pixelarla, pero muchas entidades la exigen.
> - **Zona de lectura mecánica** (las líneas con «<<<» del reverso): repite tus datos, pero algunas entidades la leen de forma automática. Si te piden el reverso, suele ser por esta zona o por el domicilio.
>
> **⛔ No lo ocultes: te lo rechazarán**
> - Nombre y apellidos, número de DNI, fecha de nacimiento y fecha de validez.
>
> Si dudas, pregunta a la entidad qué datos necesita antes de enviarlo.

### A.4 Buenas prácticas

1. **Pregunta antes si de verdad necesitan una copia.** La AEPD considera excesivo pedirla solo para identificar a alguien; a veces basta con enseñar el DNI o identificarse con certificado digital. *(aepd-informe)*
2. **Envía solo la cara que te pidan.** *(ocu)*
3. **Pon una marca de agua** con el destinatario, la finalidad y la fecha, que cubra todo el documento. *(ocu, maldita)*
4. **Envíala en blanco y negro.** *(policia-genbeta, ocu)*
5. **Oculta los datos que el trámite no necesite.** *(ocu, maldita)*
6. **Usa formatos aplanados**, en los que lo que tapas no se puede recuperar. *(ocu)*
7. **Envíala por canales oficiales**, nunca por redes sociales, y no la dejes guardada en la nube ni en los chats. *(maldita)*
8. **Si sospechas un uso fraudulento**, contacta con la entidad, denúncialo y llama al 017, la línea de ayuda de INCIBE. *(ocu, incibe-017, incibe-caso)*
9. **La marca de agua disuade, pero no es infalible.** Reduce el riesgo; no lo elimina.
