export type SaveResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      /** `conflict`: otra pestaña/persona guardó antes (control optimista). */
      code?: 'conflict';
    };
