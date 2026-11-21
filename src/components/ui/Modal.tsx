import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    full: 'max-w-full mx-4',
  };
  
  return (
    <div className="modal-overlay animate-fadeIn">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div
        className={`modal-content relative ${sizeClasses[size]} animate-slideUp`}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Dialog'}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
