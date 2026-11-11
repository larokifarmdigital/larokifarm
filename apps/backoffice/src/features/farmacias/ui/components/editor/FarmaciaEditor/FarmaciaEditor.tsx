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
 * SECCIONES fuente de verdad: `ui/lib/sectionsConfig.ts` (metadata sin components).
 * Los `Components` siguen mapeados aquí para que el sidebar/picker/sheet no
 * arrastren el bundle de Tiptap.
 */

import { useEffect, useState } from 'react';
import type { Farmacia } from '@/core/farmacias/domain';
import {
  FarmaciaEditorProvider,
  useFarmaciaEditor,
} from '@/features/farmacias/ui/context/EditorContext';
import { EditorTopBar } from '@/features/farmacias/ui/components/editor/navigation/EditorTopBar';
import { LangTabs } from '@/features/farmacias/ui/components/editor/fields/LangTabs';
import { EditorSectionSidebar } from '@/features/farmacias/ui/components/editor/navigation/EditorSectionSidebar';
import { EditorSectionPicker } from '@/features/farmacias/ui/components/editor/navigation/EditorSectionPicker';
import { EditorSectionSheet } from '@/features/farmacias/ui/components/editor/navigation/EditorSectionSheet';
import { EditorSectionTitle } from '@/features/farmacias/ui/components/editor/navigation/EditorSectionTitle';
import { EditorSectionSwitcher } from '@/features/farmacias/ui/components/editor/navigation/EditorSectionSwitcher';
import { EditorMobileActionBar } from '@/features/farmacias/ui/components/editor/navigation/EditorMobileActionBar';
import { SECTION_BY_KEY } from '@/features/farmacias/ui/lib/sectionsConfig';
import { GeneralTab } from '@/features/farmacias/ui/components/editor/sections/GeneralTab';
import { HeroTab } from '@/features/farmacias/ui/components/editor/sections/HeroTab';
import { FeaturesTab } from '@/features/farmacias/ui/components/editor/sections/FeaturesTab';
import { SobreTab } from '@/features/farmacias/ui/components/editor/sections/SobreTab';
import { ServiciosTab } from '@/features/farmacias/ui/components/editor/sections/ServiciosTab';
import { FaqsTab } from '@/features/farmacias/ui/components/editor/sections/FaqsTab';
import { ResenasTab } from '@/features/farmacias/ui/components/editor/sections/ResenasTab';
import { LegalTab } from '@/features/farmacias/ui/components/editor/sections/LegalTab';
import { SeoTab } from '@/features/farmacias/ui/components/editor/sections/SeoTab';

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
  return (
    <FarmaciaEditorProvider initial={initial}>
      <FarmaciaEditorLayout />
    </FarmaciaEditorProvider>
  );
}

/** La sección activa vive en el contexto: el aviso de publicar y el chip de
 *  salud también navegan a una sección. */
function FarmaciaEditorLayout() {
  const { activeSectionKey, goToSection } = useFarmaciaEditor();
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeSection = SECTION_BY_KEY[activeSectionKey] ?? SECTION_BY_KEY.general;
  const ActiveComponent = COMPONENTS[activeSection.key] ?? GeneralTab;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeSectionKey]);

  const selectSection = (key: string) => {
    goToSection(key);
    setSheetOpen(false);
  };

  return (
    <>
      <EditorTopBar />

      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 pt-6 sm:pt-8 pb-40 sm:pb-24">
        <div className="grid gap-5 sm:gap-7 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Sidebar desktop (oculta < lg vía hidden) */}
          <div className="hidden lg:block">
            <EditorSectionSidebar activeKey={activeSectionKey} onSelect={goToSection} />
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
    </>
  );
}
