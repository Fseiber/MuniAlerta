import { Request, Response } from 'express';
import prisma from '../db';
import { Categoria, EstadoReporte, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { clasificarGravedad } from '../services/gemini';
import { barrioMasCercano } from '../barrios';
import { esCategoria } from '../categorias';
import { agregarEscalamiento } from '../servicios/escalamiento';
import { resolverCategoria } from '../servicios/resolverCategoria';
import { crearEventoCambio, crearEventoCreacion } from '../servicios/eventosSello';
import { encolarEventoSello } from '../servicios/colaSello';

const BARRIOS_CRITICOS = ['Bañado Norte', 'Laguna Seca', 'Cambá Cuá', 'Mil Viviendas'];

function desfase(req: Request) { const valor = Number(req.query.desfaseHoras); return Number.isInteger(valor) && valor >= 0 && valor <= 168 ? valor : 0; }

export const obtenerReportes = async (req: Request, res: Response) => {
  try {
    const esDemo = req.query.esDemo === 'true';
    const reportes = await prisma.reporte.findMany({
      where: { esDemo },
      orderBy: { fechaCreacion: 'desc' },
      include: { eventosSello: { where: { tipo: 'CREACION' }, orderBy: { creadoEn: 'desc' }, take: 1, select: { selloEstado: true } } },
    });
    res.json(reportes.map((reporte) => { const { eventosSello, ...datos } = reporte; return { ...agregarEscalamiento(datos, desfase(req)), selloEstado: eventosSello[0]?.selloEstado || 'SIN_SELLO' }; }));
  } catch (error) {
    console.error('Error al obtener reportes:', error);
    res.status(500).json({ error: 'No se pudieron obtener los reportes' });
  }
};

export const obtenerReportePorId = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'El id debe ser numérico' });
      return;
    }
    const reporte = await prisma.reporte.findUnique({ where: { id }, include: { eventosSello: { orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }] } } });
    if (!reporte) {
      res.status(404).json({ error: 'Reporte no encontrado' });
      return;
    }
    res.json({ ...agregarEscalamiento(reporte, desfase(req)), selloEstado: reporte.eventosSello.find((evento) => evento.tipo === 'CREACION')?.selloEstado || 'SIN_SELLO' });
  } catch (error) {
    console.error('Error al obtener el reporte:', error);
    res.status(500).json({ error: 'No se pudo obtener el reporte' });
  }
};

