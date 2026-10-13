import { Request, Response } from 'express';
import prisma from '../db';
import { EstadoReporte, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { clasificarGravedad } from '../services/gemini';
import { barrioMasCercano } from '../barrios';

export const obtenerReportes = async (req: Request, res: Response) => {
  try {
    const esDemo = req.query.esDemo === 'true';
    const reportes = await prisma.reporte.findMany({
      where: { esDemo },
      orderBy: { fechaCreacion: 'desc' },
    });
    res.json(reportes);
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
    const reporte = await prisma.reporte.findUnique({ where: { id } });
    if (!reporte) {
      res.status(404).json({ error: 'Reporte no encontrado' });
      return;
    }
    res.json(reporte);
  } catch (error) {
    console.error('Error al obtener el reporte:', error);
    res.status(500).json({ error: 'No se pudo obtener el reporte' });
  }
};

export const crearReporte = async (req: Request, res: Response) => {
  try {
    const { latitud, longitud, texto, esDemo, barrio } = req.body;
    if (typeof latitud !== 'number' || typeof longitud !== 'number') {
      res.status(400).json({ error: 'latitud y longitud deben ser numéricos' });
      return;
    }
    if (!texto || typeof texto !== 'string') {
      res.status(400).json({ error: 'texto es requerido' });
      return;
    }

    const clasificacion = await clasificarGravedad(texto);
    const nombreBarrio = typeof barrio === 'string' && barrio.trim()
      ? barrio.trim()
      : barrioMasCercano(latitud, longitud).nombre;

    const nuevo = await prisma.$transaction(async (tx) => {
      const temporal = `TEMP-${randomUUID()}`;
      const creado = await tx.reporte.create({
        data: {
          expedienteDoco: temporal,
          latitud,
          longitud,
          barrio: nombreBarrio,
          descripcion: texto,
          gravedad: clasificacion.gravedad,
          esTransitable: clasificacion.transitable,
          esDemo: !!esDemo,
        },
      });
      return tx.reporte.update({
        where: { id: creado.id },
        data: { expedienteDoco: `DOCO-2026-${String(creado.id).padStart(4, '0')}` },
      });
    });

    res.status(201).json({ reporte: nuevo, mensajeRespuesta: clasificacion.mensajeRespuesta });
  } catch (error) {
    console.error('Error al crear el reporte:', error);
    res.status(500).json({ error: 'No se pudo crear el reporte' });
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
    const actualizado = await prisma.reporte.update({ where: { id }, data: { estado, cuadrilla } });
    res.json(actualizado);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ error: 'Reporte no encontrado' });
      return;
    }
    console.error('Error al actualizar el estado del reporte:', error);
    res.status(500).json({ error: 'No se pudo actualizar el estado del reporte' });
  }
};
