import type { Role } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id?: string;
    role: Role;
    businessId: string | null;
    businessSlug: string | null;
    /** Huella de la contraseña (solo viaja dentro del JWT cifrado). */
    pv?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      businessId: string | null;
      businessSlug: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    businessId: string | null;
    businessSlug: string | null;
    pv?: string;
    checkedAt?: number;
  }
}
