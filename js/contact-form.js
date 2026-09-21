const FORM_ENDPOINT = 'https://formsubmit.co/ajax/alex.berrel@gmail.com';

export function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  const status = form?.querySelector('[data-contact-status]');
  const button = form?.querySelector('button[type="submit"]');
  if (!form || !status || !button) return;

  const automationField = form.querySelector('[data-automation-field]');
  const automationInput = form.querySelector('[name="automation_task"]');
  const messageIndex = form.querySelector('[data-message-index]');
  const syncAutomationField = () => {
    const projectType = form.querySelector('input[name="project_type"]:checked')?.value;
    const isAutomation = projectType === 'Automatiser une tâche';
    if (automationField) {
      automationField.hidden = !isAutomation;
      automationField.style.display = isAutomation ? 'grid' : 'none';
    }
    if (messageIndex) messageIndex.textContent = isAutomation ? '05' : '04';
    if (automationInput) {
      automationInput.required = isAutomation;
      if (!isAutomation) automationInput.value = '';
    }
  };

  form.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.name === 'project_type') {
      syncAutomationField();
    }
  });

  const automationChoice = form.querySelector('input[name="project_type"][value="Automatiser une tâche"]');
  document.querySelectorAll('[data-automation-cta]').forEach((cta) => {
    cta.addEventListener('click', () => {
      if (!(automationChoice instanceof HTMLInputElement)) return;
      automationChoice.checked = true;
      syncAutomationField();
    });
  });
  syncAutomationField();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    form.classList.remove('is-success');
    status.textContent = '';
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const data = new FormData(form);
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Envoi en cours…';
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Nouvelle demande de devis — ${data.get('name')}`,
          _template: 'table',
          _captcha: 'false',
          _replyto: String(data.get('email')).trim(),
          'Nom / entreprise': data.get('name'),
          Email: data.get('email'),
          Besoin: data.get('project_type'),
          'Tâche à automatiser': data.get('automation_task') || 'Non concerné',
          Message: data.get('message'),
          Consentement: data.get('consent') ? 'Accepté' : 'Non',
          Source: 'Formulaire projet AlexBuild — offre de lancement'
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false || result.success === 'false') throw new Error('Delivery failed');
      form.reset();
      syncAutomationField();
      form.classList.add('is-success');
      status.textContent = 'Demande envoyée. Je vous répondrai personnellement.';
    } catch {
      status.textContent = 'L’envoi a échoué. Vous pouvez écrire à dev@alexbuild.fr.';
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
}
