// Adapter Auth.js v5 (Credentials + Prisma + bcrypt) — server-only.
// src/proxy.ts NO importa esto: usa authjs.config.ts directamente.
export { handlers, auth, signIn, signOut, unstable_update } from './authjs';
export { farmaciasActualesDe, puedeUsarModulo } from './farmacias';
