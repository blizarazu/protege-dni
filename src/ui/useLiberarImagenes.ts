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
