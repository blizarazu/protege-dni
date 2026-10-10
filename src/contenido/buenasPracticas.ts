import type { IdFuente } from './fuentes'

export type BuenaPractica = { titulo: string; detalle: string; fuentes: IdFuente[] }

export const BUENAS_PRACTICAS: readonly BuenaPractica[] = [
  {
    titulo: 'Pregunta antes si de verdad necesitan una copia.',
    detalle: 'La AEPD considera excesivo pedirla solo para identificar a alguien; a veces basta con enseñar el DNI o identificarse con certificado digital.',
    fuentes: ['aepd-informe'],
  },
  {
    titulo: 'Envía solo la cara que te pidan.',
    detalle: 'Cuantos menos datos circulen, menos se puede hacer con la copia si se filtra.',
    fuentes: ['ocu'],
  },
  {
    titulo: 'Pon una marca de agua.',
    detalle: 'Indica el destinatario, la finalidad y la fecha, y haz que cubra todo el documento.',
    fuentes: ['ocu', 'maldita'],
  },
  {
    titulo: 'Envíala en blanco y negro.',
    detalle: 'Con menos detalle es más difícil manipularla o hacerla pasar por un original.',
    fuentes: ['policia-genbeta', 'ocu'],
  },
  {
    titulo: 'Oculta los datos que el trámite no necesite.',
    detalle: 'Por ejemplo, la firma o el número de soporte, salvo que te los pidan.',
    fuentes: ['ocu', 'maldita'],
  },
  {
    titulo: 'Usa formatos aplanados.',
    detalle: 'En una imagen o en un PDF de imagen, lo que tapas no se puede recuperar quitando capas.',
    fuentes: ['ocu'],
  },
  {
    titulo: 'Envíala por canales oficiales.',
    detalle: 'Nunca por redes sociales, y no la dejes guardada en la nube ni en los chats.',
    fuentes: ['maldita'],
  },
  {
    titulo: 'Si sospechas un uso fraudulento, actúa.',
    detalle: 'Contacta con la entidad, denúncialo y llama al 017, la línea de ayuda en ciberseguridad de INCIBE.',
    fuentes: ['ocu', 'incibe-017', 'incibe-caso'],
  },
  {
    titulo: 'La marca de agua disuade, pero no es infalible.',
    detalle: 'Reduce el riesgo; no lo elimina.',
    fuentes: [],
  },
]
