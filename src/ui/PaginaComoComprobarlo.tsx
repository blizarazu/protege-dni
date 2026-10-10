import { PUNTOS_COMPROBACION, URL_REPOSITORIO } from '../contenido/privacidad'

export function PaginaComoComprobarlo() {
  return (
    <main className="pagina-info">
      <h1>¿Cómo puedo comprobar que mi documento no sale de mi dispositivo?</h1>
      {PUNTOS_COMPROBACION.map((p) => (
        <section key={p.titulo}>
          <h2>{p.titulo}</h2>
          <p>{p.texto}</p>
        </section>
      ))}
      <p>
        <a href={URL_REPOSITORIO} target="_blank" rel="noopener noreferrer">
          Ver el código en GitHub
        </a>
      </p>
      <p>
        <a href="#/">Volver al editor</a>
      </p>
    </main>
  )
}
