const FORM_ENDPOINT = 'https://formsubmit.co/ajax/alex.berrel@gmail.com';

export function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  const status = form?.querySelector('[data-contact-status]');
  const button = form?.querySelector('button[type="submit"]');
  if (!form || !status || !button) return;

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
          Nom: data.get('name'),
          Email: data.get('email'),
          Entreprise: data.get('business') || 'Non indiquée',
          Besoin: data.get('project_type'),
          'Situation actuelle': data.get('website_status'),
          Budget: data.get('budget') || 'À définir',
          Message: data.get('message'),
          Consentement: data.get('consent') ? 'Accepté' : 'Non',
          Source: 'Formulaire projet AlexBuild — offre de lancement'
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false || result.success === 'false') throw new Error('Delivery failed');
      form.reset();
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
