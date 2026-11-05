# HIGHFLY TIANJIE 5 — P18.5 Mundo 2 + portales + oficios
Fecha: 2026-11-05. Rama aislada: p185-multiworld-portals-gathering-20261105.

## Objetivo
Convertir la Aldea de Aprendizaje (W0) en el inicio de un RPG de múltiples mundos con profesiones y economías regionales. **El primer destino nuevo será el Bosque de las Cascadas (W1)**, visual y técnicamente diferente de W0. No son dos teletransportes dentro del mismo terreno: W1 requiere semilla, relieve, agua, flora, clima, fauna, spawns, puntos de interés y punto de llegada independientes.

## Estado real de P18.5
En esta rama quedan creados el catálogo de 8 regiones, las dos direcciones del primer portal, los contratos de cuatro acciones de recolección, estado de viaje aislado, validaciones de seguridad y tests. El portal visible, el terreno W1 y las interacciones de oficio **no están implementados ni publicados todavía**. No anunciar una demo jugable hasta pasar los requisitos del final.

## Contratos de datos
- WorldZone: id, seed exclusiva, terrainProfile, waterProfile, foliageProfile, climate, species, gather, safeArrivalPolicy, sceneReady.
- WorldPortal: source, destination, anchorPolicy, arrivalPolicy, returnPortalId, requiresFlag.
- WorldTravelState: zoneId, visited, unlocked, nodes; separado del Training Core, Stats, inventario y progreso de combate.
- preparePortalTripP185 solo permite planificar el viaje a destinos construidos; completePortalTripP185 exige llegada verificada y coincidencia de origen/destino. No reemplazan la transición real del motor.
- El registro P18 anterior describe **subzonas dentro de W0**; no debe mezclarse con el catálogo de mundos P18.5.

## W0: aldea viva y recursos cerca de la ciudad
El asentamiento inicial conserva sus NPC, tutorial, misiones y combate. Reservar puntos de oficios, pequeñas huertas, una cantera y senderos cercanos a la muralla; no cortar árboles decorativos arbitrarios ni poner cubos/estructuras provisionales.

Acciones jugables que deberán implementarse usando el botón USAR:
1. RECOLECTAR plantas, hierbas, flores y bayas (manos).
2. TALAR árboles designados, con hacha, animación de trabajo y regeneración.
3. MINAR roca y depósitos minerales, con pico y colisiones reales.
4. PESCAR desde orillas seguras, con caña y captura verificable.

Cada nodo tendrá ID regional estable, tiempo de uso, tipo de herramienta, material/loot, estado agotado y tiempo de reaparición persistente. El resultado debe pasar por Inventory/Loot existente, no regalar atributos base. Oficios posteriores: herrero, alquimista, carpintero, cocinero y comerciante, más niveles de oficio separados de STR/AGI/VIT/PER/INT.

## W1: Bosque de las Cascadas
- Seed 825173 frente a 1337 de W0.
- Perfil forest_falls_terraces: terrazas húmedas, valle entre colinas, ríos, cascadas, pequeños lagos, claros transitables y acceso posterior a grutas.
- Perfil giant_forest: copas altas, árboles grandes, helechos, flores, setas y detalles naturales, sólo con modelos autorizados; sin placeholders geométricos.
- Enemigos iniciales reutilizables, sujetos a auditoría de assets: lobo forestal, goblin, araña, zorro. Más adelante criaturas mágicas y hadas propias.
- Recursos distintivos: hierbas forestales, madera antigua, pesca de río.
- Santuario del Bosque: reservar un claro para una ciudad del bosque futura, no inventar edificios que no están en los kits verificados.
- Primer dungeon propio bosque/cascada en siguiente fase; su entrada se registra como POI, no crear una cripta falsa.
- Portal de ida desde un sector seguro cercano a la aldea; retorno desde un claro seco y con colisiones comprobadas, no posiciones X/Z inventadas.

