import React, { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Hook de telemetria. Por padrão é no-op; quando o Sentry for plugado
 * (Fase G), basta substituir este corpo por:
 *   import * as Sentry from '@sentry/react';
 *   Sentry.captureException(error, { extra: errorInfo });
 */
function reportError(error: Error, errorInfo: ErrorInfo) {
  // eslint-disable-next-line no-console
  console.error('[ErrorBoundary]', error, errorInfo);
}

interface Props {
  children: ReactNode;
  /** Permite trocar o reporter em testes/Sentry. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    (this.props.onError ?? reportError)(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid flex-col place-items-center bg-background text-foreground p-8">
          <div className="bg-card p-6 rounded-xl border border-destructive shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-bold text-destructive mb-2">Ops! Ocorreu um erro inesperado.</h2>
            <p className="text-sm text-muted-foreground mb-4">
              A tela ficou em branco devido a este erro:
            </p>
            <pre className="bg-muted p-4 rounded text-xs overflow-auto text-red-400 font-mono">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-primary text-primary-foreground py-2 rounded font-bold hover:bg-primary/90"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
