const assert=require('node:assert/strict');
const {GardenSimulation}=require('../src/v16');
const {project}=require('../src/city-projection');
const {changes}=require('../src/city-signals');

const sim=new GardenSimulation({seed:'living-city-proof',repairPolicy:'aggressive',config:{subworldInvestigationPeriod:2}});
const planted=sim.plantCompletionScenario();
let outer=project(sim,'outer');
sim.addAnomaly('loop-echo',{x:sim.repairNodes[0].x,y:sim.repairNodes[0].y,intensity:.95,radius:2.4,ttl:30});
let next=project(sim,'outer');
const observed=new Set(changes(outer,next).map(change=>change.kind));
outer=next;
const layers=new Map([planted.child.id,planted.grandchild.id].map(id=>[id,project(sim,id)]));
let movements=0;
for(let tick=0;tick<60;tick++){
  sim.step();
  next=project(sim,'outer');
  for(const change of changes(outer,next))observed.add(change.kind);
  for(const person of next.people){const old=outer.people.find(item=>item.id===person.id);if(old&&(old.x!==person.x||old.y!==person.y))movements++;}
  outer=next;
  for(const [id,previous] of layers){const current=project(sim,id);for(const change of changes(previous,current))observed.add(change.kind);layers.set(id,current);}
}
assert(movements>20,'inhabitants should visibly change recorded cells');
for(const kind of ['glitch','repair','stabilize','inquiry','break','test','memory','replicate','institution'])assert(observed.has(kind),'missing real visual signal '+kind);
assert(sim.worldIntegrityReport().pass);
const restored=GardenSimulation.deserialize(sim.serialize());
assert.deepEqual(project(restored,'outer'),project(sim,'outer'));
console.log('Living city integration: PASS (movement, glitch, repair, inquiry, model break, tests, memory, replication, institution, restore)');
