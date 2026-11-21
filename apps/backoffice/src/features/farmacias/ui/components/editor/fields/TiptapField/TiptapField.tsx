'use client';

import type { Locale } from '@/core/shared';
import { SugerirTraduccion } from '@/features/farmacias/ui/components/editor/fields/SugerirTraduccion';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect, useRef } from 'react';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

import { useFieldBinding } from '@/features/farmacias/ui/hooks/useFieldError';
import { FieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Clave de validación (p. ej. `descripcionLarga.es`): id estable + error. */
  field?: string;
  /** Nombre accesible del editor (la etiqueta visible del campo). */
  label: string;
  /** Texto en castellano: si se edita otro idioma, ofrece "Sugerir traducción". */
  origen?: string;
  /** Idioma que se edita. */
  locale?: Locale;
};

function ToolbarButton({
  active,
  onClick,
  label,
  children,
  first = false,
}: {
  first?: boolean;
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      tabIndex={first ? 0 : -1}
      className={cn(
        'h-11 min-w-11 sm:h-7 sm:min-w-[28px] px-2 rounded-[4px] flex items-center justify-center text-[13px] sm:text-[12px] font-medium transition-colors',
        active
          ? 'bg-[var(--color-ink)] text-white'
          : 'text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]',
      )}
    >
      {children}
    </button>
  );
}

/** Barra con "roving tabindex": una sola parada de Tab y flechas para moverse. */
function onToolbarKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
  const botones = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
  const actual = botones.indexOf(document.activeElement as HTMLButtonElement);
  if (actual === -1) return;
  e.preventDefault();
  const n = botones.length;
  const sig =
    e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : e.key === 'ArrowRight' ? (actual + 1) % n : (actual - 1 + n) % n;
  botones.forEach((b, i) => (b.tabIndex = i === sig ? 0 : -1));
  botones[sig].focus();
}

function Toolbar({ editor, label }: { editor: Editor; label: string }) {
  return (
    <div
      role="toolbar"
      aria-label={`Formato de texto: ${label}`}
      onKeyDown={onToolbarKeyDown}
      className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] sticky top-0 z-10"
    >
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label="Encabezado H2"
        first
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        label="Encabezado H3"
      >
        H3
      </ToolbarButton>
      <span aria-hidden className="w-px h-4 bg-[var(--color-hairline)] mx-1" />
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Negrita"
      >
        <span className="font-bold">B</span>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Cursiva"
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <span aria-hidden className="w-px h-4 bg-[var(--color-hairline)] mx-1" />
      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Lista con viñetas"
      >
        •
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Lista numerada"
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        label="Cita"
      >
        ❝
      </ToolbarButton>
      <span aria-hidden className="w-px h-4 bg-[var(--color-hairline)] mx-1" />
      <ToolbarButton
        active={editor.isActive('link')}
        onClick={() => {
          const url = window.prompt('URL del enlace (dejar vacío para quitar):');
          if (url === null) return;
          if (url === '') {
            editor.chain().focus().unsetLink().run();
          } else {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        label="Enlace"
      >
        <NavIcon name="ArrowSquareOut" size={12} />
      </ToolbarButton>
    </div>
  );
}

const ATRIBUTOS_BASE = {
  class: 'prose-editor focus:outline-2 focus:outline-[var(--color-accent)] focus:-outline-offset-2',
  role: 'textbox',
  'aria-multiline': 'true',
};

export function TiptapField({ value, onChange, placeholder, minHeight = 200, field, label, origen, locale }: Props) {
  const { id, error } = useFieldBinding(field, '');
  // Solo consulta: el fieldset no desactiva un contenteditable, así que lo hacemos aquí.
  const { readOnly } = useFarmaciaEditor();
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? 'Empieza a escribir…' }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener' } }),
    ],
    content: value,
    editorProps: {
      attributes: { ...ATRIBUTOS_BASE, 'aria-label': label, ...(readOnly ? { 'aria-readonly': 'true' } : {}) },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML());
    },
    immediatelyRender: false,
    editable: !readOnly,
  });

  // El contenteditable es el campo real: nombre, error y descripción van en él.
  const describedBy = error?.inputProps['aria-describedby'];
  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editable: !readOnly,
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          ...ATRIBUTOS_BASE,
          'aria-label': label,
          ...(readOnly ? { 'aria-readonly': 'true' } : {}),
          ...(describedBy ? { 'aria-describedby': describedBy, 'aria-invalid': 'true' } : {}),
        },
      },
    });
  }, [editor, label, describedBy, readOnly]);

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className="field"
        style={{ minHeight }}
        aria-hidden
      />
    );
  }

  return (
    <div id={id || undefined} onBlur={error?.inputProps.onBlur}>
    <div
      className={cn(
        'border rounded-[8px] bg-[var(--color-surface)] overflow-hidden',
        error?.message ? 'border-[var(--color-red-ink)]' : 'border-[var(--color-hairline)]',
      )}
    >
      {!readOnly && <Toolbar editor={editor} label={label} />}
      <div
        className="px-4 py-3"
        style={{ minHeight }}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
    {error && <FieldError {...error} />}
    {locale && (
      <SugerirTraduccion
        etiqueta={label}
        html
        origen={origen}
        destino={locale}
        actual={value}
        onUsar={(t) => {
          onChangeRef.current(t);
          editor.commands.focus();
        }}
      />
    )}
    </div>
  );
}
