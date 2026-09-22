'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect, useRef } from 'react';
import { NavIcon } from '@/features/shell/NavIcon';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
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
      className={cn(
        'h-7 min-w-[28px] px-2 rounded-[4px] flex items-center justify-center text-[12px] font-medium transition-colors',
        active
          ? 'bg-[var(--color-ink)] text-white'
          : 'text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]',
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div
      role="toolbar"
      aria-label="Formato de texto"
      className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] sticky top-0 z-10"
    >
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label="Encabezado H2"
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

export function TiptapField({ value, onChange, placeholder, minHeight = 200 }: Props) {
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
      attributes: {
        class: 'prose-editor focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML());
    },
    immediatelyRender: false,
  });

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
    <div className="border border-[var(--color-hairline)] rounded-[8px] bg-[var(--color-surface)] overflow-hidden">
      <Toolbar editor={editor} />
      <div
        className="px-4 py-3"
        style={{ minHeight }}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
