'use client';

import { useState } from 'react';
import { Input } from '@/shared/components/atoms/Input';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { Label } from '@/shared/components/atoms/Label';
import { Button } from '@/shared/components/atoms/Button';
import { IconInput } from '@/shared/components/atoms/IconInput';
import { LabelHelpIcon } from '@/shared/components/molecules/LabelHelpIcon';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { NavIcon, type IconName } from '@/shared/components/atoms/NavIcon';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { HorarioSemanal } from '@/features/farmacias/ui/components/editor/fields/HorarioSemanal';
import { ImageGalleryField } from '@/features/farmacias/ui/components/editor/fields/ImageGalleryField';
import { slugify } from '@/shared/lib/slugify';
import { cn } from '@/shared/lib/cn';
import { useFieldErrors } from '@/features/farmacias/ui/hooks/useFieldError';
import { FieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import type { Horario } from '@/core/farmacias/domain';

const REDES: { key: 'instagram' | 'facebook' | 'x' | 'tiktok' | 'youtube'; label: string; icon: IconName; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: 'InstagramLogo', placeholder: '@usuario o enlace al perfil' },
  { key: 'facebook', label: 'Facebook', icon: 'FacebookLogo', placeholder: '@usuario o enlace al perfil' },
  { key: 'x', label: 'X (Twitter)', icon: 'XLogo', placeholder: '@usuario o enlace al perfil' },
  { key: 'tiktok', label: 'TikTok', icon: 'TiktokLogo', placeholder: '@usuario o enlace al perfil' },
  { key: 'youtube', label: 'YouTube', icon: 'YoutubeLogo', placeholder: '@usuario o enlace al perfil' },
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

/** Asterisco rojo para campos obligatorios que no tienen label visible. */
function RequiredMark({ floating = false }: { floating?: boolean }) {
  return (
    <span
      aria-hidden
      title="Obligatorio para publicar"
      className={cn(
        'text-[var(--color-red-ink)] text-[24px] font-bold leading-none select-none',
        floating ? 'pointer-events-none absolute right-3 top-[27px] -translate-y-1/2' : 'flex items-center pr-1 pt-[9px]',
      )}
    >
      *
    </span>
  );
}

export function GeneralTab() {
  const { farmacia, patch } = useFarmaciaEditor();
  const [confirmPlantilla, setConfirmPlantilla] = useState(false);
  const fieldError = useFieldErrors();
  const d = farmacia.direccion ?? {};
  const feDireccionNumero = fieldError('direccion.numero');
  const feDireccionProvincia = fieldError('direccion.provincia');
  const feDireccionPais = fieldError('direccion.pais');
  const feMapa = fieldError('mapa');
  const feHorarios = fieldError('horarios');
  const feNombre = fieldError('nombre');
  const feNumerocolegiado = fieldError('numeroColegiado');
  const feTelefono = fieldError('telefono');
  const feWhatsapp = fieldError('whatsapp');
  const feEmail = fieldError('email');
  const feWeb = fieldError('web');
  const feDireccionCalle = fieldError('direccion.calle');
  const feDireccionCp = fieldError('direccion.cp');
  const feDireccionCiudad = fieldError('direccion.ciudad');
  const feGooglemapsurl = fieldError('googleMapsUrl');
  const feMapaurl = fieldError('mapaUrl');

  const setDir = (field: string, value: string) => {
    patch({ direccion: { ...d, [field]: value } });
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
              {...feNombre.inputProps}
              value={farmacia.nombre}
              onChange={(e) => patch({ nombre: e.target.value })}
              placeholder="Farmàcia Torrents"
            />
            <FieldError {...feNombre} />
          </div>
          <div className="sm:col-span-2">
            <Label
              htmlFor="slug"
              required
              hint={
                <LabelHelpIcon>
                  Código interno con el que la web de la farmacia lee su contenido. No es la dirección
                  de la web (esa va en Contacto → Web). Con la web publicada no se puede cambiar: la web
                  dejaría de actualizarse.
                </LabelHelpIcon>
              }
            >
              Identificador
            </Label>
            <IconInput
              id="slug"
              icon={<NavIcon name="Hash" size={15} />}
              label="Identificador"
              readOnly={farmacia.status === 'published'}
              value={farmacia.slug}
              onChange={(e) => patch({ slug: slugify(e.target.value).slice(0, 60) })}
              onBlur={() => {
                const clean = farmacia.slug.replace(/^-+|-+$/g, '');
                if (clean !== farmacia.slug) patch({ slug: clean });
              }}
              maxLength={60}
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
              {...feNumerocolegiado.inputProps}
              icon={<NavIcon name="IdentificationCard" size={15} />}
              label="Número de colegiado"
              value={farmacia.numeroColegiado ?? ''}
              onChange={(e) => patch({ numeroColegiado: e.target.value })}
              placeholder="08-3421"
              className="font-mono-tabular"
            />
            <FieldError {...feNumerocolegiado} />
          </div>

          {/* Logotipo — sube a R2 vía uploadContentImage server action */}
          <div className="sm:col-span-2">
            <ImageGalleryField
              mode="single"
              businessId={farmacia.id}
              role="logo"
              field="logo"
              required
              label="Logotipo"
              hint="240×240 mín · cuadrado · PNG o SVG con fondo transparente"
              value={farmacia.logo}
              onChange={(logo) => patch({ logo: logo ?? undefined })}
              className="max-w-[220px]"
            />
          </div>
        </div>
      </section>

      <div className="hairline" />

      {/* ============= CONTACTO ============= */}
      <section aria-labelledby="sec-contacto">
        <SectionHeader
          id="sec-contacto"
          title="Contacto"
          hint="Canales de contacto que se muestran en el pie de la landing y en la ficha de Google. Teléfono, correo y web son obligatorios para publicar."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <IconInput
              id="telefono"
              {...feTelefono.inputProps}
              type="tel"
              icon={<NavIcon name="Phone" size={15} />}
              label="Teléfono"
              value={farmacia.telefono ?? ''}
              onChange={(e) => patch({ telefono: e.target.value })}
              placeholder="+34 934 12 34 56"
              className="font-mono-tabular"
            suffix={<RequiredMark />}
            />
            <FieldError {...feTelefono} />
          </div>
          <div>
            <IconInput
              id="whatsapp"
              {...feWhatsapp.inputProps}
              type="tel"
              icon={<NavIcon name="WhatsappLogo" size={15} />}
              label="WhatsApp"
              value={farmacia.whatsapp ?? ''}
              onChange={(e) => patch({ whatsapp: e.target.value })}
              placeholder="+34 600 12 34 56"
              className="font-mono-tabular"
            />
            <FieldError {...feWhatsapp} />
          </div>
          <div>
            <IconInput
              id="email"
              {...feEmail.inputProps}
              type="email"
              icon={<NavIcon name="EnvelopeSimple" size={15} />}
              label="Correo electrónico"
              value={farmacia.email ?? ''}
              onChange={(e) => patch({ email: e.target.value })}
              placeholder="hola@farmacia.com"
            suffix={<RequiredMark />}
            />
            <FieldError {...feEmail} />
          </div>
          <div>
            <IconInput
              id="web"
              {...feWeb.inputProps}
              type="url"
              icon={<NavIcon name="Globe" size={15} />}
              label="Web propia"
              value={farmacia.web ?? ''}
              onChange={(e) => patch({ web: e.target.value })}
              placeholder="https://..."
            suffix={<RequiredMark />}
            />
            <FieldError {...feWeb} />
          </div>
        </div>
      </section>

      <div className="hairline" />

      {/* ============= REDES ============= */}
      <section aria-labelledby="sec-redes">
        <SectionHeader
          id="sec-redes"
          title="Redes sociales"
          hint="Tu usuario (@mifarmacia) o el enlace a tu perfil. Solo las que rellenes aparecerán en el pie de la landing."
        />

        <div className="card divide-y divide-[var(--color-hairline)] overflow-hidden">
          {REDES.map(({ key, label, icon, placeholder }) => {
            const value = farmacia.redes?.[key] ?? '';
            const filled = value.trim().length > 0;
            const fe = fieldError(`redes.${key}`);
            return (
              <div key={key}>
              <IconInput
                id={`red-${key}`}
                {...fe.inputProps}
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
              {fe.message && (
                <div className="px-3 pb-2">
                  <FieldError {...fe} />
                </div>
              )}
              </div>
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
          hint="Sirve como base para el mapa y el botón «Cómo llegar» de la landing. Todos los campos son obligatorios para publicar, salvo el número."
        />

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <div className="sm:col-span-4">
            <div className="relative">
<Input
              id="calle"
              {...feDireccionCalle.inputProps}
              aria-label="Calle"
              value={d.calle ?? ''}
              onChange={(e) => setDir('calle', e.target.value)}
              placeholder="Calle"
            />
            <FieldError {...feDireccionCalle} />
            <RequiredMark floating />
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="relative">
<Input
              id="numero"
              {...feDireccionNumero.inputProps}
              aria-label="Número"
              value={d.numero ?? ''}
              onChange={(e) => setDir('numero', e.target.value)}
              placeholder="Nº"
              className="font-mono-tabular"
            />
            <FieldError {...feDireccionNumero} />
            
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="relative">
<Input
              id="cp"
              {...feDireccionCp.inputProps}
              aria-label="Código postal"
              value={d.cp ?? ''}
              onChange={(e) => setDir('cp', e.target.value)}
              placeholder="CP"
              className="font-mono-tabular"
            />
            <FieldError {...feDireccionCp} />
            <RequiredMark floating />
            </div>
          </div>
          <div className="sm:col-span-4">
            <div className="relative">
<Input
              id="ciudad-dir"
              {...feDireccionCiudad.inputProps}
              aria-label="Ciudad"
              value={d.ciudad ?? farmacia.ciudad ?? ''}
              onChange={(e) => setDir('ciudad', e.target.value)}
              placeholder="Ciudad"
            />
            <FieldError {...feDireccionCiudad} />
            <RequiredMark floating />
            </div>
          </div>
          <div className="sm:col-span-3">
            <div className="relative">
<Input
              id="provincia"
              {...feDireccionProvincia.inputProps}
              aria-label="Provincia"
              value={d.provincia ?? ''}
              onChange={(e) => setDir('provincia', e.target.value)}
              placeholder="Provincia"
            />
            <FieldError {...feDireccionProvincia} />
            <RequiredMark floating />
            </div>
          </div>
          <div className="sm:col-span-3">
            <div className="relative">
<Input
              id="pais"
              {...feDireccionPais.inputProps}
              aria-label="País"
              value={d.pais ?? ''}
              onChange={(e) => setDir('pais', e.target.value)}
              placeholder="País"
            />
            <FieldError {...feDireccionPais} />
            <RequiredMark floating />
            </div>
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
              {...feGooglemapsurl.inputProps}
              invalid={feGooglemapsurl.inputProps.invalid || feMapa.inputProps.invalid}
              onBlur={() => { feGooglemapsurl.inputProps.onBlur(); feMapa.inputProps.onBlur(); }}
              type="url"
              icon={<NavIcon name="MapPin" size={15} />}
              label="Enlace de Google Maps"
              value={farmacia.googleMapsUrl ?? ''}
              onChange={(e) => patch({ googleMapsUrl: e.target.value })}
              placeholder="https://maps.google.com/?cid=..."
            />
            <FieldError {...feGooglemapsurl} />
            {!feGooglemapsurl.message && <FieldError {...feMapa} />}
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
              {...feMapaurl.inputProps}
              type="url"
              icon={<NavIcon name="Globe" size={15} />}
              label="URL del mapa embebido"
              value={farmacia.mapaUrl ?? ''}
              onChange={(e) => patch({ mapaUrl: e.target.value })}
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
            <FieldError {...feMapaurl} />
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
              onClick={() =>
                farmacia.horarios.some((h) => h.tramos.length > 0)
                  ? setConfirmPlantilla(true)
                  : patch({ horarios: HORARIO_TIPICO })
              }
            >
              <NavIcon name="Lightning" size={13} />
              <span className="hidden sm:inline">Plantilla típica</span>
              <span className="sm:hidden">Plantilla</span>
            </Button>
          }
        />

        <HorarioSemanal
          horarios={farmacia.horarios}
          onChange={(next) => {
            patch({ horarios: next });
            feHorarios.inputProps.onBlur();
          }}
        />
        <FieldError {...feHorarios} />
        <ConfirmDialog
          open={confirmPlantilla}
          onOpenChange={setConfirmPlantilla}
          title="¿Sustituir el horario actual?"
          description="La plantilla típica reemplaza el horario de los 7 días (L-V 9-14 y 17-20:30, sábado 9:30-14, domingo cerrado)."
          confirmLabel="Usar plantilla"
          variant="accent"
          onConfirm={() => {
            patch({ horarios: HORARIO_TIPICO });
            setConfirmPlantilla(false);
          }}
        />
      </section>
    </div>
  );
}
