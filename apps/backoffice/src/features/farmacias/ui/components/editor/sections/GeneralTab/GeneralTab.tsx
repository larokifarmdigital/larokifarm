'use client';

import { CampoSinPublicar } from '@/features/farmacias/ui/components/editor/fields/CampoSinPublicar';
import { useState } from 'react';
import { Input } from '@/shared/components/atoms/Input';
import { Label } from '@/shared/components/atoms/Label';
import { Button } from '@/shared/components/atoms/Button';
import { IconInput } from '@/shared/components/atoms/IconInput';
import { Modal } from '@/shared/components/molecules/Modal';
import { LabelHelpIcon } from '@/shared/components/molecules/LabelHelpIcon';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { NavIcon, type IconName } from '@/shared/components/atoms/NavIcon';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { ImageGalleryField } from '@/features/farmacias/ui/components/editor/fields/ImageGalleryField';
import { slugify } from '@/shared/lib/slugify';
import { useFieldErrors } from '@/features/farmacias/ui/hooks/useFieldError';
import { FieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import type { Redes } from '@/core/farmacias/domain';

type RedKey = keyof Redes;

const REDES: { key: RedKey; label: string; icon: IconName }[] = [
  { key: 'instagram', label: 'Instagram', icon: 'InstagramLogo' },
  { key: 'facebook', label: 'Facebook', icon: 'FacebookLogo' },
  { key: 'tiktok', label: 'TikTok', icon: 'TiktokLogo' },
  { key: 'x', label: 'X (Twitter)', icon: 'XLogo' },
  { key: 'youtube', label: 'YouTube', icon: 'YoutubeLogo' },
];
/** Se ven siempre; X y YouTube, solo si tienen algo o tras «Añadir otra red». */
const REDES_HABITUALES: RedKey[] = ['instagram', 'facebook', 'tiktok'];

/** Los campos técnicos (identificador, mapa insertado) solo los ve el administrador: si cambian, la web deja de encontrar su contenido. */
export function GeneralTab() {
  const { farmacia, patch, esAdmin } = useFarmaciaEditor();
  const fieldError = useFieldErrors();
  const d = farmacia.direccion ?? {};
  const [redesExtra, setRedesExtra] = useState<RedKey[]>([]);

  const fe = {
    nombre: fieldError('nombre'),
    colegiado: fieldError('numeroColegiado'),
    telefono: fieldError('telefono'),
    whatsapp: fieldError('whatsapp'),
    email: fieldError('email'),
    web: fieldError('web'),
    calle: fieldError('direccion.calle'),
    numero: fieldError('direccion.numero'),
    cp: fieldError('direccion.cp'),
    ciudad: fieldError('direccion.ciudad'),
    provincia: fieldError('direccion.provincia'),
    pais: fieldError('direccion.pais'),
    gmaps: fieldError('googleMapsUrl'),
    mapa: fieldError('mapa'),
    mapaUrl: fieldError('mapaUrl'),
  };

  const setDir = (field: string, value: string) => patch({ direccion: { ...d, [field]: value } });

  const redesVisibles = REDES.filter(
    (r) => REDES_HABITUALES.includes(r.key) || redesExtra.includes(r.key) || (farmacia.redes?.[r.key] ?? '').trim() !== '',
  );
  const redesOcultas = REDES.filter((r) => !redesVisibles.includes(r));

  return (
    <div className="space-y-10 max-w-3xl">
      <section aria-labelledby="sec-identidad">
        <SectionHeader
          id="sec-identidad"
          title="Datos de la farmacia"
          hint="El nombre y el logotipo salen en la cabecera de tu web."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoSinPublicar campo="nombre" className="sm:col-span-2">
            <Label htmlFor="nombre" required>Nombre de la farmacia</Label>
            <Input
              id="nombre"
              {...fe.nombre.inputProps}
              value={farmacia.nombre}
              onChange={(e) => patch({ nombre: e.target.value })}
            />
            <FieldError {...fe.nombre} />
          </CampoSinPublicar>
          <CampoSinPublicar campo="titular">
            <Label htmlFor="titular">Farmacéutica o farmacéutico titular</Label>
            <Input
              id="titular"
              value={farmacia.titular ?? ''}
              onChange={(e) => patch({ titular: e.target.value })}
              autoComplete="name"
            />
          </CampoSinPublicar>
          <CampoSinPublicar campo="numeroColegiado">
            <Label htmlFor="colegiado">Número de colegiado</Label>
            <Input
              id="colegiado"
              {...fe.colegiado.inputProps}
              value={farmacia.numeroColegiado ?? ''}
              onChange={(e) => patch({ numeroColegiado: e.target.value })}
              inputMode="numeric"
              className="sm:max-w-[220px]"
            />
            <FieldError {...fe.colegiado} />
          </CampoSinPublicar>

          <div className="sm:col-span-2">
            <ImageGalleryField
              mode="single"
              businessId={farmacia.id}
              role="logo"
              field="logo"
              required
              label="Logotipo"
              hint="Cuadrado, de 240×240 como mínimo. Mejor PNG o SVG con fondo transparente."
              value={farmacia.logo}
              onChange={(logo) => patch({ logo: logo ?? undefined })}
              className="max-w-[220px]"
            />
          </div>
        </div>
      </section>

      <div className="hairline" />

      <section aria-labelledby="sec-contacto">
        <SectionHeader
          id="sec-contacto"
          title="Contacto"
          hint="Salen en el pie de tu web. Teléfono, correo y web son obligatorios para publicar."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoSinPublicar campo="telefono">
            <Label htmlFor="telefono" required>Teléfono</Label>
            <IconInput
              id="telefono"
              {...fe.telefono.inputProps}
              type="tel"
              autoComplete="tel"
              icon={<NavIcon name="Phone" size={15} />}
              label="Teléfono"
              value={farmacia.telefono ?? ''}
              onChange={(e) => patch({ telefono: e.target.value })}
              placeholder="+34 934 12 34 56"
            />
            <FieldError {...fe.telefono} />
          </CampoSinPublicar>
          <CampoSinPublicar campo="whatsapp">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <IconInput
              id="whatsapp"
              {...fe.whatsapp.inputProps}
              type="tel"
              icon={<NavIcon name="WhatsappLogo" size={15} />}
              label="WhatsApp"
              value={farmacia.whatsapp ?? ''}
              onChange={(e) => patch({ whatsapp: e.target.value })}
              placeholder="+34 600 12 34 56"
            />
            <FieldError {...fe.whatsapp} />
          </CampoSinPublicar>
          <CampoSinPublicar campo="email">
            <Label htmlFor="email" required>Correo electrónico</Label>
            <IconInput
              id="email"
              {...fe.email.inputProps}
              type="email"
              autoComplete="email"
              icon={<NavIcon name="EnvelopeSimple" size={15} />}
              label="Correo electrónico"
              value={farmacia.email ?? ''}
              onChange={(e) => patch({ email: e.target.value })}
            />
            <FieldError {...fe.email} />
          </CampoSinPublicar>
          <CampoSinPublicar campo="web">
            <Label
              htmlFor="web"
              required
              hint={<LabelHelpIcon ariaLabel="Ayuda sobre la web">La dirección de tu web, por ejemplo https://farmaciaejemplo.es</LabelHelpIcon>}
            >
              Dirección de tu web
            </Label>
            <IconInput
              id="web"
              {...fe.web.inputProps}
              type="url"
              icon={<NavIcon name="Globe" size={15} />}
              label="Dirección de tu web"
              value={farmacia.web ?? ''}
              onChange={(e) => patch({ web: e.target.value })}
              placeholder="https://"
            />
            <FieldError {...fe.web} />
          </CampoSinPublicar>
        </div>
      </section>

      <div className="hairline" />

      <section aria-labelledby="sec-redes">
        <SectionHeader
          id="sec-redes"
          title="Redes sociales"
          hint="Tu usuario (@mifarmacia) o el enlace a tu perfil. Solo las que rellenes salen en tu web."
        />

        <CampoSinPublicar campo="redes" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {redesVisibles.map(({ key, label, icon }) => {
            const value = farmacia.redes?.[key] ?? '';
            const feRed = fieldError(`redes.${key}`);
            return (
              <div key={key}>
                <Label htmlFor={`red-${key}`}>{label}</Label>
                <IconInput
                  id={`red-${key}`}
                  {...feRed.inputProps}
                  icon={<NavIcon name={icon} size={16} />}
                  label={label}
                  value={value}
                  onChange={(e) => patch({ redes: { ...(farmacia.redes ?? {}), [key]: e.target.value } })}
                  placeholder="@usuario"
                />
                <FieldError {...feRed} />
              </div>
            );
          })}
        </CampoSinPublicar>
        {redesOcultas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {redesOcultas.map((r) => (
              <Button
                key={r.key}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRedesExtra((prev) => [...prev, r.key]);
                  window.setTimeout(() => document.getElementById(`red-${r.key}`)?.focus(), 0);
                }}
              >
                <NavIcon name="Plus" size={13} />
                Añadir {r.label}
              </Button>
            ))}
          </div>
        )}
      </section>

      <div className="hairline" />

      <section aria-labelledby="sec-direccion">
        <SectionHeader
          id="sec-direccion"
          title="Dirección"
          hint="Se usa para el mapa y el botón «Cómo llegar» de tu web. Todo es obligatorio para publicar, salvo el número."
        />

        <CampoSinPublicar campo="direccion" className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          <div className="sm:col-span-4">
            <Label htmlFor="calle" required>Calle</Label>
            <Input id="calle" {...fe.calle.inputProps} value={d.calle ?? ''} onChange={(e) => setDir('calle', e.target.value)} autoComplete="address-line1" />
            <FieldError {...fe.calle} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" {...fe.numero.inputProps} value={d.numero ?? ''} onChange={(e) => setDir('numero', e.target.value)} />
            <FieldError {...fe.numero} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cp" required>Código postal</Label>
            <Input id="cp" {...fe.cp.inputProps} value={d.cp ?? ''} onChange={(e) => setDir('cp', e.target.value)} inputMode="numeric" autoComplete="postal-code" />
            <FieldError {...fe.cp} />
          </div>
          <div className="sm:col-span-4">
            <Label htmlFor="ciudad-dir" required>Ciudad</Label>
            <Input id="ciudad-dir" {...fe.ciudad.inputProps} value={d.ciudad ?? farmacia.ciudad ?? ''} onChange={(e) => {
                // Un solo campo "Ciudad": la dirección (lo que lee la web) y la ciudad de la
                // farmacia (lista y buscador del backoffice) se guardan siempre a la vez.
                patch({ direccion: { ...d, ciudad: e.target.value }, ciudad: e.target.value });
              }} autoComplete="address-level2" />
            <FieldError {...fe.ciudad} />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="provincia" required>Provincia</Label>
            <Input id="provincia" {...fe.provincia.inputProps} value={d.provincia ?? ''} onChange={(e) => setDir('provincia', e.target.value)} autoComplete="address-level1" />
            <FieldError {...fe.provincia} />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="pais" required>País</Label>
            <Input id="pais" {...fe.pais.inputProps} value={d.pais ?? ''} onChange={(e) => setDir('pais', e.target.value)} autoComplete="country-name" />
            <FieldError {...fe.pais} />
          </div>

          <CampoSinPublicar campo="googleMapsUrl" className="sm:col-span-6">
            <Label
              htmlFor="gmaps"
              hint={
                <LabelHelpIcon ariaLabel="Ayuda sobre el enlace de Google Maps">
                  Para el botón «Cómo llegar». En Google Maps, busca tu farmacia → «Compartir» → «Copiar enlace».
                </LabelHelpIcon>
              }
            >
              Enlace de Google Maps
            </Label>
            <IconInput
              id="gmaps"
              {...fe.gmaps.inputProps}
              invalid={fe.gmaps.inputProps.invalid || fe.mapa.inputProps.invalid}
              onBlur={() => { fe.gmaps.inputProps.onBlur(); fe.mapa.inputProps.onBlur(); }}
              type="url"
              icon={<NavIcon name="MapPin" size={15} />}
              label="Enlace de Google Maps"
              value={farmacia.googleMapsUrl ?? ''}
              onChange={(e) => patch({ googleMapsUrl: e.target.value })}
              placeholder="https://maps.app.goo.gl/…"
            />
            <FieldError {...fe.gmaps} />
            {!fe.gmaps.message && <FieldError {...fe.mapa} />}
          </CampoSinPublicar>
        </CampoSinPublicar>
      </section>

      {esAdmin && (
        <>
          <div className="hairline" />
          <SoloAdministrador feMapaUrl={fe.mapaUrl} />
        </>
      )}
    </div>
  );
}

