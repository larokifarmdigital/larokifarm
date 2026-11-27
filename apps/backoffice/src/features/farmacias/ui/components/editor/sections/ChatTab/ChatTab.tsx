'use client';

import { CampoSinPublicar } from '@/features/farmacias/ui/components/editor/fields/CampoSinPublicar';
import { useId, useState } from 'react';
import { contrasteConBlanco, COLOR_HEX_RE, type ChatConfig, type ChatPosicion } from '@/core/farmacias/domain';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { Button } from '@/shared/components/atoms/Button';
import { IndicadorEleccion } from '@/shared/components/atoms/IndicadorEleccion';
import { Input } from '@/shared/components/atoms/Input';
import { Label } from '@/shared/components/atoms/Label';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Switch } from '@/shared/components/atoms/Switch';
import { cn } from '@/shared/lib/cn';

const POSICIONES: { valor: ChatPosicion; titulo: string }[] = [
  { valor: 'derecha', titulo: 'Abajo a la derecha' },
  { valor: 'izquierda', titulo: 'Abajo a la izquierda' },
];

/** 4,5:1 = texto normal AA. El chat pone iconos y texto blancos sobre el color. */
const CONTRASTE_MIN = 4.5;

/**
 * Chat de medicamentos (widget cima-chat) de la web. Solo SUPER_ADMIN: la
 * sección no sale en la navegación de los demás y el servidor rechaza `chat`
 * (`saveFarmaciaAction`). La web lo aplica al publicar (se genera de nuevo).
 */
export function ChatTab() {
  const { farmacia, patch } = useFarmaciaEditor();
  const chat = farmacia.chat;
  const set = (next: Partial<ChatConfig>) => patch({ chat: { ...chat, ...next } });

  return (
    <CampoSinPublicar campo="chat" soloBorde className="space-y-6">
      <section aria-labelledby="sec-chat-activo" className="card flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <h3 id="sec-chat-activo" className="m-0 text-[14px] font-bold text-[var(--color-ink)]">
            <label htmlFor="chat-activo" className="cursor-pointer">Mostrar el chat en la web</label>
          </h3>
          <p id="chat-activo-hint" className="m-0 mt-1 text-[12.5px] leading-[1.55] text-[var(--color-muted-2)]">
            {chat.activo
              ? 'Las personas que visitan la web pueden consultar medicamentos en CIMA (AEMPS).'
              : 'La web no muestra el chat. El cambio se verá cuando publiques.'}
          </p>
        </div>
        <Switch
          id="chat-activo"
          aria-label="Mostrar el chat en la web"
          checked={chat.activo}
          onCheckedChange={(v) => set({ activo: v })}
          aria-describedby="chat-activo-hint"
        />
      </section>

      {chat.activo && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-6">
            {/* mx-0 y no m-0: space-y-* de Tailwind v4 separa con margin-bottom. */}
            <fieldset className="mx-0 min-w-0 border-0 p-0">
              <legend className="label mb-2 p-0">Posición del botón</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {POSICIONES.map((p) => (
                  <label
                    key={p.valor}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-accent)]',
                      chat.posicion === p.valor
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                        : 'border-[var(--color-control-border)] bg-[var(--color-surface)]',
                    )}
                  >
                    <input
                      type="radio"
                      name="chat-posicion"
                      value={p.valor}
                      checked={chat.posicion === p.valor}
                      onChange={() => set({ posicion: p.valor })}
                      className="sr-only cursor-pointer"
                    />
                    <IndicadorEleccion tipo="radio" marcado={chat.posicion === p.valor} />
                    <span className="text-[14px] font-semibold text-[var(--color-ink)]">{p.titulo}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <CampoColor valor={chat.color} onCambio={(color) => set({ color })} />

            <div>
              <Label htmlFor="chat-nombre">Nombre en la cabecera del chat</Label>
              <Input
                id="chat-nombre"
                value={chat.nombre ?? ''}
                maxLength={60}
                placeholder={farmacia.nombre}
                aria-describedby="chat-nombre-hint"
                onChange={(e) => set({ nombre: e.target.value })}
              />
              <p id="chat-nombre-hint" className="m-0 mt-1.5 text-[12.5px] text-[var(--color-muted-2)]">
                Vacío = el nombre de la farmacia.
              </p>
            </div>

            <Interruptor
              id="chat-logo"
              titulo="Logo de la farmacia en la cabecera"
              texto={farmacia.logo ? 'Sale a la izquierda del nombre.' : 'La farmacia aún no tiene logo: se verá solo el nombre.'}
              marcado={chat.mostrarLogo}
              onCambio={(v) => set({ mostrarLogo: v })}
            />

            <Interruptor
              id="chat-disponible"
              titulo="Marcar «Disponible» los medicamentos con stock"
              texto="Usa el inventario de las farmacias del grupo (stock mayor que 0). Se actualiza cada 6 horas."
              marcado={chat.mostrarDisponible}
              onCambio={(v) => set({ mostrarDisponible: v })}
            />
          </div>

          <VistaPrevia chat={chat} nombre={chat.nombre?.trim() || farmacia.nombre} logoUrl={chat.mostrarLogo ? farmacia.logo?.url : undefined} />
        </div>
      )}
    </CampoSinPublicar>
  );
}

function Interruptor({
  id,
  titulo,
  texto,
  marcado,
  onCambio,
}: {
  id: string;
  titulo: string;
  texto: string;
  marcado: boolean;
  onCambio: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="label m-0 cursor-pointer">{titulo}</label>
        <p id={`${id}-hint`} className="m-0 mt-1 text-[12.5px] leading-[1.55] text-[var(--color-muted-2)]">{texto}</p>
      </div>
      <Switch id={id} aria-label={titulo} checked={marcado} onCheckedChange={onCambio} aria-describedby={`${id}-hint`} />
    </div>
  );
}

