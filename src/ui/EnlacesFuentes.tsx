import { FUENTES, type IdFuente } from '../contenido/fuentes'

export function EnlacesFuentes({ fuentes }: { fuentes: readonly IdFuente[] }) {
  if (fuentes.length === 0) return null
  return (
    <span className="fuentes">
      Fuentes:{' '}
      {fuentes.map((id, i) => (
        <span key={id}>
          {i > 0 && ', '}
          <a href={FUENTES[id].url} target="_blank" rel="noopener noreferrer">
            {FUENTES[id].titulo}
          </a>
        </span>
      ))}
    </span>
  )
}
