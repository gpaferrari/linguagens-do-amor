import { api } from '../api.js';
import { store } from '../store.js';
import { LANGUAGES } from '../languages.js';
import { compare } from '../scoring.js';
import { CHALLENGE, CONVERSATION, GIVING, PACT, REFLECTION } from '../content.js';
import { affinityRing, esc, formatDate, langChip, scoreBars, withBusy } from '../ui.js';

export function render(root) {
  const { user, partner } = store.state;
  root.innerHTML = partner ? linked(user, partner) : unlinked(user);
  bind(root);
}

function bind(root) {
  root.querySelectorAll('[data-action]').forEach((button) =>
    button.addEventListener('click', () => {
      const { action, id } = button.dataset;
      if (action === 'unlink' && !confirm('Desfazer o vínculo do casal? Os testes de cada um continuam salvos.')) return;
      withBusy(button, root.querySelector('.form-error'), () => api.partner(action, { id }));
    }),
  );

  const form = root.querySelector('form.invite');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = new FormData(form).get('email');
    withBusy(form.querySelector('button'), root.querySelector('.form-error'), () => api.partner('invite', { email }));
  });
}

// ---------- Sem par vinculado ----------

function unlinked(user) {
  const { sent, received } = user.invites;
  return `
    <section class="page-head">
      <p class="eyebrow">Casal</p>
      <h1>Vincule sua conta à do seu par</h1>
      <p class="lead">Com as contas vinculadas, cada teste salvo mostra o match de vocês na data em que foi feito.</p>
    </section>
    <div class="form-error"></div>
    ${received.map(receivedInvite).join('')}
    ${
      sent
        ? `<article class="card">
            <p>Convite enviado para <strong>${esc(sent.name)}</strong> (${esc(sent.email)}) em ${formatDate(sent.at)}.</p>
            <p class="muted small">Assim que a pessoa entrar na conta dela, verá o convite para aceitar.</p>
            <button class="btn btn-small btn-ghost" data-action="cancel">Cancelar convite</button>
          </article>`
        : `<article class="card">
            <h3>Convidar meu par</h3>
            <form class="invite inline-form" novalidate>
              <label class="grow">E-mail da conta do seu par<input name="email" type="email" required autocomplete="off"></label>
              <button class="btn" type="submit">Enviar convite</button>
            </form>
            <p class="muted small">A outra pessoa precisa ter criado uma conta. Ela verá o convite quando entrar.</p>
          </article>`
    }`;
}

function receivedInvite(invite) {
  return `
    <article class="card invite-card">
      <p>💌 <strong>${esc(invite.name)}</strong> (${esc(invite.email)}) quer formar um casal com você.</p>
      <div class="actions">
        <button class="btn btn-small" data-action="accept" data-id="${esc(invite.id)}">Aceitar</button>
        <button class="btn btn-small btn-ghost" data-action="decline" data-id="${esc(invite.id)}">Recusar</button>
      </div>
    </article>`;
}

// ---------- Casal vinculado ----------

function linked(user, partner) {
  const mine = user.tests.at(-1);
  const theirs = partner.latestTest;

  return `
    <section class="page-head">
      <p class="eyebrow">Casal desde ${formatDate(partner.since)}</p>
      <h1>Você e ${esc(partner.name)}</h1>
    </section>
    <div class="form-error"></div>
    ${mine && theirs ? comparison(user, partner, mine, theirs) : waiting(partner, mine, theirs)}
    ${reflection()}
    ${conversation()}
    ${challenge()}
    ${pact()}
    <div class="actions center">
      <button class="btn btn-small btn-danger" data-action="unlink">Desfazer vínculo</button>
    </div>`;
}

function waiting(partner, mine, theirs) {
  const missing = [!mine && 'você', !theirs && esc(partner.name)].filter(Boolean).join(' e ');
  return `
    <article class="card center">
      <p>Falta ${missing} fazer o teste para ver o match de vocês.</p>
      ${!mine ? '<a class="btn" href="#/teste">Fazer o teste</a>' : ''}
    </article>`;
}

