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
