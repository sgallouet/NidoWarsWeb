export class FogOfWar {
  constructor(world) {
    this.world = world;
    this.revealedTiles = new Set();
  }

  revealAround({ column, row }, radius) {
    for (let currentRow = row - radius; currentRow <= row + radius; currentRow += 1) {
      for (let currentColumn = column - radius; currentColumn <= column + radius; currentColumn += 1) {
        const tile = this.world.getTile(currentColumn, currentRow);

        if (!tile) {
          continue;
        }

        const distance = Math.abs(currentColumn - column) + Math.abs(currentRow - row);

        if (distance <= radius) {
          this.revealedTiles.add(tile.id);
        }
      }
    }
  }

  isRevealed(tile) {
    return this.revealedTiles.has(tile.id);
  }
}
