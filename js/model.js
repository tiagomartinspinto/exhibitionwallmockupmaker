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

    function makeWall(name, wall = {}, items = [], placement = {}, guides = {}) {
      return {
        id: uid(),
        name,
        wall: { width: 6000, height: 3000, depth: 120, color: "#f5f4ea", ...wall },
        items: items.map(normalizeItem),
        placement: { x: 1000, y: 1000, rotation: 0, ...placement },
        guides: normalizeGuides(guides)
      };
    }

    function ensureWalls() {
      if (!Array.isArray(state.walls) || !state.walls.length) {
        const first = makeWall("Wall A", state.wall, state.items, { x: 1000, y: 1200, rotation: 0 });
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
        rotation: number(els.wallSpaceRotation?.value, record.placement?.rotation ?? 0)
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
      return {
        name: "Artwork",
        type: "graphic",
        shape: "rect",
        color: colorForType("graphic"),
        text: "",
        x: 900,
        y: 900,
        width: 1200,
        height: 800
      };
    }

    function syncItemInputs() {
      const item = selectedSingleItem();
      const source = item ? normalizeItem(item) : defaultItemFormState();
      els.itemName.value = source.name || "";
      els.itemType.value = canonicalItemType(source.type);
      els.itemShape.value = source.shape || "rect";
      els.itemColor.value = source.color || colorForType(source.type);
      els.itemText.value = source.text || "";
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
      item.shape = els.itemShape.value || item.shape;
      item.color = els.itemColor.value || item.color;
      item.text = els.itemText.value || "";
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

    function toggleGuides() {
      state.guides.visible = !(state.guides.visible !== false);
      syncActiveWallRecord();
      save();
      render({ canvasOnly: true });
    }

    function clearGuides() {
      state.guides = defaultGuides();
      syncActiveWallRecord();
      save();
      render({ canvasOnly: true });
    }

    function addItem(item) {
      const type = canonicalItemType(item.type);
      state.items.push({
        id: uid(),
        name: item.name || itemTypeLabel(type),
        type,
        shape: item.shape || "rect",
        text: item.text || "",
        image: item.image || "",
        illuminated: Boolean(item.illuminated),
        x: Math.max(0, number(item.x, 0)),
        y: Math.max(0, number(item.y, 0)),
        width: Math.max(10, number(item.width, 100)),
        height: Math.max(10, number(item.height, 100)),
        color: item.color || colorForType(type)
      });
      syncActiveWallRecord();
      save();
      render();
    }

    function titleCase(text) {
      return String(text).replace(/\b\w/g, letter => letter.toUpperCase());
    }

    function colorForType(type) {
      const colors = {
        title: "#f4f1e8",
        graphic: "#2f6f9f",
        object: "#4d7898",
        screen: "#151515",
        text: "#ffffff",
        support: "#7b5d46"
      };
      return colors[canonicalItemType(type)] || "#2f6f9f";
    }

    function canonicalItemType(type) {
      const value = String(type || "object").toLowerCase();
      if (value === "artwork" || value === "printed graphic" || value === "graphic") return "graphic";
      if (value === "label" || value === "explanatory text") return "text";
      if (value === "title" || value === "title text") return "title";
      if (value === "illumination" || value === "prototype" || value === "physical object") return "object";
      if (value === "shelf" || value === "opening" || value === "mount" || value === "support") return "support";
      if (value === "screen") return "screen";
      return "object";
    }

    function itemTypeLabel(type) {
      return {
        title: "Title text",
        text: "Explanatory text",
        screen: "Screen / moving image",
        graphic: "Printed graphic / still visual",
        object: "Physical object / prototype",
        support: "Support / display hardware"
      }[canonicalItemType(type)] || "Physical object / prototype";
    }

    function normalizeItem(item) {
      const legacyType = item.type;
      const type = canonicalItemType(legacyType);
      return {
        shape: "rect",
        text: "",
        image: "",
        ...item,
        type,
        illuminated: Boolean(item.illuminated || legacyType === "illumination")
      };
    }

    function itemCode(item) {
      const normalized = normalizeItem(item);
      const prefixes = { title: "TT", text: "TX", screen: "SC", graphic: "PG", object: "PO", support: "SP" };
      const sameType = state.items.filter(candidate => normalizeItem(candidate).type === normalized.type);
      const index = sameType.findIndex(candidate => candidate.id === item.id) + 1;
      return `${prefixes[normalized.type] || "O"}${String(Math.max(1, index)).padStart(2, "0")}`;
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
        title: "Title text",
        text: "Text",
        screen: "Screen",
        graphic: "Graphic",
        object: "Object",
        support: "Support"
      }[canonicalItemType(type)] || "Object";
    }

    function exportTextLabel(item) {
      const normalized = normalizeItem(item);
      return normalized.text ? `Text to add: ${normalized.text}` : "";
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
      state.selectedIds = [...new Set(ids)].filter(id => state.items.some(item => item.id === id));
      state.selectedId = state.selectedIds[0] || null;
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
      return state.items.filter(item => ids.has(item.id));
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
      syncInputsFromWall();
      save();
      render();
    }

    function addWall() {
      syncActiveWallRecord();
      const label = `Wall ${String.fromCharCode(65 + state.walls.length)}`;
      const wall = makeWall(label, { width: 4000, height: state.wall.height, depth: state.wall.depth, color: state.wall.color }, [], { x: 1000 + state.walls.length * 700, y: 2200, rotation: 0 });
      state.walls.push(wall);
      state.activeWallId = wall.id;
      loadActiveWall();
      setSelection([]);
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
        rotation: current.placement.rotation
      });
      state.walls.push(clone);
      state.activeWallId = clone.id;
      loadActiveWall();
      setSelection([]);
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
      record.placement = { x: 1000 + index * 700, y: 1200, rotation: 0 };
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
      syncInputsFromWall();
      save();
      render();
    }
