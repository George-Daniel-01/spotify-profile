import { chromium } from 'playwright';

const BASE = 'https://spotify-profile-full.vercel.app';

async function debugTasteProfile() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  await context.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem('spotify_token_timestamp', String(now - 60000));
    localStorage.setItem('spotify_access_token', 'mock-access-token-123');
    localStorage.setItem('spotify_refresh_token', 'mock-refresh-token-456');
  });

  const page = await context.newPage();

  // Intercept resolve to log timing
  let apiCallTimestamps = {};
  page.on('response', response => {
    const url = response.url();
    if (url.includes('api.spotify.com')) {
      apiCallTimestamps[url] = Date.now();
    }
  });

  // Capture ALL console output
  page.on('console', msg => {
    const text = msg.text();
    console.log(`  [${msg.type()}] ${text.substring(0, 300)}`);
  });

  // Capture page errors
  page.on('pageerror', err => {
    console.log(`  [PAGE ERROR] ${err.message}\n${err.stack ? err.stack.substring(0, 500) : ''}`);
  });

  await page.route('**/api.spotify.com/v1/me/top/artists**', route => {
    console.log(`  [MOCK] Intercepted: ${route.request().url().substring(0, 100)}`);
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
    console.log(`  [MOCK] Intercepted: ${route.request().url().substring(0, 100)}`);
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

  try {
    console.log('Navigating to /taste...');
    await page.goto(`${BASE}/taste`, { waitUntil: 'networkidle', timeout: 45000 });
    console.log('Page loaded. Waiting for rendering...');
    await page.waitForTimeout(3000);

    // Check render state
    const state = await page.evaluate(() => {
      const body = document.body?.textContent || '';
      const hasTaste = body.includes('Taste Profile');
      const hasDNA = body.includes('Audio DNA');
      const hasGenre = body.includes('Top Genres');
      const hasHabits = body.includes('How Your Taste Evolves');
      return { hasTaste, hasDNA, hasGenre, hasHabits };
    });
    console.log('Render state:', JSON.stringify(state));

    // Check if components rendered
    const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
    console.log(`Canvas count: ${canvasCount}`);

    // Try to find the TasteProfile component in the React tree
    const reactState = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return { error: 'no root' };
      const fiberKey = Object.keys(root).find(k => k.startsWith('__reactFiber'));
      return { hasFiberKey: !!fiberKey };
    });
    console.log('React state:', JSON.stringify(reactState));

    // Wait more and re-check
    await page.waitForTimeout(5000);
    console.log('After 5s additional wait:');

    const chartJSInfo = await page.evaluate(() => {
      const charts = document.querySelectorAll('canvas');
      const results = [];
      for (const c of charts) {
        const rect = c.getBoundingClientRect();
        const style = window.getComputedStyle(c);
        results.push({
          id: c.id,
          w: c.width,
          h: c.height,
          rect: `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`,
          display: style.display,
          visibility: style.visibility,
          parentDisplay: c.parentElement ? window.getComputedStyle(c.parentElement).display : 'unknown',
        });
      }
      return results;
    });
    chartJSInfo.forEach((info, i) => {
      console.log(`  Canvas ${i+1}: ${JSON.stringify(info)}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

debugTasteProfile();
