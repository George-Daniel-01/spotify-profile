import axios from 'axios';
import { getHashParams } from '../utils';

// TOKENS ******************************************************************************************
const EXPIRATION_TIME = 3600 * 1000;

const setTokenTimestamp = () => window.localStorage.setItem('spotify_token_timestamp', Date.now());
const setLocalAccessToken = token => {
  setTokenTimestamp();
  window.localStorage.setItem('spotify_access_token', token);
};
const setLocalRefreshToken = token => window.localStorage.setItem('spotify_refresh_token', token);
const getTokenTimestamp = () => window.localStorage.getItem('spotify_token_timestamp');
const getLocalAccessToken = () => window.localStorage.getItem('spotify_access_token');
const getLocalRefreshToken = () => window.localStorage.getItem('spotify_refresh_token');

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axios(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = getLocalRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }
      try {
const { data } = await axios.post('/api/refresh_token', {
          refresh_token: refreshToken,
        });
        const newToken = data.access_token;
        setLocalAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        window.localStorage.removeItem('spotify_access_token');
        window.localStorage.removeItem('spotify_refresh_token');
        window.localStorage.removeItem('spotify_token_timestamp');
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

// Token refresh function
const refreshAccessToken = async () => {
  const refreshToken = getLocalRefreshToken();
  if (!refreshToken) return;
  try {
    const { data } = await axios.post('/api/refresh_token', {
      refresh_token: refreshToken,
    });
    setLocalAccessToken(data.access_token);
  } catch (e) {
    console.error('Token refresh failed:', e);
  }
};

// Get access token off of query params (called on application init)
export const getAccessToken = () => {
  const hashParams = getHashParams();
  const { error } = hashParams;

  let access_token = hashParams.access_token;
  let refresh_token = hashParams.refresh_token;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('access_token')) {
    access_token = urlParams.get('access_token');
    refresh_token = urlParams.get('refresh_token');
  }

  if (error) {
    console.error(error);
  }

  if (access_token) {
    setLocalAccessToken(access_token);
    if (refresh_token) {
      setLocalRefreshToken(refresh_token);
    }
    setTokenTimestamp();

    // Strip only the auth params. Replacing the whole URL would also discard
    // unrelated state the app still needs (e.g. ?checkout=success).
    const cleaned = new URL(window.location.href);
    cleaned.hash = '';
    cleaned.searchParams.delete('access_token');
    cleaned.searchParams.delete('refresh_token');
    const query = cleaned.searchParams.toString();
    window.history.replaceState(
      {},
      document.title,
      cleaned.pathname + (query ? `?${query}` : ''),
    );
  }

  if (Date.now() - getTokenTimestamp() > EXPIRATION_TIME) {
    refreshAccessToken();
  }

  return getLocalAccessToken();
};

export const logout = () => {
  window.localStorage.removeItem('spotify_token_timestamp');
  window.localStorage.removeItem('spotify_access_token');
  window.localStorage.removeItem('spotify_refresh_token');
  window.location.reload();
};

// API CALLS ***************************************************************************************

const getHeaders = () => {
  const currentToken = getLocalAccessToken();
  return {
    Authorization: `Bearer ${currentToken}`,
    'Content-Type': 'application/json',
  };
};

export const getUser = () => axios.get('https://api.spotify.com/v1/me', { headers: getHeaders() });

export const getFollowing = () =>
  axios.get('https://api.spotify.com/v1/me/following?type=artist', { headers: getHeaders() });

export const getRecentlyPlayed = () =>
  axios.get('https://api.spotify.com/v1/me/player/recently-played', { headers: getHeaders() });

export const getPlaylists = () =>
  axios.get('https://api.spotify.com/v1/me/playlists', { headers: getHeaders() });

export const getTopArtistsShort = () =>
  axios.get('https://api.spotify.com/v1/me/top/artists?limit=50&time_range=short_term', {
    headers: getHeaders(),
  });
export const getTopArtistsMedium = () =>
  axios.get('https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term', {
    headers: getHeaders(),
  });
export const getTopArtistsLong = () =>
  axios.get('https://api.spotify.com/v1/me/top/artists?limit=50&time_range=long_term', {
    headers: getHeaders(),
  });

export const getTopTracksShort = () =>
  axios.get('https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term', {
    headers: getHeaders(),
  });
export const getTopTracksMedium = () =>
  axios.get('https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term', {
    headers: getHeaders(),
  });
export const getTopTracksLong = () =>
  axios.get('https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=long_term', {
    headers: getHeaders(),
  });

