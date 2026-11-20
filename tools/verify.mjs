// Leonida Ledger — Verification Script
// Validates trophy data integrity and runs headless browser CDP functional tests.
// Usage: node tools/verify.mjs

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CHROME = join(homedir(), '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome');
const PORT = 9222;
const APP_URL = 'http://localhost:8080/?demo=1&trophy=17#/checklist';
const DOWNLOADS = join(process.cwd(), 'tools/downloads');
mkdirSync(DOWNLOADS, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function verifyDataIntegrity() {
  console.log('--- Verifying app/data/trophies.json ---');
  const raw = readFileSync('app/data/trophies.json', 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.trophies) || data.trophies.length !== 55) {
    throw new Error(`Expected exactly 55 trophies, found ${data.trophies?.length}`);
  }

  const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const names = new Set();
  let hiddenCount = 0;
  let missableCount = 0;

  for (const t of data.trophies) {
    if (names.has(t.name)) throw new Error(`Duplicate trophy name: "${t.name}"`);
    names.add(t.name);

    if (grades[t.grade] === undefined) throw new Error(`Invalid grade: "${t.grade}" on trophy ${t.id}`);
    grades[t.grade]++;

    if (t.hidden) hiddenCount++;
    if (t.missable) missableCount++;

    if (!t.guide || t.guide.trim().length < 20) {
      throw new Error(`Trophy ${t.id} (${t.name}) has an insufficient or empty guide`);
    }

    if (!Array.isArray(t.sources) || t.sources.length === 0) {
      throw new Error(`Trophy ${t.id} (${t.name}) has no cited sources`);
    }
  }

  if (grades.platinum !== 1 || grades.gold !== 2 || grades.silver !== 6 || grades.bronze !== 46) {
    throw new Error(`Grade breakdown mismatch: ${JSON.stringify(grades)}`);
  }
  if (hiddenCount !== 28) throw new Error(`Expected 28 hidden trophies, found ${hiddenCount}`);
  if (missableCount !== 14) throw new Error(`Expected 14 missable trophies, found ${missableCount}`);

  console.log('Data check passed: 55 trophies (1 Plat, 2 Gold, 6 Silver, 46 Bronze, 28 Hidden, 14 Missable).');
}

