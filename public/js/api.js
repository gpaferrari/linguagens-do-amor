// Cliente da API. Toda resposta que traz { user, partner } atualiza o store automaticamente.
import { store } from './store.js';

async function request(method, path, body) {
  const { token } = store.state;
  let res;
  try {
    res = await fetch(`/api/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Nada foi perdido: tente de novo em instantes.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) store.logout();
  if (!res.ok) throw new Error(data.error || 'Não foi possível completar a ação.');
  if (data.user && (data.token || changed(data))) {
    store.set({ user: data.user, partner: data.partner, ...(data.token && { token: data.token }) });
  }
  return data;
}

// Evita re-render (e perder o que está sendo digitado) quando nada mudou.
function changed({ user, partner }) {
  const { state } = store;
  return JSON.stringify([user, partner]) !== JSON.stringify([state.user, state.partner]);
}

export const api = {
  register: (name, email, password) => request('POST', 'auth', { action: 'register', name, email, password }),
  login: (email, password) => request('POST', 'auth', { action: 'login', email, password }),
  me: () => request('GET', 'me'),
  saveTest: (answers) => request('POST', 'tests', { answers }),
  deleteTest: (id) => request('DELETE', `tests?id=${encodeURIComponent(id)}`),
  partner: (action, payload = {}) => request('POST', 'partner', { action, ...payload }),
  shared: (token) => request('GET', `share?t=${encodeURIComponent(token)}`),
};
