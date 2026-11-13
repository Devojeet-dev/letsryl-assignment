import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { FileSpreadsheet, Trash2, UploadCloud } from 'lucide-react';
import {
  UPLOAD_LIMITS,
  validateUploadLimits,
  type UploadLimitViolation,
} from '@/lib/limits';
import { formatBytes } from '@/lib/format';
import { Button, Card, CardHeader, Spinner } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api/client';
import { createBatch } from '@/lib/api/endpoints';

function newIdempotencyKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `idem_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function toMeta(files: readonly File[]) {
  return files.map((file) => ({
    originalName: file.name,
    sizeBytes: file.size,
    mimeType: file.type || 'text/csv',
  }));
}

export function UploadPage(): JSX.Element {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  const violations: UploadLimitViolation[] = useMemo(
    () => (files.length > 0 ? validateUploadLimits(toMeta(files)) : []),
    [files],
  );

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  const upload = useMutation({
    mutationFn: async () => createBatch(files, newIdempotencyKey()),
    onSuccess: (batch) => {
      navigate(`/batches/${batch.id}`);
    },
  });

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const next = Array.from(incoming);
    setFiles((current) => {
      const seen = new Set(current.map((file) => `${file.name}:${file.size}`));
      const unique = next.filter((file) => !seen.has(`${file.name}:${file.size}`));
      const combined = [...current, ...unique].slice(0, UPLOAD_LIMITS.MAX_FILES_PER_BATCH);
      return combined.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
      );
    });
  }, []);

  const removeFile = (name: string, size: number): void => {
    setFiles((current) =>
      current.filter((file) => !(file.name === name && file.size === size)),
    );
  };

  const canSubmit = files.length > 0 && violations.length === 0 && !upload.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">New batch</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Upload 1–{UPLOAD_LIMITS.MAX_FILES_PER_BATCH} CSV files. Each file is
          processed independently, so one bad file never blocks the rest.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader
            title="Files"
            description={`Up to ${formatBytes(UPLOAD_LIMITS.MAX_FILE_BYTES)} per file, ${formatBytes(
              UPLOAD_LIMITS.MAX_BATCH_BYTES,
            )} per batch`}
          />
          <div className="space-y-4 p-5">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                addFiles(event.dataTransfer.files);
              }}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                dragging
                  ? 'border-brand bg-brand/10 shadow-lg'
                  : 'border-edge bg-[#151515]/60 hover:border-zinc-700'
              }`}
            >
              <UploadCloud className="h-8 w-8 text-zinc-400" aria-hidden />
              <p className="text-sm font-medium text-zinc-200">
                Drag CSV files here, or choose them
              </p>
              <p className="font-mono text-xs text-zinc-400">
                Only .csv files are accepted. Nothing is processed in the browser.
              </p>
              <Button
                variant="secondary"
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                Choose files
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) {
                    addFiles(event.target.files);
                  }
                  event.target.value = '';
                }}
              />
            </div>

            {violations.length > 0 ? (
              <ul className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 font-mono">
                {violations.map((violation) => (
                  <li key={violation.code}>• {violation.message}</li>
                ))}
              </ul>
            ) : null}

            {files.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>
                    {files.length} file{files.length === 1 ? '' : 's'} ·{' '}
                    {formatBytes(totalBytes)}
                  </span>
                  <button
                    type="button"
                    className="hover:text-zinc-200"
                    onClick={() => setFiles([])}
                  >
                    Clear all
                  </button>
                </div>
                <ul className="divide-y divide-edge rounded-lg border border-edge bg-[#161616]">
                  {files.map((file) => (
                    <li
                      key={`${file.name}:${file.size}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-[#1D1D1D]/50 transition"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileSpreadsheet
                          className="h-4 w-4 shrink-0 text-brand"
                          aria-hidden
                        />
                        <span className="truncate font-mono text-xs text-zinc-200">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="whitespace-nowrap font-mono text-xs text-zinc-400">
                          {formatBytes(file.size)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          className="text-zinc-400 hover:text-rose-400"
                          onClick={() => removeFile(file.name, file.size)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {upload.isError ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                <p>{upload.error instanceof Error ? upload.error.message : 'Upload failed.'}</p>
                {upload.error instanceof ApiError ? (
                  <p className="mt-1 font-mono text-[10px] text-rose-300/70">
                    {upload.error.code} · request {upload.error.requestId}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button disabled={!canSubmit} onClick={() => upload.mutate()}>
                {upload.isPending ? <Spinner className="h-4 w-4" /> : null}
                Create batch
              </Button>
            </div>
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="What happens next" />
          <ol className="space-y-3 p-5 text-sm text-zinc-400">
            <li>
              <span className="font-semibold text-zinc-200">1. Immediate receipt.</span>{' '}
              The API stores the files and returns a <code className="rounded border border-edge bg-[#1C1C1C] px-1.5 py-0.5 font-mono text-xs text-brand">batchId</code> right away.
            </li>
            <li>
              <span className="font-semibold text-zinc-200">2. One job per file.</span>{' '}
              Workers parse, validate and analyse each CSV independently with up to{' '}
              3 attempts.
            </li>
            <li>
              <span className="font-semibold text-zinc-200">3. Recorded rejections.</span>{' '}
              Missing headers, unreadable files and empty results fail only that file
              and are reported.
            </li>
            <li>
              <span className="font-semibold text-zinc-200">4. Automatic Excel report.</span>{' '}
              When every file reaches a terminal state, the workbook is generated and
              becomes downloadable.
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
