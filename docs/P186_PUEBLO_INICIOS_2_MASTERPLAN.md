# HIGHFLY TIANJIE 5 — P18.6 PUEBLO DE LOS INICIOS 2.0
2026-11-05 · Plan maestro nivel 1–20 · Rama aislada p186-inicios-20-profesiones-mapa-v2-20261105

## Mandato
La Aldea de Aprendizaje se convierte en el Pueblo de los Inicios: una región de nivel
1 a 20 donde nacen TODAS las bases RPG: combate, habilidades iniciales, loot,
inventario, armas, armaduras, oficios, comercio, NPC, misiones, dungeons, guardado
y desbloqueo del primer portal. El mundo Bosque de las Cascadas usa otro terreno
y materiales exclusivos; nunca mover los recursos W1 a la aldea inicial.

## 15 profesiones verificadas en ClaudeCraft 0.44.7
Fuente MIT fija: https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/sim/content/professions.ts

Las cinco profesiones de GATHERING_PROFESSIONS son:
1. mining — Minería (maestro minero, poblado minero; maxSkill upstream 100)
2. logging — Tala (maestro leñador, aserradero; 100)
3. herbalism — Herboristería (maestro herbolario, boticaria; 100)
4. fishing — Pesca (pescador, villa pesquera; 200)
5. farming — Agricultura (granjero, granjas; 100)

Las diez de CRAFT_RING, en ORDEN ORIGINAL, son:
6. engineering — Ingeniería (taller, aserradero; 125)
7. alchemy — Alquimia (boticaria, herbolarios; 125)
8. cooking — Cocina (cocina, pescadores; 125)
9. leatherworking — Peletería (curtiembre, artesanos; 125)
10. tailoring — Sastrería (telar, artesanos; 125)
11. inscription — Inscripción (escribanía, estudios; 125)
12. enchanting — Encantamiento (estudios; 125)
13. jewelcrafting — Joyería (joyero, artesanos; 125)
14. weaponcrafting — Fabricación de armas (Sigrid, forja central; 125)
15. armorcrafting — Fabricación de armaduras (Sigrid, forja central; 125)

Hobby es una modalidad de un oficio, NO profesión dieciséis.
Blacksmithing es un rol/maestro, no un miembro adicional de CRAFT_RING.
La carpintería será taller y repertorio de madera bajo engineering y weaponcrafting
hasta definir una profesión exclusiva HIGHFLY; no falsear el censo upstream.
Skill cap 100/125/200 es pericia de oficio, NO nivel del personaje 1–20.

## Mapa lógico — 8 núcleos y 7 rutas
Central: Pueblo de los Inicios y sus NPC existentes Olaf, Bjorn y Sigrid;
herrería, plaza, misiones, academia de combate, equipo, mercado y portal final.
Cinco villas productivas:
- Aserradero 3–9: leñador, madera, taller de ingeniería, herramientas.
- Minería 5–13: cantera, vetas, capataz, acceso a cueva/galerías.
- Herbolarios 2–10: hierbas, alquimia, inscripción inicial, pociones.
- Pescadores 3–11: costa REAL, caña, comercio del pescado, cocina.
- Granjas 4–12: sembrar, regar, esperar maduración, cosechar, cocinar.
Dos barrios auxiliares:
- Artesanos 3–20: curtidor, sastre, joyero, complementos de Sigrid.
- Estudios 8–20: encantamiento, inscripción, magia y herramientas especiales.

La red une cada villa o barrio con el centro; los caminos y pasarelas sólo se
construirán tras comprobar conectividad con colisiones. Los puestos de trabajo
deben usar modelos completos CC0, sin cajas ni conos geométricos.

La aldea antigua SE CONSERVA (centro de Structures en x=0,z=40, r~78).
Las coordenadas de satélites presentes en inicios-v2-p186.js son referencias
de BÚSQUEDA, no lugares garantizados. La costa pesquera carece de anchorHint
hasta observar agua real. Nunca generar pueblos mediante traslado de mapa.

