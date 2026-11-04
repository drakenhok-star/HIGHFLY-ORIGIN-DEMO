# HIGHFLY P6 Integral — combate y movimiento (rama aislada)
2026-11-04 · Demo MIT/CC0 pública · No incluye KayKit SOURCE ni binarios nuevos.

## Alcance del código
- Mantiene Tianjie5, mundo procedural, tres recursos, misiones, loot, enemigos y FLUIDO.
- Joystick analógico relativo a la orientación de cámara, subpasos contra casas y pozo en dash, evasión direccional, salto doble con clip Jump_Idle existente, cámara que ajusta distancia cuando detecta terreno/colliders.
- Auto-target frontal con prioridad de proximidad y visibilidad, objetivo manual: FIJAR, SIG., ✕ (PC L, R, X). No apunta automáticamente a enemigos a través de casas/terreno.
- Ataques 1–2–3–4 con ventana de combo, cuarto daño reforzado y animación alterna **solo si el clip está en el GLB**; en caso contrario usa el ataque Diagonal real. La auditoría real del GLB validó **Diagonal / Horizontal / Stab / Chop**, además de **Dodge en cuatro direcciones** y **Jump_Full_Short**. Movimiento sigue simulándose durante el ataque, sin prometer upper/lower body layering.
- Magia: proyectil al objetivo visible o al punto de impacto bajo el rayo de cámara. Detección de colisión continua por segmento; máximo 8 proyectiles. Sin luces adicionales en FLUIDO.
- S1 fireball MP 18; S2 FUS Energía 12; S3 hielo MP 24; S4 WULD Energía 24. Cooldowns originales, los desbloqueos originales se conservan. S3 ralentiza. FUS es cono de empuje; WULD dash propio. No se copian recursos de ClaudeCraft.
- Perfil opcional: agregar `?hf_p6_profile=1` y ejecutar `highflyP6Report()` en consola o `highflyAuditReport()`. CPU por subsistema no equivale a tiempo GPU.
- A/B rollback runtime: `?hf_p6_off=1` desactiva la lógica nueva; `?hf_classic_hud=1` recupera HUD antiguo. Branch `main` se mantiene intacta hasta fusionar.

## Auditoría GLB comprobable
Ejecutar `node scripts/audit_animation_p6.mjs` (en CI genera `audit-output/animation_inventory_p6.json`). No asumir flips, acrobacias, variantes de ataques, ni compatibilidad de esqueletos sin nombres de clip/bones verificados.

## Prueba Android única, comparativa
Con Samsung S23 Ultra horizontal y misma partida/posición, abrir rama P6 en entorno de desarrollo. Elegir FLUIDO. Probar 40 s por escenario: aldea/obstáculos, manada de lobos, costa y draugr. Capturar FPS mediana y P95 y comparar con `?hf_p6_off=1` bajo condiciones iguales. Rechazar si P95 empeora notablemente o hay caída sostenida bajo 30 FPS en escena que antes rendía.

Matriz de aceptación: 360° incluyendo diagonales y movimiento lento; cámara derecha sin atravesar una casa; correr+atacar; 4 ATK consecutivos con daño 4 potenciado y reinicio tras 0.92s; auto-target con enemigo visible vs detrás de casa; fijar/cambiar/cancelar; fuego apuntando cuesta arriba/abajo; salto-salto-dash (una evasión aérea), cast en aire; S1-S4 costes/CD/bloqueos; matar lobo -> bolsa -> quests -> guardado/reinicio; no solapar botones en pantalla horizontal.

**Límites conocidos:** árboles/rocas dispersos carecen de colisionadores originales; LOS usa casas/pozo y terreno. Cámara no tiene una física de obstáculos completa. Los combos P6 tienen cuatro clips verificados en el GLB público; los movimientos Dodge también están presentes. Falta comprobar visualmente sincronización, root motion y transiciones Android. No se ha ejecutado aún un benchmark físico Android por CI.
