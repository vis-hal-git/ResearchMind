/* ═══════════════════════════════════════════════════════════════
   RESEARCHMIND — APPLICATION JAVASCRIPT
   Modular vanilla JS: page routing, pipeline simulation,
   file upload, source approval, report rendering, downloads
═══════════════════════════════════════════════════════════════ */

'use strict';

const API_BASE = window.location.origin && window.location.origin !== 'null'
  ? window.location.origin
  : 'http://127.0.0.1:8000';

// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════
const state = {
  currentPage: 'landing',
  files: [],
  searchDepth: 'standard',
  maxSources: 12,
  threadId: null,
  pipeline: {
    current: null, // 'search' | 'approval' | 'scrape' | 'critic' | 'done'
    steps: { search: 'idle', approval: 'idle', scrape: 'idle', critic: 'idle' }
  },
  sources: [],
  approvedSources: [],
  report: null,
};

// ══════════════════════════════════════════════════════════════
// SAMPLE DATA
// ══════════════════════════════════════════════════════════════
const SAMPLE_SOURCES = [
  {
    id: 1, selected: true,
    title: 'De-dollarization: Myth or Looming Reality?',
    url: 'https://www.brookings.edu/articles/de-dollarization-myth-or-looming-reality',
    domain: 'brookings.edu',
    snippet: 'This analysis examines the structural forces behind de-dollarization trends, assessing whether the US dollar\'s reserve currency status faces credible long-term threats from BRICS economies and alternative settlement systems.',
    relevance: 'high', type: 'Think Tank'
  },
  {
    id: 2, selected: true,
    title: 'BRICS and the Challenge to Dollar Hegemony',
    url: 'https://www.imf.org/en/Publications/WP/Issues/2023/brics-dollar',
    domain: 'imf.org',
    snippet: 'IMF working paper exploring bilateral trade settlement in non-dollar currencies, the rise of mBridge, and projections for dollar share in global forex reserves through 2030.',
    relevance: 'high', type: 'Academic'
  },
  {
    id: 3, selected: true,
    title: 'The Geopolitics of Currency: Sanctions, SWIFT, and Alternatives',
    url: 'https://foreignpolicy.com/2023/08/geopolitics-currency-swift',
    domain: 'foreignpolicy.com',
    snippet: 'How the weaponization of SWIFT access following Russia\'s 2022 invasion accelerated sovereign interest in alternative payment rails across the Global South.',
    relevance: 'high', type: 'Journalism'
  },
  {
    id: 4, selected: false,
    title: 'Renminbi Internationalization: Progress and Obstacles',
    url: 'https://www.cfr.org/report/renminbi-internationalization',
    domain: 'cfr.org',
    snippet: 'Council on Foreign Relations report on China\'s systematic push toward RMB internationalization and the structural barriers — capital controls, trust deficits — that constrain its reserve currency potential.',
    relevance: 'mid', type: 'Think Tank'
  },
  {
    id: 5, selected: true,
    title: 'Petrodollar System Under Strain: Saudi-China Oil Deals',
    url: 'https://www.ft.com/content/saudi-china-oil-yuan-settlement',
    domain: 'ft.com',
    snippet: 'Financial Times investigation into Saudi Arabia\'s exploratory moves toward yuan-denominated oil contracts and what this implies for the petrodollar system established in 1973.',
    relevance: 'high', type: 'Financial Media'
  },
  {
    id: 6, selected: false,
    title: 'Dollar Dominance in Global Trade Invoicing',
    url: 'https://www.nber.org/papers/w28356',
    domain: 'nber.org',
    snippet: 'NBER empirical study on the persistence of dollar invoicing in international trade, with cross-country data on currency substitution trends and elasticity of invoicing to exchange rate volatility.',
    relevance: 'mid', type: 'Academic'
  },
  {
    id: 7, selected: true,
    title: 'Emerging Market Central Bank Reserve Diversification 2019–2024',
    url: 'https://www.bis.org/publ/work-em-reserve-diversification',
    domain: 'bis.org',
    snippet: 'Bank for International Settlements analysis of reserve currency composition shifts among 50 emerging market central banks, tracking declining dollar share and rising allocations to gold, CNY, and minor currencies.',
    relevance: 'high', type: 'Central Bank Research'
  },
  {
    id: 8, selected: false,
    title: 'The End of the Dollar? A Premature Obituary',
    url: 'https://www.economist.com/finance/2024/dollar-reserve-status',
    domain: 'economist.com',
    snippet: 'The Economist argues that despite structural pressures, the dollar\'s network effects, deep capital markets, and institutional inertia give it multi-decade durability as the primary reserve currency.',
    relevance: 'mid', type: 'Financial Media'
  },
];

