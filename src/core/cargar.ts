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
    verbosity: pdfjs.VerbosityLevel.ERRORS,
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
    void tarea.destroy() // libera el worker también con un PDF dañado
    throw new ErrorCarga(cancelado ? 'cancelado' : 'pdf-danado')
  }

  const paginas: Pagina[] = []
  try {
    const total = Math.min(documento.numPages, Math.max(0, maxPaginas))
    for (let n = 1; n <= total; n++) {
      const pagina = await documento.getPage(n)
      const enPuntos = pagina.getViewport({ scale: 1 }) // respeta /Rotate
      // Sin pasar de LADO_MAXIMO_IMAGEN: las páginas enormes superarían el límite de lienzo de Safari.
      const escala = Math.min(PPP_RASTERIZADO / 72, LADO_MAXIMO_IMAGEN / Math.max(enPuntos.width, enPuntos.height))
      const vista = pagina.getViewport({ scale: escala })
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
    for (const p of paginas) p.imagen.close()
    if (error instanceof ErrorCarga) throw error
    throw new ErrorCarga('pdf-danado')
  } finally {
    await tarea.destroy()
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
    const ctx = lienzo.getContext('2d')
    if (!ctx) {
      original.close()
      throw new ErrorCarga('imagen-danada')
    }
    ctx.drawImage(original, 0, 0, lienzo.width, lienzo.height)
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
