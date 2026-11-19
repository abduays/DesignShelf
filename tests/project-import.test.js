require('../token-export.js');
const test = require('node:test');
const assert = require('node:assert/strict');
const { normaliseCapture, normaliseEvent, normaliseAudit, normaliseTokens } = require('../project-import.js');

function capture(overrides = {}) {
  return {
    id:'capture-1', name:'Hero section', tag:'section', selector:'main > section',
    url:'https://example.com/page?session=secret#hero', pageTitle:'Example', capturedAt:new Date().toISOString(),
    note:'Keep the spacing', text:'Welcome', width:800, height:420,
    viewport:{width:1440,height:900,devicePixelRatio:2},
    html:'<section><h1>Welcome</h1></section>', css:'display:block;', pinned:true,
    tokens:{colors:['rgb(255, 0, 0)','url(https://tracker.example/pixel)'],fontFamily:'Arial, sans-serif',fontSize:'16px'},
    structure:[{id:7,parentId:null,depth:0,tag:'section',name:'Hero',selector:'main > section',text:'Welcome',width:800,height:420,display:'block',visible:true,css:'display:block;',html:'<section></section>',tokens:{colors:['#ff0000']},animation:{name:'none',unexpected:'ignored'}}],
    ...overrides
  };
}

test('capture import strips URL query/hash, normalises fields and preserves bounded notes', () => {
  const result=normaliseCapture(capture());
  assert.equal(result.url,'https://example.com/page');
  assert.equal(result.note,'Keep the spacing');
  assert.equal(result.viewport.devicePixelRatio,2);
  assert.equal(result.structure[0].id,0);
  assert.equal(result.structure[0].parentId,null);
  assert.deepEqual(result.tokens.colors,['rgb(255, 0, 0)']);
  assert.deepEqual(result.structure[0].animation,{name:'none'});
  assert.equal(result.pinned,true);
});

test('capture import rejects invalid URLs, empty IDs/names and oversized markup', () => {
  assert.equal(normaliseCapture(capture({url:'javascript:alert(1)'})),null);
  assert.equal(normaliseCapture(capture({id:'   '})),null);
  assert.equal(normaliseCapture(capture({name:''})),null);
  assert.equal(normaliseCapture(capture({html:'x'.repeat(750001)})),null);
});

test('capture import rejects malformed structure collections and bounds tree size', () => {
  assert.equal(normaliseCapture(capture({structure:{bad:true}})),null);
  assert.equal(normaliseCapture(capture({structure:Array(25).fill({})})),null);
  const result=normaliseCapture(capture({structure:[{id:0,parentId:9,depth:99,tag:'div',visible:true}]}));
  assert.equal(result.structure[0].parentId,null);
  assert.equal(result.structure[0].depth,6);
});

test('token import allows safe colour values and rejects CSS resource expressions', () => {
  const result=normaliseTokens({colors:['#fff','rgb(0, 0, 0)','url(https://example.com)','var(--remote)'],fontFamily:'Arial',backgroundImage:'url(https://example.com/image.png)'});
  assert.deepEqual(result.colors,['#fff','rgb(0, 0, 0)']);
  assert.equal(result.fontFamily,'Arial');
  assert.equal(result.backgroundImage,'url(https://example.com/image.png)'); // retained as text only; never applied as a style
});

test('interaction import whitelists events, bounds nested state and strips URL parameters', () => {
  const event={event:'click',tag:'button',role:'button',label:'Open menu',selector:'#menu',time:new Date().toISOString(),url:'https://example.com/page?token=secret#menu',viewport:{width:1280,height:800},bounds:{x:1,y:2,width:80,height:32},state:{expanded:'false',checked:false,activeElement:true,computed:{color:'rgb(0, 0, 0)',unknown:'discard'},secret:'discard'}};
  const result=normaliseEvent(event);
  assert.equal(result.url,'https://example.com/page');
  assert.equal(result.state.expanded,'false');
  assert.equal(result.state.secret,undefined);
  assert.equal(result.state.computed.unknown,undefined);
  assert.equal(normaliseEvent({...event,event:'password-value'}),null);
  assert.equal(normaliseEvent({...event,url:'file:///etc/passwd'}),null);
});

test('audit import keeps only bounded comparison fields and finite metrics', () => {
  const result=normaliseAudit({page:{host:'example.com',title:'Example',url:'https://example.com/?secret=x'},metrics:{resourceCount:12,domElements:100,scriptCount:-1,unexpected:'keep out'},issues:[{message:'untrusted'}]});
  assert.deepEqual(result,{page:{host:'example.com',title:'Example',url:'https://example.com/'},metrics:{resourceCount:12,domElements:100}});
  assert.equal(normaliseAudit({page:{},metrics:{}}),null);
});

test('design-flow metadata is bounded, deduplicated and normalised during import', () => {
  const validIds = new Set(['capture-a','capture-b']);
  const result=normaliseCollection({id:'flow-1',name:'Product research',createdAt:'2026-11-18T00:00:00.000Z',captureIds:['capture-a','unknown','capture-b'],brief:'Audience and constraints',labels:['Pricing','pricing','Onboarding','x'.repeat(40),null]},validIds);
  assert.deepEqual(result.captureIds,['capture-a','capture-b']);
  assert.equal(result.brief,'Audience and constraints');
  assert.deepEqual(result.labels,['Pricing','Onboarding','x'.repeat(32)]);
  assert.equal(normaliseCollection({id:'',name:'Bad'}),null);
  assert.equal(normaliseCollection({id:'x',name:'y',brief:'z'.repeat(3001)}).brief,'');
});
