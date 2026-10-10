import type { Dispatch } from 'react'
import type { Aviso as TipoAviso } from '../core/tipos'
import { paginaActual, type Accion, type Estado } from '../estado/estado'
import { ListaAvisos } from './Aviso'
import { GuiaOcultar } from './GuiaOcultar'
import { PorQueImporta } from './PorQueImporta'

type Props = { estado: Estado; despachar: Dispatch<Accion>; avisos: TipoAviso[] }

export function PasoOcultar({ estado, despachar, avisos }: Props) {
  const pagina = paginaActual(estado)
  const seleccionado = estado.recuadroSeleccionado
  return (
    <>
      {pagina ? (
        <>
          <p>Arrastra sobre la vista previa para tapar un dato con un recuadro negro. Toca un recuadro para seleccionarlo.</p>
          <p role="status">Recuadros en esta página: {pagina.recuadros.length}</p>
          <div className="acciones">
            <button
              type="button"
              className="boton boton--secundario"
              disabled={!seleccionado}
              onClick={() => seleccionado && despachar({ tipo: 'eliminar-recuadro', paginaId: pagina.id, id: seleccionado })}
            >
              Eliminar recuadro
            </button>
            <button
              type="button"
              className="boton boton--secundario"
              disabled={pagina.recuadros.length === 0}
              onClick={() => despachar({ tipo: 'quitar-recuadros', paginaId: pagina.id })}
            >
              Quitar todos
            </button>
          </div>
        </>
      ) : (
        <p>Primero carga un documento.</p>
      )}
      <PorQueImporta id="ocultar" />
      <ListaAvisos avisos={avisos} />
      <GuiaOcultar />
    </>
  )
}
