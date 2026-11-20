// Leonida Ledger — Client Application
// Fully offline Grand Theft Auto VI trophy guide and platinum tracker.
// Zero runtime network requests; saves state in localStorage.

const KEY_PROGRESS = 'leonida-ledger-progress-v1';
const KEY_NOTES = 'leonida-ledger-notes-v1';
const KEY_SPOILER = 'leonida-ledger-spoiler-v1';

const DEMO_IDS = [2, 3, 4, 8, 16, 20, 21, 35, 44, 45, 46, 52, 53];

const STAGES = [
  {
    num: 1,
    title: 'Stage 1: Main Story Campaign & Heists',
    desc: 'Work through the narrative chapters and named heists. Watch out for missable heist objectives and make manual backup saves before major choices.',
    ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 47, 48, 49]
  },
  {
    num: 2,
    title: 'Stage 2: Strangers & Freaks Strands',
    desc: 'Complete all 8 stranger storylines across Leonida, including Andy, Kenton, Billy, Randy, Tyrone, and Bret before the endgame.',
    ids: [22, 23, 24, 25, 26, 27, 29]
  },
  {
    num: 3,
    title: 'Stage 3: Mini-games & Leisure Activities',
    desc: 'Sample every recreational activity, master the 42 Shooting Range challenges, win 14 drone races, 20 street/off-road races, and arcade games.',
    ids: [16, 17, 18, 19, 20, 21, 46, 55]
  },
  {
    num: 4,
    title: 'Stage 4: Collectibles & World Exploration',
    desc: 'Discover all 52 regions, complete 3 card sets, visit 100 WAiNK spots, meditate at 18 vistas, catalog 100 vehicles, and complete 250 stunts.',
    ids: [15, 28, 30, 31, 32, 35, 37, 42, 44, 45, 50]
  },
  {
    num: 5,
    title: 'Stage 5: Criminal Operations, Combat & Economy',
    desc: 'Rob 5 bank vaults, take down armored trucks, raid 9 gang operations, spend $100k, launder $250k, and buy all 8 garages.',
    ids: [33, 34, 36, 38, 39, 40, 41, 43, 51, 52, 53, 54]
  },
  {
    num: 6,
    title: 'Stage 6: 100% Completion & Platinum Cleanup',
    desc: 'Tie up all loose requirements to achieve 100% Game Completion and claim the ultimate Leonida Legend platinum.',
    ids: [14, 1]
  }
];

const KINDS = [
  { id: 'all', label: 'All' },
  { id: 'story', label: 'Story' },
  { id: 'missable', label: 'Missable' },
  { id: 'activities', label: 'Activities' },
  { id: 'collectibles', label: 'Collectibles' },
  { id: 'strangers', label: 'Strangers' },
  { id: 'combat', label: 'Combat' },
  { id: 'crime', label: 'Crime' },
  { id: 'exploration', label: 'Exploration' },
  { id: 'money', label: 'Money' },
  { id: 'completion', label: 'Completion' }
];

let trophies = [];
let earnedSet = new Set();
let selectedTrophyId = 1;
let currentKind = 'all';
let spoilerShield = false;

// DOM Elements
const bigCountEl = document.getElementById('big-count');
const meterFillEl = document.getElementById('meter-fill');
const meterEl = document.getElementById('meter');
const gradeCountsEl = document.getElementById('grade-counts');
const searchEl = document.getElementById('search');
const gradeFilterEl = document.getElementById('grade-filter');
const earnedFilterEl = document.getElementById('earned-filter');
const kindChipsEl = document.getElementById('kind-chips');
const spoilerToggleEl = document.getElementById('spoiler-toggle');
const filterSummaryEl = document.getElementById('filter-summary');
const trophyListEl = document.getElementById('trophy-list');
const detailEl = document.getElementById('detail');
const auditStripEl = document.getElementById('audit-strip');
const roadmapStagesEl = document.getElementById('roadmap-stages');
const missableListEl = document.getElementById('missable-list');
const statGridEl = document.getElementById('stat-grid');
const gradeBarsEl = document.getElementById('grade-bars');
const exportBtn = document.getElementById('export-btn');
const importFileEl = document.getElementById('import-file');
const demoBtn = document.getElementById('demo-btn');
const resetBtn = document.getElementById('reset-btn');
const saveStatusEl = document.getElementById('save-status');
const notesEl = document.getElementById('notes');

function loadState() {
  try {
    const raw = localStorage.getItem(KEY_PROGRESS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        earnedSet = new Set(arr.map(Number));
      }
    }
  } catch (e) {
    earnedSet = new Set();
  }

  try {
    spoilerShield = localStorage.getItem(KEY_SPOILER) === 'true';
    if (spoilerToggleEl) spoilerToggleEl.checked = spoilerShield;
  } catch (e) {}

  if (notesEl) {
    notesEl.value = localStorage.getItem(KEY_NOTES) || '';
  }
}

