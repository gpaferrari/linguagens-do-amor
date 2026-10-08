// Servidor local sem dependências: serve public/ e as funções de api/ com a mesma interface da Vercel.
// Sem GITHUB_TOKEN no .env, os dados ficam em .data/ (FileStorage).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = join(import.meta.dirname, 'public');
const API_ROUTES = new Set(['auth', 'me', 'tests', 'partner', 'share']);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : undefined;
}

// Imita os helpers req.query, req.body, res.status().json() da Vercel.
function vercelResponse(res) {
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
  };
  return res;
}

async function handleApi(name, url, req, res) {
  req.query = Object.fromEntries(url.searchParams);
  req.body = await readBody(req);
  const { default: handler } = await import(`./api/${name}.js`);
  await handler(req, vercelResponse(res));
}

async function handleStatic(pathname, res) {
  const file = normalize(join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(PUBLIC_DIR)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res
      .writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
      .end(body);
  } catch {
    res.writeHead(404).end('Não encontrado');
  }
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const apiName = url.pathname.match(/^\/api\/([\w-]+)$/)?.[1];
    try {
      if (apiName && API_ROUTES.has(apiName)) await handleApi(apiName, url, req, res);
      else await handleStatic(decodeURIComponent(url.pathname), res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.writeHead(500).end('Erro interno');
    }
  })
  .listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
