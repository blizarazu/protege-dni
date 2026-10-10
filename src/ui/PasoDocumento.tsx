import { useState, type ChangeEvent, type Dispatch } from 'react'
import { MENSAJES_ERROR } from '../contenido/errores'
import { cargarArchivo, ErrorCarga } from '../core/cargar'
import { MAXIMO_PAGINAS } from '../core/limites'
import type { Aviso as TipoAviso } from '../core/tipos'
import type { Accion, Estado } from '../estado/estado'
import { ListaAvisos } from './Aviso'
import { DialogoContrasena } from './DialogoContrasena'
import { Miniatura } from './Miniatura'

const ACEPTADOS = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif'

type Peticion = { incorrecta: boolean; resolver: (clave: string | null) => void }
type Props = { estado: Estado; despachar: Dispatch<Accion>; avisos: TipoAviso[] }

const esTactil = () => window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0

export function PasoDocumento({ estado, despachar, avisos }: Props) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [peticion, setPeticion] = useState<Peticion | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [tactil] = useState(esTactil)

  const pedirContrasena = (incorrecta: boolean) =>
    new Promise<string | null>((resolver) => setPeticion({ incorrecta, resolver }))

  async function procesar(ficheros: File[]) {
    if (ficheros.length === 0) return
    setError(null)
    setOcupado(true)
    let total = estado.paginas.length
    try {
      for (const fichero of ficheros) {
        const capacidad = MAXIMO_PAGINAS - total
        if (capacidad <= 0) {
          setError(MENSAJES_ERROR.limite)
          break
        }
        try {
          const { paginas, omitidas } = await cargarArchivo(fichero, pedirContrasena, capacidad)
          total += paginas.length
          if (paginas.length > 0) despachar({ tipo: 'anadir-paginas', paginas })
          if (omitidas > 0) {
            setError(MENSAJES_ERROR.limite)
            break
          }
        } catch (e) {
          if (e instanceof ErrorCarga) {
            const codigo = e.codigo
            if (codigo !== 'cancelado') setError(MENSAJES_ERROR[codigo])
          } else {
            setError(MENSAJES_ERROR.desconocido)
          }
        }
      }
    } finally {
      setOcupado(false)
    }
  }

  function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const ficheros = Array.from(e.target.files ?? [])
    e.target.value = '' // permite volver a elegir el mismo fichero
    void procesar(ficheros)
  }

  const total = estado.paginas.length
  return (
    <>
      <div
        className={`zona-soltar${arrastrando ? ' zona-soltar--activa' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          void procesar(Array.from(e.dataTransfer.files))
        }}
      >
        <p>Carga la copia de tu DNI (PDF, JPG o PNG). También puedes arrastrarla aquí.</p>
        <div className="acciones">
          <label className="boton">
            Elegir archivo
            <input className="visualmente-oculto" type="file" accept={ACEPTADOS} multiple onChange={alElegir} disabled={ocupado} />
          </label>
          {tactil && (
            <label className="boton boton--secundario">
              Hacer foto
              <input className="visualmente-oculto" type="file" accept="image/*" capture="environment" onChange={alElegir} disabled={ocupado} />
            </label>
          )}
        </div>
      </div>
      {ocupado && (
        <p className="ocupado" role="status">
          Procesando…
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {total > 0 && (
        <ol className="miniaturas" aria-label="Páginas">
          {estado.paginas.map((p, i) => {
            const seleccionada = p.id === estado.paginaSeleccionada
            return (
              <li key={p.id} className={`miniatura${seleccionada ? ' miniatura--seleccionada' : ''}`}>
                <button
                  type="button"
                  className="miniatura__ver"
                  aria-label={`Ver página ${i + 1}`}
                  aria-pressed={seleccionada}
                  onClick={() => despachar({ tipo: 'seleccionar-pagina', id: p.id })}
                >
                  <Miniatura imagen={p.imagen} etiqueta={`Miniatura de la página ${i + 1}`} />
                  <span>Página {i + 1}</span>
                </button>
                <div className="acciones">
                  <button type="button" className="boton boton--secundario" aria-label={`Subir página ${i + 1}`} disabled={i === 0} onClick={() => despachar({ tipo: 'mover-pagina', id: p.id, direccion: -1 })}>
                    ↑
                  </button>
                  <button type="button" className="boton boton--secundario" aria-label={`Bajar página ${i + 1}`} disabled={i === total - 1} onClick={() => despachar({ tipo: 'mover-pagina', id: p.id, direccion: 1 })}>
                    ↓
                  </button>
                  <button type="button" className="boton boton--secundario" aria-label={`Eliminar página ${i + 1}`} onClick={() => despachar({ tipo: 'eliminar-pagina', id: p.id })}>
                    Eliminar
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      <ListaAvisos avisos={avisos} />
      <DialogoContrasena
        abierto={peticion !== null}
        incorrecta={peticion?.incorrecta ?? false}
        onAceptar={(clave) => {
          peticion?.resolver(clave)
          setPeticion(null)
        }}
        onCancelar={() => {
          peticion?.resolver(null)
          setPeticion(null)
        }}
      />
    </>
  )
}
