import { useId, type Dispatch } from 'react'
import { OPACIDAD_MAXIMA, OPACIDAD_MINIMA } from '../core/limites'
import type { Aviso as TipoAviso, Densidad, Opciones } from '../core/tipos'
import type { Accion } from '../estado/estado'
import { ListaAvisos } from './Aviso'
import { PorQueImporta } from './PorQueImporta'

const DENSIDADES: { valor: Densidad; etiqueta: string }[] = [
  { valor: 'baja', etiqueta: 'Baja' },
  { valor: 'normal', etiqueta: 'Normal' },
  { valor: 'alta', etiqueta: 'Alta' },
]

type Props = { opciones: Opciones; despachar: Dispatch<Accion>; avisos: TipoAviso[] }

export function PasoOpciones({ opciones, despachar, avisos }: Props) {
  const id = useId()
  const cambiar = (cambios: Partial<Opciones>) => despachar({ tipo: 'cambiar-opciones', cambios })
  return (
    <>
      <div className="campo">
        <label htmlFor={`${id}-opacidad`}>Opacidad</label>
        <input
          id={`${id}-opacidad`}
          type="range"
          min={OPACIDAD_MINIMA}
          max={OPACIDAD_MAXIMA}
          step={5}
          value={opciones.opacidad}
          aria-valuetext={`${opciones.opacidad} %`}
          onChange={(e) => cambiar({ opacidad: Number(e.target.value) })}
        />
        <output htmlFor={`${id}-opacidad`}>{opciones.opacidad} %</output>
      </div>
      <PorQueImporta id="opacidad" />
      <fieldset className="grupo-radio">
        <legend>Densidad de la marca</legend>
        {DENSIDADES.map((d) => (
          <label key={d.valor}>
            <input type="radio" name="densidad" checked={opciones.densidad === d.valor} onChange={() => cambiar({ densidad: d.valor })} /> {d.etiqueta}
          </label>
        ))}
      </fieldset>
      <PorQueImporta id="densidad" />
      <label className="campo campo--casilla">
        <input type="checkbox" checked={opciones.color} onChange={(e) => cambiar({ color: e.target.checked })} /> Mantener el color
      </label>
      <PorQueImporta id="color" />
      <ListaAvisos avisos={avisos} />
    </>
  )
}
