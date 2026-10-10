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
