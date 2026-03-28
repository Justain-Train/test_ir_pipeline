import { useState } from 'react';
import { Button } from '@/components/ui/Button';

type FileUploadSummaryProps = {
  transcript: string;
  filename: string;
  onClose?: () => void;
};

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

export function FileUploadSummary({ transcript, filename, onClose }: FileUploadSummaryProps) {
  const [summaryText, setSummaryText] = useState('');
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const N8N_SUMMARY_WEBHOOK_URL =
    (import.meta.env.VITE_N8N_SUMMARY_WEBHOOK_URL as string | undefined) ?? '';

  const handleGenerateSummary = async () => {
    if (!N8N_SUMMARY_WEBHOOK_URL) {
      setStatus('error');
      setError('Summary webhook URL is not configured. Set VITE_N8N_SUMMARY_WEBHOOK_URL in your .env file.');
      return;
    }

    if (!transcript.trim()) {
      setStatus('error');
      setError('No transcript available to summarize.');
      return;
    }

    setStatus('loading');
    setError(null);
    setSummaryText('');

    try {
      const response = await fetch(N8N_SUMMARY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      const responseText = await response.text();
      if (!responseText.trim()) {
        throw new Error(
          'n8n returned an empty response. Make sure the workflow is active and the "Respond to Webhook" node is configured.'
        );
      }

      let data: unknown;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `n8n returned invalid JSON. Raw response: "${responseText.slice(0, 200)}"`
        );
      }

      // Normalise — n8n may return the summary in various shapes
      const arr = Array.isArray(data) ? data : [data];
      const text = arr[0]?.summary_text ?? arr[0]?.summary ?? '';

      if (!text.trim()) {
        throw new Error('Received empty summary from n8n. Check your workflow execution.');
      }

      setSummaryText(text.trim());
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    }
  };

  const isLoading = status === 'loading';

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 p-4">
        <h3 className="font-semibold text-slate-900">File</h3>
        <p className="mt-1 text-sm text-slate-600">{filename}</p>
      </div>

      <div className="rounded-lg bg-slate-50 p-4">
        <h3 className="font-semibold text-slate-900">Transcript</h3>
        <p className="mt-2 max-h-48 overflow-y-auto text-sm text-slate-700 whitespace-pre-wrap">
          {transcript}
        </p>
      </div>

      {!summaryText && (
        <Button
          onClick={handleGenerateSummary}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Generating Summary...' : 'Generate AI Summary'}
        </Button>
      )}

      {summaryText && (
        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-900">AI Summary</h3>
          <p className="mt-2 text-sm text-blue-700 whitespace-pre-wrap">{summaryText}</p>
          <Button
            onClick={handleGenerateSummary}
            disabled={isLoading}
            variant="secondary"
            className="mt-3"
          >
            Regenerate Summary
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {onClose && (
        <Button
          onClick={onClose}
          variant="secondary"
          className="w-full"
        >
          Close
        </Button>
      )}
    </div>
  );
}
