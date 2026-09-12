(function (root) {
  'use strict';

  // Snapshot differences are observations of recorded state, never reconstructed causal history.
  function changes(before, after) {
    if (!before || before.key !== after.key || before.seed !== after.seed || after.tick < before.tick) return [];
    const result = [];
    const emit = (entity, kind, label) => result.push({ id:entity.id, kind, label, x:entity.x, y:entity.y, tick:after.tick });
    const priorPeople = new Map(before.people.map(a => [a.id, a]));
    for (const person of after.people) {
      const old = priorPeople.get(person.id);
      if (!old) continue;
      if (person.awakened && !old.awakened) emit(person, 'break', 'MODEL BREAK');
      else if (person.investigating && !old.investigating) emit(person, 'inquiry', 'INVESTIGATING');
      if (person.tests > old.tests) emit(person, 'test', '+' + (person.tests - old.tests) + ' TEST');
      if (person.memories > old.memories) emit(person, 'memory', '+' + (person.memories - old.memories) + ' MEMORY');
      if (person.project && old.project && person.project.completions > old.project.completions) emit(person, 'project', 'PROJECT COMPLETE');
    }
    for (const group of ['repairs', 'programs']) {
      const previous = new Map(before[group].map(a => [a.id, a]));
      for (const entity of after[group]) {
        const old = previous.get(entity.id);
        if (!old) continue;
        if (entity.quarantined && !old.quarantined) emit(entity, 'quarantine', 'QUARANTINED');
        const delta = Number(entity.actions) - Number(old.actions);
        if (Number.isFinite(delta) && delta > 0) emit(entity, group === 'repairs' ? 'repair' : 'program', '+' + delta + ' ' + (group === 'repairs' ? 'REPAIR ACTIONS' : 'PROGRAM ACTIONS'));
        if (group === 'programs' && entity.copies > old.copies) emit(entity, 'replicate', '+' + (entity.copies - old.copies) + ' COPY');
      }
    }
    const oldAnomalies = new Map(before.anomalies.map(a => [a.id, a])), newAnomalies = new Map(after.anomalies.map(a => [a.id, a]));
    for (const anomaly of after.anomalies) {
      const old = oldAnomalies.get(anomaly.id);
      if (!old) emit(anomaly, 'glitch', 'GLITCH APPEARED');
      else if (anomaly.intensity < old.intensity) emit(anomaly, 'stabilize', 'STABILITY +' + Math.round((old.intensity - anomaly.intensity) * 100));
    }
    for (const anomaly of before.anomalies) if (!newAnomalies.has(anomaly.id)) emit(anomaly, 'stabilize', 'GLITCH CLOSED');
    const oldRelations = new Map((before.relationships || []).map(a => [a.id, a]));
    for (const relation of after.relationships || []) {
      const old = oldRelations.get(relation.id);
      if (old && relation.meetings > old.meetings) emit(relation, 'social', 'SOCIAL MEETING');
      if (old && relation.signals > old.signals) emit(relation, 'share', 'PATTERN SHARED');
    }
    const oldInstitutions = new Map((before.institutions || []).map(a => [a.id, a]));
    for (const institution of after.institutions || []) {
      const old = oldInstitutions.get(institution.id);
      if (old && institution.reports > old.reports) emit(institution, 'institution', 'REPORT FILED');
      else if (old && institution.narrative !== old.narrative) emit(institution, 'institution', 'MODEL UPDATED');
    }
    return result;
  }

  const api = { changes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AnomalyGardenCitySignals = api;
})(typeof window !== 'undefined' ? window : this);
