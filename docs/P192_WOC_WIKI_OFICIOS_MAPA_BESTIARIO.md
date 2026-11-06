# HIGHFLY P192 — Lectura exhaustiva de la wiki de World of ClaudeCraft y adaptación al Mundo Inicial

**Fecha:** 6 de noviembre de 2026. **Fuente reproducible:** `levy-street/world-of-claudecraft` commit `493c35a108cef6c8aa290e8793107b1cd117886e` (0.44.7 auditada), archivo `src/guide/content.generated.ts` generado por `scripts/wiki/build_content.mjs`. La wiki web `/wiki` requiere JavaScript; por ello se extrajo **el mismo contenido generado por el juego**, sin inferir lo que una página inaccesible podría decir. Los recuentos generales también coinciden con el archivo generado de la rama principal al 06/11/2026.

**Alcance exacto:** 15 profesiones (5 recolección + 10 fabricación), **209 recetas de fabricación** documentadas, 15 zonas, 6 entradas de mazmorras/incursión, 78 criaturas de superficie agrupadas en 12 familias. Importante: encantamiento tiene además un catálogo independiente de fórmulas/reciclado que no se cuenta entre las 3 recetas comunes de su página; el bestiario de superficie excluye jefes de instancias.

**Licencias:** `LICENSE` (MIT) cubre código y la documentación de ese código; `CREDITS.md` manda sobre arte, audio, tipografías y demás multimedia. NO importar automáticamente GLB, texturas, iconos ni audios de la wiki. Solo MIT/CC0 u otros derechos explícitamente permitidos en la política HIGHFLY. En el índice JSON de esta revisión no hay medios binarios.

## Profesión por profesión, con la wiki, sus reglas y nuestra implementación

### Ingeniería (`engineering`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/engineering)

**Original:** tope 125 de competencia, **20 recetas**, estación toolworks; Tinker Gizzel (Eastbrook). Ejemplos verificables:

- Bronze Hoe (`recipe_bronze_hoe`), requisito 0, adquisición trainer; insumos 4×Fine Vale Wheat, 1×Garden Hoe.
- Cogwheel Blank (`recipe_cogwheel_blank`), requisito 0, adquisición trainer; insumos 4×Copper Ore, 2×Smithing Flux.

**Destino HIGHFLY:** **Villa del Aserradero**. **Estado P192:** Maestro y encargo P192; herramientas, taller y recetas interactivas pendientes. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Alquimia (`alchemy`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/alchemy)

**Original:** tope 125 de competencia, **20 recetas**, estación apothecary; Alchemist Verane (Highwatch). Ejemplos verificables:

- Minor Healing Potion (`recipe_minor_healing_potion`), requisito 0, adquisición known; insumos 1×Linen Scrap, 1×Twitching Spider Leg, 2×Sheenleaf Herb.
- Sheenleaf Healing Draught (`recipe_silverleaf_healing_draught`), requisito 0, adquisición trainer; insumos 4×Sheenleaf Herb, 1×Glass Vial.
- Sheenleaf Mana Draught (`recipe_silverleaf_mana_draught`), requisito 0, adquisición trainer; insumos 3×Sheenleaf Herb, 1×Glass Vial.

**Destino HIGHFLY:** **Aldea de los Herbolarios**. **Estado P192:** Maestro y encargo P192; mesa de alquimia, pociones y consumibles pendientes. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Cocina (`cooking`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/cooking)

**Original:** tope 125 de competencia, **33 recetas**, estación kitchens; Cook Marlow (Eastbrook). Ejemplos verificables:

- Salted Jerky (`recipe_tough_jerky`), requisito 0, adquisición known; insumos 1×Twitching Spider Leg.
- Pan-Seared River Perch (`recipe_pan_seared_perch`), requisito 0, adquisición trainer; insumos 2×Raw River Perch, 1×Cooking Salt.
- Hunter's Game Skewer (`recipe_hunters_game_skewer`), requisito 0, adquisición trainer; insumos 2×Game Meat, 1×Vale Wheat, 1×Cooking Salt.

**Destino HIGHFLY:** **Villa de los Pescadores**. **Estado P192:** Maestro y encargo P192; cocina y platos preparados pendientes. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Peletería (`leatherworking`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/leatherworking)

**Original:** tope 125 de competencia, **36 recetas**, estación tannery; Tanner Hesk (Fenbridge). Ejemplos verificables:

