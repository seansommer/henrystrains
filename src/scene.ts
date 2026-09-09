import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ENGINES, type Railway } from './model.ts';
import { trackPoint, TRACK_LENGTH, RAIL_HEIGHT, cameraFrame, cameraPose } from './track.ts';

type Action = 'train'|'lights'|'gates'|'duck'|'station';
const materialCache=new Map<string,THREE.MeshStandardMaterial>();
function material(color:string,roughness=.5,metalness=.04) {
  const key=`${color}/${roughness}/${metalness}`;
  if(!materialCache.has(key)) materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));
  return materialCache.get(key)!;
}
function mesh(parent:THREE.Object3D,geometry:THREE.BufferGeometry,color:string,x=0,y=0,z=0) {
  const item=new THREE.Mesh(geometry,material(color));item.position.set(x,y,z);item.castShadow=true;item.receiveShadow=true;parent.add(item);return item;
}
function box(parent:THREE.Object3D,w:number,h:number,d:number,color:string,x=0,y=0,z=0,r=.07) { return mesh(parent,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),color,x,y,z); }
function ball(parent:THREE.Object3D,r:number,color:string,x=0,y=0,z=0) { return mesh(parent,new THREE.SphereGeometry(r,16,12),color,x,y,z); }
function cylinder(parent:THREE.Object3D,top:number,bottom:number,height:number,color:string,x=0,y=0,z=0) { return mesh(parent,new THREE.CylinderGeometry(top,bottom,height,20),color,x,y,z); }
function label(parent:THREE.Object3D,text:string,w:number,h:number,x:number,y:number,z:number,bg='#173951',fg='#fff4ce') {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.font='bold 78px Trebuchet MS, sans-serif';ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,67,475);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}));plane.position.set(x,y,z);parent.add(plane);return plane;
}

class RailCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private offset=0,private height=0) { super(); }
  getPoint(t:number,target=new THREE.Vector3()) { const p=trackPoint(t*TRACK_LENGTH);return target.set(p.x+p.dz*this.offset,this.height,p.z-p.dx*this.offset); }
}

