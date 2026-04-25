#!/usr/bin/env node

const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const APP_PACKAGE = 'com.walletpulse';
const DEFAULT_TIMEOUT_MS = 45000;
const POLL_MS = 1000;

function parseArgs(argv) {
  const args = {
    device: process.env.DEVICE_ID ?? '',
    packageName: process.env.APP_PACKAGE ?? APP_PACKAGE,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--device' || arg === '--deviceId') {
      args.device = argv[i + 1] ?? '';
      i += 1;
    } else if (arg === '--package') {
      args.packageName = argv[i + 1] ?? args.packageName;
      i += 1;
    }
  }

  return args;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function findAdb() {
  const explicit = process.env.ADB;
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  const names = process.platform === 'win32' ? ['adb.exe', 'adb'] : ['adb'];
  const sdkRoots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk'),
  ].filter(Boolean);

  for (const root of sdkRoots) {
    for (const name of names) {
      const candidate = path.join(root, 'platform-tools', name);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return 'adb';
}

const adb = findAdb();
const options = parseArgs(process.argv);

function adbCommand(args, opts = {}) {
  const allArgs = options.device ? ['-s', options.device, ...args] : args;
  return execFileSync(adb, allArgs, {
    encoding: 'utf8',
    stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'],
  });
}

function listDevices() {
  const output = execFileSync(adb, ['devices'], {encoding: 'utf8'});
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state)
    .map(([serial, state]) => ({serial, state}));
}

function resolveDevice() {
  const devices = listDevices();
  if (options.device) {
    const match = devices.find((d) => d.serial === options.device);
    if (!match) {
      throw new Error(`Device ${options.device} is not connected. Connected: ${devices.map((d) => d.serial).join(', ') || 'none'}`);
    }
    if (match.state !== 'device') {
      throw new Error(`Device ${options.device} is ${match.state}. Authorize USB debugging and retry.`);
    }
    return;
  }

  const ready = devices.filter((d) => d.state === 'device');
  if (ready.length !== 1) {
    throw new Error(`Expected exactly one connected device, found ${ready.length}. Pass --device <serial>.`);
  }
  options.device = ready[0].serial;
}

function xmlDecode(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function parseBounds(bounds) {
  const match = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(bounds);
  if (!match) {
    return null;
  }
  const [, left, top, right, bottom] = match.map(Number);
  return {
    left,
    top,
    right,
    bottom,
    centerX: Math.round((left + right) / 2),
    centerY: Math.round((top + bottom) / 2),
  };
}

function parseNodes(xml) {
  const nodes = [];
  const nodeMatches = xml.matchAll(/<node\b[^>]*>/g);
  for (const nodeMatch of nodeMatches) {
    const raw = nodeMatch[0];
    const attrs = {};
    for (const attr of raw.matchAll(/([\w:-]+)="([^"]*)"/g)) {
      attrs[attr[1]] = xmlDecode(attr[2]);
    }
    nodes.push({
      text: attrs.text ?? '',
      desc: attrs['content-desc'] ?? '',
      packageName: attrs.package ?? '',
      resourceId: attrs['resource-id'] ?? '',
      className: attrs.class ?? '',
      bounds: parseBounds(attrs.bounds ?? ''),
      clickable: attrs.clickable === 'true',
      enabled: attrs.enabled !== 'false',
    });
  }
  return nodes;
}

function dumpUi() {
  const output = adbCommand(['exec-out', 'uiautomator', 'dump', '/dev/tty']);
  const xmlStart = output.indexOf('<?xml');
  if (xmlStart === -1) {
    throw new Error(`Could not read UI hierarchy: ${output.trim()}`);
  }
  const nodes = parseNodes(output.slice(xmlStart));
  const packageMismatch = nodes.find(
    (node) => node.packageName && node.packageName !== options.packageName,
  );
  if (packageMismatch) {
    throw new Error(
      `Expected ${options.packageName} UI, but foreground UI belongs to ${packageMismatch.packageName}.`,
    );
  }
  return nodes;
}

function nodeLabel(node) {
  return [node.text, node.desc, node.resourceId].filter(Boolean).join(' ');
}

function nodeContains(node, text) {
  const needle = text.toLowerCase();
  return nodeLabel(node).toLowerCase().includes(needle);
}

function findNode(text, opts = {}) {
  const nodes = opts.nodes ?? dumpUi();
  const matches = nodes.filter((node) => node.enabled && nodeContains(node, text) && node.bounds);
  if (matches.length === 0) {
    return null;
  }

  if (opts.last) {
    return matches.reduce((lowest, node) =>
      node.bounds.centerY > lowest.bounds.centerY ? node : lowest,
    );
  }

  return matches[0];
}

function tap(x, y) {
  adbCommand(['shell', 'input', 'tap', String(x), String(y)], {stdio: 'ignore'});
}

function tapNode(node) {
  if (!node?.bounds) {
    throw new Error('Cannot tap node without bounds.');
  }
  tap(node.bounds.centerX, node.bounds.centerY);
}

function tapText(text, opts = {}) {
  const node = findNode(text, opts);
  if (!node) {
    throw new Error(`Could not find "${text}" on screen.`);
  }
  tapNode(node);
}

