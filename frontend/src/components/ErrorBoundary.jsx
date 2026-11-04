import React from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] p-6 sm:p-10 flex items-center justify-center">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Đã xảy ra sự cố hiển thị
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trang web gặp sự cố nhỏ khi kết xuất dữ liệu. Bạn có thể bấm tải lại trang hoặc quay về trang chủ.
            </p>

            {this.state.error && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] font-mono text-slate-500 dark:text-slate-400 text-left overflow-x-auto max-h-24">
                {String(this.state.error?.message || this.state.error)}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Tải lại trang</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Trang chủ</span>
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
