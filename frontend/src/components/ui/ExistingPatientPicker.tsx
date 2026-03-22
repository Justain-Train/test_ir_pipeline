type ExistingPatient = {
  id: string;
  name: string;
  age: string;
};

type ExistingPatientPickerProps = {
  selectedExistingId: string;
  onSelect: (id: string) => void;
  selectedExistingPatient: ExistingPatient | null;
  patients: ExistingPatient[];
};

export function ExistingPatientPicker({
  selectedExistingId,
  onSelect,
  selectedExistingPatient,
  patients
}: ExistingPatientPickerProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="existing-patient" className="block text-sm font-medium text-slate-700">
          Select Patient
        </label>
        <select
          id="existing-patient"
          value={selectedExistingId}
          onChange={(event) => onSelect(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        >
          <option value="">Choose a patient</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name} ({patient.id})
            </option>
          ))}
        </select>
      </div>

      {selectedExistingPatient ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <span className="font-medium">Patient Name:</span> {selectedExistingPatient.name}
          </p>
          <p>
            <span className="font-medium">Age:</span> {selectedExistingPatient.age}
          </p>
          <p>
            <span className="font-medium">Patient ID:</span> {selectedExistingPatient.id}
          </p>
        </div>
      ) : null}
    </div>
  );
}
