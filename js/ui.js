    function renderItemList() {
      els.itemList.innerHTML = "";
      const overlaps = overlapIds();
      const count = selectedIds().length;
      const visibleItems = itemsForSide(activeWallSide());
      const overlapText = overlaps.size ? `${overlaps.size} object${overlaps.size === 1 ? "" : "s"} need overlap attention.` : "No overlaps detected.";
      els.overlapSummary.textContent = `${sideLabel(activeWallSide())} side. ${overlapText} ${count} selected.`;
      if (!visibleItems.length) {
        const empty = document.createElement("p");
        empty.className = "small empty-state";
        empty.textContent = `No ${sideLabel(activeWallSide()).toLowerCase()} objects yet. Add the first piece above.`;
        els.itemList.append(empty);
        return;
      }

      visibleItems.forEach(item => {
        item = normalizeItem(item);
        const row = document.createElement("article");
        row.className = `item-row${isSelected(item.id) ? " selected" : ""}${overlaps.has(item.id) ? " overlap" : ""}`;
        row.dataset.select = item.id;
        row.innerHTML = `
          <header>
            <strong><span class="swatch" style="background:${item.color}"></span>${itemCode(item)} ${escapeHtml(item.name)}</strong>
            <button class="danger" type="button" data-remove="${item.id}">Remove</button>
          </header>
          <div class="small">${itemSideLabel(item)} / ${itemTypeLabel(item.type)}, ${item.shape === "circle" ? "circular" : "rectangular"}${item.illuminated ? ", illuminated" : ""}${item.hanging ? ", hanging" : ""} / ${itemPositionLabel(item)} / ${itemSizeLabel(item)}${item.notes ? ` / ${escapeHtml(item.notes)}` : ""}${overlaps.has(item.id) ? " / Overlap" : ""}</div>
        `;
        els.itemList.append(row);
      });
    }

    function renderRoomElementList() {
      if (!els.roomElementList) return;
      els.roomElementList.innerHTML = "";
      const elements = (state.roomElements || []).map(normalizeRoomElement);
      if (!elements.length) {
        const empty = document.createElement("p");
        empty.className = "small empty-state";
        empty.textContent = "No room items yet. Add furniture, projection, or reference volumes when needed.";
        els.roomElementList.append(empty);
        return;
      }
      elements.forEach(element => {
        const row = document.createElement("article");
        row.className = `item-row${isSpaceEntitySelected("room", element.id) || element.id === state.selectedRoomElementId ? " selected" : ""}`;
        row.dataset.roomSelect = element.id;
        row.innerHTML = `
          <header>
            <strong><span class="swatch" style="background:${element.color}"></span>${escapeHtml(element.name)}</strong>
            <button class="danger" type="button" data-room-remove="${element.id}">Remove</button>
          </header>
          <div class="small">${roomElementTypeLabel(element.type)}, ${element.shape === "circle" ? "circular" : "rectangular"} / center ${Math.round(element.x)}, ${Math.round(element.y)} mm / ${Math.round(element.width)} x ${Math.round(element.depth)} x ${Math.round(element.height)} mm</div>
        `;
        els.roomElementList.append(row);
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
        renderRoomElementList();
        renderWallTabs();
        updateProjectHeader();
        syncItemInputs();
        syncRoomElementInputs();
        updateContextPanels();
        updateToolButtons();
        updateObjectHistoryButtons();
        updateUnsavedIndicator();
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
          side: normalizeWallSide(item.side || activeWallSide()),
          shape: validShapeForType(item.type, item.shape || "rect"),
          text: item.text || "",
          notes: item.notes || "",
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

    function updateUnsavedIndicator() {
      if (!els.unsavedIndicator) return;
      els.unsavedIndicator.hidden = !state.unsavedChanges;
      els.unsavedIndicator.textContent = state.unsavedChanges ? "Unsaved changes" : "";
    }

    function updateContextPanels() {
      document.querySelectorAll("[data-panel]").forEach(section => {
        const views = String(section.dataset.panel || "").split(/\s+/).filter(Boolean);
        section.hidden = views.length ? !views.includes(state.view) : false;
      });
      updatePreviewControls();
    }

    function setHidden(element, hidden) {
      if (element) element.hidden = hidden;
    }

    function updatePreviewControls() {
      const is3d = state.view === "perspective" || state.view === "space3d";
      setHidden(els.rotateXDown, !is3d);
      setHidden(els.rotateXUp, !is3d);
      setHidden(els.rotateZLeft, true);
      setHidden(els.rotateZRight, true);
      setHidden(els.rotateYLeft, !is3d);
      setHidden(els.rotateYRight, !is3d);
      setHidden(els.toolSelect, !is2dView());
      setHidden(els.toolHand, !is2dView());
      setHidden(els.guideToggle, !is2dView());
      setHidden(els.clearGuides, !is2dView());
      const guideGroup = els.guideToggle?.closest(".toolbar-disclosure") || els.guideToggle?.closest(".view-controls");
      if (guideGroup) guideGroup.hidden = !is2dView();
      const alignGroup = els.alignLeft?.closest(".toolbar-disclosure") || els.alignLeft?.closest(".view-controls");
      if (alignGroup) alignGroup.hidden = !is2dView();
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
      if (!is2dView()) return null;
      if (currentGuides().visible === false) return null;
      const width = els.canvas.width / (window.devicePixelRatio || 1);
      const height = els.canvas.height / (window.devicePixelRatio || 1);
      const geom = state.view === "space2d" ? spaceGeometry(width, height) : elevationGeometry(width, height);
      const guides = currentGuides();
      const threshold = 6;
      for (const value of guides.vertical) {
        const x = state.view === "space2d" ? spacePoint(geom, value, 0).x : mmX(geom, value);
        if (Math.abs(point.x - x) <= threshold) return { axis: "x", value };
      }
      for (const value of guides.horizontal) {
        const y = state.view === "space2d" ? spacePoint(geom, 0, value).y : mmY(geom, value);
        if (Math.abs(point.y - y) <= threshold) return { axis: "y", value };
      }
      return null;
    }

    function rulerHit(point) {
      if (!is2dView()) return null;
      const rulerSize = 28;
      if (point.y <= rulerSize && point.x > rulerSize) return { axis: "y" };
      if (point.x <= rulerSize && point.y > rulerSize) return { axis: "x" };
      return null;
    }

    function isEditableTarget(target) {
      if (!target || !(target instanceof Element)) return false;
      return Boolean(target.closest("input, textarea, select, button, summary, [contenteditable='true']"));
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
        state.view3d.roomRotX = -52;
        state.view3d.roomRotY = 26;
        state.view3d.roomRotZ = 0;
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
      if (axis === "x" && state.view === "space3d") {
        state.view3d.roomRotX = clamp((state.view3d.roomRotX ?? -52) + amount, -85, 25);
      } else if (axis === "x") {
        state.view3d.rotX = clamp(state.view3d.rotX + amount, -85, 85);
      }
      if (axis === "y" && state.view === "space3d") {
        state.view3d.roomRotY = normalizeDegrees((state.view3d.roomRotY ?? 26) + amount);
      } else if (axis === "y") {
        state.view3d.rotY = normalizeDegrees(state.view3d.rotY + amount);
      }
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

    function spaceWallBounds(wall) {
      const footprint = wallSpaceFootprint(wall);
      const points = [footprint.frontA, footprint.frontB, footprint.backB, footprint.backA];
      const bounds = points.reduce((box, point) => ({
        left: Math.min(box.left, point.x),
        right: Math.max(box.right, point.x),
        bottom: Math.min(box.bottom, point.y),
        top: Math.max(box.top, point.y)
      }), { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity });
      bounds.centerX = (bounds.left + bounds.right) / 2;
      bounds.centerY = (bounds.bottom + bounds.top) / 2;
      return bounds;
    }

    function roomElementBounds(element) {
      return {
        left: element.x - element.width / 2,
        right: element.x + element.width / 2,
        bottom: element.y - element.depth / 2,
        top: element.y + element.depth / 2,
        centerX: element.x,
        centerY: element.y
      };
    }

    function spaceEntityFromKey(key) {
      const parsed = parseSpaceEntityKey(key);
      if (!parsed) return null;
      if (parsed.type === "wall") {
        const wall = (state.walls || []).find(candidate => candidate.id === parsed.id);
        if (!wall) return null;
        const bounds = spaceWallBounds(wall);
        return {
          key,
          type: "wall",
          id: wall.id,
          target: wall,
          bounds,
          centerX: number(wall.placement?.x, bounds.centerX),
          centerY: number(wall.placement?.y, bounds.centerY)
        };
      }
      const element = (state.roomElements || []).find(candidate => candidate.id === parsed.id);
      if (!element) return null;
      const bounds = roomElementBounds(element);
      return {
        key,
        type: "room",
        id: element.id,
        target: element,
        bounds,
        centerX: element.x,
        centerY: element.y
      };
    }

    function selectedSpaceEntities() {
      return selectedSpaceIds().map(spaceEntityFromKey).filter(Boolean);
    }

    function spaceSelectionBounds(entities) {
      return entities.reduce((bounds, entity) => ({
        left: Math.min(bounds.left, entity.bounds.left),
        right: Math.max(bounds.right, entity.bounds.right),
        bottom: Math.min(bounds.bottom, entity.bounds.bottom),
        top: Math.max(bounds.top, entity.bounds.top)
      }), { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity });
    }

    function setSpaceEntityCenter(entity, x, y) {
      if (entity.type === "wall") {
        entity.target.placement.x = clamp(Math.round(x), 0, state.space.width);
        entity.target.placement.y = clamp(Math.round(y), 0, state.space.depth);
        return;
      }
      entity.target.x = Math.round(x);
      entity.target.y = Math.round(y);
      clampRoomElementToSpace(entity.target);
    }

    function moveSpaceEntityBy(entity, deltaX, deltaY) {
      setSpaceEntityCenter(entity, entity.centerX + deltaX, entity.centerY + deltaY);
    }

    function syncSpaceSelectionInputs() {
      syncInputsFromWall();
      syncRoomElementInputs();
    }

    function spaceSnapTargets(excludeKeys = []) {
      const exclude = new Set(excludeKeys);
      const vertical = [
        { value: 0, line: { axis: "x", value: 0 } },
        { value: state.space.width / 2, line: { axis: "x", value: state.space.width / 2 } },
        { value: state.space.width, line: { axis: "x", value: state.space.width } }
      ];
      const horizontal = [
        { value: 0, line: { axis: "y", value: 0 } },
        { value: state.space.depth / 2, line: { axis: "y", value: state.space.depth / 2 } },
        { value: state.space.depth, line: { axis: "y", value: state.space.depth } }
      ];
      const guides = currentGuides();
      if (guides.visible !== false) {
        guides.vertical.forEach(value => vertical.push({ value, line: { axis: "x", value } }));
        guides.horizontal.forEach(value => horizontal.push({ value, line: { axis: "y", value } }));
      }
      [
        ...(state.walls || []).map(wall => spaceEntityKey("wall", wall.id)),
        ...(state.roomElements || []).map(element => spaceEntityKey("room", element.id))
      ].forEach(key => {
        if (exclude.has(key)) return;
        const entity = spaceEntityFromKey(key);
        if (!entity) return;
        vertical.push(
          { value: entity.bounds.left, line: { axis: "x", value: entity.bounds.left } },
          { value: entity.bounds.centerX, line: { axis: "x", value: entity.bounds.centerX } },
          { value: entity.bounds.right, line: { axis: "x", value: entity.bounds.right } }
        );
        horizontal.push(
          { value: entity.bounds.bottom, line: { axis: "y", value: entity.bounds.bottom } },
          { value: entity.bounds.centerY, line: { axis: "y", value: entity.bounds.centerY } },
          { value: entity.bounds.top, line: { axis: "y", value: entity.bounds.top } }
        );
      });
      return { vertical, horizontal };
    }

    function alignSpaceSelection(mode) {
      const entities = selectedSpaceEntities();
      if (entities.length < 2) return;
      const bounds = spaceSelectionBounds(entities);
      const centerX = (bounds.left + bounds.right) / 2;
      const centerY = (bounds.bottom + bounds.top) / 2;
      entities.forEach(entity => {
        let deltaX = 0;
        let deltaY = 0;
        if (mode === "left") deltaX = bounds.left - entity.bounds.left;
        if (mode === "center") deltaX = centerX - entity.bounds.centerX;
        if (mode === "right") deltaX = bounds.right - entity.bounds.right;
        if (mode === "bottom") deltaY = bounds.bottom - entity.bounds.bottom;
        if (mode === "middle") deltaY = centerY - entity.bounds.centerY;
        if (mode === "top") deltaY = bounds.top - entity.bounds.top;
        moveSpaceEntityBy(entity, deltaX, deltaY);
      });
      syncSpaceSelectionInputs();
      save();
      render();
    }

    function alignSelection(mode) {
      if (state.view === "space2d") {
        alignSpaceSelection(mode);
        return;
      }
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

    function distributeSpaceSelection(axis) {
      const entities = selectedSpaceEntities();
      if (entities.length < 3) return;
      const sorted = [...entities].sort((a, b) => axis === "h" ? a.bounds.centerX - b.bounds.centerX : a.bounds.centerY - b.bounds.centerY);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const start = axis === "h" ? first.bounds.centerX : first.bounds.centerY;
      const end = axis === "h" ? last.bounds.centerX : last.bounds.centerY;
      const gap = (end - start) / (sorted.length - 1);
      sorted.forEach((entity, index) => {
        const center = Math.round(start + gap * index);
        if (axis === "h") moveSpaceEntityBy(entity, center - entity.bounds.centerX, 0);
        if (axis === "v") moveSpaceEntityBy(entity, 0, center - entity.bounds.centerY);
      });
      syncSpaceSelectionInputs();
      save();
      render();
    }

    function distributeSelection(axis) {
      if (state.view === "space2d") {
        distributeSpaceSelection(axis);
        return;
      }
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
