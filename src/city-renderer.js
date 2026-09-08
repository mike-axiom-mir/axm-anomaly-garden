(function(root){
  'use strict';
  const {hash}=root.AnomalyGardenCityProjection;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  class CityRenderer {
    constructor(canvas,onSelect,onEnter){
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onSelect=onSelect;this.onEnter=onEnter;
      this.scene=null;this.previous=new Map();this.targets=new Map();this.selected=null;this.follow=false;
      this.mode='city';this.zoom=1;this.pan={x:0,y:0};this.hits=[];this.clock=0;this.running=false;this.reduced=false;this.frames=[];this.cadence=[];
      this.width=1200;this.height=650;this.last=0;this.changeAt=0;this.dead=false;
      this.resize=new ResizeObserver(entries=>{const r=entries[0].contentRect;this.width=r.width;this.height=r.height;const d=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);this.dpr=d;this.draw(performance.now());});
      this.resize.observe(canvas);
      let drag=null;
      canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,px:this.pan.x,py:this.pan.y,moved:false};canvas.setPointerCapture(e.pointerId);});
      canvas.addEventListener('pointermove',e=>{if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){this.follow=false;this.pan={x:drag.px+dx,y:drag.py+dy};}}});
      canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const r=canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;const hit=this.hits.filter(h=>Math.hypot(h.x-x,h.y-y)<h.radius).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];if(hit){if(hit.portal)this.onEnter(hit.id);else this.onSelect(hit.id);}}drag=null;});
      canvas.addEventListener('pointercancel',()=>{drag=null;});
      canvas.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();this.zoom=clamp(this.zoom*Math.exp(-e.deltaY*.001),.65,2.5);},{passive:false});
      this.loop=t=>{if(this.dead)return;if(!this.last||t-this.last>=31){const dt=this.last?Math.min(t-this.last,100):0;if(this.running&&!this.reduced&&!document.hidden)this.clock+=dt;if(this.last&&!document.hidden){this.cadence.push(t-this.last);if(this.cadence.length>120)this.cadence.shift();}this.last=t;if(!document.hidden){const begin=performance.now();this.draw(t);this.frames.push(performance.now()-begin);if(this.frames.length>120)this.frames.shift();}}this.frame=requestAnimationFrame(this.loop);};
      this.frame=requestAnimationFrame(this.loop);
    }
    setScene(scene){
      const reset=!this.scene||this.scene.key!==scene.key||this.scene.seed!==scene.seed||scene.tick<this.scene.tick;
      if(reset){this.previous.clear();this.targets.clear();this.pan={x:0,y:0};this.zoom=this.width<620?1.4:1;this.selected=null;this.clock=0;}
      if(reset||scene.tick!==this.scene.tick){
        const smooth=!reset&&scene.tick===this.scene.tick+1;
        const now=performance.now();
        const old=new Map(this.targets);
        this.targets=new Map();this.previous=new Map();
        const entities=scene.people.concat(scene.repairs,scene.programs);
        for(const e of entities){this.targets.set(e.id,{x:e.x,y:e.y});this.previous.set(e.id,smooth&&old.has(e.id)?old.get(e.id):{x:e.x,y:e.y});}
        this.changeAt=now;
      }
      this.scene=scene;
    }
    position(e,now){const a=this.previous.get(e.id)||e;const t=this.reduced?1:clamp((now-this.changeAt)/380,0,1);return {x:mix(a.x,e.x,t),y:mix(a.y,e.y,t),moving:Math.abs(a.x-e.x)+Math.abs(a.y-e.y)>0&&t<1,dx:e.x-a.x,dy:e.y-a.y};}
    point(x,y,z=0){return {x:this.ox+(x-y)*this.unit,y:this.oy+(x+y)*this.unit*.5-z*this.scale};}
    poly(points,fill,stroke){const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
    line(a,b,color,width=1){const c=this.ctx;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
    label(text,p,color='#b4d8c4',size=11){const c=this.ctx;c.font=`${size}px ui-monospace,monospace`;c.textAlign='center';c.fillStyle='#030a08cc';const w=c.measureText(text).width;c.fillRect(p.x-w/2-5,p.y-size-3,w+10,size+7);c.fillStyle=color;c.fillText(text,p.x,p.y);}
    box(x,y,w,d,height,accent,type){
      const c=this.ctx,code=this.mode==='code';
      const a=this.point(x,y),b=this.point(x+w,y),cc=this.point(x+w,y+d),dd=this.point(x,y+d);
      const A=this.point(x,y,height),B=this.point(x+w,y,height),C=this.point(x+w,y+d,height),D=this.point(x,y+d,height);
      this.poly([a,b,cc,dd],'#00000044');
      this.poly([b,cc,C,B],code?'#04150dee':'#122321',code?'#34734a':'#29423a');
      this.poly([dd,cc,C,D],code?'#061b12ee':'#1d302c',code?'#34734a':'#345448');
      this.poly([A,B,C,D],code?'#0d2e1d':'#2e4840',code?'#67c58a':'#517261');
      if(type==='park')return;
      const rows=Math.max(1,Math.floor(height/15));
      for(let j=0;j<rows;j++)for(let i=0;i<3;i++){
        const z=10+j*14;const u=(i+.18)/3,ww=w*.17;
        const color=code?'#4ce78388':((i+j)%4===0?'#10251d':accent);
        this.poly([this.point(x+w*u,y+d+.004,z),this.point(x+w*u+ww,y+d+.004,z),this.point(x+w*u+ww,y+d+.004,z+6),this.point(x+w*u,y+d+.004,z+6)],color);
        this.poly([this.point(x+w+.004,y+d*u,z),this.point(x+w+.004,y+d*u+d*.17,z),this.point(x+w+.004,y+d*u+d*.17,z+6),this.point(x+w+.004,y+d*u,z+6)],color);
      }
      // Rooftop equipment and antenna belong to the architectural realization, not agent state.
      const p=this.point(x+w*.5,y+d*.5,height);this.line(p,{x:p.x,y:p.y-10*this.scale},'#91b8a066');
      c.fillStyle=accent;c.fillRect(p.x-1,p.y-10*this.scale,2,2);
    }
    ground(){
      const s=this.scene,c=this.ctx;
      const a=this.point(-.6,-.6),b=this.point(s.width-.1,-.6),cc=this.point(s.width-.1,s.height-.1),d=this.point(-.6,s.height-.1);
      this.poly([d,cc,{x:cc.x,y:cc.y+20*this.scale},{x:d.x,y:d.y+20*this.scale}],'#0d2420','#365e48');
      this.poly([b,cc,{x:cc.x,y:cc.y+20*this.scale},{x:b.x,y:b.y+20*this.scale}],'#061713','#214431');
      this.poly([a,b,cc,d],this.mode==='code'?'#04140d':'#10221f','#3b6a50');
      for(let x=0;x<s.width;x++)for(let y=0;y<s.height;y++){
        const tile=[this.point(x-.45,y-.45),this.point(x+.45,y-.45),this.point(x+.45,y+.45),this.point(x-.45,y+.45)];
        this.poly(tile,(x+y)%2?'#102320':'#122622',this.mode==='code'?'#2c614044':'#3d685322');
      }
      // Canonical coordinates are street intersections; the visual buildings sit beside them.
      for(let x=0;x<s.width;x++)this.line(this.point(x,-.5),this.point(x,s.height-.25),'#071311',this.unit*.28);
      for(let y=0;y<s.height;y++)this.line(this.point(-.5,y),this.point(s.width-.25,y),'#081714',this.unit*.28);
      c.setLineDash([3*this.scale,8*this.scale]);
      for(let x=0;x<s.width;x++)this.line(this.point(x,-.5),this.point(x,s.height-.25),'#a7d89819');
      for(let y=0;y<s.height;y++)this.line(this.point(-.5,y),this.point(s.width-.25,y),'#a7d89819');
      c.setLineDash([]);
      for(const a of s.anomalies){const p=this.point(a.x,a.y);const r=(a.radius||1)*this.unit*.52;c.save();c.translate(p.x,p.y);c.scale(1,.5);const g=c.createRadialGradient(0,0,1,0,0,r);g.addColorStop(0,'#98ffa044');g.addColorStop(1,'#75ffba00');c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.restore();}
    }
    building(b){
      const x=b.x-.78,y=b.y-.78,c=this.ctx,k=this.scale;
      const color=b.type==='home'?'#b3d8a24d':'#beeaa377';
      const roof=(z,fill)=>this.poly([this.point(x-.05,y-.05,z),this.point(x+.65,y-.05,z),this.point(x+.65,y+.65,z),this.point(x-.05,y+.65,z)],fill,'#719b83');
      let top=b.height;
      if(b.name==='Park'){
        top=32;this.box(x,y,.57,.57,7,'#2f7849','park');
        for(let i=0;i<3;i++){const p=this.point(x+.12+i*.16,y+.25,20+i*3);this.line(p,{x:p.x,y:p.y+16*k},'#668863',3*k);c.fillStyle=i%2?'#508862':'#3c7453';c.beginPath();c.ellipse(p.x,p.y,8*k,11*k,0,0,Math.PI*2);c.fill();}
      }else if(b.name==='Observatory'){
        top=102;this.box(x,y,.58,.57,72,'#65ffc299');
        const p=this.point(x+.29,y+.29,72);c.fillStyle='#648e7a';c.strokeStyle='#b1d6bd';c.beginPath();c.ellipse(p.x,p.y,20*k,23*k,0,Math.PI,Math.PI*2);c.closePath();c.fill();c.stroke();
        this.line({x:p.x-4*k,y:p.y-17*k},{x:p.x+24*k,y:p.y-32*k},'#c3dfce',5*k);
      }else if(b.name==='Market'||b.name==='Cafe'){
        top=34;this.box(x,y,.58,.57,22,color);roof(27,'#718c62');
        for(let i=0;i<5;i++)this.poly([this.point(x+i*.12,y+.57,27),this.point(x+(i+1)*.12,y+.57,27),this.point(x+(i+1)*.12,y+.73,22),this.point(x+i*.12,y+.73,22)],i%2?'#b5c896':'#345d48');
        if(b.name==='Cafe'){const p=this.point(x+.8,y+.35,8);c.fillStyle='#b6c7a0';c.beginPath();c.ellipse(p.x,p.y,7*k,3*k,0,0,Math.PI*2);c.fill();this.line(p,this.point(x+.8,y+.35),'#79957e',2*k);}
      }else if(b.name==='Station'){
        top=43;this.box(x,y,.58,.57,9,color);
        for(const dx of [0,.56])for(const dy of [0,.56])this.line(this.point(x+dx,y+dy,9),this.point(x+dx,y+dy,36),'#a4c4ac',2*k);
        roof(36,'#3e6858');roof(40,'#507c66');
        this.line(this.point(x,y+.22,10),this.point(x+.58,y+.22,10),'#d2dbc1',2*k);
      }else if(b.name==='Workshop'||b.name==='Repair Depot'){
        top=62;this.box(x,y,.58,.57,38,color);
        for(let i=0;i<3;i++)this.box(x+i*.18,y,.15,.57,44+i%2*7,'#83a98d','park');
        this.box(x+.38,y+.1,.12,.12,60,'#94c8aa','park');
      }else this.box(x,y,.58,.57,b.height,color);
      if(b.type!=='home')this.label(b.name.toUpperCase(),this.point(x+.3,y+.57,top+8),'#d6f0b9',Math.max(9,10*k));
      const lamp=this.point(b.x-.18,b.y+.16,25);this.line(lamp,this.point(b.x-.18,b.y+.16),'#688c7966',1.5*k);c.fillStyle='#b5f3b6';c.shadowColor='#91ffc1';c.shadowBlur=7;c.fillRect(lamp.x-2,lamp.y-2,4,2);c.shadowBlur=0;
    }
    tracking(now){
      const a=this.scene.people.find(p=>p.id===this.selected);if(!a)return;
      const q=this.position(a,now),p=this.point(q.x,q.y),k=Math.max(.7,this.scale),c=this.ctx;
      // A screen-space locator stays visible over foreground architecture; it is not another inhabitant.
      const peers=this.scene.people.filter(v=>v.x===a.x&&v.y===a.y);
      p.x+=(peers.findIndex(v=>v.id===a.id)-(peers.length-1)/2)*7*k;
      c.save();c.setLineDash([2,4]);this.line(p,{x:p.x,y:p.y-48*k},'#bcffcc99');c.setLineDash([]);
      c.strokeStyle='#d0ffdc';c.lineWidth=1.5;c.beginPath();c.ellipse(p.x,p.y,12*k,5*k,0,0,Math.PI*2);c.stroke();
      this.label((this.mode==='code'?a.id:a.name)+' · '+a.activity,{x:p.x,y:p.y-51*k},'#d0ffdc',11);c.restore();
    }
    person(a,now){
      const c=this.ctx,p0=this.position(a,now),p=this.point(p0.x,p0.y);const k=Math.max(.7,this.scale);
      const selected=a.id===this.selected;const hue=a.awakened?'#c7a0ff':a.investigating?'#edca83':'#94c3ac';
      const phase=this.clock*.018+(hash(a.id)%10),stride=p0.moving&&!this.reduced?Math.sin(phase)*3:0;
      // Small offsets separate collocated people without changing their simulated coordinates.
      const peers=this.scene.people.filter(q=>q.x===a.x&&q.y===a.y);const idx=peers.findIndex(q=>q.id===a.id);
      p.x+=(idx-(peers.length-1)/2)*7*k;
      c.save();c.translate(p.x,p.y);c.scale(k,k);
      c.fillStyle='#0008';c.beginPath();c.ellipse(0,1,8,3,0,0,Math.PI*2);c.fill();
      if(selected){c.strokeStyle='#bafbd5';c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,12,5,0,0,Math.PI*2);c.stroke();}
      this.line({x:-2,y:-8},{x:-3+stride,y:0},'#a8caba',2.2);this.line({x:2,y:-8},{x:3-stride,y:0},'#7d998d',2.2);
      c.fillStyle=a.awakened?'#574169':a.investigating?'#5e5741':'#233e34';c.beginPath();c.moveTo(-4,-17);c.lineTo(4,-17);c.lineTo(5+stride*.15,-7);c.lineTo(-5,-7);c.closePath();c.fill();
      this.line({x:-4,y:-15},{x:-6-stride*.4,y:-8},hue,1.7);this.line({x:4,y:-15},{x:6+stride*.4,y:-8},hue,1.7);
      c.fillStyle=hue;c.beginPath();c.arc(0,-21,3.2,0,Math.PI*2);c.fill();c.fillStyle='#12201c';c.fillRect(-3,-25,6,2);
      if(a.investigating||a.awakened){c.fillStyle=hue;c.font='11px monospace';c.textAlign='center';c.fillText(a.awakened?'◇':'?',0,-31);}
      c.restore();

      this.hits.push({id:a.id,x:p.x,y:p.y-12*k,radius:Math.max(16,15*k)});
      if(selected&&a.target&&this.mode==='code'){c.setLineDash([3,5]);this.line(p,this.point(a.target.x,a.target.y),'#99ffc655');c.setLineDash([]);}
    }
    portal(p){
      const c=this.ctx,anchor=this.point(p.x,p.y),k=this.scale,phase=this.clock*.001;const base={x:anchor.x,y:anchor.y-(p.depth||0)*52*k};if(p.depth)this.line(anchor,base,'#85ffbd33');const r=(p.gate?16:23)*k;
      c.save();c.translate(base.x,base.y-12*k);c.strokeStyle=p.gate?'#f4d69b':'#77ffd0';c.lineWidth=2*k;c.shadowBlur=12;c.shadowColor=c.strokeStyle;
      c.beginPath();c.ellipse(0,0,r*.62,r,0,0,Math.PI*2);c.stroke();c.shadowBlur=0;c.setLineDash([4,6]);c.lineDashOffset=-phase*10;c.beginPath();c.ellipse(0,0,r*.9,r*1.2,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
      for(let i=0;i<4;i++){const y=((phase*.4+i/4)%1)*r*1.4-r*.7;c.fillStyle='#89ffc533';c.fillRect(-r*.3,y,r*.6,2*k);}c.restore();
      this.label(p.gate?'GATE → '+p.destination:p.id.toUpperCase(),{x:base.x,y:base.y-r*1.6-8*k},'#9bdfc5',10);
      if(p.enterable)this.hits.push({id:p.gate?p.destination:p.id,portal:true,x:base.x,y:base.y-12*k,radius:r});
    }
    anomaly(a){
      const c=this.ctx,p=this.point(a.x,a.y),k=this.scale,t=this.clock*.001;const strength=Number(a.intensity||.5);
      c.save();c.translate(p.x,p.y);c.strokeStyle=a.kind==='memory-scar'?'#e2b875':'#81ffaf';c.lineWidth=1;
      for(let i=0;i<5;i++){const off=this.reduced?0:Math.sin(t*3+i)*4*k;c.fillStyle=`rgba(95,255,163,${.12+strength*.16})`;c.fillRect(-14*k+off,-i*8*k,28*k,2*k);}
      c.setLineDash([2,3]);c.beginPath();c.ellipse(0,0,22*k,11*k,0,0,Math.PI*2);c.stroke();c.restore();
      if(this.mode==='code')this.label(a.kind||'distortion',{x:p.x,y:p.y-48*k},'#abffd0',10);
    }
    program(a,now,repair){
      const p0=this.position(a,now),p=this.point(p0.x,p0.y),c=this.ctx,k=this.scale;const color=a.quarantined?'#8dabff':repair||a.kind==='security'?'#b4f3da':'#dcaf91';
      c.save();c.translate(p.x,p.y);c.fillStyle='#0008';c.beginPath();c.ellipse(0,0,10*k,4*k,0,0,Math.PI*2);c.fill();
      const bob=this.reduced?0:Math.sin(this.clock*.002+hash(a.id))*2*k;
      this.poly([{x:0,y:-24*k+bob},{x:8*k,y:-16*k+bob},{x:0,y:-8*k+bob},{x:-8*k,y:-16*k+bob}],'#182b25',color);
      this.line({x:0,y:-22*k+bob},{x:0,y:-10*k+bob},color);c.fillStyle=color;c.fillRect(-2*k,-18*k+bob,4*k,3*k);
      if(a.quarantined){c.strokeStyle='#7c9cf7';c.setLineDash([2,3]);c.strokeRect(-12*k,-29*k,24*k,30*k);c.setLineDash([]);}
      c.restore();
      if(this.mode==='code')this.label(a.quarantined?'QUARANTINED':repair?'REPAIR':a.role||a.kind,{x:p.x,y:p.y-35*k},color,9);
    }
    draw(now){
      if(!this.ctx||!this.scene||!this.width)return;
      const c=this.ctx,s=this.scene,w=this.width,h=this.height;c.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);c.clearRect(0,0,w,h);
      const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#020b09');bg.addColorStop(.5,'#081a14');bg.addColorStop(1,'#020908');c.fillStyle=bg;c.fillRect(0,0,w,h);
      // Distant architectural atmosphere is a presentation backdrop, never a second population.
      for(let i=0;i<40;i++){const n=hash(s.seed+':sky:'+i),ww=w/36,x=i*w/38,hh=40+n%140;c.fillStyle=i%2?'#10221d':'#0b1d17';c.fillRect(x,h*.35-hh,ww,hh);for(let j=0;j<6;j++){c.fillStyle='#719d5b17';c.fillRect(x+ww*.25,h*.35-hh+j*18,ww*.5,2);}}
      this.unit=Math.min(w/(s.width+s.height+1.5), (h-130)/(Math.max(s.width,s.height)*.72+3))*this.zoom;
      this.scale=this.unit/48;this.ox=w/2+(s.height-s.width)*this.unit/2+this.pan.x;this.oy=h*.46-(s.width+s.height)*this.unit*.13+this.pan.y;
      if(this.follow&&this.selected){const a=s.people.find(a=>a.id===this.selected);if(a){const p=this.position(a,now);this.ox=w*.5-(p.x-p.y)*this.unit;this.oy=h*.57-(p.x+p.y)*this.unit*.5;}}
      this.ground();this.hits=[];
      const drawables=[];
      s.buildings.forEach(b=>drawables.push({depth:b.x+b.y-.45,draw:()=>this.building(b)}));
      s.people.forEach(a=>{const p=this.position(a,now);drawables.push({depth:p.x+p.y,draw:()=>this.person(a,now)});});
      s.portals.forEach(p=>drawables.push({depth:p.x+p.y+.05,draw:()=>this.portal(p)}));
      s.anomalies.forEach(a=>drawables.push({depth:a.x+a.y,draw:()=>this.anomaly(a)}));
      s.programs.forEach(a=>drawables.push({depth:a.x+a.y,draw:()=>this.program(a,now,false)}));
      s.repairs.forEach(a=>drawables.push({depth:a.x+a.y,draw:()=>this.program(a,now,true)}));
      drawables.sort((a,b)=>a.depth-b.depth).forEach(d=>d.draw());
      if(this.mode==='code'){
        c.font='11px monospace';c.textAlign='left';for(let i=0;i<Math.ceil(w/24);i++){const n=hash(s.seed+':code:'+i);for(let j=0;j<6;j++){const y=(n%h+this.clock*.032+j*19)%h;c.fillStyle=j===5?'#b3ffc966':'#48b36d24';c.fillText(String((n+j+s.tick)%2),i*24,y);}}
      }else if(!this.reduced){c.strokeStyle='#aeffd010';for(let i=0;i<65;i++){const n=hash('rain:'+i),x=n%w,y=(n%h+this.clock*.12)%h;this.line({x,y},{x:x-2,y:y+9},'#a2ffc215');}}
      const vignette=c.createRadialGradient(w*.5,h*.5,h*.15,w*.5,h*.5,Math.max(w,h)*.7);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#010604bb');c.fillStyle=vignette;c.fillRect(0,0,w,h);
      this.tracking(now);
      c.fillStyle='#9ab7a9';c.font='11px ui-monospace,monospace';c.textAlign='left';c.fillText(w<620?'DRAG TO PAN · USE + / −':'DRAG TO PAN  /  CTRL + SCROLL TO ZOOM  /  SELECT A RESIDENT',20,h-20);
      if(w>=620){c.textAlign='right';c.fillText(this.mode==='code'?'CODE EXPRESSION':'CITY EXPRESSION',w-20,h-20);}
    }
    resetCamera(){this.pan={x:0,y:0};this.zoom=1;this.follow=false;}
    destroy(){this.dead=true;cancelAnimationFrame(this.frame);this.resize.disconnect();}
  }
  root.AnomalyGardenCityRenderer=CityRenderer;
})(window);
