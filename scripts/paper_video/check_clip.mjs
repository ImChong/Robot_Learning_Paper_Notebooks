// 分镜里被裁掉的东西：每 0.25 s 抽一帧，可见的字、色块、图片、线有没有越出这一幕 SVG 的可视区（连同外层 overflow:hidden 的框）。
// node check_clip.mjs <paper> [from,to]（先用 render.mjs 生成过 stage.<paper>.built.html，和 check_layout 一样）
// 2026-11-03 SuperMimic 第 12 幕「约 7200 倍」被裁掉一截：fitStages() 量外框时，按 since() 走的动画还停在起点（条是 0 长），
// 条长出来以后，跟在条后面的数字就跑出了量好的 viewBox；check_layout 只在几个时刻查、也不管 SVG 的裁剪，查不到。
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
await pg.evaluate(() => window.fitStages());
const found = new Map();
for (let t = R.length ? R[0] : 0.1; t < (R.length ? R[1] : tl.total); t += 0.25) {
  const seg = tl.segments.find((s) => t >= s.t0 && t < s.t1);
  if (!seg || typeof seg.scene !== 'number') continue;
  const r = await pg.evaluate((t) => {
    window.renderAt(t);
    const out = [];
    const root = [...document.querySelectorAll('#scene .stage svg')].filter((e) => !e.parentElement.closest('svg'))[0];
    if (!root) return out;
    const V0 = root.getBoundingClientRect();
    const V = { left: V0.left, right: V0.right, top: V0.top, bottom: V0.bottom };
    for (let n = root.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflow === 'visible' && cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const q = n.getBoundingClientRect();
      const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
      V.left = Math.max(V.left, q.left + bl); V.right = Math.min(V.right, q.right - br); V.top = Math.max(V.top, q.top + bt); V.bottom = Math.min(V.bottom, q.bottom - bb);
    }
    const alpha = (e) => { let a = 1; for (let n = e; n && n !== root.parentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; a *= +cs.opacity; } return a; };
    const inNested = (e) => { const s = e.parentElement && e.parentElement.closest('svg'); return s && s !== root; };
    for (const e of root.querySelectorAll('text, foreignObject, rect, image, circle, path, line')) {
      if (alpha(e) < 0.15 || inNested(e)) continue;
      let q = e.getBoundingClientRect();
      if (e.tagName.toLowerCase() === 'foreignobject') {
        const g = document.createRange(), w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        let l = Infinity, r = -Infinity, tp = Infinity, bt = -Infinity;
        for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.nodeValue.trim()) continue; g.selectNodeContents(n); for (const c of g.getClientRects()) { if (c.width < 0.5) continue; l = Math.min(l, c.left); r = Math.max(r, c.right); tp = Math.min(tp, c.top); bt = Math.max(bt, c.bottom); } }
        if (r < l) continue;
        q = { left: l, right: r, top: tp, bottom: bt, width: r - l };
      }
      if (q.width < 1 && q.height < 1) continue;
      const tag = e.tagName.toLowerCase();
      if (tag === 'path' || tag === 'line') { const cs = getComputedStyle(e); if ((cs.stroke === 'none' || !cs.stroke) && (cs.fill === 'none')) continue; }
      if (tag === 'rect' && q.width > 700) continue;
      const over = Math.max(V.left - q.left, q.right - V.right, V.top - q.top, q.bottom - V.bottom);
      if (over > 1) out.push(`${tag}「${(e.textContent || e.getAttribute('href') || '').trim().slice(0, 16)}」 out by ${Math.round(over)}px`);
    }
    return out;
  }, t);
  for (const s of r) {
    const k = `scene ${seg.scene + 1}: ${s.replace(/ out by \d+px/, '')}`;
    const v = found.get(k) || { t0: t, t1: t, n: 0, s };
    v.t1 = t; v.n++; found.set(k, v); v.s = s;
  }
}
await b.close();
console.log(`${name} clip` + (found.size ? "" : " none"));
for (const [k, v] of found) console.log(`  ${k}  (${v.s.match(/out by \d+px/)[0]})  @${v.t0.toFixed(1)}–${v.t1.toFixed(1)}s ×${v.n}`);
