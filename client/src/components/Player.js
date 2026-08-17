import React from 'react';
import styled, { keyframes } from 'styled-components';
import { usePlayer } from './PlayerContext';
import { theme, mixins, media } from '../styles';
const { colors, fontSizes } = theme;

const barAnim = keyframes`
  0%, 100% { height: 4px; }
  50% { height: 16px; }
`;

const Bar = styled.div`
  position: fixed;
  bottom: 0;
  left: ${props => (props.hasNav ? theme.navWidth : '0')};
  right: 0;
  height: 72px;
  background: linear-gradient(180deg, #282828 0%, #181818 100%);
  display: flex;
  align-items: center;
  padding: 0 20px;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.5);
  ${media.tablet`
    left: 0;
    padding-bottom: 70px;
  `};
`;

const TrackInfo = styled.div`
  display: flex;
  align-items: center;
  min-width: 200px;
  max-width: 300px;
  flex: 1;
`;
const TrackArt = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 4px;
  margin-right: 12px;
  object-fit: cover;
`;
const TrackDetails = styled.div`
  overflow: hidden;
`;
const TrackName = styled.div`
  color: ${colors.white};
  font-size: ${fontSizes.sm};
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const TrackArtist = styled.div`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.xs};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: center;
`;
const PlayBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: ${colors.white};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
  padding: 0;
  &:hover {
    transform: scale(1.06);
  }
`;
const ProgressWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 2;
  max-width: 500px;
`;
const Time = styled.span`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.xs};
  min-width: 40px;
  text-align: ${props => props.align || 'left'};
`;
const SliderThumb = styled.div`
  opacity: 0;
  width: 12px;
  height: 12px;
  background: ${colors.white};
  border-radius: 50%;
  position: absolute;
  top: -4px;
  right: -6px;
  transition: opacity 0.2s;
`;
const ProgressBar = styled.div`
  flex: 1;
  height: 4px;
  background-color: ${colors.grey};
  border-radius: 2px;
  cursor: pointer;
  position: relative;
  &:hover ${SliderThumb} {
    opacity: 1;
  }
`;
const ProgressFill = styled.div`
  height: 100%;
  background-color: ${colors.white};
  border-radius: 2px;
  width: ${props => props.pct}%;
  transition: width 0.1s linear;
  &:hover {
    background-color: ${colors.green};
  }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: ${colors.lightGrey};
  cursor: pointer;
  padding: 8px;
  margin-left: 16px;
  font-size: 18px;
  &:hover {
    color: ${colors.white};
  }
`;

const Equalizer = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 20px;
  margin-left: 12px;
`;
const EqBar = styled.div`
  width: 3px;
  background-color: ${colors.green};
  border-radius: 1px;
  animation: ${barAnim} ${props => props.dur}s ease-in-out infinite;
  animation-play-state: ${props => (props.playing ? 'running' : 'paused')};
`;

const formatTime = s => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

const Player = () => {
  const { currentTrack, isPlaying, progress, duration, togglePlay, seek, stop } = usePlayer();

  if (!currentTrack) return null;

  const albumImage =
    currentTrack.album && currentTrack.album.images && currentTrack.album.images.length > 0
      ? currentTrack.album.images[0].url
      : '';
  const artistNames = currentTrack.artists ? currentTrack.artists.map(a => a.name).join(', ') : '';
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  const handleBarClick = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    seek(pct * duration);
  };

  return (
    <Bar>
      <TrackInfo>
        {albumImage && <TrackArt src={albumImage} alt="Album" />}
        <TrackDetails>
          <TrackName>{currentTrack.name}</TrackName>
          <TrackArtist>{artistNames}</TrackArtist>
        </TrackDetails>
        <Equalizer>
          <EqBar dur={0.4} playing={isPlaying} style={{ animationDelay: '0s' }} />
          <EqBar dur={0.5} playing={isPlaying} style={{ animationDelay: '0.1s' }} />
          <EqBar dur={0.35} playing={isPlaying} style={{ animationDelay: '0.2s' }} />
          <EqBar dur={0.45} playing={isPlaying} style={{ animationDelay: '0.05s' }} />
        </Equalizer>
      </TrackInfo>

      <Controls>
        <PlayBtn onClick={() => togglePlay(currentTrack)}>
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="#000">
              <path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="#000">
              <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z" />
            </svg>
          )}
        </PlayBtn>
      </Controls>

      <ProgressWrapper>
        <Time align="right">{formatTime(progress)}</Time>
        <ProgressBar onClick={handleBarClick}>
          <ProgressFill pct={pct} />
        </ProgressBar>
        <Time>{formatTime(duration)}</Time>
      </ProgressWrapper>

      <CloseBtn onClick={stop} title="Stop">
        &#10005;
      </CloseBtn>
    </Bar>
  );
};

export default Player;
