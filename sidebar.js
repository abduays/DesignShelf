const api = globalThis.browser ?? globalThis.chrome;
const projectImport = globalThis.DesignShelfProjectImport;
const STORAGE_KEY = 'designshelfCaptures';
const COLLECTION_KEY = 'designshelfCollections';
const RETENTION_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;
const $ = (id) => document.getElementById(id);
let historyFilter = 'all';
let captures = [];
let collections = [];
let selectedId = null;
let activeTab = 'html';
let currentView = 'library';
let activeCollectionId = null;
let tutorialStep = 0;
let latestAudit = null;
let selectedNodeId = null;
let pageInsightsCache = null;
let recording = false;
let workbenchUndo = [];
let workbenchRedo = [];
let workbenchLast = { html: '', css: '' };
const INTERACTION_KEY = 'designshelfInteractionEvents';

const tutorial = [
  { title: 'Capture a section', text: 'Open a normal website, choose “Capture a component”, then hover over the design you want to save. Click to select it.', tip: 'Use Parent and Child on the page toolbar to adjust the selection boundary before capturing.', icon: '01' },
  { title: 'Check the preview', text: 'Open a saved capture from Library. Inspect the visual preview and resize it using the lower edge. Expand the preview when you need more room.', tip: 'A captured preview is a best-effort snapshot. External assets and scripts may not reproduce exactly.', icon: '02' },
  { title: 'Build a design flow', text: 'Create a flow for a project or page, such as “SaaS landing page”. Select a capture and assign it to that flow. Reorder items in the flow detail view.', tip: 'A flow is a visual reference board, not a copy of the original website project.', icon: '03' },
  { title: 'Run quality checks', text: 'Select a capture and open Checks. DesignShelf checks for common warning signs such as images without alt text, missing button names and fixed-width risks.', tip: 'Checks are local heuristics, not a replacement for a full accessibility or responsive audit.', icon: '04' },
  { title: 'Scan page performance', text: 'Open Page audit and scan the active website to inspect available resource sizes, images, DOM size and navigation timings.', tip: 'The scan is local and advisory. It does not change the website or measure real-user Core Web Vitals.', icon: '05' },
  { title: 'Export and keep your library tidy', text: 'Choose HTML/CSS, Tailwind starter, React JSX starter or Vue template starter. Exported framework formats are starting points and may need manual cleanup.', tip: 'Captures are stored locally and automatically expire after 15 days. Export anything you need to keep longer.', icon: '06' }
];

function setNotice(message, isError = false) {
  const notice = $('notice');
  notice.textContent = message;
  notice.classList.toggle('error', isError);
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function slug(value) { return String(value || 'component').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'component'; }
function sanitisePreviewCss(value) {
  return String(value || '')
    .replace(/@import\b[^;]*;?/gi, '')
    .replace(/url\s*\([^)]*\)/gi, 'none')
    .replace(/expression\s*\([^)]*\)/gi, 'none')
    .replace(/-moz-binding\s*:[^;}]*/gi, '')
    .replace(/behavior\s*:[^;}]*/gi, '')
    .replace(/<\/style/gi, '<\\/style');
}
function sanitisePreviewHtml(value) {
  const doc = new DOMParser().parseFromString(String(value || ''), 'text/html');
  doc.querySelectorAll('script,iframe,object,embed,frame,frameset,base,link,meta,form,template').forEach(node => node.remove());
  doc.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim();
      if (name.startsWith('on') || ['srcdoc','srcset','formaction','action','xlink:href','href','poster','background','manifest','ping'].includes(name)) node.removeAttribute(attr.name);
      if (name === 'src' && !/^data:image\/(?:png|gif|jpeg|webp);base64,/i.test(val)) node.removeAttribute(attr.name);
      if (name === 'style') node.setAttribute('style', sanitisePreviewCss(val));
    });
  });
  doc.querySelectorAll('style').forEach(node => node.remove());
  return doc.body.innerHTML;
}
function previewDocument(html, css = '') {
  const safeHtml = sanitisePreviewHtml(html);
  const safeCss = sanitisePreviewCss(css);
  const rootRules = safeCss ? `[data-ds-preview-root="true"] > :first-child{${safeCss}}` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; media-src data:"><style>html,body{margin:0;padding:8px;font-family:system-ui,sans-serif;overflow:auto}*{max-width:100%;box-sizing:border-box}img,video,svg{max-width:100%;height:auto}body{min-height:100px}[data-ds-preview-root="true"]{display:contents}${rootRules}</style></head><body><div data-ds-preview-root="true">${safeHtml || '<p>No preview available.</p>'}</div></body></html>`;
}
async function loadCaptures() {
  const data = await api.storage.local.get([STORAGE_KEY, COLLECTION_KEY,'designshelfLastCapture']);
  const all = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  const rawCollections = Array.isArray(data[COLLECTION_KEY]) ? data[COLLECTION_KEY] : [];
  collections = rawCollections.filter(c => c && typeof c === 'object' && !Array.isArray(c) && typeof c.id === 'string' && c.id.trim() && typeof c.name === 'string' && c.name.trim() && Array.isArray(c.captureIds)).slice(0,1000).map(c => ({...c,captureIds:c.captureIds.filter(id=>typeof id==='string').slice(0,5000)}));
  const cutoff = Date.now() - RETENTION_DAYS * DAY_MS;
  captures = all.filter(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !item.id || typeof item.name !== 'string' || typeof item.html !== 'string' || typeof item.css !== 'string') return false;
    const stamp = typeof item.capturedAt === 'string' ? item.capturedAt : (typeof item.createdAt === 'string' ? item.createdAt : '');
    const time = Date.parse(stamp);
    return item.pinned === true || (Number.isFinite(time) && time >= cutoff);
  }).slice(0,5000);
  if (captures.length !== all.length) await api.storage.local.set({ [STORAGE_KEY]: captures });
  if (collections.length !== rawCollections.length) await api.storage.local.set({ [COLLECTION_KEY]: collections });
  if (data.designshelfLastCapture && !captures.some(c=>c.id===data.designshelfLastCapture.id)) await api.storage.local.remove(['designshelfLastCapture','designshelfLastCaptureAt']);
  renderList(); renderCollectionSelect(); renderBoards();
  if (selectedId && captures.some(c => c.id === selectedId)) selectCapture(selectedId, false);
  else if (selectedId) closeDetail();
  updateActionStates();
}
async function saveCaptures() { await api.storage.local.set({ [STORAGE_KEY]: captures }); renderList(); renderBoards(); renderTokenMapper(); renderCompareSelectors(); updateActionStates(); }
async function saveCollections() { await api.storage.local.set({ [COLLECTION_KEY]: collections }); renderCollectionSelect(); renderBoards(); updateActionStates(); }
async function updateActionStates() {
  try {
    const data=await api.storage.local.get([INTERACTION_KEY,'designshelfAuditHistory','designshelfRecordingTabId','designshelfLastCapture']);
    const rawEvents=Array.isArray(data[INTERACTION_KEY])?data[INTERACTION_KEY]:[];
    const events=rawEvents.map(projectImport.normaliseEvent).filter(Boolean);
    const audits=Array.isArray(data.designshelfAuditHistory)?data.designshelfAuditHistory:[];
    const hasCaptures=captures.length>0, hasCollections=collections.length>0, hasEvents=events.length>0, hasStoredEvents=rawEvents.length>0;
    $('exportAllBtn').disabled=!hasCaptures;
    $('exportProjectBtn').disabled=!(hasCaptures||hasCollections||hasStoredEvents||audits.length||!!data.designshelfLastCapture);
    $('exportRecordingBtn').disabled=!hasEvents;
    $('exportTokensBtn').disabled=!hasCaptures;
    $('tokenExportFormat').disabled=!hasCaptures;
    $('clearAllBtn').disabled=!(hasCaptures||hasCollections||hasStoredEvents||audits.length||!!data.designshelfLastCapture||Number.isInteger(data.designshelfRecordingTabId));
    $('compareBtn').disabled=captures.length<2;
    $('compareA').disabled=captures.length<2; $('compareB').disabled=captures.length<2;
    $('findSimilarBtn').disabled=captures.length<2;
    $('runQualityBtn').disabled=!hasCaptures;
    const hasSelection=!!captures.find(c=>c.id===selectedId);
    ['cascadeReviewBtn','deepChecksBtn','loadWorkbenchBtn','updateWorkbenchBtn','undoWorkbenchBtn','redoWorkbenchBtn','resetWorkbenchBtn','exportWorkbenchBtn','saveCaptureNoteBtn','copyCodeBtn','downloadBtn','deleteBtn','exportFormatBtn','expandPreviewBtn'].forEach(id=>$(id).disabled=!hasSelection);
    $('exportFormat').disabled=!hasSelection;
    $('collectionSelect').disabled=!hasCaptures;
    $('startRecordingBtn').disabled=Number.isInteger(data.designshelfRecordingTabId); $('stopRecordingBtn').disabled=!Number.isInteger(data.designshelfRecordingTabId); $('exportRecordingBtn').disabled=!hasEvents;
  } catch {}
}
function switchView(view, moveFocus = false) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(b => {
    const active = b.dataset.view === view;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', String(active));
    b.tabIndex = active ? 0 : -1;
    if (active && moveFocus) b.focus();
  });
  $('libraryView').classList.toggle('hidden', view !== 'library');
  $('boardsView').classList.toggle('hidden', view !== 'boards');
  $('qualityView').classList.toggle('hidden', view !== 'quality');
  $('optimiseView').classList.toggle('hidden', view !== 'optimise');
  $('toolboxView').classList.toggle('hidden', view !== 'toolbox');
  if (view === 'toolbox') { renderTokenMapper(); renderCompareSelectors(); renderInteractionEvents(); if(selectedId && !$('workbenchHtml').value) loadWorkbench(); refreshStorageUsage(); }
  if (view === 'quality') renderQuality();
  if (view === 'optimise' && latestAudit) renderAudit(latestAudit);
}
function renderList() {
  const now = Date.now();
  const query = String($('captureSearch')?.value || '').trim().toLowerCase();
  const visible = captures.filter(c => { const t = Date.parse(c.capturedAt || c.createdAt || ''); const dateMatch = historyFilter === 'today' ? Number.isFinite(t) && new Date(t).toDateString() === new Date(now).toDateString() : historyFilter === '7days' ? Number.isFinite(t) && t >= now - 7 * DAY_MS : true; const tokenText = [c.name,c.url,c.tag,c.tagName,c.selector,c.tokens?.fontFamily,...(c.tokens?.colors||[]),...(c.tags||[])].join(' ').toLowerCase(); return dateMatch && (!query || tokenText.includes(query)); });
  $('countLabel').textContent = `${visible.length} shown · ${captures.length} saved`;
  $('exportAllBtn').disabled = captures.length === 0;
  $('emptyState').style.display = visible.length ? 'none' : 'block';
  const list = $('captureList'); list.replaceChildren();
  visible.forEach(capture => {
    const card = document.createElement('article'); card.className = `capture-card${capture.id === selectedId ? ' selected' : ''}`;
    const thumb = document.createElement('div'); thumb.className = 'thumb';
    const frame = document.createElement('iframe'); frame.setAttribute('sandbox',''); frame.title = `Preview of ${capture.name}`; frame.srcdoc = previewDocument(capture.html, capture.css); thumb.appendChild(frame);
    const info = document.createElement('button'); info.className = 'capture-info'; info.type = 'button';
    let host = 'Unknown website'; try { host = new URL(capture.url).hostname; } catch {}
    const time = Date.parse(capture.capturedAt || capture.createdAt || '');
    const date = Number.isFinite(time) ? new Date(time).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Date unavailable';
    const collection = collections.find(x => x.id === capture.collectionId);
    info.innerHTML = `<strong>${escapeHtml(capture.name)}</strong><span>${escapeHtml(host)} · ${escapeHtml(capture.width)}×${escapeHtml(capture.height)}</span><span>${escapeHtml(date)}</span><span class="tag">${escapeHtml(collection?.name || capture.tag || capture.tagName || 'Component')}</span>`;
    info.addEventListener('click', () => selectCapture(capture.id));
    const actions = document.createElement('div'); actions.className = 'capture-card-actions';
    const pin = document.createElement('button'); pin.className = 'more-btn pin-btn'; pin.type = 'button'; pin.title = capture.pinned ? 'Unpin capture (keep for longer)' : 'Pin capture (keep beyond 15 days)'; pin.setAttribute('aria-label', pin.title); pin.setAttribute('aria-pressed', String(!!capture.pinned)); pin.textContent = capture.pinned ? '★' : '☆';
    pin.addEventListener('click', async () => { capture.pinned = !capture.pinned; await saveCaptures(); setNotice(capture.pinned ? 'Capture pinned. It will not expire automatically.' : 'Capture unpinned. The 15-day retention rule applies again.'); });
    const remove = document.createElement('button'); remove.className = 'more-btn'; remove.type = 'button'; remove.title = 'Delete capture'; remove.setAttribute('aria-label',`Delete ${capture.name}`); remove.textContent = '×';
    remove.addEventListener('click', async () => { captures = captures.filter(x => x.id !== capture.id); if (selectedId === capture.id) closeDetail(); await saveCaptures(); setNotice('Capture deleted.'); });
    actions.append(pin, remove); card.append(thumb, info, actions); list.appendChild(card);
  });
  renderCollectionSelect();
}
function renderCollectionSelect() {
  const select = $('collectionSelect'); if (!select) return;
  const current = select.value; select.replaceChildren(new Option('Choose a design flow…',''));
  collections.forEach(c => select.add(new Option(c.name, c.id)));
  if (collections.some(c => c.id === current)) select.value = current;
  select.disabled = !selectedId || collections.length === 0;
}
function selectCapture(id, scroll = true) {
  const capture = captures.find(c => c.id === id); if (!capture) return;
  selectedId = id; activeTab = 'html'; selectedNodeId = capture.structure?.[0]?.id ?? null;
  $('detailPanel').classList.remove('hidden'); $('detailName').textContent = capture.name;
  $('metaLine').textContent = `${capture.tag || capture.tagName || 'Element'} · ${capture.selector || 'selector unavailable'}\n${capture.url || ''}${capture.viewport ? `\nViewport ${capture.viewport.width}×${capture.viewport.height} · ${capture.viewport.devicePixelRatio}× pixel ratio` : ''}`;
  $('captureNote').value = capture.note || ''; $('noteStatus').textContent = capture.note ? 'Note saved locally' : 'No note saved';
  $('preview').srcdoc = previewDocument(capture.html, capture.css);
  document.querySelectorAll('.tab').forEach(t => { const active = t.dataset.tab === activeTab; t.classList.toggle('active', active); t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1; if (active) $('codeView').setAttribute('aria-labelledby', t.id); });
  renderComponentTree(capture); renderCode(capture); renderList(); renderQuality(); updateActionStates();
  if (scroll) $('detailPanel').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}
