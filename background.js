const api = globalThis.browser ?? globalThis.chrome;
const STORAGE_KEY = 'designshelfCaptures';
const RETENTION_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;
const INTERACTION_KEY = 'designshelfInteractionEvents';
const MAX_ESTIMATED_STORAGE_BYTES = 7.5 * 1024 * 1024;

function isFreshCapture(item, cutoff) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const stamp = typeof item.capturedAt === 'string' ? item.capturedAt : (typeof item.createdAt === 'string' ? item.createdAt : '');
  const time = Date.parse(stamp);
  return item.pinned === true || (Number.isFinite(time) && time >= cutoff);
}
async function pruneExpiredCaptures() {
  try {
    const stored = await api.storage.local.get(STORAGE_KEY);
    const captures = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
    const cutoff = Date.now() - RETENTION_DAYS * DAY_MS;
    const fresh = captures.filter(item => isFreshCapture(item, cutoff));
    if (fresh.length !== captures.length) {
      await api.storage.local.set({ [STORAGE_KEY]: fresh });
    }
  } catch (error) {
    console.error('DesignShelf could not prune expired history:', error);
  }
}

api.runtime.onInstalled.addListener(() => {
  api.alarms.create('designshelf-prune-history', { periodInMinutes: 24 * 60 });
  pruneExpiredCaptures();
});
api.runtime.onStartup.addListener(() => {
  api.alarms.create('designshelf-prune-history', { periodInMinutes: 24 * 60 });
  pruneExpiredCaptures();
});
api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'designshelf-prune-history') pruneExpiredCaptures();
});

if (api.sidePanel?.setPanelBehavior) {
  api.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
} else if (api.sidebarAction?.open) {
  api.action.onClicked.addListener(async () => {
    try { await api.sidebarAction.open(); }
    catch (error) { console.error('DesignShelf could not open the sidebar:', error); }
  });
}

