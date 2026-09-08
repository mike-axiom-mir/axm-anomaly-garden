const assert=require('assert');
const {GardenSimulation}=require('../src/v16.js');
const {project}=require('../src/city-projection.js');
const sim=new GardenSimulation({seed:'city-view-proof'});
const planted=sim.plantCompletionScenario();
const before=sim.serialize();
const outer=project(sim,'outer');
assert.equal(outer.people.length,sim.agents.length);
assert.equal(outer.buildings.filter(b=>b.type!=='home').length,sim.places.length);
assert.equal(outer.portals.filter(p=>p.enterable).length,2);
for(const zone of sim.modalZones.filter(z=>z.subworld)){
  const view=project(sim,zone.id);
  assert.equal(view.key,zone.id);assert.equal(view.tick,zone.subworld.tick);
  assert.deepEqual(view.people.map(a=>[a.id,a.x,a.y]),zone.subworld.residents.map(a=>[a.id,a.x,a.y]));
  assert(view.portals.some(g=>g.gate),'actual cross-layer gate is visible');
}
assert.equal(sim.serialize(),before,'projection must not mutate canonical state');
outer.people[0].x=999;if(outer.people[0].home)outer.people[0].home.x=999;
assert.equal(sim.serialize(),before,'projection aliases canonical objects');
assert.equal(project(sim,'missing').key,'outer','missing layer falls back explicitly');
sim.run(12);const state=sim.serialize();for(let n=0;n<20;n++)project(sim,planted.child.id);assert.equal(sim.serialize(),state);
const restored=GardenSimulation.deserialize(state);assert.deepEqual(project(restored,'outer'),project(sim,'outer'));
console.log('City projection: PASS (purity, source coordinates, gates, isolation, fallback, restore)');
