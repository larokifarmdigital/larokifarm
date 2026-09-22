import type { Usuario } from '@/types/content';

export const MOCK_USUARIOS: Usuario[] = [
  {
    id: 'usr_admin',
    email: 'admin@larokifarm.com',
    nombre: 'Erick (admin)',
    rol: 'admin',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'usr_marta',
    email: 'marta@farmaciatorrents.com',
    nombre: 'Marta Torrents',
    rol: 'manager',
    farmaciaId: 'farm_torrents',
    createdAt: '2024-02-01T00:00:00.000Z',
  },
  {
    id: 'usr_ana',
    email: 'ana@farmaciachamarro.pe',
    nombre: 'Ana Chamarro',
    rol: 'manager',
    farmaciaId: 'farm_chamarro',
    createdAt: '2024-03-15T00:00:00.000Z',
  },
];

export const MOCK_PASSWORDS: Record<string, string> = {
  'admin@larokifarm.com': 'demo1234',
  'marta@farmaciatorrents.com': 'demo1234',
  'ana@farmaciachamarro.pe': 'demo1234',
};
