# HIGHFLY P193 · World Forge (fase inicial)

**Base exacta:** `drakenhok-star/HIGHFLY-ORIGIN-DEMO`, rama `p192-pueblitos-crafting-log-20261106`.
La rama de desarrollo `p193-world-editor-poc-20261106` NO modifica `main` ni publica automáticamente sobre la demo original.

## Abrir y utilizar

Servir el repositorio **desde su raíz** con un servidor HTTP estático (por ejemplo `python3 -m http.server 8080` o el servidor Node incluido).

- Juego original de esta rama: `http://localhost:8080/`
- Editor real en la misma escena: `http://localhost:8080/?hf_world_editor=1`

El editor arranca el **mismo Game, Terrain, Structures, NPCs, Enemies, Scatter e Interiors** que la demo P192.
Para mostrar las siete villas fuera de distancia de render, fuerza **solo en modo editor** la materialización de las casas y maestros con el mismo constructor de P192. No inventa un segundo mundo, ni reemplaza el mapa por una textura.

Se pueden seleccionar casas y NPC, moverlos con el ratón en la vista 3D o 2D, editar coordenadas exactas, giro y escala, añadir/duplicar casas y usar modelos ya presentes en `assets/models`, con deshacer/rehacer, borrador en el navegador e importación/exportación de JSON.

- **Guardar borrador** guarda el diseño *solo en ese navegador*. No altera partidas ni el sitio público.
- **Exportar JSON** descarga `world-layout-p193.json`.
- Para **publicar** el mapa probado en HIGHFLY, sustituir `assets/world-layout-p193.json` por el JSON aprobado y probar de nuevo el juego SIN `?hf_world_editor=1`. En partidas nuevas, esas posiciones se aplican a casas/NPC principales y a las villas y sus NPC creados bajo demanda.
- Si el JSON está vacío, se mantiene la colocación original P192 al 100%.

## Biblioteca, licencias y límites de esta primera fase

La biblioteca de P193 registra recursos realmente disponibles y cargados de la demo; no agrega binarios ajenos sin su procedencia ni licencia. El código MIT de ClaudeCraft 0.44.7 se puede consultar y adaptar bajo los términos de esa licencia, **pero eso NO concede automáticamente licencia de reutilización sobre sus GLB, texturas o packs de terceros**.

El KayKit SOURCE completo es una compra del usuario, no debe volcarse a un repositorio público sin auditar su contenido y respetar cada licencia. Integrar nuevos GLB privados debe hacerse en un repositorio o entorno privado y con catálogo de procedencia, no por URL ficticia.

### Funciones todavía no completas

1. Vegetación de instancias del mundo y decoraciones fusionadas no se pueden seleccionar individualmente todavía. La escena, sin embargo, las representa tal cual.
2. Enemigos, spawns, IA, loot, rutas, navmesh y dungeons conservan su comportamiento de P192; mover un monstruo funcional necesitará su propio adaptador de datos de spawn. No sustituirlo por una estatua.
3. Casas de misión originales: las puertas, el colisionador y la chimenea siguen la casa; cofres decorativos y dependencias narrativas aún deben auditarse antes de publicar grandes desplazamientos.
4. Un maestro agregado como **NPC nuevo** tiene modelo real, pero no se le añade mágicamente un diálogo, profesión ni inventario de comerciante.
5. En esta fase, colocar o mover un objeto no vuelve automáticamente segura una región: las zonas de aparición de monstruos requieren validación y su propia capa de edición.
6. El mapa guardado en JSON es compartible; la simulación, colisiones y misiones deben pasar las verificaciones antes de fusionar a producción.

## Recomendación de prueba

Abrir el editor, comprobar posiciones de aldea, herrería, siete villas y NPC. Mover una casa secundaria; exportar. Copiar ese JSON a `assets/world-layout-p193.json` en la rama de prueba; abrir el juego normal y visitar el lugar para verificar casa, NPC y colisión. Mantener P192 como rollback intacto.

**No fusionar a main hasta pasar pruebas en navegador real** y una inspección de colocaciones críticas.
