import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildArtifacts,
  canonicalJson,
  checkArtifacts,
  gitBlobSha1,
  writeArtifacts,
} from '../tools/generate-public-capabilities.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const EXPECTED_ID = 'axm.anomaly-garden.deterministic-completion-scenario';

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'anomaly-discovery-'));
  for (const directory of ['.axm', 'bin', 'src']) fs.mkdirSync(path.join(root, directory), { recursive: true });
  for (const relative of [
    'package.json',
    'capability.json',
    'bin/anomaly-garden.cjs',
    'src/portable-runner.js',
    'LICENSE',
    '.axm/discovery-public.json',
  ]) {
    fs.copyFileSync(path.join(ROOT, relative), path.join(root, relative));
  }
  return root;
}

function cleanFixture(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test('committed discovery artifacts are exact, source-backed, unknown-status, and no-authority', () => {
  const checked = checkArtifacts(ROOT);
  assert.equal(checked.ok, true, checked.mismatches.join(', '));

  const registryText = checked.expected['registry/capabilities.jsonl'];
  const registry = JSON.parse(registryText.trim());
  assert.equal(registry.schema, 'axm.public-capability/v1');
  assert.equal(registry.id, EXPECTED_ID);
  assert.equal(registry.status, null);
  assert.deepEqual(registry.providers, ['mike-axiom-mir/axm-anomaly-garden']);
  assert.equal(registry.runtime.networkRequired, false);
  assert.equal(registry.runtime.accountRequired, false);
  assert.deepEqual(registry.runtime.dependencies, []);
  assert.equal(registry.authority.discoveryOnly, true);
  assert.equal(registry.authority.execution, false);
  assert.equal(registry.authority.automaticSelection, false);
  assert.equal(registry.authority.automaticInstall, false);
  assert.equal(registry.authority.packagePublication, false);
  assert.equal(registry.authority.merge, false);
  assert.equal(registry.authority.canon, false);

  const receipt = JSON.parse(checked.expected['registry/capabilities.receipt.json']);
  for (const source of receipt.sources) {
    const bytes = fs.readFileSync(path.join(ROOT, source.path));
    assert.equal(source.git_blob_sha1, gitBlobSha1(bytes), source.path);
  }
  assert.equal(receipt.registry.sha256, sha256(registryText));
  const { receipt_sha256: sealed, ...body } = receipt;
  assert.equal(sealed, sha256(canonicalJson(body)));
  assert.equal(receipt.pattern_provenance.copied_runtime_code, false);
  assert.equal(receipt.truth_boundary.provider_status_declared, false);
  assert.equal(receipt.truth_boundary.status_invented, false);
  assert.equal(receipt.truth_boundary.runtime_proof, false);
  assert.equal(receipt.truth_boundary.execution_authority, false);
  assert.equal(receipt.truth_boundary.merge_authority, false);
  assert.equal(receipt.truth_boundary.canon_authority, false);
});

test('source symlink substitution fails closed', () => {
  const root = makeFixture();
  try {
    fs.rmSync(path.join(root, 'LICENSE'));
    fs.symlinkSync(path.join(ROOT, 'LICENSE'), path.join(root, 'LICENSE'));
    assert.throws(() => buildArtifacts(root), /regular non-symlink file/);
  } finally {
    cleanFixture(root);
  }
});

test('offline or authority drift fails closed', () => {
  const root = makeFixture();
  try {
    const capabilityPath = path.join(root, 'capability.json');
    const document = JSON.parse(fs.readFileSync(capabilityPath, 'utf8'));
    document.runtime.networkRequired = true;
    fs.writeFileSync(capabilityPath, `${JSON.stringify(document, null, 2)}\n`);
    assert.throws(() => buildArtifacts(root), /local\/offline runtime contract/);

    fs.copyFileSync(path.join(ROOT, 'capability.json'), capabilityPath);
    const restored = JSON.parse(fs.readFileSync(capabilityPath, 'utf8'));
    restored.authority.declaresCanon = true;
    fs.writeFileSync(capabilityPath, `${JSON.stringify(restored, null, 2)}\n`);
    assert.throws(() => buildArtifacts(root), /no-source\/no-publish\/no-CANON authority/);
  } finally {
    cleanFixture(root);
  }
});

test('provider status is not invented and a future declaration requires review', () => {
  const root = makeFixture();
  try {
    const capabilityPath = path.join(root, 'capability.json');
    const document = JSON.parse(fs.readFileSync(capabilityPath, 'utf8'));
    document.status = 'WORKING';
    fs.writeFileSync(capabilityPath, `${JSON.stringify(document, null, 2)}\n`);
    assert.throws(() => buildArtifacts(root), /status became declared/);
  } finally {
    cleanFixture(root);
  }
});

test('executable describe drift fails closed', () => {
  const root = makeFixture();
  try {
    const commandPath = path.join(root, 'bin/anomaly-garden.cjs');
    const original = fs.readFileSync(commandPath, 'utf8');
    fs.writeFileSync(
      commandPath,
      original.replace(
        "if (command === 'describe' && arguments_.length === 0) output(describeCapability());",
        "if (command === 'describe' && arguments_.length === 0) output({schema:'axm.capability/v1',id:'drift'});",
      ),
      'utf8',
    );
    assert.throws(() => buildArtifacts(root), /describe output drifted/);
  } finally {
    cleanFixture(root);
  }
});

test('public marker drift fails closed', () => {
  const root = makeFixture();
  try {
    const markerPath = path.join(root, '.axm/discovery-public.json');
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    marker.public = false;
    fs.writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`);
    assert.throws(() => buildArtifacts(root), /must explicitly opt in/);
  } finally {
    cleanFixture(root);
  }
});

test('generated registry drift is detected without rewriting it', () => {
  const root = makeFixture();
  try {
    writeArtifacts(root);
    const registryPath = path.join(root, 'registry/capabilities.jsonl');
    fs.appendFileSync(registryPath, '{}\n');
    const checked = checkArtifacts(root);
    assert.equal(checked.ok, false);
    assert.deepEqual(checked.mismatches, ['registry/capabilities.jsonl']);
  } finally {
    cleanFixture(root);
  }
});
