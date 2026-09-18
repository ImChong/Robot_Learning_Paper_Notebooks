/* Paper-page client-side enhancements.
 *
 * This file is included once per paper layout and self-initialises. It expects
 * the surrounding HTML to provide:
 *
 *   - <script type="application/json" id="paper-nav-data">{ baseurl, papers }</script>
 *     (rendered server-side from _data/roadmap_order.yml + site.baseurl)
 *   - #paper-body, #paper-nav, #toc-sidebar, #toc-nav, #sidebar-paper-nav, #sidebar-overlay
 */

(function () {
  'use strict';

  // ─── Paper navigation (prev/next) ─────────────────────────────────────────
  function initPaperNav() {
    var dataEl = document.querySelector('script#paper-nav-data');
    if (!dataEl) return;
    var navData;
    try {
      navData = JSON.parse(dataEl.textContent);
    } catch (e) {
      return;
    }
    var paperOrder = (navData && navData.papers) || [];
    var listLink = (navData && navData.listLink) || '/';
    if (!paperOrder.length) return;

    var currentPath = window.location.pathname;
    var currentIdx = -1;
    for (var i = 0; i < paperOrder.length; i++) {
      var url = paperOrder[i].url;
      if (currentPath.indexOf(url) !== -1 || url.indexOf(currentPath) !== -1) {
        currentIdx = i;
        break;
      }
    }
    if (currentIdx === -1) return;

    var nav = document.getElementById('paper-nav');
    if (!nav) return;

    var prev = currentIdx > 0 ? paperOrder[currentIdx - 1] : null;
    var next = currentIdx < paperOrder.length - 1 ? paperOrder[currentIdx + 1] : null;
    var isFirst = currentIdx === 0;
    var backText = isFirst ? '← 返回论文列表' : '返回论文列表';

    nav.innerHTML = '';
    if (prev) {
      var prevLink = document.createElement('a');
      prevLink.href = prev.url;
      prevLink.className = 'prev-link';
      prevLink.textContent = '← ' + prev.short;
      nav.appendChild(prevLink);
    }

    var backLinkEl = document.createElement('a');
    backLinkEl.href = listLink;
    backLinkEl.className = 'back-link';
    backLinkEl.textContent = backText;
    nav.appendChild(backLinkEl);

    if (next) {
      var nextLink = document.createElement('a');
      nextLink.href = next.url;
      nextLink.className = 'next-link';
      nextLink.textContent = next.short + ' →';
      nav.appendChild(nextLink);
    }

    var sidebarNav = document.getElementById('sidebar-paper-nav');
    if (sidebarNav) {
      sidebarNav.innerHTML = '';
      if (prev) {
        var sidebarPrevLink = document.createElement('a');
        sidebarPrevLink.href = prev.url;
        sidebarPrevLink.className = 'right-sidebar-link';
        sidebarPrevLink.textContent = '← ' + prev.short;
        sidebarNav.appendChild(sidebarPrevLink);
      }
      if (next) {
        var sidebarNextLink = document.createElement('a');
        sidebarNextLink.href = next.url;
        sidebarNextLink.className = 'right-sidebar-link';
        sidebarNextLink.textContent = next.short + ' →';
        sidebarNav.appendChild(sidebarNextLink);
      }
    }
  }

  // ─── Wrap tables for horizontal scroll ───────────────────────────────────
  function initTableWrappers() {
    var body = document.getElementById('paper-body');
    if (!body) return;
    body.querySelectorAll('table').forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains('table-wrapper')) return;
      var wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  // ─── Collapsed prose (<details class="paper-fold">) ───────────────────────
  //
  // Notes that carry a 🎬 explainer animation fold their prose away, so a TOC
  // link, an in-page anchor or a shared #hash can point at a heading that sits
  // inside a closed <details>: it is display:none, so its box has no position
  // and scrolling to it would land at the top of the page. Everything below
  // exists to make that navigation (and the demos inside a fold) behave.

  var foldObservers = [];

  /* Is this element inside a collapsed fold (or otherwise not rendered)?
   *
   * Chromium lays the content of a closed <details> out under
   * ``content-visibility: hidden``: offsetParent stays set and offsetTop
   * reports a position far past the end of the document, so the fold state has
   * to be read from the DOM. checkVisibility() would answer this, but it
   * returns false for *everything* before the first layout — which is exactly
   * when the TOC is built — so walk the ancestors instead. */
  function isHidden(el) {
    var node = el.parentElement;
    while (node) {
      if (node.tagName === 'DETAILS' && !node.open) return true;
      node = node.parentElement;
    }
    return el.offsetParent === null;
  }

  function onFoldToggle(fn) {
    foldObservers.push(fn);
  }

  /* Mermaid lays a diagram out from its container's width; one that was first
     drawn inside a closed fold can come back collapsed or blank, so re-run the
     page's renderer once for the fold that just opened. */
  var mermaidRefreshed = [];

  function refreshMermaidIn(details) {
    if (mermaidRefreshed.indexOf(details) !== -1) return;
    var diagrams = details.querySelectorAll('.mermaid');
    if (!diagrams.length) return;
    mermaidRefreshed.push(details);
    var stale = false;
    for (var i = 0; i < diagrams.length; i++) {
      var svg = diagrams[i].querySelector('svg');
      if (!svg || svg.getBoundingClientRect().width < 50) {
        stale = true;
        break;
      }
    }
    if (!stale) return;
    if (typeof window.mermaid === 'undefined' || typeof window.runMermaid !== 'function') return;
    window.requestAnimationFrame(function () {
      window.runMermaid();
    });
  }

  /* Open every <details> the node is nested in. Returns true if any opened. */
  function revealNode(node) {
    var opened = false;
    var el = node;
    while (el && el !== document.body) {
      if (el.tagName === 'DETAILS' && !el.open) {
        el.open = true;
        opened = true;
      }
      el = el.parentElement;
    }
    return opened;
  }

  function initFolds() {
    var body = document.getElementById('paper-body');
    if (!body) return;

    // `toggle` does not bubble — listen in the capture phase.
    document.addEventListener(
      'toggle',
      function (e) {
        var target = e.target;
        if (!target || target.tagName !== 'DETAILS') return;
        if (!body.contains(target)) return;
        // A canvas drawn inside a closed fold measured a zero-width parent, so
        // let the demos re-render themselves at their real width now.
        var kit = window.PaperDemoKit;
        if (kit && typeof kit.renderAll === 'function') kit.renderAll();
        if (target.open) refreshMermaidIn(target);
        for (var i = 0; i < foldObservers.length; i++) {
          try {
            foldObservers[i]();
          } catch (err) {
            /* a broken observer must not break the fold */
          }
        }
      },
      true
    );

    // A #hash aimed inside a fold: on load, and on every later hash change.
    function revealHash() {
      var hash = window.location.hash;
      if (!hash || hash.length < 2) return;
      var target;
      try {
        target = document.querySelector(hash);
      } catch (err) {
        return;
      }
      if (!target || !body.contains(target)) return;
      if (!revealNode(target)) return;
      // The fold just opened, so the target only now has a position.
      window.requestAnimationFrame(function () {
        var top = target.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: top });
      });
    }

    revealHash();
    window.addEventListener('hashchange', revealHash);

    // In-page links in the note itself (the "本文内嵌 N 个演示" lists at the top).
    body.addEventListener('click', function (e) {
      var link = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!link || !body.contains(link)) return;
      var hash = link.getAttribute('href');
      if (!hash || hash.length < 2) return;
      var target;
      try {
        target = document.querySelector(hash);
      } catch (err) {
        return;
      }
      if (target) revealNode(target);
    });
  }

  /* "Expand all / collapse all" for notes with more than a couple of folds:
     one click to read (or Ctrl+F) the whole note, one to get the outline back. */
  function initFoldToggleAll() {
    var body = document.getElementById('paper-body');
    var wrapper = document.querySelector('#toc-sidebar .toc-wrapper');
    if (!body || !wrapper) return;
    var folds = body.querySelectorAll('details.paper-fold');
    if (folds.length < 3) return;

    var zh = document.documentElement.getAttribute('data-lang-mode') === 'zh';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toc-fold-toggle';
    btn.setAttribute('data-en', 'Expand all text');
    btn.setAttribute('data-zh', '展开全部文字');
    btn.textContent = zh ? '展开全部文字' : 'Expand all text';

    function allOpen() {
      for (var i = 0; i < folds.length; i++) {
        if (!folds[i].open) return false;
      }
      return true;
    }

    function syncLabel() {
      var collapse = allOpen();
      btn.setAttribute('data-en', collapse ? 'Collapse all text' : 'Expand all text');
      btn.setAttribute('data-zh', collapse ? '全部折叠' : '展开全部文字');
      var useZh = document.documentElement.getAttribute('data-lang-mode') === 'zh';
      btn.textContent = useZh ? btn.getAttribute('data-zh') : btn.getAttribute('data-en');
      btn.setAttribute('aria-pressed', collapse ? 'true' : 'false');
    }

    btn.addEventListener('click', function () {
      var open = !allOpen();
      for (var i = 0; i < folds.length; i++) folds[i].open = open;
      syncLabel();
    });

    onFoldToggle(syncLabel);
    var title = wrapper.querySelector('.toc-title');
    if (title && title.nextSibling) {
      wrapper.insertBefore(btn, title.nextSibling);
    } else {
      wrapper.appendChild(btn);
    }
    syncLabel();
  }

  // ─── Build TOC + scroll-spy active highlighting ───────────────────────────
  function initToc() {
    var body = document.getElementById('paper-body');
    var nav = document.getElementById('toc-nav');
    if (!body || !nav) return;

    var headings = body.querySelectorAll('h2, h3');
    if (headings.length === 0) {
      var emptySidebar = document.getElementById('toc-sidebar');
      if (emptySidebar) emptySidebar.style.display = 'none';
      return;
    }

    var ul = document.createElement('ul');
    ul.className = 'toc-list';

    headings.forEach(function (h, i) {
      if (!h.id) h.id = 'heading-' + i;
      var li = document.createElement('li');
      li.className = 'toc-item toc-' + h.tagName.toLowerCase();
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      a.className = 'toc-link';
      li.appendChild(a);
      ul.appendChild(li);
    });
    nav.appendChild(ul);

    var links = nav.querySelectorAll('.toc-link');
    var headingArr = Array.from(headings);
    var sidebar = document.getElementById('toc-sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    /* Keep in sync with style.css TOC drawer breakpoint (sticky sidebar clips below 1440px). */
    var mobileQuery = window.matchMedia('(max-width: 1439px)');

    function closeMobileSidebar() {
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('show');
      document.body.style.overflow = '';
    }

    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var hash = link.getAttribute('href');
        if (!hash || hash.charAt(0) !== '#') return;
        var target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        if (mobileQuery.matches) closeMobileSidebar();
        window.history.replaceState(null, '', hash);
        var headerOffset = 90;
        // The heading may live inside a collapsed fold; open it first, then
        // measure, otherwise the jump lands wherever the hidden box reads.
        var wasClosed = revealNode(target);
        var scrollToTarget = function () {
          var targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;
          window.scrollTo({ top: targetTop, behavior: wasClosed ? 'auto' : 'smooth' });
        };
        if (wasClosed) {
          window.requestAnimationFrame(scrollToTarget);
        } else {
          scrollToTarget();
        }
      });
    });

    var lastActive = -1;
    // ⚡ Bolt Optimization: Cache layout positions to prevent layout thrashing on scroll
    var cachedPositions = [];

    function updatePositions() {
      cachedPositions = headingArr.map(function (h) {
        // A heading inside a closed fold has no usable position — skip it so
        // the scroll-spy highlights the section the reader can actually see.
        return isHidden(h) ? null : h.offsetTop;
      });
    }

    updatePositions();
    onFoldToggle(updatePositions);

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(updatePositions);
      ro.observe(document.body);
    } else {
      window.addEventListener('resize', function() {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(updatePositions, 150);
      });
    }

    function updateActive() {
      var scrollPos = window.scrollY + 100;
      var current = -1;
      for (var i = 0; i < cachedPositions.length; i++) {
        if (cachedPositions[i] !== null && cachedPositions[i] <= scrollPos) current = i;
      }
      // Only update DOM if the active section actually changed.
      if (current !== lastActive) {
        // ⚡ Bolt Optimization: O(1) targeted DOM class toggling instead of O(N) loop
        if (lastActive >= 0 && links[lastActive]) {
          links[lastActive].classList.remove('active');
        }
        if (current >= 0 && links[current]) {
          links[current].classList.add('active');
        }
        lastActive = current;
      }
    }

    var ticking = false;
    // Throttle scroll handler with requestAnimationFrame to avoid layout thrashing.
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          updateActive();
          ticking = false;
        });
        ticking = true;
      }
    });
    updateActive();
  }

  // ─── Mermaid block detection + line-numbered code rebuild ────────────────
  function buildMermaidDiv(source) {
    var code = source.trim();
    var div = document.createElement('div');
    div.className = 'mermaid';
    if (typeof window.writeMermaidBlockSource === 'function') {
      window.writeMermaidBlockSource(div, code);
    } else {
      div.textContent = code;
    }
    div.setAttribute('data-original-code', code);
    return div;
  }

  function transformMermaid() {
    document.querySelectorAll('pre > code.language-mermaid').forEach(function (codeEl) {
      var pre = codeEl.parentElement;
      if (!pre || pre.classList.contains('mermaid-processed')) return;
      var mermaidDiv = buildMermaidDiv(codeEl.textContent);
      pre.parentNode.insertBefore(mermaidDiv, pre);
      pre.style.display = 'none';
      pre.classList.add('mermaid-processed');
    });

    document.querySelectorAll('div.highlighter-rouge').forEach(function (outer) {
      var codeEl = outer.querySelector('code');
      if (!codeEl) return;
      var text = codeEl.textContent.trim();
      var isMermaid =
        outer.classList.contains('language-mermaid') ||
        codeEl.classList.contains('language-mermaid') ||
        codeEl.classList.contains('mermaid') ||
        text.startsWith('graph ') ||
        text.startsWith('flowchart ') ||
        text.startsWith('sequenceDiagram') ||
        text.startsWith('gantt') ||
        text.startsWith('classDiagram');
      if (isMermaid && !outer.classList.contains('mermaid-processed')) {
        var mermaidDiv = buildMermaidDiv(codeEl.textContent);
        outer.parentNode.insertBefore(mermaidDiv, outer);
        outer.style.display = 'none';
        outer.classList.add('mermaid-processed');
      }
    });
  }

  function normalizeRougeLineBreaks(html) {
    // Rouge/kramdown often emits "\n</span>" (newline inside the span). Naive
    // HTML string splitting then breaks tags across rows and clips highlighted
    // code (e.g. "def" → "de"). Move the newline after the closing tag.
    return html.replace(/\n(\s*<\/span>)/g, '$1\n');
  }

  function splitByNewline(html) {
    // ⚡ Bolt Optimization: Use native indexOf for fast string scanning instead
    // of character-by-character loops, leading to an order of magnitude faster parsing
    var lines = [],
      lastIdx = 0,
      inTag = false,
      i = 0;
    while (i < html.length) {
      if (!inTag) {
        var nextTag = html.indexOf('<', i);
        var nextNl = html.indexOf('\n', i);

        if (nextNl !== -1 && (nextTag === -1 || nextNl < nextTag)) {
          lines.push(html.slice(lastIdx, nextNl));
          lastIdx = nextNl + 1;
          i = nextNl + 1;
        } else if (nextTag !== -1) {
          inTag = true;
          i = nextTag + 1;
        } else {
          break;
        }
      } else {
        var nextEnd = html.indexOf('>', i);
        if (nextEnd !== -1) {
          inTag = false;
          i = nextEnd + 1;
        } else {
          break;
        }
      }
    }
    if (lastIdx < html.length) {
      lines.push(html.slice(lastIdx));
    }
    return lines;
  }

  function rebuildWithLineNumbers() {
    transformMermaid();
    document.querySelectorAll('div.highlighter-rouge:not(.mermaid-processed)').forEach(function (outer) {
      var code = outer.querySelector('pre code');
      if (!code) return;
      var html = normalizeRougeLineBreaks(code.innerHTML);
      if (html.endsWith('\n')) html = html.slice(0, -1);
      var lines = splitByNewline(html);

      // ⚡ Bolt Optimization: Construct HTML string instead of granular DOM manipulation
      // (document.createElement/appendChild) for large performance gains on long code blocks
      var resultHtml = '<div class="code-block highlight">';
      for (var i = 0; i < lines.length; i++) {
        resultHtml += '<div class="code-row"><span class="code-ln">' + (i + 1) + '</span><span class="code-cell">' + lines[i] + '</span></div>';
      }
      resultHtml += '</div>';

      outer.innerHTML = resultHtml;
    });

    if (typeof mermaid !== 'undefined') {
      var theme = document.documentElement.getAttribute('data-theme') || 'dark';
      if (typeof initMermaid === 'function') {
        initMermaid(theme);
      } else {
        mermaid.run();
      }
    }
  }

  // ─── Keep “（`fn`）” in headings on one line (mobile word-break splits otherwise) ─
  function wrapHeadingInlineCodePhrases() {
    var body = document.getElementById('paper-body');
    if (!body) return;
    body.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(function (h) {
      var codes = h.querySelectorAll(':scope > code');
      for (var i = 0; i < codes.length; i++) {
        var code = codes[i];
        if (code.closest('.heading-code-phrase')) continue;
        var prev = code.previousSibling;
        var next = code.nextSibling;
        if (!prev || prev.nodeType !== Node.TEXT_NODE) continue;
        if (!next || next.nodeType !== Node.TEXT_NODE) continue;
        var prevText = prev.textContent;
        var nextText = next.textContent;
        var openIdx = Math.max(prevText.lastIndexOf('（'), prevText.lastIndexOf('('));
        if (openIdx === -1) continue;
        var openChar = prevText.charAt(openIdx);
        var closeChar = openChar === '（' ? '）' : ')';
        if (!nextText.startsWith(closeChar)) continue;

        var span = document.createElement('span');
        span.className = 'heading-code-phrase';
        // Keep the word before “（” on the same line as the parenthetical (e.g. “策略（fn）”).
        var colonIdx = prevText.lastIndexOf('：');
        var wrapStart =
          colonIdx >= 0 && colonIdx < openIdx ? colonIdx + 1 : openIdx;
        prev.textContent = prevText.slice(0, wrapStart);
        span.appendChild(document.createTextNode(prevText.slice(wrapStart)));
        span.appendChild(code);
        span.appendChild(document.createTextNode(closeChar));
        if (nextText.length > 1) {
          next.textContent = nextText.slice(1);
        } else {
          h.removeChild(next);
        }
        h.insertBefore(span, prev.nextSibling);
      }
    });
  }

  // ─── Insert <wbr> in long inline code so paths break at /, then ── ────────
  // Without these hints the mobile parent's ``word-break: break-word`` shatters
  // identifiers at arbitrary positions inside a filename. Two-stage hinting:
  //   1. ``/`` → preferred break (between path segments).
  //   2. ``.`` and ``_`` and ``-`` → secondary breaks only when a single segment
  //      between slashes is itself too long to fit.
  // Anything still longer than the line falls back to ``overflow-wrap: anywhere``
  // (any-character break) so it cannot overflow the viewport.
  function applyWbrSplit(code, parts) {
    while (code.firstChild) code.removeChild(code.firstChild);
    for (var j = 0; j < parts.length; j++) {
      if (j > 0) code.appendChild(document.createElement('wbr'));
      code.appendChild(document.createTextNode(parts[j]));
    }
    code.dataset.wbrApplied = '1';
  }

  function splitLongSegment(seg) {
    // For a single path segment with no slashes, allow secondary breaks at
    // ``.``, ``_``, ``-`` boundaries (kept with the next chunk).
    return seg.split(/(?=[._\-])/);
  }

  function addInlineCodeBreakHints() {
    var paperBody = document.getElementById('paper-body');
    if (!paperBody) return;
    // ⚡ Bolt Optimization: Offload filtering to the browser's native C++ selector engine
    // rather than calling `.closest()` inside a loop for every single `<code>` node,
    // avoiding O(N) DOM tree traversals.
    var codes = paperBody.querySelectorAll('code:not(pre code, .heading-code-phrase code, h1 code, h2 code, h3 code, h4 code, h5 code, h6 code)');
    for (var i = 0; i < codes.length; i++) {
      var code = codes[i];
      // Skip if already processed.
      if (code.dataset.wbrApplied === '1') continue;
      var text = code.textContent;
      if (!text || text.length < 16) continue;
      // Only act when the token has no whitespace (paths, identifiers, URLs).
      if (/\s/.test(text)) continue;
      // Don't touch code that already contains child elements (syntax-highlighted spans).
      if (code.firstElementChild) continue;

      // Primary split at ``/`` (kept with the next chunk: ``foo/bar`` →
      // ``foo`` + ``<wbr>`` + ``/bar``). Path segments stay whole — a 28-char
      // filename folds to its own line before splitting internally. Only when
      // a single segment is longer than ~30 characters (true edge case, won't
      // fit on a mobile line) do we add secondary ``.``/``_``/``-`` breaks so
      // it can fold without overflowing.
      var slashParts = text.split(/(?=\/)/);
      var parts = [];
      for (var k = 0; k < slashParts.length; k++) {
        var seg = slashParts[k];
        if (seg.length > 30) {
          var sub = splitLongSegment(seg);
          for (var m = 0; m < sub.length; m++) parts.push(sub[m]);
        } else {
          parts.push(seg);
        }
      }
      if (parts.length < 2) continue;
      applyWbrSplit(code, parts);
    }
  }

  function init() {
    initPaperNav();
    initTableWrappers();
    initFolds();
    initToc();
    initFoldToggleAll();
    rebuildWithLineNumbers();
    wrapHeadingInlineCodePhrases();
    addInlineCodeBreakHints();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
