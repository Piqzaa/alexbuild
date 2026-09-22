const FRAMES_PER_SCENE = 75;
const FRAMES_PER_ATLAS = 8;
const ATLASES_PER_SCENE = Math.ceil(FRAMES_PER_SCENE / FRAMES_PER_ATLAS);
const TOTAL_FRAMES = FRAMES_PER_SCENE * 2;
const TOTAL_ATLASES = ATLASES_PER_SCENE * 2;
const WIDTH = 405;
const HEIGHT = 720;

// Keep the native scroll independent of network and image decoding. Each WebP
// contains eight consecutive frames, so a gesture only needs a canvas draw.
export function initMobileAtlasScrub(hero, onFrameReady) {
  const canvas = hero.querySelector('[data-hero-sequence]');
  const loader = hero.querySelector('[data-hero-loader]');
  const context = canvas?.getContext('2d', { alpha: false, desynchronized: true });
  if (!context) return null;

  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  context.imageSmoothingEnabled = true;

  const blobs = new Map();
  const fetching = new Map();
  const decoded = new Map();
  const decoding = new Map();
  const failedAt = new Map();
  let desiredFrame = 0;
  let drawnFrame = -1;
  let warming = false;
  let prefetchedAtlas = -1;

  const atlasIndex = (frame) => Math.floor(frame / FRAMES_PER_SCENE) * ATLASES_PER_SCENE
    + Math.floor((frame % FRAMES_PER_SCENE) / FRAMES_PER_ATLAS);
  const atlasPath = (index) => {
    const scene = Math.floor(index / ATLASES_PER_SCENE) + 1;
    const number = index % ATLASES_PER_SCENE + 1;
    return `assets/hero-mobile-atlas-${scene}/atlas-${String(number).padStart(2, '0')}.webp?v=20260922d`;
  };

  const fetchAtlas = (index) => {
    if (blobs.has(index)) return Promise.resolve(blobs.get(index));
    if (fetching.has(index)) return fetching.get(index);
    const request = fetch(atlasPath(index), { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Atlas ${index} failed to load`);
        return response.blob();
      })
      .then((blob) => {
        blobs.set(index, blob);
        return blob;
      })
      .finally(() => fetching.delete(index));
    fetching.set(index, request);
    return request;
  };

  const decodeWithImage = (blob) => new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.decoding = 'async';
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Atlas image decode failed'));
    };
    image.src = url;
  });

  const decodeAtlas = async (index) => {
    const blob = await fetchAtlas(index);
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(blob);
      } catch (_) {
        // Older WebKit builds may expose createImageBitmap without WebP support.
      }
    }
    return decodeWithImage(blob);
  };

  const trimDecoded = () => {
    const target = atlasIndex(desiredFrame);
    decoded.forEach((image, index) => {
      if (Math.abs(index - target) > 1) {
        image.close?.();
        decoded.delete(index);
      }
    });
  };

  const render = () => {
    const index = atlasIndex(desiredFrame);
    const image = decoded.get(index);
    if (!image || desiredFrame === drawnFrame) return !!image;
    const slot = (desiredFrame % FRAMES_PER_SCENE) % FRAMES_PER_ATLAS;
    context.drawImage(image, 0, slot * HEIGHT, WIDTH, HEIGHT, 0, 0, WIDTH, HEIGHT);
    if (drawnFrame < 0) {
      hero.classList.add('is-sequence-ready');
      hero.classList.remove('is-sequence-failed');
      loader?.setAttribute('aria-hidden', 'true');
    }
    drawnFrame = desiredFrame;
    return true;
  };

  const scheduleWarm = (callback) => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(callback, { timeout: 1000 });
    else setTimeout(callback, 40);
  };

  const warmBlobs = () => {
    if (warming) return;
    warming = true;
    let next = 0;
    const worker = async () => {
      while (next < TOTAL_ATLASES) {
        const index = next++;
        if (index !== 0) {
          try { await fetchAtlas(index); } catch (_) { /* The visible request can retry. */ }
        }
        await new Promise((resolve) => scheduleWarm(resolve));
      }
    };
    worker();
    worker();
  };

  const requestDecode = (index) => {
    if (index < 0 || index >= TOTAL_ATLASES || decoded.has(index) || decoding.has(index)
      || performance.now() - (failedAt.get(index) || -Infinity) < 5000) return;
    const request = decodeAtlas(index)
      .then((image) => {
        if (Math.abs(index - atlasIndex(desiredFrame)) > 1) {
          image.close?.();
          return;
        }
        decoded.set(index, image);
        failedAt.delete(index);
        trimDecoded();
        if (index === atlasIndex(desiredFrame)) {
          render();
          onFrameReady();
          warmBlobs();
        }
      })
      .catch(() => {
        failedAt.set(index, performance.now());
        if (index === atlasIndex(desiredFrame) && drawnFrame < 0) {
          hero.classList.add('is-sequence-failed');
          loader?.setAttribute('aria-hidden', 'true');
        }
      })
      .finally(() => decoding.delete(index));
    decoding.set(index, request);
  };

  const scrub = (progress) => {
    desiredFrame = Math.round(Math.min(1, Math.max(0, progress)) * (TOTAL_FRAMES - 1));
    const index = atlasIndex(desiredFrame);
    trimDecoded();
    requestDecode(index);
    // Only the current atlas is urgent. Adjacent atlases decode ahead of the
    // next scene boundary, with at most three decoded images kept in memory.
    if (index !== prefetchedAtlas) {
      prefetchedAtlas = index;
      scheduleWarm(() => {
        if (atlasIndex(desiredFrame) !== index) return;
        requestDecode(index + 1);
        if (index > 0) requestDecode(index - 1);
      });
    }
    return render();
  };

  scrub.setBudget = () => {};
  scrub.hasBufferedAhead = (count) => decoded.has(atlasIndex(Math.min(TOTAL_FRAMES - 1, desiredFrame + count)));
  scrub(0);
  return scrub;
}
