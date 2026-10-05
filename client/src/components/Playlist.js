import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getPlaylist, getAudioFeaturesForTracks } from '../spotify';

import Loader from './Loader';
import TrackItem from './TrackItem';
import FeatureChart from './FeatureChart';

import styled from 'styled-components';
import { theme, mixins, media, Main } from '../styles';
const { colors, fontSizes, spacing } = theme;

const PlaylistContainer = styled.div`
  display: flex;
  ${media.tablet`
    display: block;
  `};
`;
const Left = styled.div`
  width: 30%;
  text-align: center;
  min-width: 200px;
  ${media.tablet`
    width: 100%;
    min-width: auto;
  `};
`;
const Right = styled.div`
  flex-grow: 1;
  margin-left: 50px;
  ${media.tablet`
    margin: 50px 0 0;
  `};
`;
const PlaylistCover = styled.div`
  ${mixins.coverShadow};
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  ${media.tablet`
    display: none;
  `};
`;
const Name = styled.h3`
  font-weight: 700;
  font-size: ${fontSizes.xl};
  margin-top: 20px;
`;
const Description = styled.p`
  font-size: ${fontSizes.sm};
  color: ${colors.lightGrey};
  a {
    color: ${colors.white};
    border-bottom: 1px solid transparent;
    &:hover,
    &:focus {
      border-bottom: 1px solid ${colors.white};
    }
  }
`;
const RecButton = styled(Link)`
  ${mixins.greenButton};
  margin-bottom: ${spacing.lg};
`;
const Owner = styled.p`
  font-size: ${fontSizes.sm};
  color: ${colors.lightGrey};
`;
const TotalTracks = styled.p`
  font-size: ${fontSizes.sm};
  color: ${colors.white};
  margin-top: 20px;
`;
const ErrorContainer = styled.div`
  ${mixins.flexCenter};
  flex-direction: column;
  text-align: center;
  padding: 80px 20px;
`;
const ErrorText = styled.p`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.md};
  margin-bottom: 20px;
`;
const RetryButton = styled.button`
  ${mixins.greenButton};
`;

const Playlist = props => {
  const { playlistId } = useParams();

  const [playlist, setPlaylist] = useState(null);
  const [audioFeatures, setAudioFeatures] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await getPlaylist(playlistId);
        setPlaylist(data);
      } catch (err) {
        console.error('Error fetching playlist:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [playlistId]);

  useEffect(() => {
    const fetchData = async () => {
      if (playlist && playlist.tracks && playlist.tracks.items) {
        try {
          const { data } = await getAudioFeaturesForTracks(playlist.tracks.items);
          setAudioFeatures(data);
        } catch (err) {
          console.error('Error fetching audio features:', err);
        }
      }
    };
    fetchData();
  }, [playlist]);

  if (error) {
    return (
      <Main>
        <ErrorContainer>
          <ErrorText>Could not load playlist.</ErrorText>
          <RetryButton onClick={() => window.location.reload()}>Refresh</RetryButton>
        </ErrorContainer>
      </Main>
    );
  }

  return (
    <React.Fragment>
      {playlist ? (
        <Main>
          <PlaylistContainer>
            <Left>
              {playlist.images && playlist.images.length > 0 && (
                <PlaylistCover>
                  <img
                    src={
                      playlist.images && playlist.images.length > 0 ? playlist.images[0].url : ''
                    }
                    alt="Album Art"
                  />
                </PlaylistCover>
              )}

              {playlist.external_urls && playlist.external_urls.spotify ? (
                <a
                  href={playlist.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer">
                  <Name>{playlist.name}</Name>
                </a>
              ) : (
                <Name>{playlist.name}</Name>
              )}

              <Owner>By {(playlist.owner || {}).display_name}</Owner>

              {playlist.description && (
                <Description dangerouslySetInnerHTML={{ __html: playlist.description }} />
              )}

              <TotalTracks>{((playlist.tracks || {}).total || 0)} Tracks</TotalTracks>

              <RecButton to={`/recommendations/${playlist.id}`}>Get Recommendations</RecButton>

              {audioFeatures && (
                <FeatureChart features={audioFeatures.audio_features} type="horizontalBar" />
              )}
            </Left>
            <Right>
              <ul>
                {(playlist.tracks &&
                playlist.tracks.items &&
                playlist.tracks.items
                  .filter(({ track }) => track)
                  .map(({ track }, i) => <TrackItem track={track} key={i} />)) || (
                <ErrorText>This playlist has no playable tracks.</ErrorText>
              )}
              </ul>
            </Right>
          </PlaylistContainer>
        </Main>
      ) : (
        <Loader />
      )}
    </React.Fragment>
  );
};

Playlist.propTypes = {
  playlistId: PropTypes.string,
};

export default Playlist;
