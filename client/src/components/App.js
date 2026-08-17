import React, { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '../spotify';

import ErrorBoundary from './ErrorBoundary';
import LoginScreen from './LoginScreen';
import Profile from './Profile';
import SubscribeModal from './SubscribeModal';
import { PlayerProvider } from './PlayerContext';
import Player from './Player';

import styled from 'styled-components';
import { GlobalStyle } from '../styles';

const AppContainer = styled.div`
  height: 100%;
  min-height: 100vh;
`;

const App = () => {
  const [accessToken, setAccessToken] = useState('');
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    setAccessToken(getAccessToken());
  }, []);

  const openSubscribeModal = useCallback(() => setSubscribeModalOpen(true), []);
  const closeSubscribeModal = useCallback(() => setSubscribeModalOpen(false), []);

  useEffect(() => {
    window.onerror = function (msg, url, line, col, error) {
      console.error('Global error:', msg, url, line, col, error);
      return false;
    };
    window.addEventListener('unhandledrejection', function (e) {
      console.error('Unhandled promise rejection:', e.reason);
    });
  }, []);

  useEffect(() => {
    if (spotifyUser && spotifyUser.id) {
      const checkSubscription = async () => {
        try {
          const response = await fetch(
            `/api/subscription-status?spotify_user_id=${spotifyUser.id}`,
          );
          const data = await response.json();
          setIsSubscribed(data && data.active);
        } catch (err) {
          console.error('Error checking subscription:', err);
        }
      };
      checkSubscription();
    }
  }, [spotifyUser]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };
    fetchProducts();
  }, []);

  return (
    <PlayerProvider>
      <AppContainer>
        <GlobalStyle />
        {accessToken ? (
          <Profile
            setSpotifyUser={setSpotifyUser}
            isSubscribed={isSubscribed}
            openSubscribeModal={openSubscribeModal}
          />
        ) : (
          <ErrorBoundary>
            <LoginScreen />
          </ErrorBoundary>
        )}

        <Player />

        <SubscribeModal
          isOpen={subscribeModalOpen}
          onClose={closeSubscribeModal}
          products={products}
          spotifyUser={spotifyUser}
        />
      </AppContainer>
    </PlayerProvider>
  );
};

export default App;
