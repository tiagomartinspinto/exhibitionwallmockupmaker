    window.addEventListener("error", event => {
      document.body.innerHTML = `<main style="padding:24px;font-family:system-ui,sans-serif;line-height:1.45">
        <h1 style="font-size:22px;margin:0 0 12px">Exhibition Wall Mockup Maker could not start</h1>
        <p>${String(event.message || "Unknown error")}</p>
        <p style="color:#5d655f">Try refreshing once. If this stays here, send this message to Codex.</p>
      </main>`;
    });

    function uid() {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
      }
      return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }

    const state = {
      view: "elevation",
      selectedId: null,
      selectedIds: [],
      drag: null,
      panDrag: null,
      rotateDrag: null,
      resizeDrag: null,
      guideDrag: null,
      snapLines: [],
      tool: "select",
      handOverride: false,
      activeSide: "front",
      selectedRoomElementId: null,
      selectedSpaceIds: [],
      theme: "dark",
      view2d: { zoom: 1, panX: 0, panY: 0 },
      view3d: { zoom: 1, rotX: -10, rotY: 24, roomRotX: -52, roomRotY: 26, roomRotZ: 0, rotZ: 0 },
      project: {
        title: "Untitled exhibition",
        fileName: "",
        lastLocalSaveAt: "",
        lastFileSaveAt: ""
      },
      space: { width: 12000, depth: 8000, floorColor: "#101113", surroundColor: "#070708", cinematicLight: true },
      roomElements: [],
      activeWallId: "wall-a",
      guides: { vertical: [], horizontal: [], visible: true },
      spaceGuides: { vertical: [], horizontal: [], visible: true },
      walls: [],
      wall: { width: 6000, height: 3000, depth: 120, color: "#f5f4ea" },
      items: window.EWMM_DATA.makeDefaultWallItems(uid)
    };

    const els = {
      canvas: document.querySelector("#canvas"),
      wallName: document.querySelector("#wallName"),
      wallWidth: document.querySelector("#wallWidth"),
      wallHeight: document.querySelector("#wallHeight"),
      wallDepth: document.querySelector("#wallDepth"),
      wallColor: document.querySelector("#wallColor"),
      wallSide: document.querySelector("#wallSide"),
      spaceWidth: document.querySelector("#spaceWidth"),
      spaceDepth: document.querySelector("#spaceDepth"),
      spaceFloorColor: document.querySelector("#spaceFloorColor"),
      spaceSurroundColor: document.querySelector("#spaceSurroundColor"),
      spaceCinematicLight: document.querySelector("#spaceCinematicLight"),
      roomElementName: document.querySelector("#roomElementName"),
      roomElementType: document.querySelector("#roomElementType"),
      roomElementShape: document.querySelector("#roomElementShape"),
      roomElementColor: document.querySelector("#roomElementColor"),
      roomElementX: document.querySelector("#roomElementX"),
      roomElementY: document.querySelector("#roomElementY"),
      roomElementW: document.querySelector("#roomElementW"),
      roomElementD: document.querySelector("#roomElementD"),
      roomElementH: document.querySelector("#roomElementH"),
      addRoomElement: document.querySelector("#addRoomElement"),
      roomElementList: document.querySelector("#roomElementList"),
      clearRoomElements: document.querySelector("#clearRoomElements"),
      wallSpaceX: document.querySelector("#wallSpaceX"),
      wallSpaceY: document.querySelector("#wallSpaceY"),
      wallSpaceRotation: document.querySelector("#wallSpaceRotation"),
      wallTabs: document.querySelector("#wallTabs"),
      addWall: document.querySelector("#addWall"),
      duplicateWall: document.querySelector("#duplicateWall"),
      deleteWall: document.querySelector("#deleteWall"),
      resetWall: document.querySelector("#resetWall"),
      projectTitle: document.querySelector("#projectTitle"),
      saveProject: document.querySelector("#saveProject"),
      saveProjectAs: document.querySelector("#saveProjectAs"),
      openProject: document.querySelector("#openProject"),
      clearLocalAutosave: document.querySelector("#clearLocalAutosave"),
      projectSaveHint: document.querySelector("#projectSaveHint"),
      projectFileInput: document.querySelector("#projectFileInput"),
      itemName: document.querySelector("#itemName"),
      itemType: document.querySelector("#itemType"),
      itemSide: document.querySelector("#itemSide"),
      itemShape: document.querySelector("#itemShape"),
      itemColor: document.querySelector("#itemColor"),
      itemText: document.querySelector("#itemText"),
      itemNotes: document.querySelector("#itemNotes"),
      itemImage: document.querySelector("#itemImage"),
      itemHanging: document.querySelector("#itemHanging"),
      itemX: document.querySelector("#itemX"),
      itemY: document.querySelector("#itemY"),
      itemW: document.querySelector("#itemW"),
      itemH: document.querySelector("#itemH"),
      addItem: document.querySelector("#addItem"),
      itemList: document.querySelector("#itemList"),
      overlapSummary: document.querySelector("#overlapSummary"),
      scaleLabel: document.querySelector("#scaleLabel"),
      projectName: document.querySelector("#projectName"),
      snapshotView: document.querySelector("#snapshotView"),
      printAllWallsPdf: document.querySelector("#printAllWallsPdf"),
      toolSelect: document.querySelector("#toolSelect"),
      toolHand: document.querySelector("#toolHand"),
      guideToggle: document.querySelector("#guideToggle"),
      clearGuides: document.querySelector("#clearGuides"),
      zoomOut: document.querySelector("#zoomOut"),
      zoomIn: document.querySelector("#zoomIn"),
      resetView: document.querySelector("#resetView"),
      rotateXDown: document.querySelector("#rotateXDown"),
      rotateXUp: document.querySelector("#rotateXUp"),
      rotateYLeft: document.querySelector("#rotateYLeft"),
      rotateYRight: document.querySelector("#rotateYRight"),
      rotateZLeft: document.querySelector("#rotateZLeft"),
      rotateZRight: document.querySelector("#rotateZRight"),
      alignLeft: document.querySelector("#alignLeft"),
      alignCenter: document.querySelector("#alignCenter"),
      alignRight: document.querySelector("#alignRight"),
      alignTop: document.querySelector("#alignTop"),
      alignMiddle: document.querySelector("#alignMiddle"),
      alignBottom: document.querySelector("#alignBottom"),
      distributeH: document.querySelector("#distributeH"),
      distributeV: document.querySelector("#distributeV"),
      themeToggle: document.querySelector("#themeToggle"),
      sidebarToggle: document.querySelector("#sidebarToggle")
    };

    function getMissingElements() {
      return Object.entries(els)
        .filter(([, element]) => !element)
        .map(([key]) => key);
    }

    const screenCtx = els.canvas.getContext("2d");

    let activeCanvas = els.canvas;
    let activeCtx = screenCtx;
    const STORAGE_KEY = "wall-mockup-maker";
    const PERSIST_DELAY = 180;
    const PROJECT_AUTOSAVE_DELAY = 15000;
    let persistTimer = null;
    let projectPersistTimer = null;
    let projectFileHandle = null;
