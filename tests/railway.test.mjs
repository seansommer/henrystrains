import test from 'node:test';
import assert from 'node:assert/strict';
import { Railway, DEFAULTS, readSettings } from '../src/model.ts';
import { TRACK_LENGTH, trackPoint, cameraFrame } from '../src/track.ts';
import { cameraPose } from '../src/track.ts';
import { OrthographicCamera, Vector3 } from 'three';
const run=(model,seconds)=>{for(let t=0;t<seconds;t+=.025)model.step(.025);};

test('each primary control remains independent and can be reversed during movement',()=>{
  const m=new Railway();m.toggleTrain();m.toggleLights();m.toggleGates();run(m,.7);
  assert.ok(m.gate>0&&m.gate<1);const midway=m.gate;m.toggleGates();run(m,.2);
  assert.ok(m.gate<midway);assert.equal(m.running,true);assert.equal(m.lights,true);
  m.toggleTrain();run(m,2);assert.ok(m.velocity<.01);assert.equal(m.lights,true);
});
test('a crossing show closes the gates before moving and finishes with lights off and gates up',()=>{
  for(const trainSpeed of [.5,1,1.5])for(const gateSpeed of [.5,1.5]){
    const m=new Railway({...DEFAULTS,trainSpeed,gateSpeed});m.show();let moved=false,finished=false;
    for(let t=0;t<75;t+=.025){m.step(.025);if(m.phase==='ride'){assert.equal(m.gate,1);assert.equal(m.lights,true);moved=true;}if(moved&&m.phase==='idle'){finished=true;break;}}
    assert.ok(finished);assert.equal(m.gatesDown,false);assert.equal(m.lights,false);assert.equal(m.running,false);assert.equal(m.gate,0);
  }
});
test('repeating shows restart predictably and a manual tap immediately takes control',()=>{
  const m=new Railway({...DEFAULTS,repeat:true});m.show();let rides=0,last='';
  for(let t=0;t<60;t+=.03){m.step(.03);if(m.phase==='ride'&&last!=='ride')rides++;last=m.phase;}
  assert.ok(rides>=2);m.toggleLights();assert.equal(m.phase,'idle');run(m,4);assert.equal(m.phase,'idle');
});
test('speed changes apply while moving and pause freezes the entire sequence',()=>{
  const m=new Railway();m.toggleTrain();run(m,1.5);const speed=m.velocity;
  m.settings.trainSpeed=1.5;run(m,1);assert.ok(m.velocity>speed);
  m.show();run(m,1);m.suspended=true;const old=JSON.stringify(m);run(m,5);assert.equal(JSON.stringify(m),old);
});
test('each lamp alternates and steady mode keeps both lamps lit',()=>{
  const m=new Railway();m.toggleLights();let a=0,b=0;
  for(let i=0;i<100;i++){m.step(.025);assert.notEqual(m.lamp(0),m.lamp(1));a+=Number(m.lamp(0));b+=Number(m.lamp(1));}
  assert.ok(a>0&&b>0);m.settings.steady=true;assert.ok(m.lamp(0)&&m.lamp(1));m.toggleLights();assert.ok(!m.lamp(0)&&!m.lamp(1));
});
test('train and car paths are continuous at the seam and have unit tangents',()=>{
  const start=trackPoint(0),end=trackPoint(TRACK_LENGTH);assert.deepEqual(start,end);
  for(let d=-TRACK_LENGTH;d<TRACK_LENGTH*2;d+=.03){const p=trackPoint(d),next=trackPoint(d+.02);assert.ok(Math.abs(Math.hypot(p.dx,p.dz)-1)<1e-10);assert.ok(Math.hypot(next.x-p.x,next.z-p.z)<.0202);assert.ok(Math.abs(p.x)<=6.91&&Math.abs(p.z)<=4.56);}
});
test('camera frames are finite and maintain the display aspect across phone rotations',()=>{
  for(const [w,h] of [[320,420],[390,600],[430,690],[844,285],[568,250],[1366,690]])for(const close of [true,false]){const frame=cameraFrame(w/h,close);assert.ok(Number.isFinite(frame.width)&&frame.width>0);assert.ok(Math.abs(frame.width/frame.height-w/h)<1e-10);}
});
test('saved settings reject corrupt types and honor a reduced-motion default',()=>{
  assert.equal(readSettings(null,true).gentle,true);assert.equal(readSettings(null,true).steady,true);
  const s=readSettings({trainSpeed:100,gateSpeed:-2,lightSpeed:NaN,volume:5,repeat:'yes'});
  assert.equal(s.trainSpeed,1.5);assert.equal(s.gateSpeed,.5);assert.equal(s.lightSpeed,1);assert.equal(s.volume,1);assert.equal(s.repeat,false);
});
test('both crossing posts and their raised gates remain inside every phone frame',()=>{
  for(const [w,h] of [[320,420],[390,600],[430,690],[634,285],[358,250],[1366,690]])for(const close of [true,false]) {
    const frame=cameraFrame(w/h,close),pose=cameraPose(close),target=new Vector3(...pose.target);
    const camera=new OrthographicCamera(-frame.width/2,frame.width/2,frame.height/2,-frame.height/2,.1,100);
    camera.position.copy(target).add(new Vector3(...pose.offset));camera.lookAt(target);camera.updateMatrixWorld();
    for(const side of [-1,1])for(const y of [.1,4.1]) {
      const p=new Vector3(side*1.58,y,side<0?3.82:5.28).project(camera);
      assert.ok(Math.abs(p.x)<.9&&Math.abs(p.y)<.9,`${w}x${h}: crossing remains reachable`);
    }
  }
});
