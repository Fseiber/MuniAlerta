import { Request, Response } from 'express';
import prisma from '../db';
import { Gravedad, EstadoReporte } from '@prisma/client';
import { clasificarGravedad } from '../services/gemini';

export const obtenerReportes = async (req: Request, res: Response) => {
  const esDemo = req.query.esDemo === 'true';
  const reportes = await prisma.reporte.findMany({
    where: { esDemo },
    orderBy: { fechaCreacion: 'desc' },
  });
  res.json(reportes);
};

export const obtenerReportePorId = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'id inválido' });
  const reporte = await prisma.reporte.findUnique({ where: { id } });
  if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });
  res.json(reporte);
};

export const crearReporte = async (req: Request, res: Response) => {
  const { latitud, longitud, texto, esDemo } = req.body;
  if (typeof latitud !== 'number' || typeof longitud !== 'number')
    return res.status(400).json({ error: 'latitud y longitud deben ser numéricos' });
  if (!texto || typeof texto !== 'string')
    return res.status(400).json({ error: 'texto es requerido' });
  // TODO: generar expedienteDoco con formato DOCO-2026-XXXX
  const ultimo = await prisma.reporte.findFirst({ orderBy: { id: 'desc' } });
  const proximoNum = ultimo ? ultimo.id + 1 : 1;
  const expedienteDoco = `DOCO-2026-${String(proximoNum).padStart(4, '0')}`;
  let gravedad: Gravedad = Gravedad.MODERADO;
  try {
    gravedad = await clasificarGravedad(texto);
  } catch (error) {
    console.error('No se pudo clasificar el reporte con Gemini:', error);
  }

  const nuevo = await prisma.reporte.create({
    data: {
      expedienteDoco,
      latitud,
      longitud,
      descripcion: texto,
      gravedad,
      esDemo: !!esDemo,
    },
  });
  res.status(201).json(nuevo);
};

export const actualizarEstadoReporte = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { estado } = req.body;
  if (isNaN(id)) return res.status(400).json({ error: 'id inválido' });
  if (!Object.values(EstadoReporte).includes(estado))
    return res.status(400).json({ error: 'estado debe ser uno de los valores permitidos' });
  const actualizado = await prisma.reporte.update({
    where: { id },
    data: { estado },
  });
  res.json(actualizado);
};
