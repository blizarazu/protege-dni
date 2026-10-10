import { useId, type Dispatch } from 'react'
import { PLANTILLAS } from '../contenido/plantillas'
import { LONGITUD_MAXIMA_TEXTO } from '../core/limites'
import { construirTexto, fechaAIso, isoAFecha } from '../core/texto'
import type { Aviso as TipoAviso, CasoId, DatosGuiados } from '../core/tipos'
import type { Accion, Estado } from '../estado/estado'
import { ListaAvisos } from './Aviso'
import { PorQueImporta } from './PorQueImporta'

type Props = {
  estado: Estado
  despachar: Dispatch<Accion>
  avisos: TipoAviso[]
}

export function PasoTexto({ estado, despachar, avisos }: Props) {
  const id = useId()
  const d = estado.datosGuiados
  const cambiar = (cambios: Partial<Omit<DatosGuiados, 'caso'>>) => despachar({ tipo: 'cambiar-datos-guiados', cambios })
  const de = (...ids: string[]) => <ListaAvisos avisos={avisos.filter((a) => ids.includes(a.id))} />

  return (
    <>
      <fieldset className="grupo-radio">
        <legend>Modo</legend>
        <label>
          <input type="radio" name="modo-texto" checked={estado.modoTexto === 'guiado'} onChange={() => despachar({ tipo: 'cambiar-modo-texto', modo: 'guiado' })} /> Guiado
        </label>
        <label>
          <input type="radio" name="modo-texto" checked={estado.modoTexto === 'libre'} onChange={() => despachar({ tipo: 'cambiar-modo-texto', modo: 'libre' })} /> Libre
        </label>
      </fieldset>

      {estado.modoTexto === 'guiado' ? (
        <>
          <div className="campo">
            <label htmlFor={`${id}-caso`}>Caso</label>
            <select
              id={`${id}-caso`}
              value={d.caso}
              onChange={(e) =>
                despachar({
                  tipo: 'cambiar-caso',
                  caso: e.target.value as CasoId,
                })
              }
            >
              {PLANTILLAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div data-opcion="destinatario">
            <div className="campo">
              <label htmlFor={`${id}-destinatario`}>Destinatario</label>
              <input id={`${id}-destinatario`} type="text" value={d.destinatario} placeholder="p. ej. E-DISTRIBUCIÓN" onChange={(e) => cambiar({ destinatario: e.target.value })} />
            </div>
            {de('sin-destinatario')}
          </div>
          <PorQueImporta id="destinatario" />
          <div data-opcion="finalidad">
            <div className="campo">
              <label htmlFor={`${id}-finalidad`}>Finalidad</label>
              <input id={`${id}-finalidad`} type="text" value={d.finalidad} onChange={(e) => cambiar({ finalidad: e.target.value })} />
            </div>
            {de('sin-finalidad')}
          </div>
          <PorQueImporta id="finalidad" />
          <div className="campo">
            <label htmlFor={`${id}-referencia`}>Referencia (opcional)</label>
            <input
              id={`${id}-referencia`}
              type="text"
              value={d.referencia}
              placeholder="Nº de expediente, contrato, CUPS…"
              onChange={(e) => cambiar({ referencia: e.target.value })}
            />
          </div>
          <PorQueImporta id="referencia" />
          <div data-opcion="fecha">
            <label className="campo campo--casilla">
              <input type="checkbox" checked={d.incluirFecha} onChange={(e) => cambiar({ incluirFecha: e.target.checked })} /> Incluir fecha
            </label>
            {d.incluirFecha && (
              <div className="campo">
                <label htmlFor={`${id}-fecha`}>Fecha</label>
                <input id={`${id}-fecha`} type="date" value={fechaAIso(d.fecha)} onChange={(e) => cambiar({ fecha: isoAFecha(e.target.value) })} />
              </div>
            )}
            {de('sin-fecha')}
          </div>
          <PorQueImporta id="fecha" />
          <p>Texto de la marca:</p>
          <output className="texto-generado" aria-label="Texto generado">
            {construirTexto(d)}
          </output>
          <button type="button" className="boton boton--secundario" onClick={() => despachar({ tipo: 'editar-a-mano' })}>
            Editar a mano
          </button>
        </>
      ) : (
        <div data-opcion="texto-libre">
          <div className="campo">
            <label htmlFor={`${id}-libre`}>Texto de la marca de agua</label>
            <textarea
              id={`${id}-libre`}
              rows={3}
              maxLength={LONGITUD_MAXIMA_TEXTO}
              value={estado.textoLibre}
              onChange={(e) =>
                despachar({
                  tipo: 'cambiar-texto-libre',
                  texto: e.target.value,
                })
              }
            />
            <span className="contador">
              {estado.textoLibre.length}/{LONGITUD_MAXIMA_TEXTO}
            </span>
          </div>
          {de('texto-libre-corto')}
        </div>
      )}
    </>
  )
}