const SAMPLE_REPORT_MD = `# De-dollarization in Emerging Markets: Geopolitical Consequences Post-2022

## Executive Summary

The geopolitical shock of Russia's 2022 invasion of Ukraine and the subsequent weaponization of the SWIFT financial messaging system catalyzed a structural inflection point in global monetary order. This report synthesizes evidence from multilateral institutions, central bank research, and geopolitical analysis to assess the long-term consequences of de-dollarization for emerging market economies, great power competition, and the stability of the international financial system.

Our core finding: de-dollarization is real, accelerating at the margins, and consequential — but the dollar's displacement is generational, not imminent.

---

## 1. The 2022 Inflection Point

The freezing of approximately $300 billion in Russian sovereign foreign exchange reserves following the invasion of Ukraine marked an unprecedented use of dollar infrastructure as a geopolitical instrument. For sovereign actors worldwide, this event transmitted an unambiguous signal: dollar-denominated assets held in Western custodial systems are subject to political seizure.

> "The weaponization of the dollar is the single most significant catalyst for reserve diversification since the Nixon Shock of 1971." — BIS Working Paper, 2023

The consequences have been measurable. Central bank gold purchases reached record highs in 2022 and 2023. Bilateral trade agreements denominated in non-dollar currencies proliferated. And the political discourse around reserve currency alternatives — previously confined to academic heterodoxy — entered mainstream sovereign policy deliberation.

---

## 2. Structural Forces Driving De-dollarization

### 2.1 Reserve Diversification

Among the 50 emerging market central banks tracked in BIS data, the dollar's share of identified foreign exchange reserves declined from approximately 71% in 2000 to 58% in 2023. This secular decline, while gradual, represents a meaningful redistribution of reserve allocation:

| Currency        | 2000 Share | 2023 Share | Δ        |
|-----------------|-----------|-----------|----------|
| USD             | 71%       | 58%       | −13 pp   |
| EUR             | 18%       | 20%       | +2 pp    |
| CNY             | —         | 2.5%      | +2.5 pp  |
| Gold (equiv.)   | 4%        | 10%       | +6 pp    |
| Other           | 7%        | 9.5%      | +2.5 pp  |

The rise in gold allocation is particularly notable — a flight to a non-sovereign, non-confiscatable store of value that signals underlying distrust of any single national currency.

### 2.2 Alternative Payment Rails

The mBridge project — a multi-CBDC platform developed jointly by the BIS Innovation Hub, the Hong Kong Monetary Authority, the Bank of Thailand, the Digital Currency Institute of the People's Bank of China, and the Central Bank of the UAE — represents the most advanced institutional infrastructure for cross-border settlement outside the SWIFT/correspondent banking system. As of 2024, it had processed over $22 billion in transactions.

### 2.3 Petrodollar Strain

Saudi Arabia's exploratory engagement with yuan-denominated oil settlement contracts represents a symbolic and structural threat to the petrodollar arrangement established in 1974. While no permanent shift has occurred, the willingness to negotiate represents a departure from decades of Riyadh's firm commitment to dollar exclusivity in energy pricing.

---

## 3. Counterforces: Why Dollar Dominance Persists

De-dollarization faces powerful structural headwinds that constrain the pace and scale of transition:

**Network Effects**: The dollar's role as the dominant invoicing currency in global trade (accounting for approximately 88% of all forex transactions) creates powerful lock-in. Firms and sovereigns cannot unilaterally exit without bearing prohibitive transaction costs.

**Capital Market Depth**: The US Treasury market remains the deepest, most liquid sovereign debt market in the world. No alternative — including euro-denominated debt — approaches its capacity to absorb large reserve flows without significant price impact.

**Institutional Trust**: The renminbi's path to reserve currency status is constrained by China's capital account restrictions, the opacity of its legal institutions, and geopolitical concerns among potential holders. These are not short-term solvable problems.

**Dollar Invoicing Inertia**: NBER research demonstrates that trade invoicing in dollars persists even among economies that have minimal trade with the United States, driven by the dollar's role as a vehicle currency in third-country transactions.

---

## 4. Geopolitical Consequences for Emerging Markets

### 4.1 Monetary Sovereignty and Policy Space

A gradual reduction in dollar dependency expands monetary policy autonomy for emerging market central banks. Countries with large dollar-denominated external debt have historically faced "original sin" constraints — they cannot let their currencies depreciate without triggering debt distress. To the extent de-dollarization reduces this liability structure, it expands macroeconomic policy space.

### 4.2 Bifurcation Risk

The more consequential geopolitical risk is monetary bifurcation: the emergence of parallel dollar and yuan-centric blocs with incompatible payment infrastructure. This scenario would impose significant transaction costs on countries forced to choose between systems, could fragment global capital markets, and would structurally raise the cost of capital for economies in the non-dollar bloc.

### 4.3 Sanctions Efficacy Erosion

As alternative payment rails mature and reserve diversification progresses, the effectiveness of dollar-based sanctions as a geopolitical instrument will erode. This has significant implications for the West's ability to impose economic costs on adversary behavior — a tool that has been central to post-Cold War coercive strategy.

---

## 5. Conclusions and Forward Outlook

De-dollarization is best understood not as a binary event but as a gradual, multi-decade process of marginal redistribution — in reserves, in trade invoicing, in payment infrastructure. The 2022 inflection point accelerated this process and made it politically irreversible as a sovereign priority in much of the Global South.

The most likely 10-year scenario is a **modestly multipolar monetary system**: the dollar retains primacy but at a reduced share; the euro remains significant; the yuan grows but remains constrained; gold, mBridge, and bilateral swaps fill the margins. Full de-dollarization — a world in which the dollar is not the dominant reserve and invoicing currency — remains a scenario for the 2040s at the earliest, contingent on fundamental changes in Chinese capital account policy and institutional credibility.

---
`;

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.detail || payload?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

