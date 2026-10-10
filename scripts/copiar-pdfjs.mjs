// Copia a public/pdfjs los recursos que pdf.js carga en tiempo de ejecución,
// para servirlos desde el propio origen (nada de CDNs).
import { cpSync, rmSync } from 'node:fs'

const destino = 'public/pdfjs'
rmSync(destino, { recursive: true, force: true })
for (const carpeta of ['standard_fonts', 'cmaps', 'wasm', 'iccs']) {
  cpSync(`node_modules/pdfjs-dist/${carpeta}`, `${destino}/${carpeta}`, { recursive: true })
}
