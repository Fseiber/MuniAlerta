import { Request, Response } from 'express';
import prisma from '../db';
import { generarAccionSugerida } from '../services/gemini';
import { agregarEscalamiento } from '../servicios/escalamiento';
import { categorias } from '../categorias';

export const generarBoletinDefensaCivil = async (req: Request, res: Response) => {
  try {
    const { esDemo, nivelLluvia } = req.body as { esDemo?: boolean; nivelLluvia?: number };
    const modoDemo = esDemo === true;
    const lluvia = typeof nivelLluvia === 'number' ? nivelLluvia : 100;
    const reportesBase = await prisma.reporte.findMany({
      where: {
        esDemo: modoDemo,
        estado: { not: 'RESUELTO' },
        ...(modoDemo ? {
          OR: [{ umbralLluvia: null }, { umbralLluvia: { lte: lluvia } }],
        } : {}),
      },
      orderBy: { fechaCreacion: 'desc' },
      take: 30,
      select: {
        barrio: true,
        gravedad: true,
        esTransitable: true,
        descripcion: true,
        categoria: true,
        fechaCreacion: true,
        estado: true,
        esDemo: true,
      },
    });
    const reportes = reportesBase.map((reporte) => agregarEscalamiento(reporte, 0));
    const escalados = reportes.filter((reporte) => reporte.nivelEscalamiento > 0);

    const ordenGravedad = ['GRAVE', 'MODERADO', 'LEVE'] as const;
    const grupos = ordenGravedad.map((gravedad) => {
      const delGrupo = reportes.filter((reporte) => reporte.gravedad === gravedad);
      const porBarrio = new Map<string, { cantidad: number; sinPaso: number }>();
      delGrupo.forEach((reporte) => {
        const nombre = reporte.barrio || 'Barrio sin informar';
        const actual = porBarrio.get(nombre) || { cantidad: 0, sinPaso: 0 };
        actual.cantidad += 1;
        if (reporte.esTransitable === false) actual.sinPaso += 1;
        porBarrio.set(nombre, actual);
      });
      return { gravedad, total: delGrupo.length, barrios: [...porBarrio.entries()].sort((a, b) => b[1].cantidad - a[1].cantidad || a[0].localeCompare(b[0])) };
    }).filter((grupo) => grupo.total > 0);

    const porCategoria = categorias.map((categoria) => `${categoria.emoji} ${categoria.nombre}: ${reportes.filter((reporte) => reporte.categoria === categoria.id).length}`);
    const lineas = [
      `ESCALADOS (${escalados.length})`,
      ...[...new Set(escalados.map((reporte) => reporte.barrio || 'Barrio sin informar'))].map((barrio) => `• ${barrio}`),
      `CATEGORÍAS: ${porCategoria.join(', ')}`,
      ...grupos.flatMap((grupo) => [
      `${grupo.gravedad === 'GRAVE' ? 'GRAVES' : `${grupo.gravedad}S`} (${grupo.total})`,
      ...grupo.barrios.map(([barrio, datos]) => `• ${barrio}: ${datos.cantidad} reportes, ${datos.sinPaso} sin paso`),
      ]),
    ];
    const resumen = lineas.length > 0 ? lineas.join('\n') : 'No hay reportes activos.';
    const grave = grupos.find((grupo) => grupo.gravedad === 'GRAVE')?.barrios[0]?.[0];
    const accionFija = grave
      ? `Priorizar cuadrillas en ${grave}`
      : grupos.length > 0 ? 'Sin emergencias críticas: mantener monitoreo' : 'Sin incidentes activos.';
    let accion = accionFija;
    if (grupos.length > 0) {
      try {
        accion = await generarAccionSugerida(resumen);
      } catch (error) {
        console.error('No se pudo generar la acción del boletín:', error);
      }
    }
    res.json({ escalados: escalados.length, localidadesEscaladas: [...new Set(escalados.map((reporte) => reporte.barrio || 'Barrio sin informar'))], categorias: porCategoria, grupos: grupos.map((grupo) => ({ gravedad: grupo.gravedad, total: grupo.total, barrios: grupo.barrios.map(([nombre, datos]) => ({ nombre, reportes: datos.cantidad, sinPaso: datos.sinPaso })) })), accionSugerida: accion });
  } catch (error) {
    console.error('Error detallado de Gemini:', error);
    console.error('No se pudo generar el boletín:', error);
    res.status(500).json({ error: 'No se pudo generar el boletín' });
  }
};
