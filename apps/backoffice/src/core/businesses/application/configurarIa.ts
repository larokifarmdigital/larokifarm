import type { SaveResult } from '@/core/shared';
import type { BusinessRepository } from '../domain';

/** Quien hace el cambio; solo la cuenta de administración puede. */
export type ActorIa = { rol: string } | null;

export const LIMITE_MAXIMO_USD = 1000;

type ProbarClave = (clave: string) => Promise<{ ok: true } | { ok: false; motivo: 'invalida' | 'sin-respuesta' }>;

const SIN_PERMISO = { ok: false, error: 'Solo la cuenta de administración puede cambiar esto.' } as const;

/**
 * Límite de gasto mensual y clave propia de Gemini de cada farmacia
 * (pantalla «Uso de IA»). La clave se comprueba con Google antes de guardarla
 * y se guarda cifrada; nunca se devuelve entera.
 */
export class ConfigurarIaFarmaciaUseCase {
  constructor(
    private readonly repo: BusinessRepository,
    private readonly probarClave: ProbarClave,
  ) {}

  /** `texto` vacío = sin límite. Admite coma decimal ("12,50"). */
  async cambiarLimite(actor: ActorIa, businessId: string, texto: string): Promise<SaveResult<true>> {
    if (actor?.rol !== 'admin') return SIN_PERMISO;
    const limpio = texto.trim().replace(',', '.');
    let limite: number | null = null;
    if (limpio !== '') {
      limite = Number(limpio);
      if (!/^\d+(\.\d{1,2})?$/.test(limpio) || !Number.isFinite(limite) || limite <= 0) {
        return { ok: false, error: 'Revisa el límite.', fieldErrors: { limite: 'Escribe una cantidad mayor que 0, por ejemplo 20 o 12,50.' } };
      }
      if (limite > LIMITE_MAXIMO_USD) {
        return { ok: false, error: 'Revisa el límite.', fieldErrors: { limite: `Como máximo ${LIMITE_MAXIMO_USD} $ al mes.` } };
      }
    }
    if (!(await this.repo.findById(businessId))) return { ok: false, error: 'No se encuentra la farmacia.' };
    await this.repo.update(businessId, { monthlyBudgetUsd: limite });
    return { ok: true, data: true };
  }

  async guardarClave(actor: ActorIa, businessId: string, clave: string): Promise<SaveResult<{ final: string }>> {
    if (actor?.rol !== 'admin') return SIN_PERMISO;
    const limpia = clave.trim();
    if (limpia.length < 20 || limpia.length > 200 || /\s/.test(limpia)) {
      return { ok: false, error: 'Revisa la clave.', fieldErrors: { clave: 'Esto no parece una clave de Gemini. Cópiala entera desde Google AI Studio.' } };
    }
    if (!process.env.ENCRYPTION_KEY) {
      return { ok: false, error: 'El servidor no puede guardar claves todavía: falta la variable ENCRYPTION_KEY en Vercel.' };
    }
    if (!(await this.repo.findById(businessId))) return { ok: false, error: 'No se encuentra la farmacia.' };
    const prueba = await this.probarClave(limpia);
    if (!prueba.ok) {
      return prueba.motivo === 'invalida'
        ? { ok: false, error: 'Revisa la clave.', fieldErrors: { clave: 'Google dice que esta clave no es válida o no tiene activada la API de Gemini.' } }
        : { ok: false, error: 'No hemos podido comprobar la clave con Google. Inténtalo de nuevo en un momento.' };
    }
    await this.repo.update(businessId, { geminiApiKey: limpia });
    return { ok: true, data: { final: limpia.slice(-4) } };
  }

  async quitarClave(actor: ActorIa, businessId: string): Promise<SaveResult<true>> {
    if (actor?.rol !== 'admin') return SIN_PERMISO;
    if (!(await this.repo.findById(businessId))) return { ok: false, error: 'No se encuentra la farmacia.' };
    await this.repo.update(businessId, { geminiApiKey: null });
    return { ok: true, data: true };
  }
}
