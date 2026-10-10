import type { Aviso as TipoAviso } from '../core/tipos'

export function Aviso({ aviso }: { aviso: TipoAviso }) {
  const riesgo = aviso.nivel === 'riesgo'
  return (
    <p className={`aviso aviso--${aviso.nivel}`} data-aviso={aviso.id}>
      <span aria-hidden="true">{riesgo ? '⚠️' : 'ℹ️'}</span>
      <span>
        <span className="visualmente-oculto">{riesgo ? 'Riesgo: ' : 'Consejo: '}</span>
        {aviso.mensaje}
      </span>
    </p>
  )
}

export function ListaAvisos({ avisos }: { avisos: TipoAviso[] }) {
  if (avisos.length === 0) return null
  return (
    <div className="avisos">
      {avisos.map((a) => (
        <Aviso key={a.id} aviso={a} />
      ))}
    </div>
  )
}
