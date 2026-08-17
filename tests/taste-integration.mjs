import { chromium } from 'playwright';

const BASE = 'https://spotify-profile-full.vercel.app';

async function testTasteProfileWithMocks() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  await context.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem('spotify_token_timestamp', String(now - 60000));
    localStorage.setItem('spotify_access_token', 'mock-access-token-123');
    localStorage.setItem('spotify_refresh_token', 'mock-refresh-token-456');
  });

  const page = await context.newPage();

  // Capture console messages for debugging
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err.message}`));

  await page.route('**/api.spotify.com/v1/me/top/artists**', route => {
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

  let ok = 0;
  let total = 0;
  const check = (name, cond) => {
    total++;
    const mark = cond ? '✓' : '✗';
    console.log(`${mark} ${name}`);
    if (cond) ok++;
  };

  try {
    await page.goto(`${BASE}/taste`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(8000);

    const bodyText = await page.textContent('body');

    check('Taste Profile heading', bodyText.includes('Taste Profile'));
    check('Audio DNA section', bodyText.includes('Audio DNA'));
    check('Top Genres section', bodyText.includes('Top Genres'));
    check('How Your Taste Evolves', bodyText.includes('How Your Taste Evolves'));
    check('Not showing login', !bodyText.includes('Log in'));

    const canvases = await page.$$('canvas');
    check('Canvas elements rendered', canvases.length >= 2);

    // Debug canvas info
    const canvasInfo = await page.evaluate(() => {
      const results = [];
      const all = document.querySelectorAll('canvas');
      for (let i = 0; i < all.length; i++) {
        const c = all[i];
        const ctx = c.getContext('2d');
        let pixelAlpha = -1;
        let nonTransparentPixels = 0;
        if (ctx) {
          try {
            const imageData = ctx.getImageData(0, 0, c.width, c.height);
            pixelAlpha = imageData.data[3];
            for (let j = 3; j < imageData.data.length; j += 4) {
              if (imageData.data[j] > 0) {
                nonTransparentPixels++;
                if (nonTransparentPixels > 100) break;
              }
            }
          } catch (e) {
            pixelAlpha = -2;
          }
        }
        results.push({
          id: c.id || 'no-id',
          width: c.width,
          height: c.height,
          ctxType: ctx ? '2d' : 'none',
          firstPixelAlpha: pixelAlpha,
          nonTransparentPixels,
          parentText: (c.parentElement ? c.parentElement.textContent || '' : '').trim().substring(0, 50),
        });
      }
      return results;
    });
    console.log('\nCanvas debug info:');
    canvasInfo.forEach((info, i) => {
      console.log(`  Canvas ${i + 1}: id="${info.id}" ${info.width}x${info.height} ctx=${info.ctxType} firstAlpha=${info.firstPixelAlpha} nonTransparent=${info.nonTransparentPixels} parent="${info.parentText}"`);
    });

    // Check for Chart.js global
    const chartJsExists = await page.evaluate(() => {
      return typeof window.Chart !== 'undefined';
    });
    check('Chart.js is loaded', chartJsExists);

    // Check for chart instances
    const chartCount = await page.evaluate(() => {
      let count = 0;
      const all = document.querySelectorAll('canvas');
      for (const c of all) {
        if (c.__chartjs) count++;
      }
      return count;
    });
    check('Chart.js instances on canvases', chartCount > 0);

    // Sample multiple pixels across the canvas
    const hasAnyContent = await page.evaluate(() => {
      const all = document.querySelectorAll('canvas');
      for (const c of all) {
        const ctx = c.getContext('2d');
        if (!ctx) continue;
        try {
          const w = c.width;
          const h = c.height;
          if (w === 0 || h === 0) continue;
          // Sample multiple points
          const points = [
            { x: Math.floor(w/2), y: Math.floor(h/2) },
            { x: Math.floor(w/3), y: Math.floor(h/3) },
            { x: Math.floor(2*w/3), y: Math.floor(2*h/3) },
          ];
          for (const p of points) {
            const data = ctx.getImageData(p.x, p.y, 1, 1).data;
            if (data[3] > 0) return true; // any non-transparent pixel
          }
        } catch (e) {}
      }
      return false;
    });
    check('Any canvas has rendered content', hasAnyContent);

    // Check for stat grid
    check('Stat grid visible', bodyText.includes('Avg Tempo') && bodyText.includes('Avg Energy') && bodyText.includes('Avg Danceability') && bodyText.includes('Unique Genres'));
    check('Genre Breakdown visible', bodyText.includes('Genre Breakdown'));
    check('Listening Habits legend visible', bodyText.includes('Last 4 Weeks') && bodyText.includes('Last 6 Months') && bodyText.includes('All Time'));
    check('At least 3 canvases total', canvases.length >= 3);

    if (ok !== total) {
      console.log('\nConsole logs:');
      logs.forEach(l => console.log(`  ${l}`));
    }

  } catch (err) {
    console.error('Test error:', err.message);
    await page.screenshot({ path: 'taste-test-fail.png', fullPage: true });
  } finally {
    await browser.close();
  }

  console.log(`\nResults: ${ok}/${total} checks passed`);
  process.exit(ok === total ? 0 : 1);
}

testTasteProfileWithMocks();
