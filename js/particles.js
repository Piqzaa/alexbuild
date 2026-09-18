import { prefersReducedMotion } from './utils.js';
import { isBudgetMode, onPowerChange } from './power.js';

const DARK_ZONE_SELECTOR = '.hero, .work, .launch, .method, .contact, .footer';

export function initAmbientParticles() {
  const canvas = document.querySelector('[data-ambient-particles]');
  if (!canvas) return;

  const context = canvas.getContext('2d', { alpha: true });
  const zones = [...document.querySelectorAll(DARK_ZONE_SELECTOR)];
  const journey = document.querySelector('[data-hero]');
  if (!context || !zones.length) return;

  const reduceMotion = prefersReducedMotion();
  // Budget mode (touch, low battery, data saver or reduced motion) settles for
  // a single static frame instead of a dozen requestAnimationFrame ticks per
  // second: the gold-dust atmosphere stays, the perpetual CPU cost disappears.
  const budget = { active: isBudgetMode() };
  const compact = window.matchMedia('(max-width: 700px)').matches;
  const count = compact ? 26 : 56;
  const targetFrameTime = compact ? 42 : 32;
  let width = 0;
  let height = 0;
  let ratio = 1;
  let particles = [];
  let visibleZones = [];
  let animationFrame = null;
  let previousTime = 0;
  let geometryFrame = null;

  const makeParticle = (randomY = true) => ({
    x: Math.random() * width,
    y: randomY ? Math.random() * height : height + Math.random() * 24,
    radius: .55 + Math.random() * 1.1,
    velocityX: (Math.random() - .5) * .12,
    velocityY: -.09 - Math.random() * .18,
    alpha: .2 + Math.random() * .3,
    pulse: Math.random() * Math.PI * 2,
    isGlint: Math.random() > .76
  });

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    ratio = Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = Array.from({ length: count }, () => makeParticle());
    updateGeometry();
  };

  const updateGeometry = () => {
    visibleZones = zones
      .map((zone) => zone.getBoundingClientRect())
      .filter((rect) => rect.bottom > 0 && rect.top < height)
      .map((rect) => ({ top: Math.max(0, rect.top), bottom: Math.min(height, rect.bottom) }));

    if (visibleZones.length && !animationFrame && !document.hidden) {
      previousTime = performance.now();
      animationFrame = requestAnimationFrame(draw);
    }
    geometryFrame = null;
  };

  const requestGeometry = () => {
    if (!geometryFrame) geometryFrame = requestAnimationFrame(updateGeometry);
  };

  const draw = (time) => {
    if (!visibleZones.length || document.hidden) {
      context.clearRect(0, 0, width, height);
      animationFrame = null;
      return;
    }

    if (time - previousTime < targetFrameTime) {
      animationFrame = requestAnimationFrame(draw);
      return;
    }

    const delta = Math.min((time - previousTime) / 16.67, 2.5);
    const journeyProgress = Number.parseFloat(journey?.dataset.progress || '0');
    const speedBoost = 1.8 + Math.sin(Math.min(1, journeyProgress / .9) * Math.PI) * 3.2;
    previousTime = time;
    context.clearRect(0, 0, width, height);
    context.save();
    context.beginPath();
    visibleZones.forEach((zone) => context.rect(0, zone.top, width, zone.bottom - zone.top));
    context.clip();

    particles.forEach((particle, index) => {
      particle.x += particle.velocityX * delta * speedBoost;
      particle.y += particle.velocityY * delta * speedBoost;
      particle.pulse += .012 * delta;

      if (particle.y < -12 || particle.x < -12 || particle.x > width + 12) {
        particles[index] = makeParticle(false);
        return;
      }

      const shimmer = .72 + Math.sin(particle.pulse) * .28;
      context.fillStyle = `rgba(227, 189, 145, ${particle.alpha * shimmer})`;

      if (particle.isGlint) {
        context.fillRect(particle.x, particle.y, particle.radius * (5 + speedBoost * 1.8), .65);
      } else {
        if (particle.radius > 1.25) {
          context.fillStyle = `rgba(227, 189, 145, ${particle.alpha * shimmer * .2})`;
          context.beginPath();
          context.arc(particle.x, particle.y, particle.radius * 3.2, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = `rgba(240, 207, 166, ${particle.alpha * shimmer})`;
        }
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }
    });

    context.restore();
    animationFrame = reduceMotion || budget.active ? null : requestAnimationFrame(draw);
  };

  // A mid-session drop into budget mode freezes the loop after the next frame;
  // leaving it resumes the gentle ambient drift without a reload. The loop is
  // only ever re-armed from updateGeometry, so freezing means cancelling the
  // pending frame and letting the next scroll/resize refresh settle into one.
  onPowerChange(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    updateGeometry();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateGeometry();
  });
  window.addEventListener('scroll', requestGeometry, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  resize();
}
