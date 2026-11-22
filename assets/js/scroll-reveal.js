/* 滚动入场（全站）：首屏以下的区块 / 论文卡片 / 正文段落进入视口时淡入，同一批依次错开。
 *
 * 移植自 ImChong/Robotics_Notebooks 的 docs/main.js「滚动入场」。
 * - 只隐藏登记时完全位于视口下方的元素：首屏不闪、JS 失败时内容照常可见、截图不留白。
 * - 后来出现的元素（「再展开 N 篇」、展开折叠块、搜索、异步渲染的更新记录）由 MutationObserver 补登记；
 *   祖先仍在等待入场时子元素不再单独登记，随祖先一起出现，避免位移叠加。
 * - 论文正文只淡入不上移（见 style.css），目录与锚点跳转落点不变。
 * - prefers-reduced-motion 或不支持 IntersectionObserver 时整段跳过。
 */
(function () {
  'use strict';
  if (typeof IntersectionObserver === 'undefined' || typeof WeakSet === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var main = document.querySelector('main');
  if (!main) return;

  var REVEAL_MS = 450;
  var STAGGER_MS = 45;
  var BATCH_MAX = 1000;
  var hasPaperBody = !!document.getElementById('paper-body');
  var hasUpdates = !hasPaperBody && !!main.querySelector('#updates-page, .updates-timeline');
  var SELECTOR = hasPaperBody
    ? '#paper-body > :not(.paper-fold), #paper-body > .paper-fold > summary, .paper-content > .paper-nav'
    : hasUpdates
      ? '.updates-day'
      : [
          '.category-section > :not(.paper-list):not(.subcategory-section)',
          '.subcategory-section > :not(.paper-list)',
          '.paper-list > li'
        ].join(', ');

  var seen = new WeakSet();
  var selfTargets = typeof Set === 'function' ? new Set() : null;
  var mo = null;

  function flushSelfMutations() {
    if (!mo || !selfTargets || !selfTargets.size) return;
    var extra = [];
    var recs = mo.takeRecords();
    for (var i = 0; i < recs.length; i++) {
      if (!selfTargets.has(recs[i].target)) extra.push(recs[i]);
    }
    selfTargets.clear();
    if (extra.length) onMutations(extra);
  }

  function finish(el) {
    if (selfTargets) selfTargets.add(el);
    el.classList.remove('scroll-reveal', 'is-revealed');
    el.style.removeProperty('--reveal-delay');
    flushSelfMutations();
  }

  // 不收缩视口底边：页面末尾的元素滚到底时离视口底很近，收缩后可能永远进不了判定区
  var observer = new IntersectionObserver(function (entries) {
    var batch = 0;
    for (var i = 0; i < entries.length; i++) {
      if (!entries[i].isIntersecting) continue;
      var el = entries[i].target;
      var delay = Math.min(batch++, 4) * STAGGER_MS;
      observer.unobserve(el);
      if (selfTargets) selfTargets.add(el);
      el.style.setProperty('--reveal-delay', delay + 'ms');
      el.classList.add('is-revealed');
      // 过渡结束后摘掉类名，恢复卡片原有的 hover transition
      window.setTimeout(finish, REVEAL_MS + delay + 50, el);
    }
    flushSelfMutations();
  });

  function isDomHiddenFast(el) {
    if (el.hidden) return true;
    var cls = el.classList;
    if (cls && cls.contains('paper-list-item-folded')) {
      var list = el.parentElement;
      if (list && list.classList.contains('is-folded')) return true;
    }
    if (cls && cls.contains('updates-item-folded')) {
      var day = el.closest && el.closest('.updates-day');
      if (day && day.classList.contains('is-folded')) return true;
    }
    if (el.closest) {
      var d = el.closest('details:not([open]), .is-cat-folded, .is-subcat-folded, [hidden]');
      if (d && d !== el) return true;
    }
    return false;
  }

  function register() {
    if (document.body && document.body.classList.contains('index-search-active')) return;
    var fold = window.innerHeight || document.documentElement.clientHeight;
    var candidates = main.querySelectorAll(SELECTOR);
    var fresh = [];
    for (var i = 0; i < candidates.length; i++) {
      var cand = candidates[i];
      if (!seen.has(cand) && !isDomHiddenFast(cand)) fresh.push(cand);
    }
    // 一次出现上千个时直接显示，逐个登记的开销不值得
    if (fresh.length > BATCH_MAX) {
      for (var j = 0; j < fresh.length; j++) seen.add(fresh[j]);
      return;
    }
    var below = [];
    // 先集中读布局再统一写类名：读写交替会让每次读都触发一次重排
    for (var k = 0; k < fresh.length; k++) {
      var el = fresh[k];
      // 未渲染（display:none / 收起的折叠块 / 折叠的卡片）先不判定，出现后再登记
      if (!el.getClientRects().length) continue;
      seen.add(el);
      if (el.getBoundingClientRect().top >= fold) below.push(el);
    }
    for (var m = 0; m < below.length; m++) {
      if (below[m].parentElement && below[m].parentElement.closest('.scroll-reveal')) continue;
      if (selfTargets) selfTargets.add(below[m]);
      below[m].classList.add('scroll-reveal');
      observer.observe(below[m]);
    }
    flushSelfMutations();
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    if (document.body && document.body.classList.contains('index-search-active')) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      register();
    });
  }

  // 流程图与演示内部没有登记对象，却一直在改自己的 SVG：Mermaid 重画（切主题后逐张重画）、
  // 讲解动画每帧改 class / style。这些变动不触发重新登记，否则每帧都要对整个 main 跑一遍
  // querySelectorAll（PPO 笔记切主题时，6 倍降速下多出约 0.7 s 主线程）。
  function inertTarget(node) {
    return !!(node.closest && node.closest('svg, .mermaid, .paper-demo, #toc-sidebar, .paper-nav, .updates-heatmap'));
  }

  function onMutations(records) {
    if (document.body && document.body.classList.contains('index-search-active')) return;
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (!inertTarget(r.target) && !(selfTargets && selfTargets.has(r.target))) {
        schedule();
        return;
      }
    }
  }

  function start() {
    register();
    // class / hidden / open 的变化都可能让元素从不可见变为可见（折叠卡片、搜索、<details>）
    mo = new MutationObserver(onMutations);
    mo.observe(main, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'open', 'class']
    });
  }

  // 等 DOMContentLoaded 与首轮脚本（paper.js / KaTeX / kit.js / 首页折叠）完成布局后再启动，
  // 避免初始化重构 DOM 期间反复触发 register()。
  function queueStart() {
    window.setTimeout(start, 0);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', queueStart, { once: true });
  } else {
    queueStart();
  }
})();
