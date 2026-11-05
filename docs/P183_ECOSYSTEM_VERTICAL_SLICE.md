# HIGHFLY TIANJIE 4 — P18.3 / Ecosistema, botín y transición al agua

**Base inmutable:** P18.2.1, commit `5fd9e844c313c7d856739e5fae20a1b924a3d31e` (Pages `/p1821/`).

**Rama de trabajo:** `p183-ecosystem-loot-water-20261105`.

## Alcance REAL de este primer vertical slice

- La rama incorpora transiciones `seco -> vadeo (0.65–0.45x) -> agua profunda bloqueada` para los enemigos terrestres preexistentes. Se respeta la altura del suelo cuando vadean, en vez de hacerlos flotar sobre una superficie invisible.
- Se mantiene el sistema P18.2 de elección de territorio **seco al generar y reaparecer** (el vadeo solo modifica desplazamientos permitidos durante el juego).
- Las bolsas ya existentes muestran colores y una notificación según rareza. Las probabilidades extra se calculan al morir el lobo, lobo helado, centinela, draugr, jefe draugr o dragón.
- **Compatibilidad:** se conservan botines garantizados, oro, XP, progreso de misiones y cinemática de muerte originales. Equipamiento afecta daño/armadura de equipamiento, NO `STR/AGI/VIT/PER/INT` base.
- El guardado propio usa `highfly_p183_save`; carga el anterior `highfly_p182_save` solo como migración de lectura y no lo sobrescribe.
- `?hf_p183_off=1` desactiva la mecánica P18.3 en la rama para comparación con P18.2.1; **no desactiva el namespace de guardado P18.3**.
- Se conserva el perfil de rendimiento P16.3 (adaptación DPR). No se agregan rigs de criaturas y el saco de rareza cambia de material pero NO de cantidad de geometrías.

## NO está terminado ni se declara implementado

| Función | Estado |
|---|---|
| Jabalí (embestida) | **Bloqueado:** modelo CC0 concreto + rig/animación sin verificar |
| Araña (emboscada, veneno, telaraña) | **Bloqueado:** modelo CC0 concreto + rig/animación sin verificar |
| Bandido (huye/alerta) | **Bloqueado:** modelo/rig autorizado sin verificar |
| Bioma acuático y criaturas nadadoras | Pendiente, locomoción independiente |
| Cripta premium de 3–5 salas | **P18.4**, todavía no construida |
| Living Village | Etapa posterior |
| Enlace Pages /p183/ | **No publicado**; solo código en rama por ahora |
| Pruebas in situ (Android/S23) | Pendientes |

Ningún lobo/draugr se disfraza de jabalí/araña/bandido. No hay placeholders geométricos.
El registro `src/world/species-gate-p183.js` detiene la inclusión de especies si no se verifican tanto licencia como malla y rig.

## Por qué se ven menos nítidos los personajes en P18.2.1

Los GLB del personaje y 3 NPC no han cambiado entre `main` y `p1821` (SHA de blob idénticos). El perfil `FLUID` inicia en DPR 0.88 (o 0.72 en ECO) y el governor P16.3 baja hasta 0.70. Esto afecta nitidez general. Se observan ~30–31 FPS y p95 37–61 ms en capturas, que son mediciones de frame intervals, no directamente GPU ms. Evitar activar máxima calidad sin una comparación A/B.

**Comparación visual recomendada** en P18.2.1 actual: misma posición y cámara; registrar informe de FPS, escala DPR, triángulos; comparar `FLUIDO` vs `EQUILIBRADO+` unos momentos cada uno, sin ECO. Para comparación controlada puede añadirse `&hf_p163_auto=0`, que detiene ajustes adaptativos, sin por sí sola subir DPR inicial.

## Pruebas

```bash
node tests/p183-ecology-loot.test.mjs
for t in tests/*.test.mjs; do node "$t"; done
```

El test P18.3 comprueba transición de agua, bloqueo de profundidad, deslizamiento de orilla, una consulta de terreno en zona alta, identificadores de botín existentes, bloqueos de modelos pendientes y aislamiento del guardado.

## Próxima entrega P18.3 completa

Tras obtener archivos de modelos CC0 verificables: registrar modelos GLB de jabalí, araña y bandido; validar animaciones y escala; IA independiente por familia; spawns regionales con presupuestos de CPU y render; tablas de loot ligadas a eventos; misiones consumidoras de esos eventos. Luego avanzar a P18.4 como instancia modular con salas, puertas, cofres, miniboss, jefe final y teletransporte seguro.

**No alterar** las ramas P16, P18, P18.1, P18.2 ni P18.2.1 ni el Skill Lab.
