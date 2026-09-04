/**
 * utils.js — Helpers partagés
 * AlexBuild
 */

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const debounce = (fn, delay = 100) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const isMobile = () => window.innerWidth < 768;
