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
    if (!e.isPrimary || e.button !== 0) return
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
