import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

// ============================================================================
// Types
// ============================================================================

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

type QAEntry = {
  question: string;
  answer: string;
  supportingTurns: SupportingTurn[];
  safetyNote: string;
};

type SupportingTurn = {
  rank: number | null;
  role: string | null;
  turn_id: string | null;
  turn_index: number | null;
  start_ms: number | null;
  end_ms: number | null;
  content: string | null;
};

// ============================================================================
// Config
// ============================================================================

const N8N_SUMMARY_WEBHOOK_URL =
  (import.meta.env.VITE_N8N_SUMMARY_WEBHOOK_URL as string | undefined) ?? '';

const N8N_QA_WEBHOOK_URL =
  (import.meta.env.VITE_N8N_QA_WEBHOOK_URL as string | undefined) ?? '';

// ============================================================================
// Component
// ============================================================================

type SessionSummaryProps = {
  transcript: string;
  transcriptId: string | null;
};

export function SessionSummary({ transcript, transcriptId }: SessionSummaryProps) {
  // ── Summary state ──
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [summaryText, setSummaryText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Q&A state ──
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);
  const [qaStatus, setQaStatus] = useState<FetchStatus>('idle');
  const [qaError, setQaError] = useState<string | null>(null);
  const qaInputRef = useRef<HTMLInputElement>(null);

  const isLoading = status === 'loading';
  const isQaLoading = qaStatus === 'loading';

  // ────────────────────────────────────────────────────────────────────────
  // Generate / Regenerate Summary
  // ────────────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!N8N_SUMMARY_WEBHOOK_URL) {
      setStatus('error');
      setErrorMessage(
        'Summary webhook URL is not configured. Set VITE_N8N_SUMMARY_WEBHOOK_URL in your .env file.'
      );
      return;
    }

    if (!transcript.trim()) {
      setStatus('error');
      setErrorMessage('No transcript available to summarize.');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);
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
      const text = arr[0]?.summary_text ?? '';

      console.log('Received summary response from n8n:', arr[0]);

      if (!text.trim()) {
        throw new Error('Received empty summary from n8n. Check your workflow execution.');
      }

      setSummaryText(text.trim());
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate summary');
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // Ask a Follow-up Question
  // ────────────────────────────────────────────────────────────────────────

  const handleAskQuestion = async () => {
    const trimmed = question.trim();

    if (!trimmed) return;

    const webhookUrl = N8N_QA_WEBHOOK_URL;

    if (!webhookUrl) {
      setQaStatus('error');
      setQaError(
        'Q&A webhook URL is not configured. Set VITE_N8N_QA_WEBHOOK_URL (or VITE_N8N_SUMMARY_WEBHOOK_URL) in your .env file.'
      );
      return;
    }

    setQaStatus('loading');
    setQaError(null);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          scope: 'combined',
          k: 5,
          transcript_id: transcriptId,
        }),
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

      // n8n returns an array; grab the first item
      const raw: Record<string, unknown> =
        (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;

      const answer = String(
        raw.answer_text ?? raw.text ?? raw.response ?? raw.output ?? ''
      );
      const supportingTurns: SupportingTurn[] = Array.isArray(raw.supporting_turns)
        ? raw.supporting_turns
        : [];
      const safetyNote = String(raw.safety_note ?? '');

      console.log('QA response from n8n:', raw);

      if (!answer.trim()) {
        throw new Error('Received empty answer from n8n. Check your workflow execution.');
      }

      // Replace the summary with the Q&A answer
      setSummaryText(answer.trim());
      setStatus('success');

      // Also keep it in the Q&A history
      setQaHistory((prev) => [
        ...prev,
        { question: trimmed, answer: answer.trim(), supportingTurns, safetyNote },
      ]);
      setQuestion('');
      setQaStatus('success');

      // Re-focus the input for rapid follow-ups
      qaInputRef.current?.focus();
    } catch (err) {
      setQaStatus('error');
      setQaError(err instanceof Error ? err.message : 'Failed to get answer');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isQaLoading) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  return (
    <div className="mt-6 space-y-4">
      {/* ── Divider ── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
          AI Summary
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* ── Generate button ── */}
      <Button type="button" fullWidth disabled={isLoading} onClick={handleGenerate}>
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating Summary…
          </span>
        ) : status === 'success' ? (
          'Regenerate Summary'
        ) : (
          'Generate Summary'
        )}
      </Button>

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <div className="space-y-2.5 rounded-xl border border-slate-100 bg-white p-5 animate-pulse">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-5/6 rounded bg-slate-100" />
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="h-4 w-2/3 rounded bg-slate-100" />
        </div>
      )}

      {/* ── Summary error ── */}
      {status === 'error' && errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-red-400">✕</span>
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ── Summary / Answer result card ── */}
      {status === 'success' && summaryText && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
            <span className="text-sm">{qaHistory.length > 0 ? '💬' : '🧠'}</span>
            <span className="text-xs font-medium text-slate-500">
              {qaHistory.length > 0 ? 'AI Answer' : 'Session Summary'}
            </span>
          </div>
          <div className="p-5">
            <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
              {summaryText}
            </p>
          </div>
        </div>
      )}

      {/* ── Q&A History ── */}
      {qaHistory.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
              Q&A History
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
            </h4>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {qaHistory.map((entry, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="mb-2 flex items-start gap-2 text-sm font-medium text-slate-700">
                  <span className="mt-0.5 shrink-0 text-blue-500">Q:</span>
                  {entry.question}
                </p>
                <p className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                  <span className="mt-0.5 shrink-0 text-green-500">A:</span>
                  <span className="whitespace-pre-wrap">{entry.answer}</span>
                </p>


                {/* Safety note */}
                {entry.safetyNote && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600">
                    <span>⚠️</span> {entry.safetyNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ask a Follow-up Question ── */}
      {status === 'success' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
              Ask a Question
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
            </h4>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          </div>

          <div className="flex gap-2">
            <input
              ref={qaInputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the session transcript…"
              disabled={isQaLoading}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
            />
            <Button
              type="button"
              disabled={isQaLoading || !question.trim()}
              onClick={handleAskQuestion}
            >
              {isQaLoading ? (
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Asking…
                </span>
              ) : (
                'Ask'
              )}
            </Button>
          </div>

          {/* Q&A error */}
          {qaStatus === 'error' && qaError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-red-400">✕</span>
                <p className="text-sm text-red-700">{qaError}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
