import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Card, Spinner } from '@/components/ui/primitives';
import { supabaseConfigured } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';

export function LoginPage(): JSX.Element {
  const { status, error, signInWithGoogle, signInWithToken, signInAsDemo } = useAuth();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showTokenForm, setShowTokenForm] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/batches" replace />;
  }

  const submitToken = async (): Promise<void> => {
    setBusy(true);
    setLocalError(null);
    try {
      await signInWithToken(token.trim());
    } catch (cause) {
      setLocalError(
        cause instanceof Error ? cause.message : 'The token could not be verified.',
      );
    } finally {
      setBusy(false);
    }
  };

  const submitDemo = async (): Promise<void> => {
    setBusy(true);
    setLocalError(null);
    try {
      await signInAsDemo();
    } catch (cause) {
      setLocalError(
        cause instanceof Error
          ? cause.message
          : 'Demo sign-in is not enabled on this deployment.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16 bg-canvas">
      <Card className="w-full max-w-md p-8 border-edge bg-panel">
        <div className="mb-6 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold tracking-widest text-zinc-100 uppercase">
              BFDP
            </span>
            <span className="rounded border border-brand/30 bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-brand uppercase">
              FINANCIAL
            </span>
          </div>
          <h1 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
            Batch Financial Processor
          </h1>
          <p className="text-xs text-zinc-400">
            Institutional transaction intelligence & batch audit console
          </p>
        </div>

        {status === 'loading' ? (
          <div className="flex items-center gap-3 font-mono text-sm text-zinc-400">
            <Spinner /> Restoring session…
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              className="w-full"
              onClick={() => void signInWithGoogle()}
              disabled={!supabaseConfigured}
            >
              Continue with Google
            </Button>

            {!supabaseConfigured ? (
              <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 font-mono text-xs text-amber-200">
                Supabase is not configured for this build, so Google sign-in is unavailable. Use
                the demo session (when enabled) or paste an access token below.
              </p>
            ) : null}

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => void submitDemo()}
              disabled={busy}
            >
              {busy ? <Spinner className="h-4 w-4" /> : null}
              Continue as demo reviewer
            </Button>

            {error || localError ? (
              <p className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 font-mono text-xs text-rose-200">
                {error ?? localError}
              </p>
            ) : null}

            <div className="border-t border-edge pt-4">
              <button
                type="button"
                className="font-mono text-xs text-zinc-400 underline-offset-4 hover:text-brand hover:underline"
                onClick={() => setShowTokenForm((value) => !value)}
              >
                {showTokenForm ? 'Hide token sign-in' : 'Sign in with an access token'}
              </button>

              {showTokenForm ? (
                <div className="mt-3 space-y-2">
                  <label className="field-label" htmlFor="access-token">
                    Supabase access token
                  </label>
                  <textarea
                    id="access-token"
                    className="field-input h-24 resize-none font-mono text-xs"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="eyJhbGciOi…"
                  />
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={busy || token.trim().length < 20}
                    onClick={() => void submitToken()}
                  >
                    {busy ? <Spinner className="h-4 w-4" /> : null}
                    Verify token
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
