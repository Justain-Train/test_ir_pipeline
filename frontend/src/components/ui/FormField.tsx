type FormFieldProps = {
  id: string;
  label: string;
  type?: 'text' | 'number';
  value: string;
  min?: string;
  onChange: (value: string) => void;
};

export function FormField({ id, label, type = 'text', value, min, onChange }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        min={type === 'number' ? min : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}
