import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import { formatWithCommas } from '../utils';
import { getArtist } from '../spotify';

import Loader from './Loader';

import styled from 'styled-components';
import { theme, mixins, media, Main } from '../styles';
const { colors, fontSizes, spacing } = theme;

const ArtistContainer = styled(Main)`
  ${mixins.flexCenter};
  flex-direction: column;
  height: 100%;
  text-align: center;
`;
const Artwork = styled.div`
  ${mixins.coverShadow};
  border-radius: 100%;
  img {
    object-fit: cover;
    border-radius: 100%;
    width: 300px;
    height: 300px;
    ${media.tablet`
      width: 200px;
      height: 200px;
    `};
  }
`;
const ArtistName = styled.h1`
  font-size: 70px;
  margin-top: ${spacing.md};
  ${media.tablet`
    font-size: 7vw;
  `};
`;
const Stats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-gap: 10px;
  margin-top: ${spacing.md};
  text-align: center;
`;
const Stat = styled.div``;
const Number = styled.div`
  color: ${colors.blue};
  font-weight: 700;
  font-size: ${fontSizes.lg};
  text-transform: capitalize;
  ${media.tablet`
    font-size: ${fontSizes.md};
  `};
`;
const Genre = styled.div`
  font-size: ${fontSizes.md};
`;
const NumLabel = styled.p`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.xs};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: ${spacing.xs};
`;
const PaywallOverlay = styled.div`
  ${mixins.flexCenter};
  flex-direction: column;
  text-align: center;
  padding: 60px 20px;
`;
const PaywallTitle = styled.h2`
  font-size: ${fontSizes.xxl};
  margin: 0 0 15px;
`;
const PaywallText = styled.p`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.md};
  margin: 0 0 30px;
`;
const PaywallButton = styled.button`
  ${mixins.greenButton};
  font-size: ${fontSizes.base};
`;

const Artist = props => {
  const { isSubscribed, openSubscribeModal } = props;
  const { artistId } = useParams();
  const [artist, setArtist] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await getArtist(artistId);
        setArtist(data);
      } catch (err) {
        console.error('Error fetching artist:', err);
      }
    };
    fetchData();
  }, [artistId]);

  return (
    <React.Fragment>
      {artist ? (
        <ArtistContainer>
          <Artwork>
            <img
              src={artist.images && artist.images.length > 0 ? artist.images[0].url : ''}
              alt="Artist Artwork"
            />
          </Artwork>
          <div>
            <ArtistName>{artist.name}</ArtistName>
            {isSubscribed ? (
              <Stats>
                <Stat>
                  <Number>{formatWithCommas((artist.followers || {}).total || 0)}</Number>
                  <NumLabel>Followers</NumLabel>
                </Stat>
                {artist.genres && (
                  <Stat>
                    <Number>
                      {artist.genres.map(genre => (
                        <Genre key={genre}>{genre}</Genre>
                      ))}
                    </Number>
                    <NumLabel>Genres</NumLabel>
                  </Stat>
                )}
                {artist.popularity && (
                  <Stat>
                    <Number>{artist.popularity}%</Number>
                    <NumLabel>Popularity</NumLabel>
                  </Stat>
                )}
              </Stats>
            ) : (
              <PaywallOverlay>
                <PaywallTitle>Premium required</PaywallTitle>
                <PaywallText>
                  Subscribe to unlock detailed audience stats and genre insights for every artist.
                </PaywallText>
                <PaywallButton type="button" onClick={openSubscribeModal}>
                  See plans
                </PaywallButton>
              </PaywallOverlay>
            )}
          </div>
        </ArtistContainer>
      ) : (
        <Loader />
      )}
    </React.Fragment>
  );
};

Artist.propTypes = {
  artistId: PropTypes.string,
  isSubscribed: PropTypes.bool,
  openSubscribeModal: PropTypes.func,
};

export default Artist;
