# HIGHFLY P196 — Inventario REAL de NPC, 15 profesiones, misiones y comercio futuro
Auditoría exacta del código **juego experimental P196**, sin confundir planes P186/wiki con jugabilidad implementada.

## Cuántas misiones hay
- **11 misiones reales únicas** registradas en el diario: 3 base (2 Olaf, 1 Sigrid), 1 de frontera (Bjorn), **7 encargos P192** de profesiones. La primera misión de un barrio se comparte entre los maestros de ese mismo barrio; **no** hay 13 misiones exclusivas de maestros.
- **15 profesiones reales registradas**: 5 de recolección, 10 de creación.
- **14 instructores** vinculados a las profesiones: 13 nuevos y Sigrid (enseña dos); los otros NPC originales Olaf y Bjorn cumplen misiones principales y de frontera.
- Las fichas `starterLesson` de P186 describen futuras actividades; **no equivalen automáticamente a misiones implementadas**. Pesca, siembra, recolección de hierbas y minería con nodos aún requieren mecánicas dedicadas. Del mismo modo, el portal P194 es actualmente visual y no habilita el siguiente mundo.

## Principales y auxiliares
| Personaje | Misión real | Objetivo | Recompensa | Estado |
|---|---|---|---|---|
| Olaf | Amenaza de lobos (q1) | Derrotar 5 lobos normales | 100 oro / 80 XP | Jugable |
| Sigrid | Espada ancestral (q2) | Recuperar la espada del cofre de las ruinas | 150 oro / 100 XP | Jugable |
| Olaf | Amenaza del dragón (q3) | Derrotar al dragón de su torre (se desbloquea después de q1+q2) | 500 oro / 400 XP | Jugable |
| Bjorn | Centinelas de la frontera (p18) | Derrotar 3 lobos centinela | 75 oro / 60 XP | Jugable |

## Profesiones y maestros: encargos compartidos
| Maestros (IDs originales) | Profesiones | Encargo real (barrio) | Material para entrega | Recompensa | Misiones exclusivas adicionales |
|---|---|---|---|---|---|
| master_lumberjack, master_tinkerer | Tala, ingeniería | Sendero de los leñadores | 1 colmillo de lobo | 35 oro, 35 XP | 0 |
| master_miner | Minería | Ecos de la Primera Veta | 1 resto de draugr | 55 oro, 60 XP | 0 |
| master_herbalist, master_alchemist | Herboristería, alquimia | Ingredientes de la boticaria | 1 pata de araña | 40 oro, 45 XP | 0 |
| master_fisher, master_cook | Pesca, cocina | Protegé la costa | 1 caparazón de cangrejo | 40 oro, 45 XP | 0 |
| master_farmer | Agricultura | Despensa del granero | 1 carne de jabalí | 40 oro, 45 XP | 0 |
| master_tanner, master_tailor, master_jeweler | Peletería, sastrería, joyería | Materiales del taller | 1 cuero de jabalí | 40 oro, 45 XP | 0 |
| master_scribe, master_enchanter | Inscripción, encantamiento | Hilo de los estudios | 1 seda de araña | 60 oro, 55 XP | 0 |
| Sigrid | Fabricación de armas, armaduras | Espada ancestral, arriba | Recuperar espada | 150 oro, 100 XP | 0 de profesión (q2 pertenece a la trama) |

**Regla real:** completar el encargo compartido permite aprender el oficio correspondiente con su maestro, cumpliendo los requisitos de nivel. No quiere decir que ya exista un minijuego interactivo para todos los oficios.

## Recetas que SÍ tienen compra/crafteo real
- Sigrid: espada de acero reforzada; armadura de cazador; además dos piezas de equipamiento avanzado P192 (capucha y hombreras). Sus recetas requieren materiales de drops y oro.
- Curtidor: guantes de cuero.
- Sastre: pantalones y botas de explorador.
- Joyero: colgante de astas y anillo del litoral.
- Otros instructores: pueden enseñar oficio tras completar misión, pero **no tienen recetas finales implementadas en P192**; sus ideas P186 son futuras.

## Misión de cada maestro vs número real
La función `hamletDialogueP192()` ofrece la misma misión por `hubId` a cualquier maestro del barrio, sin inventar una misión distinta por clase. Cuando se termina, cada maestro puede ofrecer el aprendizaje de su profesión; el código de recetas muestra únicamente los crafteos efectivamente existentes.

## Próxima versión: NPC comerciante real dentro de la taberna
**Es técnicamente posible.** La taberna `inn` ya existe como interior propio con entrada/salida. El comerciante debe vivir en **coordenadas de ese interior**, no en el mapa exterior; el sistema de diálogo debe detectarlo solo dentro de `inn` y permitir:
- comprar pociones de salud y maná existentes en `ITEM_DB`, a precios fijos;
- posteriormente cocina: objetos comestibles reales con efecto de recuperación (aún no existen en ITEM_DB como consumibles);
- comprobar monedas y espacio de inventario antes de cualquier cargo; guardar compra en `SaveSys`;
- ofrecer venta de excedentes y precios equilibrados en un segundo pase;
- reutilizar un NPC KayKit CC0 existente y no importar SOURCE en GitHub Pages.

No implementarlo hasta validar la escena interior, el botón USAR, la selección del NPC y la regresión del sistema de misiones. **No afirmar que ya hay tienda**.

## P196 contenido nuevo
- 13 maestros con movimiento local, pies secos y detección de casas/pedientes. Durante edición su IA está totalmente pausada.
- 9 carteles de profesión, legibles desde varias direcciones gracias a sprites de fachada.
- Antorchas de luz cálida cerca de los caminos principales, con muy pocas luces dinámicas sin sombras.
- 3 nuevos spots de hasta 5 monstruos reales cada uno: jabalíes, goblins y arañas; las posiciones finales requieren validación del hábitat. Los jefes originales **no se trasladan**.
- World Forge: el centro de cada spot es editable con marcadores propios del editor; el guardado JSON se reutiliza directamente al lanzar la demo jugable con `hf_world_draft=1`.
