import { Button } from '@/components/ui/Button';

type StartSessionButtonProps = {
  onStart: () => Promise<void>;
  disabled: boolean;
};

export function StartSessionButton({ onStart, disabled }: StartSessionButtonProps) {
  return (
    <Button
      type="button"
      className="mt-4"
      onClick={() => {
        void onStart();
      }}
      disabled={disabled}
    >
      Start Medical Session
    </Button>
  );
}
