import React, { useState, useEffect, useRef } from 'react';
import {
  getTopArtistsLong,
  getTopArtistsMedium,
  getTopArtistsShort,
  getTopTracksLong,
  getTopTracksMedium,
  getTopTracksShort,
} from '../spotify';

import { featuresFromArtists } from '../utils/genreFeatures';
import Chart from 'chart.js';

import styled, { keyframes } from 'styled-components';
import { theme, mixins, media, Main } from '../styles';
const { colors, fontSizes, spacing, fonts } = theme;

import Loader from './Loader';
import WrappedStats from './WrappedStats';
import ListeningHabits from './ListeningHabits';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Header = styled.header`
  ${mixins.flexBetween};
  margin-bottom: ${spacing.lg};
  ${media.tablet`
    display: block;
  `};
  h2 {
    margin: 0;
  }
`;
const Ranges = styled.div`
  display: flex;
  margin-right: -11px;
  ${media.tablet`
    justify-content: space-around;
    margin: 30px 0 0;
  `};
`;
const RangeButton = styled.button`
  background-color: transparent;
  color: ${props => (props.isActive ? colors.white : colors.lightGrey)};
  font-size: ${fontSizes.base};
  font-weight: 500;
  padding: 10px;
  ${media.phablet`
    font-size: ${fontSizes.sm};
  `};
  span {
    padding-bottom: 2px;
    border-bottom: 1px solid ${props => (props.isActive ? colors.white : `transparent`)};
    line-height: 1.5;
    white-space: nowrap;
  }
`;
const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: ${spacing.md};
  margin-bottom: ${spacing.lg};
  ${media.tablet`
    grid-template-columns: 1fr;
  `};
`;
const ChartCard = styled.div`
  background-color: ${colors.darkGrey};
  border-radius: 8px;
  padding: ${spacing.base};
  animation: ${fadeIn} 0.6s ease forwards;
  opacity: 0;
  &:nth-child(1) {
    animation-delay: 0.1s;
  }
  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    animation-delay: 0.3s;
  }
  &:nth-child(4) {
    animation-delay: 0.4s;
  }
`;
const ChartTitle = styled.h3`
  font-size: ${fontSizes.lg};
  margin: 0 0 ${spacing.sm};
  color: ${colors.white};
`;
const ChartSubtitle = styled.p`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.sm};
  margin: 0 0 ${spacing.base};
`;
const PersonalityCard = styled.div`
  background: linear-gradient(135deg, ${colors.darkGrey} 0%, ${colors.grey} 100%);
  border-radius: 8px;
  padding: ${spacing.md};
  text-align: center;
  margin-bottom: ${spacing.lg};
  animation: ${fadeIn} 0.5s ease forwards;
  opacity: 0;
  animation-delay: 0.5s;
`;
const PersonalityType = styled.h2`
  font-size: 48px;
  color: ${colors.green};
  margin: ${spacing.sm} 0;
  ${media.tablet`
    font-size: 36px;
  `};
`;
const PersonalityDesc = styled.p`
  color: ${colors.lightestGrey};
  font-size: ${fontSizes.md};
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
`;
const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-gap: ${spacing.base};
  margin-bottom: ${spacing.lg};
  ${media.tablet`
    grid-template-columns: repeat(2, 1fr);
  `};
  ${media.phablet`
    grid-template-columns: 1fr;
  `};
`;
const StatCard = styled.div`
  background-color: ${colors.darkGrey};
  border-radius: 8px;
  padding: ${spacing.base};
  text-align: center;
  animation: ${fadeIn} 0.5s ease forwards;
  opacity: 0;
  &:nth-child(1) {
    animation-delay: 0.1s;
  }
  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    animation-delay: 0.3s;
  }
  &:nth-child(4) {
    animation-delay: 0.4s;
  }
`;
const StatNumber = styled.div`
  color: ${colors.green};
  font-weight: 700;
  font-size: 36px;
  ${media.tablet`
    font-size: 28px;
  `};
`;
const StatLabel = styled.p`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: ${spacing.xs};
`;
const GenreList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;
const GenreItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacing.sm} 0;
  border-bottom: 1px solid ${colors.grey};
  &:last-child {
    border-bottom: none;
  }
`;
const GenreName = styled.span`
  color: ${colors.white};
  font-size: ${fontSizes.base};
  text-transform: capitalize;
`;
const GenreBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
`;
const BarTrack = styled.div`
  width: 120px;
  height: 6px;
  background-color: ${colors.grey};
  border-radius: 3px;
  overflow: hidden;
`;
const BarFill = styled.div`
  width: ${props => props.width}%;
  height: 100%;
  background: linear-gradient(90deg, ${colors.green}, ${colors.blue});
  border-radius: 3px;
  transition: width 1s ease;
`;
const GenreCount = styled.span`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.xs};
  min-width: 20px;
  text-align: right;
`;

