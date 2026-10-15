import { Router } from 'express';
import { estadoSello, registroSello, verificarSello } from '../controllers/selloController';

const router = Router();
router.get('/sello/estado', estadoSello);
router.get('/sello/verificar/:expediente', verificarSello);
router.get('/sello/registro', registroSello);
export default router;
