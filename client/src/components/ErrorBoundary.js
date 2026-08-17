import React from 'react';

let _errKey = 0;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, mountKey: 0, lastPath: '' };
    this.recoverTimer = null;
    this.recoverAttempts = 0;
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  componentDidUpdate(prevProps, prevState) {
    const path = window.location.pathname;
    if (this.state.hasError && !prevState.hasError) {
      this.recoverAttempts++;
      if (this.recoverAttempts <= 3) {
        this.recoverTimer = setTimeout(() => {
          _errKey++;
          this.setState({ hasError: false, mountKey: _errKey, lastPath: path });
        }, 500);
      }
    }
    if (!this.state.hasError && path !== this.state.lastPath) {
      this.recoverAttempts = 0;
      this.setState({ lastPath: path });
    }
  }

  componentWillUnmount() {
    if (this.recoverTimer) clearTimeout(this.recoverTimer);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return <div key={this.state.mountKey}>{this.props.children}</div>;
  }
}

export default ErrorBoundary;
