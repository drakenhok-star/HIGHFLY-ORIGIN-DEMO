# HIGHFLY P16 · FURY Hit Confirm & Responsive Movement

Version P16 is branched independently from CI-green P15. The 410 ClaudeCraft skill records and external VFX catalogs remain archived for a later skills integration; no proprietary KayKit SOURCE files are imported.

## Gameplay contract

- The four-hit chain counts **HP loss against a real valid enemy** only after the delayed collision check.
- Swinging at empty space, while falling, or toward enemies out of melee range does not advance or refresh the chain.
- Jump / dash can preserve **confirmed** hits only within existing action windows.
- Taking real damage interrupts the combo; successful dodge preserves it; timeout resets it.
- Fourth-hit directional finisher remains when four actual impacts are confirmed.
- Joystick: lower deadzone, full intent reached earlier, per-touch pointer capture and cached bounds (no repeated synchronous layout read on every pointermove).
- Player: faster ground acceleration and optional real-GLB upper-body sword clip played while legs use Walking_A / Running_A.
- An **optional** practice target appears only when adding `?hf_training=1` to the P16 URL. It has no damage, XP, drops, loot, quest credit or kill.
- Save key `highfly_p16_save`; may read earlier P15 progress as a starting point without overwriting it.

## Safety, tradeoffs & remaining checks

- Upper-body mixing relies on the existing player's true bone animation tracks, not generated animation names; if tracks are incompatible, gracefully revert to full-body attacks.
- Input and responsiveness require a real Samsung S23 Ultra test after the browser simulator and unit tests. Browser testing cannot prove stable FPS or thermals.
- The hit check is still an arc, reach, vertical range and line-of-sight at an animation-timed hit marker, **not** yet a continuous sword bone collider.
- Avoid duplicating any project-only assets or republishing private KayKit SOURCE files.

## Manual QA

1. Play in landscape with 2 thumbs: joystick held + ATK repeatedly. Verify joystick does not drop or input-delay while moving.
2. Combo miss at empty space → still 0/4. Hit practice target → 1/4; three further valid hits → 4/4.
3. Attack with upward joystick on fourth valid hit: directional launcher triggers only if enemy eligible.
4. Ground + air transitions and dash do not fabricate hits.
5. Taking damage breaks chain; dash dodge avoids damage while retaining chain.
6. Verify run animation of legs while sword arms continue to attack, without mesh deformation.
7. Inventory, missions, HUD layout editor, quit/re-entry and independent save; P15 unchanged.
