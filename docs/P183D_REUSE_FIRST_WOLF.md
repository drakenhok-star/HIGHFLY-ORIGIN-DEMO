# P18.3d · Reuse-first visual normalization & provenance

- SOURCE: `levy-street/world-of-claudecraft`, v0.44.7 pinned commit `493c35a108cef6c8aa290e8793107b1cd117886e`, `public/models/creatures/wolf.glb` sha `00d69a6c127752c2506c66bc93db9a10f4a73df0` (336460 bytes).
- ORIGIN LICENSE: Quaternius Animated Creatures, CC0 1.0. WOC `CREDITS.md` line 101 lists the Quaternius wolf, animations, other animals and permission to redistribute.
- Exact original Quaternius wolf is distinct from HIGHFLY's previous wolf. Existing old pack is unchanged; new `wolf_claude` used for added pradera encounters.
- Important exclusion: WOC `wolf_basic.glb` is a custom Tripo+contributor atlas; WOC `greyjaw.glb` is a bespoke rig. Neither is imported without separate verification and license clearance. The WOC `old_greyjaw` mechanics come from MIT code, not its proprietary silhouette.
- The WOC MIT visual calibration approach from `src/render/characters/assets.ts`: sample idle animation on a clone; `SkinnedMesh.applyBoneTransform` per vertex; compute bounds in real world pose; normalize to manifest-defined heights; move min-Y to zero so the creature stands on terrain. No placeholders, no unsupported resource.
- Pinned heights are informed by WOC `src/render/characters/manifest.ts`: `mob_spider` 1.4, `mob_fox` 1.0, `mob_stag` 1.9, `mob_crab` 1.7, `mob_kobold` goblin GLB 2.1, `mob_treant` yeti GLB 2.6; orc 2.6 is a HIGHFLY choice.
- Fail-closed optional load error reporting and one-time `window.highflyP183dAssets()`.
- Core training stats remain untouched. All previous demo snapshots are untouched.
