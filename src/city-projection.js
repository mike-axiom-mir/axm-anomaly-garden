(function (root) {
  'use strict';
  const hash = value => { let n = 2166136261; for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };
  // Read-only realization: copy only fields the scene consumes. No RNG, audits or engine methods.
  function project(sim, layer) {
    const zone = (sim.modalZones || []).find(z => z.id === layer && z.active && z.subworld);
    const sw = zone && zone.subworld;
    const people = (sw ? sw.residents : sim.agents).map(a => ({
      id:a.id, name:a.name, x:a.x, y:a.y, role:a.role || a.occupation || 'resident',
      activity:a.currentActivity || a.occupation || 'resident', awakened:!!(a.awakened || a.modelBreak), investigating:!!a.investigating,
      hypothesis:a.hypothesis, observation:a.lastObservation || '', memories:(a.memory || []).length,
      discrepancy:Number(a.discrepancy || 0), energy:a.energy, home:a.home ? {...a.home} : null,
      target:a.routineTarget ? {...a.routineTarget} : null
    }));
    const places = (sw ? [] : sim.places).map(p=>({id:p.id,name:p.name,x:p.x,y:p.y,type:p.type,stock:p.stock}));
    const buildings = places.map(p=>({...p,height:p.id.includes('observatory')?112:p.type==='work'?70:38}));
    const homes = new Set();
    for(const a of people) {
      const home = a.home || (sw && (sw.residents.find(r=>r.id===a.id)));
      if(!home) continue;
      // Local residents have baseline coordinates rather than homes: render a local pavilion, not home ownership.
      const x = sw ? home.baseX : home.x, y = sw ? home.baseY : home.y;
      if(!Number.isFinite(x)||!Number.isFinite(y))continue;
      const key=x+','+y;
      if(homes.has(key)||places.some(p=>p.x===x&&p.y===y))continue;
      homes.add(key); buildings.push({id:'building:'+key,x,y,name:sw?'Local pavilion':'Residence',type:'home',height:32+hash(key)%54});
    }
    const portals=(sw ? [] : sim.modalZones.filter(z=>z.active)).map(z=>({id:z.id,x:z.x,y:z.y,depth:z.depth||0,iteration:z.iteration,enterable:!!z.subworld}));
    const gates=(sim.subworldGates||[]).filter(g=>g.active&&zone&&(g.from.modalId===zone.id||g.to.modalId===zone.id)).map(g=>{
      const from=g.from.modalId===zone.id;const end=from?g.from:g.to;return {id:g.id,x:end.x,y:end.y,destination:from?g.to.modalId:g.from.modalId,enterable:true,gate:true};
    });
    return {key:zone?zone.id:'outer',title:zone?'SUBWORLD / '+zone.id:'THE CONSTRUCT',tick:sw?sw.tick:sim.tick,outerTick:sim.tick,
      width:sw?sw.width:sim.config.width,height:sw?sw.height:sim.config.height,seed:sim.seedText,
      people,buildings,portals:portals.concat(gates),
      anomalies:(sw?sw.anomalies:sim.anomalies).filter(a=>a.active).map(a=>({id:a.id,x:a.x,y:a.y,kind:a.kind,intensity:a.intensity,radius:a.radius})),
      programs:(sw?sw.programs:sim.machinePrograms||[]).filter(p=>p.active||p.quarantined).map(p=>({id:p.id,x:p.x,y:p.y,kind:p.kind||'replicator',role:p.role,quarantined:!!p.quarantined,actions:p.actions||0})),
      repairs:(sw?[]:sim.repairNodes).map(r=>({id:r.id,x:r.x,y:r.y,actions:r.actions})),
      layers:sim.modalZones.filter(z=>z.active&&z.subworld).map(z=>({id:z.id,depth:z.depth||0})),
      receipts:sim.receipts.slice(-4).map(r=>({id:r.id,type:r.type,tick:r.tick}))};
  }
  const api={project,hash}; if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AnomalyGardenCityProjection=api;
})(typeof window!=='undefined'?window:this);
