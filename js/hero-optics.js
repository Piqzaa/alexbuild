import * as T from '../assets/vendor/three/three.module.min.js';

// A fabricated optical assembly: bevels, recessed inserts and shared instanced details.
export function createOptics({metal,darkMetal,gold,geometries,materials,textures}) {
  const body=new T.Group(), rotors=[], satellites=[], instances=[];
  const own=g=>{geometries.add(g);return g;};
  const material=settings=>{const m=new T.MeshStandardMaterial(settings);materials.add(m);return m;};
  const titanium=material({color:0x8e999e,metalness:.93,roughness:.27});
  const carbon=material({color:0x151c20,metalness:.65,roughness:.34});
  const ceramic=material({color:0xe2e7e5,metalness:.4,roughness:.25});
  const light=new T.MeshBasicMaterial({color:0xcfe3df});materials.add(light);
  const bevel={depth:.2,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:3,curveSegments:32,steps:1};
  function annulus(outer,inner,depth,mat,z,parent=body) {
    const shape=new T.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);
    const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);
    const mesh=new T.Mesh(own(new T.ExtrudeGeometry(shape,{...bevel,depth})),mat);
    mesh.position.z=z;parent.add(mesh);return mesh;
  }
  function rail(radius,tube,mat,z,parent=body,arc=Math.PI*2) {
    const mesh=new T.Mesh(own(new T.TorusGeometry(radius,tube,8,96,arc)),mat);
    mesh.position.z=z;parent.add(mesh);return mesh;
  }
  function radial(geometry,mat,count,radius,z,offset=0,parent=body) {
    const mesh=new T.InstancedMesh(own(geometry),mat,count), dummy=new T.Object3D();
    instances.push(mesh);
    for(let i=0;i<count;i++) {
      const a=offset+i/count*Math.PI*2;
      dummy.position.set(Math.cos(a)*radius,Math.sin(a)*radius,z);
      dummy.rotation.set(0,0,a-Math.PI/2);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    parent.add(mesh);return mesh;
  }

  annulus(3.55,2.82,.55,carbon,-.48);
  annulus(3.59,3.34,.15,titanium,.1);
  annulus(3.32,3.19,.06,darkMetal,.13);
  rail(3.57,.024,metal,.21);rail(3.31,.018,gold,.23);rail(2.84,.027,metal,-.04);
  rail(2.76,.012,light,-.18);
  radial(new T.BoxGeometry(.035,.2,.48),titanium,144,3.5,-.27);
  radial(new T.BoxGeometry(.035,.075,.012),carbon,120,3.44,.295);
  // Inset hex fasteners, their dark slots and perforated ventilation collar.
  const screws=radial(new T.CylinderGeometry(.055,.055,.035,6),metal,18,3.43,.29);
  const matrix=new T.Matrix4(),q=new T.Quaternion(),position=new T.Vector3(),scale=new T.Vector3();
  for(let i=0;i<screws.count;i++) {
    screws.getMatrixAt(i,matrix);matrix.decompose(position,q,scale);
    q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));
    matrix.compose(position,q,scale);screws.setMatrixAt(i,matrix);
  }
  radial(new T.BoxGeometry(.045,.01,.006),carbon,18,3.43,.315);
  radial(new T.CircleGeometry(.018,6),carbon,180,3.02,.23);
  radial(new T.CircleGeometry(.018,6),carbon,180,3.09,.23,.017);
  annulus(3.15,2.94,.035,titanium,.145);

  const engravings=document.createElement('canvas');engravings.width=1024;engravings.height=1024;
  const c=engravings.getContext('2d');c.scale(.5,.5);c.translate(1024,1024);
  for(let i=0;i<180;i++) {
    c.save();c.rotate(i/180*Math.PI*2);c.strokeStyle=i%15===0?'#edf0ec':'#8a9da5';c.lineWidth=i%15===0?3:1;
    c.beginPath();c.moveTo(0,-925);c.lineTo(0,i%15===0?-897:-914);c.stroke();c.restore();
  }
  for(let i=0;i<12;i++) {
    c.save();c.rotate(i/12*Math.PI*2);c.font='18px monospace';c.textAlign='center';c.fillStyle='#dbe4e4';
    c.fillText(String(i*30).padStart(3,'0'),0,-869);c.restore();
  }
  c.font='19px monospace';c.textAlign='center';c.fillStyle='#c1cfd0';
  c.fillText('A / B   —   OPTICAL ASSEMBLY',0,957);
  const texture=new T.CanvasTexture(engravings);texture.colorSpace=T.SRGBColorSpace;textures.add(texture);
  const etched=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});materials.add(etched);
  const engraving=new T.Mesh(own(new T.PlaneGeometry(7.6,7.6)),etched);engraving.position.z=.325;body.add(engraving);

  // Two independently moving iris rotors; no texture-painted fake blades.
  const polar=(r,a)=>[Math.cos(a)*r,Math.sin(a)*r];
  const blade=new T.Shape();blade.moveTo(...polar(2.86,0));
  blade.absarc(0,0,2.86,0,.34,false);
  blade.quadraticCurveTo(...polar(2.04,.65),...polar(1.67,.63));
  blade.quadraticCurveTo(...polar(1.86,.35),...polar(2.86,0));
  const bladeGeo=own(new T.ExtrudeGeometry(blade,{...bevel,depth:.07,bevelSize:.022,bevelThickness:.022,curveSegments:20}));
  const vertices=bladeGeo.attributes.position;
  for(let i=0;i<vertices.count;i++) {
    const angle=Math.atan2(vertices.getY(i),vertices.getX(i));
    vertices.setZ(i,vertices.getZ(i)+.26*Math.sin(angle*5));
  }
  bladeGeo.computeVertexNormals();
  for(let layer=0;layer<2;layer++) {
    const rotor=new T.Group();rotor.position.z=-.12-layer*.48;body.add(rotor);rotors.push(rotor);
    const mesh=new T.InstancedMesh(bladeGeo,layer?darkMetal:metal,12),dummy=new T.Object3D();
    instances.push(mesh);
    for(let i=0;i<12;i++) {dummy.position.z=i*.012;dummy.rotation.z=i*Math.PI/6;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
    rotor.add(mesh);rail(1.63,.018,layer?gold:ceramic,.12,rotor);
  }

  // Three detached protective arcs create an asymmetric, dimensional silhouette.
  for(let i=0;i<3;i++) {
    const arm=new T.Group();arm.rotation.z=i*Math.PI*2/3+.13;body.add(arm);satellites.push(arm);
    const shell=new T.Shape();shell.absarc(0,0,3.98,0,1.76,false);
    shell.absarc(0,0,3.74,1.76,0,true);shell.closePath();
    const mesh=new T.Mesh(own(new T.ExtrudeGeometry(shell,{...bevel,depth:.28})),i===1?titanium:carbon);arm.add(mesh);
    const edge=rail(3.98,.02,metal,.31,arm,1.76);
    edge.rotation.z=0;
    arm.position.z=[-.7,.45,-.15][i];arm.rotation.x=[.12,-.12,.08][i];
    for(const angle of [.2,1.5]) {
      const joint=new T.Mesh(own(new T.BoxGeometry(.3,.075,.38)),titanium);
      joint.position.set(Math.cos(angle)*3.72,Math.sin(angle)*3.72,.1);joint.rotation.z=angle;arm.add(joint);
    }
  }

  // Suspended hexagonal focal element, with real depth and stepped surfaces.
  const focal=new T.Group();focal.position.z=.16;body.add(focal);
  const hex=new T.Shape();
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2+Math.PI/6;const p=polar(.9,a);i?hex.lineTo(...p):hex.moveTo(...p);}hex.closePath();
  const hexGeo=own(new T.ExtrudeGeometry(hex,{...bevel,depth:.25,bevelSize:.055,bevelThickness:.055,curveSegments:1}));
  const base=new T.Mesh(hexGeo,carbon);focal.add(base);
  const face=new T.Mesh(hexGeo,titanium);face.scale.set(.79,.79,.2);face.position.z=.3;focal.add(face);
  const center=new T.Mesh(hexGeo,carbon);center.scale.set(.7,.7,.15);center.position.z=.36;focal.add(center);
  const slit=new T.Mesh(own(new T.BoxGeometry(.44,.018,.015)),light);slit.position.z=.42;focal.add(slit);
  const cross=new T.Mesh(own(new T.BoxGeometry(.018,.18,.015)),light);cross.position.z=.42;focal.add(cross);
  const orbit=rail(1.12,.02,metal,.05,focal,Math.PI*1.4);orbit.rotation.z=.4;
  return {
    body,
    dispose() { instances.forEach(mesh=>mesh.dispose()); },
    update(open,time,weight,progress) {
      body.visible=progress<.42;
      body.position.z=-open*1.5;
      body.scale.setScalar(1+open*.55);
      rotors.forEach((rotor,i)=>{rotor.rotation.z=(i?-.24:.1)+Math.sin(time*.3)*.075*weight*(i?-1:1)+open*(i?-1.5:1.5);rotor.scale.setScalar(1+open*.65);});
      satellites.forEach((arm,i)=>{arm.position.x=Math.cos(i*Math.PI*2/3)*open*3;arm.position.y=Math.sin(i*Math.PI*2/3)*open*3;});
      focal.position.x=open*5;focal.position.y=open*2;focal.rotation.y=open*1.2;
      focal.rotation.z=Math.sin(time*.22)*.08*weight;
    }
  };
}
