import { prefersReducedMotion } from './utils.js';

export function initAnimations() {
  const reveals = document.querySelectorAll('.reveal');
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    reveals.forEach((element) => element.classList.add('visible'));
  } else {
    const revealIfVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < viewportHeight * 0.93 && rect.bottom > viewportHeight * 0.07) {
        element.classList.add('visible');
        return true;
      }
      return false;
    };
    const revealVisibleItems = () => {
      reveals.forEach((element) => {
        if (element.classList.contains('visible')) return;
        if (revealIfVisible(element)) observer.unobserve(element);
      });
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    reveals.forEach((element) => {
      if (revealIfVisible(element)) return;
      observer.observe(element);
    });
    requestAnimationFrame(revealVisibleItems);
    addEventListener('scroll', revealVisibleItems, { passive: true });
    addEventListener('hashchange', () => requestAnimationFrame(revealVisibleItems), { passive: true });
  }

  const pageProgress = document.querySelector('[data-scroll-progress]');
  const method = document.querySelector('[data-method-track]');
  let scheduled = false;

  const update = () => {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const pageRatio = Math.min(1, Math.max(0, scrollY / scrollable));
    pageProgress?.style.setProperty('--scroll-progress', `${pageRatio * 100}%`);

    if (method) {
      const rect = method.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (innerHeight * 0.72 - rect.top) / (rect.height + innerHeight * 0.35)));
      method.style.setProperty('--method-progress', `${ratio * 100}%`);
    }
    scheduled = false;
  };

  addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}
