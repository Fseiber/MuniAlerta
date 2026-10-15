import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import reportesRouter from './routes/reportes';
import iaRouter from './routes/ia';
import barriosRouter from './routes/barrios';
import categoriasRouter from './routes/categorias';
import { loginAdmin } from './controllers/adminController';
import { requiereAdmin } from './middleware/requiereAdmin';
import prisma from './db';
import { iniciarColaSello, reencolarSellos } from './servicios/colaSello';
import selloRouter from './routes/sello';

export const app = express();
app.use(express.json({ limit: '5mb' }));

console.log(`Operador: ADMIN_PASSWORD configurada = ${process.env.ADMIN_PASSWORD ? 'sí' : 'no'} | ADMIN_TOKEN_SECRET configurado = ${process.env.ADMIN_TOKEN_SECRET ? 'sí' : 'no'}`);

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: clientOrigin }));

app.use((req, res, next) => {
  console.log('➡️ Petición entrante:', req.method, req.url);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK' });
});

app.use('/api', reportesRouter);
app.use('/api', iaRouter);
app.use('/api', barriosRouter);
app.use('/api', categoriasRouter);
app.use('/api', selloRouter);
app.post('/api/admin/login', loginAdmin);
app.post('/api/demo/reiniciar', requiereAdmin, async (_req, res) => {
  try { await prisma.reporte.deleteMany({ where: { esDemo: true, esSemilla: false } }); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'No se pudo reiniciar la demo' }); }
});
app.post('/api/sello/reintentar', requiereAdmin, async (_req, res) => {
  try { res.json({ reencolados: await reencolarSellos() }); }
  catch { res.status(500).json({ error: 'No se pudo reencolar los sellos' }); }
});

void iniciarColaSello().catch(() => console.error('No se pudo iniciar la cola de sellos'));

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log('Servidor escuchando en http://localhost:' + port));
}
