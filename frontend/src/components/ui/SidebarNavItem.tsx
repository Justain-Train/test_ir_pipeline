import { Link } from "react-router-dom";

type SidebarNavItemProps = {
  label: string;
  src: string;
  icon: string;
  active?: boolean;
};

export function SidebarNavItem({ label, src, icon, active = false }: SidebarNavItemProps) {
  return (
    <Link to={src}>
      <button
      type="button"
      className={[
        'w-full rounded-xl border px-3.5 py-3 mb-3 text-left transition-colors',
        active
          ? 'border-slate-900 bg-slate-900 text-white shadow-sm shadow-slate-900/10'
          : 'border-transparent bg-transparent text-slate-500 hover:bg-white hover:text-slate-700'
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <img src={icon} alt={label} className={active ? 'text-green-500' : 'text-slate-400'} />
        <span className="text-sm font-medium tracking-[0.01em] ">{label}</span>
      </div>
      </button>
    </Link>
  );
}