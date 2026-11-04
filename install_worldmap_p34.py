#!/usr/bin/env python3
"""HIGHFLY P3/P4-A: install optional world navigation UI, fail closed & reversible.

Requires P2 installed. Does not change combat, physics, NPCs, terrain,
save format, textures or existing graphics profiles. Runtime map errors will
not prevent Tianjie5 from booting (guarded constructor).
"""
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent
MAIN = ROOT / "src/main.js"
MARKER = "HIGHFLY_WORLD_MAP_P34"

def main() -> None:
    if not MAIN.is_file():
        raise RuntimeError("Falta Tianjie5. Ejecutar: bash setup_world.sh")
    if not (ROOT / "src/ui/world-map-p34.js").is_file():
        raise RuntimeError("Falta modulo P3/P4. Ejecutar: git pull --ff-only")

    old = MAIN.read_text(encoding="utf-8")
    if MARKER in old:
        print("P3/P4 MAPA YA INSTALADO: src/main.js")
        return
    if "HIGHFLY_P2_20261104" not in old:
        raise RuntimeError("Falta P2. Ejecutar: python3 install_perf_p2.py")

    pairs = [
        (
            "import { PerformanceP2 } from './ui/performance-p2.js'; // HIGHFLY_P2_20261104",
            "import { PerformanceP2 } from './ui/performance-p2.js'; // HIGHFLY_P2_20261104\n"
            "import { WorldMapP34 } from './ui/world-map-p34.js'; // HIGHFLY_WORLD_MAP_P34",
        ),
        (
            "    this.performanceP2 = new PerformanceP2(this);\n\n    this.wireInput();",
            "    this.performanceP2 = new PerformanceP2(this);\n"
            "    this.worldMapP34 = null;\n"
            "    if (!new URLSearchParams(location.search).has('hf_no_map')) {\n"
            "      try { this.worldMapP34 = new WorldMapP34(this); }\n"
            "      catch (err) { console.warn('[HIGHFLY map] No se pudo iniciar:', err); }\n"
            "    }\n\n    this.wireInput();",
        ),
        (
            "    if (this.performanceP2) this.performanceP2.setState(s);",
            "    if (this.performanceP2) this.performanceP2.setState(s);\n"
            "    if (this.worldMapP34) this.worldMapP34.setState(s);",
        ),
    ]
    new = old
    for before, after in pairs:
        n = new.count(before)
        if n != 1:
            raise RuntimeError(f"Ancla inesperada ({n}): {before[:88]!r}")
        new = new.replace(before, after, 1)

    backup = ROOT / ".p34-backups/src/main.js"
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copy2(MAIN, backup)
    MAIN.write_text(new, encoding="utf-8")
    print("P3/P4 MAPA INSTALADO. Copia anterior en .p34-backups/src/main.js")
    print("Para desactivar mapa sin reinstalar: agregar ?hf_no_map=1 a URL.")

if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError) as exc:
        print("ERROR P3/P4 MAPA:", exc, file=sys.stderr)
        sys.exit(1)
