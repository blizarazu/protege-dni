import { Paso } from './Paso'

export function Editor() {
  return (
    <main className="editor">
      <section className="editor__vista" aria-label="Vista previa" />
      <div className="editor__pasos">
        <Paso numero={1} titulo="Documento" abiertoInicial />
        <Paso numero={2} titulo="Ocultar datos (opcional)" />
        <Paso numero={3} titulo="Texto de la marca" />
        <Paso numero={4} titulo="Opciones de seguridad" />
        <Paso numero={5} titulo="Exportar" />
      </div>
    </main>
  )
}
