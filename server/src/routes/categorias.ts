import { Router } from 'express';
import { categorias } from '../categorias';
const router = Router();
router.get('/categorias', (_req, res) => res.json(categorias));
export default router;
