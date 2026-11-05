# HIGHFLY — PUBLICACIONES PARALELAS Y BACKUPS · decisión corregida 2026-11-05

## Repositorios y Pages (esquema definitivo)

**A. Demo HIGHFLY TIANJIE (ESTE CHAT):** `drakenhok-star/HIGHFLY-ORIGIN-DEMO`, única GitHub Pages de la demo: `https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/`.
- P16 estable: commit fijado `a83e7993d84da33c8d0792277c08d69a56bd1906`, rama `p16-fury-hitconfirm-20261105`, backup adicional `backup-p16-fury-hitconfirm-20261105`, versión jugable congelada en `/p16/`.
- P16.1 performance + training UI: rama experimental `p16-1-performance-foundation-20261105`, nueva publicación `/p161/` **dentro de la misma GitHub Pages**. Se pueden agregar versiones posteriores en directorios nuevos: `/p17/`, etc., sin borrar las anteriores. La raíz `/` no cambia.
- Se publica desde un workflow en `main` usando un SHA exacto, verificando sintaxis/tests/medios. No se hace merge indiscriminado de P16.1 sobre main.

**B. Laboratorio independiente de SKILLS/APUNTADO (OTRO CHAT):** repositorio `drakenhok-star/HIGHFLY-FURY-SKILL-LAB`; publica su propia GitHub Pages desde `.github/workflows/pages.yml`. No se sustituye ni se mezcla con la demo; el objetivo futuro será integrar solo habilidades validadas.

## Condiciones operativas
- Exclusivamente GitHub + GitHub Actions + GitHub Pages durante la etapa de medios MIT/CC0 revisados; **no desplegar en Vercel y no exigir Codespaces**.
- Una vinculación anterior de Vercel con el repositorio puede lanzar compilaciones Vercel automáticamente al subir commits a GitHub: eso **no equivale a que este workflow despliegue en Vercel**. Su administración y desconexión se resuelven aparte, sin interferir con Pages ni con otros proyectos existentes.
- No subir ZIP SOURCE de KayKit Complete ni assets de licencia restrictiva a páginas públicas.
- Guardar backup antes de cada versión aprobada. Mantener funcionamiento reversible con flags para comparar mejoras P16.1.
- Probar en S23 Ultra Android horizontal y comparar P16 vs P16.1 en la misma red/navegador/preset, con ECO desactivado, 3 corridas, P95/P99 y regresión de controles/combate.
- El entrenamiento de P16.1 es **una vista previa** sin mutaciones del RPG; Training Core real y P17 RPG se integrarán por interfaces y pruebas, no copiando sistemas enteros.

## URLs de seguimiento
- Código: https://github.com/drakenhok-star/HIGHFLY-ORIGIN-DEMO/tree/p16-1-performance-foundation-20261105
- CI: https://github.com/drakenhok-star/HIGHFLY-ORIGIN-DEMO/actions
- P16 backup: https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/p16/
- P16.1: https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/p161/ (solo al confirmar deploy correcto)
- Skills: https://github.com/drakenhok-star/HIGHFLY-FURY-SKILL-LAB
