import { Router } from 'express';
import {
  obtenerReportes,
  obtenerReportePorId,
  crearReporte,
  actualizarEstadoReporte,
  validarReporte,
  actualizarCategoriaReporte,
} from '../controllers/reportesController';
import { requiereAdmin } from '../middleware/requiereAdmin';

const router = Router();

// GET /api/reportes?esDemo=true|false
router.get('/reportes', obtenerReportes);
// GET /api/reportes/:id
router.get('/reportes/:id', obtenerReportePorId);
// POST /api/reportes
router.post('/reportes', crearReporte);
// PATCH /api/reportes/:id/estado
router.patch('/reportes/:id/estado', requiereAdmin, actualizarEstadoReporte);
router.post('/reportes/:id/validar', requiereAdmin, validarReporte);
router.patch('/reportes/:id/categoria', requiereAdmin, actualizarCategoriaReporte);

export default router;
