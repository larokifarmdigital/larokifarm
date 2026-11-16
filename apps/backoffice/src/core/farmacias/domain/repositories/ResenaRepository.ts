// PORT: reseñas sueltas (la lista completa viaja con la Farmacia).
export type ResenaRepository = {
  /** Key de storage de la foto del autor, solo si la reseña es visible. */
  findVisibleAvatarKey(resenaId: string): Promise<string | null>;
  /** Foto de cualquier reseña (también ocultas) + su farmacia: para el editor. */
  findAvatar(resenaId: string): Promise<{ key: string | null; businessId: string } | null>;
  /** Farmacia a la que pertenece (null si no existe). */
  findBusinessId(resenaId: string): Promise<string | null>;
  /** Switch del editor: ocultar/mostrar una reseña en la web. */
  setOculta(resenaId: string, oculta: boolean): Promise<void>;
};
