# HIGHFLY — Auditoría comparativa ClaudeCraft 0.44.7 / P18.2 y plan de expansión ecológica + mazmorra premium

Fecha: 2026-11-05 · fuente fijada: [World of ClaudeCraft 0.44.7, commit 493c35a](https://github.com/levy-street/world-of-claudecraft/tree/493c35a108cef6c8aa290e8793107b1cd117886e). **Solo catálogo/código verificado; no se han copiado modelos comerciales a HIGHFLY.**

## Principio aprobado por el usuario (regla de arquitectura)

**Los monstruos existen en el mundo independientemente de las misiones.** Los campamentos, territorios, respawn, IA, XP y botín base son propios de los mobs. Una misión activa ESCUCHA el evento de muerte/interacción, sin ser dueña del spawn. Por ejemplo, tres misiones en momentos distintos pueden pedir 10 / 100 / 3 lobos centinela, sin crear tres tipos de lobo. El progreso de misión se registra desde su aceptación; un contador global de logros puede registrar histórico si se diseña por separado. Misiones de jefe, ritual, escolta o evento narrativo *pueden* activar entidades extraordinarias de modo explícito.

Esto está implementado como criterio en ClaudeCraft: [cacerías por zona](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/sim/content/world_quest_zone_hunts.ts) dice que usan campamentos preexistentes, nunca crean mobs solo para una misión.

## Comparación de sistemas auditados (no confundir código con visuales)

| Subsistema | HIGHFLY P18.2 ACTUAL | ClaudeCraft 0.44.7 VERIFICADO | Plan de adaptación sin romper P16.3/P18 |
|---|---|---|---|
| Spawns / territorios | 3 manadas de lobos normales, 1 de hielo, 2 fronterizas, draugr, dragón; respawn por manada. Ahora hábitat seco P182 | `zone1.ts`, `zone2.ts`, `zone3.ts`, `frostveil.ts`: mobs, campamentos y zonas independientes de misiones | Registro global por especie, bioma, hábitat y campamento. Escalado por población y distancia, no por misiones |
| Variedad e IA | Lobo persecución/ataque/retorno/alerta de manada, draugr y mago, jefe dragón | `mob/social_aggro.ts`, `mob/flee_rules.ts`, `mob/ambient.ts`, `mob/reachability.ts`, `mob/charge.ts`, `pathfind.ts`: reclutar aliados de familia, huida, fauna no hostil, objetivo inalcanzable, embestida, A* para movimientos puntuales | Adaptadores JS puros a `Enemies` + nav terrain; no duplicar la física ni el sistema de daño |
| Objetivos/quest journal | q1 lobos, q2 espada, q3 dragón, P18 centinelas Bjorn | `content/world_quest_zone_hunts.ts`, `content/world_quests.ts`, `content/weekly_quests.ts`, `quests/quest_credit.ts`: cacerías por zona, diarias/semanales, misiones no-kill, crédito único | Registro `QuestDef`, router de eventos kill/collect/talk/visit, recompensa idempotente. La misión no crea mobs |
| Drop normal | Oro + piel lobo; hueso draugr; escala/hueso dragón; bolsa física y cofre | `zone1.ts` Forest Wolf: monedas aseguradas + colmillo 45%, botas 1,7%, bolsa 0,3%. Boar: cuero, carne, pantalones; Spider: seda, pata, vestimenta rara. `loot/weighted_loot_group.ts` asegura grupos ponderados de equipo y cuotas separadas | Botín independiente de quest, peso/rareza/procedencia y eventos de recompensa; nunca conceder el mismo drop dos veces |
| Armas y armaduras | `inventory.js`: **15 objetos**, exactamente 4 espadas, 3 armaduras, 2 pociones y 6 materiales, equipamiento `weapon/offhand/armor` y pantalla de personaje P7 | `content/items.ts` (4184 líneas), `content/heroic_loot.ts`, `content/item_sets.ts` (2/4/6 piezas, familias), `equipment_rules.ts` (slots, manos, tipos, únicas legendarias) | Mantener HIGHFLY: STR/AGI/VIT/PER/INT base NO aumentan por equipo. Items otorgan exclusivamente atributos derivados (ataque, defensa, crítico, velocidad, resistencias, procs, habilidades equipadas) |
| Interior/mazmorra | Una cripta `interiors.js`: entrada → corredor → cámara redonda → corredor corto → sala jefe, módulos geométricos propios, draugr y Señor draugr, muro rúnico | `content/dungeons.ts` Hollow Crypt, Sunken Bastion, Gravewyrm Sanctum; `render/dungeon.ts` look modular KayKit, luces diferenciadas, colisiones desde `dungeon_layout.ts`, **InstancedMesh** por tipo | Reconstruir una nueva cripta modular + colisiones del mismo registro de sala: 3–5 salas jugables, rutas, cerraduras, cofres, jefes, objetivo y salida con validación |
| Delves escalables | No hay generator de instancias por seed/afijos/tiers todavía | `content/delves/collapsed_reliquary.ts` L7, 3 módulos + boss, compañero Tessa, normal/heroic; `drowned_litany.ts` L12, elige 3 de 6 módulos y boss, compañero Edda; Heroico +3 niveles, 1 afijo, 1.3x recompensas. `delves/runs.ts` maneja runs | Adoptar concepto de *sala modular con layout guardado, encuentros y recompensas*, no importar dependencias de red/servidor ni visuales reservados |
| Dungeon loot | Cofres de aldea/ruinas/torre, drops de jefes; no sets dungeon reales | `content/heroic_loot.ts` tablas heroicas, `content/item_sets.ts` set bonuses, `content/dungeon_difficulty.ts` tiers y monedas; legendarios por jefe | Pools Common/Rare/Epic/Legendary para jefes y rooms, garantizados vs oportunidades, una única adjudicación por cofre/boss; balance separado de training Core |
| Mundo vivo | Olaf, Sigrid, Bjorn + sus rutinas de horario básicas; Bjorn deambula | `mob/ambient.ts` (caballos decorativos, no hostiles); `zone1.ts` NPC y hubs; `professions/farmer_npcs.ts`, `gather_nodes.ts` | Agenda de NPC con puertas y waypoints, nav/colisión, trabajos; solo cercanos animados. No simular 200 rigs |
| Carga / FPS | P16.3 governor/agua/LOD césped/terrain budget | `render/zone_streaming.ts`, `render/dungeon.ts` instancing, `render/interior_resource_lifecycle.ts` | Streaming por región y habitación, precarga de modelos reusable, visibilidad por portal y distancia, benchmarks reales S23 |

## Ejemplos de ClaudeCraft verificados y pertinentes

- **Pradera de Eastbrook** ([`zone1.ts`](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/sim/content/zone1.ts)): Forest Wolf con `packFrenzy`, Old Greyjaw raro con `frenzyOnHit`, Wild Boar con `thorns`, Sableweb Lurker con `venom` y `ensnare`, bandidos en campamento. Son entidades persistentes del catálogo sin obligación de aceptar una misión.
- **Cacerías diarias** ([`world_quest_zone_hunts.ts`](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/sim/content/world_quest_zone_hunts.ts)): jabalíes 6, esqueletos 5, arañas 5 en Eastbrook, otras cacerías en Mirefen/Thornpeak. Se apoyan en campamentos existentes.
- **Mundo nevado** ([`frostveil.ts`](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/sim/content/frostveil.ts)): Snowdrift Wolf, Ice Wisp, Rime Elemental, Fen Sprite, Terrace Howler. Misma familia permite variantes físicas, estadísticas, drops y VFX propias de la nieve.
- **Fauna y escape** ([`mob/ambient.ts`](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/sim/mob/ambient.ts), [`social_aggro.ts`](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/sim/mob/social_aggro.ts)): caballos ambient sin combate, y algunos humanoides heridos que huyen para pedir ayuda a grupos LOCALES, evitando aggro infinito en cadena.
- **Dungeons “premium”** ([`dungeons.ts`](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/sim/content/dungeons.ts), [`dungeon_layout.ts`](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/sim/dungeon_layout.ts), [`render/dungeon.ts`](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/render/dungeon.ts)): arquitectura separada de layout, enemigos, colliders y look. Hollow Crypt / Sunken Bastion / Gravewyrm Sanctum son dungeons de ~5 jugadores; además delves de 1–2 jugadores con selección de salas y afijos, como Collapsed Reliquary y Drowned Litany.
- **Diseño visual CC0**: el `render/dungeon.ts` señala explícitamente *KayKit Dungeon Remastered + KayKit Halloween Bits*, componentes instanciados para reducir draw calls. Son recursos CC0 documentados en `CREDITS.md` de ClaudeCraft, pero hay que rastrear el GLB concreto antes de copiarlo a HIGHFLY.

## Agua y clases de criaturas (próxima mecánica)
- **Terrestres:** arena de transición `seco → vadeo lento (0.5–0.65x speed) → agua profunda inaccesible`; un golpe puede empujar hasta la orilla, no al fondo. Lobo, jabalí, ciervo, bandido.
- **Semiacuáticos:** cangrejo de costa/río, anfibios: pueden ocupar orilla y agua somera sin penalización o con velocidad específica.
- **Acuáticos:** pez/serpiente de agua con locomoción propia y navegación en superficie/profundidad, no reutilizar animación de correr de lobo.
- Hay un antecedente de separar esta posibilidad en ClaudeCraft: `mob/reachability.ts` usa `mobCanSwim` y `pathfind.ts` distingue navegantes del agua vs terreno profundo, pero **no se ha importado ese sistema** a HIGHFLY. Mantener las reglas secas P18.2 hasta probar las transiciones.

## Orden recomendado (cohesivo y con puertas de aceptación)

### P18.2.1 CORRECCIÓN YA IMPLEMENTADA EN RAMA AISLADA
En P18.2 quedaban dos POIs amarillos permanentes aun después de cobrar. `world-map-p34.js` ahora dibuja las patrullas solo con la misión `active`. Cuando llega a `complete`, el objetivo es Bjorn; tras `done`, no quedan marcas. El caché de POIs se reconstruye al cambiar de estado; `LivingWorldP18.turnInFrontier()` limpia el seguimiento, y los guardados antiguos `done` no reactivan la marca. **Los lobos siguen apareciendo sin la misión y conservan sus drops.**

### P18.3 — ECOSISTEMA REAL + LOOT COMO VERTICAL SLICE
- Registrar **pradera, bosque, costa, nieve, ruinas**; especie por familia/hábitat, territorio, cooldown, loot, social pack, neutral/aggressive/flee.
- Primera tanda: jabalí (embestida y caza), araña (veneno + telaraña) y bandido (huye/pide ayuda) con modelos CC0 concretos verificados y animaciones. Ciervo pacífico como segunda ola; cangrejo de orilla después de verificar modelo. **Nunca placeholder geométrico.**
- Mob catálogo de spawn permanente independiente de quest. Filtros espaciales de seguridad y agua, spawn budget con prioridad de proximidad, activos en radio y estados lejos.
- Loot genérico ponderado + materiales especiales, rareza y garantía de drop. Después una cadena real: Bjorn o Sigrid ofrece misiones, usan `KillEvent` sin re-crear mobs; a 10/100 kills mismo template, contador por misión, XP + oro una sola vez.
- Regla Core: no alterar STR/AGI/VIT/PER/INT con objetos; atributos derivados sí pueden subir por equipo.

### P18.4 — CRIPTA HIGHFLY PREMIUM MODULAR (PRIORIDAD ALTA)
- Mantener entrada `USAR` y retorno seguros, pero reemplazar la pequeña sala/corredor por **instancia propia de 3–5 módulos** KayKit CC0: vestíbulo, galería/encuentro, bifurcación/sala de trampas, antecámara, boss y cofre/portal de salida.
- Sistema de colisiones **derivado del mismo layout visual**, cámara/iluminación que no atraviesen muros, minimapa, cartel de objetivos, jefes por fases, llave o interruptor, puertas bloqueadas hasta eliminar grupo y drop de jefe.
- Primero un layout fijo con replay, luego selección de módulos por semilla y 1 afijo Heroico; evitar procedural antes de validar colisiones.
- Adoptar `src/sim/dungeon_layout.ts` y `src/render/dungeon.ts` **como referencia arquitectónica MIT**, no como importación de assets desconocidos. KayKit Dungeon Remastered/Halloween Bits de origen CC0 verificado, Quaternius/Kenney CC0 para decoración y criaturas.

### P18.5 — LIVING VILLAGE
Agenda con transición real a trabajo, mercado, taberna y casa; navegación/puertas y colisión. Interacciones y tiendas. Se prioriza una ciudad funcional sobre varias ciudades vacías.

## Licencias (BLOQUEO DE PUBLICACIÓN)
El [`LICENSE`](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/LICENSE) de ClaudeCraft cubre el **código MIT**, no imágenes, sonidos ni modelos. [`CREDITS.md`](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/CREDITS.md) diferencia CC0 reutilizable (KayKit, Quaternius, Kenney) de `With the project only`, licencias comerciales CraftPix y arte por encargo. Política HIGHFLY: **solo MIT/CC0 con archivos verificables o propios con derechos claros**. No usar `With the project only`, archivos sin registro, assets comerciales, marcas de tercero ni sonidos NC. Atribuir el código MIT adaptado y conservar avisos de copyright.

**Estado de esta auditoría:** es análisis y plan; no hay nuevas especies, equipo o mazmorras integradas en P18.2.1. La corrección del marcador sí está implementada y será publicable tras CI. El presupuesto de GPU/FPS del Samsung S23 Ultra requiere benchmark real por cada ampliación.

## Links principales
- Código HIGHFLY vigente: https://github.com/drakenhok-star/HIGHFLY-ORIGIN-DEMO/tree/p182-hud-heading-terrestrial-habitat-20261105
- Fuente ClaudeCraft 0.44.7: https://github.com/levy-street/world-of-claudecraft/tree/493c35a108cef6c8aa290e8793107b1cd117886e
- Barrera legal CREDITS: https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107bcd117886e/CREDITS.md
