import React, { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Causeway Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReload = () => {
    localStorage.removeItem('causeway-autosave');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h1>

            <p className="text-gray-600 text-sm mb-6">
              Causeway encountered an unexpected error. Your work may have been auto-saved.
            </p>

            {this.state.error && (
              <div className="bg-gray-50 rounded p-3 mb-6 text-left">
                <p className="text-xs font-mono text-gray-500 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleReload}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleClearAndReload}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300"
              >
                Clear Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
