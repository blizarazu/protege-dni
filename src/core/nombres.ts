import type { Formato } from './tipos'

const dosCifras = (n: number) => String(n).padStart(2, '0')

/** No reutiliza el nombre del fichero original: suele contener el nombre de la persona. */
export function nombresDeSalida(fecha: Date, formato: Formato, numPaginas: number): string[] {
  const dia = `${fecha.getFullYear()}-${dosCifras(fecha.getMonth() + 1)}-${dosCifras(fecha.getDate())}`
  if (formato === 'pdf') return [`copia-protegida-${dia}.pdf`]
  return Array.from({ length: numPaginas }, (_, i) => `copia-protegida-${dia}-p${i + 1}.jpg`)
}
