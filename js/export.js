    function download(filename, content, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }

    function drawSchedule(x, y, width) {
      const rowH = 46;
      const items = itemsForSide(activeWallSide()).map(normalizeItem);
      const hasTextColumn = items.some(item => item.text);
      const hasNotesColumn = items.some(item => item.notes);
      const hasMountingColumn = items.some(item => item.hanging);
      const columns = [
        { label: "ID", width: 110 },
        { label: "Name", width: 420 },
        { label: "Type", width: 300 },
        { label: "Side", width: 160 },
        { label: "Size", width: 260 },
        { label: "Position", width: 620 }
      ];
      if (hasMountingColumn) columns.push({ label: "Mounting", width: 320 });
      const usedWidth = columns.reduce((sum, column) => sum + column.width, 0);
      const detailWidth = Math.max(460, width - usedWidth);
      if (hasTextColumn && hasNotesColumn) {
        columns.push({ label: "Visible text", width: Math.floor(detailWidth * 0.48) });
        columns.push({ label: "Notes", width: detailWidth - Math.floor(detailWidth * 0.48) });
      } else if (hasTextColumn) {
        columns.push({ label: "Visible text", width: detailWidth });
      } else if (hasNotesColumn) {
        columns.push({ label: "Notes", width: detailWidth });
      } else {
        columns[5].width += detailWidth;
      }
      let colX = x;
      drawText(`${sideLabel(activeWallSide())} object schedule`, x, y - 44, { align: "left", color: "#161616", size: 29, halo: null });
      activeCtx.fillStyle = "#edf2ec";
      activeCtx.fillRect(x, y, width, rowH);
      columns.forEach(column => {
        drawText(column.label, colX + 12, y + rowH / 2, { align: "left", color: "#161616", size: 18, halo: null });
        colX += column.width;
      });
      items.slice(0, 12).forEach((item, index) => {
        const rowY = y + rowH * (index + 1);
        activeCtx.fillStyle = index % 2 ? "#ffffff" : "#f8faf6";
        activeCtx.fillRect(x, rowY, width, rowH);
        activeCtx.strokeStyle = "#d6ddd4";
        activeCtx.strokeRect(x, rowY, width, rowH);
        const values = [
          itemCode(item),
          item.name,
          itemTypePrintLabel(item.type),
          itemSideLabel(item),
          itemSizeLabel(item),
          itemPositionLabel(item)
        ];
        if (hasMountingColumn) values.push(item.hanging ? "Hanging from top" : "");
        if (hasTextColumn) values.push(exportTextLabel(item));
        if (hasNotesColumn) values.push(exportNotesLabel(item));
        colX = x;
        columns.forEach((column, columnIndex) => {
          drawText(values[columnIndex], colX + 10, rowY + rowH / 2, {
            align: "left",
            color: "#26312b",
            size: 17,
            weight: 600,
            halo: null,
            maxWidth: column.width - 18
          });
          colX += column.width;
        });
      });
    }

    function drawWallSchedule(x, y, width) {
      const rowH = 34;
      const columns = [
        { label: "Wall", width: 420 },
        { label: "Size", width: 360 },
        { label: "Depth", width: 220 },
        { label: "Position in space", width: 440 },
        { label: "Rotation", width: 220 },
        { label: "Objects", width: width - 1660 }
      ];
      let colX = x;
      drawText("Wall schedule", x, y - 36, { align: "left", color: "#161616", size: 25, halo: null });
      activeCtx.fillStyle = "#edf2ec";
      activeCtx.fillRect(x, y, width, rowH);
      columns.forEach(column => {
        drawText(column.label, colX + 10, y + rowH / 2, { align: "left", color: "#161616", size: 16, halo: null });
        colX += column.width;
      });
      const rows = state.walls.slice(0, 7);
      rows.forEach((wallRecord, index) => {
        const wall = wallRecord.wall;
        const placement = wallRecord.placement || {};
        const frontCount = (wallRecord.items || []).filter(item => itemSide(item) === "front").length;
        const backCount = (wallRecord.items || []).filter(item => itemSide(item) === "back").length;
        const rowY = y + rowH * (index + 1);
        activeCtx.fillStyle = index % 2 ? "#ffffff" : "#f8faf6";
        activeCtx.fillRect(x, rowY, width, rowH);
        activeCtx.strokeStyle = "#d6ddd4";
        activeCtx.strokeRect(x, rowY, width, rowH);
        const values = [
          wallRecord.name,
          `${wall.width} x ${wall.height}`,
          `${wall.depth} mm`,
          `x ${Math.round(placement.x || 0)}, y ${Math.round(placement.y || 0)}`,
          `${Math.round(placement.rotation || 0)} deg`,
          `${frontCount} front / ${backCount} back`
        ];
        colX = x;
        columns.forEach((column, columnIndex) => {
          drawText(values[columnIndex], colX + 10, rowY + rowH / 2, {
            align: "left",
            color: "#26312b",
            size: 15,
            weight: 600,
            halo: null,
            maxWidth: column.width - 18
          });
          colX += column.width;
        });
      });
      return rowH * (rows.length + 1);
    }

    function drawRoomElementSchedule(x, y, width) {
      const rowH = 34;
      const elements = (state.roomElements || []).map(normalizeRoomElement).slice(0, 7);
      if (!elements.length) return 0;
      const columns = [
        { label: "Name", width: 500 },
        { label: "Type", width: 420 },
        { label: "Shape", width: 260 },
        { label: "Center", width: 440 },
        { label: "Size", width: width - 1620 }
      ];
      let colX = x;
      drawText("Room placeholders", x, y - 36, { align: "left", color: "#161616", size: 25, halo: null });
      activeCtx.fillStyle = "#edf2ec";
      activeCtx.fillRect(x, y, width, rowH);
      columns.forEach(column => {
        drawText(column.label, colX + 10, y + rowH / 2, { align: "left", color: "#161616", size: 16, halo: null });
        colX += column.width;
      });
      elements.forEach((element, index) => {
        const rowY = y + rowH * (index + 1);
        activeCtx.fillStyle = index % 2 ? "#ffffff" : "#f8faf6";
        activeCtx.fillRect(x, rowY, width, rowH);
        activeCtx.strokeStyle = "#d6ddd4";
        activeCtx.strokeRect(x, rowY, width, rowH);
        const values = [
          element.name,
          roomElementTypeLabel(element.type),
          element.shape === "circle" ? "circular" : "rectangular",
          `x ${Math.round(element.x)}, y ${Math.round(element.y)}`,
          `${Math.round(element.width)} x ${Math.round(element.depth)} mm`
        ];
        colX = x;
        columns.forEach((column, columnIndex) => {
          drawText(values[columnIndex], colX + 10, rowY + rowH / 2, {
            align: "left",
            color: "#26312b",
            size: 15,
            weight: 600,
            halo: null,
            maxWidth: column.width - 18
          });
          colX += column.width;
        });
      });
      return rowH * (elements.length + 1);
    }

    function drawObjectListSidebar(x, y, width, height) {
      const items = itemsForSide(activeWallSide()).map(normalizeItem);
      drawText(`${sideLabel(activeWallSide())} objects (${items.length})`, x, y - 38, { align: "left", color: "#161616", size: 42, halo: null, noExportBoost: true });
      if (!items.length) return;
      const headerH = 54;
      const rowH = clamp(Math.floor((height - headerH) / items.length), 82, 126);
      activeCtx.fillStyle = "#edf2ec";
      activeCtx.fillRect(x, y, width, headerH);
      activeCtx.strokeStyle = "#d6ddd4";
      activeCtx.strokeRect(x, y, width, headerH);
      drawText("ID", x + 16, y + headerH / 2, { align: "left", color: "#161616", size: 22, weight: 800, halo: null, noExportBoost: true });
      drawText("Object", x + 116, y + headerH / 2, { align: "left", color: "#161616", size: 22, weight: 800, halo: null, noExportBoost: true });
      drawText("Size / position", x + width - 16, y + headerH / 2, { align: "right", color: "#161616", size: 22, weight: 800, halo: null, noExportBoost: true });
      let cardY = y + headerH;
      items.forEach((item, index) => {
        const detailText = exportTextLabel(item);
        const notesText = exportNotesLabel(item);
        const mountingText = exportMountingLabel(item);
        activeCtx.fillStyle = index % 2 ? "#ffffff" : "#f8faf6";
        activeCtx.fillRect(x, cardY, width, rowH);
        activeCtx.strokeStyle = "#d6ddd4";
        activeCtx.strokeRect(x, cardY, width, rowH);
        const codeX = x + 16;
        const contentX = x + 116;
        const rightX = x + width - 16;
        const nameWidth = Math.max(170, width - 360);
        const titleY = cardY + Math.min(42, rowH * 0.36);
        const detailY = cardY + Math.min(rowH - 24, titleY + 42);
        drawText(itemCode(item), codeX, titleY, { align: "left", color: "#26312b", size: 20, weight: 800, halo: null, noExportBoost: true });
        drawText(item.name, contentX, titleY, { align: "left", color: "#161616", size: 24, weight: 800, halo: null, maxWidth: nameWidth, noExportBoost: true });
        drawText(itemSizeLabel(item), rightX, titleY, { align: "right", color: "#26312b", size: 20, weight: 700, halo: null, maxWidth: 240, noExportBoost: true });
        const details = [
          itemTypePrintLabel(item.type),
          itemPositionLabel(item),
          mountingText,
          detailText,
          notesText
        ].filter(Boolean).join(" | ");
        if (rowH >= 96) {
          drawText(details, contentX, detailY, { align: "left", color: "#4b5750", size: 18, weight: 600, halo: null, maxWidth: width - 132, noExportBoost: true });
        } else {
          drawText(`${itemTypePrintLabel(item.type)} | ${itemPositionLabel(item)}`, contentX, detailY, { align: "left", color: "#4b5750", size: 16, weight: 600, halo: null, maxWidth: width - 132, noExportBoost: true });
        }
        cardY += rowH;
      });
    }

    function createA3Canvas(exportView = state.view) {
      const previousCanvas = activeCanvas;
      const previousCtx = activeCtx;
      const previousView = state.view;
      const previousZoom2d = state.view2d.zoom;
      const previousPanX = number(state.view2d.panX, 0);
      const previousPanY = number(state.view2d.panY, 0);
      const previousZoom3d = state.view3d.zoom;
      const a3 = {
        width: 4961,
        height: 3508,
        margin: 220,
        header: 250
      };
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = a3.width;
      exportCanvas.height = a3.height;
      activeCanvas = exportCanvas;
      activeCtx = exportCanvas.getContext("2d");
      activeCtx.setTransform(1, 0, 0, 1, 0, 0);
      activeCtx.fillStyle = "#ffffff";
      activeCtx.fillRect(0, 0, a3.width, a3.height);

      state.view = exportView;
      const titles = {
        elevation: "Active wall 2D measured preview",
        space2d: "Exhibition space 2D top view"
      };
      const title = titles[exportView] || "2D preview";
      const brandTitle = "Exhibition Wall Mockup Maker";
      const versionX = a3.margin + textWidth(brandTitle, 42, 700, { noExportBoost: true }) + 28;
      drawText(brandTitle, a3.margin, 78, { align: "left", baseline: "middle", color: "#161616", size: 42, halo: null, noExportBoost: true });
      drawText("V1.0", versionX, 80, { align: "left", baseline: "middle", color: "#7c8580", size: 17, weight: 700, halo: null, noExportBoost: true });
      drawText(`by @tiagomartinspinto | ${title}`, a3.margin, 134, { align: "left", baseline: "middle", color: "#5d655f", size: 27, weight: 600, halo: null, noExportBoost: true });
      drawText(state.project.title || "Untitled exhibition", a3.margin, 184, { align: "left", baseline: "middle", color: "#5d655f", size: 24, weight: 600, halo: null, noExportBoost: true });
      const exportMeta = exportView === "space2d"
        ? `Space ${state.space.width} x ${state.space.depth} mm | ${state.walls.length} walls | ${(state.roomElements || []).length} placeholders | Print on A3 for scale/readability`
        : `${activeWallRecord().name} | ${sideLabel(activeWallSide())} side | ${state.wall.width} x ${state.wall.height} mm | depth ${state.wall.depth} mm | Print on A3 for scale/readability`;
      drawText(exportMeta, a3.margin, 228, { align: "left", baseline: "middle", color: "#5d655f", size: 23, weight: 600, halo: null, noExportBoost: true });
      drawLine(a3.margin, 242, a3.width - a3.margin, 242, "#c8cfc8");

      const wallRatio = state.wall.width / Math.max(1, state.wall.height);
      const activeItems = itemsForSide(activeWallSide());
      const sideList = exportView === "elevation" && (wallRatio < 1.78 || activeItems.length > 8);
      const contentX = a3.margin;
      const drawingY = a3.header + a3.margin / 2;
      const contentW = a3.width - a3.margin * 2;
      const sidebarGap = sideList ? 52 : 70;
      const sidebarW = sideList ? Math.min(1120, Math.floor(contentW * 0.24)) : 0;
      const scheduleH = sideList ? 0 : exportView === "space2d" && (state.roomElements || []).length ? 760 : 560;
      const drawingX = contentX;
      const drawingW = sideList ? contentW - sidebarW - sidebarGap : contentW;
      const drawingH = sideList ? a3.height - drawingY - a3.margin : a3.height - drawingY - a3.margin - scheduleH;
      const drawingCanvas = document.createElement("canvas");
      drawingCanvas.width = drawingW;
      drawingCanvas.height = drawingH;

      activeCanvas = drawingCanvas;
      activeCtx = drawingCanvas.getContext("2d");
      activeCtx.setTransform(1, 0, 0, 1, 0, 0);
      if (exportView === "elevation") {
        state.view2d.zoom = 1;
        state.view2d.panX = 0;
        state.view2d.panY = 0;
        drawElevation();
      } else {
        state.view2d.zoom = 1;
        state.view2d.panX = 0;
        state.view2d.panY = 0;
        drawSpace2D();
      }

      activeCanvas = exportCanvas;
      activeCtx = exportCanvas.getContext("2d");
      activeCtx.drawImage(drawingCanvas, drawingX, drawingY);
      if (sideList) {
        drawObjectListSidebar(drawingX + drawingW + sidebarGap, drawingY + 10, sidebarW, drawingH - 20);
      } else if (exportView === "space2d") {
        const scheduleY = drawingY + drawingH + 110;
        const wallScheduleH = drawWallSchedule(drawingX, scheduleY, drawingW);
        drawRoomElementSchedule(drawingX, scheduleY + wallScheduleH + 74, drawingW);
      } else {
        drawSchedule(drawingX, drawingY + drawingH + 110, drawingW);
      }

      state.view = previousView;
      state.view2d.zoom = previousZoom2d;
      state.view2d.panX = previousPanX;
      state.view2d.panY = previousPanY;
      state.view3d.zoom = previousZoom3d;
      activeCanvas = previousCanvas;
      activeCtx = previousCtx;
      activeCtx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      render();
      return exportCanvas;
    }

    function asciiBytes(text) {
      const bytes = new Uint8Array(text.length);
      for (let index = 0; index < text.length; index += 1) {
        bytes[index] = text.charCodeAt(index) & 255;
      }
      return bytes;
    }

    function base64Bytes(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    }

    function makePdfFromCanvases(canvases) {
      const pages = canvases.map(canvas => ({
        canvas,
        imageBytes: base64Bytes(canvas.toDataURL("image/jpeg", 0.94).split(",")[1])
      }));
      const pageW = 1190.55;
      const pageH = 841.89;
      const chunks = [];
      const offsets = [0];
      let length = 0;

      function append(part) {
        const bytes = typeof part === "string" ? asciiBytes(part) : part;
        chunks.push(bytes);
        length += bytes.length;
      }

      function object(id, body) {
        offsets[id] = length;
        append(`${id} 0 obj\n${body}\nendobj\n`);
      }

      const pageIds = pages.map((_, index) => 3 + index * 3);
      const totalObjects = 2 + pages.length * 3;

      append("%PDF-1.4\n");
      object(1, "<< /Type /Catalog /Pages 2 0 R >>");
      object(2, `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
      pages.forEach((page, index) => {
        const pageId = 3 + index * 3;
        const imageId = pageId + 1;
        const contentId = pageId + 2;
        const imageName = `Im${index}`;
        object(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
        offsets[imageId] = length;
        append(`${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.canvas.width} /Height ${page.canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.imageBytes.length} >>\nstream\n`);
        append(page.imageBytes);
        append("\nendstream\nendobj\n");
        const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/${imageName} Do\nQ\n`;
        object(contentId, `<< /Length ${content.length} >>\nstream\n${content}endstream`);
      });

      const xrefAt = length;
      append(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
      for (let id = 1; id <= totalObjects; id += 1) {
        append(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
      }
      append(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`);

      const output = new Uint8Array(length);
      let offset = 0;
      chunks.forEach(chunk => {
        output.set(chunk, offset);
        offset += chunk.length;
      });
      return output;
    }

    function makePdfFromCanvas(canvas) {
      return makePdfFromCanvases([canvas]);
    }

    function slug(text) {
      return String(text || "export")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60) || "export";
    }

    function snapshotViewTitle(view = state.view) {
      return {
        elevation: "2D wall preview",
        perspective: "3D wall preview",
        space2d: "Floor plan",
        space3d: "3D room preview"
      }[view] || "Preview";
    }

    function exportA3Pdf(exportView) {
      const canvas = createA3Canvas(exportView);
      const filename = exportView === "space2d"
        ? `${slug(state.project.title)}-room-floor-plan.pdf`
        : `${slug(state.project.title)}-${slug(activeWallRecord().name)}-2d-wall.pdf`;
      download(filename, makePdfFromCanvas(canvas), "application/pdf");
    }

    function printableWallSides(wall) {
      const sidesWithObjects = ["front", "back"].filter(side => (wall.items || []).some(item => itemSide(item) === side));
      return sidesWithObjects.length ? sidesWithObjects : ["front"];
    }

    function restoreWallExportState(previous) {
      state.view = previous.view;
      state.activeWallId = previous.activeWallId;
      state.activeSide = previous.activeSide;
      state.selectedId = previous.selectedId;
      state.selectedIds = [...previous.selectedIds];
      state.selectedSpaceIds = [...previous.selectedSpaceIds];
      state.selectedRoomElementId = previous.selectedRoomElementId;
      state.view2d = { ...previous.view2d };
      state.view3d = { ...previous.view3d };
      loadActiveWall();
      if (els.wallSide) els.wallSide.value = state.activeSide;
      syncInputsFromWall();
      syncItemInputs();
      render();
    }

    function exportAllWallsPdf() {
      syncActiveWallRecord();
      const previous = {
        view: state.view,
        activeWallId: state.activeWallId,
        activeSide: activeWallSide(),
        selectedId: state.selectedId,
        selectedIds: [...selectedIds()],
        selectedSpaceIds: [...selectedSpaceIds()],
        selectedRoomElementId: state.selectedRoomElementId,
        view2d: { ...state.view2d },
        view3d: { ...state.view3d }
      };
      const jobs = (state.walls || []).flatMap(wall => printableWallSides(wall).map(side => ({ wall, side })));
      const canvases = [];
      try {
        jobs.forEach(({ wall, side }) => {
          state.activeWallId = wall.id;
          loadActiveWall();
          state.activeSide = normalizeWallSide(side);
          if (els.wallSide) els.wallSide.value = state.activeSide;
          syncInputsFromWall();
          canvases.push(createA3Canvas("elevation"));
        });
      } finally {
        restoreWallExportState(previous);
      }
      if (!canvases.length) return;
      download(`${slug(state.project.title)}-all-walls.pdf`, makePdfFromCanvases(canvases), "application/pdf");
    }

    function createSnapshotPdfCanvas() {
      const page = {
        width: 3508,
        height: 2480,
        margin: 170,
        header: 190
      };
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = page.width;
      exportCanvas.height = page.height;
      const ctx = exportCanvas.getContext("2d");
      const previousCanvas = activeCanvas;
      const previousCtx = activeCtx;
      activeCanvas = exportCanvas;
      activeCtx = ctx;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, page.width, page.height);

      const title = snapshotViewTitle();
      const statusLine = els.scaleLabel.textContent || title;
      const meta = state.view === "space3d" || state.view === "space2d"
        ? `${state.project.title || "Untitled exhibition"} | ${state.walls.length} wall${state.walls.length === 1 ? "" : "s"}`
        : `${state.project.title || "Untitled exhibition"} | ${activeWallRecord().name}`;

      drawText("Exhibition Wall Mockup Maker", page.margin, 82, { align: "left", baseline: "middle", color: "#161616", size: 38, halo: null, noExportBoost: true });
      drawText("V1.0", page.margin + textWidth("Exhibition Wall Mockup Maker", 38, 700, { noExportBoost: true }) + 26, 84, { align: "left", baseline: "middle", color: "#7c8580", size: 16, weight: 700, halo: null, noExportBoost: true });
      drawText(`by @tiagomartinspinto | ${title}`, page.margin, 132, { align: "left", baseline: "middle", color: "#5d655f", size: 23, weight: 600, halo: null, noExportBoost: true });
      drawText(meta, page.margin, 174, { align: "left", baseline: "middle", color: "#5d655f", size: 20, weight: 600, halo: null, noExportBoost: true });
      drawText(statusLine, page.width - page.margin, 174, { align: "right", baseline: "middle", color: "#7c8580", size: 18, weight: 600, halo: null, noExportBoost: true });
      drawLine(page.margin, 198, page.width - page.margin, 198, "#d7ddd6");

      const frameX = page.margin;
      const frameY = page.header + 36;
      const frameW = page.width - page.margin * 2;
      const frameH = page.height - frameY - page.margin;
      const source = els.canvas;
      const ratio = Math.min(frameW / source.width, frameH / source.height);
      const drawW = source.width * ratio;
      const drawH = source.height * ratio;
      const drawX = frameX + (frameW - drawW) / 2;
      const drawY = frameY + (frameH - drawH) / 2;

      ctx.fillStyle = "#f3f5f2";
      ctx.fillRect(drawX - 16, drawY - 16, drawW + 32, drawH + 32);
      ctx.strokeStyle = "#d7ddd6";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(drawX - 16, drawY - 16, drawW + 32, drawH + 32);
      ctx.drawImage(source, drawX, drawY, drawW, drawH);

      activeCanvas = previousCanvas;
      activeCtx = previousCtx;
      return exportCanvas;
    }

    function exportSnapshotPdf() {
      const canvas = createSnapshotPdfCanvas();
      download(`${slug(state.project.title)}-${slug(snapshotViewTitle())}-snapshot.pdf`, makePdfFromCanvas(canvas), "application/pdf");
    }
