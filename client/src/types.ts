export type Gravedad = 'LEVE' | 'MODERADO' | 'GRAVE'

export type EstadoReporte = 'PENDIENTE' | 'EN_REVISION' | 'RESUELTO'

export interface Reporte {
  id: number
  expedienteDoco: string
  latitud: number
  longitud: number
  barrio: string | null
  descripcion: string
  gravedad: Gravedad
  esTransitable: boolean | null
  estado: EstadoReporte
  esDemo: boolean
  umbralLluvia: number | null
  trazado: Array<[number, number]> | null
  radioCharcoM: number | null
  cuadrilla: string | null
  fechaCreacion: string
}

export interface Barrio {
  nombre: string
  lat: number
  lng: number
}

export interface GrupoBoletin {
  gravedad: Gravedad
  total: number
  barrios: Array<{ nombre: string; reportes: number; sinPaso: number }>
}

export interface Boletin {
  grupos: GrupoBoletin[]
  accionSugerida: string
}
