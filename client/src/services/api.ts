import type { Barrio, Boletin, Categoria, CategoriaInfo, EstadoReporte, EstadoSelloRespuesta, Reporte, RegistroSello, VerificacionSello } from '../types'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

async function solicitar<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const token = (() => { try { return sessionStorage.getItem('munialerta-token') } catch { return null } })()
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opciones,
  })

  if (!respuesta.ok) {
    const error = new Error(`La solicitud no pudo completarse (${respuesta.status})`); (error as Error & { status?: number }).status = respuesta.status; throw error
  }

  return respuesta.json() as Promise<T>
}

export function obtenerReportes(esDemo: boolean, desfaseHoras = 0): Promise<Reporte[]> {
  return solicitar<Reporte[]>(`/reportes?esDemo=${esDemo}&desfaseHoras=${desfaseHoras}`)
}
export function obtenerReporte(id: number): Promise<Reporte> { return solicitar<Reporte>(`/reportes/${id}`) }

export function obtenerBarrios(): Promise<Barrio[]> {
  return solicitar<Barrio[]>('/barrios')
}

export function crearReporte(datos: {
  latitud: number
  longitud: number
  texto?: string
  imagenBase64?: string
  categoria: Categoria
  cuentaId?: string
  barrio?: string
  esDemo: boolean
}): Promise<{ reporte: Reporte; mensajeRespuesta: string }> {
  return solicitar<{ reporte: Reporte; mensajeRespuesta: string }>('/reportes', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export function actualizarEstadoReporte(
  id: number,
  estado: string,
  cuadrilla?: string,
): Promise<Reporte> {
  return solicitar<Reporte>(`/reportes/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado: estado as EstadoReporte, cuadrilla }),
  })
}

export function generarBoletin(esDemo: boolean, nivelLluvia: number): Promise<Boletin> {
  return solicitar<Boletin>('/ia/boletin', {
    method: 'POST',
    body: JSON.stringify({ esDemo, nivelLluvia }),
  })
}

export function obtenerCategorias(): Promise<CategoriaInfo[]> { return solicitar<CategoriaInfo[]>('/categorias') }
export async function iniciarSesion(clave: string): Promise<{ token: string }> {
  const controlador = new AbortController()
  const temporizador = window.setTimeout(() => controlador.abort(), 8_000)
  try {
    const respuesta = await fetch(`${API_URL}/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave }), signal: controlador.signal })
    if (!respuesta.ok) {
      let mensaje = ''
      try { mensaje = (await respuesta.json() as { error?: string }).error || '' } catch { /* respuesta sin JSON */ }
      const error = new Error(mensaje || `La solicitud no pudo completarse (${respuesta.status})`) as Error & { status?: number }
      error.status = respuesta.status
      throw error
    }
    return await respuesta.json() as { token: string }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') { const timeout = new Error('timeout') as Error & { status?: number }; timeout.status = 0; throw timeout }
    if (error instanceof TypeError) { const red = new Error('network') as Error & { status?: number }; red.status = 0; throw red }
    throw error
  } finally { window.clearTimeout(temporizador) }
}
export function validarReporte(id: number): Promise<{ reporte: Reporte; yaValidado: boolean }> { return solicitar(`/reportes/${id}/validar`, { method: 'POST' }) }
export function actualizarCategoriaReporte(id: number, categoria: Categoria): Promise<Reporte> { return solicitar(`/reportes/${id}/categoria`, { method: 'PATCH', body: JSON.stringify({ categoria }) }) }
export function reiniciarDemo(): Promise<{ ok: boolean }> { return solicitar('/demo/reiniciar', { method: 'POST' }) }
export function obtenerEstadoSello(): Promise<EstadoSelloRespuesta> { return solicitar<EstadoSelloRespuesta>('/sello/estado') }
export function verificarSello(expediente: string): Promise<VerificacionSello> { return solicitar<VerificacionSello>(`/sello/verificar/${encodeURIComponent(expediente)}`) }
export function obtenerRegistroSello(): Promise<{ disponible: boolean; mensajes: RegistroSello[] }> { return solicitar('/sello/registro') }
export function reintentarSellos(): Promise<{ reencolados: number }> { return solicitar('/sello/reintentar', { method: 'POST' }) }
