import { store } from '../store.js';
import { LANG_CODES } from '../languages.js';
import { BIBLICAL, GIVING, REFLECTION } from '../content.js';
import { esc, langDetail } from '../ui.js';

export function render(root) {
  root.innerHTML = `
    <section class="page-head">
      <p class="eyebrow">Conhecendo</p>
      <h1>As cinco linguagens do amor</h1>
    </section>
    ${LANG_CODES.map(langDetail).join('')}
    <article class="card prose">
      <h3>${esc(REFLECTION.title)}</h3>
      <p>${esc(REFLECTION.intro)}</p>
      <p>${esc(REFLECTION.outro)}</p>
      <h3>${esc(BIBLICAL.title)}</h3>
      <blockquote>${esc(BIBLICAL.verse)}</blockquote>
      <p>${esc(BIBLICAL.text)}</p>
      <h3>${esc(GIVING.title)}</h3>
      <p>${esc(GIVING.text)}</p>
    </article>
    <div class="actions center">
      <a class="btn" href="${store.state.user ? '#/teste' : '#/entrar?modo=criar'}">Fazer o teste</a>
    </div>`;
}
