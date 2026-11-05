# HIGHFLY FURY — L25 · Auditoría de dependencias VFX y Ruptura Aérea

Fecha: 2026-11-05. Rama base: l24-unified-island-dragon-and-bots-20261105. Rama aislada: l25-vfx-ruptura-aerea-20261105.

## Evidencia y regla de licencia

Se examinaron las auditorías aportadas (07_SKILLS.md y 08_VFX.md), el commit fuente fijo de World of ClaudeCraft v0.44.7 493c35a108cef6c8aa290e8793107b1cd117886e, el código VFX relevante y las implementaciones HIGHFLY L24.

- MIT: lógica de abilities y efectos procedurales del proyecto, sujeto a excepciones explícitas y dependencias.
- CC0: solo recursos individuales vinculados a un proveedor y pack CC0 por el catálogo de procedencia.
- **Los dos informes Skills/VFX aprueban CERO ficheros multimedia individuales.** Las 384 rutas aprobadas por el inventario son una selección de otras categorías; no una licencia universal de los PNG/GLB de ClaudeCraft.
- NO importar CraftPix, assets With the project only, paquetes Unity sin portabilidad legal acreditada, ni texturas/sprites sin trazabilidad. Tampoco se utilizarán CC BY, Apache, OFL o NC por el filtro exclusivo MIT/CC0 elegido.

