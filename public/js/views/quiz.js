import { api } from '../api.js';
import { store } from '../store.js';
import { PARTS, QUESTIONS } from '../quiz-data.js';
import { INSTRUCTIONS } from '../content.js';
import { celebrate } from '../celebrate.js';
import { esc, go, withBusy } from '../ui.js';

const TOTAL = QUESTIONS.length;
const KEYS = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' };

// Rascunho por usuário: se fechar a aba no meio, continua de onde parou.
const draftKey = () => `lda:draft:${store.state.user.id}`;

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(draftKey())) ?? null;
  } catch {
    return null;
  }
}

function saveDraft() {
  try {
    if (draft) localStorage.setItem(draftKey(), JSON.stringify(draft));
    else localStorage.removeItem(draftKey());
  } catch {
    // Sem storage: o teste funciona, só não sobrevive a um recarregamento.
  }
}

let draft = null; // { index, answers }
let started = false;
let detachKeys = null;
let advancing = null;
let saving = false; // enquanto salva, não re-renderiza a tela de fim (o overlay e o erro dependem dela)

export function render(root) {
  detachKeys?.();
  detachKeys = null;
  draft ??= loadDraft();
  if (!started) intro(root);
  else if (draft.index >= TOTAL) {
    if (!saving) finish(root);
  } else detachKeys = question(root);
}

// Chamado pelo router ao sair da tela do teste.
export function leave() {
  detachKeys?.();
  detachKeys = null;
  clearTimeout(advancing);
  started = false;
  draft = null; // recarrega do storage na volta (pode ser outra conta)
}

const answeredCount = () => draft?.answers.filter(Boolean).length ?? 0;

function start(root, fresh) {
  if (fresh || !draft) draft = { index: 0, answers: Array(TOTAL).fill(null) };
  started = true;
  goTo(root, draft.index);
}

function goTo(root, index) {
  clearTimeout(advancing);
  draft.index = index;
  saveDraft();
  window.scrollTo({ top: 0 });
  render(root);
}

function choose(root, letter) {
  draft.answers[draft.index] = letter;
  saveDraft();
  root.querySelectorAll('.option').forEach((button) => {
    const on = button.dataset.letter === letter;
    button.classList.toggle('selected', on);
    button.setAttribute('aria-checked', on);
  });
  clearTimeout(advancing);
  advancing = setTimeout(() => goTo(root, draft.index + 1), 220);
}

function intro(root) {
  const answered = answeredCount();
  root.innerHTML = `
    <section class="page-head" data-anim-key="intro">
      <p class="eyebrow">Antes de começar</p>
      <h1>Como fazer</h1>
    </section>
    <article class="card prose">
      <p>${esc(INSTRUCTIONS.intro)}</p>
      <p><strong>Não escolha pensando em:</strong></p>
      <ul>${INSTRUCTIONS.avoid.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
      <p><strong>Escolha pensando:</strong></p>
      <blockquote>${esc(INSTRUCTIONS.ask)}</blockquote>
      <p class="muted"><strong>Uma regra importante:</strong> ${esc(INSTRUCTIONS.rule)}</p>
    </article>
    <div class="actions center">
      ${
        answered
          ? `<button class="btn" data-action="continue">Continuar (${answered}/${TOTAL})</button>
             <button class="btn btn-ghost" data-action="restart">Recomeçar</button>`
          : `<button class="btn" data-action="restart">Começar o teste</button>`
      }
    </div>`;

  root.querySelector('[data-action="continue"]')?.addEventListener('click', () => start(root, false));
  root.querySelector('[data-action="restart"]').addEventListener('click', () => start(root, true));
}

function question(root) {
  const q = QUESTIONS[draft.index];
  const selected = draft.answers[draft.index];
  const allAnswered = answeredCount() === TOTAL;

  root.innerHTML = `
    <section class="quiz" data-anim-key="${draft.index}">
      <div class="progress" aria-hidden="true"><span style="width:${(answeredCount() / TOTAL) * 100}%"></span></div>
      <p class="eyebrow">Parte ${q.part} — ${esc(PARTS[q.part])}</p>
      <p class="muted small">Questão ${q.n} de ${TOTAL}</p>
      <h2 class="question">${esc(q.text)}</h2>
      <div class="options" role="radiogroup">
        ${q.options
          .map(
            (o) => `
          <button class="option ${selected === o.letter ? 'selected' : ''}" role="radio"
                  aria-checked="${selected === o.letter}" data-letter="${o.letter}">
            <span class="option-letter">${o.letter}</span>
            <span>${esc(o.text)}</span>
          </button>`,
          )
          .join('')}
      </div>
      <div class="quiz-nav">
        <button class="btn btn-ghost btn-small" data-action="back" ${draft.index === 0 ? 'disabled' : ''}>← Voltar</button>
        ${allAnswered ? `<button class="btn btn-ghost btn-small" data-action="end">Concluir →</button>` : ''}
        ${selected && !allAnswered ? `<button class="btn btn-ghost btn-small" data-action="next">Avançar →</button>` : ''}
      </div>
      <p class="muted small center hint">Dica: no computador, use as teclas A a E para responder.</p>
    </section>`;

  root.querySelectorAll('.option').forEach((button) =>
    button.addEventListener('click', () => choose(root, button.dataset.letter)),
  );
  root.querySelector('[data-action="back"]').addEventListener('click', () => goTo(root, draft.index - 1));
  root.querySelector('[data-action="next"]')?.addEventListener('click', () => goTo(root, draft.index + 1));
  root.querySelector('[data-action="end"]')?.addEventListener('click', () => goTo(root, TOTAL));

  const onKey = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const letter = KEYS[event.key.toLowerCase()];
    if (letter) choose(root, letter);
    else if (event.key === 'ArrowLeft' && draft.index > 0) goTo(root, draft.index - 1);
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

function finish(root) {
  root.innerHTML = `
    <section class="page-head center" data-anim-key="end">
      <p class="eyebrow">Pronto!</p>
      <h1>Você respondeu as ${TOTAL} questões</h1>
      <p class="lead">Seu resultado será salvo com a data de hoje.</p>
    </section>
    <div class="form-error"></div>
    <div class="actions center">
      <button class="btn" data-action="submit">Ver meu resultado</button>
      <button class="btn btn-ghost" data-action="review">Revisar respostas</button>
    </div>`;

  root.querySelector('[data-action="review"]').addEventListener('click', () => goTo(root, 0));
  const submit = root.querySelector('[data-action="submit"]');
  submit.addEventListener('click', () =>
    withBusy(submit, root.querySelector('.form-error'), async () => {
      saving = true;
      try {
        const { test } = await celebrate(api.saveTest(draft.answers));
        draft = null;
        saveDraft();
        started = false;
        go(`/resultado/${test.id}`);
      } finally {
        saving = false;
      }
    }),
  );
}
