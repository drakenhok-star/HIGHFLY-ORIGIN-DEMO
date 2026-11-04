#!/usr/bin/env bash
# Bootstrap public HIGHFLY demo from PINNED Tianjie5 MIT source and 15 CC0-declared GLB.
# Intended for GitHub Actions; never reads private repositories or SOURCE assets.
set -Eeuo pipefail
ROOT="$(git rev-parse --show-toplevel)"
PIN="42eebcb4b422f3aa432cff882f1e51b2a856a6b2"
cd "$ROOT"

for rel in install_touch.py install_mobile_audit.py install_perf_p2.py install_worldmap_p34.py \
  src/ui/touch-controls.js src/ui/mobile-audit.js src/ui/performance-p2.js src/ui/world-map-p34.js; do
  [[ -f "$rel" ]] || { echo "FALTA PARCHE: $rel" >&2; exit 1; }
done

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echo "==> Tianjie5 MIT original — commit fijo $PIN"
git clone --quiet https://github.com/zexadev/tianjie5.git "$tmp/upstream"
git -C "$tmp/upstream" checkout --quiet "$PIN"
[[ "$(git -C "$tmp/upstream" rev-parse HEAD)" == "$PIN" ]] || { echo "SHA ERRONEO" >&2; exit 1; }

# No copiar carpetas privadas: sólo recursos del upstream PUBLICO escogidos.
git -C "$tmp/upstream" archive --format=tar "$PIN" \
  LICENSE index.html styles.css server.mjs src lib assets/models assets/manifest.json \
  | tar -xf - -C "$ROOT"

python3 - <<'PY'
import json
from pathlib import Path
p=Path('.')
models=json.loads((p/'assets/manifest.json').read_text(encoding='utf-8'))['assets']
assert len(models)==15, f'Hay {len(models)} modelos, no 15'
listed=set()
for m in models:
    path=Path(m['file'])
    assert m.get('license')=='CC0' and m.get('source','').startswith('https://'),m
    assert path.parts[:2]==('assets','models') and len(path.parts)==3 and path.suffix=='.glb',m
    assert (p/path).is_file(),path
    listed.add(path.as_posix())
actual={f.as_posix() for f in (p/'assets/models').rglob('*.glb')}
assert listed==actual,f'Modelos no inventariados: {actual^listed}'
print('OK: 15/15 modelos originales declarados CC0, con enlaces de origen')
print('IMPORTANTE: procedencia binaria independiente aún por verificar.')
PY

python3 install_touch.py
python3 install_mobile_audit.py
python3 install_perf_p2.py
python3 install_worldmap_p34.py

for f in src/main.js src/player/player.js src/entities/enemies.js \
  src/ui/touch-controls.js src/ui/mobile-audit.js \
  src/ui/performance-p2.js src/ui/world-map-p34.js; do
  node --check "$f"
done

rm -rf .touch-backups .audit-backups .p2-backups .p34-backups
touch .nojekyll

# Fase pública: el código completo y los GLB viven en este repositorio.
# GitHub Pages se desplegará por Actions desde el directorio generado.
mkdir -p .public-site
cp -a index.html styles.css LICENSE PROVENANCE.md src lib assets .public-site/
touch .public-site/.nojekyll
echo "OK: demo pública preparada. Site: .public-site/"
