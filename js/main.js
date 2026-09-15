/**
 * main.js — Point d'entrée JS
 * AlexBuild — Atelier de précision
 */

import { initNav } from './nav.js';
import { initHero } from './hero.js';
import { initAnimations } from './animations.js';
import { initAuditTool } from './audit-tool.js';
import { initExperience } from './experience.js';
import { initAmbientParticles } from './particles.js';
import { initContactForm } from './contact-form.js';
import { initLaunchSphere } from './launch-sphere.js';

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.replace('no-js', 'js');

  try { initNav(); } catch(e) { console.error('Nav init failed:', e); }
  try { initHero(); } catch(e) { console.error('Hero init failed:', e); }
  try { initAnimations(); } catch(e) { console.error('Animations init failed:', e); }
  try { initExperience(); } catch(e) { console.error('Experience init failed:', e); }
  try { initAmbientParticles(); } catch(e) { console.error('Particles init failed:', e); }
  try { initAuditTool(); } catch(e) { console.error('Audit tool init failed:', e); }
  try { initContactForm(); } catch(e) { console.error('Contact form init failed:', e); }
  try { initLaunchSphere(); } catch(e) { console.error('Launch sphere init failed:', e); }
});
