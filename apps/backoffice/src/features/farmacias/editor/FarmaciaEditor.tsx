'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Farmacia } from '@/types/content';
import { FarmaciaEditorProvider } from './EditorContext';
import { EditorTopBar } from './EditorTopBar';
import { LangTabs } from './LangTabs';
import { EditorFloatingNav, type FloatingNavSection } from './EditorFloatingNav';
import { EditorGroupSegmented, type SegmentedItem } from './EditorGroupSegmented';
import { EditorSectionTitle } from './EditorSectionTitle';
import { EditorSectionSwitcher } from './EditorSectionSwitcher';
import { EditorMobileActionBar } from './EditorMobileActionBar';
import { GeneralTab } from './tabs/GeneralTab';
import { HeroTab } from './tabs/HeroTab';
import { FeaturesTab } from './tabs/FeaturesTab';
import { SobreTab } from './tabs/SobreTab';
import { ServiciosTab } from './tabs/ServiciosTab';
import { FaqsTab } from './tabs/FaqsTab';
import { ResenasTab } from './tabs/ResenasTab';
import { LegalTab } from './tabs/LegalTab';
import { SeoTab } from './tabs/SeoTab';
import type { IconName } from '@/features/shell/NavIcon';

type Section = {
  key: string;
  label: string;
  icon: IconName;
  hint: string;
  step: string;
  multilang: boolean;
  Component: React.ComponentType;
};

const SECTIONS: Record<string, Section> = {
  general: {
    key: 'general',
    label: 'General',
    icon: 'Storefront',
    step: '01',
    hint: 'Identidad, contacto, dirección y horarios. Base pública de la farmacia.',
    multilang: false,
    Component: GeneralTab,
  },
  hero: {
    key: 'hero',
    label: 'Hero',
    icon: 'Image',
    step: '02',
    hint: 'Primera pantalla de la landing: textos, imágenes y tarjetas flotantes.',
    multilang: true,
    Component: HeroTab,
  },
  features: {
    key: 'features',
    label: 'Features',
    icon: 'Lightning',
    step: '03',
    hint: 'Franja de tarjetas bajo el hero. Hasta 6, se recomiendan 4.',
    multilang: true,
    Component: FeaturesTab,
  },
  sobre: {
    key: 'sobre',
    label: 'Sobre',
    icon: 'UsersThree',
    step: '04',
    hint: 'Sección «Sobre nosotros»: textos, años de experiencia, puntos destacados, descripción larga e imágenes.',
    multilang: true,
    Component: SobreTab,
  },
  servicios: {
    key: 'servicios',
    label: 'Servicios',
    icon: 'Check',
    step: '05',
    hint: 'Los servicios que ofreces y su descripción por idioma.',
    multilang: true,
    Component: ServiciosTab,
  },
  faqs: {
    key: 'faqs',
    label: 'FAQs',
    icon: 'QuestionMark',
    step: '06',
    hint: 'Preguntas y respuestas más frecuentes. Aparecen como FAQ schema en Google.',
    multilang: true,
    Component: FaqsTab,
  },
  resenas: {
    key: 'resenas',
    label: 'Reseñas',
    icon: 'ChatCircleText',
    step: '07',
    hint: 'Textos de la sección y conexión con Google Business Profile.',
    multilang: true,
    Component: ResenasTab,
  },
  legal: {
    key: 'legal',
    label: 'Legal',
    icon: 'Scales',
    step: '08',
    hint: 'Aviso legal y política de privacidad específicos de esta farmacia (opcional).',
    multilang: true,
    Component: LegalTab,
  },
  seo: {
    key: 'seo',
    label: 'SEO',
    icon: 'Globe',
    step: '09',
    hint: 'Cómo aparece la landing en resultados de búsqueda.',
    multilang: true,
    Component: SeoTab,
  },
};

type Group = {
  key: string;
  label: string;
  icon: IconName;
  sections: string[];
};

const GROUPS: Group[] = [
  { key: 'datos', label: 'Datos', icon: 'Storefront', sections: ['general'] },
  { key: 'portada', label: 'Portada', icon: 'Image', sections: ['hero', 'features'] },
  { key: 'contenido', label: 'Contenido', icon: 'PencilSimple', sections: ['sobre', 'servicios', 'faqs', 'resenas'] },
  { key: 'config', label: 'Config', icon: 'GearSix', sections: ['legal', 'seo'] },
];

const GROUP_OF_SECTION: Record<string, string> = GROUPS.reduce(
  (acc, g) => {
    for (const s of g.sections) acc[s] = g.key;
    return acc;
  },
  {} as Record<string, string>,
);

const NAV_GROUPS: FloatingNavSection[] = GROUPS.map(({ key, label, icon }) => ({ key, label, icon }));

export function FarmaciaEditor({ initial }: { initial: Farmacia }) {
  const [activeSectionKey, setActiveSectionKey] = useState<string>('general');

  const activeSection = SECTIONS[activeSectionKey] ?? SECTIONS.general;
  const activeGroupKey = GROUP_OF_SECTION[activeSection.key];
  const activeGroup = GROUPS.find((g) => g.key === activeGroupKey) ?? GROUPS[0];

  const segmentedItems: SegmentedItem[] = useMemo(
    () =>
      activeGroup.sections.map((sk) => ({
        key: sk,
        label: SECTIONS[sk].label,
        icon: SECTIONS[sk].icon,
      })),
    [activeGroup],
  );

  const showSegmented = segmentedItems.length > 1;
  const showLangTabs = activeSection.multilang;

  const selectGroup = (groupKey: string) => {
    const g = GROUPS.find((x) => x.key === groupKey);
    if (!g) return;
    // Ir a la primera sección del grupo
    setActiveSectionKey(g.sections[0]);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeSectionKey]);

  const ActiveComponent = activeSection.Component;

  return (
    <FarmaciaEditorProvider initial={initial}>
      <EditorTopBar />

      {showSegmented && (
        <div className="sticky top-[calc(3.5rem+56px)] z-10 bg-[var(--color-bg)]/95 backdrop-blur border-b border-[var(--color-hairline)]">
          <div className="max-w-[880px] mx-auto px-4 sm:px-8 py-2.5">
            <EditorGroupSegmented
              items={segmentedItems}
              activeKey={activeSection.key}
              onSelect={setActiveSectionKey}
            />
          </div>
        </div>
      )}

      {showLangTabs && (
        <div
          className="sticky z-10 bg-[var(--color-bg)]/95 backdrop-blur border-b border-[var(--color-hairline)]"
          style={{ top: showSegmented ? 'calc(3.5rem + 56px + 52px)' : 'calc(3.5rem + 56px)' }}
        >
          <div className="max-w-[880px] mx-auto px-4 sm:px-8">
            <LangTabs />
          </div>
        </div>
      )}

      <div className="max-w-[880px] mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-40 sm:pb-24">
        <EditorSectionSwitcher keyId={activeSection.key}>
          <EditorSectionTitle step={activeSection.step} title={activeSection.label} hint={activeSection.hint} />
          <ActiveComponent />
        </EditorSectionSwitcher>
      </div>

      <EditorFloatingNav
        sections={NAV_GROUPS}
        activeKey={activeGroupKey}
        onSelect={selectGroup}
      />
      <EditorMobileActionBar />
    </FarmaciaEditorProvider>
  );
}
