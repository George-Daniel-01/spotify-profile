/* eslint-disable no-console */
// Realistic Spotify Web API fixtures + a request router for Playwright.
// Field shapes match the real API so tests surface real app bugs, not fixture gaps.

const ARTIST = (id, name, genres) => ({
  id, name, genres, popularity: 70,
  followers: { total: 1000000, href: 'x' },
  images: [{ url: 'https://i.scdn.co/image/abc', height: 320, width: 320 }],
  external_urls: { spotify: 'https://open.spotify.com/artist/' + id },
});

const ALBUM = name => ({
  name, album_type: 'album',
  release_date: '2021-06-11', release_date_precision: 'day', total_tracks: 12,
  images: [{ url: 'https://i.scdn.co/image/cover', height: 640, width: 640 }],
  external_urls: { spotify: 'https://open.spotify.com/album/x' },
});

const TRACK = (id, name, artistName, artistId) => ({
  id, name, type: 'track', uri: 'spotify:track:' + id,
  duration_ms: 210000, popularity: 70,
  artists: [{ id: artistId, name: artistName, uri: 'spotify:artist:' + artistId }],
  album: ALBUM('Album ' + name),
  external_urls: { spotify: 'https://open.spotify.com/track/' + id },
});

const FEATURE = i => ({
  danceability: 0.5 + (i % 5) * 0.05, energy: 0.4 + (i % 7) * 0.05,
  key: 4, loudness: -8.5, mode: 1, speechiness: 0.05, acousticness: 0.2,
  instrumentalness: 0.1, liveness: 0.15, valence: 0.5, tempo: 110 + i,
  time_signature: 4, uri: 'spotify:track:x', track_href: 'x', duration_ms: 210000,
});

const GENRE_SETS = [
  ['pop', 'electropop'], ['dance', 'house'], ['hip-hop', 'rap'],
  ['rock', 'alternative rock'], ['indie rock', 'shoegaze'], ['r&b', 'neo soul'],
  ['edm', 'future garage'], ['folk', 'singer-songwriter'],
];
const mkArtists = n =>
  Array.from({ length: n }, (_, i) => ARTIST('artist' + i, 'Artist ' + i, GENRE_SETS[i % GENRE_SETS.length]));
const mkTracks = n =>
  Array.from({ length: n }, (_, i) => TRACK('track' + i, 'Track ' + i, 'Artist ' + (i % 8), 'artist' + (i % 8)));

const PLAYLIST_ID = '37i9dQZF1DXcBWIGoYBM5M';

const playlistSummary = (id, name, url) => ({
  id, name,
  owner: { display_name: 'Test Listener' },
  images: [{ url, height: 300, width: 300 }],
  tracks: { total: 40 },
  external_urls: { spotify: 'https://open.spotify.com/playlist/' + id },
});

