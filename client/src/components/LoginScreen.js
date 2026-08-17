import React from 'react';
import { SignInButton } from '@clerk/clerk-react';
import styled, { keyframes } from 'styled-components';
import { theme, mixins, media, Main } from '../styles';
const { colors, fontSizes } = theme;

const LOGIN_URI =
  process.env.REACT_APP_LOGIN_URI ||
  (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:8888/login' : '/api/login');

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;
const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.4); }
  50% { box-shadow: 0 0 0 15px rgba(29, 185, 84, 0); }
`;

const Login = styled(Main)`
  ${mixins.flexCenter};
  flex-direction: column;
  min-height: 100vh;
  text-align: center;
`;
const Logo = styled.div`
  color: ${colors.green};
  margin-bottom: 20px;
  animation: ${fadeIn} 0.6s ease forwards;
  svg {
    width: 80px;
    height: 80px;
  }
`;
const Title = styled.h1`
  font-size: 56px;
  font-weight: 900;
  letter-spacing: -1px;
  margin: 0 0 10px;
  animation: ${fadeIn} 0.6s ease 0.1s forwards;
  opacity: 0;
  ${media.tablet`
    font-size: 40px;
  `};
`;
const Subtitle = styled.p`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.md};
  margin: 0 0 40px;
  animation: ${fadeIn} 0.6s ease 0.2s forwards;
  opacity: 0;
`;
const ClerkArea = styled.div`
  margin-top: 15px;
  animation: ${fadeIn} 0.6s ease 0.4s forwards;
  opacity: 0;
`;
const ClerkButton = styled.span`
  display: inline-block;
  background-color: transparent;
  color: ${colors.green};
  border: 2px solid ${colors.green};
  border-radius: 50px;
  padding: 16px 48px;
  font-weight: 700;
  font-size: ${fontSizes.base};
  letter-spacing: 2px;
  text-transform: uppercase;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover,
  &:focus {
    background-color: ${colors.green};
    color: ${colors.white};
    transform: scale(1.05);
  }
`;
const LoginButton = styled.a`
  display: inline-block;
  background-color: ${colors.green};
  color: ${colors.white};
  border-radius: 50px;
  padding: 18px 48px;
  font-weight: 700;
  font-size: ${fontSizes.base};
  letter-spacing: 2px;
  text-transform: uppercase;
  text-align: center;
  animation: ${fadeIn} 0.6s ease 0.3s forwards, ${pulse} 2s ease 1s infinite;
  opacity: 0;
  transition: all 0.3s ease;
  &:hover,
  &:focus {
    background-color: ${colors.offGreen};
    transform: scale(1.05);
  }
`;
const Features = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 40px;
  margin-top: 80px;
  max-width: 700px;
  animation: ${fadeIn} 0.6s ease 0.5s forwards;
  opacity: 0;
  ${media.phone`
    grid-template-columns: 1fr;
    grid-gap: 20px;
  `};
`;
const Feature = styled.div`
  text-align: center;
`;
const FeatureTitle = styled.h3`
  font-size: ${fontSizes.base};
  font-weight: 700;
  margin: 10px 0 5px;
`;
const FeatureText = styled.p`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.sm};
  margin: 0;
`;

const LoginScreen = () => (
  <Login>
    <Logo>
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    </Logo>
    <Title>Spotify Profile</Title>
    <Subtitle>Visualize your listening habits and discover your music personality</Subtitle>
    <LoginButton href={LOGIN_URI}>Log in to Spotify</LoginButton>
    {process.env.REACT_APP_CLERK_PUBLISHABLE_KEY && (
      <ClerkArea>
        <SignInButton mode="modal">
          <ClerkButton>Continue with Clerk</ClerkButton>
        </SignInButton>
      </ClerkArea>
    )}
    <Features>
      <Feature>
        <FeatureTitle>Your Music DNA</FeatureTitle>
        <FeatureText>See your audio features visualized with radar charts and stats</FeatureText>
      </Feature>
      <Feature>
        <FeatureTitle>Listening Personality</FeatureTitle>
        <FeatureText>Discover your unique listening personality type</FeatureText>
      </Feature>
      <Feature>
        <FeatureTitle>Taste Evolution</FeatureTitle>
        <FeatureText>Track how your music taste changes over time</FeatureText>
      </Feature>
    </Features>
  </Login>
);

export default LoginScreen;
