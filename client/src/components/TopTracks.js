import React, { useState, useEffect } from 'react';
import { getTopTracksShort, getTopTracksMedium, getTopTracksLong } from '../spotify';

import Loader from './Loader';
import TrackItem from './TrackItem';

import styled from 'styled-components';
import { theme, mixins, media, Main } from '../styles';
const { colors, fontSizes } = theme;

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
const TracksContainer = styled.ul`
  margin-top: 50px;
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

const apiCalls = {
  long: () => getTopTracksLong(),
  medium: () => getTopTracksMedium(),
  short: () => getTopTracksShort(),
};

const TopTracks = () => {
  const [topTracks, setTopTracks] = useState(null);
  const [activeRange, setActiveRange] = useState('long');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rangeLoading, setRangeLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await getTopTracksLong();
        setTopTracks(data);
      } catch (err) {
        console.error('Error fetching top tracks:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const changeRange = async range => {
    setRangeLoading(true);
    try {
      const { data } = await apiCalls[range]();
      setTopTracks(data);
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
          <h2>Top Tracks</h2>
        </Header>
        <ErrorContainer>
          <ErrorText>Could not load top tracks. Please try again.</ErrorText>
          <RetryButton onClick={() => window.location.reload()}>Refresh</RetryButton>
        </ErrorContainer>
      </Main>
    );
  }

  return (
    <Main>
      <Header>
        <h2>Top Tracks</h2>
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
      {loading || rangeLoading ? (
        <Loader />
      ) : (
        <TracksContainer>
          {topTracks && topTracks.items.map((track, i) => <TrackItem track={track} key={i} />)}
        </TracksContainer>
      )}
    </Main>
  );
};

export default TopTracks;
