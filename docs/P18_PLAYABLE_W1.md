# HIGHFLY P18.0 — primera demo jugable de Living World · 2026-11-05

## Estado de la versión
Primer **corte vertical jugable** del Living World sobre la base optimizada P16.3, sin reescribir controles, combate, terreno, agua ni entrenamiento.

Se publicará como `https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/p18/?hf_p161_profile=1` **solo después de superar CI y GitHub Pages**.

Backups preservados en /p16/, /p161/, /p163/ y ramas dedicadas. Skill Lab en su repositorio separado, sin cambios.

## Para probar (S23 Ultra horizontal)
1. Abrí /p18/ y elegí NUEVA PARTIDA. Aparecerá una pista inicial: **«Hablá con Bjorn»**.
2. Buscá a **Bjorn** cerca de la aldea (aproximadamente X=-5, Z=46). Usá el botón USAR / la interacción habitual.
3. Aceptá **«Centinelas de la frontera»**. Se añade como objetivo al diario de misiones existente y aparece una marca de destino en la brújula.
4. Encontrá las dos manadas nuevas: **Frontera oriental** (aprox. X=110, Z=95) y **Sendero occidental** (X=-112, Z=76). Cada una tiene un centinela mayor y un explorador. El alfa es más grande, más fuerte y avisa a su compañero al ser atacado. Se reutiliza el modelo de lobo Quaternius CC0 ya usado en P16.3; **no hay modelos inventados ni placeholders**.
5. Matá **tres lobos de estas nuevas manadas**. Los lobos originales siguen funcionando, dan XP y botín con las reglas existentes, pero no cuentan para la misión nueva de Bjorn. Los lobos de frontera sí cuentan para la misión original de Olaf si está activa, sin alterar las recompensas originales.
6. El marcador vuelve a señalar a **Bjorn**. Entregá la misión y recibí **75 oro + 60 XP**, una sola vez. Podés salir y continuar gracias al guardado P18.
7. Explorá las regiones: un indicador muestra zona y si es segura. Sigrid trabaja durante sus horas de actividad y Bjorn deambula durante las horas diurnas; las actividades nocturnas todavía **no** incluyen caminar por interiores ni navegación A*.
8. Expandí el panel FPS y tocá **COPIAR DATOS**: ahora el JSON incluye `p18` (zona, manadas, misión, NPC) además de `p163` (resolución, agua), para comparar carga gráfica y ms.

## Resumen de contenido jugable real
- **2 áreas nuevas**, que amplían el registro a 11 regiones.
- **4 enemigos nuevos** repartidos en dos manadas de 2. No se agregan especies visuales: son variantes del lobo ya aprobado.
- **IA de aviso de manada**, limitada por proximidad/pack; retorno al hogar, no persecución hacia la ciudad segura.
- **1 misión completa** con diálogo, brújula, diario, recompensa única, persistencia.
- **Horario diurno básico de NPC** sin teletransportes ni clipping artificial.
- **Guardado nuevo** `highfly_p18_save` que puede importar el guardado `highfly_p16_save` solo para lectura; **no lo sobrescribe**.
- **Medición P18** integrada al botón COPIAR DATOS.
- **No** se modifican equipamiento, base STR/AGI/VIT/PER/INT, Fitness Core ni Laboratorio FURY.

## Preservar fps
Solo cuatro modelos adicionales, sin mallas geométricas de sustitución. Ninguna entidad nueva se debe agregar sin revisión de FPS/P95/P99, draw calls, memoria, latencia del joystick y caída de rendimiento tras 10 min. Base P16.3: césped LOD, agua lite, terreno budgeted y DPR dinámico siguen activados.

Comparación:
- P16.3: `/p163/?hf_p161_profile=1`
- P18 jugable: `/p18/?hf_p161_profile=1`
- P18 sin nuevas mecánicas (modo diagnóstico): `/p18/?hf_p161_profile=1&hf_p18_off=1` (permanece namespace de guardado P18).
- Reporte: botón COPIAR DATOS en HUD rendimiento, o `window.highflyP18Report()` desde consola.

## Qué falta para un Living World completo
Nuevos modelos CC0 (jabalí/ciervo/goblin/araña), patrullas NPC con navegación A* y colisiones, fauna pasiva, profesiones, economia de comerciantes, eventos dinámicos persistentes, IA LOD para muchos actores, mazmorras procedurales. Son **fases posteriores**, no están implementadas en esta entrega.

## Fuente de inspiración y licencias
Lógica propia adaptada a estructuras existentes HIGHFLY. Referencias auditadas de código MIT de ClaudeCraft 0.44.7 documentadas en `P18_LIVING_ECOSYSTEM_CLAUDECRAFT_AUDIT.md`. Solo se han usado modelos ya incluidos en la demo CC0, sin extraer assets de ClaudeCraft ni KayKit SOURCE comercial. Cambios de esta tanda no copian archivos de ClaudeCraft como módulos completos.

## Pruebas y aceptación
- Full P5–P16 + P16.1 + P16.3 regression suite.
- P17 RPG contract.
- P18 registry + ecology.
- **P18 playable integration test:** aceptar → matar tres → regresar/recompensa única, guardado P18/P16, localización, quest journal/compass.
- Checklist real Android: calidad, desaparición de rigs, movimiento de manada, NPC, mandos, audio, guardado, FPS y picos P95/P99.
