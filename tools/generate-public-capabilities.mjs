import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPOSITORY = 'mike-axiom-mir/axm-anomaly-garden';
export const DISCOVERY_BUDDY_REF = '1a94fc2481d1cfc9234dea7c86af4777126d3924';
export const REGISTRY_PATH = 'registry/capabilities.jsonl';
export const RECEIPT_PATH = 'registry/capabilities.receipt.json';
export const MARKER_PATH = '.axm/discovery-public.json';

const SOURCE_PATHS = [
  'package.json',
  'capability.json',
  'bin/anomaly-garden.cjs',
  'src/portable-runner.js',
  'LICENSE',
  MARKER_PATH,
];

const PATTERN_PROVENANCE = Object.freeze({
  adapted_from_repository: 'mike-axiom-mir/axm-EchoWorld',
  adapted_from_ref: '6987cf842a0f17e03f2ef679d07ec5782b30664b',
  adapted_paths: [
    '.axm/discovery-public.json',
    'tools/generate-public-capabilities.mjs',
    'tests/public-capability-discovery.test.mjs',
    '.github/workflows/public-capability-discovery.yml',
  ],
  adaptation: 'CommonJS provider contract, explicit unknown status, executable CLI descriptor check',
  copied_runtime_code: false,
});

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function gitBlobSha1(bytes) {
  const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const header = Buffer.from(`blob ${body.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(body).digest('hex');
}

function resolveRegularFile(root, relativePath) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  const prefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
  if (!resolved.startsWith(prefix)) throw new Error(`unsafe source path: ${relativePath}`);
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`source must be a regular non-symlink file: ${relativePath}`);
  }
  return resolved;
}

function sourceRecord(root, relativePath) {
  const filePath = resolveRegularFile(root, relativePath);
  const bytes = fs.readFileSync(filePath);
  return { path: relativePath, git_blob_sha1: gitBlobSha1(bytes) };
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(resolveRegularFile(root, relativePath), 'utf8'));
}

function assertExactArray(actual, expected, label) {
  if (!Array.isArray(actual) || canonicalJson(actual) !== canonicalJson(expected)) {
    throw new Error(`${label} drift`);
  }
}

function readMarker(root) {
  const marker = readJson(root, MARKER_PATH);
  if (marker.schema !== 'axm.discovery-public/v1') throw new Error('unexpected public discovery marker schema');
  if (marker.public !== true) throw new Error('public discovery marker must explicitly opt in');
  if (marker.repo !== REPOSITORY) throw new Error('public discovery marker repository drift');
  if (marker.display_name !== 'AXM Anomaly Garden') throw new Error('public discovery display name drift');
  return marker;
}

function assertPackageBoundary(packageDocument) {
  if (packageDocument.name !== 'axm-anomaly-garden') throw new Error('unexpected package name');
  if (packageDocument.version !== '0.16.0') throw new Error('unexpected package version');
  if (packageDocument.private !== true) throw new Error('package must remain private to prevent accidental registry publication');
  if (packageDocument.main !== './src/v16.js') throw new Error('unexpected package root');
  if (packageDocument.exports?.['./runner'] !== './src/portable-runner.js') throw new Error('runner export drift');
  if (packageDocument.exports?.['./capability.json'] !== './capability.json') throw new Error('capability export drift');
  if (packageDocument.bin?.['anomaly-garden'] !== './bin/anomaly-garden.cjs') throw new Error('command entrypoint drift');
  if (packageDocument.engines?.node !== '>=18') throw new Error('Node runtime boundary drift');
  if (packageDocument.dependencies && Object.keys(packageDocument.dependencies).length !== 0) {
    throw new Error('unexpected runtime dependencies');
  }
  return packageDocument;
}

function assertCapabilityBoundary(capability, packageDocument) {
  if (capability.schema !== 'axm.capability/v1') throw new Error('unexpected capability schema');
  if (capability.id !== 'axm.anomaly-garden.deterministic-completion-scenario') throw new Error('unexpected capability id');
  if (capability.version !== packageDocument.version) throw new Error('capability/package version drift');
  if (Object.prototype.hasOwnProperty.call(capability, 'status')) {
    throw new Error('provider capability status became declared; review discovery classification explicitly');
  }
  if (capability.runtime?.kind !== 'node-commonjs' || capability.runtime?.minimumVersion !== '18') {
    throw new Error('unexpected runtime boundary');
  }
  assertExactArray(capability.runtime?.dependencies, [], 'runtime dependency boundary');
  if (capability.runtime?.networkRequired !== false || capability.runtime?.accountRequired !== false) {
    throw new Error('discovery cannot widen the local/offline runtime contract');
  }
  if (capability.entrypoints?.library !== 'axm-anomaly-garden'
      || capability.entrypoints?.runner !== 'axm-anomaly-garden/runner'
      || capability.entrypoints?.command !== 'anomaly-garden') {
    throw new Error('unexpected capability entrypoint boundary');
  }
  assertExactArray(capability.operations, ['describe', 'run', 'verify'], 'operation boundary');
  if (capability.contracts?.request !== 'axm.anomaly-garden.run-request/v1'
      || capability.contracts?.receipt !== 'axm.anomaly-garden.run-receipt/v1'
      || capability.contracts?.verification !== 'axm.anomaly-garden.verification-receipt/v1'
      || capability.contracts?.scenario !== 'completion-v0.16'
      || capability.contracts?.maximumTicks !== 1000) {
    throw new Error('unexpected capability contract boundary');
  }
  if (capability.determinism?.sameSeedAndTicksReplay !== true) throw new Error('determinism declaration drift');
  const authority = capability.authority;
  if (!authority
      || authority.changesCanonicalSource !== false
      || authority.publishesPackage !== false
      || authority.declaresCanon !== false) {
    throw new Error('capability metadata must retain explicit no-source/no-publish/no-CANON authority');
  }
  return capability;
}

function assertApacheLicense(root) {
  const text = fs.readFileSync(resolveRegularFile(root, 'LICENSE'), 'utf8');
  if (!text.includes('Apache License') || !text.includes('Version 2.0, January 2004')) {
    throw new Error('LICENSE is not recognizably Apache-2.0');
  }
  return 'Apache-2.0';
}

function readExecutableDescriptor(root) {
  const command = resolveRegularFile(root, 'bin/anomaly-garden.cjs');
  const stdout = execFileSync(process.execPath, [command, 'describe'], {
    cwd: path.resolve(root),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(stdout);
}

export function buildArtifacts(root = process.cwd()) {
  readMarker(root);
  const packageDocument = assertPackageBoundary(readJson(root, 'package.json'));
  const capability = assertCapabilityBoundary(readJson(root, 'capability.json'), packageDocument);
  const license = assertApacheLicense(root);
  const executableDescriptor = readExecutableDescriptor(root);
  if (canonicalJson(executableDescriptor) !== canonicalJson(capability)) {
    throw new Error('executable describe output drifted from capability.json');
  }

  const sources = SOURCE_PATHS.map((relativePath) => sourceRecord(root, relativePath));

  const registryRecord = {
    schema: 'axm.public-capability/v1',
    id: capability.id,
    version: capability.version,
    status: null,
    providers: [REPOSITORY],
    consumers: [],
    summary: capability.description,
    license,
    runtime: capability.runtime,
    entrypoints: capability.entrypoints,
    operations: capability.operations,
    contracts: capability.contracts,
    determinism: capability.determinism,
    source: {
      package: 'package.json',
      capability: 'capability.json',
      command: 'bin/anomaly-garden.cjs',
      runner: 'src/portable-runner.js',
      license: 'LICENSE',
    },
    authority: {
      discoveryOnly: true,
      execution: false,
      automaticSelection: false,
      automaticInstall: false,
      packagePublication: false,
      merge: false,
      canon: false,
    },
  };
  const registryText = `${canonicalJson(registryRecord)}\n`;

  const receiptBody = {
    schema: 'axm.public-capability-registry-receipt/v1',
    repository: REPOSITORY,
    registry: {
      path: REGISTRY_PATH,
      sha256: sha256(Buffer.from(registryText, 'utf8')),
      capability_count: 1,
      capability_ids: [capability.id],
    },
    sources,
    compatibility: {
      consumer: 'mike-axiom-mir/axm-discovery-buddy',
      pinned_ref: DISCOVERY_BUDDY_REF,
      marker_contract: 'axm.discovery-public/v1',
      registry_contract: 'registry/*capabilit*.jsonl',
    },
    pattern_provenance: PATTERN_PROVENANCE,
    truth_boundary: {
      source_backed: true,
      public_export_intent: true,
      provider_status_declared: false,
      status_invented: false,
      runtime_proof: false,
      package_published: false,
      execution_authority: false,
      automatic_selection_authority: false,
      automatic_install_authority: false,
      merge_authority: false,
      canon_authority: false,
    },
  };
  const receipt = {
    ...receiptBody,
    receipt_sha256: sha256(Buffer.from(canonicalJson(receiptBody), 'utf8')),
  };

  return {
    [REGISTRY_PATH]: registryText,
    [RECEIPT_PATH]: `${JSON.stringify(receipt, null, 2)}\n`,
  };
}

export function checkArtifacts(root = process.cwd()) {
  const expected = buildArtifacts(root);
  const mismatches = [];
  for (const [relativePath, text] of Object.entries(expected)) {
    const target = path.join(root, relativePath);
    let actual = null;
    try {
      actual = fs.readFileSync(target, 'utf8');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    if (actual !== text) mismatches.push(relativePath);
  }
  return { ok: mismatches.length === 0, mismatches, expected };
}

export function writeArtifacts(root = process.cwd()) {
  const artifacts = buildArtifacts(root);
  for (const [relativePath, text] of Object.entries(artifacts)) {
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, 'utf8');
  }
  return artifacts;
}

function main(argv = process.argv.slice(2)) {
  let mode = 'write';
  let root = process.cwd();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') mode = 'check';
    else if (arg === '--write') mode = 'write';
    else if (arg === '--root') {
      root = path.resolve(argv[index + 1] ?? '');
      index += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (mode === 'check') {
    const result = checkArtifacts(root);
    if (!result.ok) {
      console.error(`public capability registry is stale: ${result.mismatches.join(', ')}`);
      process.exitCode = 1;
      return;
    }
    console.log(`public capability registry: PASS (${Object.keys(result.expected).length} generated files)`);
    return;
  }
  const artifacts = writeArtifacts(root);
  console.log(`public capability registry: wrote ${Object.keys(artifacts).join(', ')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch (error) {
    console.error(`public capability registry: ERROR: ${error.message}`);
    process.exitCode = 2;
  }
}
