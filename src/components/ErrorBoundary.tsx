import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught rendering error:', error);
    if (errorInfo && errorInfo.componentStack) {
      console.error('[ErrorBoundary] Component Stack:\n' + errorInfo.componentStack);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white border border-[#E8E1D2] rounded-3xl shadow-md my-8 max-w-md mx-auto">
          <p className="text-xs sm:text-sm font-bold text-[#1D231E] mb-3">
            Something went wrong. Please refresh and try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#E06C38] hover:bg-[#d05c28] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
