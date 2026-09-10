#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { TextDecoder } = require('util');
const {
  REQUEST_SCHEMA,
  SCENARIO,
  describeCapability,
  runScenario,
  verifyReceipt
} = require('../src/portable-runner.js');

const MAX_RECEIPT_BYTES = 1024 * 1024;

class ReceiptFileError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReceiptFileError';
    this.code = code;
  }
}

function output(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function hold(error) {
  const body = {
    schema: 'axm.anomaly-garden.command-error/v1',
    status: 'HOLD',
    error: error instanceof Error ? error.message : String(error)
  };
  if (error && typeof error.code === 'string' && error.code.startsWith('AXM_')) body.code = error.code;
  output(body);
  return 2;
}

function receiptError(code, message) {
  throw new ReceiptFileError(code, message);
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

function skipWhitespace(text, cursor) {
  while (cursor.index < text.length && /\s/.test(text[cursor.index])) cursor.index += 1;
}

function readJsonStringToken(text, cursor) {
  const start = cursor.index;
  cursor.index += 1;
  while (cursor.index < text.length) {
    const character = text[cursor.index];
    if (character === '"') {
      cursor.index += 1;
      return text.slice(start, cursor.index);
    }
    if (character === '\\') cursor.index += 2;
    else cursor.index += 1;
  }
  throw new SyntaxError('unterminated JSON string');
}

function rejectDuplicateObjectMembers(text) {
  const cursor = { index: 0 };

  function parseValue() {
    skipWhitespace(text, cursor);
    const character = text[cursor.index];
    if (character === '{') return parseObject();
    if (character === '[') return parseArray();
    if (character === '"') {
      readJsonStringToken(text, cursor);
      return;
    }
    while (cursor.index < text.length && !/[\s,\]}]/.test(text[cursor.index])) cursor.index += 1;
  }

  function parseObject() {
    cursor.index += 1;
    skipWhitespace(text, cursor);
    if (text[cursor.index] === '}') {
      cursor.index += 1;
      return;
    }
    const names = new Set();
    while (cursor.index < text.length) {
      skipWhitespace(text, cursor);
      const token = readJsonStringToken(text, cursor);
      const name = JSON.parse(token);
      if (names.has(name)) {
        receiptError('AXM_RECEIPT_FILE_AMBIGUOUS_JSON', `duplicate JSON object member: ${JSON.stringify(name)}`);
      }
      names.add(name);
      skipWhitespace(text, cursor);
      cursor.index += 1; // colon; whole-document JSON.parse already proved syntax.
      parseValue();
      skipWhitespace(text, cursor);
      if (text[cursor.index] === '}') {
        cursor.index += 1;
        return;
      }
      cursor.index += 1; // comma.
    }
  }

  function parseArray() {
    cursor.index += 1;
    skipWhitespace(text, cursor);
    if (text[cursor.index] === ']') {
      cursor.index += 1;
      return;
    }
    while (cursor.index < text.length) {
      parseValue();
      skipWhitespace(text, cursor);
      if (text[cursor.index] === ']') {
        cursor.index += 1;
        return;
      }
      cursor.index += 1; // comma.
    }
  }

  parseValue();
}

function sameOpenedFile(named, opened) {
  if (!named || !opened) return false;
  return named.dev === opened.dev && named.ino === opened.ino;
}

function readReceiptFile(filePath) {
  let named;
  try {
    named = fs.lstatSync(filePath);
  } catch (error) {
    receiptError('AXM_RECEIPT_FILE_UNAVAILABLE', `receipt file is unavailable: ${error.message}`);
  }
  if (!named.isFile() || named.isSymbolicLink()) {
    receiptError('AXM_RECEIPT_FILE_NOT_REGULAR', 'receipt path must name one regular non-symlink file');
  }
  if (named.size > MAX_RECEIPT_BYTES) {
    receiptError('AXM_RECEIPT_FILE_TOO_LARGE', `receipt file exceeds ${MAX_RECEIPT_BYTES} bytes`);
  }

  const noFollow = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, fs.constants.O_RDONLY | noFollow);
  } catch (error) {
    const code = error && error.code === 'ELOOP' ? 'AXM_RECEIPT_FILE_NOT_REGULAR' : 'AXM_RECEIPT_FILE_UNAVAILABLE';
    receiptError(code, `receipt file cannot be opened safely: ${error.message}`);
  }

  try {
    const before = fs.fstatSync(descriptor);
    if (!before.isFile() || !sameOpenedFile(named, before)) {
      receiptError('AXM_RECEIPT_FILE_CHANGED_DURING_READ', 'receipt path changed between admission and open');
    }
    if (before.size > MAX_RECEIPT_BYTES) {
      receiptError('AXM_RECEIPT_FILE_TOO_LARGE', `receipt file exceeds ${MAX_RECEIPT_BYTES} bytes`);
    }

    const bytes = fs.readFileSync(descriptor);
    if (bytes.length > MAX_RECEIPT_BYTES) {
      receiptError('AXM_RECEIPT_FILE_TOO_LARGE', `receipt file exceeds ${MAX_RECEIPT_BYTES} bytes`);
    }
    const after = fs.fstatSync(descriptor);
    if (bytes.length !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) {
      receiptError('AXM_RECEIPT_FILE_CHANGED_DURING_READ', 'receipt file changed while it was being read');
    }

    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (error) {
      receiptError('AXM_RECEIPT_FILE_INVALID_UTF8', `receipt file is not valid UTF-8: ${error.message}`);
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      receiptError('AXM_RECEIPT_FILE_INVALID_JSON', `receipt file is not valid JSON: ${error.message}`);
    }
    rejectDuplicateObjectMembers(text);
    return parsed;
  } finally {
    fs.closeSync(descriptor);
  }
}

function main(argv) {
  const [command, ...arguments_] = argv;
  try {
    if (command === 'describe' && arguments_.length === 0) output(describeCapability());
    else if (command === 'run') output(runScenario(parseRun(arguments_)));
    else if (command === 'verify' && arguments_.length === 1) {
      output(verifyReceipt(readReceiptFile(arguments_[0])));
    } else {
      throw new TypeError('usage: anomaly-garden describe | run [--seed TEXT] [--ticks 0..1000] | verify RECEIPT.json');
    }
    return 0;
  } catch (error) {
    return hold(error);
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { MAX_RECEIPT_BYTES, main, readReceiptFile };
