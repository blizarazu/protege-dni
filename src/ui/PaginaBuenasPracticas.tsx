import { BUENAS_PRACTICAS } from '../contenido/buenasPracticas'
import { EnlacesFuentes } from './EnlacesFuentes'

export function PaginaBuenasPracticas() {
  return (
    <main className="pagina-info">
      <h1>Buenas prácticas para compartir tu DNI</h1>
      <ol className="lista-practicas">
        {BUENAS_PRACTICAS.map((p) => (
          <li key={p.titulo}>
            <strong>{p.titulo}</strong> {p.detalle}
            <EnlacesFuentes fuentes={p.fuentes} />
          </li>
        ))}
      </ol>
      <p>
        <a href="#/">Volver al editor</a>
      </p>
    </main>
  )
}
