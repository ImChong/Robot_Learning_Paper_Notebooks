/* 首页「推荐学习路线图」：游戏天赋树式的分系视图。
   标记在 _includes/roadmap-tree.html，数据在 _data/roadmap.yml。一次只显示一系：
   - 选系：左边的标签（窄屏上是顶部一排编号），记住上次看的是哪一系；
   - 连线：按节点在网格里的实际位置画 SVG 曲线，前置是实线，相关拓展是虚线；
   - 跨系：起点或终点在别的系的箭头不画在树里，换成树上方「前置」、下方「通往」两排
     标签，点一下切到那一系并闪一下那个节点；
   - 悬停 / 聚焦节点：点亮它在这一系里的整条前置链，弹出论文详情卡片（数据来自
     #roadmap-node-details，由 _data/papers.json 生成）。触屏点按直接打开笔记，不弹卡片；
     卡片 pointer-events: none，不挡点击；
   - 全局总览：一个窗口里把 11 系按 map_order 排开，所有节点和所有箭头（含跨系的）一起画，
     按窗口大小挑排法、缩放到放得下；悬停节点点亮它的整条前置路线（深色）和后续（浅色）。
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

  function placeCard(el) {
    var gap = 10;
    var margin = 8;
    var rect = el.getBoundingClientRect();
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

  function showCard(node, el) {
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
    placeCard(el || node.el);
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
      showCard(node, el);
    });
    el.addEventListener('focus', function () {
      traceIds(node.branch.panel, [node]);
      showCard(node, el);
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
    bar.appendChild(bilingual('p', 'tt-map-legend',
      'Solid: prerequisite · dashed: related. Hover over a node (tap once on touch screens) to light up its route (dark) and what it leads to (light); click a branch name to open it.',
      '实线是前置，虚线是相关拓展。悬停节点（触屏上先点一下）：深色是它的前置路线，浅色是它通往的后续；点系名进入那一系。'));
    var zoom = document.createElement('button');
    zoom.type = 'button';
    zoom.className = 'tt-map-zoom';
    bar.appendChild(zoom);
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'tt-map-close';
    close.setAttribute('data-map-close', '');
    setBilingualAria(close, 'Close', '关闭');
    close.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-x"></use></svg>';
    bar.appendChild(close);

    var viewport = document.createElement('div');
    viewport.className = 'tt-map-viewport';
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
        copy.classList.remove('is-path', 'is-flash');
        var node = nodes[copy.getAttribute('data-node')];
        node.mapEl = copy;
        copy.setAttribute('aria-label', node.el.getAttribute('aria-label') || '');
        copy.setAttribute('aria-describedby', 'roadmap-node-card');
        copy.addEventListener('pointerenter', function (e) {
          if (e.pointerType === 'touch') return;
          traceMap(node);
          showCard(node, copy);
        });
        copy.addEventListener('focus', function () {
          traceMap(node);
          showCard(node, copy);
        });
        copy.addEventListener('pointerleave', function (e) {
          if (e.pointerType === 'touch') return;
          clearMapTrace();
          hideCard();
        });
        // 触屏没有悬停：第一次点只点亮路线、弹卡片，再点一次才打开笔记。
        copy.addEventListener('click', function (e) {
          if (map.pointerType !== 'touch' || map.armed === node.id) return;
          e.preventDefault();
          map.armed = node.id;
          traceMap(node);
          showCard(node, copy);
        });
        copy.addEventListener('blur', function () {
          clearMapTrace();
          hideCard();
        });
        copy.addEventListener('pointerdown', hideCard);
      });
      cluster.appendChild(tree);
      canvas.appendChild(cluster);
    });

    el.addEventListener('pointerdown', function (e) {
      map.pointerType = e.pointerType;
    }, true);
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-map-close]')) closeMap();
      else if (!e.target.closest('.tt-node')) {
        map.armed = null;
        clearMapTrace();
        hideCard();
      }
    });
    zoom.addEventListener('click', function () {
      map.zoomed = !map.zoomed;
      applyScale();
    });
    // 窗口里 Tab 只在窗口内循环。
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusables = Array.prototype.filter.call(
        panel.querySelectorAll('a[href], button:not([hidden])'),
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
    map = { el: el, viewport: viewport, sizer: sizer, canvas: canvas, svg: svg, zoom: zoom, close: close,
      fitScale: 1, scale: 1, zoomed: false, opener: null, pointerType: '', armed: null };
  }

  /* 按窗口大小挑一种排法：各系从左到右排、放不下就换行，试一遍不同的总宽度，
     取缩放比例最大（同样大时取长宽比最接近窗口）的那一种。 */
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
    var best = null;
    for (var width = widest + pad; width <= total + pad + gap * clusters.length; width += 24) {
      canvas.style.width = width + 'px';
      var height = canvas.offsetHeight;
      var scale = Math.min(1, availW / width, availH / height);
      var shape = Math.abs(Math.log((width / height) / (availW / availH)));
      if (!best || scale > best.scale + 0.01 || (scale > best.scale - 0.01 && shape < best.shape)) {
        best = { width: width, height: height, scale: scale, shape: shape };
      }
    }
    canvas.style.width = best.width + 'px';
    map.width = best.width;
    map.height = canvas.offsetHeight;
    map.fitScale = best.scale;
    applyScale();
  }

  function applyScale() {
    var scale = map.zoomed ? 1 : map.fitScale;
    map.scale = scale;
    map.canvas.style.transform = scale === 1 ? 'none' : 'scale(' + scale + ')';
    map.sizer.style.width = Math.ceil(map.width * scale) + 'px';
    map.sizer.style.height = Math.ceil(map.height * scale) + 'px';
    var canZoom = map.fitScale < 0.98;
    map.zoom.hidden = !canZoom;
    var label = map.zoomed ? ['Fit to window', '适应窗口'] : ['Actual size', '放大到 100%'];
    map.zoom.setAttribute('data-en', label[0]);
    map.zoom.setAttribute('data-zh', label[1]);
    map.zoom.textContent = isZh() ? label[1] : label[0];
    map.el.classList.toggle('is-zoomed', map.zoomed);
    hideCard();
    clearMapTrace();
    drawEdges(map.svg, map.canvas, edges, function (node) { return node.mapEl; }, scale);
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
    map.armed = null;
    Array.prototype.forEach.call(map.el.querySelectorAll('.is-tracing, .is-path, .is-next'), function (el) {
      el.classList.remove('is-tracing', 'is-path', 'is-next');
    });
  }

  function openMap() {
    if (!map) buildMap();
    map.opener = document.activeElement;
    map.zoomed = false;
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
  window.addEventListener('resize', function () {
    if (refitQueued || !map || map.el.hidden) return;
    refitQueued = true;
    requestAnimationFrame(function () {
      refitQueued = false;
      refitMap();
    });
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
})();
