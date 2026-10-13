// Misura e-commerce da telefono (Playwright, cache vuota, come un visitatore che arriva da una pubblicità).
// Uso: node tools/misura.mjs slug=https://sito.it/pagina [slug2=https://...]
// Output: misure/<slug>/misura.json e misure/<slug>/primo-schermo.jpg
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const ROOT = process.cwd();
const PHONE = { ...devices['Pixel 7'] };

const pairs = process.argv.slice(2).map(a => {
  const i = a.indexOf('=');
  return { slug: a.slice(0, i).replace(/[^a-z0-9-]/gi, '').toLowerCase(), url: a.slice(i + 1) };
}).filter(p => p.slug && /^https?:\/\//.test(p.url));

async function serverTimes(url) {
  // tempo di risposta del server come lo vede un visitatore normale (nessuna intestazione anti-cache): 3 richieste
  const out = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    try {
      const r = await fetch(url, { headers: { 'user-agent': PHONE.userAgent, 'accept': 'text/html,application/xhtml+xml', 'accept-language': 'it-IT,it;q=0.9' }, redirect: 'follow' });
      const t = Math.round(performance.now() - t0);
      await r.arrayBuffer();
      out.push({ ms: t, status: r.status, cache: r.headers.get('cf-cache-status') || r.headers.get('x-cache') || r.headers.get('x-cache-status') || null });
    } catch (e) { out.push({ ms: null, error: e.message }); }
  }
  return out;
}

