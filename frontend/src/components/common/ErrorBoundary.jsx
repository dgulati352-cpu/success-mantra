import React from 'react';
import { AlertTriangle, RefreshCw, Home, Phone, HelpCircle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, correlationId: null };
  }

  static getDerivedStateFromError(error) {
    const correlationId = 'ERR-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    return { hasError: true, error, correlationId };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Exception caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  handleClearAndLogin = () => {
    localStorage.removeItem('sm_token');
    sessionStorage.clear();
    window.location.href = '/auth/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8faff] flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl">
            
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>

            <div className="space-y-1.5">
              <span className="font-mono font-bold text-[11px] uppercase tracking-widest text-rose-600">
                Application Error (500)
              </span>
              <h1 className="text-2xl font-black text-slate-900">
                Something Went Wrong
              </h1>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                An unexpected interface exception occurred. Your learning progress has been saved.
              </p>
            </div>

            {/* Correlation ID & Error Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 font-mono space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <span>Incident: <strong className="text-slate-900">{this.state.correlationId || 'ERR-RECOVERABLE'}</strong></span>
              </div>
              {this.state.error && (
                <div className="pt-1.5 border-t border-slate-200 text-rose-700 font-sans text-xs">
                  <div className="font-semibold">Reason: {this.state.error.message || String(this.state.error)}</div>
                  {this.state.error.stack && (
                    <details className="mt-1">
                      <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-800">Technical Trace</summary>
                      <pre className="mt-1 text-[9px] text-slate-600 font-mono overflow-x-auto max-h-32 p-1.5 bg-slate-100 rounded">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Recovery Actions */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={this.handleReload}
                className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Reload Current Page
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={this.handleClearAndLogin}
                  className="py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-Login
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="py-3 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" /> Homepage
                </button>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400">
              Need assistance? Contact our helpline at{' '}
              <a href="tel:+918755910352" className="text-indigo-600 font-semibold underline">
                +91 87559 10352
              </a>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
