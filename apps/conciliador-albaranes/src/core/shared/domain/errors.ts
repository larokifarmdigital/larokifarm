/**
 * Errores de dominio cross-core. Los use cases de cualquier módulo los lanzan
 * y los handlers/actions del frontend los reconocen para distinguir un fallo
 * de autorización de un error inesperado.
 */
export class ForbiddenError extends Error {
  readonly _tag = 'ForbiddenError';
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  readonly _tag = 'ValidationError';
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