async function measure(browser, { slug, url }) {
  const dir = path.join(ROOT, 'misure', slug);
  await fs.mkdir(dir, { recursive: true });
  const ctx = await browser.newContext({ ...PHONE, locale: 'it-IT' });
  const page = await ctx.newPage();
  const reqs = [];
  page.on('requestfinished', async req => {
    try {
      const r = await req.response(); const z = await req.sizes();
      reqs.push({ url: req.url(), type: req.resourceType(), status: r ? r.status() : 0, bytes: (z.responseBodySize || 0) + (z.responseHeadersSize || 0) });
    } catch {}
  });
  page.on('requestfailed', req => reqs.push({ url: req.url(), type: req.resourceType(), status: 999, bytes: 0 }));
  await page.addInitScript(() => {
    window.__m = { lcp: null, cls: 0 };
    try { new PerformanceObserver(l => { const e = l.getEntries(); const x = e[e.length - 1]; window.__m.lcp = { t: x.startTime, el: x.element ? x.element.tagName + ' ' + (x.url || '').slice(0, 120) : (x.url || '') }; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  });
  let error = null;
  const t0 = Date.now();
  try { await page.goto(url, { waitUntil: 'load', timeout: 60000 }); } catch (e) { error = e.message.split('\n')[0]; }
  const loadWall = Date.now() - t0;
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(dir, 'primo-schermo.jpg'), type: 'jpeg', quality: 70 }).catch(() => {});
  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const res = performance.getEntriesByType('resource');
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const host = location.host.replace(/^www\./, '');
    const vw = innerWidth, vh = innerHeight;
    // cose fisse che coprono lo schermo (popup, banner cookie)
    const overlays = [...document.querySelectorAll('body *')].filter(e => {
      const s = getComputedStyle(e);
      if (!(s.position === 'fixed' || s.position === 'sticky') || s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
      const b = e.getBoundingClientRect();
      const w = Math.max(0, Math.min(b.right, vw) - Math.max(b.left, 0)), h = Math.max(0, Math.min(b.bottom, vh) - Math.max(b.top, 0));
      return (w * h) / (vw * vh) > 0.25;
    }).map(e => {
      const b = e.getBoundingClientRect();
      return { id: (e.id || String(e.className)).slice(0, 60), copre: Math.round(Math.min(1, (Math.min(b.bottom, vh) - Math.max(b.top, 0)) * (Math.min(b.right, vw) - Math.max(b.left, 0)) / (vw * vh)) * 100) + '%', testo: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 120) };
    }).filter((o, i, a) => a.findIndex(x => x.testo === o.testo) === i).slice(0, 4);
    const btn = [...document.querySelectorAll('button, input[type=submit], a')].find(b => /aggiungi al carrello|aggiungi|acquista ora|compra ora|add to cart/i.test((b.innerText || b.value || '').trim()) && b.getBoundingClientRect().height > 0);
    const bb = btn && btn.getBoundingClientRect();
    const txt = document.body ? document.body.innerText : '';
    const html = document.documentElement.outerHTML;
    const piattaforma = /cdn\.shopify\.com|Shopify\.theme/.test(html) ? 'Shopify' : /woocommerce/i.test(html) ? 'WooCommerce' : /prestashop/i.test(html) ? 'PrestaShop' : /Magento|mage\/cookies/.test(html) ? 'Magento' : /wixstatic|wix\.com/.test(html) ? 'Wix' : /squarespace/i.test(html) ? 'Squarespace' : /jimdo/i.test(html) ? 'Jimdo' : /wp-content/.test(html) ? 'WordPress' : null;
    const imgs = res.filter(r => r.initiatorType === 'img' || /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(r.name)).map(r => ({ url: r.name.slice(0, 160), kb: Math.round((r.encodedBodySize || r.transferSize || 0) / 1024) })).sort((a, b) => b.kb - a.kb).slice(0, 5);
    return {
      urlFinale: location.href, titolo: document.title, descrizione: document.querySelector('meta[name=description]')?.content || null,
      h1: [...document.querySelectorAll('h1')].map(h => h.innerText.trim().slice(0, 100)),
      ttfb: Math.round(nav.responseStart || 0), fcp: fcp ? Math.round(fcp.startTime) : null, domReady: Math.round(nav.domContentLoadedEventEnd || 0), load: Math.round(nav.loadEventEnd || 0),
      pesoKB: Math.round((res.reduce((s, r) => s + (r.encodedBodySize || 0), 0) + (nav.encodedBodySize || 0)) / 1024),
      richieste: res.length, script: res.filter(r => r.initiatorType === 'script').length,
      serviziEsterni: [...new Set(res.map(r => { try { return new URL(r.name).host; } catch { return ''; } }))].filter(h => h && !h.endsWith(host)),
      immaginiPiuPesanti: imgs,
      scorrimentoOrizzontale: document.documentElement.scrollWidth > vw + 2,
      sovrapposizioni: overlays,
      pulsanteAcquisto: btn ? { testo: (btn.innerText || btn.value || '').trim().slice(0, 40), yPx: Math.round(bb.top + scrollY), visibileSenzaScorrere: bb.top + scrollY < vh } : null,
      parlaDiSpedizione: /spedizion/i.test(txt), parlaDiResi: /\breso\b|\bresi\b|recesso|rimbors/i.test(txt), recensioni: /recension|review|trustpilot|★/i.test(txt),
      email: [...new Set([...document.querySelectorAll('a[href^="mailto:"]')].map(a => a.getAttribute('href').replace('mailto:', '').split('?')[0]))].slice(0, 3),
      telefono: [...new Set([...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute('href').replace('tel:', '')))].slice(0, 3),
      whatsapp: !!document.querySelector('a[href*="wa.me"], a[href*="api.whatsapp"]'),
      linkUtili: [...document.querySelectorAll('a')].map(a => ({ t: (a.innerText || '').trim().slice(0, 50), h: a.href })).filter(a => /spedizion|reso|resi|recesso|contatt|chi siamo|faq|condizioni/i.test(a.t)).slice(0, 12),
      piattaforma, viewport: document.querySelector('meta[name=viewport]')?.content || null,
    };
  }).catch(e => ({ errore: e.message }));
  const m = await page.evaluate(() => window.__m).catch(() => null);
  await ctx.close();
  const out = {
    slug, url, misuratoIl: new Date().toISOString(), dispositivo: 'Pixel 7 (Chrome mobile), cache vuota, server GitHub (USA/EU)',
    erroreCaricamento: error,
    bloccatoDaProtezione: /ci siamo quasi|just a moment|attention required|request could not be satisfied/i.test(data?.titolo || ''), caricamentoTotaleMs: loadWall,
    lcpMs: m?.lcp ? Math.round(m.lcp.t) : null, lcpElemento: m?.lcp?.el || null, cls: m ? +m.cls.toFixed(3) : null,
    ...data,
    pesoKB: Math.round(reqs.reduce((a, r) => a + r.bytes, 0) / 1024),
    immaginiPiuPesanti: reqs.filter(r => r.type === 'image').sort((a, b) => b.bytes - a.bytes).slice(0, 5).map(r => ({ url: r.url.slice(0, 160), kb: Math.round(r.bytes / 1024) })),
    rispostaServer: await serverTimes(url),
    risorseRotte: reqs.filter(r => r.status >= 400).map(r => ({ status: r.status, url: r.url.slice(0, 160) })).slice(0, 10),
  };
  await fs.writeFile(path.join(dir, 'misura.json'), JSON.stringify(out, null, 2));
  return out;
}

const browser = await chromium.launch();
for (const p of pairs) {
  const r = await measure(browser, p);
  console.log(`- ${p.slug}: ttfb ${r.ttfb}ms, lcp ${r.lcpMs}ms, ${r.pesoKB}KB, ${r.richieste} richieste${r.erroreCaricamento ? ' ERRORE ' + r.erroreCaricamento : ''}`);
}
await browser.close();
