/**
 * main.js — Point d'entrée JS
 * AlexBuild — Atelier de précision
 */

import { initNav } from './nav.js';
import { initHero } from './hero.js';
import { initAnimations } from './animations.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHero();
  initAnimations();
});
