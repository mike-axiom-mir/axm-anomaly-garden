const assert = require('assert');
const { GardenSimulation } = require('../src/v16.js');
const { WorldRenderer } = require('../src/world-renderer.js');
// Minimal DOM for node identity and projection invariants; no pixel claims.
class Element {
  constructor() { this.children=[];this.dataset={};this.style={setProperty(k,v){this[k]=v}};this.attributes={};this.listeners={}; }
  appendChild(el){this.children.push(el);el.parent=this;}
  replaceChildren(){this.children=[];}
  remove(){this.parent.children=this.parent.children.filter(el=>el!==this);}
  addEventListener(type,fn){this.listeners[type]=fn;}
  setAttribute(k,v){this.attributes[k]=v;}
}
global.document={createElement:()=>new Element()};
const sim=new GardenSimulation({seed:'animation-regression'});
const world=new Element();let selected;
const renderer=new WorldRenderer(world,id=>selected=id);
const state=sim.serialize();renderer.render(sim,null);renderer.render(sim,null);
assert.equal(sim.serialize(),state,'rendering must preserve full canonical state');
const first=renderer.nodes.get('agent:'+sim.agents[0].id);
first.listeners.click();assert.equal(selected,sim.agents[0].id);
sim.run(1);renderer.render(sim,selected);assert.strictEqual(renderer.nodes.get('agent:'+selected),first);
assert.equal(first.attributes['aria-pressed'],'true');
const anomaly=sim.addAnomaly('loop-echo',{ttl:1});renderer.render(sim,selected);
assert(renderer.nodes.has('anomaly:'+anomaly.id));sim.run(2);renderer.render(sim,selected);assert(!renderer.nodes.has('anomaly:'+anomaly.id));
const checkpoint=sim.createCheckpoint('animation');sim.run(10);renderer.render(sim,selected);sim.rewindToCheckpoint(checkpoint.id);renderer.render(sim,selected);
assert.notStrictEqual(renderer.nodes.get('agent:'+selected),first,'rewind must reset projection');
const restored=GardenSimulation.deserialize(sim.serialize());renderer.render(restored,selected);
assert.equal(world.children.length,renderer.nodes.size,'reset leaves no orphaned markers');
const saved=restored.serialize();for(let i=0;i<20;i++)renderer.render(restored,selected);assert.equal(restored.serialize(),saved);
delete global.document;
console.log('World renderer regression: PASS (purity, identity, selection, expiry, rewind, restore)');
