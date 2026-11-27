'use client';

/** Secciones en `ui/lib/sectionsConfig.ts`, sin componentes, para que la navegación no arrastre el bundle de Tiptap. */

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
import { EstadoAnunciado } from '@/features/farmacias/ui/components/editor/status/EstadoAnunciado';
import { VistaPreviaMovil, VistaPreviaPanel } from '@/features/farmacias/ui/components/editor/preview/VistaPreviaPanel';
import { VistaPreviaProvider, useVistaPrevia } from '@/features/farmacias/ui/context/VistaPreviaContext';
import { cn } from '@/shared/lib/cn';
import { DEFAULT_SECTION_KEY, SECTION_BY_KEY, puedeVerSeccion } from '@/features/farmacias/ui/lib/sectionsConfig';
import { HorarioTab } from '@/features/farmacias/ui/components/editor/sections/HorarioTab';
import { GeneralTab } from '@/features/farmacias/ui/components/editor/sections/GeneralTab';
import { HeroTab } from '@/features/farmacias/ui/components/editor/sections/HeroTab';
import { FeaturesTab } from '@/features/farmacias/ui/components/editor/sections/FeaturesTab';
import { SobreTab } from '@/features/farmacias/ui/components/editor/sections/SobreTab';
import { ServiciosTab } from '@/features/farmacias/ui/components/editor/sections/ServiciosTab';
import { FaqsTab } from '@/features/farmacias/ui/components/editor/sections/FaqsTab';
import { ResenasTab, ResenasVisibilidad } from '@/features/farmacias/ui/components/editor/sections/ResenasTab';
import { LegalTab } from '@/features/farmacias/ui/components/editor/sections/LegalTab';
import { SeoTab } from '@/features/farmacias/ui/components/editor/sections/SeoTab';
import { IdiomasTab } from '@/features/farmacias/ui/components/editor/sections/IdiomasTab';
import { ChatTab } from '@/features/farmacias/ui/components/editor/sections/ChatTab';

const COMPONENTS: Record<string, React.ComponentType> = {
  horario: HorarioTab,
  general: GeneralTab,
  idiomas: IdiomasTab,
  hero: HeroTab,
  features: FeaturesTab,
  sobre: SobreTab,
  servicios: ServiciosTab,
  faqs: FaqsTab,
  resenas: ResenasTab,
  legal: LegalTab,
  seo: SeoTab,
  chat: ChatTab,
};

export function FarmaciaEditor({
  initial,
  readOnly = false,
  esAdmin = false,
  volverA = '/farmacias',
}: {
  initial: Farmacia;
  readOnly?: boolean;
  esAdmin?: boolean;
  /** Destino de la flecha de volver: el listado (admin) o el Inicio (personal). */
  volverA?: string;
}) {
  return (
    <FarmaciaEditorProvider initial={initial} readOnly={readOnly} esAdmin={esAdmin}>
      <VistaPreviaProvider>
        <FarmaciaEditorLayout volverA={volverA} />
      </VistaPreviaProvider>
    </FarmaciaEditorProvider>
  );
}

function FarmaciaEditorLayout({ volverA }: { volverA: string }) {
  const { activeSectionKey, goToSection, readOnly, esAdmin } = useFarmaciaEditor();
  const [sheetOpen, setSheetOpen] = useState(false);
  const vistaPrevia = useVistaPrevia();
  const panelAbierto = vistaPrevia.abierta && vistaPrevia.escritorio;

  const activeSection = puedeVerSeccion(activeSectionKey, esAdmin)
    ? SECTION_BY_KEY[activeSectionKey]
    : SECTION_BY_KEY[DEFAULT_SECTION_KEY];
  const ActiveComponent = COMPONENTS[activeSection.key] ?? HorarioTab;

  // La sección vive en el hash (#hero, #seo…): al recargar se vuelve a ella.
  useEffect(() => {
    const syncFromHash = () => {
      const fromHash = window.location.hash.slice(1) || DEFAULT_SECTION_KEY;
      if (puedeVerSeccion(fromHash, esAdmin)) goToSection(fromHash);
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [goToSection, esAdmin]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    const hash = activeSectionKey === DEFAULT_SECTION_KEY ? '' : `#${activeSectionKey}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search + hash);
    }
  }, [activeSectionKey]);

  const selectSection = (key: string) => {
    goToSection(key);
    setSheetOpen(false);
  };

  return (
    <>
      <EditorTopBar volverA={volverA} />

      <div className={cn('mx-auto px-3 sm:px-6 pt-6 sm:pt-8 pb-40 sm:pb-24', panelAbierto ? 'max-w-[1760px]' : 'max-w-[1200px]')}>
        <div
          className={cn(
            'grid gap-5 sm:gap-7 grid-cols-1',
            panelAbierto
              ? // Con la vista previa abierta, por debajo de xl el menú de secciones pasa a
                // ser el desplegable de móvil: formulario y web a medias (~440 px cada uno a 1024).
                'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_minmax(360px,1fr)]'
              : 'lg:grid-cols-[220px_minmax(0,1fr)]',
          )}
        >
          <div className={cn('hidden', panelAbierto ? 'xl:block' : 'lg:block')}>
            <EditorSectionSidebar activeKey={activeSectionKey} onSelect={goToSection} />
          </div>

          <div className="min-w-0">
            <div className={panelAbierto ? 'xl:hidden' : 'lg:hidden'}>
              <EditorSectionPicker
                activeKey={activeSectionKey}
                isOpen={sheetOpen}
                onToggle={() => setSheetOpen((v) => !v)}
              />
            </div>

            <EditorSectionSwitcher keyId={activeSection.key}>
              <EditorSectionTitle title={activeSection.label} hint={activeSection.hint} />
              {/* Ajustes que no dependen del idioma van encima de las pestañas */}
              {activeSection.key === 'resenas' && (
                <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
                  <ResenasVisibilidad />
                </fieldset>
              )}
              {activeSection.multilang && <LangTabs sectionKey={activeSection.key} />}
              {readOnly && (
                <p role="status" className="mb-4 rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] px-3 py-2 text-[13px] text-[var(--color-ink-2)]">
                  Modo solo lectura: tu usuario puede ver el contenido pero no modificarlo.
                </p>
              )}
              {/* fieldset disabled desactiva todos los inputs/botones nativos de la sección */}
              <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
                <ActiveComponent />
              </fieldset>
            </EditorSectionSwitcher>
          </div>

          {panelAbierto && (
            <div className="sticky top-[8.5rem] h-[calc(100vh-10rem)] min-h-[420px]">
              <VistaPreviaPanel onCerrar={vistaPrevia.cerrar} />
            </div>
          )}
        </div>
      </div>

      {!vistaPrevia.escritorio && (
        <VistaPreviaMovil open={vistaPrevia.abierta} onOpenChange={(v) => (v ? vistaPrevia.abrir() : vistaPrevia.cerrar())} />
      )}

      <EditorSectionSheet
        open={sheetOpen}
        activeKey={activeSectionKey}
        onClose={() => setSheetOpen(false)}
        onSelect={selectSection}
      />

      <EditorMobileActionBar />
      <EstadoAnunciado />
    </>
  );
}