const getPersonality = features => {
  const { energy, danceability, valence, acousticness, instrumentalness } = features;
  if (energy > 0.7 && danceability > 0.7)
    return {
      type: 'The Life of the Party',
      desc:
        'You live for high-energy, danceable tracks. Your playlists are guaranteed to get people moving.',
    };
  if (energy > 0.7 && valence > 0.6)
    return {
      type: 'The Optimist',
      desc:
        'Your music radiates positive energy. You gravitate toward upbeat, feel-good tracks that brighten any mood.',
    };
  if (acousticness > 0.6 && energy < 0.4)
    return {
      type: 'The Soul Searcher',
      desc:
        'You prefer intimate, acoustic sounds. Your music taste reflects a deep appreciation for raw, organic artistry.',
    };
  if (instrumentalness > 0.5)
    return {
      type: 'The Deep Listener',
      desc:
        'You appreciate music beyond lyrics — complex instrumentals and soundscapes are your thing.',
    };
  if (energy < 0.4 && valence < 0.4)
    return {
      type: 'The Melancholic',
      desc:
        'You connect with emotionally deep, often darker music. Your taste runs to moody, atmospheric tracks.',
    };
  if (danceability > 0.7 && valence > 0.5)
    return {
      type: 'The Vibe Curator',
      desc:
        'You have an incredible sense of rhythm and mood. Your playlists perfectly match any occasion.',
    };
  if (energy > 0.5 && instrumentalness < 0.3)
    return {
      type: 'The Lyric Lover',
      desc: 'You connect with music through words and vocals. Great songwriting is what hooks you.',
    };
  return {
    type: 'The Eclectic',
    desc:
      'Your taste defies categories. You appreciate all forms of music and your library reflects true diversity.',
  };
};

