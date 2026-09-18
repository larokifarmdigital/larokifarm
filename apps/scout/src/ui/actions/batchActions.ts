'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  batchWorkerFromEnv,
  BatchWorkerError,
  type HealthData,
  type JobState,
  type PreviewData
} from '@/core/infrastructure/batch/BatchWorkerClient';
import { BATCH_COOKIE, generateCookieValue, verifyCookieValue } from './batchAuth';

// -------- Login / Logout --------

export type LoginActionState = { status: 'idle' } | { status: 'error'; error: string };

export async function loginBatchAction(
  _prev: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const password = String(formData.get('password') ?? '').trim();
  const expected = process.env.BATCH_PASSWORD;

  if (!expected) {
    return { status: 'error', error: 'Servidor mal configurado (falta BATCH_PASSWORD).' };
  }
  if (password !== expected) {
    return { status: 'error', error: 'Contraseña incorrecta.' };
  }

  const value = await generateCookieValue();
  const store = await cookies();
  store.set(BATCH_COOKIE.name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: BATCH_COOKIE.maxAge,
    path: '/batch'
  });

  redirect('/batch');
}

export async function logoutBatchAction(): Promise<void> {
  const store = await cookies();
  store.delete(BATCH_COOKIE.name);
  redirect('/batch');
}

async function assertAuthenticated(): Promise<void> {
  const store = await cookies();
  const value = store.get(BATCH_COOKIE.name)?.value;
  const ok = await verifyCookieValue(value);
  if (!ok) {
    throw new Error('No autorizado. Vuelve a iniciar sesión.');
  }
}

// -------- Batch · run / status / download --------

export type RunActionState =
  | { status: 'idle' }
  | { status: 'error'; error: string }
  | { status: 'running'; jobId: string; startedAt: string };

export async function runBatchAction(): Promise<RunActionState> {
  try {
    await assertAuthenticated();
    const client = batchWorkerFromEnv();
    const { jobId, startedAt } = await client.run();
    return { status: 'running', jobId, startedAt };
  } catch (err) {
    if (err instanceof BatchWorkerError && err.status === 409) {
      return {
        status: 'error',
        error: 'Ya hay un batch en curso. Espera a que termine.'
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', error: msg };
  }
}

export async function getBatchPreviewAction(): Promise<PreviewData | { error: string }> {
  try {
    await assertAuthenticated();
    const client = batchWorkerFromEnv();
    return await client.preview();
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getBatchHealthAction(): Promise<HealthData | { error: string }> {
  try {
    await assertAuthenticated();
    const client = batchWorkerFromEnv();
    return await client.getHealth();
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function listRecentJobsAction(): Promise<JobState[] | { error: string }> {
  try {
    await assertAuthenticated();
    const client = batchWorkerFromEnv();
    return await client.listRecentJobs();
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getJobStatusAction(jobId: string): Promise<JobState | { error: string }> {
  try {
    await assertAuthenticated();
    const client = batchWorkerFromEnv();
    return await client.getStatus(jobId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// Devuelve base64 · el cliente lo pasa a Blob y dispara la descarga.
// Server-side para no exponer WORKER_AUTH_TOKEN al browser.
export async function downloadBatchResultAction(
  jobId: string
): Promise<{ ok: true; base64: string; filename: string } | { ok: false; error: string }> {
  try {
    await assertAuthenticated();
    const client = batchWorkerFromEnv();
    const buf = await client.downloadResult(jobId);
    const bytes = new Uint8Array(buf);
    // btoa en lugar de Buffer · compat edge runtime.
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    const filename = `scout-batch-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return { ok: true, base64, filename };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
