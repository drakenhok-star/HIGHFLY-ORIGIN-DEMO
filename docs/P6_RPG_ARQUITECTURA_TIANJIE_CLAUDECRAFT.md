# HIGHFLY — Auditoría de portabilidad Tianjie5 ↔ World of ClaudeCraft 0.44.7

**Fecha:** 2026-11-04  
**Alcance:** auditoría estática de código/repositorios y revisión visual de grabación Android; no se integró código de ClaudeCraft en el juego. La versión de ClaudeCraft usada como referencia se fija en **`493c35a108cef6c8aa290e8793107b1cd117886e` (0.44.7)** para evitar la deriva de versiones.

## Decisión de arquitectura

1. **Base jugable y renderer:** conservar Tianjie5 Three.js MIT, sus ciclos de mundo, cielo/agua/terreno procedural, interior/cripta, animación base, IA simple, loot, inventario, quests, guardado, y móvil P0–P5.
2. **Mecánicas RPG avanzadas:** estudiar y trasladar **solamente funciones puras, reglas verificadas y estructuras de datos** de ClaudeCraft MIT cuando añadan valor comprobable. No trasplantar su sim/MMO completo ni su servidor Postgres/WebSocket ni ejecutar sus dos motores simultáneamente.
3. **Medios y personajes:** no trasladar automáticamente binarios de `public/` de ClaudeCraft. Para demo pública, solo MIT/CC0 verificados de forma independiente. KayKit SOURCE comprado va **solo al laboratorio privado**.
4. **Un cazador persistente:** la apariencia y el equipamiento deben ser independientes de las habilidades y las estadísticas base; evitar obligar a importar el creador de nueve clases o mantener 9 personajes activos.
5. **Presupuesto Android:** cada efecto VFX debe incluir límite de partículas, geometría compartida, uso de luces, resolución y pruebas de P95/FPS en S23 Ultra horizontal. FLUIDO es la base segura.

## Diferencias verificadas

| Dominio | Tianjie5 + HIGHFLY público | ClaudeCraft 0.44.7 (solo código de referencia) | Acción |
|---|---|---|---|
| Mundo y render | Procedural, agua/día-noche, 15 GLB, Android FLUIDO, minimapa | Mucha más estructura de zonas/render/VFX y sim propia | **Conservar Tianjie5** |
| Recursos | HP/MP/Energía reales + HUD premium | Recursos y reglas específicas por clase | Conservar tres recursos y diseñar `RPGStats` HIGHFLY |
| Combate | Melee único, proyectil fireball, tres shouts y dash simple | Cientos de módulos de acciones, cast, auras, CD, daño, threat, efectos | Adaptar reglas puras por piezas; **NO** copiar `effect_dispatch.ts` completo |
| Inventario | 15 objetos, equipo weapon+armor, loot y crafting básico | Reglas para slots, item level, stack, rareza, recetas, loot y transferencias | Migrar a defs con esquema versionado y tests; preservar guardados |
| Quests y NPC | 3 quests, 3 NPC, eventos de kills/items | Tramas y tablas de contenido elaboradas, misiones por zonas | Adaptar diseños de quest data-driven, no el mundo |
| VFX/FX | Efectos 3D simples; presupuestos FLUIDO | `src/render/ability_vfx/` tiene sistema visual extenso | Recrear efectos optimizados para Android; no cargar sistema entero |
| Personajes | Un bárbaro KayKit con espada y material de armadura | Múltiples rigs/modularidad, clases y sets | Primero selector por rig compatible, luego slots de malla |
| Online | Singleplayer con localStorage | Servidor autoritativo, multiplayer, WS/Postgres | **Excluir de las fases actuales** |

**Riesgo de acoplamiento comprobado:** `src/sim/content/classes.ts` (~300 kB) mezcla reglas y tipos; `src/sim/combat/damage.ts` (~89 kB) depende de contexto amplio; `src/sim/combat/effect_dispatch.ts` (~176 kB) depende de `SimContext` y otras utilidades. Incorporarlos en bloque repetiría los problemas de la antigua migración de ClaudeCraft.

**Candidatos para estudio por fases:** `src/sim/combat/ability_cooldown_groups.ts` (12 líneas, sin imports) para reglas de CD compartidas; `src/sim/rng.ts` (98 líneas, sin imports) como referencia de RNG determinista —si realmente aporta algo, sin reemplazar aleatoriedad de mundo ya estable; `src/sim/item_level_req.ts` y fórmulas de daño/armadura solo después de separar las dependencias. Evitar `src/sim/targeting.ts` entero por dependencias del sim, pero estudiar sus criterios de selección.

## Contrato HIGHFLY propuesto

