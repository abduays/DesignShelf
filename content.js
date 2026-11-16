(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  if (!api || window.__designShelfInstalled) return;
  window.__designShelfInstalled = true;

  const HIGHLIGHT_ID = '__designshelf_highlight__';
  const STYLE_ID = '__designshelf_picker_style__';
  const TOOLBAR_ID = '__designshelf_picker_toolbar__';
  let picking = false;
  let selecting = false;
  let current = null;
  let overlay = null;
  let toolbar = null;
  let lastPointer = { x: 0, y: 0 };
  let interactionRecording = false;
  let interactionCount = 0;
  const interactionEvents = [];
  let lastInteractionSignature = '';
  let lastInteractionAt = 0;

  const STYLE_PROPS = [
    'display','position','box-sizing','width','height','min-width','max-width','min-height','max-height',
    'margin','padding','border','border-radius','background','background-color','color','font-family',
    'font-size','font-weight','line-height','letter-spacing','text-align','text-decoration','text-transform',
    'box-shadow','opacity','overflow','gap','grid-template-columns','grid-template-rows','align-items',
    'justify-content','flex-direction','flex-wrap','transform','transition','animation-name','animation-duration',
    'animation-timing-function','animation-delay','animation-iteration-count'
  ];

  function ensureOverlay() {
    if (overlay) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `#${HIGHLIGHT_ID}{position:fixed!important;z-index:2147483646!important;pointer-events:none!important;border:2px solid #7c3aed!important;background:rgba(124,58,237,.12)!important;box-shadow:0 0 0 99999px rgba(15,23,42,.07)!important;border-radius:3px!important;box-sizing:border-box!important}#${HIGHLIGHT_ID}::after{content:attr(data-label);position:absolute;top:-27px;left:-2px;background:#7c3aed;color:white;font:12px/20px system-ui,sans-serif;padding:3px 8px;border-radius:4px;white-space:nowrap;max-width:70vw;overflow:hidden;text-overflow:ellipsis}#${TOOLBAR_ID}{position:fixed!important;z-index:2147483647!important;top:12px!important;left:50%!important;transform:translateX(-50%)!important;display:flex!important;align-items:center!important;gap:6px!important;padding:8px!important;border:1px solid #39445b!important;border-radius:12px!important;background:#111827!important;color:#f8fafc!important;box-shadow:0 8px 32px rgba(0,0,0,.35)!important;font:12px/1.2 system-ui,sans-serif!important;pointer-events:auto!important}#${TOOLBAR_ID} button{font:600 12px/1.2 system-ui,sans-serif!important;border:1px solid #4b5563!important;border-radius:7px!important;padding:8px 10px!important;background:#1f2937!important;color:#f9fafb!important;cursor:pointer!important}#${TOOLBAR_ID} button[data-primary='true']{background:#7c3aed!important;border-color:#8b5cf6!important}#${TOOLBAR_ID} button:disabled{opacity:.4!important;cursor:not-allowed!important}#${TOOLBAR_ID} .__ds_info{max-width:220px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;padding:0 5px!important;color:#cbd5e1!important}html.__designshelf_picking,html.__designshelf_picking *{cursor:crosshair!important}`;
    (document.documentElement || document).appendChild(style);
    overlay = document.createElement('div');
    overlay.id = HIGHLIGHT_ID;
    overlay.style.display = 'none';
    (document.documentElement || document.body).appendChild(overlay);
  }

  function isOurNode(node) {
    return !node || node.id === HIGHLIGHT_ID || node.id === STYLE_ID || node.id === TOOLBAR_ID || node.closest?.(`#${HIGHLIGHT_ID},#${TOOLBAR_ID}`);
  }

  function describe(element) {
    if (!element) return 'No element selected';
    const rect = element.getBoundingClientRect();
    const name = element.getAttribute('aria-label') || element.getAttribute('data-testid') || element.id || [...element.classList].slice(0, 2).join('.') || element.localName;
    return `${element.localName}${element.id ? '#' + element.id : ''} · ${Math.round(rect.width)}×${Math.round(rect.height)} · ${String(name).slice(0, 55)}`;
  }

  function moveOverlay(element) {
    if (!element || isOurNode(element)) return;
    const rect = element.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.left = `${Math.max(0, rect.left)}px`;
    overlay.style.top = `${Math.max(0, rect.top)}px`;
    overlay.style.width = `${Math.max(0, rect.width)}px`;
    overlay.style.height = `${Math.max(0, rect.height)}px`;
    overlay.dataset.label = describe(element);
    updateToolbar();
  }

  function likelyContainer(element) {
    let node = element;
    let best = element;
    let bestScore = -Infinity;
    for (let depth = 0; node && node !== document.body && node !== document.documentElement && depth < 7; depth++, node = node.parentElement) {
      if (isOurNode(node)) continue;
      const rect = node.getBoundingClientRect();
      const area = Math.max(0, rect.width) * Math.max(0, rect.height);
      const tag = node.tagName.toLowerCase();
      const hint = `${node.id || ''} ${node.className?.baseVal || node.className || ''}`.toLowerCase();
      const semantic = /^(section|article|main|header|footer|nav|aside)$/.test(tag) ? 5 : 0;
      const containerHint = /(section|container|wrapper|wrap|hero|banner|card|panel|content|layout|grid|row|column|feature|pricing|testimonial|header|footer|nav)/.test(hint) ? 4 : 0;
      const children = node.children.length;
      const textLength = (node.innerText || '').trim().length;
      const areaScore = Math.min(5, Math.log10(Math.max(1, area)) - 3);
      const score = semantic + containerHint + Math.min(3, children * .6) + Math.min(2, textLength / 120) + areaScore - depth * .7;
      if (rect.width >= 80 && rect.height >= 24 && score > bestScore) { best = node; bestScore = score; }
    }
    return best;
  }

  function ensureToolbar() {
    if (toolbar) return;
    toolbar = document.createElement('div');
    toolbar.id = TOOLBAR_ID;
    toolbar.innerHTML = `<span class="__ds_info" data-role="info">Hover over a section</span><button type="button" data-action="parent" title="Select parent container (↑)">↑ Parent</button><button type="button" data-action="child" title="Select first child (↓)">↓ Child</button><button type="button" data-action="capture" data-primary="true">Capture section</button><button type="button" data-action="cancel">Cancel</button>`;
    toolbar.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const action = button.dataset.action;
      if (action === 'parent') selectParent();
      if (action === 'child') selectChild();
      if (action === 'capture' && current) capture(current);
      if (action === 'cancel') stopPicking();
    });
    (document.documentElement || document.body).appendChild(toolbar);
  }

  function updateToolbar() {
    if (!toolbar) return;
    const info = toolbar.querySelector('[data-role="info"]');
    if (info) info.textContent = selecting ? `Selected: ${describe(current)}` : `Hover: ${describe(current)}`;
    const parentButton = toolbar.querySelector('[data-action="parent"]');
    const childButton = toolbar.querySelector('[data-action="child"]');
    if (parentButton) parentButton.disabled = !current?.parentElement || current.parentElement === document.body || current.parentElement === document.documentElement;
    if (childButton) childButton.disabled = !current?.children?.length;
  }

  function setCurrent(element, selected = false) {
    if (!element || isOurNode(element) || element === document.body || element === document.documentElement) return;
    current = element;
    selecting = selected;
    moveOverlay(current);
    updateToolbar();
  }

  function selectParent() {
    if (current?.parentElement && current.parentElement !== document.body && current.parentElement !== document.documentElement) setCurrent(current.parentElement, true);
  }

  function selectChild() {
    if (current?.firstElementChild) setCurrent(current.firstElementChild, true);
  }

  function safeText(value, max = 180) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function selectorFor(element) {
    if (element.id && !/\s/.test(element.id)) return `#${CSS.escape(element.id)}`;
    const parts = [];
    let node = element;
    while (node && node.nodeType === 1 && parts.length < 5) {
      let part = node.localName;
      const classes = [...node.classList].filter(c => c.length < 40).slice(0, 2);
      if (classes.length) part += '.' + classes.map(c => CSS.escape(c)).join('.');
      if (node.parentElement) {
        const siblings = [...node.parentElement.children].filter(s => s.localName === node.localName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  function getStyleText(element) {
    const computed = getComputedStyle(element);
    return STYLE_PROPS.map(prop => `${prop}: ${computed.getPropertyValue(prop)};`).join('\n');
  }

  function cleanCloneAndInline(element, maxNodes = 250) {
    const clone = element.cloneNode(true);
    const originals = [element, ...element.querySelectorAll('*')];
    const clones = [clone, ...clone.querySelectorAll('*')];
    const limited = Math.min(originals.length, maxNodes);
    for (let i = 0; i < limited; i++) {
      const original = originals[i];
      const copy = clones[i];
      if (!copy) continue;
      const computed = getComputedStyle(original);
      let style = '';
      for (const prop of STYLE_PROPS) {
        const val = computed.getPropertyValue(prop);
        if (val) style += `${prop}:${val};`;
      }
      copy.setAttribute('style', style);
      [...copy.attributes].forEach(attr => {
        if (/^on/i.test(attr.name) || attr.name === 'srcdoc') copy.removeAttribute(attr.name);
        if ((attr.name === 'href' || attr.name === 'src' || attr.name === 'xlink:href') && /^\s*javascript:/i.test(attr.value)) copy.removeAttribute(attr.name);
      });
      if (['SCRIPT','IFRAME','OBJECT','EMBED'].includes(copy.tagName)) {
        if (copy.tagName === 'SCRIPT' || copy.tagName === 'OBJECT' || copy.tagName === 'EMBED') copy.remove();
      }
      if (copy.tagName === 'IMG' && copy.getAttribute('src')) {
        try { copy.setAttribute('src', new URL(copy.getAttribute('src'), document.baseURI).href); } catch {}
      }
      if (copy.tagName === 'A' && copy.getAttribute('href')) {
        try { copy.setAttribute('href', new URL(copy.getAttribute('href'), document.baseURI).href); } catch {}
      }
    }
    clone.querySelectorAll('script,object,embed,iframe').forEach(n => n.remove());
    clone.querySelectorAll('input,textarea,select,option').forEach(control => {
      control.removeAttribute('value');
      control.removeAttribute('checked');
      control.removeAttribute('selected');
      if (control.tagName === 'TEXTAREA') control.textContent = '';
      if (control.tagName === 'SELECT') control.selectedIndex = -1;
    });
    return clone.outerHTML;
  }

  function getAnimationDetails(element) {
    const style = getComputedStyle(element);
    return {
      name: style.animationName,
      duration: style.animationDuration,
      timingFunction: style.animationTimingFunction,
      delay: style.animationDelay,
      iterationCount: style.animationIterationCount,
      direction: style.animationDirection,
      fillMode: style.animationFillMode,
      playState: style.animationPlayState,
      transition: style.transition,
      transform: style.transform
    };
  }

  function getStyleTokens(element) {
    const style = getComputedStyle(element);
    const colors = [...new Set([
      style.color, style.backgroundColor, style.borderTopColor, style.borderRightColor,
      style.borderBottomColor, style.borderLeftColor, style.outlineColor
    ].filter(value => value && value !== 'rgba(0, 0, 0, 0)'))].slice(0, 8);
    return {
      colors,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      backgroundImage: style.backgroundImage
    };
  }

  function buildComponentTree(root, maxNodes = 24) {
    const nodes = [];
    const queue = [{ element: root, parentId: null, depth: 0 }];
    while (queue.length && nodes.length < maxNodes) {
      const item = queue.shift();
      const el = item.element;
      if (!el || isOurNode(el) || ['SCRIPT','STYLE','NOSCRIPT','TEMPLATE'].includes(el.tagName)) continue;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const index = nodes.length;
      const text = safeText(el.innerText || el.textContent, 120);
      const tag = el.localName;
      const label = safeText(el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('alt') || el.getAttribute('data-testid') || text || tag, 56) || tag;
      nodes.push({
        id: index,
        parentId: item.parentId,
        depth: item.depth,
        tag,
        name: label,
        selector: selectorFor(el),
        text,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        display: style.display,
        visible: !!(rect.width || rect.height) && style.visibility !== 'hidden' && style.display !== 'none',
        css: getStyleText(el),
        animation: getAnimationDetails(el),
        tokens: getStyleTokens(el),
        html: cleanCloneAndInline(el, 50)
      });
      if (item.depth < 6) {
        for (const child of el.children) {
          if (nodes.length + queue.length >= maxNodes) break;
          queue.push({ element: child, parentId: index, depth: item.depth + 1 });
        }
      }
    }
    return nodes;
  }

  function showPickerNotice(message, isError = false) {
    try {
      document.querySelectorAll('[data-designshelf-notice]').forEach(node => node.remove());
      const notice = document.createElement('div');
      notice.dataset.designshelfNotice = 'true';
      notice.setAttribute('role','status');
      notice.textContent = safeText(message,180);
      notice.style.cssText = `position:fixed!important;top:14px!important;left:50%!important;transform:translateX(-50%)!important;z-index:2147483647!important;max-width:calc(100vw - 24px)!important;padding:10px 14px!important;border:1px solid ${isError?'#a33d39':'#426c55'}!important;border-radius:6px!important;background:#202923!important;color:#fbfaf5!important;font:600 13px/1.4 system-ui,sans-serif!important;box-shadow:0 5px 24px rgba(0,0,0,.24)!important;pointer-events:none!important;`;
      document.documentElement.appendChild(notice);
      setTimeout(() => notice.remove(), 4200);
    } catch {}
  }

  function capture(element) {
    const rect = element.getBoundingClientRect();
    const tag = element.tagName.toLowerCase();
    const text = safeText(element.innerText || element.textContent, 500);
    const name = safeText(element.getAttribute('aria-label') || element.getAttribute('data-testid') || text || tag, 72) || tag;
    const outerHTML = cleanCloneAndInline(element);
    const computedCSS = getStyleText(element);
    const capture = {
      id: `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      tag,
      selector: selectorFor(element),
      url: (() => { const u = new URL(location.href); u.search = ''; u.hash = ''; return u.href; })(),
      pageTitle: safeText(document.title, 180),
      note: '',
      capturedAt: new Date().toISOString(),
      text,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio: window.devicePixelRatio || 1 },
      html: outerHTML,
      css: computedCSS,
      animation: getAnimationDetails(element),
      tokens: getStyleTokens(element),
      structure: buildComponentTree(element)
    };
    api.runtime.sendMessage({ type: 'DESIGNSHELF_CAPTURE', capture }).then(response => {
      if (response?.ok) showPickerNotice('Component saved to DesignShelf.');
      else showPickerNotice(response?.error || 'The component could not be saved.', true);
    }).catch(() => showPickerNotice('DesignShelf could not save this component. Try again.', true));
    stopPicking();
  }

  function onMove(event) {
    if (!picking || selecting) return;
    lastPointer = { x: event.clientX, y: event.clientY };
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || isOurNode(element)) return;
    setCurrent(likelyContainer(element), false);
  }

  function onClick(event) {
    if (!picking || isOurNode(event.target)) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || isOurNode(element)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    setCurrent(current || likelyContainer(element), true);
  }

  function onKey(event) {
    if (!picking) return;
    if (event.key === 'Escape') { event.preventDefault(); stopPicking(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); selectParent(); }
    if (event.key === 'ArrowDown') { event.preventDefault(); selectChild(); }
    if (event.key === 'Enter' && current) { event.preventDefault(); capture(current); }
  }

  function startPicking() {
    ensureOverlay();
    ensureToolbar();
    picking = true;
    selecting = false;
    current = null;
    document.documentElement.classList.add('__designshelf_picking');
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
  }

  function stopPicking() {
    picking = false;
    selecting = false;
    current = null;
    document.documentElement.classList.remove('__designshelf_picking');
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    if (overlay) overlay.style.display = 'none';
    if (toolbar) toolbar.remove();
    toolbar = null;
  }

  function collectPerformanceAudit() {
    const now = Date.now();
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource').map((entry) => {
      let safeUrl = entry.name;
      try { const u = new URL(entry.name); safeUrl = `${u.origin}${u.pathname}`; } catch { safeUrl = '[resource]'; }
      const transfer = Number(entry.transferSize) || 0;
      const encoded = Number(entry.encodedBodySize) || 0;
      const decoded = Number(entry.decodedBodySize) || 0;
      return {
        url: safeUrl,
        type: entry.initiatorType || 'other',
        durationMs: Math.round(Number(entry.duration) || 0),
        transferBytes: transfer,
        encodedBytes: encoded,
        decodedBytes: decoded
      };
    });
    const images = [...document.images].map((img) => {
      const rect = img.getBoundingClientRect();
      return {
        src: (() => { try { const u = new URL(img.currentSrc || img.src, location.href); return `${u.origin}${u.pathname}`; } catch { return ''; } })(),
        altMissing: !img.hasAttribute('alt'),
        hasDimensions: img.hasAttribute('width') && img.hasAttribute('height'),
        naturalWidth: img.naturalWidth || 0,
        naturalHeight: img.naturalHeight || 0,
        displayWidth: Math.round(rect.width),
        displayHeight: Math.round(rect.height),
        loading: img.loading || 'eager',
        complete: img.complete
      };
    });
    const scripts = [...document.scripts].map(s => ({ src: s.src ? (() => { try { const u = new URL(s.src); return `${u.origin}${u.pathname}`; } catch { return ''; } })() : '[inline script]', async: s.async, defer: s.defer, type: s.type || 'text/javascript' }));
    const stylesheets = [...document.querySelectorAll('link[rel~="stylesheet"]')].map(link => {
      try { const u = new URL(link.href); return { url: `${u.origin}${u.pathname}`, media: link.media || 'all', disabled: link.disabled }; } catch { return { url: '[stylesheet]', media: link.media || 'all', disabled: link.disabled }; }
    });
    const totalTransfer = resources.reduce((sum, r) => sum + r.transferBytes, 0);
    const totalEncoded = resources.reduce((sum, r) => sum + r.encodedBytes, 0);
    const largestResources = [...resources].sort((a,b) => Math.max(b.transferBytes,b.encodedBytes)-Math.max(a.transferBytes,a.encodedBytes)).slice(0,12);
    const issues = [];
    const add = (level, title, detail, evidence = '') => issues.push({ level, title, detail, evidence });
    const largeResources = resources.filter(r => Math.max(r.transferBytes,r.encodedBytes) >= 250 * 1024);
    if (largeResources.length) add('warning', `${largeResources.length} large resource(s) detected`, 'Review whether these files can be compressed, split, cached more effectively or loaded only when needed.', `Largest resource is about ${formatBytes(Math.max(...largeResources.map(r => Math.max(r.transferBytes,r.encodedBytes))))}.`);
    const largeScripts = resources.filter(r => /script/i.test(r.type) && Math.max(r.transferBytes,r.encodedBytes) >= 150 * 1024);
    if (largeScripts.length) add('warning', `${largeScripts.length} large script resource(s)`, 'Check your build output for minification, tree-shaking, dependency duplication and code splitting. A large file is not proof that the code is unused.', largeScripts.slice(0,3).map(r=>`${r.url} (${formatBytes(Math.max(r.transferBytes,r.encodedBytes))})`).join(' · '));
    const largeStyles = resources.filter(r => /css|link/i.test(r.type) && Math.max(r.transferBytes,r.encodedBytes) >= 100 * 1024);
    if (largeStyles.length) add('warning', `${largeStyles.length} potentially large stylesheet resource(s)`, 'Review duplicate rules and whether styles for routes or components can be split. Verify the cascade before removing CSS.', largeStyles.slice(0,3).map(r=>`${r.url} (${formatBytes(Math.max(r.transferBytes,r.encodedBytes))})`).join(' · '));
    const oversizedImages = images.filter(i => i.naturalWidth > 600 && i.displayWidth > 0 && i.naturalWidth > i.displayWidth * 1.8);
    if (oversizedImages.length) add('warning', `${oversizedImages.length} image(s) are much larger than their displayed width`, 'Consider responsive srcset/sizes or a suitably sized WebP/AVIF asset. Check image quality and device pixel ratio before changing dimensions.', oversizedImages.slice(0,4).map(i=>`${i.naturalWidth}px source → ${i.displayWidth}px display`).join(' · '));
    const missingDimensions = images.filter(i => !i.hasDimensions);
    if (missingDimensions.length) add('info', `${missingDimensions.length} image(s) have no width and height attributes`, 'Explicit dimensions or aspect-ratio can reserve space and help prevent layout shifts. CSS aspect-ratio may also be appropriate.', 'This is a potential issue, not proof of a layout shift.');
    const missingAlt = images.filter(i => i.altMissing);
    if (missingAlt.length) add('warning', `${missingAlt.length} image(s) have no alt attribute`, 'Add meaningful alt text for informative images. Use alt="" for decorative images.', 'An empty alt attribute is different from a missing one.');
    const nodeCount = document.getElementsByTagName('*').length;
    if (nodeCount > 1800) add('warning', `Large DOM detected (${nodeCount.toLocaleString()} elements)`, 'Inspect repeated markup, deeply nested wrappers and large lists. Virtualisation or simpler markup may help in specific cases.', 'DOM size alone does not prove a performance problem.');
    if (nav && nav.domContentLoadedEventEnd > 0) {
      const dcl = Math.round(nav.domContentLoadedEventEnd);
      const response = Math.round(nav.responseStart || 0);
      const load = Math.round(nav.loadEventEnd || 0);
      if (dcl > 2500) add('warning', `DOMContentLoaded took ${formatMs(dcl)}`, 'Investigate slow server response, render-blocking resources and scripts that delay parsing. Compare multiple runs before drawing conclusions.', 'Single local navigation timing; not a field metric.');
      if (response > 800) add('info', `Initial response took ${formatMs(response)}`, 'If repeatable, investigate server response time, caching, redirects and network conditions.', 'Includes local network conditions and is not a server-only measurement.');
      if (load > 0) add('info', `Window load event: ${formatMs(load)}`, 'This measures the load event, not when the page becomes usable. Use browser performance tools for deeper profiling.', 'Local navigation timing.');
    }
    if (!issues.length) add('pass', 'No high-confidence issues detected by these checks', 'This scan did not find the specific patterns it checks. It is not a full Lighthouse audit and cannot identify all unused code or runtime bottlenecks.');
    return {
      scannedAt: new Date(now).toISOString(),
      page: { title: document.title, url: `${location.origin}${location.pathname}`, host: location.hostname },
      metrics: {
        domElements: nodeCount,
        imageCount: images.length,
        scriptCount: scripts.length,
        stylesheetCount: stylesheets.length,
        resourceCount: resources.length,
        approximateTransferBytes: totalTransfer,
        encodedResourceBytes: totalEncoded,
        domContentLoadedMs: nav && nav.domContentLoadedEventEnd > 0 ? Math.round(nav.domContentLoadedEventEnd) : null,
        responseStartMs: nav && nav.responseStart > 0 ? Math.round(nav.responseStart) : null,
        loadEventMs: nav && nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd) : null
      },
      issues,
      largestResources,
      imageSummary: {
        missingAlt: missingAlt.length,
        missingDimensions: missingDimensions.length,
        potentiallyOversized: oversizedImages.length,
        images: images.slice(0,100)
      },
      scripts: scripts.slice(0,100),
      stylesheets: stylesheets.slice(0,100),
      limitations: ['Resource transfer sizes may be unavailable for cached or cross-origin resources.', 'This scan does not measure field Core Web Vitals or reliably identify unused code.', 'Recommendations are advisory; validate changes with a repeatable performance test.']
    };
  }
  function pageInsights() {
    const safeUrl = (value) => { try { const u = new URL(value, location.href); u.search = ''; u.hash = ''; return u.href; } catch { return String(value || '').slice(0, 300); } };
    const images = [...document.images].slice(0, 300).map(img => ({ type:'image', url:safeUrl(img.currentSrc || img.src), alt:img.alt || '', naturalWidth:img.naturalWidth, naturalHeight:img.naturalHeight, displayWidth:Math.round(img.getBoundingClientRect().width), displayHeight:Math.round(img.getBoundingClientRect().height), loading:img.loading || 'eager' }));
    const fonts = [...new Set([...document.querySelectorAll('body,body *')].slice(0,1200).map(el => getComputedStyle(el).fontFamily).filter(Boolean))].slice(0,50);
    const scripts = [...document.scripts].map(el => ({type:'script',url:el.src ? safeUrl(el.src) : '(inline script)', async:el.async, defer:el.defer, typeAttribute:el.type || 'text/javascript'})).slice(0,150);
    const stylesheets = [...document.querySelectorAll('link[rel~="stylesheet"]')].map(el => ({type:'stylesheet',url:safeUrl(el.href),media:el.media || 'all',disabled:el.disabled})).slice(0,150);
    const controls = [...document.querySelectorAll('button,a,input,select,textarea,[role="button"],[role="menuitem"],[aria-haspopup],[tabindex]')].slice(0,300).map(el => ({tag:el.localName,role:el.getAttribute('role')||'',label:safeText(el.getAttribute('aria-label')||el.innerText||el.title||el.getAttribute('placeholder')||el.getAttribute('name')||el.getAttribute('type')||'',80),selector:selectorFor(el),hasClickHandlerHint:el.hasAttribute('onclick')||el.hasAttribute('data-action')||el.getAttribute('role')==='button'}));
    const animations = document.getAnimations().slice(0,120).map(animation => { const target=animation.effect?.target; let timing={}; let keyframes=[]; try { timing=animation.effect?.getTiming?.()||{}; keyframes=animation.effect?.getKeyframes?.()||[]; } catch {} return {name:animation.animationName||animation.id||'Web Animation',playState:animation.playState,currentTime:typeof animation.currentTime==='number'?Math.round(animation.currentTime):null,selector:target instanceof Element?selectorFor(target):'(unknown target)',target:target instanceof Element?target.localName:'unknown',timing:{duration:timing.duration,delay:timing.delay,easing:timing.easing,iterations:timing.iterations,direction:timing.direction,fill:timing.fill},keyframes:keyframes.slice(0,20)}; });
    const cssRules = [];
    for (const sheet of [...document.styleSheets].slice(0,40)) {
      try { for (const rule of [...sheet.cssRules].slice(0,300)) { if (rule.selectorText && cssRules.length < 500) cssRules.push({selector:rule.selectorText,cssText:rule.style?.cssText||'',source:safeUrl(sheet.href||location.href)}); } } catch {}
    }
    const styles = [...document.querySelectorAll('body,body *')].slice(0,1600).map(el=>getComputedStyle(el)).filter(Boolean);
    const colorCounts = new Map(), fontCounts = new Map(), spacingCounts = new Map();
    for (const st of styles) {
      for (const color of [st.color,st.backgroundColor,st.borderTopColor]) if (color && color!=='rgba(0, 0, 0, 0)' && color!=='transparent') colorCounts.set(color,(colorCounts.get(color)||0)+1);
      if (st.fontFamily) fontCounts.set(st.fontFamily,(fontCounts.get(st.fontFamily)||0)+1);
      for (const value of [st.gap,st.rowGap,st.columnGap,st.paddingTop,st.paddingLeft,st.marginTop,st.marginLeft]) if (value && value!=='normal' && value!=='0px') spacingCounts.set(value,(spacingCounts.get(value)||0)+1);
    }
    const top = map => [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,24).map(([value,count])=>({value,count}));
    const viewportIssues=[];
    const overflowing=[...document.querySelectorAll('body *')].slice(0,1500).filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.right>innerWidth+2&&getComputedStyle(el).position!=='fixed';}).slice(0,30).map(el=>({tag:el.localName,selector:selectorFor(el),right:Math.round(el.getBoundingClientRect().right),width:Math.round(el.getBoundingClientRect().width)}));
    if(document.documentElement.scrollWidth>innerWidth+2)viewportIssues.push({level:'warning',title:'Horizontal page overflow detected',detail:`Document scroll width is ${document.documentElement.scrollWidth}px while viewport width is ${innerWidth}px. Inspect the listed elements; intentional carousels can also cause overflow.`,evidence:overflowing.slice(0,10)});
    const smallTargets=[...document.querySelectorAll('button,a,input,select,textarea,[role="button"],[tabindex]')].slice(0,500).filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<24||r.height<24);}).slice(0,50).map(el=>({tag:el.localName,selector:selectorFor(el),width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height)}));
    if(smallTargets.length)viewportIssues.push({level:'info',title:`${smallTargets.length} interactive target(s) are under 24 CSS pixels`,detail:'Review target size and spacing. This is a heuristic and may count nested or visually hidden controls.',evidence:smallTargets.slice(0,10)});
    return { page:{title:document.title,url:safeUrl(location.href),host:location.host,viewport:{width:innerWidth,height:innerHeight},elementCount:document.querySelectorAll('*').length,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}, images, fonts, scripts, stylesheets, controls, animations, cssRules, responsive:{issues:viewportIssues,overflowing:overflowing.slice(0,30),smallTargets:smallTargets.slice(0,50)}, tokens:{colors:top(colorCounts),fonts:top(fontCounts),spacing:top(spacingCounts)}, limitations:['Responsive checks describe the current viewport only; the extension cannot reliably force the original tab through all viewport widths.', 'Cross-origin stylesheet rules may be inaccessible due to browser security.', 'Framework source code and runtime event listeners are not generally exposed by the browser.', 'Page insights are a snapshot of the current state; interact with menus before inspecting them.'] };
  }

  function describeInteraction(event) {
    const target = event.target?.closest?.('button,a,input,select,textarea,[role],[tabindex],summary') || event.target;
    if (!(target instanceof Element) || isOurNode(target)) return null;
    const rect = target.getBoundingClientRect();
    const style = getComputedStyle(target);
    const controlledId = target.getAttribute('aria-controls');
    const controlled = controlledId ? document.getElementById(controlledId) : null;
    const controlledStyle = controlled ? getComputedStyle(controlled) : null;
    const isFormField = /^(input|textarea|select)$/.test(target.localName);
    const safeLabel = target.getAttribute('aria-label') || target.innerText || (isFormField ? (target.getAttribute('placeholder') || target.getAttribute('name') || target.getAttribute('type') || '') : target.title || '');
    const safePageUrl = (() => { const u = new URL(location.href); u.search = ''; u.hash = ''; return u.href; })();
    return { id:++interactionCount, time:new Date().toISOString(), event:event.type, tag:target.localName, role:target.getAttribute('role')||'', label:safeText(safeLabel,100), selector:selectorFor(target), url:safePageUrl, viewport:{width:innerWidth,height:innerHeight}, bounds:{x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height)}, state:{expanded:target.getAttribute('aria-expanded'),selected:target.getAttribute('aria-selected'),pressed:target.getAttribute('aria-pressed'),checked:'checked' in target ? !!target.checked : null,activeElement:document.activeElement===target,controls:controlledId||null,controlledElement:controlled?{tag:controlled.localName,hidden:controlled.hidden||controlled.getAttribute('aria-hidden')==='true',display:controlledStyle?.display||'',visibility:controlledStyle?.visibility||''}:null,computed:{color:style.color,backgroundColor:style.backgroundColor,fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,borderRadius:style.borderRadius,transition:style.transition,animationName:style.animationName,animationDuration:style.animationDuration}} };
  }
  function onInteraction(event) {
    if (!interactionRecording || isOurNode(event.target)) return;
    const item = describeInteraction(event); if (!item) return;
    const signature = `${item.event}:${item.selector}`; const now = Date.now();
    if (signature === lastInteractionSignature && now - lastInteractionAt < (event.type === 'mouseover' ? 700 : 250)) return;
    lastInteractionSignature = signature; lastInteractionAt = now;
    interactionEvents.push(item); if (interactionEvents.length > 300) interactionEvents.shift();
    api.runtime.sendMessage({type:'DESIGNSHELF_INTERACTION_EVENT',event:item}).then(response=>{if(response?.code==='STORAGE_LIMIT')stopInteractionRecording();}).catch(()=>{});
  }
  function startInteractionRecording() {
    if (interactionRecording) return {ok:true,count:interactionEvents.length};
    interactionEvents.length = 0;
    interactionCount = 0;
    lastInteractionSignature = '';
    lastInteractionAt = 0;
    interactionRecording = true;
    for (const type of ['click','mouseover','focusin','change','keydown','submit']) document.addEventListener(type,onInteraction,true);
    return {ok:true,count:interactionEvents.length};
  }
  function stopInteractionRecording() {
    interactionRecording = false;
    for (const type of ['click','mouseover','focusin','change','keydown','submit']) document.removeEventListener(type,onInteraction,true);
    return {ok:true,count:interactionEvents.length};
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return 'size unavailable';
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  function formatMs(ms) { return `${(ms / 1000).toFixed(2)} s`; }

  api.runtime.onMessage.addListener((message) => {
    if (message?.type === 'DESIGNSHELF_ENABLE_PICK') {
      startPicking();
      return Promise.resolve({ ok: true });
    }
    if (message?.type === 'DESIGNSHELF_RUN_AUDIT') {
      try { return Promise.resolve({ ok: true, report: collectPerformanceAudit() }); }
      catch (error) { return Promise.resolve({ ok: false, error: String(error?.message || error) }); }
    }
    if (message?.type === 'DESIGNSHELF_GET_PAGE_INSIGHTS') {
      try { return Promise.resolve({ok:true,insights:pageInsights()}); } catch(error) { return Promise.resolve({ok:false,error:String(error?.message||error)}); }
    }
    if (message?.type === 'DESIGNSHELF_START_RECORDING') return Promise.resolve(startInteractionRecording());
    if (message?.type === 'DESIGNSHELF_STOP_RECORDING') return Promise.resolve(stopInteractionRecording());
    if (message?.type === 'DESIGNSHELF_GET_RECORDING') return Promise.resolve({ok:true,events:interactionEvents.slice()});
    return undefined;
  });

})();
