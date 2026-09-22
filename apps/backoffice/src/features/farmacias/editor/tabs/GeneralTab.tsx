'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { IconInput } from '@/components/ui/IconInput';
import { LabelHelpIcon } from '@/components/ui/LabelHelpIcon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { NavIcon, type IconName } from '@/features/shell/NavIcon';
import { useFarmaciaEditor } from '../EditorContext';
import { HorarioSemanal } from '../HorarioSemanal';
import { slugify } from '@/lib/utils';
import type { Horario, ImagenAsset } from '@/types/content';

const REDES: { key: 'instagram' | 'facebook' | 'x' | 'tiktok' | 'youtube'; label: string; icon: IconName; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: 'InstagramLogo', placeholder: 'usuario' },
  { key: 'facebook', label: 'Facebook', icon: 'FacebookLogo', placeholder: 'usuario' },
  { key: 'x', label: 'X (Twitter)', icon: 'XLogo', placeholder: 'usuario' },
  { key: 'tiktok', label: 'TikTok', icon: 'TiktokLogo', placeholder: 'usuario' },
  { key: 'youtube', label: 'YouTube', icon: 'YoutubeLogo', placeholder: 'usuario' },
];

const HORARIO_TIPICO: Horario[] = [
  { dia: 'lun', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }], cerrado: false },
  { dia: 'mar', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }], cerrado: false },
  { dia: 'mie', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }], cerrado: false },
  { dia: 'jue', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }], cerrado: false },
  { dia: 'vie', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }], cerrado: false },
  { dia: 'sab', tramos: [{ abre: '09:30', cierra: '14:00' }], cerrado: false },
  { dia: 'dom', tramos: [], cerrado: true },
];

function mockUpload(name: string): ImagenAsset {
  const seed = name.replace(/\W+/g, '-').toLowerCase() || `img-${Date.now()}`;
  return {
    id: `img_${Math.random().toString(36).slice(2, 10)}`,
    url: `https://picsum.photos/seed/${seed}/480/480`,
    alt: {},
  };
}

