'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import NotificationToast from './NotificationToast';
import ConfirmModal from './ConfirmModal';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  type?: 'danger' | 'warning' | 'info';
}
interface Feedback {
  notify(type: ToastType, title: string, message?: string): void;
  confirm(opts: ConfirmOptions): Promise<boolean>;
}

const FeedbackContext = createContext<Feedback | null>(null);

export function useFeedback(): Feedback {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback doit être utilisé dans <FeedbackProvider>');
  return ctx;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  // Un seul toast visible à la fois : le dernier remplace le précédent
  const [toast, setToast] = useState<{ id: number; type: ToastType; title: string; message?: string } | null>(null);
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const nextId = useRef(0);

  const notify = useCallback<Feedback['notify']>((type, title, message) => {
    setToast({ id: nextId.current++, type, title, message });
  }, []);

  const closeToast = useCallback(() => setToast(null), []);

  const confirm = useCallback<Feedback['confirm']>(opts => {
    resolver.current?.(false); // une confirmation déjà ouverte est annulée
    return new Promise<boolean>(resolve => {
      resolver.current = resolve;
      setPending(opts);
    });
  }, []);

  const answer = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setPending(null);
  }, []);

  const value = useMemo(() => ({ notify, confirm }), [notify, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {toast && (
        <NotificationToast
          key={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={closeToast}
        />
      )}
      <ConfirmModal
        isOpen={pending !== null}
        title={pending?.title ?? ''}
        message={pending?.message ?? ''}
        confirmText={pending?.confirmText}
        type={pending?.type}
        onConfirm={() => answer(true)}
        onCancel={() => answer(false)}
      />
    </FeedbackContext.Provider>
  );
}
