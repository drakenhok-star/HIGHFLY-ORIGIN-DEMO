# HIGHFLY TIANJIE · P16.3 FPS / ms (Samsung S23 Ultra horizontal)

## Propósito
Segunda tanda de rendimiento tras P16.1. Mantiene P16 estable en /p16/ y P16.1 en /p161/. **No incluye** la rama paralela de giro P16.2 ni cambios al repositorio FURY-SKILL-LAB.

## Cuatro mejoras coordinadas, sin tocar lógica RPG, movimiento ni input
1. **Agua plana liviana en GPU FLUIDO/AGUA/EQUILIBRADO+:** sustituye solamente la geometría renderizada de 224×224 (100.352 triángulos) por 24×24 (1.152 triángulos), un 98,85% menos triángulos **del agua**. La geometría y shader originales se restauran automáticamente en GPU ALTA. Las ondas Gerstner originales no operaban en modo agua lite.
2. **Menos posprocesado inútil:** en GPU EQUILIBRADO+ con bloom desactivado, render directo igual que FLUIDO. GPU ALTA/AGUA conserva el compositor.
3. **Resolución dinámica acotada:** en móvil, con FLUIDO/EQUILIBRADO+, si durante al menos 84 muestras el FPS sostenido es menor a 39 y P95 supera 27ms, baja DPR 0,08 con intervalo mínimo de 6,2s. Piso 0,70, techo resolución del preset. Sube solo si FPS >=55 y P95 <21ms. Desactivado en ECO 30fps, menú y preset ALTA. No cambia física/dt ni la lógica de gameplay. No promete 60 FPS si el cuello es CPU/temperatura.
4. **LOD lejano del césped:** a 0–30m mantiene 100% de plantas; a 30–44m 90%, a 44–56m 66%, a 56–66m 35%, más lejos 0%, donde el shader original ya lo hace transparente. Reutiliza el sistema progresivo de P16.1 y el hash determinista, preservando estabilidad de la posición de cada planta visible. Reduce aproximadamente 30% de instancias en terreno uniforme, dependiendo de colisiones/bioma. No modifica colisionadores.

El propio juego ya empieza en modo GPU FLUIDO. P16.3 activa césped y terreno en tareas con presupuesto por defecto; sigue aceptando la configuración de consulta anterior.

## Comparación en el mismo Samsung y misma zona
- P16.1 optimizado: `/p161/?hf_p161_profile=1&hf_p161_grass=1&hf_p161_terrain=1`
- P16.3 nueva tanda completa: `/p163/?hf_p161_profile=1` (activar por defecto)
- P16.3 sin el governor: `/p163/?hf_p161_profile=1&hf_p163_auto=0`
- P16.3 sin LOD de césped: `/p163/?hf_p161_profile=1&hf_p163_grass_lod=0`
- P16.3 sin terreno/grass progresivos: `/p163/?hf_p161_profile=1&hf_p161_grass=0&hf_p161_terrain=0`
- P16.3 sin todos los cambios (baseline P16.1): `/p163/?hf_p161_profile=1&hf_p163_off=1` **además** pasar `hf_p161_grass=1&hf_p161_terrain=1` para comparar con P16.1 optimizada.

Medir condiciones similares: 3 recorridos de 3 minutos en misma región, con cámara girando y combates, temperatura y batería similares, mismo preset FLUIDO, ECO apagado. Copiar `window.highflyP161Report()` o usar «COPIAR DATOS» del panel de rendimiento y comparar FPS, P95, P99, draw calls y DPR. `window.highflyP163Report()` informa los ajustes de resolución y triángulos del agua.

**Importante:** pruebas de Node/Actions verifican funcionamiento y regresiones pero **no** representan benchmarks GPU reales del S23 Ultra. Cualquier mejora de FPS debe medirse en el teléfono antes de declararla comprobada.

## Próxima fase: crecimiento de mundo
Después de validar P16.3, crecer mediante streaming por sectores de terreno y biomas, NPC/monstruos por cercanía, distancia de dibujo dependiente del bioma y presupuesto de entidades. Construir primero pruebas de mapas/mazmorras para no romper lo que ahora funciona.
