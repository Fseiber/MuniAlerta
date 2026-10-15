import type { Prisma, Reporte, TipoEventoSello } from '@prisma/client';
import { EstadoSello } from '@prisma/client';
import { hederaConfigurada } from './hedera';
import { calcularHashCreacion, calcularHashEvento } from './sello';

export async function crearEventoCreacion(tx: Prisma.TransactionClient, reporte: Reporte) {
  const creadoEn = new Date();
  return tx.eventoSello.create({ data: { reporteId: reporte.id, tipo: 'CREACION', hash: calcularHashCreacion(reporte), hashPrevio: null, selloEstado: hederaConfigurada() ? EstadoSello.PENDIENTE : EstadoSello.SIN_SELLO, creadoEn } });
}

export async function crearEventoCambio(tx: Prisma.TransactionClient, reporte: Reporte, tipo: TipoEventoSello, estadoNuevo: string) {
  const anterior = await tx.eventoSello.findFirst({ where: { reporteId: reporte.id }, orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }] });
  const creadoEn = new Date();
  return tx.eventoSello.create({ data: { reporteId: reporte.id, tipo, estadoNuevo, hashPrevio: anterior?.hash || null, hash: calcularHashEvento(reporte.expedienteDoco, tipo, estadoNuevo, creadoEn.toISOString(), anterior?.hash || null), selloEstado: hederaConfigurada() ? EstadoSello.PENDIENTE : EstadoSello.SIN_SELLO, creadoEn } });
}
