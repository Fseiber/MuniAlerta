import { Router } from 'express';
import {
  obtenerReportes,
  obtenerReportePorId,
  crearReporte,
  actualizarEstadoReporte,
} from '../controllers/reportesController';

const router = Router();

// GET /api/reportes?esDemo=true|false
router.get('/reportes', obtenerReportes);
// GET /api/reportes/:id
router.get('/reportes/:id', obtenerReportePorId);
// POST /api/reportes
router.post('/reportes', crearReporte);
// PATCH /api/reportes/:id/estado
router.patch('/reportes/:id/estado', actualizarEstadoReporte);

export default router;