// pathname prefix -> builder. Order matters; first match wins.
const routes = [
  ['/v1/me/following/contains', u => (u.searchParams.get('ids') || '').split(',').filter(Boolean).map(() => false)],
  ['/v1/me/following', u => {
    if (u.searchParams.get('type') === 'artist' && (u.searchParams.get('ids') || '').includes(','))
      return { artists: { items: mkArtists(3), next: null, total: 3 } };
    return { artists: { items: mkArtists(20), next: null, total: 20 } };
  }],
  ['/v1/me/playlists', () => ({
    items: [
      playlistSummary(PLAYLIST_ID, 'Chill Mix', 'https://i.scdn.co/image/p1'),
      playlistSummary('37i9dQZF1DX4h5', 'Workout', 'https://i.scdn.co/image/p2'),
    ],
    total: 2, next: null,
  })],
  ['/v1/me/player/recently-played', () => ({
    items: mkTracks(20).map(t => ({ track: t, played_at: new Date().toISOString() })),
    next: null, cursors: null,
  })],
  ['/v1/me/top/artists', u => ({ items: mkArtists(50), next: null, total: 50, time_range: u.searchParams.get('time_range') })],
  ['/v1/me/top/tracks', u => ({ items: mkTracks(50), next: null, total: 50, time_range: u.searchParams.get('time_range') })],
  ['/v1/audio-features/', () => FEATURE(1)],
  ['/v1/audio-features', u => ({ audio_features: (u.searchParams.get('ids') || '').split(',').filter(Boolean).map((_, i) => FEATURE(i)) })],
  ['/v1/audio-analysis/', () => ({
    bars: [{ start: 0, duration: 210, confidence: 1 }],
    beats: Array.from({ length: 420 }, (_, i) => ({ start: i * 0.5, duration: 0.5, confidence: 1 })),
    tat: Array.from({ length: 420 }, (_, i) => ({ start: i * 0.5, duration: 0.5, confidence: 1 })),
    sections: [{ start: 0, duration: 210, confidence: 1, loudness: -8, tempo: 110, key: 4, mode: 1, time_signature: 4 }],
    segments: Array.from({ length: 840 }, (_, i) => ({
      start: i * 0.25, duration: 0.25, confidence: 1,
      loudness_start: -20, loudness_max: -8, loudness_max_time: 0.1, loudness_end: -22,
      pitches: Array.from({ length: 12 }, () => 0.5),
      timbre: Array.from({ length: 12 }, () => 0.5),
    })),
    meta: { analyzed_time: { duration: 210, samples: 1000 } },
    track: { tempo: 110, key: 4, mode: 1, time_signature: 4 },
  })],
  ['/v1/tracks/', u => { const id = u.pathname.split('/').pop(); return TRACK(id, 'Track ' + id, 'Artist 1', 'artist1'); }],
  ['/v1/artists', u => {
    // batch form: /v1/artists?ids=a,b,c
    const ids = u.searchParams.get('ids');
    if (ids) return { artists: ids.split(',').filter(Boolean).map(id => ARTIST(id, 'Artist ' + id.replace(/\D/g, ''), ['pop', 'rock'])) };
    const id = u.pathname.split('/').pop();
    return ARTIST(id, 'Artist 1', ['pop', 'rock']);
  }],
  ['/v1/playlists/', u => {
    const rest = u.pathname.replace('/v1/playlists/', '');
    if (/\/followers\/contains$/.test(rest)) return (u.searchParams.get('ids') || '').split(',').filter(Boolean).map(() => false);
    if (/\/tracks$/.test(rest)) return { items: mkTracks(30).map(t => ({ track: t })), next: null, total: 30 };
    if (/\/followers$/.test(rest)) return null;
    return {
      ...playlistSummary(PLAYLIST_ID, 'Chill Mix', 'https://i.scdn.co/image/p1'),
      images: [{ url: 'https://i.scdn.co/image/p1', height: 640, width: 640 }],
      tracks: {
        href: 'x', total: 30,
        items: mkTracks(30).map(t => ({ added_at: null, added_by: null, track: t })),
      },
      description: 'A chill mix for working.',
    };
  }],
  ['/v1/recommendations', () => ({ seeds: [], tracks: mkTracks(30) })],
  ['/v1/me', () => ({
    display_name: 'Test Listener', id: 'me123', email: 'listener@example.com',
    images: [{ url: 'https://i.scdn.co/image/me', height: 300, width: 300 }],
    followers: { total: 42, href: 'x' }, product: 'premium', country: 'SE',
    external_urls: { spotify: 'https://open.spotify.com/user/me123' },
  })],
];

// returns { body } or { status:404 }
function resolve(urlString) {
  const u = new URL(urlString);
  for (const [prefix, build] of routes) {
    if (u.pathname === prefix || u.pathname.startsWith(prefix)) {
      return { body: build(u) };
    }
  }
  return { status: 404, body: { error: { status: 404, message: 'UNMOCKED ' + u.pathname } } };
}

async function attachSpotifyRoutes(context, log) {
  await context.route('**/api.spotify.com/**', async route => {
    const u = new URL(route.request().url());
    if (log) log.push(`${route.request().method()} ${u.pathname}${u.search}`);
    const r = resolve(route.request().url());
    return route.fulfill({
      status: r.status || 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(r.body),
    });
  });
}

module.exports = { attachSpotifyRoutes, resolve, ARTIST, ALBUM, TRACK, mkArtists, mkTracks, PLAYLIST_ID };