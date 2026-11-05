# HIGHFLY TIANJIE — Publicación y backups por proyectos

**Decisión definitiva del 5 de noviembre de 2026** — HIGHFLY tiene **dos proyectos públicos paralelos y dos GitHub Pages**, cada uno con su propio objetivo.

## A. ESTE CHAT: HIGHFLY TIANJIE / PERFORMANCE / RPG

**Repositorio:** `drakenhok-star/HIGHFLY-ORIGIN-DEMO`  
**GitHub Pages:** https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/

- **Última base estable aprobada:** P16, commit `a83e7993d84da33c8d0792277c08d69a56bd1906`.
- **Backup doble:** rama `p16-fury-hitconfirm-20261105` y rama `backup-p16-fury-hitconfirm-20261105`, ambas apuntando al mismo commit estable; nunca forzar ni borrar ninguna.
- **Backup web de juego:** ruta `/p16/` en la MISMA GitHub Pages, publicada a partir del commit fijado.
- **Desarrollo de este chat:** rama `p16-1-performance-foundation-20261105` a partir de P16.
- **Nueva versión pública:** ruta `/p161/` en la MISMA GitHub Pages de HIGHFLY ORIGIN DEMO; es experimental, y se publica mediante un paso validado y fijado por SHA en `main:.github/workflows/deploy-live.yml`.
- **Importante:** NO crear un repositorio nuevo ni un tercer Pages para PERFORMANCE. Versiones futuras P16.2/P17 etc. se agregan a esta misma Pages solo al superar tests, manteniendo la ruta anterior accesible.
- `main` alberga el workflow de publicación de la demo; no fusionar el trabajo experimental de P16.1 directamente a `main` para desplegar; el workflow toma solamente el snapshot aprobado y lo publica bajo su propia ruta.

## B. OTRO CHAT: HIGHFLY FURY SKILL LAB

**Repositorio público independiente:** `drakenhok-star/HIGHFLY-FURY-SKILL-LAB`  
**Su propio Pages:** `https://drakenhok-star.github.io/HIGHFLY-FURY-SKILL-LAB/` (verificar la publicación efectiva).

- Skills, apuntado, VFX y combos se estudian en ese laboratorio.
- Su propio workflow es `.github/workflows/pages.yml`; toma un snapshot del origen P16 del repositorio demo bajo un `source_ref` y despliega únicamente al entorno Pages del repositorio Skill Lab.
- No modificar ni desplegar este laboratorio desde el flujo de PERFORMANCE; tampoco introducir su código de combate a P16.1 sin aprobación y validación.

## Condiciones de seguridad

- **GitHub y GitHub Pages** durante la etapa de archivos públicos MIT/CC0 auditados; no requerir Codespaces para este trabajo. Cuando se integren recursos propietarios de KayKit, trabajar en un repositorio privado sin publicarlos en Pages.
- No usar un único workflow para desplegar dos repositorios: cada uno publica a su propia Pages.
- P16 estable sigue jugable incluso si falla CI de P16.1; en fallo no se sube el artefacto nuevo.
- P16.1 no altera `/p16/`, y el Skill Lab tampoco.
- Antes de dar por hecho un despliegue, verificar el resultado de GitHub Actions; un commit en el workflow no demuestra que la página ya esté disponible.
