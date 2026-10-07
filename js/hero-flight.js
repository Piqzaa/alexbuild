import * as T from '../assets/vendor/three/three.module.min.js';

const smooth=n=>{n=Math.max(0,Math.min(1,n));return n*n*(3-2*n);};

// The camera follows this same centerline, keeping the near walls in perspective.
export function flightCenter(z) {
  return {x:.7*Math.sin(-z*.13),y:.4*Math.sin(-z*.18)};
}

export function createFlight({darkMetal,gold,geometries,materials,textures}) {
  const body=new T.Group(),instances=[],dummy=new T.Object3D();
  const own=g=>{geometries.add(g);return g;};
  const keep=m=>{materials.add(m);return m;};
  const brushing=document.createElement('canvas');brushing.width=128;brushing.height=128;
  const brush=brushing.getContext('2d');
  for(let y=0;y<128;y++){const shade=124+Math.round(Math.sin(y*2.3)*12+Math.sin(y*.7)*6);brush.fillStyle=`rgb(${shade},${shade},${shade})`;brush.fillRect(0,y,128,1);}
  const brushedTexture=new T.CanvasTexture(brushing);brushedTexture.wrapS=brushedTexture.wrapT=T.RepeatWrapping;textures.add(brushedTexture);
  const silver=keep(new T.MeshStandardMaterial({color:0xc2ccc8,metalness:1,roughness:.19,bumpMap:brushedTexture,bumpScale:.018,side:T.DoubleSide}));
  const graphite=keep(new T.MeshStandardMaterial({color:0x1b2422,metalness:.8,roughness:.32,side:T.DoubleSide}));
  const luminous=keep(new T.MeshBasicMaterial({color:0xf4d8ac,toneMapped:false}));
  const softLight=keep(new T.MeshBasicMaterial({color:0xddb77e,transparent:true,opacity:.11,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
  // Curved, bevelled turbine segments, shared across twenty stations.
  const blade=new T.Shape();blade.absarc(0,0,4.8,0,.68,false);
  blade.lineTo(Math.cos(.77)*4.18,Math.sin(.77)*4.18);
  blade.absarc(0,0,4.18,.77,.09,true);blade.closePath();
  const bladeGeo=own(new T.ExtrudeGeometry(blade,{depth:.14,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,curveSegments:8,steps:1}));
  const bladeVertices=bladeGeo.attributes.position;
  for(let i=0;i<bladeVertices.count;i++) {const angle=Math.atan2(bladeVertices.getY(i),bladeVertices.getX(i));bladeVertices.setZ(i,bladeVertices.getZ(i)+1.25*Math.sin(angle*1.8));}
  bladeGeo.computeVertexNormals();
  const stations=20;
  const ribs=new T.InstancedMesh(bladeGeo,silver,stations*6),accents=new T.InstancedMesh(bladeGeo,gold,stations),darkRibs=new T.InstancedMesh(bladeGeo,graphite,stations);
  const edgeGeo=own(new T.TorusGeometry(4.16,.018,5,80));
  const edges=new T.InstancedMesh(edgeGeo,luminous,stations);
  const haloGeo=own(new T.TorusGeometry(4.16,.085,5,80));
  const halos=new T.InstancedMesh(haloGeo,softLight,stations);
  instances.push(ribs,accents,darkRibs,edges,halos);body.add(...instances);
  let normalIndex=0;
  for(let station=0;station<stations;station++) {
    const z=-station*3.15,center=flightCenter(z);
    for(let segment=0;segment<8;segment++) {
      dummy.position.set(center.x,center.y,z);
      dummy.rotation.set(.055*Math.sin(station*.6),.07*Math.cos(station*.5),segment*Math.PI/4+station*.2);
      dummy.scale.setScalar(1+.045*Math.sin(station*.5));dummy.updateMatrix();
      if(segment===0)accents.setMatrixAt(station,dummy.matrix);
      else if(segment===4)darkRibs.setMatrixAt(station,dummy.matrix);
      else ribs.setMatrixAt(normalIndex++,dummy.matrix);
    }
    dummy.position.set(center.x,center.y,z+.17);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1+.045*Math.sin(station*.5));dummy.updateMatrix();
    edges.setMatrixAt(station,dummy.matrix);halos.setMatrixAt(station,dummy.matrix);
  }
  // Six continuous helical spines connect the stations and reveal forward motion.
  function spine(angle,width) {
    const vertices=[],indices=[],segments=128;
    for(let i=0;i<=segments;i++) {
      const z=-i/segments*62,center=flightCenter(z),a=angle-z*.105;
      for(const [side,depth] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
        const r=4.12+depth*.055,theta=a+side*width/4.12;
        vertices.push(center.x+Math.cos(theta)*r,center.y+Math.sin(theta)*r,z);
      }
    }
    for(let i=0;i<segments;i++)for(let side=0;side<4;side++){
      const a=i*4+side,b=i*4+(side+1)%4;indices.push(a,a+4,b,b,a+4,b+4);
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return own(geometry);
  }
  for(let i=0;i<6;i++) {
    const mesh=new T.Mesh(spine(i*Math.PI/3,i%3===0?.19:.08),i===1?gold:i%2?silver:darkMetal);
    body.add(mesh);
  }
  // A soft exit light is a depth-tested surface, not a full-screen flash.
  const exitMaterial=keep(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    uniforms:{uOpacity:{value:0}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 vUv; uniform float uOpacity; void main(){float r=length((vUv-.5)*2.);float a=pow(max(0.,1.-r),3.);gl_FragColor=vec4(1.,.79,.51,a*uOpacity);}'
  }));
  const exit=new T.Mesh(own(new T.PlaneGeometry(18,18)),exitMaterial);exit.position.z=-74;body.add(exit);
  const dustPositions=[],dustColors=[];let seed=97;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const count=360,streakCount=120;
  for(let i=0;i<count;i++) {
    const z=-64+random()*68,angle=random()*Math.PI*2,radius=1.3+random()*3.2,center=flightCenter(z);
    dustPositions.push(center.x+Math.cos(angle)*radius,center.y+Math.sin(angle)*radius,z);
    const color=new T.Color(i%5===0?0xd9af76:0xd2dedb);dustColors.push(color.r,color.g,color.b);
  }
  const dustGeometry=own(new T.BufferGeometry());dustGeometry.setAttribute('position',new T.Float32BufferAttribute(dustPositions,3));dustGeometry.setAttribute('color',new T.Float32BufferAttribute(dustColors,3));
  const dustMaterial=keep(new T.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,blending:T.AdditiveBlending,
    uniforms:{uOpacity:{value:0},uSize:{value:22}},
    vertexShader:'varying vec3 vColor; uniform float uSize; void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(uSize/max(1.,-p.z),1.,3.);gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 vColor;uniform float uOpacity;void main(){float a=1.-smoothstep(.1,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(vColor,a*uOpacity);}'
  }));
  const dust=new T.Points(dustGeometry,dustMaterial);body.add(dust);
  const streakPositions=new Float32Array(streakCount*6),streakGeometry=own(new T.BufferGeometry());
  streakGeometry.setAttribute('position',new T.BufferAttribute(streakPositions,3));
  const streakMaterial=keep(new T.LineBasicMaterial({color:0xe6d5b9,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));
  const streaks=new T.LineSegments(streakGeometry,streakMaterial);streaks.frustumCulled=false;body.add(streaks);
  return {
    body,
    dispose() { instances.forEach(mesh=>mesh.dispose()); },
    update(progress,mobile) {
      const enter=smooth((progress-.13)/.14),leave=smooth((progress-.61)/.16);
      const intensity=enter*(1-leave),speed=smooth((progress-.23)/.12)*(1-smooth((progress-.59)/.12));
      body.visible=intensity>.001;
      if(!body.visible)return;
      // Sections near the exit peel away to expose the bright arrival room.
      const spread=1+leave*3;body.scale.set(spread,spread,1);
      body.rotation.z=Math.sin(progress*8)*.035;
      luminous.color.setRGB(1,.82+speed*.1,.58+speed*.2);
      softLight.opacity=.08+speed*.14;
      exitMaterial.uniforms.uOpacity.value=smooth((progress-.35)/.2)*(1-leave)*.45;
      dustGeometry.setDrawRange(0,mobile?170:count);dustMaterial.uniforms.uOpacity.value=intensity*.7;
      streakGeometry.setDrawRange(0,(mobile?48:streakCount)*2);streakMaterial.opacity=speed*.34;
      for(let i=0;i<streakCount;i++) {
        const at=i*3,to=i*6,z=dustPositions[at+2]+progress*2;
        streakPositions[to]=streakPositions[to+3]=dustPositions[at];
        streakPositions[to+1]=streakPositions[to+4]=dustPositions[at+1];
        streakPositions[to+2]=z;streakPositions[to+5]=z+.15+speed*1.6;
      }
      streakGeometry.attributes.position.needsUpdate=true;
    }
  };
}
