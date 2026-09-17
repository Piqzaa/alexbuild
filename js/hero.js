import { prefersReducedMotion } from './utils.js';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const HERO_FRAME_COUNT = 80;
const HERO_FRAME_PATH = 'assets/hero-cinematic-frames/frame-';

export function initHero() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;

  const canAnimateJourney = !prefersReducedMotion();
  // The hero now uses one continuous Kling video, including tablet/mobile.
  // Keeping the source active here avoids falling back to the deleted frame set.
  const canLoadVideo = true;
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
  const videos = [...hero.querySelectorAll('[data-hero-scrub]')];
  const sources = videos.map((video) => video.querySelector('[data-src]'));
  if (!videos.length || sources.some((source) => !source)) return;

  const methodCards = [...hero.querySelectorAll('[data-method-card]')];
  const journeyCta = hero.querySelector('[data-journey-cta]');
  const durations = videos.map(() => 0);
  let frame = null;
  let scrubTarget = 0;
  let scrubProgress = 0;
  let settleTimer = null;
  // The old still-frame fallback was removed with the previous hero assets.
  // Mobile keeps the static poster; desktop uses the Kling MP4 scrubber.
  const frameScrub = null;
  // Scrub decoded local frames instead of seeking an MP4 on every wheel event.
  // This keeps reverse scrolling deterministic and prevents decoder contention.
  const sequenceScrub = loadVideo ? initImageSequenceScrub(hero) : null;
  const smoothStep = (value) => value * value * (3 - 2 * value);

  const update = () => {
    const rect = hero.getBoundingClientRect();
    const distance = Math.max(hero.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-rect.top / distance);
    const expansion = clamp(progress / .28);
    const arrival = clamp((progress - .25) / .12);
    const fallback = clamp((progress - .94) / .06);
    // Leave the hero copy alone first. The cinematic sequence only starts once
    // the title and CTA have cleared, then runs until the very end of the pin.
    const timelineStart = .28;
    const timelineEnd = .965;
    const timelineProgress = clamp((progress - timelineStart) / (timelineEnd - timelineStart));
    scrubTarget = timelineProgress;
    const scrubDelta = scrubTarget - scrubProgress;
    // Scroll events arrive in large, uneven steps on trackpads and mouse
    // wheels. Interpolating the visual progress keeps the camera and cards
    // moving continuously between those events without adding a library.
    if (Math.abs(scrubDelta) > .00035) scrubProgress += scrubDelta * .12;
    else scrubProgress = scrubTarget;
    if (Math.abs(scrubDelta) > .012) {
      hero.classList.add('is-scrubbing-fast');
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => hero.classList.remove('is-scrubbing-fast'), 140);
    }

    hero.style.setProperty('--hero-progress', progress.toFixed(4));
    hero.dataset.progress = progress.toFixed(4);
    hero.style.setProperty('--hero-beam-shift', `${(progress * 12).toFixed(2)}%`);
    hero.style.setProperty('--hero-beam-opacity', Math.max(.35, .85 - progress * .5).toFixed(3));
    hero.style.setProperty('--hero-copy-opacity', Math.max(0, 1 - progress * 5.4).toFixed(3));
    hero.style.setProperty('--hero-copy-y', `${(progress * -10).toFixed(2)}vh`);
    hero.style.setProperty('--hero-launch-opacity', Math.max(0, 1 - progress * 5.2).toFixed(3));
    hero.style.setProperty('--hero-cue-opacity', Math.max(0, 1 - progress * 5).toFixed(3));
    hero.style.setProperty('--hero-art-left', `${(30 * (1 - expansion)).toFixed(2)}%`);
    hero.style.setProperty('--hero-art-clip', `${(12 * (1 - expansion)).toFixed(2)}%`);
    hero.style.setProperty('--hero-overlay-opacity', Math.max(0, 1 - progress * 2.8).toFixed(3));
    hero.style.setProperty('--hero-grid-opacity', Math.max(0, 1 - progress * 3).toFixed(3));
    hero.style.setProperty('--hero-arrival-opacity', arrival.toFixed(3));
    hero.style.setProperty('--hero-arrival-y', `${((1 - arrival) * 4).toFixed(2)}vh`);
    hero.style.setProperty('--hero-fallback-opacity', fallback.toFixed(3));
    frameScrub?.(progress);
    sequenceScrub?.(scrubProgress);
    const segmentProgress = scrubProgress * Math.max(videos.length, 1);
    const activeIndex = Math.min(videos.length - 1, Math.floor(segmentProgress));
    videos.forEach((video, index) => video.classList.toggle('is-active', index === activeIndex));
    // Seeking hidden videos every scroll frame makes the decoder fight itself.
    // Only the visible segment is scrubbed; the next segment is already preloaded.
    const activeVideo = videos[activeIndex];
    const activeLocalProgress = clamp(segmentProgress - activeIndex);
    const activeTarget = durations[activeIndex]
      ? Math.min(Math.max(0, durations[activeIndex] - .04), activeLocalProgress * durations[activeIndex])
      : 0;
    if (durations[activeIndex] && activeVideo.readyState >= activeVideo.HAVE_METADATA && !activeVideo.seeking && Math.abs(activeVideo.currentTime - activeTarget) > .018) {
      // Direct currentTime seeks are more accurate for scroll scrubbing than
      // fastSeek(), which snaps to keyframes and creates visible jumps.
      activeVideo.currentTime = activeTarget;
    }
    // Cards enter just after each visual beat rather than on the exact scene
    // boundary, leaving the transition readable before the overlay appears.
    const cardProgress = Math.max(0, scrubProgress * methodCards.length - .12);
    methodCards.forEach((card, index) => {
      // Each card belongs to a scene: it enters just after that scene's cut.
      // The final card intentionally remains visible at the end of the journey.
      const local = cardProgress - index;
      const fadeIn = local < .16 ? smoothStep(clamp(local / .16)) : 1;
      const fadeOut = index === methodCards.length - 1 ? 1 : (local > .88 ? 1 - smoothStep(clamp((local - .88) / .12)) : 1);
      const opacity = Math.min(fadeIn, fadeOut);
      card.style.setProperty('--method-card-opacity', opacity.toFixed(3));
      card.style.setProperty('--method-card-build', fadeIn.toFixed(3));
      card.style.setProperty('--method-card-dissolve', (1 - fadeOut).toFixed(3));
      card.style.setProperty('--method-card-scale', (0.94 + opacity * .06).toFixed(3));
      card.style.setProperty('--method-card-y', `${((1 - fadeIn) * 2.5 - (1 - fadeOut) * 2.5).toFixed(2)}vh`);
      card.style.setProperty('--method-card-blur', `${((1 - opacity) * 8).toFixed(2)}px`);
      card.classList.toggle('is-current', opacity > .5);
      card.style.visibility = opacity < .02 ? 'hidden' : 'visible';
      card.setAttribute('aria-hidden', opacity < .35 ? 'true' : 'false');
    });
    if (journeyCta) {
      const ctaProgress = smoothStep(clamp((scrubProgress - .9) / .1));
      journeyCta.style.setProperty('--journey-cta-opacity', ctaProgress.toFixed(3));
      journeyCta.style.setProperty('--journey-cta-y', `${((1 - ctaProgress) * 1.5).toFixed(2)}vh`);
      journeyCta.style.pointerEvents = ctaProgress > .55 ? 'auto' : 'none';
      journeyCta.setAttribute('aria-hidden', ctaProgress < .35 ? 'true' : 'false');
    }
    frame = null;
    if (Math.abs(scrubTarget - scrubProgress) > .00035) requestUpdate();
  };

  const requestUpdate = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  videos.forEach((video, index) => {
    video.addEventListener('loadedmetadata', () => {
      durations[index] = video.duration || 0;
      video.pause();
      requestUpdate();
    }, { once: true });
    video.addEventListener('loadeddata', () => {
      if (index === 0) hero.classList.add('is-video-ready');
      requestUpdate();
    }, { once: true });
    video.addEventListener('seeked', () => {
      if (video.currentTime > .04) hero.classList.add('is-video-ready');
      requestUpdate();
    });
  });

  const loadMedia = (video, source) => {
    video.preload = 'auto';
    // Let the browser stream the local MP4 directly. Downloading four complete
    // blobs before scrubbing starts creates unnecessary memory pressure.
    video.src = source.dataset.src;
    video.load();
  };

  // The local image sequence is the desktop path. MP4 remains a lightweight
  // fallback for environments where the sequence cannot be loaded.
  if (loadVideo && !sequenceScrub) videos.forEach((video, index) => loadMedia(video, sources[index]));
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  requestUpdate();
}

