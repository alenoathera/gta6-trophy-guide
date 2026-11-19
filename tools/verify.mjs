// Leonida Ledger functional check: drives the installed Chromium over CDP,
// loads the app from the local server, logs every network request, ticks a
// trophy, checks localStorage, exports progress, imports it back, and flips
// the spoiler toggle and a filter. Node 22+ stdlib only (global WebSocket).
// Usage: node tools/verify.mjs   (serve.ts must already be running on :8080)
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CHROME = join(homedir(), '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome');
const PORT = 9222;
const APP = 'http://localhost:8080/?demo=1#/checklist';
const DOWNLOADS = join(process.cwd(), 'tools/downloads');
mkdirSync(DOWNLOADS, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-first-run', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${PORT}`, '--user-data-dir=' + join(process.cwd(), 'tools/chrome-profile'),
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    let version = null;
    for (let i = 0; i < 30 && !version; i++) {
      await sleep(500);
      try { version = await (await fetch(`http://localhost:${PORT}/json/version`)).json(); } catch { /* not up yet */ }
    }
    if (!version) throw new Error('Chromium DevTools did not come up');

    const target = await (await fetch(`http://localhost:${PORT}/json/new?http://localhost:8080/`, { method: 'PUT' })).json();
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
      if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push(JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
    };
    const send = (method, params = {}) => new Promise((resolve) => {
      const id = nextId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error('evaluate failed: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400));
      return r.result?.result?.value;
    };

    await send('Network.enable');
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS });
    await send('Page.navigate', { url: APP });
    await sleep(2500);

    const checks = {};
    checks.trophyRows = await evaluate(`document.querySelectorAll('#trophy-list .trophy').length`);
    checks.headerCount = await evaluate(`document.getElementById('big-count').textContent`);
    checks.detailTitle = await evaluate(`document.querySelector('#detail h2')?.textContent`);
    checks.sourcesShown = await evaluate(`[...document.querySelectorAll('#detail .sources a')].map(a => a.textContent).join(' | ')`);

    // Tick the first unearned trophy and confirm localStorage saves it.
    checks.savedAfterTick = await evaluate(`(() => {
      const box = [...document.querySelectorAll('#trophy-list .trophy input')].find(i => !i.checked);
      box.click();
      return JSON.parse(localStorage.getItem('leonida-ledger-progress-v1')).length;
    })()`);

    // Spoiler toggle hides a story trophy name.
    checks.spoilerWorks = await evaluate(`(() => {
      document.getElementById('spoiler-toggle').click();
      return document.querySelector('#trophy-list .trophy-name').textContent;
    })()`);
    await evaluate(`document.getElementById('spoiler-toggle').click()`);

    // Missable filter shows exactly the 14 missables.
    checks.missableCount = await evaluate(`(() => {
      [...document.querySelectorAll('#kind-chips button')].find(b => b.textContent === 'Missable').click();
      return document.querySelectorAll('#trophy-list .trophy').length;
    })()`);

    // Export: click the export button on the progress view, then look for the file.
    await evaluate(`location.hash = '#/progress'`);
    await sleep(500);
    await evaluate(`document.getElementById('export-btn').click()`);
    await sleep(1500);
    const exported = readdirSync(DOWNLOADS).filter((f) => f.endsWith('.json'));
    checks.exportFile = exported.join(', ') || 'NONE';

    // Import: write a 3-trophy progress file and feed it to the file input.
    const importPath = join(DOWNLOADS, 'import-test.json');
    writeFileSync(importPath, JSON.stringify({ game: 'Grand Theft Auto VI', earned: [1, 2, 3] }));
    // Set the file on the import input via CDP (a DataTransfer cannot carry
    // real files from page JavaScript, so DOM.setFileInputFiles is the way).
    const doc = await send('DOM.getDocument');
    const query = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#import-file' });
    await send('DOM.setFileInputFiles', { nodeId: query.result.nodeId, files: [importPath] });
    await sleep(1200);
    checks.importedCount = await evaluate(`document.getElementById('big-count').textContent`);
    checks.saveStatus = await evaluate(`document.getElementById('save-status').textContent`);

    const external = requests.filter((u) => !u.startsWith('http://localhost:8080/'));
    console.log(JSON.stringify({
      requests: requests.length,
      requestUrls: [...new Set(requests)],
      externalRequests: external,
      consoleErrors,
      checks,
    }, null, 2));
    if (external.length) process.exitCode = 1;
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
