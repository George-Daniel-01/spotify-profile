import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme, mixins } from '../styles';
const { colors, fontSizes, spacing } = theme;

const Overlay = styled.div`
  ${mixins.flexCenter};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  opacity: ${props => (props.isOpen ? 1 : 0)};
  visibility: ${props => (props.isOpen ? 'visible' : 'hidden')};
  transition: all 0.3s ease;
`;
const Modal = styled.div`
  background-color: ${colors.darkGrey};
  border-radius: 8px;
  padding: 40px;
  max-width: 500px;
  width: 90%;
  position: relative;
  transform: ${props => (props.isOpen ? 'translateY(0)' : 'translateY(20px)')};
  transition: all 0.3s ease;
`;
const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: ${colors.lightGrey};
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  &:hover {
    color: ${colors.white};
  }
`;
const Title = styled.h2`
  font-size: ${fontSizes.xxl};
  margin: 0 0 10px;
  color: ${colors.white};
`;
const Description = styled.p`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.sm};
  margin: 0 0 30px;
`;
const ErrorText = styled.p`
  color: ${colors.red};
  font-size: ${fontSizes.sm};
  margin: 0 0 15px;
`;
const SubscribeButton = styled.button`
  ${mixins.greenButton};
  width: 100%;
  margin-bottom: 10px;
  font-size: ${fontSizes.base};
`;
const CancelLink = styled.button`
  background: none;
  border: none;
  color: ${colors.lightGrey};
  font-size: ${fontSizes.xs};
  cursor: pointer;
  width: 100%;
  text-align: center;
  padding: 10px;
  &:hover {
    color: ${colors.white};
  }
`;

const SubscribeModal = ({ isOpen, onClose, products, spotifyUser }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPrice = price => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: (price.currency || 'usd').toUpperCase(),
        minimumFractionDigits: 0,
      }).format((price.unit_amount || 0) / 100);
    } catch (e) {
      return `$${((price.unit_amount || 0) / 100).toFixed(0)}`;
    }
  };

  const handleCheckout = async price => {
    setLoading(true);
    setError('');
    try {
      // Only the price ID is sent; the server re-reads the amount so a tampered
      // client cannot choose what it pays.
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: price.id,
          spotify_user_id: spotifyUser && spotifyUser.id,
          spotify_user_email: spotifyUser && spotifyUser.email,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((data && data.error) || 'Could not start checkout');
      }
      if (!data || !data.url) {
        throw new Error('Checkout session did not return a URL');
      }

      // Stripe.js v9 removed redirectToCheckout: navigate to the hosted page.
      window.location.assign(data.url);
    } catch (err) {
      setError(err.message || 'Something went wrong starting checkout');
      setLoading(false);
    }
  };

  return (
    <Overlay isOpen={isOpen} onClick={onClose}>
      <Modal isOpen={isOpen} onClick={e => e.stopPropagation()}>
        <CloseButton onClick={onClose} aria-label="Close">
          &times;
        </CloseButton>
        <Title>Premium Required</Title>
        <Description>Subscribe to access track details and artist insights</Description>
        {error && <ErrorText role="alert">{error}</ErrorText>}
        {products && products.length > 0 ? (
          products.map(product =>
            product.prices && product.prices.length > 0
              ? product.prices.map(price => (
                  <SubscribeButton
                    key={price.id}
                    onClick={() => handleCheckout(price)}
                    disabled={loading}>
                    {loading
                      ? 'Redirecting...'
                      : `Subscribe for ${formatPrice(price)} / ${price.interval}`}
                  </SubscribeButton>
                ))
              : null,
          )
        ) : (
          <Description>No subscription plans available</Description>
        )}
        <CancelLink onClick={onClose}>Maybe later</CancelLink>
      </Modal>
    </Overlay>
  );
};

export default SubscribeModal;
