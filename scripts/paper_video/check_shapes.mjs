// 分镜里的「形状重叠」：方框和方框部分相交、文字压到线 / 曲线 / 圆点、文字压实心条。每 0.5 s 抽一帧（check_layout 只查文字压文字、文字压图）。
// node check_shapes.mjs <paper> [from,to]（先用 render.mjs 生成过 stage.<paper>.built.html，和 check_layout 一样）
// 2026-10-31 CHIP 第 5 幕「不学力估计器」的卡片和右边的方框贴在一起，check_layout 查不到：它只查文字压文字、文字压图片和文字越出框线。
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const name = process.argv[2];
const R = (process.argv[3] || '').split(',').filter(Boolean).map(Number);
const tl = JSON.parse(fs.readFileSync(`out/${name}/timeline.json`, 'utf8'));
const b = await chromium.launch({ executablePath: process.env.CHROME });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto('file://' + process.cwd() + `/stage.${name}.built.html`);
await pg.evaluate((t) => window.setup(t), tl);
await pg.evaluate(() => document.fonts.ready);
const found = new Map();
for (let t = R.length ? R[0] : 0.1; t < (R.length ? R[1] : tl.total); t += 0.5) {
  const seg = tl.segments.find((s) => t >= s.t0 && t < s.t1);
  if (!seg || typeof seg.scene !== 'number') continue;
  const r = await pg.evaluate((t) => {
    window.renderAt(t);
    const out = [];
    const root = [...document.querySelectorAll('#scene .stage svg')].filter((e) => !e.parentElement.closest('svg'))[0];
    if (!root) return out;
    const alpha = (e) => { let a = 1; for (let n = e; n && n !== root.parentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; a *= +cs.opacity; } return a; };
    const inNested = (e) => { const s = e.parentElement && e.parentElement.closest('svg'); return s && s !== root; };
    const box = (e) => { const q = e.getBoundingClientRect(); return { l: q.left, r: q.right, t: q.top, b: q.bottom }; };
    const texts = [], rects = [], lines = [];
    const ink = (e, k) => { const v = getComputedStyle(e)[k]; return v && v !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(v); };
    for (const e of root.querySelectorAll('text, foreignObject')) {
      if (alpha(e) < 0.15 || inNested(e)) continue;
      let q = box(e);
      if (e.tagName.toLowerCase() === 'foreignobject') {
        // svgRich / KaTeX：外框比字宽，量字形本身
        const g = document.createRange(), w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        let l = Infinity, r = -Infinity, tp = Infinity, bt = -Infinity;
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          if (!n.nodeValue.trim()) continue;
          g.selectNodeContents(n);
          for (const c of g.getClientRects()) { if (c.width < 0.5) continue; l = Math.min(l, c.left); r = Math.max(r, c.right); tp = Math.min(tp, c.top); bt = Math.max(bt, c.bottom); }
        }
        if (r < l) continue;
        q = { l, r, t: tp, b: bt };
      }
      if (q.r - q.l < 2) continue;
      texts.push({ q, s: (e.textContent || '').trim().slice(0, 18) });
    }
    for (const e of root.querySelectorAll('rect, circle, line, path, polyline, polygon, ellipse')) {
      if (alpha(e) < 0.15 || inNested(e)) continue;
      const tag = e.tagName.toLowerCase(), q = box(e);
      if (q.r - q.l < 0.5 && q.b - q.t < 0.5) continue;
      const fill = ink(e, 'fill'), stroke = ink(e, 'stroke') && parseFloat(getComputedStyle(e).strokeWidth) > 0;
      if (!fill && !stroke) continue;
      if (tag === 'rect' && q.r - q.l > 700) continue;  // 画面底框
      if (tag === 'rect' || tag === 'circle' || tag === 'ellipse') rects.push({ q, tag, fill, e });
      else lines.push({ e, q, tag, fill });
    }
    const hit = (a, c, m) => a.l < c.r - m && c.l < a.r - m && a.t < c.b - m && c.t < a.b - m;
    const inside = (a, c, m) => a.l >= c.l - m && a.r <= c.r + m && a.t >= c.t - m && a.b <= c.b + m;
    // 方框和方框：部分相交（谁也不包含谁）
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const A = rects[i], B = rects[j];
      if (A.tag !== 'rect' || B.tag !== 'rect') continue;
      if (!hit(A.q, B.q, 1.5) || inside(A.q, B.q, 1) || inside(B.q, A.q, 1)) continue;
      out.push(`rect x rect ${Math.round(A.q.l)},${Math.round(A.q.t)} / ${Math.round(B.q.l)},${Math.round(B.q.t)}`);
    }
    // 文字压到方框的边（部分越出）或压到实心的小块（条、圆点）
    for (const T of texts) for (const B of rects) {
      if (!hit(T.q, B.q, 1.5)) continue;
      if (inside(T.q, B.q, 1)) { if (B.fill && B.tag !== 'rect') out.push(`text「${T.s}」on ${B.tag}`); continue; }
      if (inside(B.q, T.q, 0) && B.tag === 'rect' && B.q.r - B.q.l < 14) continue;  // 图例的小色块
      out.push(`text「${T.s}」crosses ${B.tag}`);
    }
    // 文字压线 / 曲线：沿路径取点，落进文字框（收 1px）就算
    for (const L of lines) {
      const near = texts.filter((T) => hit(T.q, L.q, 0));
      if (!near.length) continue;
      let len = 0; try { len = L.e.getTotalLength(); } catch (err) { continue; }
      const M = L.e.getScreenCTM(); if (!M) continue;
      for (const T of near) {
        for (let d = 0; d <= len; d += 3) {
          const p = L.e.getPointAtLength(d).matrixTransform(M);
          if (p.x > T.q.l + 1 && p.x < T.q.r - 1 && p.y > T.q.t + 1 && p.y < T.q.b - 1) { out.push(`text「${T.s}」x ${L.tag}${L.fill ? '(fill)' : ''}`); break; }
        }
      }
    }
    return out;
  }, t);
  for (const k of r) { const key = `scene ${seg.scene + 1}: ${k}`; const f = found.get(key) || { a: t, b: t, n: 0 }; f.b = t; f.n++; found.set(key, f); }
}
await b.close();
console.log(`${name} shapes`);
for (const [k, f] of found) console.log(`  ${k}  @${f.a.toFixed(1)}–${f.b.toFixed(1)}s ×${f.n}`);
