import type { Role } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id?: string;
    role: Role;
    businessId: string | null;
    businessSlug: string | null;
    /** Farmacias que lleva (incluye la principal `businessId`). */
    businessIds: string[];
    /** Huella de la contraseña (solo viaja dentro del JWT cifrado). */
    pv?: string;
    /** «Mantener la sesión iniciada» marcado en el login. */
    recordar?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      businessId: string | null;
      businessSlug: string | null;
      /** Farmacias que lleva (incluye la principal `businessId`). */
      businessIds: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    businessId: string | null;
    businessSlug: string | null;
    businessIds?: string[];
    pv?: string;
    checkedAt?: number;
    /** Fin de la sesión corta (ms); sin valor = sesión de 30 días. */
    expiraEn?: number;
  }
}
