/* 首页「推荐学习路线图」：游戏天赋树式的分系视图。
   标记在 _includes/roadmap-tree.html，数据在 _data/roadmap.yml。一次只显示一系：
   - 选系：左边的标签（窄屏上是顶部一排编号），记住上次看的是哪一系；
   - 连线：按节点在网格里的实际位置画 SVG 曲线，前置是实线，相关拓展是虚线；
   - 跨系：起点或终点在别的系的箭头不画在树里，换成树上方「前置」、下方「通往」两排
     标签，点一下切到那一系并闪一下那个节点；
   - 悬停 / 聚焦节点：点亮它在这一系里的整条前置链，弹出论文详情卡片（数据来自
     #roadmap-node-details，由 _data/papers.json 生成）；这时卡片 pointer-events: none，不挡点击。
     触屏没有悬停：第一次点节点弹卡片，卡片能点，点卡片上的「点击阅读笔记」进入笔记；
   - 全局总览：一个窗口里把 11 系按 map_order 排开，所有节点和所有箭头（含跨系的）一起画，
     按窗口大小挑排法、缩放到放得下，也可以放大阅读（只上下滚）；悬停节点点亮它的整条前置路线（深色）和后续（浅色）。
     可以缩放、平移：平移走原生滚动（触屏有惯性，方向键、滚动条照常用），缩放用双指捏合、
     Ctrl / ⌘ + 滚轮（触控板捏合）、+ / − 键或按钮，0 键复位；鼠标可以按住拖动。
   路线图收在 <details> 里，收起时什么都不画，展开或换系时只画当前这一棵。 */
