import { prefersReducedMotion } from './utils.js';
import { isBudgetMode, onPowerChange } from './power.js';
import { initMobileAtlasScrub } from './mobile-atlas.js?v=20260922e';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const SEQUENCE_FRAMES = 75;
const motionValues = new WeakMap();

function setMotionValue(element, property, value) {
  let values = motionValues.get(element);
  if (!values) {
    values = new Map();
    motionValues.set(element, values);
  }
  if (values.get(property) === value) return;
  values.set(property, value);
  element.style.setProperty(property, value);
}

export function initHero() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;

  const canAnimateJourney = !prefersReducedMotion();
  const canUsePointerDepth = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (canAnimateJourney) {
    if (window.matchMedia('(any-pointer: coarse) and (max-width: 700px) and (orientation: portrait)').matches) {
      initMobileJourney(hero);
    } else {
      initScrollJourney(hero);
    }
  }
  if (canAnimateJourney && canUsePointerDepth) {
    initPointerDepth(hero);
    initArrivalAttraction(hero);
  }
}

function initMobileJourney(hero) {
  const cards = [...hero.querySelectorAll('[data-method-card]')];
  const cta = hero.querySelector('[data-journey-cta]');
  let heroTop = 0;
  let distance = 1;
  let frame = 0;
  let activeCard = -1;
  let introGone = false;
  let storyVisible = false;
  let ctaVisible = false;

  hero.classList.add('is-mobile-journey');
  cta?.setAttribute('aria-hidden', 'true');
  // Native scrolling remains in charge. The canvas only samples its current
  // position; it never slows, snaps or scrolls the page programmatically.
  const sequenceScrub = initMobileAtlasScrub(hero, requestUpdate);

  const measure = () => {
    heroTop = hero.getBoundingClientRect().top + window.scrollY;
    distance = Math.max(hero.offsetHeight - window.innerHeight, 1);
    requestUpdate();
  };

  const update = () => {
    frame = 0;
    const progress = clamp((window.scrollY - heroTop) / distance);
    const sequenceProgress = clamp((progress - .22) / (.98 - .22));
    sequenceScrub?.(sequenceProgress);

    const nextIntroGone = progress > .18;
    if (nextIntroGone !== introGone) {
      introGone = nextIntroGone;
      hero.classList.toggle('is-mobile-copy-gone', introGone);
    }
    const nextStoryVisible = progress > .25;
    if (nextStoryVisible !== storyVisible) {
      storyVisible = nextStoryVisible;
      hero.classList.toggle('is-mobile-story-visible', storyVisible);
    }
    const nextCtaVisible = sequenceProgress >= .9;
    if (nextCtaVisible !== ctaVisible) {
      ctaVisible = nextCtaVisible;
      hero.classList.toggle('is-mobile-cta-visible', ctaVisible);
      cta?.setAttribute('aria-hidden', ctaVisible ? 'false' : 'true');
    }

    // Cards mark chapters without locking the scroll or animating their
    // contents on every frame. Each stays on screen for about a viewport.
    const nextCard = sequenceProgress >= .05 && sequenceProgress < .9
      ? Math.min(cards.length - 1, Math.floor((sequenceProgress - .05) / .225))
      : -1;
    if (nextCard !== activeCard) {
      cards[activeCard]?.classList.remove('is-current');
      cards[activeCard]?.setAttribute('aria-hidden', 'true');
      cards[nextCard]?.classList.add('is-current');
      cards[nextCard]?.setAttribute('aria-hidden', 'false');
      activeCard = nextCard;
    }
  };

  function requestUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  measure();
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
  let scrubProgress = 0;
  let settleTimer = null;
  const timelineStart = .28;
  const timelineEnd = .965;
  // Budget mode bounds every heavy cost instead: decode size, concurrency,
  // cache window and the full warm-ahead of frames. It engages on touch but
  // can also kick in mid-session on low battery or reduced data mode.
  const budget = { active: isBudgetMode() };
  // Scrub decoded local frames instead of seeking an MP4 on every wheel event.
  // This keeps reverse scrolling deterministic and prevents decoder contention.
  const sequenceScrub = initImageSequenceScrub(hero, budget, () => requestUpdate());
  onPowerChange(() => {
    const next = isBudgetMode();
    if (next !== budget.active) {
      budget.active = next;
      sequenceScrub?.setBudget(next);
    }
  });
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
    const timelineProgress = clamp((progress - timelineStart) / (timelineEnd - timelineStart));
    const scrubDelta = timelineProgress - scrubProgress;
    // Follow native scrolling immediately. If an image has not decoded yet,
    // the canvas catches up when it becomes available without holding input.
    const waitingForFrame = sequenceScrub ? !sequenceScrub(timelineProgress) : false;
    scrubProgress = timelineProgress;
    if (Math.abs(scrubDelta) > .012 || waitingForFrame) {
      hero.classList.add('is-scrubbing-fast');
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => hero.classList.remove('is-scrubbing-fast'), 140);
    }

    setMotionValue(hero, '--hero-copy-opacity', Math.max(0, 1 - progress * 5.4).toFixed(3));
    setMotionValue(hero, '--hero-copy-y', `${(progress * -10).toFixed(2)}vh`);
    setMotionValue(hero, '--hero-launch-opacity', Math.max(0, 1 - progress * 5.2).toFixed(3));
    setMotionValue(hero, '--hero-cue-opacity', Math.max(0, 1 - progress * 5).toFixed(3));
    setMotionValue(hero, '--hero-art-left', `${(30 * (1 - expansion)).toFixed(2)}%`);
    setMotionValue(hero, '--hero-art-clip', `${(12 * (1 - expansion)).toFixed(2)}%`);
    setMotionValue(hero, '--hero-overlay-opacity', Math.max(0, 1 - progress * 2.8).toFixed(3));
    setMotionValue(hero, '--hero-grid-opacity', Math.max(0, 1 - progress * 3).toFixed(3));
    setMotionValue(hero, '--hero-arrival-opacity', arrival.toFixed(3));
    setMotionValue(hero, '--hero-arrival-y', `${((1 - arrival) * 4).toFixed(2)}vh`);
    setMotionValue(hero, '--hero-fallback-opacity', fallback.toFixed(3));
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
      setMotionValue(card, '--method-card-opacity', opacity.toFixed(3));
      setMotionValue(card, '--method-card-build', fadeIn.toFixed(3));
      setMotionValue(card, '--method-card-dissolve', (1 - fadeOut).toFixed(3));
      setMotionValue(card, '--method-card-scale', (0.94 + opacity * .06).toFixed(3));
      setMotionValue(card, '--method-card-y', `${((1 - fadeIn) * 2.5 - (1 - fadeOut) * 2.5).toFixed(2)}vh`);
      setMotionValue(card, '--method-card-blur', `${((1 - opacity) * 8).toFixed(2)}px`);
      card.classList.toggle('is-current', opacity > .5);
      const visibility = opacity < .02 ? 'hidden' : 'visible';
      if (card.style.visibility !== visibility) card.style.visibility = visibility;
      const hidden = opacity < .35 ? 'true' : 'false';
      if (card.getAttribute('aria-hidden') !== hidden) card.setAttribute('aria-hidden', hidden);
    });
    if (journeyCta) {
      setMotionValue(journeyCta, '--journey-cta-opacity', ctaProgress.toFixed(3));
      setMotionValue(journeyCta, '--journey-cta-y', `${((1 - ctaProgress) * 1.5).toFixed(2)}vh`);
      const pointerEvents = ctaProgress > .55 ? 'auto' : 'none';
      if (journeyCta.style.pointerEvents !== pointerEvents) journeyCta.style.pointerEvents = pointerEvents;
      const hidden = ctaProgress < .35 ? 'true' : 'false';
      if (journeyCta.getAttribute('aria-hidden') !== hidden) journeyCta.setAttribute('aria-hidden', hidden);
    }
    frame = null;
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

