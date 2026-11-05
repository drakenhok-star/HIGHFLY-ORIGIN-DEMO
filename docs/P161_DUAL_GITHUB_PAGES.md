# HIGHFLY TIANJIE — DOS GITHUB PAGES PARALELOS (decisión fija)
Fecha: 2026-11-05

## Principio no negociable

Durante la etapa en que los archivos y modelos publicados sean MIT/CC0 con procedencia auditada, desarrollar, validar y desplegar con **GitHub + GitHub Actions + GitHub Pages**. No exigir Codespaces para pruebas de P16.1 ni para jugar desde Android.

**DOS repositorios públicos distintos y DOS Pages independientes**:
1. **DEMO ESTABLE** — Repositorio `drakenhok-star/HIGHFLY-ORIGIN-DEMO`, sitio `https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/`. El workflow de `main` mantiene la raíz estable y sus versiones coexistentes en `/p6/`, `/p7/`, `/p810/`, `/p812/`, `/p13/`, `/p14/`, `/p15/`, `/p16/`. La fuente P16 aprobada permanece fijada en `a83e7993d84da33c8d0792277c08d69a56bd1906`. No publicar desde P16.1 en el Pages de la demo.
2. **LABORATORIO** — GitHub Pages de **otro repositorio público independiente**, reservado para experimentos de rendimiento P16.1 y otros laboratorios públicos MIT/CC0 delimitados en subdirectorios si corresponde. Repositorio/URL de esta nueva publicación **pendientes de aprovisionar**; no inventar un Pages ya existente. No usar el sitio de la demo para hacer deploy del laboratorio.

**Estado de implementación auditado:** la rama `p16-1-performance-foundation-20261105` existe en el repositorio de la demo solo como **fuente experimental aislada**. Su `.github/workflows/p161-performance-ci.yml` tiene permisos `contents:read` y ejecuta tests; no ejecuta `deploy-pages`. Por lo tanto no sustituye ni publica ninguna de las dos Pages. Al crear el repo del laboratorio, se copiará/replicará el snapshot público aprobado mediante un workflow controlado hacia **el repositorio del laboratorio**, jamás mediante un job de Pages dentro del repo de la demo.

## Protocolo de aislamiento

- La rama `main` y la ruta `/p16/` de DEMO permanecen intactas. Experimentos no se mezclan con demo antes de la aprobación.
- GitHub Actions CI por cada repo. Cada Pages despliega exclusivamente su propio artefacto a su propio entorno `github-pages`.
- Mantener snapshots/versiones identificables en el laboratorio para comparar P16 vs P16.1 y reproducir benchmarks Android.
- P17 RPG y el Skill Lab se mantienen aislados entre sí y de P16.1; compartir solo interfaces y cambios validados.
- No subir KayKit Complete SOURCE, ZIPs, recursos comerciales, activos de licencia incompatible o contenido `with project only` a ningún Pages público.
- **Codespaces solo cuando se empiece la integración privada de KayKit SOURCE** y assets propios que requieran trabajar fuera del flujo público. No introducirlo como paso de benchmarking o despliegue MIT/CC0.
- GitHub Pages no es un servidor Node: el cliente usa HTML/JS/GLB estáticos; CI puede usar runners de GitHub Actions para tests y preparación de artefactos.
- Performance del S23 Ultra se mide visitando la URL **del laboratorio** y con `?hf_p161_profile=1`, usando la misma escena/preset para comparaciones; la URL estable sigue disponible simultáneamente.