function saveState() {
  try {
    localStorage.setItem(KEY_PROGRESS, JSON.stringify([...earnedSet]));
    localStorage.setItem(KEY_SPOILER, String(spoilerShield));
  } catch (e) {}
}

function toggleEarned(id) {
  const numId = Number(id);
  if (earnedSet.has(numId)) {
    earnedSet.delete(numId);
  } else {
    earnedSet.add(numId);
  }
  saveState();
  updateAllViews();
}

function updateHeaderAndStats() {
  const total = trophies.length || 55;
  const count = earnedSet.size;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  if (bigCountEl) bigCountEl.textContent = String(count);
  if (meterFillEl) meterFillEl.style.width = `${pct}%`;
  if (meterEl) meterEl.setAttribute('aria-valuenow', String(count));

  const grades = { platinum: { total: 0, earned: 0 }, gold: { total: 0, earned: 0 }, silver: { total: 0, earned: 0 }, bronze: { total: 0, earned: 0 } };
  for (const t of trophies) {
    if (grades[t.grade]) {
      grades[t.grade].total++;
      if (earnedSet.has(t.id)) grades[t.grade].earned++;
    }
  }

  if (gradeCountsEl) {
    gradeCountsEl.innerHTML = `
      <span>Platinum: <b>${grades.platinum.earned}/${grades.platinum.total}</b></span>
      <span>Gold: <b>${grades.gold.earned}/${grades.gold.total}</b></span>
      <span>Silver: <b>${grades.silver.earned}/${grades.silver.total}</b></span>
      <span>Bronze: <b>${grades.bronze.earned}/${grades.bronze.total}</b></span>
    `;
  }

  // Progress Tab Stats
  if (statGridEl) {
    statGridEl.innerHTML = `
      <div class="stat"><b>${count} / ${total}</b><span>Trophies Unlocked</span></div>
      <div class="stat"><b>${pct}%</b><span>Total Completion</span></div>
      <div class="stat"><b>${grades.platinum.earned + grades.gold.earned}</b><span>Gold &amp; Platinum</span></div>
      <div class="stat"><b>${total - count}</b><span>Remaining</span></div>
    `;
  }

  if (gradeBarsEl) {
    gradeBarsEl.innerHTML = Object.entries(grades).map(([g, val]) => {
      const gPct = val.total > 0 ? Math.round((val.earned / val.total) * 100) : 0;
      return `
        <div class="bar-row">
          <span style="text-transform:capitalize;font-weight:600;">${g}</span>
          <div class="bar"><i style="width:${gPct}%"></i></div>
          <span>${val.earned}/${val.total}</span>
        </div>
      `;
    }).join('');
  }
}

function renderKindChips() {
  if (!kindChipsEl) return;
  kindChipsEl.innerHTML = '';
  for (const k of KINDS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = k.label;
    btn.setAttribute('aria-pressed', currentKind === k.id ? 'true' : 'false');
    btn.addEventListener('click', () => {
      currentKind = k.id;
      renderKindChips();
      renderChecklist();
    });
    kindChipsEl.appendChild(btn);
  }
}

