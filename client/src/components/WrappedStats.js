import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { theme, mixins, media } from '../styles';
const { colors, fontSizes, spacing } = theme;

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(60px); }
  to { opacity: 1; transform: translateX(0); }
`;
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const Container = styled.div`
  margin-bottom: ${spacing.lg};
`;
const SlidesWrapper = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: ${spacing.lg};
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
`;
const Slide = styled.div`
  position: ${props => (props.isActive ? 'relative' : 'absolute')};
  opacity: ${props => (props.isActive ? 1 : 0)};
  visibility: ${props => (props.isActive ? 'visible' : 'hidden')};
  text-align: center;
  width: 100%;
  animation: ${props => (props.isActive ? slideIn : 'none')} 0.6s ease forwards;
  transition: opacity 0.4s ease;
`;
const SlideLabel = styled.div`
  color: ${colors.green};
  font-size: ${fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: ${spacing.sm};
`;
const SlideNumber = styled.div`
  font-size: 72px;
  font-weight: 700;
  color: ${colors.white};
  animation: ${props => (props.animate ? pulse : 'none')} 2s ease infinite;
  ${media.tablet`
    font-size: 56px;
  `};
`;
const SlideUnit = styled.span`
  font-size: ${fontSizes.xl};
  color: ${colors.lightGrey};
  font-weight: 400;
`;
const SlideText = styled.p`
  color: ${colors.lightestGrey};
  font-size: ${fontSizes.lg};
  margin-top: ${spacing.sm};
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.5;
`;
const BigName = styled.div`
  font-size: 48px;
  font-weight: 700;
  color: ${colors.green};
  animation: ${pulse} 2s ease infinite;
  ${media.tablet`
    font-size: 36px;
  `};
`;
const SubText = styled.div`
  color: ${colors.lightestGrey};
  font-size: ${fontSizes.md};
  margin-top: ${spacing.sm};
`;
const Dots = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: ${spacing.base};
`;
const Dot = styled.button`
  width: ${props => (props.active ? '24px' : '8px')};
  height: 8px;
  border-radius: 4px;
  border: none;
  background-color: ${props => (props.active ? colors.green : colors.grey)};
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0;
`;
const NavButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${spacing.base};
`;
const NavButton = styled.button`
  background: transparent;
  border: 1px solid ${colors.grey};
  color: ${colors.lightestGrey};
  border-radius: 50px;
  padding: 10px 24px;
  font-size: ${fontSizes.xs};
  cursor: pointer;
  transition: ${theme.transition};
  text-transform: uppercase;
  letter-spacing: 1px;
  &:hover {
    border-color: ${colors.white};
    color: ${colors.white};
  }
`;

const WrappedStats = ({ topArtists, topTracks, audioFeatures, uniqueGenres }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef(null);

  const slides = useMemo(() => {
    const result = [];
    if (topTracks && topTracks.items && topTracks.items.length > 0) {
      result.push({
        label: 'Your Most Played Track',
        type: 'artist',
        value: topTracks.items[0].name,
        sub: `by ${topTracks.items[0].artists.map(a => a.name).join(', ')}`,
      });
    }
    if (topArtists && topArtists.items && topArtists.items.length > 0) {
      result.push({
        label: 'Your #1 Artist',
        type: 'artist',
        value: topArtists.items[0].name,
        sub: `${((topArtists.items[0].followers || {}).total || 0).toLocaleString()} followers on Spotify`,
      });
      result.push({
        label: 'Artists You Follow',
        type: 'number',
        value: topArtists.items.length,
        unit: '+',
        sub: 'in your top artists rotation',
      });
    }
    if (topTracks && topTracks.items) {
      result.push({
        label: 'Total Tracks Analyzed',
        type: 'number',
        value: topTracks.items.length,
        unit: '',
        sub: 'tracks shaped your taste profile',
      });
    }
    if (audioFeatures) {
      result.push({
        label: 'Your Average Tempo',
        type: 'number',
        value: Math.round(audioFeatures.tempo),
        unit: ' BPM',
        sub: 'the heartbeat of your music',
      });
      const energyPct = Math.round(audioFeatures.energy * 100);
      result.push({
        label: 'Energy Level',
        type: 'number',
        value: energyPct,
        unit: '%',
        sub:
          energyPct > 70
            ? 'You like it LOUD'
            : energyPct > 40
            ? 'Balanced vibes'
            : 'Chill mode activated',
      });
      const dancePct = Math.round(audioFeatures.danceability * 100);
      result.push({
        label: 'Danceability',
        type: 'number',
        value: dancePct,
        unit: '%',
        sub:
          dancePct > 70
            ? 'Born on the dance floor'
            : dancePct > 40
            ? "You've got rhythm"
            : 'More listener than dancer',
      });
    }
    if (uniqueGenres) {
      result.push({
        label: 'Unique Genres',
        type: 'number',
        value: uniqueGenres,
        unit: '',
        sub: 'different genres in your music DNA',
      });
    }
    return result;
  }, [topArtists, topTracks, audioFeatures, uniqueGenres]);

  const slidesLength = slides.length;

  useEffect(() => {
    if (slidesLength <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slidesLength);
    }, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slidesLength]);

  const goNext = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % slidesLength);
  }, [slidesLength]);

  const goPrev = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + slidesLength) % slidesLength);
  }, [slidesLength]);

  if (slides.length === 0) return null;

  return (
    <Container>
      <SlidesWrapper>
        {slides.map((slide, i) => (
          <Slide key={i} isActive={i === currentSlide}>
            <SlideLabel>{slide.label}</SlideLabel>
            {slide.type === 'artist' ? (
              <>
                <BigName>{slide.value}</BigName>
                <SubText>{slide.sub}</SubText>
              </>
            ) : (
              <>
                <SlideNumber animate={i === currentSlide}>
                  {slide.value}
                  <SlideUnit>{slide.unit}</SlideUnit>
                </SlideNumber>
                <SlideText>{slide.sub}</SlideText>
              </>
            )}
          </Slide>
        ))}
      </SlidesWrapper>
      {slides.length > 1 && (
        <>
          <Dots>
            {slides.map((_, i) => (
              <Dot key={i} active={i === currentSlide} onClick={() => setCurrentSlide(i)} />
            ))}
          </Dots>
          <NavButtons>
            <NavButton onClick={goPrev}>Prev</NavButton>
            <NavButton onClick={goNext}>Next</NavButton>
          </NavButtons>
        </>
      )}
    </Container>
  );
};

export default WrappedStats;
