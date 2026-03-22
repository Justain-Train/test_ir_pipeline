type EntityType = 'condition' | 'medication' | 'symptom';

interface EntityPillProps {
  label: string;
  type: EntityType;
}

export function EntityPill({ label, type }: EntityPillProps) {
  const styles: Record<EntityType, string> = {
    condition: 'bg-violet-50 text-violet-700 border-violet-200',
    medication: 'bg-blue-50 text-blue-700 border-blue-200',
    symptom: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${styles[type]}`}>
      {label}
    </span>
  );
}
