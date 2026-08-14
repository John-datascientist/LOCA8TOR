import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

// Shows the actual error message on screen instead of a blank white page.
// Mainly useful for diagnosing bugs reported by phone-only users who have no
// way to open browser dev tools — the error text itself becomes the bug
// report (they can screenshot/copy it directly).
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 m-3 rounded-lg bg-destructive/10 ring-1 ring-destructive/40 text-destructive">
          <p className="font-heading font-bold text-sm mb-2">Something went wrong</p>
          <p className="text-xs font-mono whitespace-pre-wrap break-words">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 text-xs font-semibold underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
