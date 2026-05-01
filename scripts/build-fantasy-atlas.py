from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image


SPRITE_NAMES = [
    "knight",
    "greenArcher",
    "blueWizard",
    "purpleRogue",
    "whiteCleric",
    "dwarfAxe",
    "goblin",
    "skeleton",
    "bat",
    "ghost",
    "greenSlime",
    "redSlime",
    "blueSlime",
    "yellowSlime",
    "bee",
    "spider",
    "scorpion",
    "redMushroom",
    "thornPlant",
    "flytrap",
    "greenEgg",
    "blueEgg",
    "orangeEgg",
    "silverChest",
    "goldChest",
    "purpleChest",
    "blueGem",
    "redGem",
    "greenGem",
    "goldBag",
    "redPotion",
    "bluePotion",
    "greenPotion",
    "purplePotion",
    "goldKey",
    "ornateGoldKey",
    "purpleKey",
    "lantern",
    "bomb",
    "scroll",
    "shortSword",
    "silverSword",
    "blueSword",
    "goldSword",
    "axe",
    "hammer",
    "spear",
    "bow",
    "blueStaff",
    "greenStaff",
    "woodShield",
    "crossShield",
    "blueShield",
    "goldShield",
    "roundShield",
    "plumeHelm",
    "hornedHelm",
    "greenHood",
    "purpleHat",
    "crown",
    "logs",
    "stoneBlock",
    "silverIngot",
    "goldIngot",
    "blueCrystal",
    "purpleCrystal",
    "rainbowCrystal",
    "darkOre",
    "coal",
    "lavaRock",
    "bush",
    "redFlower",
    "blueFlower",
    "purpleFlower",
    "pineTree",
    "greenTree",
    "autumnTree",
    "stump",
    "purpleMushroom",
    "cactus",
    "crate",
    "barrel",
    "clayPot",
    "campfire",
    "signpost",
    "bench",
    "workTable",
    "bookshelf",
    "bed",
    "haystack",
    "blueBook",
    "greenBook",
    "redBook",
    "openBook",
    "scrollBundle",
    "crystalBall",
    "stoneAltar",
    "well",
    "fountain",
    "statue",
]

ROW_COUNTS = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]
ATLAS_COLUMNS = max(ROW_COUNTS)

ICON_EXPORTS = {
    "gold.png": "goldBag",
    "herbs.png": "greenPotion",
    "fish.png": "bluePotion",
    "meat.png": "redPotion",
    "berries.png": "redFlower",
    "wood.png": "logs",
    "rock.png": "stoneBlock",
    "build.png": "hammer",
    "settler-hut.png": "crate",
    "storage-house.png": "barrel",
    "torch-watch.png": "lantern",
    "tavern.png": "workTable",
    "guild-town.png": "crystalBall",
    "hero-ranger.png": "greenArcher",
    "hero-guardian.png": "knight",
    "hero-angler.png": "blueWizard",
    "hero-herbalist.png": "whiteCleric",
    "quest-hunt.png": "goldSword",
    "quest-rescue.png": "scroll",
    "quest-raid.png": "crown",
    "quest-watch.png": "well",
}


def main() -> int:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("fantasy-assets.png")
    atlas_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("assets/fantasy-atlas.png")
    icons_dir = Path(sys.argv[3]) if len(sys.argv) > 3 else Path("assets/fantasy-icons")

    if not source.exists():
        print(f"Source image not found: {source}", file=sys.stderr)
        return 1

    source_image = Image.open(source).convert("RGBA")
    cells = extract_cells(source_image)
    cells_by_name = {name: cell for name, _, _, cell in cells}
    atlas = compose_atlas(cells)

    atlas_path.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(atlas_path)

    icons_dir.mkdir(parents=True, exist_ok=True)
    for filename, sprite_name in ICON_EXPORTS.items():
        cells_by_name[sprite_name].save(icons_dir / filename)

    print(f"Wrote {atlas_path} and {len(ICON_EXPORTS)} icons to {icons_dir}")
    return 0


def extract_cells(source_image: Image.Image) -> list[tuple[str, int, int, Image.Image]]:
    rows = len(ROW_COUNTS)
    source_width, source_height = source_image.size
    cells: list[tuple[str, int, int, Image.Image]] = []
    sprite_index = 0

    for row, columns in enumerate(ROW_COUNTS):
        for column in range(columns):
            left = round(column * source_width / columns) + 8
            top = round(row * source_height / rows) + 8
            right = round((column + 1) * source_width / columns) - 8
            bottom = round((row + 1) * source_height / rows) - 8
            cell = source_image.crop((left, top, right, bottom))
            cells.append((SPRITE_NAMES[sprite_index], row, column, normalize_cell(cell)))
            sprite_index += 1

    return cells


