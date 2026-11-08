/* 笔记健康度悬浮框（首页论文卡片上的六格小条，见 _includes/paper-card.html）。
 *
 * 分数与缺项由 scripts/note_health.py 在 prepare_pages 时算好：每张卡片的
 * .paper-health 带 data-health-score / data-health-gaps，六项的名称与判据在
 * index.html 的 <script type="application/json" id="note-health-data">
 * （_data/note_health.json）里。这里只负责把它们排成一张逐项 ✓ / ✗ 的清单：
 *
 * - 鼠标：悬停小条时弹出，移开收起；点小条照常进入笔记。
 * - 触屏 / 手写笔：第一次点小条只弹清单、不跳转，再点一次或点别处收起；
 *   点卡片的其他地方照常进入笔记。
 * - 键盘：Tab 聚焦到卡片时弹出，Esc 收起。
 * - 读屏：小条自身的 aria-label 已经写明分数和缺项，清单只是视觉上的展开，aria-hidden。
 *
 * 全页只建一个浮层（不给 400 多张卡片各放一份清单）。
 */
(function () {
  'use strict';

  var dataEl = document.getElementById('note-health-data');
  if (!dataEl) return;
  var data;
  try {
    data = JSON.parse(dataEl.textContent);
  } catch (e) {
    return;
  }
  if (!data || !data.items || !data.items.length) return;
  var MAX = data.max || data.items.length;

  var SELECTOR = '.paper-health[data-health-score], [data-health-legend]';

  var tip = document.createElement('div');
  tip.className = 'note-health-tip';
  tip.setAttribute('aria-hidden', 'true');
  tip.hidden = true;
  document.body.appendChild(tip);

  var current = null; // 浮层当前对着的小条
  var pinned = false; // 点按打开的：等下一次点按才收起
  var lastPointer = 'mouse';

  function isZh() {
    return document.documentElement.getAttribute('data-lang-mode') === 'zh';
  }

  function node(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  function build(target) {
    var zh = isZh();
    var legend = target.hasAttribute('data-health-legend');
    var gaps = (target.getAttribute('data-health-gaps') || '').split(/\s+/).filter(Boolean);
    tip.textContent = '';

    if (legend) {
      tip.appendChild(node('div', 'note-health-tip-title',
        (zh ? '笔记健康度 0–' : 'Note health 0–') + MAX + (zh ? '：每项 1 分' : ': one point per item')));
    } else {
      var score = parseInt(target.getAttribute('data-health-score'), 10);
      tip.appendChild(node('div', 'note-health-tip-title',
        (zh ? '笔记健康度 ' : 'Note health ') + score + '/' + MAX));
    }

    var list = node('ul', 'note-health-tip-list');
    data.items.forEach(function (item) {
      var gap = gaps.indexOf(item.key) !== -1;
      var li = node('li', 'note-health-tip-item ' + (legend ? 'is-info' : gap ? 'is-gap' : 'is-ok'));
      li.appendChild(node('span', 'note-health-tip-mark', legend ? '·' : gap ? '✗' : '✓'));
      var body = node('span', 'note-health-tip-body');
      body.appendChild(node('span', 'note-health-tip-name', zh ? item.zh : item.en));
      // 卡片上只给缺的项写判据，达标的项一行名字就够；图例逐项都写。
      if (legend || gap) body.appendChild(node('span', 'note-health-tip-hint', zh ? item.hint_zh : item.hint_en));
      li.appendChild(body);
      list.appendChild(li);
    });
    tip.appendChild(list);

    var status = target.getAttribute('data-health-status');
    var st = status && data.status ? data.status[status] : null;
    if (st) {
      tip.appendChild(node('p', 'note-health-tip-cap', zh
        ? '这篇笔记是' + st.zh + '，总分封顶 ' + st.cap + '/' + MAX + '。'
        : 'This note is a ' + st.en + ', so the score is capped at ' + st.cap + '/' + MAX + '.'));
    } else if (legend && data.status) {
      tip.appendChild(node('p', 'note-health-tip-cap', zh
        ? '草稿最多 ' + data.status.draft.cap + ' 分，占位稿最多 ' + data.status.stub.cap + ' 分。'
        : 'Drafts score at most ' + data.status.draft.cap + ', stubs at most ' + data.status.stub.cap + '.'));
    }

    tip.appendChild(node('p', 'note-health-tip-foot', zh
      ? '反映笔记写到了哪一步、原文核验到了哪一步，不是论文质量或结论可靠性的评级。'
      : 'It tracks how complete and checked the note is, not how good the paper is.'));
  }

  function place(target) {
    var r = target.getBoundingClientRect();
    tip.style.left = '0px';
    tip.style.top = '0px';
    var tw = tip.offsetWidth;
    var th = tip.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var left = Math.min(Math.max(8, r.left), Math.max(8, vw - tw - 8));
    var top = r.bottom + 8;
    if (top + th > vh - 8 && r.top - th - 8 >= 8) top = r.top - th - 8;
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }

  function show(target, pin) {
    if (current && current !== target) current.classList.remove('is-tip-open');
    current = target;
    pinned = !!pin;
    build(target);
    tip.hidden = false;
    place(target);
    if (pinned) target.classList.add('is-tip-open');
  }

  function hide() {
    if (current) current.classList.remove('is-tip-open');
    tip.hidden = true;
    current = null;
    pinned = false;
  }

  function healthFrom(el) {
    return el && el.closest ? el.closest(SELECTOR) : null;
  }

  document.addEventListener('pointerdown', function (e) {
    lastPointer = e.pointerType || 'mouse';
    if (pinned && !healthFrom(e.target)) hide();
  }, true);

  document.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse' || pinned) return;
    var target = healthFrom(e.target);
    if (target && target !== current) show(target, false);
  });

  document.addEventListener('pointerout', function (e) {
    if (e.pointerType !== 'mouse' || pinned || !current) return;
    var from = healthFrom(e.target);
    if (from !== current) return;
    if (e.relatedTarget && current.contains(e.relatedTarget)) return;
    hide();
  });

  document.addEventListener('click', function (e) {
    var target = healthFrom(e.target);
    if (!target) return;
    var legend = target.hasAttribute('data-health-legend');
    // 鼠标点小条：照常进入笔记（悬停已经看到清单了）。
    if (lastPointer === 'mouse' && !legend) return;
    e.preventDefault();
    if (current === target && pinned) hide();
    else show(target, true);
  });

  // 键盘：聚焦到带健康度的卡片（或图例）时弹出，离开时收起。
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!el || !el.matches) return;
    var target = el.matches('[data-health-legend]') ? el
      : el.matches('.paper-card') ? el.querySelector('.paper-health[data-health-score]') : null;
    if (!target) return;
    var visible = true;
    try {
      visible = el.matches(':focus-visible');
    } catch (err) { /* 老浏览器不认 :focus-visible，照常弹出 */ }
    if (visible) show(target, false);
  });

  document.addEventListener('focusout', function (e) {
    if (!current || pinned) return;
    var el = e.target;
    if (el === current || (el.contains && el.contains(current))) hide();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && current) hide();
  });

  var raf = 0;
  function reposition() {
    if (!current || raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      if (!current) return;
      if (!current.isConnected || current.getClientRects().length === 0) {
        hide();
        return;
      }
      place(current);
    });
  }
  window.addEventListener('scroll', reposition, { passive: true, capture: true });
  window.addEventListener('resize', reposition, { passive: true });

  document.addEventListener('cl-lang-changed', function () {
    if (!current) return;
    build(current);
    place(current);
  });
})();
