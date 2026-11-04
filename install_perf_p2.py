#!/usr/bin/env python3
"""HIGHFLY P2: reversible performance presets and bounded enemy aggro.

Run after P1. Does not touch source repo, assets, terrain, quests or save format.
On each file the untouched pre-P2 source is saved in .p2-backups/.
"""
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent
MARK = "HIGHFLY_P2_20261104"

def patch(path, replacements):
    file = ROOT / path
    if not file.is_file():
        raise RuntimeError(f"Falta {path}. Primero ejecuta: bash setup_world.sh")
    original = file.read_text(encoding="utf-8")
    if MARK in original:
        print("YA INSTALADO:", path)
        return
    updated = original
    for old, new in replacements:
        n = updated.count(old)
        if n != 1:
            raise RuntimeError(f"{path}: ancla incompatible ({n} coincidencias): {old[:105]!r}")
        updated = updated.replace(old, new, 1)
    backup = ROOT / ".p2-backups" / path
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copy2(file, backup)
    file.write_text(updated, encoding="utf-8")
    print("P2 OK:", path)

def main():
    main_source = ROOT / "src/main.js"
    if not main_source.is_file() or "HIGHFLY_AUDIT_P1" not in main_source.read_text(encoding="utf-8"):
        raise RuntimeError("Primero ejecutar P1: python3 install_mobile_audit.py")
    if not (ROOT / "src/ui/performance-p2.js").is_file():
        raise RuntimeError("No se encontro modulo P2. Ejecuta: git pull --ff-only")

    patch("src/main.js", [
        (
            "import { MobileAudit } from './ui/mobile-audit.js'; // HIGHFLY_AUDIT_P1",
            "import { MobileAudit } from './ui/mobile-audit.js'; // HIGHFLY_AUDIT_P1\n"
            "import { PerformanceP2 } from './ui/performance-p2.js'; // HIGHFLY_P2_20261104",
        ),
        (
            "    this.mobileAudit = new MobileAudit(this);\n\n    this.wireInput();",
            "    this.mobileAudit = new MobileAudit(this);\n"
            "    this.performanceP2 = new PerformanceP2(this);\n\n    this.wireInput();",
        ),
        (
            "    if (this.mobileAudit) this.mobileAudit.setState(s);",
            "    if (this.mobileAudit) this.mobileAudit.setState(s);\n"
            "    if (this.performanceP2) this.performanceP2.setState(s);",
        ),
    ])

    # Explicit leash relative to spawn home, not relative to chasing enemy.
    # Return state ignores aggro, then transitions to normal idle upon reaching home.
    patch("src/entities/enemies.js", [
        (
            "    const dist = Math.hypot(dx, dz);\n\n    if (e.cdT > 0) e.cdT -= dt;",
            "    const dist = Math.hypot(dx, dz);\n"
            "    // HIGHFLY_P2_20261104: leash 50u wolves / 38u draugr from spawn.\n"
            "    // No persistent aggro outside territory, no long cross-map chases.\n"
            "    const dxHome = pos.x - e.home.x;\n"
            "    const dzHome = pos.z - e.home.z;\n"
            "    const homeDist = Math.hypot(dxHome, dzHome);\n"
            "    const leash = e.type === 'wolf' ? 50 : 38;\n"
            "    if (homeDist > leash && e.state !== 'return') {\n"
            "      e.state = 'return';\n"
            "      e.aggroT = 0;\n"
            "      e.hitPending = -1;\n"
            "      e.boltPending = -1;\n"
            "      e.kbVel.set(0, 0, 0);\n"
            "    }\n\n"
            "    if (e.cdT > 0) e.cdT -= dt;",
        ),
        (
            "    if (e.state === 'awaken') {\n      faceX = dx; faceZ = dz; hasFace = true;",
            "    if (e.state === 'return') {\n"
            "      const hx = e.home.x - pos.x;\n"
            "      const hz = e.home.z - pos.z;\n"
            "      const hd = Math.hypot(hx, hz);\n"
            "      if (hd <= 1.8) {\n"
            "        e.state = 'idle';\n"
            "        e.wanderTarget.copy(e.home);\n"
            "        e.wanderT = 2;\n"
            "      } else {\n"
            "        mx = hx / hd; mz = hz / hd;\n"
            "        sp = e.speed * 0.9;\n"
            "        faceX = mx; faceZ = mz; hasFace = true;\n"
            "      }\n"
            "    } else if (e.state === 'awaken') {\n      faceX = dx; faceZ = dz; hasFace = true;",
        ),
    ])

    print("OK: P2 instalado. Modos ALTA, AGUA y FLUIDO + retorno de enemigos.")

if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError) as exc:
        print("ERROR P2:", exc, file=sys.stderr)
        sys.exit(1)
