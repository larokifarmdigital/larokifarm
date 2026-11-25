/**
 * Avisos por correo con Web3Forms (formularios → correo del administrador).
 * En el plan gratuito Web3Forms solo acepta envíos DESDE EL NAVEGADOR (desde
 * el servidor es de pago), así que esto se llama en componentes cliente. La
 * clave de acceso es pública por diseño: solo sirve para mandar correos al
 * buzón que se eligió al crearla. Sin `NEXT_PUBLIC_WEB3FORMS_KEY` no se envía nada.
 */
export const WEB3FORMS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY?.trim() || undefined;

export async function enviarCorreo(datos: {
  asunto: string;
  /** Nombre que sale como remitente. */
  deParte: string;
  /** Al pulsar "Responder" en el correo, va a esta dirección. */
  responderA?: string;
  /** Campos del mensaje, en este orden. */
  campos: Record<string, string>;
}): Promise<boolean> {
  if (!WEB3FORMS_KEY) return false;
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: datos.asunto,
        from_name: datos.deParte,
        ...(datos.responderA ? { replyto: datos.responderA } : {}),
        botcheck: '',
        ...datos.campos,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => null)) as { success?: boolean } | null;
    return res.ok && json?.success === true;
  } catch {
    return false;
  }
}
