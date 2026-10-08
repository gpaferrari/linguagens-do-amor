export class ConflictError extends Error {
  constructor(path) {
    super(`Conflito ao gravar ${path}`);
  }
}
