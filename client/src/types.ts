export type Gravedad = 'LEVE' | 'MODERADO' | 'GRAVE'

export type EstadoReporte = 'PENDIENTE' | 'EN_REVISION' | 'RESUELTO'
export type Categoria = 'ANEGAMIENTO' | 'ARBOLADO' | 'BASURA_CLOACAS' | 'VIAL' | 'LUMINARIA' | 'SEMAFORO' | 'CABLE_ELECTRICO'
export type EstadoSello = 'SIN_SELLO' | 'PENDIENTE' | 'ANCLADO' | 'ERROR'
export type TipoEventoSello = 'CREACION' | 'CAMBIO_ESTADO' | 'VALIDACION'

export interface EventoSello {
  id: number
  tipo: TipoEventoSello
  estadoNuevo: string | null
  hash: string
  hashPrevio: string | null
  selloEstado: EstadoSello
  hederaTransactionId: string | null
  hederaSecuencia: number | null
  tiempoConsenso: string | null
  intentos: number
  ultimoError: string | null
  creadoEn: string
}

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
  categoria: Categoria
  categoriaSugeridaIa: Categoria | null
  selloEstado?: EstadoSello
  eventosSello?: EventoSello[]
  resumenIa: string | null
  fotoHash: string | null
  cuentaId: string | null
  validado: boolean
  fechaValidacion: string | null
  confirmaciones: number
  zonaCritica: boolean
  esSemilla: boolean
  nivelEscalamiento: number
  fechaLimite: string
  textoEscalamiento: string
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
  escalados: number
  localidadesEscaladas: string[]
  categorias: string[]
}

export interface CategoriaInfo { id: Categoria; nombre: string; emoji: string; color: string }

export interface EstadoSelloRespuesta { activo: boolean; red: string | null; topicId: string | null; total: number; anclados: number; pendientes: number; errores: number }
export interface RegistroSello { exp: string; tipo: string; hash: string; secuencia: number; tiempoConsenso: string | null; enBase: boolean }
export interface VerificacionSello { expediente: string; valido: boolean; eventos: Array<{ tipo: TipoEventoSello; estadoNuevo: string | null; hash: string; hashRecalculado: string; coincideBase: boolean; coincideRed: boolean | null; secuencia: number | null; transactionId: string | null; tiempoConsenso: string | null }> }
