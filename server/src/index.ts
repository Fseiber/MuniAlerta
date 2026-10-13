import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import reportesRouter from './routes/reportes';
import iaRouter from './routes/ia';

const app = express();
app.use(express.json());

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

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log('Servidor escuchando en http://localhost:' + port);
});
