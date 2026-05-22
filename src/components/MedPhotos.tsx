import { useState } from 'preact/hooks';
import type { CimaFoto } from '../api/types';

const LABEL: Record<string, string> = {
  formafarmac: 'Pastilla',
  materialas: 'Envase',
};

export function MedPhotos({ fotos }: { fotos?: CimaFoto[] }) {
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  if (!fotos || fotos.length === 0) return null;
  const visible = fotos.filter((f) => !broken[f.url]);
  if (visible.length === 0) return null;
  return (
    <div class="cima-photos">
      {visible.map((f) => (
        <figure key={f.url}>
          <img
            src={f.url}
            alt={LABEL[f.tipo] ?? f.tipo}
            loading="lazy"
            onError={() => setBroken((b) => ({ ...b, [f.url]: true }))}
          />
          <figcaption>{LABEL[f.tipo] ?? f.tipo}</figcaption>
        </figure>
      ))}
    </div>
  );
}
