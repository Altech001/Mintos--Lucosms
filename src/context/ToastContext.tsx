import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message: string;
}

interface ToastContextType {
    showToast: (type: ToastType, title: string, message: string) => void;
    showSuccessToast: (message: string) => void;
    showErrorToast: (message: string) => void;
    showInfoToast: (message: string) => void;
    showWarningToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, title: string, message: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: Toast = { id, type, title, message };

        setToasts((prev) => [...prev, newToast]);

        // Auto remove after 4 seconds
        setTimeout(() => {
            removeToast(id);
        }, 4000);
    }, [removeToast]);

    const showSuccessToast = useCallback((message: string) => {
        showToast('success', 'Success', message);
    }, [showToast]);

    const showErrorToast = useCallback((message: string) => {
        showToast('error', 'Error', message);
    }, [showToast]);

    const showInfoToast = useCallback((message: string) => {
        showToast('info', 'Info', message);
    }, [showToast]);

    const showWarningToast = useCallback((message: string) => {
        showToast('warning', 'Warning', message);
    }, [showToast]);

    const getToastStyles = (type: ToastType) => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-white dark:bg-gray-900',
                    border: 'border-green-200 dark:border-green-900',
                    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
                    progress: 'bg-green-500',
                };
            case 'error':
                return {
                    bg: 'bg-white dark:bg-gray-900',
                    border: 'border-red-200 dark:border-red-900',
                    icon: <AlertCircle className="w-5 h-5 text-red-500" />,
                    progress: 'bg-red-500',
                };
            case 'warning':
                return {
                    bg: 'bg-white dark:bg-gray-900',
                    border: 'border-yellow-200 dark:border-yellow-900',
                    icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
                    progress: 'bg-yellow-500',
                };
            case 'info':
                return {
                    bg: 'bg-white dark:bg-gray-900',
                    border: 'border-blue-200 dark:border-blue-900',
                    icon: <Info className="w-5 h-5 text-blue-500" />,
                    progress: 'bg-blue-500',
                };
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, showSuccessToast, showErrorToast, showInfoToast, showWarningToast }}>
            {children}

            {/* Toast Container - Top Center of Screen */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none">
                <div className="flex flex-col gap-3 items-center min-w-[320px] max-w-md">
                    {toasts.map((toast) => {
                        const styles = getToastStyles(toast.type);
                        return (
                            <div
                                key={toast.id}
                                className={`${styles.bg} ${styles.border} border shadow-2xl rounded p-4 min-w-[320px] max-w-md pointer-events-auto animate-in fade-in slide-in-from-top-5 duration-300`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {styles.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                                            {toast.title}
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-tight">
                                            {toast.message}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeToast(toast.id)}
                                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${styles.progress} animate-progress`}
                                        style={{ animation: 'progress 4s linear forwards' }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Add keyframes for progress animation */}
            <style>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-progress {
          animation: progress 4s linear forwards;
        }
      `}</style>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
