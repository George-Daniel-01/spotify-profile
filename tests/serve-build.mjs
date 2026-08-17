import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const DIR = 'D:/code/spotify-profile/client/build';
const PORT = 3456;

const serveStatic = (f, res) => {
  const ext = path.extname(f).slice(1);
  const types = { js: 'application/javascript', css: 'text/css', html: 'text/html', svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon', json: 'application/json' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
  res.end(fs.readFileSync(f));
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  let f = path.join(DIR, urlPath === '/' ? '/index.html' : urlPath);
  try {
    if (fs.statSync(f).isFile()) {
      serveStatic(f, res);
    } else {
      throw new Error('not a file');
    }
  } catch {
    // SPA fallback: serve index.html for any non-file route
    serveStatic(path.join(DIR, 'index.html'), res);
  }
});

server.listen(PORT, async () => {
  console.log(`Server on http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  await context.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem('spotify_token_timestamp', String(now - 60000));
    localStorage.setItem('spotify_access_token', 'mock-access-token-123');
    localStorage.setItem('spotify_refresh_token', 'mock-refresh-token-456');
  });

  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text().substring(0, 200)}`));
  page.on('pageerror', err => logs.push(`[ERROR] ${err.message}`));

  await page.route('**/api.spotify.com/v1/me**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'mock-user', display_name: 'Test User' }) });
  });

  page.on('request', req => {
    const url = req.url();
    if (url.includes('api.spotify.com') || url.includes('/api/')) {
      console.log('    [REQ] ' + url.substring(0, 120));
    }
  });

  // Register specific routes LAST so they run FIRST (Playwright: reverse order)
  // Broad fallback: registered first, runs last
  await page.route('**/api.spotify.com/**', route => {
    const url = route.request().url();
    console.log('    [MOCK-FALLBACK] ' + url.substring(0, 120));
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  await page.route('**/api.spotify.com/v1/me**', route => {
    console.log('    [MOCK] /v1/me: ' + route.request().url().substring(0, 100));
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'mock-user', display_name: 'Test User' }) });
  });

  // Specific routes: registered last, run first
  await page.route('**/api.spotify.com/v1/me/top/artists**', route => {
    console.log('    [MOCK] Artists: ' + route.request().url().substring(0, 100));
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { id: '1', name: 'Dua Lipa', genres: ['pop', 'dance'], followers: { total: 50000000 } },
          { id: '2', name: 'The Weeknd', genres: ['r&b', 'pop'], followers: { total: 60000000 } },
          { id: '3', name: 'Drake', genres: ['hip-hop', 'rap'], followers: { total: 70000000 } },
          { id: '4', name: 'Radiohead', genres: ['alternative', 'rock'], followers: { total: 30000000 } },
          { id: '5', name: 'Miles Davis', genres: ['jazz'], followers: { total: 10000000 } },
        ],
      }),
    });
  });

  await page.route('**/api.spotify.com/v1/me/top/tracks**', route => {
    console.log('    [MOCK] Tracks: ' + route.request().url().substring(0, 100));
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { id: 't1', name: 'Levitating', artists: [{ id: '1', name: 'Dua Lipa' }], popularity: 90 },
          { id: 't2', name: 'Blinding Lights', artists: [{ id: '2', name: 'The Weeknd' }], popularity: 95 },
        ],
      }),
    });
  });

  let ok = 0, total = 0;
  const check = (name, cond) => {
    total++;
    const mark = cond ? '✓' : '✗';
    console.log(`${mark} ${name}`);
    if (cond) ok++;
  };

  try {
    await page.goto(`http://localhost:${PORT}/taste`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(8000);

    const bodyText = await page.textContent('body');
    check('Taste Profile heading', bodyText.includes('Taste Profile'));
    check('Audio DNA', bodyText.includes('Audio DNA'));
    check('Top Genres', bodyText.includes('Top Genres'));
    check('How Your Taste Evolves', bodyText.includes('How Your Taste Evolves'));

    const canvases = await page.$$('canvas');
    check('Canvas count >= 3', canvases.length >= 3);

    for (let i = 0; i < canvases.length; i++) {
      const box = await canvases[i].boundingBox();
      check(`Canvas ${i+1} has dimensions`, box && box.width > 10 && box.height > 10);
    }

    // Better pixel check - wait for Chart.js animations and check multiple locations
    await page.waitForTimeout(3000);

    // Debug: check if ListeningHabits canvas has a chart instance after waiting
    const lhDebug = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      const c3 = canvases[2];
      if (!c3) return { error: 'no third canvas' };
      return {
        id: c3.id,
        width: c3.width,
        height: c3.height,
        rect: c3.getBoundingClientRect().width + 'x' + c3.getBoundingClientRect().height,
        hasChart: !!(c3.chart),
        container: c3.parentElement ? c3.parentElement.className : 'none',
      };
    });
    console.log('\nListeningHabits canvas:', JSON.stringify(lhDebug));

    // Wait longer for ListeningHabits chart
    await page.waitForTimeout(5000);
    const bodyText2 = await page.textContent('body');
    check('Content still loaded', bodyText2.includes('Audio DNA'));

    // Debug canvas rendering
    const canvasDebug = await page.evaluate(() => {
      const all = document.querySelectorAll('canvas');
      const results = [];
      for (const c of all) {
        const ctx = c.getContext('2d');
        const info = {
          id: c.id,
          w: c.width,
          h: c.height,
          hasCtx: !!ctx,
          // Check if Chart.js chart instance exists
          hasChartInstance: !!(c.chart || (c.__chartjs)),
        };
        if (ctx) {
          try {
            // Sample center pixel
            const cx = Math.floor(c.width / 2);
            const cy = Math.floor(c.height / 2);
            const center = ctx.getImageData(cx, cy, 1, 1).data;
            info.centerAlpha = center[3];
            // Check if canvas has ANY non-transparent pixel
            const w = c.width;
            const h = c.height;
            let nonTransparentCount = 0;
            for (let x = 0; x < w && nonTransparentCount < 10; x += Math.max(1, Math.floor(w / 8))) {
              for (let y = 0; y < h && nonTransparentCount < 10; y += Math.max(1, Math.floor(h / 8))) {
                const d = ctx.getImageData(x, y, 1, 1).data;
                if (d[3] > 0) nonTransparentCount++;
              }
            }
            info.nonTransparentPixels = nonTransparentCount;
          } catch(e) {
            info.error = e.message;
          }
        }
        results.push(info);
      }
      return results;
    });
    console.log('\nCanvas debug:');
    canvasDebug.forEach((info, i) => console.log(`  Canvas ${i+1}: ${JSON.stringify(info)}`));

    const hasRenderedContent = canvasDebug.some(c => c.nonTransparentPixels > 0);
    check('Charts have rendered content', hasRenderedContent);

    check('Stat grid', bodyText.includes('Avg Tempo'));
    check('Genre Breakdown', bodyText.includes('Genre Breakdown'));
    check('Legend', bodyText.includes('Last 6 Months') && bodyText.includes('All Time'));

  } catch (err) {
    console.error('Test error:', err.message);
    await page.screenshot({ path: 'local-test-fail.png', fullPage: true });
    console.error('Screenshot saved');
  }

  if (ok !== total) {
    console.log('\nConsole logs:');
    logs.forEach(l => console.log(`  ${l}`));
  }

  console.log(`\nResults: ${ok}/${total} checks passed`);
  await browser.close();
  server.close();
  process.exit(ok === total ? 0 : 1);
});
