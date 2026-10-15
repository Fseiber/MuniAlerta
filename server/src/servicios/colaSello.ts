import prisma from '../db';
import { EstadoSello } from '@prisma/client';
import { censurarError, enviarMensajeHcs, hederaConfigurada, informarEstadoHedera, type ResultadoHedera } from './hedera';
import { construirMensaje } from './sello';

type Enviar = (texto: string) => Promise<ResultadoHedera>;
const enProceso = new Set<number>();
const esperas = [2_000, 5_000, 10_000];

function errorSeguro(error: unknown) {
  const mensaje = error instanceof Error ? error.message : 'Error desconocido al sellar';
  return censurarError(mensaje).slice(0, 300).replace(/private|secret|key|clave/gi, '[oculto]');
}

export async function procesarEventoSello(id: number, enviar: Enviar = enviarMensajeHcs, esperar: (milisegundos: number) => Promise<void> = (milisegundos) => new Promise((resolver) => setTimeout(resolver, milisegundos))) {
  if (enProceso.has(id)) return;
  enProceso.add(id);
  try {
    const evento = await prisma.eventoSello.findUnique({ where: { id }, include: { reporte: true } });
    if (!evento || evento.selloEstado === EstadoSello.ANCLADO || evento.selloEstado === EstadoSello.SIN_SELLO) return;
    const primerIntento = evento.selloEstado === EstadoSello.ERROR ? 0 : evento.intentos;
    for (let intento = primerIntento; intento < 3; intento += 1) {
      await prisma.eventoSello.update({ where: { id }, data: { selloEstado: EstadoSello.PENDIENTE, intentos: intento + 1 } });
      try {
        const respuesta = await enviar(construirMensaje({ ...evento, expedienteDoco: evento.reporte.expedienteDoco }));
        await prisma.eventoSello.update({ where: { id }, data: { selloEstado: EstadoSello.ANCLADO, hederaTransactionId: respuesta.transactionId, hederaSecuencia: respuesta.secuencia, tiempoConsenso: respuesta.tiempoConsenso, ultimoError: null } });
        return;
      } catch (error) {
        const ultimoError = errorSeguro(error);
        if (intento === 2) { await prisma.eventoSello.update({ where: { id }, data: { selloEstado: EstadoSello.ERROR, ultimoError } }); return; }
        await esperar(esperas[intento]);
      }
    }
  } catch (error) { console.error('Error controlado en la cola de sellos:', errorSeguro(error)); }
  finally { enProceso.delete(id); }
}

export function encolarEventoSello(id: number, enviar: Enviar = enviarMensajeHcs) {
  if (!hederaConfigurada()) return;
  void procesarEventoSello(id, enviar).catch((error) => console.error('No se pudo encolar un sello:', errorSeguro(error)));
}

export async function iniciarColaSello() {
  informarEstadoHedera();
  if (!hederaConfigurada()) return;
  const pendientes = await prisma.eventoSello.findMany({ where: { selloEstado: EstadoSello.PENDIENTE }, select: { id: true } });
  pendientes.forEach((evento) => encolarEventoSello(evento.id));
}

export async function reencolarSellos() {
  const eventos = await prisma.eventoSello.findMany({ where: { selloEstado: { in: [EstadoSello.PENDIENTE, EstadoSello.ERROR] } }, select: { id: true } });
  await prisma.eventoSello.updateMany({ where: { selloEstado: EstadoSello.ERROR }, data: { intentos: 0, ultimoError: null } });
  if (hederaConfigurada()) eventos.forEach((evento) => encolarEventoSello(evento.id));
  return eventos.length;
}
