import type { EstadoReporte, Gravedad } from '@prisma/client';

export const PLAZOS_HORAS: Record<Gravedad, number> = { GRAVE: 4, MODERADO: 24, LEVE: 72 };

export function agregarEscalamiento<T extends { estado: EstadoReporte; gravedad: Gravedad; fechaCreacion: Date; esDemo: boolean }>(reporte: T, desfaseHoras = 0) {
  const plazo = PLAZOS_HORAS[reporte.gravedad];
  const ahora = Date.now() + (reporte.esDemo ? desfaseHoras : 0) * 3_600_000;
  const fechaLimite = new Date(reporte.fechaCreacion.getTime() + plazo * 3_600_000);
  const horas = (ahora - reporte.fechaCreacion.getTime()) / 3_600_000;
  const nivelEscalamiento = reporte.estado !== 'PENDIENTE' ? 0 : horas > plazo * 2 ? 2 : horas > plazo ? 1 : 0;
  return { ...reporte, nivelEscalamiento, fechaLimite: fechaLimite.toISOString(), textoEscalamiento: nivelEscalamiento === 2 ? 'Escalado a secretaría' : nivelEscalamiento === 1 ? 'Escalado a supervisor' : 'En plazo' };
}
