// node render.mjs stills 1,20,40   -> out/still_<t>.png
// node render.mjs video [fps]       -> out/ppo_video.mp4
// node render.mjs cover             -> out/cover.png
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const FFMPEG = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const OUT = path.join(HERE, 'out');
const tl = JSON.parse(fs.readFileSync(path.join(OUT, 'timeline.json'), 'utf8'));

const html = fs.readFileSync(path.join(HERE, 'stage.html'), 'utf8').replaceAll('REPO/', 'file://' + REPO + '/');
const built = path.join(HERE, 'stage.built.html');
fs.writeFileSync(built, html);

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
await page.goto('file://' + built);
await page.evaluate((t) => window.setup(t), tl);
await page.evaluate(() => document.fonts.ready);
// warm every scene once so KaTeX + fonts are laid out before the first real frame
for (const s of tl.segments) await page.evaluate((t) => window.renderAt(t), s.t0 + 0.5);
await page.evaluate(() => document.fonts.ready);

const [mode, arg] = process.argv.slice(2);
if (mode === 'stills') {
  for (const t of arg.split(',').map(Number)) {
    await page.evaluate((x) => window.renderAt(x), t);
    await page.screenshot({ path: path.join(OUT, `still_${t}.png`) });
  }
} else if (mode === 'cover') {
  // intro frame with every line shown, no subtitle -> out/cover.png
  const intro = tl.segments.filter((s) => s.scene === 'intro').pop();
  await page.evaluate((x) => { window.renderAt(x); document.getElementById('sub').textContent = ''; }, intro.t1 - 0.5);
  await page.screenshot({ path: path.join(OUT, 'cover.png') });
} else {
  const fps = Number(arg || 30);
  const n = Math.ceil(tl.total * fps);
  const mp4 = path.join(OUT, 'ppo_video.mp4');
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(OUT, 'narration.wav'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-shortest', '-movflags', '+faststart', mp4],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate((x) => window.renderAt(x), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.error(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.error('done', mp4);
}
await browser.close();
