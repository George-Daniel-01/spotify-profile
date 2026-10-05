/* eslint-disable no-console */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'https://spotify-profile-full.vercel.app';
const OUT = path.join(__dirname, 'audit-output');
const SHOTS = process.env.SHOTS === '1';

// ---------------------------------------------------------------- mock data
const ARTIST = (id, name, genres) => ({
  id,
  name,
  genres,
  popularity: 70,
  followers: { total: 1000000, href: 'x' },
  images: [{ url: 'https://i.scdn.co/image/abc', height: 320, width: 320 }],
  external_urls: { spotify: 'https://open.spotify.com/artist/' + id },
});
const ALBUM = name => ({
  name,
  album_type: 'album',
  release_date: '2021-06-11',
  release_date_precision: 'day',
  total_tracks: 12,
  images: [{ url: 'https://i.scdn.co/image/cover', height: 640, width: 640 }],
  external_urls: { spotify: 'https://open.spotify.com/album/x' },
});
const TRACK = (id, name, artistName, artistId) => ({
  id,
  name,
  type: 'track',
  uri: 'spotify:track:' + id,
  duration_ms: 210000,
  popularity: 70,
  artists: [{ id: artistId, name: artistName, uri: 'spotify:artist:' + artistId }],
  album: ALBUM('Album ' + name),
  external_urls: { spotify: 'https://open.spotify.com/track/' + id },
});
const FEATURE = i => ({
  danceability: 0.5 + (i % 5) * 0.05,
  energy: 0.4 + (i % 7) * 0.05,
  key: 4,
  loudness: -8.5,
  mode: 1,
  speechiness: 0.05,
  acousticness: 0.2,
  instrumentalness: 0.1,
  liveness: 0.15,
  valence: 0.5,
  tempo: 110 + i,
  time_signature: 4,
  uri: 'spotify:track:x',
  track_href: 'x',
  duration_ms: 210000,
});

const GENRE_SETS = [
  ['pop', 'electropop'],
  ['dance', 'house'],
  ['hip-hop', 'rap'],
  ['rock', 'alternative rock'],
  ['indie rock', 'shoegaze'],
  ['r&b', 'neo soul'],
  ['edm', 'future garage'],
  ['folk', 'singer-songwriter'],
];
const mkArtists = n =>
  Array.from({ length: n }, (_, i) =>
    ARTIST('artist' + i, 'Artist ' + i, GENRE_SETS[i % GENRE_SETS.length]),
  );
const mkTracks = n =>
  Array.from({ length: n }, (_, i) =>
    TRACK('track' + i, 'Track ' + i, 'Artist ' + (i % 8), 'artist' + (i % 8)),
  );

const PAGES = [
  ['/', 'Profile'],
  ['/artists', 'Top Artists'],
  ['/tracks', 'Top Tracks'],
  ['/recent', 'Recently Played'],
  ['/playlists', 'Playlists'],
  ['/taste', 'Taste Profile'],
  ['/mood', 'Mood Match'],
  ['/playlists/37i9dQZF1DXcBWIGoYBM5M', 'Playlist detail'],
  ['/artist/artist0', 'Artist detail'],
  ['/track/track0', 'Track detail'],
];

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });
}

