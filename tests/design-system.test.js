const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync(require.resolve('../sidebar.css'),'utf8');
function variable(name) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`,'i'));
  assert.ok(match, `missing ${name}`);
  return match[1];
}
function luminance(hex) {
  const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);
  const linear = rgb.map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
}
function contrast(a,b) {
  const [high,low] = [luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (high+.05)/(low+.05);
}

test('Field Notes text and status colour pairs meet WCAG AA normal-text contrast', () => {
  const pairs = [
    ['ink on paper','#202923','#FBFAF5'],
    ['muted on workspace',variable('--ds-muted'),variable('--ds-bg')],
    ['muted on paper',variable('--ds-muted'),variable('--ds-paper')],
    ['accent on paper',variable('--ds-accent'),variable('--ds-paper')],
    ['primary button text on accent','#FFFAF5',variable('--ds-accent')],
    ['accent-dark on accent-soft',variable('--ds-accent-dark'),variable('--ds-accent-soft')],
    ['green status',variable('--ds-green'),variable('--ds-green-soft')],
    ['warning status',variable('--ds-warning'),variable('--ds-warning-soft')],
    ['danger status',variable('--ds-danger'),variable('--ds-danger-soft')],
    ['info status',variable('--ds-info'),variable('--ds-info-soft')]
  ];
  for (const [label,fg,bg] of pairs) assert.ok(contrast(fg,bg)>=4.5,`${label} contrast is ${contrast(fg,bg).toFixed(2)}:1`);
});

test('visual system uses local assets, visible focus and reduced-motion support', () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /@import\s+url\(['"]?https?:/i);
  assert.doesNotMatch(css, /font-size:\s*([0-9]|[0-9]\.\d+)px/i, 'avoid sub-10px interface text');
  assert.ok(fs.existsSync(require.resolve('../icons/designshelf-mark.svg')));
});
