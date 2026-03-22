import type { ReactNode } from 'react';

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-label text-slate-400 mb-3">{children}</p>;
}
