import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('[ErrorBoundary] Erro capturado na interface:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#FFD100] mb-5 shadow-2xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          
          <h1 className="text-xl font-black tracking-wide text-white mb-2">
            Algo inesperado aconteceu
          </h1>
          
          <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
            O aplicativo MP CARGAS encontrou uma instabilidade temporária. Seus dados e registros offline estão protegidos.
          </p>

          <button
            onClick={this.handleReset}
            className="px-6 py-3.5 rounded-2xl bg-[#FFD100] hover:bg-[#E6BC00] text-black font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#FFD100]/20 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recarregar Aplicativo</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
