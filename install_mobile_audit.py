#!/usr/bin/env python3
"""P1: non-destructive high-quality benchmark + fullscreen for Tianjie5.

Run AFTER install_touch.py; no gameplay changes. Idempotent and fails closed
if upstream anchors diverge. Each modified file gets a local backup.
"""
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent
MARKER = "HIGHFLY_AUDIT_P1"

def apply(path, changes):
    target = ROOT / path
    if not target.is_file():
        raise RuntimeError("Falta archivo esperado: " + path)
    original = target.read_text(encoding="utf-8")
    if MARKER in original:
        print("YA INSTALADO:", path)
        return
    updated = original
    for before, after in changes:
        n = updated.count(before)
        if n != 1:
            raise RuntimeError(path + ": ancla no encontrada o ambigua (ocurrencias " +
                               str(n) + ") " + repr(before[:90]))
        updated = updated.replace(before, after, 1)
    backup = ROOT / ".audit-backups" / path
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copy2(target, backup)
    target.write_text(updated, encoding="utf-8")
    print("AUDITADO:", path)

def main():
    mainfile = ROOT / "src/main.js"
    if not mainfile.is_file():
        raise RuntimeError("Primero ejecuta: bash setup_world.sh")
    if not (ROOT / "src/ui/mobile-audit.js").is_file():
        raise RuntimeError("Falta src/ui/mobile-audit.js; ejecuta git pull --ff-only")
    text = mainfile.read_text(encoding="utf-8")
    if "HIGHFLY_TOUCH_PATCH_V1" not in text:
        raise RuntimeError("Falta joystick P0. Ejecuta: python3 install_touch.py")

    apply("src/main.js", [
        (
            "import { Menus } from './ui/menus.js';",
            "import { Menus } from './ui/menus.js';\n"
            "import { MobileAudit } from './ui/mobile-audit.js'; // HIGHFLY_AUDIT_P1"
        ),
        (
            "    this.touch = new TouchControls(this);\n\n    this.wireInput();",
            "    this.touch = new TouchControls(this);\n"
            "    this.mobileAudit = new MobileAudit(this);\n\n    this.wireInput();"
        ),
        (
            "    if (this.touch) this.touch.setState(s);",
            "    if (this.touch) this.touch.setState(s);\n"
            "    if (this.mobileAudit) this.mobileAudit.setState(s);"
        ),
        (
            "  requestAnimationFrame(loop);\n  const dt = Math.min(clock.getDelta(), 0.05);",
            "  requestAnimationFrame(loop);\n"
            "  game.mobileAudit.begin();\n"
            "  const dt = Math.min(clock.getDelta(), 0.05);"
        ),
        (
            "  game.composer.render();\n",
            "  game.composer.render();\n"
            "  game.mobileAudit.end();\n"
        ),
        (
            "this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,\n"
            "      (navigator.maxTouchPoints || 0) > 0 ? 1.25 : 2));",
            "// P1 quality HIGH baseline: restore original render scale on Android.\n"
            "    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));"
        )
    ])

    # Browser viewport uses entire safe display area in fullscreen.
    apply("index.html", [
        (
            '<meta name="viewport" content="width=device-width, initial-scale=1">',
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"> <!-- HIGHFLY_AUDIT_P1 -->\n'
            '  <meta name="theme-color" content="#080f1c">'
        )
    ])

    print("OK: P1 calidad ALTA + FPS, P95, draw calls y FULLSCREEN instalados.")

if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError) as err:
        print("ERROR AUDITORIA P1:", err, file=sys.stderr)
        sys.exit(1)
