import React, { useState, useEffect } from 'react';
import { getRecentlyPlayed } from '../spotify';

import Loader from './Loader';
import TrackItem from './TrackItem';

import styled from 'styled-components';
import { theme, mixins, Main } from '../styles';
const { colors, fontSizes } = theme;

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

const RecentlyPlayed = () => {
  const [recentlyPlayed, setRecentlyPlayed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await getRecentlyPlayed();
        setRecentlyPlayed(data);
      } catch (err) {
        console.error('Error fetching recently played:', err);
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
        <h2>Recently Played Tracks</h2>
        <ErrorContainer>
          <ErrorText>Could not load recently played tracks.</ErrorText>
          <RetryButton onClick={() => window.location.reload()}>Refresh</RetryButton>
        </ErrorContainer>
      </Main>
    );
  }

  return (
    <Main>
      <h2>Recently Played Tracks</h2>
      {loading ? (
        <Loader />
      ) : (
        <TracksContainer>
          {recentlyPlayed &&
            recentlyPlayed.items.map(({ track }, i) => <TrackItem track={track} key={i} />)}
        </TracksContainer>
      )}
    </Main>
  );
};

export default RecentlyPlayed;
