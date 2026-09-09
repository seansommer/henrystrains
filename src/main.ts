import './style.css';
import { Railway, ENGINES, readSettings, type Settings } from './model.ts';
import { RailwaySound } from './audio.ts';
import { TrainWorld } from './scene.ts';
import { icon } from './icons.ts';

const key='henrys-trains.preferences.v1';
let stored:unknown;try{stored=JSON.parse(localStorage.getItem(key)||'null');}catch{stored=null;}
const model=new Railway(readSettings(stored,matchMedia('(prefers-reduced-motion: reduce)').matches));
const sound=new RailwaySound();let world:TrainWorld|null=null;let messageTimer:ReturnType<typeof setTimeout>;
const speed=(id:string,label:string,value:number)=>`<div class="speed-control"><label class="sr-only" for="${id}">${label}</label><input id="${id}" type="range" min="0.5" max="1.5" step="0.1" value="${value}" aria-valuetext="${value} times normal speed"/><output for="${id}">${value.toFixed(1)}×</output></div>`;
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<main class="railway-app">
  <header class="topbar">
    <img class="app-badge" src="./icon-192.png" width="42" height="42" alt=""/>
    <h1>Henry’s <span>Trains</span></h1>
    <nav aria-label="Sound and parent controls">
      <button class="icon-button" id="sound" aria-label="Mute sound" aria-pressed="false">${icon('volume')}</button>
      <button class="icon-button" id="settings" aria-label="Open parent controls" aria-haspopup="dialog">${icon('settings')}</button>
    </nav>
  </header>
  <section class="play-window" aria-label="Henry’s toy railway">
    <div class="world" id="world"></div>
    <div class="engine-picker" role="group" aria-label="Choose your train">
      ${ENGINES.map((e,i)=>`<button class="engine-choice" data-engine="${i}" style="--engine-color:${e.color}" aria-label="Choose ${e.name}" aria-pressed="${i===0}">${icon('train')}<span>${e.name}</span></button>`).join('')}
    </div>
    <button id="camera" class="camera-button icon-button" aria-label="Show the whole railway" title="Change view">${icon('view')}</button>
    <div class="scene-tools">
      <button id="show" class="show-button" aria-pressed="false">${icon('sparkle')}<span>Crossing show</span></button>
      <button id="horn" class="horn-button" aria-label="Sound the train whistle">${icon('horn')}<span>Choo!</span></button>
    </div>
    <p id="scene-message" class="scene-message" role="status">Pick a train. You’re the driver.</p>
    <button class="discovery-button" data-discover="duck">Say hello to the duck</button>
    <button class="discovery-button" data-discover="station">Ring the station bell</button>
    <div class="loading" id="loading"><img src="./icon-192.png" width="100" height="100" alt=""/><p>Getting your railway ready…</p></div>
    <div class="unavailable" id="unavailable" hidden><h2>Your railway needs a restart</h2><p>Let’s try opening the 3D world again.</p><button id="retry">Try again</button><a href="https://seansommer.github.io/henrythetrain/">Play Henry the Train</a></div>
  </section>
  <section class="driver-desk" aria-label="Train and crossing controls">
    <div class="control-cell train-cell"><button id="train" class="big-control" aria-label="Start the train" aria-pressed="false">${icon('play')}<span>Go train!</span></button>${speed('train-speed','Train speed',model.settings.trainSpeed)}</div>
    <div class="control-cell light-cell"><button id="lights" class="big-control" aria-label="Turn crossing lights on" aria-pressed="false">${icon('lights')}<span>Lights on</span></button>${speed('light-speed','Crossing light speed',model.settings.lightSpeed)}</div>
    <div class="control-cell gate-cell"><button id="gates" class="big-control" aria-label="Lower the crossing gates" aria-pressed="false">${icon('gate')}<span>Gates down</span></button>${speed('gate-speed','Crossing gate speed',model.settings.gateSpeed)}</div>
  </section>
  <dialog id="parent-controls" aria-labelledby="parent-heading">
    <div class="dialog-heading"><div><p class="eyebrow">MAKE IT HENRY’S</p><h2 id="parent-heading">Parent controls</h2></div><button class="icon-button" id="close-settings" aria-label="Close parent controls">${icon('close')}</button></div>
    <p class="parent-intro">Set the pace he enjoys. These choices stay on this device.</p>
    <label class="volume-row" for="volume">Sound volume <output id="volume-value"></output></label><input type="range" id="volume" min="0" max="100" step="5" value="${model.settings.volume*100}" aria-label="Sound volume"/>
    <div class="preferences">
      <label><span><strong>Gentle scene</strong><small>Fewer extra movements and no steam puffs.</small></span><input type="checkbox" id="gentle" role="switch" ${model.settings.gentle?'checked':''}/></label>
      <label><span><strong>Steady crossing lights</strong><small>Keep the red lights on without flashing.</small></span><input type="checkbox" id="steady" role="switch" ${model.settings.steady?'checked':''}/></label>
      <label><span><strong>Soft background music</strong><small>A quiet, original little railway tune.</small></span><input type="checkbox" id="music" role="switch" ${model.settings.music?'checked':''}/></label>
      <label><span><strong>Repeat the crossing show</strong><small>Play the same sequence again until stopped.</small></span><input type="checkbox" id="repeat" role="switch" ${model.settings.repeat?'checked':''}/></label>
      <label><span><strong>Show words</strong><small>Keep the picture buttons when words are off.</small></span><input type="checkbox" id="text" role="switch" ${model.settings.text?'checked':''}/></label>
    </div>
    <div class="play-guide"><strong>A little world he controls</strong><p>Go starts a continuous train ride. Tap again to stop. The lights and gates each follow his taps—even halfway through moving.</p><p><strong>Crossing show</strong> plays lights → gates → one lap → gates up. Any main control returns to free play. Tap the duck or station for a little hello.</p></div>
    <button class="back-button" id="back">Back to my railway</button>
    <a class="hub-link" href="https://seansommer.github.io/gamecenter/">Game Center</a>
    <p class="credit">Made for Henry, with love. · Created by Sean</p>
  </dialog>
