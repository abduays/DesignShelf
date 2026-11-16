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
  await api.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
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
  const limits = { tag:32, name:120, selector:2000, text:180, display:40, css:20000, html:100000 };
  if (!Object.entries(limits).every(([key,max]) => boundedString(node[key] ?? '', max))) return false;
  if (!Number.isFinite(node.width) || node.width < 0 || node.width > 100000 || !Number.isFinite(node.height) || node.height < 0 || node.height > 100000 || typeof node.visible !== 'boolean') return false;
  return validTokens(node.tokens) && validAnimation(node.animation);
}
function validCapture(capture, sender) {
  if (!capture || typeof capture !== 'object' || Array.isArray(capture)) return false;
  const required = ['id','name','tag','selector','url','pageTitle','capturedAt','text','html','css'];
  if (!required.every(key => typeof capture[key] === 'string')) return false;
  const limits = { id:100, name:180, tag:32, selector:2000, pageTitle:300, text:500, html:750000, css:50000 };
  if (!Object.entries(limits).every(([key,max]) => capture[key].length <= max)) return false;
  if (!Number.isFinite(capture.width) || capture.width < 0 || capture.width > 100000 || !Number.isFinite(capture.height) || capture.height < 0 || capture.height > 100000) return false;
  if (capture.note != null && !boundedString(capture.note, 2000)) return false;
  if (capture.viewport != null && (typeof capture.viewport !== 'object' || Array.isArray(capture.viewport) || !Number.isFinite(capture.viewport.width) || capture.viewport.width < 1 || capture.viewport.width > 100000 || !Number.isFinite(capture.viewport.height) || capture.viewport.height < 1 || capture.viewport.height > 100000 || !Number.isFinite(capture.viewport.devicePixelRatio) || capture.viewport.devicePixelRatio < 0.25 || capture.viewport.devicePixelRatio > 10)) return false;
  try {
    const page = new URL(capture.url);
    const source = new URL(sender.url);
    if (!['http:','https:'].includes(page.protocol) || page.origin !== source.origin || page.search || page.hash) return false;
  } catch { return false; }
  if (!Number.isFinite(Date.parse(capture.capturedAt))) return false;
  if (!Array.isArray(capture.structure) || capture.structure.length > 24 || !capture.structure.every(validStructureNode)) return false;
  if (!validTokens(capture.tokens) || !validAnimation(capture.animation)) return false;
  try { if (JSON.stringify(capture).length * 2 > 1500000) return false; } catch { return false; }
  return true;
}
function validInteraction(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const allowedEvents = new Set(['click','mouseover','focusin','change','keydown','submit']);
  if (!allowedEvents.has(item.event)) return false;
  if (!boundedString(item.tag, 32) || !boundedString(item.label, 120) || !boundedString(item.selector, 2000) || !boundedString(item.time, 40) || !boundedString(item.url, 2048)) return false;
  if (!Number.isFinite(Date.parse(item.time))) return false;
  try { const u = new URL(item.url); if (!['http:','https:'].includes(u.protocol) || u.search || u.hash) return false; } catch { return false; }
  const validDimensions = (value, keys) => value == null || (typeof value === 'object' && !Array.isArray(value) && keys.every(key => Number.isFinite(value[key]) && Math.abs(value[key]) <= 100000));
  if (!validDimensions(item.viewport, ['width','height']) || !validDimensions(item.bounds, ['x','y','width','height'])) return false;
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
        error: 'This browser cannot inspect this page. Open a normal http:// or https:// website; browser-internal pages, extension pages and some protected pages cannot be inspected.'
      };
    }
  }

  if (message.type === 'DESIGNSHELF_GET_PAGE_INSIGHTS') {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) return { ok: false, error: 'No active tab was found.' };
    try { await ensureContentScript(tab.id); return await api.tabs.sendMessage(tab.id, { type: message.type }); }
    catch (error) { return { ok: false, error: 'This page cannot be inspected. Open a normal HTTP or HTTPS website; browser-internal and protected pages are unavailable.' }; }
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
    } catch (error) { return { ok:false, error:'This page cannot be recorded. Open a normal HTTP or HTTPS website; browser-internal and protected pages are unavailable.' }; }
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
      return { ok: false, error: 'This page cannot be scanned. Open a normal HTTP or HTTPS website; browser-internal and protected pages are unavailable.' };
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
    if (response !== undefined) sendResponse(response);
  }).catch(error => {
    console.error('DesignShelf background message failed:', error);
    sendResponse({ ok:false, error:'An unexpected background error occurred.' });
  });
  // Callback-based async replies work in Chrome versions before native Promise
  // listener support and remain compatible with Firefox WebExtensions.
  return true;
});
