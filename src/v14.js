(function (root, factory) {
  const base = typeof module === 'object' && module.exports ? require('./v13.js') : root.AnomalyGardenSim;
  const api = factory(base);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AnomalyGardenSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (base) {
  'use strict';

  const Base = base.GardenSimulation;
  const hashSeed = base.hashSeed;
  const mulberry32 = base.mulberry32;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const DEFAULTS = {
    subworldEconomyPeriod: 4,
    subworldConsumptionPeriod: 8,
    subworldInitialFood: 10,
    subworldInitialEnergy: 10,
    subworldInitialMaterial: 10,
    subworldInitialTreasury: 24,
    subworldSecurityDefaultBudget: 6,
    subworldSecurityMaxBudget: 12
  };

  const METRICS = {
    subworldTasksCompleted: 0,
    subworldTaskBlocked: 0,
    subworldResourceShortages: 0,
    subworldCreditTransfers: 0,
    subworldSecurityBudgetSpent: 0,
    subworldSecurityBudgetBlocked: 0
  };

  const TASKS = {
    forage: { input: null, output: 'food', amount: 2 },
    'maintain-grid': { input: 'material', output: 'energy', amount: 2 },
    fabricate: { input: 'energy', output: 'material', amount: 2 }
  };
  const OCCUPATIONS = ['forage', 'maintain-grid', 'fabricate'];
  const ACTION_COST = { 'quarantine-program': 2, 'repair-anomaly': 1 };
  const SECURITY_ROLES = ['observer', 'warden', 'repairer', 'custodian'];

  class GardenSimulation extends Base {
    constructor(options) {
      const opts = options || {};
      super(opts);
      this.version = '0.14.0';
      this.config = Object.assign({}, DEFAULTS, this.config, opts.config || {});
      this.metrics = Object.assign({}, METRICS, this.metrics || {});
      this._normalizeEconomies();
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
      this.version = '0.14.0';
      this.config = Object.assign({}, DEFAULTS, this.config, (state && state.config) || {});
      this.metrics = Object.assign({}, METRICS, this.metrics || {}, (state && state.metrics) || {});
      this._normalizeEconomies();
    }

    static deserialize(text) {
      const parsed = typeof text === 'string' ? JSON.parse(text) : clone(text);
      if (!parsed || parsed.schema !== 'axm-anomaly-garden/state-v1' || !parsed.state) throw new Error('Unsupported Anomaly Garden state file');
      const sim = new GardenSimulation({ seed: parsed.state.seedText || 'imported' });
      sim._restoreState(parsed.state);
      return sim;
    }

    _defaultEconomy() {
      return {
        stock: {
          food: Number(this.config.subworldInitialFood),
          energy: Number(this.config.subworldInitialEnergy),
          material: Number(this.config.subworldInitialMaterial)
        },
        treasury: Number(this.config.subworldInitialTreasury),
        tasksCompleted: 0,
        shortages: 0,
        creditTransfers: 0,
        lastConsumptionTick: -1
      };
    }

    _defaultSecurityPolicy() {
      return {
        name: 'bounded-local',
        allowedRoles: SECURITY_ROLES.slice(),
        actionCosts: Object.assign({}, ACTION_COST),
        maxProgramBudget: Number(this.config.subworldSecurityMaxBudget)
      };
    }

    _normalizeEconomyZone(zone) {
      if (!zone || !zone.subworld) return;
      const sw = zone.subworld;
      const defaults = this._defaultEconomy();
      sw.economy = Object.assign({}, defaults, sw.economy || {});
      sw.economy.stock = Object.assign({}, defaults.stock, (sw.economy && sw.economy.stock) || {});
      sw.securityPolicy = Object.assign({}, this._defaultSecurityPolicy(), sw.securityPolicy || {});
      sw.securityPolicy.allowedRoles = Array.isArray(sw.securityPolicy.allowedRoles) ? sw.securityPolicy.allowedRoles.slice() : SECURITY_ROLES.slice();
      sw.securityPolicy.actionCosts = Object.assign({}, ACTION_COST, sw.securityPolicy.actionCosts || {});
      sw.residents.forEach((resident) => {
        resident.credits = Number(resident.credits == null ? 3 : resident.credits);
        resident.completedTasks = Number(resident.completedTasks || 0);
        resident.occupation = resident.occupation || OCCUPATIONS[(hashSeed([this.seed, zone.id, resident.id, 'occupation'].join('|')) >>> 0) % OCCUPATIONS.length];
      });
      sw.programs.forEach((program) => {
        if (program.kind !== 'security') return;
        program.securityBudget = Number(program.securityBudget == null ? this.config.subworldSecurityDefaultBudget : program.securityBudget);
        program.securitySpent = Number(program.securitySpent || 0);
      });
    }

    _normalizeEconomies() {
      for (const zone of this.modalZones || []) this._normalizeEconomyZone(zone);
    }

    initializeModalSubworld(modalId, options) {
      const sw = super.initializeModalSubworld(modalId, options);
      const zone = this._livingZone(modalId);
      this._normalizeEconomyZone(zone);
      this._refreshBaseline(zone);
      return sw;
    }

    setSubworldSecurityPolicy(modalId, patch) {
      const zone = this._livingZone(modalId);
      if (!zone) throw new Error('Security policy requires a living subworld');
      const current = zone.subworld.securityPolicy || this._defaultSecurityPolicy();
      const next = Object.assign({}, current, patch || {});
      if (patch && patch.allowedRoles) next.allowedRoles = patch.allowedRoles.filter((role) => SECURITY_ROLES.includes(role));
      next.actionCosts = Object.assign({}, ACTION_COST, current.actionCosts || {}, (patch && patch.actionCosts) || {});
      next.maxProgramBudget = Math.max(0, Number(next.maxProgramBudget || this.config.subworldSecurityMaxBudget));
      zone.subworld.securityPolicy = next;
      const receipt = this._receipt('intervention.subworld-security-policy', {
        modalId: zone.id,
        policy: clone(next)
      }, [this._modalCreationById.get(zone.id)].filter(Boolean));
      this._recordIntervention('subworld-security-policy', { modalId: zone.id, policy: clone(next) }, receipt.id);
      this._refreshBaseline(zone);
      return next;
    }

    deploySecurityProgram(modalId, role, options) {
      const zone = this._livingZone(modalId);
      if (!zone) throw new Error('Initialize the nested Modal subworld first');
      this._normalizeEconomyZone(zone);
      const policy = zone.subworld.securityPolicy;
      if (!policy.allowedRoles.includes(role || 'observer')) throw new Error('Security role denied by local policy');
      const program = super.deploySecurityProgram(modalId, role, options);
      const requested = Math.max(0, Number(options && options.budget != null ? options.budget : this.config.subworldSecurityDefaultBudget));
      const grant = Math.min(requested, policy.maxProgramBudget, Math.max(0, zone.subworld.economy.treasury));
      program.securityBudget = grant;
      program.securitySpent = 0;
      zone.subworld.economy.treasury -= grant;
      this._receipt('security.budget-granted', {
        modalId: zone.id,
        securityProgramId: program.id,
        granted: grant,
        treasuryAfter: zone.subworld.economy.treasury
      }, [program.creationReceiptId].filter(Boolean));
      this._refreshBaseline(zone);
      return program;
    }

    fundSecurityProgram(programId, amount) {
      const sec = this._security(programId);
      if (!sec) throw new Error('Unknown security program');
      this._normalizeEconomyZone(sec.zone);
      const requested = Math.max(0, Number(amount || 0));
      const policy = sec.sw.securityPolicy;
      const room = Math.max(0, policy.maxProgramBudget - Number(sec.program.securityBudget || 0));
      const grant = Math.min(requested, room, Math.max(0, sec.sw.economy.treasury));
      sec.program.securityBudget = Number(sec.program.securityBudget || 0) + grant;
      sec.sw.economy.treasury -= grant;
      const receipt = this._receipt('security.budget-granted', {
        modalId: sec.zone.id,
        securityProgramId: sec.program.id,
        granted: grant,
        treasuryAfter: sec.sw.economy.treasury
      }, [sec.program.creationReceiptId].filter(Boolean));
      this._refreshBaseline(sec.zone);
      return receipt;
    }

    _securityPreflight(sec, action, targetModalId, targetId, targetType) {
      if (targetModalId !== sec.zone.id) return 'outside-jurisdiction';
      if (!sec.program.capabilities.includes(action)) return 'missing-capability';
      const type = targetType || (action === 'repair-anomaly' ? 'anomaly' : 'program');
      const target = type === 'anomaly' ? sec.sw.anomalies.find((item) => item.id === targetId) : sec.sw.programs.find((item) => item.id === targetId);
      if (!target) return 'target-not-found';
      if (!sec.program.knownTargets.includes(type + ':' + targetId)) return 'target-not-observed';
      if (this._dist(sec.program, target) > sec.program.actionRadius) return 'outside-action-range';
      if (action === 'quarantine-program' && (target.kind === 'security' || target.quarantined || !target.active)) return 'target-not-quarantinable';
      if (action === 'repair-anomaly' && !target.active) return 'target-inactive';
      return null;
    }

    securityAttempt(programId, action, targetModalId, targetId, targetType) {
      const sec = this._security(programId);
      if (!sec || !sec.program.active || sec.program.quarantined) return null;
      this._normalizeEconomyZone(sec.zone);
      const preflight = this._securityPreflight(sec, action, targetModalId, targetId, targetType);
      if (preflight) return this._blocked(sec, action, targetModalId, targetId, preflight);
      const cost = Math.max(0, Number(sec.sw.securityPolicy.actionCosts[action] == null ? ACTION_COST[action] || 0 : sec.sw.securityPolicy.actionCosts[action]));
      if (Number(sec.program.securityBudget || 0) < cost) {
        this.metrics.subworldSecurityBudgetBlocked += 1;
        return this._blocked(sec, action, targetModalId, targetId, 'budget-exhausted');
      }
      const result = super.securityAttempt(programId, action, targetModalId, targetId, targetType);
      if (result && (result.type === 'security.program-quarantined' || result.type === 'security.anomaly-repaired')) {
        sec.program.securityBudget = Number(sec.program.securityBudget || 0) - cost;
        sec.program.securitySpent = Number(sec.program.securitySpent || 0) + cost;
        this.metrics.subworldSecurityBudgetSpent += cost;
        this._receipt('security.budget-spent', {
          modalId: sec.zone.id,
          securityProgramId: sec.program.id,
          action,
          cost,
          remaining: sec.program.securityBudget
        }, [result.id, sec.program.creationReceiptId].filter(Boolean));
      }
      return result;
    }

    _taskBlocked(zone, resident, kind, reason) {
      this.metrics.subworldTaskBlocked += 1;
      return this._receipt('subworld.task-blocked', {
        modalId: zone.id,
        residentId: resident && resident.id,
        task: kind,
        reason,
        localTick: zone.subworld.tick
      }, []);
    }

    performSubworldTask(modalId, residentId, taskKind) {
      const zone = this._livingZone(modalId);
      if (!zone) throw new Error('Task requires a living subworld');
      this._normalizeEconomyZone(zone);
      const sw = zone.subworld;
      const resident = sw.residents.find((item) => item.id === residentId);
      if (!resident) throw new Error('Resident is not in this subworld');
      const task = TASKS[taskKind];
      if (!task) throw new Error('Unknown subworld task');
      if (task.input && Number(sw.economy.stock[task.input] || 0) < 1) return this._taskBlocked(zone, resident, taskKind, 'missing-' + task.input);
      if (task.input) sw.economy.stock[task.input] -= 1;
      sw.economy.stock[task.output] = Number(sw.economy.stock[task.output] || 0) + task.amount;
      if (sw.economy.treasury >= 1) {
        sw.economy.treasury -= 1;
        resident.credits += 1;
      }
      resident.completedTasks += 1;
      sw.economy.tasksCompleted += 1;
      this.metrics.subworldTasksCompleted += 1;
      return this._receipt('subworld.task-completed', {
        modalId: zone.id,
        residentId: resident.id,
        task: taskKind,
        input: task.input,
        output: task.output,
        outputAmount: task.amount,
        stockAfter: clone(sw.economy.stock),
        residentCredits: resident.credits,
        treasuryAfter: sw.economy.treasury,
        localTick: sw.tick
      }, []);
    }

    transferSubworldCredits(modalId, fromResidentId, toResidentId, amount, reason) {
      const zone = this._livingZone(modalId);
      if (!zone) throw new Error('Transfer requires a living subworld');
      this._normalizeEconomyZone(zone);
      const from = zone.subworld.residents.find((item) => item.id === fromResidentId);
      const to = zone.subworld.residents.find((item) => item.id === toResidentId);
      if (!from || !to || from.id === to.id) throw new Error('Transfer requires two residents in the same subworld');
      const value = Math.max(0, Number(amount || 0));
      if (value <= 0 || from.credits < value) throw new Error('Transfer exceeds available resident credits');
      from.credits -= value;
      to.credits += value;
      zone.subworld.economy.creditTransfers += 1;
      this.metrics.subworldCreditTransfers += 1;
      return this._receipt('subworld.credit-transferred', {
        modalId: zone.id,
        fromResidentId: from.id,
        toResidentId: to.id,
        amount: value,
        reason: reason || 'voluntary-exchange',
        localTick: zone.subworld.tick
      }, []);
    }

    _processLocalEconomies() {
      for (const zone of (this.modalZones || []).filter((item) => item.active && item.subworld)) {
        this._normalizeEconomyZone(zone);
        const sw = zone.subworld;
        if (sw.tick > 0 && sw.tick % Number(this.config.subworldEconomyPeriod) === 0) {
          const residents = sw.residents.slice().sort((a, b) => a.id.localeCompare(b.id));
          for (const resident of residents) this.performSubworldTask(zone.id, resident.id, resident.occupation);
        }
        if (sw.tick > 0 && sw.tick % Number(this.config.subworldConsumptionPeriod) === 0 && sw.economy.lastConsumptionTick !== sw.tick) {
          sw.economy.lastConsumptionTick = sw.tick;
          const need = sw.residents.length;
          const available = Number(sw.economy.stock.food || 0);
          const consumed = Math.min(need, available);
          sw.economy.stock.food = available - consumed;
          const shortage = need - consumed;
          if (shortage > 0) {
            sw.economy.shortages += shortage;
            this.metrics.subworldResourceShortages += shortage;
            const affected = sw.residents.slice().sort((a, b) => a.id.localeCompare(b.id)).slice(0, shortage);
            affected.forEach((resident) => { resident.discrepancy = clamp(Number(resident.discrepancy || 0) + 0.08, 0, 1.5); });
            this._receipt('subworld.resource-shortage', {
              modalId: zone.id,
              resource: 'food',
              need,
              consumed,
              shortage,
              affectedResidentIds: affected.map((resident) => resident.id),
              localTick: sw.tick
            }, []);
          } else {
            this._receipt('subworld.resources-consumed', { modalId: zone.id, resource: 'food', amount: consumed, localTick: sw.tick }, []);
          }
        }
      }
    }

    step() {
      super.step();
      this._processLocalEconomies();
      return this.snapshot();
    }

    subworldSummary(modalId) {
      const summary = super.subworldSummary(modalId);
      if (!summary) return null;
      const zone = this._livingZone(modalId);
      this._normalizeEconomyZone(zone);
      summary.economy = clone(zone.subworld.economy);
      summary.securityPolicy = clone(zone.subworld.securityPolicy);
      summary.securityPrograms = summary.securityPrograms.map((program) => {
        const live = zone.subworld.programs.find((item) => item.id === program.id);
        return Object.assign({}, program, {
          budget: Number(live && live.securityBudget || 0),
          spent: Number(live && live.securitySpent || 0)
        });
      });
      return summary;
    }
  }

  return { GardenSimulation, DEFAULT_CONFIG: Object.assign({}, base.DEFAULT_CONFIG, DEFAULTS), hashSeed, mulberry32 };
});