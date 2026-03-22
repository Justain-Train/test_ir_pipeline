import { SidebarNavItem } from '@/components/ui/SidebarNavItem';
import { useLocation } from 'react-router-dom';
import dashboardIcon from '@/public/dashboardicon.svg';
import newSessionIcon from '@/public/newsessionicon.svg';
import audioIcon from '@/public/audioicon.svg';

const primaryNavItems = [

    { label: 'New Session', src: '/live-session', icon: newSessionIcon },
    { label: 'Upload Audio', src: '/upload-audio', icon: audioIcon },
];

export default function Sidebar() {
    const { pathname } = useLocation();

    const isActive = (src: string) => {
        if (src === '/') {
            return pathname === '/';
        }

        return pathname === src || pathname.startsWith(`${src}/`);
    };

    return (
        <aside className="flex h-full flex-col border-r border-slate-200 bg-[#f5f6f8] px-4 py-5 md:px-5 md:py-6">
            <div className="mb-8 space-y-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Menu</p>
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                    <h1 className="text-sm font-semibold text-slate-700">IRIS Health</h1>
                </div>
            </div>

            <nav className="space-y-5">
                <SidebarNavItem label="Dashboard" active={isActive('/')} src= "/" icon={dashboardIcon} />
                {primaryNavItems.map((item) => (
                    <SidebarNavItem key={item.label} label={item.label} src={item.src} active={isActive(item.src)} icon={item.icon} />
                ))}
              
            </nav>
        </aside>
    );
}