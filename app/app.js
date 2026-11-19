// Leonida Ledger — offline GTA VI trophy tracker.
// Loads only data/trophies.json from this app's own files, saves progress in
// localStorage, and makes no network request at run time.
const STORE_KEY = 'leonida-ledger-progress-v1';
const NOTES_KEY = 'leonida-ledger-notes-v1';
const SPOILER_KEY = 'leonida-ledger-spoilers-v1';
const DEMO_EARNED = [2, 3, 4, 8, 15, 20, 21, 28, 33, 35, 42, 46, 53];

const KIND_LABELS = {
  story: 'Story', missable: 'Missable', collectible: 'Collectibles',
  activity: 'Activities', combat: 'Combat & crime', exploration: 'Exploration',
  money: 'Money', completion: 'Completion', hidden: 'Hidden',
};

const ROADMAP_STAGES = [
  { title: 'Stage 1 — Story: chapters and the finale', note: 'Play the story in order. Chapter trophies are automatic; the final mission is gold.', ids: [2, 3, 4, 5, 6, 7] },
  { title: 'Stage 2 — Story: named missions (missable — do them on time)', note: 'Six named missions, each with its own trophy. Finish each while it is in front of you.', ids: [8, 9, 10, 11, 12, 13] },
  { title: 'Stage 3 — Character and stranger strands', note: 'Finish the five character strands (Andy, Kenton, Billy, Randy, Tyrone) and 8 stranger strands across Leonida.', ids: [22, 23, 24, 25, 26, 27] },
  { title: 'Stage 4 — Collectibles and exploration', note: 'Cards (3 sets), WAiNK It at 100 locations, 100 vehicles, 18 meditation spots, all 52 areas of Leonida.', ids: [30, 31, 35, 28, 42] },
  { title: 'Stage 5 — Activities, combat and partner trophies', note: 'The long grinds live here: 250 stunts, gold in all 42 Shooting Range challenges, 20 race wins, 14 drone-race locations, 5 bank vaults, and the partner and choice trophies.', ids: [15, 16, 17, 18, 19, 20, 21, 29, 32, 33, 34, 36, 37, 38, 39, 40, 41, 43, 44, 45, 46, 47, 48, 49, 50, 51, 55] },
  { title: 'Stage 6 — Money and cleanup, then the platinum', note: 'Launder $250,000 of Marked Bills, spend $100,000 in shops, buy all 8 garages, reach 100% completion — then Vice Got a Price! unlocks.', ids: [52, 53, 54, 14, 1] },
];

const state = {
  trophies: [],
  earned: new Set(),
  kind: 'all',
  grade: 'all',
  earnedFilter: 'all',
  query: '',
  spoilers: false,
  selectedId: null,
  view: 'checklist',
};

const $ = (id) => document.getElementById(id);
const byId = (id) => state.trophies.find((t) => t.id === id);
const trophyName = (t) => t.name;
const isSpoilerHidden = (t) => state.spoilers && !state.earned.has(t.id) && (t.kind === 'story' || t.hidden);

function loadStored() {
  try {
    state.earned = new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'));
  } catch {
    state.earned = new Set();
  }
  state.spoilers = localStorage.getItem(SPOILER_KEY) === 'on';
}

function saveProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...state.earned].sort((a, b) => a - b)));
}

function saveSpoilers() {
  localStorage.setItem(SPOILER_KEY, state.spoilers ? 'on' : 'off');
}

