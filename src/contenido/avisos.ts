import type { IdAviso } from '../core/tipos'

export const MENSAJES_AVISO: Record<IdAviso, string> = {
  'sin-destinatario': 'Sin destinatario, la copia sirve para cualquier trámite.',
  'sin-finalidad': 'Sin finalidad, la copia sirve para cualquier uso.',
  'sin-fecha': 'Sin fecha, la copia no caduca y puede reutilizarse dentro de años.',
  'texto-libre-corto': 'Un texto tan corto o genérico (por ejemplo, «COPIA») no indica para quién ni para qué es.',
  'opacidad-baja': 'La marca es tan tenue que es fácil borrarla.',
  'opacidad-alta': 'Puede que no se lean los datos y te rechacen el documento.',
  'densidad-baja': 'Quedan zonas sin cubrir que se pueden recortar.',
  color: 'En color es más fácil manipular la copia o imprimirla como si fuera el original.',
  'sin-recuadros': 'Si el trámite no necesita la firma u otros datos, ocúltalos con un recuadro.',
  'varias-paginas': 'Envía las dos caras solo si te las piden.',
}
