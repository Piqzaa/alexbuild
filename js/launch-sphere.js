/** Both printed faces belong to the medal, in one transparent 3D scene. */
export function initLaunchSphere() {
  const shell = document.querySelector('.launch__sphere-shell');
  if (!shell) return;
  const loader = new IntersectionObserver(async ([entry]) => {
    if (!entry.isIntersecting) return;
    loader.disconnect();
    try { createMedal(await import('https://unpkg.com/three@0.160.0/build/three.module.js'), shell); }
    catch { shell.classList.remove('is-webgl'); }
  }, { rootMargin: '200px' });
  loader.observe(shell);
}

function createMedal(T, shell) {
  const canvas = document.createElement('canvas');
  canvas.className = 'launch__webgl'; canvas.setAttribute('aria-hidden', 'true');
  const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(), medal = new T.Group();
  const camera = new T.PerspectiveCamera(32, 1, .1, 30);
  camera.position.z = 7; scene.add(medal);
  const metal = new T.MeshStandardMaterial({ color: 0xd6b886, metalness: .55, roughness: .28 });
  const rimMaterial = new T.MeshStandardMaterial({ color: 0xf1dcb0, metalness: .65, roughness: .19 });
  const body = new T.Mesh(new T.CylinderGeometry(1.38, 1.38, .22, 96), metal);
  body.rotation.x = Math.PI / 2; medal.add(body);
  const rimGeometry = new T.TorusGeometry(1.34, .055, 12, 96);
  for (const side of [1, -1]) {
    const rim = new T.Mesh(rimGeometry, rimMaterial);
    rim.position.z = side * .11; medal.add(rim);
  }
  // Printed circular surfaces: no rectangular planes or separate DOM animation.
  const artwork = document.createElement('canvas');
  artwork.width = artwork.height = 1024;
  const ctx = artwork.getContext('2d');
  ctx.fillStyle = '#dac39a'; ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = '#a48b62'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(512, 512, 476, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 48px Arial'; ctx.fillStyle = '#55452e'; ctx.fillText('JUSQU’À', 512, 315);
  ctx.font = '600 238px Arial'; ctx.fillStyle = '#fff0d0'; ctx.fillText('−50 %', 512, 529, 855);
  ctx.fillStyle = '#352b20'; ctx.fillText('−50 %', 512, 525, 855);
  ctx.font = '500 35px Arial'; ctx.fillStyle = '#55452e'; ctx.fillText('ALEXBUILD · LANCEMENT', 512, 720);
  const texture = new T.CanvasTexture(artwork); texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const faceMaterial = new T.MeshStandardMaterial({ map: texture, metalness: .3, roughness: .38 });
  const faceGeometry = new T.CircleGeometry(1.285, 96);
  for (const side of [1, -1]) {
    const face = new T.Mesh(faceGeometry, faceMaterial);
    face.position.z = side * .113; face.rotation.y = side === 1 ? 0 : Math.PI; medal.add(face);
  }
  scene.add(new T.HemisphereLight(0xfff5e5, 0x514337, 2));
  const key = new T.DirectionalLight(0xfff4df, 3); key.position.set(-3, 4, 5); scene.add(key);
  const fill = new T.DirectionalLight(0xd7e2ed, 2); fill.position.set(3, 1, -4); scene.add(fill);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false, frame = 0, previous = 0, angle = .2, disposed = false;
  const draw = () => { medal.rotation.set(.08, angle, -.06); renderer.render(scene, camera); };
  const tick = now => {
    angle += Math.min((now - previous) / 1000, .05) * Math.PI / 7;
    previous = now; draw(); frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    cancelAnimationFrame(frame); frame = 0;
    if (disposed) return;
    if (motion.matches) { angle = .2; draw(); }
    else if (visible && !document.hidden) { previous = performance.now(); frame = requestAnimationFrame(tick); }
  };
  const resize = () => {
    const { width, height } = shell.getBoundingClientRect();
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); draw();
  };
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  const sizes = new ResizeObserver(resize);
  const dispose = () => {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame); visibility.disconnect(); sizes.disconnect();
    document.removeEventListener('visibilitychange', sync); motion.removeEventListener('change', sync);
    const geometries = new Set(), materials = new Set();
    scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); texture.dispose(); renderer.dispose();
    canvas.remove(); shell.classList.remove('is-webgl');
  };
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); dispose(); }, { once: true });
  window.addEventListener('pagehide', e => { if (!e.persisted) dispose(); }, { once: true });
  shell.prepend(canvas); resize(); shell.classList.add('is-webgl');
  sizes.observe(shell); visibility.observe(shell);
  document.addEventListener('visibilitychange', sync); motion.addEventListener('change', sync);
}
