const { GardenSimulation } = require('../src/v16.js');

const seedCount = Math.max(1, Number(process.argv[2] || 12));
const ticks = Math.max(1, Number(process.argv[3] || 60));

const result = {
  schema: 'anomaly-garden/completion-study-v1',
  seeds: seedCount,
  ticks,
  auditPasses: 0,
  auditFailures: 0,
  roundTripMismatches: 0,
  totals: {
    experiments: 0,
    investigations: 0,
    modelBreaks: 0,
    assemblies: 0,
    residentTransits: 0,
    programCopies: 0,
    programQuarantines: 0,
    replicationResourceBlocks: 0,
    resourceShortages: 0,
    securityBudgetSpent: 0
  },
  samples: []
};

for (let i = 0; i < seedCount; i += 1) {
  const seed = 'completion-study-' + String(i + 1).padStart(3, '0');
  const sim = new GardenSimulation({ seed, config: { subworldInvestigationPeriod: 2 } });
  const scenario = sim.plantCompletionScenario();

  const traveller = scenario.child.subworld.residents[0];
  sim.transitResident(scenario.gate.id, traveller.id, scenario.child.id);
  sim.run(ticks);

  const audit = sim.worldIntegrityReport();
  if (audit.pass) result.auditPasses += 1;
  else result.auditFailures += 1;

  const restored = GardenSimulation.deserialize(sim.serialize());
  const roundTripMatch = restored.stateFingerprint() === sim.stateFingerprint();
  if (!roundTripMatch) result.roundTripMismatches += 1;

  result.totals.experiments += Number(sim.metrics.subworldResidentExperiments || 0);
  result.totals.investigations += Number(sim.metrics.subworldResidentInvestigations || 0);
  result.totals.modelBreaks += Number(sim.metrics.subworldResidentModelBreaks || 0);
  result.totals.assemblies += Number(sim.metrics.subworldAssemblies || 0);
  result.totals.residentTransits += Number(sim.metrics.subworldResidentTransits || 0);
  result.totals.programCopies += Number(sim.metrics.subworldProgramCopies || 0);
  result.totals.programQuarantines += Number(sim.metrics.subworldProgramQuarantines || 0);
  result.totals.replicationResourceBlocks += Number(sim.metrics.subworldReplicationResourceBlocks || 0);
  result.totals.resourceShortages += Number(sim.metrics.subworldResourceShortages || 0);
  result.totals.securityBudgetSpent += Number(sim.metrics.subworldSecurityBudgetSpent || 0);

  if (result.samples.length < 4) {
    const overview = sim.worldglassOverview();
    result.samples.push({
      seed,
      fingerprint: sim.stateFingerprint(),
      roundTripMatch,
      auditPass: audit.pass,
      auditErrors: audit.errors.length,
      auditWarnings: audit.warnings.length,
      livingSubworlds: overview.livingSubworlds.length,
      experiments: Number(sim.metrics.subworldResidentExperiments || 0),
      modelBreaks: Number(sim.metrics.subworldResidentModelBreaks || 0),
      assemblies: Number(sim.metrics.subworldAssemblies || 0),
      residentTransits: Number(sim.metrics.subworldResidentTransits || 0)
    });
  }
}

result.pass =
  result.auditFailures === 0 &&
  result.roundTripMismatches === 0 &&
  result.totals.experiments > 0 &&
  result.totals.investigations > 0 &&
  result.totals.modelBreaks > 0 &&
  result.totals.assemblies > 0 &&
  result.totals.residentTransits === seedCount;

console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
