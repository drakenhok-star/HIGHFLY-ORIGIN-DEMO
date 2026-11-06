# HIGHFLY P190 · Seis skills libres, físicas y mágicas
Fecha: 2026-11-06. Referencias visuales: captura de Tales of Wind adjunta
(únicamente distribución del HUD, NO assets/código del juego ajeno) y video
de juego HIGHFLY P189 de 88,7 segundos (2316×1080).

## Motivo
El jugador prefiere seis botones, cuatro inferiores y dos por encima. No hay
"skill especial": cualquier habilidad aprendida entra en cualquiera de las
seis ranuras y se puede arrastrar para apuntar mediante el L27 original.

## Catálogo unificado
- 15 habilidades procedentes de L27, sin modificar daño, recurso y cooldown.
- 3 runas nativas de Tianjie: FUS (física 12 energía/15 s), HIELO
  (mágica 24 maná/18 s), WULD (física 24 energía/8 s).
- Total 18: **11 físicas y 7 mágicas**. Sin clases.
- Nuevos personajes NO reciben las 18 de regalo. Las cuatro quests existentes
  siguen revelando habilidades L27. Las runas se aprenden visitando la piedra
  de conocimiento del mundo. Las 11 quests futuras no están implementadas.
- Migración P189: se preservan S1–S3 y las runas aprendidas del guardado
  anterior; la runa equipada va a S4 si está libre. El usuario puede moverla
  luego a S1–S6. Habilidad duplicada en slots diferentes, prohibido.
- P190 introduce 'highfly_p190_save' / skillsP190, lee el viejo
  highfly_p188_save como respaldo sin modificarlo. El viejo guardado sigue
  disponible. HUD localStorage sigue usando exactamente la misma clave P812.

## HUD de seis ranuras
- S1–S4 conservan las posiciones personales. Se crean S5/S6 como botones
  nuevos y se suman a EDITAR HUD (x/y, tamaño y opacidad).
- Posiciones iniciales para pantallas horizontales: S5 x=.725,y=.395;
  S6 x=.795,y=.395; tamaño 49. S1–S4 no se restauran ni recolocan.
- ATK conserva su tamaño, joystick y botones de movilidad intactos.
- CANCELAR SKILL sigue siendo una X circular roja semitransparente y editable.
  Se monta directamente en document.body y usa z-index 119 para no quedar
  debajo de las coordenadas/FPS o del contenedor de HUD. Se oculta fuera del
  apuntado. El editor está en z-index 130, por encima de la X.

## Lanzamiento y velocidad de proyectil
- Fireball: velocidad 73 -> 34 unidades/segundo, alcance de 23 unidades,
  mantiene detección swept-sphere y daño 75. El cambio facilita ver/seguir
  la bola en su desplazamiento sin convertirla en proyectil perseguidor.
- Lanza Violeta: velocidad 65 -> 38 unidades/segundo, alcance de 17,
  conserva su daño y tipo de VFX.
- Ráfaga de energía del ATK aéreo contra dragón conserva su velocidad original
  para no alterar el minijuego de los cuatro impactos confirmados.
- Las runas siguen invocando directamente al motor de combate anterior para
  no duplicar maná, energía, cooldowns o daño. Se pasa la dirección confirmada
  desde L27 a FUS, HIELO y WULD. La validación de mana/cd ocurre sólo al soltar.

## No cambiamos
P185 mundo, NPC, quests, biomas, inventario, monstruos, portales y guardados;
L27 laboratorio independiente; FURY P16 ATK/joystick/dash/salto;
mundo hexagonal no importado; camara conservada; calidad visual sin promesas
de FPS. El problema de pantallazos negros sigue pendiente de correlación
con eventos de WebGL y la textura GLTF 404 detectada en P188.

## QA obligatoria antes de publicar
- 18 skills y 6 slots invariantes; guarda anterior importada correctamente;
  no regalo de runas, ganadas mediante wall. Pruebas Node.
- Chrome WebGL 1030×480 horizontal: los 6 botones existen y registran el
  editor; no se sobreescriben por refresh legado; Skillbook 18; S4->S6;
  aprender por misión; preapuntar/cancelar sin gasto; círculo visible sobre
  coords y FPS; guardar en clave P190 sin tocar P188.
- QA física en S23 Ultra requiere otra prueba de posición de dedos, FPS,
  escalado, distancias de cámara, latencia y VFX. NO se puede afirmar desde
  Chrome software que la calidad visual ni los FPS hayan mejorado.
- Entregar P190 mediante workflow de GitHub Pages pinneado a SHA verificado,
  sin mergear main; P189 workflow permanece como rollback.
