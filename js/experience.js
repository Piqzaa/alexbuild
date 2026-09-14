import { prefersReducedMotion } from './utils.js';

export function initExperience() {
  initComparison();
  initProjectDepth();
  initOfferAccordion();
}

function initComparison() {
  const comparison = document.querySelector('[data-compare]');
  const range = comparison?.querySelector('[data-compare-range]');
  if (!comparison || !range) return;
  range.addEventListener('input', () => comparison.style.setProperty('--split', `${range.value}%`));
}

function initProjectDepth() {
  if (prefersReducedMotion() || matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll('[data-project]').forEach((project) => {
    const plane = project.querySelector('[data-project-plane]');
    if (!plane) return;
    project.addEventListener('pointermove', (event) => {
      const rect = project.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      plane.style.setProperty('--tilt-x', `${x * 4}deg`);
      plane.style.setProperty('--tilt-y', `${y * -3}deg`);
    }, { passive: true });
    project.addEventListener('pointerleave', () => {
      plane.style.setProperty('--tilt-x', '0deg');
      plane.style.setProperty('--tilt-y', '0deg');
    });
  });
}

function initOfferAccordion() {
  const offers = [...document.querySelectorAll('.offer')];
  offers.forEach((offer) => offer.addEventListener('toggle', () => {
    if (!offer.open) return;
    offers.forEach((other) => {
      if (other !== offer) other.open = false;
    });
  }));
}
