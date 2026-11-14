#!/usr/bin/env bash
set -euo pipefail
destination="${1:-labs/worldforge-wfc-p2/assets}"
mkdir -p "$destination"
base="https://raw.githubusercontent.com/kikoncuo/jevfire/main/web/public/assets"
for model in hall house tower wall tree rock; do
  curl --connect-timeout 20 --max-time 80 --retry 3 --retry-all-errors -fsSL "$base/$model.glb" -o "$destination/$model.glb"
  test -s "$destination/$model.glb"
  echo "CC0 KayKit: $model.glb downloaded"
done
curl --connect-timeout 20 --max-time 80 --retry 3 -fsSL "$base/LICENSE-KayKit-Village.txt" -o "$destination/LICENSE-KayKit-Village.txt"
echo "P2 public KayKit models ready"
