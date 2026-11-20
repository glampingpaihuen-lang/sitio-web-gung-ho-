# nube-app · página de fotos de Gung Ho

La página que ven las personas. Al entrar sale el logo de Gung Ho y las tarjetas de cada empresa
(con su logo); al tocar una se ven todas sus fotos y videos. Se pueden abrir en grande y descargar
en calidad original. Manteniendo presionada una se eligen varias y se descargan juntas
(en iPhone se guardan en Fotos; en Android quedan en Descargas, que sale en la galería).
Todo se cambia desde `nube-admin`.

```bash
npm install
npm run dev   # http://localhost:3050
```

- `app/page.tsx`: entrada (logo + tarjetas)
- `app/[slug]/page.tsx`: fotos de una empresa (`/colegio-san-jose`)
- `components/`: cabecera con el logo, tarjetas, galería con visor
- `public/gung ho logo.jpeg`: logo de arriba (se puede cambiar desde el panel)

Variables: `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SECRET_KEY` (las mismas del panel).
Más detalles en el README de la carpeta de arriba.
