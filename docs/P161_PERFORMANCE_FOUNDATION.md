# HIGHFLY P16.1 — Performance Foundation (aislada)

**Fecha:** 2026-11-05  
**Rama:** `p16-1-performance-foundation-20261105`  
**Base congelada:** `p16-fury-hitconfirm-20261105` @ `a83e7993d84da33c8d0792277c08d69a56bd1906`  
**Dispositivo objetivo:** Samsung S23 Ultra, Android horizontal  
**Estado:** auditoría estática verificable + telemetría instrumental; **sin benchmark físico todavía**.  
**No tocar:** rama P16 publicada, rama P17 RPG, laboratorio independiente de skills, Joystick/ATK/DASH/salto/targeting.

## 1. Hallazgos verificables leyendo P16 (NO son tiempos medidos)

| Zona | Evidencia del código | Riesgo y cómo confirmarlo |
|---|---|---|
| Water HIGH | `src/world/water.js` `update()` ejecuta `_renderDepth()` + `_renderReflection()`, cada una con `renderer.render(scene, camera)`; `src/ui/performance-p2.js` las evita en calidad de agua ligera | Alto riesgo de coste GPU/draw calls en ALTA; comparar mismos puntos ALTA vs AGUA a igual DPR |
| Césped | `src/world/scatter.js`: `GRASS_COUNT=36000`, `InstancedMesh` y `frustumCulled=false`; movimiento >7 unidades reconstruye matrices/colores de instancias, con recorrido amplio de celdas | Posibles picos CPU, transferencias a GPU y overdraw; medir `scatter` y P99 durante travesía |
| Terreno | `src/world/terrain.js`: CHUNK=200, RES=96, VIEW_RADIUS=2, BUILD_PER_FRAME=3; `_buildChunk` calcula altura, pendiente, colores y normales de la geometría sincrónicamente | Posibles picos al entrar en regiones nuevas; medir `terrain` y comparar movimiento continuo vs estático |
| NPC y enemigos | `src/entities/npc.js` actualiza todos los NPC cada frame; `src/entities/enemies.js` recorre enemigos, corta lógica terrestre a 260 unidades, dragón y loot por caminos separados | Escala de IA insuficiente para ciudad grande; instrumentar `npcs` / `enemies`; no reducir hit-confirm cercano |
| Perfil visual | `src/main.js` crea renderer con DPR máximo 2 y Bloom+Output; `src/ui/performance-p2.js` inicia en FLUID, baja DPR y evita bloom/sombras | Riesgo fill-rate; comparar ALTA/AGUA/EQUILIBRADO+/FLUIDO con resolución anotada |
| Limitador ECO | `src/main.js` omite frames para imponer ~30 FPS si ECO está activo en móvil | No usar ECO al evaluar objetivo 60/90/120 FPS; informar activación en cada reporte |
| Métricas actuales | `src/ui/mobile-audit.js` da FPS/P95 con últimos 120 intervalos, render CPU aproximado y estadísticas renderer; `src/ui/perf-probe-p6.js` da CPU de grupos y P95 de 160 muestras | Faltaban P99 largo y secciones individuales. P16.1 agrega telemetría de 1800 muestras por métrica. GPU exacta sigue **sin medir** |

## 2. Qué hace el cambio P16.1 inicial

- **Opt-in:** añadir `?hf_p161_profile=1` al URL de la rama P16.1 en un servidor de pruebas.
- P16.1 no modifica el ritmo del loop, lógica de combate, movimiento, entidades, calidad ni el render.
- Mide intervalos entre callbacks `requestAnimationFrame`, P50/P95/P99/media/máximo, tiempo de CPU del loop y secciones **water, terrain, player, combat, effects, enemies, npcs, scatter, render**.
- Registra picos de draw calls y triángulos (suma de pasadas), conteo de recursos de Three.js, cap ECO, calidad y resolución real del canvas.
- Captura long tasks si Chrome soporta `PerformanceObserver` con entrada `longtask`.
- El botón existente **COPIAR DATOS** exporta un JSON con `p161`. En consola: `highflyP161Report()`; para reiniciar muestras `highflyP161Reset()`.
- **Precisión:** los intervalos rAF incorporan VSync, scheduling y posibles bloqueos; `render` es tiempo CPU de entrega de comandos, NO tiempo GPU. No se atribuye causalidad GPU sin trazas/perfil GPU aparte.
- Se guarda una ventana circular de hasta 1800 muestras (no hay `shift()` por frame). No transmite datos a servidores.

## 3. Protocolo obligatorio para el S23 Ultra

