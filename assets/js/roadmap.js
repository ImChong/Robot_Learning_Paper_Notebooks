/* 首页「推荐学习路线图」：游戏天赋树式的分系视图。
   标记在 _includes/roadmap-tree.html，数据在 _data/roadmap.yml。一次只显示一系：
   - 选系：左边的标签（窄屏上是顶部一排编号），记住上次看的是哪一系；
   - 连线：按节点在网格里的实际位置画 SVG 曲线，前置是实线，相关拓展是虚线；
   - 跨系：起点或终点在别的系的箭头不画在树里，换成树上方「前置」、下方「通往」两排
     标签，点一下切到那一系并闪一下那个节点；
   - 悬停 / 聚焦节点：点亮它在这一系里的整条前置链，弹出论文详情卡片（数据来自
     #roadmap-node-details，由 _data/papers.json 生成）。触屏点按直接打开笔记，不弹卡片；
     卡片 pointer-events: none，不挡点击。
   路线图收在 <details> 里，收起时什么都不画，展开或换系时只画当前这一棵。 */
(function () {
  'use strict';

  var root = document.documentElement;
  var container = document.getElementById('roadmap-tree');
  if (!container) return;

  var fold = container.closest('details');
  var rail = container.querySelector('.tt-rail');
  var STORE_KEY = 'cl-roadmap-branch';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ARROW = 7; // 箭头长度（px）
  var CIRCLED = { 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤', 6: '⑥', 7: '⑦', 8: '⑧', 9: '⑨', A: 'Ⓐ', B: 'Ⓑ' };

  function isZh() {
    return root.getAttribute('data-lang-mode') === 'zh';
  }

  function words(value) {
    return value ? value.split(/\s+/).filter(Boolean) : [];
  }

  /* ─── 索引 ─── */
  var branches = [];
  var branchById = {};
  var nodes = {};

  Array.prototype.forEach.call(container.querySelectorAll('.tt-panel'), function (panel) {
    var branch = {
      id: panel.getAttribute('data-branch'),
      mark: panel.getAttribute('data-mark'),
      panel: panel,
      tab: document.getElementById('tt-tab-' + panel.getAttribute('data-branch')),
      tree: panel.querySelector('.tt-tree'),
      svg: panel.querySelector('.tt-edges'),
      gatesIn: panel.querySelector('.tt-gates--in'),
      gatesOut: panel.querySelector('.tt-gates--out'),
      nodes: [],
      edges: []
    };
    Array.prototype.forEach.call(panel.querySelectorAll('.tt-node'), function (el) {
      var node = {
        id: el.getAttribute('data-node'),
        el: el,
        branch: branch,
        row: Number(el.getAttribute('data-row')),
        after: words(el.getAttribute('data-after')),
        related: words(el.getAttribute('data-related')),
        notes: {}
      };
      try {
        node.notes = JSON.parse(el.getAttribute('data-notes') || '{}') || {};
      } catch (e) {
        node.notes = {};
      }
      nodes[node.id] = node;
      branch.nodes.push(node);
    });
    branch.index = branches.length;
    branches.push(branch);
    branchById[branch.id] = branch;
  });
  if (!branches.length) return;

  /* 每条箭头：from → to，kind 是 after（实线）或 related（虚线）。 */
  var edges = [];
  Object.keys(nodes).forEach(function (id) {
    var node = nodes[id];
    [['after', node.after], ['related', node.related]].forEach(function (pair) {
      pair[1].forEach(function (from) {
        if (nodes[from]) edges.push({ from: nodes[from], to: node, kind: pair[0] });
      });
    });
  });
  edges.forEach(function (edge) {
    if (edge.from.branch === edge.to.branch) edge.to.branch.edges.push(edge);
  });

  /* ─── 文案 ─── */
  function nodeLabel(node, zh) {
    var nameEl = node.el.querySelector('.tt-node-name');
    var text = (zh ? nameEl.getAttribute('data-zh') : nameEl.getAttribute('data-en')) || nameEl.textContent;
    return text.replace(/\u200b/g, '').trim();
  }

  function branchName(branch, zh) {
    var nameEl = branch.panel.querySelector('.tt-panel-title');
    return (zh ? nameEl.getAttribute('data-zh') : nameEl.getAttribute('data-en')) || nameEl.textContent;
  }

  function circled(branch) {
    return CIRCLED[branch.mark] || '(' + branch.mark + ')';
  }

  /* 动态生成的文字也带 data-en / data-zh，切换语言时由 default.html 的 applyLang 一并换掉。 */
  function bilingual(tag, className, en, zh) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    el.setAttribute('data-en', en);
    el.setAttribute('data-zh', zh);
    el.textContent = isZh() ? zh : en;
    return el;
  }

  function setBilingualAria(el, en, zh) {
    el.setAttribute('data-en-aria-label', en);
    el.setAttribute('data-zh-aria-label', zh);
    el.setAttribute('aria-label', isZh() ? zh : en);
  }

  /* ─── 跨系的「前置」与「通往」 ─── */
  function buildGates(branch) {
    var incoming = {};
    var outgoing = {};
    edges.forEach(function (edge) {
      if (edge.from.branch === edge.to.branch) return;
      var list = null;
      var other = null;
      var mine = null;
      if (edge.to.branch === branch) {
        list = incoming;
        other = edge.from;
        mine = edge.to;
      } else if (edge.from.branch === branch) {
        list = outgoing;
        other = edge.to;
        mine = edge.from;
      }
      if (!list) return;
      var entry = list[other.id] || (list[other.id] = { node: other, kind: 'related', mine: [] });
      if (edge.kind === 'after') entry.kind = 'after';
      if (entry.mine.indexOf(mine) === -1) entry.mine.push(mine);
    });
    var before = listOf(incoming);
    fillGates(branch.gatesIn, before.filter(function (entry) { return entry.kind === 'after'; }), 'Before this', '前置');
    fillGates(branch.gatesIn, before.filter(function (entry) { return entry.kind === 'related'; }), 'Related', '相关');
    fillGates(branch.gatesOut, listOf(outgoing), 'Leads to', '通往');
  }

  function listOf(entries) {
    return Object.keys(entries).map(function (id) { return entries[id]; }).sort(order);
  }

  function order(a, b) {
    var byBranch = a.node.branch.index - b.node.branch.index;
    return byBranch || a.node.branch.nodes.indexOf(a.node) - b.node.branch.nodes.indexOf(b.node);
  }

  function fillGates(host, list, en, zh) {
    if (!list.length) return;
    var group = document.createElement('span');
    group.className = 'tt-gates-group';
    group.appendChild(bilingual('span', 'tt-gates-label', en, zh));
    list.forEach(function (entry) {
      var node = entry.node;
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tt-gate' + (entry.kind === 'related' ? ' is-related' : '');
      chip.setAttribute('data-goto', node.id);
      chip.setAttribute('data-mine', entry.mine.map(function (n) { return n.id; }).join(' '));
      var mark = document.createElement('span');
      mark.className = 'tt-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = node.branch.mark;
      chip.appendChild(mark);
      chip.appendChild(bilingual('span', 'tt-gate-name', nodeLabel(node, false), nodeLabel(node, true)));
      setBilingualAria(
        chip,
        nodeLabel(node, false) + ', in branch ' + node.branch.mark + ' ' + branchName(node.branch, false),
        nodeLabel(node, true) + '，在第 ' + node.branch.mark + ' 系「' + branchName(node.branch, true) + '」'
      );
      chip.addEventListener('click', function () {
        select(node.branch.id, { flash: node });
      });
      chip.addEventListener('pointerenter', function () {
        traceIds(host.closest('.tt-panel'), entry.mine);
      });
      chip.addEventListener('pointerleave', clearTrace);
      group.appendChild(chip);
    });
    host.appendChild(group);
    host.hidden = false;
  }

  /* ─── 画连线 ─── */
  function boxOf(el, origin) {
    var r = el.getBoundingClientRect();
    var left = r.left - origin.left;
    var top = r.top - origin.top;
    return { l: left, t: top, r: left + r.width, b: top + r.height, cx: left + r.width / 2, cy: top + r.height / 2 };
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    return el;
  }

  function arrowHead(x, y, dir) {
    var a = ARROW;
    var w = 4.5;
    if (dir === 'down') return 'M' + (x - w) + ' ' + (y - a) + 'L' + x + ' ' + y + 'L' + (x + w) + ' ' + (y - a) + 'Z';
    if (dir === 'right') return 'M' + (x - a) + ' ' + (y - w) + 'L' + x + ' ' + y + 'L' + (x - a) + ' ' + (y + w) + 'Z';
    return 'M' + (x + a) + ' ' + (y - w) + 'L' + x + ' ' + y + 'L' + (x + a) + ' ' + (y + w) + 'Z';
  }

  function round(n) {
    return Math.round(n * 10) / 10;
  }

  function draw(branch) {
    if (!branch || branch.panel.hidden || (fold && !fold.open)) return;
    var origin = branch.tree.getBoundingClientRect();
    if (!origin.width) return;
    var boxes = {};
    branch.nodes.forEach(function (node) { boxes[node.id] = boxOf(node.el, origin); });

    // 多条箭头指向同一个节点时，按起点从左到右在节点顶边上错开落点。
    var landing = {};
    branch.edges.forEach(function (edge) {
      if (edge.from.row === edge.to.row) return;
      (landing[edge.to.id] = landing[edge.to.id] || []).push(edge);
    });
    Object.keys(landing).forEach(function (id) {
      var list = landing[id].sort(function (a, b) { return boxes[a.from.id].cx - boxes[b.from.id].cx; });
      var box = boxes[id];
      var step = Math.min(14, (box.r - box.l) / (list.length + 1));
      list.forEach(function (edge, i) { edge.tx = box.cx + (i - (list.length - 1) / 2) * step; });
    });

    var svg = branch.svg;
    svg.setAttribute('width', round(origin.width));
    svg.setAttribute('height', round(origin.height));
    svg.setAttribute('viewBox', '0 0 ' + round(origin.width) + ' ' + round(origin.height));
    svg.textContent = '';
    branch.edges.forEach(function (edge) {
      var s = boxes[edge.from.id];
      var t = boxes[edge.to.id];
      var line;
      var head;
      if (edge.from.row === edge.to.row) {
        var dir = t.cx > s.cx ? 1 : -1;
        var y = (s.cy + t.cy) / 2;
        var x0 = dir > 0 ? s.r : s.l;
        var x1 = dir > 0 ? t.l : t.r;
        line = 'M' + round(x0) + ' ' + round(y) + 'H' + round(x1 - dir * ARROW);
        head = arrowHead(round(x1), round(y), dir > 0 ? 'right' : 'left');
      } else {
        var sx = round(s.cx);
        var sy = round(s.b);
        var tx = round(edge.tx);
        var ty = round(t.t);
        var end = ty - ARROW;
        if (Math.abs(tx - sx) < 1) {
          line = 'M' + sx + ' ' + sy + 'V' + end;
        } else {
          var mid = round((sy + end) / 2);
          line = 'M' + sx + ' ' + sy + 'C' + sx + ' ' + mid + ' ' + tx + ' ' + mid + ' ' + tx + ' ' + end;
        }
        head = arrowHead(tx, ty, 'down');
      }
      var group = svgEl('g', {
        class: 'tt-edge' + (edge.kind === 'related' ? ' is-related' : ''),
        'data-from': edge.from.id,
        'data-to': edge.to.id
      });
      group.appendChild(svgEl('path', { class: 'tt-edge-line', d: line }));
      group.appendChild(svgEl('path', { class: 'tt-edge-head', d: head }));
      svg.appendChild(group);
    });
    branch.drawn = true;
  }

  /* ─── 高亮前置链 ─── */
  function traceIds(panel, start) {
    var branch = panel && branchById[panel.getAttribute('data-branch')];
    if (!branch) return;
    var lit = {};
    var stack = start.map(function (node) { return node.id; });
    stack.forEach(function (id) { lit[id] = true; });
    while (stack.length) {
      var node = nodes[stack.pop()];
      node.after.concat(node.related).forEach(function (from) {
        if (nodes[from] && nodes[from].branch === branch && !lit[from]) {
          lit[from] = true;
          stack.push(from);
        }
      });
    }
    branch.tree.classList.add('is-tracing');
    branch.nodes.forEach(function (node) { node.el.classList.toggle('is-path', !!lit[node.id]); });
    Array.prototype.forEach.call(branch.svg.querySelectorAll('.tt-edge'), function (edge) {
      edge.classList.toggle('is-path', !!lit[edge.getAttribute('data-to')]);
    });
    Array.prototype.forEach.call(branch.gatesIn.querySelectorAll('.tt-gate'), function (chip) {
      chip.classList.toggle('is-path', words(chip.getAttribute('data-mine')).some(function (id) { return lit[id]; }));
    });
  }

  function clearTrace() {
    Array.prototype.forEach.call(container.querySelectorAll('.is-tracing, .is-path'), function (el) {
      el.classList.remove('is-tracing', 'is-path');
    });
  }

  function flash(node) {
    if (!node) return;
    node.el.classList.remove('is-flash');
    // 重新触发动画。
    void node.el.offsetWidth;
    node.el.classList.add('is-flash');
    node.el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    setTimeout(function () { node.el.classList.remove('is-flash'); }, 1600);
  }

  /* ─── 选系 ─── */
  var current = null;

  function select(id, opts) {
    var branch = branchById[id] || branches[0];
    current = branch;
    branches.forEach(function (other) {
      var on = other === branch;
      other.panel.hidden = !on;
      if (other.tab) {
        other.tab.setAttribute('aria-selected', on ? 'true' : 'false');
        other.tab.tabIndex = on ? 0 : -1;
      }
    });
    try {
      localStorage.setItem(STORE_KEY, branch.id);
    } catch (e) {
      // Private mode / blocked storage: the choice just is not remembered.
    }
    hideCard();
    clearTrace();
    draw(branch);
    if (opts && opts.flash) flash(opts.flash);
    if (opts && opts.focus && branch.tab) branch.tab.focus();
  }

  if (rail) {
    var tabs = Array.prototype.slice.call(rail.querySelectorAll('.tt-tab'));
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        select(tab.getAttribute('data-branch'));
      });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        select(next.getAttribute('data-branch'), { focus: true });
      });
    });
    rail.hidden = false;
  }

  /* ─── 节点悬浮卡片 ─── */
  var card;
  var details;

  function getDetails() {
    if (details) return details;
    details = {};
    var dataEl = document.querySelector('script#roadmap-node-details');
    if (dataEl) {
      try {
        details = JSON.parse(dataEl.textContent) || {};
      } catch (e) {
        details = {};
      }
    }
    return details;
  }

  function hideCard() {
    if (card) card.hidden = true;
  }

  function formatDuration(seconds, zh) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    if (zh) return (m ? m + ' 分 ' : '') + s + ' 秒';
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function hasVideo(node, info) {
    return !!(info && info.video_seconds) || node.el.classList.contains('tt-node--video');
  }

  function cardPart(parent, tag, className, text) {
    var el = document.createElement(tag);
    el.className = className;
    if (text != null) el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  /* 「前置：AWR · 相关：GMR Ⓐ（部署平台）」，别的系的节点带上系号。 */
  function linkList(node, ids, zh) {
    return ids.filter(function (id) { return nodes[id]; }).map(function (id) {
      var from = nodes[id];
      var text = nodeLabel(from, zh);
      if (from.branch !== node.branch) text += ' ' + circled(from.branch);
      var note = node.notes[id];
      if (note) text += zh ? '（' + (note.zh || note.en) + '）' : ' (' + (note.en || note.zh) + ')';
      return text;
    }).join(zh ? '、' : ', ');
  }

  function fillCard(node) {
    var zh = isZh();
    var info = getDetails()[node.id] || {};
    var year = node.el.querySelector('.tt-node-year');
    card.textContent = '';

    var eyebrow = [zh ? info.category_zh : info.category, (zh ? info.date_zh : info.date) || (year && year.textContent)]
      .filter(Boolean)
      .join(' · ');
    if (eyebrow) cardPart(card, 'div', 'roadmap-node-card__eyebrow', eyebrow);

    var title = (zh ? info.zh_title || info.title : info.title) || nodeLabel(node, zh);
    var subtitle = zh ? info.title : info.zh_title;
    cardPart(card, 'div', 'roadmap-node-card__title', title);
    if (subtitle && subtitle !== title) cardPart(card, 'div', 'roadmap-node-card__subtitle', subtitle);

    if (info.summary_zh) {
      // 简介摘自中文笔记的「🎯 一句话总结」；公式交给页面已加载的 KaTeX。
      var summary = cardPart(card, 'p', 'roadmap-node-card__summary', info.summary_zh);
      summary.setAttribute('lang', 'zh-CN');
      if (typeof window.renderKaTeXIn === 'function') window.renderKaTeXIn(summary);
    }

    var path = [];
    if (node.after.length) path.push((zh ? '前置：' : 'Prerequisites: ') + linkList(node, node.after, zh));
    if (node.related.length) path.push((zh ? '相关：' : 'Related: ') + linkList(node, node.related, zh));
    if (path.length) cardPart(card, 'div', 'roadmap-node-card__path', path.join(zh ? '；' : '; '));

    if (hasVideo(node, info)) {
      var video = cardPart(card, 'div', 'roadmap-node-card__video');
      cardPart(video, 'div', 'roadmap-node-card__video-title', zh ? '▶ 含配音讲解视频' : '▶ Narrated explainer video');
      var videoMeta = [];
      if (info.video_seconds) videoMeta.push(formatDuration(info.video_seconds, zh));
      if (info.scenes) videoMeta.push(zh ? info.scenes + ' 幕讲解动画' : info.scenes + '-scene animation');
      videoMeta.push(zh ? '中文配音与字幕，可下载' : 'Chinese voice-over & subtitles, downloadable');
      cardPart(video, 'div', 'roadmap-node-card__video-meta', videoMeta.join(' · '));
    } else if (info.scenes) {
      cardPart(card, 'div', 'roadmap-node-card__video',
        zh ? '含 ' + info.scenes + ' 幕讲解动画' : info.scenes + '-scene explainer animation');
    }

    var meta = [];
    if (info.arxiv) meta.push('arXiv ' + info.arxiv);
    if (info.open_source) meta.push(zh ? '含开源代码' : 'Open source code');
    if (meta.length) cardPart(card, 'div', 'roadmap-node-card__meta', meta.join(' · '));

    var external = node.el.classList.contains('tt-node--external');
    cardPart(card, 'div', 'roadmap-node-card__action', external
      ? (zh ? '点击打开论文原文 ↗' : 'Click to open the paper ↗')
      : (zh ? '点击阅读笔记 →' : 'Click to read the note →'));
  }

  function placeCard(node) {
    var gap = 10;
    var margin = 8;
    var rect = node.el.getBoundingClientRect();
    var width = card.offsetWidth;
    var height = card.offsetHeight;
    var left = Math.max(margin, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - margin));
    var top = rect.bottom + gap;
    if (top + height > window.innerHeight - margin && rect.top - gap - height >= margin) {
      top = rect.top - gap - height;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
    card.style.left = left + 'px';
    card.style.top = top + 'px';
  }

  function showCard(node) {
    if (!card) {
      card = document.createElement('div');
      card.id = 'roadmap-node-card';
      card.className = 'roadmap-node-card';
      card.setAttribute('role', 'tooltip');
      card.hidden = true;
      document.body.appendChild(card);
    }
    fillCard(node);
    card.hidden = false;
    placeCard(node);
  }

  function labelNode(node) {
    var zh = isZh();
    var info = getDetails()[node.id] || {};
    var name = (zh ? info.zh_title || info.title : info.title) || nodeLabel(node, zh);
    if (hasVideo(node, info)) name += zh ? '（含配音讲解视频）' : ' (narrated video included)';
    node.el.setAttribute('aria-label', name);
  }

  Object.keys(nodes).forEach(function (id) {
    var node = nodes[id];
    var el = node.el;
    labelNode(node);
    el.setAttribute('aria-describedby', 'roadmap-node-card');
    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch') return;
      traceIds(node.branch.panel, [node]);
      showCard(node);
    });
    el.addEventListener('focus', function () {
      traceIds(node.branch.panel, [node]);
      showCard(node);
    });
    el.addEventListener('pointerleave', function () {
      clearTrace();
      hideCard();
    });
    el.addEventListener('blur', function () {
      clearTrace();
      hideCard();
    });
    el.addEventListener('pointerdown', hideCard);
  });

  window.addEventListener('scroll', hideCard, true);
  window.addEventListener('resize', hideCard);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideCard();
  });

  /* ─── 启动 ─── */
  branches.forEach(buildGates);
  container.classList.add('tt--ready');

  var saved = null;
  try {
    saved = localStorage.getItem(STORE_KEY);
  } catch (e) {
    saved = null;
  }
  select(branchById[saved] ? saved : branches[0].id);

  function redraw() {
    if (current) draw(current);
  }

  if (fold) {
    fold.addEventListener('toggle', function () {
      if (fold.open) redraw();
      else hideCard();
    });
  }

  // 换语言时节点名长短会变，网格尺寸跟着变，连线要重画。
  if (typeof ResizeObserver === 'function') {
    var resizeObserver = new ResizeObserver(function (entries) {
      if (!current) return;
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].target === current.tree) {
          redraw();
          return;
        }
      }
    });
    branches.forEach(function (branch) { resizeObserver.observe(branch.tree); });
  } else {
    window.addEventListener('resize', redraw);
  }

  document.addEventListener('cl-lang-changed', function () {
    hideCard();
    Object.keys(nodes).forEach(function (id) { labelNode(nodes[id]); });
    requestAnimationFrame(redraw);
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
})();
