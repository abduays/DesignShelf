import { chromium, firefox } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('.');
const fixture='<!doctype html><html><head><meta charset="utf-8"><title>DesignShelf browser smoke</title></head><body><main><button id="state-target" aria-expanded="false">Toggle expanded</button><section id="content" hidden>Expanded content</section></main><script>document.getElementById("state-target").addEventListener("click",e=>{const b=e.currentTarget;b.setAttribute("aria-expanded",String(b.getAttribute("aria-expanded")!=="true"));document.getElementById("content").hidden=b.getAttribute("aria-expanded")!=="true";});</script></body></html>';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}if(pathname==='/browser-smoke-page.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(fixture);return;}const file=resolve(root,'.'+pathname);if(!file.startsWith(root+sep)&&file!==root){res.writeHead(403);res.end();return;}try{if(!statSync(file).isFile())throw new Error();res.writeHead(200,{'content-type':(mime[extname(file)]||'application/octet-stream')+'; charset=utf-8'});res.end(readFileSync(file));}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(resolvePromise=>server.listen(0,'127.0.0.1',resolvePromise));const address=server.address();const base='http://127.0.0.1:'+address.port;
const initMock=()=>{const state={designshelfCaptures:[{id:'smoke-capture',name:'Hero capture',tag:'section',selector:'#hero',url:'https://example.com/hero',pageTitle:'Example',capturedAt:new Date().toISOString(),text:'Smoke test',html:'<section id=hero><h1>Smoke test</h1></section>',css:'display:block;color:#123456;',width:800,height:420,viewport:{width:1280,height:800,devicePixelRatio:1},tokens:{colors:['#123456'],fontFamily:'Arial',fontSize:'16px'},structure:[{id:0,parentId:null,depth:0,tag:'section',name:'Hero',selector:'#hero',text:'Smoke test',width:800,height:420,display:'block',visible:true,css:'display:block;',html:'<section></section>',tokens:{colors:['#123456']}}]}],designshelfCollections:[{id:'smoke-flow',name:'Smoke flow',createdAt:new Date().toISOString(),captureIds:['smoke-capture'],brief:'Browser smoke test',labels:['QA','smoke']}],designshelfInteractionEvents:[],designshelfAuditHistory:[],designshelfTutorialSeen:true};const runtimeListeners=[],storageListeners=[],sent=[];const clone=value=>structuredClone(value);const local={async get(keys){if(keys==null)return clone(state);if(typeof keys==='string')return {[keys]:clone(state[keys])};if(Array.isArray(keys))return Object.fromEntries(keys.map(k=>[k,clone(state[k])]));if(typeof keys==='object')return Object.fromEntries(Object.entries(keys).map(([k,v])=>[k,state[k]===undefined?v:clone(state[k])]));return {};},async set(values){const changes={};for(const [k,v] of Object.entries(values)){changes[k]={oldValue:clone(state[k]),newValue:clone(v)};state[k]=clone(v);}storageListeners.forEach(fn=>fn(changes,'local'));},async remove(keys){const changes={};for(const k of(Array.isArray(keys)?keys:[keys])){changes[k]={oldValue:clone(state[k]),newValue:undefined};delete state[k];}storageListeners.forEach(fn=>fn(changes,'local'));}};const mock={runtime:{id:'smoke-extension-id',getURL:path=>'chrome-extension://smoke-extension-id/'+path,onMessage:{addListener(fn){runtimeListeners.push(fn);}},sendMessage:async message=>{sent.push(message);if(message.type==='DESIGNSHELF_CAPTURE'){state.designshelfCaptures.push(message.capture);state.designshelfLastCapture=clone(message.capture);storageListeners.forEach(fn=>fn({designshelfCaptures:{newValue:clone(state.designshelfCaptures)},designshelfLastCapture:{newValue:clone(message.capture)}},'local'));return {ok:true};}return {ok:true,count:0};}},storage:{local, onChanged:{addListener(fn){storageListeners.push(fn);}}},tabs:{query:async()=>[{id:1,url:base+'/browser-smoke-page.html'}],sendMessage:async()=>({ok:true,count:0})},sidePanel:{setPanelBehavior:async()=>{}},action:{onClicked:{addListener(){}}}};window.browser=mock;window.chrome=mock;window.__runtimeListeners=runtimeListeners;window.__mockState=state;window.__sentMessages=sent;};
async function runUiSmoke(browserType,name,launchOptions={}){const browser=await browserType.launch({headless:true,...launchOptions});try{const context=await browser.newContext({viewport:{width:420,height:900}});await context.addInitScript(initMock);const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/sidebar.html');await page.waitForSelector('#libraryView');await page.waitForTimeout(100);assert.ok(await page.getByText('Component library').count(),name+' renders Library');assert.ok(await page.getByText('Hero capture').count(),name+' renders seeded capture');await page.getByText('Hero capture').click();assert.ok(await page.locator('#detailPanel').isVisible(),name+' opens capture details');await page.locator('#viewTab-toolbox').click();await page.waitForSelector('#toolboxView:not(.hidden)');assert.ok(await page.locator('details.toolbox-group').count()===3,name+' renders grouped Studio');await page.locator('summary').filter({hasText:'Collect & Manage'}).click();assert.ok(await page.locator('#storageUsage').textContent().then(t=>t.includes('Approx. local data')),name+' renders storage estimate');assert.ok(await page.locator('#storageWarning').textContent(),name+' renders storage warning status');await page.locator('#viewTab-boards').click();await page.waitForSelector('#boardsView:not(.hidden)');assert.ok(await page.getByText('Smoke flow').count(),name+' renders seeded board');await page.locator('#viewTab-quality').click();await page.waitForSelector('#qualityView:not(.hidden)');assert.deepEqual(errors,[],name+' no sidebar runtime errors');await context.close();console.log(name+' sidebar smoke passed.');}finally{await browser.close();}}
async function runContentSmoke(browserType,name,launchOptions={}) {
  const browser=await browserType.launch({headless:true,...launchOptions});
  try {
    const context=await browser.newContext({viewport:{width:900,height:700}});
    await context.addInitScript(initMock);
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/browser-smoke-page.html');
    await page.addScriptTag({path:join(root,'content.js')});
    await page.evaluate(async()=>{
      const listener=window.__runtimeListeners[0];
      if(listener) await listener({type:'DESIGNSHELF_ENABLE_PICK'}, {}, ()=>{});
    });
    const baselineCount=await page.evaluate(()=>window.__mockState.designshelfCaptures.length);
    await page.locator('#state-target').click();
    await page.locator('#__designshelf_picker_toolbar__ [data-action="stateMode"]').click();
    await page.locator('#state-target').click();
    assert.equal(await page.locator('#state-target').getAttribute('aria-expanded'),'true',name+' fixture enters expanded state');
    await page.keyboard.press('Alt+Shift+S');
    await page.waitForFunction(expected=>window.__mockState.designshelfCaptures.length===expected+1,baselineCount);
    const capture=await page.evaluate(index=>window.__mockState.designshelfCaptures[index],baselineCount);
    assert.equal(capture.captureState,'expanded',name+' state label');
    assert.equal(capture.stateEvidence.expanded,true,name+' expanded evidence');
    assert.equal(capture.stateEvidence.hovered,true,name+' hover evidence');
    assert.deepEqual(errors,[],name+' no content script runtime errors');
    await context.close();
    console.log(name+' content state smoke passed.');
  } finally {
    await browser.close();
  }
}
try{await runUiSmoke(chromium,'Chrome stable',{channel:'chrome'});await runContentSmoke(chromium,'Chrome stable',{channel:'chrome'});await runUiSmoke(firefox,'Firefox');await runContentSmoke(firefox,'Firefox');}finally{server.close();}