**Mantener constantes:** orientación horizontal, brillo, navegador/versión, resolución del teléfono, tasa de refresco, preset, carga eléctrica/temperatura aproximada, punto de inicio, recorrido, cantidad de enemigos, y ECO apagado. No comparar presets con DPR distinto como si el cambio fuese exclusivamente el agua.

1. Ejecutar P16 original y P16.1 con mismo nivel de calidad y misma escena. Verificar primero que la jugabilidad de P16 no cambió.
2. Dar 60–90 s para estabilización/calentamiento y carga; reiniciar con `highflyP161Reset()` antes de cada captura de P16.1.
3. Registrar 60–90 s por escenario y repetir al menos 3 veces. Copiar JSON. Anotar versión, temperatura aproximada, calidad, ECO y fecha.
4. Escenarios: (A) aldea quieta con cámara en movimiento; (B) sprint por césped y transición de chunks; (C) costa con agua en cuadro; (D) pelea con varios enemigos, dash y combo confirmado; (E) carga de zona nueva/retorno; (F) 10–15 min continuo para throttling. En fases posteriores: ciudad densa, dungeon, biomas y NPC numerosos.
5. Comparar fps, P95, P99, máximo, secciones CPU, render calls y comportamiento térmico. Capturar perfiles de Chrome DevTools remoto/Perfetto cuando aparezcan picos. No confundir trazas GPU con JS CPU.
6. Registrar cada experimento con mismo procedimiento en `audit-output/` **solo en máquina de pruebas** hasta revisión de privacidad; no publicar rutas personales ni datos sensibles.

**Umbrales de aceptación propuestos** (objetivos, NO resultados):
- 60 FPS: media próxima a 60, P95 de intervalo de fotograma hasta ~18.5 ms, P99 hasta ~25 ms en escena estándar, sin congelamientos de 50+ ms recurrentes.
- 40 FPS provisionales en estrés: frame medio hasta 25 ms y P95 objetivo <=27 ms; la estabilidad y la respuesta táctica importan más que picos altos de FPS.
- 90/120 FPS: metas condicionales a pantalla, configuración del S23 y disponibilidad de recursos térmicos; presupuestos 11.11 / 8.33 ms.
- Ninguna optimización se integra si produce regresiones en joystick 360°, input multitáctil, movimiento+ATK, combo únicamente por impactos confirmados, dash/salto, guardado o calidad KayKit sin opción.

## 4. Arquitectura grande por etapas medibles

**P16.1-A Observabilidad (esta entrega):** benchmark reproducible + P95/P99 por sector, baseline antes de optimizar. Feature flag opt-in.

**P16.1-B Render inteligente:** agua reflejada solo cuando aporta valor visual y con cadencia/resolución adaptativas; separar agua de DPR y sombras para A/B confiable. Considerar caché temporal si no introduce artefactos. Preservar AGUA/ALTA originales como opciones reversibles.

**P16.1-C Vegetación por regiones:** sustituir una reconstrucción masiva de 36k matrices por lotes por celdas (tiles) visibles; un `InstancedMesh` por grupo compatible/material y nivel de distancia; caché reutilizable y actualizaciones parciales. Frustum + distancia + hysteresis. No convertir árboles, césped o casas en placeholders geométricos.

**P16.1-D Streaming del terreno:** trabajos de construcción en cola con presupuesto máximo de ms por frame, precarga anticipada, geometría compartida o LOD por distancia, cache/unload con `dispose` correcto y costuras sin choque físico. No mover generación dependiente de Three.js al worker a ciegas; se puede calcular solo datos puros en worker y montar la geometría en hilo principal.

**P16.1-E Simulación escalonada:** enemigos/combate en radio cercano continúan con la fidelidad de P16; NPC y vida cotidiana lejanos a 5–10 Hz o simulación resumida; animación visual interpolada cuando visible. Prioridad a alcance real, aggro, hit-confirm, respuesta de ataques y comportamiento de quest. Sistema de prioridad por distancia, relevancia e interacción, no simple pausa de IA.

**P16.1-F Assets/FX:** pool de partículas/proyectiles, memoización y límite de draw calls, materiales compartidos donde no haya mutabilidad por instancia, carga diferida y análisis de GC/long tasks. Mantener identidad y animaciones originales KayKit.

**P16.1-G World Region Manager:** manifiesto de regiones, centro de interés, activos visibles, NPC abstractos en región descargada, persistencia/respawn, inventario y quest con identificadores estables. Puentes contractuales con P17 RPG y Training Core v0.4 / Blueprint v0.7 **después** de pruebas; no copiar la lógica P17 ni reescribir combate en esta rama.

