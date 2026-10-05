import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { theme, mixins, Main } from '../styles';

const { colors, spacing, fontSizes } = theme;

const Fallback = styled(Main)`
  ${mixins.flexCenter};
  flex-direction: column;
  text-align: center;
  padding: 80px 20px;
`;
const Title = styled.h2`
  font-size: ${fontSizes.xxl};
  margin: 0 0 ${spacing.sm};
`;
const Text = styled.p`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.md};
  margin: 0 0 ${spacing.lg};
`;
const RetryButton = styled.button`
  ${mixins.greenButton};
  font-size: ${fontSizes.base};
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry() {
    this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <Fallback role="alert">
          <Title>Something went wrong.</Title>
          <Text>We couldn't display this page. Please try again.</Text>
          <RetryButton type="button" onClick={this.handleRetry}>
            Try again
          </RetryButton>
        </Fallback>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};

export default ErrorBoundary;