function comparison(user, partner, mine, theirs) {
  const { affinity, samePrimary } = compare(mine.scores, theirs.scores);
  return `
    <article class="card match">
      ${affinityRing(affinity)}
      <div>
        <h3>Afinidade entre os perfis</h3>
        <p>${
          samePrimary
            ? `Vocês dois têm ${langChip(mine.ranking[0])} como linguagem principal.`
            : `Sua linguagem principal é ${langChip(mine.ranking[0])} e a de ${esc(partner.name)} é ${langChip(theirs.ranking[0])}.`
        }</p>
        <p class="muted small">Afinidade alta não é "nota" do relacionamento: mostra o quanto vocês percebem amor de formas parecidas. Perfis diferentes só pedem mais tradução.</p>
      </div>
    </article>
    <div class="side-by-side">
      <article class="card">
        <h3>Você</h3>
        <p class="muted small">Teste de ${formatDate(mine.date)}</p>
        ${scoreBars(mine.scores, { compact: true })}
      </article>
      <article class="card">
        <h3>${esc(partner.name)}</h3>
        <p class="muted small">Teste de ${formatDate(theirs.date)}</p>
        ${scoreBars(theirs.scores, { compact: true })}
      </article>
    </div>
    <div class="side-by-side">
      ${howToLove(`Como amar ${esc(partner.name)}`, theirs.ranking)}
      ${howToLove(`Como ${esc(partner.name)} pode amar você`, mine.ranking)}
    </div>`;
}

function howToLove(title, ranking) {
  const tips = ranking.slice(0, 2).map((code) => {
    const lang = LANGUAGES[code];
    return `
      <li>
        ${langChip(code)}
        <p class="small">${lang.examples.slice(0, 4).map(esc).join(' · ')}</p>
      </li>`;
  });
  return `
    <article class="card">
      <h3>${title}</h3>
      <ul class="tips">${tips.join('')}</ul>
    </article>`;
}

function reflection() {
  return `
    <article class="card prose">
      <h3>${esc(REFLECTION.title)}</h3>
      <p>${esc(REFLECTION.intro)}</p>
      <div class="dialogues">
        ${REFLECTION.pairs
          .map(([one, other]) => `<p><span>Um pensa:</span> "${esc(one)}"<br><span>O outro pensa:</span> "${esc(other)}"</p>`)
          .join('')}
      </div>
      <p>${esc(REFLECTION.outro)}</p>
      <h3>${esc(GIVING.title)}</h3>
      <p>${esc(GIVING.text)}</p>
    </article>`;
}

function conversation() {
  return `
    <article class="card">
      <h3>Conversa para o casal</h3>
      <p class="muted">Depois de verem os resultados, sentem juntos. Cada um completa:</p>
      <ol class="prompts">${CONVERSATION.map((p) => `<li>"${esc(p)}"</li>`).join('')}</ol>
    </article>`;
}

function challenge() {
  return `
    <article class="card">
      <h3>Desafio dos noivos — 30 dias</h3>
      <p class="muted">Cada um escolhe conscientemente atitudes ligadas à principal linguagem do outro.</p>
      <ol class="weeks">
        ${CHALLENGE.map((w) => `<li><strong>${esc(w.week)} — ${esc(w.title)}</strong><p>${esc(w.text)}</p></li>`).join('')}
      </ol>
    </article>`;
}

function pact() {
  return `
    <article class="card pact">
      <h3>Pacto dos noivos</h3>
      <p class="muted">Entendemos que o casamento não será construído apenas pelos momentos bons, mas também pela maneira como enfrentaremos juntos os momentos difíceis. Por isso, escolhemos:</p>
      <ol>${PACT.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
      <blockquote>"Não queremos apenas continuar nos amando. Queremos aprender, todos os dias, a amar melhor."</blockquote>
    </article>`;
}
