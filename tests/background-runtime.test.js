const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createHarness(initial = {}, options = {}) {
  let messageListener;
  const state = structuredClone(initial);
  const storage = {
    async get(keys) {
      if (keys == null) return structuredClone(state);
      if (typeof keys === 'string') return { [keys]: structuredClone(state[keys]) };
      if (Array.isArray(keys)) return Object.fromEntries(keys.map(key => [key, structuredClone(state[key]) ]));
      return {};
    },
    async set(values) { Object.assign(state, structuredClone(values)); },
    async remove(keys) { for (const key of (Array.isArray(keys) ? keys : [keys])) delete state[key]; }
  };
  const noopEvent = { addListener() {} };
  const sentMessages = [];
  const api = {
    runtime: {
      id: 'designshelf-test-id',
      getURL: path => `chrome-extension://designshelf-test-id/${path}`,
      onInstalled: noopEvent,
      onStartup: noopEvent,
      onMessage: { addListener(listener) { messageListener = listener; } }
    },
    alarms: { create() {}, onAlarm: noopEvent },
    storage: { local: storage },
    sidePanel: { setPanelBehavior: async () => {} },
    tabs: {
      async query() { return Number.isInteger(options.activeTabId) ? [{ id:options.activeTabId, ...(options.activeTabUrl?{url:options.activeTabUrl}:{}) }] : []; },
      async sendMessage(tabId, message) {
        sentMessages.push({ tabId, message });
        if (options.failTabId === tabId) throw new Error('Tab unavailable');
        return options.tabReply || { ok:true, count:0 };
      }
    },
    scripting: { async executeScript() { if(options.failInjection) throw new Error('Missing host permission for the tab'); } },
    action: { onClicked: noopEvent }
  };
  const context = { browser: api, chrome: api, URL, Date, JSON, Number, Array, Object, Set, Math, console, structuredClone };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8'), context);
  return { send: (message, sender) => new Promise(resolve => {
    const keepChannelOpen = messageListener(message, sender, resolve);
    if (keepChannelOpen !== true) resolve(keepChannelOpen);
  }), state, sentMessages };
}

function validCapture(overrides = {}) {
  return {
    id: 'capture-1', name: 'Hero section', tag: 'section', selector: 'main > section',
    url: 'https://example.com/page', pageTitle: 'Example', capturedAt: new Date().toISOString(),
    text: 'Welcome', html: '<section><h1>Welcome</h1></section>', css: 'display: block;', width: 800, height: 420, viewport:{width:1440,height:900,devicePixelRatio:1},
    tokens: { colors: ['rgb(1, 2, 3)'], fontFamily: 'Arial' }, animation: { name: 'none' },
    structure: [{ id: 0, parentId: null, depth: 0, tag: 'section', name: 'Hero', selector: 'main > section', text: 'Welcome', width: 800, height: 420, display: 'block', visible: true, css: 'display: block;', html: '<section></section>', tokens: { colors: [] }, animation: { name: 'none' } }],
    ...overrides
  };
}
const contentSender = { id: 'designshelf-test-id', tab: { id: 4 }, url: 'https://example.com/page' };
const extensionSender = { id: 'designshelf-test-id', url: 'chrome-extension://designshelf-test-id/sidebar.html' };

test('background rejects content messages from another extension or non-web sender', async () => {
  const h = createHarness();
  const result = await h.send({ type: 'DESIGNSHELF_CAPTURE', capture: validCapture() }, { id: 'attacker', tab: { id: 4 }, url: contentSender.url });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Untrusted message sender.');
});

test('background accepts a bounded capture from the matching page origin', async () => {
  const h = createHarness();
  const result = await h.send({ type: 'DESIGNSHELF_CAPTURE', capture: validCapture() }, contentSender);
  assert.equal(result.ok, true);
  assert.equal(h.state.designshelfCaptures.length, 1);
  assert.equal(h.state.designshelfLastCapture.id, 'capture-1');
});

