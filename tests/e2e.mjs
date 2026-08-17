import { chromium } from 'playwright';

const BASE = 'https://spotify-profile-full.vercel.app';

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const failures = [];

  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('response', resp => {
    if (resp.status() >= 500) errors.push(`HTTP ${resp.status()}: ${resp.url()}`);
  });

  // ------------- MOCK API -------------
  const mockUser = () => ({
    display_name: 'TestUser', id: 'testuser',
    images: [{ url: 'https://example.com/avatar.png' }],
    followers: { total: 100 }, product: 'premium',
    external_urls: { spotify: 'https://open.spotify.com/user/testuser' },
  });

  const mockTrack = id => ({
    id, name: `Track ${id}`,
    artists: [{ name: 'Test Artist', external_urls: { spotify: 'https://open.spotify.com/artist/a1' } }],
    album: { images: [{ url: 'https://example.com/album.png' }], name: 'Test Album', external_urls: { spotify: 'https://open.spotify.com/album/al1' } },
    duration_ms: 200000, popularity: 80,
    external_urls: { spotify: `https://open.spotify.com/track/${id}` },
  });

  await page.route('**/api/refresh_token**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'mock_valid_token' }) }));
  await page.route('**/api/subscription-status**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ active: false }) }));
  await page.route('**/api/products', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ products: [] }) }));

  await page.route('https://api.spotify.com/v1/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser()) }));
  await page.route('https://api.spotify.com/v1/me/following*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ artists: { items: [] } }) }));
  await page.route('https://api.spotify.com/v1/me/playlists', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ id: 'p1', name: 'Test Playlist', tracks: { total: 10 }, images: [{ url: 'https://example.com/playlist.png' }], owner: { display_name: 'TestUser' }, external_urls: { spotify: 'https://open.spotify.com/playlist/p1' } }], total: 1 }) }));
  await page.route('https://api.spotify.com/v1/me/top/artists*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ id: 'a1', name: 'Test Artist', images: [{ url: 'https://example.com/artist.png' }], genres: ['pop'], popularity: 80, followers: { total: 5000 }, external_urls: { spotify: 'https://open.spotify.com/artist/a1' } }], total: 1 }) }));
  await page.route('https://api.spotify.com/v1/artists/*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'a1', name: 'Test Artist', genres: ['pop'], popularity: 80, images: [{ url: 'https://example.com/artist.png' }], followers: { total: 5000 }, external_urls: { spotify: 'https://open.spotify.com/artist/a1' } }) }));
  await page.route('https://api.spotify.com/v1/me/top/tracks*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: Array.from({ length: 10 }, (_, i) => mockTrack(`t${i}`)), total: 10 }) }));
  await page.route('https://api.spotify.com/v1/me/player/recently-played', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ track: mockTrack('tr1'), played_at: '2024-01-01T00:00:00Z' }] }) }));
  await page.route('https://api.spotify.com/v1/audio-features*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ audio_features: Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, danceability: 0.3 + (i * 0.07), energy: 0.4 + (i * 0.05), valence: 0.2 + (i * 0.08), acousticness: 0.1 + (i * 0.09), instrumentalness: 0.05, speechiness: 0.05, liveness: 0.2, tempo: 120 })) }) }));
  await page.route('https://api.spotify.com/v1/recommendations*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tracks: Array.from({ length: 5 }, (_, i) => mockTrack(`r${i}`)) }) }));
  await page.route('https://api.spotify.com/v1/tracks/*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockTrack('dt1')) }));
  await page.route('https://api.spotify.com/v1/audio-analysis/*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ track: { tempo: 120, key: 4, mode: 1, time_signature: 4, duration: 200 } }) }));
  await page.route('https://api.spotify.com/v1/users/*/playlists', r => r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'new_playlist', external_urls: { spotify: 'https://open.spotify.com/playlist/new' } }) }));
  await page.route('https://api.spotify.com/v1/playlists/*/tracks*', r => r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ snapshot_id: 'snap1' }) }));

  // ------------- SETUP -------------
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('spotify_access_token', 'mock_valid_token');
    localStorage.setItem('spotify_refresh_token', 'mock_valid_refresh');
    localStorage.setItem('spotify_token_timestamp', Date.now().toString());
  });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const body = await page.evaluate(() => document.body.innerText || '');
  console.log('Page loaded, body length:', body.length);

  // ------------- TESTS -------------
  const tests = [
    { path: '/', label: 'Profile' },
    { path: '/artists', label: 'Top Artists' },
    { path: '/tracks', label: 'Top Tracks' },
    { path: '/recent', label: 'Recent' },
    { path: '/playlists', label: 'Playlists' },
    { path: '/taste', label: 'Taste Profile' },
    { path: '/mood', label: 'Mood Match' },
  ];

  for (const { path, label } of tests) {
    const beforeErrors = errors.length;
    const link = await page.$(`a[href="${path}"]`);
    if (!link) { failures.push(`[${path}] Link not found`); continue; }
    if (!(await link.isVisible())) { failures.push(`[${path}] Link not visible`); continue; }

    await link.click();
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    const expectedUrl = `${BASE}${path}`;
    const urlOk = currentUrl === expectedUrl || currentUrl.startsWith(expectedUrl);

    let currentBody = '';
    try {
      currentBody = await page.evaluate(() => document.body.innerText || '');
    } catch (e) { currentBody = `PAGE_ERROR: ${e.message}`; }

    const newErrors = errors.slice(beforeErrors);
    if (!urlOk) failures.push(`[${path}] URL mismatch: got ${currentUrl}, expected ${expectedUrl}`);
    if (newErrors.length > 0) failures.push(`[${path}] ${newErrors.length} error(s): ${newErrors[0].substring(0, 100)}`);

    console.log(`${urlOk ? '\u2713' : '\u2717'} ${label.padEnd(16)} ${path.padEnd(12)} ${currentUrl.substring(0, 55)}`);
  }

  // ------------- REPORT -------------
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${tests.length - failures.filter(f => f.includes('Link')).length}/${tests.length} navigated`);

  if (errors.length > 0) {
    console.log(`\nConsole/Network errors: ${errors.length}`);
    errors.slice(0, 5).forEach(e => console.log(`  - ${e.substring(0, 120)}`));
    if (errors.length > 5) console.log(`  ... and ${errors.length - 5} more`);
  }

  if (failures.length > 0) {
    console.log(`\nFAILURES (${failures.length}):`);
    failures.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('\nALL TESTS PASSED');
  }

  await browser.close();
};

run().catch(err => { console.error('FATAL:', err); process.exit(1); });