function initImageSequenceScrub(hero) {
  const canvas = hero.querySelector('[data-hero-sequence]');
  const loader = hero.querySelector('[data-hero-loader]');
  if (!canvas) return null;
  const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!context) return null;
  canvas.width = 1920;
  canvas.height = 1080;

  const scenes = [361, 361];
  const cache = scenes.map(() => new Map());
  const queued = new Set();
  const loading = new Set();
  const queue = [];
  const maxConcurrent = 3;
  let activeLoads = 0;
  let desired = { scene: 0, frame: 0 };
  let previousFrame = 0;
  let previousScene = 0;
  let currentKey = '';
  const path = (scene, frame) => `assets/hero-tech-frames-${scene + 1}/frame-${String(frame + 1).padStart(4, '0')}.webp`;

  const renderClosest = () => {
    const sceneCache = cache[desired.scene];
    let loaded = sceneCache.get(desired.frame);
    if (!loaded || !loaded.complete) {
      let closestDistance = Infinity;
      sceneCache.forEach((candidate, frame) => {
        if (!candidate.complete) return;
        const distance = Math.abs(frame - desired.frame);
        if (distance < closestDistance) {
          closestDistance = distance;
          loaded = candidate;
        }
      });
    }
    if (!loaded) return;
    const key = loaded.dataset.key;
    if (key === currentKey) return;
    currentKey = key;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(loaded, 0, 0, canvas.width, canvas.height);
    hero.classList.add('is-sequence-ready');
    loader?.setAttribute('aria-hidden', 'true');
  };

  const pump = () => {
    queue.sort((a, b) => a.priority - b.priority);
    while (activeLoads < maxConcurrent && queue.length) {
      const item = queue.shift();
      queued.delete(item.key);
      if (cache[item.scene].has(item.frame) || loading.has(item.key)) continue;
      loading.add(item.key);
      activeLoads += 1;
      const next = new Image();
      next.decoding = 'async';
      if ('fetchPriority' in next) next.fetchPriority = item.priority === 0 ? 'high' : 'low';
      next.dataset.key = item.key;
      next.onload = async () => {
        // `onload` only guarantees that the bytes arrived. Decode first so
        // swapping the visible image never flashes a transparent/black frame.
        try {
          if (typeof next.decode === 'function') await next.decode();
        } catch {
          // The browser may reject decode after a cache race; the image is
          // still usable once complete, so keep it as a fallback.
        }
        cache[item.scene].set(item.frame, next);
        loading.delete(item.key);
        activeLoads -= 1;
        renderClosest();
        pump();
      };
      next.onerror = () => {
        loading.delete(item.key);
        activeLoads -= 1;
        pump();
      };
      next.src = path(item.scene, item.frame);
    }
  };

  const preload = (scene, frame, priority = 2) => {
    if (scene < 0 || scene >= scenes.length || frame < 0 || frame >= scenes[scene]) return;
    const key = `${scene}:${frame}`;
    if (cache[scene].has(frame) || loading.has(key) || queued.has(key)) return;
    queued.add(key);
    queue.push({ scene, frame, priority, key });
    pump();
  };

  const evictDistant = () => {
    cache.forEach((sceneCache, scene) => {
      sceneCache.forEach((entry, frame) => {
        const isCurrent = scene === desired.scene;
        const isNext = scene === desired.scene + 1;
        const isPrevious = scene === desired.scene - 1;
        const keepBoundaryFrame = (isNext && frame < 36) || (isPrevious && frame > scenes[scene] - 36);
        if ((!isCurrent && !keepBoundaryFrame) || (isCurrent && Math.abs(frame - desired.frame) > 48)) sceneCache.delete(frame);
      });
    });
    for (let index = queue.length - 1; index >= 0; index -= 1) {
      const item = queue[index];
      const isUsefulNext = item.scene === desired.scene + 1 && item.frame < 36;
      const isUsefulPrevious = item.scene === desired.scene - 1 && item.frame > scenes[item.scene] - 36;
      const isUsefulCurrent = item.scene === desired.scene && Math.abs(item.frame - desired.frame) <= 48;
      if (!isUsefulCurrent && !isUsefulNext && !isUsefulPrevious) {
        queued.delete(item.key);
        queue.splice(index, 1);
      }
    }
  };

  // Warm the first frame immediately so the desktop hero never starts blank.
  preload(0, 0, 0);

  return (timelineProgress) => {
    const scaled = clamp(timelineProgress) * scenes.length;
    const scene = Math.min(scenes.length - 1, Math.floor(scaled));
    const local = clamp(scaled - scene);
    const frame = Math.round(local * (scenes[scene] - 1));
    const direction = scene !== previousScene ? (scene > previousScene ? 1 : -1) : (frame < previousFrame ? -1 : 1);
    previousFrame = frame;
    previousScene = scene;
    desired = { scene, frame };
    preload(scene, frame, 0);
    for (let step = 1; step <= 18; step += 1) {
      preload(scene, frame + step * direction, 1);
      if (step <= 6) preload(scene, frame - step * direction, 2);
    }
    if (scene < scenes.length - 1 && local > .72) {
      for (let offset = 0; offset <= 14; offset += 1) preload(scene + 1, offset, 2);
    }
    evictDistant();
    renderClosest();
  };
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
    if (image.decode) image.decode().catch(() => {});
  };

  const preloadRange = (from, to) => {
    for (let index = from; index <= to; index += 1) preloadFrame(index);
  };

  hero.classList.add('is-frame-ready');
  preloadRange(1, 18);

  let warmupIndex = 19;
  let warmupTimer = null;
  const stopWarmup = () => {
    if (!warmupTimer) return;
    clearInterval(warmupTimer);
    warmupTimer = null;
  };
  const startWarmup = () => {
    if (warmupTimer || warmupIndex >= HERO_FRAME_COUNT) return;
    warmupTimer = setInterval(() => {
      preloadRange(warmupIndex, Math.min(HERO_FRAME_COUNT - 1, warmupIndex + 5));
      warmupIndex += 6;
      if (warmupIndex >= HERO_FRAME_COUNT) stopWarmup();
    }, 850);
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) startWarmup();
        else stopWarmup();
      });
    }, { rootMargin: '35% 0px' });
    observer.observe(hero);
    window.addEventListener('pagehide', () => {
      stopWarmup();
      observer.disconnect();
    }, { once: true });
  } else {
    startWarmup();
  }

  return (progress) => {
    const timelineProgress = clamp(progress / .9);
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
