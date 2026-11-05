# HIGHFLY L22 — AUDITORÍA VFX / MOVIMIENTO / TARGET AÉREO

**Fecha:** 2026-11-05. **Sin cambios en `main` ni en HIGHFLY P16.**
Base examinada: L21 (`p21-fury-skills-full-training-pages-20261105`), repositorio fuente `HIGHFLY-ORIGIN-DEMO`, árbol original de World of ClaudeCraft 0.44.7 commit `493c35a108cef6c8aa290e8793107b1cd117886e`, y documentos históricos *HIGHFLY Combat Reboot Biblia de Skills* (2026-09-23) y *Master Build Bible v1.4* (2026-09-24).

## Escala de verificación — NO mezclar
- **ACTIVO / verificado código**: archivo inspeccionado en el repo de ejecución L21/L22.
- **ORIGEN LEGAL VERIFICADO**: licencia expresa del proveedor para el recurso concreto, utilizable en un videojuego independiente.
- **HISTÓRICO INVENTARIADO**: informe anterior señala que existía; no confirma sus bytes, versión o licencia en el repositorio L22.
- **CUARENTENA**: prohibido copiar/republicar hasta verificar licencia individual o sustituir por obra propia/CC0.

## 1. Catálogo de recursos visuales — resultado
| Familia | Ubicación/origen | Inventario concreto | Licencia | Veredicto para L22 |
|---|---|---|---|---|
| THREE procedural actual | `src/skillslab/lab-vfx.js` | `ring`, `arc`, `sparks`, `launch`, `slash`, `vortex`, `crown`, `energyBolt`, `meteorWarning`, `fallingMeteor`, `meteorImpact`, `frostNova`, `backstab`; nuevo `tornado` | HIGHFLY propio | ACTIVO, requiere dirección visual premium y optimización |
| Apuntado terreno/aire | `src/skillslab/aim-guide-p16.js`, `aerial-aim-l22.js` | zonas, cono, corredor, dash, origen dinámico, 3D ray | HIGHFLY propio | ACTIVO en L22 |
| Kenney Particle Pack original | https://kenney.nl/assets/particle-pack | 80 PNG 512x512; pack oficial y licencia CC0 | **CC0** | **LEGAL**; en biblioteca histórica, NO encontrados los 80 PNG en árbol de L21 |
| Kenney sprites seleccionados vía ClaudeCraft | `public/vfx/` (WOC) | `circle_05.png`, `dirt_02.png`, `fire_01.png`, `flame_03.png`, `flare_01.png`, `light_01.png`, `light_02.png`, `magic_01.png`, `magic_04.png`, `slash_02.png`, `smoke_05.png`, `spark_04.png`, `spark_06.png`, `star_07.png`, `trace_05.png`, `twirl_01.png` | Kenney CC0 según `CREDITS.md`; validar hash contra pack oficial al importar | REUTILIZABLE en principio; no descargados/copied aún |
| ClaudeCraft `fel_meteor_impact.png` | `public/vfx/fel_meteor_impact.png` | sprite poderoso de impacto | **With the project only** explícito | EXCLUIR |
| ClaudeCraft modelos VFX de jefes | `public/vfx/{orbital-lightning,bone-reaper,ice-age,pulsars,forge-hammer,tentacles,boulder}/` | GLB de orbes, cadenas/hielo, martillos, etc. | Arte propio de WOC con permisos ligados al proyecto | EXCLUIR como archivos |
| ClaudeCraft texturas de producción | `public/textures/vfx/{production,contact}/*` | shockwave, smoke, warrior_power, shard atlas, contact crush/cut/pierce | Media específica, sin autorización reutilizable por archivo confirmada | CUARENTENA hasta trazar licencia |
| `public/models/vfx/production_fragments.glb` | WOC | fragmentos para impactos | No habilitado individualmente | CUARENTENA |
| ClaudeCraft sistemas TS | `src/render/ability_vfx/**`, `src/render/{vfx,fireball_travel_visual,mage_ground_fx,frost_nova_root_visual,ground_aim_reticle_visual,meteor_landing_burst}.ts` | shaders, flipbooks procedurales, estelas, material, impacto, compositor, telegraphs, pooling | **MIT código** | REUTILIZAR POR MÓDULO, eliminar dependencias en media no auditada |
| KayKit | rigs/animaciones originales disponibles en proyecto y catálogo | `player_barbarian.glb`, `skeleton_warrior`; otros packs de la biblioteca | CC0 en packs gratuitos verificados; SOURCE propia requiere inspección por kit | Para L22 solo modelos que ya viven en demo; no volcar ZIP propietario |
| HIGHFLY FinalFx/PremiumFx/AnimeFx históricos | Informe combat reboot 23/09 | afterimage, blade scar, lightning, reflect wall, magic circle | Código HIGHFLY propio documentado | INVENTARIADO, bytes no comprobados en L21 |
| Unity Particle Pack histórico | Reporte 23/09 | ElectricalSparks, EnergyExplosion, PlasmaExplosion, Sparks, EarthShatter, ParticlesLight | NO inferir CC0; Unity EULA | INVENTARIADO EN UNITY, NO PORTAR a web sin licencia y compatibilidad |
| Free Slash VFX | Master Build Bible 24/09 | slashes elemental, proyectiles, impacto | Unity Asset Store EULA | HISTÓRICO; NO portar directamente a Three.js |
| Magic Effects FREE (Hovl) | Master Build Bible 24/09 | carga, auras, portales, vortex, freeze, buffs | Unity Asset Store EULA | HISTÓRICO; NO portar directamente |
| Cartoon FX Remaster Free | Master Build Bible 24/09 | trail, impacto, humo, electro | Unity Asset Store EULA | HISTÓRICO; NO portar directamente |
| Black Hole Effect | Master Build Bible 24/09 | distortion, swirl, fresnel, particles | Unity Asset Store EULA | HISTÓRICO; no usar shaders Unity directamente en WebGL |
| Rokoko Magic Mocap histórico | Master Build Bible | DrStrangeMagic, Fireballs, GiantEnergyBlast, ForceLevitationProjectiles | Licencias específicas por pack | CUARENTENA para shipping sin verificación |
| Audio de ClaudeCraft | `public/audio/*` | múltiples muestras de terceros y audio propio | CC BY-NC o restringido según archivo en CREDITS | EXCLUIR salvo archivo autorizado individualmente |
| Iconos de skills ClaudeCraft | `public/ui/skills/**/*.webp` | CraftPix y arte reservado (salvo excepciones acreditadas) | Restringido | EXCLUIR por defecto |