async function verifyBrowserFunctionality() {
  console.log('--- Running Browser CDP Functional Test ---');
  if (!existsSync(CHROME)) {
    console.log(`Chrome binary not found at ${CHROME}, skipping CDP run.`);
    return;
  }

  // Start internal static server if not already running on 8080
  let serverProc = null;
  let serverUp = false;
  try {
    const res = await fetch('http://localhost:8080/');
    if (res.ok) serverUp = true;
  } catch {}

  if (!serverUp) {
    console.log('Starting local serve.ts...');
    serverProc = spawn('node', ['serve.ts'], { stdio: 'ignore' });
    for (let i = 0; i < 20; i++) {
      await sleep(300);
      try {
        const r = await fetch('http://localhost:8080/');
        if (r.ok) { serverUp = true; break; }
      } catch {}
    }
    if (!serverUp) throw new Error('Local server on :8080 failed to start');
  }

  const chromeProc = spawn(CHROME, [
    '--headless=new', '--no-first-run', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${PORT}`, '--user-data-dir=' + join(process.cwd(), 'tools/chrome-profile'),
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    let devtoolsVersion = null;
    for (let i = 0; i < 30; i++) {
      await sleep(400);
      try { devtoolsVersion = await (await fetch(`http://localhost:${PORT}/json/version`)).json(); break; } catch {}
    }
    if (!devtoolsVersion) throw new Error('Chromium DevTools endpoint failed to initialize');

    const target = await (await fetch(`http://localhost:${PORT}/json/new?${encodeURIComponent(APP_URL)}`, { method: 'PUT' })).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

    let nextId = 1;
    const pending = new Map();
    const requests = [];
    const consoleErrors = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
      if (msg.method === 'Network.requestWillBeSent') requests.push(msg.params.request.url);
      if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push(JSON.stringify(msg.params.exceptionDetails));
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
      }
    };

    const send = (method, params = {}) => new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error('Eval error: ' + JSON.stringify(r.result.exceptionDetails));
      return r.result?.result?.value;
    };

    await send('Network.enable');
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS });
    await send('Page.navigate', { url: APP_URL });
    await sleep(2000);

    const testResults = {};
    testResults.renderedRows = await evaluate(`document.querySelectorAll('#trophy-list .trophy').length`);
    testResults.headerEarned = await evaluate(`document.getElementById('big-count').textContent`);
    testResults.detailTitle = await evaluate(`document.querySelector('#detail h2')?.textContent`);
    testResults.sourcesCount = await evaluate(`document.querySelectorAll('#detail .sources a').length`);

    // Verify localStorage tick
    testResults.localStorageSaved = await evaluate(`(() => {
      const box = [...document.querySelectorAll('#trophy-list .trophy input')].find(i => !i.checked);
      if (box) box.click();
      return JSON.parse(localStorage.getItem('leonida-ledger-progress-v1') || '[]').length;
    })()`);

    // Verify spoiler toggle
    testResults.spoilerMasking = await evaluate(`(() => {
      document.getElementById('spoiler-toggle').click();
      return document.querySelector('#trophy-list .trophy-name')?.textContent;
    })()`);
    await evaluate(`document.getElementById('spoiler-toggle').click()`); // restore

    // Verify missables filter
    testResults.missableCount = await evaluate(`(() => {
      const chip = [...document.querySelectorAll('#kind-chips button')].find(b => b.textContent === 'Missable');
      if (chip) chip.click();
      return document.querySelectorAll('#trophy-list .trophy').length;
    })()`);

    // Verify Export
    await evaluate(`location.hash = '#/progress'`);
    await sleep(500);
    await evaluate(`document.getElementById('export-btn').click()`);
    await sleep(1000);
    const exportedFiles = readdirSync(DOWNLOADS).filter((f) => f.endsWith('.json'));
    testResults.exportedFileFound = exportedFiles.length > 0;

    // Verify Import via CDP
    const testImportFile = join(DOWNLOADS, 'import-sample.json');
    writeFileSync(testImportFile, JSON.stringify({ game: 'Grand Theft Auto VI', earned: [1, 2, 3, 4] }));
    const doc = await send('DOM.getDocument');
    const inputNode = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#import-file' });
    await send('DOM.setFileInputFiles', { nodeId: inputNode.result.nodeId, files: [testImportFile] });
    await sleep(800);

    testResults.importedHeaderCount = await evaluate(`document.getElementById('big-count').textContent`);
    testResults.saveStatusText = await evaluate(`document.getElementById('save-status').textContent`);

    const external = requests.filter((u) => !u.startsWith('http://localhost:8080/'));
    console.log('Browser CDP results:', JSON.stringify({
      requestsCount: requests.length,
      externalRequests: external,
      consoleErrors,
      testResults
    }, null, 2));

    if (external.length > 0) throw new Error(`Detected external network calls: ${external.join(', ')}`);
    if (consoleErrors.length > 0) throw new Error(`Console errors detected: ${consoleErrors.join(', ')}`);
    if (testResults.renderedRows !== 55) throw new Error(`Expected 55 rendered rows, got ${testResults.renderedRows}`);

    console.log('Browser CDP functional test passed successfully!');
    ws.close();
  } finally {
    chromeProc.kill();
    if (serverProc) serverProc.kill();
  }
}

async function main() {
  verifyDataIntegrity();
  await verifyBrowserFunctionality();
  console.log('All verifications PASSED.');
}

main().catch((err) => {
  console.error('Verification FAILED:', err);
  process.exit(1);
});
