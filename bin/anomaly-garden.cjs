#!/usr/bin/env node
'use strict';

const fs = require('fs');
const {
  REQUEST_SCHEMA,
  SCENARIO,
  describeCapability,
  runScenario,
  verifyReceipt
} = require('../src/portable-runner.js');

function output(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function hold(error) {
  output({
    schema: 'axm.anomaly-garden.command-error/v1',
    status: 'HOLD',
    error: error instanceof Error ? error.message : String(error)
  });
  return 2;
}

function parseRun(arguments_) {
  let seed = 'portable-completion-proof';
  let ticks = 28;
  for (let index = 0; index < arguments_.length; index += 1) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (flag === '--seed' && value !== undefined) seed = value;
    else if (flag === '--ticks' && value !== undefined) ticks = Number(value);
    else throw new TypeError(`unknown or incomplete run option: ${String(flag)}`);
    index += 1;
  }
  return { schema: REQUEST_SCHEMA, scenario: SCENARIO, seed, ticks };
}

function main(argv) {
  const [command, ...arguments_] = argv;
  try {
    if (command === 'describe' && arguments_.length === 0) output(describeCapability());
    else if (command === 'run') output(runScenario(parseRun(arguments_)));
    else if (command === 'verify' && arguments_.length === 1) {
      output(verifyReceipt(JSON.parse(fs.readFileSync(arguments_[0], 'utf8'))));
    } else {
      throw new TypeError('usage: anomaly-garden describe | run [--seed TEXT] [--ticks 0..1000] | verify RECEIPT.json');
    }
    return 0;
  } catch (error) {
    return hold(error);
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main };
