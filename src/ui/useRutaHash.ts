import { useEffect, useState } from 'react'

export type Ruta = 'editor' | 'buenas-practicas' | 'como-comprobarlo'

export function rutaDesdeHash(hash: string): Ruta {
  if (hash === '#/buenas-practicas') return 'buenas-practicas'
  if (hash === '#/como-comprobarlo') return 'como-comprobarlo'
  return 'editor'
}

/** Navegación por hash: funciona en GitHub Pages sin configuración del servidor. */
export function useRutaHash(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(() => rutaDesdeHash(window.location.hash))
  useEffect(() => {
    const alCambiar = () => {
      setRuta(rutaDesdeHash(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])
  return ruta
}
