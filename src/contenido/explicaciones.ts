import type { IdFuente } from './fuentes'

export type IdExplicacion =
  | 'destinatario'
  | 'finalidad'
  | 'referencia'
  | 'fecha'
  | 'opacidad'
  | 'densidad'
  | 'color'
  | 'ocultar'
  | 'formato'

export const EXPLICACIONES: Record<IdExplicacion, { texto: string; fuentes: IdFuente[] }> = {
  destinatario: {
    texto: 'Indicar a quién va dirigida la copia hace que cualquier otra persona o empresa que la reciba vea que no es para ella y la rechace.',
    fuentes: [],
  },
  finalidad: {
    texto: 'Limita la copia a un trámite concreto. Si alguien intenta usarla para otra cosa (abrir una cuenta, pedir un préstamo…), el texto lo delata.',
    fuentes: [],
  },
  referencia: {
    texto: 'Un número de expediente, de contrato o un CUPS ata la copia a un único trámite. Es opcional, pero refuerza mucho la protección.',
    fuentes: [],
  },
  fecha: {
    texto: 'Una copia sin fecha puede reutilizarse indefinidamente. Con fecha, quien la reciba meses después sabrá que no se hizo para su trámite.',
    fuentes: [],
  },
  opacidad: {
    texto: 'Una marca muy tenue es fácil de borrar con un editor o con inteligencia artificial; una muy intensa puede impedir leer los datos y hacer que rechacen el documento. Entre el 30 % y el 60 % es un buen equilibrio.',
    fuentes: [],
  },
  densidad: {
    texto: 'La marca se repite por todo el documento para que no se pueda recortar una zona limpia. Con densidad baja quedan huecos más grandes.',
    fuentes: [],
  },
  color: {
    texto: 'La Policía Nacional y la OCU recomiendan enviar la copia en blanco y negro: con menos detalle es más difícil manipularla o hacerla pasar por un original.',
    fuentes: ['policia-genbeta', 'ocu'],
  },
  ocultar: {
    texto: 'Tapar lo que el trámite no necesita reduce lo que se puede hacer con la copia si se filtra. Los recuadros se integran en la imagen y no se pueden quitar.',
    fuentes: ['ocu', 'maldita'],
  },
  formato: {
    texto: 'Tanto el PDF como el JPG se generan como una imagen plana: sin texto seleccionable, sin capas y sin metadatos (tampoco la ubicación GPS de la foto).',
    fuentes: [],
  },
}
