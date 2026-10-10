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
