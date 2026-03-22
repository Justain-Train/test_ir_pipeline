import { Button } from '@/components/ui/Button';

type SessionActionsProps = {
  isStartDisabled: boolean;
  onCancel: () => void;
  onStartSession: () => void;
};

export function SessionActions({ isStartDisabled, onCancel, onStartSession }: SessionActionsProps) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" onClick={onStartSession} disabled={isStartDisabled}>
        Start Session
      </Button>
    </div>
  );
}