function swipeUp() {
  adbCommand(['shell', 'input', 'swipe', '540', '1840', '540', '620', '450'], {stdio: 'ignore'});
}

function waitForNode(text, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let lastLabels = '';

  while (Date.now() < deadline) {
    const nodes = dumpUi();
    const node = findNode(text, {nodes});
    if (node) {
      return node;
    }
    lastLabels = nodes
      .map(nodeLabel)
      .filter(Boolean)
      .slice(0, 20)
      .join(' | ');
    sleep(POLL_MS);
  }

  throw new Error(`Timed out waiting for "${text}". Visible labels: ${lastLabels || 'none'}`);
}

function waitForAny(labels, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let nodes = [];

  while (Date.now() < deadline) {
    nodes = dumpUi();
    for (const label of labels) {
      const node = findNode(label, {nodes});
      if (node) {
        return {label, node, nodes};
      }
    }
    sleep(POLL_MS);
  }

  const visible = nodes.map(nodeLabel).filter(Boolean).slice(0, 20).join(' | ');
  throw new Error(`Timed out waiting for one of: ${labels.join(', ')}. Visible labels: ${visible || 'none'}`);
}

function scrollUntilVisible(text, maxSwipes = 6) {
  for (let i = 0; i <= maxSwipes; i += 1) {
    const node = findNode(text);
    if (node) {
      return node;
    }
    swipeUp();
    sleep(700);
  }
  throw new Error(`Could not find "${text}" after scrolling.`);
}

function getForegroundPackage() {
  const output = adbCommand(['shell', 'dumpsys', 'window']);
  const match =
    /mCurrentFocus=Window\{[^ ]+ u\d+ ([^/}\s]+)\//.exec(output) ??
    /mFocusedApp=ActivityRecord\{[^ ]+ u\d+ ([^/}\s]+)\//.exec(output);
  return match?.[1] ?? '';
}

function waitForForegroundPackage(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let foreground = '';

  while (Date.now() < deadline) {
    foreground = getForegroundPackage();
    if (foreground === options.packageName) {
      return;
    }
    sleep(POLL_MS);
  }

  throw new Error(
    `Expected ${options.packageName} to be foreground, but foreground package is ${foreground || 'unknown'}.`,
  );
}

function launchApp() {
  try {
    adbCommand(['reverse', 'tcp:8081', 'tcp:8081'], {stdio: 'ignore'});
  } catch {
    // Physical devices can reject reverse when debugging is reconnecting. The
    // app can still launch; Metro errors will show in the UI if this matters.
  }
  adbCommand(['shell', 'am', 'force-stop', options.packageName], {stdio: 'ignore'});
  adbCommand(['shell', 'am', 'start', '-n', `${options.packageName}/.MainActivity`], {stdio: 'ignore'});
  waitForForegroundPackage();
}

function ensureAuthenticatedApp() {
  const state = waitForAny([
    'Home',
    'Settings',
    'Welcome back',
    'Sign In',
    'Welcome to WalletPulse',
    'You are all set!',
  ]);

  if (['Welcome back', 'Sign In'].includes(state.label)) {
    throw new Error('The phone is on the signed-out screen. Sign in on the phone, then run npm run e2e:android again.');
  }
  if (['Welcome to WalletPulse', 'You are all set!'].includes(state.label)) {
    throw new Error('The phone is on onboarding. Finish onboarding on the phone, then run npm run e2e:android again.');
  }
}

function openBudgets() {
  tapText('Settings', {last: true});
  waitForNode('Settings');
  const budgetsRow = scrollUntilVisible('Budgets');
  tapNode(budgetsRow);
  waitForNode('Budgets');
}

function createOverallBudgetFromEmptyState() {
  tapText('Create Budget');
  waitForNode('New Budget');

  const amount = waitForNode('Amount');
  tapNode(amount);
  adbCommand(['shell', 'input', 'text', '4321'], {stdio: 'ignore'});
  sleep(800);

  const overallLabel = waitForNode('Overall Budget');
  tap(960, overallLabel.bounds.centerY);
  sleep(800);

  const createButton = scrollUntilVisible('Create Budget', 3);
  tapNode(createButton);

  const result = waitForAny([
    'Overall',
    'Budget Overview',
    'Could not create budget',
    'active budget',
  ], DEFAULT_TIMEOUT_MS);
  if (result.label === 'Could not create budget') {
    throw new Error('Budget save failed on-device. Check the app alert for the Supabase/domain error.');
  }
}

function verifyBudgetScreen() {
  const state = waitForAny(['No budgets yet', 'Budget Overview', 'active budget', 'Overall']);
  if (state.label === 'No budgets yet') {
    createOverallBudgetFromEmptyState();
    return 'created-overall-budget';
  }
  return 'budget-list-visible';
}

function main() {
  resolveDevice();
  console.log(`Android E2E device: ${options.device}`);
  launchApp();
  ensureAuthenticatedApp();
  openBudgets();
  const result = verifyBudgetScreen();
  console.log(`Android budget E2E passed: ${result}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Android budget E2E failed: ${message}`);
  process.exit(1);
}
