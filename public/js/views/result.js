import { store } from '../store.js';
import { LANGUAGES } from '../languages.js';
import { DISCLAIMER } from '../content.js';
import { bindShare, shareCard } from '../share.js';
import { affinityRing, esc, formatDate, formatDateTime, langChip, langDetail, scoreBars } from '../ui.js';

export function render(root, { params: [testId] }) {
  const { user, partner } = store.state;
  const test = user.tests.find((t) => t.id === testId);
  if (!test) {
    root.innerHTML = `
      <article class="card center">
        <p>Resultado não encontrado.</p>
        <a class="btn btn-small" href="#/historico">Ver histórico</a>
      </article>`;
    return;
  }

  const [first, second] = test.ranking;
  root.innerHTML = `
    <section class="page-head">
      <p class="eyebrow">Resultado de ${formatDateTime(test.date)}</p>
      <h1>Sua linguagem principal é ${esc(LANGUAGES[first].name)}</h1>
      <p class="lead">A segunda maior pontuação também é importante: ${langChip(second)}</p>
    </section>
    <article class="card">
      <h3>Sua pontuação</h3>
      ${scoreBars(test.scores)}
    </article>
    ${shareCard(test, partner)}
    ${matchCard(test, partner)}
    <h2>O que isso significa</h2>
    ${langDetail(first)}
    ${langDetail(second)}
    <aside class="card disclaimer">
      <strong>Importante</strong>
      <p>${esc(DISCLAIMER)}</p>
    </aside>
    <div class="actions center">
      <a class="btn btn-ghost" href="#/historico">Histórico</a>
      <a class="btn btn-ghost" href="#/casal">Casal</a>
    </div>`;
  bindShare(root, test);
}

function matchCard(test, partner) {
  const { match } = test;
  if (match) {
    const partnerFirst = match.partnerRanking[0];
    return `
      <article class="card match">
        ${affinityRing(match.affinity)}
        <div>
          <h3>Match com ${esc(match.partnerName)}</h3>
          <p class="muted small">Comparado ao teste de ${esc(match.partnerName)} de ${formatDate(match.partnerTestDate)}.</p>
          <p>A linguagem principal de ${esc(match.partnerName)} é ${langChip(partnerFirst)}.</p>
          <p>${
            match.samePrimary
              ? 'Vocês têm a mesma linguagem principal — falem dela com intenção, todos os dias.'
              : `Vocês percebem amor de formas diferentes. Para ${esc(match.partnerName)} se sentir amado(a), aposte em ${esc(LANGUAGES[partnerFirst].name.toLowerCase())}.`
          }</p>
        </div>
      </article>`;
  }
  if (partner) {
    return `
      <article class="card muted-card">
        <p>${
          partner.latestTest
            ? `Veja a comparação atual com ${esc(partner.name)} na página do casal.`
            : `Quando ${esc(partner.name)} fizer o teste, vocês poderão ver o match na página do casal.`
        }</p>
        <a class="btn btn-small btn-ghost" href="#/casal">Ver o casal</a>
      </article>`;
  }
  return `
    <article class="card muted-card">
      <p>Vincule sua conta à da pessoa que você ama para ver o match de vocês.</p>
      <a class="btn btn-small btn-ghost" href="#/casal">Convidar meu par</a>
    </article>`;
}