function wheel(parent:THREE.Object3D,color:string,x:number,z:number,r=.28) {
  const group=new THREE.Group();group.position.set(x,RAIL_HEIGHT+r+.02,z);parent.add(group);
  const tire=cylinder(group,r,r,.15,'#263c50');tire.rotation.z=Math.PI/2;
  const rim=cylinder(group,r*.82,r*.82,.165,color);rim.rotation.z=Math.PI/2;
  const hub=cylinder(group,.075,.075,.18,'#ffd47b');hub.rotation.z=Math.PI/2;
  for(let i=0;i<3;i++) {const spoke=box(group,.17,r*1.43,.046,'#ffffff',0,0,0,.01);spoke.rotation.x=i*Math.PI/3;}
  return group;
}
type EngineModel={root:THREE.Group; wheels:THREE.Group[]; eyes:THREE.Group[]; smokePoint:THREE.Object3D; nameplates:THREE.Object3D[]};
function makeEngine(index:number):EngineModel {
  const colors=ENGINES[index], root=new THREE.Group(), wheels:THREE.Group[]=[],eyes:THREE.Group[]=[],nameplates:THREE.Object3D[]=[];
  root.userData.action='train';
  box(root,1.02,.24,2.46,colors.dark,0,.78,0,.12);
  for(const x of [-.38,.38]) for(const z of [-.84,0,.84]) wheels.push(wheel(root,colors.wheels,x,z));
  box(root,.91,1.12,.84,colors.color,0,1.4,-.72,.13);
  box(root,1.13,.20,1.02,colors.accent,0,2.02,-.72,.15);
  box(root,.74,.59,.08,'#223e56',0,1.55,-1.165,.09);
  for(const side of [-1,1]) {
    box(root,.045,.48,.46,'#244c64',side*.47,1.60,-.73,.06);
    const plate=label(root,colors.name.toUpperCase(),.74,.19,side*.501,1.04,-.63,colors.dark);
    plate.rotation.y=side*Math.PI/2;nameplates.push(plate);
  }
  if(colors.kind==='diesel') {
    box(root,.79,.71,1.53,colors.color,0,1.19,.25,.20);
    for(let i=0;i<3;i++) box(root,.82,.045,.075,colors.accent,0,1.1+i*.13,.15,.01);
  } else {
    const boiler=cylinder(root,.39,.39,1.51,colors.color,0,1.26,.25);boiler.rotation.x=Math.PI/2;
    for(const z of [-.20,.70]) { const ring=cylinder(root,.401,.401,.095,colors.accent,0,1.26,z);ring.rotation.x=Math.PI/2; }
    const funnel=cylinder(root,.18,.125,.43,colors.accent,0,1.80,.65);funnel.material=material(colors.accent,.28,.23);
    cylinder(root,.21,.19,.10,colors.dark,0,2.04,.65);
    ball(root,.16,colors.accent,0,1.72,-.06).scale.set(1,.9,1);
    if(colors.kind==='twin') { cylinder(root,.115,.09,.29,colors.accent,0,1.81,.18); }
  }
  const face=cylinder(root,.345,.345,.10,colors.color,0,1.27,1.04);face.rotation.x=Math.PI/2;
  for(const x of [-.125,.125]) {
    const eye=new THREE.Group();eye.position.set(x,1.34,1.105);root.add(eye);
    ball(eye,.095,'#fffef3').scale.set(.85,1.1,.42);
    ball(eye,.056,'#19384c',.011,0,.037).scale.set(.8,1.03,.52);
    ball(eye,.017,'#ffffff',.022,.027,.068);eyes.push(eye);
  }
  ball(root,.043,colors.accent,0,1.21,1.13);
  const smile=mesh(root,new THREE.TorusGeometry(.105,.016,6,20,Math.PI),'#244251',0,1.16,1.13);smile.rotation.z=Math.PI;
  box(root,.96,.19,.24,colors.wheels,0,.86,1.30,.09);
  for(const x of [-.29,.29]) ball(root,.095,colors.accent,x,.89,1.45).scale.z=.55;
  const smokePoint=new THREE.Object3D();smokePoint.position.set(0,2.1,.65);root.add(smokePoint);
  return {root,wheels,eyes,smokePoint,nameplates};
}

function wagon(index:number) {
  const root=new THREE.Group(),wheels:THREE.Group[]=[];
  root.userData.action='train';
  const color=index===0?'#f2b44d':'#83cfc2';
  box(root,.97,.20,1.60,'#345772',0,.77,0);
  for(const x of [-.38,.38]) for(const z of [-.49,.49]) wheels.push(wheel(root,'#f6816c',x,z,.235));
  box(root,1,.43,1.55,color,0,1.01,0,.10);
  if(index===0) {
    box(root,1.0,.73,1.47,'#fff0bb',0,1.57,0,.1);
    box(root,1.12,.16,1.68,color,0,2.02,0,.1);
    for(const x of [-.511,.511]) for(const z of [-.40,.13]) box(root,.025,.39,.39,'#2c6986',x,1.62,z,.065);
  } else {
    for(const z of [-.42,.35]) { const teddy=new THREE.Group();teddy.position.set(0,1.22,z);root.add(teddy);
      ball(teddy,.31,'#bd8a60',0,.23,0);ball(teddy,.26,'#d2a277',0,.63,0);
      for(const x of [-.20,.20]) ball(teddy,.11,'#bd8a60',x,.81,0);
      ball(teddy,.13,'#f7dfb5',0,.55,.22).scale.set(1,.7,.6);
      for(const x of [-.09,.09]) ball(teddy,.035,'#273e45',x,.67,.23);
      ball(teddy,.036,'#273e45',0,.57,.30);
    }
  }
  return {root,wheels};
}

