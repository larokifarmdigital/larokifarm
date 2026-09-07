'use client';

/* eslint-disable react-hooks/set-state-in-effect */
// El efecto lifecyclea la cámara (getUserMedia + BarcodeDetector interval). Es un caso
// típico de "manejar recurso externo con cleanup" — el lint prefiere useTransition,
// pero para lifecycles con navigator.mediaDevices esto es lo idiomático.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Callback cuando se detectó un EAN válido (13 dígitos). */
  onDetected: (ean: string) => void;
}

type ScanState =
  | { kind: 'idle' }
  | { kind: 'unsupported' }
  | { kind: 'requesting' }
  | { kind: 'denied'; error: string }
  | { kind: 'scanning' };

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement | ImageBitmap): Promise<Array<{ rawValue: string; format: string }>>;
}

// TypeScript declaration for BarcodeDetector (no oficial en lib.dom.d.ts todavía en algunos targets)
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }
}

/**
 * Modal con cámara + escáner de código de barras usando BarcodeDetector nativo.
 * Soporte: Chrome/Edge/Samsung Internet (móvil y desktop), Safari 17+.
 * En navegadores sin soporte muestra mensaje claro.
 *
 * Formatos detectados: EAN-13, EAN-8, UPC-A, CODE-128. Filtramos a EAN-13 (13 dígitos)
 * porque es el estándar farmacéutico español.
 */
export function BarcodeScanner({ isOpen, onClose, onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [state, setState] = useState<ScanState>({ kind: 'idle' });

  const stopScan = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopScan();
    setState({ kind: 'idle' });
    onClose();
  }, [stopScan, onClose]);

  useEffect(() => {
    if (!isOpen) {
      stopScan();
      return;
    }
    if (typeof window === 'undefined' || !window.BarcodeDetector) {
      setState({ kind: 'unsupported' });
      return;
    }

    let cancelled = false;
    setState({ kind: 'requesting' });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setState({ kind: 'scanning' });

        const detector = new window.BarcodeDetector!({
          formats: ['ean_13', 'ean_8', 'upc_a', 'code_128'],
        });

        scanIntervalRef.current = setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          try {
            const codes = await detector.detect(video);
            const ean = codes
              .map((c) => c.rawValue.replace(/\D/g, ''))
              .find((v) => v.length === 13);
            if (ean) {
              stopScan();
              onDetected(ean);
            }
          } catch {
            // ignore transient detection errors
          }
        }, 250);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setState({
          kind: 'denied',
          error:
            msg.includes('Permission') || msg.includes('denied')
              ? 'Permiso de cámara denegado. Autorizalo en la barra del navegador.'
              : `No se pudo acceder a la cámara: ${msg}`,
        });
      }
    })();

    return () => {
      cancelled = true;
      stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Escanear código de barras"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-600 text-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14" />
              </svg>
            </span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Escanear código de barras
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative aspect-video bg-zinc-900">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Overlay de guía visual: rectángulo semitransparente en el centro */}
          {state.kind === 'scanning' && (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-1/2 w-4/5 rounded-2xl border-2 border-teal-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-teal-600 px-2 py-1 text-[11px] font-semibold text-white shadow-lg">
                    Apuntá el código dentro del recuadro
                  </span>
                  {/* Línea de scan animada */}
                  <div className="absolute inset-x-2 top-1/2 h-px animate-pulse bg-teal-400 shadow-[0_0_8px_2px_rgba(45,212,191,0.5)]" />
                </div>
              </div>
            </>
          )}

          {state.kind === 'requesting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-white">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              <p className="text-sm">Solicitando acceso a la cámara…</p>
            </div>
          )}

          {state.kind === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/30">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <p className="text-sm">{state.error}</p>
            </div>
          )}

          {state.kind === 'unsupported' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/30">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <p className="text-sm">
                Tu navegador no soporta el escáner nativo. Probá desde Chrome, Edge o Samsung
                Internet en móvil.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Buscamos EAN-13 (13 dígitos). Sostené el código quieto y bien iluminado. Al detectarlo
            iniciamos la búsqueda automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
