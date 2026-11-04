# HIGHFLY · Biblioteca congelada de habilidades para futuras fases

Fecha de incorporación: 2026-11-04.
Fuente principal: World of ClaudeCraft v0.44.7, commit 493c35a108cef6c8aa290e8793107b1cd117886e.
Documentación provista por Draken: 410 definiciones de habilidades en 9 clases, y 100 referencias externas separadas.
Estas fichas incluyen IDs, clases, niveles, costes BASE, casts, cooldowns, alcance, target y apuntado HIGHFLY propuesto, efectos, VFX y rutas de definición.

**ESTADO: biblioteca de investigación, no habilidades importadas al juego ni assets VFX licenciados.**
Los campos 'Recurso HIGHFLY', 'Apuntado HIGHFLY' y 'Tratamiento VFX' son propuestas, NO valores del código original.
El código MIT no habilita redistribuir GLB, iconos, audio y VFX externos sin comprobar su licencia.
No integrar materiales 'with the project only', exclusivos, NC o de licencia dudosa.
Los archivos externos listan 100 referencias de VFX/procedimientos, no 100 skills RPG plenamente implementadas.
P14 NO agrega skills; sólo guarda estos datos y preserva P13 + P812.

## Archivos
- `claudecraft_0447_410.csv`: 410 registros con 28 columnas.
- `externas_100.csv`: 100 referencias externas con 9 columnas.
- Libro XLSX y JSON completos permanecen adjuntos en la conversación que proporcionó la auditoría.

## Criterios antes de habilitar cada skill
1. Revisión de fuente exacta en 0.44.7 y licencias de assets usados.
2. Clasificar melee/medio/largo/buff, objetivo/skillshot/área y consumo MP/Energía.
3. Identificar clip real para el rig actual; fallback visual sólo si pasa QA.
4. Definir activación, coste, cooldown, cancel windows, tierra/aire/parkour y daño/estado.
5. Diseñar VFX de coste móvil conocido, línea/cono/círculo y cancelación.
6. CI + pruebas en Samsung S23 Ultra antes de liberar a jugadores.