/**
 * Color en texto (#rrggbb) + selector nativo. Lo escrito a medias se queda en
 * local: solo se guarda un color válido o vacío (= el de la web).
 */
function CampoColor({ valor, onCambio }: { valor?: string; onCambio: (c: string | undefined) => void }) {
  const id = useId();
  const [texto, setTexto] = useState(valor ?? '');
  // Si el color cambia desde fuera (otra pestaña, recarga), se adopta.
  const [previo, setPrevio] = useState(valor);
  if (valor !== previo) {
    setPrevio(valor);
    setTexto(valor ?? '');
  }

  const limpio = texto.trim();
  const valido = limpio === '' || COLOR_HEX_RE.test(limpio);
  const contraste = valor ? contrasteConBlanco(valor) : null;
  const pocoContraste = contraste !== null && contraste < CONTRASTE_MIN;

  const escribir = (t: string) => {
    setTexto(t);
    const c = t.trim();
    if (c === '') onCambio(undefined);
    else if (COLOR_HEX_RE.test(c)) onCambio(c.toLowerCase());
  };

  const describedBy = [`${id}-hint`, !valido && `${id}-error`, pocoContraste && `${id}-aviso`].filter(Boolean).join(' ');

  return (
    <div>
      <Label htmlFor={`${id}-texto`}>Color del chat</Label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          aria-label="Elegir color en la paleta"
          value={valor ?? '#1265b5'}
          onChange={(e) => escribir(e.target.value)}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-[8px] border border-[var(--color-control-border)] bg-[var(--color-surface)] p-1"
        />
        <Input
          id={`${id}-texto`}
          value={texto}
          placeholder="Color de la web"
          maxLength={7}
          spellCheck={false}
          invalid={!valido}
          aria-describedby={describedBy}
          onChange={(e) => escribir(e.target.value)}
          className="w-40 font-mono-tabular"
        />
        {valor && (
          <Button type="button" variant="ghost" size="sm" onClick={() => escribir('')}>
            Usar el de la web
          </Button>
        )}
      </div>
      <p id={`${id}-hint`} className="m-0 mt-1.5 text-[12.5px] text-[var(--color-muted-2)]">
        Botón, cabecera y enlaces del chat. Vacío = el color que ya usa la web.
      </p>
      {!valido && (
        <p id={`${id}-error`} className="help help-error">
          Escribe el color así: #1265b5
        </p>
      )}
      {pocoContraste && (
        <p id={`${id}-aviso`} className="m-0 mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium text-[var(--color-yellow-ink)]">
          <NavIcon name="Warning" size={14} className="mt-px shrink-0" />
          Con este color el texto blanco del chat se lee mal ({contraste.toFixed(1)}:1; mínimo 4,5:1). Elige uno más oscuro.
        </p>
      )}
    </div>
  );
}

/** Dibujo del chat con los ajustes (orientativo; no es el chat real). */
function VistaPrevia({ chat, nombre, logoUrl }: { chat: ChatConfig; nombre: string; logoUrl?: string }) {
  const color = chat.color ?? 'var(--color-muted)';
  return (
    <figure className="m-0 self-start xl:sticky xl:top-[calc(3.5rem+72px)]">
      <figcaption className="label mb-2">Vista previa</figcaption>
      <div aria-hidden className="relative h-[300px] overflow-hidden rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
        <div
          className={cn(
            'absolute bottom-[68px] w-[210px] overflow-hidden rounded-[12px] border border-[var(--color-hairline)] bg-white shadow-[0_10px_30px_-12px_rgba(11,24,41,0.35)]',
            chat.posicion === 'izquierda' ? 'left-3' : 'right-3',
          )}
        >
          <div className="flex items-center gap-2 border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de una URL del propio backoffice */}
            {logoUrl && <img src={logoUrl} alt="" className="h-5 w-5 rounded-[4px] object-contain" />}
            <span className="truncate text-[12px] font-bold text-[var(--color-ink)]">{nombre}</span>
          </div>
          <div className="space-y-1.5 p-3">
            <div className="h-2 w-3/4 rounded bg-[var(--color-surface-sunken)]" />
            <div className="h-2 w-1/2 rounded bg-[var(--color-surface-sunken)]" />
            <div className="mt-2 flex items-center gap-1.5">
              <span className="rounded-[6px] px-2 py-1 text-[10.5px] font-bold text-white" style={{ background: color }}>
                Buscar medicamento
              </span>
              {chat.mostrarDisponible && (
                <span className="rounded-full bg-[var(--color-green-soft)] px-1.5 py-0.5 text-[9.5px] font-bold text-[var(--color-green-ink)]">
                  Disponible
                </span>
              )}
            </div>
          </div>
        </div>
        <span
          className={cn(
            'absolute bottom-3 grid h-11 w-11 place-items-center rounded-full text-white shadow-[0_6px_16px_-6px_rgba(11,24,41,0.5)]',
            chat.posicion === 'izquierda' ? 'left-3' : 'right-3',
          )}
          style={{ background: color }}
        >
          <NavIcon name="ChatCircleDots" size={20} />
        </span>
      </div>
      {!chat.color && (
        <p className="m-0 mt-1.5 text-[12.5px] text-[var(--color-muted-2)]">En la web se verá con el color que ya usa.</p>
      )}
    </figure>
  );
}
