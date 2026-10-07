import * as T from '../assets/vendor/three/three.module.min.js';
import { createOptics } from './hero-optics.js?v=20261007n';
import { createFlight, flightCenter } from './hero-flight.js?v=20261007n';

const clamp = (n) => Math.max(0, Math.min(1, n));
const smooth = (n) => { n = clamp(n); return n * n * (3 - 2 * n); };
const mix = (a, b, t) => a + (b - a) * t;

function cameraPose(progress, mobile) {
  const poses = [
    [0, 0,0,mobile ? 26 : 22, 0,0,0, 34,0],
    [.12, .6,.1,20, .5,0,-3, 36,0],
    [.22, .25,.15,13, 0,0,-8, 40,-.02],
    [.32, 0,0,2, 0,0,-12, 50,-.04],
    [.44, 0,0,-20, 0,0,-36, 62,.08],
    [.56, 0,0,-42, 0,0,-58, 66,-.1],
    [.66, 0,0,-61, 0,0,-76, 57,.07],
    [.76, .1,0,-61, 0,0,-78, 42,0],
    [.91, mobile ? 0 : -3.1,mobile ? -2.2 : .3,mobile ? -53 : -58, 0,0,-78, 35,0],
    [1, mobile ? 0 : -3.1,mobile ? -2.2 : .3,mobile ? -53 : -58, 0,0,-78, 35,0],
  ];
  const next = Math.max(1, poses.findIndex(p => p[0] >= progress));
  const a=poses[next-1], b=poses[next], prev=poses[Math.max(0,next-2)], after=poses[Math.min(poses.length-1,next+1)];
  const span=b[0]-a[0],t=clamp((progress-a[0])/span);
  return a.map((v,i)=>{
    if(!i) return progress;
    const m0=next===1?0:(b[i]-prev[i])/(b[0]-prev[0])*span;
    const m1=next>=poses.length-2?0:(after[i]-a[i])/(after[0]-a[0])*span;
    return (2*t**3-3*t*t+1)*v+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*b[i]+(t**3-t*t)*m1;
  });
}

function outline(w, h, r, Path = T.Shape) {
  const p = new Path(), x = -w / 2, y = -h / 2;
  p.moveTo(x + r, y); p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h); p.lineTo(x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r); p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  return p;
}

/* A small studio environment provides reflections without HDR downloads,
   dynamic shadows, postprocessing or a continuously running render loop. */
function studio(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const c = canvas.getContext('2d');
  const ceiling = c.createLinearGradient(0, 0, 0, 256);
  ceiling.addColorStop(0, '#56645e'); ceiling.addColorStop(.25, '#151c19');ceiling.addColorStop(.5, '#050806');ceiling.addColorStop(.72, '#27332d');ceiling.addColorStop(1, '#6b6252');
  c.fillStyle = ceiling; c.fillRect(0, 0, 512, 256);
  const softbox=c.createLinearGradient(25,0,105,0);
  softbox.addColorStop(0,'rgba(255,255,255,0)');softbox.addColorStop(.2,'#ffffff');softbox.addColorStop(.8,'#ffffff');softbox.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=softbox;c.fillRect(25,28,80,160);
  c.fillStyle = '#ffffff'; c.fillRect(282, 12, 65, 35);c.fillRect(220,190,95,16);
  c.fillStyle = '#e8c491'; c.fillRect(440, 60, 18, 140);
  c.fillStyle = '#e8f1eb';c.fillRect(490,15,5,210);
  c.fillStyle = '#080d0a'; c.fillRect(170, 50, 58, 190);
  const texture = new T.CanvasTexture(canvas);
  texture.mapping = T.EquirectangularReflectionMapping;
  texture.colorSpace = T.SRGBColorSpace;
  const generator = new T.PMREMGenerator(renderer);
  const target = generator.fromEquirectangular(texture);
  texture.dispose(); generator.dispose();
  return target;
}

