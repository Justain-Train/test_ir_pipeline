import { useMemo, useState } from 'react';
import Header from '@/components/ui/Header';
import { SessionModeToggle } from '@/components/ui/SessionModeToggle';
import { ExistingPatientPicker } from '@/components/ui/ExistingPatientPicker';
import { SessionActions } from '@/components/ui/SessionActions';
import { LiveTranscriptionPreview } from '@/components/ui/LiveTranscriptionPreview';
import { NewPatientModal } from '@/components/ui/NewPatientModal';
import { useLiveTranscription } from '@/hooks/useLiveTranscription';

type ExistingPatient = {
  id: string;
  name: string;
  age: string;
};

type SessionPatient = {
  id: string;
  name: string;
  age: string;
};

const EXISTING_PATIENTS: ExistingPatient[] = [
  { id: 'PT-1032', name: 'Ava Brown', age: '42' },
  { id: 'PT-2047', name: 'Noah Wilson', age: '57' },
  { id: 'PT-3198', name: 'Mia Johnson', age: '36' }
];

function generatePatientId() {
  const randomNumber = Math.floor(Math.random() * 10000);
  return `P-${String(randomNumber).padStart(4, '0')}`;
}

export default function LiveSession() {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedExistingId, setSelectedExistingId] = useState('');
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [patientId, setPatientId] = useState('');

  const [startedPatient, setStartedPatient] = useState<SessionPatient | null>(null);

  // Use the transcription hook
  const { transcript, isRecording, isFinished, error, sessionID, startSession: startTranscription, finishSession: finishTranscription, resetSession } = useLiveTranscription();

  const selectedExistingPatient = useMemo(
    () => EXISTING_PATIENTS.find((patient) => patient.id === selectedExistingId) ?? null,
    [selectedExistingId]
  );

  const isNewPatientValid =
    patientName.trim().length > 0 && age.trim().length > 0 && patientId.trim().length > 0;

  const isStartDisabled =
    mode === 'existing' ? selectedExistingPatient === null : !isNewPatientValid;

  const handleStartSession = async () => {
    let patient: SessionPatient | null = null;

    if (mode === 'existing' && selectedExistingPatient) {
      patient = {
        id: selectedExistingPatient.id,
        name: selectedExistingPatient.name,
        age: selectedExistingPatient.age,
      };
    } else if (mode === 'new' && isNewPatientValid) {
      patient = {
        id: patientId.trim(),
        name: patientName.trim(),
        age: age.trim(),
      };
    }

    if (patient) {
      setStartedPatient(patient);
      try {
        await startTranscription(patient);
      } catch (err) {
        console.error('Failed to start transcription:', err);
        // Error is handled in the hook and displayed in the UI
      }
    }
  };

  const handleFinishSession = async () => {
    try {
      await finishTranscription();
      // After finishing, show option to reset
      setTimeout(() => {
        // User can now see the final transcript and success message
      }, 1000);
    } catch (err) {
      console.error('Failed to finish session:', err);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      // If recording, confirm before canceling
      if (confirm('Are you sure you want to cancel the session? Audio will be lost.')) {
        resetSession();
        setSelectedExistingId('');
        setPatientName('');
        setAge('');
        setPatientId('');
        setShowNewPatientModal(false);
        setStartedPatient(null);
        setMode('existing');
      }
    } else {
      // If not recording, just reset
      resetSession();
      setSelectedExistingId('');
      setPatientName('');
      setAge('');
      setPatientId('');
      setShowNewPatientModal(false);
      setStartedPatient(null);
      setMode('existing');
    }
  };

  const openNewPatientModal = () => {
    setMode('new');
    setPatientId(generatePatientId());
    setShowNewPatientModal(true);
  };

  const saveNewPatientDetails = () => {
    if (!isNewPatientValid) {
      return;
    }
    setShowNewPatientModal(false);
  };

  return (
    <main className="flex min-h-full items-start justify-center bg-slate-100 px-6 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <Header
          title="Start New Session"
          description="Enter patient details to begin transcription"
        />

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-6">
            <SessionModeToggle
              mode={mode}
              onExistingClick={() => {
                setMode('existing');
                setShowNewPatientModal(false);
              }}
              onNewClick={openNewPatientModal}
            />

            {mode === 'existing' ? (
              <ExistingPatientPicker
                selectedExistingId={selectedExistingId}
                onSelect={setSelectedExistingId}
                selectedExistingPatient={selectedExistingPatient}
                patients={EXISTING_PATIENTS}
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                New patient selected. Click "New Patient" to open and complete the form.
              </div>
            )}

            


            <SessionActions
              isStartDisabled={isStartDisabled || isRecording || isFinished}
              onCancel={handleCancel}
              onStartSession={handleStartSession}
            />
          </div>
        </section>

        {startedPatient ? (
          <LiveTranscriptionPreview
            startedPatient={startedPatient}
            transcript={transcript}
            isRecording={isRecording}
            isFinished={isFinished}
            error={error}
            sessionID={sessionID}
            onFinishSession={handleFinishSession}
          />
        ) : null}
      </div>

      <NewPatientModal
        show={showNewPatientModal}
        patientName={patientName}
        age={age}
        patientId={patientId}
        isValid={isNewPatientValid}
        onPatientNameChange={setPatientName}
        onAgeChange={setAge}
        onCancel={() => setShowNewPatientModal(false)}
        onSave={saveNewPatientDetails}
      />
    </main>
  );
}