async function ensureContentScript(tabId) {
  try { await api.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); }
  catch (error) { const detail=String(error?.message||error||''); if(/cannot access|permission|host permission|missing host permission|not allowed/i.test(detail)) throw new Error('WEBSITE_ACCESS_REQUIRED'); throw error; }
}
function pageAccessError(tab) {
  const url=typeof tab?.url==='string'?tab.url:'';
  if(url&&!/^https?:\/\//i.test(url)) return 'This page is protected by the browser and cannot be inspected. Open a normal HTTP or HTTPS website.';
  return 'DesignShelf does not have permission to inspect this tab. Select “Enable website access” in the extension, approve the optional website permission, then retry.';
}

function isExtensionPageSender(sender) {
  return sender?.id === api.runtime.id && typeof sender.url === 'string' && sender.url.startsWith(api.runtime.getURL(''));
}
function isWebContentSender(sender) {
  if (sender?.id !== api.runtime.id || !Number.isInteger(sender.tab?.id) || typeof sender.url !== 'string') return false;
  try { const u = new URL(sender.url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}
function boundedString(value, max) {
  return typeof value === 'string' && value.length <= max;
}
function validTokens(tokens) {
  if (tokens == null) return true;
  if (typeof tokens !== 'object' || Array.isArray(tokens)) return false;
  const fields = ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','borderRadius','boxShadow','backgroundImage'];
  if (!fields.every(key => tokens[key] == null || boundedString(tokens[key], 300))) return false;
  return tokens.colors == null || (Array.isArray(tokens.colors) && tokens.colors.length <= 12 && tokens.colors.every(value => boundedString(value, 80)));
}
function validAnimation(animation) {
  if (animation == null) return true;
  if (typeof animation !== 'object' || Array.isArray(animation)) return false;
  const fields = ['name','duration','timingFunction','delay','iterationCount','direction','fillMode','playState','transition','transform'];
  return fields.every(key => animation[key] == null || boundedString(animation[key], 200));
}
function validStructureNode(node, index) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  if (!Number.isInteger(node.id) || node.id !== index) return false;
  if (node.parentId != null && (!Number.isInteger(node.parentId) || node.parentId < 0 || node.parentId >= index)) return false;
  if (!Number.isFinite(node.depth) || node.depth < 0 || node.depth > 6) return false;
  const limits = { tag:32, name:120, selector:2000, text:180, display:40, css:20000, html:12000 };
  if (!Object.entries(limits).every(([key,max]) => boundedString(node[key] ?? '', max))) return false;
  if (!Number.isFinite(node.width) || node.width < 0 || node.width > 100000 || !Number.isFinite(node.height) || node.height < 0 || node.height > 100000 || typeof node.visible !== 'boolean') return false;
  if (node.semantics != null && (typeof node.semantics !== 'object' || Array.isArray(node.semantics) || !['role','roleSource','nameCandidate','nameSource','labelledBy','ariaLabel'].every(k => node.semantics[k] == null || boundedString(node.semantics[k],160)) || !['hidden','ariaHidden','required','disabled'].every(k => node.semantics[k] == null || typeof node.semantics[k] === 'boolean') || (node.semantics.tabIndex != null && (!Number.isInteger(node.semantics.tabIndex) || Math.abs(node.semantics.tabIndex)>1000)))) return false;
  if (node.pseudoElements != null && (typeof node.pseudoElements !== 'object' || Array.isArray(node.pseudoElements) || !['before','after'].every(k => node.pseudoElements[k] == null || (typeof node.pseudoElements[k] === 'object' && !Array.isArray(node.pseudoElements[k]) && Object.entries(node.pseudoElements[k]).every(([key,value]) => ['content','display','position','color','backgroundColor','fontFamily','fontSize','fontWeight','width','height','margin','padding','border','borderRadius','transform'].includes(key) && boundedString(value,300)))))) return false;
  return validTokens(node.tokens) && validAnimation(node.animation);
}
async function captureElementScreenshot(tab, capture) {
  try {
    if (!Number.isInteger(tab?.windowId) || !capture?.rect || !capture?.viewport) return null;
    const dataUrl = await api.tabs.captureVisibleTab(tab.windowId, { format:'jpeg', quality:82 });
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null;
    const response = await fetch(dataUrl);
    const bitmap = await createImageBitmap(await response.blob());
    const sx = bitmap.width / capture.viewport.width, sy = bitmap.height / capture.viewport.height;
    const r = capture.rect;
    const left = Math.max(0, Math.floor(r.x * sx)), top = Math.max(0, Math.floor(r.y * sy));
    const right = Math.min(bitmap.width, Math.ceil((r.x + r.width) * sx));
    const bottom = Math.min(bitmap.height, Math.ceil((r.y + r.height) * sy));
    if (right <= left || bottom <= top) { bitmap.close?.(); return null; }
    const sw = right-left, sh = bottom-top, scale = Math.min(1,1200/Math.max(sw,sh));
    const width = Math.max(1,Math.round(sw*scale)), height = Math.max(1,Math.round(sh*scale));
    const canvas = new OffscreenCanvas(width,height), ctx = canvas.getContext('2d',{alpha:false});
    if (!ctx) { bitmap.close?.(); return null; }
    ctx.drawImage(bitmap,left,top,sw,sh,0,0,width,height); bitmap.close?.();
    let blob = await canvas.convertToBlob({type:'image/jpeg',quality:.76});
    if (blob.size > 480000) blob = await canvas.convertToBlob({type:'image/jpeg',quality:.58});
    if (blob.size > 520000) return null;
    const bytes = new Uint8Array(await blob.arrayBuffer()); let binary='';
    for(let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return {dataUrl:'data:image/jpeg;base64,'+btoa(binary),mode:'element-crop',width,height,mimeType:'image/jpeg'};
  } catch (error) { console.warn('DesignShelf screenshot capture unavailable:',error); return null; }
}

function validCapture(capture, sender) {
  if (!capture || typeof capture !== 'object' || Array.isArray(capture)) return false;
  const required = ['id','name','tag','selector','url','pageTitle','capturedAt','text','html','css'];
  if (!required.every(key => typeof capture[key] === 'string')) return false;
  const limits = { id:100, name:180, tag:32, selector:2000, pageTitle:300, text:500, html:600000, css:50000 };
  if (!Object.entries(limits).every(([key,max]) => capture[key].length <= max)) return false;
  if (!Number.isFinite(capture.width) || capture.width < 0 || capture.width > 100000 || !Number.isFinite(capture.height) || capture.height < 0 || capture.height > 100000) return false;
  if (capture.note != null && !boundedString(capture.note, 2000)) return false;
  if (capture.semantics != null && (typeof capture.semantics !== 'object' || Array.isArray(capture.semantics) || Object.entries(capture.semantics).some(([k,v]) => !['role','roleSource','nameCandidate','nameSource','labelledBy','ariaLabel','ariaHidden','hidden','tabIndex','required','disabled'].includes(k) || (typeof v === 'string' && v.length > 160) || (typeof v === 'number' && (!Number.isInteger(v) || Math.abs(v)>1000)) || !['string','number','boolean'].includes(typeof v)))) return false;
  if (capture.pseudoElements != null && (typeof capture.pseudoElements !== 'object' || Array.isArray(capture.pseudoElements) || !['before','after'].every(k => capture.pseudoElements[k] == null || (typeof capture.pseudoElements[k] === 'object' && !Array.isArray(capture.pseudoElements[k]) && Object.entries(capture.pseudoElements[k]).every(([key,value]) => ['content','display','position','color','backgroundColor','fontFamily','fontSize','fontWeight','width','height','margin','padding','border','borderRadius','transform'].includes(key) && boundedString(value,300)))))) return false;
  if (capture.frameworkSignals != null && (!Array.isArray(capture.frameworkSignals) || capture.frameworkSignals.length > 8 || !capture.frameworkSignals.every(x => x && typeof x === 'object' && ['React','Vue','Angular','Svelte','Tailwind CSS'].includes(x.name) && boundedString(x.kind,60) && ['observed','heuristic'].includes(x.confidence)))) return false;
  if (capture.rect != null && (typeof capture.rect !== 'object' || Array.isArray(capture.rect) || !['x','y','width','height'].every(k => Number.isFinite(capture.rect[k]) && Math.abs(capture.rect[k]) <= 100000))) return false;
  if (capture.screenshot != null && (typeof capture.screenshot !== 'object' || Array.isArray(capture.screenshot) || capture.screenshot.mode !== 'element-crop' || !boundedString(capture.screenshot.dataUrl,700000) || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(capture.screenshot.dataUrl) || !Number.isInteger(capture.screenshot.width) || !Number.isInteger(capture.screenshot.height) || capture.screenshot.width < 1 || capture.screenshot.height < 1 || capture.screenshot.width > 1200 || capture.screenshot.height > 1200)) return false;
  if (capture.viewport != null && (typeof capture.viewport !== 'object' || Array.isArray(capture.viewport) || !Number.isFinite(capture.viewport.width) || capture.viewport.width < 1 || capture.viewport.width > 100000 || !Number.isFinite(capture.viewport.height) || capture.viewport.height < 1 || capture.viewport.height > 100000 || !Number.isFinite(capture.viewport.devicePixelRatio) || capture.viewport.devicePixelRatio < 0.25 || capture.viewport.devicePixelRatio > 10)) return false;
  try {
    const page = new URL(capture.url);
    const source = new URL(sender.url);
    if (!['http:','https:'].includes(page.protocol) || page.origin !== source.origin || page.search || page.hash) return false;
  } catch { return false; }
  if (!Number.isFinite(Date.parse(capture.capturedAt))) return false;
  if (!Array.isArray(capture.structure) || capture.structure.length > 24 || !capture.structure.every(validStructureNode)) return false;
  if (!validTokens(capture.tokens) || !validAnimation(capture.animation)) return false;
  try { if (JSON.stringify(capture).length * 2 > 1800000) return false; } catch { return false; }
  return true;
}
function validInteraction(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const allowedEvents = new Set(['click','mouseover','focusin','change','keydown','submit']);
  if (!allowedEvents.has(item.event)) return false;
  if (!boundedString(item.tag, 32) || !boundedString(item.label, 120) || !boundedString(item.selector, 2000) || !boundedString(item.time, 40) || !boundedString(item.url, 2048)) return false;
  if (!Number.isFinite(Date.parse(item.time))) return false;
  try { const u = new URL(item.url); if (!['http:','https:'].includes(u.protocol) || u.search || u.hash) return false; } catch { return false; }
  const validDimensions = (value, keys, positive = false) => {
    if (value == null) return true;
    if (typeof value !== 'object' || Array.isArray(value)) return false;
    return keys.every(key => {
      if (!Number.isFinite(value[key]) || Math.abs(value[key]) > 100000) return false;
      if (key === 'width' || key === 'height') return positive ? value[key] > 0 : value[key] >= 0;
      return true;
    });
  };
  if (!validDimensions(item.viewport, ['width','height'], true) || !validDimensions(item.bounds, ['x','y','width','height'])) return false;
  if (item.state != null) {
    const state = item.state;
    if (typeof state !== 'object' || Array.isArray(state)) return false;
    for (const key of ['expanded','selected','pressed','controls']) if (state[key] != null && !boundedString(state[key], 200)) return false;
    for (const key of ['checked','activeElement']) if (state[key] != null && typeof state[key] !== 'boolean') return false;
    if (state.controlledElement != null) {
      const c = state.controlledElement;
      if (typeof c !== 'object' || Array.isArray(c) || !boundedString(c.tag || '', 32) || typeof c.hidden !== 'boolean' || !boundedString(c.display || '', 40) || !boundedString(c.visibility || '', 40)) return false;
    }
    if (state.computed != null) {
      const computed = state.computed;
      const keys = ['color','backgroundColor','fontFamily','fontSize','fontWeight','borderRadius','transition','animationName','animationDuration'];
      if (typeof computed !== 'object' || Array.isArray(computed) || !keys.every(key => computed[key] == null || boundedString(computed[key], 200))) return false;
    }
  }
  try { if (JSON.stringify(item).length * 2 > 6000) return false; } catch { return false; }
  return true;
}

async function handleRuntimeMessage(message, sender) {
  if (!message || typeof message.type !== 'string') return undefined;
  const contentMessageTypes = ['DESIGNSHELF_INTERACTION_EVENT','DESIGNSHELF_CAPTURE'];
  if (contentMessageTypes.includes(message.type) && !isWebContentSender(sender)) return { ok:false, error:'Untrusted message sender.' };
  if (!contentMessageTypes.includes(message.type) && !isExtensionPageSender(sender)) return { ok:false, error:'Untrusted message sender.' };

  if (message.type === 'DESIGNSHELF_START_PICK') {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || !tab.id) return { ok: false, error: 'No active tab was found.' };
    try {
      await ensureContentScript(tab.id);
      await api.tabs.sendMessage(tab.id, { type: 'DESIGNSHELF_ENABLE_PICK' });
      await api.storage.local.set({ designshelfLastTabId: tab.id });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: pageAccessError(tab)
      };
    }
  }

  if (message.type === 'DESIGNSHELF_GET_PAGE_INSIGHTS') {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) return { ok: false, error: 'No active tab was found.' };
    try { await ensureContentScript(tab.id); return await api.tabs.sendMessage(tab.id, { type: message.type }); }
    catch (error) { return { ok: false, error: pageAccessError(tab) }; }
  }

  if (message.type === 'DESIGNSHELF_START_RECORDING') {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) return { ok:false, error:'No active tab was found.' };
    try {
      const previous = await api.storage.local.get('designshelfRecordingTabId');
      const previousTabId = previous.designshelfRecordingTabId;
      if (Number.isInteger(previousTabId) && previousTabId !== tab.id) {
        try { await api.tabs.sendMessage(previousTabId, { type:'DESIGNSHELF_STOP_RECORDING' }); } catch {}
        await api.storage.local.remove('designshelfRecordingTabId');
      }
      await ensureContentScript(tab.id);
      const result = await api.tabs.sendMessage(tab.id, { type:message.type });
      if (result?.ok) await api.storage.local.set({ designshelfRecordingTabId:tab.id });
      return result || { ok:false, error:'The page did not confirm recording.' };
    } catch (error) { return { ok:false, error:pageAccessError(tab) }; }
  }

  if (message.type === 'DESIGNSHELF_STOP_RECORDING' || message.type === 'DESIGNSHELF_GET_RECORDING') {
    const stored = await api.storage.local.get('designshelfRecordingTabId');
    const tabId = stored.designshelfRecordingTabId;
    if (!Number.isInteger(tabId)) return { ok:false, error:'There is no active recording session.' };
    try {
      const result = await api.tabs.sendMessage(tabId, { type:message.type });
      if (message.type === 'DESIGNSHELF_STOP_RECORDING') await api.storage.local.remove('designshelfRecordingTabId');
      return result || { ok:false, error:'The recording tab did not respond.' };
    } catch (error) {
      await api.storage.local.remove('designshelfRecordingTabId');
      return { ok:false, error:'The recording tab is no longer available. Recording has stopped.' };
    }
  }

  if (message.type === 'DESIGNSHELF_INTERACTION_EVENT') {
    if (!validInteraction(message.event)) return { ok:false, error:'Invalid interaction event.' };
    try {
      const session = await api.storage.local.get('designshelfRecordingTabId');
      if (!Number.isInteger(session.designshelfRecordingTabId) || sender.tab.id !== session.designshelfRecordingTabId) return { ok:false, error:'No active recording session for this tab.' };
      const stored = await api.storage.local.get(null);
      const events = Array.isArray(stored[INTERACTION_KEY]) ? stored[INTERACTION_KEY] : [];
      events.push(message.event);
      const nextState = {...stored,[INTERACTION_KEY]:events.slice(-300)};
      if (JSON.stringify(nextState).length * 2 > MAX_ESTIMATED_STORAGE_BYTES) {
        await api.storage.local.remove('designshelfRecordingTabId');
        return { ok:false, code:'STORAGE_LIMIT', error:'DesignShelf storage is nearly full. Recording has stopped; export a backup or delete unused captures.' };
      }
      await api.storage.local.set({ [INTERACTION_KEY]: events.slice(-300) });
      return { ok: true };
    } catch (error) {
      try { await api.storage.local.remove('designshelfRecordingTabId'); } catch {}
      return { ok:false, code:'STORAGE_LIMIT', error:'DesignShelf could not save the interaction event. Recording has stopped; check available local storage.' };
    }
  }

  if (message.type === 'DESIGNSHELF_RUN_AUDIT') {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) return { ok: false, error: 'No active tab was found.' };
    try {
      await ensureContentScript(tab.id);
      const result = await api.tabs.sendMessage(tab.id, { type: 'DESIGNSHELF_RUN_AUDIT' });
      if (!result?.ok || !result.report) return { ok: false, error: result?.error || 'The page did not return an audit report.' };
      return { ok: true, report: result.report };
    } catch (error) {
      return { ok: false, error: pageAccessError(tab) };
    }
  }

  if (message.type === 'DESIGNSHELF_CAPTURE') {
    try {
      const stored = await api.storage.local.get(null);
      const captures = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
      const cutoff = Date.now() - RETENTION_DAYS * DAY_MS;
      const fresh = captures.filter(item => isFreshCapture(item, cutoff));
      const capture = message.capture;
      if (!validCapture(capture, sender)) return { ok:false, error:'Invalid or oversized capture data.' };
      capture.screenshot = await captureElementScreenshot(sender.tab, capture);
      capture.screenshotStatus = capture.screenshot ? 'captured' : 'unavailable';
      delete capture.rect;
      if (!fresh.some((item) => item.id === capture.id)) fresh.unshift(capture);
      const nextState = {...stored,[STORAGE_KEY]:fresh,designshelfLastCapture:capture,designshelfLastCaptureAt:Date.now()};
      const estimatedBytes = JSON.stringify(nextState).length * 2;
      if (estimatedBytes > MAX_ESTIMATED_STORAGE_BYTES) return { ok:false, error:'DesignShelf storage is nearly full. Export a project backup, delete unused captures or unpin old items before capturing more.' };
      await api.storage.local.set({
        [STORAGE_KEY]: fresh,
        designshelfLastCapture: capture,
        designshelfLastCaptureAt: Date.now()
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }
  return undefined;
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleRuntimeMessage(message, sender).then(response => {
    sendResponse(response === undefined ? null : response);
  }).catch(error => {
    console.error('DesignShelf background message failed:', error);
    sendResponse({ ok:false, error:'An unexpected background error occurred.' });
  });
  // Callback-based async replies work in Chrome versions before native Promise
  // listener support and remain compatible with Firefox WebExtensions.
  return true;
});
