import type { Role } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id?: string;
    role: Role;
    businessId: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      businessId: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    businessId: string | null;
  }
}
