# HIGHFLY P7 — FURY 360 · Plan integral de movilidad y combate

**Base:** P6 `8e8a1116d532b654e434095c00ee6477a477eedf` en rama de trabajo aislada.
**Plataforma:** GitHub Pages, Samsung S23 Ultra, landscape, FLUIDO. No Codespaces, no SOURCE propietario.
**Prueba de origen:** feedback real en Android (2026-11-04), puntos 1–12.
**Estado:** plan verificado contra archivos fuente; NO implementado ni desplegado todavía.

## Fallos P6 y causa verificable

1. `src/combat/targeting-p6.js`: `valid(..., anyAngle=false)` descarta por dot menor a 0.15 y `acquire()` filtra por cono frontal; el ATK de espalda carece de candidato.
2. `src/player/player.js`: `this.yaw` funciona como rumbo de cámara y fallback de combate; `bodyYaw` durante ataque/cast cae a `this.yaw`; separar orientación visual de cámara y movimiento.
3. `src/player/player.js:startDash`: toma `_moveDir` calculado en frame anterior o `getForward()`; un toque inmediato puede usar rumbo incorrecto. `animate` obliga targetYaw de cámara durante dodge; visual de evasión incorrecta. `PremiumHudP5.tryDash` usa 26u/s×0.24s=6.24u (demasiado).
4. `src/combat/combat.js:melee` selecciona cuatro clips y bonus, pero no hay prueba en Android del clip efectivamente visible; investigar `Rig.play()` de `src/core/assets.js`, tapping/buffer y fade antes de prometer secuencia.
5. `src/player/player.js` intenta segundo salto con `_jumpCount===1`; la prueba Android no lo pudo activar; integrar `jumpCount`, `airDashCount`, cooldown y prioridad de estados en un solo controlador, no parches de tecla.
6. `src/world/scatter.js:buildPines/buildRocks` crea matrices `InstancedMesh` sin registrar colliders; `Player.update` solo verifica casas/pozo.
7. `src/player/player.js`: antorcha funcional via `KeyT` y `buildTorch/updateTorch`; falta acceso en HUD móvil/inventario.
8. `src/systems/inventory.js`: `equipped.weapon` única; espada actual se coloca en `handslotr` vía `src/core/assets.js`, la antorcha usa `handslotl`. Doble espada requiere slot secundario, otro anclaje/animaciones verificadas y política de mano izquierda.
9. `src/systems/save.js`: clave global `tianjie5_save`; Pages / y /p6/ comparten origin. Necesitamos migración hacia guardado P7 aislado sin borrar avance, incluyendo altares aprendidos.

## Contratos P7 (una integración, tests por subsistema)

### A. Movimiento/combate/target 360
- Cámara: solo orienta vista y movimiento camera-relative.
- Joystick: controla trayectoria; nunca gira cámara por ATK. El personaje puede atacar mientras se desplaza.
- Objetivo manual bloqueado tiene prioridad si está vivo, cercano y visible.
- Al tocar ATK, buscar enemigo 360° dentro de **rango cuerpo a cuerpo** (diseño inicial 4–4.5u, ajustar a hit radius real), más cercano y alcanzable; si existe girar SOLO el cuerpo hacia él; si no, atacar según orientación de cuerpo/joystick, NO forzar rumbo de cámara.
- Anclaje suave de objetivo durante la cadena, sin salto de target cada golpe; cambiar/cancelar siguen manuales. Magia respeta objetivo fijado visible o apuntado de cámara; no apuntar indiscriminadamente detrás de uno.
- El giro del cuerpo debe seguir un límite angular corto y no romper el área de golpe al resolver daño; target del golpe se captura al iniciar ataque.
- VFX/retícula de soft target visible, con nombre y distancia; no confundir auto-target con lock manual.

### B. Evasión y parkour
- `DASH` normal: distancia sugerida ~2.8–3.2u (p. ej. 20u/s×0.15s). `WULD` es habilidad especial más larga, independiente.
- Capturar dirección de joystick en el mismo pointerdown, transformando a mundo usando orientación actual; si joystick en cero, usar último rumbo de locomoción o orientación del cuerpo.
- Ataque/animación y `Dodge_Forward/Backward/Left/Right` deben reflejar rumbo real del dash respecto a cuerpo; no forzar yaw de cámara.
- Propuesta de combo aéreo: salto 1 → dash 1 → salto 2 → dash 2, consumiendo energía en cada acción; máximo dos saltos y dos dashes por secuencia aérea, nunca resets gratis en el aire; ajustar ventana/cooldown para prevenir spam. Mantener velocidad vertical a menos que la habilidad la altere explícitamente.
- No permitir tunneling; barrido continuo y subpasos razonables.