test('background rejects cross-origin, malformed and oversized component trees', async () => {
  const h = createHarness();
  const crossOrigin = await h.send({ type: 'DESIGNSHELF_CAPTURE', capture: validCapture({ url: 'https://attacker.example/page' }) }, contentSender);
  assert.equal(crossOrigin.ok, false);
  const invalidTree = validCapture(); invalidTree.structure[0].id = 99;
  const malformed = await h.send({ type: 'DESIGNSHELF_CAPTURE', capture: invalidTree }, contentSender);
  assert.equal(malformed.ok, false);
  const tooLarge = await h.send({ type: 'DESIGNSHELF_CAPTURE', capture: validCapture({ html: 'x'.repeat(600001) }) }, contentSender);
  assert.equal(tooLarge.ok, false);
});

test('background refuses new captures when estimated storage budget is exceeded', async () => {
  const h = createHarness({ unrelatedStoredData: 'x'.repeat(4_000_000) });
  const result = await h.send({ type: 'DESIGNSHELF_CAPTURE', capture: validCapture() }, contentSender);
  assert.equal(result.ok, false);
  assert.match(result.error, /storage is nearly full/i);
  assert.equal(h.state.designshelfCaptures, undefined);
});

test('interaction events accept valid safe metadata and reject invalid event types or oversized state', async () => {
  const h = createHarness({ designshelfRecordingTabId:4 });
  const valid = { event: 'click', tag: 'button', role: 'button', label: 'Open menu', selector: '#menu', time: new Date().toISOString(), url: 'https://example.com/page', viewport: { width: 1280, height: 800 }, bounds: { x: 1, y: 2, width: 80, height: 32 }, state: { expanded: 'false', checked: null, activeElement: true, computed: { color: 'rgb(0, 0, 0)' } } };
  const ok = await h.send({ type: 'DESIGNSHELF_INTERACTION_EVENT', event: valid }, contentSender);
  assert.equal(ok.ok, true);
  assert.equal(h.state.designshelfInteractionEvents.length, 1);
  const wrongTab = await h.send({ type:'DESIGNSHELF_INTERACTION_EVENT', event:valid }, { ...contentSender, tab:{ id:5 } });
  assert.equal(wrongTab.ok, false);
  const invalidType = await h.send({ type: 'DESIGNSHELF_INTERACTION_EVENT', event: { ...valid, event: 'password-entered' } }, contentSender);
  assert.equal(invalidType.ok, false);
  const invalidNested = await h.send({ type: 'DESIGNSHELF_INTERACTION_EVENT', event: { ...valid, state: { computed: { color: 'x'.repeat(300) } } } }, contentSender);
  assert.equal(invalidNested.ok, false);
});

test('extension-only commands reject webpage senders', async () => {
  const h = createHarness();
  const result = await h.send({ type: 'DESIGNSHELF_START_PICK' }, contentSender);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Untrusted message sender.');
  const allowed = await h.send({ type: 'DESIGNSHELF_START_PICK' }, extensionSender);
  assert.equal(allowed.ok, false); // no active tab in this harness
  assert.match(allowed.error, /No active tab/);
});


test('recording stop targets the tab where recording began, not the newly active tab', async () => {
  const h = createHarness({}, { activeTabId: 4 });
  const started = await h.send({ type:'DESIGNSHELF_START_RECORDING' }, extensionSender);
  assert.equal(started.ok, true);
  assert.equal(h.state.designshelfRecordingTabId, 4);
  const stopped = await h.send({ type:'DESIGNSHELF_STOP_RECORDING' }, extensionSender);
  assert.equal(stopped.ok, true);
  assert.equal(h.sentMessages.at(-1).tabId, 4);
  assert.equal(h.sentMessages.at(-1).message.type, 'DESIGNSHELF_STOP_RECORDING');
  assert.equal(h.state.designshelfRecordingTabId, undefined);
});

