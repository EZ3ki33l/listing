'use client';

import { AlertTriangle, X } from 'lucide-react';
import Modal from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmModalProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'text-red-500',
          confirmButton: 'bg-razzmatazz hover:bg-ink focus:ring-red-500',
          title: 'text-red-800'
        };
      case 'warning':
        return {
          icon: 'text-yellow-500',
          confirmButton: 'bg-heliotrope !text-ink hover:bg-yellow-700 focus:ring-yellow-500',
          title: 'text-yellow-800'
        };
      case 'info':
        return {
          icon: 'text-razzmatazz',
          confirmButton: 'bg-ink hover:bg-ink focus:ring-razzmatazz',
          title: 'text-razzmatazz'
        };
      default:
        return {
          icon: 'text-yellow-500',
          confirmButton: 'bg-heliotrope !text-ink hover:bg-yellow-700 focus:ring-yellow-500',
          title: 'text-yellow-800'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <Modal open={isOpen} onClose={onCancel} labelledBy="confirm-modal-title">
      <div className="relative w-full max-w-lg overflow-hidden rounded-none bg-white text-left border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] transition-all">
        {/* Header */}
        <div className="bg-heliotrope/20 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
              <h3 id="confirm-modal-title" className={`text-lg font-semibold ${styles.title}`}>
                {title}
              </h3>
            </div>
            <button
              aria-label="Fermer"
              onClick={onCancel}
              className="rounded-none bg-white text-ink/60 hover:text-ink/60 focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:ring-offset-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-none bg-heliotrope/20 sm:mx-0 sm:h-10 sm:w-10">
              <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <p className="text-sm text-ink/60">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-heliotrope/20 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
          <button
            type="button"
            className={`inline-flex w-full justify-center rounded-none px-3 py-2 text-sm font-semibold text-white border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] sm:ml-3 sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.confirmButton}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button
            type="button"
            className="mt-3 inline-flex w-full justify-center rounded-none bg-white px-3 py-2 text-sm font-semibold text-ink border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] ring-1 ring-inset ring-gray-300 hover:bg-heliotrope/20 sm:mt-0 sm:w-auto focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:ring-offset-2"
            onClick={onCancel}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
