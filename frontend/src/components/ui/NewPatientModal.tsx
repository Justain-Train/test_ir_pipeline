import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';

type NewPatientModalProps = {
  show: boolean;
  patientName: string;
  age: string;
  patientId: string;
  isValid: boolean;
  onPatientNameChange: (value: string) => void;
  onAgeChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function NewPatientModal({
  show,
  patientName,
  age,
  patientId,
  isValid,
  onPatientNameChange,
  onAgeChange,
  onCancel,
  onSave
}: NewPatientModalProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">New Patient Details</h2>
          <p className="text-sm text-slate-500">Enter required details to continue</p>
        </div>

        <div className="space-y-4">
          <FormField
            id="patient-name"
            label="Patient Name"
            value={patientName}
            onChange={onPatientNameChange}
          />
          <FormField
            id="patient-age"
            label="Age"
            type="number"
            min="0"
            value={age}
            onChange={onAgeChange}
          />

          <div className="space-y-2">
            <label htmlFor="patient-id" className="block text-sm font-medium text-slate-700">
              Patient ID
            </label>
            <input
              id="patient-id"
              type="text"
              value={patientId}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700 outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={!isValid}>
            Save Details
          </Button>
        </div>
      </div>
    </div>
  );
}
