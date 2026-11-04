# HIGHFLY Tianjie P16 — SUPER AIM + MOBA VFX + ClaudeCraft (04/11/2026)

## Alcance real
- Parte **exactamente de Tianjie P14 y P15**. Su player_barbarian.glb, KayKit animations, FURY P13/P14, joystick 360°, cámara, ATK 1-2-3-4, salto, dash, enemigos/loot, RPG e inventario se mantienen.
- Sitio de pruebas: `/lab.html` en despliegue Vercel separado del Pages principal.
- Rama aislada `p16-aim-vfx-claudecraft-20261104`, comparada con P15.
- **No son los personajes de Mobile Legends**: son 3 kits HIGHFLY originales inspirados en las funciones de combate, sin imágenes, sonidos, animaciones ni VFX comerciales.
- **No importamos arte de ClaudeCraft**: las 6 skills de los kits MAGO/PÍCARO reproducen/adaptan únicamente las mecánicas descritas en código MIT fijado; sus VFX son propios, hechos con Three.js MIT.

## El nuevo sistema universal de apuntado
| Tipo | Cómo se ve | Para qué sirve | Ejemplos P16 |
|---|---|---|---|
| LINE | Corredor luminoso **ancho** con bordes y flechas | Trayecto proyectil / ataque lineal | Lanza Violeta, Corte Final, Fireball |
| CONE | Sector relleno translúcido + arco exterior | Selección frontal con anchura real | Cortes de Furia, Onda de Hierro, Backstab y Low Blow |
| DASH | Corredor ancho de desplazamiento con dirección | Carga, dash o segundo salto | Paso Depredador, Embestida, Onrush, recast S2 aérea |
| ZONE | Círculo de destino, doble anillo, centro, ruta y arco aéreo | Aterrizaje o meteorito en zona elegida | Ascenso S2 inicial y Meteor |
| SELF | Círculo radial con área real **alrededor del personaje** | Ulti/atracción/novas | Tempestad, Colapso, Frost Nova |

**Tacto S23 horizontal**: mantener S1/S2/S3 = mostrar telegráfico; arrastrar = orientar o elegir punto; soltar = ejecutar; CANCELAR = retirar retícula **sin gastar recurso ni CD**. Si círculo/dash apunta contra obstáculo, el área se marca en rojo y se bloquea lanzamiento. Al tocar sin arrastrar se conserva auto-target/soft-target según disponibilidad. Se mantienen los botones de ataque, salto y cámara existentes; no se apilan duplicados.

## S2 Aérea: orden correcto
1. Mantener S2 y elegir **círculo de aterrizaje** hasta 7,4 unidades; el indicador ya no es una rayita.
2. Soltar: animación/vfx de ascenso; se genera impulso vertical con física y dash dirigido por **FURY nativo**; círculo de llegada queda marcado.
3. **Esperar el contacto con el suelo** detectado por `player.onGround && dashT < 0` (mínimo 0,28 s).
4. Solo entonces: daño radial 84 + elevación del enemigo durante 1,15s; VFX de impacto.
5. Abrir recasteo S2 (3,5 s); S3 aplica 11 impactos en 2s; S2 recast usa **retícula DASH**, no círculo.
6. Si el aterrizaje no se detecta en 1,6s se cancela el daño en lugar de fingir impacto en el aire.

**Limitación:** esto usa física real de P14, pero no altera el rig ni añade animaciones proprietarias específicas de Guinevere. La parábola y el bloqueo de impacto deben probarse en el S23 real.

## Repertorio 3 + 2 = 15 skills activas
Coste, daño y CD abajo son **valores HIGHFLY de laboratorio**, no oficiales ni números copiados de MLBB ni de ClaudeCraft.

| Estilo | S1 | S2 | S3 | Recurso |
|---|---|---|---|---|
| AÉREA | Lanza Violeta · 65 daño · 14 · CD 4,4s | Ascenso + impactar/elevar al aterrizar · 84 · 23 · CD 15s + recast | Tempestad · 11 ticks (22 cada uno, cierre +55) · 40 · CD 40s | Maná |
| ABISAL | Cortes de Furia · cono 54 daño · 18 · CD 5s | Paso Depredador · dash/rotura 60 +20% vulnerabilidad · 25 · CD 12s + recast | Corte Final · 105 + bonus según vida faltante · 42 · CD 32s | Energía |
| GUARDIÁN | Onda de Hierro · cono/slow 50 · 18 · CD 6s | Embestida · dash + empuje/segundo elevador · 25 · CD 14s + recast | Colapso · atracción alrededor del héroe + 105 daño · 42 · CD 44s | Energía |
| CLAUDE MAGO | Fireball (Cinderbolt) · proyectil 73 + 4 ticks de quemadura · 20 · CD 3,8s | Meteor (Skystone) · círculo de destino, caída y explosión 138 + quemadura · 42 · CD 17s | Frost Nova (Icebind) · explosión radial 32 + casi inmovilizar 1,8s · 27 · CD 13s | Maná |
| CLAUDE PÍCARO | Backstab (Craven Thrust) · 72 / 130 por espalda · 17 · CD 3,2s | Kidney Shot (Low Blow) · 65 + slow/cancelar ataque breve · 25 · CD 12s | Charge (Onrush) · dash dirigido + 82 y elevación · 22 · CD 10s | Energía |

*Nota técnica*: en esta base, **Frost Nova** y **Low Blow** producen un control breve mediante `applySlow()`/temporización de ataque; no implementamos aún un sistema genérico de `root/stun` con inmunidades y tenacidad. No llamarlo CC de producción.

## Referencias MIT ClaudeCraft / límites de licencia
- Repo fuente: https://github.com/levy-street/world-of-claudecraft
- Commit fijado: `493c35a108cef6c8aa290e8793107b1cd117886e`
- Definiciones: https://github.com/levy-street/world-of-claudecraft/blob/493c35a108cef6c8aa290e8793107b1cd117886e/src/sim/content/classes.ts
- Catálogo auditado en HIGHFLY: `docs/skills/claudecraft_0447_410.csv`
- IDs de referencia: `fireball`, `meteor`, `frost_nova`, `backstab`, `kidney_shot`, `charge`.
- **MIT en código fuente NO implica licencia libre de todos los assets**; se mantienen fuera VFX importados, clips, imágenes, audio, fuentes y todo «with the project only».
- Compilación P16 y QA navegador automatizada se validan con `.github/workflows/p16-aim-claudecraft-ci.yml`; QA de FPS y jugabilidad real en S23 es un paso independiente.

## Acceso y próximos controles
- Abrir `/lab.html` en el deployment P16 correspondiente.
- Botones superiores: AÉREA, ABISAL, GUARDIÁN, CLAUDE MAGO, CLAUDE PÍCARO; teclado 5/6/7/8/9 selecciona estilos.
- S1/S2/S3 de HUD original ahora usan las skills del kit activo; S4 WULD, ATK, salto, dash y joystick permanecen los originales.
- Probar con **+ ENTRENAR** y con el modo VFX BAJO/MEDIO/ALTO.
- QA manual prioritario: S2 Aérea circular→salto→caída→elevación→S3→recast, interrupción por obstáculo, colisiones, retículas en PC y Samsung S23, duración de cadenas, VFX sin sobreexposición y FPS.

No se fusionó nada a `main`; todo aislado en laboratorio.