export const crearReporte = async (req: Request, res: Response) => {
  try {
    const { latitud, longitud, texto, imagenBase64, categoria, esDemo, barrio, cuentaId } = req.body;
    if (typeof latitud !== 'number' || typeof longitud !== 'number' || latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) {
      res.status(400).json({ error: 'latitud y longitud deben ser numéricos' });
      return;
    }
    if ((!texto || typeof texto !== 'string' || !texto.trim()) && !imagenBase64) { res.status(400).json({ error: 'Se requiere texto o imagen' }); return; }
    if (!esCategoria(categoria)) { res.status(400).json({ error: 'Elegí el tipo de problema' }); return; }
    if (imagenBase64 !== undefined && (typeof imagenBase64 !== 'string' || imagenBase64.length >= 2_000_000)) { res.status(400).json({ error: 'La imagen es demasiado grande' }); return; }
    if (cuentaId !== undefined && typeof cuentaId !== 'string') { res.status(400).json({ error: 'cuentaId inválido' }); return; }

    let datosImagen: Buffer | undefined;
    if (typeof imagenBase64 === 'string') {
      try { datosImagen = Buffer.from(imagenBase64.replace(/^data:image\/[^;]+;base64,/, ''), 'base64'); if (!datosImagen.length) throw new Error('imagen vacía'); } catch { res.status(400).json({ error: 'imagenBase64 inválida' }); return; }
    }
    const categoriaVecino = categoria as Categoria;
    const clasificacion = await clasificarGravedad(typeof texto === 'string' ? texto.trim() : '', datosImagen?.toString('base64'), categoriaVecino);
    if (!clasificacion.esProblemaUrbano && (!texto || !texto.trim())) { res.status(422).json({ error: 'No pudimos identificar un problema en la imagen; sacá otra foto o describilo' }); return; }
    const nombreBarrio = typeof barrio === 'string' && barrio.trim()
      ? barrio.trim()
      : barrioMasCercano(latitud, longitud).nombre;

    const nuevo = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(20201015)`;
      const categoriasResueltas = resolverCategoria(categoriaVecino, clasificacion.categoria);
      const candidatos = await tx.reporte.findMany({ where: { esDemo: !!esDemo, esSemilla: false, categoria: categoriaVecino, estado: { not: EstadoReporte.RESUELTO }, fechaCreacion: { gte: new Date(Date.now() - 30 * 60_000) } } });
      const duplicado = candidatos.find((item) => {
        const dLat = (item.latitud - latitud) * 111_000;
        const dLng = (item.longitud - longitud) * 111_000 * Math.cos(latitud * Math.PI / 180);
        return Math.sqrt(dLat * dLat + dLng * dLng) <= 100;
      });
      if (duplicado) return { reporte: await tx.reporte.update({ where: { id: duplicado.id }, data: { confirmaciones: { increment: 1 } } }), eventoId: null };
      const temporal = `TEMP-${randomUUID()}`;
      const creado = await tx.reporte.create({
        data: {
          expedienteDoco: temporal,
          latitud,
          longitud,
          barrio: nombreBarrio,
          descripcion: typeof texto === 'string' && texto.trim() ? texto.trim() : 'Reporte con foto, pendiente de revisión',
          gravedad: clasificacion.gravedad,
          esTransitable: clasificacion.transitable,
          esDemo: !!esDemo,
          categoria: categoriasResueltas.categoria,
          categoriaSugeridaIa: categoriasResueltas.categoriaSugeridaIa,
          resumenIa: clasificacion.resumen || null,
          fotoHash: datosImagen ? createHash('sha256').update(datosImagen).digest('hex') : null,
          cuentaId: cuentaId || null,
          zonaCritica: BARRIOS_CRITICOS.includes(nombreBarrio),
        },
      });
      const actualizado = await tx.reporte.update({
        where: { id: creado.id },
        data: { expedienteDoco: `DOCO-2026-${String(creado.id).padStart(4, '0')}` },
      });
      const evento = await crearEventoCreacion(tx, actualizado);
      return { reporte: actualizado, eventoId: evento.id };
    }, { maxWait: 30_000, timeout: 30_000 });

    if (nuevo.eventoId) encolarEventoSello(nuevo.eventoId);
    res.status(201).json({ reporte: agregarEscalamiento(nuevo.reporte, 0), mensajeRespuesta: clasificacion.mensajeRespuesta });
  } catch (error) {
    console.error('Error al crear el reporte:', error);
    res.status(500).json({ error: 'No se pudo crear el reporte' });
  }
};

export const validarReporte = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) { res.status(400).json({ error: 'El id debe ser numérico' }); return; }
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${id})`;
      const reporte = await tx.reporte.findUnique({ where: { id } });
      if (!reporte) return null;
      if (reporte.validado) return { reporte, yaValidado: true, eventoId: null };
      const actualizado = await tx.reporte.update({ where: { id }, data: { validado: true, fechaValidacion: new Date() } });
      const evento = actualizado.esSemilla ? null : await crearEventoCambio(tx, actualizado, 'VALIDACION', 'VALIDADO');
      return { reporte: actualizado, yaValidado: false, eventoId: evento?.id || null };
    }, { maxWait: 30_000, timeout: 30_000 });
    if (!resultado) { res.status(404).json({ error: 'Reporte no encontrado' }); return; }
    if (resultado.eventoId) encolarEventoSello(resultado.eventoId);
    res.json({ reporte: resultado.reporte, yaValidado: resultado.yaValidado });
  } catch { res.status(500).json({ error: 'No se pudo validar el reporte' }); }
};

export const actualizarCategoriaReporte = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const categoria = req.body?.categoria;
  if (Number.isNaN(id)) { res.status(400).json({ error: 'El id debe ser numérico' }); return; }
  if (!esCategoria(categoria)) { res.status(400).json({ error: 'categoria inválida' }); return; }
  try {
    const actualizado = await prisma.reporte.update({ where: { id }, data: { categoria, categoriaSugeridaIa: null } });
    res.json(actualizado);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') { res.status(404).json({ error: 'Reporte no encontrado' }); return; }
    res.status(500).json({ error: 'No se pudo actualizar la categoría' });
  }
};

export const actualizarEstadoReporte = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { estado, cuadrilla } = req.body;
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'El id debe ser numérico' });
      return;
    }
    if (!Object.values(EstadoReporte).includes(estado)) {
      res.status(400).json({ error: 'estado debe ser uno de los valores permitidos' });
      return;
    }
    if (cuadrilla !== undefined && cuadrilla !== null && typeof cuadrilla !== 'string') {
      res.status(400).json({ error: 'cuadrilla debe ser un texto' });
      return;
    }
    const resultado = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${id})`;
      const actualizado = await tx.reporte.update({ where: { id }, data: { estado, cuadrilla } });
      const evento = actualizado.esSemilla ? null : await crearEventoCambio(tx, actualizado, 'CAMBIO_ESTADO', estado);
      return { actualizado, eventoId: evento?.id || null };
    }, { maxWait: 30_000, timeout: 30_000 });
    if (resultado.eventoId) encolarEventoSello(resultado.eventoId);
    res.json(resultado.actualizado);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'Reporte no encontrado' });
      return;
    }
    console.error('Error al actualizar el estado del reporte:', error);
    res.status(500).json({ error: 'No se pudo actualizar el estado del reporte' });
  }
};
