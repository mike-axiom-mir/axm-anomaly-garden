const { GardenSimulation } = require('../src/v12.js');

const seeds = Math.max(1, Number(process.argv[2] || 12));
const ticks = Math.max(1, Number(process.argv[3] || 35));

function build(seed, security) {
  const sim = new GardenSimulation({ seed });
  const root = sim.addModal({ x: 5, y: 4, radius: 3.5, period: 30, memoryLeak: 0.45 });
  const child = sim.addNestedModal(root.id, { x: 5, y: 4, radius: 1.7, period: 17, memoryLeak: 0.5 });
  sim.initializeModalSubworld(child.id, { population: 4, width: 7, height: 7 });
  sim.seedSubworldAnomaly(child.id, 'local-distortion', { x: 3, y: 3, radius: 3.2, intensity: 0.95, ttl: 40 });
  sim.seedSubworldProgram(child.id, 'replicator', { x: 5, y: 5, authorization: 'denied', period: 3 });
  if (security) {
    sim.deploySecurityProgram(child.id, 'warden', { x: 4, y: 5, sensorRadius: 3.5, actionRadius: 2.5 });
    sim.deploySecurityProgram(child.id, 'repairer', { x: 2, y: 3, sensorRadius: 3.5, actionRadius: 2.5 });
  }
  sim.run(ticks);
  const sw = child.subworld;
  return {
    activePrograms: sw.programs.filter((p) => p.active && !p.quarantined).length,
    quarantinedPrograms: sw.programs.filter((p) => p.quarantined).length,
    activeAnomalies: sw.anomalies.filter((a) => a.active).length,
    localCopies: sim.metrics.subworldProgramCopies || 0,
    localObservations: sim.metrics.subworldResidentObservations || 0,
    localInvestigations: sim.metrics.subworldResidentInvestigations || 0,
    localModelBreaks: sim.metrics.subworldResidentModelBreaks || 0,
    securityObservations: sim.metrics.subworldSecurityObservations || 0,
    securityActions: sim.metrics.subworldSecurityActions || 0,
    securityBlocked: sim.metrics.subworldSecurityBlocked || 0,
    evidenceLeaks: sim.metrics.subworldEvidenceLeaks || 0,
    worldDigest: sim._worldDigestFromState(sim._captureState(false, false)),
    fingerprint: sim.stateFingerprint()
  };
}

function average(rows, key) {
  return Number((rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / rows.length).toFixed(2));
}

const noSecurity = [];
const boundedSecurity = [];
for (let i = 0; i < seeds; i += 1) {
  const seed = 'subworld-security-study-' + String(i + 1).padStart(3, '0');
  noSecurity.push(build(seed, false));
  boundedSecurity.push(build(seed, true));
}

function summary(rows) {
  return {
    activePrograms: average(rows, 'activePrograms'),
    quarantinedPrograms: average(rows, 'quarantinedPrograms'),
    activeAnomalies: average(rows, 'activeAnomalies'),
    localCopies: average(rows, 'localCopies'),
    localObservations: average(rows, 'localObservations'),
    localInvestigations: average(rows, 'localInvestigations'),
    localModelBreaks: average(rows, 'localModelBreaks'),
    securityObservations: average(rows, 'securityObservations'),
    securityActions: average(rows, 'securityActions'),
    securityBlocked: average(rows, 'securityBlocked'),
    evidenceLeaks: average(rows, 'evidenceLeaks')
  };
}

console.log(JSON.stringify({
  seeds,
  ticks,
  noSecurity: summary(noSecurity),
  boundedSecurity: summary(boundedSecurity),
  sampleDigests: { noSecurity: noSecurity[0].worldDigest, boundedSecurity: boundedSecurity[0].worldDigest }
}, null, 2));