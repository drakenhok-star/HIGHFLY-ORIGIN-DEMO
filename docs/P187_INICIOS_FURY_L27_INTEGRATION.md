# HIGHFLY TIANJIE 5 · P187 — Inicios 1–20 + FURY L27 selectivo
2026-11-05 · rama `p187-inicios-fury-integration-20261105` · NO MERGE AUTOMÁTICO.

## Qué está realmente conectado
- Rama creada DESDE `p186-inicios-20-profesiones-mapa-v2-20261105`, que conserva
  `p185-multiworld-portals-gathering-20261105`: 8 regiones definidas, W0 jugable,
  W1 Bosque de las Cascadas todavía NO construido ni cargable.
- Transferencia examinada del PR #2: 15 habilidades de cinco familias en
  `src/skillslab/skill-catalog-export-l26.js`, puente de combate/FX en
  `src/combat/skill-bridge-p186.js`, sin boot de lab ni objetivos de entrenamiento.
- Modificaciones integradas sobre `src/main.js`, editor HUD P10 y layout P10
  SOLO para inicialización/actualización, 15 skills, cámara y botón ENFOCAR.
  Se conserva ATK FURY P16 de cuatro golpes, joystick, dash, salto y S4 WULD.
- Cámara de video: distancia 10, pitch -46°, target height 1.7, FOV 85,
  aim sensitivity .145 y deadZone 4 en el perfil. La configuración del HUD
  guardada no se pisa; layout de video opt-in `?hf_p186_video_hud=1`.
- Enfoque automático SELECTIVO sólo sobre voladores, cuatro impactos
  confirmados de ATK energético conectan al estado de descenso del dragón
  de la demo. Oculta HUD .hud-crosshair blanco sin alterar raycast/collider.
- El menú HUD ahora ofrece las 15 TARJETAS de skills, con nombre, coste
  MP/Energía, tiempo CD y etiqueta del VFX actual. Los VFX NO son finales.
- El menú HUD ofrece Pueblo de los Inicios: ocho núcleos, cinco villas,
  progresión 1–20 y las 15 profesiones con estado real de maestros.
- Primer oficio REAL enseñable en el mundo: Sigrid a partir del nivel 2
  enseña weaponcrafting + armorcrafting a través de su diálogo YA EXISTENTE;
  misiones originales de Sigrid intactas. Guardado de estado de aprendizajes
  contra la versión P187.
- Los restantes 13 maestros y cinco villas están definidos, pero todavía NO
  construidos como objetos 3D; no hay NPCs falsos ni modelos placeholder.
- `SaveSys`: NUEVA CLAVE `highfly_p187_save`; el continue importa
  `highfly_p183_save` existente si no hay guardado P187, conservando P185.
  `newGame/resetAll` limpia cooldowns/proyectiles del puente y progreso
  de profesiones, evitando contaminación de partidas. El guardado original
  no se sobrescribe al probar P187.

## Controles / pruebas a realizar
1. Entrar al juego. Validar puerto/ciudad, agua, NPC, mobs, loot, cripta,
   mapa, 360° joystick, cámara, S4, ATK nativo en carrera/aire.
2. Menú rápido -> ESTILOS · 15 SKILLS -> ver tarjetas y equipar estilo;
   S1/S2/S3 coste y cooldown en HUD, 5×3 habilidades.
3. ENFOCAR al luchar contra dragón volador; ATK cambia a energía sólo
   mientras haya volador enfocado; 4 impactos reales fuerzan descenso nativo.
4. Crear partida de nivel 2 y hablar con Sigrid -> 'Aprender herrería básica'
   -> guardar/continuar -> 'OFICIOS 1–20' indica armas y armaduras aprendidas.
5. Cargar partida previa P185 -> comprobar nivel, posición, misiones,
   inv/equipo, livingWorld. Guardar en P187, comprobar que antigua clave P183
   no cambia. Nueva partida limpia profesiones.
6. Verificar pantalla 1030x480, prueba real S23 Ultra horizontal,
   FPS 40+ objetivo, P95/P99, memoria, draw calls y respuesta táctica.
7. Retroceso del puente: `?hf_p186_off=1` debe preservar el mundo P187
   sin las skills y ENFOCAR del laboratorio.
8. No publicar Pages principal ni unir el PR con main antes de jugar manualmente
   una sesión completa y medir impacto del VFX.

## QA AUTOMATIZADO
`.github/workflows/p187-inicios-fury-qa.yml`:
- Sintaxis completa de JS.
- Tests P185 mundos, P186 fundador, P186 skills, P187 integración.
- Arranque real de Chrome headless 1030×480 y render WebGL software
  con smoke de 15 casts, estilo/UI y captura.
- Asset provenance. Se ejecuta en cada push a la rama P187.

**Limitaciones HONESTAS de QA:** Chrome software y test de cast no demuestran
precisión de todos los golpes contra monstruos en movimiento, ni rendimiento
GPU real, ni gesto manual con pulgar en Samsung. El sistema de preapuntado
con líneas/cono/círculo editables y CANCELAR del laboratorio requiere una
auditoría de interacción adicional antes de considerarlo importado por completo.
Los builds L27 del laboratorio siguen independientes.

## Derechos
Sólo código MIT y arte CC0 verificable. No se importan ZIP de KayKit SOURCE,
arte 'with the project only', audio/texturas terceros, escena boot del lab ni
contenido privado a GitHub Pages.
