import { Cabecera } from './ui/Cabecera'
import { Editor } from './ui/Editor'
import { PaginaBuenasPracticas } from './ui/PaginaBuenasPracticas'
import { PaginaComoComprobarlo } from './ui/PaginaComoComprobarlo'
import { useRutaHash } from './ui/useRutaHash'

export default function App() {
  const ruta = useRutaHash()
  return (
    <>
      <Cabecera />
      {ruta === 'buenas-practicas' && <PaginaBuenasPracticas />}
      {ruta === 'como-comprobarlo' && <PaginaComoComprobarlo />}
      {/* El editor sigue montado (oculto) para no perder lo que el usuario estaba haciendo. */}
      <div hidden={ruta !== 'editor'}>
        <Editor />
      </div>
    </>
  )
}
