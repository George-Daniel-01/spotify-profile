import React, { useState, useEffect, useCallback } from 'react';
import {
  getTopTracksLong,
  getTopTracksMedium,
  getTopTracksShort,
  getArtists,
  getUser,
  createPlaylist,
  addTracksToPlaylist,
} from '../spotify';
import { matchGenre } from '../utils/genreFeatures';
import { catchErrors } from '../utils';

import Loader from './Loader';

import styled, { keyframes } from 'styled-components';
import { theme, mixins, media, Main } from '../styles';
const { colors, fontSizes, spacing } = theme;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Header = styled.header`
  ${mixins.flexBetween};
  margin-bottom: ${spacing.lg};
  ${media.tablet`display: block;`};
  h2 {
    margin: 0;
  }
`;

const MoodGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${spacing.md};
  animation: ${fadeIn} 0.5s ease;
`;

const MoodCard = styled.button`
  background: ${props => props.$bg || colors.darkGrey};
  border: 2px solid ${props => (props.$active ? colors.green : 'transparent')};
  border-radius: 12px;
  padding: ${spacing.md};
  cursor: pointer;
  transition: ${theme.transition};
  text-align: center;
  color: ${colors.white};
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  }
`;

const MoodEmoji = styled.div`
  font-size: 48px;
  margin-bottom: ${spacing.sm};
`;

const MoodLabel = styled.h3`
  margin: 0 0 ${spacing.xs};
  font-size: ${fontSizes.lg};
`;

const MoodCount = styled.p`
  margin: 0;
  font-size: ${fontSizes.sm};
  color: ${colors.lightestGrey};
`;

const MoodDescription = styled.p`
  margin: ${spacing.xs} 0 0;
  font-size: ${fontSizes.xs};
  color: ${colors.lightGrey};
`;

const ResultsSection = styled.section`
  margin-top: ${spacing.xl};
  animation: ${fadeIn} 0.5s ease;
`;

const TrackList = styled.div`
  display: grid;
  gap: ${spacing.sm};
`;

const TrackRow = styled.div`
  display: flex;
  align-items: center;
  padding: ${spacing.sm};
  background: ${colors.darkGrey};
  border-radius: 8px;
  transition: ${theme.transition};
  &:hover {
    background: ${colors.grey};
  }
`;

const TrackInfo = styled.div`
  flex: 1;
  margin-left: ${spacing.sm};
`;

const TrackName = styled.div`
  font-size: ${fontSizes.base};
  font-weight: 500;
`;

const TrackArtist = styled.div`
  font-size: ${fontSizes.sm};
  color: ${colors.lightGrey};
`;

const ScoreBadge = styled.div`
  background: ${colors.green};
  color: ${colors.white};
  border-radius: 20px;
  padding: 4px 12px;
  font-size: ${fontSizes.xs};
  font-weight: 700;
`;

const ActionBar = styled.div`
  ${mixins.flexBetween};
  margin-top: ${spacing.lg};
  padding: ${spacing.md};
  background: ${colors.darkGrey};
  border-radius: 12px;