- Tanned Leather Jerkin (`recipe_tanned_leather_jerkin`), requisito 0, adquisición known; insumos 4×Rough Hide, 2×Twitching Spider Leg, 5×Spool of Thread.
- Eastbrook Druid's Hide (`recipe_eastbrook_druids_hide`), requisito 0, adquisición known; insumos 5×Rough Hide, 2×Twitching Spider Leg, 5×Spool of Thread.
- Fenbridge Hide Leggings (`recipe_fenbridge_hide_leggings`), requisito 0, adquisición trainer; insumos 3×Rough Hide, 2×Twitching Spider Leg, 1×Tanning Agent.

**Destino HIGHFLY:** **Barrio de Artesanos**. **Estado P192:** Maestro y encargo P192; fabricación P192 de guantes con loot existente. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Sastrería (`tailoring`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/tailoring)

**Original:** tope 125 de competencia, **28 recetas**, estación loom; Weaver Ottilie (Eastbrook). Ejemplos verificables:

- Eastbrook Wool Trousers (`recipe_eastbrook_wool_trousers`), requisito 0, adquisición known; insumos 3×Homespun Cloth, 9×Spool of Thread.
- Eastbrook Ritual Vestments (`recipe_eastbrook_ritual_vestments`), requisito 0, adquisición known; insumos 3×Linen Scrap, 1×Twitching Spider Leg, 3×Homespun Cloth, 5×Spool of Thread.
- Homespun Hood (`recipe_homespun_hood`), requisito 0, adquisición trainer; insumos 4×Homespun Cloth, 2×Linen Scrap, 1×Spool of Thread.

**Destino HIGHFLY:** **Barrio de Artesanos**. **Estado P192:** Maestro y encargo P192; fabricación P192 de pantalones y botas. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Inscripción (`inscription`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/inscription)

**Original:** tope 125 de competencia, **9 recetas**, estación apothecary; Alchemist Verane (Highwatch). Ejemplos verificables:

- Sheenleaf Primer (`recipe_silverleaf_primer`), requisito 0, adquisición trainer; insumos 3×Sheenleaf Herb, 2×Chime Dust, 1×Glass Vial.
- Sheenleaf Scroll (`recipe_silverleaf_scroll`), requisito 0, adquisición trainer; insumos 2×Sheenleaf Herb, 1×Chime Dust, 1×Glass Vial.

**Destino HIGHFLY:** **Barrio de Estudios**. **Estado P192:** Maestro y encargo P192; pergaminos y consumibles pendientes. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Encantamiento (`enchanting`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/enchanting)

**Original:** tope 125 de competencia, **3 recetas**, estación según la operación/receta; sin maestro único explícito en esta ficha (las fórmulas y estaciones se consultan por separado). Ejemplos verificables:


**Destino HIGHFLY:** **Barrio de Estudios**. **Estado P192:** Maestro y encargo P192; transferencia de encantamientos pendiente. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Joyería (`jewelcrafting`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/jewelcrafting)

**Original:** tope 125 de competencia, **13 recetas**, estación forge; Forgemistress Darva (Eastbrook). Ejemplos verificables:

- Hammered Copper Band (`recipe_hammered_copper_band`), requisito 0, adquisición trainer; insumos 4×Copper Ore, 2×Chime Dust, 1×Smithing Flux.
- Polished Copper Loop (`recipe_polished_copper_loop`), requisito 0, adquisición trainer; insumos 4×Copper Ore, 3×Chime Dust, 1×Smithing Flux.
- Coiled Copper Torc (`recipe_coiled_copper_torc`), requisito 0, adquisición trainer; insumos 5×Copper Ore, 2×Chime Dust, 1×Smithing Flux.

**Destino HIGHFLY:** **Barrio de Artesanos**. **Estado P192:** Maestro y encargo P192; P192 incluye colgantes y anillos. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Fabricación de armas (`weaponcrafting`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/weaponcrafting)

**Original:** tope 125 de competencia, **18 recetas**, estación forge; Forgemistress Darva (Eastbrook). Ejemplos verificables:

- Eastbrook Arming Sword (`recipe_eastbrook_arming_sword`), requisito 0, adquisición known; insumos 2×Cracked Wolf Fang, 4×Bone Fragments, 6×Smithing Flux.
- Copper Bearded Axe (`recipe_copper_bearded_axe`), requisito 0, adquisición trainer; insumos 4×Copper Ore, 2×Ironbark Log, 1×Smithing Flux.
- Copper Flanged Mace (`recipe_copper_flanged_mace`), requisito 0, adquisición trainer; insumos 3×Copper Ore, 2×Bone Fragments, 1×Smithing Flux.