// ------------------------------------------------------------ api mocking
async function installMocks(context, opts) {
  const subscribed = !!opts.subscribed;
  const spotifyCalls = [];

  await context.route('**/api.spotify.com/**', async route => {
    const u = new URL(route.request().url());
    const p = u.pathname;
    const q = u.searchParams;
    spotifyCalls.push(`${route.request().method()} ${p}${u.search}`);

    const ids = q.get('ids');

    if (p === '/v1/me') {
      return json(route, {
        display_name: 'Test Listener',
        id: 'me123',
        email: 'listener@example.com',
        images: [{ url: 'https://i.scdn.co/image/me', height: 300, width: 300 }],
        followers: { total: 42, href: 'x' },
        product: 'premium',
        country: 'SE',
        external_urls: { spotify: 'https://open.spotify.com/user/me123' },
      });
    }
    if (p === '/v1/me/following') {
      if (route.request().method() === 'PUT') return json(route, null);
      return json(route, { artists: { items: mkArtists(20), next: null, total: 20 } });
    }
    if (p === '/v1/me/following/contains')
      return json(route, (ids || '').split(',').map(() => false));
    if (p === '/v1/me/playlists')
      return json(route, {
        items: [
          { id: '37i9dQZF1DXcBWIGoYBM5M', name: 'Chill Mix', owner: { display_name: 'me123' }, images: [{ url: 'https://i.scdn.co/image/p1', height: 300, width: 300 }], tracks: { total: 40 }, external_urls: { spotify: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' } },
          { id: '37i9dQZF1DX4h5', name: 'Workout', owner: { display_name: 'me123' }, images: [{ url: 'https://i.scdn.co/image/p2', height: 300, width: 300 }], tracks: { total: 20 }, external_urls: { spotify: 'https://open.spotify.com/playlist/37i9dQZF1DX4h5' } },
        ],
        total: 2,
      });
    if (p === '/v1/me/player/recently-played')
      return json(route, {
        items: mkTracks(20).map(t => ({ track: t, played_at: new Date().toISOString() })),
        next: null,
        cursors: null,
      });
    if (p === '/v1/me/top/artists')
      return json(route, { items: mkArtists(50), next: null, total: 50, time_range: q.get('time_range') });
    if (p === '/v1/me/top/tracks')
      return json(route, { items: mkTracks(50), next: null, total: 50, time_range: q.get('time_range') });

    if (p.startsWith('/v1/audio-features/'))
      return json(route, FEATURE(1));
    if (p === '/v1/audio-features') {
      const list = (ids || '').split(',').filter(Boolean);
      return json(route, { audio_features: list.map((_, i) => FEATURE(i)) });
    }
    if (p.startsWith('/v1/audio-analysis/'))
      return json(route, {
        bars: [{ start: 0, duration: 210, confidence: 1 }],
        beats: [{ start: 0, duration: 0.5, confidence: 1 }],
        tat: [{ start: 0, duration: 0.5, confidence: 1 }],
        sections: [{ start: 0, duration: 210, confidence: 1, loudness: -8, tempo: 110, key: 4, mode: 1, time_signature: 4 }],
        meta: { analyzed_time: { duration: 210, samples: 1000 } },
        track: { tempo: 110, key: 4, mode: 1, time_signature: 4 },
      });
    if (p.startsWith('/v1/tracks/')) {
      const id = p.split('/').pop();
      return json(route, TRACK(id, 'Track ' + id, 'Artist 1', 'artist1'));
    }
    if (p.startsWith('/v1/artists/')) {
      const id = p.split('/').pop();
      return json(route, ARTIST(id, 'Artist 1', ['pop', 'rock']));
    }
    if (/^\/v1\/playlists\/[^/]+\/followers\/contains$/.test(p)) {
      const uid = q.get('ids') || '';
      return json(route, uid.split(',').map(() => false));
    }
    if (/^\/v1\/playlists\/[^/]+\/followers$/.test(p)) return json(route, null);
    if (/^\/v1\/playlists\/[^/]+\/tracks$/.test(p)) {
      if (route.request().method() === 'POST') return json(route, { snapshot_id: 's' });
      return json(route, { items: mkTracks(30).map(t => ({ track: t })), next: null, total: 30 });
    }
    if (p.startsWith('/v1/playlists/'))
      return json(route, {
        id: '37i9dQZF1DXcBWIGoYBM5M',
        name: 'Chill Mix',
        owner: { display_name: 'Test Listener' },
        images: [{ url: 'https://i.scdn.co/image/p1', height: 640, width: 640 }],
        tracks: { total: 40 },
        external_urls: { spotify: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' },
        description: 'A chill mix for working.',
      });
    if (p === '/v1/recommendations')
      return json(route, { seeds: [], tracks: mkTracks(30) });
    if (/^\/v1\/users\/[^/]+\/playlists$/.test(p))
      return json(route, { id: 'new1', name: 'New' });

    return json(route, { error: { status: 404, message: 'UNMOCKED ' + p } }, 404);
  });

  // the app's own backend
  await context.route('**/api/subscription-status**', route =>
    json(route, { active: subscribed, plan: subscribed ? 'premium' : null }),
  );
  await context.route('**/api/products', route =>
    opts.products
      ? json(route, [
          {
            id: 'prod_1',
            name: 'Premium',
            active: true,
            prices: [{ id: 'price_1', currency: 'usd', unit_amount: 499, active: true, recurring: { interval: 'month' } }],
          },
        ])
      : json(route, { error: 'Not Found' }, 404),
  );
  await context.route('**/create-checkout-session', route =>
    opts.checkoutWorks
      ? json(route, { sessionId: 'cs_test_123' })
      : route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>spa fallback</body></html>' }),
  );
  await context.route('**/api/refresh_token*', route => json(route, { access_token: 'mock-refreshed' }));

  return spotifyCalls;
}

// ------------------------------------------------------------------ runner
async function run(label, opts) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const spotifyCalls = await installMocks(context, opts);

  // seed tokens the way /api/cb would
  await context.addInitScript(() => {
    localStorage.setItem('spotify_access_token', 'mock-access-token');
    localStorage.setItem('spotify_refresh_token', 'mock-refresh-token');
    localStorage.setItem('spotify_token_timestamp', String(Date.now()));
  });

  const results = [];

  for (const [routePath, featureName] of PAGES) {
    const page = await context.newPage();
    const errors = [];
    const warnings = [];
    const failed = [];
    const unmocked = [];

    page.on('console', m => {
      const t = m.text();
      if (m.type() === 'error') errors.push(t);
      if (m.type() === 'warning') warnings.push(t);
    });
    page.on('pageerror', e => errors.push('UNCAUGHT: ' + (e && e.message)));
    page.on('requestfailed', r => failed.push(`${r.method()} ${r.url()} :: ${r.failure() && r.failure().errorText}`));
    page.on('response', async r => {
      if (r.status() >= 400) {
        const u = new URL(r.url());
        if (u.hostname === 'api.spotify.com' && u.pathname.includes('UNMOCKED')) unmocked.push(u.pathname);
      }
    });

    let renderInfo = { textLen: 0, canvases: 0, imgs: 0 };
    try {
      await page.goto(BASE + routePath, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3500);
      renderInfo = await page.evaluate(() => {
        const root = document.getElementById('root');
        const t = (root ? root.innerText : '').trim();
        return {
          textLen: t.length,
          canvases: document.querySelectorAll('canvas').length,
          imgs: document.querySelectorAll('img').length,
          bodyLen: document.body.innerText.trim().length,
          text: t.slice(0, 400),
        };
      });
      if (SHOTS) {
        await page.screenshot({ path: path.join(OUT, `${label}-${routePath.replace(/\//g, '_') || '_root'}.png`), fullPage: true });
      }
    } catch (e) {
      errors.push('NAV: ' + e.message.split('\n')[0]);
    }

    results.push({ routePath, featureName, errors, warnings, failed, unmocked, ...renderInfo });
    await page.close();
  }

  await browser.close();
  return { label, opts, results, spotifyCalls: [...new Set(spotifyCalls)] };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const suites = [
    // This suite still injects Spotify tokens; it represents a logged-in but
// unsubscribed visitor, not an anonymous one.
['unsubscribed', { subscribed: false, products: false, checkoutWorks: false }, false],
    ['subscribed', { subscribed: true, products: true, checkoutWorks: true }, false],
  ];

  const report = {};
  for (const [label, opts, shots] of suites) {
    process.env.SHOTS = shots ? '1' : '0';
    console.log(`\n================ SUITE: ${label} ================`);
    const r = await run(label, opts);
    report[label] = r;
    for (const res of r.results) {
      const blank = res.textLen < 40;
      const bad = blank || res.errors.length || res.failed.length || res.unmocked.length;
      console.log(
        `${bad ? 'FAIL' : ' ok '} ${res.routePath.padEnd(34)} ${res.featureName.padEnd(18)} text=${String(res.textLen).padStart(5)} canvas=${res.canvases} img=${res.imgs} err=${res.errors.length} netfail=${res.failed.length}`,
      );
      if (blank) console.log(`       !! BLANK RENDER (only ${res.textLen} chars of text)`);
      if (process.env.VERBOSE === '1')
        console.log('       TEXT: ' + JSON.stringify(res.text.slice(0, 260)));
      [...new Set(res.errors)].slice(0, 6).forEach(e => console.log('       ERROR  ' + e.slice(0, 220)));
      [...new Set(res.failed)].slice(0, 4).forEach(e => console.log('       NETFAIL ' + e.slice(0, 200)));
      [...new Set(res.unmocked)].slice(0, 4).forEach(e => console.log('       UNMOCKED ' + e));
    }
    console.log(`  spotify endpoints exercised: ${r.spotifyCalls.length}`);
    if (r.spotifyCalls.length) console.log('  ' + r.spotifyCalls.join('\n  '));
  }

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\nreport -> ' + path.join(OUT, 'report.json'));
})().catch(e => {
  console.error('HARNESS FAILURE:', e);
  process.exit(1);
});