function crossing(parent:THREE.Object3D,side:number) {
  const root=new THREE.Group();root.position.set(side*1.58,0,side<0?3.82:5.28);parent.add(root);root.userData.action='gates';
  box(root,.51,.19,.52,'#c5d4d9',0,.15,0);
  cylinder(root,.092,.11,2.52,'#f3eee2',0,1.4,0);
  const pivot=new THREE.Group();pivot.position.set(0,.98,0);pivot.rotation.y=side<0?0:Math.PI;root.add(pivot);
  const arm=new THREE.Group();pivot.add(arm);
  for(let i=0;i<6;i++) box(arm,.53,.18,.16,i%2?'#ee665f':'#fff8e9',.23+i*.52,0,0,.02);
  const hinge=cylinder(root,.20,.20,.26,'#345267',0,.98,0);hinge.rotation.x=Math.PI/2;
  const lamps=new THREE.Group();lamps.position.set(0,2.13,.11);lamps.userData.action='lights';root.add(lamps);
  const lit:THREE.MeshStandardMaterial[]=[];
  box(lamps,.98,.47,.22,'#254052',0,0,-.03,.20);
  for(const x of [-.255,.255]) {
    const hood=cylinder(lamps,.208,.208,.12,'#182d3a',x,0,.15);hood.rotation.x=Math.PI/2;
    const lens=cylinder(lamps,.16,.16,.04,'#691a2e',x,0,.224);lens.rotation.x=Math.PI/2;
    const mat=new THREE.MeshStandardMaterial({color:'#eb494c',emissive:'#ff352d',emissiveIntensity:0,roughness:.25});lens.material=mat;lit.push(mat);
  }
  for(const angle of [-.57,.57]) { const bar=box(root,.95,.14,.08,'#fffaed',0,2.74,.12,.02);bar.rotation.z=angle; }
  // Equal tufts are centered on the actual post base, in the same 3D space.
  for(const x of [-.23,0,.23]) ball(root,.20,'#62a36b',x,.13,-.08).scale.set(1,.8,.8);
  return {arm,lit};
}

function tree(parent:THREE.Object3D,x:number,z:number,scale=1) {
  const root=new THREE.Group();root.position.set(x,0,z);root.scale.setScalar(scale);parent.add(root);
  cylinder(root,.11,.17,1.35,'#927451',0,.62,0);
  for(const [xx,yy,zz,r] of [[0,2.0,0,.95],[-.55,1.65,.1,.64],[.52,1.75,.06,.70],[.12,2.65,0,.56]]) ball(root,r,'#5baf86',xx,yy,zz).scale.y=1.1;
  return root;
}

