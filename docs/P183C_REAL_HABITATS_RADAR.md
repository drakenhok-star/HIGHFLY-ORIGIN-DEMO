# HIGHFLY P18.3c — Real habitats, map radar and model visibility QA

This branch builds strictly on the CI-green `p183b-biome-families-20261105`, preserving working Gobkit boars, old P18.x snapshots, combat and training Core Stats.

## Confirmed spatial faults and corrections
- Previous goblin/arachnid/forest wolf camps had seed-1338 forest noise below 0.12; they were grassland, not forest.
- New original camps: goblins (-190,505), forest wolves (-350,470), fox (-180,340), spiders (-210,420) and (-220,432). `realForestP183c` requires tree-compatible noise, dry land and slope. Scatter adds a modest number of **existing KayKit pine models** around three groves via instancing, no primitive substitutes.
- Orc territory moved from the draugr ruins to (-470,-300), >100 units away. Already-working boars unchanged.
- Bandit camp keeps its coordinates but has a short natural dirt track painted onto valid terrain, with grass excluded, without floating path geometry.
- Shore crabs remain tied to actual coastline; snow alpha and yeti keep valid highlands, but now each can be selected individually.
- For Quaternius skinned mobs, disable stale-bounds frustum rejection on a handful of small rigs. No impostor monsters; missing models remain flagged as errors.

## Radar and QA
- World map shows actual spawned camps and live counts. Small radar labels current geographic zone and nearby live species. Active creature dots use species colors, yellow remains reserved for quests.
- `?hf_biome_tour=1` opens a list of each species and real live counts, with TRACK and teleport-near-actor actions. Status distinguishes model not loaded, no dry habitat and invalid spawn.
- `window.highflyP183cReport()` returns actual model/rigger statistics for debug sharing.
- Legacy worlds and quests stay isolated. No new asset licenses are needed.

## Known limits
- Structural CI cannot conclusively certify gameplay WebGL visibility on every Android browser. Manual phone verification of Goblin materials, mesh skinning, crab size, Yeti and combat FPS is still necessary.
- Terrain is analytically unbounded but existing trees, world map and authored POIs use a central 1400x1400 region. Future cities must use streamed region manifests, LOD and terrain/props lazy generation; no instant six-city build is claimed.
