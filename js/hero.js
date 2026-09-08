/**
 * hero.js — Animation du hero (stagger letters + glow souris)
 * AlexBuild
 */

import { prefersReducedMotion } from './utils.js';

export function initHero() {
  initVideoFallback();
  initTitleAnimation();
  initGlowEffect();
}

function initVideoFallback() {
  const video = document.querySelector('.hero__video');
  const hero = document.querySelector('.hero');
  if (!video || !hero) return;

  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      hero.classList.add('hero--no-video');
    });
  }
}

function initTitleAnimation() {
  const title = document.querySelector('.hero__title');
  if (!title) return;

  // Détecter le <br> avant de vider le contenu
  const brElement = title.querySelector('br');
  let brAfterWordIndex = -1;
  let charCount = 0;

  if (brElement) {
    const nodes = title.childNodes;
    for (const node of nodes) {
      if (node === brElement) break;
      charCount += node.textContent.length;
    }
    const textBeforeBr = title.textContent.substring(0, charCount).trim();
    brAfterWordIndex = textBeforeBr.split(' ').length - 1;
  }

  const text = title.textContent.trim();
  title.textContent = '';
  title.setAttribute('aria-label', text);

  // Le <br> ne produit pas d'espace dans textContent, le réinsérer pour le split
  const splitText = brAfterWordIndex >= 0
    ? text.substring(0, charCount) + ' ' + text.substring(charCount)
    : text;

  const words = splitText.split(' ');

  words.forEach((word, wordIndex) => {
    const wordSpan = document.createElement('span');
    wordSpan.style.whiteSpace = 'nowrap';

    [...word].forEach((char) => {
      const charSpan = document.createElement('span');
      charSpan.className = 'hero__title-char';
      charSpan.textContent = char;
      charSpan.setAttribute('aria-hidden', 'true');
      wordSpan.appendChild(charSpan);
    });

    title.appendChild(wordSpan);

    // Réinsérer le <br> après le bon mot
    if (brAfterWordIndex >= 0 && wordIndex === brAfterWordIndex) {
      const br = document.createElement('span');
      br.className = 'hero__title-br';
      br.setAttribute('aria-hidden', 'true');
      title.appendChild(br);
    } else if (wordIndex < words.length - 1) {
      title.appendChild(document.createTextNode(' '));
    }
  });

  if (prefersReducedMotion()) {
    title.querySelectorAll('.hero__title-char').forEach(c => c.classList.add('visible'));
    return;
  }

  title.querySelectorAll('.hero__title-char').forEach((char, i) => {
    setTimeout(() => {
      char.classList.add('visible');
    }, 50 + i * 25);
  });
}

function initGlowEffect() {
  const hero = document.querySelector('.hero');
  const glow = document.querySelector('.hero__glow');
  if (!hero || !glow) return;

  if (prefersReducedMotion()) {
    glow.style.setProperty('--mouse-x', '50%');
    glow.style.setProperty('--mouse-y', '40%');
    return;
  }

  let ticking = false;

  hero.addEventListener('mousemove', (e) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        glow.style.setProperty('--mouse-x', `${x}%`);
        glow.style.setProperty('--mouse-y', `${y}%`);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Position initiale au centre
  glow.style.setProperty('--mouse-x', '50%');
  glow.style.setProperty('--mouse-y', '40%');
}
