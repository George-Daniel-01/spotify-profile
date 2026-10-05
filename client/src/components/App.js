import React, { useState, useEffect, useCallback } from 'react';
import { getAccessToken, getUser } from '../spotify';

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

  // The profile route is the only place User.js resolves the Spotify user, so a
// deep link to /track/:id or /artist/:id would never learn who the user is and
// would always show the paywall. Resolve it here instead.
useEffect(() => {
    if (!accessToken || spotifyUser) return undefined;
    let cancelled = false;
    getUser()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSpotifyUser({ id: data.id, email: data.email, display_name: data.display_name });
      })
      .catch(err => console.error('Error loading Spotify user:', err));
    return () => {
      cancelled = true;
    };
  }, [accessToken, spotifyUser]);

const checkSubscription = useCallback(async () => {
    if (!spotifyUser || !spotifyUser.id) return;
    try {
      const response = await fetch(`/api/subscription-status?spotify_user_id=${spotifyUser.id}`);
      const data = await response.json();
      setIsSubscribed(!!(data && (data.active || data.subscribed)));
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  }, [spotifyUser]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Stripe returns here after checkout; the webhook may not have landed yet, so
  // poll briefly instead of leaving the paywall up.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('checkout');
    if (!status) return;

    window.history.replaceState({}, '', window.location.pathname);
    if (status !== 'success') return;

    const attempts = [0, 1500, 4000, 8000];
    const timers = attempts.map(delay =>
      setTimeout(() => checkSubscription(), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [checkSubscription]);

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
