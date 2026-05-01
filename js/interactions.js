    function itemAtPoint(point) {
      const width = els.canvas.width / (window.devicePixelRatio || 1);
      const height = els.canvas.height / (window.devicePixelRatio || 1);
      const geom = elevationGeometry(width, height);
      for (let i = state.items.length - 1; i >= 0; i -= 1) {
        if (pointInItem(point, normalizeItem(state.items[i]), geom)) {
          return { item: state.items[i], geom };
        }
      }
      return { item: null, geom };
    }

    function wallAtSpacePoint(point) {
      const width = els.canvas.width / (window.devicePixelRatio || 1);
      const height = els.canvas.height / (window.devicePixelRatio || 1);
      const geom = spaceGeometry(width, height);
      for (let i = state.walls.length - 1; i >= 0; i -= 1) {
        const wall = state.walls[i];
        const ends = wallSpaceEndpoints(wall);
        const a = spacePoint(geom, ends.a.x, ends.a.y);
        const b = spacePoint(geom, ends.b.x, ends.b.y);
        const lengthSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
        const t = lengthSq ? Math.max(0, Math.min(1, ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / lengthSq)) : 0;
        const closest = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        if (Math.hypot(point.x - closest.x, point.y - closest.y) <= 14) return { wall, geom };
      }
      return { wall: null, geom };
    }

    function startDrag(event) {
      const middlePan = event.button === 1 && is2dView();
      if (event.button !== undefined && event.button !== 0 && !middlePan) return;
      if ((activeTool() === "hand" && is2dView()) || middlePan) {
        state.panDrag = {
          startX: event.clientX,
          startY: event.clientY,
          panX: number(state.view2d.panX, 0),
          panY: number(state.view2d.panY, 0)
        };
        els.canvas.style.cursor = "grabbing";
        if (typeof els.canvas.setPointerCapture === "function") {
          els.canvas.setPointerCapture(event.pointerId);
        }
        return;
      }
      if (state.view === "space2d") {
        const point = pointerPosition(event);
        const { wall, geom } = wallAtSpacePoint(point);
        if (!wall) return;
        syncActiveWallRecord();
        state.activeWallId = wall.id;
        loadActiveWall();
        syncInputsFromWall();
        state.drag = {
          type: "spaceWall",
          id: wall.id,
          offsetX: (point.x - geom.x) / geom.scale - wall.placement.x,
          offsetY: (geom.y + geom.h - point.y) / geom.scale - wall.placement.y
        };
        if (typeof els.canvas.setPointerCapture === "function") {
          els.canvas.setPointerCapture(event.pointerId);
        }
        render();
        return;
      }
      if (state.view === "perspective" || state.view === "space3d") {
        state.rotateDrag = {
          startX: event.clientX,
          startY: event.clientY,
          startRotY: state.view3d.rotY ?? state.view3d.yaw ?? 24,
          startRotX: state.view3d.rotX ?? state.view3d.pitch ?? -10,
          startRotZ: state.view3d.rotZ ?? state.view3d.roll ?? 0
        };
        if (typeof els.canvas.setPointerCapture === "function") {
          els.canvas.setPointerCapture(event.pointerId);
        }
        return;
      }
      if (state.view !== "elevation") return;
      const point = pointerPosition(event);
      const canvasWidth = els.canvas.width / (window.devicePixelRatio || 1);
      const canvasHeight = els.canvas.height / (window.devicePixelRatio || 1);
      const handleGeom = elevationGeometry(canvasWidth, canvasHeight);
      const resizeItem = resizeHandleAt(point, handleGeom);
      if (resizeItem) {
        state.resizeDrag = {
          id: resizeItem.id,
          startX: point.x,
          startY: point.y,
          width: resizeItem.width,
          height: resizeItem.height
        };
        if (typeof els.canvas.setPointerCapture === "function") {
          els.canvas.setPointerCapture(event.pointerId);
        }
        return;
      }
      const { item, geom } = itemAtPoint(point);
      if (!item) {
        if (!event.shiftKey) setSelection([]);
        render();
        return;
      }
      if (event.shiftKey) {
        toggleSelection(item.id);
      } else if (!isSelected(item.id)) {
        setSelection([item.id]);
      }
      const draggedItems = selectedItems();
      state.drag = {
        id: item.id,
        offsetX: (point.x - mmX(geom, item.x)) / geom.scale,
        offsetY: (mmY(geom, item.y + item.height) + item.height * geom.scale - point.y) / geom.scale,
        starts: draggedItems.map(candidate => ({ id: candidate.id, x: candidate.x, y: candidate.y })),
        bounds: selectionBounds(draggedItems),
        originX: item.x,
        originY: item.y
      };
      if (typeof els.canvas.setPointerCapture === "function") {
        els.canvas.setPointerCapture(event.pointerId);
      }
      render();
    }

    function moveDrag(event) {
      if (state.panDrag && is2dView()) {
        state.view2d.panX = Math.round(state.panDrag.panX + event.clientX - state.panDrag.startX);
        state.view2d.panY = Math.round(state.panDrag.panY + event.clientY - state.panDrag.startY);
        render({ canvasOnly: true });
        return;
      }
      if (state.rotateDrag && (state.view === "perspective" || state.view === "space3d")) {
        if (event.shiftKey) {
          state.view3d.rotZ = normalizeDegrees(state.rotateDrag.startRotZ + (event.clientX - state.rotateDrag.startX) * 0.32);
        } else {
          state.view3d.rotY = normalizeDegrees(state.rotateDrag.startRotY + (event.clientX - state.rotateDrag.startX) * 0.28);
          state.view3d.rotX = normalizeDegrees(state.rotateDrag.startRotX - (event.clientY - state.rotateDrag.startY) * 0.22);
        }
        render({ canvasOnly: true });
        return;
      }
      if (state.resizeDrag && state.view === "elevation") {
        const item = state.items.find(candidate => candidate.id === state.resizeDrag.id);
        if (!item) return;
        const width = els.canvas.width / (window.devicePixelRatio || 1);
        const height = els.canvas.height / (window.devicePixelRatio || 1);
        const geom = elevationGeometry(width, height);
        const point = pointerPosition(event);
        const deltaW = (point.x - state.resizeDrag.startX) / geom.scale;
        const deltaH = -(point.y - state.resizeDrag.startY) / geom.scale;
        let nextW = Math.max(50, Math.round(state.resizeDrag.width + deltaW));
        let nextH = Math.max(50, Math.round(state.resizeDrag.height + deltaH));
        const targets = snapTargets([item.id]);
        const snappedRight = snapValue(item.x + nextW, targets.vertical);
        const snappedTop = snapValue(item.y + nextH, targets.horizontal);
        state.snapLines = [];
        if (snappedRight.line) {
          nextW = Math.round(snappedRight.value - item.x);
          state.snapLines.push(snappedRight.line);
        }
        if (snappedTop.line) {
          nextH = Math.round(snappedTop.value - item.y);
          state.snapLines.push(snappedTop.line);
        }
        item.width = Math.max(50, Math.min(state.wall.width - item.x, nextW));
        item.height = Math.max(50, Math.min(state.wall.height - item.y, nextH));
        render({ canvasOnly: true });
        return;
      }
      if (state.drag && state.drag.type === "spaceWall") {
        const wall = state.walls.find(candidate => candidate.id === state.drag.id);
        if (!wall) return;
        const width = els.canvas.width / (window.devicePixelRatio || 1);
        const height = els.canvas.height / (window.devicePixelRatio || 1);
        const geom = spaceGeometry(width, height);
        const point = pointerPosition(event);
        wall.placement.x = Math.round((point.x - geom.x) / geom.scale - state.drag.offsetX);
        wall.placement.y = Math.round((geom.y + geom.h - point.y) / geom.scale - state.drag.offsetY);
        wall.placement.x = clamp(wall.placement.x, 0, state.space.width);
        wall.placement.y = clamp(wall.placement.y, 0, state.space.depth);
        if (wall.id === state.activeWallId) syncInputsFromWall();
        render({ canvasOnly: true });
        return;
      }
      if (!state.drag || state.view !== "elevation") return;
      if (state.view !== "elevation") return;
      const item = state.items.find(candidate => candidate.id === state.drag.id);
      if (!item) return;
      const width = els.canvas.width / (window.devicePixelRatio || 1);
      const height = els.canvas.height / (window.devicePixelRatio || 1);
      const geom = elevationGeometry(width, height);
      const point = pointerPosition(event);
      const nextX = Math.round((point.x - geom.x) / geom.scale - state.drag.offsetX);
      const nextY = Math.round((geom.y + geom.h - point.y) / geom.scale - state.drag.offsetY);
      let deltaX = nextX - state.drag.originX;
      let deltaY = nextY - state.drag.originY;
      const dragged = state.drag.starts || [{ id: item.id, x: item.x, y: item.y }];
      if (state.drag.bounds) {
        deltaX = clamp(deltaX, -state.drag.bounds.left, state.wall.width - state.drag.bounds.right);
        deltaY = clamp(deltaY, -state.drag.bounds.bottom, state.wall.height - state.drag.bounds.top);
        const targets = snapTargets(dragged.map(start => start.id));
        const leftSnap = snapValue(state.drag.bounds.left + deltaX, targets.vertical);
        const rightSnap = snapValue(state.drag.bounds.right + deltaX, targets.vertical);
        const bottomSnap = snapValue(state.drag.bounds.bottom + deltaY, targets.horizontal);
        const topSnap = snapValue(state.drag.bounds.top + deltaY, targets.horizontal);
        state.snapLines = [];
        const bestX = leftSnap.line && (!rightSnap.line || leftSnap.distance <= rightSnap.distance) ? leftSnap : rightSnap;
        const bestY = bottomSnap.line && (!topSnap.line || bottomSnap.distance <= topSnap.distance) ? bottomSnap : topSnap;
        if (bestX.line) {
          deltaX += bestX.value - (bestX === leftSnap ? state.drag.bounds.left + deltaX : state.drag.bounds.right + deltaX);
          state.snapLines.push(bestX.line);
        }
        if (bestY.line) {
          deltaY += bestY.value - (bestY === bottomSnap ? state.drag.bounds.bottom + deltaY : state.drag.bounds.top + deltaY);
          state.snapLines.push(bestY.line);
        }
      }
      dragged.forEach(start => {
        const candidate = state.items.find(entry => entry.id === start.id);
        if (!candidate) return;
        candidate.x = Math.round(start.x + deltaX);
        candidate.y = Math.round(start.y + deltaY);
      });
      render({ canvasOnly: true });
    }

    function stopDrag(event) {
      if (state.panDrag) {
        state.panDrag = null;
        if (event.pointerId !== undefined && typeof els.canvas.hasPointerCapture === "function" && els.canvas.hasPointerCapture(event.pointerId)) {
          els.canvas.releasePointerCapture(event.pointerId);
        }
        updateToolButtons();
        save();
        render();
        return;
      }
      if (state.rotateDrag) {
        state.rotateDrag = null;
        if (event.pointerId !== undefined && typeof els.canvas.hasPointerCapture === "function" && els.canvas.hasPointerCapture(event.pointerId)) {
          els.canvas.releasePointerCapture(event.pointerId);
        }
        save();
        render();
        return;
      }
      if (state.resizeDrag) {
        state.resizeDrag = null;
        state.snapLines = [];
        if (event.pointerId !== undefined && typeof els.canvas.hasPointerCapture === "function" && els.canvas.hasPointerCapture(event.pointerId)) {
          els.canvas.releasePointerCapture(event.pointerId);
        }
        save();
        render();
        return;
      }
      if (!state.drag) return;
      state.drag = null;
      state.snapLines = [];
      if (event.pointerId !== undefined && typeof els.canvas.hasPointerCapture === "function" && els.canvas.hasPointerCapture(event.pointerId)) {
        els.canvas.releasePointerCapture(event.pointerId);
      }
      save();
      render();
    }

    function serializedItem(item) {
      const normalized = normalizeItem(item);
      return {
        id: normalized.id || uid(),
        name: normalized.name || itemTypeLabel(normalized.type),
        type: normalized.type,
        shape: normalized.shape || "rect",
        text: normalized.text || "",
        image: normalized.image || "",
        illuminated: Boolean(normalized.illuminated),
        x: Math.max(0, number(normalized.x, 0)),
        y: Math.max(0, number(normalized.y, 0)),
        width: Math.max(10, number(normalized.width, 100)),
        height: Math.max(10, number(normalized.height, 100)),
        color: normalized.color || colorForType(normalized.type)
      };
    }

    function serializedWallRecord(wall, index) {
      return {
        id: wall.id || uid(),
        name: wall.name || `Wall ${index + 1}`,
        wall: {
          width: Math.max(100, number(wall.wall?.width, 6000)),
          height: Math.max(100, number(wall.wall?.height, 3000)),
          depth: Math.max(40, number(wall.wall?.depth, 120)),
          color: wall.wall?.color || "#f5f4ea"
        },
        items: Array.isArray(wall.items) ? wall.items.map(serializedItem) : [],
        placement: {
          x: number(wall.placement?.x, 1000),
          y: number(wall.placement?.y, 1000),
          rotation: number(wall.placement?.rotation, 0)
        }
      };
    }

    function serializedState() {
      return {
        version: 2,
        view: state.view,
        tool: state.tool === "hand" ? "hand" : "select",
        theme: state.theme === "light" ? "light" : "dark",
        view2d: {
          zoom: number(state.view2d.zoom, 1),
          panX: number(state.view2d.panX, 0),
          panY: number(state.view2d.panY, 0)
        },
        view3d: {
          zoom: number(state.view3d.zoom, 1),
          rotX: number(state.view3d.rotX ?? state.view3d.pitch, -10),
          rotY: number(state.view3d.rotY ?? state.view3d.yaw, 24),
          rotZ: number(state.view3d.rotZ ?? state.view3d.roll, 0)
        },
        project: {
          title: state.project.title || "Untitled exhibition",
          fileName: state.project.fileName || "",
          lastLocalSaveAt: state.project.lastLocalSaveAt || "",
          lastFileSaveAt: state.project.lastFileSaveAt || ""
        },
        space: {
          width: Math.max(1000, number(state.space.width, 12000)),
          depth: Math.max(1000, number(state.space.depth, 8000)),
          floorColor: state.space.floorColor || "#101113",
          surroundColor: state.space.surroundColor || "#070708",
          cinematicLight: state.space.cinematicLight !== false
        },
        activeWallId: state.activeWallId,
        walls: state.walls.map(serializedWallRecord)
      };
    }

    function projectSnapshot() {
      const data = serializedState();
      data.project = {
        title: data.project.title || "Untitled exhibition"
      };
      return {
        app: "Exhibition Wall Mockup Maker",
        format: "ewmm",
        version: 1,
        savedAt: new Date().toISOString(),
        data
      };
    }

    function suggestedProjectFileName() {
      const base = String(state.project.title || "untitled-exhibition")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "untitled-exhibition";
      return `${base}.ewmm.json`;
    }

    function applySerializedState(source, options = {}) {
      const parsed = source && typeof source === "object" && source.data ? source.data : source;
      const nextFileName = options.fileName || "";
      state.view = parsed.view || state.view;
      state.tool = parsed.tool === "hand" ? "hand" : "select";
      state.handOverride = false;
      state.theme = parsed.theme === "light" ? "light" : "dark";
      state.view2d = { ...state.view2d, ...parsed.view2d };
      state.view2d.zoom = number(state.view2d.zoom, 1);
      state.view2d.panX = number(state.view2d.panX, 0);
      state.view2d.panY = number(state.view2d.panY, 0);
      state.view3d = { ...state.view3d, ...parsed.view3d };
      state.view3d.rotX = state.view3d.rotX ?? state.view3d.pitch ?? -10;
      state.view3d.rotY = state.view3d.rotY ?? state.view3d.yaw ?? 24;
      state.view3d.rotZ = state.view3d.rotZ ?? state.view3d.roll ?? 0;
      delete state.view3d.yaw;
      delete state.view3d.pitch;
      delete state.view3d.roll;
      state.space = { ...state.space, ...parsed.space };
      if (state.space.floorColor === "#1d2a23") state.space.floorColor = "#101113";
      if (state.space.surroundColor === "#202821") state.space.surroundColor = "#070708";
      state.project = {
        ...state.project,
        ...parsed.project,
        fileName: nextFileName || parsed.project?.fileName || ""
      };
      state.activeWallId = parsed.activeWallId || state.activeWallId;
      state.walls = Array.isArray(parsed.walls) ? parsed.walls.map((wall, index) => ({
        id: wall.id || uid(),
        name: wall.name || `Wall ${index + 1}`,
        wall: { width: 6000, height: 3000, depth: 120, color: "#f5f4ea", ...wall.wall },
        items: Array.isArray(wall.items) ? wall.items.map(normalizeItem) : [],
        placement: { x: 1000, y: 1000, rotation: 0, ...wall.placement }
      })) : state.walls;
      if (!state.walls.length) {
        state.wall = { ...state.wall, ...parsed.wall };
        state.items = Array.isArray(parsed.items) ? parsed.items.map(normalizeItem) : state.items;
      }
      ensureWalls();
      loadActiveWall();
      setSelection([]);
      state.drag = null;
      state.panDrag = null;
      state.rotateDrag = null;
      state.resizeDrag = null;
      state.snapLines = [];
    }

    function flushSave() {
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = null;
      syncActiveWallRecord();
      state.project.lastLocalSaveAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedState()));
      updateProjectSaveHint();
    }

    function scheduleProjectAutosave() {
      if (!projectFileHandle) return;
      if (projectPersistTimer) clearTimeout(projectPersistTimer);
      projectPersistTimer = setTimeout(async () => {
        try {
          await saveProjectFile({ autosave: true });
        } catch (error) {
          if (error?.name === "AbortError") return;
          console.error(error);
        }
      }, PROJECT_AUTOSAVE_DELAY);
    }

    function save(options = {}) {
      if (options.immediate) {
        flushSave();
        return;
      }
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = setTimeout(() => {
        flushSave();
      }, PERSIST_DELAY);
      if (!options.skipProjectAutosave) {
        scheduleProjectAutosave();
      }
    }

    function load() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      try {
        applySerializedState(JSON.parse(saved));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    async function saveProjectFile(options = {}) {
      const useSaveAs = Boolean(options.saveAs);
      const autosave = Boolean(options.autosave);
      const snapshot = projectSnapshot();
      const fileName = suggestedProjectFileName();
      const content = `${JSON.stringify(snapshot, null, 2)}\n`;
      if (typeof window.showSaveFilePicker === "function") {
        let handle = projectFileHandle;
        if (autosave && !handle) return false;
        if (!handle || useSaveAs) {
          handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: "Exhibition Wall Mockup Maker project",
              accept: { "application/json": [".json", ".ewmm"] }
            }]
          });
        }
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        projectFileHandle = handle;
        state.project.fileName = handle.name || fileName;
      } else {
        if (autosave) return false;
        download(fileName, content, "application/json");
        state.project.fileName = fileName;
      }
      if (projectPersistTimer) clearTimeout(projectPersistTimer);
      projectPersistTimer = null;
      state.project.lastFileSaveAt = new Date().toISOString();
      syncInputsFromProject();
      save({ immediate: true, skipProjectAutosave: true });
      render();
      return true;
    }

    function loadProjectFileFromText(text, fileName = "") {
      const parsed = JSON.parse(text);
      applySerializedState(parsed, { fileName });
      syncInputsFromProject();
      syncInputsFromSpace();
      syncInputsFromWall();
      syncItemInputs();
      save({ immediate: true, skipProjectAutosave: true });
      render();
    }

    async function openProjectFile() {
      if (typeof window.showOpenFilePicker === "function") {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          excludeAcceptAllOption: false,
          types: [{
            description: "Exhibition Wall Mockup Maker project",
            accept: { "application/json": [".json", ".ewmm"] }
          }]
        });
        if (!handle) return;
        const file = await handle.getFile();
        loadProjectFileFromText(await file.text(), file.name || "");
        projectFileHandle = handle;
        return;
      }
      els.projectFileInput?.click();
    }
