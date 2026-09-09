import { TRACK_LENGTH, TRAIN_START } from './track.ts';
export const ENGINES = [
  { name:'Henry', color:'#169dd4', dark:'#2262b9', accent:'#ffd060', wheels:'#f47765', note:392, kind:'steam' },
  { name:'Poppy', color:'#ef796e', dark:'#cf465f', accent:'#ffe0a0', wheels:'#285c77', note:440, kind:'twin' },
  { name:'Sunny', color:'#ffce48', dark:'#ef9d32', accent:'#fff3c9', wheels:'#347b96', note:330, kind:'diesel' },
  { name:'Clover', color:'#63c5ad', dark:'#2b9186', accent:'#f5df90', wheels:'#405ea0', note:349, kind:'steam' },
] as const;
export type Settings = { trainSpeed:number; lightSpeed:number; gateSpeed:number; volume:number; music:boolean; gentle:boolean; steady:boolean; text:boolean; repeat:boolean; close:boolean; };
export const DEFAULTS: Settings = { trainSpeed:1, lightSpeed:1, gateSpeed:1, volume:.35, music:false, gentle:false, steady:false, text:true, repeat:false, close:true };
export function readSettings(value: unknown, reduced = false): Settings {
  const result = { ...DEFAULTS, gentle:reduced, steady:reduced };
  if (!value || typeof value !== 'object') return result;
  const input = value as Record<string,unknown>;
  for (const key of ['music','gentle','steady','text','repeat','close'] as const) if (typeof input[key] === 'boolean') result[key] = input[key];
  for (const key of ['trainSpeed','lightSpeed','gateSpeed','volume'] as const) {
    const val=input[key]; if (typeof val==='number'&&Number.isFinite(val)) result[key]=Math.max(key==='volume'?0:.5,Math.min(key==='volume'?1:1.5,val));
  }
  return result;
}
export type Phase = 'idle'|'warning'|'lowering'|'ride'|'opening'|'rest';
export class Railway {
  settings: Settings;
  engine=0; running=false; lights=false; gatesDown=false; gate=0;
  distance=TRACK_LENGTH*TRAIN_START; velocity=0; time=0; phase:Phase='idle'; phaseTime=0; rideDistance=0;
  muted=false; suspended=false;
  constructor(settings=DEFAULTS) { this.settings={...settings}; }
  takeControl() { this.phase='idle'; this.phaseTime=0; }
  toggleTrain() { this.takeControl(); this.running=!this.running; }
  toggleLights() { this.takeControl(); this.lights=!this.lights; }
  toggleGates() { this.takeControl(); this.gatesDown=!this.gatesDown; }
  selectTrain(index:number) { if(Number.isInteger(index)&&index>=0&&index<ENGINES.length) this.engine=index; }
  show() {
    if(this.phase!=='idle') { this.takeControl(); this.running=false; return; }
    this.running=false; this.velocity=0; this.lights=true; this.gatesDown=false;
    this.phase='warning'; this.phaseTime=0; this.rideDistance=0;
  }
  setPhase(phase:Phase) { this.phase=phase; this.phaseTime=0; }
  step(delta:number) {
    if(this.suspended) return;
    const dt=Math.max(0,Math.min(.06,Number.isFinite(delta)?delta:0));
    this.time+=dt; this.phaseTime+=dt;
    const target=this.gatesDown?1:0, amount=dt*this.settings.gateSpeed*.6;
    this.gate+=Math.sign(target-this.gate)*Math.min(Math.abs(target-this.gate),amount);
    const wanted=this.running?2.8*this.settings.trainSpeed:0;
    this.velocity+=(wanted-this.velocity)*(1-Math.exp(-dt*4));
    if(this.velocity<.002&&!this.running) this.velocity=0;
    const movement=this.velocity*dt;
    this.distance=(this.distance+movement)%TRACK_LENGTH;
    if(this.phase==='ride') this.rideDistance+=movement;
    if(this.phase==='warning'&&this.phaseTime>=.9) { this.gatesDown=true; this.setPhase('lowering'); }
    else if(this.phase==='lowering'&&this.gate>.999) { this.running=true; this.setPhase('ride'); }
    else if(this.phase==='ride'&&this.rideDistance>=TRACK_LENGTH) { this.running=false; this.setPhase('opening'); }
    else if(this.phase==='opening') {
      if(this.phaseTime>.9) this.gatesDown=false;
      if(this.gate<.001&&this.phaseTime>1.2) { this.lights=false; this.setPhase('rest'); }
    } else if(this.phase==='rest'&&this.phaseTime>1.1) {
      this.setPhase('idle'); if(this.settings.repeat) this.show();
    }
  }
  lamp(index:number) { return this.lights&&(this.settings.steady || Math.floor(this.time*this.settings.lightSpeed*2)%2===index%2); }
}
