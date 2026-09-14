const FORM_ENDPOINT = 'https://formsubmit.co/ajax/alex.berrel@gmail.com';
const CONTROL_POINTS = ['Performance', 'Mobile', 'SEO', 'Structure', 'Expérience utilisateur', 'Visibilité locale', 'Sécurité', 'Accessibilité'];

function normalizeWebsite(value) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Indiquez l’adresse de votre site.');
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url;
  try { url = new URL(candidate); } catch { throw new Error('Adresse incomplète. Exemple : www.votreentreprise.fr'); }
  const host = url.hostname.replace(/^www\./i, '');
  if (!host.includes('.') || host.includes(' ') || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Adresse incomplète. Exemple : www.votreentreprise.fr');
  }
  url.hash = '';
  return url;
}

export function initAuditTool() {
  const tool = document.querySelector('[data-audit-tool]');
  if (!tool) return;

  const states = [...tool.querySelectorAll('[data-audit-state]')];
  const urlForm = tool.querySelector('[data-audit-url-form]');
  const emailForm = tool.querySelector('[data-audit-email-form]');
  const urlInput = urlForm?.querySelector('[name="website"]');
  const emailInput = emailForm?.querySelector('[name="email"]');
  const consent = emailForm?.querySelector('[name="consent"]');
  const honeypot = emailForm?.querySelector('[name="company"]');
  const hiddenUrl = tool.querySelector('[data-audit-hidden-url]');
  const checks = [...tool.querySelectorAll('[data-audit-check]')];
  const progressBar = tool.querySelector('[data-audit-progress-bar]');
  const percent = tool.querySelector('[data-audit-percent]');
  const progressLabel = tool.querySelector('[data-audit-progress-label]');
  const live = tool.querySelector('[data-audit-live]');
  const radarLabel = tool.querySelector('[data-audit-radar-label]');
  const consoleStatus = tool.querySelector('[data-audit-console-status]');
  const urlError = tool.querySelector('[data-audit-url-error]');
  const emailError = tool.querySelector('[data-audit-email-error]');
  const sendButton = tool.querySelector('.audit-tool__send');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let websiteUrl = null;
  let timer = null;

  const showState = (name) => states.forEach((state) => { state.hidden = state.dataset.auditState !== name; });
  const showError = (element, message = '') => {
    if (!element) return;
    element.textContent = message;
    element.hidden = !message;
  };

  const paintProgress = (value) => {
    const progress = Math.min(100, Math.max(0, Math.round(value)));
    tool.style.setProperty('--audit-progress', `${progress}%`);
    if (percent) percent.textContent = `${progress} %`;
    if (progressBar) progressBar.style.width = `${progress}%`;

    const activeIndex = Math.min(checks.length - 1, Math.floor(progress / (100 / checks.length)));
    checks.forEach((item, index) => {
      const done = progress >= ((index + 1) / checks.length) * 100;
      const active = index === activeIndex && progress < 100;
      item.classList.toggle('is-done', done);
      item.classList.toggle('is-active', active);
      const status = item.querySelector('small');
      if (status) status.textContent = done ? 'Ajouté au contrôle' : active ? 'Préparation…' : 'À préparer';
    });

    const label = progress >= 100 ? 'Grille prête' : CONTROL_POINTS[activeIndex];
    if (progressLabel) progressLabel.textContent = label;
    if (radarLabel) radarLabel.textContent = progress >= 100 ? 'Prêt' : CONTROL_POINTS[activeIndex].split(' ')[0];
    if (live && progress < 100) live.textContent = `Préparation du contrôle : ${CONTROL_POINTS[activeIndex]}…`;
  };

  const finish = () => {
    paintProgress(100);
    tool.classList.remove('is-running');
    if (consoleStatus) consoleStatus.textContent = 'Grille de contrôle prête';
    if (live) live.textContent = 'Tous les points du diagnostic sont prêts à être vérifiés.';
    setTimeout(() => {
      showState('complete');
      emailInput?.focus({ preventScroll: true });
    }, reducedMotion ? 0 : 500);
  };

  const runPreparation = () => {
    clearInterval(timer);
    paintProgress(0);
    tool.classList.add('is-running');
    if (consoleStatus) consoleStatus.textContent = 'Préparation en cours';
    if (reducedMotion) {
      paintProgress(100);
      finish();
      return;
    }

    const startedAt = performance.now();
    const duration = 9200;
    timer = setInterval(() => {
      const progress = ((performance.now() - startedAt) / duration) * 100;
      if (progress >= 100) {
        clearInterval(timer);
        timer = null;
        finish();
      } else {
        paintProgress(progress);
      }
    }, 80);
  };

  urlForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    showError(urlError);
    try { websiteUrl = normalizeWebsite(urlInput.value); } catch (error) {
      showError(urlError, error.message);
      urlInput.focus();
      return;
    }
    const host = websiteUrl.hostname.replace(/^www\./i, '');
    tool.querySelectorAll('[data-audit-host]').forEach((element) => { element.textContent = host; });
    if (hiddenUrl) hiddenUrl.value = websiteUrl.href;
    showState('progress');
    runPreparation();
  });

  emailForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError(emailError);
    if (!emailForm.checkValidity()) {
      emailForm.reportValidity();
      return;
    }
    if (!websiteUrl) {
      showState('start');
      showError(urlError, 'Commencez par indiquer votre site.');
      urlInput?.focus();
      return;
    }
    if (honeypot?.value) {
      showState('success');
      return;
    }

    const originalLabel = sendButton.textContent;
    sendButton.disabled = true;
    sendButton.textContent = 'Transmission en cours…';
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Nouvelle demande de diagnostic — ${websiteUrl.hostname}`,
          _template: 'table',
          _captcha: 'false',
          _replyto: emailInput.value.trim(),
          'Site à vérifier': websiteUrl.href,
          'Email du prospect': emailInput.value.trim(),
          Consentement: consent.checked ? 'Accepté' : 'Non',
          Source: 'Diagnostic interactif AlexBuild'
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false || result.success === 'false') throw new Error('Delivery failed');
      showState('success');
      if (consoleStatus) consoleStatus.textContent = 'Demande transmise';
      tool.querySelector('[data-audit-state="success"]')?.focus({ preventScroll: true });
      emailForm.reset();
    } catch {
      showError(emailError, 'La transmission a échoué. Réessayez ou écrivez à dev@alexbuild.fr.');
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = originalLabel;
    }
  });
}
