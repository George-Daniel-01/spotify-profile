import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const FadeIn = styled.div`
  animation: ${fadeIn} 0.4s ease forwards;
`;

const PageTransition = ({ children }) => <FadeIn key={window.location.pathname}>{children}</FadeIn>;

export default PageTransition;
