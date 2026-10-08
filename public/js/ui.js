// Helpers de HTML compartilhados pelas views.
import { LANGUAGES } from './languages.js';
import { rank } from './scoring.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const formatDate = (iso) => dateFormat.format(new Date(iso));
export const formatDateTime = (iso) => `${formatDate(iso)} às ${timeFormat.format(new Date(iso))}`;

export const go = (path) => {
  location.hash = `#${path}`;
};

export function langChip(code, extra = '') {
  const lang = LANGUAGES[code];
  return `<span class="chip ${extra}" style="--c:${lang.color}">${esc(lang.name)}</span>`;
}

export function langDetail(code) {
  const lang = LANGUAGES[code];
  return `
    <article class="card lang-detail" style="--c:${lang.color}">
      <h3>${esc(lang.name)}</h3>
      <p>${esc(lang.summary)}</p>
      <ul class="tags">${lang.examples.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
      <p><strong>No casamento:</strong> ${esc(lang.marriage)}</p>
      ${lang.phrases.length ? `<ul class="phrases">${lang.phrases.map((p) => `<li>"${esc(p)}"</li>`).join('')}</ul>` : ''}
      ${lang.note ? `<p class="muted small">${esc(lang.note)}</p>` : ''}
    </article>`;
}

export function scoreBars(scores, { compact = false } = {}) {
  const rows = rank(scores)
    .map((code) => {
      const lang = LANGUAGES[code];
      const pct = (scores[code] / 30) * 100;
      return `
        <li class="bar" style="--c:${lang.color}">
          <span class="bar-label">${esc(lang.name)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
          <span class="bar-value">${scores[code]}${compact ? '' : '<small>/30</small>'}</span>
        </li>`;
    })
    .join('');
  return `<ul class="bars ${compact ? 'bars-compact' : ''}">${rows}</ul>`;
}

export function stackedBar(scores) {
  const parts = rank(scores)
    .filter((code) => scores[code] > 0)
    .map((code) => `<span style="flex:${scores[code]};background:${LANGUAGES[code].color}" title="${esc(LANGUAGES[code].name)}: ${scores[code]}"></span>`)
    .join('');
  return `<div class="stacked">${parts}</div>`;
}

export function affinityRing(value) {
  return `
    <div class="ring" style="--p:${value}" role="img" aria-label="Afinidade de ${value}%">
      <span>${value}<small>%</small></span>
    </div>`;
}

export function errorBox(message) {
  return message ? `<p class="error" role="alert">${esc(message)}</p>` : '';
}

// Desabilita o botão enquanto a ação roda e mostra o erro no elemento indicado.
export async function withBusy(button, errorEl, action) {
  button.disabled = true;
  if (errorEl) errorEl.innerHTML = '';
  try {
    await action();
  } catch (err) {
    if (errorEl) errorEl.innerHTML = errorBox(err.message);
    else alert(err.message);
  } finally {
    button.disabled = false;
  }
}