export const getArtist = artistId =>
  axios.get(`https://api.spotify.com/v1/artists/${artistId}`, { headers: getHeaders() });

// Spotify accepts up to 50 ids per call, so fetch genres in batches instead of
// one request per artist (which easily blew past rate limits on large accounts).
export const getArtists = artistIds => {
  const ids = artistIds.filter(Boolean);
  if (!ids.length) return Promise.resolve({ data: { artists: [] } });
  const chunks = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
  return Promise.all(
    chunks.map(chunk =>
      axios
        .get(`https://api.spotify.com/v1/artists?ids=${chunk.join(',')}`, { headers: getHeaders() })
        .then(({ data }) => data.artists || [])
    )
  ).then(arrays => ({ data: { artists: arrays.flat().filter(Boolean) } }));
};

export const followArtist = artistId => {
  const url = `https://api.spotify.com/v1/me/following?type=artist&ids=${artistId}`;
  return axios({ method: 'put', url, headers: getHeaders() });
};

export const doesUserFollowArtist = artistId =>
  axios.get(`https://api.spotify.com/v1/me/following/contains?type=artist&ids=${artistId}`, {
    headers: getHeaders(),
  });

export const doesUserFollowPlaylist = (playlistId, userId) =>
  axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/followers/contains?ids=${userId}`, {
    headers: getHeaders(),
  });

export const createPlaylist = (userId, name) => {
  const url = `https://api.spotify.com/v1/users/${userId}/playlists`;
  const data = JSON.stringify({ name });
  return axios({ method: 'post', url, headers: getHeaders(), data });
};

export const addTracksToPlaylist = (playlistId, uris) => {
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?uris=${uris}`;
  return axios({ method: 'post', url, headers: getHeaders() });
};

export const followPlaylist = playlistId => {
  const url = `https://api.spotify.com/v1/playlists/${playlistId}/followers`;
  return axios({ method: 'put', url, headers: getHeaders() });
};

export const getPlaylist = playlistId =>
  axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, { headers: getHeaders() });

export const getPlaylistTracks = playlistId =>
  axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, { headers: getHeaders() });

const getTrackIds = tracks => tracks.map(({ track }) => track.id).join(',');

export const getAudioFeaturesForTracks = tracks => {
  const ids = getTrackIds(tracks);
  return axios.get(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {
    headers: getHeaders(),
  });
};

export const getAudioFeaturesForIds = async ids => {
  const allIds = Array.isArray(ids) ? ids : [ids];
  const results = [];
  for (let i = 0; i < allIds.length; i += 100) {
    const batch = allIds.slice(i, i + 100);
    const joined = batch.join(',');
    const res = await axios.get(`https://api.spotify.com/v1/audio-features?ids=${joined}`, {
      headers: getHeaders(),
    });
    if (res.data && res.data.audio_features) {
      results.push(...res.data.audio_features);
    }
  }
  return { data: { audio_features: results } };
};

export const getRecommendationsForTracks = tracks => {
  const shuffledTracks = [...tracks].sort(() => 0.5 - Math.random());
  const seed_tracks = getTrackIds(shuffledTracks.slice(0, 5));

  return axios.get(
    `https://api.spotify.com/v1/recommendations?seed_tracks=${seed_tracks}&seed_artists=&seed_genres=`,
    { headers: getHeaders() },
  );
};

export const getTrack = trackId =>
  axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, { headers: getHeaders() });

export const getTrackAudioAnalysis = trackId =>
  axios.get(`https://api.spotify.com/v1/audio-analysis/${trackId}`, { headers: getHeaders() });

export const getTrackAudioFeatures = trackId =>
  axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, { headers: getHeaders() });

export const getUserInfo = async () => {
  const [user, followedArtists, playlists, topArtists, topTracks] = await Promise.all([
    getUser(),
    getFollowing(),
    getPlaylists(),
    getTopArtistsLong(),
    getTopTracksLong(),
  ]);
  return {
    user: user.data,
    followedArtists: followedArtists.data,
    playlists: playlists.data,
    topArtists: topArtists.data,
    topTracks: topTracks.data,
  };
};

export const getTrackInfo = async trackId => {
  const [track, audioAnalysis, audioFeatures] = await Promise.all([
    getTrack(trackId),
    getTrackAudioAnalysis(trackId),
    getTrackAudioFeatures(trackId),
  ]);
  return {
    track: track.data,
    audioAnalysis: audioAnalysis.data,
    audioFeatures: audioFeatures.data,
  };
};