### C. Combo ATK
- 1–2–3–4 visiblemente diferentes usando los cuatro GLB auditados: Diagonal, Horizontal, Stab, Chop.
- Buffers de toque, transición y ventana de combo independientes de FPS; comprobar tap rápido, tap a ritmo y una pausa; reset claro.
- 4º golpe con feedback de daño/VFX, no solo multiplicador oculto.
- Recalibrar animaciones con `Rig.play`, estados, `fade` y duración real; registrar clip seleccionado vs reproducido.
- Poder correr/saltar/atacar sin autorrotación al frente.

### D. Colisiones de naturaleza
- Al generar árboles y rocas instanciados, registrar collider simple por tronco/gran roca con x,z, radio y rango vertical.
- Spatial hash/grid para consultar SOLO candidatos de celdas cercanas al jugador/cámara/proyectil; nunca recorrer miles de árboles por frame.
- Una misma capa world-query para casas, pozo, árboles, rocas y terreno. En árboles colisiona el tronco, no toda la copa.
- Test continuo contra pasos rápidos, dash y diagonales; no atascarse en costuras/pendientes; conservar FPS FLUIDO.

### E. HUD y antorcha
- Distribución táctil landscape: **CORRER – SALTO – DASH – USAR – S1 – ATK**, CORRER más pequeño al lado del salto; S2/S3/S4 en arco superior sin superposición con controles de target.
- Antorcha: acción ON/OFF en inventario; preservar `KeyT` para PC; guardar `torchOn` sin afectar el altar hielo.
- `FIJAR/SIG./✕` accesibles y diferenciados del auto-target automático.

### F. Doble espada — ampliación opcional condicionada
- Antes de habilitar combate dual: auditar clips/bones `handslotl` y equipamiento; dos slots mainHand/offHand, migración de `equipped.weapon` legado.
- Si faltan animaciones reales de doble arma, NO vender el estilo como completo. En ese caso incluir solo diseño/test en P7 y hacer implementación de combate dual con animaciones legales verificadas en siguiente paquete.

## Protección de progreso

- No modificar `main` ni P6 antes de aprobar P7.
- Guardado P7 versionado: leer copia previa `tianjie5_save` solo para migrar; escritura exclusiva a `highfly_p7_save`, guardar habilidades aprendidas, inventario/equipo, antorcha y misiones.
- Mantener transición de `learnedShouts`, incluyendo el altar que desbloquea hielo.
- Si carga una copia corrupta, no escribir encima de la original; reportar error de importación.

## Criterios de aceptación — Android

- 360° 8 direcciones, analógico parcial, cámara libre, ataque atrás y hacia costados sin giro de cámara.
- Tres enemigos alrededor: target correcto, persistencia durante combo y bloqueo manual sobreescribible.
- Dash derecha/izquierda/atrás/adelante de ~3u desde quieto o movimiento; sin volver siempre al frente.
- ATK 1–2–3–4 con clips distinguibles y daño comprobable.
- Secuencia salto→dash→salto→dash respetando energía y máximos; sin interrupciones fantasmas.
- No atravesar troncos grandes/rocas/casas con marcha ni dash; probar aldea, bosque, nieve y costa.
- Abrir inventario y encender antorcha; habilidad hielo aprendida persiste tras reload.
- HUD sin solapamientos con dedos en S23 Ultra landscape.
- Benchmark P6 vs P7 en escenas idénticas, FLUIDO; no introducir caída sostenida bajo ~30 FPS donde P6 se mantenía, revisar percentil 95 de tiempos de frame.
- Regresión Node + Playwright/browser smoke cuando sea viable; NO declarar test físico de Android aprobado sin reporte humano.
- GitHub Pages: desplegar P7 solo a `/p7/` luego de CI y pruebas de smoke; `/` y `/p6/` quedan comparables.

## Licencia

Tianjie5 mantiene el motor actual. ClaudeCraft 0.44.7 solo se consulta como biblioteca de lógica MIT; assets individuales excluidos hasta verificación legal, sin KayKit SOURCE en este repo público.
