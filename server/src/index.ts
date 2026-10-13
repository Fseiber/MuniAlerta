import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import reportesRouter from './routes/reportes';
import iaRouter from './routes/ia';

dotenv.config({ path: '.env' });

const app = express();
app.use(express.json());
const clientOrigin = process.env.CLIENT_ORIGIN || '*';
app.use(cors({ origin: clientOrigin }));

app.use('/api', reportesRouter);
app.use('/api', iaRouter);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(Servidor escuchando en http://localhost:);
});
