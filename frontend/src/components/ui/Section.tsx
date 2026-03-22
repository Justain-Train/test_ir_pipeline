import type { ReactNode } from 'react';

type SectionProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function Section({ title, subtitle, children, className = '' }: SectionProps) {
  return (
    <section className={['space-y-4', className].filter(Boolean).join(' ')}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
          {subtitle ? <p className="text-md text-slate-400">{subtitle}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}