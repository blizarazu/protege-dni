import type { CasoId } from '../core/tipos'

export type Plantilla = { id: CasoId; etiqueta: string; finalidad: string }

/** Casos del modo guiado, en el orden en que aparecen en el selector. */
export const PLANTILLAS: readonly Plantilla[] = [
  { id: 'alquiler', etiqueta: 'Alquiler de vivienda', finalidad: 'solicitud de alquiler de vivienda' },
  { id: 'banco', etiqueta: 'Banco o entidad financiera', finalidad: 'verificación de identidad como cliente' },
  {
    id: 'suministros',
    etiqueta: 'Suministros (luz, agua, gas, telecomunicaciones)',
    finalidad: 'cambio de titular o de datos del suministro',
  },
  { id: 'administracion', etiqueta: 'Trámite con la Administración', finalidad: 'trámite administrativo' },
  { id: 'empleo', etiqueta: 'Empleo', finalidad: 'proceso de contratación' },
  { id: 'otro', etiqueta: 'Otro', finalidad: '' },
]

export function finalidadSugerida(caso: CasoId): string {
  return PLANTILLAS.find((p) => p.id === caso)?.finalidad ?? ''
}
