# HIGHFLY TIANJIE P188 · Skills RPG, apuntado real, interfaz y diagnóstico
Fecha: 2026-11-06. Referencia visual: video de 2m21s proporcionado por el jugador.
Base: P187 (incluye P186 Inicios, P185 MultiWorld y FURY P16 intactos).
Rama: p188-fury-aim-unlock-mobile-ui-20261106 (NO se fusiona a main).

## Diagnóstico del video
- Pantalla 2316×1080 horizontal; gran campo verde, HUD y menú en pantalla.
- 25–30 FPS frecuentes, P95 ~60–77 ms. El rendimiento de 40–120 FPS en S23 Ultra
  sigue siendo una META, no algo demostrado en el video.
- Alternancia de etiquetas y candados S1–S3: PremiumHudP5.refreshHeader (cada
  300 ms) sobrescribía las etiquetas del puente FURY (cada ~350 ms). La
  sincronización generaba titileo y confusión.
- P186.casts gastaba recurso/CD en pointerdown sin mostrar preapuntado real.
- Las 15 skills estaban accesibles por elegir uno de 5 estilos en el menú, sin
  aprendizaje ni recompensas RPG.
- El menú de skills de 330px y el de oficios de 640px eran mucho más chicos que
  la mochila nativa (97.5vw×95vh en P810).
- En el video suministrado no se pudo atribuir con certeza el pantallazo
  transitorio a WebGL context loss, shader compilation, swapchain o cámara:
  no atribuir una causa sin datos de dispositivo.

## P188: mecánica de skills
El estado de personaje es skillP188 (versión 188), con 15 ids canónicos L26:
- sin descubrir: la biblioteca muestra una ficha de origen sin concederla,
- descubierta: misión real entregada; aparece APRENDER,
- aprendida: la habilidad es del personaje; aparece EQUIPAR S1/S2/S3,
- equipada: la ranura ejecuta la skill real, con coste, CD, animación, VFX.
No existe una opción de conceder las 15 por abrir el catálogo, cambiar estilo
o subir de nivel. Tres ranuras pueden mezclar estilos, pero no duplicar skill.
S4 WULD, salto, dash, ATK, 4º golpe y joystick son nativos FURY P16.

Recompensas existentes y RETROACTIVAS según progreso guardado:
- q1 Amenaza de lobos (Olaf) → woc_fireball.
- q2 Espada ancestral (Sigrid) → tig_iron_wave.
- p18_frontier (Bjorn) → dyr_fury_slashes.
- q3 Amenaza del dragón (Olaf) → guin_violet_lance.
Los otros once ids están marcados como FUTUROS en
src/combat/skill-progression-p188.js con su origen/quest ficticia de diseño:
NO están actualmente obtenibles, y los jugadores no recibirán poderes falsos.
Agregar su reward hook sólo cuando exista y se pruebe su misión verdadera.

Los guardados se almacenan bajo \`highfly_p188_save\`. Si no existe, se importa
\`highfly_p187_save\`, y luego continúa el fallback P183/P185. La importación
detecta quests entregadas para descubrir sus recompensas legítimas, nunca
aprenderlas/equiparlas automáticamente. No se sobrescribe la clave previa.

## Apuntado reproducible y confirmación
- Mantené S1/S2/S3: preview 3D real del tipo correspondiente (línea direccional,
  cono con ángulo verdadero, círculo objetivo, círculo propio).
- Arrastrá dedo con movimiento del personaje independiente: dirección calculada
  desde la cámara y el delta de gesto, 360°.
- Soltá: validación y lanzamiento; SOLO ahí se consume recurso y comienza CD.
- Arrastrá hasta CANCELAR o tocá CANCELAR con otro dedo: se cancela sin coste.
- Cancelar durante cambio de estado (inventario, pausa, guardar) no lanza nada.
- Recast S2 conserva la segunda ventana y no cobra recurso/CD por duplicado.
- Dragón aéreo ENFOCAR y cuatro impactos confirmados no se retocaron; siguen
  usando su FSM original de aterrizaje, hay que validar en móvil real.
- Los 15 VFX actuales todavía son provisionales; el laboratorio L27 no se toca.

## Menú / HUD
La navegación rápida sigue con cuatro áreas, pero abrir HABILIDADES u OFICIOS
utiliza la estructura REAL del inventario grande #hf-p5-overlay .hf-p5-panel:
97.5vw por 95vh con lista desplazable y detalle lateral. Mismo CERRAR, misma
cámara/bolsa/guardado; HUD editable intacto. El libro de skills separa
origen, coste, estado, aprender y equipar. No se crea una 3ª ventana pequeña.
Las etiquetas S1–S3 tienen un único escritor; el HUD nativo sigue con S4.

## Pantallazo negro: detección antes de atribuir
Un watcher no invasivo escucha webglcontextlost/webglcontextrestored,
restablece tamaños tras recuperación y registra APP_ERROR/UNHANDLED_PROMISE
sin borrar partidas ni forzar recarga. Su resumen va al reporte móvil
COPIAR DATOS como p188Gpu. Si el negro reaparece, guardar ese reporte
y el momento del gesto para ver la causa verdadera; no inferirla del video.
NO se afirma que este monitor cure todas las causas de pantalla negra.

## QA y riesgos
- tests/p188-skill-progression.test.mjs — 15 bloqueadas, 4 misiones reales,
  descubrimiento separado de aprendizaje, equipamiento de 3 ranuras, save.
- scripts/p188-browser-smoke.mjs — Chrome WebGL software, 1030×480 táctil,
  con mundo de P185, preview 3D, cambio dirección, cancelar, confirmar MP/CD,
  etiquetas sin sobrescritura, panel grande, profesiones y guardados.
- .github/workflows/p188-skill-rpg-qa.yml — ejecución automatizada.

Una prueba headless NO equivale a comprobación táctil/FPS en Samsung S23 Ultra;
es necesario probar jugador móvil real, dinosaurios/dragón, 15 VFX,
context loss, orientación y giros complejos. No crear pueblos falsos.

## Recuperación
- Rama P187: p187-inicios-fury-integration-20261105 (sin cambios).
- L27 permanece independiente.
- Rama P188: cambios aquí y PR draft, sin modificar main.
- Para publicar en GitHub Pages, usar un workflow main con checkout a SHA
  P188 QA-verificado. No fusionar el código a main; conservar el workflow
  P187 previo para rollback.
