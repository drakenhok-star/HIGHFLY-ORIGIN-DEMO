# P15 FURY COMBAT EVOLUTION — implementación e instrucciones de QA

**Base:** P14 de HIGHFLY ORIGIN DEMO. **Rama:** p15-fury-combat-evolution-20261104.
**No se mezclan:** código del laboratorio externo de skills, KayKit SOURCE propietario, assets comerciales o con licencia no acreditada.

## Implementado
1. Motor puro de ventanas para 4 golpes con tiempos de impacto y recuperación separados. Usa cuatro clips reales previamente auditados.
2. Contexto de ataques al correr, caer, estar suspendido o finalizar DASH. Selecciona perfiles de tiempo/mezcla de animación; no inventa nuevos clips.
3. Cancelación de ataque hacia DASH solo desde la recuperación. Un DASH solicitado temprano queda en cola durante una ventana acotada y consume Energía únicamente al ejecutarse.
4. Continúa P14: ATK mantenido, combo 1-2-3-4, desplazamiento/cámara libres, dashes diagonales, salto doble y ataque con +15 % de daño al estar en el aire.
5. Elección de objetivo melee 360° por proximidad, persistencia de objetivo de combo y prioridad a lock; confirma línea de visión antes del golpe.
6. Reacciones de daño breves para enemigos pequeños. Se cancela ataque pendiente, se conserva el retroceso vertical y la gravedad, los jefes y dragones no reciben stun/launch de este sistema.
7. Ajuste de coste de VFX en FLUIDO y reutilización de vectores en daño/proyectiles para evitar objetos temporales.
8. Fuera del menú público: «PROBAR PARKOUR» y «MESETA MONTAÑOSA». No se elimina el código del parkour P13/P14.
9. Save P15 separado del P14, con carga de progreso P14 de solo lectura si no existe partida P15.

## Preparación de skills futuras
\`src/combat/fury-combat-p15.js\` define \`buildSkillContract\`: id, kind magic/physical,
resource mp/energy, aim melee/line/cone/circle/self/target, cost, cooldown, allowAir, allowWall, clip.
**No se han importado ni activado habilidades externas.** Los catálogos P14 están en \`docs/skills/\`.

## Conocidas limitaciones (no presentar como terminadas)
- Los cuatro clips de espada siguen siendo los existentes; la edición específica de ataques aéreos/plunge y sus mezclas de extremidades requiere animaciones reales adicionales.
- El impacto usa un marcador temporal por perfil, un arco de alcance y LOS; no hay todavía seguimiento continuo del filo mediante huesos.
- La cámara sigue siendo libre; lock manual asistido sigue siendo configurable, no un verdadero modo MOBA 2D.
- El lanzamiento aéreo y las reacciones requieren validación visual/IA en Android; Chromium no simula uso térmico real.
- El parkour vertical no cambia: aún faltan torre de retos, wall meshes y superficies escalables con salientes.
- Apuntado por gesto (cono/círculo/línea) todavía es una futura integración, no una skill nueva de P15.

## Prueba del cazador (Samsung S23 Ultra, horizontal)
1. Desde P14, probar P15 sin limpiar el navegador: Continuar debe leer P14 y empezar a guardar únicamente en P15.
2. Combatir con cuatro ATK seguidos, luego ATK mantenido y ATK → SALTO → ATK → DASH → ATK.
3. Pulsar DASH durante el inicio del golpe: debería salir al entrar en recuperación, sin golpear mientras esquiva.
4. Probar auto-target con enemigo delante y detrás, fijar objetivo, cambiarlo y cancelar lock.
5. Lanzar un enemigo pequeño con cuarto golpe en el aire y comprobar que no ataque durante el breve hitstun; probar un jefe y confirmar inmunidad.
6. Verificar que no hay enlaces de teletransporte de parkour en MENU.
7. Verificar Mochila, Inventario, Misiones, Radar, Editor y guardado.
8. Comparar 10 min en FLUIDO y ECO contra P14 con el mismo escenario (FPS/P95, respuesta y temperatura).

## Pruebas CI
P5, P6, P7, P810, P812, P13, P14, P15, inventario GLB, sintaxis y navegador mobile-landscape.
URL de Pages solo si el SHA de la rama coincide con el SHA verde exacto.


## Nuevo remate direccional del cuarto golpe (P15)
El cuarto ATK almacena la dirección del joystick **cuando comienza el golpe**, no cuando impacta.
- ↑ (joystick arriba): elevación física vertical del enemigo (velocidad vertical ~9.2).
- ← / →: empuje lateral relativo a cámara, sin girar la cámara.
- ↓: empuje frontal fuerte y breve aturdimiento; **NO es todavía una animación real de derribo**.
- Joystick neutro: remate frontal.
- Diagonales: se respeta el eje dominante; un movimiento diagonal con componente hacia arriba dominante lanza verticalmente.
- Mantiene el consumo normal de Energía del cuarto golpe. No añade botón ni nuevo VFX de alto coste.
- No aplica control direccional a dragones, jefes, enemigos demasiado grandes, inmunes o que explícitamente bloqueen/defiendan.
- El juego NO tiene todavía un sistema general de bloqueo/parry; las propiedades blocking/defending son puertos para futuras IA.
- Las animaciones siguen siendo las cuatro secuencias reales verificadas; **la reacción física es nueva, no hay animaciones específicas de launch lateral o derribo**.

CI: \`tests/p15-finisher.test.mjs\` verifica las cuatro direcciones, orientación con cámara, diagonales, umbral neutro, inmunidades y snapshot.
Browser: prueba la cuarta entrada real \`combat.melee()\` con joystick arriba, coste de Energía y captura de elevación.