**Destino HIGHFLY:** **Pueblo de los Inicios (Sigrid)**. **Estado P192:** Sigrid real y receta P191 de espada; ampliar variedad de armas. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Fabricación de armaduras (`armorcrafting`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/armorcrafting)

**Original:** tope 125 de competencia, **29 recetas**, estación forge; Forgemistress Darva (Eastbrook). Ejemplos verificables:

- Eastbrook Chainmail Vest (`recipe_eastbrook_chain_vest`), requisito 0, adquisición known; insumos 4×Copper Ore, 9×Smithing Flux.
- Eastbrook Warded Leggings (`recipe_eastbrook_warded_leggings`), requisito 0, adquisición known; insumos 3×Bone Fragments, 4×Copper Ore, 4×Smithing Flux.
- Riveted Copper Girdle (`recipe_riveted_copper_girdle`), requisito 0, adquisición trainer; insumos 4×Copper Ore, 2×Bone Fragments, 1×Smithing Flux.

**Destino HIGHFLY:** **Pueblo de los Inicios (Sigrid)**. **Estado P192:** Sigrid real, P191 coraza y P192 capucha/hombreras. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Minería (`mining`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/mining)

**Original:** tope 100 de competencia. Copper Mining Pick (herramienta T1), Iron Mining Pick (herramienta T2; requisito 40), Skysilver Mining Pick (herramienta T3; requisito 70). Nodos de mundo con herramienta mínima, tiempo de recolección, regeneración y progreso del oficio.

**Destino HIGHFLY:** **Poblado Minero**. **Estado P192:** Maestro y misión P192; todavía no hay nodos explotables/picos por tier. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Tala (`logging`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/logging)

**Original:** tope 100 de competencia. Handaxe (herramienta T1), Felling Axe (herramienta T2; requisito 40), Ironbark Axe (herramienta T3; requisito 70). Nodos de mundo con herramienta mínima, tiempo de recolección, regeneración y progreso del oficio.

**Destino HIGHFLY:** **Villa del Aserradero**. **Estado P192:** Maestro y misión P192; todavía no hay tala/árboles recolectables. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Herboristería (`herbalism`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/herbalism)

**Original:** tope 100 de competencia. Gathering Sickle (herramienta T1), Bronze Sickle (herramienta T2; requisito 40), Sheenleaf Sickle (herramienta T3; requisito 70). Nodos de mundo con herramienta mínima, tiempo de recolección, regeneración y progreso del oficio.

**Destino HIGHFLY:** **Aldea de los Herbolarios**. **Estado P192:** Maestro y misión P192; todavía no hay herbarios recolectables. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Pesca (`fishing`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/fishing)

**Original:** tope 200 de competencia. Simple Fishing Pole (herramienta T1), Ironreel Fishing Rod (herramienta T2), Silverstream Fishing Rod (herramienta T3). Pesca: intervalo de picada y recogida, tablas de captura por zona/habilidad, pesca poco común; no basta un botón de obtener pez.

**Destino HIGHFLY:** **Villa de los Pescadores**. **Estado P192:** Maestro y misión P192; minijuego pesca y banco de peces pendiente. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

### Agricultura (`farming`) · [Página oficial](https://worldofclaudecraft.com/wiki/professions/farming)

**Original:** tope 100 de competencia. Garden Hoe (herramienta T1), Bronze Hoe (herramienta T2; requisito 25), Skysilver Hoe (herramienta T3; requisito 50). Agricultura: parcelas, semillas, siembra, crecimiento por tiempo real, cosecha, azadas; no utiliza nodos genéricos como minería.

**Destino HIGHFLY:** **Pueblo de las Granjas**. **Estado P192:** Maestro y misión P192; parcelas sembrables y crecimiento persistente pendientes. Las recetas/maestros de esta rama son adaptaciones propias donde no coinciden insumos del original; no se etiquetan como receta literal de WOC.

## Síntesis del diseño de oficios 2.0

