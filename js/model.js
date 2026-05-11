    function defaultGuides() {
      return { vertical: [], horizontal: [], visible: true };
    }

    function normalizeGuides(guides) {
      return {
        vertical: Array.isArray(guides?.vertical) ? guides.vertical.map(value => Math.round(number(value, 0))) : [],
        horizontal: Array.isArray(guides?.horizontal) ? guides.horizontal.map(value => Math.round(number(value, 0))) : [],
        visible: guides?.visible !== false
      };
    }

    function normalizeWallSide(side) {
      return String(side || "front").toLowerCase() === "back" ? "back" : "front";
    }

    function sideLabel(side) {
      return normalizeWallSide(side) === "back" ? "Back" : "Front";
    }

    function activeWallSide() {
      state.activeSide = normalizeWallSide(state.activeSide);
      return state.activeSide;
    }

    function itemSide(item) {
      return normalizeWallSide(item?.side);
    }

    function itemsForSide(side = activeWallSide(), items = state.items) {
      const normalizedSide = normalizeWallSide(side);
      return items.filter(item => itemSide(item) === normalizedSide);
    }

    function switchWallSide(side) {
      state.activeSide = normalizeWallSide(side);
      setSelection([]);
      if (els.wallSide) els.wallSide.value = state.activeSide;
      if (els.itemSide) els.itemSide.value = state.activeSide;
      save();
      render();
    }

    function makeWall(name, wall = {}, items = [], placement = {}, guides = {}) {
      const wallWidth = Math.max(100, number(wall.width, 6000));
      return {
        id: uid(),
        name,
        wall: { width: 6000, height: 3000, depth: 120, color: "#f5f4ea", ...wall },
        items: items.map(normalizeItem),
        placement: { x: 1000 + wallWidth / 2, y: 1000, rotation: 0, anchor: "center", ...placement },
        guides: normalizeGuides(guides)
      };
    }

    function ensureWalls() {
      if (!Array.isArray(state.walls) || !state.walls.length) {
        const first = makeWall("Wall A", state.wall, state.items, { x: state.space.width / 2, y: 1200, rotation: 0 });
        first.id = state.activeWallId || "wall-a";
        state.walls = [first];
        state.activeWallId = first.id;
      }
      if (!state.walls.some(wall => wall.id === state.activeWallId)) {
        state.activeWallId = state.walls[0].id;
      }
      loadActiveWall();
    }

    function activeWallRecord() {
      return state.walls.find(wall => wall.id === state.activeWallId) || state.walls[0];
    }

    function syncActiveWallRecord() {
      const record = activeWallRecord();
      if (!record) return;
      record.name = els.wallName?.value || record.name || "Wall";
      record.wall = state.wall;
      record.items = state.items;
      record.guides = normalizeGuides(state.guides);
      record.placement = {
        x: number(els.wallSpaceX?.value, record.placement?.x ?? 1000),
        y: number(els.wallSpaceY?.value, record.placement?.y ?? 1000),
        rotation: number(els.wallSpaceRotation?.value, record.placement?.rotation ?? 0),
        anchor: "center"
      };
    }

    function loadActiveWall() {
      const record = activeWallRecord();
      if (!record) return;
      state.wall = record.wall;
      state.items = record.items;
      state.guides = normalizeGuides(record.guides || defaultGuides());
    }

    function number(value, fallback) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    function syncWallFromInputs() {
      const record = activeWallRecord();
      if (record) record.name = els.wallName.value || record.name;
      state.wall.width = Math.max(100, number(els.wallWidth.value, state.wall.width));
      state.wall.height = Math.max(100, number(els.wallHeight.value, state.wall.height));
      state.wall.depth = Math.max(40, number(els.wallDepth.value, state.wall.depth));
      state.wall.color = els.wallColor.value || state.wall.color;
      if (record) {
        record.placement.x = number(els.wallSpaceX.value, record.placement.x);
        record.placement.y = number(els.wallSpaceY.value, record.placement.y);
        record.placement.rotation = number(els.wallSpaceRotation.value, record.placement.rotation);
      }
      syncActiveWallRecord();
      save();
      render();
    }

    function syncInputsFromWall() {
      const record = activeWallRecord();
      els.wallName.value = record?.name || "Wall";
      els.wallWidth.value = state.wall.width;
      els.wallHeight.value = state.wall.height;
      els.wallDepth.value = state.wall.depth;
      els.wallColor.value = state.wall.color;
      if (els.wallSide) els.wallSide.value = activeWallSide();
      els.wallSpaceX.value = record?.placement?.x ?? 0;
      els.wallSpaceY.value = record?.placement?.y ?? 0;
      els.wallSpaceRotation.value = record?.placement?.rotation ?? 0;
    }

    function syncSpaceFromInputs() {
      state.space.width = Math.max(1000, number(els.spaceWidth.value, state.space.width));
      state.space.depth = Math.max(1000, number(els.spaceDepth.value, state.space.depth));
      state.space.floorColor = els.spaceFloorColor.value || state.space.floorColor;
      state.space.surroundColor = els.spaceSurroundColor.value || state.space.surroundColor;
      state.space.cinematicLight = Boolean(els.spaceCinematicLight.checked);
      (state.roomElements || []).forEach(clampRoomElementToSpace);
      state.spaceGuides = normalizeGuides(state.spaceGuides || defaultGuides());
      state.spaceGuides.vertical = state.spaceGuides.vertical.map(value => clamp(value, 0, state.space.width));
      state.spaceGuides.horizontal = state.spaceGuides.horizontal.map(value => clamp(value, 0, state.space.depth));
      save();
      render();
    }

    function syncInputsFromSpace() {
      els.spaceWidth.value = state.space.width;
      els.spaceDepth.value = state.space.depth;
      els.spaceFloorColor.value = state.space.floorColor || "#101113";
      els.spaceSurroundColor.value = state.space.surroundColor || "#070708";
      els.spaceCinematicLight.checked = state.space.cinematicLight !== false;
    }

    function roomElementTypeConfig(type) {
      const configs = {
        chair: {
          defaultName: "Chair",
          defaultShape: "rect",
          shapes: ["rect", "circle"],
          defaultWidth: 520,
          defaultDepth: 520,
          defaultHeight: 900,
          color: "#60748a"
        },
        projection: {
          defaultName: "Projection screen",
          defaultShape: "rect",
          shapes: ["rect"],
          defaultWidth: 2500,
          defaultDepth: 180,
          defaultHeight: 1500,
          color: "#27364f"
        },
        table: {
          defaultName: "Table",
          defaultShape: "rect",
          shapes: ["rect", "circle"],
          defaultWidth: 1800,
          defaultDepth: 900,
          defaultHeight: 760,
          color: "#8a7a54"
        },
        other: {
          defaultName: "Other placeholder",
          defaultShape: "rect",
          shapes: ["rect", "circle"],
          defaultWidth: 900,
          defaultDepth: 900,
          defaultHeight: 1200,
          color: "#777e6b"
        }
      };
      return configs[canonicalRoomElementType(type)] || configs.other;
    }

    function canonicalRoomElementType(type) {
      const value = String(type || "other").toLowerCase();
      if (value === "chair" || value === "seat" || value === "seating") return "chair";
      if (value === "projection" || value === "projection screen" || value === "projector screen" || value === "screen") return "projection";
      if (value === "table" || value === "desk") return "table";
      return "other";
    }

    function roomElementTypeLabel(type) {
      return {
        chair: "Chair",
        projection: "Projection screen",
        table: "Table",
        other: "Other placeholder"
      }[canonicalRoomElementType(type)] || "Other placeholder";
    }

    function roomElementDefaultColor(type) {
      return roomElementTypeConfig(type).color;
    }

    function validRoomElementShape(type, shape) {
      const config = roomElementTypeConfig(type);
      return config.shapes.includes(shape) ? shape : config.defaultShape;
    }

    function defaultRoomElementNames() {
      return ["chair", "projection", "table", "other"].map(type => roomElementTypeConfig(type).defaultName);
    }

    function clampRoomElementToSpace(element) {
      const halfW = Math.max(25, element.width / 2);
      const halfD = Math.max(25, element.depth / 2);
      element.x = clamp(number(element.x, state.space.width / 2), halfW, Math.max(halfW, state.space.width - halfW));
      element.y = clamp(number(element.y, state.space.depth / 2), halfD, Math.max(halfD, state.space.depth - halfD));
    }

    function normalizeRoomElement(element = {}) {
      const type = canonicalRoomElementType(element.type);
      const config = roomElementTypeConfig(type);
      const normalized = {
        id: element.id || uid(),
        name: element.name || config.defaultName,
        type,
        shape: validRoomElementShape(type, element.shape || config.defaultShape),
        x: number(element.x, state.space.width / 2),
        y: number(element.y, state.space.depth / 2),
        width: Math.max(50, number(element.width, config.defaultWidth)),
        depth: Math.max(50, number(element.depth, config.defaultDepth)),
        height: Math.max(50, number(element.height, config.defaultHeight)),
        color: element.color || config.color
      };
      clampRoomElementToSpace(normalized);
      return normalized;
    }

    function spaceEntityKey(type, id) {
      return `${type === "wall" ? "wall" : "room"}:${id}`;
    }

    function parseSpaceEntityKey(key) {
      const value = String(key || "");
      const split = value.indexOf(":");
      if (split <= 0) return null;
      const type = value.slice(0, split);
      const id = value.slice(split + 1);
      if (!id || (type !== "wall" && type !== "room")) return null;
      return { type, id };
    }

    function validSpaceEntityKey(key) {
      const parsed = parseSpaceEntityKey(key);
      if (!parsed) return false;
      if (parsed.type === "wall") return (state.walls || []).some(wall => wall.id === parsed.id);
      return (state.roomElements || []).some(element => element.id === parsed.id);
    }

    function selectedSpaceIds() {
      const ids = Array.isArray(state.selectedSpaceIds) ? state.selectedSpaceIds : [];
      const valid = [...new Set(ids)].filter(validSpaceEntityKey);
      if (valid.length !== ids.length) state.selectedSpaceIds = valid;
      return valid;
    }

    function isSpaceEntitySelected(type, id) {
      return selectedSpaceIds().includes(spaceEntityKey(type, id));
    }

    function setSpaceSelection(ids) {
      const valid = [...new Set(ids || [])].filter(validSpaceEntityKey);
      const parsed = valid.map(parseSpaceEntityKey).filter(Boolean);
      const wall = parsed.find(entry => entry.type === "wall");
      const room = parsed.find(entry => entry.type === "room");
      state.selectedSpaceIds = valid;
      if (valid.length) setSelection([]);
      if (wall && wall.id !== state.activeWallId) {
        syncActiveWallRecord();
        state.activeWallId = wall.id;
        loadActiveWall();
        syncInputsFromWall();
      }
      state.selectedRoomElementId = room ? room.id : null;
      syncRoomElementInputs();
    }

    function toggleSpaceSelection(type, id) {
      const key = spaceEntityKey(type, id);
      const current = new Set(selectedSpaceIds());
      if (current.has(key)) {
        current.delete(key);
      } else {
        current.add(key);
      }
      setSpaceSelection([...current]);
    }

    function selectedRoomElement() {
      return (state.roomElements || []).find(element => element.id === state.selectedRoomElementId) || null;
    }

    function setRoomElementSelection(id) {
      const exists = (state.roomElements || []).some(element => element.id === id);
      state.selectedRoomElementId = exists ? id : null;
      if (state.selectedRoomElementId) setSelection([]);
      state.selectedSpaceIds = state.selectedRoomElementId ? [spaceEntityKey("room", state.selectedRoomElementId)] : [];
      syncRoomElementInputs();
    }

    function defaultRoomElementFormState() {
      const type = canonicalRoomElementType(els.roomElementType?.value || "chair");
      const config = roomElementTypeConfig(type);
      return {
        name: config.defaultName,
        type,
        shape: config.defaultShape,
        color: config.color,
        x: state.space.width / 2,
        y: state.space.depth / 2,
        width: config.defaultWidth,
        depth: config.defaultDepth,
        height: config.defaultHeight
      };
    }

    function syncRoomElementTypeControls(type, preferredShape = els.roomElementShape?.value) {
      if (!els.roomElementShape) return;
      const config = roomElementTypeConfig(type);
      const current = validRoomElementShape(type, preferredShape);
      els.roomElementShape.innerHTML = "";
      config.shapes.forEach(shape => {
        const option = document.createElement("option");
        option.value = shape;
        option.textContent = shape === "circle" ? "circular" : "rectangular";
        els.roomElementShape.append(option);
      });
      els.roomElementShape.value = current;
    }

    function applyRoomElementTypeDefaults(previousType = null) {
      const type = canonicalRoomElementType(els.roomElementType.value);
      const config = roomElementTypeConfig(type);
      const previousConfig = previousType ? roomElementTypeConfig(previousType) : null;
      syncRoomElementTypeControls(type, els.roomElementShape.value);
      if (!els.roomElementName.value || defaultRoomElementNames().includes(els.roomElementName.value)) {
        els.roomElementName.value = config.defaultName;
      }
      if (!els.roomElementColor.value || ["chair", "projection", "table", "other"].some(candidate => els.roomElementColor.value.toLowerCase() === roomElementDefaultColor(candidate))) {
        els.roomElementColor.value = config.color;
      }
      if (!els.roomElementW.value || (previousConfig && Number(els.roomElementW.value) === previousConfig.defaultWidth)) {
        els.roomElementW.value = config.defaultWidth;
      }
      if (!els.roomElementD.value || (previousConfig && Number(els.roomElementD.value) === previousConfig.defaultDepth)) {
        els.roomElementD.value = config.defaultDepth;
      }
      if (!els.roomElementH.value || (previousConfig && Number(els.roomElementH.value) === previousConfig.defaultHeight)) {
        els.roomElementH.value = config.defaultHeight;
      }
    }

    function syncRoomElementInputs() {
      if (!els.roomElementName) return;
      const selected = selectedRoomElement();
      const source = selected ? normalizeRoomElement(selected) : defaultRoomElementFormState();
      els.roomElementName.value = source.name || "";
      els.roomElementType.value = source.type;
      els.roomElementType.dataset.previousType = source.type;
      syncRoomElementTypeControls(source.type, source.shape);
      els.roomElementColor.value = source.color || roomElementDefaultColor(source.type);
      els.roomElementX.value = Math.round(source.x ?? 0);
      els.roomElementY.value = Math.round(source.y ?? 0);
      els.roomElementW.value = Math.round(source.width ?? 50);
      els.roomElementD.value = Math.round(source.depth ?? 50);
      els.roomElementH.value = Math.round(source.height ?? roomElementTypeConfig(source.type).defaultHeight);
    }

    function syncSelectedRoomElementFromInputs() {
      const element = selectedRoomElement();
      if (!element) return false;
      element.name = els.roomElementName.value || roomElementTypeLabel(els.roomElementType.value);
      element.type = canonicalRoomElementType(els.roomElementType.value);
      element.shape = validRoomElementShape(element.type, els.roomElementShape.value || element.shape);
      element.color = els.roomElementColor.value || roomElementDefaultColor(element.type);
      element.x = number(els.roomElementX.value, element.x);
      element.y = number(els.roomElementY.value, element.y);
      element.width = Math.max(50, number(els.roomElementW.value, element.width));
      element.depth = Math.max(50, number(els.roomElementD.value, element.depth));
      element.height = Math.max(50, number(els.roomElementH.value, element.height));
      clampRoomElementToSpace(element);
      return true;
    }

    function addRoomElement(rawElement = {}) {
      const element = normalizeRoomElement({
        name: rawElement.name,
        type: rawElement.type,
        shape: rawElement.shape,
        color: rawElement.color,
        x: rawElement.x,
        y: rawElement.y,
        width: rawElement.width,
        depth: rawElement.depth,
        height: rawElement.height
      });
      if (!Array.isArray(state.roomElements)) state.roomElements = [];
      state.roomElements.push(element);
      state.selectedRoomElementId = element.id;
      state.selectedSpaceIds = [spaceEntityKey("room", element.id)];
      save();
      render();
    }

    function deleteRoomElement(id) {
      state.roomElements = (state.roomElements || []).filter(element => element.id !== id);
      if (state.selectedRoomElementId === id) state.selectedRoomElementId = null;
      state.selectedSpaceIds = selectedSpaceIds().filter(key => key !== spaceEntityKey("room", id));
      save();
      render();
    }

    function updateProjectHeader() {
      const title = state.project.title || "Untitled exhibition";
      const count = Array.isArray(state.walls) && state.walls.length ? state.walls.length : 1;
      els.projectName.textContent = `${title} | ${count} wall${count === 1 ? "" : "s"}`;
    }

    function formatSaveTimestamp(value) {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    }

    function updateProjectSaveHint() {
      if (!els.projectSaveHint) return;
      const fileName = state.project.fileName || "";
      const localSaved = formatSaveTimestamp(state.project.lastLocalSaveAt);
      const fileSaved = formatSaveTimestamp(state.project.lastFileSaveAt);
      if (projectFileHandle && fileName && fileSaved) {
        els.projectSaveHint.textContent = `Current file: ${fileName} · Autosaved to file ${fileSaved}`;
        return;
      }
      if (fileName && fileSaved) {
        els.projectSaveHint.textContent = `Current file: ${fileName} · Last file save ${fileSaved}`;
        return;
      }
      if (fileName && localSaved) {
        els.projectSaveHint.textContent = `Opened file: ${fileName} · Autosaved in browser ${localSaved}`;
        return;
      }
      if (localSaved) {
        els.projectSaveHint.textContent = `Autosaved in browser ${localSaved}. Use Save as to keep a project file on your machine.`;
        return;
      }
      els.projectSaveHint.textContent = "Project files are saved as JSON on your machine.";
    }

    function syncProjectFromInputs() {
      state.project.title = els.projectTitle.value || "Untitled exhibition";
      updateProjectHeader();
      updateProjectSaveHint();
      save();
      render();
    }

    function syncInputsFromProject() {
      els.projectTitle.value = state.project.title || "";
      updateProjectHeader();
      updateProjectSaveHint();
    }

    function defaultItemFormState() {
      const type = canonicalItemType(els.itemType?.value || "graphic");
      const config = itemTypeConfig(type);
      return {
        name: config.defaultName,
        type,
        side: activeWallSide(),
        shape: config.defaultShape,
        color: colorForType(type),
        text: "",
        notes: "",
        hanging: false,
        x: 900,
        y: 900,
        width: config.defaultWidth,
        height: config.defaultHeight
      };
    }

    function syncItemInputs() {
      const item = selectedSingleItem();
      const source = item ? normalizeItem(item) : defaultItemFormState();
      els.itemName.value = source.name || "";
      els.itemType.value = canonicalItemType(source.type);
      els.itemType.dataset.previousType = canonicalItemType(source.type);
      els.itemSide.value = normalizeWallSide(source.side || activeWallSide());
      syncItemTypeControls(source.type, source.shape);
      els.itemColor.value = source.color || colorForType(source.type);
      els.itemText.value = source.text || "";
      els.itemNotes.value = source.notes || "";
      if (els.itemHanging) els.itemHanging.checked = Boolean(source.hanging);
      els.itemX.value = Math.round(source.x ?? 0);
      els.itemY.value = Math.round(source.y ?? 0);
      els.itemW.value = Math.round(source.width ?? 100);
      els.itemH.value = Math.round(source.height ?? 100);
      if (!item) {
        els.itemImage.value = "";
        els.itemImage.dataset.image = "";
      }
      els.addItem.textContent = item ? "Add to wall" : "Add to wall";
    }

    function syncSelectedItemFromInputs() {
      const item = selectedSingleItem();
      if (!item) return false;
      item.name = els.itemName.value || item.name;
      item.type = canonicalItemType(els.itemType.value);
      item.side = normalizeWallSide(els.itemSide.value);
      state.activeSide = item.side;
      if (els.wallSide) els.wallSide.value = state.activeSide;
      item.shape = validShapeForType(item.type, els.itemShape.value || item.shape);
      item.color = els.itemColor.value || item.color;
      item.text = els.itemText.value || "";
      item.notes = els.itemNotes.value || "";
      item.hanging = Boolean(els.itemHanging?.checked);
      item.x = Math.max(0, number(els.itemX.value, item.x));
      item.y = Math.max(0, number(els.itemY.value, item.y));
      item.width = Math.max(10, number(els.itemW.value, item.width));
      item.height = Math.max(10, number(els.itemH.value, item.height));
      clampItemToWall(item);
      return true;
    }

    function applyTheme() {
      const theme = state.theme === "light" ? "light" : "dark";
      state.theme = theme;
      document.body.dataset.theme = theme;
      els.themeToggle.setAttribute("aria-checked", String(theme === "dark"));
      const label = els.themeToggle.querySelector(".switch-label");
      if (label) label.textContent = "Dark mode";
    }

    function toggleTheme() {
      state.theme = state.theme === "dark" ? "light" : "dark";
      applyTheme();
      save();
      render({ canvasOnly: true });
    }

    function setCurrentGuides(guides) {
      const normalized = normalizeGuides(guides);
      if (state.view === "space2d") {
        state.spaceGuides = normalized;
      } else {
        state.guides = normalized;
        syncActiveWallRecord();
      }
      return normalized;
    }

    function toggleGuides() {
      const guides = currentGuides();
      guides.visible = !(guides.visible !== false);
      setCurrentGuides(guides);
      save();
      render({ canvasOnly: true });
    }

    function clearGuides() {
      setCurrentGuides(defaultGuides());
      save();
      render({ canvasOnly: true });
    }

    function addItem(item) {
      const type = canonicalItemType(item.type);
      const side = normalizeWallSide(item.side || activeWallSide());
      state.items.push({
        id: uid(),
        name: item.name || itemTypeLabel(type),
        type,
        side,
        shape: validShapeForType(type, item.shape || "rect"),
        text: item.text || "",
        notes: item.notes || "",
        hanging: Boolean(item.hanging),
        image: item.image || "",
        illuminated: Boolean(item.illuminated),
        x: Math.max(0, number(item.x, 0)),
        y: Math.max(0, number(item.y, 0)),
        width: Math.max(10, number(item.width, 100)),
        height: Math.max(10, number(item.height, 100)),
        color: item.color || colorForType(type)
      });
      state.activeSide = side;
      syncActiveWallRecord();
      save();
      render();
    }

    function titleCase(text) {
      return String(text).replace(/\b\w/g, letter => letter.toUpperCase());
    }

    function itemTypeConfig(type) {
      const configs = {
        graphic: {
          defaultName: "Printed graphic",
          defaultShape: "rect",
          shapes: ["rect", "circle"],
          defaultWidth: 1200,
          defaultHeight: 800,
          textPlaceholder: "Optional caption or words printed on the graphic",
          notesPlaceholder: "Print file, material, finish, or mounting notes"
        },
        mdf: {
          defaultName: "MDF cutout / sticker",
          defaultShape: "rect",
          shapes: ["rect", "circle"],
          defaultWidth: 700,
          defaultHeight: 700,
          textPlaceholder: "Optional words on the cutout or sticker",
          notesPlaceholder: "Cut path, material thickness, adhesive, or install notes"
        },
        object: {
          defaultName: "Object / prototype",
          defaultShape: "rect",
          shapes: ["rect", "circle"],
          defaultWidth: 600,
          defaultHeight: 600,
          textPlaceholder: "Optional visible label on the object",
          notesPlaceholder: "Prototype, plinth, fixture, power, or handling notes"
        },
        screen: {
          defaultName: "Screen",
          defaultShape: "rect",
          shapes: ["rect"],
          defaultWidth: 1800,
          defaultHeight: 900,
          textPlaceholder: "Optional on-screen title or visible label",
          notesPlaceholder: "Media file, player, power, cabling, or looping notes"
        },
        support: {
          defaultName: "Supporting structure / shelf",
          defaultShape: "rect",
          shapes: ["rect"],
          defaultWidth: 1200,
          defaultHeight: 300,
          textPlaceholder: "Optional visible marking",
          notesPlaceholder: "Load, bracket, shelf height, finish, or fabrication notes"
        },
        text: {
          defaultName: "Text",
          defaultShape: "rect",
          shapes: ["rect"],
          defaultWidth: 900,
          defaultHeight: 220,
          textPlaceholder: "Words shown on the wall",
          notesPlaceholder: "Typography, language, vinyl, paint, or approval notes"
        }
      };
      return configs[canonicalItemType(type)] || configs.object;
    }

    function defaultTypeNames() {
      return ["graphic", "mdf", "object", "screen", "support", "text"].map(type => itemTypeConfig(type).defaultName);
    }

    function validShapeForType(type, shape) {
      const config = itemTypeConfig(type);
      return config.shapes.includes(shape) ? shape : config.defaultShape;
    }

    function syncItemTypeControls(type, preferredShape = els.itemShape?.value) {
      if (!els.itemShape) return;
      const config = itemTypeConfig(type);
      const current = validShapeForType(type, preferredShape);
      els.itemShape.innerHTML = "";
      config.shapes.forEach(shape => {
        const option = document.createElement("option");
        option.value = shape;
        option.textContent = shape === "circle" ? "circular" : "rectangular";
        els.itemShape.append(option);
      });
      els.itemShape.value = current;
      if (els.itemText) els.itemText.placeholder = config.textPlaceholder;
      if (els.itemNotes) els.itemNotes.placeholder = config.notesPlaceholder;
    }

    function applyItemTypeDefaults(previousType = null) {
      const type = canonicalItemType(els.itemType.value);
      const config = itemTypeConfig(type);
      const previousConfig = previousType ? itemTypeConfig(previousType) : null;
      const item = selectedSingleItem();
      syncItemTypeControls(type, els.itemShape.value);
      if (!item) {
        if (!els.itemName.value || defaultTypeNames().includes(els.itemName.value)) {
          els.itemName.value = config.defaultName;
        }
        if (!els.itemColor.value || ["graphic", "mdf", "object", "screen", "support", "text"].some(candidate => els.itemColor.value.toLowerCase() === colorForType(candidate))) {
          els.itemColor.value = colorForType(type);
        }
        if (!els.itemW.value || (previousConfig && Number(els.itemW.value) === previousConfig.defaultWidth)) {
          els.itemW.value = config.defaultWidth;
        }
        if (!els.itemH.value || (previousConfig && Number(els.itemH.value) === previousConfig.defaultHeight)) {
          els.itemH.value = config.defaultHeight;
        }
        return;
      }
      if (previousType && item.color && item.color.toLowerCase() === colorForType(previousType)) {
        els.itemColor.value = colorForType(type);
      }
      if (item.name === itemTypeConfig(previousType || item.type).defaultName) {
        els.itemName.value = config.defaultName;
      }
    }

    function colorForType(type) {
      const colors = {
        graphic: "#2f6f9f",
        mdf: "#e58b4a",
        object: "#6e63b6",
        screen: "#151515",
        support: "#7b5d46",
        text: "#f4f1e8"
      };
      return colors[canonicalItemType(type)] || "#2f6f9f";
    }

    function canonicalItemType(type) {
      const value = String(type || "object").toLowerCase();
      if (value === "artwork" || value === "printed graphic" || value === "graphic") return "graphic";
      if (value === "cutout" || value === "mdf" || value === "mdf cutout" || value === "sticker" || value === "mdf cutout/sticker" || value === "mdf cutout / sticker") return "mdf";
      if (value === "label" || value === "explanatory text" || value === "title" || value === "title text" || value === "text") return "text";
      if (value === "illumination" || value === "prototype" || value === "physical object" || value === "object/prototype" || value === "object / prototype" || value === "object") return "object";
      if (value === "shelf" || value === "opening" || value === "mount" || value === "support" || value === "supporting structure" || value === "supporting structure/shelf" || value === "supporting structure / shelf") return "support";
      if (value === "screen") return "screen";
      return "object";
    }

    function itemTypeLabel(type) {
      return {
        graphic: "Printed graphic",
        mdf: "MDF cutout / sticker",
        object: "Object / prototype",
        screen: "Screen",
        support: "Supporting structure / shelf",
        text: "Text"
      }[canonicalItemType(type)] || "Object / prototype";
    }

    function normalizeItem(item) {
      const legacyType = item.type;
      const type = canonicalItemType(legacyType);
      return {
        shape: "rect",
        side: "front",
        text: "",
        notes: "",
        hanging: false,
        image: "",
        ...item,
        type,
        side: normalizeWallSide(item.side),
        illuminated: Boolean(item.illuminated || legacyType === "illumination")
      };
    }

    function itemCode(item) {
      const normalized = normalizeItem(item);
      const prefixes = { graphic: "PG", mdf: "MS", object: "OP", screen: "SC", support: "SS", text: "TX" };
      const sameType = state.items.filter(candidate => normalizeItem(candidate).type === normalized.type);
      const index = sameType.findIndex(candidate => candidate.id === item.id) + 1;
      return `${prefixes[normalized.type] || "O"}${String(Math.max(1, index)).padStart(2, "0")}`;
    }

    function itemSideLabel(item) {
      return sideLabel(normalizeItem(item).side);
    }

    function itemSizeLabel(item) {
      const normalized = normalizeItem(item);
      return normalized.shape === "circle" && normalized.width === normalized.height
        ? `dia ${normalized.width} mm`
        : `${normalized.width} x ${normalized.height} mm`;
    }

    function itemPositionLabel(item) {
      const normalized = normalizeItem(item);
      if (normalized.shape === "circle") {
        return `CL from left ${Math.round(normalized.x + normalized.width / 2)} mm; CL from floor ${Math.round(normalized.y + normalized.height / 2)} mm`;
      }
      return `left edge ${Math.round(normalized.x)} mm; bottom ${Math.round(normalized.y)} mm`;
    }

    function itemTypePrintLabel(type) {
      return {
        graphic: "Graphic",
        mdf: "MDF/sticker",
        object: "Object",
        screen: "Screen",
        support: "Support/shelf",
        text: "Text"
      }[canonicalItemType(type)] || "Object";
    }

    function exportTextLabel(item) {
      const normalized = normalizeItem(item);
      return normalized.text ? `Text to add: ${normalized.text}` : "";
    }

    function exportNotesLabel(item) {
      const normalized = normalizeItem(item);
      return normalized.notes ? `Notes: ${normalized.notes}` : "";
    }

    function exportMountingLabel(item) {
      const normalized = normalizeItem(item);
      return normalized.hanging ? "Mounting: hanging from top" : "";
    }

    const imageCache = new Map();

    function cachedImage(src) {
      if (!src) return null;
      if (imageCache.has(src)) return imageCache.get(src);
      const image = new Image();
      image.src = src;
      imageCache.set(src, image);
      image.onload = () => render({ canvasOnly: true });
      return image;
    }

    function selectedIds() {
      if (Array.isArray(state.selectedIds) && state.selectedIds.length) return state.selectedIds;
      return state.selectedId ? [state.selectedId] : [];
    }

    function isSelected(id) {
      return selectedIds().includes(id);
    }

    function setSelection(ids) {
      const side = activeWallSide();
      state.selectedIds = [...new Set(ids)].filter(id => state.items.some(item => item.id === id && itemSide(item) === side));
      state.selectedId = state.selectedIds[0] || null;
      if (state.selectedId) {
        state.selectedRoomElementId = null;
        state.selectedSpaceIds = [];
      }
    }

    function toggleSelection(id) {
      const current = new Set(selectedIds());
      if (current.has(id)) {
        current.delete(id);
      } else {
        current.add(id);
      }
      setSelection([...current]);
    }

    function selectedItems() {
      const ids = new Set(selectedIds());
      const side = activeWallSide();
      return state.items.filter(item => ids.has(item.id) && itemSide(item) === side);
    }

    function renderWallTabs() {
      els.wallTabs.innerHTML = "";
      state.walls.forEach((wall, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `mini-button${wall.id === state.activeWallId ? " active" : ""}`;
        button.textContent = wall.name || `Wall ${index + 1}`;
        button.dataset.wallTab = wall.id;
        els.wallTabs.append(button);
      });
    }

    function switchWall(id) {
      syncActiveWallRecord();
      state.activeWallId = id;
      loadActiveWall();
      setSelection([]);
      state.selectedSpaceIds = state.view === "space2d" ? [spaceEntityKey("wall", id)] : [];
      syncInputsFromWall();
      save();
      render();
    }

    function addWall() {
      syncActiveWallRecord();
      const label = `Wall ${String.fromCharCode(65 + state.walls.length)}`;
      const wall = makeWall(label, { width: 4000, height: state.wall.height, depth: state.wall.depth, color: state.wall.color }, [], { x: state.space.width / 2 + state.walls.length * 700, y: 2200, rotation: 0 });
      state.walls.push(wall);
      state.activeWallId = wall.id;
      loadActiveWall();
      setSelection([]);
      state.selectedSpaceIds = state.view === "space2d" ? [spaceEntityKey("wall", wall.id)] : [];
      syncInputsFromWall();
      save();
      render();
    }

    function duplicateWall() {
      const current = activeWallRecord();
      if (!current) return;
      syncActiveWallRecord();
      const clone = makeWall(`${current.name} copy`, { ...current.wall }, current.items.map(item => ({ ...item, id: uid() })), {
        x: current.placement.x + 600,
        y: current.placement.y + 600,
        rotation: current.placement.rotation,
        anchor: "center"
      });
      state.walls.push(clone);
      state.activeWallId = clone.id;
      loadActiveWall();
      setSelection([]);
      state.selectedSpaceIds = state.view === "space2d" ? [spaceEntityKey("wall", clone.id)] : [];
      syncInputsFromWall();
      save();
      render();
    }

    function defaultWallName(index) {
      return `Wall ${String.fromCharCode(65 + index)}`;
    }

    function resetWallSpecs() {
      const record = activeWallRecord();
      if (!record) return;
      const index = Math.max(0, state.walls.findIndex(wall => wall.id === record.id));
      record.name = defaultWallName(index);
      record.wall = { width: 6000, height: 3000, depth: 120, color: "#f5f4ea" };
      record.placement = { x: state.space.width / 2 + index * 700, y: 1200, rotation: 0, anchor: "center" };
      loadActiveWall();
      syncInputsFromWall();
      save();
      render();
    }

    function deleteWall() {
      if (state.walls.length <= 1) return;
      state.walls = state.walls.filter(wall => wall.id !== state.activeWallId);
      state.activeWallId = state.walls[0].id;
      loadActiveWall();
      setSelection([]);
      state.selectedSpaceIds = selectedSpaceIds().filter(key => validSpaceEntityKey(key));
      syncInputsFromWall();
      save();
      render();
    }
