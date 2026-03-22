type BadgeVariant = 'neutral' | 'active';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  className?: string;
};

export function Badge({ label, variant = 'neutral', className = '' }: BadgeProps) {
  const variantClassName =
    variant === 'active'
      ? 'border-slate-900 bg-slate-900 text-white'
      : 'border-slate-200 bg-white text-slate-600';

  return (
    <span
      className={[
        'inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium tracking-wide',
        variantClassName,
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  );
}