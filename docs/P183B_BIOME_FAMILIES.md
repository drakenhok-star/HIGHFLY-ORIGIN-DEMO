# HIGHFLY P18.3b — Distribución por familias / REUSE FIRST

Las criaturas tienen **territorios independientes**; las misiones sólo escuchan kills. La ciudad inicial sigue siendo segura y las manadas anteriores no cambian. Las coordenadas objetivo son propuestas; `resolveBiomeCampP183b` busca suelo realmente practicable, la nieve requiere cota >54 y los cangrejos sólo admiten costa seca con agua a menos de 8m. Si no existe costa válida, NO aparecen cangrejos en tierra por sustitución.

| Bioma | Criaturas y familias |
|---|---|
| Pradera | 2 manadas de jabalí (modelo Gobkit Boar CC0), 1 ciervo pacífico, lobos existentes |
| Bosque | 2 goblins, arañas CC0 P183, 1 zorro que huye, 2 lobos forestales |
| Nieve | 1 yeti, 1 lobo alfa de nieve y lobos helados existentes |
| Costa | Hasta 2 cangrejos de Quaternius (CC0) sólo en orillas válidas |
| Camino | 2 bandidos con rig KayKit CC0 existente, huida y alarma |
| Ruinas | 1 orco, draugr existentes |

## Proveniencia y licencias
- Araña `spider.glb`, cangrejo `crabenemy.glb`, goblin `goblin.glb`, orco `orc.glb`, ciervo `stag.glb`, zorro `fox.glb` y yeti `yeti.glb`: World of ClaudeCraft 0.44.7, commit 493c35a. Sus familias en la fuente son Quaternius CC0; cangrejo ver además https://poly.pizza/m/Gs3yfsV5lB CC0 individual.
- Bandido: KayKit `npc_villager_rogue.glb` ya integrado, CC0. Los lobos forestales/nivales usan `wolf_quaternius.glb` CC0 ya presente.
- **Jabalí original de ClaudeCraft no se utiliza**: `wild_boar.glb` carece de licencia individual registrada. En su lugar descargar sólo **Gobkit Boar** CC0 original https://gobkit.com/freebies/animalB/Boar.glb declarado en https://gobkit.com/api/free / paquete Animal Pack B y verificar el archivo y animaciones en CI. El binario de Gobkit se prepara dentro de CI para la demo, sin reemplazos falsos.
- Soporte KTX2/Basis: Three.js r165 MIT y Basis Universal Apache-2.0 con notices de los proyectos originales. Sin audio CC BY-NC, CraftPix, proyectos comerciales ni SOURCE privado.

## Verificación
- `?hf_biome_tour=1` activa selector QA de teletransporte por bioma para probar encuentros reales en Android.
- Respetar presupuestos de enemigos, respawn independiente y la barrera de equipamiento: los materiales sólo alteran inventario/equipamiento, no `STR/AGI/VIT/PER/INT`.
- Demo independiente /p183b/ sólo después de CI + release workflow; /p1821/ queda intacto.
