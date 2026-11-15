/* 论文笔记悬浮预览卡片：
 * 鼠标悬停（或键盘聚焦）在首页论文卡片（.paper-card）、更新记录链接、
 * 或任意笔记正文中的论文超链接上时，弹出对应论文的详情预览浮层。
 *
 * - 路线图节点（.tt-node）与卡片（#roadmap-node-card）已有专属悬浮卡片，此处跳过；
 * - 鼠标悬停在卡片内部的笔记健康度六格小条（.paper-health）上时，让位给 note-health.js 的逐项清单；
 * - 预览数据来自 assets/data/paper-previews.json，仅在首次悬停/聚焦论文链接时按需拉取并缓存；
 * - 浮层本身 pointer-events: none，不遮挡点击跳转。
 */
(function () {
  'use strict';

  var scriptEl = document.currentScript || document.querySelector('script[data-previews-url]');
  if (!scriptEl) return;

  var PREVIEWS_URL = scriptEl.getAttribute('data-previews-url');
  if (!PREVIEWS_URL) return;

  var BASE = (scriptEl.getAttribute('data-baseurl') || '').replace(/\/+$/, '');
  var HEALTH_MAX = parseInt(scriptEl.getAttribute('data-health-max'), 10) || 6;
  var HOVER_DELAY_MS = 120;

  var previews = null;
  var fetchPromise = null;
  var card = null;
  var currentAnchor = null;
  var currentInfo = null;
  var pendingAnchor = null;
  var hoverTimer = 0;

  function isZh() {
    return document.documentElement.getAttribute('data-lang-mode') === 'zh';
  }

  function normalizePath(pathname) {
    var path = pathname || '/';
    try {
      path = decodeURIComponent(path);
    } catch (e) { /* keep raw pathname if malformed */ }
    if (BASE && path.indexOf(BASE + '/') === 0) {
      path = path.slice(BASE.length);
    }
    if (path.charAt(0) !== '/') path = '/' + path;
    return path;
  }

  var currentPagePath = normalizePath(window.location.pathname);

  function resolvePaperPath(anchor) {
    if (!anchor || anchor.tagName !== 'A' || !anchor.hasAttribute('href')) return null;
    if (anchor.closest('.tt-node, #roadmap-node-card, #paper-preview-card')) return null;
    if (anchor.origin !== window.location.origin) return null;
    var path = normalizePath(anchor.pathname);
    if (path === currentPagePath) return null;
    if (anchor.classList.contains('paper-card')) return path;
    if (path.indexOf('/papers/') === 0 && /\.html$/i.test(path)) return path;
    return null;
  }

  function loadPreviews() {
    if (previews) return Promise.resolve(previews);
    if (fetchPromise) return fetchPromise;
    fetchPromise = fetch(PREVIEWS_URL, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        previews = data && typeof data === 'object' ? data : {};
        return previews;
      })
      .catch(function () {
        fetchPromise = null;
        return null;
      });
    return fetchPromise;
  }

  function cardPart(parent, tag, className, text) {
    var el = document.createElement(tag);
    el.className = className;
    if (text != null) el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  function formatDuration(seconds, zh) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    if (zh) return (m ? m + ' 分 ' : '') + s + ' 秒';
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function fillCard(info) {
    var zh = isZh();
    card.textContent = '';
    var body = cardPart(card, 'div', 'roadmap-node-card__body');

    var eyebrow = [zh ? info.zc || info.c : info.c, zh ? info.zd || info.d : info.d]
      .filter(Boolean)
      .join(' · ');
    if (eyebrow) cardPart(body, 'div', 'roadmap-node-card__eyebrow', eyebrow);

    var title = (zh ? info.zt || info.t : info.t) || '';
    var subtitle = zh ? info.t : info.zt;
    if (title) cardPart(body, 'div', 'roadmap-node-card__title', title);
    if (subtitle && subtitle !== title) cardPart(body, 'div', 'roadmap-node-card__subtitle', subtitle);

    if (typeof info.hs === 'number') {
      var row = cardPart(body, 'div', 'roadmap-node-card__health');
      var badge = cardPart(row, 'span', 'paper-health paper-health--' + info.hs);
      badge.setAttribute('aria-hidden', 'true');
      var bar = cardPart(badge, 'span', 'paper-health-bar');
      for (var i = 1; i <= HEALTH_MAX; i++) {
        cardPart(bar, 'i', i <= info.hs ? 'is-on' : '');
      }
      var healthLabel = zh ? info.zhl : info.hl;
      if (healthLabel) cardPart(row, 'span', 'roadmap-node-card__health-text', healthLabel);
    }

    if (info.s) {
      var summary = cardPart(body, 'p', 'roadmap-node-card__summary', info.s);
      summary.setAttribute('lang', 'zh-CN');
      if (typeof window.renderKaTeXIn === 'function') window.renderKaTeXIn(summary);
    }

    if (info.vs) {
      var video = cardPart(body, 'div', 'roadmap-node-card__video');
      cardPart(video, 'div', 'roadmap-node-card__video-title',
        zh ? '▶ 含配音讲解视频' : '▶ Narrated explainer video');
      var videoMeta = [formatDuration(info.vs, zh)];
      if (info.es) videoMeta.push(zh ? info.es + ' 幕讲解动画' : info.es + '-scene animation');
      videoMeta.push(zh ? '中文配音与字幕，可下载' : 'Chinese voice-over & subtitles, downloadable');
      cardPart(video, 'div', 'roadmap-node-card__video-meta', videoMeta.join(' · '));
    } else if (info.es) {
      cardPart(body, 'div', 'roadmap-node-card__video',
        zh ? '含 ' + info.es + ' 幕讲解动画' : info.es + '-scene explainer animation');
    }

    var meta = [];
    if (info.a) meta.push('arXiv ' + info.a);
    if (info.os) meta.push(zh ? '含开源代码' : 'Open source code');
    if (meta.length) cardPart(body, 'div', 'roadmap-node-card__meta', meta.join(' · '));

    cardPart(card, 'span', 'roadmap-node-card__action',
      zh ? '点击阅读笔记 →' : 'Click to read the note →');
  }

  function placeCard(anchor) {
    var gap = 10;
    var margin = 8;
    var rect = anchor.getBoundingClientRect();
    card.style.maxHeight = '';
    var width = card.offsetWidth;
    var height = card.offsetHeight;
    var left = Math.max(margin, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - margin));
    var below = window.innerHeight - margin - rect.bottom - gap;
    var above = rect.top - gap - margin;
    var top = rect.bottom + gap;
    if (height > below && height <= above) top = rect.top - gap - height;
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
  }

  function show(anchor, info) {
    if (!card) {
      card = document.createElement('div');
      card.id = 'paper-preview-card';
      card.className = 'roadmap-node-card paper-preview-card';
      card.setAttribute('role', 'tooltip');
      card.hidden = true;
      document.body.appendChild(card);
    }
    currentAnchor = anchor;
    currentInfo = info;
    fillCard(info);
    card.hidden = false;
    placeCard(anchor);
  }

  function clearTimer() {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = 0;
    }
    pendingAnchor = null;
  }

  function hide() {
    clearTimer();
    currentAnchor = null;
    currentInfo = null;
    if (card) card.hidden = true;
  }

  function previewFor(anchor, guardFn) {
    var path = resolvePaperPath(anchor);
    if (!path) return;
    loadPreviews().then(function (map) {
      if (!map) return;
      if (guardFn && !guardFn()) return;
      var info = map[path];
      if (!info) return;
      show(anchor, info);
    });
  }

  document.addEventListener('pointerover', function (e) {
    if (e.pointerType === 'touch') return;
    if (e.target && e.target.closest && e.target.closest('.paper-health[data-health-score]')) {
      hide();
      return;
    }
    var anchor = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    var path = resolvePaperPath(anchor);
    if (!path) return;
    if (anchor === currentAnchor && card && !card.hidden) return;

    clearTimer();
    pendingAnchor = anchor;
    hoverTimer = setTimeout(function () {
      hoverTimer = 0;
      if (pendingAnchor !== anchor) return;
      previewFor(anchor, function () {
        return pendingAnchor === anchor && anchor.isConnected;
      });
    }, HOVER_DELAY_MS);
  });

  document.addEventListener('pointerout', function (e) {
    if (e.pointerType === 'touch') return;
    var related = e.relatedTarget;
    if (pendingAnchor && (!related || !pendingAnchor.contains(related))) {
      clearTimer();
    }
    if (currentAnchor && (!related || !currentAnchor.contains(related))) {
      hide();
    }
  });

  document.addEventListener('pointerdown', function () {
    hide();
  }, true);

  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!el || el.tagName !== 'A') return;
    if (el.closest('.paper-health[data-health-score]')) return;
    var visible = true;
    try {
      visible = el.matches(':focus-visible');
    } catch (err) { /* fallback for older browsers */ }
    if (!visible) return;
    pendingAnchor = el;
    previewFor(el, function () {
      return document.activeElement === el && el.isConnected;
    });
  });

  document.addEventListener('focusout', function (e) {
    if (currentAnchor && e.target === currentAnchor) hide();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
  });

  var raf = 0;
  function reposition() {
    if (!currentAnchor || !card || card.hidden || raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      if (!currentAnchor || !card || card.hidden) return;
      if (!currentAnchor.isConnected || currentAnchor.getClientRects().length === 0) {
        hide();
        return;
      }
      placeCard(currentAnchor);
    });
  }
  window.addEventListener('scroll', reposition, { passive: true, capture: true });
  window.addEventListener('resize', reposition, { passive: true });

  document.addEventListener('cl-lang-changed', function () {
    if (!currentAnchor || !currentInfo || !card || card.hidden) return;
    fillCard(currentInfo);
    placeCard(currentAnchor);
  });
})();
