import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';


type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <main className="font-inter h-screen overflow-hidden bg-[#fafbfc] text-slate-900">
      <div className="grid h-full w-full grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar />
        <div className="min-h-0 overflow-y-auto">{children ?? null}</div>
      </div>
    </main>
  );
}
