const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('browser manifests use least-privilege active-tab injection', () => {
  for (const browser of ['chrome', 'firefox']) {
    const m = JSON.parse(read(`${browser}/manifest.json`));
    assert.equal(m.manifest_version, 3);
    assert.equal(m.version, '0.8.3');
    assert.ok(m.permissions.includes('activeTab'));
    assert.ok(m.permissions.includes('scripting'));
    assert.ok(!m.host_permissions, 'no persistent host permissions');
    assert.ok(!m.content_scripts, 'no automatic all-site content script');
  }
});

test('capture pipeline bounds cloned markup and selects the element under the pointer', () => {
  const c = read('content.js');
  assert.match(c, /DESIGNSHELF_CAPTURE/);
  assert.match(c, /api\.runtime\.sendMessage/);
  assert.match(c, /showPickerNotice\('Component saved to DesignShelf\.'/);
  assert.doesNotMatch(c, /window\.addEventListener\(['"]message['"]/);
  assert.doesNotMatch(c, /window\.postMessage\(/);
  assert.match(c, /clones\.slice\(maxNodes\)\.forEach\(node => node\.remove\(\)\)/);
  assert.match(c, /cleanCloneAndInline\(el, 10, 8000\)/);
  assert.match(c, /setCurrent\(element, false\)/);
  assert.match(c, /setCurrent\(element, true\)/);
});

test('background validates capture structure and aggregate payload size', () => {
  const b = read('background.js');
  assert.match(b, /isExtensionPageSender/);
  assert.match(b, /isWebContentSender/);
  assert.match(b, /validCapture/);
  assert.match(b, /validStructureNode/);
  assert.match(b, /MAX_ESTIMATED_STORAGE_BYTES/);
  assert.match(b, /JSON\.stringify\(capture\)\.length \* 2/);
  assert.match(b, /html:12000/);
});

test('interaction messages whitelist events and bound nested payloads', () => {
  const b = read('background.js');
  assert.match(b, /function validInteraction/);
  assert.match(b, /mouseover.*focusin.*change.*keydown.*submit/);
  assert.match(b, /JSON\.stringify\(item\)\.length \* 2 > 6000/);
  assert.match(b, /state\.controlledElement/);
  assert.match(b, /state\.computed/);
  assert.match(b, /events\.slice\(-300\)/);
  assert.match(b, /MAX_ESTIMATED_STORAGE_BYTES/);
});

test('previews are sanitised and deny external network resources', () => {
  const s = read('sidebar.js');
  assert.match(s, /function sanitisePreviewHtml/);
  assert.match(s, /function sanitisePreviewCss/);
  assert.match(s, /default-src 'none'/);
  assert.match(s, /img-src data:/);
  assert.match(s, /poster/);
  assert.match(read('content.js'), /response\?\.code==='STORAGE_LIMIT'/);
  assert.match(s, /data-ds-preview-root/);
  assert.match(s, /querySelectorAll\('script,iframe,object,embed,frame,frameset,base,link,meta,form,template'\)/);
});

test('project import normalises capture, event and audit records', () => {
  const s = read('sidebar.js');
  const importer = read('project-import.js');
  assert.match(importer, /function normaliseImportedCapture/);
  assert.match(importer, /note:boundedText\(c\.note,2000\)/);
  assert.match(importer, /DesignShelfTokenExport\.parseTokenColor\(v\) !== null/);
  assert.match(importer, /function normaliseImportedEvent/);
  assert.match(importer, /function normaliseImportedAudit/);
  assert.match(s, /importedCaptures\.map\(projectImport\.normaliseCapture\)/);
  assert.match(s, /parsed\.interactionEvents\.map\(projectImport\.normaliseEvent\)/);
  assert.match(s, /parsed\.auditHistory\.map\(projectImport\.normaliseAudit\)/);
  assert.match(s, /slice\(-300\)/);
  assert.match(s, /estimatedBytes > 7\.5 \* 1024 \* 1024/);
  assert.match(s, /await api\.storage\.local\.set\(\{\[STORAGE_KEY\]:nextCaptures/);
  assert.match(s, /captures=nextCaptures; collections=nextCollections/);
});

test('captured form controls do not retain entered values', () => {
  const c = read('content.js');
  assert.match(c, /clone\.querySelectorAll\('input,textarea,select,option'\)/);
  assert.match(c, /control\.removeAttribute\('value'\)/);
  assert.match(c, /control\.removeAttribute\('checked'\)/);
});

test('pinned captures bypass automatic expiry and are preserved on import', () => {
  const b = read('background.js');
  const s = read('sidebar.js');
  assert.match(b, /item\.pinned === true \|\|/);
  assert.match(s, /item\.pinned === true \|\|/);
  assert.match(read('project-import.js'), /pinned: c\.pinned === true/);
  assert.match(s, /Pin capture \(keep beyond 15 days\)/);
});

test('Field Notes design system is loaded by both browser builds', () => {
  for (const browser of ['chrome', 'firefox']) {
    assert.match(read(`${browser}/sidebar.html`), /sidebar\.css/);
    assert.ok(fs.existsSync(path.join(root, browser, 'sidebar.css')));
  }
  const css = read('sidebar.css');
  assert.match(css, /--ds-bg:\s*#f1efe7/i);
  assert.match(css, /--ds-accent:\s*#b34631/i);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
});

test('navigation and inspector tabs expose accessible state', () => {
  const h = read('sidebar.html');
  const s = read('sidebar.js');
  assert.match(h, /aria-current="page"/);
  assert.match(h, /id="captureNote"/);
  assert.match(h, /id="saveCaptureNoteBtn"/);
  assert.match(h, /role="tab"/);
  assert.match(h, /aria-selected="true"/);
  assert.match(s, /setAttribute\('aria-selected', String\(active\)\)/);
  assert.match(s, /setAttribute\('aria-current', 'page'\)/);
});


test('boards can export research notes as Markdown', () => {
  const s = read('sidebar.js');
  assert.match(s, /function exportCollectionMarkdown/);
  assert.match(s, /exportFlowMarkdownBtn/);
  assert.match(s, /Research note:/);
  assert.match(s, /Shared observed values/);
  assert.match(s, /Do not replace distinctive details with default gradients/);
  assert.match(s, /DESIGN\.md/);
});


test('page insights do not capture form values or raw query strings', () => {
  const c = read('content.js');
  assert.match(c, /url:safeUrl\(location\.href\)/);
  assert.match(c, /el\.getAttribute\('placeholder'\)/);
  assert.doesNotMatch(c, /el\.innerText\|\|el\.value/);
});


test('empty-state actions are disabled until their required data exists', () => {
  const h = read('sidebar.html');
  const s = read('sidebar.js');
  for (const id of ['exportProjectBtn','exportTokensBtn','compareBtn','findSimilarBtn','runQualityBtn','clearAllBtn']) {
    assert.match(h,new RegExp(`id=\"${id}\"[^>]*disabled`));
  }
  assert.match(s, /async function updateActionStates/);
  assert.match(s, /hasSelection=!!captures\.find/);
  assert.match(s, /clearAllBtn'\)\.disabled=/);
});


test('capture pipeline stores a bounded original element screenshot when browser capture is available', () => {
  const b=read('background.js'), c=read('content.js'), s=read('sidebar.js'), h=read('sidebar.html'), importer=read('project-import.js');
  assert.ok(b.includes('api.tabs.captureVisibleTab'));
  assert.ok(b.includes('captureElementScreenshot'));
  assert.ok(b.includes('OffscreenCanvas'));
  assert.ok(b.includes("capture.screenshotStatus = capture.screenshot ? 'captured' : 'unavailable'"));
  assert.ok(c.includes('rect: { x: Math.max(0, rect.left)'));
  assert.ok(s.includes('capture.screenshot?.dataUrl'));
  assert.ok(h.includes('id="captureScreenshot"'));
  assert.ok(importer.includes('screenshot: c.screenshot'));
});


test('component intelligence records pseudo-elements, semantic evidence and qualified framework signals', () => {
  const c=read('content.js'), b=read('background.js'), s=read('sidebar.js'), h=read('sidebar.html'), importer=read('project-import.js');
  assert.ok(c.includes('getPseudoElementDetails(element)')); assert.ok(c.includes('getSemanticDetails(element)')); assert.ok(c.includes('getFrameworkSignals(element)')); assert.ok(c.includes('getComputedStyle(element, pseudo)'));
  assert.ok(b.includes('capture.frameworkSignals')); assert.ok(b.includes('node.pseudoElements')); assert.ok(s.includes('renderComponentIntelligence')); assert.ok(h.includes('id="componentIntelligence"')); assert.ok(importer.includes('frameworkSignals: Array.isArray(c.frameworkSignals)'));
});

test('design-flow brief and semantic labels are bounded, escaped and exported', () => {
  const s=read('sidebar.js'), importer=read('project-import.js'), css=read('sidebar.css');
  assert.match(s,/data-flow-brief[^>]*maxlength="3000"/);
  assert.match(s,/data-flow-labels[^>]*maxlength="400"/);
  assert.ok(s.includes("escapeHtml(c.brief||'')"));
  assert.ok(s.includes('flow.brief'));
  assert.ok(s.includes('flow.labels'));
  assert.ok(importer.includes('normaliseImportedCollection'));
  assert.ok(css.includes('.flow-metadata'));
});
