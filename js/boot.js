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

    els.wallTabs.addEventListener("click", event => {
      const button = event.target.closest("[data-wall-tab]");
      if (button) switchWall(button.dataset.wallTab);
    });

    els.addWall.addEventListener("click", addWall);
    els.duplicateWall.addEventListener("click", duplicateWall);
    els.deleteWall.addEventListener("click", deleteWall);
    els.resetWall.addEventListener("click", resetWallSpecs);

    document.querySelectorAll("#projectTitle").forEach(input => {
      input.addEventListener("input", syncProjectFromInputs);
    });

    els.itemImage.addEventListener("change", event => {
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

    els.addItem.addEventListener("click", () => {
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

    document.querySelector("#clearItems").addEventListener("click", () => {
      state.items = [];
      setSelection([]);
      save();
      render();
    });

    document.querySelector("#sample").addEventListener("click", () => {
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

    els.itemList.addEventListener("click", event => {
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

    els.itemType.addEventListener("change", () => {
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

    els.zoomOut.addEventListener("click", () => zoomView(-0.15));
    els.zoomIn.addEventListener("click", () => zoomView(0.15));
    els.resetView.addEventListener("click", resetView);
    els.toolSelect.addEventListener("click", () => setTool("select"));
    els.toolHand.addEventListener("click", () => setTool("hand"));
    els.rotateXDown.addEventListener("click", () => rotate3d("x", -10));
    els.rotateXUp.addEventListener("click", () => rotate3d("x", 10));
    els.rotateYLeft.addEventListener("click", () => rotate3d("y", -12));
    els.rotateYRight.addEventListener("click", () => rotate3d("y", 12));
    els.rotateZLeft.addEventListener("click", () => rotate3d("z", -10));
    els.rotateZRight.addEventListener("click", () => rotate3d("z", 10));
    els.alignLeft.addEventListener("click", () => alignSelection("left"));
    els.alignCenter.addEventListener("click", () => alignSelection("center"));
    els.alignRight.addEventListener("click", () => alignSelection("right"));
    els.alignTop.addEventListener("click", () => alignSelection("top"));
    els.alignMiddle.addEventListener("click", () => alignSelection("middle"));
    els.alignBottom.addEventListener("click", () => alignSelection("bottom"));
    els.distributeH.addEventListener("click", () => distributeSelection("h"));
    els.distributeV.addEventListener("click", () => distributeSelection("v"));

    document.querySelector("#exportWallPdf").addEventListener("click", () => {
      exportA3Pdf("elevation");
    });

    document.querySelector("#exportRoomPdf").addEventListener("click", () => {
      exportA3Pdf("space2d");
    });
    els.snapshotView.addEventListener("click", exportSnapshotPdf);

    els.themeToggle.addEventListener("click", toggleTheme);
    els.sidebarToggle.addEventListener("click", toggleSidebar);

    window.addEventListener("resize", resizeCanvas);
    els.canvas.addEventListener("pointerdown", startDrag);
    els.canvas.addEventListener("pointermove", moveDrag);
    els.canvas.addEventListener("pointerup", stopDrag);
    els.canvas.addEventListener("pointercancel", stopDrag);
    els.canvas.addEventListener("wheel", event => {
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