- **Progresión:** diez oficios creadores giran en un anillo de parejas; 5 recolectores abastecen talleres. La especialización/arquetipo habilita calidad, no convierte estos oficios en clases de combate. Competencia profesional distinta del nivel del personaje y de stats base (STR/AGI/VIT/PER/INT).
- **Receta auténtica:** nombre, origen (inicial, maestro, drop o misión), ingredientes, cantidad disponible, costo, estación, nivel de oficio, resultado, calidad. La P192 confirma de a una unidad. Más adelante soportar cantidad y un tiempo de fabricación cancelable sin gasto previo.
- **Bucle horizontal:** minería → herrería/joyería/ingeniería; tala → madera/herramientas; herboristería → alquimia/inscripción; pesca → cocina; cultivos → cocina/alquimia; despiece de criaturas → peletería/sastrería; desguace mágico → encantamiento.
- **Riesgo y mérito:** no se concede profesión por entrar en el pueblo; maestro real cerca, misión de introducción, herramienta/estación y materiales de juego. No colocar NPCs en agua, acantilados, edificios o campamentos hostiles.
- **Economía:** fuentes de oro por misiones/drop, sumideros por fabricación y enseñanza, pedidos de trabajo de NPC; comercio entre jugadores solo si HIGHFLY evoluciona a multijugador. No copiar números de tarifas de WOC sin adaptar economía HIGHFLY.
- **Maestría:** piezas firmadas, masterwork y recetas combinadas son avances posteriores; una receta básica existente no debe transformarse automáticamente en rareza legendaria.

## Zonas y biomas: guía, no copia literal

| Región original WOC | Niveles de wiki | Hub original | Aplicación HIGHFLY |
|---|---:|---|---|
| Eastbrook Vale | 1–7 | Eastbrook | Mundo Inicial, pueblo principal + poblados satélite |
| Mirefen Marsh | 6–13 | Fenbridge | Zona pantanosa/fronteriza y cueva inundada futura |
| Thornpeak Heights | 13–20 | Highwatch | Montañas y nieve con progresión vertical |
| The Veiled Hollow | 15–20 | Eldershine | Futuro bioma no incorporado |
| The Drakelands | 16–20 | Wyrmwatch | Reino de lava |
| The Frostveil Reach | 17–20 | Icemantle | Reino nevado |
| The Amberfall | 18–20 | Lanternmere | Futuro bioma no incorporado |
| The Willowfen | 19–20 | Bridgemere | Futuro bioma no incorporado |
| The Nightbloom | 20–20 | Moonrest | Reino del Abismo/fantasmas |
| The Wraithwood | 20–20 | Gibbetmere | Reino del Abismo/fantasmas |
| The Palmreach | 20–20 | Drifthaven | Futuro bioma no incorporado |
| The Evergarden | 20–20 | Hedgewick | Futuro bioma no incorporado |
| The Galecrest | 20–20 | Wickharbor | Futuro bioma no incorporado |
| The Farshore | 3–7 | Gullhaven | Isla costera y barcos |
| The Proving Shore | 1–2 | Dawnrest Camp | Tutorial opcional |

## Mazmorras reales de la wiki — referencia para diseñar las nuestras

- **The Hollow Crypt** (`hollow_crypt`, niveles 7–10, mazmorra). Adaptar como mazmorra propia con puerta, arquitectura, encuentros y botín; la P192 NO implementa el mapa/los jefes originales.
- **The Sunken Bastion** (`sunken_bastion`, niveles 12–13, mazmorra). Adaptar como mazmorra propia con puerta, arquitectura, encuentros y botín; la P192 NO implementa el mapa/los jefes originales.
- **The Drowned Temple** (`drowned_temple`, niveles 16–18, mazmorra). Adaptar como mazmorra propia con puerta, arquitectura, encuentros y botín; la P192 NO implementa el mapa/los jefes originales.
- **Gravewyrm Sanctum** (`gravewyrm_sanctum`, niveles 19–20, mazmorra). Adaptar como mazmorra propia con puerta, arquitectura, encuentros y botín; la P192 NO implementa el mapa/los jefes originales.
- **The Wildheart Basin** (`wildheart_basin`, niveles 20–20, mazmorra). Adaptar como mazmorra propia con puerta, arquitectura, encuentros y botín; la P192 NO implementa el mapa/los jefes originales.
- **raid** (`raid`, niveles 20–20, incursión). Adaptar como mazmorra propia con puerta, arquitectura, encuentros y botín; la P192 NO implementa el mapa/los jefes originales.

**Primer objetivo de mazmorra:** cripta P185 ampliada (existente) e interior nuevo bajo el Poblado Minero (pendiente de desarrollo real). No anunciar como completado por tener un marcador en el mapa.

## Bestiario original (solo fauna/criaturas de superficie)

