// Card "Envie para seu amor": compartilhar nativo (celular), WhatsApp e copiar link.
import { LANGUAGES } from './languages.js';
import { esc } from './ui.js';

const shareUrl = (test) => `${location.origin}/#/r/${test.shareToken}`;

function shareText(test) {
  const lang = LANGUAGES[test.ranking[0]].name;
  return `Descobri minha linguagem do amor: ${lang} 💞 Faz o teste também e vamos ver o nosso match!`;
}

export function shareCard(test, partner) {
  const target = partner ? esc(partner.name) : 'seu amor';
  return `
    <article class="card share-card">
      <div class="share-heart" aria-hidden="true">💌</div>
      <h3>Envie para ${target}</h3>
      <p class="muted">Quem abrir o link vê seu resultado e pode fazer o teste também — e, com um clique, formar o casal com você aqui.</p>
      <div class="share-actions">
        ${navigator.share ? '<button class="btn" data-share="native">Compartilhar</button>' : ''}
        <a class="btn btn-whatsapp" data-share="whatsapp" target="_blank" rel="noopener"
           href="https://wa.me/?text=${encodeURIComponent(`${shareText(test)} ${shareUrl(test)}`)}">WhatsApp</a>
        <button class="btn btn-ghost" data-share="copy">Copiar link</button>
      </div>
      <p class="share-feedback small" role="status" aria-live="polite"></p>
    </article>`;
}

export function bindShare(root, test) {
  const feedback = root.querySelector('.share-feedback');
  const say = (message) => {
    feedback.textContent = message;
    feedback.classList.remove('show');
    void feedback.offsetWidth; // reinicia a animação
    feedback.classList.add('show');
  };

  root.querySelector('[data-share="native"]')?.addEventListener('click', async () => {
    try {
      await navigator.share({ title: 'Linguagens do Amor', text: shareText(test), url: shareUrl(test) });
    } catch {
      // Usuário cancelou o compartilhamento.
    }
  });

  root.querySelector('[data-share="copy"]').addEventListener('click', async () => {
    const url = shareUrl(test);
    if ((await copy(url)) || legacyCopy(url)) return say('Link copiado! Agora é só colar na conversa 💕');
    // Sem permissão de área de transferência: mostra o link selecionado para copiar à mão.
    const field = root.querySelector('.share-link') ?? Object.assign(document.createElement('input'), { className: 'share-link', readOnly: true });
    field.value = url;
    feedback.before(field);
    field.select();
    say('Copie o link acima 👆');
  });
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function legacyCopy(text) {
  const area = Object.assign(document.createElement('textarea'), { value: text });
  area.style.cssText = 'position:fixed;opacity:0';
  document.body.append(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  return ok;
}
