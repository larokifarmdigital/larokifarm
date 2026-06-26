export type VariablesInterpolacion = Record<string, string | number>;

/**
 * Busca un valor anidado en un objeto siguiendo una ruta de claves (`['a','b','c']`).
 * Devuelve `undefined` si algún tramo no existe.
 */
export function obtenerCadenaProfunda(obj: unknown, ruta: string[]): unknown {
  let actual: unknown = obj;
  for (const seg of ruta) {
    if (actual && typeof actual === 'object' && seg in (actual as object)) {
      actual = (actual as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return actual;
}

/**
 * Reemplaza `{clave}` en la plantilla con los valores del objeto `vars`.
 * Si una variable no está, deja el placeholder intacto (señal visible de que falta).
 */
export function interpolar(plantilla: string, vars?: VariablesInterpolacion): string {
  if (!vars) return plantilla;
  return plantilla.replace(/\{(\w+)\}/g, (_match, clave: string) => {
    const valor = vars[clave];
    return valor === undefined || valor === null ? `{${clave}}` : String(valor);
  });
}

export type Traductor<L extends string> = {
  /** Devuelve un string. Si la clave no existe en `locale`, hace fallback al locale por defecto, y si tampoco existe devuelve la propia clave. */
  t: (clave: string, locale?: L, vars?: VariablesInterpolacion) => string;
  /** Devuelve un array de strings. Si no encuentra un array válido, devuelve []. */
  tArray: (clave: string, locale?: L) => string[];
  /** Construye una URL respetando el locale activo. El locale por defecto no prefija. */
  rutaConLocale: (ruta: string, locale?: L) => string;
  /** Type guard: ¿`valor` es uno de los locales soportados? */
  esLocaleValido: (valor: unknown) => valor is L;
};

export type OpcionesTraductor<L extends string> = {
  recursos: Record<L, Record<string, unknown>>;
  localesDisponibles: readonly L[];
  localeDefecto: L;
};

/**
 * Construye un traductor para una app concreta a partir de sus diccionarios JSON.
 * Cada app pasa sus `recursos`, sus `localesDisponibles` y su `localeDefecto`.
 */
export function crearTraductor<L extends string>(opts: OpcionesTraductor<L>): Traductor<L> {
  const { recursos, localesDisponibles, localeDefecto } = opts;

  const esLocaleValido = (valor: unknown): valor is L =>
    typeof valor === 'string' && (localesDisponibles as readonly string[]).includes(valor);

  const t = (clave: string, locale: L = localeDefecto, vars?: VariablesInterpolacion): string => {
    const ruta = clave.split('.');
    const valor = obtenerCadenaProfunda(recursos[locale], ruta);
    if (typeof valor === 'string') return interpolar(valor, vars);

    if (locale !== localeDefecto) {
      const fallback = obtenerCadenaProfunda(recursos[localeDefecto], ruta);
      if (typeof fallback === 'string') return interpolar(fallback, vars);
    }
    return clave;
  };

  const tArray = (clave: string, locale: L = localeDefecto): string[] => {
    const ruta = clave.split('.');
    const valor = obtenerCadenaProfunda(recursos[locale], ruta);
    if (Array.isArray(valor) && valor.every((v) => typeof v === 'string')) return valor as string[];

    if (locale !== localeDefecto) {
      const fallback = obtenerCadenaProfunda(recursos[localeDefecto], ruta);
      if (Array.isArray(fallback) && fallback.every((v) => typeof v === 'string')) {
        return fallback as string[];
      }
    }
    return [];
  };

  const rutaConLocale = (ruta: string, locale: L = localeDefecto): string => {
    const normalizada = ruta.startsWith('/') ? ruta : `/${ruta}`;
    if (locale === localeDefecto) return normalizada;
    if (normalizada === '/') return `/${locale}`;
    return `/${locale}${normalizada}`;
  };

  return { t, tArray, rutaConLocale, esLocaleValido };
}
