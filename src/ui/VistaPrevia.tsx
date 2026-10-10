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