function interfaceArtwork(onReady) {
  const canvas = document.createElement('canvas');
  canvas.width = 1536; canvas.height = 960;
  const ctx = canvas.getContext('2d');
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  let disposed = false;
  function draw(photo) {
    // Fictional restaurant concept; large type and food photography keep
    // its identity readable throughout the assembly of the 3D screen.
    ctx.fillStyle = '#41372c'; ctx.fillRect(0, 0, 1536, 960);
    if (photo) {
      const scale = Math.max(1536 / photo.width, 772 / photo.height);
      ctx.drawImage(photo, (1536-photo.width*scale)/2, (772-photo.height*scale)/2, photo.width*scale, photo.height*scale);
    }
    const shade=ctx.createLinearGradient(0,0,1536,300);
    shade.addColorStop(0,'rgba(22,15,11,.78)'); shade.addColorStop(.5,'rgba(22,15,11,.32)'); shade.addColorStop(1,'rgba(22,15,11,.03)');
    ctx.fillStyle=shade; ctx.fillRect(0,0,1536,772);
    const headerShade=ctx.createLinearGradient(0,0,0,145);
    headerShade.addColorStop(0,'rgba(17,19,16,.48)'); headerShade.addColorStop(1,'rgba(17,19,16,0)');
    ctx.fillStyle=headerShade; ctx.fillRect(0,0,1536,145);
    ctx.fillStyle='#f5f0e5'; ctx.font='44px Georgia'; ctx.fillText('SILLAGE',64,76);
    ctx.font='15px Arial'; ctx.fillText('RESTAURANT · CUISINE DE SAISON',310,70);
    ctx.fillText('LA MAISON',975,70); ctx.fillText('LA CARTE',1130,70);
    ctx.strokeStyle='rgba(245,240,229,.55)'; ctx.lineWidth=1;
    ctx.fillStyle='#e4c6a0'; ctx.fillRect(1285,35,187,55);
    ctx.fillStyle='#302217'; ctx.fillText('RÉSERVER  ↗',1320,69);
    ctx.fillStyle='#f5f0e5';
    ctx.beginPath(); ctx.moveTo(64,112); ctx.lineTo(1472,112); ctx.stroke();
    ctx.font='16px Arial'; ctx.fillText('LE PRODUIT. LE GESTE. L’ÉMOTION.',76,260);
    ctx.font='112px Georgia'; ctx.fillText('Le goût',70,371);
    ctx.font='italic 108px Georgia'; ctx.fillText('de l’instant.',70,477);
    ctx.font='20px Arial'; ctx.fillText('Une cuisine vivante. Un moment à savourer.',76,535);
    ctx.fillStyle='#e4c6a0'; ctx.fillRect(76,580,262,58);
    ctx.fillStyle='#302217'; ctx.font='15px Arial'; ctx.fillText('RÉSERVER UNE TABLE  ↗',98,616);
    ctx.fillStyle='#f5f0e5'; ctx.font='15px Arial'; ctx.fillText('DÉCOUVRIR LA CARTE',378,616);
    ctx.strokeStyle='rgba(245,240,229,.65)'; ctx.beginPath();ctx.moveTo(378,628);ctx.lineTo(558,628);ctx.stroke();
    ctx.fillStyle='#f0ede4'; ctx.fillRect(0,772,1536,188);
    ctx.fillStyle='#463429'; ctx.font='13px Arial'; ctx.fillText('À LA TABLE DE SILLAGE',70,819);
    ctx.font='50px Georgia'; ctx.fillText('La saison donne le ton.',65,901);
    ctx.fillStyle='#67695f'; ctx.font='18px Arial';
    ctx.fillText('Des produits choisis. Des saveurs franches.',728,837);
    ctx.fillText('Le plaisir de prendre son temps.',728,868);
    ctx.fillStyle='#463429'; ctx.font='14px Arial'; ctx.fillText('ENTRER DANS LA MAISON  ↗',729,918);
    ctx.strokeStyle='#a7a99b'; ctx.beginPath(); ctx.moveTo(680,811); ctx.lineTo(680,923); ctx.stroke();
    ctx.fillStyle='#463429'; ctx.fillRect(1292,805,180,122);
    ctx.fillStyle='#f0ede4'; ctx.font='italic 39px Georgia'; ctx.fillText('S.',1360,873);
    ctx.font='10px Arial'; ctx.fillText('RESTAURANT SILLAGE',1330,906);
    texture.needsUpdate = true;
  }
  draw();
  const photo = new Image();
  photo.onload = () => { if (!disposed) { draw(photo); onReady(); } };
  photo.src = 'assets/restaurant-sillage.webp';
  return { texture, dispose() { disposed = true; photo.onload = null; texture.dispose(); } };
}

