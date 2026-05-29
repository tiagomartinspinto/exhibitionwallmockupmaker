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
    "globalThis.__ewmm = { state, els, parseProjectFileText, applySerializedState, activeWallRecord, ensureWalls, setSelection, nudgeSelectedItems, projectSnapshot };",
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

testBrokenJsonShowsFriendlyError();
testLegacyProjectStillOpens();
testMissingFieldsNormalizeSafely();
testProductionMetadataSurvivesProjectFiles();
testKeyboardNudgeRefreshesEditorValues();

console.log("Import validation tests passed.");
