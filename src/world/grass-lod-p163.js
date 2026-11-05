/** HIGHFLY P16.3: deterministic grass density by distance to current rebuild anchor.
 * Dense near the camera, progressive thinning at distances where shader fog/fade
 * already dominates. Same cell hash => reproducible as player moves.
 * No collision, physics, monster, terrain or gameplay data is modified.
 */
export function includeGrassP163(distanceSquared, cellRandom){
  if(distanceSquared<=900)return true; // 0-30m: full density
  if(distanceSquared<=1936)return cellRandom<.90; // 30-44m: near full
  if(distanceSquared<=3136)return cellRandom<.66; // 44-56m
  if(distanceSquared<=4356)return cellRandom<.35; // 56-66m: shader fading
  return false; // shader has zero opacity after 66m
}