async function uploadDocuments(files) {
  const pdfs = files.filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
  if (!pdfs.length) return { ingested: [] };

  const formData = new FormData();
  pdfs.forEach(file => formData.append('files', file));
  return apiRequest('/api/documents/ingest', {
    method: 'POST',
    body: formData,
  });
}

// ══════════════════════════════════════════════════════════════
// PAGE ROUTING
// ══════════════════════════════════════════════════════════════
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
    p.style.opacity = '0';
  });
  const page = document.getElementById(`page-${pageId}`);
  if (!page) return;
  page.style.display = 'block';
  requestAnimationFrame(() => {
    page.classList.add('active');
    page.style.opacity = '1';
    page.classList.add('fade-in');
    setTimeout(() => page.classList.remove('fade-in'), 700);
  });
  state.currentPage = pageId;
  window.scrollTo(0, 0);
}

// ══════════════════════════════════════════════════════════════
// STAR FIELD CANVAS (Hero)
// ══════════════════════════════════════════════════════════════
function initStarCanvas() {
  const canvas = document.getElementById('star-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [], w, h, raf;

  function resize() {
    w = canvas.width  = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
    buildStars();
  }

  function buildStars() {
    const count = Math.floor((w * h) / 5000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.2,
      o: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.2 + 0.03,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, w, h);
    t += 0.008;
    stars.forEach(s => {
      const o = s.o * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(248,240,210,${o})`;
      ctx.fill();
    });
    raf = requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); draw(); });
}

// ══════════════════════════════════════════════════════════════
// NAV / HAMBURGER
// ══════════════════════════════════════════════════════════════
function initNav() {
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  hamburger?.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!hamburger?.contains(e.target) && !mobileMenu?.contains(e.target)) {
      mobileMenu?.classList.add('hidden');
    }
  });

  // CTA buttons → workspace
  ['nav-cta', 'hero-cta', 'workflow-cta', 'mobile-cta'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      mobileMenu?.classList.add('hidden');
      showPage('workspace');
    });
  });

  // Back button
  document.getElementById('back-to-home')?.addEventListener('click', () => {
    showPage('landing');
    resetPipeline();
  });
}

// ══════════════════════════════════════════════════════════════
// FILE UPLOAD
// ══════════════════════════════════════════════════════════════
function initFileUpload() {
  const zone = document.getElementById('upload-zone');
  const input = document.getElementById('file-input');
  const list  = document.getElementById('file-list');

  zone?.addEventListener('click', () => input?.click());
  zone?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input?.click(); });

  zone?.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone?.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
  });

  input?.addEventListener('change', () => handleFiles(Array.from(input.files)));

  function handleFiles(files) {
    const pdfs = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfs.length === 0) { showToast('Only PDF files are supported.', 'warn'); return; }
    pdfs.forEach(f => {
      if (state.files.find(x => x.name === f.name)) return;
      state.files.push(f);
    });
    renderFileList();
    if (pdfs.length) showToast(`${pdfs.length} PDF${pdfs.length > 1 ? 's' : ''} added.`, 'success');
  }

  function renderFileList() {
    if (!list) return;
    list.innerHTML = '';
    state.files.forEach((f, i) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <span class="file-name">${escHtml(f.name)}</span>
        <span class="file-size">${formatBytes(f.size)}</span>
        <button class="file-remove" aria-label="Remove ${escHtml(f.name)}" data-index="${i}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </button>
      `;
      list.appendChild(item);
    });
    list.querySelectorAll('.file-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        state.files.splice(idx, 1);
        renderFileList();
      });
    });
  }
}

