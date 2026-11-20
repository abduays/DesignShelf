import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';

const extensionPath = resolve(process.argv[2] || 'chrome');
const profilePath = await mkdtemp(resolve(tmpdir(), 'designshelf-chrome-smoke-'));
const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><html><body><main><button id="fixture">Fixture</button></main></body></html>');
});
await new Promise(resolvePromise => server.listen(0, '127.0.0.1', resolvePromise));
const fixtureUrl = `http://127.0.0.1:${server.address().port}/`;
let context;

try {
  context = await chromium.launchPersistentContext(profilePath, {
    channel: 'chrome',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 });
  assert.match(worker.url(), /^chrome-extension:\/\//, 'extension service worker starts');
  const extensionId = new URL(worker.url()).host;
  assert.ok(extensionId, 'extension ID is discovered from the real service worker URL');

  const fixture = await context.newPage();
  await fixture.goto(fixtureUrl);
  assert.equal(await fixture.locator('#fixture').count(), 1, 'controlled fixture page loads');

  const sidebar = await context.newPage();
  const pageErrors = [];
  sidebar.on('pageerror', error => pageErrors.push(error.message));
  await sidebar.goto(`chrome-extension://${extensionId}/sidebar.html`);
  await sidebar.waitForSelector('#libraryView');
  await sidebar.waitForFunction(() => Boolean(globalThis.chrome?.runtime?.id));
  assert.equal(await sidebar.evaluate(() => chrome.runtime.id), extensionId, 'sidebar runs under the installed extension origin');
  assert.equal(await sidebar.title(), 'DesignShelf', 'installed sidebar page loads');

  const manifest = await sidebar.evaluate(() => chrome.runtime.getManifest());
  assert.equal(manifest.manifest_version, 3, 'real package manifest is loaded');
  assert.equal(manifest.side_panel.default_path, 'sidebar.html', 'Chrome side-panel package entry is configured');
  assert.ok(manifest.permissions.includes('sidePanel'), 'package declares the side-panel API permission');
  assert.ok(await sidebar.evaluate(() => typeof chrome.sidePanel?.open === 'function'), 'real Chrome sidePanel API is available');

  const storageRoundTrip = await sidebar.evaluate(async () => {
    const key = 'designshelf_ci_runtime_smoke';
    await chrome.storage.local.set({ [key]: { ok: true, timestamp: 123 } });
    const value = await chrome.storage.local.get(key);
    await chrome.storage.local.remove(key);
    return value[key];
  });
  assert.deepEqual(storageRoundTrip, { ok: true, timestamp: 123 }, 'real extension storage round-trip succeeds');

  await sidebar.getByRole('tab', { name: 'Boards' }).click();
  await sidebar.waitForSelector('#boardsView:not(.hidden)');
  assert.equal(await sidebar.locator('#viewTab-boards').getAttribute('aria-selected'), 'true', 'real sidebar navigation works');

  await sidebar.getByRole('tab', { name: 'Studio' }).click();
  await sidebar.waitForSelector('#toolboxView:not(.hidden)');
  assert.equal(await sidebar.locator('details.toolbox-group').count(), 3, 'Studio tools render from the packaged extension');

  const permissions = await sidebar.evaluate(() => chrome.permissions.getAll());
  assert.deepEqual(permissions.origins ?? [], [], 'optional website permissions are not silently granted');
  assert.deepEqual(pageErrors, [], 'packaged sidebar has no uncaught page errors');

  console.log('Chrome installed-package smoke passed: service worker, extension origin, manifest, storage, sidebar navigation, Studio and least-privilege permissions.');
} finally {
  if (context) await context.close();
  server.close();
  await rm(profilePath, { recursive: true, force: true });
}
