// PORT: lectura puntual de reseñas (la lista completa viaja con la Farmacia).
export type ResenaRepository = {
  /** Key de storage de la foto del autor, solo si la reseña es visible. */
  findVisibleAvatarKey(resenaId: string): Promise<string | null>;
};
