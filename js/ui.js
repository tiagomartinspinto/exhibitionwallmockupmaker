    function renderItemList() {
      els.itemList.innerHTML = "";
      const overlaps = overlapIds();
      const count = selectedIds().length;
      const overlapText = overlaps.size ? `${overlaps.size} object${overlaps.size === 1 ? "" : "s"} need overlap attention.` : "No overlaps detected.";
      els.overlapSummary.textContent = `${overlapText} ${count} selected. Shift-click objects to select more than one.`;
      if (!state.items.length) {
        const empty = document.createElement("p");
        empty.className = "small";
        empty.textContent = "No objects yet.";
        els.itemList.append(empty);
        return;
      }

      state.items.forEach(item => {
        item = normalizeItem(item);
        const row = document.createElement("article");
        row.className = `item-row${isSelected(item.id) ? " selected" : ""}${overlaps.has(item.id) ? " overlap" : ""}`;
        row.dataset.select = item.id;
        row.innerHTML = `
          <header>
            <strong><span class="swatch" style="background:${item.color}"></span>${itemCode(item)} ${escapeHtml(item.name)}</strong>
            <button class="danger" type="button" data-remove="${item.id}">Remove</button>
          </header>
          <div class="small">${itemTypeLabel(item.type)}, ${item.shape === "circle" ? "circular" : "rectangular"}${item.illuminated ? ", illuminated" : ""} | ${itemPositionLabel(item)} | ${itemSizeLabel(item)}${overlaps.has(item.id) ? " | OVERLAP" : ""}</div>
        `;
        els.itemList.append(row);
      });
    }

    function escapeHtml(text) {
      return String(text).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]);
    }

    function render(options = {}) {
      if (!options.canvasOnly) {
        if (!options.skipList) renderItemList();
        renderWallTabs();
        updateProjectHeader();
        syncItemInputs();
        updateToolButtons();
      }
      if (state.view === "elevation") {
        drawElevation();
      } else if (state.view === "perspective") {
        drawPerspective();
      } else if (state.view === "space2d") {
        drawSpace2D();
      } else {
        drawSpace3D();
      }
    }

    function applyLayout(layout) {
      if (layout.wall) {
        state.wall = {
          ...state.wall,
          width: number(layout.wall.width, state.wall.width),
          height: number(layout.wall.height, state.wall.height),
          depth: number(layout.wall.depth, state.wall.depth),
          color: layout.wall.color || state.wall.color
        };
      }
      if (Array.isArray(layout.items)) {
        state.items = layout.items.map(item => ({
          id: uid(),
          name: item.name || titleCase(item.type || "Object"),
        type: canonicalItemType(item.type),
          x: number(item.x, 0),
          y: number(item.y, 0),
          width: Math.max(10, number(item.width, 100)),
          height: Math.max(10, number(item.height, 100)),
          color: item.color || colorForType(item.type)
        }));
      }
      syncInputsFromWall();
      save();
      render();
    }

    function pointerPosition(event) {
      const rect = els.canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function normalizeDegrees(value) {
      const normalized = Number(value) % 360;
      return normalized < 0 ? normalized + 360 : normalized;
    }

    function is2dView() {
      return state.view === "elevation" || state.view === "space2d";
    }

    function activeTool() {
      if (state.handOverride && is2dView()) return "hand";
      return state.tool === "hand" ? "hand" : "select";
    }

    function updateToolButtons() {
      const isHand = activeTool() === "hand";
      els.toolSelect.classList.toggle("active", !isHand);
      els.toolHand.classList.toggle("active", isHand);
      if (els.guideToggle) {
        els.guideToggle.classList.toggle("active", currentGuides().visible !== false);
      }
      if (state.panDrag && is2dView()) {
        els.canvas.style.cursor = "grabbing";
      } else {
        els.canvas.style.cursor = isHand && is2dView() ? "grab" : "";
      }
    }

    function setTool(tool) {
      state.tool = tool === "hand" ? "hand" : "select";
      state.handOverride = false;
      state.panDrag = null;
      updateToolButtons();
      save();
      render({ canvasOnly: true });
    }

    function guideAtPoint(point) {
      if (state.view !== "elevation") return null;
      if (currentGuides().visible === false) return null;
      const width = els.canvas.width / (window.devicePixelRatio || 1);
      const height = els.canvas.height / (window.devicePixelRatio || 1);
      const geom = elevationGeometry(width, height);
      const guides = currentGuides();
      const threshold = 6;
      for (const value of guides.vertical) {
        const x = mmX(geom, value);
        if (Math.abs(point.x - x) <= threshold) return { axis: "x", value };
      }
      for (const value of guides.horizontal) {
        const y = mmY(geom, value);
        if (Math.abs(point.y - y) <= threshold) return { axis: "y", value };
      }
      return null;
    }

    function rulerHit(point) {
      if (state.view !== "elevation") return null;
      const rulerSize = 28;
      if (point.y <= rulerSize && point.x > rulerSize) return { axis: "x" };
      if (point.x <= rulerSize && point.y > rulerSize) return { axis: "y" };
      return null;
    }

    function isEditableTarget(target) {
      if (!target || !(target instanceof Element)) return false;
      return Boolean(target.closest("input, textarea, select, button, [contenteditable='true']"));
    }

    function zoomView(amount) {
      if (is2dView()) {
        state.view2d.zoom = clamp(Number((state.view2d.zoom + amount).toFixed(2)), 0.45, 3.5);
      } else {
        state.view3d.zoom = clamp(Number((state.view3d.zoom + amount).toFixed(2)), 0.55, 3);
      }
      save();
      render({ canvasOnly: true });
    }

    function resetView() {
      if (is2dView()) {
        state.view2d.zoom = 1;
        state.view2d.panX = 0;
        state.view2d.panY = 0;
      } else {
        state.view3d.zoom = 1;
        state.view3d.rotX = -10;
        state.view3d.rotY = 24;
        state.view3d.rotZ = 0;
        delete state.view3d.yaw;
        delete state.view3d.pitch;
        delete state.view3d.roll;
      }
      save();
      render({ canvasOnly: true });
    }

    function rotate3d(axis, amount) {
      state.view3d.rotX = state.view3d.rotX ?? state.view3d.pitch ?? -10;
      state.view3d.rotY = state.view3d.rotY ?? state.view3d.yaw ?? 24;
      state.view3d.rotZ = state.view3d.rotZ ?? state.view3d.roll ?? 0;
      if (axis === "x") state.view3d.rotX = normalizeDegrees(state.view3d.rotX + amount);
      if (axis === "y") state.view3d.rotY = normalizeDegrees(state.view3d.rotY + amount);
      if (axis === "z") state.view3d.rotZ = normalizeDegrees(state.view3d.rotZ + amount);
      save();
      render({ canvasOnly: true });
    }

    function selectionBounds(items) {
      return items.reduce((bounds, item) => ({
        left: Math.min(bounds.left, item.x),
        right: Math.max(bounds.right, item.x + item.width),
        bottom: Math.min(bounds.bottom, item.y),
        top: Math.max(bounds.top, item.y + item.height)
      }), { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity });
    }

    function alignSelection(mode) {
      const items = selectedItems();
      if (items.length < 2) return;
      const bounds = selectionBounds(items);
      const centerX = (bounds.left + bounds.right) / 2;
      const centerY = (bounds.bottom + bounds.top) / 2;

      items.forEach(item => {
        if (mode === "left") item.x = bounds.left;
        if (mode === "center") item.x = Math.round(centerX - item.width / 2);
        if (mode === "right") item.x = bounds.right - item.width;
        if (mode === "bottom") item.y = bounds.bottom;
        if (mode === "middle") item.y = Math.round(centerY - item.height / 2);
        if (mode === "top") item.y = bounds.top - item.height;
        clampItemToWall(item);
      });
      save();
      render();
    }

    function distributeSelection(axis) {
      const items = selectedItems();
      if (items.length < 3) return;
      const sorted = [...items].sort((a, b) => axis === "h" ? a.x - b.x : a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const start = axis === "h" ? first.x + first.width / 2 : first.y + first.height / 2;
      const end = axis === "h" ? last.x + last.width / 2 : last.y + last.height / 2;
      const gap = (end - start) / (sorted.length - 1);
      sorted.forEach((item, index) => {
        const center = Math.round(start + gap * index);
        if (axis === "h") item.x = center - item.width / 2;
        if (axis === "v") item.y = center - item.height / 2;
        clampItemToWall(item);
      });
      save();
      render();
    }