const TasteProfile = () => {
  const [activeRange, setActiveRange] = useState('long');
  const [topArtists, setTopArtists] = useState(null);
  const [topTracks, setTopTracks] = useState(null);
  const [audioFeatures, setAudioFeatures] = useState(null);
  const [personality, setPersonality] = useState(null);
  const [genres, setGenres] = useState([]);
  const [uniqueGenres, setUniqueGenres] = useState(0);
  const [loading, setLoading] = useState(true);

  const radarRef = useRef(null);
  const genreChartRef = useRef(null);
  const radarChartRef = useRef(null);
  const genreChartInstRef = useRef(null);

  const apiCalls = {
    artists: {
      long: () => getTopArtistsLong(),
      medium: () => getTopArtistsMedium(),
      short: () => getTopArtistsShort(),
    },
    tracks: {
      long: () => getTopTracksLong(),
      medium: () => getTopTracksMedium(),
      short: () => getTopTracksShort(),
    },
  };

  const extractGenres = artists => {
    const genreCount = {};
    artists.items.forEach(artist => {
      (artist.genres || []).forEach(genre => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    });
    const sorted = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    setGenres(sorted);
    setUniqueGenres(Object.keys(genreCount).length);
    return sorted;
  };

  const createRadarChart = features => {
    if (radarChartRef.current) radarChartRef.current.destroy();
    const ctx = radarRef.current;
    if (!ctx) return;

    const labels = [
      'Energy',
      'Danceability',
      'Valence',
      'Acousticness',
      'Instrumentalness',
      'Liveness',
      'Speechiness',
    ];
    const data = [
      features.energy || 0,
      features.danceability || 0,
      features.valence || 0,
      features.acousticness || 0,
      features.instrumentalness || 0,
      features.liveness || 0,
      features.speechiness || 0,
    ];

    radarChartRef.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: 'Your Taste',
            data,
            backgroundColor: 'rgba(29, 185, 84, 0.2)',
            borderColor: 'rgba(29, 185, 84, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(29, 185, 84, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(29, 185, 84, 1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        title: { display: false },
        legend: { display: false },
        scales: {
          r: {
            angleLines: { color: 'rgba(255,255,255,0.1)' },
            gridLines: { color: 'rgba(255,255,255,0.1)' },
            pointLabels: {
              font: { family: fonts.primary, size: 12 },
              fontColor: '#b3b3b3',
            },
            ticks: {
              display: false,
              beginAtZero: true,
              max: 1,
            },
          },
        },
      },
    });
  };

  const createGenreChart = genreData => {
    if (genreChartInstRef.current) genreChartInstRef.current.destroy();
    const ctx = genreChartRef.current;
    if (!ctx) return;

    const labels = genreData.map(g =>
      g[0]
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
    );
    const data = genreData.map(g => g[1]);

    genreChartInstRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Artists',
            data,
            backgroundColor: [
              'rgba(29, 185, 84, 0.7)',
              'rgba(80, 155, 245, 0.7)',
              'rgba(255, 99, 132, 0.7)',
              'rgba(255, 206, 86, 0.7)',
              'rgba(75, 192, 192, 0.7)',
              'rgba(153, 102, 255, 0.7)',
              'rgba(255, 159, 64, 0.7)',
              'rgba(54, 162, 235, 0.7)',
              'rgba(255, 99, 255, 0.7)',
              'rgba(99, 255, 132, 0.7)',
            ],
            borderColor: [
              'rgba(29, 185, 84, 1)',
              'rgba(80, 155, 245, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 255, 1)',
              'rgba(99, 255, 132, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        title: { display: false },
        legend: { display: false },
        scales: {
          xAxes: [
            {
              gridLines: { color: 'rgba(255,255,255,0.05)' },
              ticks: {
                font: { family: fonts.primary, size: 10 },
                fontColor: '#b3b3b3',
                maxRotation: 45,
                minRotation: 45,
              },
            },
          ],
          yAxes: [
            {
              gridLines: { color: 'rgba(255,255,255,0.05)' },
              ticks: {
                beginAtZero: true,
                font: { family: fonts.primary, size: 12 },
                fontColor: '#b3b3b3',
                stepSize: 1,
              },
            },
          ],
        },
      },
    });
  };

  const fetchData = async range => {
    setLoading(true);
    try {
      const [artistsData, tracksData] = await Promise.all([
        apiCalls.artists[range](),
        apiCalls.tracks[range](),
      ]);

      const artists = artistsData.data;
      const tracks = tracksData.data;
      setTopArtists(artists);
      setTopTracks(tracks);
      const topGenres = extractGenres(artists);
      const features = featuresFromArtists(artists);

      setAudioFeatures(features);
      setPersonality(getPersonality(features));
    } catch (error) {
      console.error('Error fetching taste profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData('long');
    return () => {
      if (radarChartRef.current) radarChartRef.current.destroy();
      if (genreChartInstRef.current) genreChartInstRef.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (loading || !audioFeatures) return;
    createRadarChart(audioFeatures);
  }, [audioFeatures, loading]);

  useEffect(() => {
    if (loading || genres.length === 0) return;
    createGenreChart(genres);
  }, [genres, loading]);

  const changeRange = range => {
    setActiveRange(range);
    fetchData(range);
  };

  return (
    <Main>
      <Header>
        <h2>Taste Profile</h2>
        <Ranges>
          <RangeButton isActive={activeRange === 'long'} onClick={() => changeRange('long')}>
            <span>All Time</span>
          </RangeButton>
          <RangeButton isActive={activeRange === 'medium'} onClick={() => changeRange('medium')}>
            <span>Last 6 Months</span>
          </RangeButton>
          <RangeButton isActive={activeRange === 'short'} onClick={() => changeRange('short')}>
            <span>Last 4 Weeks</span>
          </RangeButton>
        </Ranges>
      </Header>

      {loading ? (
        <Loader />
      ) : (
        <>
          {personality && (
            <PersonalityCard>
              <StatLabel>Your Listening Personality</StatLabel>
              <PersonalityType>{personality.type}</PersonalityType>
              <PersonalityDesc>{personality.desc}</PersonalityDesc>
            </PersonalityCard>
          )}

          {topArtists && topTracks && audioFeatures && (
            <WrappedStats
              topArtists={topArtists}
              topTracks={topTracks}
              audioFeatures={audioFeatures}
              uniqueGenres={uniqueGenres}
            />
          )}

          {audioFeatures && (
            <StatGrid>
              <StatCard>
                <StatNumber>{Math.round(audioFeatures.tempo)}</StatNumber>
                <StatLabel>Avg Tempo (BPM)</StatLabel>
              </StatCard>
              <StatCard>
                <StatNumber>{Math.round(audioFeatures.energy * 100)}%</StatNumber>
                <StatLabel>Avg Energy</StatLabel>
              </StatCard>
              <StatCard>
                <StatNumber>{Math.round(audioFeatures.danceability * 100)}%</StatNumber>
                <StatLabel>Avg Danceability</StatLabel>
              </StatCard>
              <StatCard>
                <StatNumber>{uniqueGenres}</StatNumber>
                <StatLabel>Unique Genres</StatLabel>
              </StatCard>
            </StatGrid>
          )}

          <ChartsGrid>
            <ChartCard>
              <ChartTitle>Audio DNA</ChartTitle>
              <ChartSubtitle>The shape of your music taste</ChartSubtitle>
              <canvas ref={radarRef} id="radarChart" />
            </ChartCard>

            <ChartCard>
              <ChartTitle>Top Genres</ChartTitle>
              <ChartSubtitle>Based on your top artists</ChartSubtitle>
              <canvas ref={genreChartRef} id="genreChart" />
            </ChartCard>
          </ChartsGrid>

          {genres.length > 0 && (
            <ChartCard style={{ marginBottom: spacing.lg }}>
              <ChartTitle>Genre Breakdown</ChartTitle>
              <ChartSubtitle>Your most-listened genres ranked</ChartSubtitle>
              <GenreList>
                {genres.map(([genre, count], i) => (
                  <GenreItem key={genre}>
                    <span
                      style={{ color: colors.lightestGrey, fontSize: '14px', minWidth: '24px' }}>
                      {i + 1}
                    </span>
                    <GenreName>{genre}</GenreName>
                    <GenreBar>
                      <BarTrack>
                        <BarFill width={(count / genres[0][1]) * 100} />
                      </BarTrack>
                      <GenreCount>{count}</GenreCount>
                    </GenreBar>
                  </GenreItem>
                ))}
              </GenreList>
            </ChartCard>
          )}

          <ListeningHabits />
        </>
      )}
    </Main>
  );
};

export default TasteProfile;
