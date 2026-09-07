'use client';

import { useState } from 'react';
import { buildShareUrl, type UrlSearchParamsShape } from '../../lib/urlParams';

export interface ShareButtonProps {
  input: UrlSearchParamsShape;
  /** Contexto opcional para el mensaje: nombre del producto o número de farmacias. */
  contextMessage?: string;
}

export function ShareButton({ input, contextMessage }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const url = buildShareUrl(input);
  const productLabel = input.nombre || input.cn || input.ean || 'producto';
  const shareText = contextMessage
    ? `Mirá los precios de ${productLabel}: ${contextMessage}`
    : `Compará precios de ${productLabel} en Scout`;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback silently */
    }
  }

  function openWhatsApp() {
    const text = encodeURIComponent(`${shareText}\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    setMenuOpen(false);
  }

  function openEmail() {
    const subject = encodeURIComponent(`Comparativa de precios: ${productLabel}`);
    const body = encodeURIComponent(`${shareText}\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setMenuOpen(false);
  }

  async function nativeShare() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Scout · Comparativa', text: shareText, url });
        setMenuOpen(false);
        return;
      } catch {
        /* user canceled */
      }
    }
    // Fallback: abrir el menú custom
    setMenuOpen((v) => !v);
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={nativeShare}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-teal-400 hover:text-teal-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-teal-600 dark:hover:text-teal-300"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        Compartir
      </button>

      {menuOpen && (
        <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-teal-50 hover:text-teal-800 dark:text-zinc-300 dark:hover:bg-teal-950/30 dark:hover:text-teal-300"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            {copied ? '¡Copiado!' : 'Copiar enlace'}
          </button>
          <button
            type="button"
            onClick={openWhatsApp}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-zinc-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.2s-.8 1-1 1.2c-.2.2-.4.2-.7.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1s0-.5.1-.6c.1-.1.3-.4.4-.5s.2-.3.3-.5.1-.3 0-.5-.7-1.7-1-2.3c-.2-.6-.5-.5-.7-.5h-.5c-.2 0-.5.1-.8.4-.3.3-1.1 1-1.1 2.5s1.1 2.9 1.3 3.1c.2.2 2.2 3.4 5.3 4.7.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.3-.7.3-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.4 5.1L2 22l4.9-1.3c1.5.8 3.2 1.3 5.1 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
            </svg>
            WhatsApp
          </button>
          <button
            type="button"
            onClick={openEmail}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-sky-50 hover:text-sky-800 dark:text-zinc-300 dark:hover:bg-sky-950/30 dark:hover:text-sky-300"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m2 7 10 6 10-6" />
            </svg>
            Correo
          </button>
        </div>
      )}
    </div>
  );
}
