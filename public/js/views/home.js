import { store } from '../store.js';
import { LANGUAGES, LANG_CODES } from '../languages.js';
import { compare } from '../scoring.js';
import { esc, formatDate, langChip, scoreBars } from '../ui.js';

export function render(root) {
  root.innerHTML = store.state.user ? dashboard() : landing();
}

function landing() {
  const cards = LANG_CODES.map(
    (code) => `
      <li class="lang-card" style="--c:${LANGUAGES[code].color}">
        <strong>${esc(LANGUAGES[code].name)}</strong>
        <p>${esc(LANGUAGES[code].summary)}</p>
      </li>`,
  ).join('');

  return `
    <section class="hero">
      <p class="eyebrow">Um exercício de autoconhecimento e conexão para noivos</p>
      <h1>Conhecer para amar melhor</h1>
      <p class="lead">30 situações do dia a dia para descobrir o que faz você se sentir amado(a) — e comparar com o resultado da pessoa que você ama.</p>
      <div class="actions">
        <a class="btn" href="#/entrar?modo=criar">Criar conta e fazer o teste</a>
        <a class="btn btn-ghost" href="#/entrar">Já tenho conta</a>
      </div>
    </section>
    <section>
      <h2>As cinco linguagens</h2>
      <ul class="lang-grid">${cards}</ul>
      <p class="center"><a href="#/linguagens">Saiba mais sobre cada uma →</a></p>
    </section>`;
}

function dashboard() {
  const { user, partner } = store.state;
  const latest = user.tests.at(-1);
  const invites = user.invites.received.length;

  return `
    <section class="page-head">
      <p class="eyebrow">Olá, ${esc(user.name.split(' ')[0])}</p>
      <h1>${latest ? 'Seu último resultado' : 'Vamos começar?'}</h1>
    </section>
    ${invites ? `<a class="notice" href="#/casal">💌 Você tem ${invites} convite${invites > 1 ? 's' : ''} de casal esperando resposta.</a>` : ''}
    ${latest ? latestCard(latest) : firstTestCard()}
    ${partnerCard(user, partner)}`;
}

function firstTestCard() {
  return `
    <article class="card center">
      <p>Você ainda não fez o teste. Leva uns 10 minutos — responda com sinceridade e sem a outra pessoa olhando.</p>
      <a class="btn" href="#/teste">Fazer o teste</a>
    </article>`;
}

function latestCard(test) {
  const [first, second] = test.ranking;
  return `
    <article class="card">
      <div class="card-head">
        <div>
          <p class="muted small">${formatDate(test.date)}</p>
          <h3>${langChip(first, 'chip-lg')}</h3>
          <p class="muted small">Segunda maior: ${esc(LANGUAGES[second].name)}</p>
        </div>
      </div>
      ${scoreBars(test.scores, { compact: true })}
      <div class="actions">
        <a class="btn btn-small" href="#/resultado/${test.id}">Ver detalhes</a>
        <a class="btn btn-small btn-ghost" href="#/teste">Refazer o teste</a>
        <a class="btn btn-small btn-ghost" href="#/historico">Histórico (${store.state.user.tests.length})</a>
      </div>
    </article>`;
}

function partnerCard(user, partner) {
  if (!partner) {
    return `
      <article class="card">
        <h3>Em casal?</h3>
        <p class="muted">Vincule sua conta à da pessoa que você ama para comparar os resultados e ver o match de vocês.</p>
        <a class="btn btn-small btn-ghost" href="#/casal">${user.invites.sent ? 'Ver convite enviado' : 'Convidar meu par'}</a>
      </article>`;
  }

  const mine = user.tests.at(-1);
  const theirs = partner.latestTest;
  const match = mine && theirs ? compare(mine.scores, theirs.scores) : null;
  return `
    <article class="card">
      <h3>Você e ${esc(partner.name)}</h3>
      ${
        match
          ? `<p>Afinidade atual: <strong>${match.affinity}%</strong>. A linguagem principal de ${esc(partner.name)} é ${langChip(theirs.ranking[0])}.</p>`
          : `<p class="muted">${theirs ? 'Faça o teste' : `Aguardando ${esc(partner.name)} fazer o teste`} para ver o match de vocês.</p>`
      }
      <a class="btn btn-small btn-ghost" href="#/casal">Ver o casal</a>
    </article>`;
}
