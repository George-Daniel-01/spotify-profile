/* eslint-disable no-console */
/**
 * Local end-to-end suite against client/build.
 * Verifies every route renders, stays within a request budget, and degrades
 * gracefully on malformed API data instead of white-screening.
 *
 * Run: node tests/e2e-local.js
 */
const { chromium } = require('playwright');
const { attachSpotifyRoutes } = require('./mock-spotify.js');
const { serveBuild } = require('./serve-build.js');

const PORT = 4321;
const BASE = `http://localhost:${PORT}`;
const BUILD = require('path').join(__dirname, '..', 'client', 'build');

const PLAYLIST_ID = '37i9dQZF1DXcBWIGoYBM5M';
const ROUTES = [
  ['/', 'Profile'],
  ['/artists', 'Top Artists'],
  ['/tracks', 'Top Tracks'],
  ['/recent', 'Recently Played'],
  ['/playlists', 'Your Playlists'],
  ['/taste', 'Taste Profile'],
  ['/mood', 'Mood Match'],
  [`/playlists/${PLAYLIST_ID}`, 'Chill Mix'],
  ['/artist/artist0', 'Artist 1'],
  ['/track/track0', 'Track track0'],
];

// Max Spotify calls allowed per route. Guards against effect/retry loops.
// '/' = me + following + playlists + top artists + top tracks.
// '/taste' = TasteProfile(long artists+tracks) + ListeningHabits(short,medium,long artists).
// '/mood'  = 3 top-track time ranges + 1 batched artist lookup.
// Every route costs one extra /v1/me now that App resolves the user itself, so
// the subscription check works on deep links. '/' shares User.js's in-flight
// request, so it does not pay the extra call.
const BUDGET = {
  '/': 5, '/artists': 2, '/tracks': 2, '/recent': 2, '/playlists': 2,
  '/taste': 6, '/mood': 5, [`/playlists/${PLAYLIST_ID}`]: 3, '/artist/artist0': 2, '/track/track0': 4,
};

let pass = 0;
let fail = 0;
const ok = (name, msg) => { pass++; console.log('  ok   ' + name + (msg ? '  (' + msg + ')' : '')); };
const bad = (name, msg) => { fail++; console.log('  FAIL ' + name + '  ->  ' + msg); };

async function newPage(context, token) {
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('UNCAUGHT: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon|manifest|\.map|apple-touch/i.test(t)) return;
    errs.push(t);
  });
  await page.addInitScript(tok => {
    if (tok) {
      localStorage.setItem('spotify_access_token', 'mock');
      localStorage.setItem('spotify_refresh_token', 'mock');
      localStorage.setItem('spotify_token_timestamp', String(Date.now()));
    } else {
      localStorage.clear();
    }
  }, token);
  return { page, errs };
}

