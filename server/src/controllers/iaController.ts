import { Request, Response } from 'express';
import prisma from '../db';
import { generarBoletin } from '../services/gemini';

export const generarBoletinDefensaCivil = async (_req: Request, res: Response) => {
  try {
    const reportes = await prisma.reporte.findMany({
      where: { estado: { not: 'RESUELTO' } },
      orderBy: { fechaCreacion: 'desc' },
      take: 30,
      select: {
        expedienteDoco: true,
        latitud: true,
        longitud: true,
        descripcion: true,
        gravedad: true,
        estado: true,
        fechaCreacion: true,
      },
    });

    const contexto = reportes.map((reporte) => JSON.stringify(reporte)).join('\n');
    const boletin = await generarBoletin(contexto || 'No hay reportes activos.');
    res.json({ boletin });
  } catch (error) {
    console.error('Error detallado de Gemini:', error);
    console.error('No se pudo generar el boletín:', error);
    res.status(500).json({ error: 'No se pudo generar el boletín' });
  }
};
