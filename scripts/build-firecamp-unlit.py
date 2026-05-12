from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "src" / "content" / "objects" / "firecamp" / "art"
SOURCE = ART_DIR / "fireplace.png"
OUT = ART_DIR / "fireplace_unlit.png"


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    pixels = image.load()

    for y in range(image.height):
      for x in range(image.width):
        r, g, b, a = pixels[x, y]

        if a == 0:
            continue

        is_flame = r > 105 and g > 28 and b < 120 and r > g * 1.04
        is_hot_core = r > 165 and g > 78 and b < 135

        if is_flame or is_hot_core:
            pixels[x, y] = (42, 31, 25, min(a, 74))

    image.save(OUT, optimize=True)
    print(f"Wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
