'use client';
import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  return { toast, show };
}

export function Toast({ toast }) {
  if (!toast) return null;
  const colors = {
    success: 'bg-green-600',
    error:   'bg-red-600',
    info:    'bg-purple-700',
  };
  return (
    <div className={`fixed bottom-5 right-5 z-50 ${colors[toast.type] || 'bg-gray-800'}
      text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium
      animate-[fadeUp_0.3s_ease] max-w-xs`}>
      {toast.message}
    </div>
  );
}
