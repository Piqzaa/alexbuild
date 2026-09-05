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
});