function currentInspectedItem(capture) {
  return (capture.structure || []).find(node => node.id === selectedNodeId) || null;
}
function renderComponentTree(capture) {
  const root = $('componentTree'); root.replaceChildren();
  const nodes = Array.isArray(capture.structure) ? capture.structure : [];
  $('structureCount').textContent = `${nodes.length} elements · ${nodes.filter(n => n.visible).length} visible`;
  if (!nodes.length) { root.textContent = 'No component tree was stored for this capture. Capture the section again with the updated extension.'; return; }
  nodes.forEach(node => {
    const row = document.createElement('button');
    row.type = 'button'; row.className = `tree-node${node.id === selectedNodeId ? ' selected' : ''}`;
    row.style.setProperty('--tree-depth', Math.min(7, Number(node.depth) || 0));
    const tag = document.createElement('span'); tag.className = 'tree-tag'; tag.textContent = node.tag;
    const label = document.createElement('span'); label.className = 'tree-label'; label.textContent = node.name || node.tag;
    const size = document.createElement('span'); size.className = 'tree-size'; size.textContent = `${node.width}×${node.height}`;
    row.append(tag,label,size); row.title = node.selector || node.tag;
    row.addEventListener('click', () => {
      selectedNodeId = node.id;
      $('preview').srcdoc = previewDocument(node.html || capture.html, node.css || capture.css);
      $('detailName').textContent = node.name || node.tag;
      $('metaLine').textContent = `${node.tag} · ${node.selector || 'selector unavailable'} · ${node.width}×${node.height}px\n${capture.url || ''}`;
      renderComponentTree(capture); renderStyleTokens(node.tokens || capture.tokens); renderCode(capture);
    });
    root.appendChild(row);
  });
  const selectedNode = (capture.structure || []).find(node => node.id === selectedNodeId);
  renderStyleTokens(selectedNode?.tokens || capture.tokens || {});
}
function renderStyleTokens(tokens) {
  const root = $('styleTokens'); root.replaceChildren();
  const heading = document.createElement('div'); heading.className = 'tokens-heading'; heading.textContent = 'Style snapshot'; root.appendChild(heading);
  const colors = Array.isArray(tokens.colors) ? tokens.colors : [];
  const swatches = document.createElement('div'); swatches.className = 'color-swatches';
  colors.forEach(color => { const item = document.createElement('button'); item.type = 'button'; item.className = 'color-swatch'; item.title = `Copy ${color}`; const chip = document.createElement('span'); chip.className = 'color-chip'; chip.style.background = color; const value = document.createElement('span'); value.textContent = color; item.append(chip,value); item.addEventListener('click', async()=>{try{await navigator.clipboard.writeText(color);setNotice(`Copied colour ${color}.`);}catch{setNotice(`Colour value: ${color}`);}}); swatches.appendChild(item); });
  if (!colors.length) { const empty = document.createElement('span'); empty.className = 'muted'; empty.textContent = 'No colour values found'; swatches.appendChild(empty); }
  root.appendChild(swatches);
  const typography = document.createElement('div'); typography.className = 'type-snapshot';
  const family = document.createElement('strong'); family.textContent = tokens.fontFamily || 'Font family unavailable';
  const detail = document.createElement('span'); detail.textContent = `${tokens.fontSize || '—'} · weight ${tokens.fontWeight || '—'} · line height ${tokens.lineHeight || '—'}`;
  typography.append(family,detail); root.appendChild(typography);
  const effects = document.createElement('div'); effects.className = 'type-snapshot';
  const radius = document.createElement('span'); radius.textContent = `Radius: ${tokens.borderRadius || '—'}`;
  const shadow = document.createElement('span'); shadow.textContent = `Shadow: ${tokens.boxShadow && tokens.boxShadow !== 'none' ? tokens.boxShadow : 'none'}`;
  effects.append(radius,shadow); root.appendChild(effects);
}
function renderCode(capture) {
  const item = currentInspectedItem(capture);
  let code = item?.html || capture.html || '';
  if (activeTab === 'css') code = `/* Computed styles captured from ${item ? item.tag : 'the selected root element'} */\n${item?.css || capture.css || '/* No computed CSS available */'}`;
  if (activeTab === 'animation') code = JSON.stringify(item?.animation || capture.animation || {}, null, 2);
  if (activeTab === 'quality') code = runQualityChecks({html:item?.html || capture.html,css:item?.css || capture.css}).map(x => `[${x.level.toUpperCase()}] ${x.title}\n${x.detail}`).join('\n\n') || 'No obvious issues found by the basic checks.';
  $('codeView').textContent = code || 'No code available.';
  $('copyCodeBtn').textContent = activeTab === 'html' ? 'Copy HTML' : activeTab === 'css' ? 'Copy CSS' : activeTab === 'animation' ? 'Copy motion data' : 'Copy checks';
}
function closeDetail() { selectedId = null; $('detailPanel').classList.add('hidden'); renderList(); renderCollectionSelect(); renderQuality(); updateActionStates(); }
function downloadFile(filename, content, type = 'text/plain') { const blob = new Blob([content],{type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000); }

function runQualityChecks(capture) {
  const html = String(capture.html || ''); const css = String(capture.css || ''); const checks = [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const images = [...doc.querySelectorAll('img')];
  const noAlt = images.filter(img => !img.hasAttribute('alt'));
  if (noAlt.length) checks.push({level:'warning',title:`${noAlt.length} image(s) missing alt attributes`,detail:'Add meaningful alt text for informative images. Use alt="" for decorative images.'});
  const buttons = [...doc.querySelectorAll('button')];
  const unnamedButtons = buttons.filter(b => !(b.textContent || '').trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'));
  if (unnamedButtons.length) checks.push({level:'warning',title:`${unnamedButtons.length} button(s) may lack an accessible name`,detail:'Give icon-only buttons an accessible name, such as aria-label.'});
  const links = [...doc.querySelectorAll('a')];
  const unnamedLinks = links.filter(a => !(a.textContent || '').trim() && !a.querySelector('img[alt]:not([alt=""])') && !a.getAttribute('aria-label') && !a.getAttribute('aria-labelledby'));
  if (unnamedLinks.length) checks.push({level:'warning',title:`${unnamedLinks.length} link(s) may lack descriptive text`,detail:'Ensure each link has an accessible name that explains its destination or action.'});
  const controls = [...doc.querySelectorAll('input,select,textarea')].filter(el => !['hidden','submit','button','reset','image'].includes((el.type || '').toLowerCase()));
  const unlabeledControls = controls.filter(el => !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'));
  if (unlabeledControls.length) checks.push({level:'warning',title:`${unlabeledControls.length} form control(s) may lack an accessible name`,detail:'Associate each control with a visible label, or provide a valid aria-label or aria-labelledby reference.'});
  const emptyHeadings = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(el => !(el.textContent || '').trim() && !el.getAttribute('aria-label'));
  if (emptyHeadings.length) checks.push({level:'warning',title:`${emptyHeadings.length} heading(s) have no accessible text`,detail:'Give headings meaningful text so people navigating by headings can understand the page structure.'});
  const genericLinks = links.filter(a => /^(click here|read more|learn more)$/i.test((a.textContent || '').trim()));
  if (genericLinks.length) checks.push({level:'info',title:`${genericLinks.length} link(s) use generic wording`,detail:'Use link text that makes sense when read out of context, or provide an accessible name that describes the destination.'});
  if (/<(script|iframe|object|embed)\b/i.test(html)) checks.push({level:'info',title:'Active or embedded content detected in source',detail:'The saved snapshot should not be treated as a secure, fully functional copy. DesignShelf removes scripts and embedded frames during capture where possible.'});
  if (/(^|[;\s])(?:width|min-width)\s*:\s*\d{3,}px/i.test(css) || /(?:width|min-width)\s*:\s*\d{3,}px/i.test(html)) checks.push({level:'warning',title:'Large fixed width may overflow on smaller screens',detail:'Test the component at mobile widths. Consider max-width: 100%, flexible units or responsive breakpoints.'});
  if (!/max-width|@media|flex-wrap|grid-template-columns|width:\s*100%/i.test(css + html)) checks.push({level:'info',title:'Responsive behaviour could not be confirmed',detail:'No common responsive indicators were found in the captured root styles. Inspect the original page at mobile and tablet widths.'});
  if (images.some(img => !img.getAttribute('src') && !img.getAttribute('srcset'))) checks.push({level:'warning',title:'Image source missing',detail:'Some images may rely on lazy loading or runtime attributes that were not included in the snapshot.'});
  if (!checks.length) checks.push({level:'pass',title:'No obvious issues found',detail:'The basic local checks did not identify the common problems covered by this checker. This is not a complete accessibility or responsive audit.'});
  return checks;
}
function renderQuality() {
  const capture = captures.find(c => c.id === selectedId);
  $('qualityEmpty').classList.toggle('hidden', !!capture); $('qualityResults').classList.toggle('hidden', !capture);
  if (!capture) { $('qualityResults').replaceChildren(); return; }
  const results = runQualityChecks(capture); const root = $('qualityResults'); root.replaceChildren();
  results.forEach(r => { const item = document.createElement('div'); item.className = `quality-item ${r.level}`; item.innerHTML = `<span class="quality-pill">${escapeHtml(r.level)}</span><strong>${escapeHtml(r.title)}</strong><p>${escapeHtml(r.detail)}</p>`; root.appendChild(item); });
}
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unavailable';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function renderAudit(report) {
  latestAudit = report;
  $('auditEmpty').classList.add('hidden');
  $('auditSummary').classList.remove('hidden');
  $('auditResults').classList.remove('hidden');
  $('exportAuditBtn').disabled = false;
  $('auditTimestamp').textContent = `Scanned ${new Date(report.scannedAt).toLocaleString()}`;
  const m = report.metrics || {};
  const cards = [
    ['Resources', m.resourceCount ?? 0],
    ['Approx. transfer', formatBytes(m.approximateTransferBytes)],
    ['DOM elements', Number(m.domElements || 0).toLocaleString()],
    ['Images', m.imageCount ?? 0],
    ['Scripts', m.scriptCount ?? 0],
    ['Stylesheets', m.stylesheetCount ?? 0]
  ];
  const summary = $('auditSummary'); summary.replaceChildren();
  const page = document.createElement('div'); page.className = 'audit-page-heading';
  const title = document.createElement('strong'); title.textContent = report.page?.title || report.page?.host || 'Current page';
  const url = document.createElement('span'); url.textContent = report.page?.url || '';
  page.append(title,url); summary.appendChild(page);
  const metricGrid = document.createElement('div'); metricGrid.className='audit-metric-grid';
  cards.forEach(([label,value])=>{const card=document.createElement('div');card.className='audit-metric';const v=document.createElement('strong');v.textContent=String(value);const l=document.createElement('span');l.textContent=label;card.append(v,l);metricGrid.appendChild(card);});
  summary.appendChild(metricGrid);
  const timing = document.createElement('p'); timing.className='audit-timing';
  const timeParts=[];
  if (m.responseStartMs != null) timeParts.push(`Response start: ${(m.responseStartMs/1000).toFixed(2)} s`);
  if (m.domContentLoadedMs != null) timeParts.push(`DOMContentLoaded: ${(m.domContentLoadedMs/1000).toFixed(2)} s`);
  if (m.loadEventMs != null) timeParts.push(`Load event: ${(m.loadEventMs/1000).toFixed(2)} s`);
  timing.textContent=timeParts.length?timeParts.join(' · '):'Navigation timings were unavailable for this page session.'; summary.appendChild(timing);
  const results=$('auditResults'); results.replaceChildren();
  (report.issues||[]).forEach(issue=>{const item=document.createElement('article');item.className=`quality-item ${issue.level||'info'}`;const pill=document.createElement('span');pill.className='quality-pill';pill.textContent=issue.level||'info';const h=document.createElement('strong');h.textContent=issue.title||'Finding';const p=document.createElement('p');p.textContent=issue.detail||'';item.append(pill,h,p);if(issue.evidence){const ev=document.createElement('p');ev.className='audit-evidence';ev.textContent=issue.evidence;item.appendChild(ev);}results.appendChild(item);});
  const wrap=$('resourceTableWrap'); const table=$('resourceTable'); table.replaceChildren();
  const resources=report.largestResources||[];
  wrap.classList.toggle('hidden',!resources.length);
  if(resources.length){resources.forEach(r=>{const row=document.createElement('div');row.className='resource-row';const main=document.createElement('div');main.className='resource-main';const name=document.createElement('strong');name.textContent=r.url||'Resource';const meta=document.createElement('span');meta.textContent=`${r.type||'resource'} · ${r.durationMs||0} ms`;main.append(name,meta);const size=document.createElement('span');size.className='resource-size';size.textContent=formatBytes(Math.max(r.transferBytes||0,r.encodedBytes||0));row.append(main,size);table.appendChild(row);});}
}
function renderAuditHistoryComparison(previous,current) {
  const root=$('auditResults');
  const heading=document.createElement('h3');heading.textContent='Change since previous scan';root.prepend(heading);
  const metrics=[['Resources',previous.metrics?.resourceCount,current.metrics?.resourceCount],['Approx. transfer bytes',previous.metrics?.approximateTransferBytes,current.metrics?.approximateTransferBytes],['DOM elements',previous.metrics?.domElements,current.metrics?.domElements],['Images',previous.metrics?.imageCount,current.metrics?.imageCount],['Scripts',previous.metrics?.scriptCount,current.metrics?.scriptCount],['Stylesheets',previous.metrics?.stylesheetCount,current.metrics?.stylesheetCount],['Load event (ms)',previous.metrics?.loadEventMs,current.metrics?.loadEventMs]];
  metrics.forEach(([label,oldValue,newValue])=>{if(oldValue==null||newValue==null)return;const row=document.createElement('div');row.className='compare-row';const title=document.createElement('strong');title.textContent=label;const oldSpan=document.createElement('span');oldSpan.textContent=`Previous: ${oldValue}`;const newSpan=document.createElement('span');const delta=Number(newValue)-Number(oldValue);newSpan.textContent=`Current: ${newValue} (${delta>0?'+':''}${Number.isFinite(delta)?delta:'n/a'})`;row.append(title,oldSpan,newSpan);root.prepend(row);});
  const note=document.createElement('p');note.className='small-note';note.textContent='Comparisons are approximate and can vary with cache state, network conditions, page content and measurement availability. They are not a controlled benchmark.';root.prepend(note);
}
async function scanActivePage() {
  const button=$('scanPageBtn'); button.disabled=true; button.textContent='Scanning…'; setNotice('Reading available performance and resource data from the active page…');
  try {
    const response=await api.runtime.sendMessage({type:'DESIGNSHELF_RUN_AUDIT'});
    if(!response?.ok||!response.report){setNotice(response?.error||'Could not scan this page.',true);return;}
    const stored=await api.storage.local.get(null);
    const history=Array.isArray(stored.designshelfAuditHistory)?stored.designshelfAuditHistory:[];
    const previous=[...history].reverse().find(item=>item.page?.host===response.report.page?.host)||null;
    const nextHistory=[...history,response.report].slice(-20);
    if(JSON.stringify({...stored,designshelfAuditHistory:nextHistory}).length*2>7.5*1024*1024) throw new Error('Local storage is nearly full. Export your project or delete unused captures before saving another page audit.');
    await api.storage.local.set({designshelfAuditHistory:nextHistory});
    renderAudit(response.report);
    if(previous) renderAuditHistoryComparison(previous,response.report);
    setNotice(previous?'Scan complete. Comparison with the previous saved scan is shown below.':'Scan complete. This is the first saved scan for this site.');
  } catch(error) { setNotice(`Scan failed: ${error?.message||'Unknown error'}`,true); }
  finally { button.disabled=false; button.textContent='Scan page'; }
}
function tailwindStarter(capture) {
  const css = `${capture.css || ''} ${capture.html || ''}`;
  const notes = [];
  if (/display:\s*flex/i.test(css)) notes.push('flex');
  if (/display:\s*grid/i.test(css)) notes.push('grid');
  if (/justify-content:\s*center/i.test(css)) notes.push('justify-center');
  if (/align-items:\s*center/i.test(css)) notes.push('items-center');
  if (/text-align:\s*center/i.test(css)) notes.push('text-center');
  if (/font-weight:\s*(600|700|800|900)/i.test(css)) notes.push('font-semibold');
  if (/border-radius:\s*(\d+px)/i.test(css)) { const n = Number((css.match(/border-radius:\s*(\d+)px/i)||[])[1]); notes.push(n >= 20 ? 'rounded-2xl' : n >= 10 ? 'rounded-xl' : n > 0 ? 'rounded-md' : ''); }
  const clean = String(capture.html || '').replace(/\sstyle="[^"]*"/g, '').replace(/\sclass=/g, ' class=').replace(/\s+/g, ' ').trim();
  return `<!-- Tailwind starter generated heuristically by DesignShelf. Review layout and styling manually. -->\n<!-- Suggested classes based on detected styles: ${[...new Set(notes.filter(Boolean))].join(' ' ) || 'inspect styles'} -->\n<div class="${[...new Set(notes.filter(Boolean))].join(' ')}">\n  ${clean}\n</div>\n`;
}
function exportContent(capture, format) {
  const safeUrl = String(capture.url || '').replace(/--/g, '');
  const comment = `<!-- Captured by DesignShelf from ${safeUrl} -->`;
  if (format === 'tailwind') return `<!-- Tailwind CSS starter. Include Tailwind in your project and verify all classes manually. -->\n${tailwindStarter(capture)}`;
  if (format === 'react') {
    const jsx = String(capture.html || '').replace(/\bclass=/g,'className=').replace(/\bfor=/g,'htmlFor=');
    return `// React JSX starter generated by DesignShelf. Review attributes, inline styles, events and assets before use.\nexport default function CapturedComponent() {\n  return (\n    <>\n      ${jsx}\n    </>\n  );\n}\n\n// Source: ${safeUrl}\n/* Captured CSS:\n${String(capture.css || '').replace(/\*\//g,'* /')}\n*/\n`;
  }
  if (format === 'vue') return `<!-- Vue template starter generated by DesignShelf. Review bindings, attributes and assets before use. -->\n<template>\n  ${capture.html || ''}\n</template>\n\n<style scoped>\n${capture.css || ''}\n</style>\n\n<!-- Source: ${safeUrl} -->\n`;
  return `${comment}\n${capture.html || ''}\n\n<style>\n${capture.css || ''}\n</style>\n`;
}
function extensionFor(format) { return ({html:'html',tailwind:'html',react:'jsx',vue:'vue'})[format] || 'html'; }
function createCollection() {
  const name = prompt('Name this design flow (for example, SaaS landing page):');
  if (!name || !name.trim()) return;
  const collection = { id:`flow_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, name:name.trim().slice(0,80), createdAt:new Date().toISOString(), captureIds:[] };
  collections.unshift(collection); saveCollections().then(() => { renderBoards(); setNotice(`Design flow “${collection.name}” created.`); });
}
function renderBoards() {
  const list = $('boardList'); if (!list) return; list.replaceChildren();
  if (!collections.length) { const empty = document.createElement('div'); empty.className='empty-state'; empty.innerHTML='<div class="empty-icon">▤</div><strong>No design flows yet</strong><p>Create a flow to group captures from a page, project or design system.</p>'; list.appendChild(empty); }
  collections.forEach(c => {
    c.captureIds = (c.captureIds || []).filter(id => captures.some(cap => cap.id === id));
    const card = document.createElement('button'); card.type='button'; card.className=`board-card${activeCollectionId===c.id?' selected':''}`;
    const previews = c.captureIds.slice(0,3).map(id => { const cap=captures.find(x=>x.id===id); return cap ? `<span>${escapeHtml(cap.tag || cap.tagName || 'UI')}</span>` : ''; }).join('');
    card.innerHTML=`<div class="board-card-icon">▦</div><div class="board-card-copy"><strong>${escapeHtml(c.name)}</strong><span>${c.captureIds.length} component${c.captureIds.length===1?'':'s'} · Created ${new Date(c.createdAt).toLocaleDateString()}</span><div class="board-mini-tags">${previews || '<span>Empty flow</span>'}</div></div><span class="board-arrow">›</span>`;
    card.addEventListener('click', () => showCollection(c.id)); list.appendChild(card);
  });
  if (activeCollectionId && collections.some(c=>c.id===activeCollectionId)) showCollection(activeCollectionId, false);
  else $('boardDetail').classList.add('hidden');
}
function markdownEscape(value) { return String(value ?? '').replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\|/g,'\\|').replace(/\r?\n/g,' '); }
function exportCollectionMarkdown(id) {
  const flow=collections.find(item=>item.id===id); if(!flow)return;
  const items=(flow.captureIds||[]).map(cid=>captures.find(c=>c.id===cid)).filter(Boolean);
  const tokenGroups=globalThis.DesignShelfTokenExport.collectTokenCounts(items);
  const lines=[`# DesignShelf Evidence Pack: ${markdownEscape(flow.name)}`,'',`Exported ${new Date().toISOString()}.`,`${items.length} curated component reference(s).`,'',
    '## How to use this reference pack','',
    '- Treat the recorded values and component snapshots as evidence from the source pages, not as generic inspiration.',
    '- Preserve the visible hierarchy, spacing, typography, proportions and interaction intent documented in each reference.',
    '- Do not replace distinctive details with default gradients, generic cards or arbitrary design-system values.',
    '- Values are captured computed styles. They are not guaranteed to reproduce the original stylesheet cascade, responsive rules, external fonts or JavaScript-driven states.',
    '- Token names are neutral sequence labels. Assign semantic roles only after reviewing how each value is used.',
    '- Check source permissions and asset licences before reusing any design or asset.','',
    '## Shared observed values',''];
  const appendGroup=(label,map)=>{
    if(!map?.size)return;
    lines.push(`### ${label}`,'');
    [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,30).forEach(([value,count])=>lines.push(`- ${markdownEscape(value)} — observed ${count} time(s)`));
    lines.push('');
  };
  appendGroup('Colours',tokenGroups.colors); appendGroup('Font families',tokenGroups.fonts);
  appendGroup('Font sizes',tokenGroups.fontSizes); appendGroup('Line heights',tokenGroups.lineHeights);
  appendGroup('Font weights',tokenGroups.fontWeights); appendGroup('Border radii',tokenGroups.radii);
  lines.push('## Curated component references','');
  items.forEach((capture,index)=>{
    lines.push(`### ${index+1}. ${markdownEscape(capture.name)}`,'',
      `- **Page:** ${markdownEscape(capture.pageTitle||'Untitled page')}`,
      `- **Source:** ${markdownEscape(capture.url||'')}`,
      `- **Selector:** \`${markdownEscape(capture.selector||'Unavailable')}\``,
      `- **Element:** ${markdownEscape(capture.tag||'Element')} · ${capture.width||0}×${capture.height||0}px`,
      `- **Captured:** ${markdownEscape(capture.capturedAt||'Unknown')}`);
    if(capture.viewport) lines.push(`- **Viewport:** ${capture.viewport.width}×${capture.viewport.height}px at ${capture.viewport.devicePixelRatio}× DPR`);
    if(capture.note) lines.push('',`**Research note:** ${markdownEscape(capture.note)}`);
    if(capture.tokens?.colors?.length) lines.push('',`**Observed colours:** ${capture.tokens.colors.map(markdownEscape).join(', ')}`);
    if(capture.tokens?.fontFamily) lines.push(`**Font family:** ${markdownEscape(capture.tokens.fontFamily)}`);
    if(capture.tokens?.fontSize) lines.push(`**Font size:** ${markdownEscape(capture.tokens.fontSize)}`);
    if(capture.tokens?.fontWeight) lines.push(`**Font weight:** ${markdownEscape(capture.tokens.fontWeight)}`);
    if(capture.tokens?.lineHeight) lines.push(`**Line height:** ${markdownEscape(capture.tokens.lineHeight)}`);
    if(capture.tokens?.borderRadius) lines.push(`**Border radius:** ${markdownEscape(capture.tokens.borderRadius)}`);
    if(Array.isArray(capture.structure)&&capture.structure.length){
      lines.push('', '**Captured structure (text omitted):**');
      capture.structure.forEach(node=>lines.push(`- ${'  '.repeat(Math.min(6,node.depth||0))}\`${markdownEscape(node.tag)}\` — \`${markdownEscape(node.selector||'')}\` (${node.width||0}×${node.height||0}px)`));
    }
    if(capture.css) lines.push('', '**Computed CSS snapshot:**','', '```css', capture.css.slice(0,20000), '```');
    lines.push('');
  });
  downloadFile(`designshelf-${slug(flow.name)}-DESIGN.md`,lines.join('\n'),'text/markdown');
  setNotice('DESIGN.md evidence pack exported. Review source references and notes before sharing.');
}

function showCollection(id, rerender = true) {
  activeCollectionId=id; const c=collections.find(x=>x.id===id); if(!c) return;
  const root=$('boardDetail'); root.classList.remove('hidden');
  const items=(c.captureIds||[]).map(cid=>captures.find(x=>x.id===cid)).filter(Boolean);
  root.innerHTML=`<div class="board-detail-heading"><div><span class="eyebrow">DESIGN FLOW</span><h3>${escapeHtml(c.name)}</h3><span class="muted">${items.length} saved components</span></div><div class="inline-actions"><button id="exportFlowMarkdownBtn" class="secondary small">Export DESIGN.md</button><button id="deleteFlowBtn" class="danger small">Delete flow</button></div></div><div class="flow-items">${items.map((cap,i)=>`<div class="flow-item" data-id="${escapeHtml(cap.id)}"><span class="flow-order">${i+1}</span><div class="flow-item-copy"><strong>${escapeHtml(cap.name)}</strong><span>${escapeHtml((()=>{try{return new URL(cap.url).hostname}catch{return cap.url||''}})())}</span></div><div class="flow-item-actions"><button data-move="up" title="Move up" ${i===0?'disabled':''}>↑</button><button data-move="down" title="Move down" ${i===items.length-1?'disabled':''}>↓</button><button data-remove="true" title="Remove from flow">×</button></div></div>`).join('') || '<div class="empty-inline">No components in this flow. Select a capture in Library and assign it to this flow.</div>'}</div>`;
  $('exportFlowMarkdownBtn').addEventListener('click',()=>exportCollectionMarkdown(id));
  $('deleteFlowBtn').addEventListener('click', async()=>{if(!confirm(`Delete the “${c.name}” flow? Captures themselves will remain in Library.`))return;collections=collections.filter(x=>x.id!==id);activeCollectionId=null;await saveCollections();renderBoards();setNotice('Design flow deleted. Captures were kept.');});
  root.querySelectorAll('.flow-item').forEach(item=>item.querySelectorAll('[data-move]').forEach(btn=>btn.addEventListener('click',async()=>{const ids=c.captureIds;const i=ids.indexOf(item.dataset.id);const j=btn.dataset.move==='up'?i-1:i+1;if(j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];await saveCollections();showCollection(id);} )));
  root.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',async()=>{c.captureIds=c.captureIds.filter(x=>x!==btn.closest('.flow-item').dataset.id);await saveCollections();showCollection(id);setNotice('Component removed from flow; capture remains in history.');}));
  if(rerender) { $('boardList').querySelectorAll('.board-card').forEach(b=>b.classList.toggle('selected', b.querySelector('strong')?.textContent===c.name)); }
}
function renderInteractionEvents() {
  api.storage.local.get([INTERACTION_KEY,'designshelfRecordingTabId']).then(data => {
    const rawEvents = Array.isArray(data[INTERACTION_KEY]) ? data[INTERACTION_KEY] : [];
    const events = rawEvents.map(projectImport.normaliseEvent).filter(Boolean).slice(-300);
    if (JSON.stringify(events) !== JSON.stringify(rawEvents.slice(-300))) api.storage.local.set({[INTERACTION_KEY]:events}).catch(()=>{});
    recording = Number.isInteger(data.designshelfRecordingTabId);
    const root = $('interactionEvents'); root.replaceChildren();
    $('recordingStatus').textContent = recording ? 'Recording' : 'Stopped';
    $('startRecordingBtn').disabled = recording; $('stopRecordingBtn').disabled = !recording; $('exportRecordingBtn').disabled = !events.length; updateActionStates();
    if (!events.length) { root.innerHTML = '<div class="empty-inline">No interaction events recorded yet.</div>'; return; }
    events.slice(-80).reverse().forEach(event => {
      const row=document.createElement('div'); row.className='insight-row';
      const main=document.createElement('div'); main.className='insight-main';
      const strong=document.createElement('strong'); strong.textContent=`${event.event} · ${event.tag}${event.role ? ` [${event.role}]` : ''}`;
      const sub=document.createElement('span'); sub.textContent=`${event.label || event.selector || 'Unnamed element'} · ${event.time ? new Date(event.time).toLocaleTimeString() : ''}`;
      main.append(strong,sub); const state=document.createElement('code'); state.textContent=event.state?.expanded != null ? `expanded=${event.state.expanded}` : event.state?.selected != null ? `selected=${event.state.selected}` : `${event.bounds?.width||0}×${event.bounds?.height||0}`; row.append(main,state); root.appendChild(row);
    });
  }).catch(()=>{});
}
async function runPageInsights() {
  const btn=$('refreshInsightsBtn'); btn.disabled=true; btn.textContent='Inspecting…';
  try {
    const response=await api.runtime.sendMessage({type:'DESIGNSHELF_GET_PAGE_INSIGHTS'});
    if(!response?.ok||!response.insights) { setNotice(response?.error||'Could not inspect this page.',true); return; }
    pageInsightsCache=response.insights; renderPageInsights(pageInsightsCache); setNotice('Page insights collected locally. Cross-origin stylesheet details may be unavailable.');
  } catch(error) { setNotice(`Inspection failed: ${error?.message||'Unknown error'}`,true); }
  finally { btn.disabled=false; btn.textContent='Inspect page'; }
}
function renderPageInsights(data) {
  const summary=$('insightsSummary'); summary.replaceChildren();
  const metrics=[['Images',data.images?.length||0],['Fonts',data.fonts?.length||0],['Scripts',data.scripts?.length||0],['Stylesheets',data.stylesheets?.length||0],['Controls',data.controls?.length||0],['DOM elements',data.page?.elementCount||0]];
  metrics.forEach(([label,value])=>{const card=document.createElement('div');card.className='audit-metric';const strong=document.createElement('strong');strong.textContent=String(value);const span=document.createElement('span');span.textContent=label;card.append(strong,span);summary.appendChild(card);});
  const root=$('assetExplorer'); root.replaceChildren();
  const addGroup=(title,items,formatter)=>{const h=document.createElement('h4');h.textContent=title;root.appendChild(h);if(!items?.length){const empty=document.createElement('div');empty.className='empty-inline';empty.textContent='No items detected.';root.appendChild(empty);return;}items.slice(0,80).forEach(item=>{const row=document.createElement('div');row.className='insight-row';const main=document.createElement('div');main.className='insight-main';const strong=document.createElement('strong');strong.textContent=formatter(item).title;const sub=document.createElement('span');sub.textContent=formatter(item).detail;main.append(strong,sub);row.appendChild(main);root.appendChild(row);});};
  addGroup('Images',data.images,i=>({title:i.url,detail:`${i.naturalWidth||'?'}×${i.naturalHeight||'?'} source · ${i.displayWidth}×${i.displayHeight} rendered · alt: ${i.alt||'missing'}`}));
  addGroup('Stylesheets',data.stylesheets,i=>({title:i.url,detail:`media: ${i.media}${i.disabled?' · disabled':''}`}));
  addGroup('Fonts',data.tokens?.fonts,i=>({title:i.value,detail:`Used on ${i.count} inspected style declarations`}));
  addGroup('Interactive controls',data.controls,i=>({title:`${i.tag}${i.role?' / '+i.role:''} · ${i.label||'unnamed'}`,detail:i.selector}));
  addGroup('Running and active animations',data.animations,i=>({title:`${i.name} · ${i.playState}`,detail:`${i.selector} · ${JSON.stringify(i.timing)} · ${i.keyframes.length} keyframe(s)`}));
  addGroup('Stylesheet rules (accessible subset)',data.cssRules,i=>({title:i.selector,detail:`${i.cssText||'(no declarations)'} · ${i.source}`}));
  addGroup('Current viewport checks',data.responsive?.issues,i=>({title:i.title,detail:`${i.detail} · ${i.evidence?.length||0} example(s)`}));
}
function loadWorkbench() {
  const c=captures.find(x=>x.id===selectedId);if(!c){setNotice('Select a capture in Library first.',true);return;}
  $('workbenchHtml').value=c.html||'';$('workbenchCss').value=c.css||'';workbenchUndo=[];workbenchRedo=[];workbenchLast={html:$('workbenchHtml').value,css:$('workbenchCss').value};updateWorkbench();setNotice('Loaded selected capture into the isolated workbench.');
}
function updateWorkbench() {
  const rawHtml=$('workbenchHtml').value, rawCss=$('workbenchCss').value;
  if (rawHtml !== workbenchLast.html || rawCss !== workbenchLast.css) { workbenchUndo.push(workbenchLast); if(workbenchUndo.length>50) workbenchUndo.shift(); workbenchRedo=[]; workbenchLast={html:rawHtml,css:rawCss}; }
  const html=sanitisePreviewHtml(rawHtml||'<p>No HTML snapshot.</p>');
  const css=sanitisePreviewCss(rawCss.split(';').map(x=>x.trim()).filter(Boolean).map(x=>x.endsWith('!important')?x:x+' !important').join(';'));
  $('workbenchPreview').srcdoc=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:"><style>html,body{margin:0;padding:10px;font-family:system-ui,sans-serif;overflow:auto}*{box-sizing:border-box}img,video,svg{max-width:100%;height:auto}#ds-workbench-root>*:first-child{${css}}</style></head><body><div id="ds-workbench-root">${html}</div></body></html>`;
}
function findSimilarCaptures() {
  const selected=captures.find(c=>c.id===selectedId),root=$('similarResults');root.replaceChildren();if(!selected){root.innerHTML='<div class="empty-inline">Select a capture in Library first.</div>';return;}
  const selectedColors=new Set(selected.tokens?.colors||[]),selectedFont=selected.tokens?.fontFamily||'',selectedTag=selected.tag||'',selectedName=(selected.name||'').toLowerCase();
  const results=captures.filter(c=>c.id!==selected.id).map(c=>{let score=0,why=[];if(c.tag===selectedTag){score+=3;why.push('same tag');}const shared=(c.tokens?.colors||[]).filter(v=>selectedColors.has(v));if(shared.length){score+=Math.min(4,shared.length);why.push(`${shared.length} shared colour(s)`);}if(selectedFont&&c.tokens?.fontFamily===selectedFont){score+=2;why.push('same font family');}const words=selectedName.split(/\W+/).filter(w=>w.length>3);if(words.some(w=>(c.name||'').toLowerCase().includes(w))){score+=2;why.push('similar name');}return {capture:c,score,why};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,20);
  if(!results.length){root.innerHTML='<div class="empty-inline">No obvious matches in the current library. Similarity is based on tags and captured style tokens, not visual AI analysis.</div>';return;}
  results.forEach(result=>{const row=document.createElement('div');row.className='insight-row';const main=document.createElement('div');main.className='insight-main';const strong=document.createElement('strong');strong.textContent=result.capture.name;const sub=document.createElement('span');sub.textContent=`Score ${result.score} · ${result.why.join(', ')} · ${result.capture.url||'unknown source'}`;main.append(strong,sub);const open=document.createElement('button');open.className='secondary small';open.textContent='Open';open.addEventListener('click',()=>{switchView('library');selectCapture(result.capture.id);});row.append(main,open);root.appendChild(row);});
}
function collectTokenCounts() { return globalThis.DesignShelfTokenExport.collectTokenCounts(captures); }
function renderTokenMapper() {
  const root = $('tokenMapper'); root.replaceChildren();
  if (!captures.length) { root.innerHTML = '<div class="empty-inline">Capture components to build your local token map.</div>'; return; }
  const groups = collectTokenCounts();
  const group = (label, map) => {
    const h = document.createElement('h4'); h.textContent = label; root.appendChild(h);
    [...map.entries()].sort((a,b) => b[1] - a[1]).slice(0,35).forEach(([value,count]) => {
      const row = document.createElement('div'); row.className = 'insight-row';
      const main = document.createElement('div'); main.className = 'insight-main';
      const strong = document.createElement('strong'); strong.textContent = value;
      const sub = document.createElement('span'); sub.textContent = `Observed in ${count} saved token snapshot(s)`;
      main.append(strong,sub);
      const copy = document.createElement('button'); copy.className = 'secondary small'; copy.textContent = 'Copy';
      copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(value); setNotice('Token copied.'); } catch { setNotice(value); } });
      row.append(main,copy); root.appendChild(row);
    });
  };
  group('Observed colours',groups.colors); group('Font families',groups.fonts);
  group('Font sizes',groups.fontSizes); group('Line heights',groups.lineHeights); group('Font weights',groups.fontWeights);
  group('Letter spacing',groups.letterSpacing); group('Border radii',groups.radii);
}

function exportDesignTokens() {
  if (!captures.length) { setNotice('Capture at least one component before exporting tokens.',true); return; }
  const groups = collectTokenCounts();
  const format = $('tokenExportFormat').value;
  if (format === 'css') {
    downloadFile('designshelf-observed-tokens.css',globalThis.DesignShelfTokenExport.buildCssTokenExport(groups),'text/css');
    setNotice('Observed CSS variables exported. Token names are neutral, not semantic guesses.');
  } else if (format === 'tailwind') {
    downloadFile('designshelf-tailwind-v4-theme.css',globalThis.DesignShelfTokenExport.buildTailwindTheme(groups),'text/css');
    setNotice('Tailwind v4 theme exported. Review token coverage before use.');
  } else {
    downloadFile('designshelf-observed-tokens.tokens.json',JSON.stringify(globalThis.DesignShelfTokenExport.buildDtcgTokens(groups),null,2),'application/design-tokens+json');
    setNotice('DTCG design tokens exported. Values are measured snapshots, with neutral sequence names.');
  }
}

function renderCompareSelectors() {
  for(const id of ['compareA','compareB']){const select=$(id),old=select.value;select.replaceChildren(new Option('Choose a capture…',''));captures.forEach(c=>select.add(new Option(`${c.name} · ${new Date(c.capturedAt).toLocaleDateString()}`,c.id)));if(captures.some(c=>c.id===old))select.value=old;}
  if(captures.length>1 && !$('compareA').value){$('compareA').value=captures[0].id;$('compareB').value=captures[1].id;}
}
function compareCaptures() {
  const a=captures.find(c=>c.id===$('compareA').value), b=captures.find(c=>c.id===$('compareB').value), root=$('compareResults');root.replaceChildren();
  if(!a||!b||a.id===b.id){root.innerHTML='<div class="empty-inline">Choose two different captures.</div>';return;}
  const checks=[['HTML length',String(a.html||'').length,String(b.html||'').length],['CSS length',String(a.css||'').length,String(b.css||'').length],['Tree elements',(a.structure||[]).length,(b.structure||[]).length],['Element dimensions',`${a.width||'?'}×${a.height||'?'}`,`${b.width||'?'}×${b.height||'?'}`],['Capture viewport',a.viewport?`${a.viewport.width}×${a.viewport.height} @ ${a.viewport.devicePixelRatio}×`:'Unavailable',b.viewport?`${b.viewport.width}×${b.viewport.height} @ ${b.viewport.devicePixelRatio}×`:'Unavailable'],['Fonts',a.tokens?.fontFamily||'Unavailable',b.tokens?.fontFamily||'Unavailable'],['Colours',(a.tokens?.colors||[]).join(', ')||'Unavailable',(b.tokens?.colors||[]).join(', ')||'Unavailable'],['Animation',JSON.stringify(a.animation||{}),JSON.stringify(b.animation||{})]];
  checks.forEach(([label,av,bv])=>{const row=document.createElement('div');row.className='compare-row';const title=document.createElement('strong');title.textContent=label;const left=document.createElement('span');left.textContent=`A: ${String(av)}`;const right=document.createElement('span');right.textContent=`B: ${String(bv)}`;row.append(title,left,right);root.appendChild(row);});
  const normalized = value => String(value||'').replace(/\s+/g,' ').trim();
  const linesA=new Set(String(a.css||'').split(/;|\n/).map(x=>x.trim()).filter(Boolean));
  const linesB=new Set(String(b.css||'').split(/;|\n/).map(x=>x.trim()).filter(Boolean));
  const onlyA=[...linesA].filter(x=>!linesB.has(x)).slice(0,30), onlyB=[...linesB].filter(x=>!linesA.has(x)).slice(0,30);
  const structuralA=(a.structure||[]).map(n=>`${n.tag}:${n.name||''}`).join('|'), structuralB=(b.structure||[]).map(n=>`${n.tag}:${n.name||''}`).join('|');
  const details=document.createElement('div');details.className='insight-list';
  const addDiff=(title,items,empty)=>{const h=document.createElement('h4');h.textContent=title;details.appendChild(h);if(!items.length){const p=document.createElement('div');p.className='empty-inline';p.textContent=empty;details.appendChild(p);return;}items.forEach(v=>{const row=document.createElement('div');row.className='insight-row';const span=document.createElement('span');span.className='insight-main';span.textContent=v;row.appendChild(span);details.appendChild(row);});};
  addDiff('CSS declarations only in A',onlyA,'No unique declarations detected in A.');addDiff('CSS declarations only in B',onlyB,'No unique declarations detected in B.');
  const struct=document.createElement('p');struct.className='small-note';struct.textContent=`Structure signature ${normalized(structuralA)===normalized(structuralB)?'matches':'differs'}. This is a text and metadata comparison, not a pixel-perfect screenshot diff; computed-style snapshots can contain repeated or flattened declarations.`;details.appendChild(struct);root.appendChild(details);
  const summary=document.createElement('p');summary.className='small-note';summary.textContent=`Capture A: ${a.url||'unknown source'} · Capture B: ${b.url||'unknown source'}.`;root.appendChild(summary);
}
function runCascadeReview() {
  const c=captures.find(x=>x.id===selectedId),root=$('cascadeResults');root.replaceChildren();
  if(!c){root.innerHTML='<div class="empty-inline">Select a capture in Library first.</div>';return;}
  const css=String(c.css||''), html=String(c.html||''), rules=css.split(/\n|;/).map(x=>x.trim()).filter(Boolean);
  const counts=new Map();rules.forEach(line=>{const m=line.match(/^([\w-]+)\s*:\s*(.+)$/);if(m){const key=m[1].toLowerCase()+': '+m[2].trim();counts.set(key,(counts.get(key)||0)+1);}});
  const duplicate=[...counts].filter(([,n])=>n>1);
  const declarations=[...new Set(rules.filter(line=>/^[\w-]+\s*:\s*.+$/.test(line)))].slice(0,100);
  const add=(heading,items,empty)=>{const h=document.createElement('h4');h.textContent=heading;root.appendChild(h);if(!items.length){const e=document.createElement('div');e.className='empty-inline';e.textContent=empty;root.appendChild(e);return;}items.forEach(item=>{const row=document.createElement('div');row.className='insight-row';const main=document.createElement('div');main.className='insight-main';const strong=document.createElement('strong');strong.textContent=item.title||item;const sub=document.createElement('span');sub.textContent=item.detail||'';main.append(strong,sub);row.appendChild(main);root.appendChild(row);});};
  add('Captured declarations',declarations.map(x=>({title:x,detail:'Computed snapshot declaration; original selector and cascade order may not be retained.'})),'No declarations were captured.');
  add('Repeated declarations',duplicate.map(([value,n])=>({title:value,detail:`Repeated ${n} times. This may reflect multiple elements in a flattened computed-style snapshot, not redundant source CSS.`})),'No repeated declaration strings found.');
  const doc=new DOMParser().parseFromString(html,'text/html');
  const selectors=[...doc.querySelectorAll('[id]')].map(el=>`#${el.id}`);
  const repeatedIds=selectors.filter((id,i)=>selectors.indexOf(id)!==i);
  add('Markup checks',repeatedIds.map(id=>({title:`Duplicate ID ${id}`,detail:'Duplicate IDs can break labels, scripts and selector targeting.'})), 'No duplicate IDs found in the captured markup.');
  const note=document.createElement('p');note.className='small-note';note.textContent='The capture does not preserve a complete browser CSS cascade trace. Cross-origin stylesheet rules may be inaccessible. This review is evidence-based but not a source-level proof of unused CSS.';root.appendChild(note);
}
function projectPayload() {
  return {format:'DesignShelfProject',schemaVersion:1,exportedAt:new Date().toISOString(),appVersion:'0.8.3',captures,collections,interactionEvents:[],metadata:{retentionDays:RETENTION_DAYS,localOnly:true}};
}
async function exportFullProject() {
  const data=await api.storage.local.get([INTERACTION_KEY,'designshelfLastCapture','designshelfLastCaptureAt','designshelfAuditHistory']);
  const payload=projectPayload();payload.interactionEvents=Array.isArray(data[INTERACTION_KEY])?data[INTERACTION_KEY].map(projectImport.normaliseEvent).filter(Boolean).slice(-300):[];payload.auditHistory=Array.isArray(data.designshelfAuditHistory)?data.designshelfAuditHistory.map(projectImport.normaliseAudit).filter(Boolean).slice(-20):[];payload.lastCapture=data.designshelfLastCapture?projectImport.normaliseCapture(data.designshelfLastCapture):null;payload.lastCaptureAt=projectImport.boundedText(data.designshelfLastCaptureAt,40)||null;
  downloadFile(`designshelf-project-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(payload,null,2),'application/json');setNotice('Full project exported. Store the JSON securely; it may contain captured website markup and URLs.');
}
async function importFullProject(file) {
  if (!file) return;
  if (file.size > 25 * 1024 * 1024) { setNotice('Import file exceeds 25 MB. Split the project or export smaller collections.', true); return; }
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid project file.');
    const importedCaptures = Array.isArray(parsed) ? parsed : (parsed.captures || parsed.library?.captures);
    const importedCollections = Array.isArray(parsed.collections) ? parsed.collections : (parsed.library?.collections || []);
    if (!Array.isArray(importedCaptures) || !Array.isArray(importedCollections)) throw new Error('This file does not contain valid captures and collections arrays.');
    if (importedCaptures.length > 5000 || importedCollections.length > 1000) throw new Error('Project exceeds the supported import limits.');
    const valid = importedCaptures.map(projectImport.normaliseCapture).filter(Boolean);
    if (!valid.length && importedCaptures.length) throw new Error('No valid captures were found.');
    const byId = new Map(captures.map(c => [c.id,c]));
    valid.forEach(c => byId.set(c.id,{...c,importedAt:new Date().toISOString()}));
    const nextCaptures = [...byId.values()].slice(0,5000);
    const validIds = new Set(byId.keys());
    const collectionMap = new Map(collections.map(c => [c.id,c]));
    importedCollections.forEach(c => {
      if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !c.id.trim() || c.id.length > 100 || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 80) return;
      const ids = Array.isArray(c.captureIds) ? c.captureIds.filter(id => typeof id === 'string' && validIds.has(id)).slice(0,5000) : [];
      const createdAt=projectImport.boundedText(c.createdAt,40);
      collectionMap.set(c.id,{id:c.id,name:c.name.trim(),createdAt:createdAt&&Number.isFinite(Date.parse(createdAt))?createdAt:new Date().toISOString(),captureIds:ids});
    });
    const nextCollections = [...collectionMap.values()].slice(0,1000);
    const importedEvents = Array.isArray(parsed.interactionEvents) ? parsed.interactionEvents.map(projectImport.normaliseEvent).filter(Boolean).slice(-300) : [];
    const old = await api.storage.local.get(null);
    const events = [...(Array.isArray(old[INTERACTION_KEY]) ? old[INTERACTION_KEY].map(projectImport.normaliseEvent).filter(Boolean) : []),...importedEvents].slice(-300);
    const auditHistory = Array.isArray(parsed.auditHistory) ? parsed.auditHistory.map(projectImport.normaliseAudit).filter(Boolean).slice(-20) : (Array.isArray(old.designshelfAuditHistory) ? old.designshelfAuditHistory : []);
    const nextState = {...old,[STORAGE_KEY]:nextCaptures,[COLLECTION_KEY]:nextCollections,[INTERACTION_KEY]:events,designshelfAuditHistory:auditHistory};
    const estimatedBytes = JSON.stringify(nextState).length * 2;
    if (estimatedBytes > 7.5 * 1024 * 1024) throw new Error('This project would use too much local storage. Export a backup, remove older captures or split the project before importing.');
    await api.storage.local.set({[STORAGE_KEY]:nextCaptures,[COLLECTION_KEY]:nextCollections,[INTERACTION_KEY]:events,designshelfAuditHistory:auditHistory});
    captures=nextCaptures; collections=nextCollections;
    await loadCaptures(); renderInteractionEvents(); renderTokenMapper(); renderCompareSelectors(); refreshStorageUsage();
    setNotice(`Project imported: ${valid.length} valid capture(s) processed. Invalid records were skipped; expired captures may be removed by the 15-day retention policy.`);
  } catch(error) { setNotice(`Import failed: ${error.message||'Invalid project file'}`,true); }
  finally { $('importProjectFile').value=''; }
}
async function refreshStorageUsage() {
  const root=$('storageUsage');if(!root)return;root.replaceChildren();
  try {
    const data=await api.storage.local.get(null);const serialized=JSON.stringify(data);const bytes=serialized.length*2;const kb=bytes/1024;const mb=kb/1024;
    const metrics=[['Approx. local data',mb>=1?`${mb.toFixed(2)} MB`:`${kb.toFixed(1)} KB`],['Saved captures',captures.length],['Design flows',collections.length],['Recorded events',(Array.isArray(data[INTERACTION_KEY])?data[INTERACTION_KEY].length:0)]];
    metrics.forEach(([label,value])=>{const row=document.createElement('div');row.className='insight-row';const main=document.createElement('div');main.className='insight-main';const strong=document.createElement('strong');strong.textContent=String(value);const sub=document.createElement('span');sub.textContent=label;main.append(strong,sub);root.appendChild(row).appendChild(main);});
    const note=document.createElement('div');note.className='small-note';note.textContent='Estimate based on JSON-serialised local storage; actual storage usage and quotas differ. No browser quota is guaranteed.';root.appendChild(note);
  }catch(error){root.textContent=`Could not estimate storage: ${error.message||error}`;}
}
function workbenchHistory(direction) {
  const source=direction==='undo'?workbenchUndo:workbenchRedo, target=direction==='undo'?workbenchRedo:workbenchUndo;
  if(!source.length){setNotice(`Nothing to ${direction}.`,true);return;}
  target.push({html:$('workbenchHtml').value,css:$('workbenchCss').value});const state=source.pop();$('workbenchHtml').value=state.html;$('workbenchCss').value=state.css;workbenchLast={html:state.html,css:state.css};updateWorkbench();setNotice(direction==='undo'?'Workbench change undone.':'Workbench change restored.');
}
function runDeepChecks() {
  const c=captures.find(x=>x.id===selectedId),root=$('deepChecksResults');root.replaceChildren();if(!c){root.innerHTML='<div class="empty-inline">Select a capture in Library first.</div>';return;}
  const html=String(c.html||''),css=String(c.css||''),doc=new DOMParser().parseFromString(html,'text/html'),results=[];
  const declarations=css.split(/\n/).map(line=>line.trim()).filter(line=>/^[\w-]+\s*:\s*.+;?$/.test(line));const counts=new Map();declarations.forEach(line=>counts.set(line,(counts.get(line)||0)+1));const duplicates=[...counts].filter(([,n])=>n>1);
  if(duplicates.length)results.push({level:'warning',title:`${duplicates.length} repeated computed declaration(s)`,detail:'Repeated values in a computed-style snapshot are not proof of redundant source CSS. Review them manually before removing anything.'});
  const inputs=[...doc.querySelectorAll('input,select,textarea')];const unlabeled=inputs.filter(el=>!el.labels?.length&&!el.getAttribute('aria-label')&&!el.id);if(unlabeled.length)results.push({level:'warning',title:`${unlabeled.length} form control(s) may lack labels`,detail:'Associate each form control with a label or provide an accessible name.'});
  const targetBlank=[...doc.querySelectorAll('a[target="_blank"]')].filter(a=>!/\bnoopener\b/.test(a.rel));if(targetBlank.length)results.push({level:'warning',title:`${targetBlank.length} new-tab link(s) lack rel=noopener`,detail:'Consider rel="noopener" for links that open a new tab. Browser defaults vary.'});
  const headings=[...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(x=>Number(x.tagName.slice(1)));if(headings.some((v,i)=>i>0&&v>headings[i-1]+1))results.push({level:'info',title:'Heading levels may skip',detail:'Review heading hierarchy for a logical document outline.'});
  const genericLinks=[...doc.querySelectorAll('a')].filter(a=>/^click here|read more|learn more$/i.test((a.textContent||'').trim()));if(genericLinks.length)results.push({level:'info',title:`${genericLinks.length} link(s) use generic wording`,detail:'Consider link text that describes the destination or action.'});
  const motion=c.animation||{};if(motion.name&&motion.name!=='none'&&!/prefers-reduced-motion/.test(css))results.push({level:'info',title:'Motion detected; reduced-motion support not confirmed',detail:'Inspect the original stylesheet for a prefers-reduced-motion alternative. The capture cannot prove whether one exists.'});
  if(!results.length)results.push({level:'pass',title:'No additional heuristic findings',detail:'This does not certify accessibility, CSS efficiency or browser compatibility.'});
  results.forEach(r=>{const item=document.createElement('article');item.className=`quality-item ${r.level}`;const pill=document.createElement('span');pill.className='quality-pill';pill.textContent=r.level;const title=document.createElement('strong');title.textContent=r.title;const detail=document.createElement('p');detail.textContent=r.detail;item.append(pill,title,detail);root.appendChild(item);});
}
async function startRecording() {
  const response=await api.runtime.sendMessage({type:'DESIGNSHELF_START_RECORDING'});
  if(!response?.ok){setNotice(response?.error||'Could not start recording.',true);return;}
  recording=true;renderInteractionEvents();setNotice('Interaction recording started on the active page. Interact with the page, then stop recording.');
}
async function stopRecording() {
  const response=await api.runtime.sendMessage({type:'DESIGNSHELF_STOP_RECORDING'});recording=false;renderInteractionEvents();setNotice(response?.ok?'Interaction recording stopped.':'Could not stop recording.',!response?.ok);
}

function showTutorial() { tutorialStep=0; renderTutorial(); $('tutorialDialog').showModal(); }
function renderTutorial() { const s=tutorial[tutorialStep]; $('tutorialStepLabel').textContent=`GETTING STARTED · ${tutorialStep+1} OF ${tutorial.length}`; $('tutorialIcon').textContent=s.icon; $('tutorialTitle').textContent=s.title; $('tutorialText').textContent=s.text; $('tutorialTip').textContent=s.tip; $('tutorialPrevBtn').disabled=tutorialStep===0; $('tutorialNextBtn').textContent=tutorialStep===tutorial.length-1?'Finish':'Next'; }

$('pickBtn').addEventListener('click', async()=>{setNotice('Activating element picker on the active website…');try{const response=await api.runtime.sendMessage({type:'DESIGNSHELF_START_PICK'});if(!response?.ok){setNotice(response?.error||'Could not start the picker.',true);return;}setNotice('Picker active. Hover over a section, adjust the boundary and capture.');}catch(e){setNotice('Could not start the picker. Open a normal website and try again.',true);}});
$('closeDetailBtn').addEventListener('click',closeDetail);
$('saveCaptureNoteBtn').addEventListener('click',async()=>{const capture=captures.find(item=>item.id===selectedId);if(!capture)return;capture.note=$('captureNote').value.slice(0,2000).trim();await saveCaptures();$('noteStatus').textContent=capture.note?'Note saved locally':'No note saved';setNotice(capture.note?'Research note saved with this capture.':'Research note cleared.');});
$('expandPreviewBtn').addEventListener('click',()=>{const f=$('previewFrame');const expanded=f.classList.toggle('expanded');$('expandPreviewBtn').textContent=expanded?'Restore preview':'Expand preview';$('expandPreviewBtn').setAttribute('aria-pressed',String(expanded));});
$('settingsBtn').addEventListener('click',()=>$('aboutDialog').showModal()); $('closeAboutBtn').addEventListener('click',()=>$('aboutDialog').close());
$('tutorialBtn').addEventListener('click',showTutorial); $('closeTutorialBtn').addEventListener('click',async()=>{$('tutorialDialog').close();await api.storage.local.set({designshelfTutorialSeen:true});});
$('tutorialPrevBtn').addEventListener('click',()=>{if(tutorialStep>0){tutorialStep--;renderTutorial();}});
$('tutorialNextBtn').addEventListener('click',async()=>{if(tutorialStep<tutorial.length-1){tutorialStep++;renderTutorial();}else{$('tutorialDialog').close();await api.storage.local.set({designshelfTutorialSeen:true});setNotice('Tutorial complete. Start by capturing a section from a website.');}});
document.querySelectorAll('.view-btn').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
document.querySelector('.workspace-nav')?.addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  const tabs = [...document.querySelectorAll('.view-btn')];
  const current = tabs.indexOf(document.activeElement);
  if (current < 0) return;
  let next = current;
  if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
  if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = tabs.length - 1;
  event.preventDefault();
  switchView(tabs[next].dataset.view, true);
});
document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{activeTab=tab.dataset.tab;document.querySelectorAll('.tab').forEach(x=>{const active=x===tab;x.classList.toggle('active',active);x.setAttribute('aria-selected',String(active));x.tabIndex=active?0:-1;if(active)$('codeView').setAttribute('aria-labelledby',x.id);});const c=captures.find(x=>x.id===selectedId);if(c)renderCode(c);}));
$('detailPanel').querySelector('.tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=[...document.querySelectorAll('.tab')];const current=tabs.indexOf(document.activeElement);let next=current;if(event.key==='ArrowRight')next=(current+1)%tabs.length;if(event.key==='ArrowLeft')next=(current-1+tabs.length)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;event.preventDefault();tabs[next].focus();tabs[next].click();});
$('copyCodeBtn').addEventListener('click',async()=>{const c=captures.find(x=>x.id===selectedId);if(!c)return;const item=currentInspectedItem(c);const content=activeTab==='html'?(item?.html||c.html):activeTab==='css'?(item?.css||c.css):activeTab==='animation'?JSON.stringify(item?.animation||c.animation||{},null,2):runQualityChecks({html:item?.html||c.html,css:item?.css||c.css}).map(x=>`${x.level.toUpperCase()}: ${x.title}\n${x.detail}`).join('\n\n');try{await navigator.clipboard.writeText(content||'');setNotice('Content copied to clipboard.');}catch{setNotice('Clipboard access was blocked. Select and copy the code manually.',true);}});
$('downloadBtn').addEventListener('click',()=>{const c=captures.find(x=>x.id===selectedId);if(!c)return;const node=currentInspectedItem(c);const target=node?{...c,name:node.name||node.tag,html:node.html||c.html,css:node.css||c.css,animation:node.animation||c.animation,tokens:node.tokens||c.tokens}:c;const format=$('exportFormat').value;downloadFile(`${slug(target.name)}.${extensionFor(format)}`,exportContent(target,format),format==='html'?'text/html':'text/plain');setNotice(`${format.toUpperCase()} starter downloaded. Review generated code before use.`);});
$('exportFormatBtn').addEventListener('click',()=>{const c=captures.find(x=>x.id===selectedId);if(!c){setNotice('Select a capture first.',true);return;}const node=currentInspectedItem(c);const target=node?{...c,name:node.name||node.tag,html:node.html||c.html,css:node.css||c.css,animation:node.animation||c.animation,tokens:node.tokens||c.tokens}:c;const format=$('exportFormat').value;downloadFile(`${slug(target.name)}.${extensionFor(format)}`,exportContent(target,format),format==='html'?'text/html':'text/plain');setNotice(`${format.toUpperCase()} starter exported. Generated framework code may need manual adjustment.`);});
$('deleteBtn').addEventListener('click',async()=>{if(!selectedId)return;captures=captures.filter(x=>x.id!==selectedId);closeDetail();await saveCaptures();setNotice('Capture deleted.');});
$('historyFilter').addEventListener('change',e=>{historyFilter=e.target.value;renderList();});
$('captureSearch').addEventListener('input',renderList);
$('exportAllBtn').addEventListener('click',()=>{downloadFile('designshelf-library.json',JSON.stringify({captures,collections},null,2),'application/json');setNotice('Library and design flows exported as JSON.');});
$('exportProjectBtn').addEventListener('click',exportFullProject);
$('importProjectBtn').addEventListener('click',()=>$('importProjectFile').click());
$('importProjectFile').addEventListener('change',e=>importFullProject(e.target.files?.[0]));
$('refreshStorageBtn').addEventListener('click',refreshStorageUsage);
$('cascadeReviewBtn').addEventListener('click',runCascadeReview);
$('clearAllBtn').addEventListener('click',async()=>{const stored=await api.storage.local.get([STORAGE_KEY,COLLECTION_KEY,INTERACTION_KEY,'designshelfAuditHistory','designshelfLastCapture','designshelfRecordingTabId']);const hasHistory=[STORAGE_KEY,COLLECTION_KEY,INTERACTION_KEY,'designshelfAuditHistory','designshelfLastCapture','designshelfRecordingTabId'].some(key=>Array.isArray(stored[key])?stored[key].length>0:!!stored[key]);if(!hasHistory)return;if(!confirm('Permanently delete ALL DesignShelf captures, flows, interaction events and page audit history from this browser profile? This cannot be undone.'))return;if(Number.isInteger(stored.designshelfRecordingTabId)){try{await api.runtime.sendMessage({type:'DESIGNSHELF_STOP_RECORDING'});}catch{}}recording=false;captures=[];collections=[];activeCollectionId=null;closeDetail();await api.storage.local.remove([STORAGE_KEY,COLLECTION_KEY,INTERACTION_KEY,'designshelfAuditHistory','designshelfLastCapture','designshelfLastCaptureAt','designshelfRecordingTabId']);await saveCaptures();await saveCollections();renderInteractionEvents();setNotice('All DesignShelf history deleted.');});
$('createCollectionBtn').addEventListener('click',createCollection); $('newBoardBtn').addEventListener('click',createCollection);
$('collectionSelect').addEventListener('change',async e=>{const c=captures.find(x=>x.id===selectedId);const flow=collections.find(x=>x.id===e.target.value);if(!c||!flow)return;collections.forEach(x=>x.captureIds=(x.captureIds||[]).filter(id=>id!==c.id));flow.captureIds.push(c.id);c.collectionId=flow.id;await saveCollections();await saveCaptures();setNotice(`Added “${c.name}” to “${flow.name}”.`);});
$('runQualityBtn').addEventListener('click',()=>{renderQuality();const c=captures.find(x=>x.id===selectedId);if(c){setNotice('Quality checks complete. Review each warning before changing the source.');}else setNotice('Select a capture from Library first.',true);});
$('scanPageBtn').addEventListener('click',scanActivePage);
$('exportAuditBtn').addEventListener('click',()=>{if(!latestAudit)return;downloadFile(`designshelf-audit-${slug(latestAudit.page?.host||'page')}.json`,JSON.stringify(latestAudit,null,2),'application/json');setNotice('Audit report exported as JSON. Resource URLs omit query strings and fragments.');});
$('refreshInsightsBtn').addEventListener('click',runPageInsights);
$('loadWorkbenchBtn').addEventListener('click',loadWorkbench);
$('updateWorkbenchBtn').addEventListener('click',()=>{updateWorkbench();setNotice('Updated the isolated preview. The original page has not been changed.');});
$('undoWorkbenchBtn')?.addEventListener('click',()=>workbenchHistory('undo'));
$('redoWorkbenchBtn')?.addEventListener('click',()=>workbenchHistory('redo'));
$('resetWorkbenchBtn').addEventListener('click',loadWorkbench);
$('exportWorkbenchBtn').addEventListener('click',()=>{const c=captures.find(x=>x.id===selectedId);if(!c){setNotice('Select a capture first.',true);return;}const html=$('workbenchHtml').value,css=$('workbenchCss').value;downloadFile(`${slug(c.name)}-variant.html`,`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>/* Review and scope these captured computed declarations before production use. */
${css}
</style></head><body>${html}</body></html>`,'text/html');setNotice('Workbench variant exported. Review CSS scoping and assets before using it in a project.');});
$('findSimilarBtn').addEventListener('click',findSimilarCaptures);
$('startRecordingBtn').addEventListener('click',startRecording);
$('stopRecordingBtn').addEventListener('click',stopRecording);
$('exportRecordingBtn').addEventListener('click',async()=>{const data=await api.storage.local.get(INTERACTION_KEY);const events=Array.isArray(data[INTERACTION_KEY])?data[INTERACTION_KEY].map(projectImport.normaliseEvent).filter(Boolean).slice(-300):[];downloadFile('designshelf-interaction-recording.json',JSON.stringify(events,null,2),'application/json');});
document.querySelectorAll('.viewport-btn').forEach(btn=>btn.addEventListener('click',()=>{const capture=captures.find(c=>c.id===selectedId);if(!capture){setNotice('Select a capture in Library first.',true);return;}const width=Number(btn.dataset.width);const frame=$('previewFrame'),iframe=$('preview');iframe.style.width=`${width}px`;iframe.style.maxWidth='none';frame.style.overflowX='auto';$('responsiveStatus').textContent=`Preview width set to ${width}px. This tests the captured snapshot; original media queries and missing external styles may not be fully represented.`;setNotice(`Preview width set to ${width}px.`);}));
$('exportTokensBtn').addEventListener('click',exportDesignTokens);
$('compareBtn').addEventListener('click',compareCaptures);
$('deepChecksBtn').addEventListener('click',runDeepChecks);

api.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if((changes[INTERACTION_KEY]||changes.designshelfRecordingTabId) && currentView==='toolbox') renderInteractionEvents();if(changes[STORAGE_KEY]||changes[COLLECTION_KEY]){loadCaptures().then(()=>{const last=changes.designshelfLastCapture?.newValue;if(last&&captures.some(x=>x.id===last.id)){selectCapture(last.id);setNotice('Component captured and saved to history.');}if(currentView==='toolbox'){renderTokenMapper();renderCompareSelectors();}}).catch(e=>setNotice(`Could not refresh history: ${e.message}`,true));}else if(changes.designshelfLastCapture?.newValue){const c=changes.designshelfLastCapture.newValue;if(c&&captures.some(x=>x.id===c.id)){selectCapture(c.id);setNotice('Component captured and saved to history.');}}});
loadCaptures().then(async()=>{const seen=await api.storage.local.get('designshelfTutorialSeen');if(!seen.designshelfTutorialSeen)showTutorial();}).catch(e=>setNotice(`Could not load local library: ${e.message}`,true));
