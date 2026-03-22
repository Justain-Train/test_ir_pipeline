import { Button } from '@/components/ui/Button';

type SessionModeToggleProps = {
  mode: 'existing' | 'new';
  onExistingClick: () => void;
  onNewClick: () => void;
};

export function SessionModeToggle({ mode, onExistingClick, onNewClick }: SessionModeToggleProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">Patient Type</label>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant={mode === 'existing' ? 'primary' : 'secondary'}
          onClick={onExistingClick}
        >
          Existing Patient
        </Button>
        <Button
          type="button"
          variant={mode === 'new' ? 'primary' : 'secondary'}
          onClick={onNewClick}
        >
          New Patient
        </Button>
      </div>
    </div>
  );
}
