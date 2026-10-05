/* eslint-disable no-console */
// Focused probe: one route at a time, full request log + DOM snapshot.
const { chromium } = require('playwright');
const { attachSpotifyRoutes } = require('./mock-spotify.js');
const { serveBuild } = require('./serve-build.js');

const BASE = process.env.BASE_URL || 'https://spotify-profile-full.vercel.app';

(async () => {
  const target = process.argv[2] || '/playlist/37i9dQZF1DXcBWIGoYBM5M';
  let server = null;
  if (BASE.includes('localhost')) {
    server = await serveBuild(require('path').join(__dirname, '..', 'client', 'build'), 4321);
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });

  const reqs = [];
  await attachSpotifyRoutes(context, reqs);
  await context.route('**/api/subscription-status**', r =>
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"active":true}' }));
  await context.route('**/api/products', r =>
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' }));
  await context.route('**/api/refresh_token*', r =>
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"access_token":"mock2"}' }));

  await context.addInitScript(() => {
    localStorage.setItem('spotify_access_token', 'mock');
    localStorage.setItem('spotify_refresh_token', 'mock');
    localStorage.setItem('spotify_token_timestamp', String(Date.now()));
  });

  const page = await context.newPage();
  const errs = [];
  page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', e => errs.push('UNCAUGHT: ' + e.message));

  await page.goto(BASE + target, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(4000);

  console.log('=== ROUTE: ' + target);
  console.log('=== SPOTIFY REQUESTS (' + reqs.length + '):');
  reqs.forEach(r => console.log('    ' + r));
  console.log('=== CONSOLE ERRORS (' + errs.length + '):');
  [...new Set(errs)].slice(0, 8).forEach(e => console.log('    ' + e.split('\n')[0]));
  const dom = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      htmlLen: root ? root.innerHTML.length : 0,
      text: root ? root.innerText.trim().slice(0, 320) : '',
      svgs: root ? root.querySelectorAll('svg').length : 0,
      canvas: root ? root.querySelectorAll('canvas').length : 0,
    };
  });
  console.log('=== DOM innerHTML=' + dom.htmlLen + ' svgs=' + dom.svgs + ' canvas=' + dom.canvas);
  console.log('=== TEXT: ' + JSON.stringify(dom.text));

  await browser.close();
  if (server) server.close();
})().catch(e => { console.error('PROBE FAIL:', e.message); process.exit(1); });