export class TrainWorld {
  renderer:THREE.WebGLRenderer; scene=new THREE.Scene(); camera=new THREE.OrthographicCamera(-10,10,8,-8,.1,100);
  root=new THREE.Group(); engines=ENGINES.map((_,i)=>makeEngine(i)); cars=[wagon(0),wagon(1)];
  gates:ReturnType<typeof crossing>[]=[]; duck=new THREE.Group(); bird=new THREE.Group(); birdWings:THREE.Mesh[]=[];
  last=0; frame=0; previousEngine=-1; clock=0; duckTime=-10; birdTime=-10; lastSmoke=0; width=1;height=1;
  puffs:{mesh:THREE.Mesh;age:number}[]=[]; observer:ResizeObserver; raycaster=new THREE.Raycaster(); pointer=new THREE.Vector2(); nameplates:THREE.Object3D[]=[];
  onFrame:(dt:number)=>void=()=>{};
  constructor(private host:HTMLElement,private model:Railway,private onAction:(action:Action)=>void,private onFailure:()=>void) {
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;
    this.renderer.domElement.setAttribute('aria-label','Interactive toy railway. Tap the train, crossing lights, gates, station, or duck.');
    this.renderer.domElement.setAttribute('role','img');
    host.prepend(this.renderer.domElement);
    this.scene.background=new THREE.Color('#b5e2e2');this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight('#dff7ff','#748664',2.6));
    const sun=new THREE.DirectionalLight('#fff3d1',3.2);sun.position.set(-7,14,7);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:35});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;this.scene.add(sun);
    const fill=new THREE.DirectionalLight('#b9e4ff',1.0);fill.position.set(7,7,-7);this.scene.add(fill);
    this.buildWorld();
    this.engines.forEach(e=>{this.root.add(e.root);this.nameplates.push(...e.nameplates);});this.cars.forEach(c=>this.root.add(c.root));
    for(let i=0;i<14;i++) { const p=new THREE.Mesh(new THREE.SphereGeometry(.19,10,8),new THREE.MeshBasicMaterial({color:'#fffaf0',transparent:true,opacity:.55,depthWrite:false}));this.scene.add(p);p.visible=false;this.puffs.push({mesh:p,age:3}); }
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
    this.renderer.domElement.addEventListener('pointerup',this.tap);
    this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
    document.addEventListener('visibilitychange',this.visibility);
    this.frame=requestAnimationFrame(this.tick);
  }
  buildWorld() {
    box(this.root,19.3,.85,15.1,'#72b88c',0,-.43,0,1.05);
    box(this.root,19.1,.15,14.9,'#8dcb98',0,-.01,0,.9);
    const ballast=mesh(this.root,new THREE.TubeGeometry(new RailCurve(),160,.60,8,true),'#baa994',0,.10,0);ballast.scale.y=.20;
    const sleepers=new THREE.InstancedMesh(new THREE.BoxGeometry(1.05,.10,.17),material('#7a6b5e'),86),dummy=new THREE.Object3D();
    for(let i=0;i<86;i++) {const p=trackPoint(i/86*TRACK_LENGTH);dummy.position.set(p.x,.22,p.z);dummy.rotation.set(0,p.heading,0);dummy.updateMatrix();sleepers.setMatrixAt(i,dummy.matrix);}
    sleepers.receiveShadow=true;this.root.add(sleepers);
    for(const side of [-.35,.35]) mesh(this.root,new THREE.TubeGeometry(new RailCurve(side,RAIL_HEIGHT),240,.04,6,true),'#c7d7dd');
    box(this.root,2.4,.035,7.7,'#e7c898',0,.105,3.7,.15);
    // Road crossings sit level with the rails, leaving both steel running lines exposed.
    for(const z of [4.13,4.55,4.97]) box(this.root,2.45,.07,.30,'#ae9b80',0,.22,z,.015);
    for(let i=0;i<3;i++) box(this.root,.07,.012,.5,'#fff2ce',0,.135,5.8+i*.75,.01);
    this.gates=[crossing(this.root,-1),crossing(this.root,1)];
    const station=new THREE.Group();station.position.set(-1.1,0,-1.50);station.userData.action='station';this.root.add(station);
    box(station,4.8,.23,2.8,'#e4d6be',0,.19,0,.14);
    box(station,3.7,1.83,1.74,'#fff0cf',0,1.17,0,.15);
    box(station,3.86,.12,1.89,'#fff8e7',0,2.04,0,.03);
    for(const x of [-1.29,1.29]) { box(station,.66,.74,.06,'#4c94ad',x,1.30,.90,.08);box(station,.72,.09,.12,'#f7bf6c',x,.9,.93); }
    box(station,.76,1.33,.085,'#b4675c',0,.98,.92,.08);ball(station,.038,'#ffdb7c',.24,1,.982);
    const roofProfile=new THREE.Shape();roofProfile.moveTo(-1.12,0);roofProfile.lineTo(0,.82);roofProfile.lineTo(1.12,0);roofProfile.closePath();
    const roof=mesh(station,new THREE.ExtrudeGeometry(roofProfile,{depth:4.16,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:2,steps:1}),'#e57868',-2.08,2.1,0);roof.rotation.y=Math.PI/2;
    // A slim flat cap beneath the pitched roof gives the station a toy-like eave.
    box(station,4.30,.18,2.15,'#d75c59',0,2.02,0,.05);
    this.nameplates.push(label(station,'HENRY’S STATION',2.42,.40,0,1.90,.963,'#235368'));
    for(const [x,z,s] of [[-7.8,-4.8,.82],[7.7,-4.1,1],[-8.1,.3,.8],[7.9,1.1,.72],[-5,-6.0,1.1],[4.1,-6.15,.8]]) tree(this.root,x,z,s);
    for(const [x,z,s] of [[-4,-1,1.2],[5.1,-1,1],[-5.4,1.1,.8],[5.8,5.1,.7]]) ball(this.root,s,'#9dce9d',x,.10,z).scale.set(1,.45,1);
    const pond=cylinder(this.root,1.48,1.60,.045,'#54b7d5',3.5,.14,.0);pond.scale.set(1.2,1,.8);
    const shore=cylinder(this.root,1.63,1.64,.06,'#e4d2a7',3.5,.10,0);shore.scale.set(1.2,1,.8);
    this.duck.position.set(3.6,.21,.1);this.duck.rotation.y=-.25;this.duck.userData.action='duck';this.root.add(this.duck);
    ball(this.duck,.43,'#ffda62',0,.3,0).scale.set(1,.9,1.25);ball(this.duck,.31,'#ffe484',0,.76,.26);
    ball(this.duck,.17,'#ed9851',0,.70,.56).scale.set(1,.44,1.2);
    for(const x of [-.14,.14]) ball(this.duck,.038,'#274352',x,.81,.51);
    for(const x of [-.35,.35]) ball(this.duck,.24,'#f6bf46',x,.34,-.01).scale.set(.35,.70,1);
    this.bird.position.set(-2,3.04,-1.45);this.bird.userData.action='station';this.root.add(this.bird);
    ball(this.bird,.26,'#66b8d4',0,.16,0);ball(this.bird,.20,'#83cde3',0,.48,.13);
    ball(this.bird,.08,'#ffc867',0,.44,.33).scale.set(.7,.55,1.3);
    for(const x of [-.08,.08]) ball(this.bird,.022,'#20374c',x,.51,.299);
    for(const side of [-1,1]) {const wing=ball(this.bird,.2,'#468fbd',side*.20,.2,0);wing.scale.set(.25,.5,1);this.birdWings.push(wing);}
    for(const [x,z] of [[-3.6,5.8],[4.3,5.8],[-5.2,-2.2],[5.5,-3.0]]) {
      for(let i=0;i<3;i++) {const xx=x+Math.sin(i*2.1)*.3,zz=z+Math.cos(i*2.1)*.3;cylinder(this.root,.018,.018,.24,'#47805b',xx,.2,zz);ball(this.root,.075,i%2?'#ffdd79':'#faad99',xx,.34,zz);}
    }
    for(const [x,z] of [[-5,-6.8],[3,-7.0]]) { const cloud=new THREE.Group();cloud.position.set(x,4.1,z);this.root.add(cloud);for(const [cx,cy,r] of [[-.6,0,.48],[0,.18,.65],[.6,0,.48]]) ball(cloud,r,'#f8fbec',cx,cy,0).scale.z=.75; }
  }
  resize() {
    this.width=Math.max(1,this.host.clientWidth);this.height=Math.max(1,this.host.clientHeight);
    this.renderer.setSize(this.width,this.height,false);
    const close=this.model.settings.close, frame=cameraFrame(this.width/this.height,close);
    Object.assign(this.camera,{left:-frame.width/2,right:frame.width/2,top:frame.height/2,bottom:-frame.height/2});
    const pose=cameraPose(close),target=new THREE.Vector3(...pose.target);
    this.camera.position.copy(target).add(new THREE.Vector3(...pose.offset));this.camera.lookAt(target);this.camera.updateProjectionMatrix();
  }
  tap=(event:PointerEvent)=>{
    const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    const hit=this.raycaster.intersectObjects(this.root.children,true)[0];if(!hit)return;
    let object:THREE.Object3D|null=hit.object;
    while(object) { if(object.userData.action) {const action=object.userData.action as Action;if(action==='duck')this.duckTime=this.clock;if(action==='station')this.birdTime=this.clock;this.onAction(action);return;} object=object.parent; }
  };
  contextLost=(event:Event)=>{event.preventDefault();cancelAnimationFrame(this.frame);this.onFailure();};
  visibility=()=>{this.last=0;cancelAnimationFrame(this.frame);if(!document.hidden)this.frame=requestAnimationFrame(this.tick);};
  tick=(now:number)=>{
    const dt=this.last?Math.min(.06,(now-this.last)/1000):0;this.last=now;
    this.onFrame(dt);if(!this.model.suspended)this.clock+=dt;
    const m=this.model;
    if(this.previousEngine!==m.engine) {this.engines.forEach((e,i)=>e.root.visible=i===m.engine);this.previousEngine=m.engine;}
    const engine=this.engines[m.engine];
    const vehicles=[engine,...this.cars];
    vehicles.forEach((v,index)=>{const p=trackPoint(m.distance-[0,2.34,4.29][index]);v.root.position.set(p.x,0,p.z);v.root.rotation.y=p.heading;v.wheels.forEach(w=>w.rotation.x=m.distance/(index?.235:.28));});
    this.gates.forEach(g=>{g.arm.rotation.z=(1-m.gate)*Math.PI*.47;g.lit.forEach((mat,i)=>{const on=m.lamp(i);mat.emissiveIntensity=on?1.9:0;mat.color.set(on?'#ff6759':'#642b38');});});
    this.nameplates.forEach(p=>p.visible=m.settings.text);
    const blink=m.settings.gentle?1:(this.clock%5.2>5.02?.10:1);engine.eyes.forEach(eye=>eye.scale.y=blink);
    const duckAge=this.clock-this.duckTime, birdAge=this.clock-this.birdTime;
    this.duck.position.y=.21+(!m.settings.gentle&&duckAge<1.25?Math.sin(duckAge/1.25*Math.PI)*.7:0);
    this.duck.rotation.y=-.25+(duckAge<1.25?Math.sin(duckAge/1.25*Math.PI)*.5:0);
    if(!m.settings.gentle&&birdAge<3) {this.bird.position.set(-2+Math.sin(birdAge/3*Math.PI)*1.5,3.04+Math.sin(birdAge/3*Math.PI)*1.5,-1.45);this.birdWings.forEach((w,i)=>w.rotation.z=(i?1:-1)*Math.sin(this.clock*18)*1.1);} else {this.bird.position.set(-2,3.04,-1.45);this.birdWings.forEach(w=>w.rotation.z=0);}
    if(!m.suspended&&!m.settings.gentle&&m.velocity>.4&&this.clock-this.lastSmoke>.24&&ENGINES[m.engine].kind!=='diesel') {
      const puff=this.puffs.find(p=>p.age>=2.5);if(puff){puff.age=0;engine.root.updateMatrixWorld(true);engine.smokePoint.getWorldPosition(puff.mesh.position);puff.mesh.visible=true;}this.lastSmoke=this.clock;
    }
    this.puffs.forEach(p=>{if(!m.suspended)p.age+=dt;p.mesh.visible=p.age<2.5&&!m.settings.gentle;if(p.mesh.visible){p.mesh.position.y+=m.suspended?0:dt*.55;p.mesh.position.x-=m.suspended?0:dt*.1;p.mesh.scale.setScalar(1+p.age*.7);(p.mesh.material as THREE.MeshBasicMaterial).opacity=Math.max(0,.6-p.age*.24);}});
    this.renderer.render(this.scene,this.camera);this.frame=requestAnimationFrame(this.tick);
  };
}