- beast: **21** entradas; ej. Forest Wolf, Shore Scuttler, Wild Boar.
- spider: **5** entradas; ej. Sableweb Lurker, Mirefen Widow, Broodmother Egg.
- mudfin: **5** entradas; ej. Mudfin Skulker, Deepfen Snapper, Glimmermere Wader.
- burrower: **12** entradas; ej. Breach Wretch, Deeprock Digger, Deeprock Tunneler.
- humanoid: **7** entradas; ej. Vale Bandit, Gravecaller Cultist, Gravecaller Mender.
- troll: **3** entradas; ej. Mirefen Troll, Grubjaw the Glutton, Dune Troll.
- ogre: **1** entradas; ej. Thornpeak Ogre.
- undead: **8** entradas; ej. Restless Bones, Drowned Dead, Drowned Votary.
- elemental: **11** entradas; ej. Duskwisp, Glimmerwisp, Ice Wisp.
- dragonkin: **3** entradas; ej. Sethrael the Palecoil, Dragonkin Broodguard, Dragonkin Egg.
- demon: **1** entradas; ej. Riftspawn.
- reptile: **1** entradas; ej. Gloam Strider.

Las **78** entradas incluyen fauna, humanoides y criaturas. Eso no significa que HIGHFLY tenga 78 GLB redistribuibles. Cada criatura debe tener **modelo, animaciones y licencia** compatibles KayKit/MIT/CC0, estado IA, territorio, nivel, materiales y loot auditados. Jefes de las mazmorras se auditan aparte.

## Diferencias concretas frente a HIGHFLY P191

| Subsistema | P191 publicado | P192 rama de integración | Pendiente para equivalencia funcional |
|---|---|---|---|
| Pueblos | Aldea principal y Sigrid | Siete emplazamientos validables, casas reutilizadas y 13 maestros con modelo existente | Verificar 7/7 emplazamientos y NPCs reales en Chrome/S23 |
| Oficios | 15 entradas declaradas, 2 entrenables en Sigrid | Introducciones ligadas a maestros/localidades y misiones | Recolección activa, recetas completas, estaciones y progresión 0–125/200 |
| Forja | Tocar receta fabrica instantáneamente | Vista previa, materiales y FORJAR 1 explícito | Cantidad opcional, duración, colas y maestría |
| Equipo | Arma, escudo, armadura | 7 nuevas ranuras equipables (cabeza, cuello, hombros, guantes, piernas, botas, anillos) | Modelos 3D CC0, variedad por bioma y afijos balanceados |
| Mapa | W0 + planes de mundos | Usar ubicación verificada real; no añadir placeholders | Caminos, estación por pueblo, interiores, ríos y costas |
| Monstruos | Fauna y loot existentes | 7 misiones que usan drops W0 reales | Más enemigos con loops por bioma y botín apto para nuevos oficios |
| Dungeons | Cripta existente | Diseño de ubicación minera | Mazmorra con malla, enemigos, jefe, recompensas y guardado |

## Secuencia de trabajo recomendada (no confundir diseño con funcionalidad)

1. **P192 cierre:** validar los siete poblados en el juego, forja segura, NPC + quests + guardado, registro de mensajes, HUD intacto.
2. **P193 recolectores reales:** 5 herramientas, nodos mineros/madereros/herbarios, pesca con ventana de reacción, sembrar → crecer → cosechar persistente. Las misiones deben exigir la actividad, no solo entregar loot ajeno.
3. **P194 taller completo:** diez profesiones fabricadoras, estaciones genuinas por poblado, materias de recolección, recetas de mundo y animaciones, filtros por disponible/no disponible.
4. **P195 misiones/mazmorras/loot:** ampliar historias según región, interiores reales, jefes, recompensas y progresión narrativa 1–20.
5. **Optimización:** ciudades y NPCs por cercanía/radio, collision/path checks, presupuesto de draw calls y prueba física en S23 Ultra.

## Reproducibilidad, fuentes y protección legal

- Wiki base: https://worldofclaudecraft.com/wiki
- Profesiones: https://worldofclaudecraft.com/wiki/professions
- Bestiario: https://worldofclaudecraft.com/wiki/bestiary
- Mundo: https://worldofclaudecraft.com/wiki/world
- Combate: https://worldofclaudecraft.com/wiki/reference/combat
- Datos originales: https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/guide/content.generated.ts
- Inventario de recetas: https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/sim/content/recipes.ts
- Reglas profesionales: https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/sim/content/professions.ts
- Licencias: https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/LICENSE y CREDITS.md
- Índice generado HIGHFLY: [WOC0447_WIKI_CROSSWALK_P192.json](audit/WOC0447_WIKI_CROSSWALK_P192.json)

*Nota de actualización: al 06/11/2026, los conteos de las tablas principales de profesiones/zonas/mazmorras/bestiario coincidían entre el commit auditado y la rama principal. Eso no garantiza identidad de cada balance ni derechos de medios entre versiones.*