</main>`;

const get=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const dialog=get<HTMLDialogElement>('parent-controls');
function save() {try{localStorage.setItem(key,JSON.stringify(model.settings));}catch{/* The game works without storage. */}}
function say(message:string) {const node=get('scene-message');node.textContent=message;node.classList.remove('quiet');clearTimeout(messageTimer);messageTimer=setTimeout(()=>node.classList.add('quiet'),3800);}
let lastState='';
function updateControls() {
  const state=[model.running,model.lights,model.gatesDown,model.engine,model.phase,model.muted,model.settings.text,model.settings.close].join('/');
  if(state===lastState)return;lastState=state;
  const set=(id:string,on:boolean,text:string,label:string,glyph?:string)=>{const b=get<HTMLButtonElement>(id);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',label);b.querySelector('span')!.textContent=text;if(glyph)b.querySelector('svg')!.outerHTML=icon(glyph);};
  set('train',model.running,model.running?'Stop train':'Go train!',model.running?'Stop the train':'Start the train',model.running?'pause':'play');
  set('lights',model.lights,model.lights?'Lights off':'Lights on',model.lights?'Turn crossing lights off':'Turn crossing lights on');
  set('gates',model.gatesDown,model.gatesDown?'Gates up':'Gates down',model.gatesDown?'Raise the crossing gates':'Lower the crossing gates');
  set('show',model.phase!=='idle',model.phase!=='idle'?'Stop show':'Crossing show',model.phase!=='idle'?'Stop the crossing show':'Play the crossing show',model.phase!=='idle'?'pause':'sparkle');
  document.querySelectorAll<HTMLButtonElement>('[data-engine]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.engine)===model.engine)));
  get('sound').innerHTML=icon(model.muted?'muted':'volume');get('sound').setAttribute('aria-label',model.muted?'Turn sound on':'Mute sound');get('sound').setAttribute('aria-pressed',String(model.muted));
  document.querySelector('.railway-app')!.classList.toggle('pictures-only',!model.settings.text);
  get('camera').setAttribute('aria-label',model.settings.close?'Show the whole railway':'Move closer to the crossing');
}
function action(which:'train'|'lights'|'gates'|'duck'|'station') {
  void sound.unlock().then(()=>{if(which==='duck')sound.quack();if(which==='station')sound.stationBell();});
  if(which==='train'){model.toggleTrain();say(model.running?`${ENGINES[model.engine].name}, let’s go!`:'Stopping at your command.');}
  if(which==='lights'){model.toggleLights();say(model.lights?'The crossing lights are on.':'The crossing lights are off.');}
  if(which==='gates'){model.toggleGates();say(model.gatesDown?'Down go the gates!':'Up go the gates!');}
  if(which==='duck'){if(world)world.duckTime=world.clock;say('Hello, little duck!');}
  if(which==='station'){if(world)world.birdTime=world.clock;say('Ding! Hello from Henry’s station.');}
  updateControls();
}
for(const id of ['train','lights','gates'] as const)get(id).addEventListener('click',()=>action(id));
document.querySelectorAll<HTMLButtonElement>('[data-discover]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.discover as 'duck'|'station')));
document.querySelectorAll<HTMLButtonElement>('[data-engine]').forEach(b=>b.addEventListener('click',()=>{model.selectTrain(Number(b.dataset.engine));void sound.unlock().then(()=>sound.whistle(model.engine));say(`${ENGINES[model.engine].name} is your train.`);updateControls();}));
get('horn').addEventListener('click',()=>{void sound.unlock().then(()=>sound.whistle(model.engine));say('Choo choo!');});
get('show').addEventListener('click',()=>{void sound.unlock();model.show();say(model.phase==='idle'?'You’re the driver again.':'Lights, gates… here comes your train!');updateControls();});
get('sound').addEventListener('click',()=>{model.muted=!model.muted;void sound.unlock();sound.update(model);updateControls();});
get('camera').addEventListener('click',()=>{model.settings.close=!model.settings.close;world?.resize();save();updateControls();});
for(const [id,key] of [['train-speed','trainSpeed'],['light-speed','lightSpeed'],['gate-speed','gateSpeed']] as const) {
  const range=get<HTMLInputElement>(id);range.addEventListener('input',()=>{const value=Number(range.value);model.settings[key]=value;range.setAttribute('aria-valuetext',`${value.toFixed(1)} times normal speed`);range.parentElement!.querySelector('output')!.textContent=`${value.toFixed(1)}×`;save();});
}
for(const key of ['music','gentle','steady','repeat','text'] as const)get<HTMLInputElement>(key).addEventListener('change',event=>{model.settings[key]=(event.target as HTMLInputElement).checked;save();updateControls();});
get<HTMLInputElement>('volume').addEventListener('input',event=>{model.settings.volume=Number((event.target as HTMLInputElement).value)/100;get('volume-value').textContent=`${Math.round(model.settings.volume*100)}%`;save();});
get('volume-value').textContent=`${Math.round(model.settings.volume*100)}%`;
function closeSettings(){dialog.close();model.suspended=document.hidden;get('settings').focus();}
get('settings').addEventListener('click',()=>{model.suspended=true;sound.update(model);dialog.showModal();});
get('close-settings').addEventListener('click',closeSettings);get('back').addEventListener('click',closeSettings);
dialog.addEventListener('close',()=>{model.suspended=document.hidden;});
document.addEventListener('visibilitychange',()=>{model.suspended=document.hidden||dialog.open;sound.update(model);});
get('retry').addEventListener('click',()=>location.reload());
function failure(){get('loading').hidden=true;get('unavailable').hidden=false;model.suspended=true;sound.update(model);}
try {
  world=new TrainWorld(get('world'),model,action,failure);
  world.onFrame=dt=>{model.step(dt);sound.update(model);updateControls();};
  get('loading').hidden=true;
} catch(error) {console.error('The 3D renderer could not start.',error);failure();}
updateControls();setTimeout(()=>get('scene-message').classList.add('quiet'),5000);
