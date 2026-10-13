export type Gravedad = 'LEVE' | 'MODERADO' | 'GRAVE'

export type EstadoReporte = 'PENDIENTE' | 'EN_REVISION' | 'RESUELTO'

export interface Reporte {
  id: number
  expedienteDoco: string
  latitud: number
  longitud: number
  descripcion: string
  gravedad: Gravedad
  esTransitable: boolean
  estado: EstadoReporte
  esDemo: boolean
  umbralLluvia: number | null
  fechaCreacion: string
}
