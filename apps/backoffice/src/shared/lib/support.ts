/**
 * Contacto de soporte técnico. Mientras no exista un correo corporativo, se
 * configura con NEXT_PUBLIC_SUPPORT_EMAIL; si no está definido, los enlaces de
 * ayuda NO se muestran (mejor nada que un mailto a un buzón inexistente).
 */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || undefined;

export function supportMailto(asunto: string): string | undefined {
  return SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(asunto)}` : undefined;
}
