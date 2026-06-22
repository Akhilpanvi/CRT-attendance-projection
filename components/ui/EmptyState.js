'use client';
import { FadeIn } from './motion';

/**
 * Designed empty state — icon medallion, title, supporting copy, optional action.
 * Use anywhere data is absent so the UI never shows a bare blank.
 */
export default function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <FadeIn className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
      <div className="w-12 h-12 rounded-2xl grid place-items-center mb-4 bg-bg-elevated border border-line text-fg-subtle">
        {icon || (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
        )}
      </div>
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 text-xs leading-relaxed text-fg-subtle max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </FadeIn>
  );
}
