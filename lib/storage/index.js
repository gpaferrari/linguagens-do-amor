// Strategy: escolhe onde os JSON ficam (GitHub em produção, pasta local no dev).
// Singleton: uma instância por processo/função.
import { GithubStorage } from './github.js';
import { FileStorage } from './file.js';
import { ConflictError } from './errors.js';

let instance;

export function getStorage() {
  instance ??= createStorage(process.env);
  return instance;
}

// Permite trocar a estratégia nos testes.
export function setStorage(storage) {
  instance = storage;
}

function createStorage(env) {
  if (env.GITHUB_TOKEN && env.GITHUB_REPO) {
    return new GithubStorage({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO, branch: env.GITHUB_BRANCH });
  }
  if (env.VERCEL) throw new Error('Configure GITHUB_TOKEN e GITHUB_REPO nas variáveis de ambiente da Vercel.');
  return new FileStorage({ dir: env.DATA_DIR || '.data' });
}

// Lê, aplica a alteração e grava. Se outra requisição gravou antes, tenta de novo.
export async function updateJson(path, mutate, { attempts = 3 } = {}) {
  const storage = getStorage();
  for (let i = 1; ; i++) {
    const current = await storage.read(path);
    const data = await mutate(current?.data ?? null);
    try {
      await storage.write(path, data, current?.version);
      return data;
    } catch (err) {
      if (!(err instanceof ConflictError) || i >= attempts) throw err;
    }
  }
}
