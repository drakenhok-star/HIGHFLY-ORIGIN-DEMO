# HIGHFLY — PLAN DEL SIGUIENTE MUNDO: REGIONES POR PORTAL (sin edificios inicialmente)

## Objetivo
Una aldea de inicio con tutorial y una capital central grande en el futuro, más regiones independientes por portal: bosque, nieve, costa/puerto, desierto, lava, montañas del aire. Todas comparten jugador/combate/skills/inventario/quests, pero cada región declara su propio paisaje, flora, clima, enemigos, dungeons y ciudad futura. Proponer primero **terreno, agua, vegetación y navegación**: ni pueblos provisionales ni cajas de geometría.

## Arquitectura de datos (MIT de WOC como referencia, sin copiar runtime ni assets restringidos)
- ZoneDef/RegionDef: `zoneId`, `seed`, `terrainProfile`, `foliageSet`, `climate`, `waterProfile`, `spawnRegistry`, `poiRegistry`, `safeLanding`.
- PortalDef: `portalId`, `sourceZoneId`, `destinationZoneId`, `sourceAnchor`, `arrivalAnchor`, `unlockConditions`.
- Estado persistente: `zoneId`, coordenadas locales, nivel/equipo/atributos, misiones por región, cofres y encuentros. Mismo código reutilizado por todas las regiones; no usar coordenadas del continente de WOC como si fueran las de HIGHFLY.
- Transición atómica: guardar origen, deshabilitar controles durante cambio, descargar enemigos/instancias/terreno/VFX/mapa/objetos de origen y liberar GPU/memoria, cambiar paleta+seed y generar chunks cercanos, verificar colisión y punto de llegada seco, reactivar controles. En fallo volver al origen, nunca dejar una pantalla negra.
- Una sola región residente, no siete copias de mundo en RAM. Streaming por chunks + instancing; simular IA cerca del jugador; guardar datos de spawns sin simular especies de regiones descargadas.

## Primer mapa y secuencia
1. Mantener escena inicial ya funcional como **Aldea de Aprendizaje** (tutorial, campo, recompensas).
2. Crear **capital central solo como valle natural** delimitando superficie y posible emplazamiento urbano; sin construcciones todavía. Terreno ancho, caminos proyectados, reserva de ciudad amurallada y siete accesos regionales.
3. Crear seis/seven biomas como **escenas/regiones de terreno** — bosque, nieve, costa, desierto, lava, montaña aérea — con plantas y rocas CC0 verificadas, corrientes de agua y colisiones coherentes.
4. Un portal de prueba a la región bosque y regreso; selector de destinos desbloqueados. Persistencia y rendimiento.
5. Integrar ecosistemas/loot/dungeons; solo después construir las ciudades KayKit SOURCE en repositorio privado. No colocar los ZIP SOURCE en Pages público.

## Auditoría MIT/CC0 entregada por el usuario
- `AUDITORIA_UNIFICADA_14_CATEGORIAS.md` y el ZIP aportan whitelist de 384 salidas de 8 specs y 14 informes; NO contienen los 384 assets binarios, NO validan SHA de cada GLB y NO deben usarse como licencia universal de directorios.
- Usar `src/sim/data.ts`, `src/render/zone_streaming.ts`, `src/render/terrain.ts`, `src/sim/content/dungeons.ts`, `src/editor/` como lectura y referencia MIT.
- `scripts/assets/specs/foliage.json` identifica 23 Quaternius Stylized Nature CC0; `biome_packs.json` identifica paisajes y piezas; `textures.json` mapea ambientCG CC0. Confirmar ruta de origen/SHA/aviso antes de importar.
- Excluidos sin revisión: `wolf_basic.glb`, `greyjaw.glb`, edificios generados para Eastbrook, CraftPix, Meshy, Tripo, archivos `With the project only` y recursos con derechos ajenos. El código MIT no transforma un modelo exclusivo en CC0.
- Meta de hardware: monitorear FPS 40+ objetivo y P95 de frame time, evitar cargar texturas de todas las regiones, usar N regiones **no implica N renderers**.

## Alcance de P18.3e
Esta rama solo arregla nombres, escala de élites/orco/cangrejo, los textos chinos de interacción y sustituye el pseudo-yeti 4-joint por el Quaternius `yetialt.glb` CC0 43-joint. No crea portales ni mapas nuevos para no mezclar dos riesgos de integración.
