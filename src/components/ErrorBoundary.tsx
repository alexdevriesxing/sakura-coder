import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="error-boundary" role="alert">
          <AlertTriangle size={48} style={{ color: '#ff506e', marginBottom: '16px' }} />
          <h2>Something went wrong</h2>
          <p style={{ marginBottom: '24px', color: 'var(--text-muted)', maxWidth: '400px' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button className="primary" onClick={this.handleReset} aria-label="Retry">
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
