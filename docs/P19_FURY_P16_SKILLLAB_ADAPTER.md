# HIGHFLY P19 — FURY P16 authoritative + Skill Lab adapter

**November 5, 2026 — integration branch only, NOT production-approved.**

## Source and precedence (immutable rule)

- Official motor: `drakenhok-star/HIGHFLY-ORIGIN-DEMO`, branch `p16-fury-hitconfirm-20261105`, approved commit `a83e7993d84da33c8d0792277c08d69a56bd1906`.
- This branch begins with EXACTLY that commit. Changes are additive adapters and isolated `/lab.html` endpoint.
- FURY P16 remains authoritative for `TouchControls`, joystick, `Player`, `Combat.melee()`, hit-confirm, combo, damage, dash, jump, knockback, and interruption.
- Skills Lab P18/P17 supplies camera presets, aiming, skill-only wrappers, VFX and training tools. There is NO replacement of `g.combat.melee` or `g.player.update`.
- The saved P16 progression uses `highfly_p16_save` as before. P19 camera preferences use `hf_p19_fury_p16_camera_lab`, separate from world progression.

## Genuine P16 deltas (experimental until phone QA)
- `P16_RESPONSE` deadzone: `.045` (previously `.055`).
- Full-output thumb excursion: `.52` (previously `.56`).
- Velocity smoothing acceleration: `46` (previously `40`). **Maximum speed unchanged** at the original `player.js` values.
- Native joystick retains pointerId capture, coalesced pointer events, joystick-only left-hand input and camera/ATK/skills concurrent event channels.
- **ATK 4 directional gesture** on original premium ATK button. ATK begins immediately; if step 4, `TouchControls.armFinisherGesture` resets drag origin at CURRENT contact (also when holding across ATK 1/2/3), independent of left joystick. ATK drag arrow is one span on original button, not a new overlay button. Initial fourth animation uses a pre-existing GLB clip; during early startup it may switch between verified clips. The final 3D knockback vector is computed at the **impact frame**, using the last released ATK vector if the finger lifted earlier.
- Up = vertical launch; left/right = directional horizontal toss; down = heavy push only, no fake knockdown; tap = forward. Keyboard can steer on PC when no touch gesture exists. No joystick fallback for ATK.
- P16 confirmed-hit behavior remains: one advancement per swing if and only if HP damage is real; whiffs do not advance/reset clock. Hits received interrupt, true dodge preserves. One attack hitting multiple enemies advances once.

## Skill adapter
- All original P17 five style sets, 15 skills and their own resource/cooldown rules.
- P17 second phases retained: ABISAL S2 stationary second cut, GUARDIÁN S3 attraction then second tap lift, AÉREA impact on confirmed landing.
- Separate hold → drag → release with CANCELAR for S1/S2/S3. No touchscreen ATK/skill pointer sharing or forced identical damage paths.
- Guinevere S2 shows its jump arc and destination. Meteor is a ground destination WITHOUT a fake leap arc. Other line, cone, dash, and self-area indicators are independent, sampling every geometry vertex against hill height.
- Magical (Aérea/Mage) skills use MP; physical (Abisal/Guardián/Pícaro) use Energy.
- Mage fireball uses **17° capped initial 3D aim assist**, max 22 units, line of sight and target chest height. Once released, straight vector is IMMUTABLE; targets can dodge, the ball misses and continues forward until range/obstacle.
- Original VFX additions: animated 3D plasma orb shader (WebGL, original shader); independently sampled hill-conforming impact rings; visible volume crown; existing emitter trails, Slash/Vortex/Meteor/Frost variants with 36-event bounded VFX pool. **Final art direction remains unapproved pending Samsung footage**, not a promise of AAA effects.
- Three cameras: Aventura (6/−8.6°), **Híbrida default (8.5/−34°)**, MOBA (10/−46°); existing collision-safety and user yaw preserved. All eight panel sliders retained.

## Extension hooks (not fake mechanics)
`FuryCombatPortsP19`: `confirmed-basic-hit`, `combo-interrupted`, `finisher-impact`, `dodge-success` are emitted from P16. Interfaces `block-success`, `stagger`, `launch`, `counter` are reserved only; there is **no active blocking/parry/counter**.

## Tests / release gate
- P5–P16 native regressions; P19 pure controls/initial-shot tests; `node --check` for all modules; asset/licensing and animation audit.
- Playwright 915×412 mobile landscape simulates FURY game, confirmation, P19 Skill Lab, hybrid/MOBA camera swaps, per-vertex indicators, browser JS errors, game save and report of frame-time P95.
- `scripts/p19-browser-smoke.mjs` is a **simulator**, not a real Samsung touch session. The 10 user-specified interactions still require real S23 Ultra hands-on QA, including held ATK with late swipe, gesture versus joystick, actual GPU FPS/P95, visuals, collisions, button overlap and persistent save.
- **No deployment/publishing in CI. No production changes.** An externally accessible demo URL must wait for tests and Android approval.

## Animation audit
Only existing GLB animation names used: `1H_Melee_Attack_Slice_Diagonal`, `1H_Melee_Attack_Slice_Horizontal`, `1H_Melee_Attack_Stab`, `1H_Melee_Attack_Chop`. True uppercut/knockdown animations have NOT been invented.

## Attribution
Original public FURY/Tianjie code and existing CC0 models preserved; ClaudeCraft skill mechanics adapted from pinned MIT code `493c35a108cef6c8aa290e8793107b1cd117886e`. No SOURCE commercial KayKit archive, third-party private assets, protected Mobile Legends visual/audio data or "with the project only" content.
