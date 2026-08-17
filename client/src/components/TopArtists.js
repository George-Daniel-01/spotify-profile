import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTopArtistsShort, getTopArtistsMedium, getTopArtistsLong } from '../spotify';

import { IconInfo } from './icons';
import Loader from './Loader';

import styled from 'styled-components';
import { theme, mixins, media, Main } from '../styles';
const { colors, fontSizes, spacing } = theme;

const Header = styled.header`
  ${mixins.flexBetween};
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
const ArtistsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-gap: 20px;
  margin-top: 50px;
  ${media.tablet`
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  `};
  ${media.phablet`
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  `};
`;
const Artist = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
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
  border-radius: 100%;
  font-size: 20px;
  color: ${colors.white};
  opacity: 0;
  transition: ${theme.transition};
  svg {
    width: 25px;
  }
`;
const ArtistArtwork = styled(Link)`
  display: inline-block;
  position: relative;
  width: 200px;
  height: 200px;
  ${media.tablet`
    width: 150px;
    height: 150px;
  `};
  ${media.phablet`
    width: 120px;
    height: 120px;
  `};
  &:hover,
  &:focus {
    ${Mask} {
      opacity: 1;
    }
  }
  img {
    border-radius: 100%;
    object-fit: cover;
    width: 200px;
    height: 200px;
    ${media.tablet`
      width: 150px;
      height: 150px;
    `};
    ${media.phablet`
      width: 120px;
      height: 120px;
    `};
  }
`;
const ArtistName = styled.a`
  margin: ${spacing.base} 0;
  border-bottom: 1px solid transparent;
  &:hover,
  &:focus {
    border-bottom: 1px solid ${colors.white};
  }
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
  margin-bottom: ${spacing.base};
`;
const RetryButton = styled.button`
  ${mixins.greenButton};
`;

const TopArtists = () => {
  const [topArtists, setTopArtists] = useState(null);
  const [activeRange, setActiveRange] = useState('long');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rangeLoading, setRangeLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await getTopArtistsLong();
        setTopArtists(data);
      } catch (err) {
        console.error('Error fetching top artists:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const apiCalls = {
    long: () => getTopArtistsLong(),
    medium: () => getTopArtistsMedium(),
    short: () => getTopArtistsShort(),
  };

  const changeRange = async range => {
    setRangeLoading(true);
    try {
      const { data } = await apiCalls[range]();
      setTopArtists(data);
      setActiveRange(range);
    } catch (err) {
      console.error('Error changing range:', err);
    } finally {
      setRangeLoading(false);
    }
  };

  if (error) {
    return (
      <Main>
        <Header>
          <h2>Top Artists</h2>
        </Header>
        <ErrorContainer>
          <ErrorText>Could not load top artists. Please try again.</ErrorText>
          <RetryButton onClick={() => window.location.reload()}>Refresh</RetryButton>
        </ErrorContainer>
      </Main>
    );
  }

  return (
    <Main>
      <Header>
        <h2>Top Artists</h2>
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
        <ArtistsContainer>
          {topArtists &&
            topArtists.items.map(({ id, external_urls, images, name }, i) => (
              <Artist key={i}>
                <ArtistArtwork to={`/artist/${id}`}>
                  {images && images.length > 1 && <img src={images[1].url} alt="Artist" />}
                  <Mask>
                    <IconInfo />
                  </Mask>
                </ArtistArtwork>
                <ArtistName href={external_urls.spotify} target="_blank" rel="noopener noreferrer">
                  {name}
                </ArtistName>
              </Artist>
            ))}
        </ArtistsContainer>
      )}
    </Main>
  );
};

export default TopArtists;
