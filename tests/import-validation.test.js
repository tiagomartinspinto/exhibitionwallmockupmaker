const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function makeClassList() {
  const classes = new Set();
  return {
    add(...tokens) { tokens.forEach(token => classes.add(token)); },
    remove(...tokens) { tokens.forEach(token => classes.delete(token)); },
    toggle(token, force) {
      if (force === undefined) {
        if (classes.has(token)) {
          classes.delete(token);
          return false;
        }
        classes.add(token);
        return true;
      }
      if (force) classes.add(token);
      else classes.delete(token);
      return force;
    },
    contains(token) { return classes.has(token); }
  };
}

function makeContext2d() {
  const noop = () => {};
  return {
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    rect: noop,
    roundRect: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    setTransform: noop,
    clip: noop,
    arc: noop,
    ellipse: noop,
    setLineDash: noop,
    fillText: noop,
    strokeText: noop,
    drawImage: noop,
    createLinearGradient() {
      return { addColorStop: noop };
    },
    createRadialGradient() {
      return { addColorStop: noop };
    },
    measureText(text = "") {
      const width = String(text).length * 7;
      return {
        width,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: width,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2
      };
    }
  };
}

function makeElement(tagName = "div") {
  return {
    tagName: String(tagName).toUpperCase(),
    value: "",
    checked: false,
    hidden: false,
    disabled: false,
    dataset: {},
    style: {},
    textContent: "",
    innerHTML: "",
    width: 1200,
    height: 800,
    files: [],
    className: "",
    classList: makeClassList(),
    children: [],
    append(...nodes) {
      this.children.push(...nodes);
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter(candidate => candidate !== child);
    },
    addEventListener() {},
    removeEventListener() {},
    setAttribute(name, value) {
      this[name] = value;
    },
    removeAttribute(name) {
      delete this[name];
    },
    getAttribute(name) {
      return this[name];
    },
    focus() {},
    select() {},
    click() {},
    closest() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getContext() { return makeContext2d(); },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: this.width, height: this.height, right: this.width, bottom: this.height };
    },
    releasePointerCapture() {},
    setPointerCapture() {},
    hasPointerCapture() { return false; }
  };
}

function createHarness() {
  const selectorCache = new Map();
  const document = {
    body: makeElement("body"),
    querySelector(selector) {
      if (!selectorCache.has(selector)) {
        const tag = selector === "#canvas" ? "canvas" : "div";
        selectorCache.set(selector, makeElement(tag));
      }
      return selectorCache.get(selector);
    },
    querySelectorAll() {
      return [];
    },
    createElement(tagName) {
      return makeElement(tagName);
    },
    addEventListener() {}
  };

  const storage = new Map();
  const context = {
    console,
    TextEncoder,
    Math,
    Date,
    JSON,
    Array,
    Object,
    Number,
    String,
    Boolean,
    RegExp,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Promise,
    parseInt,
    parseFloat,
    isFinite,
    URL,
    document,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    navigator: { userAgent: "node" },
    location: { href: "http://127.0.0.1/test" },
    requestAnimationFrame(callback) { return callback(0); },
    cancelAnimationFrame() {},
    setTimeout(callback) { return callback(), 1; },
    clearTimeout() {},
    performance: { now: () => Date.now() },
    Image: function Image() {},
    Blob,
    FileReader: function FileReader() {},
    alert() {},
    confirm() { return true; }
  };

  context.window = context;
  context.globalThis = context;
  context.crypto = { randomUUID: () => `test-${Math.random().toString(36).slice(2)}` };
  context.addEventListener = () => {};
  context.removeEventListener = () => {};
  context.devicePixelRatio = 1;

  vm.createContext(context);

  [
    "js/course-data.js",
    "js/core.js",
    "js/model.js",
    "js/rendering.js",
    "js/ui.js",
    "js/interactions.js"
  ].forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    const source = fs.readFileSync(fullPath, "utf8");
    vm.runInContext(source, context, { filename: file });
  });

  vm.runInContext(
    "globalThis.__ewmm = { state, els, parseProjectFileText, applySerializedState, activeWallRecord, ensureWalls, setSelection, nudgeSelectedItems, projectSnapshot, loadProjectFileFromText, toggleTheme, toggleGuides, save, clearLocalAutosave, renderItemList, storageKey: STORAGE_KEY, localStorage };",
    context
  );

  return context.__ewmm;
}

function testBrokenJsonShowsFriendlyError() {
  const app = createHarness();
  assert.throws(
    () => app.parseProjectFileText("{broken"),
    /could not be opened/i
  );
}

