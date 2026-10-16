// node check_layout.mjs <paper>        （先跑过 build.py，并用 render.mjs 生成过 stage.<paper>.built.html）
// node check_layout.mjs <paper> story  分镜内部：文字压文字、文字压图（3D 贴图按当前帧的不透明像素裁边），每 0.25 s 抽一帧
// node check_layout.mjs <paper> story near  同上，另外把「快压住」也记下：文字和文字 / 图 / 框线的间距不到 3px（OmniH2O 第 5 幕的 120、40 贴着右栏的框）
// 末尾可加时间段（秒）只查改过的几幕：node check_layout.mjs <paper> story near 378,418
// node check_layout.mjs <paper> cover  封面帧（stage.html 的 classicCover，最初的片头设计）：块互不重叠、都在画面里、
//                                      大标题 / 中文名 / 一句话 / 每条目录各占一行、3:4 置顶裁剪后目录不贴底（不需要 build.py）
// 每 0.5 s 抽一帧，用 DOM 量各块位置：可见块之间不许重叠、不许压字幕、片头 / 片尾相邻块间距 ≥ 10px，要读的东西必须在安全区 330–1440 之内
// （视频号 9:16 画面会被裁成居中的 6:7，底部还压着作者、标题、转赞评与浮评）。
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const [name, mode, sub] = process.argv.slice(2);
const RANGE = (process.argv.slice(3).find((x) => /^\d+(\.\d+)?,\d+(\.\d+)?$/.test(x)) || '').split(',').filter(Boolean).map(Number);
const PAD = mode === 'story' && sub === 'near' ? 3 : 0;  // 屏幕像素（1080 宽的画面）；两行字的字框隔 3–4px 是正常行距
const tlPath = `out/${name}/timeline.json`;
const tl = fs.existsSync(tlPath) ? JSON.parse(fs.readFileSync(tlPath, 'utf8'))
  : { total: 30, segments: [{ scene: 'intro', t0: 0, t1: 30, from: 0, to: 30, lead: 0 }], subs: [] };
