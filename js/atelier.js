/* Native scroll drives the journey; only the opening sculpture idles. */
const clamp = (n, min=0, max=1) => Math.max(min, Math.min(max,n));
const ease = (n) => { n=clamp(n); return n*n*(3-2*n); };

export function initHero() {
  const hero=document.querySelector('[data-hero]');
  if(!hero) return;
  const stage=hero.querySelector('.atelier__stage');
  const intro=hero.querySelector('[data-atelier-intro]');
  const chapters=[...hero.querySelectorAll('[data-atelier-chapter]')];
  const index=hero.querySelector('[data-atelier-index]');
  const slider=hero.querySelector('[data-atelier-interaction]');
  const arrival=hero.querySelector('[data-arrival-image]');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const coarse=matchMedia('(pointer: coarse)');
  let scene, pending=0, paintFrame=0, top=0, distance=1, progress=0;
  let visible=true, generation=0, arrivalRequested=false;
  let dirty=true, lastPaint=0, lastTick=0, idleTime=0;
  let yaw=0, pitch=0, targetYaw=0, targetPitch=0, drag=null;
  let pointer={x:0,y:0},targetPointer={x:0,y:0};

  function requestPaint() {
    dirty=true;
    if(!paintFrame && scene && visible && !document.hidden && !motion.matches) paintFrame=requestAnimationFrame(paint);
  }
  function paint(now) {
    paintFrame=0;
    if(!scene || !visible || document.hidden || motion.matches) { lastTick=0; return; }
    const dt=lastTick ? Math.min((now-lastTick)/1000,.1) : 1/60;
    lastTick=now;
    const idle=progress<.12;
    const settling=Math.abs(yaw-targetYaw)+Math.abs(pitch-targetPitch)+Math.abs(pointer.x-targetPointer.x)+Math.abs(pointer.y-targetPointer.y)>.001;
    const interval=coarse.matches ? 1000/24 : 1000/30;
    if(dirty || now-lastPaint>=interval) {
      const blend=1-Math.exp(-dt*12);
      yaw+=(targetYaw-yaw)*blend; pitch+=(targetPitch-pitch)*blend;
      pointer.x+=(targetPointer.x-pointer.x)*blend;pointer.y+=(targetPointer.y-pointer.y)*blend;
      if(idle) idleTime+=Math.min((now-lastPaint)/1000,.1);
      scene.render(progress,pointer,{time:idleTime,yaw,pitch});
      lastPaint=now; dirty=false;
    }
    if(idle || settling || drag) paintFrame=requestAnimationFrame(paint);
  }
  function stopPaint() {
    cancelAnimationFrame(paintFrame); paintFrame=0; lastTick=0;
  }
  function loadArrival() {
    if(arrivalRequested || !arrival) return;
    arrivalRequested=true;
    arrival.addEventListener('load',async()=>{
      try { await arrival.decode(); } catch { /* A loaded image remains usable. */ }
      hero.classList.add('has-arrival'); requestUpdate();
    },{once:true});
    const source=arrival.closest('picture').querySelector('source[data-srcset]');
    if(source) source.srcset=source.dataset.srcset;
    arrival.src=arrival.dataset.src;
  }
  function update() {
    pending=0;
    if(document.hidden || !visible) return;
    progress=motion.matches ? 0 : clamp((scrollY-top)/distance);
    if(progress>.12) loadArrival();
    const introOpacity=1-ease(progress/.17);
    const immersion=ease((progress-.12)/.18)*(1-ease((progress-.7)/.18));
    hero.style.setProperty('--intro',introOpacity.toFixed(4));
    hero.style.setProperty('--intro-y',`${-45*ease(progress/.2)}px`);
    hero.style.setProperty('--daylight',ease((progress-.24)/.62).toFixed(4));
    hero.style.setProperty('--arrival',ease((progress-.69)/.18).toFixed(4));
    hero.style.setProperty('--immersion',immersion.toFixed(4));
    hero.style.setProperty('--environment-scale',(1+.07*immersion).toFixed(4));
    hero.style.setProperty('--progress',progress.toFixed(4));
    intro.inert=introOpacity<.1;
    intro.setAttribute('aria-hidden',String(introOpacity<.1));
    const starts=[.16,.62,.85], ends=[.31,.79,1.1];
    chapters.forEach((chapter,i)=>{
      const enter=ease((progress-starts[i])/.065), leave=ease((progress-ends[i])/.05);
      const opacity=enter*(1-leave);
      chapter.style.opacity=opacity;
      chapter.style.transform=`translateY(${(1-enter)*25-leave*18}px)`;
      chapter.style.visibility=opacity>.005?'visible':'hidden';
      chapter.inert=opacity<.5; chapter.setAttribute('aria-hidden',String(opacity<.5));
    });
    index.textContent=String(progress<.16?1:progress<.62?2:progress<.85?3:4).padStart(2,'0');
    const interactive=!!scene && !motion.matches && progress<.1;
    slider.hidden=!interactive;
    if(!interactive && drag) {
      if(slider.hasPointerCapture(drag.id)) slider.releasePointerCapture(drag.id);
      drag=null; slider.classList.remove('is-dragging');
    }
    requestPaint();
  }
  function requestUpdate() {
    if(!pending && visible && !document.hidden) pending=requestAnimationFrame(update);
  }
  function measure() {
    top=hero.getBoundingClientRect().top+scrollY;
    distance=Math.max(1,hero.offsetHeight-stage.offsetHeight);
    scene?.resize(stage.clientWidth,stage.clientHeight); requestUpdate();
  }
  async function loadScene() {
    const token=++generation;
    if(motion.matches) return;
    try {
      const {createAtelier}=await import('./hero-scene.js?v=20261007c');
      if(motion.matches || token!==generation) return;
      scene=createAtelier(hero.querySelector('[data-atelier-canvas]'),requestPaint);
      hero.classList.add('has-scene'); measure();
    } catch(error) {
      hero.classList.remove('has-scene');
      console.warn('Atelier : composition statique conservée.',error);
    }
  }
  function setRotation(x,y=targetPitch) {
    targetYaw=clamp(x,-70,70); targetPitch=clamp(y,-25,25);
    slider.setAttribute('aria-valuenow',String(Math.round(targetYaw)));
    requestPaint();
  }
  slider.addEventListener('pointerdown',event=>{
    if(event.button!==0 || motion.matches || slider.hidden) return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:targetYaw,pitch:targetPitch,touch:event.pointerType==='touch'};
    slider.setPointerCapture(event.pointerId); slider.classList.add('is-dragging');
  });
  slider.addEventListener('pointermove',event=>{
    if(!drag || event.pointerId!==drag.id) return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(drag.touch && Math.abs(dy)>Math.abs(dx)) return;
    setRotation(drag.yaw+dx*.35,drag.touch?drag.pitch:drag.pitch-dy*.18);
  });
  function endDrag(event) {
    if(!drag || event.pointerId!==drag.id) return;
    if(slider.hasPointerCapture(event.pointerId)) slider.releasePointerCapture(event.pointerId);
    drag=null; slider.classList.remove('is-dragging'); requestPaint();
  }
  slider.addEventListener('pointerup',endDrag); slider.addEventListener('pointercancel',endDrag);
  slider.addEventListener('lostpointercapture',()=>{drag=null;slider.classList.remove('is-dragging');});
  slider.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    setRotation(event.key==='Home'?0:event.key==='End'?70:targetYaw+(event.key==='ArrowLeft'?-7:7),event.key==='Home'?0:targetPitch);
  });
  stage.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse' || motion.matches || drag || progress>.12) return;
    const bounds=stage.getBoundingClientRect();
    targetPointer={x:clamp(((event.clientX-bounds.left)/bounds.width-.5)*2,-1,1),y:clamp(((event.clientY-bounds.top)/bounds.height-.5)*2,-1,1)}; requestPaint();
  },{passive:true});
  stage.addEventListener('pointerleave',()=>{targetPointer={x:0,y:0};requestPaint();});
  new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    if(visible) requestUpdate(); else stopPaint();
  }).observe(hero);
  addEventListener('scroll',requestUpdate,{passive:true});
  addEventListener('resize',measure,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPaint();else requestUpdate();});
  motion.addEventListener('change',()=>{
    generation++; stopPaint(); scene?.dispose(); scene=null; drag=null;
    hero.classList.remove('has-scene'); slider.hidden=true;
    measure(); if(!motion.matches) loadScene();
  });
  hero.classList.add('is-interactive'); measure(); loadScene();
}