function testLegacyProjectStillOpens() {
  const app = createHarness();
  app.applySerializedState({
    version: 1,
    wall: { width: 5200, height: 2800, depth: 90, color: "#ffffff" },
    items: [
      { id: "legacy-art", type: "artwork", x: 120, y: 240, width: 700, height: 500, color: "#123456" }
    ],
    space: {
      width: 9000,
      depth: 7000,
      elements: [{ id: "seat-1", type: "chair", x: 2000, y: 2000 }]
    },
    placement: { x: 1000, y: 1200, rotation: 0 }
  }, { fileName: "legacy.ewmm" });

  const wall = app.activeWallRecord();
  assert.equal(wall.wall.width, 5200);
  assert.equal(wall.wall.height, 2800);
  assert.equal(wall.items.length, 1);
  assert.equal(wall.items[0].type, "graphic");
  assert.equal(app.state.roomElements.length, 1);
  assert.equal(app.state.roomElements[0].type, "chair");
  assert.equal(app.state.project.fileName, "legacy.ewmm");
}

function testMissingFieldsNormalizeSafely() {
  const app = createHarness();
  app.applySerializedState({
    data: {
      project: { title: "Normalization test" },
      walls: [
        {
          name: "Wall X",
          wall: { width: 4300 },
          items: [{ id: "screen-1", type: "screen" }]
        }
      ],
      roomElements: [{ id: "placeholder-1", type: "table" }]
    }
  }, { fileName: "partial.ewmm" });

  const wall = app.activeWallRecord();
  assert.equal(wall.wall.width, 4300);
  assert.equal(wall.wall.height, 3000);
  assert.equal(wall.items[0].width, 1800);
  assert.equal(wall.items[0].height, 900);
  assert.equal(wall.items[0].shape, "rect");
  assert.equal(app.state.roomElements[0].width, 1800);
  assert.equal(app.state.roomElements[0].depth, 900);
  assert.equal(app.state.roomElements[0].height, 760);
}

function testProductionMetadataSurvivesProjectFiles() {
  const app = createHarness();
  app.applySerializedState({
    data: {
      project: {
        title: "Metadata test",
        venue: "Gallery 3",
        dates: "June install",
        preparedBy: "Production team",
        revision: "Rev B",
        notes: "Confirm lift access."
      },
      walls: [
        {
          name: "Wall A",
          wall: { width: 5000, height: 3000 },
          items: []
        }
      ]
    }
  }, { fileName: "metadata.ewmm" });

  assert.equal(app.state.project.venue, "Gallery 3");
  assert.equal(app.state.project.dates, "June install");
  assert.equal(app.state.project.preparedBy, "Production team");
  assert.equal(app.state.project.revision, "Rev B");
  assert.equal(app.state.project.notes, "Confirm lift access.");

  const snapshot = app.projectSnapshot();
  assert.equal(snapshot.data.project.venue, "Gallery 3");
  assert.equal(snapshot.data.project.revision, "Rev B");
  assert.equal(snapshot.data.project.fileName, undefined);
}

function testKeyboardNudgeRefreshesEditorValues() {
  const app = createHarness();
  app.ensureWalls();
  const item = app.activeWallRecord().items[0];
  app.setSelection([item.id]);

  const originalX = item.x;
  const originalY = item.y;

  assert.equal(app.nudgeSelectedItems(10, 50), true);
  assert.equal(item.x, originalX + 10);
  assert.equal(item.y, originalY + 50);
  assert.equal(String(app.els.itemX.value), String(originalX + 10));
  assert.equal(String(app.els.itemY.value), String(originalY + 50));
}

