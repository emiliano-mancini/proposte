// Per ogni proposta (cartella con index.html):
// 1) scarica le foto esterne nella cartella img/ della proposta e riscrive i link
// 2) fa gli screenshot (computer e telefono) in modalità foto (?shot=1)
// Uso: node tools/localizza.mjs [cartella ...]   (senza argomenti: tutte le proposte)
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const SKIP = new Set(['vendor', 'tools', 'node_modules', '.git', '.github']);
const IMG_RE = /https?:\/\/[^\s"'()<>]+?\.(?:jpe?g|png|webp|gif|avif)(?:\?[^\s"'()<>]*)?/gi;

async function proposals(args) {
  if (args.length) return args.map(a => a.replace(/\/+$/, '').replace(/\/index\.html$/, ''));
  const out = [];
  for (const d of await fs.readdir(ROOT, { withFileTypes: true })) {
    if (!d.isDirectory() || SKIP.has(d.name) || d.name.startsWith('.')) continue;
    try { await fs.access(path.join(ROOT, d.name, 'index.html')); out.push(d.name); } catch {}
  }
  return out;
}

async function localize(dir) {
  const file = path.join(ROOT, dir, 'index.html');
  let html = await fs.readFile(file, 'utf8');
  const urls = [...new Set(html.match(IMG_RE) || [])];
  if (!urls.length) return 0;
  await fs.mkdir(path.join(ROOT, dir, 'img'), { recursive: true });
  let n = 0;
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (proposte-bot)' } });
      if (!res.ok) { console.warn(`  ! ${res.status} ${url}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = (url.match(/\.(jpe?g|png|webp|gif|avif)/i)?.[1] || 'jpg').toLowerCase().replace('jpeg', 'jpg');
      const name = crypto.createHash('sha1').update(url).digest('hex').slice(0, 12) + '.' + ext;
      await fs.writeFile(path.join(ROOT, dir, 'img', name), buf);
      html = html.split(url).join('img/' + name);
      n++;
    } catch (e) { console.warn(`  ! ${e.message} ${url}`); }
  }
  await fs.writeFile(file, html);
  return n;
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const srv = http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try { const b = await fs.readFile(f); res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }).end(b); }
    catch { res.writeHead(404).end(); }
  });
  return new Promise(r => srv.listen(0, () => r(srv)));
}

async function shoot(browser, port, dir) {
  const shots = [
    { name: 'shot-desktop.jpg', viewport: { width: 1440, height: 900 }, dsf: 1 },
    { name: 'shot-mobile.jpg', viewport: { width: 390, height: 844 }, dsf: 2 },
  ];
  for (const s of shots) {
    const ctx = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: s.dsf, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${port}/${dir}/?shot=1`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: path.join(ROOT, dir, s.name), type: 'jpeg', quality: 78, fullPage: h <= 9000, clip: h > 9000 ? { x: 0, y: 0, width: s.viewport.width, height: 9000 } : undefined });
    await ctx.close();
  }
}

const dirs = await proposals(process.argv.slice(2));
console.log('Proposte:', dirs.join(', ') || '(nessuna)');
for (const d of dirs) console.log(`- ${d}: ${await localize(d)} foto scaricate`);
if (dirs.length) {
  const srv = await serve();
  const browser = await chromium.launch();
  for (const d of dirs) { await shoot(browser, srv.address().port, d); console.log(`- ${d}: screenshot fatti`); }
  await browser.close(); srv.close();
}
