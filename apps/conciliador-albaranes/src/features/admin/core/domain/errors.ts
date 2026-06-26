/**
 * Errores de dominio del admin. Permiten distinguir en las server actions un
 * fallo de autorización de un error inesperado.
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
