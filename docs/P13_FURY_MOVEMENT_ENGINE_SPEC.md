# HIGHFLY P13 — FURY MOVEMENT ENGINE · contrato de implementación

Estado: arquitectura de trabajo preparada, **NO implementado como jugabilidad ni publicado**.
Base: rama p812-fury-polish-20261104, SHA c57d29353bee3b391ab233f2a56ea867f3190c76.
Destino: rama p13-fury-movement-engine-20261104. GitHub Pages estable y /p812/ permanecen intactos.
Plataforma: Android Samsung S23 Ultra horizontal, WebGL/Three, FLUIDO.
Contenido público: únicamente código/GLB verificados y redistribuibles; NUNCA copiar KayKit SOURCE privado al repo.

## Propósito
Un único cazador, joystick 360° relativo a cámara, cámara libre predeterminada, ataque físico automático contextual 360°,
lock manual opcional, apuntado libre de magia, habilidades físicas consumen Energía y mágicas MP.
Movimiento, ataques, esquivas, casts y parkour son transiciones de un mismo controlador, sin scripts de input compitiendo.

## Activos existentes verificables
- src/player/player.js: movimiento relativo a cámara, velocity smoothing, dash, doble salto, orientación corporal.
- src/combat/combat.js: cuatro clips de golpe y buffer, golpes, recursos, projectiles, shouts.
- src/combat/targeting-p6.js: soft target, lock, LOS, cámara contra obstáculos.
- src/world/obstacles-p7.js: rejilla espacial de obstáculos naturales con cilindros de colisión.
- src/world/structures.js: colisionadores de edificios y estructuras.
- src/world/terrain.js: altura y pendiente del terreno.
- src/core/assets.js: rig/mixer y GLB originales de demo.
- scripts/audit_animation_p6.mjs: auditar nombres de clips REALMENTE existentes (salida se genera en CI, no viene versionada).
- Animaciones auditadas anteriormente: Running_A, Jump_Idle, Jump_Full_Short, Dodge_{Forward,Backward,Left,Right},
  1H_Melee_Attack_{Slice_Diagonal,Slice_Horizontal,Stab,Chop}, Spellcast_Shoot.
- NO afirmar aún animaciones de mortal, trepada, wall-run, ledge-hang, ataque aéreo o aterrizaje específico.

## Paquete integrado

### A. Motor determinista de locomoción
- movement states: GROUNDED / ACCELERATING / SPRINT / JUMP / AIR / DASH / FALL / LAND / WALL_CONTACT /
  WALL_RUN / WALL_JUMP / LEDGE_HANG / LEDGE_CLIMB.
- Subestados de combate independientes: IDLE / ATTACK_WINDUP / ATTACK_ACTIVE / ATTACK_RECOVERY / CAST_AIM / CAST /
  HIT_REACTION, con matriz explícita de transiciones.
- Movimiento analógico en mundo; cámara jamás auto-rotada por ATK salvo asistencia de lock activada.
- Salto con buffer y coyote time; máximo dos saltos por secuencia aérea inicial, sin reseteo hasta suelo válido.
- Mortal frontal/trasero/lateral según joystick en segundo salto: giro del esqueleto, nunca girar capsule física.
- Input multitáctil por pointerId, separación estricta de joystick/cámara/combat/UI, pruebas de tap y hold.
- Reglas para quedadas sin energía, caídas, cancelar, entrada/salida de interior, guardado/carga.

### B. Motor de contactos y parkour
- Consultar superficies mediante colliders con normal, altura, material y permisos: no usar geometría decorativa invisible
  como pared escalable ni asumir que todo árbol permite trepar.
- Capsule sweep continuo, pasos/subpasos, superficie/esquina/ledge test, techo libre y suelo válido de aterrizaje.
- WALL_RUN lateral con límite breve por energía, ángulo admisible, caída al agotarse, salto para desprenderse.
- LEDGE_HANG y LEDGE_CLIMB solo cuando espacio seguro y las animaciones/poses se hayan validado.
- Un overlay de depuración muestra normal de pared, estado, recurso y razón de rechazo, desactivado por defecto.
- Tener camino de degradación al salto normal cuando la superficie o animación no están disponibles.

