import { Router } from 'express';
import { generarBoletinDefensaCivil } from '../controllers/iaController';
import { requiereAdmin } from '../middleware/requiereAdmin';

const router = Router();

router.post('/ia/boletin', requiereAdmin, generarBoletinDefensaCivil);

export default router;
