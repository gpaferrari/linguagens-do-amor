// Observer + Singleton: um único estado global; as views se inscrevem e re-renderizam quando ele muda.
const TOKEN_KEY = 'lda:token';

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Sem storage (aba anônima bloqueada): a sessão vale só enquanto a página estiver aberta.
  }
}

class Store {
  #state = { token: readToken(), user: null, partner: null, ready: false };
  #listeners = new Set();

  get state() {
    return this.#state;
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  set(patch) {
    this.#state = { ...this.#state, ...patch };
    if ('token' in patch) writeToken(patch.token);
    this.#listeners.forEach((listener) => listener(this.#state));
  }

  logout() {
    this.set({ token: null, user: null, partner: null });
  }
}

export const store = new Store();
