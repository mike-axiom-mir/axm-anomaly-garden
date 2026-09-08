(function (root, factory) {
  const base = typeof module === 'object' && module.exports ? require('./v11.js') : root.AnomalyGardenSim;
  const api = factory(base);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AnomalyGardenSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (base) {
  'use strict';

  const Base = base.GardenSimulation;
  const hashSeed = base.hashSeed;
  const mulberry32 = base.mulberry32;
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round = (v, d) => Number(v.toFixed(d == null ? 3 : d));
  const pad = (n) => String(n).padStart(3, '0');
  const DIRS = [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]];
  const ROLES = {
    observer: ['observe'],
    warden: ['observe', 'quarantine-program'],
    repairer: ['observe', 'repair-anomaly'],
    custodian: ['observe', 'quarantine-program', 'repair-anomaly']
  };
  const DEFAULTS = {
    subworldWidth: 7, subworldHeight: 7, subworldPopulation: 4,
    subworldProgramCapacity: 16, subworldReplicationPeriod: 4,
    subworldSecuritySensorRadius: 2.5, subworldSecurityActionRadius: 1.5,
    subworldAnomalyRepairStep: 0.45
  };
  const METRICS = {
    subworldsInitialized: 0, subworldResidentObservations: 0,
    subworldResidentInvestigations: 0, subworldResidentModelBreaks: 0,
    subworldProgramCopies: 0, subworldProgramQuarantines: 0,
    subworldSecurityObservations: 0, subworldSecurityActions: 0,
    subworldSecurityBlocked: 0, subworldEvidenceLeaks: 0, subworldResets: 0
  };

  class GardenSimulation extends Base {
    constructor(options) {
      const opts = options || {};
      super(opts);
      this.version = '0.12.0';
      this.config = Object.assign({}, DEFAULTS, this.config, opts.config || {});
      this.metrics = Object.assign({}, METRICS, this.metrics || {});
      this._normalizeSubworlds();
      if (typeof window !== 'undefined') window.AnomalyGardenActiveSimulation = this;
    }

    _captureState(includeCheckpoints, includeArchive) {
      const state = super._captureState(includeCheckpoints, includeArchive);
      state.version = this.version;
      state.metrics = clone(this.metrics);
      return state;
    }

    _restoreState(state) {
      super._restoreState(state);
      this.version = '0.12.0';
      this.config = Object.assign({}, DEFAULTS, this.config, (state && state.config) || {});
      this.metrics = Object.assign({}, METRICS, this.metrics || {}, (state && state.metrics) || {});
      this._normalizeSubworlds();
    }

    static deserialize(text) {
      const parsed = typeof text === 'string' ? JSON.parse(text) : clone(text);
      if (!parsed || parsed.schema !== 'axm-anomaly-garden/state-v1' || !parsed.state) throw new Error('Unsupported Anomaly Garden state file');
      const sim = new GardenSimulation({ seed: parsed.state.seedText || 'imported' });
      sim._restoreState(parsed.state);
      return sim;
    }

    _float(parts) {
      return (hashSeed(parts.map((v) => String(v == null ? '-' : v)).join('|')) >>> 0) / 4294967296;
    }

    _normalizeSubworlds() {
      for (const zone of this.modalZones || []) {
        const sw = zone.subworld;
        if (!sw) continue;
        sw.schema = 'axm-nested-subworld-v1';
        sw.width = Math.max(3, Math.floor(Number(sw.width || this.config.subworldWidth)));
        sw.height = Math.max(3, Math.floor(Number(sw.height || this.config.subworldHeight)));
        sw.tick = Number(sw.tick || zone.localTick || 0);
        sw.residents = sw.residents || [];
        sw.anomalies = sw.anomalies || [];
        sw.programs = sw.programs || [];
        sw.baseline = sw.baseline || null;
        sw.lastSeenResetCount = Number(sw.lastSeenResetCount == null ? zone.lifetimeResets || 0 : sw.lastSeenResetCount);
        sw.nextResidentId = Number(sw.nextResidentId || sw.residents.length + 1);
        sw.nextAnomalyId = Number(sw.nextAnomalyId || sw.anomalies.length + 1);
        sw.nextProgramId = Number(sw.nextProgramId || sw.programs.length + 1);
        sw.metrics = Object.assign({
          residentObservations: 0, residentInvestigations: 0, residentModelBreaks: 0,
          programCopies: 0, programQuarantines: 0, securityObservations: 0,
          securityActions: 0, securityBlocked: 0, evidenceLeaks: 0, resets: 0
        }, sw.metrics || {});
        sw.residents.forEach((r) => {
          r.memory = r.memory || []; r.seenAnomalies = r.seenAnomalies || [];
          r.investigating = Boolean(r.investigating); r.modelBreak = Boolean(r.modelBreak);
        });
        sw.programs.forEach((p) => {
          p.quarantined = Boolean(p.quarantined); p.active = p.active !== false && !p.quarantined;
          p.knownTargets = p.knownTargets || []; p.capabilities = p.capabilities || []; p.actions = Number(p.actions || 0);
        });
      }
    }

    _zone(modalId) { return this._modalById(modalId); }
    _livingZone(modalId) { const z = this._zone(modalId); return z && z.subworld ? z : null; }
    _cell(value, limit, parts) { return Number.isInteger(value) ? clamp(value, 0, limit - 1) : Math.floor(this._float(parts) * limit); }
    _dist(a, b) { const x = Number(a.x||0)-Number(b.x||0), y = Number(a.y||0)-Number(b.y||0); return Math.sqrt(x*x+y*y); }
    _occupied(sw, x, y) { return sw.programs.some((p) => (p.active || p.quarantined) && p.x === x && p.y === y); }
    _refreshBaseline(zone) { zone.subworld.baseline = { residents: clone(zone.subworld.residents), anomalies: clone(zone.subworld.anomalies), programs: clone(zone.subworld.programs) }; }

    _resident(zone, sw, i) {
      const id = zone.id + '-resident-' + pad(sw.nextResidentId++);
      const x = this._cell(null, sw.width, [this.seed, zone.id, id, 'x']);
      const y = this._cell(null, sw.height, [this.seed, zone.id, id, 'y']);
      return {
        id, name: 'Local ' + (i + 1), x, y, baseX: x, baseY: y,
        curiosity: round(0.25 + this._float([this.seed, zone.id, id, 'curiosity']) * 0.7),
        skepticism: round(0.15 + this._float([this.seed, zone.id, id, 'skepticism']) * 0.7),
        confidence: round(0.78 + this._float([this.seed, zone.id, id, 'confidence']) * 0.2),
        discrepancy: 0, threshold: round(0.5 + this._float([this.seed, zone.id, id, 'threshold']) * 0.32),
        hypothesis: 'local-world-is-consistent', investigating: false, modelBreak: false,
        observations: 0, memory: [], seenAnomalies: []
      };
    }

    initializeModalSubworld(modalId, options) {
      const zone = this._zone(modalId);
      if (!zone || !zone.active || !zone.parentModalId) throw new Error('A living subworld requires an active nested Modal');
      if (zone.subworld) return zone.subworld;
      const opts = options || {};
      const sw = zone.subworld = {
        schema: 'axm-nested-subworld-v1',
        width: Math.max(3, Math.floor(Number(opts.width || this.config.subworldWidth))),
        height: Math.max(3, Math.floor(Number(opts.height || this.config.subworldHeight))),
        tick: Number(zone.localTick || 0), residents: [], anomalies: [], programs: [],
        baseline: null, lastSeenResetCount: Number(zone.lifetimeResets || 0),
        nextResidentId: 1, nextAnomalyId: 1, nextProgramId: 1,
        metrics: { residentObservations:0,residentInvestigations:0,residentModelBreaks:0,programCopies:0,programQuarantines:0,securityObservations:0,securityActions:0,securityBlocked:0,evidenceLeaks:0,resets:0 }
      };
      const n = clamp(Math.floor(Number(opts.population == null ? this.config.subworldPopulation : opts.population)), 0, 12);
      for (let i = 0; i < n; i++) sw.residents.push(this._resident(zone, sw, i));
      this._refreshBaseline(zone);
      this.metrics.subworldsInitialized += 1;
      const parent = this._modalCreationById.get(zone.id);
      const receipt = this._receipt('intervention.modal-subworld-initialized', {
        modalId: zone.id, parentModalId: zone.parentModalId, depth: zone.depth,
        width: sw.width, height: sw.height, residents: sw.residents.length
      }, parent ? [parent] : []);
      this._recordIntervention('modal-subworld', { modalId: zone.id, width: sw.width, height: sw.height, residents: sw.residents.length }, receipt.id);
      return sw;
    }

    seedSubworldAnomaly(modalId, kind, options) {
      const zone = this._livingZone(modalId); if (!zone) throw new Error('Initialize the nested Modal subworld first');
      const sw = zone.subworld, opts = options || {}, id = zone.id + '-anomaly-' + pad(sw.nextAnomalyId++);
      const anomaly = {
        id, kind: kind || 'local-distortion',
        x: this._cell(opts.x, sw.width, [this.seed, zone.id, id, 'x']),
        y: this._cell(opts.y, sw.height, [this.seed, zone.id, id, 'y']),
        radius: clamp(Number(opts.radius == null ? 1.6 : opts.radius), 0.5, Math.max(sw.width, sw.height)),
        intensity: clamp(Number(opts.intensity == null ? 0.8 : opts.intensity), 0.05, 1),
        ttl: Math.max(1, Math.floor(Number(opts.ttl || 24))), createdAtLocal: sw.tick,
        active: true, source: opts.source || 'subworld-intervention', creationReceiptId: null
      };
      sw.anomalies.push(anomaly);
      const receipt = this._receipt('intervention.subworld-anomaly-added', { modalId: zone.id, depth: zone.depth, anomaly: clone(anomaly) }, [this._modalCreationById.get(zone.id)].filter(Boolean));
      anomaly.creationReceiptId = receipt.id;
      this._recordIntervention('subworld-anomaly', { modalId: zone.id, anomaly: clone(anomaly) }, receipt.id);
      if (opts.persistAcrossResets !== false) this._refreshBaseline(zone);
      return anomaly;
    }

    _baseProgram(zone, sw, id, kind, x, y, opts) {
      return {
        id, kind, role:null, x, y, baseX:x, baseY:y, active:true, quarantined:false, quarantinedAt:null,
        authorization: opts.authorization || 'allowed', generation:Number(opts.generation||0), parentId:opts.parentId||null,
        createdAtLocal:sw.tick, copies:0, period:Math.max(2,Math.floor(Number(opts.period||this.config.subworldReplicationPeriod))),
        capabilities:[], knownTargets:[], sensorRadius:0, actionRadius:0, actions:0, creationReceiptId:null
      };
    }

    seedSubworldProgram(modalId, kind, options) {
      const zone = this._livingZone(modalId); if (!zone) throw new Error('Initialize the nested Modal subworld first');
      const sw = zone.subworld, opts = options || {}, id = zone.id + '-program-' + pad(sw.nextProgramId++);
      const x = this._cell(opts.x, sw.width, [this.seed, zone.id, id, 'x']), y = this._cell(opts.y, sw.height, [this.seed, zone.id, id, 'y']);
      if (this._occupied(sw, x, y)) throw new Error('Subworld program cell is occupied');
      const p = this._baseProgram(zone, sw, id, kind || 'service', x, y, opts); sw.programs.push(p);
      const receipt = this._receipt('intervention.subworld-program-seeded', { modalId:zone.id,depth:zone.depth,program:clone(p) }, [this._modalCreationById.get(zone.id)].filter(Boolean));
      p.creationReceiptId = receipt.id; this._recordIntervention('subworld-program', { modalId:zone.id,program:clone(p) }, receipt.id);
      if (opts.persistAcrossResets !== false) this._refreshBaseline(zone);
      return p;
    }

    deploySecurityProgram(modalId, role, options) {
      const zone = this._livingZone(modalId); if (!zone) throw new Error('Initialize the nested Modal subworld first');
      const sw = zone.subworld, opts = options || {}, caps = ROLES[role || 'observer']; if (!caps) throw new Error('Unknown security role: ' + role);
      const id = zone.id + '-security-' + pad(sw.nextProgramId++);
      const x = this._cell(opts.x, sw.width, [this.seed,zone.id,id,'x']), y = this._cell(opts.y, sw.height, [this.seed,zone.id,id,'y']);
      if (this._occupied(sw,x,y)) throw new Error('Subworld program cell is occupied');
      const p = this._baseProgram(zone, sw, id, 'security', x, y, { authorization:'system', period:2 });
      p.role = role || 'observer'; p.capabilities = caps.slice();
      p.sensorRadius = clamp(Number(opts.sensorRadius==null?this.config.subworldSecuritySensorRadius:opts.sensorRadius),0.5,10);
      p.actionRadius = clamp(Number(opts.actionRadius==null?this.config.subworldSecurityActionRadius:opts.actionRadius),0.5,10);
      sw.programs.push(p);
      const receipt = this._receipt('intervention.security-program-deployed', {
        modalId:zone.id, depth:zone.depth, programId:p.id, role:p.role, capabilities:p.capabilities.slice(),
        sensorRadius:p.sensorRadius, actionRadius:p.actionRadius, jurisdiction:{type:'modal-subworld',modalId:zone.id}
      }, [this._modalCreationById.get(zone.id)].filter(Boolean));
      p.creationReceiptId = receipt.id; this._recordIntervention('security-program', { modalId:zone.id,programId:p.id,role:p.role,capabilities:p.capabilities.slice() }, receipt.id);
      if (opts.persistAcrossResets !== false) this._refreshBaseline(zone);
      return p;
    }

    _security(programId) {
      for (const zone of this.modalZones || []) if (zone.subworld) {
        const p = zone.subworld.programs.find((x) => x.id === programId && x.kind === 'security');
        if (p) return { zone, sw:zone.subworld, program:p };
      }
      return null;
    }

    _blocked(sec, action, targetModalId, targetId, reason) {
      sec.sw.metrics.securityBlocked++; this.metrics.subworldSecurityBlocked++;
      return this._receipt('security.action-blocked', {
        securityProgramId:sec.program.id, role:sec.program.role, action,
        jurisdictionModalId:sec.zone.id, targetModalId, targetId, reason
      }, [sec.program.creationReceiptId].filter(Boolean));
    }

    securityAttempt(programId, action, targetModalId, targetId, targetType) {
      const sec = this._security(programId); if (!sec || !sec.program.active || sec.program.quarantined) return null;
      if (targetModalId !== sec.zone.id) return this._blocked(sec,action,targetModalId,targetId,'outside-jurisdiction');
      if (!sec.program.capabilities.includes(action)) return this._blocked(sec,action,targetModalId,targetId,'missing-capability');
      const type = targetType || (action === 'repair-anomaly' ? 'anomaly' : 'program');
      const target = type === 'anomaly' ? sec.sw.anomalies.find((x)=>x.id===targetId) : sec.sw.programs.find((x)=>x.id===targetId);
      if (!target) return this._blocked(sec,action,targetModalId,targetId,'target-not-found');
      if (!sec.program.knownTargets.includes(type+':'+targetId)) return this._blocked(sec,action,targetModalId,targetId,'target-not-observed');
      if (this._dist(sec.program,target) > sec.program.actionRadius) return this._blocked(sec,action,targetModalId,targetId,'outside-action-range');

      if (action === 'quarantine-program') {
        if (target.kind === 'security' || target.quarantined || !target.active) return this._blocked(sec,action,targetModalId,targetId,'target-not-quarantinable');
        target.active=false; target.quarantined=true; target.quarantinedAt=sec.sw.tick; sec.program.actions++;
        sec.sw.metrics.programQuarantines++; sec.sw.metrics.securityActions++; this.metrics.subworldProgramQuarantines++; this.metrics.subworldSecurityActions++;
        return this._receipt('security.program-quarantined', {
          modalId:sec.zone.id,securityProgramId:sec.program.id,targetProgramId:target.id,authorization:target.authorization,
          lineagePreserved:true,deletionCount:0,localTick:sec.sw.tick
        }, [sec.program.creationReceiptId,target.creationReceiptId].filter(Boolean));
      }
      if (action === 'repair-anomaly') {
        if (!target.active) return this._blocked(sec,action,targetModalId,targetId,'target-inactive');
        const before=target.intensity; target.intensity=round(clamp(target.intensity-this.config.subworldAnomalyRepairStep,0,1),4); if(target.intensity<=0.1)target.active=false;
        sec.program.actions++; sec.sw.metrics.securityActions++; this.metrics.subworldSecurityActions++;
        return this._receipt('security.anomaly-repaired', {
          modalId:sec.zone.id,securityProgramId:sec.program.id,anomalyId:target.id,intensityBefore:before,intensityAfter:target.intensity,activeAfter:target.active,localTick:sec.sw.tick
        }, [sec.program.creationReceiptId,target.creationReceiptId].filter(Boolean));
      }
      return this._blocked(sec,action,targetModalId,targetId,'unsupported-action');
    }

    _scan(zone, sw, p) {
      const candidates=[];
      sw.anomalies.forEach((a)=>{if(a.active&&this._dist(p,a)<=p.sensorRadius)candidates.push({type:'anomaly',id:a.id,target:a});});
      sw.programs.forEach((t)=>{if(t.id!==p.id&&t.kind!=='security'&&(t.active||t.quarantined)&&this._dist(p,t)<=p.sensorRadius)candidates.push({type:'program',id:t.id,target:t});});
      candidates.sort((a,b)=>this._dist(p,a.target)-this._dist(p,b.target)||a.id.localeCompare(b.id));
      for(const c of candidates){
        const key=c.type+':'+c.id;
        if(!p.knownTargets.includes(key)){
          p.knownTargets.push(key);sw.metrics.securityObservations++;this.metrics.subworldSecurityObservations++;
          this._receipt('security.observed-target',{modalId:zone.id,securityProgramId:p.id,targetType:c.type,targetId:c.id,localTick:sw.tick,sensorRadius:p.sensorRadius},[p.creationReceiptId,c.target.creationReceiptId].filter(Boolean));
        }
        if(c.type==='program'&&c.target.active&&c.target.authorization==='denied'&&p.capabilities.includes('quarantine-program')) this.securityAttempt(p.id,'quarantine-program',zone.id,c.id,'program');
        if(c.type==='anomaly'&&c.target.active&&p.capabilities.includes('repair-anomaly')) this.securityAttempt(p.id,'repair-anomaly',zone.id,c.id,'anomaly');
      }
    }

    _patrol(zone, sw, p) {
      const d=DIRS[(hashSeed([this.seed,zone.id,p.id,sw.tick,'patrol'].join('|'))>>>0)%DIRS.length], x=clamp(p.x+d[0],0,sw.width-1), y=clamp(p.y+d[1],0,sw.height-1);
      if(!this._occupied(sw,x,y)){p.x=x;p.y=y;}
    }

    _replicate(zone, sw, parent) {
      if(!parent.active||parent.quarantined||parent.kind!=='replicator'||sw.tick<=0||(sw.tick+parent.generation)%parent.period!==0)return;
      if(sw.programs.filter((p)=>p.active&&!p.quarantined).length>=this.config.subworldProgramCapacity)return;
      const off=(hashSeed([this.seed,zone.id,parent.id,sw.tick,'replicate'].join('|'))>>>0)%DIRS.length; let cell=null;
      for(let i=0;i<DIRS.length;i++){const d=DIRS[(off+i)%DIRS.length],x=parent.x+d[0],y=parent.y+d[1];if(x>=0&&y>=0&&x<sw.width&&y<sw.height&&!this._occupied(sw,x,y)){cell={x,y};break;}}
      if(!cell)return;
      const id=zone.id+'-program-'+pad(sw.nextProgramId++), child=this._baseProgram(zone,sw,id,'replicator',cell.x,cell.y,{authorization:parent.authorization,generation:parent.generation+1,parentId:parent.id,period:parent.period});
      sw.programs.push(child);parent.copies++;sw.metrics.programCopies++;this.metrics.subworldProgramCopies++;
      const r=this._receipt('subworld.program-copied',{modalId:zone.id,parentProgramId:parent.id,childProgramId:child.id,generation:child.generation,authorization:child.authorization,locallyValid:true,localTick:sw.tick},[parent.creationReceiptId].filter(Boolean));
      child.creationReceiptId=r.id;
    }

    _moveResident(zone, sw, r) {
      const d=DIRS[(hashSeed([this.seed,zone.id,r.id,sw.tick,'resident-motion'].join('|'))>>>0)%DIRS.length];
      r.x=clamp(r.x+d[0],0,sw.width-1);r.y=clamp(r.y+d[1],0,sw.height-1);
    }

    _observeResident(zone, sw, r) {
      for(const a of sw.anomalies){
        if(!a.active||r.seenAnomalies.includes(a.id)||this._dist(r,a)>a.radius+0.75)continue;
        const chance=clamp(a.intensity*(0.72+r.curiosity*0.28-r.skepticism*0.08),0.08,0.98);
        if(this._float([this.seed,zone.id,r.id,a.id,sw.tick,'observe'])>=chance)continue;
        r.seenAnomalies.push(a.id);r.observations++;r.discrepancy=round(clamp(r.discrepancy+0.18+a.intensity*0.24+r.curiosity*0.08,0,1.5),4);
        const ev=this._receipt('subworld.inhabitant-observed-anomaly',{modalId:zone.id,depth:zone.depth,residentId:r.id,anomalyId:a.id,kind:a.kind,localTick:sw.tick,discrepancyAfter:r.discrepancy},[a.creationReceiptId].filter(Boolean));
        r.memory.push({localTick:sw.tick,receiptId:ev.id,summary:'observed '+a.kind});sw.metrics.residentObservations++;this.metrics.subworldResidentObservations++;
        if(!r.investigating&&r.discrepancy>=r.threshold){r.investigating=true;sw.metrics.residentInvestigations++;this.metrics.subworldResidentInvestigations++;this._receipt('subworld.inhabitant-started-investigation',{modalId:zone.id,residentId:r.id,localTick:sw.tick,discrepancy:r.discrepancy,threshold:r.threshold},[ev.id]);}
        if(!r.modelBreak&&r.investigating&&r.memory.length>=2&&r.discrepancy>=0.72){r.modelBreak=true;r.hypothesis='local-world-model-is-incomplete';sw.metrics.residentModelBreaks++;this.metrics.subworldResidentModelBreaks++;this._receipt('subworld.inhabitant-model-break',{modalId:zone.id,residentId:r.id,localTick:sw.tick,hypothesis:r.hypothesis,evidenceCount:r.memory.length},r.memory.slice(-4).map((x)=>x.receiptId));}
      }
    }

    _resetReceipt(zone) {
      for(let i=this.receipts.length-1;i>=0;i--){const r=this.receipts[i];if(r.tick!==this.tick)break;if(r.type==='world.modal-reset'&&r.payload&&r.payload.modalId===zone.id)return r;}return null;
    }

    _leak(zone, sw, resetReceipt) {
      if(!zone.anchors||!zone.anchors.length)return;
      const evidence=sw.residents.filter((r)=>r.memory.length).sort((a,b)=>b.discrepancy-a.discrepancy||a.id.localeCompare(b.id));
      for(const r of evidence){
        if(this._float([this.seed,zone.id,r.id,zone.lifetimeResets,'subworld-leak'])>=Number(zone.memoryLeak||0))continue;
        const mem=r.memory[r.memory.length-1],anchor=zone.anchors[hashSeed([zone.id,r.id,zone.lifetimeResets,'anchor'].join('|'))%zone.anchors.length],agent=this._agentById.get(anchor.agentId);if(!agent)continue;
        agent.modalMemory[zone.id]=(agent.modalMemory[zone.id]||0)+1;agent.discrepancy=clamp(agent.discrepancy+0.06+r.curiosity*0.02,0,1.5);agent.lastObservation='a fragment survived from a living nested subworld';
        sw.metrics.evidenceLeaks++;this.metrics.subworldEvidenceLeaks++;
        const ev=this._receipt('inhabitant.modal-memory-leak',{modalId:zone.id,parentModalId:zone.parentModalId,depth:zone.depth,nested:true,subworld:true,sourceResidentId:r.id,sourceSubworldReceiptId:mem.receiptId,agentId:agent.id,lifetimeResets:zone.lifetimeResets,fragments:agent.modalMemory[zone.id]},[mem.receiptId,resetReceipt&&resetReceipt.id].filter(Boolean));
        this._remember(agent,ev.id,agent.lastObservation);
      }
    }

    _restoreLivingBaseline(zone) {
      const sw=zone.subworld;if(!sw||!sw.baseline)return;const reset=this._resetReceipt(zone);this._leak(zone,sw,reset);
      const counters=[sw.nextResidentId,sw.nextAnomalyId,sw.nextProgramId],b=clone(sw.baseline);
      sw.residents=b.residents||[];sw.anomalies=b.anomalies||[];sw.programs=b.programs||[];
      sw.nextResidentId=counters[0];sw.nextAnomalyId=counters[1];sw.nextProgramId=counters[2];sw.tick=Number(zone.localTick||0);sw.lastSeenResetCount=Number(zone.lifetimeResets||0);sw.metrics.resets++;this.metrics.subworldResets++;
      this._normalizeSubworlds();
      this._receipt('subworld.state-reset',{modalId:zone.id,depth:zone.depth,localTick:sw.tick,lifetimeResets:zone.lifetimeResets,residents:sw.residents.length,anomalies:sw.anomalies.length,programs:sw.programs.length,historyPreserved:true},[reset&&reset.id].filter(Boolean));
    }

    _processLivingSubworlds() {
      for(const zone of this.modalZones.filter((z)=>z.active&&z.parentModalId&&z.subworld)){
        const sw=zone.subworld;
        if(Number(zone.lifetimeResets||0)!==Number(sw.lastSeenResetCount||0)){this._restoreLivingBaseline(zone);continue;}
        sw.tick=Number(zone.localTick||0);
        sw.anomalies.forEach((a)=>{if(a.active&&sw.tick-a.createdAtLocal>=a.ttl)a.active=false;});
        sw.residents.forEach((r)=>{this._moveResident(zone,sw,r);this._observeResident(zone,sw,r);});
        sw.programs.filter((p)=>p.kind==='replicator'&&p.active&&!p.quarantined).slice().forEach((p)=>this._replicate(zone,sw,p));
        const security=sw.programs.filter((p)=>p.kind==='security'&&p.active&&!p.quarantined).slice();
        security.forEach((p)=>this._scan(zone,sw,p));security.forEach((p)=>this._patrol(zone,sw,p));
      }
    }

    step() { super.step(); this._processLivingSubworlds(); return this.snapshot(); }

    subworldSummary(modalId) {
      const zone=this._livingZone(modalId);if(!zone)return null;const sw=zone.subworld;
      return {
        modalId:zone.id,depth:zone.depth,tick:sw.tick,residents:sw.residents.length,
        residentInvestigating:sw.residents.filter((r)=>r.investigating&&!r.modelBreak).length,
        residentModelBreaks:sw.residents.filter((r)=>r.modelBreak).length,
        activeAnomalies:sw.anomalies.filter((a)=>a.active).length,
        activePrograms:sw.programs.filter((p)=>p.active&&!p.quarantined).length,
        quarantinedPrograms:sw.programs.filter((p)=>p.quarantined).length,
        securityPrograms:sw.programs.filter((p)=>p.kind==='security').map((p)=>({id:p.id,role:p.role,capabilities:p.capabilities.slice(),knownTargets:p.knownTargets.length,actions:p.actions,x:p.x,y:p.y})),
        metrics:clone(sw.metrics)
      };
    }

    modalTree() {
      const enrich=(nodes)=>nodes.map((n)=>{const z=this._zone(n.id),s=z&&z.subworld,r=Object.assign({},n);r.subworld=s?{initialized:true,residents:s.residents.length,activeAnomalies:s.anomalies.filter((a)=>a.active).length,activePrograms:s.programs.filter((p)=>p.active&&!p.quarantined).length,quarantinedPrograms:s.programs.filter((p)=>p.quarantined).length,securityPrograms:s.programs.filter((p)=>p.kind==='security').length,localTick:s.tick}:{initialized:false};r.children=enrich(n.children||[]);return r;});
      return enrich(super.modalTree());
    }

    stateFingerprint() {
      const parent=super.stateFingerprint(),subworlds=this.modalZones.filter((z)=>z.subworld).map((z)=>({modalId:z.id,depth:z.depth,subworld:z.subworld}));
      return hashSeed(JSON.stringify({parent,subworlds})).toString(16).padStart(8,'0');
    }

    snapshot() {
      const s=super.snapshot();s.version=this.version;s.modalTree=this.modalTree();s.subworlds=this.modalZones.filter((z)=>z.subworld).map((z)=>this.subworldSummary(z.id));s.fingerprint=this.stateFingerprint();return s;
    }
  }

  return { GardenSimulation, DEFAULT_CONFIG: Object.assign({}, base.DEFAULT_CONFIG, DEFAULTS), hashSeed, mulberry32 };
});