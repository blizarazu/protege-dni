export const DISTINTIVO = '🔒 Tu documento no sale de este dispositivo. Todo se procesa en tu navegador.'

export const URL_REPOSITORIO = 'https://github.com/blizarazu/protege-dni'

export const MENSAJE_TRAS_EXPORTAR =
  'Listo. Cuando ya no la necesites, borra la copia de tus descargas y de los chats donde la hayas enviado.'

export const PUNTOS_COMPROBACION: readonly { titulo: string; texto: string }[] = [
  {
    titulo: 'No hay servidor que reciba nada',
    texto: 'Esta web es un conjunto de ficheros estáticos. No existe ningún sitio al que se suba tu documento: todo ocurre dentro de tu navegador.',
  },
  {
    titulo: 'Pruébalo en modo avión',
    texto: 'Después de la primera visita, la app funciona sin conexión. Activa el modo avión y verás que puedes proteger tu documento igual.',
  },
  {
    titulo: 'El navegador lo impide',
    texto: 'La página declara una política de seguridad (CSP) que hace que el propio navegador bloquee cualquier conexión a otros dominios.',
  },
  {
    titulo: 'Puedes revisarlo',
    texto: 'El código es público. Si sabes usar las herramientas de desarrollo del navegador, abre la pestaña Red: al procesar el documento no se hace ninguna petición a otros sitios.',
  },
  {
    titulo: 'Nada se guarda',
    texto: 'Sin cookies, sin analíticas y sin almacenamiento. Al cerrar la pestaña, todo desaparece.',
  },
]
