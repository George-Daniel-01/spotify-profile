import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { formatDuration } from '../utils';
import { usePlayer } from './PlayerContext';

import { IconInfo } from './icons';

import styled from 'styled-components';
import { theme, mixins, media } from '../styles';
const { colors, fontSizes, spacing } = theme;

const TrackLeft = styled.span`
  ${mixins.overflowEllipsis};
`;
const TrackRight = styled.span`
  display: flex;
  align-items: center;
  gap: 12px;
`;
const TrackArtwork = styled.div`
  display: inline-block;
  position: relative;
  width: 50px;
  min-width: 50px;
  margin-right: ${spacing.base};
`;
const Mask = styled.div`
  ${mixins.flexCenter};
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  color: ${colors.white};
  opacity: 0;
  transition: ${theme.transition};
  svg {
    width: 25px;
  }
`;
const TrackContainer = styled(Link)`
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  margin-bottom: ${spacing.md};
  ${media.tablet`
    margin-bottom: ${spacing.base};
  `};
  &:hover,
  &:focus {
    ${Mask} {
      opacity: 1;
    }
  }
`;
const TrackMeta = styled.div`
  display: grid;
  grid-template-columns: 1fr max-content;
  grid-gap: 10px;
`;
const TrackName = styled.span`
  margin-bottom: 5px;
  border-bottom: 1px solid transparent;
  &:hover,
  &:focus {
    border-bottom: 1px solid ${colors.white};
  }
`;
const TrackAlbum = styled.div`
  ${mixins.overflowEllipsis};
  color: ${colors.lightGrey};
  font-size: ${fontSizes.sm};
  margin-top: 3px;
`;
const TrackDuration = styled.span`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.sm};
`;
const PlayBtn = styled.button`
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  background-color: ${props => (props.isActive ? colors.green : 'transparent')};
  border: 1px solid ${props => (props.isActive ? colors.green : colors.lightGrey)};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.15s ease;
  svg {
    fill: ${props => (props.isActive ? '#000' : colors.white)};
    width: 10px;
    height: 10px;
  }
  &:hover {
    border-color: ${colors.white};
    transform: scale(1.1);
  }
`;

const TrackItem = ({ track }) => {
  const { currentTrack, isPlaying, togglePlay } = usePlayer();
  const isActive = currentTrack && currentTrack.id === track.id;
  const hasPreview = !!track.preview_url;

  const handlePlay = e => {
    e.preventDefault();
    e.stopPropagation();
    if (hasPreview) {
      togglePlay(track);
    }
  };

  return (
    <li>
      <TrackContainer to={`/track/${track.id}`}>
        <div>
          <TrackArtwork>
            {track.album.images && track.album.images.length > 2 && (
              <img src={track.album.images[2].url} alt="Album Artwork" />
            )}
            <Mask>
              <IconInfo />
            </Mask>
          </TrackArtwork>
        </div>
        <TrackMeta>
          <TrackLeft>
            {track.name && <TrackName>{track.name}</TrackName>}
            {track.artists && track.album && (
              <TrackAlbum>
                {track.artists &&
                  track.artists.map(({ name }, i) => (
                    <span key={i}>
                      {name}
                      {track.artists.length > 1 && i === track.artists.length - 1 ? '' : ','}&nbsp;
                    </span>
                  ))}
                &nbsp;&middot;&nbsp;&nbsp;
                {track.album.name}
              </TrackAlbum>
            )}
          </TrackLeft>
          <TrackRight>
            {hasPreview && (
              <PlayBtn
                isActive={isActive}
                onClick={handlePlay}
                title={isActive && isPlaying ? 'Pause' : 'Play preview'}>
                {isActive && isPlaying ? (
                  <svg viewBox="0 0 16 16">
                    <path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16">
                    <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z" />
                  </svg>
                )}
              </PlayBtn>
            )}
            {track.duration_ms && (
              <TrackDuration>{formatDuration(track.duration_ms)}</TrackDuration>
            )}
          </TrackRight>
        </TrackMeta>
      </TrackContainer>
    </li>
  );
};

TrackItem.propTypes = {
  track: PropTypes.object.isRequired,
};

export default TrackItem;
