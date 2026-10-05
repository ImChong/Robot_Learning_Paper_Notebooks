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

  var REVEAL_MS = 700;
  var STAGGER_MS = 70;
  var BATCH_MAX = 1000;
  var SELECTOR = [
    // 首页：分类标题 / 说明 / 展开按钮，子分类标题，论文卡片按行
    '.category-section > :not(.paper-list):not(.subcategory-section)',
    '.subcategory-section > :not(.paper-list)',
    '.paper-list > li',
    // 更新记录：按日
    '.updates-day',
    // 论文详情：正文按段落；折叠块展开后按块内段落
    '#paper-body > :not(.paper-fold)',
    '#paper-body > .paper-fold > summary',
    '#paper-body > .paper-fold > :not(summary)',
    '.paper-content > .paper-nav'
  ].join(', ');

  var seen = new WeakSet();

  function finish(el) {
    el.classList.remove('scroll-reveal', 'is-revealed');
    el.style.removeProperty('--reveal-delay');
  }

  // 不收缩视口底边：页面末尾的元素滚到底时离视口底很近，收缩后可能永远进不了判定区
  var observer = new IntersectionObserver(function (entries) {
    var batch = 0;
    for (var i = 0; i < entries.length; i++) {
      if (!entries[i].isIntersecting) continue;
      var el = entries[i].target;
      var delay = Math.min(batch++, 4) * STAGGER_MS;
      observer.unobserve(el);
      el.style.setProperty('--reveal-delay', delay + 'ms');
      el.classList.add('is-revealed');
      // 过渡结束后摘掉类名，恢复卡片原有的 hover transition
      window.setTimeout(finish, REVEAL_MS + delay + 50, el);
    }
  });

  function register() {
    var fold = window.innerHeight || document.documentElement.clientHeight;
    var candidates = main.querySelectorAll(SELECTOR);
    var fresh = [];
    for (var i = 0; i < candidates.length; i++) {
      if (!seen.has(candidates[i])) fresh.push(candidates[i]);
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
      below[m].classList.add('scroll-reveal');
      observer.observe(below[m]);
    }
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      register();
    });
  }

  register();
  // class / style / hidden / open 的变化都可能让元素从不可见变为可见（折叠卡片、搜索、<details>）
  new MutationObserver(schedule).observe(main, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'open', 'class', 'style']
  });
})();