`;

const CreatePlaylistButton = styled.button`
  background: ${colors.green};
  color: ${colors.white};
  border: none;
  border-radius: 30px;
  padding: 12px 32px;
  font-size: ${fontSizes.base};
  font-weight: 700;
  cursor: pointer;
  transition: ${theme.transition};
  &:hover {
    background: ${colors.offGreen};
    transform: scale(1.05);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const SuccessMessage = styled.div`
  background: rgba(29, 185, 84, 0.15);
  border: 1px solid ${colors.green};
  border-radius: 12px;
  padding: ${spacing.md};
  margin-top: ${spacing.md};
  text-align: center;
  a {
    color: ${colors.green};
    font-weight: 700;
  }
`;

const adjustByPopularity = (features, popularity) => {
  const p = popularity / 100;
  return {
    energy: features.energy * (0.5 + p * 0.5),
    danceability: features.danceability * (0.5 + p * 0.5),
    valence: features.valence * (0.5 + p * 0.5),
    acousticness: features.acousticness * (1 - p * 0.3),
  };
};

const MOODS = [
  {
    id: 'euphoric',
    label: 'Euphoric',
    emoji: '\uD83C\uDF89',
    description: 'High energy, positive vibes',
    bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    weights: { valence: 0.35, energy: 0.3, danceability: 0.25, acousticness: -0.1 },
  },
  {
    id: 'chill',
    label: 'Chill',
    emoji: '\uD83D\uDE0C',
    description: 'Laid back, acoustic, mellow',
    bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    color: '#333',
    weights: { energy: -0.35, acousticness: 0.3, danceability: -0.2, valence: 0.15 },
  },
  {
    id: 'melancholy',
    label: 'Melancholy',
    emoji: '\uD83C\uDF27\uFE0F',
    description: 'Deep, reflective, emotional',
    bg: 'linear-gradient(135deg, #3a1c71 0%, #d76d77 100%)',
    weights: { valence: -0.35, energy: -0.2, acousticness: 0.25, danceability: -0.1 },
  },
  {
    id: 'energetic',
    label: 'Energetic',
    emoji: '\u26A1',
    description: 'High octane, workout fuel',
    bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    weights: { energy: 0.4, danceability: 0.3, valence: 0.15, acousticness: -0.25 },
  },
  {
    id: 'groovy',
    label: 'Groovy',
    emoji: '\uD83D\uDD7A',
    description: 'Funky, danceable, rhythmic',
    bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: '#333',
    weights: { danceability: 0.4, energy: 0.2, valence: 0.2, acousticness: -0.15 },
  },
  {
    id: 'focused',
    label: 'Focused',
    emoji: '\uD83C\uDFAF',
    description: 'Concentration, flow state',
    bg: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)',
    weights: { acousticness: 0.25, energy: -0.25, danceability: -0.25, valence: -0.1 },
  },
];

const computeScore = (features, weights) => {
  let score = 0;
  for (const [key, w] of Object.entries(weights)) {
    const val = features[key];
    if (val !== undefined) {
      score += val * w;
    }
  }
  return Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
};

