// Adapter Auth.js v5 (Credentials + Prisma + bcrypt) — server-only.
// El middleware (edge) NO importa esto: usa authjs.config.ts directamente.
export { handlers, auth, signIn, signOut } from './authjs';
