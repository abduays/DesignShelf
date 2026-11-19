/* Safe project-import normalisers. Imported files are untrusted input. */
(function(root) {
function boundedText(value, max) {
  return typeof value === 'string' && value.length <= max ? value : null;
}
function normaliseImportedTokens(tokens) {
  if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens)) return {};
  const out = {};
  for (const key of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','borderRadius','boxShadow','backgroundImage']) {
    const value = boundedText(tokens[key], 300);
    if (value !== null) out[key] = value;
  }
  out.colors = Array.isArray(tokens.colors) ? tokens.colors.filter(v => typeof v === 'string' && v.length <= 80 && globalThis.DesignShelfTokenExport.parseTokenColor(v) !== null).slice(0, 12) : [];
  return out;
}
function normaliseImportedCapture(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const required = ['id','name','html','css','url','capturedAt'];
  if (!required.every(k => typeof c[k] === 'string')) return null;
  if (!c.id.trim() || !c.name.trim() || c.id.length > 100 || c.name.length > 180 || c.html.length > 750000 || c.css.length > 50000 || c.url.length > 2048 || c.pageTitle?.length > 300 || c.text?.length > 500) return null;
  let parsedUrl;
  try { parsedUrl = new URL(c.url); } catch { return null; }
  if (!['http:','https:'].includes(parsedUrl.protocol) || !Number.isFinite(Date.parse(c.capturedAt))) return null;
  if (c.structure != null && (!Array.isArray(c.structure) || c.structure.length > 24)) return null;
  const structure = (c.structure || []).map((n,index) => {
    if (!n || typeof n !== 'object' || Array.isArray(n)) return null;
    const node = {
      id: index,
      parentId: Number.isInteger(n.parentId) && n.parentId >= 0 && n.parentId < index ? n.parentId : null,
      depth: Number.isFinite(n.depth) ? Math.max(0, Math.min(6, n.depth)) : 0,
      tag: boundedText(n.tag, 32) || 'div',
      name: boundedText(n.name, 120) || 'Element',
      selector: boundedText(n.selector, 2000) || '',
      text: boundedText(n.text, 180) || '',
      width: Number.isFinite(n.width) ? Math.max(0, Math.min(100000, n.width)) : 0,
      height: Number.isFinite(n.height) ? Math.max(0, Math.min(100000, n.height)) : 0,
      display: boundedText(n.display, 40) || '',
      visible: !!n.visible,
      css: boundedText(n.css, 20000) || '',
      html: boundedText(n.html, 100000) || '',
      tokens: normaliseImportedTokens(n.tokens),
      semantics: n.semantics && typeof n.semantics === 'object' && !Array.isArray(n.semantics) ? Object.fromEntries(Object.entries(n.semantics).filter(([k,v]) => ['role','roleSource','nameCandidate','nameSource','labelledBy','ariaLabel'].includes(k) && typeof v === 'string' && v.length <= 160)) : {},
      pseudoElements: n.pseudoElements && typeof n.pseudoElements === 'object' && !Array.isArray(n.pseudoElements) ? Object.fromEntries(['before','after'].filter(k => n.pseudoElements[k] && typeof n.pseudoElements[k] === 'object' && !Array.isArray(n.pseudoElements[k])).map(k => [k,Object.fromEntries(Object.entries(n.pseudoElements[k]).filter(([key,v]) => ['content','display','position','color','backgroundColor','fontFamily','fontSize','fontWeight','width','height','margin','padding','border','borderRadius','transform'].includes(key) && typeof v === 'string' && v.length <= 300))])) : {}
    };
    if (n.animation && typeof n.animation === 'object') node.animation = Object.fromEntries(Object.entries(n.animation).filter(([k,v]) => ['name','duration','timingFunction','delay','iterationCount','direction','fillMode','playState','transition','transform'].includes(k) && typeof v === 'string' && v.length <= 200));
    return node;
  }).filter(Boolean);
  return {
    id: c.id, name: c.name, note:boundedText(c.note,2000)||'', tag: boundedText(c.tag, 32) || 'div',
    selector: boundedText(c.selector, 2000) || '', url: parsedUrl.origin + parsedUrl.pathname,
    pageTitle: boundedText(c.pageTitle, 300) || '', capturedAt: c.capturedAt,
    text: boundedText(c.text, 500) || '', width: Number.isFinite(c.width) ? Math.max(0, Math.min(100000, c.width)) : 0,
    height: Number.isFinite(c.height) ? Math.max(0, Math.min(100000, c.height)) : 0,
    viewport: c.viewport && typeof c.viewport === 'object' && !Array.isArray(c.viewport) && Number.isFinite(c.viewport.width) && Number.isFinite(c.viewport.height) ? {width:Math.max(1,Math.min(100000,c.viewport.width)),height:Math.max(1,Math.min(100000,c.viewport.height)),devicePixelRatio:Number.isFinite(c.viewport.devicePixelRatio)?Math.max(.25,Math.min(10,c.viewport.devicePixelRatio)):1} : null,
    html: c.html, css: c.css, pinned: c.pinned === true,
    semantics: c.semantics && typeof c.semantics === 'object' && !Array.isArray(c.semantics) ? Object.fromEntries(Object.entries(c.semantics).filter(([k,v]) => ['role','roleSource','nameCandidate','nameSource','labelledBy','ariaLabel'].includes(k) && typeof v === 'string' && v.length <= 160)) : {},
    pseudoElements: c.pseudoElements && typeof c.pseudoElements === 'object' && !Array.isArray(c.pseudoElements) ? Object.fromEntries(['before','after'].filter(k => c.pseudoElements[k] && typeof c.pseudoElements[k] === 'object' && !Array.isArray(c.pseudoElements[k])).map(k => [k,Object.fromEntries(Object.entries(c.pseudoElements[k]).filter(([key,v]) => ['content','display','position','color','backgroundColor','fontFamily','fontSize','fontWeight','width','height','margin','padding','border','borderRadius','transform'].includes(key) && typeof v === 'string' && v.length <= 300))])) : {},
    frameworkSignals: Array.isArray(c.frameworkSignals) ? c.frameworkSignals.filter(x => x && ['React','Vue','Angular','Svelte','Tailwind CSS'].includes(x.name) && typeof x.kind === 'string' && ['observed','heuristic'].includes(x.confidence)).slice(0,8).map(x => ({name:x.name,kind:x.kind,confidence:x.confidence})) : [],
    screenshot: c.screenshot && typeof c.screenshot === 'object' && !Array.isArray(c.screenshot) && c.screenshot.mode === 'element-crop' && typeof c.screenshot.dataUrl === 'string' && c.screenshot.dataUrl.length <= 700000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(c.screenshot.dataUrl) && Number.isInteger(c.screenshot.width) && Number.isInteger(c.screenshot.height) && c.screenshot.width > 0 && c.screenshot.height > 0 && c.screenshot.width <= 1200 && c.screenshot.height <= 1200 ? {dataUrl:c.screenshot.dataUrl,mode:'element-crop',width:c.screenshot.width,height:c.screenshot.height,mimeType:'image/jpeg'} : null,
    screenshotStatus: c.screenshot?.dataUrl ? 'captured' : 'unavailable', tokens: normaliseImportedTokens(c.tokens), structure,
    animation: c.animation && typeof c.animation === 'object' ? Object.fromEntries(Object.entries(c.animation).filter(([k,v]) => ['name','duration','timingFunction','delay','iterationCount','direction','fillMode','playState','transition','transform'].includes(k) && typeof v === 'string' && v.length <= 200)) : {}
  };
}
function normaliseImportedEvent(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  const event = boundedText(e.event, 24), tag = boundedText(e.tag, 32), label = boundedText(e.label, 120), selector = boundedText(e.selector, 2000), time = boundedText(e.time, 40), url = boundedText(e.url, 2048);
  if (![event,tag,label,selector,time,url].every(v => v !== null) || !['click','mouseover','focusin','change','keydown','submit'].includes(event) || !Number.isFinite(Date.parse(time))) return null;
  let u; try { u = new URL(url); } catch { return null; }
  if (!['http:','https:'].includes(u.protocol)) return null;
  const dimensions = (value, keys) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const out = {};
    keys.forEach(key => { if (Number.isFinite(value[key])) out[key] = Math.max(-100000, Math.min(100000, value[key])); });
    return Object.keys(out).length === keys.length ? out : null;
  };
  const viewport = dimensions(e.viewport, ['width','height']);
  const bounds = dimensions(e.bounds, ['x','y','width','height']);
  const state = {};
  if (e.state && typeof e.state === 'object' && !Array.isArray(e.state)) {
    for (const key of ['expanded','selected','pressed','controls']) { const value = boundedText(e.state[key], 200); if (value !== null) state[key] = value; }
    for (const key of ['checked','activeElement']) if (typeof e.state[key] === 'boolean') state[key] = e.state[key];
    if (e.state.computed && typeof e.state.computed === 'object' && !Array.isArray(e.state.computed)) {
      state.computed = {};
      for (const key of ['color','backgroundColor','fontFamily','fontSize','fontWeight','borderRadius','transition','animationName','animationDuration']) { const value = boundedText(e.state.computed[key], 200); if (value !== null) state.computed[key] = value; }
    }
    if (e.state.controlledElement && typeof e.state.controlledElement === 'object' && !Array.isArray(e.state.controlledElement)) {
      const c = e.state.controlledElement;
      state.controlledElement = {tag:boundedText(c.tag,32)||'',hidden:!!c.hidden,display:boundedText(c.display,40)||'',visibility:boundedText(c.visibility,40)||''};
    }
  }
  return { event, tag, role:boundedText(e.role,40)||'', label, selector, time, url:u.origin+u.pathname, ...(viewport?{viewport}:{}), ...(bounds?{bounds}:{}), ...(Object.keys(state).length?{state}:{}) };
}
function normaliseImportedCollection(c, validCaptureIds = null) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  if (typeof c.id !== 'string' || !c.id.trim() || c.id.length > 100 || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 80) return null;
  const createdAt = boundedText(c.createdAt,40);
  const safeCreatedAt = createdAt && Number.isFinite(Date.parse(createdAt)) ? createdAt : new Date().toISOString();
  const ids = Array.isArray(c.captureIds) ? c.captureIds.filter(id => typeof id === 'string' && (!validCaptureIds || validCaptureIds.has(id))).slice(0,5000) : [];
  const brief = boundedText(c.brief,3000) || '';
  const rawLabels = Array.isArray(c.labels) ? c.labels : [];
  const labels = [];
  const seen = new Set();
  for (const raw of rawLabels) {
    if (typeof raw !== 'string') continue;
    const label = raw.trim().slice(0,32), key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key); labels.push(label);
    if (labels.length >= 12) break;
  }
  return {id:c.id,name:c.name.trim(),createdAt:safeCreatedAt,captureIds:ids,brief,labels};
}
function normaliseImportedTokenLabels(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const groups = ['colors','fonts','fontSizes','fontWeights','lineHeights','letterSpacing','radii'];
  const out = {};
  for (const group of groups) {
    if (!value[group] || typeof value[group] !== 'object' || Array.isArray(value[group])) continue;
    out[group] = {};
    for (const [raw,label] of Object.entries(value[group]).slice(0,100)) {
      if (typeof raw !== 'string' || raw.length > 300 || typeof label !== 'string' || label.length > 64) continue;
      const clean = label.trim();
      if (clean) out[group][raw] = clean;
    }
    if (!Object.keys(out[group]).length) delete out[group];
  }
  return out;
}
function normaliseImportedAudit(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report) || !report.page || !report.metrics) return null;
  const host = boundedText(report.page.host, 253);
  if (!host) return null;
  const metricKeys = ['resourceCount','approximateTransferBytes','domElements','imageCount','scriptCount','stylesheetCount','loadEventMs'];
  const metrics = {};
  metricKeys.forEach(key => { const value = report.metrics[key]; if (Number.isFinite(value) && value >= 0) metrics[key] = Math.min(value, 1e12); });
  if (!Object.keys(metrics).length) return null;
  let safeUrl = '';
  const rawUrl = boundedText(report.page.url,2048);
  if (rawUrl) { try { const parsed = new URL(rawUrl); if (['http:','https:'].includes(parsed.protocol)) safeUrl = parsed.origin + parsed.pathname; } catch {} }
  return {page:{host,title:boundedText(report.page.title,300)||'',url:safeUrl},metrics};
}

  const api = {
    boundedText,
    normaliseTokens:normaliseImportedTokens,
    normaliseCapture:normaliseImportedCapture,
    normaliseEvent:normaliseImportedEvent,
    normaliseCollection:normaliseImportedCollection,
    normaliseTokenLabels:normaliseImportedTokenLabels,
    normaliseAudit:normaliseImportedAudit
  };
  root.DesignShelfProjectImport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
