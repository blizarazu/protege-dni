import { DISTINTIVO } from '../contenido/privacidad'

export function Cabecera() {
  return (
    <header className="cabecera">
      <a className="cabecera__nombre" href="#/">
        Protege DNI
      </a>
      <p className="distintivo">
        {DISTINTIVO} <a href="#/como-comprobarlo">¿Cómo puedo comprobarlo?</a>
      </p>
      <nav aria-label="Principal">
        <a href="#/buenas-practicas">Buenas prácticas</a>
      </nav>
    </header>
  )
}
