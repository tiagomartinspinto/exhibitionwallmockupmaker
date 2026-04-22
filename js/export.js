        setSelection([]);
        state.drag = null;
        state.panDrag = null;
        state.rotateDrag = null;
        state.resizeDrag = null;
        state.snapLines = [];
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

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
      const hasTextColumn = state.items.some(rawItem => normalizeItem(rawItem).text);
      const columns = [
        { label: "ID", width: 110 },
        { label: "Name", width: 500 },
        { label: "Type", width: 500 },
        { label: "Size", width: 300 },
        { label: "Position", width: hasTextColumn ? 720 : width - 1410 }
      ];
      if (hasTextColumn) columns.push({ label: "Text to add", width: width - 2130 });
      let colX = x;
      drawText("List of objects", x, y - 44, { align: "left", color: "#161616", size: 29, halo: null });
      activeCtx.fillStyle = "#edf2ec";
      activeCtx.fillRect(x, y, width, rowH);
      columns.forEach(column => {
        drawText(column.label, colX + 12, y + rowH / 2, { align: "left", color: "#161616", size: 18, halo: null });
        colX += column.width;
      });
      state.items.slice(0, 12).forEach((rawItem, index) => {
        const item = normalizeItem(rawItem);
        const rowY = y + rowH * (index + 1);
        activeCtx.fillStyle = index % 2 ? "#ffffff" : "#f8faf6";
        activeCtx.fillRect(x, rowY, width, rowH);
        activeCtx.strokeStyle = "#d6ddd4";
        activeCtx.strokeRect(x, rowY, width, rowH);
        const values = [
          itemCode(item),
          item.name,
          itemTypePrintLabel(item.type),
          itemSizeLabel(item),
          itemPositionLabel(item)
        ];
        if (hasTextColumn) values.push(exportTextLabel(item));
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
      state.walls.slice(0, 12).forEach((wallRecord, index) => {
        const wall = wallRecord.wall;
        const placement = wallRecord.placement || {};
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
          `${wallRecord.items.length} objects`
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
    }

    function drawObjectListSidebar(x, y, width, height) {
      const items = state.items.slice(0, 12).map(normalizeItem);
      drawText("List of objects", x, y - 28, { align: "left", color: "#161616", size: 30, halo: null });
      let cardY = y;
      items.forEach((item, index) => {
        const detailText = exportTextLabel(item);
        const cardH = detailText ? 148 : 118;
        if (cardY + cardH > y + height) return;
        activeCtx.fillStyle = index % 2 ? "#ffffff" : "#f8faf6";
        activeCtx.fillRect(x, cardY, width, cardH);
        activeCtx.strokeStyle = "#d6ddd4";
        activeCtx.strokeRect(x, cardY, width, cardH);
        drawText(`${itemCode(item)}  ${item.name}`, x + 14, cardY + 24, { align: "left", color: "#161616", size: 21, weight: 700, halo: null, maxWidth: width - 28 });
        drawText(itemTypePrintLabel(item.type), x + 14, cardY + 56, { align: "left", color: "#4b5750", size: 17, weight: 600, halo: null, maxWidth: width - 28 });
        drawText(itemSizeLabel(item), x + 14, cardY + 84, { align: "left", color: "#26312b", size: 17, weight: 600, halo: null, maxWidth: width - 28 });
        drawText(itemPositionLabel(item), x + 14, cardY + 112, { align: "left", color: "#26312b", size: 16, weight: 600, halo: null, maxWidth: width - 28 });
        if (detailText) {
          drawText(detailText, x + 14, cardY + 138, { align: "left", color: "#26312b", size: 16, weight: 600, halo: null, maxWidth: width - 28 });
        }
        cardY += cardH + 10;
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
      const versionX = a3.margin + textWidth(brandTitle, 42, 700) + 28;
      drawText(brandTitle, a3.margin, 78, { align: "left", baseline: "middle", color: "#161616", size: 42, halo: null, noExportBoost: true });
      drawText("V1.0", versionX, 80, { align: "left", baseline: "middle", color: "#7c8580", size: 17, weight: 700, halo: null, noExportBoost: true });
      drawText(`by @tiagomartinspinto | ${title}`, a3.margin, 134, { align: "left", baseline: "middle", color: "#5d655f", size: 27, weight: 600, halo: null, noExportBoost: true });
      drawText(state.project.title || "Untitled exhibition", a3.margin, 184, { align: "left", baseline: "middle", color: "#5d655f", size: 24, weight: 600, halo: null, noExportBoost: true });
      const exportMeta = exportView === "space2d"
        ? `Space ${state.space.width} x ${state.space.depth} mm | ${state.walls.length} walls | Print on A3 for scale/readability`
        : `${activeWallRecord().name} | ${state.wall.width} x ${state.wall.height} mm | depth ${state.wall.depth} mm | Print on A3 for scale/readability`;
      drawText(exportMeta, a3.margin, 228, { align: "left", baseline: "middle", color: "#5d655f", size: 23, weight: 600, halo: null, noExportBoost: true });
      drawLine(a3.margin, 242, a3.width - a3.margin, 242, "#c8cfc8");

      const wallRatio = state.wall.width / Math.max(1, state.wall.height);
      const sideList = exportView === "elevation" && (wallRatio < 1.78 || state.items.length > 8);
      const contentX = a3.margin;
      const drawingY = a3.header + a3.margin / 2;
      const contentW = a3.width - a3.margin * 2;
      const sidebarGap = sideList ? 52 : 70;
      const sidebarW = sideList ? Math.min(1120, Math.floor(contentW * 0.24)) : 0;
      const scheduleH = sideList ? 0 : 560;
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
        drawWallSchedule(drawingX, drawingY + drawingH + 110, drawingW);
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

    function makePdfFromCanvas(canvas) {
      const imageBytes = base64Bytes(canvas.toDataURL("image/jpeg", 0.94).split(",")[1]);
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

      append("%PDF-1.4\n");
      object(1, "<< /Type /Catalog /Pages 2 0 R >>");
      object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
      object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
      offsets[4] = length;
      append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);
      append(imageBytes);
      append("\nendstream\nendobj\n");
      const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
      object(5, `<< /Length ${content.length} >>\nstream\n${content}endstream`);

      const xrefAt = length;
      append(`xref\n0 6\n0000000000 65535 f \n`);
      for (let id = 1; id <= 5; id += 1) {
        append(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
      }
      append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`);

      const output = new Uint8Array(length);
      let offset = 0;
      chunks.forEach(chunk => {
        output.set(chunk, offset);
        offset += chunk.length;
      });
      return output;
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
      drawText("V1.0", page.margin + textWidth("Exhibition Wall Mockup Maker", 38, 700) + 26, 84, { align: "left", baseline: "middle", color: "#7c8580", size: 16, weight: 700, halo: null, noExportBoost: true });
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

