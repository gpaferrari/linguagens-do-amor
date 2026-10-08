import { api } from '../api.js';
import { store } from '../store.js';
import { esc, formatDateTime, langChip, stackedBar, withBusy } from '../ui.js';

export function render(root) {
  const tests = [...store.state.user.tests].reverse();

  root.innerHTML = `
    <section class="page-head">
      <p class="eyebrow">Histórico</p>
      <h1>Seus testes</h1>
      <p class="lead">${tests.length ? `${tests.length} teste${tests.length > 1 ? 's' : ''} salvo${tests.length > 1 ? 's' : ''}.` : 'Nenhum teste ainda.'}</p>
    </section>
    ${tests.length ? `<ul class="history">${tests.map(item).join('')}</ul>` : ''}
    <div class="actions center"><a class="btn" href="#/teste">${tests.length ? 'Fazer de novo' : 'Fazer o teste'}</a></div>`;

  root.querySelectorAll('[data-delete]').forEach((button) =>
    button.addEventListener('click', () => {
      if (!confirm('Excluir este teste do seu histórico?')) return;
      withBusy(button, null, () => api.deleteTest(button.dataset.delete));
    }),
  );
}

function item(test) {
  const [first, second] = test.ranking;
  return `
    <li class="card history-item">
      <a class="history-link" href="#/resultado/${test.id}">
        <span class="muted small">${formatDateTime(test.date)}</span>
        <span class="history-langs">${langChip(first)} ${langChip(second, 'chip-soft')}</span>
        ${stackedBar(test.scores)}
        ${
          test.match
            ? `<span class="small">Match com ${esc(test.match.partnerName)}: <strong>${test.match.affinity}%</strong></span>`
            : ''
        }
      </a>
      <button class="icon-btn" data-delete="${test.id}" title="Excluir teste" aria-label="Excluir teste">✕</button>
    </li>`;
}
