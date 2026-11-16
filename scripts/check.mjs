import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fail = [];
const shared = ['background.js','content.js','sidebar.html','sidebar.js','sidebar.css','token-export.js','project-import.js'];
const run = (args) => {
  const result = spawnSync(process.execPath, args, { cwd:root, encoding:'utf8' });
  if (result.status !== 0) fail.push(`${args.join(' ')}\n${result.stderr || result.stdout}`);
};

for (const file of ['background.js','content.js','sidebar.js','token-export.js','project-import.js','demo/app.js']) run(['--check',file]);
for (const browser of ['chrome','firefox']) {
  const dir = path.join(root,browser);
  const manifestPath = path.join(dir,'manifest.json');
  if (!fs.existsSync(manifestPath)) { fail.push(`${browser}: missing manifest.json`); continue; }
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8')); }
  catch (error) { fail.push(`${browser}: invalid manifest JSON: ${error.message}`); continue; }
  if (manifest.manifest_version !== 3 || manifest.version !== '0.8.3') fail.push(`${browser}: unexpected manifest version`);
  if (!manifest.permissions?.includes('activeTab') || !manifest.permissions?.includes('scripting') || !manifest.permissions?.includes('storage')) fail.push(`${browser}: missing required permissions`);
  if (manifest.host_permissions || manifest.content_scripts || manifest.permissions?.includes('<all_urls>')) fail.push(`${browser}: broad or automatic site access detected`);
  if (!manifest.optional_host_permissions?.includes('http://*/*') || !manifest.optional_host_permissions?.includes('https://*/*')) fail.push(`${browser}: optional HTTP/HTTPS site access missing`);
  if (browser === 'chrome' && (!manifest.background?.service_worker || !manifest.side_panel?.default_path || Number(manifest.minimum_chrome_version) < 114)) fail.push('chrome: MV3 service worker, side panel path or Chrome 114 minimum missing');
  if (browser === 'firefox' && (!manifest.background?.scripts?.includes('background.js') || !manifest.sidebar_action?.default_panel)) fail.push('firefox: MV3 background scripts or sidebar path missing');
  const convenienceManifest = path.join(root,`manifest.${browser}.json`);
  if (fs.existsSync(convenienceManifest) && JSON.stringify(JSON.parse(fs.readFileSync(convenienceManifest,'utf8'))) !== JSON.stringify(manifest)) fail.push(`${browser}: root convenience manifest is stale`);
  for (const file of shared) {
    const packaged = path.join(dir,file);
    if (!fs.existsSync(packaged)) fail.push(`${browser}: missing ${file}`);
    else if (!fs.readFileSync(packaged).equals(fs.readFileSync(path.join(root,file)))) fail.push(`${browser}: ${file} differs from root source`);
  }
  for (const size of [16,32,48,128]) {
    const icon = path.join(dir,'icons',`icon${size}.png`);
    if (!fs.existsSync(icon)) fail.push(`${browser}: missing ${path.relative(root,icon)}`);
  }
  const html = fs.readFileSync(path.join(dir,'sidebar.html'),'utf8');
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const value = match[1];
    if (/^(?:https?:|data:|#)/i.test(value)) {
      if (/^https?:/i.test(value)) fail.push(`${browser}: remote UI resource ${value}`);
      continue;
    }
    if (!fs.existsSync(path.join(dir,value))) fail.push(`${browser}: missing UI resource ${value}`);
  }
}

const demoHtmlPath = path.join(root,'demo','index.html');
const demoHtml = fs.readFileSync(demoHtmlPath,'utf8');
for (const match of demoHtml.matchAll(/(?:src|href)=[\"']([^\"']+)[\"']/g)) {
  const value = match[1];
  if (/^(?:https?:|data:|#)/i.test(value)) continue;
  if (!fs.existsSync(path.join(root,'demo',value))) fail.push('demo: missing local resource ' + value);
}
const demoCss = fs.readFileSync(path.join(root,'demo','styles.css'),'utf8');
if ((demoCss.match(/{/g)||[]).length !== (demoCss.match(/}/g)||[]).length) fail.push('demo/styles.css: unbalanced braces');

const html = fs.readFileSync(path.join(root,'sidebar.html'),'utf8');
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
if (new Set(ids).size !== ids.length) fail.push('sidebar.html contains duplicate IDs');
const uiJs = fs.readFileSync(path.join(root,'sidebar.js'),'utf8');
const staticRefs = [...uiJs.matchAll(/\$\(["']([^"']+)["']\)/g)].map(match => match[1]);
const dynamicIds = new Set(['deleteFlowBtn','exportFlowMarkdownBtn']);
for (const id of staticRefs) if (!ids.includes(id) && !dynamicIds.has(id)) fail.push(`sidebar.js references missing HTML ID: ${id}`);
const buttonIds = [...html.matchAll(/<button\b[^>]*\bid=["']([^"']+)["']/g)].map(match => match[1]);
const directHandlers = new Set([...uiJs.matchAll(/\$\(["']([^"']+)["']\)(?:\?\.addEventListener|\.addEventListener)/g)].map(match => match[1]));
const delegatedButtons = new Set(['tabHtml','tabCss','tabMotion','tabChecks','viewTab-library','viewTab-boards','viewTab-quality','viewTab-optimise','viewTab-toolbox']);
for (const id of buttonIds) if (!directHandlers.has(id) && !delegatedButtons.has(id)) fail.push(`button has no registered click handler: ${id}`);
for (const cssFile of ['sidebar.css']) {
  const css = fs.readFileSync(path.join(root,cssFile),'utf8');
  if ((css.match(/{/g)||[]).length !== (css.match(/}/g)||[]).length) fail.push(`${cssFile}: unbalanced braces`);
}

if (fail.length) {
  console.error('DesignShelf checks failed:\n\n' + fail.map((item,i)=>`${i+1}. ${item}`).join('\n\n'));
  process.exit(1);
}
console.log('DesignShelf checks passed: syntax, manifests, package parity, icons, local UI resources, IDs and CSS balance.');