export function createAtelier(container, onReady) {
  let width = container.clientWidth, height = container.clientHeight;
  let mobile = width < 601, disposed = false, lost = false;
  const renderer = new T.WebGLRenderer({ alpha:true, antialias:true, powerPreference:'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5));
  renderer.setSize(width, height);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.append(renderer.domElement);
  const scene = new T.Scene();
  const environment = studio(renderer);
  scene.environment = environment.texture;
  const camera = new T.PerspectiveCamera(34, width / height, .1, 80);
  camera.position.set(0, 0, 22);
  const sculpture = new T.Group(); scene.add(sculpture);
  const gateway = new T.Group(); scene.add(gateway);
  scene.fog = new T.Fog(0x141413, 25, 70);
  const ambient=new T.HemisphereLight(0xf5e9d3, 0x252723, 1.1);scene.add(ambient);
  const key = new T.DirectionalLight(0xffffff, 2.6); key.position.set(-4, 7, 8); scene.add(key);
  const rim = new T.DirectionalLight(0xffe6c7, 2); rim.position.set(7, 2, -4); scene.add(rim);
  scene.add(key.target,rim.target);
  const metal = new T.MeshStandardMaterial({ color:0xdce0dd, metalness:.86, roughness:.31 });
  const darkMetal = new T.MeshStandardMaterial({ color:0x3c403c, metalness:.85, roughness:.3 });
  const gold = new T.MeshStandardMaterial({ color:0xc7a77a, metalness:.88, roughness:.23 });
  const geometries = new Set(), materials = new Set([metal, darkMetal, gold]),textures=new Set();
  const optics=createOptics({metal,darkMetal,gold,geometries,materials,textures});gateway.add(optics.body);
  const flight=createFlight({metal,darkMetal,gold,geometries,materials,textures});gateway.add(flight.body);
  const travelLight=new T.PointLight(0xffdfb6,0,22,2);scene.add(travelLight);
  const coolLight=new T.PointLight(0xdfefea,0,16,2);scene.add(coolLight);
  const extrusion = { depth:.18, bevelEnabled:true, bevelSegments:3, steps:1, bevelSize:.045, bevelThickness:.045, curveSegments:8 };
  metal.side = T.DoubleSide; gold.side = T.DoubleSide;
  const frameShape = outline(8.75,5.6,.65);
  frameShape.holes.push(outline(8.45,5.3,.5,T.Path));
  const frameGeo = new T.ExtrudeGeometry(frameShape,extrusion); geometries.add(frameGeo);
  const finalFrame = new T.Mesh(frameGeo,metal); sculpture.add(finalFrame);
  const artwork = interfaceArtwork(onReady);
  const finishedGeometry = new T.PlaneGeometry(8.4, 5.25);
  geometries.add(finishedGeometry);
  const finishedMaterial = new T.MeshBasicMaterial({ map:artwork.texture, toneMapped:false });
  materials.add(finishedMaterial);
  const finished = new T.Mesh(finishedGeometry, finishedMaterial);
  finished.position.z = .135;
  finished.visible = false;
  sculpture.add(finished);
  const tiles = [];
  const tileW = 8.4 / 3, tileH = 5.25 / 2;
  for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
    const group = new T.Group();
    const geo = new T.ExtrudeGeometry(outline(tileW - .012, tileH - .012, .035), { ...extrusion, depth:.1, bevelSize:.012, bevelThickness:.012 });
    geometries.add(geo);
    group.add(new T.Mesh(geo, darkMetal));
    const plane = new T.PlaneGeometry(tileW - .012, tileH - .012);
    geometries.add(plane);
    const uv = plane.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (col + uv.getX(i)) / 3, (1 - row + uv.getY(i)) / 2);
    const material = new T.MeshBasicMaterial({ map:artwork.texture, toneMapped:false }); materials.add(material);
    const face = new T.Mesh(plane, material); face.position.z = .12; group.add(face);
    group.userData = { x:(col - 1) * tileW, y:(.5 - row) * tileH, row, col };
    sculpture.add(group); tiles.push(group);
  }
  // Fine edge rails and inset fasteners make the final object feel fabricated.
  const railGeometry = new T.BoxGeometry(8.65, .035, .06); geometries.add(railGeometry);
  const rails = [-1, 1].map((sign) => {
    const rail = new T.Mesh(railGeometry, gold); rail.position.set(0, sign * 2.78, .1);
    sculpture.add(rail); return rail;
  });
  const screwGeometry = new T.CylinderGeometry(.035, .035, .025, 8); geometries.add(screwGeometry);
  const screws = [];
  for (const x of [-4.28, 4.28]) for (const y of [-2.76, 2.76]) {
    const screw = new T.Mesh(screwGeometry, metal); screw.rotation.x = Math.PI / 2;
    screw.position.set(x, y, .17); sculpture.add(screw); screws.push(screw);
  }
  function render(progress, pointer = { x: 0, y: 0 }, interaction={time:0,yaw:0,pitch:0}) {
    if (disposed || lost) return;
    const p = clamp(progress);
    const openingWeight=1-smooth(p/.16);
    const drift=interaction.time;

    const open = smooth((p - 0.09) / 0.21);
    const assemble = smooth((p - 0.63) / 0.25);
    const settle = smooth((p - 0.82) / 0.15);
    const compactHeight = smooth((height - 650) / 180);
    const travelling=smooth((p-.2)/.15)*(1-smooth((p-.68)/.15));

    const pose = cameraPose(p, mobile);
    const center=flightCenter(pose[3]),ahead=flightCenter(pose[6]);
    camera.position.set(pose[1]+center.x*travelling + pointer.x * 0.06*openingWeight, pose[2]+center.y*travelling + pointer.y * 0.04*openingWeight, pose[3]);
    camera.lookAt(pose[4]+ahead.x*travelling, pose[5]+ahead.y*travelling, pose[6]);
    camera.rotateZ(pose[8]);
    camera.fov = pose[7];
    camera.updateProjectionMatrix();

    gateway.position.set(mix(mobile ? 0 : 4.5, 0, open)+pointer.x*.16*openingWeight, mix(mobile ? 0 : 0.3, 0, open)+(Math.sin(drift*.8)*.18-pointer.y*.09)*openingWeight, 0);
    gateway.rotation.set(mix(0.22,0,open)+(interaction.pitch*Math.PI/180+pointer.y*.16)*openingWeight, mix(-0.62,0,open)+(interaction.yaw*Math.PI/180+pointer.x*.2)*openingWeight, mix(-.16,0,open)+Math.sin(drift*.38)*.035*openingWeight);
    gateway.scale.setScalar(mix(mobile ? .78 : 1, 1, open));
    gateway.visible = true;
    optics.update(open,drift,openingWeight,p);
    flight.update(p,mobile);
    travelLight.intensity=travelling*26;
    travelLight.position.set(camera.position.x+2.3,camera.position.y+1.5,camera.position.z+1);
    coolLight.intensity=travelling*18;
    coolLight.position.set(camera.position.x-2.5,camera.position.y-1,camera.position.z-6);
    ambient.intensity=mix(1.1,.65,travelling);
    renderer.toneMappingExposure=1.05+travelling*.12;
    scene.fog.near=mix(25,10,travelling);scene.fog.far=mix(70,52,travelling);
    sculpture.visible = p > 0.52;
    sculpture.position.set(mobile ? 0 : mix(0, 2.7, settle), mobile ? mix(0, mix(3.5, 1, compactHeight), settle) : 0, -78);
    sculpture.rotation.set(mix(0.12, 0, settle), mix(0.25, 0, settle), 0);
    sculpture.scale.setScalar(mobile ? mix(0.61, 0.72, compactHeight) : 1);
    tiles.forEach((tile, i) => {
      const { x, y, row, col } = tile.userData;
      const build = smooth((p - 0.65 - i * 0.011) / 0.18);
      tile.visible = p > 0.63;
      tile.position.set(x+(col-1)*2.2*(1-build), y+(row?-.9:.9)*(1-build), (2+i*.35)*(1-build));
      tile.rotation.set((row ? -0.4 : 0.4) * (1 - build), (col - 1) * 0.45 * (1 - build), (i % 2 ? -0.12 : 0.12) * (1 - build));
      tile.scale.setScalar(mix(0.85, 1, build) * smooth((p - 0.63) / 0.08));
    });
    finished.visible = p >= 0.93;
    finalFrame.scale.setScalar(mix(1.4, 1, assemble));
    finalFrame.visible = p > 0.65;
    key.position.set(mix(-4, 6, open), 7, mix(8, -64, assemble));
    key.target.position.z=-78*assemble;
    rim.position.set(7, 2, mix(-4, -82, assemble));
    rim.target.position.z=-78*assemble;
    rails.forEach((rail) => {
      rail.visible = assemble > 0.7;
      rail.scale.x = smooth((assemble - 0.7) / 0.3);
    });
    screws.forEach((screw) => {
      screw.visible = assemble > 0.95;
    });
    renderer.render(scene, camera);
  }
  const onLost = (event) => { event.preventDefault(); lost = true; container.closest('[data-hero]').classList.remove('has-scene'); };
  const onRestored = () => { lost = false; container.closest('[data-hero]').classList.add('has-scene'); onReady(); };
  renderer.domElement.addEventListener('webglcontextlost', onLost);
  renderer.domElement.addEventListener('webglcontextrestored', onRestored);
  render(0);
  return {
    render,
    resize(w, h) {
      width = w;
      height = h;
      mobile = width < 601;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5));
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.position.z = mobile ? 25 : 22;
      camera.updateProjectionMatrix();
    },
    dispose() {
      disposed = true;
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      optics.dispose();flight.dispose();
      textures.forEach(texture=>texture.dispose());
      artwork.dispose();
      environment.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  };
}
