# Farmacia Chamarro — landing

Astro 5 + Tailwind 4. Contenido en build desde la API pública del backoffice. Multi-idioma (catálogo de 9 idiomas; solo se generan los activos de la farmacia).

## Variables de entorno

```
SITE_URL=https://farmaciachamarro.es
PUBLIC_FARMACIA_SLUG=chamarro
BACKOFFICE_URL=http://localhost:3001
```

## Scripts

```
pnpm dev       # dev server
pnpm build     # build estático (el backoffice tiene que estar disponible)
pnpm preview   # preview del build
pnpm check     # astro check + type-check
```

Los datos vienen de la farmacia `chamarro` del backoffice (`GET /api/public/farmacias/chamarro`), que solo la devuelve si está publicada. Al pulsar «Publicar cambios» el backoffice lanza el deploy hook de Vercel.
