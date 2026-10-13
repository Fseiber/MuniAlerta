import { Router } from 'express';
import { generarBoletinDefensaCivil } from '../controllers/iaController';

const router = Router();

router.post('/ia/boletin', generarBoletinDefensaCivil);

export default router;
