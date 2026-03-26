import { useState } from 'react';
import { Button } from './Button';
import { SessionSummary } from './SessionSummary';

type SessionPatient = {
  id: string;
  name: string;
  age: string;
};

type LiveTranscriptionPreviewProps = {
  startedPatient: SessionPatient;
  transcript: string;
  isRecording: boolean;
  isFinished: boolean;
  error: string | null;
  sessionID: string | null;
  onFinishSession: () => Promise<void>;
};

export function LiveTranscriptionPreview({
  startedPatient,
  transcript,
  isRecording,
  isFinished,
  error,
  sessionID,
  onFinishSession,
}: LiveTranscriptionPreviewProps) {
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await onFinishSession();
    } catch (err) {
      console.error('Error finishing session:', err);
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Live Transcription</h2>
          <p className="text-sm text-slate-600">
            {startedPatient.name} • Age {startedPatient.age} • {startedPatient.id}
          </p>
        </div>
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 animate-pulse rounded-full bg-red-500"></div>
            <span className="text-sm font-medium text-red-600">Recording</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Transcript display */}
      <div className="mb-4 h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm">
        {transcript ? (
          <div className="space-y-1">
            {transcript.split('\n').map((line, i) => {
              const isPartial = line.startsWith('> ');
              const display = isPartial ? line.slice(2) : line;
              return (
                <p key={i} className={isPartial ? 'text-slate-400 italic' : 'text-slate-900'}>
                  {display}
                </p>
              );
            })}
          </div>
        ) : isRecording ? (
          <p className="text-slate-500">Waiting for audio...</p>
        ) : (
          <p className="text-slate-500">No transcript yet.</p>
        )}
      </div>

      {/* Finish button */}
      {isRecording && !isFinished && (
        <button
          onClick={handleFinish}
          disabled={isFinishing}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-slate-400"
        >
          {isFinishing ? 'Finishing...' : 'Finish Session'}
        </button>
      )}

      {/* Success message */}
      {isFinished && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-700">Session finished successfully!</p>
          <p className="mt-1 text-xs text-green-600">Transcript sent to n8n webhook.</p>
        </div>
      )}

      {/* AI Summary — available after session finishes */}
      {isFinished && transcript && (
        <SessionSummary transcript={transcript} transcriptId={sessionID} />
      )}
    </section>
  );
}
