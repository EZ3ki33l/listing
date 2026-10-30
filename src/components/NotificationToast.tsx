'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface NotificationToastProps {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  onClose: () => void;
}

export default function NotificationToast({ 
  type, 
  title, 
  message, 
  duration = 5000, 
  onClose 
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Attendre l'animation de sortie ; le délai est annulé au démontage (un toast remplacé ne doit pas fermer son successeur)
  const closeSoon = useCallback(() => {
    setIsVisible(false);
    closeTimer.current = setTimeout(onClose, 300);
  }, [onClose]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    const timer = setTimeout(closeSoon, duration);

    const progressTimer = setInterval(() => {
      setProgress(prev => Math.max(0, prev - 2));
    }, duration / 50);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [duration, closeSoon]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'info':
        return <Info className="w-6 h-6 text-razzmatazz" />;
      default:
        return <CheckCircle className="w-6 h-6 text-ink/60" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 shadow-green-100';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 shadow-red-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 shadow-yellow-100';
      case 'info':
        return 'bg-heliotrope/20 border-ink text-razzmatazz shadow-blue-100';
      default:
        return 'bg-heliotrope/20 border-ink text-ink shadow-gray-100';
    }
  };

  const getProgressColor = () => {
    switch (type) {
      case 'success':
        return 'bg-malachite !text-ink';
      case 'error':
        return 'bg-razzmatazz';
      case 'warning':
        return 'bg-heliotrope !text-ink';
      case 'info':
        return 'bg-ink';
      default:
        return 'bg-ink';
    }
  };

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`fixed top-4 right-4 z-[60] w-96  transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`rounded-none border-2 border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] backdrop-blur-sm ${getStyles()}`}>
        {/* Barre de progression */}
        <div className="h-1 w-full bg-gray-200 rounded-none overflow-hidden">
          <div 
            className={`h-full transition-all duration-100 ease-linear ${getProgressColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Contenu de la notification */}
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold mb-1">
                {title}
              </h4>
              {message && (
                <p className="text-sm whitespace-pre-line">
                  {message}
                </p>
              )}
            </div>

            <button
              aria-label="Fermer"
              onClick={closeSoon}
              className="flex-shrink-0 ml-2 p-1 rounded-none hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
