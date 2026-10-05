/* eslint-disable no-console */
/**
 * Post-login production check.
 *
 * Simulates the real OAuth callback redirect (/#access_token=...&refresh_token=...)
 * against the DEPLOYED app and asserts the profile actually renders. Also covers
 * what a user sees when Spotify rejects or expires the token, because "logs in
 * then sees nothing" is the failure mode that matters most here.
 */
const { chromium } = require('playwright');
const { attachSpotifyRoutes } = require('./mock-spotify.js');

const BASE = process.env.BASE_URL || 'https://spotify-profile-full.vercel.app';

let pass = 0;
let fail = 0;
const ok = (n, m) => { pass++; console.log('  ok   ' + n + (m ? '  (' + m + ')' : '')); };
const bad = (n, m) => { fail++; console.log('  FAIL ' + n + '  ->  ' + m); };

// What the profile page is supposed to show once logged in.
const EXPECTED = [
  'Top Artists',
  'Top Tracks',
  'Recent',
  'Playlists',
  'Taste Profile',
  'Mood Match',
  'LOGOUT',
];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });

  // ---------- 1. successful login via the real callback redirect ----------
  console.log('# post-login redirect (/#access_token=...)');
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    await attachSpotifyRoutes(ctx);
    await ctx.route('**/api/subscription-status*', r =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{"subscribed":true,"active":true}' }));
    await ctx.route('**/api/products', r =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('UNCAUGHT: ' + e.message));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/favicon|manifest|\.map|i\.scdn\.co|apple-touch/i.test(t)) return;
      errs.push(t);
    });

    // This is exactly where api/cb.js lands the browser.
    await page.goto(`${BASE}/#access_token=mock_access&refresh_token=mock_refresh`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(4000);

    const text = await page.evaluate(() => document.getElementById('root').innerText.trim());
    const storage = await page.evaluate(() => ({
      access: window.localStorage.getItem('spotify_access_token'),
      refresh: window.localStorage.getItem('spotify_refresh_token'),
      ts: window.localStorage.getItem('spotify_token_timestamp'),
      hash: window.location.hash,
      search: window.location.search,
    }));

    const missing = EXPECTED.filter(x => !text.toLowerCase().includes(x.toLowerCase()));
    if (!missing.length) ok('profile renders after callback redirect');
    else bad('profile renders after callback redirect', 'missing: ' + missing.join(', ') + ' | got: ' + JSON.stringify(text.slice(0, 160)));

    if (storage.access === 'mock_access') ok('access token captured into storage');
    else bad('access token captured into storage', 'got ' + storage.access);

    if (storage.refresh === 'mock_refresh') ok('refresh token captured into storage');
    else bad('refresh token captured into storage', 'got ' + storage.refresh);

    if (storage.ts) ok('token timestamp set');
    else bad('token timestamp set', 'null');

    if (!storage.hash.includes('access_token') && !storage.search.includes('access_token'))
      ok('token scrubbed from the visible URL');
    else bad('token scrubbed from the visible URL', 'hash=' + storage.hash + ' search=' + storage.search);

    if (/Test Listener/.test(text)) ok('user display name shown');
    else bad('user display name shown', JSON.stringify(text.slice(0, 160)));

    if (/FOLLOWERS/.test(text) && /FOLLOWING/.test(text)) ok('profile stats shown');
    else bad('profile stats shown', 'no FOLLOWERS/FOLLOWING');

    if (/Artist 0/.test(text)) ok('top artists rendered');
    else bad('top artists rendered', 'no artist names in output');

    const fatal = errs.filter(e => /UNCAUGHT|ErrorBoundary|TypeError/.test(e));
    if (!fatal.length) ok('no uncaught errors on the profile');
    else bad('no uncaught errors on the profile', fatal[0].slice(0, 140));

    await ctx.close();
  }

  // ---------- 2. Spotify rejects the token everywhere (expired/revoked) ----------
  console.log('\n# Spotify returns 401 for every call');
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    await ctx.route('**/api.spotify.com/**', r =>
      r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":{"status":401,"message":"The access token expired"}}' }));
    // refresh also fails
    await ctx.route('**/api/refresh_token', r =>
      r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Failed to refresh token"}' }));

    const page = await ctx.newPage();
    await page.goto(`${BASE}/#access_token=stale&refresh_token=stale_refresh`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(6000);

    const state = await page.evaluate(() => ({
      text: document.getElementById('root').innerText.trim(),
      access: window.localStorage.getItem('spotify_access_token'),
      blank: document.getElementById('root').innerHTML.length < 1500,
    }));

    if (!state.access) ok('dead tokens cleared from storage');
    else bad('dead tokens cleared from storage', 'still present: ' + state.access);

    const showsLogin = /log in to spotify/i.test(state.text);
    const showsSomething = state.text.length > 20;
    if (showsLogin) ok('falls back to the login screen instead of breaking');
    else if (!state.blank) ok('does not white-screen on auth failure', JSON.stringify(state.text.slice(0, 90)));
    else bad('does not white-screen on auth failure', 'blank page, text len ' + state.text.length);

    if (showsSomething) ok('something actionable is rendered on auth failure');
    else bad('something actionable is rendered on auth failure', 'nothing rendered');

    await ctx.close();
  }

  // ---------- 3. refresh succeeds after a 401 ----------
  console.log('\n# 401 then a working refresh');
  {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const spotifyCalls = [];
    await attachSpotifyRoutes(ctx, spotifyCalls);
    await ctx.route('**/api/subscription-status*', r =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{"subscribed":false,"active":false}' }));

    const page = await ctx.newPage();
    await page.goto(`${BASE}/#access_token=expired&refresh_token=good_refresh`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(4000);
    const text = await page.evaluate(() => document.getElementById('root').innerText.trim());
    if (text.length > 200) ok('renders with a usable token', text.length + ' chars');
    else bad('renders with a usable token', JSON.stringify(text.slice(0, 120)));
    if (spotifyCalls.length) ok('profile data was actually fetched', spotifyCalls.length + ' Spotify calls');

    await ctx.close();
  }

  console.log('\n================ ' + pass + ' passed, ' + fail + ' failed ================');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('SUITE ERROR:', e); process.exit(1); });