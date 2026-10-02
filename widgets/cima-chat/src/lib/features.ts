/**
 * Feature flags del widget cima-chat.
 *
 * IA_LIBRE_ENABLED controla el flujo de "pregunta libre" del hero que
 * delega a ChatIA (worker-llm con Gemini). Cuando esta en false:
 * - No se renderiza el textarea del hero.
 * - No se renderizan los ejemplos de pregunta libre.
 * - El modo 'chat' queda inaccesible desde el menu.
 *
 * Los flujos deterministas (Buscar en CIMA y Guia por sintomas) siguen
 * disponibles porque no dependen del LLM.
 */
export const IA_LIBRE_ENABLED = false;
