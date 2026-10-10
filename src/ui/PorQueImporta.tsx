import { EXPLICACIONES, type IdExplicacion } from '../contenido/explicaciones'
import { EnlacesFuentes } from './EnlacesFuentes'

export function PorQueImporta({ id }: { id: IdExplicacion }) {
  const { texto, fuentes } = EXPLICACIONES[id]
  return (
    <details className="por-que">
      <summary>ⓘ ¿Por qué importa?</summary>
      <p>
        {texto} <EnlacesFuentes fuentes={fuentes} />
      </p>
    </details>
  )
}