function initImageSequenceScrub(hero, budget = { active: false }, onFrameReady = () => {}) {
  const canvas = hero.querySelector('[data-hero-sequence]');
  const loader = hero.querySelector('[data-hero-loader]');
  if (!canvas || typeof fetch !== 'function') return null;

  const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!context) return null;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const framesPerScene = SEQUENCE_FRAMES;
  const physicalWidth = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
  const physicalHeight = window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
  const useHighResolution = !budget.active && physicalWidth >= 2200 && physicalHeight >= 1100;
  const renderWidth = Math.max(physicalWidth, physicalHeight * 16 / 9);
  const FRAME_WIDTH = useHighResolution ? 2560 : budget.active || renderWidth <= 1280 ? 1280 : 1920;
  const FRAME_HEIGHT = FRAME_WIDTH * 9 / 16;
  const frameVariant = useHighResolution ? '-1440' : '';
  const TOTAL_FRAMES = framesPerScene * 2;
  // These budgets are resolved dynamically so battery/data-saving changes can
  // tighten the sequence without reloading the page.
  const lookAhead = () => budget.active ? 10 : useHighResolution ? 6 : 12;
  const lookBehind = () => budget.active ? 5 : useHighResolution ? 3 : 7;
  // Network requests need a wider survival window than decoded frames. On a
  // local server a frame resolves before the next paint; in production, the
  // previous implementation could abort it after only a few scroll ticks.
  const retention = () => budget.active ? 12 : useHighResolution ? 8 : 16;
  const maxConcurrent = () => budget.active || useHighResolution ? 2 : 3;
  const decodeOptions = () => budget.active || FRAME_WIDTH === 1280
    ? { resizeWidth: 1280, resizeHeight: 720, resizeQuality: 'high' }
    : undefined;
  const cache = new Map();
  const inflight = new Map();
  const queue = [];
  const queued = new Set();
  const failedFrames = new Set();
  const failureCounts = new Map();
  let desiredFrame = 0;
  let previousFrame = 0;
  let direction = 1;
  let drawnFrame = -1;
  let failedLoads = 0;

  canvas.width = FRAME_WIDTH;
  canvas.height = FRAME_HEIGHT;

  const framePath = (flatFrame) => {
    const scene = Math.floor(flatFrame / framesPerScene) + 1;
    const frame = flatFrame % framesPerScene + 1;
    return `assets/hero-tech-frames-${scene}${frameVariant}/frame-${String(frame).padStart(4, '0')}.webp?v=20260920-ai2`;
  };

  const retentionWindow = () => [
    Math.max(0, desiredFrame - retention()),
    Math.min(TOTAL_FRAMES - 1, desiredFrame + retention()),
  ];

  const decodeWithImage = (blob) => new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);
    image.decoding = 'async';
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('frame image decode failed'));
    };
    image.src = objectUrl;
  });

  const decodeFrame = async (blob) => {
    if (typeof createImageBitmap === 'function') {
      const options = decodeOptions();
      if (options) {
        try {
          return await createImageBitmap(blob, options);
        } catch (_) {
          // Safari versions differ on support for resize options. Retry the
          // standards baseline before using an HTML image as the final path.
        }
      }
      try {
        return await createImageBitmap(blob);
      } catch (_) {
        // Some iOS/WebKit builds expose createImageBitmap but reject WebP.
      }
    }
    return decodeWithImage(blob);
  };

  const renderFrame = (frame) => {
    // A permanently missing asset must not freeze the whole scroll journey.
    if (failedFrames.has(frame)) return true;
    const bitmap = cache.get(frame);
    if (!bitmap) return false;
    if (frame === drawnFrame) return true;
    context.drawImage(bitmap, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    drawnFrame = frame;
    failedLoads = 0;
    hero.classList.remove('is-sequence-failed');
    hero.classList.add('is-sequence-ready');
    loader?.setAttribute('aria-hidden', 'true');
    return true;
  };

  const prune = () => {
    const [min, max] = retentionWindow();

    for (let index = queue.length - 1; index >= 0; index -= 1) {
      const item = queue[index];
      if (item.frame < min || item.frame > max) {
        queued.delete(item.frame);
        queue.splice(index, 1);
      }
    }
    inflight.forEach((item) => {
      if (item.frame < min || item.frame > max) item.controller.abort();
    });
    cache.forEach((bitmap, frame) => {
      if (frame < min || frame > max) {
        bitmap.close?.();
        cache.delete(frame);
      }
    });
  };

  const pump = () => {
    queue.sort((a, b) => a.priority - b.priority || Math.abs(a.frame - desiredFrame) - Math.abs(b.frame - desiredFrame));
    while (inflight.size < maxConcurrent() && queue.length) {
      const item = queue.shift();
      queued.delete(item.frame);
      if (cache.has(item.frame) || inflight.has(item.frame)) continue;

      const controller = new AbortController();
      const promise = fetch(framePath(item.frame), { signal: controller.signal, cache: 'force-cache' })
        .then((response) => {
          if (!response.ok) throw new Error('frame fetch failed');
          return response.blob();
        })
        .then(decodeFrame);
      inflight.set(item.frame, { controller, frame: item.frame, promise });

      promise.then((bitmap) => {
        const [min, max] = retentionWindow();
        if (item.frame < min || item.frame > max) {
          bitmap.close?.();
          return;
        }
        cache.get(item.frame)?.close?.();
        cache.set(item.frame, bitmap);
        failureCounts.delete(item.frame);
      }).catch((error) => {
        if (error?.name === 'AbortError') return;
        failedLoads += 1;
        const attempts = (failureCounts.get(item.frame) || 0) + 1;
        failureCounts.set(item.frame, attempts);
        if (attempts >= 3) failedFrames.add(item.frame);
        // Never leave an opaque blank canvas over the real poster. A later
        // successful frame removes this state automatically.
        if (!cache.size && failedLoads >= 4) {
          hero.classList.add('is-sequence-failed');
          loader?.setAttribute('aria-hidden', 'true');
        }
      }).finally(() => {
        inflight.delete(item.frame);
        pump();
        if (item.frame === desiredFrame) onFrameReady();
      });
    }
  };

  const request = (frame, priority) => {
    if (frame < 0 || frame >= TOTAL_FRAMES || cache.has(frame) || inflight.has(frame) || queued.has(frame) || failedFrames.has(frame)) return;
    queued.add(frame);
    queue.push({ frame, priority });
  };

  const requestWindow = () => {
    prune();
    request(desiredFrame, 0);
    const forwardCount = direction > 0 ? lookAhead() : lookBehind();
    const backwardCount = direction > 0 ? lookBehind() : lookAhead();
    for (let step = 1; step <= Math.max(forwardCount, backwardCount); step += 1) {
      if (step <= forwardCount) request(desiredFrame + step, 1);
      if (step <= backwardCount) request(desiredFrame - step, 2);
    }
    pump();
  };

  requestWindow();

  const scrub = (timelineProgress) => {
    const nextFrame = Math.round(clamp(timelineProgress) * (TOTAL_FRAMES - 1));
    if (nextFrame !== previousFrame) direction = nextFrame > previousFrame ? 1 : -1;
    previousFrame = nextFrame;
    desiredFrame = nextFrame;
    requestWindow();
    return renderFrame(nextFrame);
  };

  scrub.setBudget = (next) => {
    budget.active = next;
    prune();
    requestWindow();
  };

  scrub.hasBufferedAhead = (count) => {
    const last = Math.min(TOTAL_FRAMES - 1, desiredFrame + count);
    for (let next = desiredFrame + 1; next <= last; next += 1) {
      if (!cache.has(next) && !failedFrames.has(next)) return false;
    }
    return true;
  };

  return scrub;
}