```text
PlayerController (Tianjie5: input/joystick, camera, movement)
    → CombatController (animaciones, hit detection y skill cast)
       → RPGAbilityDefinition (coste, cooldown, target shape, efecto)
       → RPGCombatResolver (daño, buffs, hit outcomes)
       → EffectsRenderer (solo visual, presupuestado por GPU)
    → RPGEventBus (enemyKilled, lootPicked, itemEquipped, questUpdated)
       → Inventory / Equipment / QuestTracker / SaveMigrations
    → CharacterVisualRegistry (skin, rig, anims, anchor armas)
    → EnemyRegistry (modelId, behavior, zone, drops, xp)
```

El motor gráfico nunca deberá decidir las estadísticas de una skin. Los efectos visuales no conceden daño; solo representan resultados del resolver. El equipamiento puede sumar bonos, pero la apariencia cosmética no modifica stats base.

## Plan por etapas con gates de salida

### P5-B — cámara Android (código propio, ya comenzado)
- Incrementar sensibilidad táctil base de **1.2× a 1.5×** (+25%). Guardar ajuste `hf_camera_sensitivity` local.
- Panel de AJUSTES para cambiarla en tiempo real de **0.8× a 2.4×**.
- Sin alterar joystick, ratón PC, FLUIDO ni sistema RPG.
- Gate: cámara gira más rápido en todos los estados; FPS/P95 no cambian significativamente; puede retornar a 1.2×.

### P6-A — combate accionable, sin añadir modelos
- Validar caminar + atacar, aim de cámara a mundo para proyectiles, cámara anti-clipping.
- Sistema `ActionState` y ventanas de cancelación; dash direccional con colisiones.
- Un combo inicial 1–2–3–4 y una skill real por clase de objetivo: melee, projectile, AoE, buff.
- Gate: lobo/dragón golpeados consistentemente, kill/loot/quests siguen funcionando; Android FLUIDO no pierde desempeño.

### P6-B — efectos y skills
- `AbilityDefinition` declarativo (ID, categoría, coste MP/Energía, rango, CD, condición, animationId, fxId).
- CD compartidos y `RPGCombatResolver` unit testeables.
- FX visuales reutilizables (malla/partículas/instancing), sin luces extra por golpe ni decenas de emisores sin control.
- Gate: habilidades desde S1–S4, cooldown y consumo correctos, objetivos válidos, 30 FPS como objetivo con cámara/carga comparables.

### P7 — inventario/loot/quests ampliados
- Items con rareza, slot, stats, modelo opcional, cantidad, costo, límites y drops data-driven.
- Guardado versionado compatible con la partida de Tianjie5.
- Quests con objetivos kill/collect/interact/visit y notificaciones nativas.
- Gate: matar lobo → obtener material → inventario → NPC quest → recompensa → equipar → guardar/reabrir.

### P8 — personajes y monstruos
- Selector de **2 skins CC0 inicialmente**, con rig/animaciones/arma equipable validados. A futuro importar KayKit SOURCE solo en privado.
- Registro de enemigos + 1 monstruo nuevo CC0 con drop/XP/aggro.
- Gate: elegir skin, atacar/correr/morir/volver, equipar arma, guardar y persistir.
- No añadir 100 criaturas simultáneamente: presupuesto por zona/batch.

### P9 — editor y expansión
- Editor de POI/objetos/colisiones y persistencia por mapa con seed; luego biomas, ciudades, mazmorras y portales.
- Gate: nueva localidad reproducible sin romper mapa procedural ni bajar FPS.

## Legal exacto

Referencia ClaudeCraft: https://github.com/levy-street/world-of-claudecraft/tree/493c35a108cef6c8aa290e8793107b1cd117886e

- `LICENSE`: código fuente MIT, copyright © 2026 **Levy Street**. Si se copia/adapta código sustancial, conservar esa licencia y el aviso de copyright junto al MIT de Tianjie5 (© 2026 zexadev).
- `CREDITS.md`: **NO** asimilar media a MIT. Se distinguen `Yes`, `Yes, attribution required`, `With the project only`, `Non-commercial only`, `No, permission required`. Aunque el proyecto haga algunas excepciones para forks, la política HIGHFLY es **descartar material with-the-project-only, no-commercial, no-redistribution y no catalogado**.
- No exportar logos, nombres/marcas, CraftPix, @jamiecypher NC, commissioned art, escenas/materiales propietarios ni GLB sin procedencia verificada.
- Reaprovechar MIT de reglas, código propio original y packs independientes CC0 compatibles.

## Evidencia de partida Android

Vídeo aportado el 2026-11-04 (~146 s): HUD táctil y bolsa abiertos, 2 peleas contra lobos, recogida de loot, agua/costa, valores visibles FLUIDO alrededor de 29–36 FPS. Es observación visual, **no prueba automatizada de FPS**. P95 sigue variando: mantener benchmark comparable.

**No se incorporó código fuente de ClaudeCraft al juego en esta auditoría; solo se auditaron rutas y licencias.**