**Fuente de derechos ClaudeCraft:** https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/CREDITS.md — la licencia MIT cubre código, NO medios, y exige licencia individual para cada medio. **No afirmar que se inspeccionaron bytes de antiguos ZIP de Unity**, porque no están en el repositorio web auditado.

## 2. Los seis módulos MIT de ClaudeCraft que importan primero
| Skill fuente | Spec y render MIT disponibles | Dependencias prohibidas/no verificadas | Estado |
|---|---|---|---|
| Fireball | `src/render/fireball_travel_visual.ts` (Icosahedron, shell, llamas/brasas instanciadas); `src/render/ability_vfx_full_specs.ts` fireball | Iconos/SFX originales | Alta prioridad de PORT |
| Meteor | `src/render/mage_ground_fx.ts`, `meteor_landing_burst.ts`, spec meteor | `fel_meteor_impact.png` restringido | Código apto, reemplazar sprite |
| Frost Nova | `src/render/frost_nova_root_visual.ts`, spec frost_nova | Iconos/SFX originales, atlas no trazados | Código apto |
| Backstab | `src/render/ability_vfx_full_specs.ts` backstab y painter genérico de cortes | sangre/sprites no licenciados individualmente | Código apto; efecto ligero y de precisión |
| Kidney Shot | spec kidney_shot; motivo de cadenas, shock vertical | media cadenas opcional bajo cuarentena | Código apto, diseñar hitstop/control |
| Charge | spec charge, `physical_choreography.ts`, ribbons | fragmentos GLB/atlas de golpe sin autorización | Código apto, recrear con geometría propia y Kenney CC0 |

