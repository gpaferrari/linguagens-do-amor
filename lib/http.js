import { verifyToken } from './auth.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Monta uma função serverless da Vercel a partir de { GET: fn, POST: fn, ... }.
export function route(methods) {
  return async (req, res) => {
    const fn = methods[req.method];
    if (!fn) return res.status(405).json({ error: 'Método não permitido' });
    try {
      res.status(200).json(await fn(req));
    } catch (err) {
      const status = err.status ?? 500;
      if (status === 500) console.error(err);
      res.status(status).json({ error: status === 500 ? 'Erro interno, tente novamente.' : err.message });
    }
  };
}

export function optionalUserId(req) {
  const header = req.headers.authorization ?? '';
  return verifyToken(header.replace(/^Bearer\s+/i, ''));
}

export function requireUserId(req) {
  const userId = optionalUserId(req);
  if (!userId) throw new HttpError(401, 'Sessão expirada. Entre novamente.');
  return userId;
}
