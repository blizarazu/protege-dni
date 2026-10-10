export type GrupoGuia = {
  nivel: 'ocultable' | 'con-cuidado' | 'no-ocultar'
  titulo: string
  elementos: { dato: string; detalle: string }[]
}

export const INTRO_GUIA =
  'Oculta solo lo que el trámite no necesita. Si tapas de más, te pueden pedir que lo envíes otra vez, y entonces habrá dos copias circulando.'

export const GUIA_OCULTAR: readonly GrupoGuia[] = [
  {
    nivel: 'ocultable',
    titulo: '✅ Normalmente puedes ocultarlo, salvo que te lo pidan expresamente',
    elementos: [
      { dato: 'CAN', detalle: 'el código de 6 cifras del anverso de los DNI 3.0 y 4.0. Sirve para leer el chip y en una copia no aporta nada.' },
      { dato: 'Número de soporte', detalle: 'identifica la tarjeta física y cambia con cada renovación. Algunos servicios lo usan para validar el documento: tápalo solo si no te lo piden.' },
      { dato: 'Firma', detalle: 'ocultarla evita que la copien, y rara vez se compara con una copia.' },
      { dato: 'Nombre de los padres y lugar de nacimiento', detalle: '(en los DNI que los incluyen) se usan a menudo como preguntas de seguridad y casi nunca hacen falta.' },
      { dato: 'Domicilio', detalle: 'salvo que el trámite sea precisamente acreditar dónde vives.' },
    ],
  },
  {
    nivel: 'con-cuidado',
    titulo: '⚠️ Ocúltalo solo si sabes que no lo necesitan',
    elementos: [
      { dato: 'Fotografía', detalle: 'es lo que permite comprobar que el documento es tuyo. INCIBE sugiere pixelarla, pero muchas entidades la exigen.' },
      { dato: 'Zona de lectura mecánica', detalle: '(las líneas con «<<<» del reverso) repite tus datos (también el número de soporte), pero algunas entidades la leen de forma automática. Si te piden el reverso, suele ser por esta zona o por el domicilio.' },
    ],
  },
  {
    nivel: 'no-ocultar',
    titulo: '⛔ No lo ocultes: te lo rechazarán',
    elementos: [
      { dato: 'Nombre y apellidos, número de DNI, fecha de nacimiento y fecha de validez', detalle: 'son los datos que identifican el documento y demuestran que está en vigor.' },
    ],
  },
]

export const CIERRE_GUIA = 'Si dudas, pregunta a la entidad qué datos necesita antes de enviarlo.'
