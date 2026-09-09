/**
 * main.js — Point d'entrée JS
 * AlexBuild — Atelier de précision
 */

import { initNav } from './nav.js';
import { initHero } from './hero.js';
import { initAnimations } from './animations.js';

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.replace('no-js', 'js');

  try { initNav(); } catch(e) { console.error('Nav init failed:', e); }
  try { initHero(); } catch(e) { console.error('Hero init failed:', e); }
  try { initAnimations(); } catch(e) { console.error('Animations init failed:', e); }

  const form = document.querySelector('.contact__form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('.btn-primary');
      const successMsg = form.querySelector('.form-success');
      const errorMsg = form.querySelector('.form-error');

      btn.disabled = true;
      btn.textContent = 'Envoi en cours…';
      successMsg.style.display = 'none';
      errorMsg.style.display = 'none';

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          form.reset();
          successMsg.style.display = 'block';
          btn.textContent = 'Envoyer ma demande';
          btn.disabled = false;
        } else {
          throw new Error('Form submission failed');
        }
      } catch {
        errorMsg.style.display = 'block';
        btn.textContent = 'Envoyer ma demande';
        btn.disabled = false;
      }
    });
  }
});
