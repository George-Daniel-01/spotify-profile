/* eslint-disable no-console */
// Renders the deployed app in a logged-in state and dumps what a user sees.
const { chromium } = require('playwright');
const { attachSpotifyRoutes } = require('./mock-spotify.js');

const BASE = process.env.BASE_URL || 'https://spotify-profile-full.vercel.app';
const ROUTE = process.argv[2] || '/';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
  await attachSpotifyRoutes(ctx);
  await ctx.route('**/api/subscription-status*', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"subscribed":true,"active":true}' }));
  await ctx.route('**/api/products', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

  // For the root route we simulate the real OAuth callback redirect. For deep
  // routes we assume the visitor already has a session, the way navigating the
  // app after logging in would.
  if (ROUTE !== '/') {
    await ctx.addInitScript(() => {
      localStorage.setItem('spotify_access_token', 'a');
      localStorage.setItem('spotify_refresh_token', 'b');
      localStorage.setItem('spotify_token_timestamp', String(Date.now()));
    });
  }

  const page = await ctx.newPage();
  const target = ROUTE === '/'
    ? `${BASE}/#access_token=a&refresh_token=b`
    : BASE + ROUTE;
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(4500);

  const out = `tests/audit-output/post-login${ROUTE === '/' ? '' : '-' + ROUTE.replace(/[^a-z0-9]+/gi, '-')}.png`;
  await page.screenshot({ path: out });
  console.log('screenshot: ' + out);
  console.log('--- VISIBLE TEXT ---');
  console.log(await page.evaluate(() => document.getElementById('root').innerText.trim()));
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });