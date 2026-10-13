import type { EstadoReporte, Reporte } from '../types'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

async function solicitar<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  })

  if (!respuesta.ok) {
    throw new Error(`La solicitud no pudo completarse (${respuesta.status})`)
  }

  return respuesta.json() as Promise<T>
}

export function obtenerReportes(esDemo: boolean): Promise<Reporte[]> {
  return solicitar<Reporte[]>(`/reportes?esDemo=${esDemo}`)
}

export function crearReporte(datos: {
  latitud: number
  longitud: number
  texto: string
  esDemo: boolean
}): Promise<Reporte> {
  return solicitar<Reporte>('/reportes', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export function actualizarEstadoReporte(
  id: number,
  estado: string,
): Promise<Reporte> {
  return solicitar<Reporte>(`/reportes/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado: estado as EstadoReporte }),
  })
}

export function generarBoletin(): Promise<{ boletin: string }> {
  return solicitar<{ boletin: string }>('/ia/boletin', { method: 'POST' })
}