Cada experimento: **baseline -> una variable controlada -> 3 corridas -> delta P95/P99 -> regresiones -> conservar/revertir**. Es una optimización integral con checkpoints, no una pila de cambios improvisados.

## 5. Guardrails y promoción

- P16 y P17 nunca se reescriben ni reciben cambios de este experimento.
- CI de la rama P16.1 debe validar sintaxis, P16 hit-confirm y la batería previa de tests, además del nuevo profiler. Smoke móvil emulado ayuda, pero **no reemplaza** un S23 Ultra físico.
- Si falla una regresión o el perfilador distorsiona el resultado, desactivar `hf_p161_profile` y volver al commit base.
- No fusionar a rama de publicación ni activar despliegue automático durante medición.
- ClaudeCraft 0.44.7 se consulta **solo** como biblioteca de módulos/código y activos de procedencia confirmada MIT/CC0. Recursos privados, "with project only" o KayKit SOURCE comercial no se suben a este repositorio público.

**Hito para comenzar optimizaciones B–G:** informe BASELINE_P161_S23 con al menos 3 corridas por escenario, rango térmico y presentación de qué sector produce los 3 peores picos. Sin esto, cualquier mejora en FPS sería una conjetura.

## 6. Primera implementación experimental P16.1 — progresiva, aislada y reversible

**Implementada en la rama experimental, destinada a publicarse en la MISMA GitHub Pages de HIGHFLY-ORIGIN-DEMO bajo /p161/ tras pasar CI.** Cada mejora se activa mediante URL del futuro **Pages de laboratorio** y no cambia el juego al abrir la página sin banderas:

| Parámetro de la URL | Prueba | Qué cambia |
|---|---|---|
| `hf_p161_profile=1` | Solo telemetría | Añade P50/P95/P99 por sistema y reporte `experimentalGrass`/`experimentalTerrain`. |
| `hf_p161_grass=1` | Césped por frames | Sustituye reconstrucción bloqueante por barrido de celdas temporizado con doble `InstancedMesh`, conservando césped anterior hasta intercambio completo. |
| `hf_p161_terrain=1` | Chunks por frames | Calcula exactamente los mismos vértices/colores en lotes limitados; conserva chunk central inmediato y preprocesa vecinos en el menú. |

Ejemplos de configuraciones **en la ruta /p161/ del sitio HIGHFLY-ORIGIN-DEMO**, nunca en la P16 publicada:
- BASE: `?hf_p161_profile=1`
- CÉSPED: `?hf_p161_profile=1&hf_p161_grass=1`
- TERRENO: `?hf_p161_profile=1&hf_p161_terrain=1`
- AMBAS: `?hf_p161_profile=1&hf_p161_grass=1&hf_p161_terrain=1`

**Comparación indispensable**: P16.1 BASE vs CÉSPED vs TERRENO vs AMBAS, mismo recorrido, misma calidad FLUIDO, ECO apagado, mínimo tres corridas. El benchmark en S23 decide si se conservan los cambios.

Observaciones de ingeniería:
- La reconstrucción del césped ahora usa dos buffers geométricos para evitar mostrar un campo a medio preparar. Aumenta memoria y puede demorar la aparición inicial del césped; se precalienta durante el menú y se cancela trabajo obsoleto ante teletransportes. El reporte informa recuento y duraciones.
- El chunk de terreno central es inmediato; los restantes aparecen progresivamente. La generación de normales y la subida de buffers siguen siendo operaciones finales que pueden introducir picos: **no se declara rendimiento garantizado**.
- Los valores `lastBuildMs` / `lastChunkMs` son duraciones de pared **incluyendo frames intermedios**, no sumas de CPU. Para trabajo de CPU por frame, comparar las secciones `scatter` y `terrain` en `timingsMs`.
- Testeado mediante ejecución aislada de los algoritmos sin GPU: correspondencia del barrido de celdas, intercambio doble-buffer y coincidencia exacta de los 9409 vértices y colores por chunk. CI GitHub y S23 siguen pendientes de confirmación, no se afirma aprobación.
- P16 `_rebuildGrass`, P16 `_buildChunk` y el límite de 3 chunks por frame permanecen en la ruta normal de ejecución.

**Protección entre proyectos:** la demo sirve /p16/ (backup) y /p161/ (nueva experimental) EN SU MISMA GITHUB PAGES mediante main. El Skill Lab mantiene otro repositorio y otra Pages. No modificar /p16/ ni desplegar P16.1 en el Skill Lab.

**Ruta de publicación correcta:** https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/p161/ (requiere verificar primero que GitHub Actions haya desplegado). Backup https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/p16/. No utilizar Codespaces ni un nuevo Pages para este experimento.