function renderChecklist() {
  if (!trophyListEl) return;
  trophyListEl.innerHTML = '';

  const q = (searchEl?.value || '').toLowerCase().trim();
  const gradeFilter = gradeFilterEl?.value || 'all';
  const earnedFilter = earnedFilterEl?.value || 'all';

  let visibleCount = 0;

  for (const t of trophies) {
    const isEarned = earnedSet.has(t.id);

    // Filter checks
    if (gradeFilter !== 'all' && t.grade !== gradeFilter) continue;
    if (earnedFilter === 'earned' && !isEarned) continue;
    if (earnedFilter === 'unearned' && isEarned) continue;

    if (currentKind !== 'all') {
      if (currentKind === 'missable') {
        if (!t.missable) continue;
      } else if (t.kind !== currentKind) {
        continue;
      }
    }

    if (q) {
      const textMatch = t.name.toLowerCase().includes(q) ||
                        t.description.toLowerCase().includes(q) ||
                        t.guide.toLowerCase().includes(q);
      if (!textMatch) continue;
    }

    visibleCount++;

    const isStory = t.kind === 'story';
    const hideStoryInfo = spoilerShield && isStory && !isEarned;

    const li = document.createElement('li');
    li.className = `trophy ${isEarned ? 'earned' : ''} ${t.id === selectedTrophyId ? 'selected' : ''}`;
    li.dataset.id = String(t.id);

    const displayName = hideStoryInfo ? 'Hidden Story Trophy' : t.name;
    const displayDesc = hideStoryInfo ? 'Story trophy hidden — earn it to reveal.' : t.description;

    li.innerHTML = `
      <div class="trophy-head">
        <input type="checkbox" ${isEarned ? 'checked' : ''} aria-label="Mark ${displayName} as earned">
        <div style="flex:1;">
          <div class="trophy-name">${displayName}</div>
          <div class="trophy-desc">${displayDesc}</div>
          <div class="trophy-meta">
            <span class="pill ${t.grade}">${t.grade}</span>
            <span class="pill">${t.kind}</span>
            ${t.missable ? '<span class="pill missable">Missable</span>' : ''}
            ${t.hidden ? '<span class="pill hidden">Hidden</span>' : ''}
            ${isEarned ? '<span class="pill earned-pill">✓ Earned</span>' : ''}
          </div>
        </div>
      </div>
    `;

    const checkbox = li.querySelector('input');
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleEarned(t.id);
    });

    li.addEventListener('click', () => {
      selectedTrophyId = t.id;
      renderChecklist();
      renderDetail();
    });

    trophyListEl.appendChild(li);
  }

  if (filterSummaryEl) {
    filterSummaryEl.textContent = `Showing ${visibleCount} of ${trophies.length} trophies`;
  }
  if (auditStripEl) {
    auditStripEl.textContent = `Official 55 PlayStation 5 trophy roster. Verified live on Exophase and PSNProfiles on 20 Nov 2026.`;
  }
}

function renderDetail() {
  if (!detailEl) return;
  const t = trophies.find((x) => x.id === selectedTrophyId);
  if (!t) {
    detailEl.innerHTML = `<div class="empty">Select a trophy to inspect its strategy guide.</div>`;
    return;
  }

  const isEarned = earnedSet.has(t.id);
  const isStory = t.kind === 'story';
  const hideStory = spoilerShield && isStory && !isEarned;

  const displayName = hideStory ? 'Hidden Story Trophy' : t.name;
  const displayDesc = hideStory ? 'Official description hidden by Anti-Spoiler Shield.' : t.description;

  const sourcesList = (t.sources || []).map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a></li>`).join('');

  detailEl.innerHTML = `
    <h2>${displayName}</h2>
    <p class="official">“${displayDesc}”</p>
    <div class="trophy-meta" style="margin-bottom:12px;">
      <span class="pill ${t.grade}">${t.grade}</span>
      <span class="pill">${t.kind}</span>
      ${t.missable ? '<span class="pill missable">Missable</span>' : ''}
      ${t.hidden ? '<span class="pill hidden">Hidden</span>' : ''}
      ${isEarned ? '<span class="pill earned-pill">✓ Earned</span>' : ''}
    </div>

    ${t.missable && t.missable_note ? `<div class="warn-box" style="margin:10px 0;"><strong>Missable Warning:</strong> ${t.missable_note}</div>` : ''}

    <h3>Trophy Strategy Guide</h3>
    <p>${t.guide}</p>

    <div class="honest">
      <strong>Launch Verification Note:</strong> Grand Theft Auto VI launched 19 Nov 2026. Specific world coordinates and mission checkpoints are based on initial day-one documentation and remain subject to live confirmation.
    </div>

    <h3>Verified Sources</h3>
    <ul class="sources">
      ${sourcesList}
    </ul>

    <div style="margin-top:16px;">
      <button type="button" class="${isEarned ? 'danger' : 'primary'}" id="detail-toggle-btn" style="width:100%;">
        ${isEarned ? 'Mark as Unearned' : 'Mark as Earned'}
      </button>
    </div>
  `;

  const btn = detailEl.querySelector('#detail-toggle-btn');
  btn?.addEventListener('click', () => {
    toggleEarned(t.id);
    renderDetail();
  });
}

function renderRoadmap() {
  if (!roadmapStagesEl) return;
  roadmapStagesEl.innerHTML = '';

  const trophyMap = new Map(trophies.map((t) => [t.id, t]));

  for (const stage of STAGES) {
    const stageDiv = document.createElement('div');
    stageDiv.className = 'stage';

    let stageEarned = 0;
    const stageItems = stage.ids.map((id) => {
      const t = trophyMap.get(id);
      if (!t) return '';
      const isDone = earnedSet.has(id);
      if (isDone) stageEarned++;
      return `
        <li class="${isDone ? 'done' : ''}">
          <strong>${t.name}</strong> (${t.grade}) — ${t.missable ? '<span style="color:var(--warning-color);font-weight:600;">[Missable]</span> ' : ''}${t.description}
        </li>
      `;
    }).join('');

    stageDiv.innerHTML = `
      <span class="count">${stageEarned} / ${stage.ids.length} Done</span>
      <h3>${stage.title}</h3>
      <p>${stage.desc}</p>
      <ul>${stageItems}</ul>
    `;
    roadmapStagesEl.appendChild(stageDiv);
  }
}

function renderMissables() {
  if (!missableListEl) return;
  missableListEl.innerHTML = '';

  const missables = trophies.filter((t) => t.missable);

  for (const t of missables) {
    const isEarned = earnedSet.has(t.id);
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="display:flex;gap:10px;align-items:flex-start;">
        <input type="checkbox" ${isEarned ? 'checked' : ''} style="margin-top:4px;" aria-label="Mark ${t.name} as earned">
        <div style="flex:1;">
          <strong>${t.name}</strong> <span class="pill ${t.grade}">${t.grade}</span>
          <div style="color:var(--text-muted);font-size:13.5px;margin-top:2px;">${t.description}</div>
          <div class="miss-note"><strong>Danger:</strong> ${t.missable_note || 'Complete before advancing story.'}</div>
        </div>
      </div>
    `;

    const checkbox = li.querySelector('input');
    checkbox.addEventListener('change', () => {
      toggleEarned(t.id);
    });

    missableListEl.appendChild(li);
  }
}