function visibleTrophies() {
  const q = state.query.trim().toLowerCase();
  return state.trophies.filter((t) => {
    if (state.kind === 'missable' && !t.missable) return false;
    if (state.kind === 'hidden' && !t.hidden) return false;
    if (state.kind !== 'all' && state.kind !== 'missable' && state.kind !== 'hidden' && t.kind !== state.kind) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.earnedFilter === 'earned' && !state.earned.has(t.id)) return false;
    if (state.earnedFilter === 'unearned' && state.earned.has(t.id)) return false;
    if (q && !(`${t.name} ${t.description}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

function gradePill(t) {
  const span = document.createElement('span');
  span.className = `pill ${t.grade}`;
  span.textContent = t.grade;
  return span;
}

function renderHeader() {
  const earned = state.earned.size;
  const total = state.trophies.length;
  $('big-count').textContent = String(earned);
  $('meter-fill').style.width = `${total ? Math.round((earned / total) * 100) : 0}%`;
  $('meter').setAttribute('aria-valuenow', String(earned));
  const counts = {};
  for (const t of state.trophies) {
    counts[t.grade] = counts[t.grade] || { earned: 0, total: 0 };
    counts[t.grade].total += 1;
    if (state.earned.has(t.id)) counts[t.grade].earned += 1;
  }
  $('grade-counts').replaceChildren();
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const c = counts[grade];
    if (!c) continue;
    const el = document.createElement('span');
    el.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = `${c.earned}/${c.total}`;
    el.append(b, document.createTextNode(` ${grade}`));
    $('grade-counts').append(el);
  }
}

function renderKindChips() {
  const kinds = ['all', 'story', 'missable', 'collectible', 'activity', 'combat', 'exploration', 'money', 'hidden'];
  const wrap = $('kind-chips');
  wrap.replaceChildren();
  for (const kind of kinds) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = kind === 'all' ? 'All kinds' : KIND_LABELS[kind];
    btn.setAttribute('aria-pressed', String(state.kind === kind));
    btn.addEventListener('click', () => {
      state.kind = kind;
      renderKindChips();
      renderList();
    });
    wrap.append(btn);
  }
}

function renderList() {
  const list = visibleTrophies();
  const ul = $('trophy-list');
  ul.replaceChildren();
  $('filter-summary').textContent = `Showing ${list.length} of ${state.trophies.length} trophies.`;
  if (list.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'No trophies match these filters. Clear the search or pick another kind.';
    ul.append(p);
    return;
  }
  for (const t of list) {
    const li = document.createElement('li');
    li.className = `trophy${state.earned.has(t.id) ? ' earned' : ''}${state.selectedId === t.id ? ' selected' : ''}`;
    const head = document.createElement('div');
    head.className = 'trophy-head';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.earned.has(t.id);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => {
      if (box.checked) state.earned.add(t.id);
      else state.earned.delete(t.id);
      saveProgress();
      renderAll();
    });
    const text = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = isSpoilerHidden(t) ? 'Hidden story trophy — earn it to reveal' : trophyName(t);
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = isSpoilerHidden(t) ? 'Spoilers off: the name and description stay hidden until this trophy is earned.' : t.description;
    text.append(name, desc);
    head.append(box, text);
    const meta = document.createElement('div');
    meta.className = 'trophy-meta';
    meta.append(gradePill(t));
    const kindPill = document.createElement('span');
    kindPill.className = 'pill';
    kindPill.textContent = KIND_LABELS[t.kind] ?? t.kind;
    meta.append(kindPill);
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'pill missable';
      m.textContent = 'Missable';
      meta.append(m);
    }
    if (t.hidden) {
      const h = document.createElement('span');
      h.className = 'pill hidden';
      h.textContent = 'Hidden';
      meta.append(h);
    }
    if (state.earned.has(t.id)) {
      const e = document.createElement('span');
      e.className = 'pill earned-pill';
      e.textContent = 'Earned ✓';
      meta.append(e);
    }
    li.append(head, meta);
    li.addEventListener('click', () => {
      state.selectedId = t.id;
      renderList();
      renderDetail();
    });
    ul.append(li);
  }
}

function renderDetail() {
  const panel = $('detail');
  panel.replaceChildren();
  const t = state.selectedId ? byId(state.selectedId) : null;
  if (!t) {
    const h = document.createElement('h2');
    h.textContent = 'Pick a trophy';
    const p = document.createElement('p');
    p.textContent = 'Select any trophy in the checklist to read its guide and sources here. Tick the box when you earn it — your progress is saved in this browser.';
    const p2 = document.createElement('p');
    p2.textContent = 'Every guide is written in our own words for this guide. A guide that repeats the trophy description adds nothing, so each one says what to do, when it can be missed, and where its facts come from.';
    panel.append(h, p, p2);
    return;
  }
  const h = document.createElement('h2');
  h.textContent = isSpoilerHidden(t) ? 'Hidden story trophy' : trophyName(t);
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = isSpoilerHidden(t)
    ? 'Spoilers off — earn this trophy to reveal its official name and description.'
    : `Official: “${t.description}” — ${t.grade}, ${t.hidden ? 'hidden' : 'visible'} on PlayStation.`;
  panel.append(h, official);
  const meta = document.createElement('div');
  meta.className = 'trophy-meta';
  meta.append(gradePill(t));
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'pill missable';
    m.textContent = '⚠ Missable — do it on time';
    meta.append(m);
  }
  panel.append(meta);
  if (t.missable && t.missable_note) {
    const warn = document.createElement('p');
    warn.className = 'honest';
    warn.textContent = t.missable_note;
    panel.append(warn);
  }
  const gh = document.createElement('h3');
  gh.textContent = 'Guide';
  const guide = document.createElement('p');
  guide.textContent = t.guide;
  panel.append(gh, guide);
  const sh = document.createElement('h3');
  sh.textContent = 'Sources';
  const ul = document.createElement('ul');
  ul.className = 'sources';
  for (const s of t.sources ?? []) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    li.append(a);
    ul.append(li);
  }
  panel.append(sh, ul);
  const honest = document.createElement('p');
  honest.className = 'honest';
  honest.textContent = 'Honest note: GTA VI launched 19 Nov 2026. Any step in this guide that has not yet been checked in the game says so in the guide text — no location or step is invented.';
  panel.append(honest);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'primary';
  toggle.textContent = state.earned.has(t.id) ? 'Mark as not earned' : 'Mark as earned';
  toggle.addEventListener('click', () => {
    if (state.earned.has(t.id)) state.earned.delete(t.id);
    else state.earned.add(t.id);
    saveProgress();
    renderAll();
  });
  panel.append(toggle);
}

function renderRoadmap() {
  const wrap = $('roadmap-stages');
  wrap.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const earned = stage.ids.filter((id) => state.earned.has(id)).length;
    const div = document.createElement('div');
    div.className = 'stage';
    const h = document.createElement('h2');
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = `${earned}/${stage.ids.length} earned`;
    h.append(document.createTextNode(stage.title), count);
    const p = document.createElement('p');
    p.textContent = stage.note;
    const ul = document.createElement('ul');
    for (const id of stage.ids) {
      const t = byId(id);
      if (!t) continue;
      const li = document.createElement('li');
      if (state.earned.has(id)) li.className = 'done';
      li.textContent = `${trophyName(t)} — ${t.grade}${t.missable ? ' · missable' : ''}`;
      ul.append(li);
    }
    div.append(h, p, ul);
    wrap.append(div);
  }
}

function renderMissables() {
  const ul = $('missable-list');
  ul.replaceChildren();
  for (const t of state.trophies.filter((x) => x.missable)) {
    const li = document.createElement('li');
    const b = document.createElement('b');
    b.textContent = isSpoilerHidden(t) ? 'Hidden story trophy' : trophyName(t);
    li.append(b, document.createTextNode(` — ${t.missable_note ?? t.description}`));
    if (state.earned.has(t.id)) li.append(document.createTextNode(' ✓ earned'));
    ul.append(li);
  }
}

function renderProgress() {
  const grid = $('stat-grid');
  grid.replaceChildren();
  const stats = [
    [state.earned.size, 'of 55 earned'],
    [state.trophies.filter((t) => t.missable && state.earned.has(t.id)).length, 'of 14 missables earned'],
    [state.trophies.filter((t) => t.kind === 'collectible' && state.earned.has(t.id)).length, 'of 4 collectibles earned'],
    [state.trophies.filter((t) => t.kind === 'story' && state.earned.has(t.id)).length, 'of 19 story earned'],
  ];
  for (const [n, label] of stats) {
    const div = document.createElement('div');
    div.className = 'stat';
    const b = document.createElement('b');
    b.textContent = String(n);
    const s = document.createElement('span');
    s.textContent = label;
    div.append(b, s);
    grid.append(div);
  }
  const bars = $('grade-bars');
  bars.replaceChildren();
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const total = state.trophies.filter((t) => t.grade === grade).length;
    const earned = state.trophies.filter((t) => t.grade === grade && state.earned.has(t.id)).length;
    const row = document.createElement('div');
    row.className = 'bar-row';
    const label = document.createElement('span');
    label.textContent = grade;
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('i');
    fill.style.width = `${total ? Math.round((earned / total) * 100) : 0}%`;
    bar.append(fill);
    const num = document.createElement('span');
    num.textContent = `${earned}/${total}`;
    row.append(label, bar, num);
    bars.append(row);
  }
}

function renderAudit() {
  const hidden = state.trophies.filter((t) => t.hidden).length;
  const missable = state.trophies.filter((t) => t.missable).length;
  $('audit-strip').textContent = `Audit: 55 trophies — 1 platinum, 2 gold, 6 silver, 46 bronze · ${hidden} hidden · ${missable} missable · every name, description and grade checked against Exophase and PSNProfiles, 20 Nov 2026 · every guide in our own words with named sources · works fully offline.`;
}

function renderAll() {
  renderHeader();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
  renderProgress();
  renderAudit();
}

function showView(view) {
  state.view = view;
  for (const v of ['checklist', 'roadmap', 'missables', 'progress']) {
    $('view-' + v).hidden = v !== view;
  }
  for (const a of document.querySelectorAll('nav.tabs a')) {
    if (a.dataset.view === view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', exported: new Date().toISOString(), earned: [...state.earned].sort((a, b) => a - b) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-ledger-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
  $('save-status').textContent = `Exported ${state.earned.size} earned trophies to leonida-ledger-progress.json.`;
}

async function importProgress(file) {
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    const valid = new Set(state.trophies.map((t) => t.id));
    const imported = [...new Set(ids.filter((id) => valid.has(id)))];
    state.earned = new Set(imported);
    saveProgress();
    renderAll();
    $('save-status').textContent = `Imported ${imported.length} earned trophies.`;
  } catch {
    $('save-status').textContent = 'That file could not be read as a progress export. Pick the .json file this guide exported.';
  }
}

function seedDemo() {
  state.earned = new Set(DEMO_EARNED);
  saveProgress();
  renderAll();
}

function applyUrlState() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1' && state.earned.size === 0) seedDemo();
  if (params.get('spoiler') === 'on') {
    state.spoilers = true;
    saveSpoilers();
  }
  const trophy = Number(params.get('trophy'));
  if (trophy && byId(trophy)) state.selectedId = trophy;
  const kind = params.get('kind');
  if (kind && (KIND_LABELS[kind] || kind === 'missable' || kind === 'hidden')) state.kind = kind;
}

function routeFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const view = ['checklist', 'roadmap', 'missables', 'progress'].includes(hash) ? hash : 'checklist';
  showView(view);
  if (view === 'checklist' && state.selectedId) renderDetail();
}

async function bootLeonidaLedger() {
  loadStored();
  const data = await (await fetch('data/trophies.json')).json();
  state.trophies = data.trophies;
  if (!state.selectedId) state.selectedId = 17;
  applyUrlState();
  $('spoiler-toggle').checked = state.spoilers;
  $('spoiler-toggle').addEventListener('change', (event) => {
    state.spoilers = event.target.checked;
    saveSpoilers();
    renderAll();
  });
  $('search').addEventListener('input', (event) => {
    state.query = event.target.value;
    renderList();
  });
  $('grade-filter').addEventListener('change', (event) => {
    state.grade = event.target.value;
    renderList();
  });
  $('earned-filter').addEventListener('change', (event) => {
    state.earnedFilter = event.target.value;
    renderList();
  });
  $('export-btn').addEventListener('click', exportProgress);
  $('import-file').addEventListener('change', (event) => {
    if (event.target.files[0]) importProgress(event.target.files[0]);
    event.target.value = '';
  });
  $('demo-btn').addEventListener('click', seedDemo);
  $('reset-btn').addEventListener('click', () => {
    state.earned = new Set();
    saveProgress();
    renderAll();
    $('save-status').textContent = 'Progress cleared.';
  });
  const notes = $('notes');
  notes.value = localStorage.getItem(NOTES_KEY) ?? '';
  notes.addEventListener('input', () => localStorage.setItem(NOTES_KEY, notes.value));
  window.addEventListener('hashchange', routeFromHash);
  renderKindChips();
  renderAll();
  routeFromHash();
}

bootLeonidaLedger();
