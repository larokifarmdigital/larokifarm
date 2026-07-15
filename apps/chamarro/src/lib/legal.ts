import type { Locale } from '@/lib/i18n';

// NOTE: Fallback usado solo cuando el campo correspondiente en Sanity está vacío para el idioma. Rellenar avisoLegal/politicaPrivacidad en Sanity cuando el cliente pase el texto definitivo. Placeholder neutro hasta entonces.

export type LegalTextos = { avisoLegal: string; politicaPrivacidad: string };

const PLACEHOLDER_ES = `
<h1>Aviso legal</h1>
<p>El texto legal completo se publicará próximamente. Para consultas relacionadas con esta web, por favor escríbenos.</p>
`;

const PLACEHOLDER_PRIV_ES = `
<h1>Política de privacidad</h1>
<p>Este sitio web es informativo. La política de privacidad completa se publicará próximamente.</p>
`;

const PLACEHOLDER_CA = `
<h1>Avís legal</h1>
<p>El text legal complet es publicarà pròximament.</p>
`;

const PLACEHOLDER_PRIV_CA = `
<h1>Política de privacitat</h1>
<p>Aquest lloc web és informatiu. La política de privacitat completa es publicarà pròximament.</p>
`;

const PLACEHOLDER_EN = `
<h1>Legal notice</h1>
<p>The full legal notice will be published soon.</p>
`;

const PLACEHOLDER_PRIV_EN = `
<h1>Privacy policy</h1>
<p>This website is informational only. The full privacy policy will be published soon.</p>
`;

export const LEGAL: Record<Locale, LegalTextos> = {
  es: { avisoLegal: PLACEHOLDER_ES, politicaPrivacidad: PLACEHOLDER_PRIV_ES },
  ca: { avisoLegal: PLACEHOLDER_CA, politicaPrivacidad: PLACEHOLDER_PRIV_CA },
  en: { avisoLegal: PLACEHOLDER_EN, politicaPrivacidad: PLACEHOLDER_PRIV_EN },
};
