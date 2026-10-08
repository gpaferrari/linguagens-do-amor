// Animações de entrada e contagem numérica. A maior parte é CSS (keyframes nas classes existentes);
// aqui fica o que precisa de JS: contar números e não reanimar quando a mesma tela é re-renderizada.
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let lastScreen = null;

// Chamada pelo router logo após cada render. Anima só quando a tela mudou; re-renders
// causados pelo store (mesma tela, dados novos) ficam estáticos para não piscar.
export function animateIn(root) {
  const screen = `${location.hash}|${root.querySelector('[data-anim-key]')?.dataset.animKey ?? ''}`;
  const same = screen === lastScreen;
  lastScreen = screen;
  root.classList.toggle('is-static', same);
  if (same) return;

  root.querySelectorAll('.ring span').forEach((span) => {
    countUp(span, Number(span.parentElement.style.getPropertyValue('--p')));
  });
  root.querySelectorAll('.bar-value').forEach((el) => countUp(el, parseInt(el.textContent, 10)));
}

// Conta do zero até `to` no nó de texto do elemento (preserva filhos como <small>).
export function countUp(el, to, ms = 900) {
  const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
  if (!node || reduced() || Number.isNaN(to)) return;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / ms);
    node.nodeValue = String(Math.round(to * (1 - (1 - t) ** 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  node.nodeValue = '0';
  requestAnimationFrame(step);
}
