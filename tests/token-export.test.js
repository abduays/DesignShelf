const test = require('node:test');
const assert = require('node:assert/strict');
const { collectTokenCounts, parseTokenColor, parseTokenDimension, buildDtcgTokens, buildCssTokenExport, buildTailwindTheme } = require('../token-export.js');

test('parses common computed RGB, alpha and hexadecimal colours', () => {
  assert.deepEqual(parseTokenColor('rgb(255, 0, 128)'), { colorSpace:'srgb', components:[1,0,0.50196], hex:'#ff0080' });
  assert.deepEqual(parseTokenColor('rgba(255, 0, 0, 0.5)'), { colorSpace:'srgb', components:[1,0,0], alpha:0.5, hex:'#ff0000' });
  assert.equal(parseTokenColor('#abc').hex, '#aabbcc');
  assert.equal(parseTokenColor('not-a-colour'), null);
  assert.equal(parseTokenColor('url(https://example.com/track)'), null);
});

test('only exports dimensions supported by the token format', () => {
  assert.deepEqual(parseTokenDimension('16px'), { value:16, unit:'px' });
  assert.deepEqual(parseTokenDimension('1.25rem'), { value:1.25, unit:'rem' });
  assert.equal(parseTokenDimension('normal'), null);
  assert.equal(parseTokenDimension('4px 8px'), null);
});

test('aggregates observed values across captures and component trees', () => {
  const groups = collectTokenCounts([
    { tokens:{ colors:['rgb(0, 0, 0)'], fontFamily:'Arial, sans-serif', fontSize:'16px', fontWeight:'400', lineHeight:'24px', borderRadius:'8px' }, structure:[{ tokens:{ colors:['rgb(0, 0, 0)'] } }] },
    { tokens:{ colors:['#ffffff'], fontFamily:'Arial, sans-serif', fontSize:'16px', fontWeight:'700', lineHeight:'24px', borderRadius:'8px' } }
  ]);
  assert.equal(groups.colors.get('rgb(0, 0, 0)'), 2);
  assert.equal(groups.fonts.get('Arial, sans-serif'), 2);
  assert.equal(groups.fontSizes.get('16px'), 2);
  assert.equal(groups.lineHeights.get('24px'), 2);
  assert.equal(groups.radii.get('8px'), 2);
});

test('DTCG output uses explicit interoperable token types and measured values', () => {
  const groups = collectTokenCounts([{ tokens:{ colors:['rgb(255, 0, 0)'], fontFamily:'Arial, sans-serif', fontSize:'16px', fontWeight:'700', lineHeight:'24px', borderRadius:'8px' } }]);
  const tokens = buildDtcgTokens(groups);
  assert.equal(tokens.colors['observed-001'].$type, 'color');
  assert.deepEqual(tokens.colors['observed-001'].$value.components, [1,0,0]);
  assert.equal(tokens.fontFamilies['observed-001'].$type, 'fontFamily');
  assert.deepEqual(tokens.fontFamilies['observed-001'].$value, ['Arial','sans-serif']);
  assert.equal(tokens.fontSizes['observed-001'].$type, 'dimension');
  assert.deepEqual(tokens.fontSizes['observed-001'].$value, { value:16, unit:'px' });
  assert.equal(tokens.fontWeights['observed-001'].$value, 700);
  assert.equal(tokens.lineHeights['observed-001'].$value.value, 24);
  assert.equal(tokens.borderRadii['observed-001'].$value.unit, 'px');
});

test('CSS and Tailwind exports produce deterministic variables without invented semantic roles', () => {
  const groups = collectTokenCounts([{ tokens:{ colors:['#123456'], fontFamily:'Arial, sans-serif', fontSize:'14px', fontWeight:'500', borderRadius:'6px' } }]);
  const css = buildCssTokenExport(groups);
  const tailwind = buildTailwindTheme(groups);
  assert.match(css, /--color-observed-001: #123456/);
  assert.match(tailwind, /@theme/);
  assert.match(tailwind, /--color-observed-001: #123456/);
  assert.doesNotMatch(tailwind, /--color-primary/);
});

test('semantic token labels are sanitised, deterministic and collision-safe across formats', () => {
  const groups=collectTokenCounts([{tokens:{colors:['#123456','#abcdef'],fontFamily:'Arial',fontSize:'16px'}}]);
  const labels={colors:{'#123456':'Brand Primary','#abcdef':'Brand Primary'},fonts:{Arial:'Body Font'},fontSizes:{'16px':'Text Base'}};
  const dtcg=buildDtcgTokens(groups,labels);
  assert.ok(dtcg.colors['brand-primary']);
  assert.ok(dtcg.colors['brand-primary-2']);
  assert.ok(dtcg.fontFamilies['body-font']);
  assert.ok(dtcg.fontSizes['text-base']);
  const css=buildCssTokenExport(groups,labels);
  assert.match(css,/--color-brand-primary:/);
  assert.match(css,/--color-brand-primary-2:/);
  const tailwind=buildTailwindTheme(groups,labels);
  assert.match(tailwind,/--color-brand-primary:/); assert.match(tailwind,/--color-brand-primary-2:/);
  assert.match(tailwind,/--font-body-font:/);
  assert.match(tailwind,/--text-text-base:/);
  assert.equal(require('../token-export.js').semanticName(' ../Invalid Token '),'invalid-token');
});
