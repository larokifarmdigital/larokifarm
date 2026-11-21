import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';

/** Mismo coste que el resto de contraseñas de la app. */
const COSTE_BCRYPT = 10;
export const MIN_CONTRASENA = 10;
/** bcrypt solo usa los primeros 72 bytes (un acento ocupa 2, un emoji 4). */
export const MAX_BYTES_CONTRASENA = 72;

// Sin caracteres que se confunden al dictarlos o copiarlos a mano (0/O, 1/l/I).
const ALFABETO = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Contraseña temporal: 12 caracteres aleatorios en 3 bloques ("Kp7m-xR3d-Qw9t"), ~70 bits. */
export function generarContrasenaTemporal(): string {
  const bloque = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
  return `${bloque()}-${bloque()}-${bloque()}`;
}

export function hashContrasena(plana: string): Promise<string> {
  return bcrypt.hash(plana, COSTE_BCRYPT);
}

export function compararContrasena(plana: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plana, hash);
}
