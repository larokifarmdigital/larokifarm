import React, { useCallback } from 'react';
import { set, unset, type StringInputProps } from 'sanity';
import { Grid, Button, Tooltip, Text, Box, Card, Stack } from '@sanity/ui';
import { ICONOS_CATALOGO, buscarIcono } from './iconosCatalogo';

/**
 * Renderiza el contenido del SVG. `dangerouslySetInnerHTML` aquí es seguro
 * porque las paths vienen de un catálogo controlado en el repo, no de input
 * del editor.
 */
function PreviewIcono({ paths, size = 22 }: { paths: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}

/**
 * Selector visual de iconos para Sanity. Muestra todos los iconos del catálogo
 * en un grid; el editor pincha el que quiere y se guarda el `value` como string.
 */
export function IconoSelectorInput(props: StringInputProps) {
  const { value, onChange, readOnly } = props;
  const seleccionado = buscarIcono(value);

  const seleccionar = useCallback(
    (nuevo: string) => {
      if (readOnly) return;
      if (nuevo === value) {
        onChange(unset());
      } else {
        onChange(set(nuevo));
      }
    },
    [onChange, value, readOnly],
  );

  return (
    <Stack space={3}>
      {seleccionado && (
        <Card padding={3} radius={2} tone="primary" border>
          <Stack space={2}>
            <Text size={1} weight="medium" muted>
              Icono seleccionado
            </Text>
            <Box style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Box style={{ color: 'var(--card-fg-color)' }}>
                <PreviewIcono paths={seleccionado.svg} size={28} />
              </Box>
              <Text size={2} weight="semibold">
                {seleccionado.label}
              </Text>
            </Box>
          </Stack>
        </Card>
      )}

      <Card padding={2} radius={2} border>
        <Grid columns={[4, 6, 8]} gap={2}>
          {ICONOS_CATALOGO.map((ic) => {
            const activo = ic.value === value;
            return (
              <Tooltip
                key={ic.value}
                content={
                  <Box padding={2}>
                    <Text size={1}>{ic.label}</Text>
                  </Box>
                }
                placement="top"
                portal
              >
                <Button
                  mode={activo ? 'default' : 'ghost'}
                  tone={activo ? 'primary' : 'default'}
                  disabled={readOnly}
                  onClick={() => seleccionar(ic.value)}
                  padding={3}
                  aria-label={ic.label}
                  aria-pressed={activo}
                  style={{ width: '100%', cursor: readOnly ? 'not-allowed' : 'pointer' }}
                >
                  <PreviewIcono paths={ic.svg} size={22} />
                </Button>
              </Tooltip>
            );
          })}
        </Grid>
      </Card>

      {!seleccionado && (
        <Text size={1} muted>
          Toca un icono para seleccionarlo. Vuelve a tocar el mismo para quitarlo.
        </Text>
      )}
    </Stack>
  );
}
