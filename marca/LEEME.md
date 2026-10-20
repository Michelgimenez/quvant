# Marca de Quvant

Poné acá los archivos del logo de Quvant:
- **La Q cromada** (el isotipo): en SVG si existe, y en PNG grande (2000 px o más) con fondo transparente.
- **La firma horizontal** (la Q y QUVANT): en sus versiones principal (Q cromada y QUVANT en blanco, para fondo negro) y negativa (todo en negro, para fondo claro).
- **Cualquier otra versión que tengas** (la Q en una sola tinta, el ícono, la tarjeta).

El manual completo está en `referencias/Quvant-manual-de-identidad.pdf`.

Las dos tipografías son gratuitas y Claude Code las instala solo: **Michroma** (para el logotipo y títulos muy cortos) e **IBM Plex Mono** (para todo lo demás).

Si solo tenés PNG, sirve igual: Claude Code te avisa en el reporte si conviene un SVG para algún uso.

## Qué hay ahora (tanda 1, 20/10/2026)
- `quvant-q-cromada-del-manual.png`: la Q cromada oficial, extraída tal cual del PDF del manual (2000×2000, con transparencia). Es la fuente de todas las versiones de `public/marca/`.
- `quvant-logotipo-provisorio.svg`: QUVANT en Michroma +0,18 em, **provisorio**. Cuando tengas el archivo oficial, ponelo acá con el mismo nombre (o avisá el nombre nuevo) y corré `node scripts/marca/generar-marca.mjs`.
- Los archivos `yunque-*` son la identidad anterior: quedan como "el antes".
- **Falta:** la firma oficial (principal y negativa), idealmente en SVG, y la Q en SVG si existe.
