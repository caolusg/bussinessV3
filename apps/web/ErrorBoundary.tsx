import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    const { error, errorInfo } = this.state;
    if (error) {
      return (
        <div style={{ padding: 24, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>App Render Error</h1>
          <div style={{ whiteSpace: 'pre-wrap', color: '#b91c1c' }}>
            {error.message}
          </div>
          {errorInfo?.componentStack && (
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12, color: '#374151' }}>
              {errorInfo.componentStack}
            </pre>
          )}
          {error.stack && (
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12, color: '#111827' }}>
              {error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
