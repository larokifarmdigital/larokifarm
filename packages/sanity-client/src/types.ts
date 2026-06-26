export type PortableSpan = {
  _key?: string;
  _type: 'span';
  text?: string;
  marks?: string[];
};

export type PortableMarkDef = {
  _key: string;
  _type: string;
  href?: string;
  externo?: boolean;
};

export type PortableBlock = {
  _key?: string;
  _type: string;
  style?: string;
  listItem?: 'bullet' | 'number';
  level?: number;
  markDefs?: PortableMarkDef[];
  children?: PortableSpan[];
};

/**
 * Entrada de un campo internacionalizado (sanity-plugin-internationalized-array).
 * Persistido en Sanity como `[{ _key, language, value }]`.
 */
export type EntradaI18n<T> = {
  _key?: string;
  language: string;
  value?: T;
};

export type LocalizedString = EntradaI18n<string>[];
export type LocalizedText = EntradaI18n<string>[];
export type LocalizedPortableText = EntradaI18n<PortableBlock[]>[];
