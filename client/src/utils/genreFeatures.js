export const GENRE_MAP = {
  pop: { energy: 0.7, danceability: 0.7, valence: 0.65, acousticness: 0.2, instrumentalness: 0.01, liveness: 0.15, speechiness: 0.05, tempo: 118 },
  dance: { energy: 0.8, danceability: 0.9, valence: 0.6, acousticness: 0.05, instrumentalness: 0.05, liveness: 0.1, speechiness: 0.05, tempo: 124 },
  electronic: { energy: 0.75, danceability: 0.7, valence: 0.4, acousticness: 0.1, instrumentalness: 0.5, liveness: 0.08, speechiness: 0.03, tempo: 128 },
  'hip-hop': { energy: 0.7, danceability: 0.85, valence: 0.5, acousticness: 0.1, instrumentalness: 0.02, liveness: 0.15, speechiness: 0.35, tempo: 95 },
  rap: { energy: 0.7, danceability: 0.8, valence: 0.45, acousticness: 0.1, instrumentalness: 0.02, liveness: 0.15, speechiness: 0.4, tempo: 90 },
  rnb: { energy: 0.6, danceability: 0.7, valence: 0.55, acousticness: 0.3, instrumentalness: 0.02, liveness: 0.2, speechiness: 0.08, tempo: 85 },
  rock: { energy: 0.8, danceability: 0.45, valence: 0.5, acousticness: 0.15, instrumentalness: 0.05, liveness: 0.3, speechiness: 0.04, tempo: 130 },
  metal: { energy: 0.9, danceability: 0.3, valence: 0.35, acousticness: 0.05, instrumentalness: 0.1, liveness: 0.35, speechiness: 0.04, tempo: 160 },
  indie: { energy: 0.55, danceability: 0.5, valence: 0.5, acousticness: 0.5, instrumentalness: 0.1, liveness: 0.25, speechiness: 0.04, tempo: 115 },
  alternative: { energy: 0.6, danceability: 0.5, valence: 0.45, acousticness: 0.4, instrumentalness: 0.1, liveness: 0.25, speechiness: 0.04, tempo: 120 },
  folk: { energy: 0.35, danceability: 0.35, valence: 0.55, acousticness: 0.8, instrumentalness: 0.05, liveness: 0.35, speechiness: 0.03, tempo: 100 },
  acoustic: { energy: 0.25, danceability: 0.3, valence: 0.5, acousticness: 0.9, instrumentalness: 0.15, liveness: 0.3, speechiness: 0.03, tempo: 95 },
  country: { energy: 0.5, danceability: 0.5, valence: 0.6, acousticness: 0.6, instrumentalness: 0.01, liveness: 0.3, speechiness: 0.03, tempo: 105 },
  jazz: { energy: 0.3, danceability: 0.4, valence: 0.5, acousticness: 0.6, instrumentalness: 0.6, liveness: 0.6, speechiness: 0.04, tempo: 90 },
  blues: { energy: 0.4, danceability: 0.4, valence: 0.4, acousticness: 0.5, instrumentalness: 0.2, liveness: 0.5, speechiness: 0.03, tempo: 80 },
  classical: { energy: 0.15, danceability: 0.1, valence: 0.4, acousticness: 0.9, instrumentalness: 0.85, liveness: 0.6, speechiness: 0.02, tempo: 75 },
  ambient: { energy: 0.2, danceability: 0.15, valence: 0.3, acousticness: 0.7, instrumentalness: 0.7, liveness: 0.1, speechiness: 0.02, tempo: 70 },
  soul: { energy: 0.55, danceability: 0.6, valence: 0.6, acousticness: 0.4, instrumentalness: 0.02, liveness: 0.3, speechiness: 0.05, tempo: 90 },
  funk: { energy: 0.75, danceability: 0.85, valence: 0.7, acousticness: 0.15, instrumentalness: 0.05, liveness: 0.25, speechiness: 0.06, tempo: 105 },
  reggae: { energy: 0.5, danceability: 0.6, valence: 0.65, acousticness: 0.3, instrumentalness: 0.05, liveness: 0.35, speechiness: 0.05, tempo: 85 },
  latin: { energy: 0.7, danceability: 0.8, valence: 0.7, acousticness: 0.2, instrumentalness: 0.01, liveness: 0.2, speechiness: 0.08, tempo: 110 },
  edm: { energy: 0.85, danceability: 0.85, valence: 0.5, acousticness: 0.02, instrumentalness: 0.4, liveness: 0.05, speechiness: 0.03, tempo: 130 },
  house: { energy: 0.8, danceability: 0.85, valence: 0.6, acousticness: 0.05, instrumentalness: 0.5, liveness: 0.05, speechiness: 0.03, tempo: 126 },
  techno: { energy: 0.8, danceability: 0.8, valence: 0.35, acousticness: 0.05, instrumentalness: 0.6, liveness: 0.05, speechiness: 0.03, tempo: 135 },
  punk: { energy: 0.9, danceability: 0.4, valence: 0.4, acousticness: 0.05, instrumentalness: 0.02, liveness: 0.4, speechiness: 0.05, tempo: 150 },
  'singer-songwriter': { energy: 0.3, danceability: 0.35, valence: 0.45, acousticness: 0.75, instrumentalness: 0.1, liveness: 0.3, speechiness: 0.03, tempo: 85 },
};

export const DEFAULT_FEATURES = {
  energy: 0.5, danceability: 0.5, valence: 0.5, acousticness: 0.5,
  instrumentalness: 0.2, liveness: 0.2, speechiness: 0.1, tempo: 100,
};

export const matchGenre = genres => {
  if (!genres || genres.length === 0) return DEFAULT_FEATURES;
  for (const g of genres) {
    const gLower = g.toLowerCase();
    for (const [key, val] of Object.entries(GENRE_MAP)) {
      if (gLower.includes(key)) return val;
    }
  }
  return DEFAULT_FEATURES;
};

export const featuresFromArtists = artists => {
  if (!artists || !artists.items || artists.items.length === 0) return DEFAULT_FEATURES;
  const genreNames = Object.keys(
    artists.items.reduce((acc, a) => {
      (a.genres || []).forEach(g => { acc[g] = true; });
      return acc;
    }, {})
  );
  return matchGenre(genreNames);
};
