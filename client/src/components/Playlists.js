import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPlaylists } from '../spotify';

import Loader from './Loader';
import { IconMusic, IconInfo } from './icons';

import styled from 'styled-components';
import { theme, mixins, media, Main } from '../styles';
const { colors, fontSizes, spacing } = theme;

const Wrapper = styled.div`
  ${mixins.flexBetween};
  align-items: flex-start;
`;
const PlaylistsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-gap: ${spacing.md};
  width: 100%;
  margin-top: 50px;
  ${media.tablet`
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  `};
  ${media.phablet`
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  `};
`;
const Playlist = styled.div`
  display: flex;
  flex-direction: column;
  text-align: center;
`;
const PlaylistMask = styled.div`
  ${mixins.flexCenter};
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  font-size: 30px;
  color: ${colors.white};
  opacity: 0;
  transition: ${theme.transition};
  svg {
    width: 25px;
  }
`;
const PlaylistImage = styled.img`
  object-fit: cover;
`;
const PlaylistCover = styled(Link)`
  ${mixins.coverShadow};
  position: relative;
  width: 100%;
  margin-bottom: ${spacing.base};
  &:hover,
  &:focus {
    ${PlaylistMask} {
      opacity: 1;
    }
  }
`;
const PlaceholderArtwork = styled.div`
  ${mixins.flexCenter};
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  background-color: ${colors.darkGrey};
  svg {
    width: 50px;
    height: 50px;
  }
`;
const PlaceholderContent = styled.div`
  ${mixins.flexCenter};
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
`;
const PlaylistName = styled(Link)`
  display: inline;
  border-bottom: 1px solid transparent;
  &:hover,
  &:focus {
    border-bottom: 1px solid ${colors.white};
  }
`;
const TotalTracks = styled.div`
  text-transform: uppercase;
  margin: 5px 0;
  color: ${colors.lightGrey};
  font-size: ${fontSizes.xs};
  letter-spacing: 1px;
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

const Playlists = () => {
  const [playlists, setPlaylists] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await getPlaylists();
        setPlaylists(data);
      } catch (err) {
        console.error('Error fetching playlists:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (error) {
    return (
      <Main>
        <h2>Your Playlists</h2>
        <ErrorContainer>
          <ErrorText>Could not load playlists.</ErrorText>
          <RetryButton onClick={() => window.location.reload()}>Refresh</RetryButton>
        </ErrorContainer>
      </Main>
    );
  }

  return (
    <Main>
      <h2>Your Playlists</h2>
      <Wrapper>
        <PlaylistsContainer>
          {loading ? (
            <Loader />
          ) : (
            playlists &&
            playlists.items.map(({ id, images, name, tracks }, i) => (
              <Playlist key={i}>
                <PlaylistCover to={`/playlists/${id}`}>
                  {images && images.length > 0 ? (
                    <PlaylistImage src={images[0].url} alt="Album Art" />
                  ) : (
                    <PlaceholderArtwork>
                      <PlaceholderContent>
                        <IconMusic />
                      </PlaceholderContent>
                    </PlaceholderArtwork>
                  )}
                  <PlaylistMask>
                    <IconInfo />
                  </PlaylistMask>
                </PlaylistCover>
                <div>
                  <PlaylistName to={`/playlists/${id}`}>{name}</PlaylistName>
                  <TotalTracks>{tracks ? tracks.total : 0} Tracks</TotalTracks>
                </div>
              </Playlist>
            ))
          )}
        </PlaylistsContainer>
      </Wrapper>
    </Main>
  );
};

export default Playlists;
