import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-rose-500 bg-rose-50 dark:bg-rose-950/20 m-4 rounded-lg border border-rose-200 dark:border-rose-900">
          <h2 className="text-xl font-bold mb-4">React Render Crash</h2>
          <pre className="text-xs overflow-auto p-4 bg-black/10 rounded">
            {this.state.error?.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
