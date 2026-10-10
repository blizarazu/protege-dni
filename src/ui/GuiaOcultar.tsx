import { useId } from 'react'
import { CIERRE_GUIA, GUIA_OCULTAR, INTRO_GUIA } from '../contenido/guiaOcultar'

export function GuiaOcultar() {
  const id = useId()
  return (
    <section className="guia" aria-labelledby={id}>
      <h3 id={id}>Qué puedes ocultar</h3>
      <p>{INTRO_GUIA}</p>
      {GUIA_OCULTAR.map((grupo) => (
        <div key={grupo.nivel}>
          <h4>{grupo.titulo}</h4>
          <ul>
            {grupo.elementos.map((e) => (
              <li key={e.dato}>
                <strong>{e.dato}:</strong> {e.detalle}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p>{CIERRE_GUIA}</p>
    </section>
  )
}
