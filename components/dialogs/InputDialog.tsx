"use client";

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface InputDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: (value: string) => void | Promise<void>;
  onClose: () => void;
}

export function InputDialog({
  isOpen,
  title,
  message,
  placeholder,
  defaultValue = '',
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onSubmit,
  onClose,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValue(defaultValue);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-500"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {message && <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSubmit();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={isSubmitting}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => void handleSubmit()}
            className="px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition-colors disabled:opacity-60"
            disabled={isSubmitting || !value.trim()}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
