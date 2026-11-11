import { useRef, useState } from 'react';

/** Estado de arrastre + handlers comunes para el file input y el drop zone. */
export function useImageFilePicker(onFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }

  const dropHandlers = {
    onDragOver(e: React.DragEvent) {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave() {
      setDragging(false);
    },
    onDrop(e: React.DragEvent) {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
  };

  return {
    dragging,
    inputRef,
    onInputChange,
    dropHandlers,
    openPicker: () => inputRef.current?.click(),
  };
}