## Nivel 1–20 en cinco capítulos
1–4: tutorial, primer combate, golpe con hit confirm, equipo, loot, tres NPC
existentes, primer recurso, primeras skills MP/Energía y misión inicial.
4–8: leñador, minero, boticaria, pescador, agricultor, cocina, fabricar
herramienta, planta sembrada/cosechada, primera progresión de oficios.
8–12: completar lecciones iniciales del resto de oficios, primera dungeon
Galerías de la Primera Veta (a construir), herramientas, NPC y rutas.
12–16: cripta ampliada, jefe, encantamiento e inscripción básicos, recetas,
tareas interconectadas, reputación, mejoras de equipamiento.
16–20: cadena final de varias villas, mini-jefe regional, recompensas de
transición, invitación al Bosque de las Cascadas y portal bidireccional.
El portal se habilita por la quest final y condiciones definidas; no exigir
completar todas las misiones opcionales ni todas las maestrías.

## Dungeons
- Galerías de la Primera Veta: niveles 7–12, nueva mina con salas, minerales,
  monstruos ya autorizados y mini-jefe; NO construida en esta fase.
- Cripta de los Guardianes: niveles 12–20, reutilizar puerta y cripta Interiors
  barrow existentes, pero ampliando layout según blueprint P18.4. Blueprint
  premium todavía no es dungeon publicado y jugable.

## Profesiones: implementación por capacidad, no sólo catálogo
- Sistema común de nodo: ID, región, herramienta y tier, distancia USAR,
  tiempo de acción, resultado de loot, cooldown y XP de oficio.
- Sistemas de crafting: trainer, receta, estación, material de entrada, salida
  validada en Inventory, progreso y anti duplicados.
- Pesca: comprobar orilla con agua real y ventana de mordida del minijuego.
- Farming: azada, parcela/semilla, tiempo real de crecimiento entre sesiones,
  estado de cosecha, reward exactamente una vez.
- Primera misión de cada oficio aprendible antes del nivel 20.
- Progreso de profesión NO añade STR/AGI/VIT/PER/INT base; equipo y consumibles
  contribuyen sólo a atributos/efectos definidos.
- Materiales de otros mundos son exclusivos de su región y requieren tier de
  herramienta y nivel adecuados. Su origen se controla al conceder el ítem.
- Las misiones escuchan eventos de enemigos/recursos preexistentes; nunca
  dependen de la misión para generar monstruos o minerales.

## Auditoría y fuentes
El archivo aportado por el usuario AUDITORIA_UNIFICADA_14_CATEGORIAS.md enumera
medios, sistemas y rutas MIT/CC0, pero NO es un certificado de licencia universal
de todos los binarios ni un censo de 15 profesiones por sí solo. Se cruzó con
los contratos upstream 0.44.7 de:
- src/sim/content/professions.ts y profession_trainers.ts
- src/sim/content/gather_nodes.ts; professions/gathering.ts
- src/sim/professions/fishing.ts; fishing_zones.ts
- src/sim/professions/farming.ts; content/farm_patches.ts y farm_crops.ts
- src/sim/professions/stations.ts y training.ts; content/recipes.ts
- src/sim/quests/quest_credit.ts; content/dungeons.ts; dungeon_layout.ts
- src/sim/pathfind.ts
Código MIT adaptado por módulo; binarios/GLB sólo con auditoría individual CC0.
Nunca copiar "with the project only", CraftPix, terceros comerciales o logos.
KayKit SOURCE original se conserva fuera del repositorio público; el juego
puede incorporar GLB CC0 verificados sin exponer el SOURCE original.

## Mapa seguro y pasos de implementación
1. Congelar respaldos P18.3e/P18.5 y mantener main sin cambios.
2. Implementado P18.6: catálogo 15, 14 maestros (13 nuevos planeados),
   8 núcleos, 7 rutas, cinco capítulos, dos dungeons y 8 recursos; estado
   inmutable, protección por región y anti duplicación. No se ha conectado
   todavía al juego.
3. El buscador de asentamientos P18.6 sólo devuelve candidatos cuando
   getHeight/getSlope, colisiones, peligros, navegación y hábitats lo permiten.
   No crea ni publica edificios si falta cualquiera de estas comprobaciones.
4. Siguiente: inspección de W0 en navegador para validar los sitios,
   importar edificios/props CC0, enlazar NPC con rig/animación y navegación.
5. Integrar SaveSys, Inventory, Quests, diálogo, HUD, USAR, tools, farm patches,
   nodos, crafting, dungeons y primer portal sin afectar combate FURY.
6. Solo cuando 15 lecciones, nodos, dungeons y movimiento estén comprobados
   publicar demo separada y medir en S23 Ultra horizontal FPS/P95/P99.

Estado: solo definiciones y herramientas QA validadas por CI; NO reemplazar
versión estable, NO afirmar que los 13 maestros/modelos o villas existen ya.