test('starting a recording preserves previously saved interaction history', async () => {
  const oldEvent = { event:'click', tag:'button', label:'Previous session' };
  const h = createHarness({ designshelfInteractionEvents:[oldEvent] }, { activeTabId:4 });
  const result = await h.send({ type:'DESIGNSHELF_START_RECORDING' }, extensionSender);
  assert.equal(result.ok, true);
  assert.equal(h.state.designshelfInteractionEvents.length, 1);
  assert.equal(h.state.designshelfInteractionEvents[0].label, 'Previous session');
});


test('interaction recording stops safely when the shared storage budget is exhausted', async () => {
  const h = createHarness({ unrelatedStoredData:'x'.repeat(4_000_000), designshelfRecordingTabId:4 }, { activeTabId:4 });
  const event = { event:'click', tag:'button', label:'Save', selector:'#save', time:new Date().toISOString(), url:'https://example.com/page' };
  const result = await h.send({ type:'DESIGNSHELF_INTERACTION_EVENT', event }, contentSender);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'STORAGE_LIMIT');
  assert.equal(h.state.designshelfRecordingTabId, undefined);
  assert.equal(h.state.designshelfInteractionEvents, undefined);
});


test('capture notes are bounded and stored as user-authored metadata', async () => {
  const h = createHarness();
  const accepted = await h.send({ type:'DESIGNSHELF_CAPTURE', capture:validCapture({ note:'Keep the spacing and hierarchy.' }) }, contentSender);
  assert.equal(accepted.ok, true);
  assert.equal(h.state.designshelfCaptures[0].note, 'Keep the spacing and hierarchy.');
  const rejected = await h.send({ type:'DESIGNSHELF_CAPTURE', capture:validCapture({ id:'capture-2', note:'x'.repeat(2001) }) }, contentSender);
  assert.equal(rejected.ok, false);
});


test('starting on a different tab stops and replaces the previous recording session', async () => {
  const h = createHarness({ designshelfRecordingTabId:4 }, { activeTabId:9 });
  const result = await h.send({ type:'DESIGNSHELF_START_RECORDING' }, extensionSender);
  assert.equal(result.ok, true);
  assert.equal(h.sentMessages[0].tabId, 4);
  assert.equal(h.sentMessages[0].message.type, 'DESIGNSHELF_STOP_RECORDING');
  assert.equal(h.sentMessages[1].tabId, 9);
  assert.equal(h.state.designshelfRecordingTabId, 9);
});

test('capture retention safely discards malformed stored entries', async () => {
  const h = createHarness({ designshelfCaptures:[null,{}, {id:'expired',capturedAt:'2000-01-01T00:00:00.000Z'}, {id:'pinned',pinned:true,capturedAt:'2000-01-01T00:00:00.000Z'}] });
  // isFreshCapture is exercised by the capture path's pre-save pruning.
  const result = await h.send({ type:'DESIGNSHELF_CAPTURE', capture:validCapture() }, contentSender);
  assert.equal(result.ok, true);
  assert.deepEqual(h.state.designshelfCaptures.map(item=>item.id), ['capture-1','pinned']);
});

test('callback message bridge closes unhandled message channels with a null response', async () => {
  const h = createHarness();
  const result = await h.send({ type:'UNKNOWN_DESIGNSHELF_MESSAGE' }, extensionSender);
  assert.equal(result, null);
});


test('page inspection explains missing optional website permission instead of mislabelling a normal site as protected', async () => {
  const h = createHarness({}, { activeTabId:4, activeTabUrl:'https://example.com/article', failInjection:true });
  const result = await h.send({ type:'DESIGNSHELF_RUN_AUDIT' }, extensionSender);
  assert.equal(result.ok, false);
  assert.match(result.error, /Enable website access/i);
  assert.match(result.error, /optional website permission/i);
});
