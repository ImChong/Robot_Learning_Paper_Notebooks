/**
 * Click any rendered Mermaid diagram to open a fullscreen lightbox.
 * Pan with left mouse / one finger; pinch or mouse wheel to zoom; Esc to close.
 */
(function () {
  'use strict';

  var MIN_SCALE = 0.2;
  var MAX_SCALE = 6;

  var lightbox = null;
  var viewport = null;
  var stage = null;
  var hintEl = null;
  var lightboxRenderSeq = 0;
  var pointers = new Map();
  var pinchSnapshot = null;
  var singlePanLast = null;

  var state = {
    scale: 1,
    x: 0,
    y: 0,
  };
  var transformTicking = false;

  function clampScale(scale) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  }

  function ensureLightbox() {
    if (lightbox) return lightbox;

    lightbox = document.createElement('div');
    lightbox.className = 'mermaid-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Mermaid diagram viewer');
    lightbox.hidden = true;

    var backdrop = document.createElement('div');
    backdrop.className = 'mermaid-lightbox__backdrop';
    backdrop.setAttribute('data-mermaid-lightbox-close', '');

    var panel = document.createElement('div');
    panel.className = 'mermaid-lightbox__panel';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'mermaid-lightbox__close';
    closeBtn.setAttribute('data-mermaid-lightbox-close', '');
    closeBtn.setAttribute('aria-label', '关闭');
    closeBtn.textContent = '×';

    hintEl = document.createElement('p');
    hintEl.className = 'mermaid-lightbox__hint';
    hintEl.textContent = '拖拽平移 · 滚轮/双指缩放 · Esc 关闭';

    viewport = document.createElement('div');
    viewport.className = 'mermaid-lightbox__viewport';

    stage = document.createElement('div');
    stage.className = 'mermaid-lightbox__stage';
    viewport.appendChild(stage);

    panel.appendChild(closeBtn);
    panel.appendChild(hintEl);
    panel.appendChild(viewport);
    lightbox.appendChild(backdrop);
    lightbox.appendChild(panel);
    document.body.appendChild(lightbox);

    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) close();
    });

    panel.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerUp);
    viewport.addEventListener('wheel', onWheel, { passive: false });

    document.addEventListener('keydown', onKeyDown);

    return lightbox;
  }

  function applyTransform(immediate) {
    if (!stage) return;
    if (immediate) {
      stage.style.transform =
        'translate(calc(-50% + ' +
        state.x +
        'px), calc(-50% + ' +
        state.y +
        'px)) scale(' +
        state.scale +
        ')';
      return;
    }
    if (!transformTicking) {
      window.requestAnimationFrame(function () {
        if (!stage) return;
        stage.style.transform =
          'translate(calc(-50% + ' +
          state.x +
          'px), calc(-50% + ' +
          state.y +
          'px)) scale(' +
          state.scale +
          ')';
        transformTicking = false;
      });
      transformTicking = true;
    }
  }

  function measureSvg(svg) {
    var viewBox = svg.viewBox && svg.viewBox.baseVal;
    if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
      return { width: viewBox.width, height: viewBox.height };
    }
    var rect = svg.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { width: rect.width, height: rect.height };
    }
    var w = parseFloat(svg.getAttribute('width'));
    var h = parseFloat(svg.getAttribute('height'));
    if (w > 0 && h > 0) return { width: w, height: h };
    return { width: 800, height: 600 };
  }

  /** Mermaid often sets width="100%" + max-width; that collapses to 0×0 outside .mermaid. */
  function cloneSvgForLightbox(svg) {
    var clone = svg.cloneNode(true);
    var size = measureSvg(svg);
    clone.removeAttribute('width');
    clone.removeAttribute('height');
    clone.style.cssText = '';
    clone.style.width = size.width + 'px';
    clone.style.height = size.height + 'px';
    clone.style.maxWidth = 'none';
    clone.classList.add('mermaid-lightbox__svg');
    return clone;
  }

  function fitToViewport(svg) {
    var size = measureSvg(svg);
    var pad = 48;
    var vw = Math.max(viewport.clientWidth - pad, 200);
    var vh = Math.max(viewport.clientHeight - pad, 200);
    var fit = Math.min(vw / size.width, vh / size.height);
    state.scale = clampScale(fit);
    state.x = 0;
    state.y = 0;
    applyTransform(true);
  }

  /** Hide stage until fitToViewport runs — avoids scale(1) flash. */
  function setStagePreparing(preparing) {
    if (!stage) return;
    stage.classList.toggle('is-preparing', !!preparing);
  }

  function scheduleFitToViewport(svg, done) {
    function run() {
      fitToViewport(svg);
      setStagePreparing(false);
      if (typeof done === 'function') done();
    }
    if (viewport && viewport.clientWidth > 0 && viewport.clientHeight > 0) {
      run();
      return;
    }
    requestAnimationFrame(run);
  }

  function resetPointerState() {
    pointers.clear();
    pinchSnapshot = null;
    singlePanLast = null;
    if (viewport) {
      viewport.classList.remove('is-dragging', 'is-pinching');
    }
  }

  function pointerPoint(e) {
    return { x: e.clientX, y: e.clientY };
  }

  function viewportFocal(clientX, clientY) {
    var vr = viewport.getBoundingClientRect();
    return {
      x: clientX - (vr.left + vr.width / 2),
      y: clientY - (vr.top + vr.height / 2),
    };
  }

  function getPointerPair() {
    var pts = Array.from(pointers.values());
    return [pts[0], pts[1]];
  }

  function pinchDistance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function pinchMidpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function beginPinch() {
    var pair = getPointerPair();
    var mid = pinchMidpoint(pair[0], pair[1]);
    var focal = viewportFocal(mid.x, mid.y);
    pinchSnapshot = {
      dist: pinchDistance(pair[0], pair[1]),
      scale: state.scale,
      x: state.x,
      y: state.y,
      focalX: focal.x,
      focalY: focal.y,
    };
    singlePanLast = null;
    viewport.classList.add('is-pinching');
    viewport.classList.remove('is-dragging');
  }

  function setScaleAtFocal(focalX, focalY, newScale) {
    var contentX = (focalX - state.x) / state.scale;
    var contentY = (focalY - state.y) / state.scale;
    state.scale = clampScale(newScale);
    state.x = focalX - contentX * state.scale;
    state.y = focalY - contentY * state.scale;
    applyTransform();
  }

  function updatePinch() {
    if (!pinchSnapshot || pointers.size < 2) return;
    var pair = getPointerPair();
    var mid = pinchMidpoint(pair[0], pair[1]);
    var dist = pinchDistance(pair[0], pair[1]);
    if (pinchSnapshot.dist < 1) return;

    var ratio = dist / pinchSnapshot.dist;
    var newScale = clampScale(pinchSnapshot.scale * ratio);
    var focal = viewportFocal(mid.x, mid.y);
    var contentX = (pinchSnapshot.focalX - pinchSnapshot.x) / pinchSnapshot.scale;
    var contentY = (pinchSnapshot.focalY - pinchSnapshot.y) / pinchSnapshot.scale;

    state.scale = newScale;
    state.x = focal.x - contentX * state.scale;
    state.y = focal.y - contentY * state.scale;
    applyTransform();
  }

  function wheelScaleFactor(e) {
    var delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 16;
    else if (e.deltaMode === 2) delta *= Math.max(viewport.clientHeight, 1);
    return Math.exp(-delta * 0.002);
  }

  function onWheel(e) {
    if (!lightbox || lightbox.hidden) return;
    e.preventDefault();
    var focal = viewportFocal(e.clientX, e.clientY);
    setScaleAtFocal(focal.x, focal.y, state.scale * wheelScaleFactor(e));
  }

  function sanitizeMermaidSvg(svgString) {
    if (typeof window.sanitizeMermaidSvg === 'function') {
      return window.sanitizeMermaidSvg(svgString);
    }
    if (typeof DOMPurify !== 'undefined') {
      return DOMPurify.sanitize(svgString, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['foreignObject'],
      });
    }
    return '';
  }

  function mountLightboxSvg(svgString) {
    stage.innerHTML = sanitizeMermaidSvg(svgString);
    var svg = stage.querySelector('svg');
    if (!svg) return null;
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.cssText = '';
    svg.style.maxWidth = 'none';
    svg.classList.add('mermaid-lightbox__svg');
    var size = measureSvg(svg);
    svg.style.width = size.width + 'px';
    svg.style.height = size.height + 'px';
    return svg;
  }

  function openWithSvgClone(sourceEl) {
    var svg = sourceEl.querySelector('svg');
    if (!svg) return false;
    setStagePreparing(true);
    var clone = cloneSvgForLightbox(svg);
    stage.innerHTML = '';
    stage.appendChild(clone);
    scheduleFitToViewport(clone);
    return true;
  }

  function swapLightboxSvg(svgString, sourceEl) {
    setStagePreparing(true);
    var mounted = mountLightboxSvg(svgString);
    if (!mounted) {
      if (!stage.querySelector('svg')) {
        openWithSvgClone(sourceEl);
      } else {
        setStagePreparing(false);
      }
      return false;
    }
    scheduleFitToViewport(mounted);
    return true;
  }

  function open(sourceEl) {
    var svg = sourceEl.querySelector('svg');
    if (!svg) return;

    ensureLightbox();
    resetPointerState();
    lightbox.hidden = false;
    lightbox.classList.add('is-open');
    document.body.classList.add('mermaid-lightbox-open');

    if (!openWithSvgClone(sourceEl)) {
      setStagePreparing(false);
      return;
    }

    attachRoadmapLinksInLightbox(sourceEl);

    var sourceCode = sourceEl.getAttribute('data-original-code');
    var canHiResRender =
      sourceCode &&
      typeof mermaid !== 'undefined' &&
      typeof mermaid.render === 'function';

    if (!canHiResRender) return;

    var renderSeq = ++lightboxRenderSeq;
    stage.setAttribute('aria-busy', 'true');

    var graphText =
      typeof window.buildMermaidLightboxGraph === 'function'
        ? window.buildMermaidLightboxGraph(sourceCode)
        : sourceCode.trim();
    var renderId = 'mermaid-lightbox-' + renderSeq;

    Promise.resolve(mermaid.render(renderId, graphText))
      .then(function (result) {
        if (renderSeq !== lightboxRenderSeq || lightbox.hidden) return;
        stage.removeAttribute('aria-busy');
        if (swapLightboxSvg(result.svg, sourceEl)) {
          if (typeof window.patchMermaidForeignObjects === 'function') {
            window.patchMermaidForeignObjects(stage);
          }
          attachRoadmapLinksInLightbox(sourceEl);
        }
      })
      .catch(function () {
        if (renderSeq !== lightboxRenderSeq || lightbox.hidden) return;
        stage.removeAttribute('aria-busy');
        setStagePreparing(false);
      });
  }

  function close() {
    if (!lightbox || lightbox.hidden) return;
    lightboxRenderSeq += 1;
    lightbox.hidden = true;
    lightbox.classList.remove('is-open');
    document.body.classList.remove('mermaid-lightbox-open');
    resetPointerState();
    if (stage) {
      stage.innerHTML = '';
      stage.removeAttribute('aria-busy');
      stage.classList.remove('is-preparing');
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && lightbox && !lightbox.hidden) {
      e.preventDefault();
      close();
    }
  }

  function onPointerDown(e) {
    if (!lightbox || lightbox.hidden) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    pointers.set(e.pointerId, pointerPoint(e));
    viewport.setPointerCapture(e.pointerId);

    if (pointers.size === 2) {
      beginPinch();
    } else if (pointers.size === 1) {
      singlePanLast = pointerPoint(e);
      viewport.classList.add('is-dragging');
    }

    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!lightbox || lightbox.hidden || !pointers.has(e.pointerId)) return;

    pointers.set(e.pointerId, pointerPoint(e));

    if (pointers.size >= 2) {
      if (!pinchSnapshot) beginPinch();
      updatePinch();
      e.preventDefault();
      return;
    }

    if (pointers.size === 1 && singlePanLast) {
      var cur = pointerPoint(e);
      state.x += cur.x - singlePanLast.x;
      state.y += cur.y - singlePanLast.y;
      singlePanLast = cur;
      applyTransform();
      e.preventDefault();
    }
  }

  function onPointerUp(e) {
    if (!pointers.has(e.pointerId)) return;

    pointers.delete(e.pointerId);
    try {
      viewport.releasePointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }

    if (pointers.size < 2) {
      pinchSnapshot = null;
      viewport.classList.remove('is-pinching');
    }

    if (pointers.size === 0) {
      singlePanLast = null;
      viewport.classList.remove('is-dragging');
    } else if (pointers.size === 1) {
      singlePanLast = Array.from(pointers.values())[0];
      viewport.classList.add('is-dragging');
    }
  }

  function isRoadmapNodeClick(target) {
    return !!(target && target.closest && target.closest('g.roadmap-node-link'));
  }

  function findMermaidTarget(target) {
    if (!target || !target.closest) return null;
    var el = target.closest('.mermaid');
    if (!el || !el.querySelector('svg')) return null;
    if (el.id === 'roadmap-mermaid' && isRoadmapNodeClick(target)) return null;
    return el;
  }

  function attachRoadmapLinksInLightbox(sourceEl) {
    if (sourceEl.id !== 'roadmap-mermaid' || !stage) return;
    if (typeof window.attachRoadmapNodeLinks === 'function') {
      window.attachRoadmapNodeLinks(stage);
    }
    if (typeof window.attachRoadmapEdgeFlow === 'function') {
      window.attachRoadmapEdgeFlow(stage);
    }
  }

  document.addEventListener(
    'click',
    function (e) {
      if (lightbox && !lightbox.hidden) return;
      var mermaid = findMermaidTarget(e.target);
      if (!mermaid) return;
      e.preventDefault();
      open(mermaid);
    },
    true
  );

  new MutationObserver(function () {
    if (lightbox && !lightbox.hidden) close();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
})();
