import type { Role } from '@/core/shared';

const LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super administrador',
  BUSINESS_ADMIN: 'Administrador de negocio',
  USER: 'Usuario',
};

const SHORT_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super admin',
  BUSINESS_ADMIN: 'Admin de negocio',
  USER: 'Usuario',
};

const BADGE_STYLES: Record<Role, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700 ring-purple-200',
  BUSINESS_ADMIN: 'bg-blue-100 text-blue-700 ring-blue-200',
  USER: 'bg-gray-100 text-gray-700 ring-gray-200',
};

export function roleLabel(role: Role, opts?: { short?: boolean }): string {
  return opts?.short ? SHORT_LABELS[role] : LABELS[role];
}

export function roleBadgeClass(role: Role): string {
  return `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_STYLES[role]}`;
}
