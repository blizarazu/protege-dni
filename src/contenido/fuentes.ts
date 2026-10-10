export type IdFuente = 'aepd-informe' | 'incibe-caso' | 'incibe-017' | 'ocu' | 'policia-genbeta' | 'maldita' | 'aeat-soporte'

export type Fuente = { titulo: string; url: string }

/** Verificadas en la tarea 17 antes de publicar. */
export const FUENTES: Record<IdFuente, Fuente> = {
  'aepd-informe': {
    titulo: 'AEPD — Informe 0048/2023 sobre la copia del DNI',
    url: 'https://www.aepd.es/documento/2023-0048.pdf',
  },
  'incibe-caso': {
    titulo: 'INCIBE — Caso real: suplantado con su DNI',
    url: 'https://www.incibe.es/linea-de-ayuda-en-ciberseguridad/casos-reales/tras-ser-suplantado-con-su-dni-acaba-debiendo-impuestos-la-agencia-tributaria',
  },
  'incibe-017': {
    titulo: 'INCIBE — Línea de Ayuda en Ciberseguridad (017)',
    url: 'https://www.incibe.es/linea-de-ayuda-en-ciberseguridad',
  },
  ocu: {
    titulo: 'OCU — Compartir el DNI con seguridad',
    url: 'https://www.ocu.org/consumo-familia/derechos-consumidor/noticias/compartir-dni-con-seguridad/',
  },
  'policia-genbeta': {
    titulo: 'Genbeta — La Policía explica cómo compartir una imagen del DNI',
    url: 'https://www.genbeta.com/seguridad/policia-explica-como-compartir-imagen-tu-dni-internet-para-evitar-ser-victima-estafas',
  },
  maldita: {
    titulo: 'Maldita — Cómo compartir una foto del DNI de forma segura',
    url: 'https://maldita.es/malditatecnologia/20240709/compartir-forma-segura-foto-dni-recop/',
  },
  'aeat-soporte': {
    titulo: 'Agencia Tributaria — Número de soporte y fechas del DNI',
    url: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/firma-digital-sistema-clave-pin-tecnica/incidencias-tecnicas-clave-pin/obtencion-fecha-dni.html',
  },
}
