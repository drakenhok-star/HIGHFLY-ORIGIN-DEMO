# HIGHFLY P18.4 — Cripta premium modular / arquitectura inicial

**Estado:** diseño codificado y probado; **no es una mazmorra jugable, no está publicada**.

Rama aislada: `p184-premium-crypt-blueprint-20261105`, basada en el snapshot P18.3 verificado.

## Mapa propuesto

1. Vestíbulo olvidado: entrada / retorno seguro
2. Galería de los guardianes: primera pelea, libera acceso a la bifurcación y antecámara
3. Santuario del sello: combate secundario, obtiene sigilo necesario para jefe
4. Antecámara de los caídos: segundo encuentro, checkpoint
5. Trono del guardián: jefe por fases y recompensa/portal de salida

La arquitectura está en `src/world/crypt-layout-p184.js`: un único registro para datos de salas, posiciones, puertas, colisiones y slots de enemigos; `p184WallSegments()` deriva paredes con huecos para puertas, y `p184CollisionBoxes()` usa esas mismas paredes. Evitar colisiones desfasadas respecto del aspecto visual. `createCryptRunP184()` y `p184ApplyEvent()` guardan estados de encuentro y recompensa única; toda adjudicación real de objetos debe realizarse solo al pasar de `rewardClaimed:false` a `true`.

**Licencias:** el esquema visual mantiene todas las claves vacías hasta mapear GLB KayKit Dungeon Remastered/Halloween Bits CC0 individuales y comprobar su licencia. El archivo no crea ni distribuye mallas, no inventa geometría de sustitución. Los enemigos de muestra son solamente draugr y jefe existentes. Es un blueprint, no un renderer ni un sistema de colisión activo.

**Futuro:** adaptar el layout a `Interiors`, asignar piezas de suelo/muro/puerta/atarezzo CC0 existentes verificadas, asegurar rig y hitboxes, conectar `Enemies`, `Combat`, `Inventory`, `SaveSys`; después pruebas de rutas, acceso/retorno y FPS Android. El modo Heroico existe como parámetro de datos; afijos, loot y dificultad ajustada NO están implementados todavía.

Ninguna versión Pages publicada ha sido reemplazada por este blueprint.