## 3. Inventario 15 skills de L21 → dirección de L22
| Familia | Skill | Estado en L21 | Objetivo L22 |
|---|---|---|---|
| Aérea (Guinevere) | S1 Lanza violeta | Proyectil real, VFX elemental | Apuntado 3D y retícula elevada; esfera/estela de calidad |
| Aérea (Guinevere) | S2 Ascenso / recast | Salto, colisión, AoE elevación | Inicio real desde personaje MÓVIL; trayectoria redibujada |
| Aérea (Guinevere) | S3 Tempestad | 11 pulsos, anillos | Tornado giratorio y volumen vertical para enemigos elevados |
| Abisal (Dyrroth) | S1 Cortes de furia | Un golpe de cono | Tres ondas separadas, hit confirm por pulso |
| Abisal (Dyrroth) | S2 Paso / recast | Dash+segundo golpe fijo | Preservar que recast no sea otro dash, mejorar timing |
| Abisal (Dyrroth) | S3 Corte final | AoE lineal de ejecución | Distorsión/onda propia, corte sincronizado |
| Guardián (Tigreal) | S1 Onda de hierro | Cono simple | Tres frentes crecientes |
| Guardián (Tigreal) | S2 Embestida / recast | Dash y otro dash | Primer dash ARRASTRA; segundo gesto GANCHO ASCENDENTE |
| Guardián (Tigreal) | S3 Colapso | Pull manual con segunda fase | Succión y cierre automáticos |
| Claude Mago | S1 Fireball | Shader plasma propio | Port de núcleo/llamas/estela MIT; sin homing tras lanzamiento |
| Claude Mago | S2 Meteorito | Roca básica y warning | Port del sistema MIT meteor, sin sprite project-only |
| Claude Mago | S3 Frost Nova | Anillos | Hielo por objetivo, partículas y caída de temperatura visual |
| Claude Pícaro | S1 Backstab | Daño de espalda y cortes | Estocada sombra, hitstop breve |
| Claude Pícaro | S2 Kidney Shot | Golpe y control | Impacto/control con cadenas de geometría propia |
| Claude Pícaro | S3 Charge | Dash y golpe final | Trail de velocidad, polvo y contacto continuo |

## 4. ENEMIGOS VOLADORES: reglas autoritativas
1. Proyectiles y rayos **3D**: origen en socket/pecho del jugador, elevación manual por drag vertical o lock visible por línea de visión. Dirección se fija al DISPARAR, sin homing posterior.
2. Ataques de suelo: evaluar altura máxima del objetivo (2-3u según skill); criaturas sobrevolando a 7u no reciben un golpe por mero X/Z cercano.
3. Tornados/cúpulas/pull: perfil de volumen 3D con techo propio (p.ej. Tempestad 7.3u). No todos los AOE son verticales.
4. Cuerpo a cuerpo: alcance 3D y ventana de contacto real. Los enemigos fuera del rango vertical deben requerir salto/uppercut/skill/ranged.
5. Línea de visión montaña y obstáculos. Retícula aérea vertical, distinguible de la proyección de suelo.
6. Prueba reproducible: `?hf_fly=1` crea **un simulador flotante** entre tres bots, usando rig existente. No se presenta como criatura voladora final.

## 5. Reglas de rendimiento y copyright
- HIGH-FX predeterminado, jamás limitarse a `FX: MEDIO`; priorizar diseño de VFX, pooling, instancing y presupuesto de draw calls.
- Abolir curva decorativa de lanzamiento en proyectiles rectos. Arco solo si la trayectoria real del salto lo justifica.
- Cámara por defecto híbrida, editar solo en panel AJUSTES > CÁMARA.
- Cancelar skill arrastrando el mismo dedo al ✕ superior; NO consumir MP/Energía/CD.
- ATK básico gratuito solo en LAB L22 hasta validación (no tocar balance principal).
- MLBB / anime se usan como inspiración mecánica; **NO copiar efectos, dibujos, modelos ni audio protegidos**.

## 6. Bloqueos abiertos — imprescindible antes del merge a Principal
- Inspeccionar hashes/licencias de ZIP originales de la biblioteca Unity (no presentes en el árbol web).
- Integrar sprites CC0 del paquete oficial con hash/procedencia, no desde fragmentos sin licencia.
- Comprobar 60 FPS objetivo en dispositivo real; el emulador Chrome no demuestra FPS Android.
- Validar vuelo con monstruo volador real y su IA/hitboxes; simulador flotante no es vuelo final.
- Test visual/funcional de las 15 skills y encadenamientos. **Un archivo presente no equivale a premium final.**
