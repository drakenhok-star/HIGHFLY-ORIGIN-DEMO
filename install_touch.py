#!/usr/bin/env python3
"""Install HIGHFLY touch controls in pinned Tianjie5. Exact anchors; safe to rerun."""
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent

def patch(path, changes):
    file = ROOT / path
    if not file.is_file():
        raise RuntimeError("Missing upstream file: " + path)
    source = file.read_text(encoding="utf-8")
    if "HIGHFLY_TOUCH_PATCH_V1" in source:
        print("ALREADY PATCHED", path)
        return
    result = source
    for anchor, replacement in changes:
        count = result.count(anchor)
        if count != 1:
            raise RuntimeError("Unexpected upstream " + path + "; anchor count=" + str(count) + "; anchor=" + repr(anchor[:70]))
        result = result.replace(anchor, replacement, 1)
    backup = ROOT / ".touch-backups" / path
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copy2(file, backup)
    file.write_text(result, encoding="utf-8")
    print("PATCHED", path, "(backup:", backup.relative_to(ROOT), ")")

def main():
    if not (ROOT / "LICENSE").is_file() or not (ROOT / "src/world/terrain.js").is_file():
        raise RuntimeError("Tianjie5 not present. Run bash setup_world.sh first.")
    if not (ROOT / "src/ui/touch-controls.js").is_file():
        raise RuntimeError("Missing src/ui/touch-controls.js; run git pull.")
    patch("src/main.js", [
        (
            "import { Menus } from './ui/menus.js';",
            "import { Menus } from './ui/menus.js';\n"
            "import { TouchControls } from './ui/touch-controls.js'; // HIGHFLY_TOUCH_PATCH_V1"
        ),
        (
            "    this.menus = new Menus(this);\n\n    this.wireInput();",
            "    this.menus = new Menus(this);\n"
            "    this.touch = new TouchControls(this);\n\n    this.wireInput();"
        ),
        (
            "    this.hud.setVisible(s === 'playing');\n    if (s === 'playing') this.requestPointerLock();",
            "    this.hud.setVisible(s === 'playing');\n"
            "    if (this.touch) this.touch.setState(s);\n"
            "    if (s === 'playing') this.requestPointerLock();"
        ),
        (
            "  requestPointerLock() {\n    const el = this.renderer.domElement;",
            "  requestPointerLock() {\n"
            "    if (this.touch && this.touch.enabled) return;\n"
            "    const el = this.renderer.domElement;"
        ),
        (
            "this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));",
            "this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,\n"
            "      (navigator.maxTouchPoints || 0) > 0 ? 1.25 : 2));"
        ),
    ])
    patch("src/player/player.js", [
        (
            "    const moving = mx !== 0 || mz !== 0;",
            "    // HIGHFLY_TOUCH_PATCH_V1: analog joystick and WASD coexist.\n"
            "    if (input.touchMove) {\n"
            "      mx = Math.max(-1, Math.min(1, mx + input.touchMove.x));\n"
            "      mz = Math.max(-1, Math.min(1, mz + input.touchMove.y));\n"
            "    }\n"
            "    const moving = mx !== 0 || mz !== 0;"
        ),
        (
            "      tx = (lx * cos + lz * sin) * speed;\n      tz = (-lx * sin + lz * cos) * speed;",
            "      const analog = input.touchMove ? Math.min(1, len) : 1;\n"
            "      tx = (lx * cos + lz * sin) * speed * analog;\n"
            "      tz = (-lx * sin + lz * cos) * speed * analog;"
        ),
        (
            "input.keys.has('ShiftLeft') && stats.useStamina(12 * dt)",
            "(input.keys.has('ShiftLeft') || input.touchSprint) && stats.useStamina(12 * dt)"
        )
    ])
    print("SUCCESS: HIGHFLY mobile controls applied. Start: node server.mjs")

if __name__ == "__main__":
    try:
        main()
    except RuntimeError as exc:
        print("ERROR:", exc, file=sys.stderr)
        sys.exit(1)
