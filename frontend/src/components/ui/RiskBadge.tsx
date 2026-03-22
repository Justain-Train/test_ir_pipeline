type RiskLevel = 'high' | 'medium' | 'low';

interface RiskBadgeProps {
  label: string;
  level: RiskLevel;
}

export function RiskBadge({ label, level }: RiskBadgeProps) {
  const styles: Record<RiskLevel, string> = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-sky-50 text-sky-700 border-sky-200'
  };

  const dot: Record<RiskLevel, string> = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-sky-500'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[level]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[level]}`} />
      {label}
    </span>
  );
}
