import { useState, type Dispatch } from 'react'
import type { NumeroPaso } from '../core/tipos'
import { avisosDe, paginaActual, textoMarca, type Accion, type Estado } from '../estado/estado'
import { EditorRecuadros } from './EditorRecuadros'
import { Paso } from './Paso'
import { PasoDocumento } from './PasoDocumento'
import { PasoOcultar } from './PasoOcultar'
import { PasoOpciones } from './PasoOpciones'
import { PasoTexto } from './PasoTexto'
import { useLiberarImagenes } from './useLiberarImagenes'
import { VistaPrevia } from './VistaPrevia'

type Props = { estado: Estado; despachar: Dispatch<Accion> }

export function Editor({ estado, despachar }: Props) {
  useLiberarImagenes(estado.paginas)
  // Dibujar solo con el paso 2 abierto: evita crear recuadros al hacer scroll en el móvil.
  const [ocultarActivo, setOcultarActivo] = useState(false)
  const avisos = avisosDe(estado)
  const delPaso = (paso: NumeroPaso) => avisos.filter((a) => a.paso === paso)
  const texto = textoMarca(estado)
  const pagina = paginaActual(estado)
  const numero = pagina ? estado.paginas.indexOf(pagina) + 1 : 0

  return (
    <main className="editor">
      <section className="editor__vista" aria-label="Vista previa">
        <VistaPrevia pagina={pagina} numero={numero} total={estado.paginas.length} texto={texto} opciones={estado.opciones}>
          {ocultarActivo && pagina && (
            <EditorRecuadros
              recuadros={pagina.recuadros}
              seleccionado={estado.recuadroSeleccionado}
              onAnadir={(recuadro) => despachar({ tipo: 'anadir-recuadro', paginaId: pagina.id, recuadro })}
              onSeleccionar={(id) => despachar({ tipo: 'seleccionar-recuadro', id })}
            />
          )}
        </VistaPrevia>
      </section>
      <div className="editor__pasos">
        <Paso numero={1} titulo="Documento" abiertoInicial>
          <PasoDocumento estado={estado} despachar={despachar} avisos={delPaso(1)} />
        </Paso>
        <Paso numero={2} titulo="Ocultar datos (opcional)" onToggle={setOcultarActivo}>
          <PasoOcultar estado={estado} despachar={despachar} avisos={delPaso(2)} />
        </Paso>
        <Paso numero={3} titulo="Texto de la marca">
          <PasoTexto estado={estado} despachar={despachar} avisos={delPaso(3)} />
        </Paso>
        <Paso numero={4} titulo="Opciones de seguridad">
          <PasoOpciones opciones={estado.opciones} despachar={despachar} avisos={delPaso(4)} />
        </Paso>
        <Paso numero={5} titulo="Exportar" />
      </div>
    </main>
  )
}
