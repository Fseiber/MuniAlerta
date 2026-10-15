import type { Request, Response } from 'express';
import prisma from '../db';
import { EstadoSello } from '@prisma/client';
import { hederaConfigurada } from '../servicios/hedera';
import { calcularHashCreacion, calcularHashEvento } from '../servicios/sello';

const MIRROR = 'https://testnet.mirrornode.hedera.com/api/v1';
let cacheRegistro: { vence: number; mensajes: Array<{ exp: string; tipo: string; hash: string; secuencia: number; tiempoConsenso: string | null; enBase: boolean }> } | null = null;

async function pedirMirror(ruta: string, milisegundos: number) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), milisegundos);
  try { const respuesta = await fetch(`${MIRROR}${ruta}`, { signal: controlador.signal }); if (!respuesta.ok) throw new Error('Mirror Node no disponible'); return await respuesta.json() as { message?: string; consensus_timestamp?: string; sequence_number?: number; messages?: Array<{ message?: string; consensus_timestamp?: string; sequence_number?: number }> }; }
  finally { clearTimeout(temporizador); }
}

export async function estadoSello(_req: Request, res: Response) {
  try {
    const [total, anclados, pendientes, errores] = await Promise.all([
      prisma.eventoSello.count(), prisma.eventoSello.count({ where: { selloEstado: EstadoSello.ANCLADO } }), prisma.eventoSello.count({ where: { selloEstado: EstadoSello.PENDIENTE } }), prisma.eventoSello.count({ where: { selloEstado: EstadoSello.ERROR } }),
    ]);
    res.json({ activo: hederaConfigurada(), red: process.env.HEDERA_NETWORK || null, topicId: process.env.HEDERA_TOPIC_ID || null, total, anclados, pendientes, errores });
  } catch { res.status(500).json({ error: 'No se pudo obtener el estado de sellos' }); }
}

export async function verificarSello(req: Request, res: Response) {
  const expediente = req.params.expediente;
  const reporte = await prisma.reporte.findUnique({ where: { expedienteDoco: expediente }, include: { eventosSello: { orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }] } } });
  if (!reporte) { res.status(404).json({ error: 'Reporte no encontrado' }); return; }
  const eventos = [];
  for (const evento of reporte.eventosSello) {
    const hashRecalculado = evento.tipo === 'CREACION'
      ? calcularHashCreacion(reporte)
      : calcularHashEvento(reporte.expedienteDoco, evento.tipo, evento.estadoNuevo, evento.creadoEn.toISOString(), evento.hashPrevio);
    let coincideRed: boolean | null = null;
    if (evento.selloEstado === EstadoSello.ANCLADO && evento.hederaSecuencia && hederaConfigurada()) {
      try {
        const datos = await pedirMirror(`/topics/${process.env.HEDERA_TOPIC_ID}/messages/${evento.hederaSecuencia}`, 6_000);
        const mensaje = datos.message ? JSON.parse(Buffer.from(datos.message, 'base64').toString('utf8')) as { hash?: string } : null;
        coincideRed = mensaje?.hash === evento.hash;
      } catch { coincideRed = null; }
    }
    eventos.push({ tipo: evento.tipo, estadoNuevo: evento.estadoNuevo, hash: evento.hash, hashRecalculado, coincideBase: evento.hash === hashRecalculado, coincideRed, secuencia: evento.hederaSecuencia, transactionId: evento.hederaTransactionId, tiempoConsenso: evento.tiempoConsenso });
  }
  res.json({ expediente, valido: eventos.every((evento) => evento.coincideBase && evento.coincideRed !== false), eventos });
}

export async function registroSello(_req: Request, res: Response) {
  if (!hederaConfigurada()) { res.json({ disponible: false, mensajes: [] }); return; }
  if (cacheRegistro && cacheRegistro.vence > Date.now()) { res.json({ disponible: true, mensajes: cacheRegistro.mensajes }); return; }
  try {
    const datos = await pedirMirror(`/topics/${process.env.HEDERA_TOPIC_ID}/messages?limit=20&order=desc`, 6_000);
    const mensajes = [];
    for (const item of datos.messages || []) {
      try {
        const mensaje = JSON.parse(Buffer.from(item.message || '', 'base64').toString('utf8')) as { v?: number; exp?: string; tipo?: string; hash?: string };
        if (mensaje.v !== 1 || !mensaje.exp || !mensaje.tipo || !mensaje.hash) continue;
        const existe = await prisma.reporte.count({ where: { expedienteDoco: mensaje.exp } });
        mensajes.push({ exp: mensaje.exp, tipo: mensaje.tipo, hash: mensaje.hash.slice(0, 10), secuencia: item.sequence_number || 0, tiempoConsenso: item.consensus_timestamp || null, enBase: existe > 0 });
      } catch { /* ignora mensajes que no sean sellos MuniAlerta */ }
    }
    cacheRegistro = { vence: Date.now() + 15_000, mensajes };
    res.json({ disponible: true, mensajes });
  } catch { res.json({ disponible: false, mensajes: [] }); }
}
