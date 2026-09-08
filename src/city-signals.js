(function(root){
  'use strict';
  // Differences between observed snapshots, never an inferred causal history.
  function changes(before,after){
    if(!before||before.key!==after.key||before.seed!==after.seed||after.tick<before.tick)return [];
    const result=[];
    const emit=(a,kind,label)=>result.push({id:a.id,kind,label,x:a.x,y:a.y,tick:after.tick});
    const people=new Map(before.people.map(a=>[a.id,a]));
    for(const a of after.people){const old=people.get(a.id);if(!old)continue;
      if(a.awakened&&!old.awakened)emit(a,'break','MODEL BREAK');
      else if(a.investigating&&!old.investigating)emit(a,'inquiry','INVESTIGATING');
    }
    for(const group of ['repairs','programs']){
      const previous=new Map(before[group].map(a=>[a.id,a]));
      for(const a of after[group]){const old=previous.get(a.id);if(!old)continue;
        if(a.quarantined&&!old.quarantined)emit(a,'quarantine','QUARANTINED');
        const delta=Number(a.actions)-Number(old.actions);
        if(Number.isFinite(delta)&&delta>0)emit(a,group==='repairs'?'repair':'program', '+'+delta+' '+(group==='repairs'?'REPAIR ACTIONS':'PROGRAM ACTIONS'));
      }
    }
    const anomalies=new Set(before.anomalies.map(a=>a.id));
    for(const a of after.anomalies)if(!anomalies.has(a.id))emit(a,'glitch','GLITCH APPEARED');
    return result;
  }
  const api={changes};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AnomalyGardenCitySignals=api;
})(typeof window!=='undefined'?window:this);
