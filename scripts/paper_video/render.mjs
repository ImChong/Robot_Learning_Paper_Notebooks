// node render.mjs <paper> stills 1,20,40   -> out/<paper>/still_<t>.png
// node render.mjs <paper> video [fps]       -> out/<paper>/<paper>_video.mp4
// node render.mjs <paper> cover             -> out/<paper>/cover.png
// node render.mjs <paper> clip 140.5,191 [fps] -> out/<paper>/clip_140.5-191.mp4（只渲染这一段，配上同一段旁白，给人先看改动）
// node render.mjs <paper> chunk 0,6036 [fps]    -> out/<paper>/chunk_0-6036.mp4（全片第 0–6035 帧的画面，CRF 19、无声；几个进程各渲一段再拼，见 README「并行渲染」）
// 分镜里嵌的真机片段（kit.js 的 svgClip，放在 assets/img/papers/<paper>/clips/*.mp4）先转成 out/<paper>/clips/*.webm（VP9 全关键帧），
// 每帧 seek 到准确时刻，等 window.__clipWait() 返回再截图。
// <paper> names papers/<paper>.{py,js} and the storyboard bundle assets/js/demos/<paper>.js (its `*-explainer` demo id is read from the bundle).
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const FFMPEG = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const [name, mode, arg] = process.argv.slice(2);
const OUT = path.join(HERE, 'out', name);
// a cover needs no narration: without build.py's timeline, fake a 30 s intro so every line has faded in
const tlPath = path.join(OUT, 'timeline.json');
const tl = fs.existsSync(tlPath) ? JSON.parse(fs.readFileSync(tlPath, 'utf8'))
  : mode === 'cover' ? { total: 30, segments: [{ scene: 'intro', t0: 0, t1: 30, from: 0, to: 30, lead: 0 }], subs: [] }
  : JSON.parse(fs.readFileSync(tlPath, 'utf8'));
fs.mkdirSync(OUT, { recursive: true });

// The explainer's demo id is whatever the bundle mounts (`dp-explainer` in diffusion_policy.js,
// `bm-explainer` in beyondmimic.js), so read it from the bundle instead of assuming <name>-explainer.
const bundleSrc = fs.readFileSync(path.join(REPO, 'assets/js/demos', name + '.js'), 'utf8');
const demoId = (bundleSrc.match(/'([\w-]+-explainer)'\s*:/) || [])[1] || name + '-explainer';

// the renderer's Chromium has no H.264: give it an all-intra VP9 copy of every clip (exact, fast seeks)
const clipSrc = path.join(REPO, 'assets/img/papers', name, 'clips'), clipOut = path.join(OUT, 'clips');
if (fs.existsSync(clipSrc)) {
  fs.mkdirSync(clipOut, { recursive: true });
  for (const f of fs.readdirSync(clipSrc).filter((x) => x.endsWith('.mp4'))) {
    const src = path.join(clipSrc, f), dst = path.join(clipOut, f.replace(/\.mp4$/, '.webm'));
    if (fs.existsSync(dst) && fs.statSync(dst).mtimeMs >= fs.statSync(src).mtimeMs) continue;
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', src, '-an', '-c:v', 'libvpx-vp9', '-crf', '12', '-b:v', '0', '-g', '1',
      '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', dst]);
    console.error('clip', f, '-> webm');
  }
}
const html = fs.readFileSync(path.join(HERE, 'stage.html'), 'utf8')
  .replaceAll('REPO/', 'file://' + REPO + '/').replaceAll('CLIPDIR', 'file://' + clipOut + '/')
  .replaceAll('BUNDLE', name).replaceAll('DEMO_ID', demoId).replaceAll('PAPER', name);
// one per paper, so several papers can render at once; a chunk gets its own, so several chunks of one paper can too
const built = path.join(HERE, mode === 'chunk' ? `stage.${name}.${arg.split(',')[0]}.built.html` : `stage.${name}.built.html`);
fs.writeFileSync(built, html);

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto('file://' + built);
// draw one moment, then wait until every clip on screen has seeked to it
const frameAt = async (t) => {
  await page.evaluate((x) => window.renderAt(x), t);
  await page.evaluate(() => window.__clipWait && window.__clipWait());
};
await page.evaluate((t) => window.setup(t), tl);
await page.evaluate(() => document.fonts.ready);
// warm every scene once so KaTeX + fonts are laid out before the first real frame
for (const s of tl.segments) await frameAt(s.t0 + 0.5);
await page.evaluate(() => document.fonts.ready);
// zoom each storyboard to what it draws, now that formulas have their real widths
for (const [i, f] of (await page.evaluate(() => window.fitStages())).entries()) {
  console.error(`scene ${i + 1}: viewBox ${f.viewBox}  zoom ${f.zoom.toFixed(3)}`);
}
// some bundles set an <image> href only when its scene first draws (gmr's 3D sprite sheets); the warm-up
// above has done that for every scene, so wait until each of those files is fetched and decoded
await page.evaluate(() => Promise.all([...document.querySelectorAll('image')].map((im) => {
  const href = im.getAttribute('href') || im.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
  if (!href) return null;
  const pic = new Image();
  pic.src = href;
  return pic.decode().catch(() => null);
})));

if (mode === 'stills') {
  for (const t of arg.split(',').map(Number)) {
    await frameAt(t);
    await page.screenshot({ path: path.join(OUT, `still_${t}.png`) });
  }
} else if (mode === 'cover') {
  // intro frame with every line shown, no subtitle, laid out by stage.html's classicCover() -> out/cover.png
  const intro = tl.segments.filter((s) => s.scene === 'intro').pop();
  await page.evaluate((x) => { window.__cover = true; window.renderAt(x); document.getElementById('sub').textContent = ''; }, intro.t1 - 0.5);
  await page.screenshot({ path: path.join(OUT, 'cover.png') });
} else if (mode === 'clip') {
  const [from, to] = arg.split(',').map(Number);
  const fps = Number(process.argv[5] || 30);
  const n = Math.ceil((to - from) * fps);
  const mp4 = path.join(OUT, `clip_${from}-${to}.mp4`);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-ss', String(from), '-t', String(to - from), '-i', path.join(OUT, 'narration.wav'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-vf', 'scale=in_range=pc:out_range=tv', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-shortest', '-movflags', '+faststart', mp4],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < n; i++) {
    await frameAt(from + i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.error('done', mp4);
} else if (mode === 'chunk') {
  // frames [a, b) of the full video, picture only (CRF 19, no audio): the parallel-render building block
  const [a, b] = arg.split(',').map(Number);
  const fps = Number(process.argv[5] || 30);
  const mp4 = path.join(OUT, `chunk_${a}-${b}.mp4`);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-threads', '1',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-threads', '1', '-vf', 'scale=in_range=pc:out_range=tv', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-r', String(fps),
    '-an', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = a; i < b; i++) {
    await frameAt(i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((i - a) % 600 === 0) console.error(`[${a}] frame ${i - a}/${b - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  const code = await new Promise((r) => ff.on('close', r));
  fs.unlinkSync(built);
  console.error(`[${a}] done ${mp4} ffmpeg=${code} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (code) process.exitCode = code;
} else {
  const fps = Number(arg || 30);
  const n = Math.ceil(tl.total * fps);
  const mp4 = path.join(OUT, name + '_video.mp4');
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(OUT, 'narration.wav'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-vf', 'scale=in_range=pc:out_range=tv', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-shortest', '-movflags', '+faststart', mp4],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await frameAt(i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.error(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.error('done', mp4);
}
await browser.close();
