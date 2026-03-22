import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary';
type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    'border border-slate-900 bg-slate-900 text-white hover:bg-slate-800 disabled:border-slate-300 disabled:bg-slate-300 disabled:text-white',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400'
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-sm'
};

export function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={[
        'rounded-lg font-medium transition disabled:cursor-not-allowed',
        variantClassMap[variant],
        sizeClassMap[size],
        fullWidth ? 'w-full' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')
        .trim()}
    />
  );
}
