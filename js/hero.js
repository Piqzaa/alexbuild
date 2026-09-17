import { prefersReducedMotion } from './utils.js';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const SEQUENCE_FRAMES = 75;

export function initHero() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;

  const canAnimateJourney = !prefersReducedMotion();
  const canUsePointerDepth = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (canAnimateJourney) initScrollJourney(hero);
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

function initScrollJourney(hero) {
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
  // Scrub decoded local frames instead of seeking an MP4 on every wheel event.
  // This keeps reverse scrolling deterministic and prevents decoder contention.
  const sequenceScrub = initImageSequenceScrub(hero);
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
    const ctaProgress = journeyCta ? smoothStep(clamp((scrubProgress - .86) / .12)) : 0;
    // Cards enter just after each visual beat rather than on the exact scene
    // boundary, leaving the transition readable before the overlay appears.
    const cardProgress = Math.max(0, scrubProgress * methodCards.length - .12);
    methodCards.forEach((card, index) => {
      // Each card belongs to a scene: it enters just after that scene's cut.
      // The final card dissolves as the big end-of-journey CTA takes over.
      const local = cardProgress - index;
      const fadeIn = local < .16 ? smoothStep(clamp(local / .16)) : 1;
      const fadeOut = index === methodCards.length - 1
        ? 1 - smoothStep(ctaProgress)
        : local > .88 ? 1 - smoothStep(clamp((local - .88) / .12)) : 1;
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
    // Fallback path only: streamed the local MP4 is a rough substitute for the
    // precise image sequence, usable when canvas decoding is unavailable.
    video.src = source.dataset.src;
    video.load();
  };

  // Image sequence is the primary scrub path. MP4 remains a lightweight
  // fallback for environments where the sequence cannot be decoded.
  if (!sequenceScrub) videos.forEach((video, index) => loadMedia(video, sources[index]));
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  requestUpdate();
}

function initImageSequenceScrub(hero) {
  const canvas = hero.querySelector('[data-hero-sequence]');
  const loader = hero.querySelector('[data-hero-loader]');
  if (!canvas) return null;
  if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return null;
  const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!context) return null;
  // High-quality smoothing limits visible upscaling when the canvas is larger
  // than the extracted frames on very wide displays.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const scenes = [SEQUENCE_FRAMES, SEQUENCE_FRAMES];
  const FRAME_WIDTH = 1600;
  const FRAME_HEIGHT = 900;
  const KEEP_WINDOW = 16;
  const EDGE_KEEP = 4;
  const MAX_CONCURRENT = 2;
  const totalFrames = scenes.reduce((sum, count) => sum + count, 0);
  const caches = scenes.map(() => new Map());
  const inflight = new Map();
  const queue = [];
  const queued = new Set();
  let desiredScene = 0;
  let desiredFrame = 0;
  let drawnKey = '';

  canvas.width = FRAME_WIDTH;
  canvas.height = FRAME_HEIGHT;

  const path = (scene, frame) => `assets/hero-tech-frames-${scene + 1}/frame-${String(frame + 1).padStart(4, '0')}.webp`;

  const renderClosest = () => {
    let frame = desiredFrame;
    let bitmap = caches[desiredScene].get(frame);
    if (!bitmap) {
      let closestDistance = Infinity;
      caches[desiredScene].forEach((candidate, index) => {
        const distance = Math.abs(index - desiredFrame);
        if (distance < closestDistance) {
          closestDistance = distance;
          bitmap = candidate;
          frame = index;
        }
      });
    }
    if (!bitmap) return;
    const key = `${desiredScene}:${frame}`;
    if (key === drawnKey) return;
    drawnKey = key;
    context.drawImage(bitmap, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    hero.classList.add('is-sequence-ready');
    loader?.setAttribute('aria-hidden', 'true');
  };

  // Bounded memory: decoded bitmaps are freed as soon as they leave a window
  // around the current position. Only the seam of nearby scenes is retained.
  const evict = () => {
    caches.forEach((cache, sceneIndex) => {
      if (sceneIndex === desiredScene) {
        cache.forEach((bitmap, frame) => {
          if (Math.abs(frame - desiredFrame) > KEEP_WINDOW) {
            bitmap.close();
            cache.delete(frame);
          }
        });
      } else if (sceneIndex === desiredScene - 1) {
        cache.forEach((bitmap, frame) => {
          if (frame < scenes[sceneIndex] - EDGE_KEEP) {
            bitmap.close();
            cache.delete(frame);
          }
        });
      } else if (sceneIndex === desiredScene + 1) {
        cache.forEach((bitmap, frame) => {
          if (frame >= EDGE_KEEP) {
            bitmap.close();
            cache.delete(frame);
          }
        });
      } else {
        cache.forEach((bitmap) => bitmap.close());
        cache.clear();
      }
    });
  };

  const pump = () => {
    queue.sort((a, b) => a.priority - b.priority);
    while (inflight.size < MAX_CONCURRENT && queue.length) {
      const item = queue.shift();
      queued.delete(item.key);
      if (caches[item.scene].has(item.frame) || inflight.has(item.key)) continue;
      const promise = fetch(path(item.scene, item.frame))
        .then((response) => {
          if (!response.ok) throw new Error('frame fetch failed');
          return response.blob();
        })
        .then((blob) => createImageBitmap(blob));
      inflight.set(item.key, promise);
      Promise.resolve(promise).then((bitmap) => {
        inflight.delete(item.key);
        const previous = caches[item.scene].get(item.frame);
        if (previous) previous.close();
        caches[item.scene].set(item.frame, bitmap);
        evict();
        renderClosest();
      }).catch(() => {
        inflight.delete(item.key);
      }).finally(() => {
        if (queue.length) pump();
      });
    }
  };

  const request = (scene, frame, priority = 2) => {
    if (scene < 0 || scene >= scenes.length || frame < 0 || frame >= scenes[scene]) return;
    const key = `${scene}:${frame}`;
    if (caches[scene].has(frame) || inflight.has(key) || queued.has(key)) return;
    queued.add(key);
    queue.push({ scene, frame, priority, key });
    // Kick the looper whenever it has headroom so requests submitted after an
    // idle window are still picked up instead of piling up in the queue.
    if (inflight.size < MAX_CONCURRENT) pump();
  };

  // Warm the browser cache for every remaining frame during idle time, so that
  // scrubbing only ever hits the in-memory HTTP cache instead of the network.
  let warmCursor = 0;
  let warmActive = 0;
  let warmRunning = true;
  const scheduleIdle = (fn) => {
    if (!warmRunning) return;
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 3000 });
    else setTimeout(fn, 120);
  };
  const warmNext = () => {
    if (!warmRunning) return;
    while (warmActive < MAX_CONCURRENT && warmCursor < totalFrames) {
      const flat = warmCursor;
      warmCursor += 1;
      const scene = Math.floor(flat / scenes[0]);
      const frame = flat % scenes[0];
      warmActive += 1;
      fetch(path(scene, frame))
        .then((response) => response.blob())
        .catch(() => {})
        .finally(() => {
          warmActive -= 1;
          scheduleIdle(warmNext);
        });
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      warmRunning = false;
    } else if (warmCursor < totalFrames) {
      warmRunning = true;
      scheduleIdle(warmNext);
    }
  }, { passive: true });

  // Warm the first frames immediately so the desktop hero never starts blank.
  request(0, 0, 0);
  request(0, 1, 1);
  pump();
  scheduleIdle(warmNext);

  return (timelineProgress) => {
    const scaled = clamp(timelineProgress) * scenes.length;
    const scene = Math.min(scenes.length - 1, Math.floor(scaled));
    const local = clamp(scaled - scene);
    const frame = Math.round(local * (scenes[scene] - 1));
    desiredScene = scene;
    desiredFrame = frame;
    request(scene, frame, 0);
    for (let step = 1; step <= KEEP_WINDOW; step += 1) {
      request(scene, frame + step, 1);
      request(scene, frame - step, 1);
    }
    if (scene < scenes.length - 1) {
      for (let offset = 0; offset < EDGE_KEEP; offset += 1) request(scene + 1, offset, 2);
    }
    if (scene > 0) {
      for (let offset = scenes[scene - 1] - EDGE_KEEP; offset < scenes[scene - 1]; offset += 1) request(scene - 1, offset, 2);
    }
    evict();
    renderClosest();
  };
}