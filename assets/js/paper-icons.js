/* Paper note semantic SVG icons (P2 + T2):
 * Hydrates structural emojis inside #paper-body (meta blockquote, H2–H4 headings,
 * fold <summary>, callout prefixes, and status marks) into 1.55px monochrome
 * linear SVGs before first paint, without modifying Markdown sources. */
(function (root) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* Icon paths on a 16x16 grid (1.55px stroke, matching header & Robotics_Notebooks). */
  var ICONS = {
    // Meta blockquote
    calendar: '<rect x="2.6" y="3.8" width="10.8" height="9.4" rx="1.6"/><path d="M2.6 7h10.8M5.4 2.3v2.5M10.6 2.3v2.5"/>',
    tag: '<path d="M2.8 8.3V3.4a.6.6 0 0 1 .6-.6h4.9l4.9 4.9a.9.9 0 0 1 0 1.3l-4.2 4.2a.9.9 0 0 1-1.3 0L2.8 8.3Z"/><circle cx="5.8" cy="5.8" r="0.95" fill="currentColor" stroke="none"/>',
    pulse: '<path d="M2 8.2h2.4l1.5-3.4 2.1 6.2 1.6-3.8H14"/>',
    repeat: '<path d="M12.6 7a4.8 4.8 0 0 0-8.4-2.1M3.4 9a4.8 4.8 0 0 0 8.4 2.1"/><path d="M4.1 2.7v2.3h2.3M11.9 13.3V11H9.6"/>',

    // Section headings (H2 / H3 / H4) & folds
    clipboard: '<rect x="3.5" y="3.2" width="9" height="10.3" rx="1.4"/><path d="M6 3.2V2.4h4v.8M6 7h4M6 9.8h2.8"/>',
    help: '<circle cx="8" cy="8" r="5.6"/><path d="M6.3 6.3a1.8 1.8 0 0 1 3.2 1c0 1.1-1.5 1.3-1.5 2.4"/><circle cx="8" cy="11.6" r="0.7" fill="currentColor" stroke="none"/>',
    target: '<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2.7"/><circle cx="8" cy="8" r="0.85" fill="currentColor" stroke="none"/>',
    wrench: '<path d="M10.4 2.8a3.2 3.2 0 0 0-3.7 4.4L3 10.9a1.4 1.4 0 0 0 2 2l3.7-3.7a3.2 3.2 0 0 0 4.4-3.7l-1.9 1.9-1.6-1.6 1.8-1.8a3.2 3.2 0 0 0-1-1.2Z"/>',
    pin: '<path d="M9.6 2.7 13.3 6.4 11.7 8 10.5 7.4 7.7 10.2l.4 1.6-1.3 1.3-2.2-2.2-2.1 2.1 2.1-2.1-2.2-2.2 1.3-1.3 1.6.4 2.8-2.8-.6-1.2 2.1-1.1Z"/>',
    bot: '<rect x="3.2" y="5" width="9.6" height="7.6" rx="2"/><path d="M8 2.6V5M2 8.8h1.2M12.8 8.8H14M6.2 10.4h3.6"/><circle cx="6.2" cy="8" r="0.8" fill="currentColor" stroke="none"/><circle cx="9.8" cy="8" r="0.8" fill="currentColor" stroke="none"/>',
    link: '<path d="M6.7 9.3 9.3 6.7M5.7 11.2l-.9.9a2.4 2.4 0 0 1-3.4-3.4l.9-.9M10.3 4.8l.9-.9a2.4 2.4 0 0 1 3.4 3.4l-.9.9"/>',
    compass: '<circle cx="8" cy="8" r="5.6"/><polygon points="10.4,5.6 9.1,9.1 5.6,10.4 6.9,6.9" fill="currentColor" stroke="none"/>',
    bulb: '<path d="M6 11.4h4M6.6 13.4h2.8M5.4 9.5A3.6 3.6 0 1 1 10.6 9.5c-.5.5-.8 1-.9 1.9H6.3c-.1-.9-.4-1.4-.9-1.9Z"/>',
    'bar-chart': '<path d="M2.5 13h11M4.6 13V8.6M8 13V4.4M11.4 13V6.6"/>',
    trend: '<path d="M2.5 12.6h11M3.4 10.2l3-3 2.1 2 4-4.6M10 4.6h2.5v2.5"/>',
    mic: '<rect x="5.8" y="2.4" width="4.4" height="6.8" rx="2.2"/><path d="M3.8 7.8a4.2 4.2 0 0 0 8.4 0M8 12v1.8M5.8 13.8h4.4"/>',
    folder: '<path d="M2.4 4.6a1.2 1.2 0 0 1 1.2-1.2h3l1.3 1.5h4.5a1.2 1.2 0 0 1 1.2 1.2v5.7a1.2 1.2 0 0 1-1.2 1.2H3.6a1.2 1.2 0 0 1-1.2-1.2V4.6Z"/>',
    walk: '<circle cx="8.6" cy="3.4" r="1.25"/><path d="M8 5.6 6.8 9.2l2.6 1.5.9 2.7M6.8 9.2l-2 4.2M6 6.8l2-1.2 2.4 1.4"/>',
    alert: '<path d="M8 2.5 13.8 13H2.2L8 2.5Z"/><path d="M8 6.4v3"/><circle cx="8" cy="11.2" r="0.7" fill="currentColor" stroke="none"/>',
    paperclip: '<path d="M11.6 6.4 6.7 11.3a2 2 0 0 1-2.8-2.8l5.3-5.3a3.1 3.1 0 0 1 4.4 4.4l-5.3 5.3a4.2 4.2 0 0 1-5.9-5.9l4.9-4.9"/>',
    film: '<rect x="2.4" y="3.2" width="11.2" height="9.6" rx="1.4"/><path d="M5.2 3.2v9.6M10.8 3.2v9.6M2.4 6.4h2.8M2.4 9.6h2.8M10.8 6.4h2.8M10.8 9.6h2.8"/>',
    tv: '<rect x="2.4" y="3.6" width="11.2" height="8" rx="1.4"/><path d="M5.6 13.4h4.8M8 11.6v1.8M7 6.3 9.8 7.6 7 8.9Z"/>',
    message: '<path d="M3 4a1.4 1.4 0 0 1 1.4-1.4h7.2A1.4 1.4 0 0 1 13 4v5.6a1.4 1.4 0 0 1-1.4 1.4H6.5L3.6 13.4V11H4.4A1.4 1.4 0 0 1 3 9.6V4Z"/>',
    books: '<rect x="2.6" y="3.6" width="3.1" height="9.4" rx="0.7"/><rect x="5.7" y="2.8" width="3.2" height="10.2" rx="0.7"/><path d="M9.5 4.2 12.3 3.5 13.9 12.2 11.1 12.9Z"/>',
    'book-open': '<path d="M2.3 4.3C4 3.6 6.2 3.6 8 4.7C9.8 3.6 12 3.6 13.7 4.3v7.5c-1.7-.7-3.9-.7-5.7.4-1.8-1.1-4-1.1-5.7-.4V4.3Z"/><path d="M8 4.7v7.5"/>',
    puzzle: '<path d="M3.2 5.4h2.5a1.3 1.3 0 1 1 2.6 0h2.5v2.5a1.3 1.3 0 1 1 0 2.6V13H8.3a1.3 1.3 0 1 0-2.6 0H3.2v-2.5a1.3 1.3 0 1 0 0-2.6V5.4Z"/>',
    flask: '<path d="M6.2 2.6h3.6M6.8 2.6v3.6L3.6 12a1.2 1.2 0 0 0 1 1.8h6.8a1.2 1.2 0 0 0 1-1.8L9.2 6.2V2.6M5.2 9.6h5.6"/>',
    brain: '<path d="M8 3.2v9.6M8 4.4a2.3 2.3 0 0 0-4.2 1.2 2.2 2.2 0 0 0-.5 3.8 2.2 2.2 0 0 0 4.7 1.2M8 4.4a2.3 2.3 0 0 1 4.2 1.2 2.2 2.2 0 0 1 .5 3.8 2.2 2.2 0 0 1-4.7 1.2"/>',
    calc: '<rect x="3.2" y="2.4" width="9.6" height="11.2" rx="1.5"/><path d="M5.4 5h5.2M5.8 8h.1M8 8h.1M10.2 8h.1M5.8 10.6h.1M8 10.6h.1M10.2 10.6h.1"/>',
    microscope: '<path d="M4.2 13.4h7.6M6.2 13.4v-1.8a3.8 3.8 0 0 0 3.8-3.8V6.4M7.2 3 10 5.8 7.8 8 5 5.2Z"/>',
    terminal: '<rect x="2.4" y="3.2" width="11.2" height="9.6" rx="1.5"/><path d="M5 6.4 7.1 8 5 9.6M8.2 9.6h2.8"/>',
    layers: '<path d="M8 2.5 13.5 5.6 8 8.7 2.5 5.6 8 2.5ZM2.5 8.6 8 11.7l5.5-3.1M2.5 11.4 8 14.3l5.5-2.9"/>',
    type: '<path d="M3.2 4.2h9.6M8 4.2v8.8M5.8 13h4.4"/>',
    user: '<circle cx="8" cy="5.2" r="2.4"/><path d="M3.4 13.4a4.6 4.6 0 0 1 9.2 0"/>',
    bone: '<path d="M5.4 10.6 10.6 5.4"/><circle cx="4.5" cy="9.5" r="1.3"/><circle cx="6.5" cy="11.5" r="1.3"/><circle cx="9.5" cy="4.5" r="1.3"/><circle cx="11.5" cy="6.5" r="1.3"/>',
    dna: '<path d="M4.6 2.6c0 3 6.8 3 6.8 5.4s-6.8 2.4-6.8 5.4M11.4 2.6c0 3-6.8 3-6.8 5.4s6.8 2.4 6.8 5.4M5.6 5.2h4.8M5.6 10.8h4.8"/>',
    blocks: '<rect x="2.6" y="2.8" width="4.4" height="4.4" rx="1"/><rect x="9" y="2.8" width="4.4" height="4.4" rx="1"/><rect x="2.6" y="9" width="10.8" height="4.2" rx="1"/>',
    map: '<path d="M2.5 4.8 6 3.3l4 1.5 3.5-1.5v7.9L10 12.7l-4-1.5-3.5 1.5V4.8Z"/><path d="M6 3.3v7.9M10 4.8v7.9"/>',
    note: '<path d="M4 2.6h6l2.6 2.6v8.2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.6a1 1 0 0 1 1-1Z"/><path d="M9.8 2.6v2.8h2.8M5.6 8h4.8M5.6 10.6h3.2"/>',
    rocket: '<path d="M9.8 2.5c1.8.2 3.5 1.9 3.7 3.7l-3.9 3.9-3.7-3.7 3.9-3.9Z"/><path d="M5.9 6.4 3.4 7l2 2M9.6 10.1l-.6 2.5-2-2M3.3 12.7l1.8-1.8"/><circle cx="9.8" cy="6.2" r="0.85" fill="currentColor" stroke="none"/>',

    // Callouts & Status
    gamepad: '<rect x="2.2" y="5" width="11.6" height="6.6" rx="3.1"/><path d="M5.6 7v2.6M4.3 8.3h2.6"/><circle cx="10.4" cy="7.7" r="0.7" fill="currentColor" stroke="none"/><circle cx="11.7" cy="9" r="0.7" fill="currentColor" stroke="none"/>',
    key: '<circle cx="5.4" cy="8.2" r="2.6"/><path d="M7.8 8.2H14M11.6 8.2v2.2M13.6 8.2v1.6"/>',
    cone: '<path d="M3 13.2h10M4.6 13.2 7.2 3.2h1.6l2.6 10M6.2 7.6h3.6M5.4 10.4h5.2"/>',
    'check-circle': '<circle cx="8" cy="8" r="5.6"/><path d="M5.4 8.2 7.2 10l3.5-3.8"/>',
    'x-circle': '<circle cx="8" cy="8" r="5.6"/><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4"/>',
    star: '<path d="M8 1.8l1.85 3.76 4.15.6-3 2.93.71 4.13L8 11.27l-3.71 1.95.71-4.13-3-2.93 4.15-.6L8 1.8Z" fill="currentColor" stroke="currentColor" stroke-width="0.9" stroke-linejoin="round"/>'
  };

  /* Heading prefix emojis (H2 / H3 / H4) -> [iconName, tone] */
  var HEADING_MAP = {
    '📋': ['clipboard', 'accent'],
    '❓': ['help', 'accent'],
    '🎯': ['target', 'accent'],
    '🔧': ['wrench', 'accent'],
    '🛠': ['wrench', 'accent'],
    '📌': ['pin', 'accent'],
    '🤖': ['bot', 'accent'],
    '🔗': ['link', 'accent'],
    '🧭': ['compass', 'accent'],
    '💡': ['bulb', 'accent'],
    '📊': ['bar-chart', 'accent'],
    '📈': ['trend', 'accent'],
    '🎤': ['mic', 'accent'],
    '📁': ['folder', 'accent'],
    '🚶': ['walk', 'accent'],
    '⚠': ['alert', 'warn'],
    '📎': ['paperclip', 'accent'],
    '🎬': ['film', 'accent'],
    '📺': ['tv', 'accent'],
    '💬': ['message', 'accent'],
    '📚': ['books', 'accent'],
    '📖': ['book-open', 'accent'],
    '🧩': ['puzzle', 'accent'],
    '🧪': ['flask', 'accent'],
    '🧠': ['brain', 'accent'],
    '🧮': ['calc', 'accent'],
    '🔬': ['microscope', 'accent'],
    '💻': ['terminal', 'accent'],
    '🖥': ['terminal', 'accent'],
    '🏗': ['layers', 'accent'],
    '🔤': ['type', 'accent'],
    '🧑': ['user', 'accent'],
    '🦴': ['bone', 'accent'],
    '🧬': ['dna', 'accent'],
    '🧱': ['blocks', 'accent'],
    '🤔': ['help', 'accent'],
    '🗺': ['map', 'accent'],
    '📝': ['note', 'accent'],
    '🚀': ['rocket', 'accent']
  };

  /* Meta blockquote & Callout prefix emojis -> [iconName, tone] */
  var BLOCKQUOTE_MAP = {
    '📅': ['calendar', 'muted'],
    '🏷': ['tag', 'muted'],
    '🩺': ['pulse', 'ok'],
    '🔁': ['repeat', 'muted'],
    '💡': ['bulb', 'accent'],
    '⚠': ['alert', 'warn'],
    '🎮': ['gamepad', 'accent'],
    '🔑': ['key', 'accent'],
    '📌': ['pin', 'accent'],
    '🧭': ['compass', 'accent'],
    '🚶': ['walk', 'accent'],
    '📖': ['book-open', 'accent'],
    '📝': ['note', 'muted'],
    '🚧': ['cone', 'warn'],
    '✅': ['check-circle', 'ok'],
    '🌟': ['star', 'star'],
    '⭐': ['star', 'star']
  };

  /* Global semantic status emojis anywhere inside #paper-body (tables, lists, prose) */
  var STATUS_MAP = {
    '✅': ['check-circle', 'ok'],
    '❌': ['x-circle', 'err'],
    '⚠': ['alert', 'warn'],
    '🌟': ['star', 'star'],
    '⭐': ['star', 'star'],
    '🚧': ['cone', 'warn']
  };

  var SKIP_TAGS = {
    CODE: 1,
    PRE: 1,
    SCRIPT: 1,
    STYLE: 1,
    TEXTAREA: 1,
    SVG: 1,
    NOSCRIPT: 1
  };

  var SKIP_SELECTOR = '.mermaid, .katex, .paper-demo, .demo-box, .paper-icon';

  function stripVS16(str) {
    return str.replace(/\uFE0F/g, '');
  }

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function buildPrefixRegex(map) {
    var keys = Object.keys(map).sort(function (a, b) {
      return b.length - a.length;
    });
    return new RegExp('^\\s*(' + keys.map(escapeRegex).join('|') + ')\\uFE0F?\\s*');
  }

  function buildInlineRegex(map) {
    var keys = Object.keys(map).sort(function (a, b) {
      return b.length - a.length;
    });
    return new RegExp('(' + keys.map(escapeRegex).join('|') + ')\\uFE0F?', 'g');
  }

  var HEADING_RE = buildPrefixRegex(HEADING_MAP);
  var BLOCKQUOTE_RE = buildPrefixRegex(BLOCKQUOTE_MAP);
  var STATUS_RE = buildInlineRegex(STATUS_MAP);

  /* Build an SVG DOM element safely from the static ICONS path table. */
  function createIconElement(doc, name, tone, roleClass) {
    var pathMarkup = ICONS[name];
    if (!pathMarkup) return null;
    var svg = doc.createElementNS(SVG_NS, 'svg');
    var cls = 'paper-icon';
    if (roleClass) cls += ' ' + roleClass;
    if (tone) cls += ' paper-icon--' + tone;
    svg.setAttribute('class', cls);
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.55');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('data-icon', name);
    svg.innerHTML = pathMarkup;
    return svg;
  }

  function isSkippedNode(node, boundary) {
    var cur = node.nodeType === 1 ? node : node.parentNode;
    while (cur && cur !== boundary && cur.nodeType === 1) {
      if (SKIP_TAGS[cur.tagName]) return true;
      var cl = cur.classList;
      if (
        cl &&
        (cl.contains('mermaid') ||
          cl.contains('katex') ||
          cl.contains('paper-demo') ||
          cl.contains('demo-box') ||
          cl.contains('paper-icon'))
      ) {
        return true;
      }
      cur = cur.parentNode;
    }
    return false;
  }

  function firstVisibleTextNode(el) {
    var walker = el.ownerDocument.createTreeWalker(el, 4 /* SHOW_TEXT */);
    var node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      if (isSkippedNode(node, el)) continue;
      return node;
    }
    return null;
  }

  function replaceLeadingEmoji(el, map, regex, roleClass) {
    if (!el || el.querySelector(':scope > .paper-icon')) return false;
    var textNode = firstVisibleTextNode(el);
    if (!textNode) return false;
    var match = regex.exec(textNode.nodeValue);
    if (!match) return false;
    var entry = map[stripVS16(match[1])];
    if (!entry) return false;
    var svg = createIconElement(el.ownerDocument, entry[0], entry[1], roleClass);
    if (!svg) return false;

    var rest = textNode.nodeValue.slice(match[0].length);
    textNode.nodeValue = rest;
    textNode.parentNode.insertBefore(svg, textNode);
    if (!rest) textNode.parentNode.removeChild(textNode);
    return true;
  }

  function replaceStatusEmojis(container) {
    var doc = container.ownerDocument;
    var walker = doc.createTreeWalker(container, 4 /* SHOW_TEXT */);
    var targets = [];
    var node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue) continue;
      STATUS_RE.lastIndex = 0;
      if (!STATUS_RE.test(node.nodeValue)) continue;
      if (isSkippedNode(node, container)) continue;
      targets.push(node);
    }

    for (var i = 0; i < targets.length; i++) {
      var tn = targets[i];
      var text = tn.nodeValue;
      STATUS_RE.lastIndex = 0;
      var frag = doc.createDocumentFragment();
      var lastIdx = 0;
      var m;
      while ((m = STATUS_RE.exec(text))) {
        if (m.index > lastIdx) {
          frag.appendChild(doc.createTextNode(text.slice(lastIdx, m.index)));
        }
        var entry = STATUS_MAP[stripVS16(m[1])];
        var svg = entry ? createIconElement(doc, entry[0], entry[1], 'paper-icon--status') : null;
        if (svg) frag.appendChild(svg);
        else frag.appendChild(doc.createTextNode(m[0]));
        lastIdx = m.index + m[0].length;
      }
      if (lastIdx < text.length) {
        frag.appendChild(doc.createTextNode(text.slice(lastIdx)));
      }
      if (tn.parentNode) tn.parentNode.replaceChild(frag, tn);
    }
  }

  /* Replace inline "📖 [link]" note cross-reference prefixes in paragraphs / list items. */
  function replaceInlineNoteLinkBooks(container) {
    var doc = container.ownerDocument;
    var links = container.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      if (isSkippedNode(link, container)) continue;
      var prev = link.previousSibling;
      if (!prev || prev.nodeType !== 3) continue;
      var m = /📖\uFE0F?\s*$/.exec(prev.nodeValue);
      if (!m) continue;
      var svg = createIconElement(doc, 'book-open', 'muted', 'paper-icon--leading');
      if (!svg) continue;
      prev.nodeValue = prev.nodeValue.slice(0, m.index);
      link.parentNode.insertBefore(svg, link);
    }
  }

  function hydrate(container) {
    if (!container || container.dataset.paperIconsHydrated === '1') return 0;
    var count = 0;

    // 1. Headings H2 / H3 / H4
    var headings = container.querySelectorAll('h2, h3, h4');
    for (var i = 0; i < headings.length; i++) {
      if (replaceLeadingEmoji(headings[i], HEADING_MAP, HEADING_RE, 'paper-icon--heading')) {
        count++;
      }
    }

    // 2. Collapsible <summary> bars (📖 展开文字：...)
    var summaries = container.querySelectorAll('details > summary');
    for (var j = 0; j < summaries.length; j++) {
      if (replaceLeadingEmoji(summaries[j], HEADING_MAP, HEADING_RE, 'paper-icon--summary')) {
        count++;
      }
    }

    // 3. Meta blockquotes & Callout prefixes (📅 🏷️ 🩺 🔁 💡 ⚠️ 🎮 🔑 ...)
    var quoteBlocks = container.querySelectorAll('blockquote p, blockquote li');
    for (var k = 0; k < quoteBlocks.length; k++) {
      if (replaceLeadingEmoji(quoteBlocks[k], BLOCKQUOTE_MAP, BLOCKQUOTE_RE, 'paper-icon--leading')) {
        count++;
      }
    }

    // 4. Inline note cross-reference prefixes (📖 [Note](...))
    replaceInlineNoteLinkBooks(container);

    // 5. Global semantic status marks (✅ ❌ ⚠️ 🌟 ⭐ 🚧)
    replaceStatusEmojis(container);

    container.dataset.paperIconsHydrated = '1';
    return count;
  }

  var api = {
    ICONS: ICONS,
    HEADING_MAP: HEADING_MAP,
    BLOCKQUOTE_MAP: BLOCKQUOTE_MAP,
    STATUS_MAP: STATUS_MAP,
    hydrate: hydrate
  };

  root.PaperNoteIcons = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