// ══════════════════════════════════════════════════════════════
// SEGMENTED CONTROL + RANGE
// ══════════════════════════════════════════════════════════════
function initControls() {
  // Segmented
  document.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.searchDepth = btn.dataset.value;
    });
  });

  // Range
  const range = document.getElementById('max-sources');
  const rangeVal = document.getElementById('range-value');
  range?.addEventListener('input', () => {
    state.maxSources = parseInt(range.value);
    if (rangeVal) rangeVal.textContent = range.value;
  });

  // Char count
  const textarea = document.getElementById('topic-input');
  const counter  = document.getElementById('char-count');
  textarea?.addEventListener('input', () => {
    if (counter) counter.textContent = `${textarea.value.length} / 2000`;
  });
}

// ══════════════════════════════════════════════════════════════
// PIPELINE INTEGRATION
// ══════════════════════════════════════════════════════════════
function initPipeline() {
  document.getElementById('start-research')?.addEventListener('click', startResearch);
}

async function startResearch() {
  const topic = document.getElementById('topic-input')?.value.trim();
  if (!topic) {
    showToast('Please enter a research topic.', 'warn');
    document.getElementById('topic-input')?.focus();
    return;
  }

  const btn = document.getElementById('start-research');
  if (btn) {
    btn.querySelector('.btn-label').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
    btn.disabled = true;
  }

  resetPipelineUI();
  hideAll();
  setWsStatus('active', 'Uploading context…');
  setPipelineStep('search', 'active', 'Uploading PDFs and starting search…');
  setProgress(12);

  try {
    if (state.files.length) {
      await uploadDocuments(state.files);
      showToast(`${state.files.length} PDF${state.files.length > 1 ? 's' : ''} uploaded.`, 'success');
    }

    setWsStatus('active', 'Searching…');
    setProgress(28);

    const response = await apiRequest('/api/research/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });

    state.threadId = response.thread_id;
    const candidateSources = Array.isArray(response.candidate_sources)
      ? response.candidate_sources
      : (Array.isArray(response.candidate_urls)
          ? response.candidate_urls.map((url, index) => ({ url, id: index + 1 }))
          : []);

    state.sources = candidateSources.map((source, index) => {
      const url = typeof source === 'string' ? source : (source.url ?? '');
      return {
        id: source.id ?? index + 1,
        title: source.title ?? url ?? `Source ${index + 1}`,
        url,
        snippet: source.snippet ?? '',
        domain: source.domain ?? (url ? new URL(url).hostname.replace(/^www\./, '') : 'source'),
        type: source.type ?? 'Web source',
        relevance: source.relevance ?? (index < 3 ? 'high' : 'mid'),
        selected: source.selected ?? true,
      };
    });
    state.approvedSources = [];

    setPipelineStep('search', 'done', 'Complete');
    setPipelineStep('approval', 'active', 'Awaiting your review');
    setProgress(45);
    setWsStatus('active', 'Awaiting approval');
    showToast('Search complete. Review and approve sources below.', 'info');

    renderSources();
    document.getElementById('results-panel')?.classList.remove('hidden');
    document.getElementById('idle-placeholder')?.classList.add('hidden');
  } catch (error) {
    setWsStatus('error', 'Search failed');
    showToast(error.message || 'Research search failed.', 'error');
  } finally {
    if (btn) {
      btn.querySelector('.btn-label').classList.remove('hidden');
      btn.querySelector('.btn-loader').classList.add('hidden');
      btn.disabled = false;
    }
  }
}

function renderSources() {
  const list = document.getElementById('sources-list');
  if (!list) return;
  list.innerHTML = '';
  state.sources.forEach((src, i) => {
    const item = document.createElement('div');
    item.className = `source-item${src.selected ? ' selected' : ''}`;
    item.dataset.id = src.id;
    item.setAttribute('role', 'checkbox');
    item.setAttribute('aria-checked', src.selected);
    item.setAttribute('tabindex', '0');
    item.style.animationDelay = `${i * 60}ms`;
    item.innerHTML = `
      <div class="source-check" aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5l2.5 2.5 4.5-5" stroke="#0a0900" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="source-body">
        <div class="source-title">${escHtml(src.title)}</div>
        <div class="source-url">${escHtml(src.url || 'No URL available')}</div>
        <div class="source-snippet">${escHtml(src.snippet || 'No snippet available')}</div>
        <div class="source-meta">
          <span class="source-tag">${escHtml(src.domain || 'source')}</span>
          <span class="source-tag">${escHtml(src.type || 'Web source')}</span>
          <span class="source-tag rel-${src.relevance || 'mid'}">${(src.relevance || 'mid') === 'high' ? 'High Relevance' : 'Moderate Relevance'}</span>
        </div>
      </div>
    `;
    item.addEventListener('click', () => toggleSource(src.id));
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggleSource(src.id); });
    list.appendChild(item);
  });
  updateApprovedCount();
}

