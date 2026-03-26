import { useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/Button';

const ACCEPTED_AUDIO_TYPES = [
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
  'audio/x-wav',
];

const ACCEPTED_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.flac', '.mp4', '.mpeg'];

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const N8N_UPLOAD_WEBHOOK_URL =
  import.meta.env.VITE_N8N_UPLOAD_WEBHOOK_URL as string | undefined;

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function UploadAudio() {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading = status === 'uploading';

  const resetState = () => {
    setStatus('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateFile = (file: File): string | null => {
    // Check MIME type
    const mimeValid = ACCEPTED_AUDIO_TYPES.includes(file.type);
    // Fallback: check extension for browsers that don't set MIME correctly
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const extValid = ACCEPTED_EXTENSIONS.includes(ext);

    if (!mimeValid && !extValid) {
      return `Invalid file type "${file.type || ext}". Please upload an audio file (${ACCEPTED_EXTENSIONS.join(', ')}).`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
    }

    if (file.size === 0) {
      return 'File is empty. Please select a valid audio file.';
    }

    return null;
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const validationError = validateFile(file);
    if (validationError) {
      setStatus('error');
      setErrorMessage(validationError);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFileName(file.name);

    if (!N8N_UPLOAD_WEBHOOK_URL) {
      setStatus('error');
      setErrorMessage('Upload webhook URL is not configured. Set VITE_N8N_UPLOAD_WEBHOOK_URL in your .env file.');
      return;
    }

    // Upload
    setStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);

      const response = await fetch(N8N_UPLOAD_WEBHOOK_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      setStatus('success');
      setSuccessMessage(`"${file.name}" uploaded successfully! Your transcript is being processed by the pipeline.`);
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error
          ? `Upload failed: ${err.message}`
          : 'Upload failed. Please try again.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    if (status === 'success' || status === 'error') {
      resetState();
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <Button
        type="button"
        variant="secondary"
        disabled={isUploading}
        onClick={handleButtonClick}
      >
        {isUploading
          ? 'Uploading…'
          : status === 'success'
            ? 'Upload Another'
            : 'Upload Audio'}
      </Button>

      {/* File name indicator */}
      {isUploading && fileName && (
        <p className="text-xs text-slate-500">Uploading: {fileName}</p>
      )}

      {/* Success banner */}
      {status === 'success' && successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Error banner */}
      {status === 'error' && errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}