# HIGHFLY P17/P18 — Alcance definitivo y catálogo de reutilización ClaudeCraft 0.44.7

**Fecha:** 2026-11-05. **Base jugable:** HIGHFLY P16.3 (sin editar). **Expansión:** rama `p18-living-village-world-foundation-20261105` (aún no publicada). **Laboratorio de skills:** `HIGHFLY-FURY-SKILL-LAB` (otra rama/repositorio, NO mezclar).
**Donante auditado:** [World of ClaudeCraft v0.44.7, commit 493c35a](https://github.com/levy-street/world-of-claudecraft/tree/493c35a108cef6c8aa290e8793107b1cd117886e). Toda importación debe referirse a este commit exacto, con aviso de derechos.

## Aclaración de fases
- **P17:** contrato independiente de progresión **RPG ↔ entrenamiento** (STR, AGI, VIT, PER, INT, niveles, equipo solo atributos, evaluaciones fitness verificadas, reputación). No es un Living World ejecutable ni autoriza recompensas reales desde UI de entrenamiento.
- **P18:** **LIVING WORLD + ECOSISTEMA RPG**: nuevas criaturas, fauna, grupos hostiles, IA, NPC con rutinas, territorios, regiones seguras y peligrosas, interacción, botín, misiones enlazadas y primera mazmorra. Es expansión del juego existente, no reemplazo de sistemas HIGHFLY.
- **P19:** amplificación del loot/economía, sets/equipo y profesiones sobre P18.
- **P20:** ciudades/biomas adicionales, transiciones y mundo más extenso cuando el rendimiento esté validado.

## Qué HIGHFLY ya tiene (reutilizar primero)
| Sistema propio | Estado en P16.3 | Política |
|---|---|---|
| Player, melee hit-confirm, joystick, dash, habilidades | Jugable | **No reescribir ni tocar desde P18** |
| Terrain 200m/chunks + budget, grass LOD, DPR | Jugable en P16.3 | **No regenerar/eliminar para crear zonas** |
| 3 NPC: Olaf, Sigrid, Bjorn | Reales, diálogos, un NPC deambulante y forja | Mejorar rutinas / diálogo y más adelante añadir más |
| Monstruos: lobos (normales/helados), draugr guerrero y mago, dragón | Modelos/combate/respawn ya integrados | Mantener, complementar variedad progresivamente |
| Misiones: lobos, espada, dragón | Entrega, XP y oro conectados | Extender con eventos, no reemplazar la lógica |
| Interiors: taberna, casa de Olaf, herrería, cripta | Entradas y salidas existentes | Reusar como primera ruta de dungeon |
| Save: highfly_p16_save | Estado personaje, misiones, cofres, dragón | P18 usa nuevo namespace + importación validada, nunca sobrescribir P16 |

## Componentes concretos de ClaudeCraft 0.44.7 a reutilizar **como código MIT, mediante adaptadores**

El origen de cada módulo es `https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/<ruta>`.

| Prioridad | Donante exacto | Qué aporta | Integración HIGHFLY |
|---|---|---|---|
| 1 | `src/sim/pathfind.ts` | A* local de grilla, obstáculos, agua, pendiente | Adaptar a colliders de `structures`, `scatter.obstacles`, `terrain.getHeight`; rutas NPC/mobs sin pasar paredes |
| 1 | `src/sim/mob/dungeon_pack_aggro.ts` | Agresión grupal acotada por ID de pack/instancia | Packs de lobos/draugr; no arrastrar mobs de otras zonas |
| 1 | `src/sim/respawn_policy.ts` | Política pura de respawn y economía | Zonas/packs con cooldown; conservar valores actuales hasta balancear |
| 1 | `src/sim/loot/weighted_loot_group.ts` | Particiones de botín ponderado, probabilidades | Tablas HIGHFLY; no duplicar XP ni recompensas |
| 1 | `src/sim/quests/quest_credit.ts` | Eventos de progreso matar/recolectar/entregar | Adaptador hacia `quests.js` sin doble crédito |
| 2 | `src/sim/quest_npc_interaction.ts` | Conversar con NPC como evento de misión | Adaptar a diálogos USAR con Olaf/Sigrid/Bjorn |
| 2 | `src/sim/content/delves/mobs.ts` | Esquema de mobs de mazmorra, ataques, estados, loot | Reutilizar estructura y balance como referencia; NO arrastrar modelos |
| 2 | `src/sim/content/rift/mobs.ts` | Criaturas por familias, escalado/dificultad/mecánicas de jefes | Catálogo de comportamientos; requerir GLB CC0 propio |
| 2 | `src/sim/content/dungeons.ts` | Templates de dungeon, grupos, jefes y botines | Adaptadores en cripta actual antes de nuevos portales |
| 2 | `src/sim/mob/quest_gated_aggro.ts` | Bloquear aggro de NPC/objetivos condicionados a misión | Evitar agro injusto si una misión no está activa |
| 3 | `src/render/zone_streaming.ts` | Priorizar/precargar regiones por proximidad/dirección | Inspiración para streaming sobre `Terrain` P16.3; no copiar compositor de ClaudeCraft |
| 3 | `src/sim/data.ts` | Registro/merge de contenido por zonas, mobs, NPC y misiones | Separar definiciones HIGHFLY por bioma, conservando la escena actual |

**Estado de la auditoría:** existencia del archivo y responsabilidad principal VERIFICADAS por lectura de fuentes upstream. **Compatibilidad de dependencias y tests dentro de HIGHFLY pendientes**; código TypeScript upstream no se puede volcar tal cual en un proyecto JS distinto. Ningún archivo ClaudeCraft se ha copiado al runtime P18 en este paquete.

## Objetivo concreto del primer ecosistema jugable
1. Reusar lobos, draugr y dragón existentes con reglas de manada/territorio, alertas, perseguir/retornar, horario y respawn por zona; no romper el combate de P16.
2. Añadir nuevas familias *visuales* cuando sus GLB/animaciones estén confirmados CC0, compatibles con la escala low-poly KayKit. Orden de candidatos: jabalí, ciervo, araña/goblin, bandido/esqueleto especial y criaturas de cripta. **No afirmar presencia real hasta importación y prueba.**
3. Poblado con NPC reales que recorren vías transitables, saludan, trabajan, descansan y asignan misiones. Durante combate y diálogo, prioridad de jugador/colisiones.
4. Todo lo lejano se gestiona como estado barato, no como cientos de rigs activos. Sin jank ni MS/P95 incontrolados.
5. Circuito end-to-end: hablar → misión → zona de monstruos → comportamiento/agresión → matar/recolectar → drop → inventario → retorno → entrega → reputación → guardado.

## Restricciones de licencia (BLOQUEANTES para publicar)
El upstream [README](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/README.md) separa **código fuente MIT** de **medios con licencia individual**. [CREDITS.md](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/CREDITS.md) es el registro de licencias por recurso y dice que un asset ausente del registro **NO** es automáticamente libre.

**Política HIGHFLY MÁS restrictiva:** solo modelos/sfx/imágenes MIT o CC0 verificados, o creaciones propias con derechos claros; excluir CraftPix, commissioned art, Creative Commons NC, third-party trademarks, y los marcados `With the project only` aunque el upstream permita mantenerlos dentro de un fork de World of ClaudeCraft. No usar el nombre/logos de ClaudeCraft en el juego propio. Incluir licencia/atribución MIT de código derivado en PROVENANCE / THIRD_PARTY_NOTICES al incorporar módulos de manera material. Source privado KayKit Complete comprado no se sube en Pages.

## Fases internas dentro de P18
- **W0 (iniciado):** catálogo de zonas + guardado puro + horarios de los 3 NPC + P17 contratos reutilizados + auditoría donante.
- **W1:** motor de ecología: las manadas existentes obedecen zonas y prioridades; sin bots lejanos activados.
- **W2:** la aldea cobra vida: navegación por rutas/colliders, trabajo/dialogo/descanso.
- **W3:** primer grupo nuevo de criaturas con GLB verificados + loot ponderado + misión y drop auténticos.
- **W4:** cripta y portal existentes como dungeon real, con grupos, jefe, entrada/salida y guardado.
- **W5:** nuevas zonas y profesiones (árbol→madera, minería, pesca) usando un sistema universal de nodos de recursos, con controles de rendimiento.

**Puerta de publicación:** medir S23 Ultra 40–60 FPS objetivo inicial, P95/P99, número máximo de rigs, draw calls, enemigos vivos, distancia y memoria. Nunca hacer merge a P16.3 ni publicar sobre su URL sin regresiones aprobadas y nueva ruta `/p18/` en la misma Pages.
