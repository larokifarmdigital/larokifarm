export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'manager' | 'viewer';
  farmaciaId?: string;
  createdAt: string;
};
