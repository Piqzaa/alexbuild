/**
 * animations.js — IntersectionObserver (reveal au scroll + parallax)
 * AlexBuild
 */

import { prefersReducedMotion } from './utils.js';

export function initAnimations() {
  if (prefersReducedMotion()) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }

  initReveal();
  initParallax();
  initHeroScroll();
}

function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  reveals.forEach(el => observer.observe(el));
}

function initParallax() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrolled = window.scrollY;
        if (scrolled < window.innerHeight) {
          hero.style.setProperty('--parallax', `${scrolled * 0.3}px`);
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

function initHeroScroll() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      hero.classList.toggle('hero--past', !entry.isIntersecting);
    },
    { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
  );

  observer.observe(hero);
}
