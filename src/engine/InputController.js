export class InputController {
  constructor({ canvas, camera, renderer, world, units }) {
    this.canvas = canvas;
    this.camera = camera;
    this.renderer = renderer;
    this.world = world;
    this.units = units;
    this.dragState = null;
    this.hoveredTile = null;

    this.bind();
  }

  bind() {
    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.canvas.addEventListener("pointermove", (event) => this.onPointerMove(event));
    this.canvas.addEventListener("pointerup", (event) => this.onPointerUp(event));
    this.canvas.addEventListener("pointercancel", () => this.onPointerCancel());
    this.canvas.addEventListener("wheel", (event) => this.onWheel(event), {
      passive: false,
    });
  }

  getHoveredTile() {
    return this.hoveredTile;
  }

  onPointerDown(event) {
    this.canvas.setPointerCapture(event.pointerId);
    this.dragState = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      cameraX: this.camera.x,
      cameraY: this.camera.y,
      didDrag: false,
    };
  }

  onPointerMove(event) {
    this.updateHoveredTile(event.clientX, event.clientY);

    if (!this.dragState) {
      return;
    }

    const screenDx = event.clientX - this.dragState.pointerX;
    const screenDy = event.clientY - this.dragState.pointerY;

    if (Math.hypot(screenDx, screenDy) > 5) {
      this.dragState.didDrag = true;
    }

    if (!this.dragState.didDrag) {
      return;
    }

    this.camera.setPosition(
      this.dragState.cameraX - screenDx / this.camera.zoom,
      this.dragState.cameraY - screenDy / this.camera.zoom,
    );
  }

  onPointerUp(event) {
    if (this.dragState && !this.dragState.didDrag) {
      this.updateHoveredTile(event.clientX, event.clientY);
      this.onTileClick(this.hoveredTile);
    }

    this.dragState = null;
  }

  onPointerCancel() {
    this.dragState = null;
  }

  onWheel(event) {
    event.preventDefault();

    const zoomDelta = event.deltaY > 0 ? -0.08 : 0.08;
    const anchor = this.renderer.screenToWorld(event.clientX, event.clientY);

    this.camera.zoomAt(anchor, zoomDelta);
  }

  updateHoveredTile(clientX, clientY) {
    const worldPoint = this.renderer.screenToWorld(clientX, clientY);
    const gridPoint = this.renderer.worldToGrid(worldPoint.x, worldPoint.y);

    this.hoveredTile = this.world.getTile(gridPoint.column, gridPoint.row);
    this.units.setPreviewTile(this.hoveredTile);
  }

  onTileClick(tile) {
    if (!tile) {
      return;
    }

    const unit = this.units.getUnitAt(tile.column, tile.row);

    if (unit?.faction === "player") {
      this.units.selectUnit(unit.id);
      this.units.setPreviewTile(tile);
      return;
    }

    this.units.tryMoveSelectedTo(tile);
  }
}
