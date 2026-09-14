import { prefersReducedMotion } from './utils.js';

export function initExperience() {
  initComparison();
  initProjectDepth();
  initProjectPreviews();
  initOfferAccordion();
}

function initComparison() {
  const comparison = document.querySelector('[data-compare]');
  const range = comparison?.querySelector('[data-compare-range]');
  if (!comparison || !range) return;

  const setSplit = (value) => {
    const split = Math.min(100, Math.max(0, value));
    range.value = String(Math.round(split));
    comparison.style.setProperty('--split', `${split}%`);
  };

  const updateFromClientX = (clientX) => {
    const rect = comparison.getBoundingClientRect();
    setSplit(((clientX - rect.left) / rect.width) * 100);
  };

  range.addEventListener('input', () => setSplit(Number(range.value)));
  comparison.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary) return;
    comparison.classList.add('is-dragging');
    comparison.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  });
  comparison.addEventListener('pointermove', (event) => {
    if (!comparison.classList.contains('is-dragging') || !event.isPrimary) return;
    updateFromClientX(event.clientX);
  });
  const stopDrag = (event) => {
    comparison.classList.remove('is-dragging');
    if (comparison.hasPointerCapture(event.pointerId)) comparison.releasePointerCapture(event.pointerId);
  };
  comparison.addEventListener('pointerup', stopDrag);
  comparison.addEventListener('pointercancel', stopDrag);
}

function initProjectDepth() {
  if (prefersReducedMotion() || matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll('[data-project]').forEach((project) => {
    const plane = project.querySelector('[data-project-plane]');
    if (!plane) return;
    project.addEventListener('pointermove', (event) => {
      const rect = project.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      plane.style.setProperty('--tilt-x', `${x * 4}deg`);
      plane.style.setProperty('--tilt-y', `${y * -3}deg`);
    }, { passive: true });
    project.addEventListener('pointerleave', () => {
      plane.style.setProperty('--tilt-x', '0deg');
      plane.style.setProperty('--tilt-y', '0deg');
    });
  });
}

function initProjectPreviews() {
  const canPreview = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const saveData = navigator.connection?.saveData === true;
  if (!canPreview || saveData || prefersReducedMotion()) return;

  document.querySelectorAll('[data-project-media]').forEach((media) => {
    const video = media.querySelector('video');
    const source = video?.querySelector('source[data-src]');
    if (!video || !source) return;

    let active = false;
    let loaded = false;

    const startPreview = async () => {
      active = true;
      if (!loaded) {
        source.src = source.dataset.src;
        source.removeAttribute('data-src');
        video.load();
        loaded = true;
      }

      try {
        await video.play();
        if (active) media.classList.add('is-playing');
      } catch {
        media.classList.remove('is-playing');
      }
    };

    const stopPreview = () => {
      active = false;
      media.classList.remove('is-playing');
      video.pause();
      if (video.readyState > 0) video.currentTime = 0;
    };

    media.addEventListener('pointerenter', startPreview);
    media.addEventListener('pointerleave', stopPreview);
    video.addEventListener('error', stopPreview);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopPreview();
    });
  });
}

function initOfferAccordion() {
  const offers = [...document.querySelectorAll('.offer')];
  offers.forEach((offer) => offer.addEventListener('toggle', () => {
    if (!offer.open) return;
    offers.forEach((other) => {
      if (other !== offer) other.open = false;
    });
  }));
}
