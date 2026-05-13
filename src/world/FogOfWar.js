export class FogOfWar {
  constructor(world) {
    this.world = world;
    this.revealedTiles = new Set();
    this.changedTiles = [];
    this.revealedRegions = [];
    this.changedRegions = [];
    this.version = 0;
  }

  revealAround({ column, row }, radius) {
    const tileRadius = Math.ceil(radius);
    const radiusSquared = radius * radius;
    let changed = false;

    for (let currentRow = row - tileRadius; currentRow <= row + tileRadius; currentRow += 1) {
      for (let currentColumn = column - tileRadius; currentColumn <= column + tileRadius; currentColumn += 1) {
        const tile = this.world.getTile(currentColumn, currentRow);

        if (!tile) {
          continue;
        }

        const deltaColumn = currentColumn - column;
        const deltaRow = currentRow - row;
        const distanceSquared = deltaColumn * deltaColumn + deltaRow * deltaRow;

        if (distanceSquared <= radiusSquared && !this.revealedTiles.has(tile.id)) {
          this.revealedTiles.add(tile.id);
          this.changedTiles.push(tile);
          changed = true;
        }
      }
    }

    if (changed) {
      const region = { column, row, radius };

      this.revealedRegions.push(region);
      this.changedRegions.push(region);
      this.version += 1;
    }
  }

  isRevealed(tile) {
    return this.revealedTiles.has(tile.id);
  }

  consumeChangedTiles() {
    const changedTiles = this.changedTiles;

    this.changedTiles = [];
    return changedTiles;
  }

  consumeChangedRegions() {
    const changedRegions = this.changedRegions;

    this.changedRegions = [];
    return changedRegions;
  }
}