(function () {
  'use strict';

  var root = document.documentElement;
  var container = document.getElementById('roadmap-tree');
  if (!container) return;

  var fold = container.closest('details');
  var side = container.querySelector('.tt-side');
  var rail = container.querySelector('.tt-rail');
  var mapButton = container.querySelector('.tt-map-open');
  var STORE_KEY = 'cl-roadmap-branch';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ARROW = 7; // 箭头长度（px）
  var MAX_ZOOM = 2; // 全局总览最多放大到 200%
  var ZOOM_STEP = 1.25; // + / − 一次缩放的倍数
  var PAN_KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
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
      mapOrder: Number(panel.getAttribute('data-map-order')) || 0,
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
        if (nodes[from]) edges.push({ from: nodes[from], to: node, kind: pair[0], cross: nodes[from].branch !== node.branch });
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

  /* ─── 画连线 ───
     树里和总览共用一套：箭头从起点那一侧的中点出发，按终点相对起点的位置落在终点的
     顶边（在下方）、左边 / 右边（在同一高度的两侧）或底边（在上方）；落在同一边的几条
     箭头按起点先后错开落点。曲线两端的切线垂直于所在的边，箭头沿切线方向。 */
  function boxOf(el, origin, scale) {
    var r = el.getBoundingClientRect();
    var left = (r.left - origin.left) / scale;
    var top = (r.top - origin.top) / scale;
    var width = r.width / scale;
    var height = r.height / scale;
    return { l: left, t: top, r: left + width, b: top + height, cx: left + width / 2, cy: top + height / 2 };
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    return el;
  }

  function round(n) {
    return Math.round(n * 10) / 10;
  }

  function pt(x, y) {
    return round(x) + ' ' + round(y);
  }

  function arrivalSide(s, t) {
    if (t.t >= s.b + 2) return 'top';
    if (t.l >= s.r + 2) return 'left';
    if (t.r <= s.l - 2) return 'right';
    return 'bottom';
  }

  function placeLandings(list, boxes) {
    var groups = {};
    list.forEach(function (edge) {
      edge.side = arrivalSide(boxes[edge.from.id], boxes[edge.to.id]);
      var key = edge.to.id + ':' + edge.side;
      (groups[key] = groups[key] || []).push(edge);
    });
    Object.keys(groups).forEach(function (key) {
      var group = groups[key];
      var target = boxes[group[0].to.id];
      var across = group[0].side === 'top' || group[0].side === 'bottom';
      group.sort(function (a, b) {
        var sa = boxes[a.from.id];
        var sb = boxes[b.from.id];
        return across ? sa.cx - sb.cx : sa.cy - sb.cy;
      });
      var length = across ? target.r - target.l : target.b - target.t;
      var step = Math.min(14, length / (group.length + 1));
      group.forEach(function (edge, i) { edge.offset = (i - (group.length - 1) / 2) * step; });
    });
  }

  function edgeShape(edge, boxes) {
    var s = boxes[edge.from.id];
    var t = boxes[edge.to.id];
    var o = edge.offset || 0;
    var x0, y0, x1, y1, dx, dy;
    if (edge.side === 'top') {
      x0 = s.cx; y0 = s.b; x1 = t.cx + o; y1 = t.t; dx = 0; dy = 1;
    } else if (edge.side === 'bottom') {
      x0 = s.cx; y0 = s.t; x1 = t.cx + o; y1 = t.b; dx = 0; dy = -1;
    } else if (edge.side === 'left') {
      x0 = s.r; y0 = s.cy; x1 = t.l; y1 = t.cy + o; dx = 1; dy = 0;
    } else {
      x0 = s.l; y0 = s.cy; x1 = t.r; y1 = t.cy + o; dx = -1; dy = 0;
    }
    var ex = x1 - dx * ARROW;
    var ey = y1 - dy * ARROW;
    var line;
    if ((dx === 0 && Math.abs(ex - x0) < 1) || (dy === 0 && Math.abs(ey - y0) < 1)) {
      line = 'M' + pt(x0, y0) + 'L' + pt(ex, ey);
    } else {
      var k = Math.max(12, Math.abs(dx ? ex - x0 : ey - y0) / 2);
      line = 'M' + pt(x0, y0) + 'C' + pt(x0 + dx * k, y0 + dy * k) + ' ' + pt(ex - dx * k, ey - dy * k) + ' ' + pt(ex, ey);
    }
    var w = 4.5;
    var head = 'M' + pt(ex - dy * w, ey + dx * w) + 'L' + pt(x1, y1) + 'L' + pt(ex + dy * w, ey - dx * w) + 'Z';
    return { line: line, head: head };
  }

  /* 把 list 里的箭头画进 svg；origin 是 svg 铺满的那个元素，scale 是它的 CSS 缩放。 */
  function drawEdges(svg, origin, list, elementOf, scale) {
    var frame = origin.getBoundingClientRect();
    if (!frame.width) return false;
    var boxes = {};
    list.forEach(function (edge) {
      [edge.from, edge.to].forEach(function (node) {
        if (!boxes[node.id]) boxes[node.id] = boxOf(elementOf(node), frame, scale);
      });
    });
    placeLandings(list, boxes);
    var width = round(frame.width / scale);
    var height = round(frame.height / scale);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.textContent = '';
    // 跨系的箭头先画，压在系内箭头下面。
    list.slice().sort(function (a, b) { return (b.cross ? 1 : 0) - (a.cross ? 1 : 0); }).forEach(function (edge) {
      var shape = edgeShape(edge, boxes);
      var group = svgEl('g', {
        class: 'tt-edge' + (edge.kind === 'related' ? ' is-related' : '') + (edge.cross ? ' is-cross' : ''),
        'data-from': edge.from.id,
        'data-to': edge.to.id
      });
      group.appendChild(svgEl('path', { class: 'tt-edge-line', d: shape.line }));
      group.appendChild(svgEl('path', { class: 'tt-edge-head', d: shape.head }));
      svg.appendChild(group);
    });
    return true;
  }

  function draw(branch) {
    if (!branch || branch.panel.hidden || (fold && !fold.open)) return;
    drawEdges(branch.svg, branch.tree, branch.edges, function (node) { return node.el; }, 1);
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
  }
  if (side) side.hidden = false;

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

  var cardFor = null; // 卡片当前是给哪个节点元素弹的
  var lastPointer = '';

  function hideCard() {
    if (card) {
      card.hidden = true;
      card.classList.remove('is-touch');
    }
    cardFor = null;
  }

  // 这次点击是不是手指点的（键盘回车触发的 click 的 detail 是 0）。
  function touchActivation(e) {
    return lastPointer === 'touch' && e.detail !== 0;
  }

  function focusVisible(el) {
    try {
      return el.matches(':focus-visible');
    } catch (e) {
      return true;
    }
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
    // 卡片太高、触屏上放不下时只有 body 在卡片里滚动，底部的「点击阅读笔记」一直露着。
    var body = cardPart(card, 'div', 'roadmap-node-card__body');

    var eyebrow = [zh ? info.category_zh : info.category, (zh ? info.date_zh : info.date) || (year && year.textContent)]
      .filter(Boolean)
      .join(' · ');
    if (eyebrow) cardPart(body, 'div', 'roadmap-node-card__eyebrow', eyebrow);

    var title = (zh ? info.zh_title || info.title : info.title) || nodeLabel(node, zh);
    var subtitle = zh ? info.title : info.zh_title;
    cardPart(body, 'div', 'roadmap-node-card__title', title);
    if (subtitle && subtitle !== title) cardPart(body, 'div', 'roadmap-node-card__subtitle', subtitle);

    if (info.summary_zh) {
      // 简介摘自中文笔记的「🎯 一句话总结」；公式交给页面已加载的 KaTeX。
      var summary = cardPart(body, 'p', 'roadmap-node-card__summary', info.summary_zh);
      summary.setAttribute('lang', 'zh-CN');
      if (typeof window.renderKaTeXIn === 'function') window.renderKaTeXIn(summary);
    }

    var path = [];
    if (node.after.length) path.push((zh ? '前置：' : 'Prerequisites: ') + linkList(node, node.after, zh));
    if (node.related.length) path.push((zh ? '相关：' : 'Related: ') + linkList(node, node.related, zh));
    if (path.length) cardPart(body, 'div', 'roadmap-node-card__path', path.join(zh ? '；' : '; '));

    if (hasVideo(node, info)) {
      var video = cardPart(body, 'div', 'roadmap-node-card__video');
      cardPart(video, 'div', 'roadmap-node-card__video-title', zh ? '▶ 含配音讲解视频' : '▶ Narrated explainer video');
      var videoMeta = [];
      if (info.video_seconds) videoMeta.push(formatDuration(info.video_seconds, zh));
      if (info.scenes) videoMeta.push(zh ? info.scenes + ' 幕讲解动画' : info.scenes + '-scene animation');
      videoMeta.push(zh ? '中文配音与字幕，可下载' : 'Chinese voice-over & subtitles, downloadable');
      cardPart(video, 'div', 'roadmap-node-card__video-meta', videoMeta.join(' · '));
    } else if (info.scenes) {
      cardPart(body, 'div', 'roadmap-node-card__video',
        zh ? '含 ' + info.scenes + ' 幕讲解动画' : info.scenes + '-scene explainer animation');
    }

    var meta = [];
    if (info.arxiv) meta.push('arXiv ' + info.arxiv);
    if (info.open_source) meta.push(zh ? '含开源代码' : 'Open source code');
    if (meta.length) cardPart(body, 'div', 'roadmap-node-card__meta', meta.join(' · '));

    // 鼠标悬停时卡片不接点击，这一行只是提示；触屏弹出的卡片能点，它就是进入笔记的按钮。
    var external = node.el.classList.contains('tt-node--external');
    var action = cardPart(card, 'a', 'roadmap-node-card__action', external
      ? (zh ? '点击打开论文原文 ↗' : 'Click to open the paper ↗')
      : (zh ? '点击阅读笔记 →' : 'Click to read the note →'));
    action.href = node.el.getAttribute('href');
  }

  function placeCard(el, touch) {
    var gap = 10;
    var margin = 8;
    var rect = el.getBoundingClientRect();
    card.style.maxHeight = '';
    var width = card.offsetWidth;
    var height = card.offsetHeight;
    var left = Math.max(margin, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - margin));
    var below = window.innerHeight - margin - rect.bottom - gap;
    var above = rect.top - gap - margin;
    var top = rect.bottom + gap;
    if (height > below && height <= above) top = rect.top - gap - height;
    else if (touch && height > below) {
      // 触屏上卡片能点，不能盖住刚点的节点（再点一次它就打开笔记）：上下都放不下时，
      // 放在空间大的一边、压低高度，卡片里面滚动。
      var room = Math.max(above, below);
      card.style.maxHeight = room + 'px';
      height = card.offsetHeight;
      top = below >= above ? rect.bottom + gap : rect.top - gap - height;
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
    card.style.left = left + 'px';
    card.style.top = top + 'px';
  }

  function showCard(node, el, touch) {
    if (!card) {
      card = document.createElement('div');
      card.id = 'roadmap-node-card';
      card.className = 'roadmap-node-card';
      card.setAttribute('role', 'tooltip');
      card.hidden = true;
      document.body.appendChild(card);
    }
    fillCard(node);
    card.classList.toggle('is-touch', !!touch);
    // 键盘聚焦节点时节点本身就是这条链接，卡片里的那条不进 Tab 顺序。
    card.querySelector('.roadmap-node-card__action').tabIndex = touch ? 0 : -1;
    card.hidden = false;
    cardFor = el || node.el;
    placeCard(cardFor, touch);
  }

  /* 节点与卡片，分系视图和全局总览共用：
     - 鼠标悬停、键盘聚焦：弹卡片（只看，不接点击），点节点打开笔记；
     - 触屏：第一次点节点只弹卡片、点亮路线，卡片可以点，点上面的「点击阅读笔记」进入笔记；
       再点同一个节点也直接打开，点别处收起卡片。 */
  function bindNodeCard(node, el, trace, untrace) {
    el.setAttribute('aria-describedby', 'roadmap-node-card');
    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch') return;
      trace();
      showCard(node, el, false);
    });
    el.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'touch') return;
      untrace();
      hideCard();
    });
    // 只在键盘聚焦时弹：有的浏览器点按链接也会让它获得焦点，那时由下面的 click 决定弹不弹。
    el.addEventListener('focus', function () {
      if (!focusVisible(el)) return;
      trace();
      showCard(node, el, false);
    });
    el.addEventListener('blur', function (e) {
      if (card && e.relatedTarget && card.contains(e.relatedTarget)) return;
      untrace();
      hideCard();
    });
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch') hideCard();
    });
    el.addEventListener('click', function (e) {
      if (!touchActivation(e) || cardFor === el) return;
      e.preventDefault();
      trace();
      showCard(node, el, true);
    });
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
    bindNodeCard(node, el, function () { traceIds(node.branch.panel, [node]); }, clearTrace);
  });

  document.addEventListener('pointerdown', function (e) {
    lastPointer = e.pointerType;
    // 触屏：点卡片和节点以外的地方，收起卡片和点亮的路线。
    if (e.pointerType !== 'touch') return;
    if ((card && card.contains(e.target)) || (e.target.closest && e.target.closest('.tt-node'))) return;
    hideCard();
    clearTrace();
    clearMapTrace();
  }, true);

  window.addEventListener('scroll', function (e) {
    if (card && card.contains(e.target)) return; // 卡片自己在里面滚动
    hideCard();
  }, true);
  window.addEventListener('resize', hideCard);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    hideCard();
    if (map && !map.el.hidden) closeMap();
  });

  /* ─── 全局总览 ─── */
  var map = null;

  function buildMap() {
    var el = document.createElement('div');
    el.id = 'roadmap-map';
    el.className = 'tt-map';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'tt-map-title');
    el.hidden = true;

    var backdrop = document.createElement('div');
    backdrop.className = 'tt-map-backdrop';
    backdrop.setAttribute('data-map-close', '');
    el.appendChild(backdrop);

    var panel = document.createElement('div');
    panel.className = 'tt-map-panel';
    el.appendChild(panel);

    var bar = document.createElement('div');
    bar.className = 'tt-map-bar';
    panel.appendChild(bar);
    var heading = document.createElement('h2');
    heading.id = 'tt-map-title';
    heading.className = 'tt-map-title';
    heading.appendChild(bilingual('span', '', 'Global overview', '全局总览'));
    var total = Object.keys(nodes).length;
    heading.appendChild(bilingual('span', 'tt-map-count',
      total + ' papers · ' + branches.length + ' branches', total + ' 篇 · ' + branches.length + ' 系'));
    bar.appendChild(heading);
    var legend = document.createElement('div');
    legend.className = 'tt-map-legend';
    legend.appendChild(bilingual('p', '',
      'Solid: prerequisite · dashed: related. Hover over a node (tap it on touch screens) to light up its route (dark) and what it leads to (light); click a branch name to open it.',
      '实线是前置，虚线是相关拓展。悬停节点（触屏上点一下）：深色是它的前置路线，浅色是它通往的后续；点系名进入那一系。'));
    legend.appendChild(bilingual('p', 'tt-map-hint tt-map-hint--mouse',
      'Drag or scroll to pan; Ctrl / ⌘ + scroll, a trackpad pinch or + / − to zoom; 0 resets.',
      '拖动或滚轮平移；Ctrl / ⌘ + 滚轮、触控板捏合或 + / − 键缩放，0 键复位。'));
    legend.appendChild(bilingual('p', 'tt-map-hint tt-map-hint--touch',
      'Swipe to pan, pinch with two fingers to zoom; tap a node for its card, then tap “Click to read the note” on the card.',
      '单指拖动平移，双指捏合缩放；点节点弹出卡片，再点卡片上的「点击阅读笔记」进入。'));
    bar.appendChild(legend);

    var controls = document.createElement('div');
    controls.className = 'tt-map-controls';
    controls.setAttribute('role', 'group');
    setBilingualAria(controls, 'Zoom', '缩放');
    function controlButton(className, icon, en, zh) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'tt-map-btn ' + className;
      setBilingualAria(button, en, zh);
      button.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-' + icon + '"></use></svg>';
      controls.appendChild(button);
      return button;
    }
    var zoomOut = controlButton('tt-map-zoom-out', 'minus', 'Zoom out', '缩小');
    var level = document.createElement('output');
    level.className = 'tt-map-level';
    level.setAttribute('aria-live', 'polite');
    controls.appendChild(level);
    var zoomIn = controlButton('tt-map-zoom-in', 'plus', 'Zoom in', '放大');
    var reset = controlButton('tt-map-reset', 'frame-corners', 'Reset view (0)', '复位（0 键）');
    var layoutButton = document.createElement('button');
    layoutButton.type = 'button';
    layoutButton.className = 'tt-map-btn tt-map-layout';
    controls.appendChild(layoutButton);
    bar.appendChild(controls);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'tt-map-close';
    close.setAttribute('data-map-close', '');
    setBilingualAria(close, 'Close', '关闭');
    close.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-x"></use></svg>';
    bar.appendChild(close);

    var viewport = document.createElement('div');
    viewport.className = 'tt-map-viewport';
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'group');
    setBilingualAria(viewport,
      'Overview map: arrow keys pan, + / − zoom, 0 resets',
      '全局总览图：方向键平移，+ / − 缩放，0 键复位');
    panel.appendChild(viewport);
    var sizer = document.createElement('div');
    sizer.className = 'tt-map-sizer';
    viewport.appendChild(sizer);
    var canvas = document.createElement('div');
    canvas.className = 'tt-map-canvas';
    sizer.appendChild(canvas);
    var svg = svgEl('svg', { class: 'tt-edges tt-map-edges', 'aria-hidden': 'true', focusable: 'false' });
    canvas.appendChild(svg);

    branches.slice().sort(function (a, b) { return a.mapOrder - b.mapOrder; }).forEach(function (branch) {
      var cluster = document.createElement('section');
      cluster.className = 'tt-cluster';
      cluster.setAttribute('data-branch', branch.id);
      cluster.setAttribute('data-track', branch.panel.getAttribute('data-track'));
      var head = document.createElement('button');
      head.type = 'button';
      head.className = 'tt-cluster-head';
      var mark = document.createElement('span');
      mark.className = 'tt-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = branch.mark;
      head.appendChild(mark);
      head.appendChild(bilingual('span', 'tt-cluster-name', branchName(branch, false), branchName(branch, true)));
      setBilingualAria(head,
        'Open branch ' + branch.mark + ': ' + branchName(branch, false),
        '进入第 ' + branch.mark + ' 系：' + branchName(branch, true));
      head.addEventListener('click', function () {
        closeMap(true);
        select(branch.id, { focus: true });
      });
      cluster.appendChild(head);

      var tree = branch.tree.cloneNode(true);
      tree.classList.add('tt-tree--map');
      var inner = tree.querySelector('.tt-edges');
      if (inner) tree.removeChild(inner);
      Array.prototype.forEach.call(tree.querySelectorAll('.tt-node'), function (copy) {
        copy.removeAttribute('id');
        copy.setAttribute('draggable', 'false');
        copy.classList.remove('is-path', 'is-flash');
        var node = nodes[copy.getAttribute('data-node')];
        node.mapEl = copy;
        copy.setAttribute('aria-label', node.el.getAttribute('aria-label') || '');
        bindNodeCard(node, copy, function () { traceMap(node); }, clearMapTrace);
      });
      cluster.appendChild(tree);
      canvas.appendChild(cluster);
    });

    // 拖动平移之后松手，不当成一次点击（不打开笔记、不切系）。
    el.addEventListener('click', function (e) {
      if (!map.suppressClick) return;
      map.suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-map-close]')) closeMap();
      else if (!e.target.closest('.tt-node')) {
        clearMapTrace();
        hideCard();
      }
    });
    zoomIn.addEventListener('click', function () { zoomTo(map.scale * ZOOM_STEP); });
    zoomOut.addEventListener('click', function () { zoomTo(map.scale / ZOOM_STEP); });
    reset.addEventListener('click', resetView);
    layoutButton.addEventListener('click', function () {
      map.reading = !map.reading;
      setLayout();
    });
    // 窗口里 Tab 只在窗口内循环。
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') {
        onMapKey(e);
        return;
      }
      var focusables = Array.prototype.filter.call(
        panel.querySelectorAll('a[href], button:not([hidden]):not([disabled]), [tabindex="0"]'),
        function (item) { return item.offsetParent !== null; }
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    viewport.addEventListener('scroll', hideCard);

    document.body.appendChild(el);
    map = { el: el, viewport: viewport, sizer: sizer, canvas: canvas, svg: svg, close: close,
      zoomIn: zoomIn, zoomOut: zoomOut, level: level, layoutButton: layoutButton,
      layouts: null, reading: false, width: 0, height: 0, base: 1, minScale: 1, scale: 1,
      opener: null, suppressClick: false };
    bindPanZoom();
  }

  /* 按窗口大小挑排法。各系从左到右排、放不下就换行，试一遍不同的总宽度，备好两种看法：
     - 全貌：整张缩放到放得下，取缩放比例最大（同样大时长宽比最接近窗口）的排法；
     - 放大阅读：不横向拖动。取宽度放得下的最宽排法、按原大显示，只上下滚；连最窄的
       排法（一列）都放不下时（手机），缩到正好占满宽度。
     手机上两种都比原大小：全貌的字只有 4–5px，只用来看结构；放大阅读时约 9–11px。 */
  function fitMap() {
    var canvas = map.canvas;
    var style = getComputedStyle(map.viewport);
    var availW = map.viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    var availH = map.viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (availW <= 0 || availH <= 0) return;
    canvas.style.transform = 'none';
    var clusters = Array.prototype.slice.call(canvas.querySelectorAll('.tt-cluster'));
    canvas.style.width = '100000px';
    var widest = 0;
    var total = 0;
    clusters.forEach(function (cluster) {
      widest = Math.max(widest, cluster.offsetWidth);
      total += cluster.offsetWidth;
    });
    var canvasStyle = getComputedStyle(canvas);
    var pad = parseFloat(canvasStyle.paddingLeft) + parseFloat(canvasStyle.paddingRight);
    var gap = parseFloat(canvasStyle.columnGap) || 0;
    var whole = null;
    var read = null;
    var narrowest = null;
    for (var width = Math.ceil(widest + pad); width <= total + pad + gap * clusters.length; width += 24) {
      canvas.style.width = width + 'px';
      var height = canvas.offsetHeight;
      var layout = { width: width, height: height };
      if (!narrowest) narrowest = layout;
      var scale = Math.min(1, availW / width, availH / height);
      var shape = Math.abs(Math.log((width / height) / (availW / availH)));
      if (!whole || scale > whole.scale + 0.01 || (scale > whole.scale - 0.01 && shape < whole.shape)) {
        whole = { width: width, height: height, scale: scale, shape: shape };
      }
      if (width <= availW && (!read || width > read.width)) read = { width: width, height: height, scale: 1 };
    }
    if (!read) read = { width: narrowest.width, height: narrowest.height, scale: availW / narrowest.width };
    map.layouts = { whole: whole, read: read };
    map.fittedWidth = window.innerWidth;
    setLayout();
  }

  function availableSize() {
    var style = getComputedStyle(map.viewport);
    return {
      w: map.viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      h: map.viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    };
  }

  /* 换排法（打开窗口、改窗口大小、全貌 ↔ 放大阅读）：重排、重画箭头，缩放回到这种排法的起点。
     箭头画在画布自己的坐标里，之后缩放、平移都不用重画。 */
  function setLayout() {
    var layout = map.reading ? map.layouts.read : map.layouts.whole;
    var avail = availableSize();
    map.canvas.style.transform = 'none';
    map.canvas.style.width = layout.width + 'px';
    map.width = layout.width;
    map.height = map.canvas.offsetHeight;
    map.base = layout.scale;
    // 最多缩到整张放得下，最多放大到 MAX_ZOOM。
    map.minScale = Math.min(map.base, avail.w / map.width, avail.h / map.height);
    map.layoutButton.hidden = map.layouts.whole.scale >= 0.98;
    var label = map.reading ? ['Show everything', '缩小看全貌'] : ['Zoom in to read', '放大阅读'];
    map.layoutButton.setAttribute('data-en', label[0]);
    map.layoutButton.setAttribute('data-zh', label[1]);
    map.layoutButton.textContent = isZh() ? label[1] : label[0];
    map.el.classList.toggle('is-reading', map.reading);
    hideCard();
    clearMapTrace();
    setScale(map.base);
    map.viewport.scrollTop = 0;
    map.viewport.scrollLeft = 0;
    drawEdges(map.svg, map.canvas, edges, function (node) { return node.mapEl; }, map.scale);
  }

  /* 只改缩放：画布按左上角缩放，外面的 sizer 跟着改大小，滚动范围就是缩放后的画布。 */
  function setScale(scale) {
    map.scale = scale;
    map.canvas.style.transform = scale === 1 ? 'none' : 'scale(' + scale + ')';
    map.sizer.style.width = Math.ceil(map.width * scale) + 'px';
    map.sizer.style.height = Math.ceil(map.height * scale) + 'px';
    map.level.textContent = Math.round(scale * 100) + '%';
    map.zoomOut.disabled = scale <= map.minScale + 0.001;
    map.zoomIn.disabled = scale >= MAX_ZOOM - 0.001;
  }

  function clampScale(scale) {
    return Math.max(map.minScale, Math.min(MAX_ZOOM, scale));
  }

  /* 缩放后把画布上的 (x, y) 挪回屏幕上的 (clientX, clientY)，捏合、滚轮缩放时手指 / 光标下的那一点不动。 */
  function keepPoint(x, y, clientX, clientY) {
    var frame = map.canvas.getBoundingClientRect();
    map.viewport.scrollLeft += frame.left + x * map.scale - clientX;
    map.viewport.scrollTop += frame.top + y * map.scale - clientY;
  }

  function zoomTo(scale, clientX, clientY) {
    scale = clampScale(scale);
    if (Math.abs(scale - map.scale) < 0.0005) return;
    if (clientX == null) {
      var box = map.viewport.getBoundingClientRect();
      clientX = box.left + box.width / 2;
      clientY = box.top + box.height / 2;
    }
    var frame = map.canvas.getBoundingClientRect();
    var x = (clientX - frame.left) / map.scale;
    var y = (clientY - frame.top) / map.scale;
    hideCard();
    setScale(scale);
    keepPoint(x, y, clientX, clientY);
  }

  function resetView() {
    hideCard();
    setScale(map.base);
    map.viewport.scrollTop = 0;
    map.viewport.scrollLeft = 0;
  }

  /* 键盘：+ / − 以视窗中心缩放，0 复位；方向键在视窗或图里的节点上时平移（Shift 一次多走）。
     带 Ctrl / ⌘ / Alt 的组合键留给浏览器（Ctrl + = 是页面缩放）。 */
  function onMapKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var key = e.key;
    if (key === '+' || key === '=') {
      zoomTo(map.scale * ZOOM_STEP);
    } else if (key === '-' || key === '_') {
      zoomTo(map.scale / ZOOM_STEP);
    } else if (key === '0') {
      resetView();
    } else if (PAN_KEYS[key] && map.viewport.contains(e.target)) {
      var step = e.shiftKey ? 240 : 60;
      map.viewport.scrollLeft += PAN_KEYS[key][0] * step;
      map.viewport.scrollTop += PAN_KEYS[key][1] * step;
    } else {
      return;
    }
    e.preventDefault();
  }

  /* 鼠标 / 触控笔按住拖动平移；触屏单指交给原生滚动（有惯性），双指捏合在这里算缩放。 */
  function bindPanZoom() {
    var viewport = map.viewport;
    var drag = null;
    var pinch = null;
    var gesture = null;

    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: viewport.scrollLeft, top: viewport.scrollTop, moved: false };
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      var dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.abs(dx) + Math.abs(dy) < 5) return;
        drag.moved = true;
        viewport.setPointerCapture(e.pointerId);
        viewport.classList.add('is-dragging');
        hideCard();
        clearMapTrace();
      }
      viewport.scrollLeft = drag.left - dx;
      viewport.scrollTop = drag.top - dy;
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.moved) {
        map.suppressClick = true;
        setTimeout(function () { map.suppressClick = false; }, 0);
        viewport.classList.remove('is-dragging');
      }
      drag = null;
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    function touchCenter(touches) {
      var a = touches[0];
      var b = touches[1];
      return {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
        d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      };
    }
    viewport.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 2) return;
      var c = touchCenter(e.touches);
      var frame = map.canvas.getBoundingClientRect();
      pinch = { d: c.d, scale: map.scale, x: (c.x - frame.left) / map.scale, y: (c.y - frame.top) / map.scale };
      hideCard();
      clearMapTrace();
    }, { passive: true });
    viewport.addEventListener('touchmove', function (e) {
      if (!pinch || e.touches.length !== 2 || pinch.d < 1) return;
      e.preventDefault();
      var c = touchCenter(e.touches);
      setScale(clampScale(pinch.scale * c.d / pinch.d));
      // 两指一起挪也跟着平移：始终让捏合开始时两指中间的那一点留在两指中间。
      keepPoint(pinch.x, pinch.y, c.x, c.y);
    }, { passive: false });
    function endPinch(e) {
      if (e.touches.length < 2) pinch = null;
    }
    viewport.addEventListener('touchend', endPinch);
    viewport.addEventListener('touchcancel', endPinch);

    // Ctrl / ⌘ + 滚轮缩放（Chrome、Firefox 的触控板捏合也是这样报的）；不按修饰键就是原生滚动平移。
    viewport.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      var delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      else if (e.deltaMode === 2) delta *= viewport.clientHeight;
      zoomTo(map.scale * Math.exp(-delta * 0.002), e.clientX, e.clientY);
    }, { passive: false });

    // Safari 的触控板捏合发的是 gesture 事件；iOS 上同时还有 touch 事件，交给上面的捏合处理，
    // 这里只拦住整页缩放。
    map.el.addEventListener('gesturestart', function (e) {
      e.preventDefault();
      gesture = pinch ? null : { scale: map.scale };
    });
    map.el.addEventListener('gesturechange', function (e) {
      e.preventDefault();
      if (gesture && !pinch) zoomTo(gesture.scale * e.scale, e.clientX, e.clientY);
    });
    map.el.addEventListener('gestureend', function (e) {
      e.preventDefault();
      gesture = null;
    });
  }

  function traceMap(start) {
    var before = {};
    var after = {};
    var stack = [start.id];
    while (stack.length) {
      var node = nodes[stack.pop()];
      node.after.concat(node.related).forEach(function (from) {
        if (nodes[from] && !before[from]) {
          before[from] = true;
          stack.push(from);
        }
      });
    }
    stack = [start.id];
    while (stack.length) {
      var id = stack.pop();
      edges.forEach(function (edge) {
        if (edge.from.id === id && !after[edge.to.id]) {
          after[edge.to.id] = true;
          stack.push(edge.to.id);
        }
      });
    }
    map.canvas.classList.add('is-tracing');
    Object.keys(nodes).forEach(function (id) {
      var el = nodes[id].mapEl;
      el.classList.toggle('is-path', id === start.id || !!before[id]);
      el.classList.toggle('is-next', !!after[id]);
    });
    Array.prototype.forEach.call(map.svg.querySelectorAll('.tt-edge'), function (el) {
      var from = el.getAttribute('data-from');
      var to = el.getAttribute('data-to');
      el.classList.toggle('is-path', to === start.id || !!before[to]);
      el.classList.toggle('is-next', (from === start.id || !!after[from]) && !!after[to]);
    });
  }

  function clearMapTrace() {
    if (!map) return;
    Array.prototype.forEach.call(map.el.querySelectorAll('.is-tracing, .is-path, .is-next'), function (el) {
      el.classList.remove('is-tracing', 'is-path', 'is-next');
    });
  }

  function openMap() {
    if (!map) buildMap();
    map.opener = document.activeElement;
    map.reading = false;
    map.el.hidden = false;
    document.body.classList.add('tt-map-is-open');
    hideCard();
    fitMap();
    map.close.focus();
  }

  function closeMap(keepFocus) {
    if (!map || map.el.hidden) return;
    map.el.hidden = true;
    document.body.classList.remove('tt-map-is-open');
    hideCard();
    clearMapTrace();
    if (!keepFocus && map.opener && typeof map.opener.focus === 'function') map.opener.focus();
  }

  function refitMap() {
    if (map && !map.el.hidden) fitMap();
  }

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
    Object.keys(nodes).forEach(function (id) {
      labelNode(nodes[id]);
      if (nodes[id].mapEl) nodes[id].mapEl.setAttribute('aria-label', nodes[id].el.getAttribute('aria-label'));
    });
    requestAnimationFrame(function () {
      redraw();
      refitMap();
    });
  });

  if (mapButton) mapButton.addEventListener('click', openMap);
  var refitQueued = false;
  // 手机浏览器的地址栏收起 / 展开也会触发 resize（只变高度）：用户已经缩放或拖动过就别把视图复位。
  window.addEventListener('resize', function () {
    if (refitQueued || !map || map.el.hidden) return;
    refitQueued = true;
    requestAnimationFrame(function () {
      refitQueued = false;
      var widthChanged = window.innerWidth !== map.fittedWidth;
      var untouched = map.scale === map.base && !map.viewport.scrollLeft && !map.viewport.scrollTop;
      if (widthChanged || untouched) refitMap();
    });
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
})();