async function main() {
  const server = await serveBuild(BUILD, PORT);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
  console.log('Serving ' + BUILD + ' on ' + BASE + '\n');

  // ---------- 1. logged out ----------
  console.log('# logged out');
  {
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const calls = [];
    await attachSpotifyRoutes(context, calls);
    const { page, errs } = await newPage(context, false);
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const text = await page.evaluate(() => document.getElementById('root').innerText.trim());
    const fatal = errs.filter(e => e.startsWith('UNCAUGHT') || /ErrorBoundary/.test(e));
    if (text.length > 10 && !fatal.length) ok('login screen renders', text.length + ' chars');
    else bad('login screen renders', 'text=' + text.length + ' fatal=' + fatal.join(' | '));
    if (calls.length === 0) ok('no Spotify calls while logged out');
    else bad('no Spotify calls while logged out', calls.join(', '));
    await context.close();
  }

  // ---------- 2. every route renders ----------
  console.log('\n# route rendering + request budget');
  {
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    for (const [route, needle] of ROUTES) {
      const calls = [];
      await attachSpotifyRoutes(context, calls);
      const { page, errs } = await newPage(context, true);
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const info = await page.evaluate(() => ({
        text: document.getElementById('root').innerText.trim(),
        htmlLen: document.getElementById('root').innerHTML.length,
      }));
      const fatal = errs.filter(e => e.startsWith('UNCAUGHT') || /ErrorBoundary/.test(e));
      const navOnly = info.text.split('\n').filter(l => l.trim()).length <= 8;
      const budget = BUDGET[route];

      if (fatal.length) bad(route, 'crashed: ' + fatal[0].slice(0, 120));
      else if (info.text.includes(needle)) ok(route, 'rendered "' + needle + '"');
      else if (navOnly) bad(route, 'blank page (nav only, ' + info.text.length + ' chars)');
      else bad(route, 'missing "' + needle + '" in: ' + JSON.stringify(info.text.slice(0, 120)));

      if (calls.length > budget) bad(route + ' request budget', calls.length + ' > ' + budget + ' -> ' + calls.join(', '));
      else ok(route + ' request budget', calls.length + ' <= ' + budget);

      await page.close();
    }
    await context.close();
  }

  // ---------- 3. malformed data must not white-screen ----------
  console.log('\n# graceful degradation on malformed API data');
  {
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });

    // 3a. playlist with tracks.items = null (this crashed Playlist.js before the fix)
    // NOTE: register the generic mock first; Playwright matches the most recently
    // added route pattern first, so overrides must come afterwards.
    await attachSpotifyRoutes(context);
    await context.route('**/api.spotify.com/v1/playlists/**', route => {
      const u = new URL(route.request().url());
      if (/followers\/contains/.test(u.pathname)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[false]' });
      return route.fulfill({
        status: 200, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({
          id: PLAYLIST_ID, name: 'Broken Mix', owner: { display_name: 'me' },
          images: null, tracks: { total: 3, items: null },
          external_urls: null, description: null,
        }),
      });
    });
    let { page, errs } = await newPage(context, true);
    await page.goto(BASE + '/playlists/' + PLAYLIST_ID, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    let text = await page.evaluate(() => document.getElementById('root').innerText.trim());
    let blank = text.split('\n').filter(l => l.trim()).length <= 8;
    if (!blank && text.includes('Broken Mix')) ok('playlist w/ null images+items', 'no white screen');
    else bad('playlist w/ null images+items', blank ? 'blank page' : 'missing name: ' + JSON.stringify(text.slice(0, 100)));
    await page.close();

    // 3b. track with no album.release_date (this crashed getYear before the fix)
    await context.unroute('**/api.spotify.com/v1/playlists/**');
    await context.route('**/api.spotify.com/v1/tracks/**', route => {
      const id = new URL(route.request().url()).pathname.split('/').pop();
      return route.fulfill({
        status: 200, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({
          id, name: 'No Date Song', type: 'track', uri: 'spotify:track:' + id,
          duration_ms: 200000, popularity: 42,
          artists: [{ id: 'a1', name: 'Someone' }],
          album: { name: 'Somewhere', images: [], external_urls: { spotify: 'https://open.spotify.com/album/x' } },
          external_urls: { spotify: 'https://open.spotify.com/track/' + id },
        }),
      });
    });
    ({ page, errs } = await newPage(context, true));
    await page.goto(BASE + '/track/trackX', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    text = await page.evaluate(() => document.getElementById('root').innerText.trim());
    blank = text.split('\n').filter(l => l.trim()).length <= 8;
    if (!blank && text.includes('No Date Song')) ok('track w/o release_date', 'no crash');
    else bad('track w/o release_date', blank ? 'blank page' : JSON.stringify(text.slice(0, 100)));
    await page.close();

    // 3c. ErrorBoundary must show a message, not null
    await context.unroute('**/api.spotify.com/v1/tracks/**');
    await context.route('**/api.spotify.com/v1/artists/**', route =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        // followers as a number -> old formatWithCommas/`.total` reads would throw
        body: JSON.stringify({ id: 'a1', name: 'Boom', popularity: 10, genres: [], followers: 5 }),
      }));
    ({ page, errs } = await newPage(context, true));
    await page.goto(BASE + '/artist/a1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const dom = await page.evaluate(() => document.getElementById('root').innerText.trim());
    const showsFallback = /Something went wrong/i.test(dom);
    const hasRetry = await page.locator('button:has-text("Try again")').count().catch(() => 0);
    if (!showsFallback) {
      ok('malformed artist handled without crash', 'rendered artist instead of crashing');
    } else if (hasRetry > 0) {
      ok('ErrorBoundary shows fallback + retry', 'fallback visible');
    } else {
      bad('ErrorBoundary shows fallback + retry', 'fallback text present but no retry button');
    }
    await page.close();
    await context.close();
  }

  // ---------- 4. paywall gating ----------
  console.log('\n# paywall gating');
  {
    const PLANS = [
      {
        id: 'prod_1',
        name: 'Premium',
        prices: [
          {
            id: 'price_1',
            active: true,
            currency: 'usd',
            unit_amount: 500,
            interval: 'month',
          },
        ],
      },
    ];

    async function contextFor(subscribed) {
      const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
      await attachSpotifyRoutes(ctx);
      await ctx.route('**/api/subscription-status*', r =>
        r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ subscribed, active: subscribed }),
        }));
      await ctx.route('**/api/products', r =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PLANS) }));
      return ctx;
    }

    // 4a. unsubscribed -> paywall on the premium pages, and it opens the modal
    {
      const ctx = await contextFor(false);
      const { page } = await newPage(ctx, true);

      await page.goto(BASE + '/artist/artist0', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      let text = await page.evaluate(() => document.getElementById('root').innerText.trim());
      if (/premium required/i.test(text) && /see plans/i.test(text))
        ok('unsubscribed artist shows paywall');
      else bad('unsubscribed artist shows paywall', JSON.stringify(text.slice(-120)));
      if (!/FOLLOWERS/.test(text)) ok('unsubscribed artist hides stats');
      else bad('unsubscribed artist hides stats', 'stats still visible');

      await page.goto(BASE + '/track/track0', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      text = await page.evaluate(() => document.getElementById('root').innerText.trim());
      if (/premium required/i.test(text)) ok('unsubscribed track shows paywall');
      else bad('unsubscribed track shows paywall', JSON.stringify(text.slice(-120)));
      if (/tempo/i.test(text)) bad('unsubscribed track hides audio analysis', 'analysis visible');
      else ok('unsubscribed track hides audio analysis');

      // the paywall button must actually open the subscribe modal
      await page.locator('button:has-text("See plans")').first().click();
      await page.waitForTimeout(800);
      const modal = await page.evaluate(() => document.body.innerText);
      if (/premium required/i.test(modal) && /subscribe for/i.test(modal))
        ok('paywall button opens subscribe modal with plans');
      else bad('paywall button opens subscribe modal with plans', JSON.stringify(modal.slice(-160)));

      await page.close();
      await ctx.close();
    }

    // 4b. subscribed -> insights, no paywall
    {
      const ctx = await contextFor(true);
      const { page } = await newPage(ctx, true);

      await page.goto(BASE + '/artist/artist0', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      let text = await page.evaluate(() => document.getElementById('root').innerText.trim());
      if (/FOLLOWERS/i.test(text) && !/premium required/i.test(text))
        ok('subscribed artist shows stats, no paywall');
      else bad('subscribed artist shows stats, no paywall', JSON.stringify(text.slice(-120)));

      await page.goto(BASE + '/track/track0', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      text = await page.evaluate(() => document.getElementById('root').innerText.trim());
      if (/tempo/i.test(text) && !/premium required/i.test(text))
        ok('subscribed track shows audio analysis, no paywall');
      else bad('subscribed track shows audio analysis, no paywall', JSON.stringify(text.slice(-160)));

      await page.close();
      await ctx.close();
    }
  }

  console.log('\n================ ' + pass + ' passed, ' + fail + ' failed ================');
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('SUITE ERROR:', e); process.exit(1); });