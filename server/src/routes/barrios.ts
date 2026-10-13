import { Router } from 'express';
import { barrios } from '../barrios';

const router = Router();

router.get('/barrios', (_req, res) => {
  res.json(barrios);
});

export default router;
