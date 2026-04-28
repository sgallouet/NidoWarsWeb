export class InputController {
  constructor({ canvas, camera, renderer, world, units, onTileClick }) {
    this.canvas = canvas;
    this.camera = camera;
    this.renderer = renderer;
    this.world = world;
    this.units = units;
    this.onTileClickCommand = onTileClick;
    this.activePointers = new Map();
    this.dragState = null;
    this.pinchState = null;
    this.suppressNextTap = false;
    this.hoveredTile = null;

    this.bind();
  }

  bind() {
    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.canvas.addEventListener("pointermove", (event) => this.onPointerMove(event));
    this.canvas.addEventListener("pointerup", (event) => this.onPointerUp(event));
    this.canvas.addEventListener("pointercancel", (event) => this.onPointerCancel(event));
    this.canvas.addEventListener("wheel", (event) => this.onWheel(event), {
      passive: false,
    });
  }

  getHoveredTile() {
    return this.hoveredTile;
  }

  onPointerDown(event) {
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.activePointers.set(event.pointerId, this.createPointerState(event));

    if (this.activePointers.size === 2) {
      this.startPinch();
      return;
    }

    if (this.activePointers.size > 2) {
      return;
    }

    this.startDrag(event.pointerId);
  }

  createPointerState(event) {
    return {
      id: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }

  startDrag(pointerId, didDrag = false) {
    const pointer = this.activePointers.get(pointerId);

    if (!pointer) {
      return;
    }

    this.dragState = {
      pointerId,
      pointerX: pointer.clientX,
      pointerY: pointer.clientY,
      cameraX: this.camera.x,
      cameraY: this.camera.y,
      didDrag,
      threshold: pointer.pointerType === "touch" ? 10 : 5,
    };
  }

  onPointerMove(event) {
    const pointer = this.activePointers.get(event.pointerId);

    if (pointer) {
      pointer.clientX = event.clientX;
      pointer.clientY = event.clientY;
    }

    this.updateHoveredTile(event.clientX, event.clientY);

    if (this.activePointers.size >= 2 && this.pinchState) {
      event.preventDefault();
      this.updatePinch();
      return;
    }

    if (!this.dragState) {
      return;
    }

    if (this.dragState.pointerId !== event.pointerId) {
      return;
    }

    const screenDx = event.clientX - this.dragState.pointerX;
    const screenDy = event.clientY - this.dragState.pointerY;

    if (Math.hypot(screenDx, screenDy) > this.dragState.threshold) {
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
    event.preventDefault();
    const wasTap =
      this.dragState &&
      this.dragState.pointerId === event.pointerId &&
      !this.dragState.didDrag &&
      !this.suppressNextTap;

    if (wasTap) {
      this.updateHoveredTile(event.clientX, event.clientY);
      this.onTileClick(this.hoveredTile);
    }

    this.releasePointer(event.pointerId);
    this.suppressNextTap = false;
  }

  onPointerCancel(event) {
    this.releasePointer(event.pointerId);
    this.suppressNextTap = false;
  }

  releasePointer(pointerId) {
    if (this.canvas.hasPointerCapture(pointerId)) {
      this.canvas.releasePointerCapture(pointerId);
    }

    this.activePointers.delete(pointerId);

    if (this.activePointers.size < 2) {
      if (this.pinchState) {
        this.suppressNextTap = true;
      }

      this.pinchState = null;
    }

    if (this.activePointers.size === 1) {
      const [remainingPointer] = this.activePointers.values();
      this.startDrag(remainingPointer.id, this.suppressNextTap);
      return;
    }

    this.dragState = null;
  }

  startPinch() {
    const [first, second] = this.getTwoPointers();
    const midpoint = getMidpoint(first, second);

    this.pinchState = {
      startDistance: Math.max(1, getPointerDistance(first, second)),
      startZoom: this.camera.zoom,
      anchor: this.renderer.screenToWorld(midpoint.x, midpoint.y),
    };
    this.dragState = null;
    this.suppressNextTap = true;
  }

  updatePinch() {
    const [first, second] = this.getTwoPointers();

    if (!first || !second) {
      return;
    }

    const midpoint = getMidpoint(first, second);
    const distance = Math.max(1, getPointerDistance(first, second));
    const zoom = this.pinchState.startZoom * (distance / this.pinchState.startDistance);

    this.camera.setZoom(zoom);
    this.focusCameraOn(this.pinchState.anchor, midpoint.x, midpoint.y);
  }

  focusCameraOn(anchor, clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    this.camera.setPosition(
      anchor.x - (screenX - this.renderer.viewport.width / 2) / this.camera.zoom,
      anchor.y - (screenY - this.renderer.viewport.height * 0.54) / this.camera.zoom,
    );
  }

  getTwoPointers() {
    return [...this.activePointers.values()].slice(0, 2);
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
  }

  onTileClick(tile) {
    if (!tile) {
      return;
    }

    this.onTileClickCommand(tile);
  }
}

function getPointerDistance(first, second) {
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function getMidpoint(first, second) {
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  };
}
