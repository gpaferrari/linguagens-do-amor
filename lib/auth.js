// Senha com scrypt e token assinado com HMAC (formato parecido com JWT, sem dependências).
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.VERCEL) throw new Error('Configure AUTH_SECRET nas variáveis de ambiente da Vercel.');
  return 'dev-secret';
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  return timingSafeEqual(scryptSync(password, salt, 64), expected);
}

const sign = (payload) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function createToken(userId) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

// Retorna o id do usuário ou null se o token for inválido/expirado.
export function verifyToken(token) {
  const [payload, signature] = (token ?? '').split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return exp > Date.now() ? sub : null;
  } catch {
    return null;
  }
}

// Link público de um resultado: "<userId>.<testId>.<assinatura>". O prefixo "share:" na
// assinatura impede que ele seja usado como token de login.
const signShare = (payload) => sign(`share:${payload}`).slice(0, 22);

export function createShareToken(userId, testId) {
  const payload = `${userId}.${testId}`;
  return `${payload}.${signShare(payload)}`;
}

export function verifyShareToken(token) {
  const [userId, testId, signature] = String(token ?? '').split('.');
  if (!userId || !testId || !signature) return null;
  const expected = Buffer.from(signShare(`${userId}.${testId}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { userId, testId };
}
