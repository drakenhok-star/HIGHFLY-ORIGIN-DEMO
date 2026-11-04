# HIGHFLY ORIGIN DEMO

**Mundo RPG experimental en navegador — Android horizontal y PC.**

Esta demo pública parte de [Tianjie5](https://github.com/zexadev/tianjie5) (MIT, © 2026 zexadev) y conserva sus 15 modelos originales declarados CC0 en [assets/manifest.json](assets/manifest.json).

### Jugar

[**Abrir HIGHFLY ORIGIN en GitHub Pages**](https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/)

*El enlace funcionará cuando la primera publicación de GitHub Actions concluya satisfactoriamente.*

### Qué incluye

- Terreno procedural, aldea, bosque, nieve, ruinas, cripta y ciclo de día/noche.
- Cazador KayKit original con espada, lobos, draugr, dragón, 3 NPC y 3 misiones.
- Inventario, loot, armas y armaduras equipables, HP/MP/Energía y guardado local.
- Controles táctiles para Android, fullscreen, HUD de FPS, modos GPU y minimapa/mapamundi.
- **FLUIDO** es el modo de referencia para móviles.

### Publicación automática y código fuente

La publicación inicial se construye con [GitHub Actions](.github/workflows/publish-pages.yml). [Este script](scripts/bootstrap_public_demo.sh) reconstruye desde el commit original fijado `42eebcb4b422f3aa432cff882f1e51b2a856a6b2`, comprueba la lista de 15 GLB y aplica los módulos públicos. El workflow también materializa el código fuente del juego en este repositorio.

Para ver o reejecutar manualmente: **Actions → HIGHFLY ORIGIN · Build and publish MIT/CC0 demo → Run workflow**. En Settings → Pages elegir **GitHub Actions** como fuente de publicación si fuera necesario.

### Licencias y privacidad

- Código de origen: MIT (archivo [LICENSE](LICENSE) al finalizar la instalación).
- Modelos 3D: declarados CC0 en el manifiesto del autor; la verificación independiente completa de binarios está pendiente.
- Three.js: MIT.
- No publicar aquí KayKit SOURCE adquirido, materiales comerciales, backups privados ni ZIPs propietarios. Los modelos y sistemas privados se integrarán únicamente en un repositorio aparte.

[Ver detalles de procedencia](PROVENANCE.md).

**Aviso:** la partida se guarda en el navegador y su progreso no se traslada automáticamente entre Codespaces y Pages.


## HUD premium táctil — P5-A

El HUD de Android ya tiene un primer rediseño **hecho en código**, no en imágenes:
- HP, MP y Energía reales arriba a la izquierda, con nivel del cazador.
- **INVENTARIO** y **BOLSA** justo debajo de las barras.
- Panel táctil con filtros INVENTARIO / EQUIPO / BOLSA / MISIONES; equipamiento de armas/armaduras y uso de pociones con la lógica original.
- Joystick a la izquierda; **SALTO — DASH — USAR** agrupados a la izquierda del ataque ATK. CORRER mantiene su función al mantener pulsado, cerca del joystick.
- Cuatro botones de habilidades: S1 magia, S2 FUS, S3 HIELO, S4 WULD. S3/S4 se muestran bloqueadas hasta aprender los gritos originales.
- DASH experimental reutiliza el dash de Tianjie5; movilidad y colisiones avanzadas aún son fase de desarrollo. 
- Fluido permanece como perfil gráfico seguro; los FPS/GPU siguen visibles para comparar rendimiento.

**Recuperación:** agregar `?hf_classic_hud=1` a la dirección del juego para utilizar los controles anteriores. Si el mapamundi molesta, `?hf_no_map=1` lo desactiva.

Código fuente: [HUD premium](src/ui/premium-hud-p5.js) · [conexión con el controlador táctil](src/ui/touch-controls.js) · [prueba automática](tests/premium-hud.test.mjs).

La traducción completa de menús y diálogos originales sigue pendiente; esta fase traduce el HUD y el inventario táctil.
