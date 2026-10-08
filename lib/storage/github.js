// Guarda JSON em um repositório GitHub via Contents API. A "versão" é o sha do arquivo.
import { ConflictError } from './errors.js';

const API = 'https://api.github.com';

export class GithubStorage {
  constructor({ token, repo, branch = 'main' }) {
    this.token = token;
    this.repo = repo;
    this.branch = branch;
  }

  async read(path) {
    const res = await fetch(`${this.#url(path)}?ref=${this.branch}`, { headers: this.#headers(), cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub read ${path}: ${res.status} ${await res.text()}`);
    const body = await res.json();
    const json = Buffer.from(body.content, 'base64').toString('utf8');
    return { data: JSON.parse(json), version: body.sha };
  }

  async write(path, data, version) {
    const res = await fetch(this.#url(path), {
      method: 'PUT',
      headers: this.#headers(),
      body: JSON.stringify({
        message: `update ${path}`,
        content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
        branch: this.branch,
        ...(version && { sha: version }),
      }),
    });
    // 409: sha desatualizado. 422: arquivo criado por outra requisição no meio do caminho.
    if (res.status === 409 || res.status === 422) throw new ConflictError(path);
    if (!res.ok) throw new Error(`GitHub write ${path}: ${res.status} ${await res.text()}`);
  }

  #url(path) {
    return `${API}/repos/${this.repo}/contents/${path}`;
  }

  #headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'linguagens-do-amor',
    };
  }
}