## Otros destinos futuros
Costa de las Mareas: ciudad portuaria, barcos, pesca y comercio.
Nevadas del Velo: bosque frío, montañas heladas y criaturas nivales.
Mar de Dunas: oasis, minería desértica y ruinas.
Corazón de Lava: obsidiana, forja y recursos volcánicos.
Cumbres del Viento: altitud, escalada, cañones y movilidad avanzada.
Abismo de las Sombras: Halloween/fantasmas, cementerios, criptas y flora espectral.
Una capital central amurallada podrá conectarlos después como hub.

## Integración del runtime: orden correcto
1. Convertir Terrain, Scatter y WaterSurface en módulos reconfigurables por WorldZone. Hoy Terrain usa noise(1337), flatten spots y paleta de W0; cambiar sólo game.worldSeed o sumar 3000 unidades no produce W1.
2. Inventariar referencias de W0 en Structures, Interiors, Enemies, NPCs, Ambience, mapamundi, radar y Effects; incorporar unload/detach/dispose de sus mallas, IA, instancias y materiales.
3. Montar escena/terreno W1 usando los perfiles propios y un solo mundo residente en GPU. Construir anillo cercano de chunks y buscar punto seco, transitable, alejado de obstáculos.
4. Realizar transición atómica: guardar origen, bloquear temporalmente entrada, precargar objetivo, verificar colisión, descargar objetos de origen, reubicar jugador/cámara, reactivar inputs y guardar destino. En fallo, restaurar W0 sin pantalla negra.
5. Colocar portales con modelo CC0 REAL verificado y botón USAR; flag forest_invitation o bypass de QA exclusivo, sin mezclar desbloqueo de producción.
6. Implementar nodos de recursos en W0 + dos exclusivos W1, animación, herramientas, loot y timers persistentes.
7. Nuevo namespace de guardado HIGHFLY P18.5, migración de sólo lectura desde P18.3, sin sobrescribir partidas viejas ni alterar Fitness Core.

## Rendimiento y móviles
Preservar joystick 360, cámara híbrida, hit-confirm FURY 1-2-3-4, HUD español y telemetría. Objetivo de prueba S23 Ultra: al menos 40 FPS estables cuando sea viable y cuantiles P95/P99 observables. Un solo mundo grande cargado en memoria, instancing, chunks y LOD. Medir GPU/memoria tras 10 idas y vueltas y asegurar que no se acumulen modelos o listeners.

## Licencias y SOURCE
Código MIT de Tianjie y sólo referencias/recursos MIT/CC0 verificados de ClaudeCraft. No importar binarios con permiso exclusivo, CraftPix, Meshy/Tripo ni carpetas sin auditoría. El KayKit SOURCE adquirido NO se sube a HIGHFLY-ORIGIN-DEMO público. Sólo piezas KayKit CC0 autorizadas e identificadas individualmente, o trabajo posterior en un repositorio privado.

## Criterios de aceptación para publicar P18.5
- W0 permanece jugable y ninguna URL existente de Pages se sobrescribe.
- Portal visible, interactivo y bidireccional; sin teletransporte dentro del W0.
- W1 tiene sus propios chunks, agua y vegetación; ninguna construcción de W0 aparece.
- Ida y vuelta funcionan con el mismo cazador, equipo, skills, misiones y cámara.
- Guardado/carga en W1 y recompensa de recursos sin duplicación tras reiniciar.
- Recursos RECOLECTAR/TALAR/MINAR/PESCAR utilizables en la aldea y nodos raros de W1.
- Sin caída bajo el mapa, sin pantalla negra, sin fugas GPU ni degradación de controles Android.
- Tests Node, CI, prueba PC y prueba S23 horizontal antes de desplegar versión aislada.

Archivo base: src/world/world-zones-p185.js
Tests: node --experimental-default-type=module tests/p185-world-portals.test.mjs
