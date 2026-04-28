export function gridToWorld(column, row, tileWidth, tileHeight) {
  return {
    x: (column - row) * (tileWidth / 2),
    y: (column + row) * (tileHeight / 2),
  };
}

export function worldToGrid(x, y, tileWidth, tileHeight) {
  const projectedX = x / (tileWidth / 2);
  const projectedY = y / (tileHeight / 2);

  return {
    column: Math.floor((projectedY + projectedX) / 2),
    row: Math.floor((projectedY - projectedX) / 2),
  };
}
