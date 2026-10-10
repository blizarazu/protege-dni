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
  const [compartido, setCompartido] = useState(false)
  const [descargadas, setDescargadas] = useState<ReadonlySet<number>>(new Set())

  const vigente =
    preparado &&
    preparado.paginas === estado.paginas &&
    preparado.texto === texto &&
    preparado.opciones === estado.opciones
      ? preparado
      : null
  const porPagina = vigente !== null && vigente.ficheros.length > 1
  const hecho = vigente !== null && (compartido || descargadas.size >= vigente.ficheros.length)
  const bloqueo =
    estado.paginas.length === 0
      ? 'Carga un documento para poder exportarlo.'
      : texto === ''
        ? 'Escribe el texto de la marca de agua.'
        : null

  async function generar() {
    setError(null)
    setCompartido(false)
    setDescargadas(new Set())
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
      if ((await compartir(ficheros)) === 'compartido') setCompartido(true)
    } catch {
      setError(MENSAJES_ERROR.compartir)
    }
  }

  function alDescargar(ficheros: File[], indices: number[]) {
    descargar(ficheros)
    setDescargadas((previas) => new Set([...previas, ...indices]))
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
      {ocupado && (
        <p className="nota" role="status">
          Generando…
        </p>
      )}

      <div aria-live="polite">
        {vigente && (
          <div className="preparado">
            <p>Copia lista: {vigente.ficheros.map((f) => f.name).join(', ')}</p>
            {porPagina && <p className="nota">Descarga cada página por separado.</p>}
          </div>
        )}
      </div>
      {vigente && (
        <div className="acciones">
          {puedeCompartir(vigente.ficheros) && (
            <button type="button" className="boton" onClick={() => void alCompartir(vigente.ficheros)}>
              Compartir
            </button>
          )}
          {porPagina ? (
            vigente.ficheros.map((fichero, i) => (
              <button
                key={fichero.name}
                type="button"
                className="boton boton--secundario"
                disabled={descargadas.has(i)}
                onClick={() => alDescargar([fichero], [i])}
              >
                {descargadas.has(i) ? `Página ${i + 1} descargada ✓` : `Descargar página ${i + 1}`}
              </button>
            ))
          ) : (
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => alDescargar(vigente.ficheros, [0])}
            >
              Descargar
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {hecho && (
        <p className="exito" role="status">
          {MENSAJE_TRAS_EXPORTAR}
        </p>
      )}
    </>
  )
}
