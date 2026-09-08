(function(){
  'use strict';
  const shell=document.querySelector('main.shell');if(!shell)return;
  const stage=document.createElement('section');stage.className='city-stage';stage.setAttribute('aria-label','Animated Matrix world');
  stage.innerHTML=`
    <header class="city-heading"><div><p class="eyebrow">WORLDGLASS / LIVE WORLD</p><h2 id="city-title">The Construct</h2></div><div class="city-state"><span id="city-running">PAUSED</span><span id="city-clock">TICK 0</span></div></header>
    <div class="city-toolbar"><label>World <select id="city-layer" aria-label="World layer"><option value="outer">Outer world</option></select></label><div class="city-view-buttons"><button id="city-code" aria-pressed="false">Code view</button><button id="city-follow" aria-pressed="false">Follow resident</button><button id="city-fit">Fit world</button><button id="city-zoom-out" aria-label="Zoom out">−</button><button id="city-zoom-in" aria-label="Zoom in">+</button></div></div>
    <div class="city-viewport"><canvas id="city-canvas" tabindex="0" aria-label="Isometric simulation city. Drag to pan. Use the zoom buttons. Select residents with the resident menu below."></canvas><div class="city-overlay"><span id="city-layer-tag">OUTER WORLD</span><strong id="city-population">16 inhabitants</strong><span id="city-signals"></span></div><div class="city-view-notice" id="city-view-notice">Select a resident to follow their day.</div></div>
    <div class="city-dock"><div id="city-clock-controls" class="city-clock-controls"></div><div class="city-interventions"><button id="city-seed">Seed living worlds</button><label class="sr-only" for="city-disturbance">Disturbance</label><select id="city-disturbance"><option value="loop-echo">Loop echo</option><option value="gravity-slip">Gravity slip</option><option value="time-pocket">Time pocket</option><option value="memory-scar">Memory scar</option></select><button id="city-inject">Inject glitch</button></div><div id="city-motion-slot"></div></div>
    <div class="city-bottom"><section class="city-resident"><label for="city-person">Resident</label><select id="city-person"></select><div id="city-resident-detail"></div></section><section class="city-events"><p class="eyebrow">RECENT CAUSES</p><div id="city-events"></div></section></div>
    <p class="city-footnote">Position pulses mark observed changes: green glitches/repairs, amber investigation, purple model break, blue quarantine. City architecture and atmosphere express the model; they do not add simulation rules. Portals change your view. Resident transit remains an explicit gate action.</p>`;
  shell.prepend(stage);
  if(!stage.querySelector('canvas').getContext('2d')||typeof ResizeObserver==='undefined'){stage.remove();return;}
  // Preserve every original lab control, action and source of truth; change only their placement.
  const lab=document.createElement('details');lab.className='city-lab';const summary=document.createElement('summary');summary.textContent='Open laboratory · exact map, interventions, evidence and timelines';lab.append(summary);
  const sections=Array.from(shell.children).filter(el=>el!==stage&&el.tagName!=='FOOTER');for(const section of sections)lab.appendChild(section);shell.appendChild(lab);
  const footer=shell.querySelector('footer');if(footer)shell.appendChild(footer);
  for(const id of ['run','pause','step','step10'])document.getElementById('city-clock-controls').appendChild(document.getElementById(id));
  document.getElementById('run').textContent='▶ Run';document.getElementById('pause').textContent='Ⅱ Pause';
  const motion=document.getElementById('motion');const ml=document.createElement('label');ml.textContent='Motion ';ml.appendChild(motion);document.getElementById('city-motion-slot').appendChild(ml);
  const $=id=>document.getElementById(id);const canvas=$('city-canvas');
  let layer='outer',owner=null,snapshot=null,localSelection=null,optionsKey='',peopleKey='',lastRender='';
  const renderer=new window.AnomalyGardenCityRenderer(canvas,selectResident,enterLayer);
  if(!renderer.ctx){stage.remove();lab.open=true;return;}
  function selectResident(id){localSelection=id;renderer.selected=id;$('city-person').value=id;if(layer==='outer'){const person=Array.from(document.querySelectorAll('#world .person')).find(p=>p.dataset.entity==='agent:'+id);if(person)person.click();}readout();}
  function enterLayer(id){layer=id;localSelection=null;peopleKey='';renderer.resetCamera();update();$('city-view-notice').textContent=layer==='outer'?'Outer world. Select a resident to follow.':'Observing '+layer+'. Viewing a layer does not move a resident.';}
  function forward(id){const button=$(id);if(button)button.click();update();}
  function readout(){if(!snapshot)return;const a=snapshot.people.find(a=>a.id===localSelection);const detail=$('city-resident-detail');detail.replaceChildren();
    if(!a){detail.textContent='No resident selected in this world.';return;}
    const title=document.createElement('strong');title.textContent=a.name+' / '+a.role;
    const state=document.createElement('span');state.className=a.awakened?'state-break':a.investigating?'state-inquiry':'';state.textContent=a.awakened?'MODEL BREAK':a.investigating?'INVESTIGATING':a.activity.toUpperCase();
    const observation=document.createElement('p');observation.textContent=a.observation||a.hypothesis||'No observation recorded.';
    const meta=document.createElement('small');meta.textContent=a.memories+' memories · discrepancy '+a.discrepancy.toFixed(2)+' · cell '+a.x+', '+a.y;
    detail.append(title,state,observation,meta);
  }
  function update(){
    const sim=window.AnomalyGardenActiveSimulation;if(!sim)return;
    if(owner!==sim){owner=sim;layer='outer';localSelection=null;peopleKey='';optionsKey='';renderer.scene=null;}
    snapshot=window.AnomalyGardenCityProjection.project(sim,layer);if(snapshot.key!==layer){layer=snapshot.key;localSelection=null;peopleKey='';}
    renderer.running=document.body.classList.contains('running');renderer.reduced=motion.value==='reduced'||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setScene(snapshot);
    const key=snapshot.layers.map(z=>z.id).join('|');if(key!==optionsKey||!$('city-layer').options.length){optionsKey=key;$('city-layer').replaceChildren();for(const z of [{id:'outer',depth:0},...snapshot.layers]){const o=document.createElement('option');o.value=z.id;o.textContent=z.id==='outer'?'Outer world':z.id+' / depth '+z.depth;$('city-layer').appendChild(o);}}
    $('city-layer').value=layer;
    const pk=layer+':'+snapshot.people.map(a=>a.id).join('|');if(pk!==peopleKey){peopleKey=pk;$('city-person').replaceChildren();for(const a of snapshot.people){const o=document.createElement('option');o.value=a.id;o.textContent=a.name+' · '+a.role;$('city-person').appendChild(o);}if(!snapshot.people.some(a=>a.id===localSelection))localSelection=snapshot.people[0]?.id||null;}
    $('city-person').value=localSelection||'';renderer.selected=localSelection;
    $('city-title').textContent=layer==='outer'?'The Construct':layer;
    $('city-running').textContent=renderer.running?'RUNNING':'PAUSED';$('city-running').className=renderer.running?'live':'';
    $('city-clock').textContent='TICK '+snapshot.tick+(layer==='outer'?'':' / OUTER '+snapshot.outerTick);
    $('city-disturbance').disabled=layer!=='outer';$('city-inject').textContent=layer==='outer'?'Inject glitch':'Local glitch';
    $('city-layer-tag').textContent=layer==='outer'?'OUTER WORLD':'NESTED WORLD';$('city-population').textContent=snapshot.people.length+' inhabitants';
    $('city-signals').textContent=snapshot.anomalies.length+' glitches · '+snapshot.portals.length+' portals · '+snapshot.programs.filter(p=>p.quarantined).length+' quarantined';
    $('city-follow').setAttribute('aria-pressed',String(renderer.follow));
    const eventKey=snapshot.receipts.map(r=>r.id).join('|')+':'+layer;
    if(eventKey!==lastRender){lastRender=eventKey;$('city-events').replaceChildren();for(const r of snapshot.receipts.slice(-3).reverse()){const row=document.createElement('div');const time=document.createElement('span');time.textContent='T'+r.tick;const text=document.createElement('span');text.textContent=r.type;row.append(time,text);$('city-events').appendChild(row);}}
    const avg=renderer.frames.length?renderer.frames.reduce((a,b)=>a+b,0)/renderer.frames.length:0;canvas.dataset.drawMeanMs=avg.toFixed(2);canvas.dataset.drawSamples=String(renderer.frames.length);const sorted=renderer.cadence.slice().sort((a,b)=>a-b);canvas.dataset.frameIntervalP95Ms=sorted.length?sorted[Math.floor((sorted.length-1)*.95)].toFixed(2):'0';canvas.dataset.layer=layer;canvas.dataset.tick=String(snapshot.tick);
    readout();
  }
  $('city-layer').addEventListener('change',e=>enterLayer(e.target.value));
  $('city-person').addEventListener('change',e=>selectResident(e.target.value));
  $('city-code').addEventListener('click',()=>{renderer.mode=renderer.mode==='city'?'code':'city';$('city-code').setAttribute('aria-pressed',String(renderer.mode==='code'));$('city-code').textContent=renderer.mode==='code'?'City view':'Code view';});
  $('city-follow').addEventListener('click',()=>{renderer.follow=!renderer.follow;update();});
  $('city-fit').addEventListener('click',()=>{renderer.resetCamera();update();});
  $('city-zoom-in').addEventListener('click',()=>renderer.zoom=Math.min(2.5,renderer.zoom*1.2));
  $('city-zoom-out').addEventListener('click',()=>renderer.zoom=Math.max(.65,renderer.zoom/1.2));
  $('city-seed').addEventListener('click',()=>{forward('completion-plant');$('city-view-notice').textContent='Living worlds planted. Select a portal or choose a world above.';});
  $('city-inject').addEventListener('click',()=>{if(layer!=='outer'){const target=$('subworld-modal-select');target.value=layer;target.dispatchEvent(new Event('change'));forward('subworld-anomaly');$('city-view-notice').textContent='Local distortion injected in '+layer+'.';}else{document.querySelector('[data-anomaly="'+$('city-disturbance').value+'"]').click();$('city-view-notice').textContent='Glitch injected. Inhabitants must encounter it before they can react.';}update();});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','0'].includes(e.key)){e.preventDefault();renderer.follow=false;if(e.key==='ArrowLeft')renderer.pan.x-=30;if(e.key==='ArrowRight')renderer.pan.x+=30;if(e.key==='ArrowUp')renderer.pan.y-=30;if(e.key==='ArrowDown')renderer.pan.y+=30;if(e.key==='+')$('city-zoom-in').click();if(e.key==='-')$('city-zoom-out').click();if(e.key==='0')renderer.resetCamera();}});
  document.addEventListener('garden:refresh',update);document.addEventListener('click',update);document.addEventListener('change',update);
  const interval=setInterval(update,120);window.addEventListener('pagehide',()=>{clearInterval(interval);renderer.destroy();},{once:true});
  update();
})();
