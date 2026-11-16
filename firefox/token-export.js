/* Pure design-token aggregation and export helpers. No DOM or extension APIs. */
(function(root) {
function collectTokenCounts(captures = []) {
  const groups = { colors:new Map(), fonts:new Map(), fontSizes:new Map(), fontWeights:new Map(), lineHeights:new Map(), letterSpacing:new Map(), radii:new Map() };
  const add = (map, value) => { if (value && value !== 'none' && value !== 'normal') map.set(value, (map.get(value) || 0) + 1); };
  captures.forEach(c => {
    const tokens = [c.tokens, ...(c.structure || []).map(n => n.tokens)].filter(Boolean);
    tokens.forEach(t => {
      (t.colors || []).forEach(v => add(groups.colors, v));
      add(groups.fonts, t.fontFamily); add(groups.fontSizes, t.fontSize);
      add(groups.fontWeights, t.fontWeight); add(groups.lineHeights, t.lineHeight); add(groups.letterSpacing, t.letterSpacing);
      add(groups.radii, t.borderRadius);
    });
  });
  return groups;
}
function parseTokenColor(input) {
  const value = String(input || '').trim().toLowerCase();
  let channels = null, alpha = 1;
  const hex = value.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = [...h].map(ch => ch + ch).join('');
    if (h.length === 8) { alpha = parseInt(h.slice(6,8),16) / 255; h = h.slice(0,6); }
    channels = [0,2,4].map(i => parseInt(h.slice(i,i+2),16) / 255);
  } else {
    const srgb = value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
    if (srgb) { channels = srgb.slice(1,4).map(Number); if (srgb[4] != null) alpha = Number(srgb[4]); }
    else {
      const rgb = value.match(/^rgba?\((.*)\)$/);
      if (rgb) {
        const parts = rgb[1].replace(/\s*\/\s*/g, ',').split(/[\s,]+/).filter(Boolean);
        if (parts.length >= 3) {
          channels = parts.slice(0,3).map(part => part.endsWith('%') ? Number(part.slice(0,-1)) / 100 : Number(part) / 255);
          if (parts[3] != null) alpha = parts[3].endsWith('%') ? Number(parts[3].slice(0,-1)) / 100 : Number(parts[3]);
        }
      }
    }
  }
  if (!channels || channels.some(n => !Number.isFinite(n) || n < 0 || n > 1) || !Number.isFinite(alpha)) return null;
  alpha = Math.max(0,Math.min(1,alpha));
  const hexValue = '#' + channels.map(n => Math.round(n*255).toString(16).padStart(2,'0')).join('');
  return { colorSpace:'srgb', components:channels.map(n => Number(n.toFixed(5))), ...(alpha < 1 ? {alpha:Number(alpha.toFixed(4))} : {}), hex:hexValue };
}
function parseTokenDimension(input) {
  const match = String(input || '').trim().match(/^(-?\d+(?:\.\d+)?)(px|rem)$/i);
  if (!match) return null;
  return { value:Number(match[1]), unit:match[2].toLowerCase() };
}
function tokenEntries(map, prefix, transform) {
  const output = [];
  let index = 0;
  [...map.entries()].sort((a,b) => b[1] - a[1]).forEach(([value,count]) => {
    const converted = transform(value);
    if (converted == null) return;
    const name = `${prefix}-${String(++index).padStart(3,'0')}`;
    output.push([name,{value:converted,count,source:value}]);
  });
  return output;
}
function buildDtcgTokens(groups) {
  const output = { $description:'DesignShelf extraction. Values are observed computed styles; sequence names are neutral labels, not inferred semantic roles.' };
  const addGroup = (name, entries, type) => {
    if (!entries.length) return;
    output[name] = {};
    entries.forEach(([tokenName,item]) => {
      output[name][tokenName] = { $type:type, $value:item.value, $description:`Observed in ${item.count} saved token snapshot(s).` };
    });
  };
  addGroup('colors',tokenEntries(groups.colors,'observed',parseTokenColor),'color');
  addGroup('fontFamilies',tokenEntries(groups.fonts,'observed',value => value.split(',').map(v => v.trim().replace(/^['"]|['"]$/g,''))),'fontFamily');
  addGroup('fontSizes',tokenEntries(groups.fontSizes,'observed',parseTokenDimension),'dimension');
  addGroup('lineHeights',tokenEntries(groups.lineHeights,'observed',parseTokenDimension),'dimension');
  addGroup('letterSpacing',tokenEntries(groups.letterSpacing,'observed',parseTokenDimension),'dimension');
  addGroup('borderRadii',tokenEntries(groups.radii,'observed',parseTokenDimension),'dimension');
  addGroup('fontWeights',tokenEntries(groups.fontWeights,'observed',value => { const n=Number(value); return Number.isFinite(n)&&n>=1&&n<=1000?n:null; }),'fontWeight');
  return output;
}
function buildCssTokenExport(groups) {
  const lines = [':root {','  /* Extracted computed values. Names are neutral; counts show snapshot frequency. */'];
  const add = (prefix,map,format=value=>value) => [...map.entries()].sort((a,b)=>b[1]-a[1]).forEach(([value,count],index) => lines.push(`  --${prefix}-${String(index+1).padStart(3,'0')}: ${format(value)}; /* observed ${count} time(s) */`));
  add('color-observed',groups.colors);
  add('font-family-observed',groups.fonts,value=>value);
  add('font-size-observed',groups.fontSizes);
  add('line-height-observed',groups.lineHeights);
  add('font-weight-observed',groups.fontWeights);
  add('letter-spacing-observed',groups.letterSpacing);
  add('radius-observed',groups.radii);
  lines.push('}');
  return lines.join('\n');
}
function buildTailwindTheme(groups) {
  const lines = ['@theme {','  /* Observed values only. Semantic token names have not been inferred. */'];
  const add = (prefix,map,format=value=>value) => [...map.entries()].sort((a,b)=>b[1]-a[1]).forEach(([value],index) => lines.push(`  --${prefix}-observed-${String(index+1).padStart(3,'0')}: ${format(value)};`));
  add('color',groups.colors);
  add('font',groups.fonts);
  add('text',groups.fontSizes);
  add('leading',groups.lineHeights);
  add('font-weight',groups.fontWeights);
  add('radius',groups.radii);
  lines.push('}');
  return lines.join('\n');
}
  const api = { collectTokenCounts, parseTokenColor, parseTokenDimension, buildDtcgTokens, buildCssTokenExport, buildTailwindTheme };
  root.DesignShelfTokenExport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