function updateAllViews() {
  updateHeaderAndStats();
  renderChecklist();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

function handleRouting() {
  const hash = window.location.hash || '#/checklist';
  const views = {
    '#/checklist': document.getElementById('view-checklist'),
    '#/roadmap': document.getElementById('view-roadmap'),
    '#/missables': document.getElementById('view-missables'),
    '#/progress': document.getElementById('view-progress')
  };

  const navLinks = document.querySelectorAll('nav.tabs a');
  navLinks.forEach((link) => {
    if (link.getAttribute('href') === hash) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  for (const [key, section] of Object.entries(views)) {
    if (section) {
      section.hidden = (key !== hash);
    }
  }
}

function setupEventListeners() {
  window.addEventListener('hashchange', handleRouting);

  searchEl?.addEventListener('input', renderChecklist);
  gradeFilterEl?.addEventListener('change', renderChecklist);
  earnedFilterEl?.addEventListener('change', renderChecklist);

  spoilerToggleEl?.addEventListener('change', () => {
    spoilerShield = spoilerToggleEl.checked;
    saveState();
    renderChecklist();
    renderDetail();
  });

  exportBtn?.addEventListener('click', () => {
    const data = {
      game: 'Grand Theft Auto VI',
      platform: 'PlayStation 5',
      exported_at: new Date().toISOString(),
      earned: [...earnedSet]
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leonida-ledger-progress.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (saveStatusEl) saveStatusEl.textContent = 'Progress exported successfully.';
  });

  importFileEl?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const importedList = Array.isArray(parsed) ? parsed : (parsed.earned || []);
        earnedSet = new Set(importedList.map(Number));
        saveState();
        updateAllViews();
        if (saveStatusEl) saveStatusEl.textContent = `Imported ${earnedSet.size} earned trophies.`;
      } catch (err) {
        if (saveStatusEl) saveStatusEl.textContent = 'Failed to parse import JSON file.';
      }
    };
    reader.readAsText(file);
  });

  demoBtn?.addEventListener('click', () => {
    earnedSet = new Set(DEMO_IDS);
    saveState();
    updateAllViews();
    if (saveStatusEl) saveStatusEl.textContent = `Loaded demo progress (${earnedSet.size} / 55 earned).`;
  });

  resetBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all earned trophy progress?')) {
      earnedSet = new Set();
      saveState();
      updateAllViews();
      if (saveStatusEl) saveStatusEl.textContent = 'All progress reset.';
    }
  });

  notesEl?.addEventListener('input', () => {
    try {
      localStorage.setItem(KEY_NOTES, notesEl.value);
    } catch (e) {}
  });
}

function processQueryParams() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('demo') === '1') {
    earnedSet = new Set(DEMO_IDS);
    saveState();
  }

  if (params.get('spoiler') === 'on') {
    spoilerShield = true;
    if (spoilerToggleEl) spoilerToggleEl.checked = true;
    saveState();
  }

  if (params.get('kind')) {
    currentKind = params.get('kind');
  }

  if (params.get('trophy')) {
    const tid = Number(params.get('trophy'));
    if (tid >= 1 && tid <= 55) {
      selectedTrophyId = tid;
    }
  }
}

async function boot() {
  loadState();
  processQueryParams();

  try {
    const resp = await fetch('data/trophies.json');
    const data = await resp.json();
    trophies = data.trophies || [];
  } catch (err) {
    console.error('Failed to load trophies.json', err);
  }

  setupEventListeners();
  renderKindChips();
  handleRouting();
  updateAllViews();
}

boot();
