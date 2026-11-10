'use client';

/**
 * Layout del editor de farmacia.
 *
 * ARQUITECTURA (nuevo patrón UX acordado 2026-11-10):
 *   - Desktop (≥ 900px): sidebar izquierdo con las 9 secciones agrupadas visualmente
 *     (Datos / Portada / Contenido / Config). Un solo click para saltar a cualquier
 *     sección, sin sub-segmentado.
 *   - Móvil (< 900px): picker sticky con sección actual + bottom sheet compacto al
 *     tocarlo. Reemplaza el EditorFloatingNav + EditorGroupSegmented.
 *   - LangTabs único, global al inicio del content (no por sección, no sticky
 *     en múltiples capas).
 *   - MultilangInput / LocaleChip / TiptapField siguen funcionando igual — leen
 *     currentLocale del contexto.
 *
 * SECCIONES fuente de verdad: `sections-config.ts` (metadata sin components).
 * Los `Components` siguen mapeados aquí para que el sidebar/picker/sheet no
 * arrastren el bundle de Tiptap.
 */

import { useEffect, useState } from 'react';
import type { Farmacia } from '@/types/content';
import { FarmaciaEditorProvider } from './EditorContext';
import { EditorTopBar } from './EditorTopBar';
import { LangTabs } from './LangTabs';
import { EditorSectionSidebar } from './EditorSectionSidebar';
import { EditorSectionPicker } from './EditorSectionPicker';
import { EditorSectionSheet } from './EditorSectionSheet';
import { EditorSectionTitle } from './EditorSectionTitle';
import { EditorSectionSwitcher } from './EditorSectionSwitcher';
import { EditorMobileActionBar } from './EditorMobileActionBar';
import { SECTION_BY_KEY } from './sections-config';
import { GeneralTab } from './tabs/GeneralTab';
import { HeroTab } from './tabs/HeroTab';
import { FeaturesTab } from './tabs/FeaturesTab';
import { SobreTab } from './tabs/SobreTab';
import { ServiciosTab } from './tabs/ServiciosTab';
import { FaqsTab } from './tabs/FaqsTab';
import { ResenasTab } from './tabs/ResenasTab';
import { LegalTab } from './tabs/LegalTab';
import { SeoTab } from './tabs/SeoTab';

const COMPONENTS: Record<string, React.ComponentType> = {
  general: GeneralTab,
  hero: HeroTab,
  features: FeaturesTab,
  sobre: SobreTab,
  servicios: ServiciosTab,
  faqs: FaqsTab,
  resenas: ResenasTab,
  legal: LegalTab,
  seo: SeoTab,
};

export function FarmaciaEditor({ initial }: { initial: Farmacia }) {
  const [activeSectionKey, setActiveSectionKey] = useState<string>('general');
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeSection = SECTION_BY_KEY[activeSectionKey] ?? SECTION_BY_KEY.general;
  const ActiveComponent = COMPONENTS[activeSection.key] ?? GeneralTab;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeSectionKey]);

  const selectSection = (key: string) => {
    setActiveSectionKey(key);
    setSheetOpen(false);
  };

  return (
    <FarmaciaEditorProvider initial={initial}>
      <EditorTopBar />

      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 pt-6 sm:pt-8 pb-40 sm:pb-24">
        <div className="grid gap-5 sm:gap-7 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Sidebar desktop (oculta < lg vía hidden) */}
          <div className="hidden lg:block">
            <EditorSectionSidebar activeKey={activeSectionKey} onSelect={setActiveSectionKey} />
          </div>

          <div className="min-w-0">
            {/* Picker móvil (oculto en lg+) */}
            <div className="lg:hidden">
              <EditorSectionPicker
                activeKey={activeSectionKey}
                isOpen={sheetOpen}
                onToggle={() => setSheetOpen((v) => !v)}
              />
            </div>

            <EditorSectionSwitcher keyId={activeSection.key}>
              <EditorSectionTitle
                step={activeSection.step}
                title={activeSection.label}
                hint={activeSection.hint}
              />
              {activeSection.multilang && <LangTabs />}
              <ActiveComponent />
            </EditorSectionSwitcher>
          </div>
        </div>
      </div>

      {/* Sheet móvil: renderizado en cualquier viewport (el picker solo aparece en móvil) */}
      <EditorSectionSheet
        open={sheetOpen}
        activeKey={activeSectionKey}
        onClose={() => setSheetOpen(false)}
        onSelect={selectSection}
      />

      <EditorMobileActionBar />
    </FarmaciaEditorProvider>
  );
}