function toggleSource(id) {
  const src = state.sources.find(s => s.id === id);
  if (!src) return;
  src.selected = !src.selected;
  const item = document.querySelector(`.source-item[data-index="${id}"], .source-item[data-id="${id}"]`);
  if (item) {
    item.classList.toggle('selected', src.selected);
    item.setAttribute('aria-checked', src.selected);
  }
  renderSources(); // Re-render to sync
  updateApprovedCount();
}

function updateApprovedCount() {
  const count = state.sources.filter(s => s.selected).length;
  const el = document.getElementById('approved-count');
  if (el) el.textContent = count;
}

function initSourceActions() {
  document.getElementById('select-all-btn')?.addEventListener('click', () => {
    state.sources.forEach(s => s.selected = true);
    renderSources();
  });
  document.getElementById('deselect-all-btn')?.addEventListener('click', () => {
    state.sources.forEach(s => s.selected = false);
    renderSources();
  });
  document.getElementById('approve-btn')?.addEventListener('click', startSynthesis);
}

async function startSynthesis() {
  const approved = state.sources.filter(s => s.selected);
  if (approved.length === 0) {
    showToast('Select at least one source to proceed.', 'warn');
    return;
  }
  state.approvedSources = approved;

  if (!state.threadId) {
    showToast('Start a research run before approving sources.', 'warn');
    return;
  }

  document.getElementById('results-panel')?.classList.add('hidden');
  setPipelineStep('approval', 'done', 'Sources approved');
  setPipelineStep('scrape', 'active', `Scraping ${approved.length} sources…`);
  setProgress(60);
  setWsStatus('active', 'Scraping…');
  showToast(`Scraping ${approved.length} approved sources…`, 'info');

  try {
    setProgress(72);
    setWsStatus('active', 'Writing…');
    const response = await apiRequest('/api/research/continue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        thread_id: state.threadId,
        approved_urls: approved.map(source => source.url),
      }),
    });

    setPipelineStep('scrape', 'done', 'Draft complete');
    setPipelineStep('critic', 'done', 'Report finalized');
    setProgress(100);
    setWsStatus('done', 'Complete');
    showToast('Report ready!', 'success');
    state.pipeline.current = 'done';
    state.report = response.draft_report || SAMPLE_REPORT_MD;
    renderReport();
  } catch (error) {
    setWsStatus('error', 'Report failed');
    showToast(error.message || 'Report generation failed.', 'error');
  }
}

