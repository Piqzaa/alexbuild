/**
 * nav.js — Menu hamburger + scroll effect
 * AlexBuild
 */

import { debounce } from './utils.js';

export function initNav() {
  const nav = document.querySelector('.nav');
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileMenu = document.querySelector('.nav__mobile');
  const mobileLinks = document.querySelectorAll('.nav__mobile a');

  if (!nav || !hamburger || !mobileMenu) return;

  // Scroll effect — nav background
  const handleScroll = () => {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', debounce(handleScroll, 10), { passive: true });
  handleScroll();

  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.contains('active');

    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('open');

    document.body.style.overflow = isOpen ? '' : 'hidden';
    hamburger.setAttribute('aria-expanded', !isOpen);
  });

  // Close on link click
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.focus();
    }
  });
}