def normalize_cell(cell: Image.Image) -> Image.Image:
    transparent = strip_checkerboard(cell)
    remove_grid_fragments(transparent)

    bbox = transparent.getbbox()
    if bbox:
        padding = 4
        transparent = transparent.crop(
            (
                max(0, bbox[0] - padding),
                max(0, bbox[1] - padding),
                min(transparent.width, bbox[2] + padding),
                min(transparent.height, bbox[3] + padding),
            )
        )

    output = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    if not transparent.getbbox():
        return output

    scale = min((96 - 10) / transparent.width, (96 - 10) / transparent.height, 1.0)
    resized = transparent.resize(
        (max(1, round(transparent.width * scale)), max(1, round(transparent.height * scale))),
        Image.Resampling.LANCZOS,
    )
    output.alpha_composite(resized, ((96 - resized.width) // 2, (96 - resized.height) // 2))
    return output


def strip_checkerboard(cell: Image.Image) -> Image.Image:
    pixels = cell.load()
    width, height = cell.size
    background = [[False] * height for _ in range(width)]
    queue: deque[tuple[int, int]] = deque()

    def mark_if_background(x: int, y: int) -> None:
        if is_background_color(pixels[x, y]) and not background[x][y]:
            background[x][y] = True
            queue.append((x, y))

    for x in range(width):
        mark_if_background(x, 0)
        mark_if_background(x, height - 1)

    for y in range(height):
        mark_if_background(0, y)
        mark_if_background(width - 1, y)

    while queue:
        x, y = queue.popleft()

        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height and not background[nx][ny]:
                if is_background_color(pixels[nx, ny]):
                    background[nx][ny] = True
                    queue.append((nx, ny))

    output = Image.new("RGBA", cell.size, (0, 0, 0, 0))
    output_pixels = output.load()

    for x in range(width):
        for y in range(height):
            if not background[x][y]:
                output_pixels[x, y] = pixels[x, y]

    return output


def is_background_color(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    if alpha == 0:
        return True

    maximum = max(red, green, blue)
    minimum = min(red, green, blue)
    average = (red + green + blue) / 3

    checkerboard = maximum - minimum <= 8 and 112 <= average <= 184
    cell_grid = maximum - minimum <= 28 and 50 <= average <= 132 and blue >= red and green >= red

    return checkerboard or cell_grid


def remove_grid_fragments(image: Image.Image) -> None:
    pixels = image.load()
    width, height = image.size
    seen = [[False] * height for _ in range(width)]

    for start_x in range(width):
        for start_y in range(height):
            if seen[start_x][start_y] or pixels[start_x, start_y][3] == 0:
                continue

            points, bounds = collect_component(pixels, seen, start_x, start_y, width, height)
            min_x, min_y, max_x, max_y = bounds
            component_width = max_x - min_x + 1
            component_height = max_y - min_y + 1
            is_tiny = len(points) < 16
            is_thin_line = (component_width >= 14 and component_height <= 4) or (
                component_height >= 14 and component_width <= 4
            )

            if is_tiny or is_thin_line:
                for x, y in points:
                    pixels[x, y] = (0, 0, 0, 0)


def collect_component(pixels, seen, start_x: int, start_y: int, width: int, height: int):
    queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
    seen[start_x][start_y] = True
    points = []
    min_x = max_x = start_x
    min_y = max_y = start_y

    while queue:
        x, y = queue.popleft()
        points.append((x, y))
        min_x = min(min_x, x)
        max_x = max(max_x, x)
        min_y = min(min_y, y)
        max_y = max(max_y, y)

        for nx in (x - 1, x, x + 1):
            for ny in (y - 1, y, y + 1):
                if nx == x and ny == y:
                    continue
                if 0 <= nx < width and 0 <= ny < height and not seen[nx][ny]:
                    if pixels[nx, ny][3] != 0:
                        seen[nx][ny] = True
                        queue.append((nx, ny))

    return points, (min_x, min_y, max_x, max_y)


def compose_atlas(cells: list[tuple[str, int, int, Image.Image]]) -> Image.Image:
    atlas = Image.new("RGBA", (ATLAS_COLUMNS * 96, len(ROW_COUNTS) * 96), (0, 0, 0, 0))

    for _, row, column, cell in cells:
        atlas.alpha_composite(cell, (column * 96, row * 96))

    return atlas


if __name__ == "__main__":
    raise SystemExit(main())
