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

  const text = title.textContent.trim();
  title.textContent = '';
  title.setAttribute('aria-label', text);

  const words = text.split(' ');

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

    if (wordIndex < words.length - 1) {
      const space = document.createTextNode(' ');
      title.appendChild(space);
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
