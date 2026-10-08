// Página pública do link compartilhado: #/r/<token>
import { api } from '../api.js';
import { store } from '../store.js';
import { LANGUAGES } from '../languages.js';
import { countUp } from '../motion.js';
import { errorBox, esc, formatDate, langChip, scoreBars, withBusy } from '../ui.js';

let cache = { key: null, data: null, error: null };

export async function render(root, { params: [token] }) {
  // A resposta depende de quem está vendo (dono, par, visitante).
  const key = `${token}:${store.state.user?.id ?? ''}`;
  const fresh = cache.key !== key;
  if (fresh) {
    root.innerHTML = '<p class="loading">Abrindo o resultado…</p>';
    cache = { key, data: null, error: null };
    try {
      cache.data = await api.shared(token);
    } catch (err) {
      cache.error = err.message;
    }
    if (cache.key !== key) return; // outra renderização começou nesse meio-tempo
  }

  if (cache.error) {
    root.innerHTML = `
      <article class="card center">${errorBox(cache.error)}
        <a class="btn" href="#/">Ir para o início</a>
      </article>`;
    return;
  }

  const shared = cache.data;
  const first = shared.name.split(' ')[0];
  root.innerHTML = `
    <section class="shared-result">
      <div class="page-head center">
        <p class="eyebrow">💌 ${esc(first)} quer te contar uma coisa</p>
        <h1>A linguagem do amor de ${esc(first)} é ${esc(LANGUAGES[shared.ranking[0]].name)}</h1>
        <p class="lead">Teste feito em ${formatDate(shared.date)}. A segunda maior pontuação é ${langChip(shared.ranking[1])}</p>
      </div>
      <article class="card">
        <h3>A pontuação de ${esc(first)}</h3>
        ${scoreBars(shared.scores)}
      </article>
      <article class="card">
        <h3>Como fazer ${esc(first)} se sentir amado(a)</h3>
        <ul class="tags">${LANGUAGES[shared.ranking[0]].examples.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
        <p class="muted small">${esc(LANGUAGES[shared.ranking[0]].marriage)}</p>
      </article>
      ${callToAction(shared, token)}
    </section>`;
  // O conteúdo chega depois do fetch, fora do ciclo do router: conta os números aqui.
  if (fresh) root.querySelectorAll('.bar-value').forEach((el) => countUp(el, parseInt(el.textContent, 10)));

  const join = root.querySelector('[data-action="join"]');
  join?.addEventListener('click', () =>
    withBusy(join, root.querySelector('.form-error'), async () => {
      await api.partner('invite-share', { token });
      cache.data = await api.shared(token); // atualiza sem piscar a tela de carregamento
      render(root, { params: [token] });
    }),
  );
}

function callToAction(shared, token) {
  const first = esc(shared.name.split(' ')[0]);
  const { user } = store.state;
  const back = encodeURIComponent(`/r/${token}`);

  if (!user) {
    return `
      <article class="card share-card center">
        <h3>E você? Qual é a sua linguagem do amor?</h3>
        <p class="muted">Crie sua conta, faça o teste e veja o match de vocês dois.</p>
        <div class="share-actions">
          <a class="btn" href="#/entrar?modo=criar&voltar=${back}">Fazer o teste também</a>
          <a class="btn btn-ghost" href="#/entrar?voltar=${back}">Já tenho conta</a>
        </div>
      </article>`;
  }
  if (shared.isMine) {
    return `
      <article class="card muted-card center">
        <p>Este é o seu link. É assim que seu amor vai ver o seu resultado. 💕</p>
      </article>`;
  }

  const myTest = user.tests.length ? '' : '<a class="btn btn-ghost" href="#/teste">Fazer meu teste</a>';
  if (shared.isPartner) {
    return `
      <article class="card share-card center">
        <p>Vocês já são um casal por aqui. 💞</p>
        <div class="share-actions"><a class="btn" href="#/casal">Ver nosso match</a>${myTest}</div>
      </article>`;
  }

  return `
    <article class="card share-card center">
      <h3>Formar um casal com ${first}?</h3>
      <p class="muted">Vinculando as contas, vocês comparam os resultados e veem o match a cada teste.</p>
      <div class="form-error"></div>
      <div class="share-actions">
        ${
          shared.invited
            ? `<p>Convite enviado! Assim que ${first} aceitar, vocês aparecem juntos na página do casal.</p>`
            : `<button class="btn" data-action="join">Quero formar um casal com ${first}</button>`
        }
        ${myTest}
      </div>
    </article>`;
}
