import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md p-6 bg-white rounded-3xl border border-red-200 shadow-sm flex flex-col items-center gap-3">
            <span className="text-4xl">⚠️</span>
            <h2 className="text-lg font-bold text-[#121c2c]">Terjadi Kendala pada Halaman</h2>
            <p className="text-xs text-[#555] leading-relaxed">
              Komponen aplikasi menemui kendala teknis saat memuat data.
            </p>
            {this.state.error?.message && (
              <div className="w-full p-2.5 rounded-xl bg-red-50 text-[11px] font-mono text-red-700 text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-2 px-5 py-2 rounded-full text-xs font-bold text-white bg-[#253f8a] hover:bg-[#1a2c63] transition shadow-sm"
            >
              🔄 Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

