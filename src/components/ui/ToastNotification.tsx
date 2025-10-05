import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastNotificationProps {
  toast: Toast;
  onClose: () => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-900/90',
          border: 'border-green-500',
          icon: CheckCircle,
          iconColor: 'text-green-400'
        };
      case 'error':
        return {
          bg: 'bg-red-900/90',
          border: 'border-red-500',
          icon: AlertCircle,
          iconColor: 'text-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-900/90',
          border: 'border-yellow-500',
          icon: AlertTriangle,
          iconColor: 'text-yellow-400'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-900/90',
          border: 'border-blue-500',
          icon: Info,
          iconColor: 'text-blue-400'
        };
    }
  };

  const styles = getToastStyles(toast.type);
  const Icon = styles.icon;

  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      className={`flex items-start space-x-3 p-4 rounded-lg border-l-4 backdrop-blur-lg shadow-2xl min-w-[320px] max-w-md transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      } ${styles.bg} ${styles.border}`}
      style={{
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <Icon className={`w-6 h-6 ${styles.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white mb-1">{toast.title}</h4>
        {toast.message && (
          <p className="text-sm text-gray-300 leading-relaxed">{toast.message}</p>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

// Toast Container Component
interface ToastContainerProps {
  toasts: Toast[];
  onRemoveToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification toast={toast} onClose={() => onRemoveToast(toast.id)} />
        </div>
      ))}
    </div>
  );
};

// Toast Hook
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const success = (title: string, message?: string, duration?: number) => {
    addToast({ type: 'success', title, message, duration });
  };

  const error = (title: string, message?: string, duration?: number) => {
    addToast({ type: 'error', title, message, duration });
  };

  const info = (title: string, message?: string, duration?: number) => {
    addToast({ type: 'info', title, message, duration });
  };

  const warning = (title: string, message?: string, duration?: number) => {
    addToast({ type: 'warning', title, message, duration });
  };

  return {
    toasts,
    removeToast,
    success,
    error,
    info,
    warning
  };
};

export default ToastNotification;
