import { createHash } from 'node:crypto';
import type { EventoSello, Reporte, TipoEventoSello } from '@prisma/client';

type ReporteParaHash = Pick<Reporte, 'expedienteDoco' | 'categoria' | 'latitud' | 'longitud' | 'descripcion' | 'fotoHash' | 'fechaCreacion'>;

export function calcularHashCreacion(reporte: ReporteParaHash) {
  const contenido = [reporte.expedienteDoco, reporte.categoria, reporte.latitud.toFixed(6), reporte.longitud.toFixed(6), reporte.descripcion, reporte.fotoHash || '', reporte.fechaCreacion.toISOString()].join('|');
  return createHash('sha256').update(contenido).digest('hex');
}

export function calcularHashEvento(expediente: string, tipo: TipoEventoSello, estadoNuevo: string | null, fechaISO: string, hashPrevio: string | null) {
  return createHash('sha256').update([expediente, tipo, estadoNuevo || '', fechaISO, hashPrevio || 'GENESIS'].join('|')).digest('hex');
}

export function construirMensaje(evento: Pick<EventoSello, 'tipo' | 'hash' | 'hashPrevio'> & { expedienteDoco: string }) {
  return JSON.stringify({ v: 1, exp: evento.expedienteDoco, tipo: evento.tipo, hash: evento.hash, prev: evento.hashPrevio || 'GENESIS' });
}
