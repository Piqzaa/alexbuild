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

  const closeBtn = mobileMenu.querySelector('.nav__mobile-close');
  const focusableSelector = 'a[href], button:not([disabled])';
  let lastFocusedElement = null;

  const closeMenu = ({ restoreFocus = false } = {}) => {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) (lastFocusedElement || hamburger).focus();
  };

  const openMenu = () => {
    lastFocusedElement = document.activeElement;
    hamburger.classList.add('active');
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
    hamburger.setAttribute('aria-expanded', 'true');
    (closeBtn || mobileMenu.querySelector(focusableSelector))?.focus();
  };

  const scrollToAnchor = (hash, behavior = 'smooth') => {
    if (!hash || hash === '#') return false;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return false;
    const navHeight = nav.getBoundingClientRect().height || 0;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top: Math.max(0, top), behavior });
    history.pushState(null, '', hash);
    return true;
  };

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
    if (isOpen) closeMenu({ restoreFocus: true });
    else openMenu();
  });

  // Close on link click
  mobileLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      const hash = link.hash;
      closeMenu();
      if (hash && link.pathname === window.location.pathname) {
        event.preventDefault();
        event.stopPropagation();
        requestAnimationFrame(() => scrollToAnchor(hash));
      }
    });
  });

  // Close on X button
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeMenu({ restoreFocus: true }));
  }

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    const isOpen = mobileMenu.classList.contains('open');
    if (e.key === 'Escape' && isOpen) {
      closeMenu({ restoreFocus: true });
    }
    if (e.key === 'Tab' && isOpen) {
      const focusableItems = [...mobileMenu.querySelectorAll(focusableSelector)];
      if (!focusableItems.length) return;
      const firstItem = focusableItems[0];
      const lastItem = focusableItems[focusableItems.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('skip-link')) return;
    if (link.pathname !== window.location.pathname) return;
    if (!scrollToAnchor(link.hash)) return;
    event.preventDefault();
  });

  if (window.location.hash && window.location.hash !== '#accueil') {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToAnchor(window.location.hash, 'auto');
        setTimeout(() => scrollToAnchor(window.location.hash, 'auto'), 120);
      });
    });
  }
}
