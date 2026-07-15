# Farmacia Chamarro — landing

Astro 5 + Tailwind 4 + Sanity. Estética editorial minimalista (blanco → gris/plomo, Instrument Serif + Inter). Multi-idioma es/en/ca.

## Variables de entorno

```
SITE_URL=https://farmaciachamarro.com
PUBLIC_SANITY_PROJECT_ID=yovi040n
PUBLIC_SANITY_DATASET=calendario
PUBLIC_FARMACIA_SLUG=chamarro
```

## Scripts

```
pnpm dev       # dev server
pnpm build     # build estático
pnpm preview   # preview del build
pnpm check     # astro check + type-check
```

Los datos vienen del documento `farmacia` con `slug.current="chamarro"` en Sanity (project `yovi040n`, dataset `calendario`).
