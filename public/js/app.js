// Router por hash (#/rota). Re-renderiza a tela atual sempre que o store muda.
import { store } from './store.js';
import { api } from './api.js';
import { esc, go } from './ui.js';
import { animateIn } from './motion.js';
import * as home from './views/home.js';
import * as auth from './views/auth.js';
import * as about from './views/about.js';
import * as quiz from './views/quiz.js';
import * as result from './views/result.js';
import * as history from './views/history.js';
import * as couple from './views/couple.js';
import * as share from './views/share.js';

const routes = [
  { pattern: /^\/$/, view: home },
  { pattern: /^\/entrar$/, view: auth, guestOnly: true },
  { pattern: /^\/linguagens$/, view: about },
  { pattern: /^\/teste$/, view: quiz, private: true },
  { pattern: /^\/resultado\/([\w-]+)$/, view: result, private: true },
  { pattern: /^\/historico$/, view: history, private: true },
  { pattern: /^\/casal$/, view: couple, private: true },
  { pattern: /^\/r\/([\w.-]+)$/, view: share },
];

const main = document.querySelector('#app');
const nav = document.querySelector('#nav');
let currentView = null;

function parseHash() {
  const [path, search = ''] = location.hash.slice(1).split('?');
  return { path: path || '/', query: new URLSearchParams(search) };
}

function renderNav(path) {
  const { user } = store.state;
  const invites = user?.invites.received.length ?? 0;
  const links = user
    ? [
        ['/', 'Início'],
        ['/teste', 'Teste'],
        ['/historico', 'Histórico'],
        ['/casal', `Casal${invites ? ` <span class="badge">${invites}</span>` : ''}`],
      ]
    : [
        ['/', 'Início'],
        ['/linguagens', 'As linguagens'],
        ['/entrar', 'Entrar'],
      ];
  nav.innerHTML =
    links
      .map(([href, label]) => `<a href="#${href}" class="${path === href ? 'active' : ''}">${label}</a>`)
      .join('') + (user ? `<button class="link" data-logout title="Sair da conta de ${esc(user.name)}">Sair</button>` : '');
  nav.querySelector('[data-logout]')?.addEventListener('click', () => {
    store.logout();
    go('/');
  });
}

function render() {
  const { path, query } = parseHash();
  renderNav(path);
  if (!store.state.ready) {
    main.innerHTML = '<p class="loading">Carregando…</p>';
    return;
  }

  const route = routes.find((r) => r.pattern.test(path));
  if (!route) return go('/');
  if (route.private && !store.state.user) return go(`/entrar?voltar=${encodeURIComponent(path)}`);
  if (route.guestOnly && store.state.user) return go(query.get('voltar') || '/');

  if (currentView !== route.view) currentView?.leave?.();
  currentView = route.view;
  route.view.render(main, { params: path.match(route.pattern).slice(1), query });
  animateIn(main); // precisa ser no mesmo ciclo do render (ver motion.js)
}

// Busca convites/testes novos do par ao trocar de tela ou voltar para a aba.
let lastRefresh = Date.now();
function refresh() {
  if (!store.state.user || Date.now() - lastRefresh < 5000) return;
  lastRefresh = Date.now();
  api.me().catch(() => {});
}

store.subscribe(render);
window.addEventListener('focus', refresh);
window.addEventListener('hashchange', () => {
  window.scrollTo({ top: 0 });
  render();
  refresh();
});

async function boot() {
  render();
  if (store.state.token) {
    try {
      await api.me();
    } catch {
      // Token inválido já desloga em api.js; erro de rede só mostra a tela de visitante.
    }
  }
  store.set({ ready: true });
}

boot();
