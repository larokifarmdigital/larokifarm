'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/shared/components/atoms/Button';
import { probeAction, type ProbeActionState } from '../../api/probeAction';
import { ResultCard } from '../ResultCard';
import type { ProbeResult } from '../../domain/models/Extraction';

const initialState: ProbeActionState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? 'Probando…' : 'Probar'}
    </Button>
  );
}

export type UrlRowProps = {
  url: string;
  externalResult?: ProbeResult | null;
};

export function UrlRow({ url, externalResult }: UrlRowProps) {
  const [state, formAction] = useActionState(probeAction, initialState);

  const resolved: ProbeResult | null =
    state.status === 'done' ? state.result : externalResult ?? null;
  const host = safeHost(url);
  const okIndicator = resolved ? (resolved.ok ? '✅' : '❌') : '·';

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-200 py-3 first:border-t-0 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span aria-hidden>{okIndicator}</span>
            <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {host}
            </span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-xs text-zinc-500 hover:underline"
          >
            {url}
          </a>
        </div>
        <form action={formAction}>
          <input type="hidden" name="url" value={url} />
          <SubmitButton />
        </form>
      </div>

      {state.status === 'error' && (
        <div className="text-xs text-rose-600 dark:text-rose-400">{state.error}</div>
      )}
      {resolved && <ResultCard result={resolved} />}
      {!resolved && state.status !== 'error' && (
        <div className="text-xs italic text-zinc-500">Aún no probado.</div>
      )}
    </div>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}
