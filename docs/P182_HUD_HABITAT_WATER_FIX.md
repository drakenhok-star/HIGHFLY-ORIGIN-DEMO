# HIGHFLY P18.2 · HUD claro, flecha corporal y hábitat terrestre

**Versión:** P18.2 · jueves 5 noviembre 2026
**Base:** P18.1 · rama separada `p182-hud-heading-terrestrial-habitat-20261105`
**Destino de prueba (solo tras GitHub Pages success):** https://drakenhok-star.github.io/HIGHFLY-ORIGIN-DEMO/p182/?hf_p161_profile=1

## Cambios de esta tanda
1. **Eliminar textos redundantes:** se quita la etiqueta `LOBO CENTINELA` debajo del radar y el indicador permanente `P18 · Aldea inicial · SEGURA · Centinelas 0/3`. El estado interno de la zona permanece para misiones y visitas, sin aparecer como texto de depuración.
2. **Una sola misión en pantalla:** cuando el encargo de Bjorn está activo aparece arriba y centrado `✦ MISIÓN ACTIVA · CENTINELAS 0/3`; al terminar `✦ MISIÓN LISTA · VOLVÉ CON BJORN`. Antes de aceptar o después de cobrar se oculta. Los marcadores tipo C de ambas patrullas siguen **dentro del radar** y el mapamundi.
3. **Flecha turquesa del cazador:** en el mapamundi el antiguo punto se convierte en flecha y en el minimapa el triángulo sigue `player.bodyYaw` (dirección real del pecho), no `player.yaw` (cámara). No altera orientación, joystick ni lógica de combate.
4. **Lobos terrestres, no acuáticos:** los seis grupos existentes de lobos (tres normales, uno helado, dos centinelas) buscan una posición válida para **todos** los miembros. El suelo del centro y de los bordes debe estar sobre `terrain.waterY`, más margen para oleaje. Si no existe superficie válida, el sistema no inventa un spawn acuático: difiere el grupo. Respawn recuerda la ubicación seca, sin repetir el barrido. Los draugr terrestres usan la misma regla al aparecer. En persecución, vagabundeo o knockback, los mobs terrestres no pueden avanzar bajo la superficie: prueban deslizarse por la costa. El dragón volador y el jugador no cambian en esta fase.
5. **Puntos reales del mapa:** las marcas de las seis manadas se actualizan con su **hogar seco real**, no el origen viejo en el agua.
6. **Sin presión adicional a FPS:** en laderas altas se realiza una sola consulta de altura en el paso del enemigo; cerca del agua se hacen cuatro muestras adicionales. Se recicla el objeto de resultado y se reutiliza el hogar validado para evitar asignaciones y escaneos por fotograma.

## Auditoría del terreno REAL de Tianjie, semilla 1337
Evaluado en CI mediante la función original `Terrain.getHeight()`, no ejemplos ni mapas dibujados:

| Grupo | Centro seco elegido | Desplazamiento |
|---|---|---|
| Lobos norte | (120, 160) | 0 m |
| Lobos oeste | (-169, 87) | 38 m |
| Lobos sur | (126, -260) | 92 m |
| Lobos helados | (380, -150) | 0 m |
| Centinelas este | (110, 95) | 0 m |
| Centinelas oeste | (-166, 76) | 54 m |

Los nombres y posiciones de las zonas originales siguen siendo el contrato del mundo; su aparición efectiva busca suelo disponible cercano. Los datos del terreno son deterministas.

## Guardados y regresiones
- **Nuevo slot:** `highfly_p182_save`. P18.2 permite CONTINUAR desde `highfly_p18_save` de P18.0/18.1 **solo en lectura**, y si no existe, desde P16. Cada guardado hecho en P18.2 escribe solo su nueva clave. P16/P18.1 quedan intactos.
- Para ver el banner de misión activa si ya cobraste con Bjorn en P18.1, empezá NUEVA PARTIDA en P18.2; no borrará el P18.1 anterior.
- P16, P16.1, P16.3, P18.0, P18.1 y Skill Lab no se reemplazan.
- CI prueba todos los sistemas de P5–P18.1, contrato P17, seis ubicaciones secas en terreno real, bloqueos al agua, flecha corporal y guardados P182/P18/P16.

## Guía de prueba Android S23 Ultra horizontal
1. Entrar a `/p182/?hf_p161_profile=1` con CONTINUAR. Confirmar que no hay un rótulo P18 de zona ni cartel debajo del radar. Si la misión estaba cobrada, arriba no aparece misión activa.
2. Abrir MAPA; girar **solo la cámara** y luego **el personaje** con joystick/combate: la flecha turquesa debería seguir la orientación del pecho, no el giro de cámara.
3. Para repetir el encargo, usar NUEVA PARTIDA en P18.2. Hablar con Bjorn, aceptar y observar una sola barra centrada `MISIÓN ACTIVA · CENTINELAS x/3`. El radar mantiene dos marcas C y el mapa muestra la localización real de ambos grupos.
4. Visitar la patrulla del oeste (ahora sobre tierra a aproximadamente X=-166, Z=76), la normal oeste (aprox. -169, 87) y la normal sur (aprox. 126, -260). Verificar que no caminen dentro del agua al huir/perseguir. Completar la misión, cobrar y corroborar la desaparición del banner.
5. Comparar P18.1 y P18.2 en calidad FLUIDO, misma distancia/preset, FPS/P95/P99. La eficacia en GPU/táctil aún requiere pruebas reales.

## Próximo corte P18.3: diversidad ecología por bioma (propuesta)
Crear un catálogo versionado de criaturas y comportamiento, con **licencia del modelo 3D verificada por archivo, animación válida y presupuesto de NPC**: pradera (lobo, jabalí, ciervo; bandidos en caminos), bosque (araña, lobo), costa y orillas (cangrejo terrestre), nieve (lobo helado y variante de araña), ruinas/criptas (draugr y jefes). Evitar construir otro mapa vacío. Recursos MIT/CC0 o propios, jamás traer assets `With the project only` ni comerciales a Pages. Reutilizar código MIT auditado de ClaudeCraft como inspiración/adaptador de manada, aggro, loot y misiones; no copiar sistemas completos a ciegas.