function testHostileProjectValuesAreNeutralized() {
  const app = createHarness();
  app.applySerializedState({
    data: {
      project: { title: "Hostile file" },
      walls: [
        {
          name: "Wall H",
          items: [
            {
              id: "x\"><img src=x>",
              type: "graphic",
              color: "red\" onmouseover=\"alert(1)",
              image: "https://example.invalid/pixel.png"
            },
            { id: "kept", type: "graphic", color: "#abcdef", image: "data:image/png;base64,AAAA" }
          ]
        }
      ],
      roomElements: [{ id: "seat", type: "chair", color: "url(https://example.invalid/x)" }]
    }
  }, { fileName: "hostile.ewmm" });

  const [hostile, kept] = app.activeWallRecord().items;
  assert.equal(hostile.color, "#2f6f9f");
  assert.equal(hostile.image, "");
  assert.equal(hostile.id, "x\"><img src=x>");
  assert.equal(kept.color, "#abcdef");
  assert.equal(kept.image, "data:image/png;base64,AAAA");
  assert.match(app.state.roomElements[0].color, /^#[0-9a-f]{6}$/i);
}

function openCurrentProject(app) {
  app.loadProjectFileFromText(JSON.stringify({
    data: {
      version: 6,
      project: { title: "Current show" },
      space: { width: 12000, depth: 8000 },
      activeWallId: "wall-1",
      walls: [
        { id: "wall-1", name: "Wall 1", wall: { width: 4000, height: 2500 }, items: [{ id: "keep", type: "graphic", name: "Keep me" }] },
        { id: "wall-2", name: "Wall 2", wall: { width: 3000, height: 2500 }, items: [] }
      ]
    }
  }), "current.ewmm");
}

function testLegacySingleWallReplacesOpenProject() {
  const app = createHarness();
  openCurrentProject(app);
  app.loadProjectFileFromText(JSON.stringify({
    version: 1,
    wall: { width: 5200, height: 2800, depth: 90, color: "#ffffff" },
    items: [{ id: "legacy-art", type: "artwork", image: "data:image/png;base64,AAAA" }, null],
    guides: { vertical: [1000], horizontal: [], visible: true },
    placement: { x: 1000, y: 1200, rotation: 0 }
  }), "legacy.ewmm");

  assert.equal(app.state.walls.length, 1);
  const wall = app.activeWallRecord();
  assert.equal(wall.wall.width, 5200);
  assert.deepEqual(wall.items.map(item => item.id), ["legacy-art"]);
  assert.equal(wall.items[0].image, "data:image/png;base64,AAAA");
  assert.deepEqual(wall.guides.vertical, [1000]);
  assert.equal(wall.placement.x, 1000 + 5200 / 2);
}

function testDamagedFileKeepsOpenProject() {
  const app = createHarness();
  openCurrentProject(app);
  const unconvertible = { toString: 1, valueOf: 1 };
  const consoleError = console.error;
  console.error = () => {};
  try {
    assert.throws(
      () => app.loadProjectFileFromText(JSON.stringify({ project: { title: "Damaged" }, space: { width: 20000 }, walls: [{ items: [{ type: unconvertible, side: unconvertible }] }] }), "damaged.ewmm"),
      /could not be opened/
    );
  } finally {
    console.error = consoleError;
  }
  assert.equal(app.state.project.title, "Current show");
  assert.equal(app.state.space.width, 12000);
  assert.equal(app.state.walls.length, 2);
  assert.equal(app.state.project.fileName, "current.ewmm");
}

function testOpenedWallAndRoomValuesAreValidated() {
  const app = createHarness();
  app.applySerializedState({
    view: "elevation\"><b>",
    project: { title: 42, venue: { html: "<b>" } },
    space: { width: "wide", floorColor: "url(https://example.invalid/floor.png)" },
    roomElements: [null, 5, { id: "bench", type: "bench" }],
    walls: [null, { name: "W", wall: { width: "abc", color: "url(https://example.invalid/wall.png)" }, placement: { x: "left", rotation: "90deg" }, items: [null] }]
  });
  assert.equal(app.state.view, "elevation");
  assert.equal(app.state.project.title, "42");
  assert.equal(app.state.project.venue, "");
  assert.equal(app.state.space.width, 12000);
  assert.equal(app.state.space.floorColor, "#101113");
  assert.deepEqual(app.state.roomElements.map(element => element.id), ["bench"]);
  const wall = app.activeWallRecord();
  assert.equal(app.state.walls.length, 1);
  assert.equal(wall.wall.width, 6000);
  assert.equal(wall.wall.color, "#f5f4ea");
  assert.equal(wall.placement.rotation, 0);
  assert.equal(wall.items.length, 0);
}

function testThemeToggleDoesNotDirtyProject() {
  const app = createHarness();
  openCurrentProject(app);
  assert.equal(app.state.unsavedChanges, false);
  const before = app.state.theme;
  app.toggleTheme();
  assert.notEqual(app.state.theme, before);
  assert.equal(app.state.unsavedChanges, false);
  assert.equal(JSON.parse(app.localStorage.getItem(app.storageKey)).theme, app.state.theme);
}

function testClearedRecoveryStaysClearedUntilNextEdit() {
  const app = createHarness();
  openCurrentProject(app);
  assert.ok(app.localStorage.getItem(app.storageKey));
  app.clearLocalAutosave();
  app.save({ immediate: true });
  assert.equal(app.localStorage.getItem(app.storageKey), null);
  app.save();
  assert.ok(app.localStorage.getItem(app.storageKey));
}

function testGuideToggleUpdatesButtonState() {
  const app = createHarness();
  openCurrentProject(app);
  app.toggleGuides();
  assert.equal(app.els.guideToggle["aria-pressed"], "false");
  app.toggleGuides();
  assert.equal(app.els.guideToggle["aria-pressed"], "true");
}

function testUnchangedItemListIsNotRebuilt() {
  const app = createHarness();
  openCurrentProject(app);
  app.renderItemList();
  const rows = [...app.els.itemList.children];
  app.renderItemList();
  assert.equal(app.els.itemList.children.length, rows.length);
  assert.ok(app.els.itemList.children.every((row, index) => row === rows[index]));
}

testBrokenJsonShowsFriendlyError();
testLegacyProjectStillOpens();
testMissingFieldsNormalizeSafely();
testProductionMetadataSurvivesProjectFiles();
testKeyboardNudgeRefreshesEditorValues();
testHostileProjectValuesAreNeutralized();
testLegacySingleWallReplacesOpenProject();
testDamagedFileKeepsOpenProject();
testOpenedWallAndRoomValuesAreValidated();
testThemeToggleDoesNotDirtyProject();
testClearedRecoveryStaysClearedUntilNextEdit();
testGuideToggleUpdatesButtonState();
testUnchangedItemListIsNotRebuilt();

console.log("Import validation tests passed.");
