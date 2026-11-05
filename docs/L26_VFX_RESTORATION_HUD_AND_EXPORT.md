# HIGHFLY FURY L26 — Recuperación VFX · HUD editable · exportación selectiva

**Base inmutable:** L25 l25-vfx-ruptura-aerea-20261105. **Desarrollo:** l26-hud-editor-vfx-recovery-20261105.  
**Fuente ClaudeCraft:** World of ClaudeCraft 0.44.7, commit 493c35a108cef6c8aa290e8793107b1cd117886e.  
**Auditorías usuario:** 07_SKILLS.md y 08_VFX.md (2026-11-05), solo código MIT y medios CC0 individuales aprobados.

## Diagnóstico: por qué L25 no recuperó los originales

1. ClaudeCraft define especificaciones por ID en src/render/ability_vfx_full_specs.ts y mecanismos de secuenciación en src/render/ability_vfx/*, pero no es correcto asumir que cada skill tenga un archivo PNG/GLB CC0 exportable.
2. El repositorio HIGHFLY en L25 contaba con las seis mecánicas: Fireball (núcleo 3D parcial), Meteorito/Frost Nova y Backstab/Kidney Shot/Charge con VFX simplificados. La rama no importó íntegramente esos módulos MIT. En L25 se añadieron 15 capas de acento, **no** equivalentes al espectáculo completo de ClaudeCraft.
3. Las auditorías 07/08 atribuyen **cero relaciones individuales de medios aprobados** a estas categorías. NO extraer por ello sprites de public/vfx, texturas de producción, audio ni modelos de encuentros particulares sin trazabilidad.
4. Las otras nueve skills del laboratorio son adaptaciones propias HIGHFLY: Guinevere Lanza/Ascenso/Tempestad; Dyrroth Cortes/Paso/Corte Final; Tigreal Onda/Embestida/Colapso. Ya tienen mecánicas y capas procedurales HIGHFLY, no los medios visuales originales de sus juegos de inspiración.
5. Un catálogo externo de 100 skills/VFX también puede servir para futuros experimentos, pero estar catalogado NO significa legalmente autorizado, importado ni funcional en este laboratorio.

## Recuperación de identidad visual ClaudeCraft en L26

| Skill | FULL spec MIT fuente | Momento del efecto L26 | Implementación técnica / medios |
|---|---|---|---|
| Fireball | fireball: orb + fire bolt + scorched ground + smoke/debris, 36 sparks | carga y salida del proyectil, impacto confirmado 3D | se conserva makeFireballVisual22; añade preparación luminosa, detonación física y marca de tierra procedural |
| Meteorito | meteor: skybeam + fissure, impacto volcánico | círculo antes de caer, dos columnas descendentes, impacto solo tras .75 s y quemadura | pilares/cilindros renderizados, fisuras y sello de tierra sin sprites |
| Frost Nova | frost_nova: nova + pillars, root aura | expansión, 12 púas instanciadas que crecen, halo y cristales en objetivos alcanzados | THREE.InstancedMesh y evolución de escala, sin textura |
| Backstab | backstab: shadow thrust, sin ring AoE | estocada y brillo únicamente sobre enemigo realmente alcanzado | tubos de estela propios, glint, colisión física y crítico por espalda existentes |
| Kidney Shot | kidney_shot: vertical blood, chains y stun | ataduras y seis estrellas en la cabeza solo en contacto | dos cadenas procedurales, estrellas instanciadas, pilar vertical, debuff real |
| Charge | charge: dash physical, speedlines y fisura al terminar | speedlines al arrancar; choque y suelo quebrado al completar dash | trayectoria original FURY, onda y partículas procedurales de aterrizaje |

El módulo específico es src/skillslab/claudecraft-vfx-l26.js, conectado a src/skillslab/claudecraft-kit-p16.js y al hit de proyectil en skills-web.js. Las especificaciones upstream inspiraron formas, timing y secuencias. Las texturas, audio y meshes restringidos se sustituyeron; por tanto son **reconstrucciones conformes, no copias pixel-perfect del acabado audiovisual de ClaudeCraft**. Costos, daño y tiempos HIGHFLY siguen separados de los specs de visualización originales.

## Nueve habilidades originales HIGHFLY

| Kit | S1 | S2 | S3 |
|---|---|---|---|
| Guinevere | proyectil 3D de lanza violeta y estela | ascenso real/posición de aterrizaje, marcas y pilares | tempestad giratoria y pulsos |
| Dyrroth | tres ondas/impactos progresivos | dash y segundo golpe inmóvil en recast | corredor oscuro, ejecución por vida faltante |
| Tigreal | tres ondas férreas | empuje con dash y gancho ascendente al recast | succión, cono gravitacional y golpe final |

VFX de estos kits: src/skillslab/lab-vfx.js, signature-vfx-l22.js y premium-vfx-l25.js. Las nueve son implementaciones propias e independientes. No portar arte, sonido, animación propietaria ni interfaces de otros juegos.

## HUD ENFOCAR L26

Editor real P10: src/ui/p10-layout.js + src/ui/p10-hud-editor.js; extensión de la lista de IDs con focus. Al iniciar el editor:
- seleccionar **ENFOCAR VOLADOR** en el listado
- arrastrar directamente el control, elegir TAMAÑO, OPACIDAD y GUARDAR
- se almacena en la disposición HUD existente bajo el ID focus, igual que ATK/MOCHILA
- cuando no existe configuración previa, la composición inicial coloca ATK arriba, USAR abajo a izquierda y ENFOCAR abajo a derecha
- si la persona tiene HUD guardado, **no sobrescribir** ATK/USAR ni su tamaño/posición; ENFOCAR toma su default editable
- el nuevo control NO se auto-reposiciona en cada frame; CANCELAR SKILL sí sigue a la mochila durante la preparación de una habilidad

El lock sigue siendo exclusivamente aéreo. No añade target a enemigos terrestres.

## Contrato de exportación de 15 habilidades para app demo

**Portátil hoy:** src/skillslab/skill-catalog-export-l26.js — 15 IDs únicos, 5 kits, S1/S2/S3, MP/Energy, costes/cooldowns de laboratorio y claves de VFX. Importación sin efectos secundarios y sin dragón/training. No modifica la demo principal.

**Arquitectura para transferir después de aprobar las pruebas visuales:**
1. Importar el catálogo puro y mapear sus IDs al sistema real de skills/equipamiento/HUD de la demo, separando PLAYER SELECTOR de UI de pruebas.
2. Portar SOLO efectos legales con sus dependencias locales: claudecraft-vfx-l26.js, fireball-vfx-l22.js, signature-vfx-l22.js, premium-vfx-l25.js y lab-vfx.js. Mantener un administrador de recursos VFX y cleanup único; **no duplicar escenas**.
3. Aislar gameplay de skills-web.js/claudecraft-kit-p16.js: las 15 definiciones y sus ventanas de contacto, recursos, cooldown, aim y efectos especiales. **NO importar boot.js ni TrainingTargets/EnemyManager del laboratorio a la app demo**.
4. Integrar la UI ENFOCAR/P10 como componente opcional del HUD principal, solo para combate contra voladores; preservar valores guardados de usuarios existentes.
5. Importar el adapter de proyectiles 3D/hit-confirm, pero NUNCA reemplazar g.combat.melee, g.player.update, cámara ni joystick FURY P16 por una versión del laboratorio. Los hooks se deben registrar con una interfaz explícita/desactivable.
6. Validar colisión, animaciones KayKit realmente disponibles, 15 skills, bugs de recast, gasto correcto de maná/energía, giro direccional de ATK, HUD, FPS/frametime y licencias de cada futuro recurso externo.

**No promover automáticamente** a la rama principal HIGHFLY-ORIGIN-DEMO ni al proyecto HIGHFLY-WORLD durante validación del laboratorio. Una prueba CI no certifica fidelidad visual ni rendimiento del Samsung S23 Ultra físico.

## Pruebas

- tests/l26-vfx-hud-export.test.mjs — esquema editable, posiciones persistidas, seis VFX en momentos de impacto confirmados, 15 registros, no mutación de FURY P16.
- scripts/l26-browser-smoke.mjs — Chrome táctil 915x412, editor vivo, tamaño/posición/guardado y llamadas de 15 VFX, una isla.
- .github/workflows/l26-vfx-hud-qa.yml — CI de sintaxis, regresión P15/P16/P19/L23/L24/L25/L26 y browser smoke.
- Captura visual del runner: artifact l26-s23-landscape-ci-screenshot. No representa FPS real del Samsung.
