(function (root) {
  'use strict';

  const hash = value => {
    let n = 2166136261;
    for (const c of String(value)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return n >>> 0;
  };
  const copyPoint = value => value && Number.isFinite(value.x) && Number.isFinite(value.y) ? { x:value.x, y:value.y } : null;

  function personView(person, nested) {
    const activity = nested ? (person.investigating ? 'investigate' : person.occupation || 'resident') : (person.currentActivity || 'resident');
    return {
      id:person.id, name:person.name, x:person.x, y:person.y,
      role:person.role || person.occupation || 'resident', activity,
      plannedActivity:person.plannedActivity || person.occupation || 'resident',
      awakened:!!(person.awakened || person.modelBreak), investigating:!!person.investigating,
      hypothesis:person.hypothesis, observation:person.lastObservation || '',
      memories:(person.memory || []).length, discrepancy:Number(person.discrepancy || 0),
      confidence:Number(person.confidence == null ? 1 : person.confidence),
      energy:Number(person.energy == null ? 1 : person.energy), hunger:Number(person.hunger || 0),
      socialNeed:Number(person.socialNeed || 0), credits:Number(person.credits || 0),
      home:copyPoint(person.home), target:copyPoint(person.routineTarget),
      tests:Number(person.testsRun || person.experimentCount || 0), observations:Number(person.observations || 0),
      project:person.project ? { kind:person.project.kind, progress:Number(person.project.progress || 0), completions:Number(person.project.completions || 0) } : null,
      inventory:person.inventory ? { food:Number(person.inventory.food || 0) } : null,
      institutionId:person.institutionId || null
    };
  }

  // Read-only realization: copy only fields the scene consumes. No RNG, audits or engine methods.
  function project(sim, layer) {
    const zone = (sim.modalZones || []).find(z => z.id === layer && z.active && z.subworld);
    const sw = zone && zone.subworld;
    const people = (sw ? sw.residents : sim.agents).map(a => personView(a, !!sw));
    const places = (sw ? [] : sim.places).map(p => ({
      id:p.id, name:p.name, x:p.x, y:p.y, type:p.type, resource:p.resource,
      stock:Number(p.stock || 0), produced:Number(p.produced || 0), consumed:Number(p.consumed || 0)
    }));
    const buildings = places.map(p => ({ ...p, height:p.id.includes('observatory') ? 112 : p.type === 'work' ? 70 : 38 }));
    const homes = new Set();
    for (const person of people) {
      const source = sw ? sw.residents.find(r => r.id === person.id) : person.home;
      if (!source) continue;
      const x = sw ? source.baseX : source.x, y = sw ? source.baseY : source.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const key = x + ',' + y;
      if (homes.has(key) || places.some(p => p.x === x && p.y === y)) continue;
      homes.add(key);
      buildings.push({ id:'building:' + key, x, y, name:sw ? 'Local pavilion' : 'Residence', type:'home', height:32 + hash(key + ':' + (zone ? zone.id : 'outer')) % 54, stock:0, produced:0, consumed:0 });
    }
    const portals = (sw ? [] : sim.modalZones.filter(z => z.active)).map(z => ({ id:z.id, x:z.x, y:z.y, depth:z.depth || 0, iteration:z.iteration, enterable:!!z.subworld }));
    const gates = (sim.subworldGates || []).filter(g => g.active && zone && (g.from.modalId === zone.id || g.to.modalId === zone.id)).map(g => {
      const from = g.from.modalId === zone.id, end = from ? g.from : g.to;
      return { id:g.id, x:end.x, y:end.y, destination:from ? g.to.modalId : g.from.modalId, enterable:true, gate:true };
    });
    const positions = new Map(people.map(a => [a.id, a]));
    const relationships = (sw ? [] : sim.relationships || []).map(r => {
      const a = positions.get(r.a), b = positions.get(r.b);
      return { id:r.id, a:r.a, b:r.b, trust:Number(r.trust || 0), familiarity:Number(r.familiarity || 0), meetings:Number(r.meetings || 0), signals:Number(r.signals || 0), x:a && b ? (a.x + b.x) / 2 : 0, y:a && b ? (a.y + b.y) / 2 : 0 };
    });
    const institutions = (sw ? sw.institutions || [] : sim.institutions || []).map((institution, index) => {
      const place = !sw && places.find(p => p.id === institution.placeId);
      return { id:institution.id, name:institution.name, x:place ? place.x : Math.floor((sw.width - 1) / 2), y:place ? place.y : Math.floor((sw.height - 1) / 2), narrative:institution.narrative || institution.reports?.at(-1)?.narrative || 'forming', reports:(institution.reports || []).length, broadcasts:Number(institution.broadcasts || 0), index };
    });
    const anomalies = (sw ? sw.anomalies : sim.anomalies).filter(a => a.active).map(a => ({ id:a.id, x:a.x, y:a.y, kind:a.kind, intensity:Number(a.intensity || 0), radius:Number(a.radius || 1) }));
    const programs = (sw ? sw.programs : sim.machinePrograms || []).filter(p => p.active || p.quarantined).map(p => ({ id:p.id, x:p.x, y:p.y, kind:p.kind || 'replicator', role:p.role, quarantined:!!p.quarantined, actions:Number(p.actions || 0), generation:Number(p.generation || 0), copies:Number(p.copies || 0), parentId:p.parentId || null, knownTargets:(p.knownTargets || []).length }));
    const depth = zone ? Number(zone.depth || 0) : 0, tick = sw ? sw.tick : sim.tick, dayLength = Number(sim.config.dayLength || 48);
    return {
      key:zone ? zone.id : 'outer', title:zone ? 'SUBWORLD / ' + zone.id : 'THE CONSTRUCT', tick, outerTick:sim.tick,
      width:sw ? sw.width : sim.config.width, height:sw ? sw.height : sim.config.height, seed:sim.seedText,
      depth, iteration:zone ? Number(zone.iteration || 0) : 0, dayLength, dayPhase:(tick % dayLength) / dayLength,
      people, buildings, portals:portals.concat(gates), anomalies, programs,
      repairs:(sw ? [] : sim.repairNodes).map(r => ({ id:r.id, x:r.x, y:r.y, actions:Number(r.actions || 0), lastActionTick:Number(r.lastActionTick || -999) })),
      relationships, institutions,
      layers:sim.modalZones.filter(z => z.active && z.subworld).map(z => ({ id:z.id, depth:z.depth || 0 })),
      receipts:sim.receipts.slice(-12).map(r => ({ id:r.id, type:r.type, tick:r.tick }))
    };
  }

  const api = { project, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnomalyGardenCityProjection = api;
})(typeof window !== 'undefined' ? window : this);
