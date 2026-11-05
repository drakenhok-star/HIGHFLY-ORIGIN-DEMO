# HIGHFLY P18.1 · Corrección de radar, misiones, recompensa y avisos negros

**Base:** P18.0 jugable `/p18/`, conservado como respaldo. **Nueva rama:** `p181-frontier-radar-rewards-20261105`. Publicación independiente `/p181/` al pasar CI. Skills LAB independiente sin cambios.

## Reproducción y causa
- **Radar P18 no visible:** `src/ui/world-map-p34.js` permitía rastrear exclusivamente `q1,q2,q3`. P18 añadió `p18_frontier` al diario, pero no a `trackQuest()` ni `missionPosition()`. Además la misión tenía un solo objetivo de lobo, sin dibujar sus dos zonas ni etiquetas propias.
- **Ficha de recompensa vacía / potencial panel oscuro:** `src/ui/p9-panels.js` tenía el diccionario `REWARDS` solo para `q1,q2,q3`; al seleccionar `p18_frontier`, `info` podía quedar `undefined` y `info.gold` lanzaba una excepción de JS. Se agregó metadata de recompensa autoritativa desde el catálogo de misiones; el ? se reserva para secretos expresamente marcados.
- **Recuadros negros intermitentes:** `SaveSys.update()` llamaba a `save()` (muestra «Partida guardada») y acto seguido a otro aviso «Guardado automático», con **dos notificaciones oscuras cada 60 segundos**. El pilot P18 también guardaba con aviso al aceptar, matar cada centinela y entregar. Ahora el guardado automático e hitos de misión son silenciosos, sin desactivar la persistencia. Guardado manual explícito mantiene una confirmación.
- **Parpadeos negros de pantalla completa:** en el video recibido (~60 s) no se detectaron segmentos sostenidos de pantalla completamente negra mediante revisión visual/blackdetect. El oscurecimiento al abrir MAPAMUNDI es intencional. No afirmar que un problema de contexto WebGL/GPU esté resuelto sin observarlo o reproducirlo en el Samsung. Si vuelve a pasar con el mapa cerrado y sin notificaciones, recoger segundo del video, preset GPU, FPS/P95 y `window.highflyP18Report()`.

## Nuevas reglas
- Nueva misión distinguida en UI: **Lobo centinela · Este/Oeste**, dos zonas + dos marcadores tipo diamante «C» aun fuera del rango visible del radar, con fallback a centro de zona durante respawn. Al completar, marcador al NPC **Bjorn**.
- Etiqueta flotante compacta debajo del radar: `✦ LOBO CENTINELA · ESTE/OESTE · 0/3` → `ENTREGAR · BJORN`. Seguir en el mapa y diario también funciona; auto-pinned tras aceptar o recuperar el guardado.
- Centinela alfa y explorador con nombre y `speciesId='wolf_sentinel'`, distinto de la especie `wolf`; **no cuentan para la misión normal de Olaf**, pero sí para la nueva de Bjorn. Se conservan combat `e.type='wolf'`, modelo Quaternius CC0, drop base y animaciones, para no romper el movimiento.
- Recompensa pública de Bjorn y en el menú de Misiones: **75 oro + 60 XP**. Se cobra una sola vez al entregar. Las misiones realmente secretas pueden mostrar `?`, pero no se ocultan recompensas ordinarias.

## Paso a paso (Android horizontal)
1. Abrir `/p181/?hf_p161_profile=1` en el mismo Samsung, continuar partida P18 si existe (usa `highfly_p18_save`).
2. Hablar con **Bjorn**; antes de aceptar, leer la recompensa **75 oro + 60 XP**.
3. Aceptar y mirar el radar: dos rombos C. En MISIONES seleccionar `Centinelas de la frontera` → `VER EN EL MAPA`; verificar la posición Este/Oeste.
4. Ir al centinela, matar tres de las dos patrullas; comprobar 1/3, 2/3, 3/3; no debe contar el lobo original para la misión de Bjorn. Tampoco los centinelas para Olaf.
5. Cuando está lista para entregar, el radar apunta a Bjorn. Entregar, recibir recompensa y guardar.
6. Probar durante dos minutos con mapa cerrado: no deben aparecer avisos oscuros duplicados cada minuto. Si hay pantalla negra completa, registrar segundo exacto y reporte.
7. Comparar FPS/P95 P18.0 vs P18.1. Ninguna mejora de rendimiento se atribuye a esta tanda, solo funcionalidad y eliminación de avisos.

**Pruebas:** regresiones P5–P18, test `p181-radar-rewards.test.mjs` con 2 zonas, offscreen, respawn, selección, renderer P9 sin excepción, XP/oro, auto-guardado silencioso y especie separada. Licencias y modelos preservados.

**Rutas:** https://github.com/drakenhok-star/HIGHFLY-ORIGIN-DEMO/actions · https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/p18/ (respaldo) · https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/p181/ (nueva una vez publicada).
