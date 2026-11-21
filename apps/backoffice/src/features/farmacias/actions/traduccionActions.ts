'use server';

import { requireUser } from '@/core/auth';
import { getBusinessRepository } from '@/core/businesses';
import {
  GetBudgetStatusUseCase,
  getAiUsageRepository,
  getComparisonRepository,
  ModuloIaNoMigradoError,
} from '@/core/comparisons';
import { getFarmaciaRepository, MAX_CARACTERES_TRADUCCION, traducirTexto } from '@/core/farmacias';
import { esLocale, LOCALE_PRINCIPAL } from '@/core/shared';
import { sanitizeRichHtml } from '@/shared/lib/safeHtml';

export type SugerenciaResult = { ok: true; texto: string } | { ok: false; error: string };

// Límites contra ráfagas que gasten crédito sin querer (no sustituyen al
// presupuesto mensual): por usuario cada 10 min y por farmacia al día. Se
// cuentan en usage_entries (compartido entre instancias de Vercel). El Map en
// memoria es solo respaldo mientras la BD no tenga el valor TRADUCCION del
// enum (antes de la migración no se registra nada y el recuento daría 0).
const VENTANA_MS = 10 * 60 * 1000;
const MAX_POR_VENTANA = 40;
const DIA_MS = 24 * 60 * 60 * 1000;
const MAX_POR_DIA_NEGOCIO = 300;
const usos = new Map<string, number[]>();

function respaldoEnMemoria(userId: string): boolean {
  const ahora = Date.now();
  for (const [k, ts] of usos) if (!ts.some((t) => ahora - t < VENTANA_MS)) usos.delete(k);
  const recientes = (usos.get(userId) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (recientes.length >= MAX_POR_VENTANA) {
    usos.set(userId, recientes);
    return false;
  }
  recientes.push(ahora);
  usos.set(userId, recientes);
  return true;
}

/**
 * Sugiere la traducción de un texto en castellano al idioma indicado (Gemini).
 * No guarda nada: el editor la enseña como borrador y la persona decide.
 * Permiso: quien pueda editar esa farmacia (tenant vía `getFarmacia`).
 * Gasto: cuenta en el presupuesto mensual del negocio (el del conciliador) y
 * queda registrado en usage_entries (módulo TRADUCCION).
 */
export async function sugerirTraduccionAction(
  farmaciaId: string,
  texto: string,
  destino: string,
  html: boolean,
): Promise<SugerenciaResult> {
  const user = await requireUser();
  if (user.rol === 'viewer') return { ok: false, error: 'Tu cuenta es de solo consulta.' };
  if (typeof farmaciaId !== 'string' || !esLocale(destino) || destino === LOCALE_PRINCIPAL) {
    return { ok: false, error: 'Idioma no válido' };
  }
  if (typeof texto !== 'string' || !texto.trim()) return { ok: false, error: 'No hay texto en castellano que traducir.' };
  if (texto.length > MAX_CARACTERES_TRADUCCION) return { ok: false, error: 'El texto es demasiado largo para traducirlo de una vez.' };

  let farmacia;
  try {
    farmacia = await getFarmaciaRepository().getFarmacia(farmaciaId);
  } catch {
    return { ok: false, error: 'No tienes acceso a esta farmacia.' };
  }
  if (!farmacia) return { ok: false, error: 'Farmacia no encontrada' };

  const businessRepo = getBusinessRepository();
  const usoIa = getAiUsageRepository();
  const presupuesto = await new GetBudgetStatusUseCase(businessRepo, getComparisonRepository(), usoIa).execute(farmacia.id);
  if (presupuesto.level === 'blocked') {
    return {
      ok: false,
      error: `Se ha alcanzado el límite de uso de IA de este mes.${presupuesto.supportEmail ? ` Escribe a ${presupuesto.supportEmail} para ampliarlo.` : ''}`,
    };
  }

  const ahora = Date.now();
  const [delUsuario, delNegocio] = await Promise.all([
    usoIa.countSince({ userId: user.id, from: new Date(ahora - VENTANA_MS) }),
    usoIa.countSince({ businessId: farmacia.id, from: new Date(ahora - DIA_MS) }),
  ]);
  if (delNegocio >= MAX_POR_DIA_NEGOCIO) {
    return { ok: false, error: 'Se ha alcanzado el máximo de traducciones automáticas de hoy para esta farmacia. Vuelve a intentarlo mañana.' };
  }
  if (delUsuario >= MAX_POR_VENTANA || !respaldoEnMemoria(user.id)) {
    return { ok: false, error: 'Has pedido muchas traducciones seguidas. Espera unos minutos y vuelve a intentarlo.' };
  }

  let apiKey: string | null | undefined;
  const negocio = await businessRepo.findById(farmacia.id);
  if (negocio?.hasGeminiKey) {
    try {
      apiKey = await businessRepo.getDecryptedGeminiKey(farmacia.id);
    } catch {
      apiKey = null;
    }
  }
  apiKey ||= process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: 'La traducción automática no está configurada. Avisa al administrador.' };

  const r = await traducirTexto({ texto, destino, html: html === true, apiKey });
  if (!r.ok) return r;

  try {
    await usoIa.record({
      businessId: farmacia.id,
      userId: user.id,
      action: 'translate',
      costUsd: r.costeUsd,
      tokensIn: r.tokensEntrada,
      tokensOut: r.tokensSalida,
    });
  } catch (e) {
    // La traducción ya está hecha (y pagada): se devuelve igual.
    if (e instanceof ModuloIaNoMigradoError) {
      console.warn('[traduccion] falta ejecutar la migración TRADUCCION (ALTER TYPE "UsageModule"): el coste no se ha registrado');
    } else {
      console.error('[traduccion] no se pudo registrar el uso', e instanceof Error ? e.message : e);
    }
  }

  // Coste también en los logs del servidor (sin el texto: puede ser largo)
  console.info(
    JSON.stringify({
      evento: 'traduccion',
      businessId: farmacia.id,
      userId: user.id,
      destino,
      tokensIn: r.tokensEntrada,
      tokensOut: r.tokensSalida,
      costeUsd: Number(r.costeUsd.toFixed(6)),
    }),
  );

  return { ok: true, texto: html === true ? sanitizeRichHtml(r.texto) : r.texto };
}
