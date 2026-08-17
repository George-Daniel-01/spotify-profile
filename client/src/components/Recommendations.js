import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  getPlaylist,
  getRecommendationsForTracks,
  getUser,
  createPlaylist,
  addTracksToPlaylist,
  followPlaylist,
  doesUserFollowPlaylist,
} from '../spotify';

import Loader from './Loader';
import TrackItem from './TrackItem';

import styled from 'styled-components';
import { theme, mixins, media, Main } from '../styles';
const { colors } = theme;

const PlaylistHeading = styled.div`
  ${mixins.flexBetween};
  ${media.tablet`
    flex-direction: column;

  `};
  h2 {
    margin-bottom: 0;
  }
`;
const SaveButton = styled.button`
  ${mixins.greenButton};
`;
const OpenButton = styled.a`
  ${mixins.button};
`;
const TracksContainer = styled.ul`
  margin-top: 50px;
`;
const PlaylistLink = styled(Link)`
  &:hover,
  &:focus {
    color: ${colors.offGreen};
  }
`;

const Recommendations = props => {
  const { playlistId } = useParams();

  const [playlist, setPlaylist] = useState(null);
  const [recommendations, setRecommmendations] = useState(null);
  const [recPlaylistId, setRecPlaylistId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchPlaylistData = async () => {
      try {
        const { data } = await getPlaylist(playlistId);
        setPlaylist(data);
      } catch (err) {
        console.error('Error fetching playlist:', err);
      }
    };
    fetchPlaylistData();

    const fetchUserData = async () => {
      try {
        const { data } = await getUser();
        setUserId(data.id);
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };
    fetchUserData();
  }, [playlistId]);

  useEffect(() => {
    if (!playlist || !playlist.tracks || !playlist.tracks.items) return;
    const fetchData = async () => {
      try {
        const { data } = await getRecommendationsForTracks(playlist.tracks.items);
        setRecommmendations(data);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
      }
    };
    fetchData();
  }, [playlist]);

  // If recPlaylistId has been set, add tracks to playlist and follow
  useEffect(() => {
    if (!recPlaylistId || !recommendations || !recommendations.tracks || !userId) return;

    const isUserFollowingPlaylist = async plistId => {
      try {
        const { data } = await doesUserFollowPlaylist(plistId, userId);
        setIsFollowing(data[0]);
      } catch (err) {
        console.error('Error checking follow status:', err);
      }
    };

    const addTracksAndFollow = async () => {
      try {
        const uris = recommendations.tracks.map(({ uri }) => uri).join(',');
        const { data } = await addTracksToPlaylist(recPlaylistId, uris);

        if (data) {
          await followPlaylist(recPlaylistId);
          isUserFollowingPlaylist(recPlaylistId);
        }
      } catch (err) {
        console.error('Error adding tracks to playlist:', err);
      }
    };

    addTracksAndFollow(recPlaylistId);
  }, [recPlaylistId, recommendations, userId]);

  const createPlaylistOnSave = async () => {
    if (!userId || !playlist) {
      return;
    }

    try {
      const name = `Recommended Tracks Based on ${playlist.name}`;
      const { data } = await createPlaylist(userId, name);
      setRecPlaylistId(data.id);
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  };

  if (!playlist && !recommendations) {
    return (
      <Main>
        <Loader />
      </Main>
    );
  }

  return (
    <Main>
      {playlist && (
        <PlaylistHeading>
          <h2>
            Recommended Tracks Based On{' '}
            <PlaylistLink to={`/playlists/${playlist.id}`}>{playlist.name}</PlaylistLink>
          </h2>
          {isFollowing && recPlaylistId ? (
            <OpenButton
              href={`https://open.spotify.com/playlist/${recPlaylistId}`}
              target="_blank"
              rel="noopener noreferrer">
              Open in Spotify
            </OpenButton>
          ) : (
            <SaveButton onClick={createPlaylistOnSave}>Save to Spotify</SaveButton>
          )}
        </PlaylistHeading>
      )}
      <TracksContainer>
        {recommendations &&
          recommendations.tracks.map((track, i) => <TrackItem track={track} key={i} />)}
      </TracksContainer>
    </Main>
  );
};

Recommendations.propTypes = {
  playlistId: PropTypes.string,
};

export default Recommendations;
