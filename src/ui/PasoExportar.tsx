import { useState, type Dispatch } from 'react'
import { MENSAJES_ERROR } from '../contenido/errores'
import { MENSAJE_TRAS_EXPORTAR } from '../contenido/privacidad'
import { compartir, descargar, generarFicheros, puedeCompartir } from '../core/exportar'
import type { Aviso as TipoAviso, Formato } from '../core/tipos'
import type { Accion, Estado } from '../estado/estado'
import { ListaAvisos } from './Aviso'
import { PorQueImporta } from './PorQueImporta'

const FORMATOS: { valor: Formato; etiqueta: string }[] = [
  { valor: 'pdf', etiqueta: 'PDF' },
  { valor: 'jpg', etiqueta: 'JPG' },
]

/** Copia generada junto con las entradas que la produjeron, para detectar si quedó obsoleta. */
type Preparado = { ficheros: File[]; paginas: Estado['paginas']; texto: string; opciones: Estado['opciones'] }
type Props = { estado: Estado; despachar: Dispatch<Accion>; texto: string; avisos: TipoAviso[] }

export function PasoExportar({ estado, despachar, texto, avisos }: Props) {
  const [preparado, setPreparado] = useState<Preparado | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState(false)

  const vigente =
    preparado &&
    preparado.paginas === estado.paginas &&
    preparado.texto === texto &&
    preparado.opciones === estado.opciones
      ? preparado
      : null
  const bloqueo =
    estado.paginas.length === 0
      ? 'Carga un documento para poder exportarlo.'
      : texto === ''
        ? 'Escribe el texto de la marca de agua.'
        : null

  async function generar() {
    setError(null)
    setHecho(false)
    setOcupado(true)
    try {
      const ficheros = await generarFicheros(estado.paginas, texto, estado.opciones, new Date())
      setPreparado({ ficheros, paginas: estado.paginas, texto, opciones: estado.opciones })
    } catch {
      setError(MENSAJES_ERROR.exportar)
    } finally {
      setOcupado(false)
    }
  }

  // Se llama directamente desde el clic, sin esperas previas: Safari lo exige para compartir.
  async function alCompartir(ficheros: File[]) {
    setError(null)
    try {
      if ((await compartir(ficheros)) === 'compartido') setHecho(true)
    } catch {
      setError(MENSAJES_ERROR.compartir)
    }
  }

  function alDescargar(ficheros: File[]) {
    descargar(ficheros)
    setHecho(true)
  }

  return (
    <>
      <fieldset className="grupo-radio">
        <legend>Formato</legend>
        {FORMATOS.map((f) => (
          <label key={f.valor}>
            <input
              type="radio"
              name="formato"
              checked={estado.opciones.formato === f.valor}
              onChange={() => despachar({ tipo: 'cambiar-opciones', cambios: { formato: f.valor } })}
            />{' '}
            {f.etiqueta}
          </label>
        ))}
      </fieldset>
      <PorQueImporta id="formato" />

      <section aria-label="Resumen de avisos" aria-live="polite">
        <h3 className="resumen-avisos__titulo">
          {avisos.length === 0 ? 'Sin avisos: la configuración es segura.' : `Avisos activos (${avisos.length})`}
        </h3>
        <ListaAvisos avisos={avisos} />
      </section>

      {bloqueo && <p className="nota">{bloqueo}</p>}
      <div className="acciones">
        <button type="button" className="boton" disabled={bloqueo !== null || ocupado} onClick={() => void generar()}>
          {ocupado ? 'Generando…' : 'Generar copia protegida'}
        </button>
      </div>

      {vigente && (
        <div className="preparado">
          <p>Copia lista: {vigente.ficheros.map((f) => f.name).join(', ')}</p>
          <div className="acciones">
            {puedeCompartir(vigente.ficheros) && (
              <button type="button" className="boton" onClick={() => void alCompartir(vigente.ficheros)}>
                Compartir
              </button>
            )}
            <button type="button" className="boton boton--secundario" onClick={() => alDescargar(vigente.ficheros)}>
              Descargar
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {hecho && vigente && (
        <p className="exito" role="status">
          {MENSAJE_TRAS_EXPORTAR}
        </p>
      )}
    </>
  )
}
