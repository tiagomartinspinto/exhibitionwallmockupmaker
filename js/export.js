    function download(filename, content, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }

    function cleanProjectText(value) {
      return String(value || "").trim();
    }

    function projectTitle() {
      return cleanProjectText(state.project.title) || "Untitled exhibition";
    }

    function generatedTimestamp() {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date());
    }

    function projectRevisionLabel() {
      const revision = cleanProjectText(state.project.revision);
      return revision ? `Revision ${revision}` : "Revision draft";
    }

    function projectVenueDatesLine() {
      return [state.project.venue, state.project.dates].map(cleanProjectText).filter(Boolean).join(" / ");
    }

    function projectPreparedLine() {
      return [
        cleanProjectText(state.project.preparedBy) ? `Prepared by ${cleanProjectText(state.project.preparedBy)}` : "",
        `Prepared ${generatedTimestamp()}`
      ].filter(Boolean).join(" / ");
    }

    function drawWrappedText(text, x, y, maxWidth, options = {}) {
      const size = options.size || 18;
      const weight = options.weight || 600;
      const lineHeight = options.lineHeight || Math.ceil(size * 1.45);
      const paragraphs = String(text || "").split(/\n+/).map(part => part.trim()).filter(Boolean);
      if (!paragraphs.length) return y;
      let cursorY = y;
      paragraphs.forEach((paragraph, paragraphIndex) => {
        let line = "";
        paragraph.split(/\s+/).forEach(word => {
          const next = line ? `${line} ${word}` : word;
          if (line && textWidth(next, size, weight, options) > maxWidth) {
            drawText(line, x, cursorY, { ...options, size, weight, align: "left", baseline: "middle", maxWidth });
            cursorY += lineHeight;
            line = word;
          } else {
            line = next;
          }
        });
        if (line) {
          drawText(line, x, cursorY, { ...options, size, weight, align: "left", baseline: "middle", maxWidth });
          cursorY += lineHeight;
        }
        if (paragraphIndex < paragraphs.length - 1) cursorY += Math.ceil(lineHeight * 0.45);
      });
      return cursorY;
    }

    function drawA3Footer(a3, contextLabel = "") {
      const y = a3.height - 92;
      drawLine(a3.margin, y - 38, a3.width - a3.margin, y - 38, "#d8d2c6");
      drawText("Scale confidence: dimensions are in millimeters. Use written dimensions and site datums before drilling; printer scaling can vary.", a3.margin, y, {
        align: "left",
        baseline: "middle",
        color: "#5d5a52",
        size: 17,
        weight: 600,
        halo: null,
        maxWidth: a3.width - a3.margin * 2 - 900,
        noExportBoost: true
      });
      drawText([contextLabel, projectRevisionLabel()].filter(Boolean).join(" / "), a3.width - a3.margin, y, {
        align: "right",
        baseline: "middle",
        color: "#7c766d",
        size: 16,
        weight: 600,
        halo: null,
        maxWidth: 840,
        noExportBoost: true
      });
    }

    function allWallItemContexts() {
      return (state.walls || []).flatMap(wallRecord => {
        const wallItems = (wallRecord.items || []).map(normalizeItem);
        return wallItems.map(item => ({
          wallRecord,
          wallItems,
          item,
          code: itemCodeForWallItems(item, wallItems)
        }));
      });
    }

    function itemCodeForWallItems(item, wallItems) {
      const normalized = normalizeItem(item);
      const prefixes = { graphic: "PG", mdf: "MS", object: "OP", screen: "SC", support: "SS", text: "TX" };
      const sameType = wallItems.filter(candidate => normalizeItem(candidate).type === normalized.type);
      const index = sameType.findIndex(candidate => candidate.id === normalized.id) + 1;
      return `${prefixes[normalized.type] || "O"}${String(Math.max(1, index)).padStart(2, "0")}`;
    }

    function countWallOverlaps(wallRecord) {
      const itemsBySide = ["front", "back"].map(side => (wallRecord.items || []).map(normalizeItem).filter(item => itemSide(item) === side));
      return itemsBySide.reduce((sum, items) => {
        let count = 0;
        for (let a = 0; a < items.length; a += 1) {
          for (let b = a + 1; b < items.length; b += 1) {
            const one = items[a];
            const two = items[b];
            const overlap = one.x < two.x + two.width && one.x + one.width > two.x && one.y < two.y + two.height && one.y + one.height > two.y;
            if (overlap) count += 1;
          }
        }
        return sum + count;
      }, 0);
    }

    function countOutOfBoundsItems(wallRecord) {
      const wall = wallRecord.wall || {};
      return (wallRecord.items || []).map(normalizeItem).filter(item => (
        item.x < 0 ||
        item.y < 0 ||
        item.x + item.width > number(wall.width, 0) ||
        item.y + item.height > number(wall.height, 0)
      )).length;
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
        { label: "Face", width: 160 },
        { label: "Size", width: 260 },
        { label: "Placement", width: 620 }
      ];
      if (hasMountingColumn) columns.push({ label: "Mounting", width: 320 });
      const usedWidth = columns.reduce((sum, column) => sum + column.width, 0);
      const detailWidth = Math.max(460, width - usedWidth);
      if (hasTextColumn && hasNotesColumn) {
        columns.push({ label: "Text", width: Math.floor(detailWidth * 0.48) });
        columns.push({ label: "Install notes", width: detailWidth - Math.floor(detailWidth * 0.48) });
      } else if (hasTextColumn) {
        columns.push({ label: "Text", width: detailWidth });
      } else if (hasNotesColumn) {
        columns.push({ label: "Install notes", width: detailWidth });
      } else {
        columns[5].width += detailWidth;
      }
      let colX = x;
      drawText(`${sideLabel(activeWallSide())} objects`, x, y - 44, { align: "left", color: "#1d1c19", size: 27, halo: null });
      activeCtx.fillStyle = "#f1efe7";
      activeCtx.fillRect(x, y, width, rowH);
      columns.forEach(column => {
        drawText(column.label, colX + 12, y + rowH / 2, { align: "left", color: "#1d1c19", size: 18, halo: null });
        colX += column.width;
      });
      items.slice(0, 12).forEach((item, index) => {
        const rowY = y + rowH * (index + 1);
        activeCtx.fillStyle = index % 2 ? "#fffdf8" : "#faf9f4";
        activeCtx.fillRect(x, rowY, width, rowH);
        activeCtx.strokeStyle = "#ded8ce";
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
            color: "#2c2a25",
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
        { label: "Room position", width: 440 },
        { label: "Rotation", width: 220 },
        { label: "Objects", width: width - 1660 }
      ];
      let colX = x;
      drawText("Walls", x, y - 36, { align: "left", color: "#1d1c19", size: 24, halo: null });
      activeCtx.fillStyle = "#f1efe7";
      activeCtx.fillRect(x, y, width, rowH);
      columns.forEach(column => {
        drawText(column.label, colX + 10, y + rowH / 2, { align: "left", color: "#1d1c19", size: 16, halo: null });
        colX += column.width;
      });
      const rows = state.walls;
      rows.forEach((wallRecord, index) => {
        const wall = wallRecord.wall;
        const placement = wallRecord.placement || {};
        const frontCount = (wallRecord.items || []).filter(item => itemSide(item) === "front").length;
        const backCount = (wallRecord.items || []).filter(item => itemSide(item) === "back").length;
        const rowY = y + rowH * (index + 1);
        activeCtx.fillStyle = index % 2 ? "#fffdf8" : "#faf9f4";
        activeCtx.fillRect(x, rowY, width, rowH);
        activeCtx.strokeStyle = "#ded8ce";
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
            color: "#2c2a25",
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
      const elements = (state.roomElements || []).map(normalizeRoomElement);
      if (!elements.length) return 0;
      const columns = [
        { label: "Name", width: 500 },
        { label: "Type", width: 420 },
        { label: "Shape", width: 260 },
        { label: "Center", width: 440 },
        { label: "Size", width: width - 1620 }
      ];
      let colX = x;
      drawText("Room items", x, y - 36, { align: "left", color: "#1d1c19", size: 24, halo: null });
      activeCtx.fillStyle = "#f1efe7";
      activeCtx.fillRect(x, y, width, rowH);
      columns.forEach(column => {
        drawText(column.label, colX + 10, y + rowH / 2, { align: "left", color: "#1d1c19", size: 16, halo: null });
        colX += column.width;
      });
      elements.forEach((element, index) => {
        const rowY = y + rowH * (index + 1);
        activeCtx.fillStyle = index % 2 ? "#fffdf8" : "#faf9f4";
        activeCtx.fillRect(x, rowY, width, rowH);
        activeCtx.strokeStyle = "#ded8ce";
        activeCtx.strokeRect(x, rowY, width, rowH);
        const values = [
          element.name,
          roomElementTypeLabel(element.type),
          element.shape === "circle" ? "circular" : "rectangular",
          `x ${Math.round(element.x)}, y ${Math.round(element.y)}`,
          `${Math.round(element.width)} x ${Math.round(element.depth)} x ${Math.round(element.height)} mm`
        ];
        colX = x;
        columns.forEach((column, columnIndex) => {
          drawText(values[columnIndex], colX + 10, rowY + rowH / 2, {
            align: "left",
            color: "#2c2a25",
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
      drawText(`${sideLabel(activeWallSide())} objects (${items.length})`, x, y - 38, { align: "left", color: "#1d1c19", size: 36, halo: null, noExportBoost: true });
      if (!items.length) return;
      const headerH = 54;
      const rowH = clamp(Math.floor((height - headerH) / items.length), 82, 126);
      activeCtx.fillStyle = "#f1efe7";
      activeCtx.fillRect(x, y, width, headerH);
      activeCtx.strokeStyle = "#ded8ce";
      activeCtx.strokeRect(x, y, width, headerH);
      drawText("ID", x + 16, y + headerH / 2, { align: "left", color: "#1d1c19", size: 21, weight: 800, halo: null, noExportBoost: true });
      drawText("Object", x + 116, y + headerH / 2, { align: "left", color: "#1d1c19", size: 21, weight: 800, halo: null, noExportBoost: true });
      drawText("Size / position", x + width - 16, y + headerH / 2, { align: "right", color: "#1d1c19", size: 21, weight: 800, halo: null, noExportBoost: true });
      let cardY = y + headerH;
      items.forEach((item, index) => {
        const detailText = exportTextLabel(item);
        const notesText = exportNotesLabel(item);
        const mountingText = exportMountingLabel(item);
        activeCtx.fillStyle = index % 2 ? "#fffdf8" : "#faf9f4";
        activeCtx.fillRect(x, cardY, width, rowH);
        activeCtx.strokeStyle = "#ded8ce";
        activeCtx.strokeRect(x, cardY, width, rowH);
        const codeX = x + 16;
        const contentX = x + 116;
        const rightX = x + width - 16;
        const nameWidth = Math.max(170, width - 360);
        const titleY = cardY + Math.min(42, rowH * 0.36);
        const detailY = cardY + Math.min(rowH - 24, titleY + 42);
        drawText(itemCode(item), codeX, titleY, { align: "left", color: "#2c2a25", size: 20, weight: 800, halo: null, noExportBoost: true });
        drawText(item.name, contentX, titleY, { align: "left", color: "#1d1c19", size: 23, weight: 800, halo: null, maxWidth: nameWidth, noExportBoost: true });
        drawText(itemSizeLabel(item), rightX, titleY, { align: "right", color: "#2c2a25", size: 20, weight: 700, halo: null, maxWidth: 240, noExportBoost: true });
        const details = [
          itemTypePrintLabel(item.type),
          itemPositionLabel(item),
          mountingText,
          detailText,
          notesText
        ].filter(Boolean).join(" / ");
        if (rowH >= 96) {
          drawText(details, contentX, detailY, { align: "left", color: "#5d5a52", size: 18, weight: 600, halo: null, maxWidth: width - 132, noExportBoost: true });
        } else {
          drawText(`${itemTypePrintLabel(item.type)} / ${itemPositionLabel(item)}`, contentX, detailY, { align: "left", color: "#5d5a52", size: 16, weight: 600, halo: null, maxWidth: width - 132, noExportBoost: true });
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
        elevation: "Wall installation sheet",
        space2d: "Room plan"
      };
      const title = titles[exportView] || "Preview";
      const venueDates = projectVenueDatesLine();
      drawText(projectTitle(), a3.margin, 78, { align: "left", baseline: "middle", color: "#1d1c19", size: 40, weight: 800, halo: null, maxWidth: 2600, noExportBoost: true });
      drawText(title, a3.margin, 136, { align: "left", baseline: "middle", color: "#1d1c19", size: 30, weight: 700, halo: null, noExportBoost: true });
      if (venueDates) {
        drawText(venueDates, a3.margin, 176, { align: "left", baseline: "middle", color: "#5d5a52", size: 19, weight: 600, halo: null, maxWidth: 2600, noExportBoost: true });
      }
      drawText(projectRevisionLabel(), a3.width - a3.margin, 78, { align: "right", baseline: "middle", color: "#5d5a52", size: 19, weight: 700, halo: null, noExportBoost: true });
      drawText(projectPreparedLine(), a3.width - a3.margin, 118, { align: "right", baseline: "middle", color: "#7c766d", size: 17, weight: 600, halo: null, maxWidth: 1250, noExportBoost: true });
      drawText("by @tiagomartinspinto", a3.width - a3.margin, 156, { align: "right", baseline: "middle", color: "#7c766d", size: 17, weight: 600, halo: null, noExportBoost: true });
      const exportMeta = exportView === "space2d"
        ? `Room ${state.space.width} x ${state.space.depth} mm / ${state.walls.length} walls / ${(state.roomElements || []).length} room items`
        : `${activeWallRecord().name} / ${sideLabel(activeWallSide())} face / ${state.wall.width} x ${state.wall.height} mm / ${state.wall.depth} mm depth`;
      drawText(exportMeta, a3.margin, 210, { align: "left", baseline: "middle", color: "#5d5a52", size: 21, weight: 600, halo: null, noExportBoost: true });
      drawLine(a3.margin, 252, a3.width - a3.margin, 252, "#d8d2c6");

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
      drawA3Footer(a3, title);

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

    function captureWallExportState() {
      return {
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
      const previous = captureWallExportState();
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

    function createBlankA3Canvas() {
      const a3 = {
        width: 4961,
        height: 3508,
        margin: 220,
        header: 250
      };
      const previousCanvas = activeCanvas;
      const previousCtx = activeCtx;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = a3.width;
      exportCanvas.height = a3.height;
      activeCanvas = exportCanvas;
      activeCtx = exportCanvas.getContext("2d");
      activeCtx.setTransform(1, 0, 0, 1, 0, 0);
      activeCtx.fillStyle = "#ffffff";
      activeCtx.fillRect(0, 0, a3.width, a3.height);
      return { a3, exportCanvas, previousCanvas, previousCtx };
    }

    function restoreCanvasContext(previousCanvas, previousCtx) {
      activeCanvas = previousCanvas;
      activeCtx = previousCtx;
    }

    function createPackageCoverCanvas() {
      const { a3, exportCanvas, previousCanvas, previousCtx } = createBlankA3Canvas();
      const contentW = a3.width - a3.margin * 2;
      const leftX = a3.margin;
      const rightX = a3.margin + Math.floor(contentW * 0.54);
      const colW = Math.floor(contentW * 0.42);
      const projectRows = [
        ["Venue", cleanProjectText(state.project.venue) || "Not set"],
        ["Dates", cleanProjectText(state.project.dates) || "Not set"],
        ["Prepared by", cleanProjectText(state.project.preparedBy) || "Not set"],
        ["Revision", cleanProjectText(state.project.revision) || "Draft"]
      ];
      const itemContexts = allWallItemContexts();
      const wallCount = (state.walls || []).length;
      const objectCount = itemContexts.length;
      const roomItemCount = (state.roomElements || []).length;
      const wallSides = (state.walls || []).reduce((sum, wall) => sum + printableWallSides(wall).length, 0);
      const overlapCount = (state.walls || []).reduce((sum, wall) => sum + countWallOverlaps(wall), 0);
      const outOfBoundsCount = (state.walls || []).reduce((sum, wall) => sum + countOutOfBoundsItems(wall), 0);
      const powerMedia = itemContexts.filter(context => context.item.type === "screen" || context.item.illuminated).length;
      const hanging = itemContexts.filter(context => context.item.hanging).length;
      const noted = itemContexts.filter(context => cleanProjectText(context.item.notes)).length;

      drawText(projectTitle(), leftX, 86, { align: "left", baseline: "middle", color: "#1d1c19", size: 44, weight: 800, halo: null, maxWidth: 2700, noExportBoost: true });
      drawText("Installation package", leftX, 154, { align: "left", baseline: "middle", color: "#1d1c19", size: 31, weight: 700, halo: null, noExportBoost: true });
      drawText(projectRevisionLabel(), a3.width - a3.margin, 86, { align: "right", baseline: "middle", color: "#5d5a52", size: 19, weight: 700, halo: null, noExportBoost: true });
      drawText(projectPreparedLine(), a3.width - a3.margin, 126, { align: "right", baseline: "middle", color: "#7c766d", size: 17, weight: 600, halo: null, maxWidth: 1250, noExportBoost: true });
      drawLine(a3.margin, 230, a3.width - a3.margin, 230, "#d8d2c6");

      let y = 330;
      drawText("Project metadata", leftX, y, { align: "left", color: "#1d1c19", size: 26, weight: 800, halo: null, noExportBoost: true });
      y += 56;
      projectRows.forEach(([label, value]) => {
        drawText(label, leftX, y, { align: "left", color: "#7c766d", size: 17, weight: 700, halo: null, noExportBoost: true });
        drawText(value, leftX + 360, y, { align: "left", color: "#2c2a25", size: 19, weight: 700, halo: null, maxWidth: colW - 360, noExportBoost: true });
        y += 46;
      });
      y += 54;
      drawText("Package contents", leftX, y, { align: "left", color: "#1d1c19", size: 26, weight: 800, halo: null, noExportBoost: true });
      y += 54;
      [
        `Cover sheet / ${wallCount} wall${wallCount === 1 ? "" : "s"} / ${objectCount} wall object${objectCount === 1 ? "" : "s"}`,
        `Room plan / ${roomItemCount} room item${roomItemCount === 1 ? "" : "s"}`,
        `${wallSides} wall installation sheet${wallSides === 1 ? "" : "s"}`,
        `Object label sheets for print and wall staging`
      ].forEach(line => {
        drawText(line, leftX, y, { align: "left", color: "#2c2a25", size: 19, weight: 650, halo: null, maxWidth: colW, noExportBoost: true });
        y += 42;
      });

      let rightY = 330;
      drawText("Technician checks", rightX, rightY, { align: "left", color: "#1d1c19", size: 26, weight: 800, halo: null, noExportBoost: true });
      rightY += 56;
      [
        "Confirm wall dimensions and floor datum on site.",
        "Use written millimeter dimensions over print scaling.",
        "Match object IDs to wall sheets before fixing.",
        "Confirm power, media, load, and hanging requirements.",
        "Record revision/date on any marked-up print."
      ].forEach(line => {
        drawText(line, rightX, rightY, { align: "left", color: "#2c2a25", size: 19, weight: 650, halo: null, maxWidth: colW, noExportBoost: true });
        rightY += 42;
      });
      rightY += 56;
      drawText("Production flags", rightX, rightY, { align: "left", color: "#1d1c19", size: 26, weight: 800, halo: null, noExportBoost: true });
      rightY += 54;
      [
        `${hanging} hanging item${hanging === 1 ? "" : "s"}`,
        `${powerMedia} screen, media, or illuminated item${powerMedia === 1 ? "" : "s"}`,
        `${noted} item${noted === 1 ? "" : "s"} with install notes`,
        overlapCount ? `${overlapCount} object overlap${overlapCount === 1 ? "" : "s"} to review` : "No object overlaps detected",
        outOfBoundsCount ? `${outOfBoundsCount} item${outOfBoundsCount === 1 ? "" : "s"} outside wall bounds` : "No objects outside wall bounds"
      ].forEach(line => {
        drawText(line, rightX, rightY, { align: "left", color: "#2c2a25", size: 19, weight: 650, halo: null, maxWidth: colW, noExportBoost: true });
        rightY += 42;
      });

      const notes = cleanProjectText(state.project.notes);
      const notesY = Math.max(y + 90, rightY + 120);
      drawText("Production notes", leftX, notesY, { align: "left", color: "#1d1c19", size: 26, weight: 800, halo: null, noExportBoost: true });
      drawWrappedText(notes || "No project-wide production notes entered.", leftX, notesY + 58, contentW, {
        color: "#2c2a25",
        size: 19,
        weight: 600,
        lineHeight: 34,
        halo: null,
        noExportBoost: true
      });
      drawA3Footer(a3, "Installation package");
      restoreCanvasContext(previousCanvas, previousCtx);
      return exportCanvas;
    }

    function drawObjectLabelCard(context, x, y, width, height) {
      const item = context.item;
      activeCtx.fillStyle = "#fffdf8";
      activeCtx.fillRect(x, y, width, height);
      activeCtx.strokeStyle = "#d8d2c6";
      activeCtx.lineWidth = 2;
      activeCtx.strokeRect(x, y, width, height);
      drawText(context.code, x + 28, y + 46, { align: "left", color: "#1d1c19", size: 28, weight: 850, halo: null, noExportBoost: true });
      drawText(item.name, x + 28, y + 94, { align: "left", color: "#1d1c19", size: 24, weight: 800, halo: null, maxWidth: width - 56, noExportBoost: true });
      drawText(`${context.wallRecord.name} / ${itemSideLabel(item)} face`, x + 28, y + 142, { align: "left", color: "#5d5a52", size: 17, weight: 700, halo: null, maxWidth: width - 56, noExportBoost: true });
      drawText(`${itemTypePrintLabel(item.type)} / ${itemSizeLabel(item)}`, x + 28, y + 184, { align: "left", color: "#2c2a25", size: 17, weight: 650, halo: null, maxWidth: width - 56, noExportBoost: true });
      drawText(itemPositionLabel(item), x + 28, y + 226, { align: "left", color: "#2c2a25", size: 16, weight: 650, halo: null, maxWidth: width - 56, noExportBoost: true });
      const notes = [item.hanging ? "Hanging from top" : "", item.illuminated ? "Power/illumination" : "", exportNotesLabel(item)].filter(Boolean).join(" / ");
      if (notes) {
        drawText(notes, x + 28, y + height - 42, { align: "left", color: "#5d5a52", size: 15, weight: 650, halo: null, maxWidth: width - 56, noExportBoost: true });
      }
    }

    function createLabelSheetCanvases() {
      const contexts = allWallItemContexts();
      const perPage = 12;
      const pages = Math.max(1, Math.ceil(contexts.length / perPage));
      const canvases = [];
      for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
        const { a3, exportCanvas, previousCanvas, previousCtx } = createBlankA3Canvas();
        const contentW = a3.width - a3.margin * 2;
        const headerY = 88;
        drawText(projectTitle(), a3.margin, headerY, { align: "left", color: "#1d1c19", size: 36, weight: 800, halo: null, maxWidth: 2600, noExportBoost: true });
        drawText(`Object labels / page ${pageIndex + 1} of ${pages}`, a3.margin, 148, { align: "left", color: "#1d1c19", size: 27, weight: 700, halo: null, noExportBoost: true });
        drawText(projectRevisionLabel(), a3.width - a3.margin, headerY, { align: "right", color: "#5d5a52", size: 18, weight: 700, halo: null, noExportBoost: true });
        drawText("Cut labels only after matching IDs to wall sheets.", a3.width - a3.margin, 148, { align: "right", color: "#7c766d", size: 16, weight: 600, halo: null, maxWidth: 1500, noExportBoost: true });
        drawLine(a3.margin, 218, a3.width - a3.margin, 218, "#d8d2c6");
        const cols = 3;
        const rows = 4;
        const gap = 34;
        const cardW = Math.floor((contentW - gap * (cols - 1)) / cols);
        const cardH = Math.floor((a3.height - 520 - gap * (rows - 1)) / rows);
        const startY = 300;
        const pageContexts = contexts.slice(pageIndex * perPage, pageIndex * perPage + perPage);
        if (!pageContexts.length) {
          drawText("No wall objects to label yet.", a3.margin, startY + 80, { align: "left", color: "#5d5a52", size: 24, weight: 700, halo: null, noExportBoost: true });
        }
        pageContexts.forEach((context, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = a3.margin + col * (cardW + gap);
          const y = startY + row * (cardH + gap);
          drawObjectLabelCard(context, x, y, cardW, cardH);
        });
        drawA3Footer(a3, "Object labels");
        restoreCanvasContext(previousCanvas, previousCtx);
        canvases.push(exportCanvas);
      }
      return canvases;
    }

    function exportLabelsPdf() {
      syncActiveWallRecord();
      const canvases = createLabelSheetCanvases();
      download(`${slug(state.project.title)}-object-labels.pdf`, makePdfFromCanvases(canvases), "application/pdf");
    }

    function exportInstallationPackagePdf() {
      syncActiveWallRecord();
      const previous = captureWallExportState();
      const canvases = [createPackageCoverCanvas()];
      const jobs = (state.walls || []).flatMap(wall => printableWallSides(wall).map(side => ({ wall, side })));
      try {
        canvases.push(createA3Canvas("space2d"));
        jobs.forEach(({ wall, side }) => {
          state.activeWallId = wall.id;
          loadActiveWall();
          state.activeSide = normalizeWallSide(side);
          if (els.wallSide) els.wallSide.value = state.activeSide;
          syncInputsFromWall();
          canvases.push(createA3Canvas("elevation"));
        });
        canvases.push(...createLabelSheetCanvases());
      } finally {
        restoreWallExportState(previous);
      }
      download(`${slug(state.project.title)}-installation-package.pdf`, makePdfFromCanvases(canvases), "application/pdf");
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
      const meta = state.view === "space3d" || state.view === "space2d"
        ? `${state.walls.length} wall${state.walls.length === 1 ? "" : "s"}`
        : activeWallRecord().name;

      drawText(projectTitle(), page.margin, 78, { align: "left", baseline: "middle", color: "#1d1c19", size: 36, weight: 800, halo: null, maxWidth: 1900, noExportBoost: true });
      drawText(title, page.margin, 130, { align: "left", baseline: "middle", color: "#1d1c19", size: 27, weight: 700, halo: null, noExportBoost: true });
      drawText(meta, page.margin, 174, { align: "left", baseline: "middle", color: "#5d5a52", size: 18, weight: 600, halo: null, noExportBoost: true });
      drawText(projectRevisionLabel(), page.width - page.margin, 84, { align: "right", baseline: "middle", color: "#7c766d", size: 17, weight: 650, halo: null, noExportBoost: true });
      drawText(projectPreparedLine(), page.width - page.margin, 126, { align: "right", baseline: "middle", color: "#7c766d", size: 17, weight: 600, halo: null, maxWidth: 1240, noExportBoost: true });
      drawLine(page.margin, 198, page.width - page.margin, 198, "#d8d2c6");

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

      ctx.fillStyle = "#f5f2ea";
      ctx.fillRect(drawX - 16, drawY - 16, drawW + 32, drawH + 32);
      ctx.strokeStyle = "#d8d2c6";
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
