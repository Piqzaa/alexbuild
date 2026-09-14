import { prefersReducedMotion } from './utils.js';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const HERO_FRAME_COUNT = 80;
const HERO_FRAME_PATH = 'assets/hero-cinematic-frames/frame-';

export function initHero() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;

  const canAnimateJourney = !prefersReducedMotion();
  const canLoadVideo = window.innerWidth > 900;
  const canUsePointerDepth = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (canAnimateJourney) initScrollJourney(hero, canLoadVideo);
  if (canAnimateJourney && canUsePointerDepth) {
    initPointerDepth(hero);
    initArrivalAttraction(hero);
  }
}

function initPointerDepth(hero) {
  let frame = null;

  hero.addEventListener('pointermove', (event) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - Math.max(rect.top, 0)) / window.innerHeight - .5;
      hero.style.setProperty('--px', `${x * -12}px`);
      hero.style.setProperty('--py', `${y * -7}px`);
      frame = null;
    });
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--px', '0px');
    hero.style.setProperty('--py', '0px');
  });
}

function initArrivalAttraction(hero) {
  const cards = [...hero.querySelectorAll('[data-arrival-card]')];
  cards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      card.style.setProperty('--card-x', `${x * 14}px`);
      card.style.setProperty('--card-y', `${y * 10}px`);
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--card-x', '0px');
      card.style.setProperty('--card-y', '0px');
    });
  });
}

function initScrollJourney(hero, loadVideo) {
  const video = hero.querySelector('[data-hero-scrub]');
  const source = video?.querySelector('[data-src]');
  if (!video || !source) return;

  let duration = 0;
  let frame = null;
  let targetTime = 0;
  const frameScrub = loadVideo ? null : initFrameScrub(hero);

  const update = () => {
    const rect = hero.getBoundingClientRect();
    const distance = Math.max(hero.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-rect.top / distance);
    const expansion = clamp(progress / .28);
    const arrival = clamp((progress - .69) / .11);
    const fallback = clamp((progress - .46) / .34);

    hero.style.setProperty('--hero-progress', progress.toFixed(4));
    hero.dataset.progress = progress.toFixed(4);
    hero.style.setProperty('--hero-beam-shift', `${(progress * 12).toFixed(2)}%`);
    hero.style.setProperty('--hero-beam-opacity', Math.max(.35, .85 - progress * .5).toFixed(3));
    hero.style.setProperty('--hero-copy-opacity', Math.max(0, 1 - progress * 3.2).toFixed(3));
    hero.style.setProperty('--hero-copy-y', `${(progress * -10).toFixed(2)}vh`);
    hero.style.setProperty('--hero-launch-opacity', Math.max(0, 1 - progress * 4).toFixed(3));
    hero.style.setProperty('--hero-cue-opacity', Math.max(0, 1 - progress * 5).toFixed(3));
    hero.style.setProperty('--hero-art-left', `${(30 * (1 - expansion)).toFixed(2)}%`);
    hero.style.setProperty('--hero-art-clip', `${(12 * (1 - expansion)).toFixed(2)}%`);
    hero.style.setProperty('--hero-overlay-opacity', Math.max(0, 1 - progress * 2.8).toFixed(3));
    hero.style.setProperty('--hero-grid-opacity', Math.max(0, 1 - progress * 3).toFixed(3));
    hero.style.setProperty('--hero-arrival-opacity', arrival.toFixed(3));
    hero.style.setProperty('--hero-arrival-y', `${((1 - arrival) * 4).toFixed(2)}vh`);
    hero.style.setProperty('--hero-fallback-opacity', fallback.toFixed(3));
    frameScrub?.(progress);
    if (duration && video.readyState >= video.HAVE_METADATA) {
      // Les derniers 20 % maintiennent l'arrivée pour laisser le contenu se lire.
      const timelineProgress = clamp(progress / .8);
      targetTime = Math.min(duration - .04, timelineProgress * duration);
      if (!video.seeking && Math.abs(video.currentTime - targetTime) > .025) video.currentTime = targetTime;
    }

    frame = null;
  };

  const requestUpdate = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  video.addEventListener('loadedmetadata', () => {
    duration = video.duration || 0;
    video.pause();
    requestUpdate();
  }, { once: true });

  video.addEventListener('loadeddata', () => {
    requestUpdate();
  }, { once: true });

  video.addEventListener('seeked', () => {
    if (video.currentTime > .04) hero.classList.add('is-video-ready');
    if (Math.abs(video.currentTime - targetTime) > .025) video.currentTime = targetTime;
  });

  const mediaUrl = source.dataset.src;
  let objectUrl = null;

  const loadMedia = async () => {
    video.preload = 'auto';
    try {
      const response = await fetch(mediaUrl);
      if (!response.ok) throw new Error(`Video request failed: ${response.status}`);
      objectUrl = URL.createObjectURL(await response.blob());
      video.src = objectUrl;
    } catch {
      source.src = mediaUrl;
    }
    video.load();
  };

  if (loadVideo) loadMedia();
  window.addEventListener('pagehide', () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, { once: true });

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  requestUpdate();
}

function initFrameScrub(hero) {
  const frameImage = hero.querySelector('[data-hero-frame]');
  if (!frameImage) return null;

  const loadedFrames = new Set([0]);
  const loadingFrames = new Set();
  const frameSources = Array.from({ length: HERO_FRAME_COUNT }, (_, index) => {
    const number = String(index + 1).padStart(3, '0');
    return `${HERO_FRAME_PATH}${number}.jpg`;
  });
  let currentIndex = 0;

  const preloadFrame = (index) => {
    if (index < 0 || index >= HERO_FRAME_COUNT || loadedFrames.has(index) || loadingFrames.has(index)) return;
    loadingFrames.add(index);
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      loadedFrames.add(index);
      loadingFrames.delete(index);
    };
    image.onerror = () => loadingFrames.delete(index);
    image.src = frameSources[index];
  };

  const preloadRange = (from, to) => {
    for (let index = from; index <= to; index += 1) preloadFrame(index);
  };

  hero.classList.add('is-frame-ready');
  preloadRange(1, 18);

  let warmupIndex = 19;
  const warmupTimer = setInterval(() => {
    preloadRange(warmupIndex, Math.min(HERO_FRAME_COUNT - 1, warmupIndex + 5));
    warmupIndex += 6;
    if (warmupIndex >= HERO_FRAME_COUNT) clearInterval(warmupTimer);
  }, 850);

  return (progress) => {
    const timelineProgress = clamp(progress / .8);
    const targetIndex = Math.round(timelineProgress * (HERO_FRAME_COUNT - 1));
    preloadRange(Math.max(0, targetIndex - 1), Math.min(HERO_FRAME_COUNT - 1, targetIndex + 8));
    if (targetIndex === currentIndex) return;

    let nextIndex = targetIndex;
    while (nextIndex > 0 && !loadedFrames.has(nextIndex)) nextIndex -= 1;
    if (nextIndex === currentIndex) return;

    currentIndex = nextIndex;
    frameImage.src = frameSources[currentIndex];
  };
}
