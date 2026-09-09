import { ENGINES, type Railway } from './model.ts';
export class RailwaySound {
  context:AudioContext|null=null; master:GainNode|null=null; noise:AudioBuffer|null=null;
  lastChuff=0; lastBell=0; lastMusic=0; melody=0; enabled=true;
  lastWhistle=-10;
  async unlock() {
    try {
      if(!this.context) {
        const Audio=window.AudioContext || (window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
        if(!Audio) return;
        this.context=new Audio(); this.master=this.context.createGain(); this.master.gain.value=0;
        const compressor=this.context.createDynamicsCompressor(); compressor.threshold.value=-14; compressor.ratio.value=8;
        this.master.connect(compressor); compressor.connect(this.context.destination);
        this.noise=this.context.createBuffer(1,Math.floor(this.context.sampleRate*.22),this.context.sampleRate);
        const samples=this.noise.getChannelData(0); let previous=0;
        for(let i=0;i<samples.length;i++) { previous=(previous+Math.random()*2-1)/2; samples[i]=previous; }
      }
      if(this.context.state==='suspended') await this.context.resume();
    } catch { /* Sound support never controls the game state. */ }
  }
  tone(frequency:number,length:number,volume:number,delay=0,type:OscillatorType='sine') {
    const ctx=this.context; if(!ctx||!this.master||ctx.state!=='running'||!this.enabled) return;
    const osc=ctx.createOscillator(), gain=ctx.createGain(), start=ctx.currentTime+delay;
    osc.type=type; osc.frequency.setValueAtTime(frequency,start); osc.frequency.exponentialRampToValueAtTime(frequency*.985,start+length);
    gain.gain.setValueAtTime(0,start); gain.gain.linearRampToValueAtTime(volume,start+.025); gain.gain.exponentialRampToValueAtTime(.0001,start+length);
    osc.connect(gain); gain.connect(this.master); osc.start(start); osc.stop(start+length+.01); osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  whistle(index:number) { const now=this.context?.currentTime??0;if(now-this.lastWhistle<.45)return;this.lastWhistle=now;const n=ENGINES[index].note; this.tone(n,.7,.2);this.tone(n*1.5,.7,.06);this.tone(n,.95,.16,.28); }
  quack() { this.tone(410,.18,.1,0,'triangle'); this.tone(320,.22,.08,.18,'triangle'); }
  stationBell() { this.tone(880,.9,.12);this.tone(1320,.6,.035); }
  chuff(index:number) {
    const ctx=this.context;if(!ctx||!this.master||!this.noise||!this.enabled||ctx.state!=='running')return;
    const source=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
    source.buffer=this.noise;filter.type='lowpass';filter.frequency.value=650+index*140;
    gain.gain.setValueAtTime(.24,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.17);
    source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  update(model:Railway) {
    if(!this.context||!this.master)return;
    this.enabled=!model.muted&&!model.suspended;
    this.master.gain.setTargetAtTime(this.enabled?model.settings.volume:0,this.context.currentTime,.04);
    if(!this.enabled)return;
    const now=this.context.currentTime;
    if(model.velocity>.15&&now-this.lastChuff>Math.max(.12,.52/(model.velocity+.2))) { this.lastChuff=now;this.chuff(model.engine); }
    if(model.lights&&now-this.lastBell>1/model.settings.lightSpeed) {this.lastBell=now;this.tone(720,.28,.035);this.tone(1060,.15,.014);}
    if(model.settings.music&&now-this.lastMusic>1.2) {
      this.lastMusic=now;const notes=[262,330,392,330,294,349,440,349,262,330,392,523,294,349,392,330];
      this.tone(notes[this.melody++%notes.length],1.1,.027);this.tone(notes[(this.melody+3)%notes.length]/2,1.2,.013);
    }
  }
}
