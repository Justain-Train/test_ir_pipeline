import type { ReactNode } from 'react';

type CardProps = {
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Card({ title, subtitle, rightSlot, children, className = '' }: CardProps) {
  return (
    <article
      className={[
        'rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(title || subtitle || rightSlot) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            {title ? <h3 className="text-sm font-semibold text-slate-800">{title}</h3> : null}
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          {rightSlot}
        </header>
      )}
      <div className="flex-1">{children}</div>
    </article>
  );
}