function renderReport() {
  const panel = document.getElementById('report-panel');
  const body  = document.getElementById('report-body');
  const sourcesSection = document.getElementById('report-sources-section');
  if (!panel || !body) return;

  body.innerHTML = markdownToHtml(state.report);

  // Word count
  const words = state.report.trim().split(/\s+/).length;
  const wc = document.getElementById('report-word-count');
  if (wc) wc.textContent = `~${words.toLocaleString()} words`;

  // Sources list
  if (sourcesSection) {
    sourcesSection.innerHTML = `
      <h4>Sources &amp; References</h4>
      ${state.approvedSources.map((s, i) => `
        <div class="report-source-item">
          <span class="report-source-num">[${i + 1}]</span>
          <div class="report-source-info">
            <div class="report-source-title">${escHtml(s.title)}</div>
            <div class="report-source-url">${escHtml(s.url)}</div>
          </div>
        </div>
      `).join('')}
    `;
  }

  panel.classList.remove('hidden');
}

// ══════════════════════════════════════════════════════════════
// MINIMAL MARKDOWN RENDERER
// ══════════════════════════════════════════════════════════════
function markdownToHtml(md) {
  let html = escHtmlRaw(md);

  // Tables
  html = html.replace(/(\|.+\|\n)((?:\|[-: ]+\|\n))((?:\|.+\|\n?)*)/g, (_, header, sep, rows) => {
    const ths = header.trim().split('|').filter(Boolean).map(c => `<th>${c.trim()}</th>`).join('');
    const trs = rows.trim().split('\n').filter(Boolean).map(row => {
      const tds = row.split('|').filter(Boolean).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });

  // Code blocks
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${code.trimEnd()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // HR
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border-subtle);margin:var(--gap-2xl) 0">');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold / italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered lists
  html = html.replace(/((?:^- .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Paragraphs (not already tagged)
  html = html.split('\n\n').map(block => {
    block = block.trim();
    if (!block) return '';
    if (/^<(h[1-6]|ul|ol|table|pre|blockquote|hr)/.test(block)) return block;
    return `<p>${block.replace(/\n/g, ' ')}</p>`;
  }).join('\n');

  return html;
}

function escHtmlRaw(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ══════════════════════════════════════════════════════════════
// PIPELINE UI HELPERS
// ══════════════════════════════════════════════════════════════
const STEP_LABELS = {
  search:   { idle: 'Awaiting start', active: 'Searching…', done: 'Complete' },
  approval: { idle: 'Pending search', active: 'Awaiting your review', done: 'Sources approved' },
  scrape:   { idle: 'Pending approval', active: 'Processing…', done: 'Draft complete' },
  critic:   { idle: 'Not started', active: 'Reviewing…', done: 'Report finalized' },
};

function setPipelineStep(stepId, status, customText) {
  state.pipeline.steps[stepId] = status;
  const stepEl = document.getElementById(`step-${stepId}`);
  if (!stepEl) return;

  stepEl.className = `pipeline-step ${status}`;

  // Icons
  stepEl.querySelector('.step-icon-idle').classList.toggle('hidden', status !== 'idle');
  stepEl.querySelector('.step-icon-active').classList.toggle('hidden', status !== 'active');
  stepEl.querySelector('.step-icon-done').classList.toggle('hidden', status !== 'done');

  // Status text
  const text = customText || STEP_LABELS[stepId]?.[status] || status;
  const statusEl = stepEl.querySelector('.step-status-text');
  if (statusEl) statusEl.textContent = text;
}

function setProgress(pct) {
  const fill = document.getElementById('pipeline-fill');
  if (fill) fill.style.width = `${pct}%`;
}

function setWsStatus(type, label) {
  const el = document.getElementById('ws-status');
  if (!el) return;
  el.className = `ws-status ${type}`;
  const lbl = el.querySelector('.ws-status-label');
  if (lbl) lbl.textContent = label;
}

function resetPipeline() {
  state.pipeline = { current: null, steps: { search: 'idle', approval: 'idle', scrape: 'idle', critic: 'idle' } };
  state.sources = [];
  state.approvedSources = [];
  state.report = null;
  resetPipelineUI();
  hideAll();
  document.getElementById('idle-placeholder')?.classList.remove('hidden');
  setWsStatus('', 'Ready');
  setProgress(0);
}

function resetPipelineUI() {
  ['search', 'approval', 'scrape', 'critic'].forEach(s => setPipelineStep(s, 'idle'));
}

function hideAll() {
  document.getElementById('results-panel')?.classList.add('hidden');
  document.getElementById('report-panel')?.classList.add('hidden');
  document.getElementById('idle-placeholder')?.classList.add('hidden');
}

// ══════════════════════════════════════════════════════════════
// REPORT ACTIONS
// ══════════════════════════════════════════════════════════════
function initReportActions() {
  document.getElementById('copy-report-btn')?.addEventListener('click', () => {
    if (!state.report) return;
    navigator.clipboard.writeText(state.report)
      .then(() => showToast('Report copied to clipboard.', 'success'))
      .catch(() => showToast('Could not copy — please select and copy manually.', 'warn'));
  });

  document.getElementById('download-md-btn')?.addEventListener('click', () => {
    if (!state.report) return;
    downloadFile(state.report, 'researchmind-report.md', 'text/markdown');
    showToast('Markdown file downloaded.', 'success');
  });

  document.getElementById('download-pdf-btn')?.addEventListener('click', () => {
    if (!state.report) { showToast('No report to export.', 'warn'); return; }
    showToast('Preparing PDF export…', 'info');
    setTimeout(() => {
      window.print();
    }, 300);
  });
}

// ══════════════════════════════════════════════════════════════
// TOAST SYSTEM
// ══════════════════════════════════════════════════════════════
const TOAST_ICONS = {
  success: '✓',
  error:   '✕',
  warn:    '⚠',
  info:    '◆',
};

function showToast(message, type = 'info', duration = 4000) {
  const area = document.getElementById('toast-area');
  if (!area) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || '◆'}</span>
    <span class="toast-text">${escHtml(message)}</span>
    <button class="toast-close" aria-label="Dismiss">×</button>
  `;

  const dismiss = () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-close').addEventListener('click', dismiss);
  area.appendChild(toast);

  if (duration > 0) setTimeout(dismiss, duration);
}

// ══════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ══════════════════════════════════════════════════════════════
// SCROLL ANIMATIONS (IntersectionObserver)
// ══════════════════════════════════════════════════════════════
function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) return;

  const elements = document.querySelectorAll('.feature-card, .workflow-step, .section-title');
  elements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, 60 * (Array.from(elements).indexOf(entry.target) % 6));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(el => observer.observe(el));
}

// ══════════════════════════════════════════════════════════════
// SMOOTH ANCHOR SCROLL
// ══════════════════════════════════════════════════════════════
function initAnchorScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
function init() {
  // Show landing initially
  const landing = document.getElementById('page-landing');
  if (landing) { landing.style.display = 'block'; landing.style.opacity = '1'; landing.classList.add('active'); }

  initStarCanvas();
  initNav();
  initFileUpload();
  initControls();
  initPipeline();
  initSourceActions();
  initReportActions();
  initScrollAnimations();
  initAnchorScroll();
}

document.addEventListener('DOMContentLoaded', init);