### C. Combate y skills durante parkour
- Cuatro golpes con marker de impacto, queue/buffer y cooldown por frame independiente; ATK hold con control de energía.
- Estados de ataque aéreo y plunge; no fingir clips: si falta clip, usar transición neutral probada y planificar producción.
- Ventanas de cancel: recuperación a dash; salto a cast; cast a dodge según tipo de habilidad; evitar cancelar daño sin coste.
- Auto-target melee 360 con radio/LOS; torso/cuerpo gira hacia target, cámara continúa libre.
- Lock manual opcional con cámara suavizada configurable y cambio/cancelación controlado.
- Preview línea/cono/área de skills cuando apuntas; cancelar apunta no consume MP ni cooldown.
- Skills FUS/WULD físicas gastan Energía; Fireball/Hielo mágicas gastan MP; VFX adaptados a FLUIDO.

### D. Inventario, HUD y progresión
- Preservar layout editable P10/P812, inventario/mochila/misiones/radar y antorcha secundaria.
- Integrar estados a controles existentes SALTO, DASH, CORRER, S1–S4, ATK y USAR; no aumentar número de botones.
- Indicador de acción contextual solo durante wall-run/hang y feedback de energía.
- P13 guarda con clave independiente y migración solo lectura desde P812; nunca borrar/reescribir claves anteriores.
- No modificar todavía curva de nivel, stats STR/AGI/VIT/INT, progresión de energía ni árbol de habilidades.

### E. Rendimiento y telemetría
- FLUIDO + ECO, profiling por subsistema, conteo de draw calls y frametime p50/p95, sin afirmar uso % GPU falso.
- Objetivo de aceptación inicial: 30 FPS sostenidos en escenario de combate de prueba S23 Ultra,
  evitando picos de frametime frecuentes; la aprobación final depende de evidencia real en ese teléfono.
- No per-frame allocations durante movimiento/colisiones, no raycasts contra el mundo completo, colliders espaciales.
- Cap para VFX, luces dinámicas y partículas; liberar recursos al cerrar/deseleccionar habilidades.

## Pruebas obligatorias antes de Pages
1. Node: FSM/transiciones, salto, wall jump, wall run, energía, combo y targeting 360 (deterministas).
2. Node + auditoría GLB: cada clip referenciado debe existir, sin SOURCE propietario.
3. Chromium mobile horizontal: joystick no ataca, ATK hold, salto+dash+skill multitáctil, diálogos/menús, guardado.
4. Mapa de pruebas reproducible: tierra plana / desnivel / roca / pared con saliente / cueva / enemigo.
5. QA real S23 Ultra: 10 min exploración y 10 min combate, FLUIDO y ECO, FPS, p95, calor, bloqueos.
6. Página separada /p13/ solo tras CI verde; main/P812 jamás reemplazados automáticamente.

## Dependencias y faltantes reales
- FALTA validar/licenciar animaciones específicas de mortal, salto de pared, trepada, colgado, ataque aéreo:
  puede resolverse mediante nuevas animaciones propias sobre el rig vigente, sin comprar assets.
- FALTA una API de superficies colisionables con normales y bordes/salientes (los colliders P812 son simplificados).
- FALTA definir y probar recuperación/cancel windows sobre duración real de clips y FPS móvil.
- FALTA medición sostenida física de rendimiento/temperatura del dispositivo; Chromium CI no sustituye Android.
- OPCIONAL para la estética: referencias de estilo del mortal/parkour o animaciones propias suministradas; no bloquea arquitectura.

## Definición de listo
Jugar con un personaje continuo en cámara libre, moverse en 360, encadenar ataque terrestre/aéreo,
ejecutar segundo salto direccional, dash direccional, seleccionar enemigo cercano e interactuar con pared
y saliente sin atravesar colisiones ni consumir recursos incorrectos, con P95 aceptable en teléfono.