// 'story' 模式要读贴图的像素（file:// 的图默认会污染 canvas），所以放开本地文件同源
const b = await chromium.launch({ executablePath: process.env.CHROME, args: mode === 'story' ? ['--allow-file-access-from-files'] : [] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto('file://' + process.cwd() + `/stage.${name}.built.html`);
await pg.evaluate((t) => window.setup(t), tl);
await pg.evaluate(() => document.fonts.ready);

if (mode === 'cover') {
  const intro = tl.segments.filter((s) => s.scene === 'intro').pop();
  const r = await pg.evaluate((x) => {
    window.__cover = true;
    window.renderAt(x);
    const out = [];
    const sc = document.getElementById('scene');
    // a centred .big spans the whole width: take its left / right from the text itself, top / bottom from its line boxes
    const text = (e) => {
      const box = e.getBoundingClientRect(), g = document.createRange(), w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
      let l = Infinity, r = -Infinity;
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        if (!n.nodeValue.trim()) continue;
        g.selectNodeContents(n);
        for (const q of g.getClientRects()) { l = Math.min(l, q.left); r = Math.max(r, q.right); }
      }
      return { left: l, right: r, top: box.top, bottom: box.bottom };
    };
    const hit = (a, c) => a.bottom > c.top + 2 && c.bottom > a.top + 2 && a.right > c.left + 2 && c.right > a.left + 2;
    const bigs = [...sc.querySelectorAll('.big')], meta = sc.querySelector('.meta'), toc = sc.querySelector('.toc');
    if (bigs.length < 2 || !meta || !toc) return ['intro 不是「大标题 / 中文名 / 信息框 / 目录」四块'];
    const blocks = [['title', text(bigs[0])], ['name', text(bigs[1])], ['meta', meta.getBoundingClientRect()], ['toc', toc.getBoundingClientRect()],
      ['brand', document.querySelector('.brand').getBoundingClientRect()]];
    for (let i = 0; i < blocks.length; i++) {
      const [n, ri] = blocks[i];
      if (ri.left < 30 || ri.right > 1050 || ri.top < 40 || ri.bottom > 1840) out.push(`${n} off the frame (${Math.round(ri.left)}–${Math.round(ri.right)}, ${Math.round(ri.top)}–${Math.round(ri.bottom)})`);
      for (let j = i + 1; j < blocks.length; j++) if (hit(ri, blocks[j][1])) out.push(`${n} x ${blocks[j][0]}`);
    }
    const oneLine = (n, e) => {
      const lh = parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.5;
      if (e.getBoundingClientRect().height > lh * 1.3) out.push(`${n} wraps`);
    };
    oneLine('title', bigs[0].firstElementChild);
    [...bigs[1].children].forEach((e, k) => oneLine(k ? 'pitch' : 'name', e));
    [...toc.children].forEach((e, k) => oneLine(`toc row ${k + 1}`, e));
    // 视频号「设置封面」按 3:4 置顶裁剪到 y 1440：最后一行目录的字底要离裁剪线 ≥ 80px（35px 在手机上看像压到底）
    // 两列目录最低的一行不一定是最后一个元素（GMR 十三幕左列 7 条、右列 6 条），所以逐条量、取最低的字底
    const g = document.createRange();
    const ink = Math.max(...[...toc.children].flatMap((e) => { g.selectNodeContents(e); return [...g.getClientRects()].map((q) => q.bottom); }));
    if (ink > 1360) out.push(`toc ink bottom ${Math.round(ink)} > 1360 (3:4 top crop at 1440 leaves < 80px)`);
    return out;
  }, intro.t1 - 0.5);
  console.log(name, 'cover', r.length ? '\n  ' + r.join('\n  ') : 'no overlap');
  await b.close();
  process.exit(0);
}
for (const s of tl.segments) await pg.evaluate((t) => window.renderAt(t), s.t0 + 0.5);
if (mode === 'story') {
  // 分镜内部：每 0.25 s 抽一帧，量每段可见文字（svg <text>、KaTeX / svgRich 的 foreignObject 里的字形）的外框，
  // 文字与文字、文字与图（论文图、真机图、3D 机器人贴图按当前帧的不透明像素裁边）两两比，重叠超过 2px 就记下来。
  // 不透明度按祖先连乘，< 0.15 的（正在淡入淡出的）不算。
  await pg.evaluate(() => Promise.all([...document.querySelectorAll('image')].map((im) => {
    const h = im.getAttribute('href'); if (!h) return null; const p = new Image(); p.src = h; return p.decode().catch(() => null);
  })));
  const found = new Map();
  for (let t = RANGE.length ? RANGE[0] : 0.1; t < (RANGE.length ? RANGE[1] : tl.total); t += 0.25) {
    const seg = tl.segments.find((s) => t >= s.t0 && t < s.t1);
    if (!seg || typeof seg.scene !== 'number') continue;
    const r = await pg.evaluate(([t, pad]) => {
      window.renderAt(t);
      const out = [];
      const svgs = [...document.querySelectorAll('#scene .stage svg')].filter((e) => !e.parentElement.closest('svg'));
      const alpha = (e, root) => {
        let a = 1;
        for (let n = e; n && n !== root.parentElement; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
          a *= +cs.opacity;
        }
        return a;
      };
      const imgCache = window.__alphaCache || (window.__alphaCache = new Map());
      const tight = (svgBox, img) => {
        // 嵌套 <svg viewBox> 裁出的贴图格：按这一格的不透明像素算外框
        const href = img.getAttribute('href'); if (!href) return null;
        let pic = imgCache.get(href);
        if (!pic) { pic = new Image(); pic.src = href; imgCache.set(href, pic); }
        if (!pic.complete || !pic.naturalWidth) return null;
        const vb = svgBox.viewBox.baseVal; if (!vb || !vb.width) return null;
        const cv = document.createElement('canvas'); cv.width = Math.ceil(vb.width); cv.height = Math.ceil(vb.height);
        const cx = cv.getContext('2d');
        const sx = pic.naturalWidth / (+img.getAttribute('width')), sy = pic.naturalHeight / (+img.getAttribute('height'));
        cx.drawImage(pic, vb.x * sx, vb.y * sy, vb.width * sx, vb.height * sy, 0, 0, cv.width, cv.height);
        let d; try { d = cx.getImageData(0, 0, cv.width, cv.height).data; } catch (err) { return null; }
        let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
        for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 40) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        if (x1 < 0) return null;
        const mask = { d, w: cv.width, h: cv.height };
        // 嵌套 svg 的 getBoundingClientRect() 量的是整张贴图表，这里用它自己的视口（x / y / 宽高）乘父坐标系的 CTM
        const M = svgBox.parentNode.getScreenCTM(), P = (x, y) => new DOMPoint(x, y).matrixTransform(M);
        const p0 = P(+svgBox.getAttribute('x'), +svgBox.getAttribute('y')), p1 = P(+svgBox.getAttribute('x') + +svgBox.getAttribute('width'), +svgBox.getAttribute('y') + +svgBox.getAttribute('height'));
        const R = { left: p0.x, top: p0.y, width: p1.x - p0.x, height: p1.y - p0.y }, kx = R.width / vb.width, ky = R.height / vb.height;
        return { left: R.left + x0 * kx, right: R.left + (x1 + 1) * kx, top: R.top + y0 * ky, bottom: R.top + (y1 + 1) * ky,
          // 文字框里有几个不透明像素（贴图坐标）：外接矩形只是初筛，机身旁的空白不算压到
          ink: (q) => {
            let n = 0;
            const ax = Math.max(0, Math.floor((q.left - R.left) / kx)), bx = Math.min(mask.w, Math.ceil((q.right - R.left) / kx));
            const ay = Math.max(0, Math.floor((q.top - R.top) / ky)), by = Math.min(mask.h, Math.ceil((q.bottom - R.top) / ky));
            for (let y = ay; y < by; y++) for (let x = ax; x < bx; x++) if (mask.d[(y * mask.w + x) * 4 + 3] > 40) n++;
            return n * kx * ky;
          } };
      };
      // clip-path（第 5 幕的跑道只露膝盖以下）：把外框和祖先的裁剪矩形求交
      const clipTo = (e, q) => {
        let r = { left: q.left, right: q.right, top: q.top, bottom: q.bottom, ink: q.ink };
        for (let n = e; n && n.tagName && n.tagName.toLowerCase() !== 'html'; n = n.parentElement) {
          const cp = n.getAttribute && n.getAttribute('clip-path'), m = cp && cp.match(/url\(#([^)]+)\)/);
          if (!m) continue;
          const rc = document.getElementById(m[1]) && document.getElementById(m[1]).querySelector('rect');
          if (!rc) continue;
          const M = n.getScreenCTM(), P = (x, y) => new DOMPoint(x, y).matrixTransform(M);
          const c0 = P(+rc.getAttribute('x'), +rc.getAttribute('y')), c1 = P(+rc.getAttribute('x') + +rc.getAttribute('width'), +rc.getAttribute('y') + +rc.getAttribute('height'));
          r = { left: Math.max(r.left, c0.x), right: Math.min(r.right, c1.x), top: Math.max(r.top, c0.y), bottom: Math.min(r.bottom, c1.y), ink: r.ink };
        }
        return r.right > r.left && r.bottom > r.top ? r : null;
      };
      for (const root of svgs) {
        if (alpha(root, root) < 0.15) continue;
        const items = [];
        for (const e of root.querySelectorAll('text')) {
          if (!e.textContent.trim() || alpha(e, root) < 0.15) continue;
          const q = e.getBoundingClientRect(); if (q.width < 1) continue;
          const qc = clipTo(e, q); if (qc) items.push({ k: 'text', s: e.textContent.trim().slice(0, 18), r: qc, el: e });
        }
        for (const fo of root.querySelectorAll('foreignObject')) {
          if (alpha(fo, root) < 0.15) continue;
          const w = document.createTreeWalker(fo, NodeFilter.SHOW_TEXT), g = document.createRange();
          let l = Infinity, rr = -Infinity, tp = Infinity, bt = -Infinity;
          for (let n = w.nextNode(); n; n = w.nextNode()) {
            if (!n.nodeValue.trim() || n.parentElement.closest('.katex-mathml')) continue;
            g.selectNodeContents(n);
            for (const q of g.getClientRects()) { if (q.width < 0.5) continue; l = Math.min(l, q.left); rr = Math.max(rr, q.right); tp = Math.min(tp, q.top); bt = Math.max(bt, q.bottom); }
          }
          const qc = rr > l && clipTo(fo, { left: l, right: rr, top: tp, bottom: bt });
          if (qc) items.push({ k: 'text', s: fo.textContent.replace(/\s+/g, ' ').trim().slice(0, 18), r: qc, el: fo });
        }
        for (const im of root.querySelectorAll('image')) {
          if (alpha(im, root) < 0.15) continue;
          const box = im.parentElement && im.parentElement.tagName.toLowerCase() === 'svg' && im.parentElement !== root ? im.parentElement : null;
          const q = box ? tight(box, im) : im.getBoundingClientRect();
          const qc = q && clipTo(im, q);
          if (qc) items.push({ k: 'img', s: (im.getAttribute('href') || '').split('/').pop(), r: qc, el: im });
        }
        // 真机片段（kit.js 的 svgClip：foreignObject 里的 <video>）按整块图算
        for (const v of root.querySelectorAll('foreignObject video')) {
          if (alpha(v.parentElement, root) < 0.15) continue;
          const qc = clipTo(v.parentElement, v.getBoundingClientRect());
          if (qc) items.push({ k: 'img', s: (v.getAttribute('src') || '').split('/').pop(), r: qc, el: v });
        }
        // 文字越出框线：有描边的框（面板、胶囊）里的文字，一部分在框里、一部分伸到框外
        for (const rc of root.querySelectorAll('rect')) {
          if (rc.closest('clipPath, defs') || alpha(rc, root) < 0.15) continue;
          const st = getComputedStyle(rc).stroke;
          if (!st || st === 'none' || +getComputedStyle(rc).strokeOpacity === 0) continue;
          const q = rc.getBoundingClientRect(); if (q.width < 40 || q.height < 18) continue;
          for (const A of items) {
            if (A.k !== 'text') continue;
            const ox = Math.min(A.r.right, q.right) - Math.max(A.r.left, q.left), oy = Math.min(A.r.bottom, q.bottom) - Math.max(A.r.top, q.top);
            const area = (A.r.right - A.r.left) * (A.r.bottom - A.r.top);
            // 框外的字贴着框线（near 模式）：外框放大 pad 后才碰到框
            if (pad && (ox <= 0 || oy <= 0 || ox * oy < 0.02 * area) && ox > -pad && oy > -pad) {
              out.push(`text「${A.s}」 near box edge (${Math.round(Math.max(-ox, -oy, 0))}px gap)`);
              continue;
            }
            if (ox <= 0 || oy <= 0) continue;
            if (ox * oy < 0.3 * area) continue;
            const over = Math.max(q.left - A.r.left, A.r.right - q.right, q.top - A.r.top - 3, A.r.bottom - q.bottom - 3);
            if (over > 1) out.push(`text「${A.s}」 crosses box edge (${Math.round(over)}px out)`);
            else if (ox * oy >= 0.95 * area) {
              const gap = Math.min(A.r.left - q.left, q.right - A.r.right);
              if (gap < 4 && q.width > 120) out.push(`text「${A.s}」 touches box edge (${Math.round(gap)}px gap)`);
            }
          }
        }
        for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
          const A = items[i], B = items[j];
          if (A.k === 'img' && B.k === 'img') continue;
          const ox = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left), oy = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
          const hit = ox > 2 && oy > 2, near = !hit && pad && ox > -pad && oy > -pad;
          if (!hit && !near) continue;
          const sp = [A, B].find((z) => z.k === 'img' && z.r.ink), tx = sp && (sp === A ? B : A);
          if (sp) {
            const g = hit ? 0 : pad;  // near：文字外框放大 pad 再数不透明像素
            const inner = { left: Math.max(tx.r.left - g, sp.r.left), right: Math.min(tx.r.right + g, sp.r.right), top: Math.max(tx.r.top - g, sp.r.top), bottom: Math.min(tx.r.bottom + g, sp.r.bottom) };
            if (inner.right <= inner.left || inner.bottom <= inner.top) continue;
            const px = sp.r.ink(inner); if (px < 6) continue;
            out.push(`${tx.k}「${tx.s}」 ${hit ? 'x' : 'near'} ${sp.k}「${sp.s}」 (${Math.round(px)}px² ink)`);
            continue;
          }
          if (A.k === 'img' || B.k === 'img') {
            // 论文图 / 真机图（不裁边的整张图）：只算真压上，贴着图框不算
            if (!hit) continue;
          }
          out.push(hit ? `${A.k}「${A.s}」 x ${B.k}「${B.s}」 (${Math.round(ox)}×${Math.round(oy)}px)`
            : `${A.k}「${A.s}」 near ${B.k}「${B.s}」 (${Math.round(Math.max(-ox, -oy, 0))}px gap)`);
        }
      }
      return out;
    }, [t, PAD]);
    for (const x of r) {
      const key = `scene ${seg.scene + 1}: ${x.replace(/ \([^()]*px[^()]*\)$/, '')}`;
      const f = found.get(key);
      if (!f) found.set(key, { t0: t, t1: t, n: 1, ex: x.match(/\(([^()]*px[^()]*)\)$/)[1] });
      else { f.t1 = t; f.n++; }
    }
  }
  console.log(name, 'story', found.size ? '\n  ' + [...found].map(([k, v]) => `${k}  ${v.ex}  @${v.t0.toFixed(1)}–${v.t1.toFixed(1)}s ×${v.n}`).join('\n  ') : 'no overlap');
  await b.close();
  process.exit(0);
}
const issues = new Map();
for (let t = 0.2; t < tl.total; t += 0.5) {
  const r = await pg.evaluate((t) => {
    window.renderAt(t);
    const R = (e) => e.getBoundingClientRect();
    const sc = document.getElementById('scene');
    const sub = document.getElementById('sub');
    const out = [];
    const subR = sub.textContent.trim() ? R(sub) : null;
    const hit = (a, c) => a.bottom > c.top + 2 && c.bottom > a.top + 2 && a.right > c.left + 2 && c.right > a.left + 2;
    const blocks = [...sc.querySelectorAll('.head, .prog, .stage, .cue, .big, .meta, .toc, .pt')].filter((e) => +getComputedStyle(e).opacity >= 0.05);
    for (let i = 0; i < blocks.length; i++) {
      const ri = R(blocks[i]);
      if (ri.height === 0) continue;
      for (let j = i + 1; j < blocks.length; j++) {
        const rj = R(blocks[j]);
        if (rj.height && hit(ri, rj)) out.push(blocks[i].className + ' x ' + blocks[j].className);
      }
      if (subR && hit(ri, subR)) out.push(blocks[i].className + ' x subtitle');
      if (ri.bottom > 1920 || ri.right > 1082 || ri.left < -2) out.push(blocks[i].className + ' offscreen');
    }
    // 安全区：视频号上下会被裁切 / 遮挡，要读的东西只能在 330–1440 之间（淡入位移不算，用布局位置）
    const keys = [...sc.querySelectorAll('.head, .stage, .cue, .big, .meta, .toc, .pt')];
    for (const e of keys) {
      if (+getComputedStyle(e).opacity < 0.05 || !e.offsetHeight) continue;
      const top = e.offsetTop, bot = e.offsetTop + e.offsetHeight;
      if (top < 328 || bot > 1442) out.push(e.className + ' outside safe zone (' + top + '–' + bot + ')');
    }
    // 片头 / 片尾的块由 V.stack 排：放不下时它会压缩间距，压到 10px 以下画面上就像贴在一起
    // （SMP 片尾「下一篇」折成两行时只剩 6–8px）。用布局位置量，淡入位移不算。
    const stacked = keys.filter((e) => e.matches('.big, .meta, .toc, .pt') && +getComputedStyle(e).opacity >= 0.05 && e.offsetHeight);
    for (const a of stacked) {
      for (const c of stacked) {
        if (a === c || a.offsetParent !== c.offsetParent) continue;
        const gap = c.offsetTop - (a.offsetTop + a.offsetHeight);
        const xo = Math.min(a.offsetLeft + a.offsetWidth, c.offsetLeft + c.offsetWidth) - Math.max(a.offsetLeft, c.offsetLeft);
        if (xo > 0 && gap >= -2 && gap < 10) out.push(a.className + ' / ' + c.className + ' too close (' + gap + 'px)');
      }
    }
    const tt = sc.querySelector('.title');
    if (tt) { const r2 = tt.getBoundingClientRect(); if (r2.top < 328 || r2.bottom > 1442) out.push('title outside safe zone'); }
    if (subR && (subR.top < 328 || subR.bottom > 1442)) out.push('subtitle outside safe zone (' + Math.round(subR.top) + '–' + Math.round(subR.bottom) + ')');
    const ttl = sc.querySelector('.title');
    if (ttl && ttl.getBoundingClientRect().height > 100) out.push('title wraps');
    return out;
  }, t);
  for (const x of r) if (!issues.has(x)) issues.set(x, Math.round(t * 10) / 10);
}
console.log(name, issues.size ? [...issues].map(([k, v]) => `${k} @${v}s`).join('\n  ') : 'no overlap');
await b.close();
