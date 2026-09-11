/* Shared toolkit for the interactive paper demos (assets/js/demos/*.js).
 *
 * _layouts/paper.html loads this file first on any note whose front matter
 * declares `demos: [...]`, then the bundles themselves. The bundles may only
 * assume `window.PaperDemoKit` — everything else (Canvas, DOM) is native,
 * because the site's CSP allows no third-party scripts and
 * scripts/sanitize_paper_html.py strips <script>/<canvas>/<input> out of
 * #paper-body, so a note can ship nothing but the placeholder
 *
 *     <div class="paper-demo" data-demo="ppo-clip"></div>
 *
 * and every widget has to be built at runtime. Styling: assets/css/paper-demos.css.
 *
 * Usage from a bundle:
 *
 *     (function () {
 *       var K = window.PaperDemoKit;
 *       function buildFoo(host) { var root = K.card(host, {...}); ... }
 *       K.mount({ 'paper-foo': buildFoo });
 *     })();
 */

(function () {
  'use strict';

  // ─── tiny DOM kit ────────────────────────────────────────────────────────
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function fmt(x, digits) {
    var d = digits == null ? 2 : digits;
    if (!isFinite(x)) return '∞';
    var s = x.toFixed(d);
    if (/^-0(\.0*)?$/.test(s)) s = s.slice(1); // avoid "-0.00"
    return s;
  }

  function clamp(x, lo, hi) {
    return x < lo ? lo : x > hi ? hi : x;
  }

  function card(host, opts) {
    host.innerHTML = '';
    var root = el('div', 'demo-card');
    var head = el('div', 'demo-head');
    head.appendChild(el('span', 'demo-badge', '交互演示'));
    head.appendChild(el('h4', 'demo-title', opts.title));
    if (opts.sub) head.appendChild(el('p', 'demo-sub', opts.sub));
    root.appendChild(head);
    host.appendChild(root);
    return root;
  }

  function controlsRow(parent) {
    var row = el('div', 'demo-controls');
    parent.appendChild(row);
    return row;
  }

  /* A labelled range input. `format` renders the value, `onInput` gets the number. */
  function slider(parent, opts) {
    var wrap = el('div', 'demo-control');
    var label = el('div', 'demo-control-label');
    label.appendChild(el('span', null, opts.label));
    var valueEl = el('span', 'demo-control-value');
    label.appendChild(valueEl);
    wrap.appendChild(label);

    var input = document.createElement('input');
    input.type = 'range';
    input.min = String(opts.min);
    input.max = String(opts.max);
    input.step = String(opts.step);
    input.value = String(opts.value);
    if (opts.ariaLabel || opts.label) input.setAttribute('aria-label', opts.ariaLabel || opts.label);
    wrap.appendChild(input);
    parent.appendChild(wrap);

    var api = {
      input: input,
      get: function () {
        return parseFloat(input.value);
      },
      set: function (v, silent) {
        input.value = String(v);
        valueEl.textContent = opts.format ? opts.format(api.get()) : String(api.get());
        if (!silent && opts.onInput) opts.onInput(api.get());
      },
      refresh: function () {
        valueEl.textContent = opts.format ? opts.format(api.get()) : String(api.get());
      }
    };

    input.addEventListener('input', function () {
      api.refresh();
      if (opts.onInput) opts.onInput(api.get());
    });
    api.refresh();
    return api;
  }

  function button(parent, text, onClick) {
    var b = el('button', 'demo-btn', text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    parent.appendChild(b);
    return b;
  }

  function checkbox(parent, text, checked, onChange) {
    var label = el('label', 'demo-toggle');
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!checked;
    label.appendChild(input);
    label.appendChild(document.createTextNode(text));
    parent.appendChild(label);
    input.addEventListener('change', function () {
      onChange(input.checked);
    });
    return input;
  }

  function statsRow(parent) {
    var row = el('div', 'demo-readout');
    parent.appendChild(row);
    var api = {
      root: row,
      add: function (key) {
        var box = el('div', 'demo-stat');
        box.appendChild(el('span', 'demo-stat-k', key));
        var v = el('span', 'demo-stat-v', '—');
        box.appendChild(v);
        row.appendChild(box);
        return {
          set: function (text, tone) {
            v.textContent = text;
            v.className = 'demo-stat-v' + (tone ? ' is-' + tone : '');
          }
        };
      }
    };
    return api;
  }

  function verdictBox(parent) {
    var box = el('div', 'demo-verdict');
    parent.appendChild(box);
    return {
      set: function (html, tone) {
        box.textContent = '';
        if (html instanceof Node) {
          box.appendChild(html);
        } else {
          // same tiny markup as note(): **bold** segments, nothing else
          String(html)
            .split(/\*\*/)
            .forEach(function (chunk, i) {
              if (!chunk) return;
              box.appendChild(i % 2 ? el('b', null, chunk) : document.createTextNode(chunk));
            });
        }
        box.className = 'demo-verdict' + (tone ? ' is-' + tone : '');
      }
    };
  }

  function legend(parent, items) {
    var row = el('div', 'demo-legend');
    var spans = [];
    items.forEach(function (it) {
      var s = el('span', null, it.text);
      row.appendChild(s);
      spans.push({ span: s, key: it.key });
    });
    parent.appendChild(row);
    return function (palette) {
      spans.forEach(function (s) {
        s.span.style.color = palette[s.key] || palette.muted;
      });
    };
  }

  function note(parent, lines) {
    var box = el('div', 'demo-note');
    lines.forEach(function (line) {
      var p = el('p');
      // Lines use a tiny markup: **bold** segments only.
      line.split(/\*\*/).forEach(function (chunk, i) {
        if (!chunk) return;
        p.appendChild(i % 2 ? el('b', null, chunk) : document.createTextNode(chunk));
      });
      box.appendChild(p);
    });
    parent.appendChild(box);
  }

  // ─── canvas kit ──────────────────────────────────────────────────────────
  function palette() {
    var cs = getComputedStyle(document.documentElement);
    function v(name, fallback) {
      var got = cs.getPropertyValue(name);
      return (got && got.trim()) || fallback;
    }
    return {
      text: v('--text', '#d4d4d4'),
      muted: v('--demo-muted', '#8a8a8a'),
      grid: v('--demo-grid', '#37373a'),
      border: v('--demo-border', '#3c3c3c'),
      surface: v('--demo-surface', '#212124'),
      surface2: v('--demo-surface-2', '#2a2a2e'),
      accent: v('--demo-accent', '#569cd6'),
      good: v('--demo-good', '#4ec9a4'),
      bad: v('--demo-bad', '#e06c75'),
      warn: v('--demo-warn', '#d7a75f')
    };
  }

  function stage(parent, height) {
    var box = el('div', 'demo-stage');
    var canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    box.appendChild(canvas);
    parent.appendChild(box);
    return { box: box, canvas: canvas, height: height };
  }

  function stageGrid(parent) {
    var grid = el('div', 'demo-stage-grid');
    parent.appendChild(grid);
    return grid;
  }

  /* Prepare a HiDPI canvas and return a drawing context in CSS pixels. */
  function begin(st) {
    var canvas = st.canvas;
    var cssW = Math.max(240, canvas.parentElement.clientWidth || 300);
    var cssH = st.height;
    var dpr = window.devicePixelRatio || 1;
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    var P = palette();
    ctx.fillStyle = P.surface2;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif';
    ctx.textBaseline = 'middle';
    return { ctx: ctx, w: cssW, h: cssH, P: P };
  }

  /* Linear scales for a plot area inset by `pad`. */
  function plot(g, pad, xd, yd) {
    var x0 = pad.l,
      x1 = g.w - pad.r,
      y0 = g.h - pad.b,
      y1 = pad.t;
    return {
      x0: x0,
      x1: x1,
      y0: y0,
      y1: y1,
      sx: function (v) {
        return x0 + ((v - xd[0]) / (xd[1] - xd[0])) * (x1 - x0);
      },
      sy: function (v) {
        return y0 + ((v - yd[0]) / (yd[1] - yd[0])) * (y1 - y0);
      },
      ux: function (px) {
        return xd[0] + ((px - x0) / (x1 - x0)) * (xd[1] - xd[0]);
      },
      xd: xd,
      yd: yd
    };
  }

  function line(ctx, pts, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]);
      else ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.stroke();
    ctx.restore();
  }

  function dot(ctx, x, y, r, fill, stroke) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
    ctx.restore();
  }

  function text(ctx, str, x, y, color, align, font) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    if (font) ctx.font = font;
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  /* Value label for a bar: above its top, or tucked just inside when the bar
     is so tall that the label would collide with the chart title. */
  function barLabel(g, p, x, yTop, str, color) {
    var above = yTop - 9;
    if (above < p.y1 + 12) {
      text(g.ctx, str, x, yTop + 12, g.P.surface2, 'center', '11px monospace');
    } else {
      text(g.ctx, str, x, above, color || g.P.text, 'center', '11px monospace');
    }
  }

  function axes(g, p, opts) {
    var ctx = g.ctx,
      P = g.P;
    ctx.save();
    ctx.strokeStyle = P.grid;
    ctx.lineWidth = 1;
    (opts.yTicks || []).forEach(function (t) {
      var y = Math.round(p.sy(t)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(p.x0, y);
      ctx.lineTo(p.x1, y);
      ctx.stroke();
      text(ctx, opts.yFmt ? opts.yFmt(t) : String(t), p.x0 - 6, y, P.muted, 'right', '11px monospace');
    });
    (opts.xTicks || []).forEach(function (t) {
      var x = Math.round(p.sx(t)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, p.y1);
      ctx.lineTo(x, p.y0);
      ctx.stroke();
      text(ctx, opts.xFmt ? opts.xFmt(t) : String(t), x, p.y0 + 13, P.muted, 'center', '11px monospace');
    });
    ctx.restore();
    if (opts.xLabel) text(ctx, opts.xLabel, p.x1, p.y0 + 27, P.muted, 'right', '11px sans-serif');
    if (opts.yLabel) text(ctx, opts.yLabel, p.x0 - 4, p.y1 - 9, P.muted, 'right', '11px sans-serif');
  }

  // ─── re-render plumbing (theme switch + container resize) ────────────────
  var renderers = [];

  function registerRenderer(fn) {
    renderers.push(fn);
    return fn;
  }

  function renderAll() {
    for (var i = 0; i < renderers.length; i++) {
      try {
        renderers[i]();
      } catch (e) {
        /* one broken demo must not take down the rest of the page */
      }
    }
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAll, 120);
  });

  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].attributeName === 'data-theme') {
          renderAll();
          return;
        }
      }
    }).observe(document.documentElement, { attributes: true });
  }

  function niceTicks(lo, hi, count) {
    var span = hi - lo;
    if (!(span > 0)) return [lo];
    var raw = span / count;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
    var ticks = [];
    for (var t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) {
      ticks.push(Math.abs(t) < 1e-9 ? 0 : t);
    }
    return ticks;
  }


  /* A row of mutually exclusive buttons (the "which variant am I looking at"
     control). `onPick` gets the chosen item's value. */
  function buttonGroup(parent, opts) {
    var wrap = el('div', 'demo-control demo-buttons');
    if (opts.label) {
      wrap = el('div', 'demo-control');
      var lab = el('div', 'demo-control-label');
      lab.appendChild(el('span', null, opts.label));
      wrap.appendChild(lab);
      var row = el('div', 'demo-buttons');
      wrap.appendChild(row);
      parent.appendChild(wrap);
      wrap = row;
    } else {
      parent.appendChild(wrap);
    }

    var btns = [];
    var api = {
      pick: function (value, silent) {
        btns.forEach(function (b) {
          b.node.className = 'demo-btn' + (b.value === value ? ' is-active' : '');
        });
        api.value = value;
        if (!silent && opts.onPick) opts.onPick(value);
      }
    };
    opts.items.forEach(function (it) {
      var node = button(wrap, it.label, function () {
        api.pick(it.value);
      });
      btns.push({ node: node, value: it.value });
    });
    api.pick(opts.value, true);
    return api;
  }

  /* A horizontally scrollable table. `rows` are rebuilt by the caller through
     the returned api; the wrapper keeps the phone layout from overflowing. */
  function table(parent) {
    var wrap = el('div', 'demo-table-wrap');
    var node = el('table', 'demo-table');
    wrap.appendChild(node);
    parent.appendChild(wrap);
    return {
      node: node,
      clear: function () {
        node.innerHTML = '';
      },
      row: function (cells, isHead) {
        var tr = el('tr');
        cells.forEach(function (c, i) {
          var cell = el(i === 0 || isHead ? 'th' : 'td', c && c.cls, c == null ? '' : c.text != null ? c.text : c);
          tr.appendChild(cell);
        });
        node.appendChild(tr);
        return tr;
      }
    };
  }

  /* −/+ spinner used inside demo tables for hand-editable numbers. */
  function stepper(cell, opts) {
    var box = el('span', 'demo-stepper');
    var minus = el('button', null, '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', (opts.label || '') + ' 减小');
    var value = el('span', 'demo-stepper-v', fmt(opts.get(), opts.digits));
    var plus = el('button', null, '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', (opts.label || '') + ' 增大');
    function bump(dir) {
      opts.set(opts.get() + dir * opts.step);
      value.textContent = fmt(opts.get(), opts.digits);
      if (opts.onChange) opts.onChange();
    }
    minus.addEventListener('click', function () {
      bump(-1);
    });
    plus.addEventListener('click', function () {
      bump(1);
    });
    box.appendChild(minus);
    box.appendChild(value);
    box.appendChild(plus);
    cell.appendChild(box);
    return {
      refresh: function () {
        value.textContent = fmt(opts.get(), opts.digits);
      }
    };
  }

  // ─── deterministic randomness (demos must look the same on every reload) ──
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gauss(rng) {
    var u = 1 - rng(),
      v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function softmax(logits) {
    var m = Math.max.apply(null, logits);
    var e = logits.map(function (x) {
      return Math.exp(x - m);
    });
    var s = e.reduce(function (a, b) {
      return a + b;
    }, 0);
    return e.map(function (x) {
      return x / s;
    });
  }

  // ─── bootstrap ───────────────────────────────────────────────────────────
  /* Build every placeholder this bundle knows about. Safe to call from several
     bundles on the same page: each host is claimed once via data-demo-ready. */
  function mount(builders) {
    function init() {
      var hosts = document.querySelectorAll('.paper-demo[data-demo]');
      for (var i = 0; i < hosts.length; i++) {
        var host = hosts[i];
        var builder = builders[host.getAttribute('data-demo')];
        if (!builder || host.getAttribute('data-demo-ready') === '1') continue;
        try {
          builder(host);
          host.setAttribute('data-demo-ready', '1');
        } catch (e) {
          host.innerHTML = '';
          host.appendChild(el('p', 'demo-fallback', '（交互演示加载失败，请刷新页面重试）'));
        }
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  window.PaperDemoKit = {
    el: el,
    fmt: fmt,
    clamp: clamp,
    card: card,
    controlsRow: controlsRow,
    slider: slider,
    button: button,
    checkbox: checkbox,
    buttonGroup: buttonGroup,
    statsRow: statsRow,
    verdictBox: verdictBox,
    legend: legend,
    note: note,
    table: table,
    stepper: stepper,
    palette: palette,
    stage: stage,
    stageGrid: stageGrid,
    begin: begin,
    plot: plot,
    line: line,
    dot: dot,
    text: text,
    axes: axes,
    barLabel: barLabel,
    niceTicks: niceTicks,
    registerRenderer: registerRenderer,
    renderAll: renderAll,
    mulberry32: mulberry32,
    gauss: gauss,
    softmax: softmax,
    mount: mount
  };
})();
