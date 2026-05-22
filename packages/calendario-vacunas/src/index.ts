export { default as CalendarioVacunas } from './components/CalendarioVacunas.astro';
export { default as IndiceComunidades } from './components/IndiceComunidades.astro';
export { default as MatrizCalendario } from './components/MatrizCalendario.astro';
export { default as ComunidadGrid } from './components/ComunidadGrid.astro';
export { default as GrupoEdadSection } from './components/GrupoEdadSection.astro';
export { default as TablaCalendario } from './components/TablaCalendario.astro';
export { default as NotaVacuna } from './components/NotaVacuna.astro';

export {
  sanity,
  listarComunidades,
  obtenerComunidad,
  listarFarmaciasPartner,
  type Enfermedad,
  type Vacuna,
  type Dosis,
  type Entrada,
  type GrupoEdadNombre,
  type GrupoEdad,
  type ComunidadTipo,
  type ComunidadResumen,
  type Comunidad,
  type FarmaciaPartner,
} from './lib/sanity';

export { t, isLang, resolveLang, type Lang } from './lib/i18n';