/** Campos técnicos: identificador (cómo lee la web su contenido) y mapa insertado. */
function SoloAdministrador({ feMapaUrl }: { feMapaUrl: ReturnType<ReturnType<typeof useFieldErrors>> }) {
  const { farmacia, patch } = useFarmaciaEditor();
  const [cambiando, setCambiando] = useState(false);
  const [nuevo, setNuevo] = useState(farmacia.slug);
  const publicada = farmacia.status === 'published';
  const limpio = nuevo.replace(/^-+|-+$/g, '');

  return (
    <section aria-labelledby="sec-admin" className="rounded-[12px] border border-dashed border-[var(--color-control-border)] p-4 sm:p-5">
      <SectionHeader
        id="sec-admin"
        title="Solo administrador"
        hint="El personal de la farmacia no ve estos campos."
      />
      <div className="space-y-5">
        <div>
          <p className="label m-0" id="slug-label">Identificador</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <code id="slug" className="rounded-[6px] bg-[var(--color-surface-sunken)] px-2.5 py-1.5 text-[13.5px] text-[var(--color-ink)]">
              {farmacia.slug}
            </code>
            <Button type="button" variant="secondary" size="sm" onClick={() => { setNuevo(farmacia.slug); setCambiando(true); }}>
              Cambiar
            </Button>
          </div>
          <p className="mt-1.5 mb-0 text-[12.5px] text-[var(--color-muted)]">
            Código con el que la web lee su contenido. No es la dirección de la web.
          </p>
        </div>

        <div>
          <Label
            htmlFor="mapa-embed"
            hint={
              <LabelHelpIcon ariaLabel="Ayuda sobre el mapa insertado">
                Opcional. En Google Maps: «Compartir» → «Insertar un mapa» → copia la dirección (src) del iframe.
                Si se deja vacío, la web usa el enlace de Google Maps.
              </LabelHelpIcon>
            }
          >
            Mapa insertado (dirección del iframe)
          </Label>
          <IconInput
            id="mapa-embed"
            {...feMapaUrl.inputProps}
            type="url"
            icon={<NavIcon name="Globe" size={15} />}
            label="Mapa insertado"
            value={farmacia.mapaUrl ?? ''}
            onChange={(e) => patch({ mapaUrl: e.target.value })}
            placeholder="https://www.google.com/maps/embed?pb=…"
          />
          <FieldError {...feMapaUrl} />
        </div>
      </div>

      <Modal
        open={cambiando}
        onOpenChange={setCambiando}
        title="Cambiar el identificador"
        maxWidth="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCambiando(false)}>Cancelar</Button>
            <Button
              variant="accent"
              disabled={limpio.length < 2 || limpio === farmacia.slug}
              onClick={() => {
                patch({ slug: limpio });
                setCambiando(false);
              }}
            >
              Cambiar identificador
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className={publicada ? 'm-0 rounded-[8px] bg-[var(--color-yellow-soft)] px-3 py-2.5 text-[13.5px] text-[var(--color-yellow-ink)]' : 'm-0 text-[13.5px] text-[var(--color-ink-2)]'}>
            {publicada
              ? 'La web está publicada: si cambias el identificador, deja de actualizarse hasta que se configure el nuevo en su alojamiento.'
              : 'La web todavía no está publicada, así que puedes cambiarlo sin problema.'}
          </p>
          <div>
            <Label htmlFor="slug-nuevo">Nuevo identificador</Label>
            <Input
              id="slug-nuevo"
              value={nuevo}
              onChange={(e) => setNuevo(slugify(e.target.value).slice(0, 60))}
              className="font-mono-tabular"
              aria-describedby="slug-nuevo-ayuda"
            />
            <p id="slug-nuevo-ayuda" className="mt-1 mb-0 text-[12.5px] text-[var(--color-muted)]">
              Solo minúsculas, números y guiones.
            </p>
          </div>
        </div>
      </Modal>
    </section>
  );
}
