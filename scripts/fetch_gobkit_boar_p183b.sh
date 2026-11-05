#!/usr/bin/env bash
# Original CC0 Gobkit Free Animal Pack B / Boar. Third-party URL is literal,
# not constructed. Source: https://gobkit.com/api/free
set -Eeuo pipefail
file="assets/models/boar_gobkit_cc0.glb"
url="https://gobkit.com/freebies/animalB/Boar.glb"
mkdir -p "$(dirname "$file")"
tmp="$file.tmp"
trap 'rm -f "$tmp"' EXIT
curl --fail --location --retry 3 --connect-timeout 15 --max-time 150 \
  --user-agent "HIGHFLY-CC0-Asset-Audit/1.0" \
  "$url" --output "$tmp"
node --input-type=module - "$tmp" <<'JS'
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const buf=readFileSync(process.argv[2]);
assert.ok(buf.length>2000&&buf.length<12000000,'unexpected GLB size');
assert.equal(buf.toString('ascii',0,4),'glTF');
assert.equal(buf.readUInt32LE(4),2);
assert.equal(buf.readUInt32LE(8),buf.length);
const n=buf.readUInt32LE(12);
assert.ok(n>100&&n<buf.length-20);
const json=JSON.parse(buf.toString('utf8',20,20+n));
assert.ok(json.skins?.length,'boar skin is required');
for(const name of ['idle','attack','dead','walk']){
 assert.ok(json.animations?.some(c=>c.name.toLowerCase()===name),'missing real boar clip '+name);
}
for(const asset of [...(json.buffers||[]),...(json.images||[])])
 assert.ok(!asset.uri||asset.uri.startsWith('data:'),'no foreign asset URLs');
console.log('Gobkit Boar CC0: '+buf.length+' bytes, skins='+json.skins.length+', clips='+json.animations.map(c=>c.name).join(','));
JS
echo "e6ce64f0e4ac3646359c66d6d383604cb9299b11f867e1b62ea161c50d1e572c  $tmp" | sha256sum --check --status || { echo "CC0 boar integrity mismatch" >&2; exit 1; }
mv "$tmp" "$file"
trap - EXIT
sha256sum "$file"
