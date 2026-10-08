import { api } from '../api.js';
import { go, withBusy } from '../ui.js';

export function render(root, { query }) {
  const creating = query.get('modo') === 'criar';
  const next = query.get('voltar') || '/';
  const back = query.get('voltar') ? `voltar=${encodeURIComponent(next)}` : '';

  root.innerHTML = `
    <section class="auth card">
      <div class="tabs" role="tablist">
        <a role="tab" class="${creating ? '' : 'active'}" href="#/entrar${back && `?${back}`}">Entrar</a>
        <a role="tab" class="${creating ? 'active' : ''}" href="#/entrar?modo=criar${back && `&${back}`}">Criar conta</a>
      </div>
      <form novalidate>
        ${
          creating
            ? `<label>Seu nome<input name="name" autocomplete="name" required maxlength="60"></label>`
            : ''
        }
        <label>E-mail<input name="email" type="email" autocomplete="email" required></label>
        <label>Senha<input name="password" type="password" autocomplete="${creating ? 'new-password' : 'current-password'}" required minlength="6"></label>
        <div class="form-error"></div>
        <button class="btn btn-block" type="submit">${creating ? 'Criar conta' : 'Entrar'}</button>
      </form>
      <p class="muted small center">Seus testes ficam salvos na sua conta, com a data de cada um.</p>
    </section>`;

  const form = root.querySelector('form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const { name, email, password } = Object.fromEntries(new FormData(form));
    withBusy(form.querySelector('button'), form.querySelector('.form-error'), async () => {
      if (creating) await api.register(name, email, password);
      else await api.login(email, password);
      go(next);
    });
  });
}
