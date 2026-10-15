import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function requiereAdmin(req: Request, res: Response, next: NextFunction) {
  const encabezado = req.header('authorization');
  if (!encabezado?.startsWith('Bearer ')) { res.status(401).json({ error: 'No autorizado' }); return; }
  const token = encabezado.slice(7);
  const partes = token.split('.');
  if (partes.length !== 2 || !process.env.ADMIN_TOKEN_SECRET) { res.status(401).json({ error: 'No autorizado' }); return; }
  const firma = createHmac('sha256', process.env.ADMIN_TOKEN_SECRET).update(partes[0]).digest('base64url');
  const iguales = firma.length === partes[1].length && timingSafeEqual(Buffer.from(firma), Buffer.from(partes[1]));
  try {
    const datos = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8')) as { exp?: number };
    if (!iguales || typeof datos.exp !== 'number' || datos.exp < Date.now()) throw new Error('token inválido');
    next();
  } catch { res.status(401).json({ error: 'No autorizado' }); }
}