Fuentes primarias:
- [Licencia MIT](https://github.com/levy-street/world-of-claudecraft/blob/v0.44.7/LICENSE) y [CREDITS](https://github.com/levy-street/world-of-claudecraft/blob/v0.44.7/CREDITS.md)
- [Especificaciones VFX por habilidad](https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/render/ability_vfx_full_specs.ts)
- [Registry VFX](https://github.com/levy-street/world-of-claudecraft/blob/v0.44.7/src/render/ability_vfx_registry.ts)
- [Engine secuenciador](https://github.com/levy-street/world-of-claudecraft/blob/v0.44.7/src/render/ability_vfx/fx.ts)
- [Modelo de Fireball](https://github.com/levy-street/world-of-claudecraft/blob/v0.44.7/src/render/fireball_travel_visual.ts)

## Auditoría de dependencias transitivas

| Módulo fuente | Qué contiene | Dependencias observadas | Decisión |
|---|---|---|---|
| src/render/ability_vfx_full_specs.ts | Descripción completa de efectos | ability_vfx_core.ts | Recuperar seis specs como inspiración técnica y parámetros; no traer runtime |
| src/render/ability_vfx_registry.ts | Selección de spec por ID | specs secundarias warrior, warlock, druid, etc. | No importar registry completo |
| src/render/ability_vfx/fx.ts (aprox. 102 KB) | VFX engine, animación, capas, sonidos, decals | contact_assets, production_assets, fx_textures, flipbooks, audio, múltiples módulos | No importar acoplamiento masivo |
| src/render/ability_vfx/contact_assets.ts | Sheets de contacto | /textures/vfx/contact/cut.ktx2, crush.ktx2, pierce.ktx2 | CUARENTENA |
| src/render/ability_vfx/production_assets.ts | Texturas y mallas de producción | /models/vfx/production_fragments.glb y /textures/vfx/production/* | CUARENTENA |
| src/render/vfx.ts | Efectos y sprites | /vfx/{sprite}.png | CUARENTENA hasta prueba individual de procedencia Kenney CC0 |
| src/render/fireball_travel_visual.ts | Núcleo de fuego, coraza, conos y brasas | Three.js, gfx y surfaceMat | Adaptación parcial existente en HIGHFLY fireball-vfx-l22.js |
| src/render/frost_nova_root_visual.ts | Cristales y base del efecto congelación | Three.js, gfx, floor_vfx_layer | Reinterpretación legal de geometría en L22/L25 |
| src/render/ground_aim_reticle_visual.ts | Apuntado en suelo | ground_aim_reticle_core, floor_vfx_layer | Mantener apuntado nativo HIGHFLY |
| src/render/weapon_vfx.ts | Trails armas | gfx/shared resources | Mantener trails propios |

Se excluyen específicamente fel_meteor_impact.png (With the project only), iconos de skills CraftPix, modelos de VFX de jefes sin autorización independiente y cualquier SFX/atlas heredado de licencia no comprobada.

## Las seis habilidades originales, procedencia y estado

Los valores siguientes son **del diseño visual upstream**, NO sustituyen balance ni cooldowns HIGHFLY.

| ID MIT | Especificación upstream | Adaptación L25 |
|---|---|---|
| fireball | bolt fire, speed 17, headScale 1.4, windup 1.7, orb, 36 sparks, ring, smoke, debris, flipbook | Se mantiene núcleo 3D L22; acento de brasas. Sin flipbook/textura no licenciados |
| meteor | burst fire, skybeam, shaft 1.6, windup 2.2, fissure, 60 sparks, ring 2.5 | Caída y daño diferido L24; nuevo sello y pilar. Sin imp_meteor original |
| frost_nova | nova frost, radius 8, pillars, linger 3.5, 26 sparks, debris | Geometría original de hielo y sello añadido, sin medios restringidos |
| backstab | strike shadow, thrust, sin windup, 8 sparks, sin ring | Cuchillada discreta y daño posicional existente |
| kidney_shot | strike blood, vertical, chains, vRing, 20 sparks, crack | Cadenas propias y stun existente |
| charge | dash physical, windup .2, fissure, speedlines, ring 1.8, 34 sparks | Dash FURY y estelas propias, sin textura de humo/debris no auditada |

No trasladar literalmente speed, radius, power, windup ni duración de specs como valores de daño o coste HIGHFLY: representan diseño visual distinto y requieren gameplay tuning.

## Las quince habilidades: matriz de mejoras

| Familia | S1 | S2 | S3 |
|---|---|---|---|
| Guinevere | lanza violeta con cintas | sello de ascenso | sigilo de tormenta |
| Dyrroth | cortes en capas carmesí | estela y recast | ejecución oscura |
| Tigreal | onda frontal | líneas de embestida | sello gravitacional |
| ClaudeCraft Mago | brasas Fireball | columna y anillo meteorito | cristales Frost Nova |
| ClaudeCraft Pícaro | estocada silenciosa | ataduras rojizas | estelas Charge |

Archivo L25: src/skillslab/premium-vfx-l25.js. Efectos originales Three.js sin PNG/GLB/SFX externos, con geometría de sello agrupada en un único draw, vida y limpieza a través del VFX manager existente. Complementan, no reemplazan, las implementaciones de impacto L22. No equivale a aceptación artística final.

## Ruptura Aérea — especificación L25

- ENFOCAR: solo voladores verificables por altura actual sobre terreno; un toque puede enfocar/liberar al único dragón. Terrestres siempre con AIM manual.
- ATK: con un volador enfocado y elevado dispara un proyectil energético; sin ese estado, llama al ATK terrestre FURY P16 intacto.
- Impactos reales: colisión barrida 3D, línea de visión y objetivo específico. Pulsar ATK sin impacto no suma.
- Umbral: 4 impactos en ventana 4.5 s; al superarla se reinicia cuenta.
- Derribo: el dragón Quaternius de entrenamiento baja suavemente de 7 u a 0.45 u durante 5.5 s, luego sube a su altura original. Solo se cambia su offset de vuelo en el laboratorio, sin modificar src/entities/enemies.js.
- Durante el descenso y tras bajar del umbral aéreo, el ATK terrestre 1-2-3-4 y las skills terrestres vuelven a poder alcanzarlo si sus hitboxes y distancias reales lo permiten.
- Parámetros experimentales: cooldown básico aéreo 0.42s, daño 28, velocidad 43, alcance 32; no consumen energía solo en laboratorio.
- UI: botón ENFOCAR pequeño junto al ATK real; cancelar apuntado junto a MOCHILA real; solo un laboratorio y una isla.
- Rendimiento: calidad premium por defecto, 48 efectos temporales máximo en el manager L22, sin nuevas texturas, geometría sigilo agrupada; métricas S23 Ultra aún pendientes.

## Verificación y publicación

CI ejecutará tests de regresión P15/P16/P19/L23/L24, suite L25 y syntax-check de JS. Requiere además smoke visual en navegador y pruebas reales Android horizontal: 15 skills, daño, cooldown, cancelación sin coste, colisión aérea, descenso, retorno a terrestre, no solapamiento HUD, FPS y frametime.

L24 permanece estable e intacta. La rama L25 es candidata, **no se debe publicar sobre el Pages actual hasta validar CI y pruebas en navegador**. La presencia de código no certifica 40-120 FPS en Samsung S23 Ultra.
