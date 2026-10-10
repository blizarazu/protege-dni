import { useEffect, useId, useRef, useState } from 'react'

type Props = {
  abierto: boolean
  incorrecta: boolean
  onAceptar: (clave: string) => void
  onCancelar: () => void
}

export function DialogoContrasena({ abierto, incorrecta, onAceptar, onCancelar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [clave, setClave] = useState('')
  const id = useId()

  useEffect(() => {
    const d = dialogo.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  function cancelar() {
    setClave('')
    onCancelar()
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${id}-titulo`}
      onCancel={(e) => {
        e.preventDefault()
        cancelar()
      }}
    >
      {/* Sin acción: se cancela el envío (la CSP tiene form-action 'none'). */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const valor = clave
          setClave('')
          onAceptar(valor)
        }}
      >
        <h2 id={`${id}-titulo`}>Este PDF está protegido</h2>
        {incorrecta && (
          <p className="error" role="alert">
            Contraseña incorrecta
          </p>
        )}
        <div className="campo">
          <label htmlFor={`${id}-clave`}>Contraseña del PDF</label>
          <input id={`${id}-clave`} type="password" autoComplete="off" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus />
        </div>
        <div className="acciones">
          <button className="boton" type="submit">
            Abrir
          </button>
          <button className="boton boton--secundario" type="button" onClick={cancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
  )
}
