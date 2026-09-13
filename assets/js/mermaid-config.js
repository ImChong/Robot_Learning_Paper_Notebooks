/**
 * Shared Mermaid render settings for paper flowcharts and the home roadmap.
 * Inline diagrams use MERMAID_RENDER_SCALE; the lightbox re-renders from source
 * at MERMAID_LIGHTBOX_SCALE for sharper zoom (especially htmlLabels).
 */
(function () {
  'use strict';

  /** Inline / page render density (was effectively ~1.0 with useMaxWidth). */
  var MERMAID_RENDER_SCALE = 1.4;
  /** Extra density when opening the fullscreen lightbox. */
  var MERMAID_LIGHTBOX_SCALE = 1.85;

  function isMobileViewport() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(max-width: 600px)').matches
    );
  }

  function isIos() {
    if (typeof navigator === 'undefined') return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  /**
   * Kill-switch for the legacy plain-text math downgrade. iOS now renders
   * Mermaid math as native MathML (see getMermaidSiteConfig): KaTeX's HTML
   * output leans on position:relative offsets, which iOS WebKit paints at
   * the SVG origin inside foreignObject (the compositing-layer bug — same
   * class of issue as the roadmap-year opacity fix), while MathML creates
   * no layers. If MathML misbehaves on some WebKit build, revert this to
   * `return isIos();` to restore the mermaidMathToPlain downgrade below.
   */
  window.shouldUsePlainMermaidMath = function () {
    return false;
  };

  window.mermaidMathToPlain = function (tex) {
    return tex
      .replace(/\\pi_\{\\theta_\{old\}\}\s*\\leftarrow\s*\\pi_\\theta/g, 'π_old ← π_θ')
      .replace(/\\pi_\\theta,\s*\\,?\s*V_\\phi/g, 'π_θ, V_φ')
      .replace(
        /r_t\(\\theta\)=\\frac\{([^}]+)\}\{([^}]+)\}/g,
        'r_t(θ)=$1/$2'
      )
      .replace(
        /L\^\{CLIP\}=\\min\(r_t\\hat\{A\}_t,\\,\\mathrm\{clip\}\(r_t,0\.8,1\.2\)\\hat\{A\}_t\)/g,
        'L^CLIP=min(r_t·Â_t, clip·Â_t)'
      )
      .replace(/\\hat\{A\}_t/g, 'Â_t')
      .replace(/\\delta_t/g, 'δ_t')
      .replace(/\\gamma\\lambda/g, 'γλ')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\lambda/g, 'λ')
      .replace(/N \\times T/g, 'N×T')
      .replace(/\\min\(/g, 'min(')
      .replace(/\\mathrm\{clip\}/g, 'clip')
      .replace(/\\mid/g, '|')
      .replace(/\\leftarrow/g, '←')
      .replace(/\\theta/g, 'θ')
      .replace(/\\phi/g, 'φ')
      .replace(/\\pi/g, 'π')
      .replace(/\\,/g, ' ')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  window.prepareMermaidRenderSource = function (source) {
    if (!source || !window.shouldUsePlainMermaidMath()) return source;
    return source.replace(/\$\$([\s\S]*?)\$\$/g, function (_match, tex) {
      return window.mermaidMathToPlain(tex.trim());
    });
  };

  window.patchMermaidForeignObjects = function (root) {
    if (!isIos() && !isMobileViewport()) return;
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.mermaid svg foreignObject').forEach(function (fo) {
      var inner = fo.querySelector('.nodeLabel > div, .edgeLabel > div, .labelBkg');
      if (!inner) return;
      inner.style.setProperty('display', 'block', 'important');
      inner.style.setProperty('white-space', 'normal', 'important');
      inner.style.setProperty('max-width', 'min(280px, calc(100vw - 3rem))', 'important');
      inner.style.setProperty('box-sizing', 'border-box', 'important');
      var w = inner.scrollWidth;
      var h = inner.scrollHeight;
      if (w > 0) fo.setAttribute('width', String(Math.ceil(w)));
      if (h > 0) fo.setAttribute('height', String(Math.ceil(h)));
    });
  };

  /**
   * Roadmap 连线流动特效：为每条连线叠加一条虚线副本（overlay），由 CSS 把
   * 虚线沿路径从起点推向终点，形成「知识沿路线图流动」的观感。
   *
   * 用叠加而不是直接给原连线加 dash：原连线保持实线底色，箭头标记也只画一次
   * （overlay 去掉 marker-start/marker-end）。overlay 不吃指针事件，节点点击、
   * 灯箱缩放行为不受影响。重复调用是幂等的（中英切换 / 灯箱重渲染都会再调）。
   */
  window.attachRoadmapEdgeFlow = function (container) {
    if (!container || !container.querySelector) return;
    var svg = container.querySelector('svg');
    if (!svg) return;

    var paths = svg.querySelectorAll('g.edgePaths path, path.flowchart-link');
    var index = 0;
    Array.prototype.forEach.call(paths, function (path) {
      // Skip the overlays themselves and edges already decorated.
      if (path.hasAttribute('data-roadmap-flow')) return;
      if (path.hasAttribute('data-roadmap-flow-done')) return;
      path.setAttribute('data-roadmap-flow-done', '');

      var flow = path.cloneNode(false);
      flow.removeAttribute('id');
      flow.removeAttribute('data-roadmap-flow-done');
      flow.removeAttribute('marker-start');
      flow.removeAttribute('marker-end');
      flow.setAttribute('data-roadmap-flow', '');
      flow.setAttribute(
        'class',
        ((path.getAttribute('class') || '') + ' roadmap-edge-flow').trim()
      );
      // Stagger so parallel edges out of one node don't pulse in lockstep.
      flow.style.animationDelay = (((index % 5) * 0.24).toFixed(2)) + 's';
      index += 1;
      path.parentNode.insertBefore(flow, path.nextSibling);
    });
  };

  /** After roadmap SVG insert (incl. lang-cache swap), fix iOS foreignObject sizing
   *  and strip alpha/compositing styles from year labels. */
  window.patchRoadmapMermaidDom = function (container) {
    if (!container) return;
    if (typeof window.patchMermaidForeignObjects === 'function') {
      window.patchMermaidForeignObjects(container);
    }
    if (!isIos()) return;
    container.querySelectorAll('.roadmap-node-year').forEach(function (el) {
      el.style.removeProperty('opacity');
      el.style.removeProperty('filter');
      el.style.removeProperty('transform');
      el.style.removeProperty('-webkit-transform');
    });
  };

  function scaledFlowchart(scale) {
    var mobile = isMobileViewport();
    return {
      useMaxWidth: false,
      curve: 'basis',
      nodeSpacing: Math.round((mobile ? 36 : 50) * scale),
      rankSpacing: Math.round((mobile ? 40 : 50) * scale),
      wrappingWidth: mobile ? 150 : Math.round(200 * scale),
      diagramPadding: Math.round((mobile ? 12 : 20) * scale),
    };
  }

  function initDirective(scale) {
    return {
      fontSize: Math.round(16 * scale),
      htmlLabels: true,
      flowchart: scaledFlowchart(scale),
    };
  }

  window.MERMAID_RENDER_SCALE = MERMAID_RENDER_SCALE;
  window.MERMAID_LIGHTBOX_SCALE = MERMAID_LIGHTBOX_SCALE;

  /**
   * Preserve <br> line breaks when snapshotting Mermaid source from built HTML.
   *
   * Jekyll emits author-written `<br/>` as real <br> DOM nodes. We must restore
   * the literal `<br/>` tag (not a newline): flowcharts accept either form inside
   * quoted labels, but sequenceDiagram `participant … as Alias<br/>…` becomes a
   * hard parse error if the break is turned into a line split.
   */
  window.readMermaidBlockSource = function (el) {
    if (!el) return '';
    var stored = el.getAttribute('data-original-code');
    if (stored) return stored;
    var clone = el.cloneNode(true);
    clone.querySelectorAll('br').forEach(function (br) {
      br.replaceWith(document.createTextNode('<br/>'));
    });
    return clone.textContent.trim();
  };

  window.writeMermaidBlockSource = function (el, source) {
    if (!el) return;
    el.textContent = source || '';
  };

  /**
   * Mermaid htmlLabels embed text in SVG foreignObject. Default DOMPurify strips
   * XHTML inside foreignObject (leaving bare text and wrong dark-theme colors in
   * the lightbox). Sanitize SVG structure and foreignObject inner HTML separately.
   */
  window.sanitizeMermaidSvg = function (svgString) {
    if (!svgString) return '';
    if (typeof DOMPurify === 'undefined') return '';

    var foreignObjects = [];
    var protectedSvg = svgString.replace(
      /<foreignObject([^>]*)>([\s\S]*?)<\/foreignObject>/gi,
      function (_match, attrs, inner) {
        var id = foreignObjects.length;
        // mathMl profile: on iOS Mermaid emits math as native MathML
        // (forceLegacyMathML: false). DOMPurify ignores ALLOWED_TAGS /
        // ALLOWED_ATTR once USE_PROFILES is set, so extras go via ADD_*.
        // semantics/annotation are KaTeX's inert TeX-source carriers —
        // stripping them keeps their text and leaks raw TeX into the label.
        var safeInner = DOMPurify.sanitize(inner, {
          USE_PROFILES: { html: true, mathMl: true },
          ADD_TAGS: ['semantics', 'annotation'],
          ADD_ATTR: ['xmlns', 'encoding'],
        });
        foreignObjects.push({ inner: safeInner, id: id });
        // Put attributes on the placeholder so DOMPurify cleans them natively!
        return '<foreignObject data-fo-placeholder="' + id + '"' + attrs + '></foreignObject>';
      }
    );

    var sanitized = DOMPurify.sanitize(protectedSvg, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS: ['foreignObject'],
      ADD_ATTR: ['data-fo-placeholder'],
    });

    foreignObjects.forEach(function (fo) {
      sanitized = sanitized.replace(
        new RegExp(
          '(<foreignObject[^>]*data-fo-placeholder=["\']?' + fo.id + '["\']?[^>]*)></foreignObject>',
          'i'
        ),
        function(_match, startTag) {
          return startTag + '>' + fo.inner + '</foreignObject>';
        }
      );
    });

    return sanitized;
  };

  window.getMermaidSiteConfig = function (theme) {
    var mobile = isMobileViewport();
    var ios = isIos();
    var scale = mobile ? 1.05 : MERMAID_RENDER_SCALE;
    return {
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      fontSize: Math.round((mobile ? 14 : 16) * scale),
      htmlLabels: true,
      flowchart: scaledFlowchart(scale),
      securityLevel: 'strict',
      // iOS WebKit: native MathML — KaTeX HTML inside foreignObject trips the
      // compositing-layer bug (fragments fly to the SVG origin). Other
      // platforms keep KaTeX HTML rendering via the KaTeX stylesheet.
      forceLegacyMathML: !ios,
    };
  };

  /** Prepend a one-off init block for high-res lightbox renders. */
  window.buildMermaidLightboxGraph = function (source) {
    var text = (source || '').trim();
    if (!text) return '';
    text =
      typeof window.prepareMermaidRenderSource === 'function'
        ? window.prepareMermaidRenderSource(text)
        : text;
    return (
      '%%{init: ' +
      JSON.stringify(initDirective(MERMAID_LIGHTBOX_SCALE)) +
      '}%%\n' +
      text
    );
  };

  if (typeof document !== 'undefined' && isIos()) {
    document.documentElement.classList.add('ios');
  }
})();
