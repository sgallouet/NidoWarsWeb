import { gridToWorld } from "./isoMath.js";

export class Camera2D {
  constructor({ minZoom, maxZoom, defaultZoomPadding, tileWidth, tileHeight }) {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.defaultZoomPadding = defaultZoomPadding;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  setZoom(zoom) {
    this.zoom = clamp(zoom, this.minZoom, this.maxZoom);
  }

  zoomAt(anchor, amount) {
    this.setZoom(this.zoom + amount);
    this.x += (anchor.x - this.x) * amount * 0.62;
    this.y += (anchor.y - this.y) * amount * 0.62;
  }

  frameWorld(world, viewport) {
    const mapWidth = (world.columns + world.rows) * (this.tileWidth / 2);
    const mapHeight = (world.columns + world.rows) * (this.tileHeight / 2);
    const fitZoom = Math.min(
      (viewport.width * this.defaultZoomPadding) / mapWidth,
      (viewport.height * this.defaultZoomPadding) / mapHeight,
    );
    const center = gridToWorld(
      (world.columns - 1) / 2,
      (world.rows - 1) / 2,
      this.tileWidth,
      this.tileHeight,
    );

    this.setZoom(fitZoom);
    this.setPosition(center.x, center.y + this.tileHeight * 0.7);
  }

  frameTile(tile, viewport, zoom = this.maxZoom * 0.82) {
    const point = gridToWorld(tile.column, tile.row, this.tileWidth, this.tileHeight);
    const comfortableZoom = Math.min(this.maxZoom, Math.max(this.minZoom, zoom));
    const mobileZoom = viewport.width < 760 ? Math.min(comfortableZoom, 0.86) : comfortableZoom;

    this.setZoom(mobileZoom);
    this.setPosition(point.x, point.y + this.tileHeight * 0.2);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
