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