export function GeneralTab() {
  const { farmacia, patch } = useFarmaciaEditor();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const d = farmacia.direccion ?? {};

  const setDir = (field: string, value: string) => {
    patch({ direccion: { ...d, [field]: value } });
  };

  const setLogo = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    patch({ logo: mockUpload(files[0].name) });
  };

  return (
    <div className="space-y-10 max-w-3xl">
      {/* ============= IDENTIDAD ============= */}
      <section aria-labelledby="sec-identidad">
        <SectionHeader
          id="sec-identidad"
          title="Identidad"
          hint="Datos básicos y logotipo. Se muestran en la cabecera de la landing y en el SEO por defecto."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="nombre" required>Nombre comercial</Label>
            <Input
              id="nombre"
              value={farmacia.nombre}
              onChange={(e) => patch({ nombre: e.target.value })}
              placeholder="Farmàcia Torrents"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="slug" required>URL pública</Label>
            <IconInput
              id="slug"
              icon={<NavIcon name="Globe" size={15} />}
              label="URL pública"
              prefix="larokifarm.com/"
              value={farmacia.slug}
              onChange={(e) => patch({ slug: slugify(e.target.value) })}
              placeholder="mi-farmacia"
              className="font-mono-tabular"
            />
          </div>

          <div>
            <Label htmlFor="ciudad">Ciudad</Label>
            <IconInput
              id="ciudad"
              icon={<NavIcon name="MapPin" size={15} />}
              label="Ciudad"
              value={farmacia.ciudad ?? ''}
              onChange={(e) => patch({ ciudad: e.target.value })}
              placeholder="Barcelona"
            />
          </div>
          <div>
            <Label htmlFor="titular">Titular</Label>
            <IconInput
              id="titular"
              icon={<NavIcon name="User" size={15} />}
              label="Farmacéutica titular"
              value={farmacia.titular ?? ''}
              onChange={(e) => patch({ titular: e.target.value })}
              placeholder="Nombre completo"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="colegiado">Nº colegiado</Label>
            <IconInput
              id="colegiado"
              icon={<NavIcon name="IdentificationCard" size={15} />}
              label="Número de colegiado"
              value={farmacia.numeroColegiado ?? ''}
              onChange={(e) => patch({ numeroColegiado: e.target.value })}
              placeholder="08-3421"
              className="font-mono-tabular"
            />
          </div>

          {/* Logotipo */}
          <div className="sm:col-span-2">
            <Label hint={<span className="text-[10.5px] font-mono-tabular text-[var(--color-muted-2)]">240×240 mín · cuadrado</span>}>Logotipo</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                aria-label={farmacia.logo ? 'Reemplazar logotipo' : 'Subir logotipo'}
                className="relative h-16 w-16 shrink-0 rounded-[10px] overflow-hidden border border-[var(--color-hairline-strong)] bg-[var(--color-surface-sunken)] hover:border-[var(--color-accent)] transition-colors group"
              >
                {farmacia.logo ? (
                  <>
                    <Image
                      src={farmacia.logo.url}
                      alt={farmacia.logo.alt['es'] ?? 'Logo'}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                    <span className="absolute inset-0 bg-[var(--color-ink)]/60 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-white text-[10.5px] font-mono-tabular uppercase tracking-wider">
                      Cambiar
                    </span>
                  </>
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-[var(--color-muted)] group-hover:text-[var(--color-accent)] transition-colors">
                    <NavIcon name="Plus" size={20} />
                  </div>
                )}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setLogo(e.target.files)}
              />
              {farmacia.logo && (
                <button
                  type="button"
                  onClick={() => patch({ logo: undefined })}
                  aria-label="Quitar logotipo"
                  className="h-8 w-8 flex items-center justify-center rounded-[6px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)] transition-colors"
                >
                  <NavIcon name="Trash" size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="hairline" />

      {/* ============= CONTACTO ============= */}
      <section aria-labelledby="sec-contacto">
        <SectionHeader
          id="sec-contacto"
          title="Contacto"
          hint="Canales de contacto que se muestran en el pie de la landing y en la ficha de Google."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <IconInput
            id="telefono"
            type="tel"
            icon={<NavIcon name="Phone" size={15} />}
            label="Teléfono"
            value={farmacia.telefono ?? ''}
            onChange={(e) => patch({ telefono: e.target.value })}
            placeholder="+34 934 12 34 56"
            className="font-mono-tabular"
          />
          <IconInput
            id="whatsapp"
            type="tel"
            icon={<NavIcon name="WhatsappLogo" size={15} />}
            label="WhatsApp"
            value={farmacia.whatsapp ?? ''}
            onChange={(e) => patch({ whatsapp: e.target.value })}
            placeholder="+34 600 12 34 56"
            className="font-mono-tabular"
          />
          <IconInput
            id="email"
            type="email"
            icon={<NavIcon name="EnvelopeSimple" size={15} />}
            label="Correo electrónico"
            value={farmacia.email ?? ''}
            onChange={(e) => patch({ email: e.target.value })}
            placeholder="hola@farmacia.com"
          />
          <IconInput
            id="web"
            type="url"
            icon={<NavIcon name="Globe" size={15} />}
            label="Web propia"
            value={farmacia.web ?? ''}
            onChange={(e) => patch({ web: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </section>

      <div className="hairline" />

      {/* ============= REDES ============= */}
      <section aria-labelledby="sec-redes">
        <SectionHeader
          id="sec-redes"
          title="Redes sociales"
          hint="Solo las que rellenes aparecerán como iconos en el pie de la landing."
        />

        <div className="card divide-y divide-[var(--color-hairline)] overflow-hidden">
          {REDES.map(({ key, label, icon, placeholder }) => {
            const value = farmacia.redes?.[key] ?? '';
            const filled = value.trim().length > 0;
            return (
              <IconInput
                key={key}
                id={`red-${key}`}
                type="text"
                bare
                icon={
                  <NavIcon
                    name={icon}
                    size={17}
                    weight={filled ? 'fill' : 'regular'}
                    className={filled ? 'text-[var(--color-accent)]' : ''}
                  />
                }
                label={label}
                value={value}
                onChange={(e) =>
                  patch({ redes: { ...(farmacia.redes ?? {}), [key]: e.target.value } })
                }
                placeholder={placeholder}
              />
            );
          })}
        </div>
      </section>

      <div className="hairline" />

      {/* ============= DIRECCIÓN ============= */}
      <section aria-labelledby="sec-direccion">
        <SectionHeader
          id="sec-direccion"
          title="Dirección"
          hint="Sirve como base para el mapa y el botón «Cómo llegar» de la landing."
        />

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <div className="sm:col-span-4">
            <Input
              id="calle"
              aria-label="Calle"
              value={d.calle ?? ''}
              onChange={(e) => setDir('calle', e.target.value)}
              placeholder="Calle"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              id="numero"
              aria-label="Número"
              value={d.numero ?? ''}
              onChange={(e) => setDir('numero', e.target.value)}
              placeholder="Nº"
              className="font-mono-tabular"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              id="cp"
              aria-label="Código postal"
              value={d.cp ?? ''}
              onChange={(e) => setDir('cp', e.target.value)}
              placeholder="CP"
              className="font-mono-tabular"
            />
          </div>
          <div className="sm:col-span-4">
            <Input
              id="ciudad-dir"
              aria-label="Ciudad"
              value={d.ciudad ?? farmacia.ciudad ?? ''}
              onChange={(e) => setDir('ciudad', e.target.value)}
              placeholder="Ciudad"
            />
          </div>
          <div className="sm:col-span-3">
            <Input
              id="provincia"
              aria-label="Provincia"
              value={d.provincia ?? ''}
              onChange={(e) => setDir('provincia', e.target.value)}
              placeholder="Provincia"
            />
          </div>
          <div className="sm:col-span-3">
            <Input
              id="pais"
              aria-label="País"
              value={d.pais ?? ''}
              onChange={(e) => setDir('pais', e.target.value)}
              placeholder="País"
            />
          </div>

          <div className="sm:col-span-6">
            <Label
              htmlFor="gmaps"
              hint={
                <LabelHelpIcon ariaLabel="Ayuda sobre el enlace de Google Maps">
                  Botón «Cómo llegar» de la landing. Copia el enlace desde
                  maps.google.com → buscar la farmacia → «Compartir» → «Copiar enlace».
                </LabelHelpIcon>
              }
            >
              Enlace de Google Maps
            </Label>
            <IconInput
              id="gmaps"
              type="url"
              icon={<NavIcon name="MapPin" size={15} />}
              label="Enlace de Google Maps"
              value={farmacia.googleMapsUrl ?? ''}
              onChange={(e) => patch({ googleMapsUrl: e.target.value })}
              placeholder="https://maps.google.com/?cid=..."
            />
          </div>

          <div className="sm:col-span-6">
            <Label
              htmlFor="mapa-embed"
              hint={
                <LabelHelpIcon ariaLabel="Ayuda sobre el iframe embed">
                  Opcional. En Google Maps: «Compartir» → «Insertar un mapa» → copia el src del iframe.
                  Si lo dejas vacío, la landing cae al enlace público de arriba.
                </LabelHelpIcon>
              }
            >
              URL del mapa embebido
            </Label>
            <IconInput
              id="mapa-embed"
              type="url"
              icon={<NavIcon name="Globe" size={15} />}
              label="URL del mapa embebido"
              value={farmacia.mapaUrl ?? ''}
              onChange={(e) => patch({ mapaUrl: e.target.value })}
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
          </div>
        </div>
      </section>

      <div className="hairline" />

      {/* ============= HORARIOS ============= */}
      <section aria-labelledby="sec-horarios">
        <SectionHeader
          id="sec-horarios"
          title="Horario semanal"
          hint="Hasta dos tramos por día. La plantilla típica rellena los 7 días de un click."
          actions={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => patch({ horarios: HORARIO_TIPICO })}
            >
              <NavIcon name="Lightning" size={13} />
              <span className="hidden sm:inline">Plantilla típica</span>
              <span className="sm:hidden">Plantilla</span>
            </Button>
          }
        />

        <HorarioSemanal
          horarios={farmacia.horarios}
          onChange={(next) => patch({ horarios: next })}
        />
      </section>
    </div>
  );
}
