import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import ScrollToTop from './ScrollToTop';
import Nav from './Nav';
import User from './User';
import RecentlyPlayed from './RecentlyPlayed';
import TopArtists from './TopArtists';
import TopTracks from './TopTracks';
import Playlists from './Playlists';
import Playlist from './Playlist';
import Recommendations from './Recommendations';
import Track from './Track';
import Artist from './Artist';
import TasteProfile from './TasteProfile';
import MoodMatch from './MoodMatch';
import ErrorBoundary from './ErrorBoundary';
import styled from 'styled-components';
import { theme, media } from '../styles';

const SiteWrapper = styled.div`
  padding-left: ${theme.navWidth};
  ${media.tablet`
    padding-left: 0;
    padding-bottom: 50px;
  `};
`;

const Profile = ({ setSpotifyUser, isSubscribed, openSubscribeModal }) => (
  <Router>
    <SiteWrapper>
      <Nav />
      <ScrollToTop>
        <ErrorBoundary>
          <Switch>
            <Route exact path="/" render={() => <User setSpotifyUser={setSpotifyUser} />} />
            <Route path="/recent" component={RecentlyPlayed} />
            <Route path="/artists" component={TopArtists} />
            <Route
              path="/tracks"
              render={() => (
                <TopTracks isSubscribed={isSubscribed} openSubscribeModal={openSubscribeModal} />
              )}
            />
            <Route exact path="/playlists" component={Playlists} />
            <Route
              path="/playlists/:playlistId"
              render={routeProps => <Playlist {...routeProps} />}
            />
            <Route
              path="/recommendations/:playlistId"
              render={routeProps => <Recommendations {...routeProps} />}
            />
            <Route
              path="/track/:trackId"
              render={routeProps => (
                <Track
                  {...routeProps}
                  isSubscribed={isSubscribed}
                  openSubscribeModal={openSubscribeModal}
                />
              )}
            />
            <Route
              path="/artist/:artistId"
              render={routeProps => (
                <Artist
                  {...routeProps}
                  isSubscribed={isSubscribed}
                  openSubscribeModal={openSubscribeModal}
                />
              )}
            />
            <Route path="/taste" component={TasteProfile} />
            <Route path="/mood" component={MoodMatch} />
          </Switch>
        </ErrorBoundary>
      </ScrollToTop>
    </SiteWrapper>
  </Router>
);

export default Profile;
