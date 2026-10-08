// Celebração ao concluir o teste: "calculando" enquanto a API responde, depois revela a linguagem principal.
// canvas-confetti é carregado só aqui (import dinâmico). Se o CDN falhar, a animação segue sem partículas.
import { LANGUAGES, LANG_CODES } from './languages.js';
import { QUESTIONS } from './quiz-data.js';
import { countUp } from './motion.js';
import { esc } from './ui.js';

const CONFETTI_URL = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm';
const MIN_CALC_MS = 2000;
const CONFETTI_WAIT_MS = 1500;
const HEART_PATH =
  'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const heart = (cls) => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${HEART_PATH}"/></svg>`;

// Canvas não lê variáveis CSS: resolve a cor real (que muda no modo escuro).
function cssColor(value) {
  const name = value.match(/--[\w-]+/)[0];
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const loadConfetti = () =>
  import(CONFETTI_URL)
    .then((mod) => mod.default)
    .catch(() => null);

// Espera a API e a animação mínima; resolve com a resposta de POST /api/tests.
// Se a API falhar, fecha o overlay e relança o erro para o withBusy mostrar no formulário.
export async function celebrate(request) {
  const overlay = mount();
  const confettiReady = reduced() ? Promise.resolve(null) : loadConfetti();
  const bodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  let fire = null;
  try {
    const [response] = await Promise.all([request, wait(MIN_CALC_MS)]);
    const confetti = await Promise.race([confettiReady, wait(CONFETTI_WAIT_MS).then(() => null)]);
    const shown = reveal(overlay, response.test, confetti);
    fire = shown.fire;
    await shown.continued;
    return response;
  } finally {
    fire?.reset?.();
    await unmount(overlay);
    document.body.style.overflow = bodyOverflow;
  }
}

function mount() {
  const overlay = document.createElement('div');
  overlay.className = 'celebrate';
  overlay.dataset.phase = 'calc';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Resultado do teste');
  const dots = LANG_CODES.map(
    (code, i) => `<span class="celebrate-dot" style="--i:${i};--c:${LANGUAGES[code].color}"></span>`,
  ).join('');
  overlay.innerHTML = `
    <canvas class="celebrate-canvas" aria-hidden="true"></canvas>
    <div class="celebrate-stage">
      <div class="celebrate-calc">
        <div class="celebrate-orbit-box">
          <div class="celebrate-orbit" aria-hidden="true">${dots}</div>
          ${heart('celebrate-heart')}
        </div>
        <p class="celebrate-status" role="status">Calculando seu resultado…</p>
      </div>
      <div class="celebrate-result"></div>
    </div>`;
  document.body.append(overlay);
  return overlay;
}

function reveal(overlay, test, confetti) {
  overlay.style.setProperty('--c', LANGUAGES[test.ranking[0]].color);
  overlay.querySelector('.celebrate-result').innerHTML = resultTemplate(test);
  overlay.dataset.phase = 'reveal';
  overlay.querySelectorAll('[data-count]').forEach((el) => countUp(el, Number(el.dataset.count)));

  const button = overlay.querySelector('.celebrate-continue');
  button.focus({ preventScroll: true });
  const continued = new Promise((resolve) => button.addEventListener('click', resolve, { once: true }));
  const fire = confetti ? burst(confetti, overlay.querySelector('.celebrate-canvas')) : null;
  return { fire, continued };
}

function resultTemplate(test) {
  const lang = LANGUAGES[test.ranking[0]];
  const rows = test.ranking
    .map((code) => {
      const row = LANGUAGES[code];
      const score = test.scores[code];
      return `
        <li class="celebrate-row" style="--c:${row.color}">
          <span class="celebrate-row-label">${esc(row.name)}</span>
          <span class="celebrate-row-track"><span class="celebrate-row-fill" style="width:${(score / QUESTIONS.length) * 100}%"></span></span>
          <span class="celebrate-row-value" data-count="${score}">${score}</span>
        </li>`;
    })
    .join('');
  return `
    <div class="celebrate-main" style="--c:${lang.color}">
      ${heart('celebrate-heart-big')}
      <p class="celebrate-kicker">Sua linguagem principal é</p>
      <h2 class="celebrate-name">${esc(lang.name)}</h2>
    </div>
    <ul class="celebrate-rows" aria-label="Pontuação por linguagem">${rows}</ul>
    <button class="btn celebrate-continue" type="button">Ver meu resultado completo</button>`;
}

// Três rajadas de corações nas cores das linguagens: centro, depois as laterais.
function burst(confetti, canvas) {
  const fire = confetti.create(canvas, { resize: true, useWorker: false });
  const shapes = [confetti.shapeFromPath({ path: HEART_PATH })];
  const colors = LANG_CODES.map((code) => cssColor(LANGUAGES[code].color));
  const base = { colors, shapes, scalar: 2.2, gravity: 0.8, disableForReducedMotion: true };
  fire({ ...base, particleCount: 60, spread: 85, startVelocity: 46, origin: { x: 0.5, y: 0.55 } });
  setTimeout(() => fire({ ...base, particleCount: 22, angle: 62, spread: 60, origin: { x: 0, y: 0.75 } }), 280);
  setTimeout(() => fire({ ...base, particleCount: 22, angle: 118, spread: 60, origin: { x: 1, y: 0.75 } }), 460);
  return fire;
}

async function unmount(overlay) {
  overlay.classList.add('is-leaving');
  await wait(240);
  overlay.remove();
}
