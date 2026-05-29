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

    on(els.wallSide, "change", () => {
      switchWallSide(els.wallSide.value);
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
    on(els.deleteWall, "click", () => {
      if (state.walls.length <= 1) return;
      const confirmed = window.confirm(`Delete ${activeWallRecord()?.name || "this wall"}? Its objects and guides will be removed from the project.`);
      if (!confirmed) return;
      deleteWall();
    });
    on(els.resetWall, "click", () => {
      const confirmed = window.confirm(`Reset ${activeWallRecord()?.name || "this wall"} to the default size, color, and placement? Existing objects on that wall will stay, but the wall settings will be reset.`);
      if (!confirmed) return;
      resetWallSpecs();
    });

    document.querySelectorAll("#projectTitle,#projectVenue,#projectDates,#projectPreparedBy,#projectRevision,#projectNotes").forEach(input => {
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
        window.alert(error?.message || "The project file could not be opened.");
        console.error(error);
      }
    });

    on(els.clearLocalAutosave, "click", () => {
      const confirmed = window.confirm("Clear the local recovery copy for this project? This will not delete the open project or any file you already saved.");
      if (!confirmed) return;
      clearLocalAutosave();
    });

    on(els.projectFileInput, "change", async event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        if (file.size >= LARGE_PROJECT_WARNING_BYTES) {
          const confirmed = window.confirm(`This project file is large (${formatFileSize(file.size)}). It may contain embedded images and unpublished exhibition details. Continue opening it?`);
          if (!confirmed) return;
        }
        loadProjectFileFromText(await file.text(), file.name || "");
        projectFileHandle = null;
      } catch (error) {
        window.alert(error?.message || "The project file could not be opened.");
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
      if (file.size >= LARGE_IMAGE_WARNING_BYTES) {
        const confirmed = window.confirm(`This image is large (${formatFileSize(file.size)}). Embedding it will make saved project files heavier. Consider resizing or compressing it before embedding. Continue anyway?`);
        if (!confirmed) {
          els.itemImage.value = "";
          els.itemImage.dataset.image = "";
          return;
        }
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
      const created = addItem({
        name: els.itemName.value,
        type: els.itemType.value,
        side: els.itemSide.value,
        shape: els.itemShape.value,
        color: els.itemColor.value,
        text: els.itemText.value,
        notes: els.itemNotes.value,
        hanging: els.itemHanging.checked,
        image: els.itemImage.dataset.image || "",
        x: els.itemX.value,
        y: els.itemY.value,
        width: els.itemW.value,
        height: els.itemH.value
      });
      els.itemImage.value = "";
      els.itemImage.dataset.image = "";
      if (created && els.itemName) {
        requestAnimationFrame(() => {
          els.itemName.focus();
          els.itemName.select();
        });
      }
    });

    const clearItemsButton = document.querySelector("#clearItems");
    on(clearItemsButton, "click", () => {
      const side = activeWallSide();
      if (!itemsForSide(side).length) return;
      const confirmed = window.confirm(`Clear all ${sideLabel(side).toLowerCase()} objects from ${activeWallRecord()?.name || "this wall"}?`);
      if (!confirmed) return;
      captureObjectHistory({ coalesceKey: `clear-items:${state.activeWallId}:${side}` });
      state.items = state.items.filter(item => itemSide(item) !== side);
      setSelection([]);
      resetObjectHistoryCoalesce();
      save();
      render();
    });

    const sampleButton = document.querySelector("#sample");
    on(sampleButton, "click", () => {
      const confirmed = window.confirm("Replace the current wall objects with sample/demo data for this wall?");
      if (!confirmed) return;
      captureObjectHistory({ coalesceKey: "sample-data" });
      state.wall = { width: 6000, height: 3000, depth: 120, color: "#f5f4ea" };
      state.items = window.EWMM_DATA.makeDefaultWallItems(uid);
      setSelection([]);
      resetObjectHistoryCoalesce();
      syncInputsFromWall();
      save();
      render();
    });

    on(els.itemList, "click", event => {
      const button = event.target.closest("[data-remove]");
      if (button) {
        captureObjectHistory({ coalesceKey: `item-delete:${button.dataset.remove}` });
        state.items = state.items.filter(item => item.id !== button.dataset.remove);
        setSelection(selectedIds().filter(id => id !== button.dataset.remove));
        resetObjectHistoryCoalesce();
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

    [els.itemName, els.itemShape, els.itemColor, els.itemText, els.itemNotes, els.itemHanging, els.itemX, els.itemY, els.itemW, els.itemH].forEach(input => {
      input.addEventListener("input", () => handleItemEditorChange(true));
      input.addEventListener("change", () => handleItemEditorChange(true));
    });

    on(els.itemSide, "change", () => {
      if (selectedSingleItem()) {
        handleItemEditorChange(true);
      } else {
        switchWallSide(els.itemSide.value);
      }
    });

    on(els.itemType, "focus", () => {
      els.itemType.dataset.previousType = canonicalItemType(els.itemType.value);
    });

    on(els.itemType, "change", () => {
      const item = selectedSingleItem();
      const previousType = els.itemType.dataset.previousType || (item ? canonicalItemType(item.type) : null);
      applyItemTypeDefaults(previousType);
      els.itemType.dataset.previousType = canonicalItemType(els.itemType.value);
      handleItemEditorChange(true);
    });

    function handleRoomElementEditorChange() {
      if (syncSelectedRoomElementFromInputs()) {
        save();
        render();
      }
    }

    [els.roomElementName, els.roomElementShape, els.roomElementColor, els.roomElementX, els.roomElementY, els.roomElementW, els.roomElementD, els.roomElementH].forEach(input => {
      input.addEventListener("input", handleRoomElementEditorChange);
      input.addEventListener("change", handleRoomElementEditorChange);
    });

    on(els.roomElementType, "focus", () => {
      els.roomElementType.dataset.previousType = canonicalRoomElementType(els.roomElementType.value);
    });

    on(els.roomElementType, "change", () => {
      const previousType = els.roomElementType.dataset.previousType || selectedRoomElement()?.type || null;
      applyRoomElementTypeDefaults(previousType);
      els.roomElementType.dataset.previousType = canonicalRoomElementType(els.roomElementType.value);
      handleRoomElementEditorChange();
    });

    on(els.addRoomElement, "click", () => {
      addRoomElement({
        name: els.roomElementName.value,
        type: els.roomElementType.value,
        shape: els.roomElementShape.value,
        color: els.roomElementColor.value,
        x: els.roomElementX.value,
        y: els.roomElementY.value,
        width: els.roomElementW.value,
        depth: els.roomElementD.value,
        height: els.roomElementH.value
      });
    });

    on(els.clearRoomElements, "click", () => {
      if (!(state.roomElements || []).length) return;
      const confirmed = window.confirm("Clear all room items from the floor plan and 3D room view?");
      if (!confirmed) return;
      captureObjectHistory({ coalesceKey: "clear-room-placeholders" });
      state.roomElements = [];
      state.selectedRoomElementId = null;
      state.selectedSpaceIds = selectedSpaceIds().filter(key => parseSpaceEntityKey(key)?.type !== "room");
      resetObjectHistoryCoalesce();
      save();
      render();
    });

    on(els.roomElementList, "click", event => {
      const remove = event.target.closest("[data-room-remove]");
      if (remove) {
        deleteRoomElement(remove.dataset.roomRemove);
        return;
      }
      const row = event.target.closest("[data-room-select]");
      if (row) {
        if (event.shiftKey) {
          toggleSpaceSelection("room", row.dataset.roomSelect);
        } else {
          setRoomElementSelection(row.dataset.roomSelect);
        }
        render();
      }
    });

    document.querySelectorAll(".tab[data-view]").forEach(button => {
      button.addEventListener("click", () => {
        state.view = button.dataset.view;
        document.querySelectorAll(".tab[data-view]").forEach(tab => tab.classList.toggle("active", tab === button));
        state.selectedRoomElementId = null;
        if (state.view !== "space2d") state.selectedSpaceIds = [];
        save();
        render();
      });
    });

    on(els.zoomOut, "click", () => zoomView(-0.15));
    on(els.zoomIn, "click", () => zoomView(0.15));
    on(els.resetView, "click", resetView);
    on(els.undoAction, "click", undoObjectChanges);
    on(els.redoAction, "click", redoObjectChanges);
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

    on(els.printAllWallsPdf, "click", exportAllWallsPdf);

    const exportRoomPdfButton = document.querySelector("#exportRoomPdf");
    on(exportRoomPdfButton, "click", () => {
      exportA3Pdf("space2d");
    });
    on(els.exportLabelsPdf, "click", exportLabelsPdf);
    on(els.exportPackagePdf, "click", exportInstallationPackagePdf);
    on(els.snapshotView, "click", exportSnapshotPdf);

    on(els.themeToggle, "click", toggleTheme);
    on(els.sidebarToggle, "click", toggleSidebar);

    window.addEventListener("resize", resizeCanvas);
    on(els.canvas, "pointerdown", startDrag);
    on(els.canvas, "pointermove", moveDrag);
    on(els.canvas, "pointerup", stopDrag);
    on(els.canvas, "pointercancel", stopDrag);
    on(els.canvas, "dblclick", event => {
      if (!is2dView()) return;
      if (removeGuideAtPoint(pointerPosition(event))) {
        event.preventDefault();
      }
    });
    on(els.canvas, "wheel", event => {
      event.preventDefault();
      zoomView(event.deltaY < 0 ? 0.12 : -0.12);
    }, { passive: false });
    window.addEventListener("keydown", event => {
      const metaKey = event.metaKey || event.ctrlKey;
      if (!isEditableTarget(event.target)) {
        if (metaKey && !event.altKey && event.key.toLowerCase() === "z") {
          event.preventDefault();
          if (event.shiftKey) {
            redoObjectChanges();
          } else {
            undoObjectChanges();
          }
          return;
        }
        if ((event.ctrlKey && !event.metaKey && !event.shiftKey && event.key.toLowerCase() === "y")) {
          event.preventDefault();
          redoObjectChanges();
          return;
        }
        if ((event.key === "Delete" || event.key === "Backspace") && selectedIds().length) {
          event.preventDefault();
          deleteSelectedItems();
          return;
        }
        if (metaKey && !event.shiftKey && event.key.toLowerCase() === "d" && selectedIds().length) {
          event.preventDefault();
          duplicateSelectedItems();
          return;
        }
        if (event.key === "Escape") {
          if (selectedIds().length || state.selectedRoomElementId || selectedSpaceIds().length) {
            event.preventDefault();
            setSelection([]);
            state.selectedRoomElementId = null;
            state.selectedSpaceIds = [];
            render();
          }
          return;
        }
        if (selectedIds().length && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          const step = event.shiftKey ? 50 : 10;
          if (event.key === "ArrowLeft") nudgeSelectedItems(-step, 0, { coalesceKey: `nudge-x-${step}` });
          if (event.key === "ArrowRight") nudgeSelectedItems(step, 0, { coalesceKey: `nudge-x-${step}` });
          if (event.key === "ArrowUp") nudgeSelectedItems(0, step, { coalesceKey: `nudge-y-${step}` });
          if (event.key === "ArrowDown") nudgeSelectedItems(0, -step, { coalesceKey: `nudge-y-${step}` });
          return;
        }
      }
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
    syncRoomElementInputs();
    updateContextPanels();
    document.querySelectorAll(".tab[data-view]").forEach(tab => tab.classList.toggle("active", tab.dataset.view === state.view));
    resizeCanvas();
