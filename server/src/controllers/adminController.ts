import type { Request, Response } from 'express';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const fallosPorIp = new Map<string, { cantidad: number; desde: number }>();

export function verificarClave(clave: unknown, esperada: unknown) {
  if (typeof clave !== 'string' || typeof esperada !== 'string') return false;
  const claveHash = createHash('sha256').update(clave).digest();
  const esperadaHash = createHash('sha256').update(esperada).digest();
  return timingSafeEqual(claveHash, esperadaHash);
}

export function loginAdmin(req: Request, res: Response) {
  const clave = req.body?.clave;
  const esperada = process.env.ADMIN_PASSWORD;
  const secreto = process.env.ADMIN_TOKEN_SECRET;
  if (typeof clave !== 'string') { res.status(400).json({ error: 'La clave es obligatoria' }); return; }
  if (!esperada || !secreto) { res.status(503).json({ error: 'El acceso de operador no está configurado en el servidor' }); return; }
  const ip = req.ip || 'desconocida';
  const ahora = Date.now();
  const registro = fallosPorIp.get(ip);
  if (registro && ahora - registro.desde < 60_000 && registro.cantidad >= 5) { res.status(429).json({ error: 'Demasiados intentos, esperá un minuto' }); return; }
  if (!verificarClave(clave, esperada)) {
    if (!registro || ahora - registro.desde >= 60_000) fallosPorIp.set(ip, { cantidad: 1, desde: ahora });
    else registro.cantidad += 1;
    res.status(401).json({ error: 'Clave incorrecta' });
    return;
  }
  fallosPorIp.delete(ip);
  const datos = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 60 * 60_000 })).toString('base64url');
  const firma = createHmac('sha256', secreto).update(datos).digest('base64url');
  res.json({ token: `${datos}.${firma}` });
}
