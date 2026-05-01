    function on(element, eventName, handler, options) {
      if (!element) return false;
      element.addEventListener(eventName, handler, options);
      return true;
    }

    function ensureBootElements() {
      const missing = getMissingElements();
      if (missing.length) {
        throw new Error(`UI is out of sync. Missing elements: ${missing.join(", ")}`);
      }
    }

    function setSidebarCollapsed(enabled) {
      document.body.classList.toggle("sidebar-collapsed", enabled);
      els.sidebarToggle.setAttribute("aria-pressed", String(enabled));
      els.sidebarToggle.setAttribute("aria-label", enabled ? "Show left panel" : "Hide left panel");
      els.sidebarToggle.title = enabled ? "Show left panel" : "Hide left panel";
      setTimeout(resizeCanvas, 0);
    }

    function toggleSidebar() {
      setSidebarCollapsed(!document.body.classList.contains("sidebar-collapsed"));
    }

    document.querySelectorAll("#wallName,#wallWidth,#wallHeight,#wallDepth,#wallColor,#wallSpaceX,#wallSpaceY,#wallSpaceRotation").forEach(input => {
      input.addEventListener("input", syncWallFromInputs);
    });

    document.querySelectorAll("#spaceWidth,#spaceDepth,#spaceFloorColor,#spaceSurroundColor,#spaceCinematicLight").forEach(input => {
      input.addEventListener("input", syncSpaceFromInputs);
      input.addEventListener("change", syncSpaceFromInputs);
    });

    ensureBootElements();

    on(els.wallTabs, "click", event => {
      const button = event.target.closest("[data-wall-tab]");
      if (button) switchWall(button.dataset.wallTab);
    });

    on(els.addWall, "click", addWall);
    on(els.duplicateWall, "click", duplicateWall);
    on(els.deleteWall, "click", deleteWall);
    on(els.resetWall, "click", resetWallSpecs);

    document.querySelectorAll("#projectTitle").forEach(input => {
      input.addEventListener("input", syncProjectFromInputs);
    });

    on(els.saveProject, "click", async () => {
      try {
        await saveProjectFile();
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error(error);
      }
    });

    on(els.saveProjectAs, "click", async () => {
      try {
        await saveProjectFile({ saveAs: true });
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error(error);
      }
    });

    on(els.openProject, "click", async () => {
      try {
        await openProjectFile();
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.error(error);
      }
    });

    on(els.projectFileInput, "change", async event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        loadProjectFileFromText(await file.text(), file.name || "");
        projectFileHandle = null;
      } catch (error) {
        console.error(error);
      } finally {
        els.projectFileInput.value = "";
      }
    });

    on(els.itemImage, "change", event => {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        els.itemImage.dataset.image = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const image = String(reader.result || "");
        els.itemImage.dataset.image = image;
        const item = selectedSingleItem();
        if (item) {
          item.image = image;
          save();
          render();
        }
      };
      reader.readAsDataURL(file);
    });

    on(els.addItem, "click", () => {
      addItem({
        name: els.itemName.value,
        type: els.itemType.value,
        shape: els.itemShape.value,
        color: els.itemColor.value,
        text: els.itemText.value,
        image: els.itemImage.dataset.image || "",
        x: els.itemX.value,
        y: els.itemY.value,
        width: els.itemW.value,
        height: els.itemH.value
      });
      els.itemImage.value = "";
      els.itemImage.dataset.image = "";
    });

    const clearItemsButton = document.querySelector("#clearItems");
    on(clearItemsButton, "click", () => {
      state.items = [];
      setSelection([]);
      save();
      render();
    });

    const sampleButton = document.querySelector("#sample");
    on(sampleButton, "click", () => {
      state.wall = { width: 6000, height: 3000, depth: 120, color: "#f5f4ea" };
      state.items = [
        { id: uid(), name: "Artwork", type: "graphic", shape: "rect", text: "", illuminated: false, x: 900, y: 900, width: 1200, height: 800, color: "#2f6f9f" },
        { id: uid(), name: "Wall text", type: "text", shape: "rect", text: "Intro text", illuminated: false, x: 2400, y: 1700, width: 900, height: 220, color: "#eff6ff" },
        { id: uid(), name: "Round light", type: "object", shape: "circle", text: "", illuminated: true, x: 3300, y: 2050, width: 420, height: 420, color: "#f7d154" },
        { id: uid(), name: "Screen", type: "screen", shape: "rect", text: "", illuminated: false, x: 3600, y: 650, width: 1800, height: 900, color: "#151515" }
      ];
      setSelection([]);
      syncInputsFromWall();
      save();
      render();
    });

    on(els.itemList, "click", event => {
      const button = event.target.closest("[data-remove]");
      if (button) {
        state.items = state.items.filter(item => item.id !== button.dataset.remove);
        setSelection(selectedIds().filter(id => id !== button.dataset.remove));
        save();
        render();
        return;
      }
      const row = event.target.closest("[data-select]");
      if (row) {
        if (event.shiftKey) {
          toggleSelection(row.dataset.select);
        } else {
          setSelection([row.dataset.select]);
        }
        render();
      }
    });

    function handleItemEditorChange(preserveColor = false) {
      const item = selectedSingleItem();
      if (!item && !preserveColor) {
        els.itemColor.value = colorForType(els.itemType.value);
      }
      if (syncSelectedItemFromInputs()) {
        save();
        render();
      }
    }

    [els.itemName, els.itemShape, els.itemColor, els.itemText, els.itemX, els.itemY, els.itemW, els.itemH].forEach(input => {
      input.addEventListener("input", () => handleItemEditorChange(true));
      input.addEventListener("change", () => handleItemEditorChange(true));
    });

    on(els.itemType, "change", () => {
      const item = selectedSingleItem();
      if (!item) {
        els.itemColor.value = colorForType(els.itemType.value);
      }
      handleItemEditorChange(Boolean(item));
    });

    document.querySelectorAll(".tab[data-view]").forEach(button => {
      button.addEventListener("click", () => {
        state.view = button.dataset.view;
        document.querySelectorAll(".tab[data-view]").forEach(tab => tab.classList.toggle("active", tab === button));
        save();
        render();
      });
    });

    on(els.zoomOut, "click", () => zoomView(-0.15));
    on(els.zoomIn, "click", () => zoomView(0.15));
    on(els.resetView, "click", resetView);
    on(els.toolSelect, "click", () => setTool("select"));
    on(els.toolHand, "click", () => setTool("hand"));
    on(els.guideToggle, "click", toggleGuides);
    on(els.clearGuides, "click", clearGuides);
    on(els.rotateXDown, "click", () => rotate3d("x", -10));
    on(els.rotateXUp, "click", () => rotate3d("x", 10));
    on(els.rotateYLeft, "click", () => rotate3d("y", -12));
    on(els.rotateYRight, "click", () => rotate3d("y", 12));
    on(els.rotateZLeft, "click", () => rotate3d("z", -10));
    on(els.rotateZRight, "click", () => rotate3d("z", 10));
    on(els.alignLeft, "click", () => alignSelection("left"));
    on(els.alignCenter, "click", () => alignSelection("center"));
    on(els.alignRight, "click", () => alignSelection("right"));
    on(els.alignTop, "click", () => alignSelection("top"));
    on(els.alignMiddle, "click", () => alignSelection("middle"));
    on(els.alignBottom, "click", () => alignSelection("bottom"));
    on(els.distributeH, "click", () => distributeSelection("h"));
    on(els.distributeV, "click", () => distributeSelection("v"));

    const exportWallPdfButton = document.querySelector("#exportWallPdf");
    on(exportWallPdfButton, "click", () => {
      exportA3Pdf("elevation");
    });

    const exportRoomPdfButton = document.querySelector("#exportRoomPdf");
    on(exportRoomPdfButton, "click", () => {
      exportA3Pdf("space2d");
    });
    on(els.snapshotView, "click", exportSnapshotPdf);

    on(els.themeToggle, "click", toggleTheme);
    on(els.sidebarToggle, "click", toggleSidebar);

    window.addEventListener("resize", resizeCanvas);
    on(els.canvas, "pointerdown", startDrag);
    on(els.canvas, "pointermove", moveDrag);
    on(els.canvas, "pointerup", stopDrag);
    on(els.canvas, "pointercancel", stopDrag);
    on(els.canvas, "dblclick", event => {
      if (state.view !== "elevation") return;
      if (removeGuideAtPoint(pointerPosition(event))) {
        event.preventDefault();
      }
    });
    on(els.canvas, "wheel", event => {
      event.preventDefault();
      zoomView(event.deltaY < 0 ? 0.12 : -0.12);
    }, { passive: false });
    window.addEventListener("keydown", event => {
      if (event.code !== "Space" || event.repeat || isEditableTarget(event.target) || !is2dView()) return;
      event.preventDefault();
      if (!state.handOverride) {
        state.handOverride = true;
        updateToolButtons();
      }
    });
    window.addEventListener("keyup", event => {
      if (event.code !== "Space") return;
      if (state.handOverride) {
        state.handOverride = false;
        updateToolButtons();
      }
    });
    window.addEventListener("beforeunload", () => save({ immediate: true }));
    window.addEventListener("pagehide", () => save({ immediate: true }));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") save({ immediate: true });
    });

    load();
    ensureWalls();
    applyTheme();
    syncInputsFromWall();
    syncInputsFromSpace();
    syncInputsFromProject();
    document.querySelectorAll(".tab[data-view]").forEach(tab => tab.classList.toggle("active", tab.dataset.view === state.view));
    resizeCanvas();
