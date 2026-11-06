# HIGHFLY P194 — Pueblo de los Inicios unificado + World Forge optimizado

Estado: rama experimental `p194-central-village-forge-20261106`. **No es P192 productiva** y no cambia P193 congelada.

## Mundo W0
- Plaza real en (0,40), monumento original LOW-POLY con estética azul/cian, sin asset comercial.
- 9 edificios en el pueblo, con cartelería y calles de piedra reutilizando el constructor de casas HIGHFLY. Casas originales conservan puertas, colisión y chimeneas.
- Casa comunal al norte, taberna al noroeste, taller de recursos al oeste, vivienda de Olaf al sur, mercado/cocina al este, herrería de Sigrid, botica, academia arcana y atelier textil.
- Pozo original movido al margen de la plaza junto con su colisión.
- 7 antiguos hubs P192 convertidos en **referencias a los barrios centrales**, sin buscar ubicaciones ni materializar casas satélite.
- 13 maestros originales P192 repartidos entre 7 barrios, 16 NPC totales en W0 inicial. Se conservan 15 IDs de profesiones, requisitos, drops, misiones P192 y conversaciones.
- Afueras: se conserva el terreno, la fauna hostil, las ruinas, la cripta, el loot y la recolección. No se borran zonas de misión.
- Muelle de madera construido localizando la costa real: **no se coloca sobre terreno seco**. Primeras tablas descienden desde la orilla hasta el nivel del agua. El maestro pescador queda cerca de este si hay un lugar seguro. Prototipo visual, no se anuncia todavía colisión transitables ni minijuego de pesca.
- El monumento del portal es visual y seleccionable. El sistema P185 indica que mundos de destino aún tienen `sceneReady:false`: no se inventa una teletransportación a mapas inexistentes.

## Modo editor P194
- Cámara y mouse horizontal corregidos, acceso rápido al centro y al muelle.
- En el editor el juego NO ejecuta `sky.update`, `water.update`, IA, combate, NPC animados, efectos ni sistema de quests por frame. No se hace render continuo a 60/120 fps; se renderiza al cambiar la cámara o la escena y ocasionalmente en reposo.
- Pixel ratio 1 y sin shadowmap ni postprocesado para reducir GPU; modo jugable mantiene el pipeline normal.
- Los 4 chunks reales del terreno que cruzan la isla central se precargan para evitar huecos al abrir el editor.
- Herramientas activas: seleccionar, mover, rotar, escala, inspector X/Z, deshacer/rehacer, JSON, borrador local. Edificios de distrito nuevos, portal y muelle aparecen como entidades editables.
- El esquema de exportación compatible P193 sigue siendo `assets/world-layout-p193.json`. El borrador local de P194 tiene su propia clave: no pisa P193.

## Recursos y licencias
- `assets/manifest.json`: 15 entradas declaradas CC0 de KayKit y de modelos ambientales/monstruos existentes en la demo.
- Reutilización de casas y decoración escrita por HIGHFLY: ningún placeholder de edificio.
- `src/core/assets.js` y las auditorías en `docs/audit/` contienen más referencias a WOC 0.44.7 y Quaternius. **Un enlace de catálogo no equivale a un GLB disponible o libre de restricciones**.
- No se incorporó la colección KayKit SOURCE adquirida, ZIP privados, CraftPix ni archivos WOC sin verificación individual. Todo esto permanece fuera de Pages públicos.

## Próxima fase — packs de editor (después de aprobar P194)
1. Inventariar GLB reales con fuente, licencia, cantidad de objetos, tamaño y previsualización.
2. Importar gradualmente solo packs gratuitos cuyo permiso redistributivo MIT/CC0 esté confirmado; separar claramente modelos, rigged NPC, equipamientos y assets de entorno.
3. En la biblioteca editorial: categorías Edificios, Naturaleza, Decoración, Recursos, NPC y Monstruos; una miniatura/preview y prueba de colocación por GLB.
4. En el futuro, usar SOURCE propietario **solo en un repositorio/hosting privado con acceso restringido**, nunca incrustarlo en Pages públicos.

## Validación
- `.github/workflows/p194-central-village-ci.yml`: sintaxis completa, tests P190/P191/P192 y prueba real Playwright Chromium.
- `scripts/p194-browser-smoke.mjs`: comprueba 9 edificios, 13 maestros nuevos, 0 casas satélite, 0 maestros exteriores, portal, colisiones, movimiento, deshacer, mouse y ciclo de simulación congelado.
- La estabilidad y FPS de PC/S23 Ultra son pruebas manuales adicionales: Chromium de CI con GPU software no reproduce el hardware del usuario.

## Publicación segura
- `/`: demo P192 original, commit 3a4aa2615bf3f0cff1958967865b18d39b9fe53b.
- `/p193/editor.html`: editor P193 original, commit 3814935442c23b2fe055f6040e0dcc5e52150e59.
- `/p194/editor.html`: nuevo editor P194.
- `/p194/`: demo P194 jugable de prueba, sin contaminar las anteriores.
