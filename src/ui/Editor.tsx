import type { Dispatch } from 'react'
import type { NumeroPaso } from '../core/tipos'
import { avisosDe, paginaActual, textoMarca, type Accion, type Estado } from '../estado/estado'
import { Paso } from './Paso'
import { PasoDocumento } from './PasoDocumento'
import { useLiberarImagenes } from './useLiberarImagenes'
import { VistaPrevia } from './VistaPrevia'

type Props = { estado: Estado; despachar: Dispatch<Accion> }

export function Editor({ estado, despachar }: Props) {
  useLiberarImagenes(estado.paginas)
  const avisos = avisosDe(estado)
  const delPaso = (paso: NumeroPaso) => avisos.filter((a) => a.paso === paso)
  const texto = textoMarca(estado)
  const pagina = paginaActual(estado)
  const numero = pagina ? estado.paginas.indexOf(pagina) + 1 : 0

  return (
    <main className="editor">
      <section className="editor__vista" aria-label="Vista previa">
        <VistaPrevia pagina={pagina} numero={numero} total={estado.paginas.length} texto={texto} opciones={estado.opciones} />
      </section>
      <div className="editor__pasos">
        <Paso numero={1} titulo="Documento" abiertoInicial>
          <PasoDocumento estado={estado} despachar={despachar} avisos={delPaso(1)} />
        </Paso>
        <Paso numero={2} titulo="Ocultar datos (opcional)" />
        <Paso numero={3} titulo="Texto de la marca" />
        <Paso numero={4} titulo="Opciones de seguridad" />
        <Paso numero={5} titulo="Exportar" />
      </div>
    </main>
  )
}
