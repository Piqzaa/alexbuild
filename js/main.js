/**
 * main.js — Point d'entrée JS
 * AlexBuild — Atelier de précision
 */

import { initNav } from './nav.js';
import { initHero } from './hero.js?v=20260921p';
import { initAnimations } from './animations.js';
import { initAuditTool } from './audit-tool.js';
import { initExperience } from './experience.js';
import { initAmbientParticles } from './particles.js?v=20260920';
import { initContactForm } from './contact-form.js?v=20260921b';
import { initLaunchSphere } from './launch-sphere.js?v=20260920d';
import { initPowerWatcher } from './power.js';

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.replace('no-js', 'js');

  try { initPowerWatcher(); } catch(e) { console.error('Power watcher init failed:', e); }
  try { initNav(); } catch(e) { console.error('Nav init failed:', e); }
  try { initHero(); } catch(e) { console.error('Hero init failed:', e); }
  try { initAnimations(); } catch(e) { console.error('Animations init failed:', e); }
  try { initExperience(); } catch(e) { console.error('Experience init failed:', e); }
  try { initAmbientParticles(); } catch(e) { console.error('Particles init failed:', e); }
  try { initAuditTool(); } catch(e) { console.error('Audit tool init failed:', e); }
  try { initContactForm(); } catch(e) { console.error('Contact form init failed:', e); }
  try { initLaunchSphere(); } catch(e) { console.error('Launch sphere init failed:', e); }
});
