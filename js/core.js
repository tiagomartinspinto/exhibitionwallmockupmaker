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
      snapLines: [],
      tool: "select",
      handOverride: false,
      theme: "dark",
      view2d: { zoom: 1, panX: 0, panY: 0 },
      view3d: { zoom: 1, rotX: -10, rotY: 24, rotZ: 0 },
      project: {
        title: "Untitled exhibition"
      },
      space: { width: 12000, depth: 8000, floorColor: "#101113", surroundColor: "#070708", cinematicLight: true },
      activeWallId: "wall-a",
      walls: [],
      wall: { width: 6000, height: 3000, depth: 120, color: "#f5f4ea" },
      items: [
        { id: uid(), name: "Artwork", type: "graphic", shape: "rect", text: "", illuminated: false, x: 900, y: 900, width: 1200, height: 800, color: "#2f6f9f" },
        { id: uid(), name: "Wall text", type: "text", shape: "rect", text: "Intro text", illuminated: false, x: 2400, y: 1700, width: 900, height: 220, color: "#eff6ff" },
        { id: uid(), name: "Halo light", type: "object", shape: "circle", text: "", illuminated: true, x: 3200, y: 2050, width: 420, height: 420, color: "#f7d154" },
        { id: uid(), name: "Screen", type: "screen", shape: "rect", text: "", illuminated: false, x: 3600, y: 650, width: 1800, height: 900, color: "#151515" }
      ]
    };

    const els = {
      canvas: document.querySelector("#canvas"),
      wallName: document.querySelector("#wallName"),
      wallWidth: document.querySelector("#wallWidth"),
      wallHeight: document.querySelector("#wallHeight"),
      wallDepth: document.querySelector("#wallDepth"),
      wallColor: document.querySelector("#wallColor"),
      spaceWidth: document.querySelector("#spaceWidth"),
      spaceDepth: document.querySelector("#spaceDepth"),
      spaceFloorColor: document.querySelector("#spaceFloorColor"),
      spaceSurroundColor: document.querySelector("#spaceSurroundColor"),
      spaceCinematicLight: document.querySelector("#spaceCinematicLight"),
      wallSpaceX: document.querySelector("#wallSpaceX"),
      wallSpaceY: document.querySelector("#wallSpaceY"),
      wallSpaceRotation: document.querySelector("#wallSpaceRotation"),
      wallTabs: document.querySelector("#wallTabs"),
      addWall: document.querySelector("#addWall"),
      duplicateWall: document.querySelector("#duplicateWall"),
      deleteWall: document.querySelector("#deleteWall"),
      resetWall: document.querySelector("#resetWall"),
      projectTitle: document.querySelector("#projectTitle"),
      itemName: document.querySelector("#itemName"),
      itemType: document.querySelector("#itemType"),
      itemShape: document.querySelector("#itemShape"),
      itemColor: document.querySelector("#itemColor"),
      itemText: document.querySelector("#itemText"),
      itemImage: document.querySelector("#itemImage"),
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
      toolSelect: document.querySelector("#toolSelect"),
      toolHand: document.querySelector("#toolHand"),
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

    const screenCtx = els.canvas.getContext("2d");

    let activeCanvas = els.canvas;
    let activeCtx = screenCtx;
    const STORAGE_KEY = "wall-mockup-maker";
    const PERSIST_DELAY = 180;
    let persistTimer = null;

