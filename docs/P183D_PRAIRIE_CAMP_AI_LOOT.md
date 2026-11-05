# HIGHFLY P18.3d · Pradera REUSE FIRST

**Provenance:** World of ClaudeCraft 0.44.7 MIT/CC0. No project-only media copied. Inspired by `src/sim/content/zone1.ts` definitions for `forest_wolf`, `old_greyjaw`, `wild_boar`, `webwood_spider`, and `vale_bandit`. The exact CC0 WOC `wolf.glb` is stored separately from our old wolf rig. No Tripo `wolf_basic.glb` or Greyjaw bespoke model.

**Population** at world load: 6 already-working Gobkit wild boars (3+3), 5 CC0 WOC wolves, 5 KayKit bandits, 5 CC0 WOC spiders at real forest edge, plus one imposing unique Greyjaw-style alpha boss. Existing HIGHFLY native wolves, snow, goblin, fox, stag, crab, yeti, orc and dungeons remain, unchanged except for corrected visual normalization of Quaternius rigs. Elite intentionally solitary rather than five bosses crammed together. Camp spacing checked with real terrain.

**Melee/IA**: original 4-hit/skill targeting unchanged; WOC-inspired pack assist, frenzy +30% attack tempo for attacked pack or alpha (old Greyjaw 25% proc), gobkit boar thorns 2 HP on *confirmed melee hit*, spiders venom (35% chance) and 3-second web snare (25% chance), bandit flee at low HP. Existing boar charge, loot and per-camp respawns retained.

**Loot**: CC0-derived ingredients defined as our own inventory entries (`wolf_fang`, `greyjaw_fang`, `spider_leg`) and existing `boar_hide`, `boar_meat`, `spider_silk`, `bandit_emblem`; extra drops use P18.3 rarity system. No fitness Core Stat changes.

**GPU**: visual bodies beyond 285 units disabled for P18.3d only; AI already updates within 260 units. When returning, models become visible. Tests validate population/config, GLB, provenance, and no structural regressions; Android render/frame pacing still requires manual browser test.
