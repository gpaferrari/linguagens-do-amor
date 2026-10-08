// Guarda JSON em uma pasta local. Usado no desenvolvimento e nos testes, sem precisar de token.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { ConflictError } from './errors.js';

const hash = (text) => createHash('sha1').update(text).digest('hex');

export class FileStorage {
  constructor({ dir }) {
    this.dir = dir;
  }

  async read(path) {
    try {
      const text = await readFile(join(this.dir, path), 'utf8');
      return { data: JSON.parse(text), version: hash(text) };
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async write(path, data, version) {
    const current = await this.read(path);
    if ((current?.version ?? null) !== (version ?? null)) throw new ConflictError(path);
    const file = join(this.dir, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(data, null, 2));
  }
}