const MoodMatch = () => {
  const [tracks, setTracks] = useState([]);
  const [trackFeatures, setTrackFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeMood, setActiveMood] = useState(null);
  const [creating, setCreating] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');

  const moodScores = {};

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [long, medium, short] = await Promise.all([
          getTopTracksLong(),
          getTopTracksMedium(),
          getTopTracksShort(),
        ]);
        const allMap = new Map();
        [...long.data.items, ...medium.data.items, ...short.data.items].forEach(t => {
          if (!allMap.has(t.id)) allMap.set(t.id, t);
        });
        const unique = Array.from(allMap.values());
        setTracks(unique);

        const artistIds = [...new Set(unique.flatMap(t => (t.artists || []).map(a => a.id)))];
        const { data: artistBatch } = await getArtists(artistIds);
        const artistGenres = {};
        artistBatch.forEach(a => {
          if (a && a.id) artistGenres[a.id] = a.genres || [];
        });

        const fMap = {};
        unique.forEach(t => {
          const allGenres = (t.artists || []).flatMap(a => artistGenres[a.id] || []);
          const features = matchGenre(allGenres);
          fMap[t.id] = adjustByPopularity(features, t.popularity || 50);
        });
        setTrackFeatures(fMap);
      } catch (e) {
        console.error('MoodMatch: error:', e);
        catchErrors(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTopTracks = useCallback(() => {
    const scored = [];
    for (const track of tracks) {
      const features = trackFeatures[track.id];
      if (!features) continue;
      const score = computeScore(features, activeMood.weights);
      if (score > 10) {
        scored.push({ track, features, score: Math.round(score) });
      }
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 50);
  }, [tracks, trackFeatures, activeMood]);

  MOODS.forEach(mood => {
    const scored = [];
    for (const track of tracks) {
      const features = trackFeatures[track.id];
      if (!features) continue;
      const score = computeScore(features, mood.weights);
      if (score > 10) scored.push(score);
    }
    moodScores[mood.id] = scored.length;
  });

  const handleCreatePlaylist = async () => {
    setCreating(true);
    try {
      const user = await getUser();
      const userId = user.data.id;
      const scored = getTopTracks();
      const uris = scored.map(s => `spotify:track:${s.track.id}`);

      const playlist = await createPlaylist(userId, `Mood Match: ${activeMood.label}`);
      const playlistId = playlist.data.id;
      await addTracksToPlaylist(playlistId, uris.join(','));
      setPlaylistUrl(playlist.data.external_urls.spotify);
    } catch (e) {
      catchErrors(e);
    } finally {
      setCreating(false);
    }
  };

  const activeResults = activeMood ? getTopTracks() : [];

  const msToTime = ms => {
    const m = Math.floor(ms / 60000);
    const s = ((ms % 60000) / 1000).toFixed(0);
    return `${m}:${s.padStart(2, '0')}`;
  };

  return (
    <Main>
      <Header>
        <h2>Mood Match</h2>
      </Header>
      {loading ? (
        <Loader />
      ) : (
        <>
          <p style={{ color: colors.lightestGrey, marginBottom: spacing.md }}>
            Select a mood and we'll score your top tracks against their genre & popularity profile.
          </p>
          <MoodGrid>
            {MOODS.map(m => {
              const count = moodScores[m.id] || 0;
              return (
                <MoodCard
                  key={m.id}
                  $bg={m.bg}
                  $active={activeMood && activeMood.id === m.id}
                  onClick={() => setActiveMood(m)}
                  style={m.color ? { color: m.color } : {}}
                >
                  <MoodEmoji>{m.emoji}</MoodEmoji>
                  <MoodLabel>{m.label}</MoodLabel>
                  <MoodCount>{count} tracks match</MoodCount>
                  <MoodDescription>{m.description}</MoodDescription>
                </MoodCard>
              );
            })}
          </MoodGrid>

          {activeMood && activeResults.length > 0 && (
            <>
              <ResultsSection>
                <h3 style={{ marginBottom: spacing.md }}>
                  {activeMood.emoji} {activeMood.label} — {activeResults.length} tracks
                </h3>
                <TrackList>
                  {activeResults.map(({ track, score }) => (
                    <TrackRow key={track.id}>
                      <img
                        src={
                          track.album.images && track.album.images[2]
                            ? track.album.images[2].url
                            : 'https://via.placeholder.com/40'
                        }
                        alt=""
                        style={{ width: 40, height: 40, borderRadius: 4 }}
                      />
                      <TrackInfo>
                        <TrackName>{track.name}</TrackName>
                        <TrackArtist>
                          {track.artists.map(a => a.name).join(', ')} &middot; {track.album.name}{' '}
                          &middot; {msToTime(track.duration_ms)}
                        </TrackArtist>
                      </TrackInfo>
                      <ScoreBadge>{score}%</ScoreBadge>
                    </TrackRow>
                  ))}
                </TrackList>
              </ResultsSection>
              <ActionBar>
                <span style={{ color: colors.lightestGrey }}>
                  Create a Spotify playlist with these {activeResults.length} tracks
                </span>
                <CreatePlaylistButton onClick={handleCreatePlaylist} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Playlist'}
                </CreatePlaylistButton>
              </ActionBar>
              {playlistUrl && (
                <SuccessMessage>
                  {'\u2705'} Playlist created!{' '}
                  <a href={playlistUrl} target="_blank" rel="noopener noreferrer">
                    Open in Spotify
                  </a>
                </SuccessMessage>
              )}
            </>
          )}

          {activeMood && activeResults.length === 0 && (
            <p style={{ color: colors.lightGrey, textAlign: 'center', marginTop: spacing.xl }}>
              No tracks match this mood. Try a different one!
            </p>
          )}
        </>
      )}
    </Main>
  );
};

export default MoodMatch;
