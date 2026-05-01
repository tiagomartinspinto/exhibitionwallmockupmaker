    function resizeCanvas() {
      const rect = els.canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      els.canvas.width = Math.max(700, Math.floor(rect.width * ratio));
      els.canvas.height = Math.max(520, Math.floor(rect.height * ratio));
      activeCanvas = els.canvas;
      activeCtx = screenCtx;
      activeCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
      render();
    }

    function clear() {
      const ratio = activeCanvas === els.canvas ? (window.devicePixelRatio || 1) : 1;
      const width = activeCanvas.width / ratio;
      const height = activeCanvas.height / ratio;
      activeCtx.clearRect(0, 0, width, height);
      return { width, height };
    }

    function elevationGeometry(width, height, options = {}) {
      const exportMode = activeCanvas !== els.canvas;
      const rulerSize = exportMode ? 0 : 28;
      const pad = options.pad ?? (exportMode ? 40 : 78);
      const leftPad = options.leftPad ?? (exportMode ? 260 : pad + rulerSize);
      const rightPad = options.rightPad ?? pad;
      const topPad = options.topPad ?? (pad + rulerSize);
      const bottomPad = options.bottomPad ?? (exportMode ? 180 : pad);
      const zoom = options.fit ? 1 : state.view2d.zoom;
      const innerW = width - leftPad - rightPad;
      const innerH = height - topPad - bottomPad;
      const scale = Math.min(innerW / state.wall.width, innerH / state.wall.height) * zoom;
      const wallW = state.wall.width * scale;
      const wallH = state.wall.height * scale;
      const panX = options.fit ? 0 : number(state.view2d.panX, 0);
      const panY = options.fit ? 0 : number(state.view2d.panY, 0);
      return {
        scale,
        x: leftPad + (innerW - wallW) / 2 + panX,
        y: topPad + (innerH - wallH) / 2 + panY,
        w: wallW,
        h: wallH
      };
    }

    function screenToWallX(geom, screenX) {
      return (screenX - geom.x) / geom.scale;
    }

    function screenToWallY(geom, screenY) {
      return (geom.y + geom.h - screenY) / geom.scale;
    }

    function mmX(geom, value) {
      return geom.x + value * geom.scale;
    }

    function mmY(geom, value) {
      return geom.y + geom.h - value * geom.scale;
    }

    function drawLine(x1, y1, x2, y2, color = "#333", dash = []) {
      activeCtx.save();
      activeCtx.strokeStyle = color;
      activeCtx.lineWidth = 1;
      activeCtx.setLineDash(dash);
      activeCtx.beginPath();
      activeCtx.moveTo(x1, y1);
      activeCtx.lineTo(x2, y2);
      activeCtx.stroke();
      activeCtx.restore();
    }

    function drawArrowHead(x, y, angle, color = "#333", size = 5) {
      activeCtx.save();
      activeCtx.fillStyle = color;
      activeCtx.beginPath();
      activeCtx.moveTo(x, y);
      activeCtx.lineTo(x - Math.cos(angle - Math.PI / 7) * size, y - Math.sin(angle - Math.PI / 7) * size);
      activeCtx.lineTo(x - Math.cos(angle + Math.PI / 7) * size, y - Math.sin(angle + Math.PI / 7) * size);
      activeCtx.closePath();
      activeCtx.fill();
      activeCtx.restore();
    }

    function drawArrowDimension(x1, y1, x2, y2, color = "#333", dash = []) {
      drawLine(x1, y1, x2, y2, color, dash);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      drawArrowHead(x1, y1, angle + Math.PI, color);
      drawArrowHead(x2, y2, angle, color);
    }

    function drawText(text, x, y, options = {}) {
      activeCtx.save();
      let value = String(text);
      activeCtx.fillStyle = options.color || "#1d1d1d";
      const boost = activeCanvas !== els.canvas && options.noExportBoost !== true ? 5 : 0;
      activeCtx.font = `${options.weight || 700} ${(options.size || 12) + boost}px Inter, system-ui, sans-serif`;
      activeCtx.textAlign = options.align || "center";
      activeCtx.textBaseline = options.baseline || "middle";
      activeCtx.lineJoin = "round";
      if (options.maxWidth) {
        const original = value;
        let limit = original.length;
        while (limit > 4 && activeCtx.measureText(value).width > options.maxWidth) {
          limit -= 1;
          value = `${original.slice(0, limit).trim()}...`;
        }
      }
      if (options.rotate) {
        activeCtx.translate(x, y);
        activeCtx.rotate(options.rotate);
        if (options.halo) {
          activeCtx.strokeStyle = options.halo;
          activeCtx.lineWidth = options.haloWidth || 2;
          activeCtx.strokeText(value, 0, 0);
        }
        activeCtx.fillText(value, 0, 0);
      } else {
        if (options.halo) {
          activeCtx.strokeStyle = options.halo;
          activeCtx.lineWidth = options.haloWidth || 2;
          activeCtx.strokeText(value, x, y);
        }
        activeCtx.fillText(value, x, y);
      }
      activeCtx.restore();
    }

    function drawDimension(x1, y1, x2, y2, label, offset = 18, vertical = false, color = "#4b5750") {
      if (vertical) {
        drawArrowDimension(x1, y1, x2, y2, color);
        drawLine(x1 - 5, y1, x1 + 5, y1, color);
        drawLine(x2 - 5, y2, x2 + 5, y2, color);
        drawText(label, x1 - offset, (y1 + y2) / 2, { rotate: -Math.PI / 2, color, halo: contrastHalo(color) });
      } else {
        drawArrowDimension(x1, y1, x2, y2, color);
        drawLine(x1, y1 - 5, x1, y1 + 5, color);
        drawLine(x2, y2 - 5, x2, y2 + 5, color);
        drawText(label, (x1 + x2) / 2, y1 - offset, { color, halo: contrastHalo(color) });
      }
    }

    function textWidth(text, size = 12, weight = 700) {
      activeCtx.save();
      activeCtx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
      const width = activeCtx.measureText(String(text)).width;
      activeCtx.restore();
      return width;
    }

    function clampPoint(point, width, height, margin = 18) {
      return {
        x: clamp(point.x, margin, width - margin),
        y: clamp(point.y, margin, height - margin)
      };
    }

    function drawLeaderLabel(lines, anchor, labelPoint, options = {}) {
      const color = options.color || "#1d1d1d";
      const halo = options.halo || contrastHalo(color);
      const size = options.size || 11;
      const gap = size + 4;
      drawLine(anchor.x, anchor.y, labelPoint.x, labelPoint.y, color, [3, 3]);
      lines.forEach((line, index) => {
        drawText(line, labelPoint.x, labelPoint.y + index * gap, {
          color,
          halo,
          size,
          weight: index === 0 ? 700 : 600,
          maxWidth: options.maxWidth || 150
        });
      });
    }

    function drawObjectLabel(item, box, canvasSize, options = {}) {
      const textColor = contrastText(item.color);
      const isCircle = item.shape === "circle";
      const sizeLine = itemSizeLabel(item);
      const nameLine = options.label || item.name;
      const minWidth = Math.max(textWidth(nameLine, 11), textWidth(sizeLine, 10)) + 14;
      const minHeight = 34;
      const anchor = options.anchor || { x: box.x + box.w / 2, y: box.y + box.h / 2 };
      const cramped = box.w < minWidth || box.h < minHeight || box.x < 8 || box.y < 8 || box.x + box.w > canvasSize.width - 8 || box.y + box.h > canvasSize.height - 8;

      if (!cramped) {
        drawText(nameLine, anchor.x, anchor.y - 8, { color: textColor, size: options.selected ? 13 : 11, weight: options.selected ? 700 : 600, halo: contrastHalo(textColor), maxWidth: Math.max(42, box.w - 10) });
        drawText(sizeLine, anchor.x, anchor.y + 9, { color: textColor, size: 10, weight: 600, halo: contrastHalo(textColor), maxWidth: Math.max(42, box.w - 10) });
        return false;
      }

      const preferRight = box.x + box.w / 2 < canvasSize.width * 0.62;
      const labelPoint = clampPoint({
        x: preferRight ? box.x + box.w + 82 : box.x - 82,
        y: box.y + box.h / 2 - 16
      }, canvasSize.width, canvasSize.height, 42);
      drawLeaderLabel([nameLine, sizeLine], anchor, labelPoint, {
        color: options.calloutColor || "#26362f",
        halo: contrastHalo(options.calloutColor || "#26362f"),
        size: 10,
        maxWidth: 150
      });
      return true;
    }

    function guideColor(strong = false) {
      if (strong) return contrastText(state.wall.color);
      return isDark(state.wall.color) ? "rgba(255,255,255,0.58)" : "rgba(22,22,22,0.46)";
    }

    function rulerStep(scale) {
      const targetPx = 72;
      const steps = [10, 20, 50, 100, 200, 500, 1000, 2000];
      return steps.find(step => step * scale >= targetPx) || 5000;
    }

    function currentGuides() {
      return normalizeGuides(state.guides || defaultGuides());
    }

    function drawGuides(geom, width, height) {
      const guides = currentGuides();
      if (guides.visible === false) return;
      activeCtx.save();
      activeCtx.strokeStyle = "rgba(146,208,255,0.56)";
      activeCtx.lineWidth = 1;
      activeCtx.setLineDash([5, 5]);
      guides.vertical.forEach(value => {
        const x = mmX(geom, value);
        activeCtx.beginPath();
        activeCtx.moveTo(x, 0);
        activeCtx.lineTo(x, height);
        activeCtx.stroke();
      });
      activeCtx.strokeStyle = "rgba(255,206,143,0.56)";
      guides.horizontal.forEach(value => {
        const y = mmY(geom, value);
        activeCtx.beginPath();
        activeCtx.moveTo(0, y);
        activeCtx.lineTo(width, y);
        activeCtx.stroke();
      });
      if (state.guideDrag) {
        if (state.guideDrag.axis === "x") {
          activeCtx.strokeStyle = "rgba(146,208,255,0.9)";
          const x = mmX(geom, state.guideDrag.value);
          activeCtx.beginPath();
          activeCtx.moveTo(x, 0);
          activeCtx.lineTo(x, height);
          activeCtx.stroke();
        } else {
          activeCtx.strokeStyle = "rgba(255,206,143,0.9)";
          const y = mmY(geom, state.guideDrag.value);
          activeCtx.beginPath();
          activeCtx.moveTo(0, y);
          activeCtx.lineTo(width, y);
          activeCtx.stroke();
        }
      }
      activeCtx.restore();
    }

    function drawRulers(geom, width, height) {
      if (activeCanvas !== els.canvas) return;
      const rulerSize = 28;
      const step = rulerStep(geom.scale);
      const minor = step / 2;
      const band = isDark(sceneSurroundColor()) ? "#111215" : "#eff1f4";
      const border = isDark(sceneSurroundColor()) ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";
      const ink = isDark(sceneSurroundColor()) ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)";
      const accentX = "rgba(146,208,255,0.9)";
      const accentY = "rgba(255,206,143,0.9)";
      activeCtx.save();
      activeCtx.fillStyle = band;
      activeCtx.fillRect(0, 0, width, rulerSize);
      activeCtx.fillRect(0, 0, rulerSize, height);
      activeCtx.strokeStyle = border;
      activeCtx.beginPath();
      activeCtx.moveTo(rulerSize, 0);
      activeCtx.lineTo(rulerSize, height);
      activeCtx.moveTo(0, rulerSize);
      activeCtx.lineTo(width, rulerSize);
      activeCtx.stroke();

      const startX = Math.floor(screenToWallX(geom, rulerSize) / minor) * minor;
      const endX = Math.ceil(screenToWallX(geom, width) / minor) * minor;
      for (let value = startX; value <= endX; value += minor) {
        const x = mmX(geom, value);
        const major = value % step === 0;
        const tick = major ? 12 : 7;
        activeCtx.strokeStyle = major ? ink : border;
        activeCtx.beginPath();
        activeCtx.moveTo(x, rulerSize);
        activeCtx.lineTo(x, rulerSize - tick);
        activeCtx.stroke();
        if (major) {
          drawText(`${Math.round(value)}`, x, 11, { color: ink, size: 9, weight: 600 });
        }
      }

      const startY = Math.floor(screenToWallY(geom, height) / minor) * minor;
      const endY = Math.ceil(screenToWallY(geom, rulerSize) / minor) * minor;
      for (let value = startY; value <= endY; value += minor) {
        const y = mmY(geom, value);
        const major = value % step === 0;
        const tick = major ? 12 : 7;
        activeCtx.strokeStyle = major ? ink : border;
        activeCtx.beginPath();
        activeCtx.moveTo(rulerSize, y);
        activeCtx.lineTo(rulerSize - tick, y);
        activeCtx.stroke();
        if (major) {
          drawText(`${Math.round(value)}`, 11, y, { color: ink, size: 9, weight: 600, rotate: -Math.PI / 2 });
        }
      }

      const guides = currentGuides();
      if (guides.visible !== false) {
        guides.vertical.forEach(value => {
          const x = mmX(geom, value);
          drawLine(x, 0, x, rulerSize, accentX);
        });
        guides.horizontal.forEach(value => {
          const y = mmY(geom, value);
          drawLine(0, y, rulerSize, y, accentY);
        });
      }
      activeCtx.restore();
    }

    function guideAxisColors(strong = false) {
      if (activeCanvas !== els.canvas) {
        return strong
          ? { x: "#215f8b", y: "#8b5a21" }
          : { x: "#4e86ad", y: "#a97a43" };
      }
      if (isDark(state.wall.color)) {
        return strong
          ? { x: "rgba(142,208,255,0.94)", y: "rgba(255,206,143,0.94)" }
          : { x: "rgba(142,208,255,0.72)", y: "rgba(255,206,143,0.72)" };
      }
      return strong
        ? { x: "#2f78a8", y: "#9a6531" }
        : { x: "rgba(47,120,168,0.72)", y: "rgba(154,101,49,0.72)" };
    }

    function screenBoxForItem(geom, rawItem) {
      const item = normalizeItem(rawItem);
      const x = mmX(geom, item.x);
      const y = mmY(geom, item.y + item.height);
      return { item, x, y, w: item.width * geom.scale, h: item.height * geom.scale };
    }

    function pointInBox(point, box, pad = 8) {
      return point.x >= box.x - pad && point.x <= box.x + box.w + pad && point.y >= box.y - pad && point.y <= box.y + box.h + pad;
    }

    function labelHitsBoxes(point, boxes, vertical = false) {
      const labelBox = vertical
        ? { x: point.x - 9, y: point.y - 48, w: 18, h: 96 }
        : { x: point.x - 58, y: point.y - 10, w: 116, h: 20 };
      return boxes.some(box => (
        labelBox.x < box.x + box.w + 6 &&
        labelBox.x + labelBox.w > box.x - 6 &&
        labelBox.y < box.y + box.h + 6 &&
        labelBox.y + labelBox.h > box.y - 6
      ));
    }

    function estimatedLabelBox(point, text, options = {}) {
      const size = options.size || 10;
      const weight = options.weight || 600;
      const paddingX = options.paddingX || 10;
      const paddingY = options.paddingY || 6;
      if (options.vertical) {
        const width = size + paddingX * 1.2;
        const height = Math.min(options.maxHeight || 220, textWidth(text, size, weight) + paddingY * 2);
        return { x: point.x - width / 2, y: point.y - height / 2, w: width, h: height };
      }
      const width = Math.min(options.maxWidth || 240, textWidth(text, size, weight) + paddingX * 2);
      const height = size + paddingY * 2;
      return { x: point.x - width / 2, y: point.y - height / 2, w: width, h: height };
    }

    function boxesOverlap(a, b, pad = 8) {
      return !(
        a.x + a.w + pad < b.x ||
        a.x > b.x + b.w + pad ||
        a.y + a.h + pad < b.y ||
        a.y > b.y + b.h + pad
      );
    }

    function labelCollides(box, itemBoxes = [], placedLabels = []) {
      if (itemBoxes.some(itemBox => boxesOverlap(box, itemBox, 10))) return true;
      return placedLabels.some(existing => boxesOverlap(box, existing, 10));
    }

    function reserveLabelBox(point, text, placedLabels, options = {}) {
      const box = estimatedLabelBox(point, text, options);
      placedLabels.push(box);
      return box;
    }

    function drawPositionGuides(geom, item, box, options = {}) {
      const axisColors = guideAxisColors(options.strong);
      const xColor = axisColors.x;
      const yColor = axisColors.y;
      const xHalo = activeCanvas !== els.canvas ? "rgba(255,255,255,0.88)" : contrastHalo(xColor);
      const yHalo = activeCanvas !== els.canvas ? "rgba(255,255,255,0.88)" : contrastHalo(yColor);
      const boxes = options.boxes || [];
      const placedLabels = options.placedLabels || [];
      const exportMode = activeCanvas !== els.canvas;
      const isCircle = item.shape === "circle";
      const guideX = isCircle ? box.x + box.w / 2 : box.x;
      const guideY = isCircle ? box.y + box.h / 2 : box.y + box.h;
      const measureX = isCircle ? item.x + item.width / 2 : item.x;
      const measureY = isCircle ? item.y + item.height / 2 : item.y;
      const xLabel = isCircle ? `CL from left ${Math.round(measureX)} mm` : `left edge ${Math.round(measureX)} mm`;
      const yLabel = isCircle ? `CL from floor ${Math.round(measureY)} mm` : `bottom ${Math.round(measureY)} mm`;
      const floorY = geom.y + geom.h;
      const wallLeftX = geom.x;

      drawArrowDimension(wallLeftX, guideY, guideX, guideY, xColor, [4, 4]);
      drawArrowDimension(guideX, floorY, guideX, guideY, yColor, [4, 4]);

      const xSize = exportMode ? 13 : options.strong ? 11 : 10;
      const ySize = exportMode ? 13 : options.strong ? 11 : 10;
      const xCandidates = [];
      const xGuideMid = (wallLeftX + guideX) / 2;
      const xGutterColumns = exportMode
        ? [wallLeftX - 120, wallLeftX - 210, wallLeftX - 300, wallLeftX - 390]
        : [wallLeftX + 84, Math.max(wallLeftX + 96, guideX - 92)];
      const xOffsets = exportMode ? [-22, 0, 22, 44, -44, 66, -66] : [-12, 16, 36];
      xGutterColumns.forEach(column => {
        xOffsets.forEach(offset => {
          xCandidates.push({ x: column, y: guideY + offset });
        });
      });
      [-16, 18, 42, -40].forEach(offset => {
        xCandidates.push({ x: xGuideMid, y: guideY + offset });
      });

      const yCandidates = [];
      const yMid = (floorY + guideY) / 2;
      const yColumns = exportMode
        ? [guideX + 34, guideX + 70, guideX - 34, guideX - 70, wallLeftX - 36, wallLeftX - 78]
        : [guideX + 24, guideX - 24, guideX + 44, guideX - 44];
      const yOffsets = exportMode ? [0, -48, 48, -88, 88] : [0, -38, 38];
      yColumns.forEach(column => {
        yOffsets.forEach(offset => {
          yCandidates.push({
            x: column,
            y: clamp(yMid + offset, geom.y + 88, floorY - 88)
          });
        });
      });

      const pickCandidate = (candidates, label, config = {}) => {
        let best = null;
        candidates.forEach((candidate, index) => {
          const labelBox = estimatedLabelBox(candidate, label, config);
          const collision = labelCollides(labelBox, boxes.map(entry => ({ x: entry.x, y: entry.y, w: entry.w, h: entry.h })), placedLabels);
          const outsideBonus = candidate.x < geom.x - 4 || candidate.x > geom.x + geom.w + 4 ? -0.8 : 0;
          const score = (collision ? 1000 : 0) + index + outsideBonus;
          if (!best || score < best.score) best = { candidate, labelBox, score };
        });
        return best;
      };

      const xPick = pickCandidate(xCandidates, xLabel, { size: xSize, weight: 600 });
      const yPick = pickCandidate(yCandidates, yLabel, { size: ySize, weight: 600, vertical: true });
      const xPoint = xPick.candidate;
      const yPoint = yPick.candidate;
      reserveLabelBox(xPoint, xLabel, placedLabels, { size: xSize, weight: 600 });
      reserveLabelBox(yPoint, yLabel, placedLabels, { size: ySize, weight: 600, vertical: true });

      drawText(xLabel, xPoint.x, xPoint.y, {
        color: xColor,
        size: xSize,
        weight: 600,
        halo: xHalo,
        maxWidth: exportMode ? 220 : 150
      });
      drawText(yLabel, yPoint.x, yPoint.y, {
        rotate: -Math.PI / 2,
        color: yColor,
        size: ySize,
        weight: 600,
        halo: yHalo,
        maxWidth: exportMode ? 220 : 150
      });
    }

    function distributeValues(values, minGap, minValue, maxValue) {
      if (!values.length) return [];
      const placed = values.slice().sort((a, b) => a - b);
      for (let index = 1; index < placed.length; index += 1) {
        placed[index] = Math.max(placed[index], placed[index - 1] + minGap);
      }
      const overflow = placed[placed.length - 1] - maxValue;
      if (overflow > 0) {
        for (let index = placed.length - 1; index >= 0; index -= 1) {
          placed[index] -= overflow;
        }
      }
      if (placed[0] < minValue) {
        const underflow = minValue - placed[0];
        for (let index = 0; index < placed.length; index += 1) {
          placed[index] += underflow;
        }
      }
      for (let index = placed.length - 2; index >= 0; index -= 1) {
        placed[index] = Math.min(placed[index], placed[index + 1] - minGap);
      }
      return placed.map(value => clamp(value, minValue, maxValue));
    }

    function drawExportPositionGuides(geom, itemBoxes, options = {}) {
      const xPalette = ["#2f78a8", "#4b95c5", "#5f88b8", "#3b6fa3", "#6ca6cf", "#537fae"];
      const yPalette = ["#9a6531", "#bb7a3a", "#a96d45", "#8f5d2d", "#c88d52", "#b07239"];
      const floorY = geom.y + geom.h;
      const wallLeftX = geom.x;
      const itemRects = itemBoxes.map(box => ({ x: box.x, y: box.y, w: box.w, h: box.h }));
      const placedLabels = [];

      const fitsLabel = (candidate, text, config = {}, bounds = null) => {
        const box = estimatedLabelBox(candidate, text, config);
        const inBounds = box.x >= 18 && box.x + box.w <= activeCanvas.width - 18 && box.y >= 18 && box.y + box.h <= activeCanvas.height - 18;
        if (!inBounds) return false;
        if (bounds) {
          if (box.x < bounds.left || box.x + box.w > bounds.right || box.y < bounds.top || box.y + box.h > bounds.bottom) return false;
        }
        return !labelCollides(box, itemRects, placedLabels);
      };

      const commitLabel = (candidate, text, drawOptions = {}, boxOptions = {}) => {
        reserveLabelBox(candidate, text, placedLabels, boxOptions);
        drawText(text, candidate.x, candidate.y, drawOptions);
      };

      const xEntries = itemBoxes.map(({ item, x, y, w, h }, index) => {
        const isCircle = item.shape === "circle";
        const guideX = isCircle ? x + w / 2 : x;
        const guideY = isCircle ? y + h / 2 : y + h;
        const measureX = isCircle ? item.x + item.width / 2 : item.x;
        return {
          guideX,
          guideY,
          label: isCircle ? `CL from left ${Math.round(measureX)} mm` : `left edge ${Math.round(measureX)} mm`,
          color: xPalette[index % xPalette.length],
          length: guideX - wallLeftX
        };
      });

      const yEntries = itemBoxes.map(({ item, x, y, w, h }, index) => {
        const isCircle = item.shape === "circle";
        const guideX = isCircle ? x + w / 2 : x;
        const guideY = isCircle ? y + h / 2 : y + h;
        const measureY = isCircle ? item.y + item.height / 2 : item.y;
        return {
          guideX,
          guideY,
          label: isCircle ? `CL from floor ${Math.round(measureY)} mm` : `bottom ${Math.round(measureY)} mm`,
          color: yPalette[index % yPalette.length],
          length: floorY - guideY
        };
      });

      xEntries.forEach(entry => {
        drawArrowDimension(wallLeftX, entry.guideY, entry.guideX, entry.guideY, entry.color, [4, 4]);
      });
      yEntries.forEach(entry => {
        drawArrowDimension(entry.guideX, floorY, entry.guideX, entry.guideY, entry.color, [4, 4]);
      });

      xEntries.slice().sort((a, b) => b.length - a.length).forEach(entry => {
        const label = entry.label;
        const labelWidth = textWidth(label, 14, 700);
        const halo = "rgba(255,255,255,0.96)";
        let placed = false;
        if (entry.length > labelWidth + 28) {
          const fractions = [0.5, 0.65, 0.35, 0.78, 0.22];
          const yOffsets = [0, -14, 14, -28, 28];
          fractions.forEach(fraction => {
            yOffsets.forEach(offset => {
              if (placed) return;
              const candidate = { x: wallLeftX + entry.length * fraction, y: entry.guideY + offset };
              const bounds = {
                left: wallLeftX + 12,
                right: entry.guideX - 12,
                top: entry.guideY - 34,
                bottom: entry.guideY + 34
              };
              if (!fitsLabel(candidate, label, { size: 14, weight: 700, maxWidth: Math.max(120, entry.length - 24) }, bounds)) return;
              commitLabel(candidate, label, {
                color: entry.color,
                size: 14,
                weight: 700,
                halo,
                maxWidth: Math.max(120, entry.length - 24)
              }, {
                size: 14,
                weight: 700,
                maxWidth: Math.max(120, entry.length - 24)
              });
              placed = true;
            });
          });
        }
        if (placed) return;
        const fallbackColumns = [wallLeftX - 130, wallLeftX - 250];
        const offsets = [0, -22, 22, -44, 44, -66, 66];
        fallbackColumns.forEach(column => {
          offsets.forEach(offset => {
            if (placed) return;
            const candidate = { x: column, y: clamp(entry.guideY + offset, geom.y + 24, floorY - 24) };
            if (!fitsLabel(candidate, label, { size: 14, weight: 700, maxWidth: 220 })) return;
            drawLine(candidate.x + labelWidth / 2 + 12, candidate.y, wallLeftX - 10, entry.guideY, entry.color, [4, 4]);
            commitLabel(candidate, label, {
              color: entry.color,
              size: 14,
              weight: 700,
              halo,
              maxWidth: 220
            }, {
              size: 14,
              weight: 700,
              maxWidth: 220
            });
            placed = true;
          });
        });
      });

      yEntries.slice().sort((a, b) => b.length - a.length).forEach(entry => {
        const label = entry.label;
        const labelExtent = textWidth(label, 14, 700) + 12;
        const halo = "rgba(255,255,255,0.96)";
        let placed = false;
        if (entry.length > labelExtent + 24) {
          const fractions = [0.5, 0.68, 0.32, 0.8, 0.2];
          const xOffsets = [0, -18, 18];
          fractions.forEach(fraction => {
            xOffsets.forEach(offset => {
              if (placed) return;
              const candidate = { x: entry.guideX + offset, y: floorY - entry.length * fraction };
              const bounds = {
                left: entry.guideX - 34,
                right: entry.guideX + 34,
                top: entry.guideY + 12,
                bottom: floorY - 12
              };
              if (!fitsLabel(candidate, label, { size: 14, weight: 700, vertical: true, maxHeight: Math.max(120, entry.length - 24) }, bounds)) return;
              commitLabel(candidate, label, {
                rotate: -Math.PI / 2,
                color: entry.color,
                size: 14,
                weight: 700,
                halo,
                maxWidth: Math.max(120, entry.length - 24)
              }, {
                size: 14,
                weight: 700,
                vertical: true,
                maxHeight: Math.max(120, entry.length - 24)
              });
              placed = true;
            });
          });
        }
        if (placed) return;
        const fallbackRows = [floorY + 40, floorY + 78, floorY + 116];
        const xOffsets = [0, -90, 90, -170, 170];
        fallbackRows.forEach(rowY => {
          xOffsets.forEach(offset => {
            if (placed) return;
            const candidate = { x: clamp(entry.guideX + offset, geom.x + 90, geom.x + geom.w - 90), y: rowY };
            if (!fitsLabel(candidate, label, { size: 14, weight: 700, maxWidth: 220 })) return;
            drawLine(entry.guideX, floorY + 8, candidate.x, candidate.y - 10, entry.color, [4, 4]);
            commitLabel(candidate, label, {
              color: entry.color,
              size: 14,
              weight: 700,
              halo,
              maxWidth: 220
            }, {
              size: 14,
              weight: 700,
              maxWidth: 220
            });
            placed = true;
          });
        });
      });
    }

    function contrastText(hex) {
      return isDark(hex) ? "#ffffff" : "#161616";
    }

    function contrastHalo(color) {
      const normalized = String(color).toLowerCase();
      if (normalized === "#ffffff" || normalized === "white") return "rgba(0,0,0,0.24)";
      if (isDark(normalized)) return "rgba(255,255,255,0.42)";
      return "rgba(0,0,0,0.22)";
    }

    function itemBounds(item) {
      return {
        left: item.x,
        right: item.x + item.width,
        bottom: item.y,
        top: item.y + item.height
      };
    }

    function itemsOverlap(a, b) {
      const ab = itemBounds(a);
      const bb = itemBounds(b);
      return ab.left < bb.right && ab.right > bb.left && ab.bottom < bb.top && ab.top > bb.bottom;
    }

    function overlapIds() {
      const ids = new Set();
      for (let i = 0; i < state.items.length; i += 1) {
        for (let j = i + 1; j < state.items.length; j += 1) {
          if (itemsOverlap(state.items[i], state.items[j])) {
            ids.add(state.items[i].id);
            ids.add(state.items[j].id);
          }
        }
      }
      return ids;
    }

    function clampItemToWall(item) {
      item.x = Math.max(0, Math.min(state.wall.width - item.width, item.x));
      item.y = Math.max(0, Math.min(state.wall.height - item.height, item.y));
    }

    function drawItemShape(item, x, y, w, h, options = {}) {
      activeCtx.save();
      if (item.illuminated) {
        const glow = activeCtx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h));
        glow.addColorStop(0, "rgba(247, 209, 84, 0.36)");
        glow.addColorStop(1, "rgba(247, 209, 84, 0)");
        activeCtx.fillStyle = glow;
        activeCtx.fillRect(x - w * 0.45, y - h * 0.45, w * 1.9, h * 1.9);
      }

      activeCtx.fillStyle = item.color;
      activeCtx.strokeStyle = options.stroke || "#1f2924";
      activeCtx.lineWidth = options.lineWidth || 1.5;
      if (item.shape === "circle") {
        activeCtx.beginPath();
        activeCtx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        activeCtx.fill();
        drawItemImage(item, x, y, w, h);
        activeCtx.stroke();
      } else {
        activeCtx.fillRect(x, y, w, h);
        drawItemImage(item, x, y, w, h);
        activeCtx.strokeRect(x, y, w, h);
      }
      activeCtx.restore();
    }

    function drawItemImage(item, x, y, w, h) {
      const image = cachedImage(item.image);
      if (!image || !image.complete || !image.naturalWidth) return;
      activeCtx.save();
      if (item.shape === "circle") {
        activeCtx.beginPath();
        activeCtx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        activeCtx.clip();
      } else {
        activeCtx.beginPath();
        activeCtx.rect(x, y, w, h);
        activeCtx.clip();
      }
      const ratio = Math.max(w / image.naturalWidth, h / image.naturalHeight);
      const drawW = image.naturalWidth * ratio;
      const drawH = image.naturalHeight * ratio;
      activeCtx.drawImage(image, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH);
      activeCtx.restore();
    }

    function drawProjectedImage(item, points, options = {}) {
      const image = cachedImage(item.image);
      if (!image || !image.complete || !image.naturalWidth) return false;
      const xs = points.map(point => point.x);
      const ys = points.map(point => point.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const w = Math.max(1, maxX - minX);
      const h = Math.max(1, maxY - minY);
      activeCtx.save();
      if (item.shape === "circle") {
        const center = options.center || projectedCenter(points);
        const rx = Math.max(5, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) / 2);
        const ry = Math.max(5, Math.hypot(points[3].x - points[0].x, points[3].y - points[0].y) / 2);
        activeCtx.beginPath();
        activeCtx.ellipse(center.x, center.y, rx, ry, options.rotation || 0, 0, Math.PI * 2);
        activeCtx.clip();
      } else {
        activeCtx.beginPath();
        activeCtx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach(point => activeCtx.lineTo(point.x, point.y));
        activeCtx.closePath();
        activeCtx.clip();
      }
      const ratio = Math.max(w / image.naturalWidth, h / image.naturalHeight);
      const drawW = image.naturalWidth * ratio;
      const drawH = image.naturalHeight * ratio;
      activeCtx.drawImage(image, minX + (w - drawW) / 2, minY + (h - drawH) / 2, drawW, drawH);
      activeCtx.restore();
      return true;
    }

    function projectedCenter(points) {
      return points.reduce((acc, point) => ({
        x: acc.x + point.x / points.length,
        y: acc.y + point.y / points.length
      }), { x: 0, y: 0 });
    }

    function averageProjectedZ(points) {
      return points.reduce((sum, point) => sum + point.z, 0) / points.length;
    }

    function fillProjectedFace(points, fill, stroke, lineWidth = 1.2) {
      activeCtx.save();
      activeCtx.beginPath();
      activeCtx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(point => activeCtx.lineTo(point.x, point.y));
      activeCtx.closePath();
      activeCtx.fillStyle = fill;
      activeCtx.fill();
      if (stroke && stroke !== "transparent" && stroke !== "rgba(0,0,0,0)") {
        activeCtx.strokeStyle = stroke;
        activeCtx.lineWidth = lineWidth;
        activeCtx.stroke();
      }
      activeCtx.restore();
    }

    function drawProjectedEllipse(item, points, fill, stroke, options = {}) {
      const center = options.center || projectedCenter(points);
      const angle = options.rotation || Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
      const rx = Math.max(5, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) / 2);
      const ry = Math.max(5, Math.hypot(points[3].x - points[0].x, points[3].y - points[0].y) / 2);
      activeCtx.save();
      activeCtx.beginPath();
      activeCtx.ellipse(center.x, center.y, rx, ry, angle, 0, Math.PI * 2);
      activeCtx.fillStyle = fill;
      activeCtx.fill();
      activeCtx.strokeStyle = stroke;
      activeCtx.lineWidth = 1.2;
      activeCtx.stroke();
      activeCtx.restore();
      if (options.drawImage !== false) {
        drawProjectedImage(item, points, { center, rotation: angle });
      }
    }

    function pointInItem(point, item, geom) {
      const x = mmX(geom, item.x);
      const y = mmY(geom, item.y + item.height);
      const w = item.width * geom.scale;
      const h = item.height * geom.scale;
      if (item.shape === "circle") {
        const dx = (point.x - (x + w / 2)) / (w / 2);
        const dy = (point.y - (y + h / 2)) / (h / 2);
        return dx * dx + dy * dy <= 1;
      }
      return point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h;
    }

    function selectedSingleItem() {
      const ids = selectedIds();
      if (ids.length !== 1) return null;
      return state.items.find(item => item.id === ids[0]) || null;
    }

    function resizeHandleAt(point, geom) {
      const item = selectedSingleItem();
      if (!item) return null;
      const x = mmX(geom, item.x);
      const y = mmY(geom, item.y + item.height);
      const w = item.width * geom.scale;
      const h = item.height * geom.scale;
      const handle = { x: x + w, y: y + h };
      if (Math.abs(point.x - handle.x) <= 10 && Math.abs(point.y - handle.y) <= 10) return item;
      return null;
    }

    function snapValue(value, targets, threshold = 18) {
      let best = { value, line: null, distance: threshold + 1 };
      targets.forEach(target => {
        const distance = Math.abs(value - target.value);
        if (distance < best.distance && distance <= threshold) best = { value: target.value, line: target.line, distance };
      });
      return best;
    }

    function snapTargets(excludeIds = []) {
      const exclude = new Set(excludeIds);
      const guides = currentGuides();
      const vertical = [
        { value: 0, line: { axis: "x", value: 0 } },
        { value: state.wall.width / 2, line: { axis: "x", value: state.wall.width / 2 } },
        { value: state.wall.width, line: { axis: "x", value: state.wall.width } }
      ];
      const horizontal = [
        { value: 0, line: { axis: "y", value: 0 } },
        { value: state.wall.height / 2, line: { axis: "y", value: state.wall.height / 2 } },
        { value: state.wall.height, line: { axis: "y", value: state.wall.height } }
      ];
      if (guides.visible !== false) {
        guides.vertical.forEach(value => vertical.push({ value, line: { axis: "x", value } }));
        guides.horizontal.forEach(value => horizontal.push({ value, line: { axis: "y", value } }));
      }
      state.items.forEach(item => {
        if (exclude.has(item.id)) return;
        vertical.push({ value: item.x, line: { axis: "x", value: item.x } }, { value: item.x + item.width / 2, line: { axis: "x", value: item.x + item.width / 2 } }, { value: item.x + item.width, line: { axis: "x", value: item.x + item.width } });
        horizontal.push({ value: item.y, line: { axis: "y", value: item.y } }, { value: item.y + item.height / 2, line: { axis: "y", value: item.y + item.height / 2 } }, { value: item.y + item.height, line: { axis: "y", value: item.y + item.height } });
      });
      return { vertical, horizontal };
    }

    function drawSnapLines(geom) {
      (state.snapLines || []).forEach(line => {
        if (line.axis === "x") {
          const x = mmX(geom, line.value);
          drawLine(x, geom.y, x, geom.y + geom.h, "#a8c7dd", [6, 5]);
        } else {
          const y = mmY(geom, line.value);
          drawLine(geom.x, y, geom.x + geom.w, y, "#c2b7d8", [6, 5]);
        }
      });
    }

    function drawElevation() {
      const { width, height } = clear();
      const geom = elevationGeometry(width, height);
      const exportMode = activeCanvas !== els.canvas;
      const wallMark = contrastText(state.wall.color);
      const surroundMark = activeCanvas === els.canvas ? contrastText(sceneSurroundColor()) : "#4b5750";
      const overlaps = overlapIds();
      const canvasSize = { width, height };
      activeCtx.fillStyle = activeCanvas === els.canvas ? sceneSurroundColor() : "#f9fbf7";
      activeCtx.fillRect(0, 0, width, height);
      activeCtx.fillStyle = state.wall.color;
      activeCtx.strokeStyle = "#35363a";
      activeCtx.lineWidth = 2;
      activeCtx.fillRect(geom.x, geom.y, geom.w, geom.h);
      activeCtx.strokeRect(geom.x, geom.y, geom.w, geom.h);

      const overallWidthY = exportMode ? geom.y + geom.h + 158 : geom.y + geom.h + 34;
      const overallHeightX = exportMode ? geom.x - 70 : geom.x - 34;
      drawDimension(geom.x, overallWidthY, geom.x + geom.w, overallWidthY, `${state.wall.width} mm`, 14, false, surroundMark);
      drawDimension(overallHeightX, geom.y, overallHeightX, geom.y + geom.h, `${state.wall.height} mm`, 18, true, surroundMark);
      drawGuides(geom, width, height);
      drawSnapLines(geom);

      const itemBoxes = state.items.map(item => screenBoxForItem(geom, item));
      if (exportMode) {
        drawExportPositionGuides(geom, itemBoxes);
      }

      itemBoxes.forEach(({ item, x, y, w, h }) => {
        const invalid = item.x + item.width > state.wall.width || item.y + item.height > state.wall.height;
        const overlap = overlaps.has(item.id);
        const selected = isSelected(item.id);
        const showFullMeasures = selected || overlap;
        const stroke = invalid || overlap ? "#b3261e" : selected ? "#d7d3cb" : "#1f2924";

        drawItemShape(item, x, y, w, h, { stroke, lineWidth: invalid || overlap || selected ? 3 : 1.5 });

        if (item.type === "screen") {
          activeCtx.fillStyle = "rgba(255,255,255,0.12)";
          activeCtx.fillRect(x + 8, y + 8, Math.max(0, w - 16), Math.max(0, h - 16));
        }

        const textColor = contrastText(item.color);
        const label = selected && item.text ? `${item.name}: ${item.text}` : item.name;
        drawObjectLabel(item, { x, y, w, h }, canvasSize, {
          label,
          selected,
          calloutColor: wallMark
        });
        if (overlap) {
          drawText("OVERLAP", x + w / 2, y - 18, { color: "#b3261e", size: 12, halo: "rgba(255,255,255,0.9)" });
        }
        if (showFullMeasures) {
          drawDimension(x, y - 12, x + w, y - 12, `${item.width} mm`, 8, false, wallMark);
          drawDimension(x + w + 12, y, x + w + 12, y + h, `${item.height} mm`, 12, true, wallMark);
        }
        if (selected && selectedIds().length === 1) {
          activeCtx.fillStyle = "#d7d3cb";
          activeCtx.strokeStyle = "#090a0b";
          activeCtx.lineWidth = 2;
          activeCtx.fillRect(x + w - 5, y + h - 5, 10, 10);
          activeCtx.strokeRect(x + w - 5, y + h - 5, 10, 10);
        }
      });

      drawRulers(geom, width, height);
      els.scaleLabel.textContent = `2D zoom ${Math.round(state.view2d.zoom * 100)}% | scale 1 px = ${Math.round(1 / geom.scale)} mm`;
    }

    function validHexColor(value, fallback) {
      return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
    }

    function sceneFloorColor() {
      return validHexColor(state.space.floorColor, "#101113");
    }

    function sceneSurroundColor() {
      return validHexColor(state.space.surroundColor, "#070708");
    }

    function itemReliefDepth(item) {
      const type = canonicalItemType(item.type);
      if (type === "screen") return 64;
      if (type === "support") return 42;
      if (type === "object") return 86;
      if (type === "graphic") return 20;
      if (type === "title") return 16;
      if (type === "text") return 12;
      return 24;
    }

    function applyCinematicLight(width, height) {
      if (state.space.cinematicLight === false) return;
      activeCtx.save();
      const key = activeCtx.createRadialGradient(width * 0.36, height * 0.12, 0, width * 0.36, height * 0.12, width * 0.72);
      key.addColorStop(0, "rgba(255, 226, 166, 0.28)");
      key.addColorStop(0.42, "rgba(255, 226, 166, 0.09)");
      key.addColorStop(1, "rgba(255, 226, 166, 0)");
      activeCtx.fillStyle = key;
      activeCtx.fillRect(0, 0, width, height);

      const fill = activeCtx.createLinearGradient(width * 0.82, 0, width * 0.16, height);
      fill.addColorStop(0, "rgba(168, 199, 221, 0.12)");
      fill.addColorStop(1, "rgba(0, 0, 0, 0)");
      activeCtx.fillStyle = fill;
      activeCtx.fillRect(0, 0, width, height);

      const vignette = activeCtx.createRadialGradient(width / 2, height / 2, width * 0.18, width / 2, height / 2, width * 0.72);
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.34)");
      activeCtx.fillStyle = vignette;
      activeCtx.fillRect(0, 0, width, height);
      activeCtx.restore();
    }

    function drawPreviewLabel(label, center, color, maxWidth = 130) {
      const textColor = contrastText(color);
      drawText(label, center.x, center.y, {
        color: textColor,
        halo: contrastHalo(textColor),
        haloWidth: 3,
        size: 11,
        weight: 700,
        maxWidth
      });
    }

    function projectedArea(points) {
      let area = 0;
      points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        area += point.x * next.y - point.y * next.x;
      });
      return area / 2;
    }

    function visibleFace(points) {
      return projectedArea(points) < -0.5;
    }

    function queueLabel(queue, label) {
      const size = label.size || 11;
      const weight = label.weight || 700;
      const maxWidth = label.maxWidth || 140;
      const rawWidth = Math.min(maxWidth, textWidth(label.text, size, weight) + 18);
      const rawHeight = size + 12;
      const candidates = [
        { x: label.x, y: label.y },
        { x: label.x, y: label.y - rawHeight - 4 },
        { x: label.x, y: label.y + rawHeight + 4 },
        { x: label.x + rawWidth * 0.58, y: label.y },
        { x: label.x - rawWidth * 0.58, y: label.y }
      ];
      const picked = candidates.find(candidate => {
        const box = {
          left: candidate.x - rawWidth / 2,
          right: candidate.x + rawWidth / 2,
          top: candidate.y - rawHeight / 2,
          bottom: candidate.y + rawHeight / 2
        };
        return !queue.some(existing => !(box.right < existing.box.left || box.left > existing.box.right || box.bottom < existing.box.top || box.top > existing.box.bottom));
      });
      if (!picked) return;
      queue.push({
        ...label,
        x: picked.x,
        y: picked.y,
        box: {
          left: picked.x - rawWidth / 2,
          right: picked.x + rawWidth / 2,
          top: picked.y - rawHeight / 2,
          bottom: picked.y + rawHeight / 2
        }
      });
    }

    function drawQueuedLabels(queue) {
      queue.forEach(label => {
        drawText(label.text, label.x, label.y, {
          color: label.color,
          halo: label.halo,
          haloWidth: label.haloWidth || 4,
          size: label.size,
          weight: label.weight,
          maxWidth: label.maxWidth
        });
      });
    }

    function drawManagedLabel(queue, label) {
      const before = queue.length;
      queueLabel(queue, label);
      if (queue.length > before) {
        const picked = queue[queue.length - 1];
        drawText(picked.text, picked.x, picked.y, {
          color: picked.color,
          halo: picked.halo,
          haloWidth: picked.haloWidth || 4,
          size: picked.size,
          weight: picked.weight,
          maxWidth: picked.maxWidth
        });
      }
    }

    function drawPerspective() {
      const { width, height } = clear();
      const surround = activeCanvas === els.canvas ? sceneSurroundColor() : "#eef3ea";
      const floorColor = activeCanvas === els.canvas ? sceneFloorColor() : "#e4ebe0";
      activeCtx.fillStyle = surround;
      activeCtx.fillRect(0, 0, width, height);

      const baseScale = Math.min((width * 0.68) / state.wall.width, (height * 0.58) / state.wall.height);
      const scale = baseScale * state.view3d.zoom;
      const cx = width / 2;
      const cy = height / 2 + 28;
      const depth = Math.max(40, state.wall.depth);
      const rotX = (state.view3d.rotX ?? state.view3d.pitch ?? -10) * Math.PI / 180;
      const rotY = (state.view3d.rotY ?? state.view3d.yaw ?? 24) * Math.PI / 180;
      const rotZ = (state.view3d.rotZ ?? state.view3d.roll ?? 0) * Math.PI / 180;
      const camera = 8500;

      function rotatePoint(point) {
        let x = point.x - state.wall.width / 2;
        let y = point.y - state.wall.height / 2;
        let z = point.z - depth / 2;

        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        [x, z] = [x * cosY + z * sinY, -x * sinY + z * cosY];

        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        [y, z] = [y * cosX - z * sinX, y * sinX + z * cosX];

        const cosZ = Math.cos(rotZ);
        const sinZ = Math.sin(rotZ);
        [x, y] = [x * cosZ - y * sinZ, x * sinZ + y * cosZ];

        return { x, y, z };
      }

      function project(point) {
        const rotated = rotatePoint(point);
        const perspective = camera / (camera - rotated.z);
        return {
          x: cx + rotated.x * scale * perspective,
          y: cy - rotated.y * scale * perspective,
          z: rotated.z,
          perspective
        };
      }

      function face(points, fill, stroke, name) {
        const projected = points.map(project);
        return {
          points: projected,
          fill,
          stroke,
          name,
          z: projected.reduce((sum, point) => sum + point.z, 0) / projected.length
        };
      }

      function drawFace(faceDef) {
        polygon(faceDef.points.map(point => [point.x, point.y]), faceDef.fill, faceDef.stroke);
      }

      function drawFaceOutline(points, color) {
        activeCtx.save();
        activeCtx.strokeStyle = color;
        activeCtx.lineWidth = 1.2;
        activeCtx.beginPath();
        activeCtx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach(point => activeCtx.lineTo(point.x, point.y));
        activeCtx.closePath();
        activeCtx.stroke();
        activeCtx.restore();
      }

      const frontZ = depth;
      const backZ = 0;
      const floorY = 0;
      const floorPlane = [
        { x: -520, y: floorY, z: -depth * 0.8 },
        { x: state.wall.width + 520, y: floorY, z: -depth * 0.8 },
        { x: state.wall.width + 720, y: floorY, z: depth * 2.1 },
        { x: -720, y: floorY, z: depth * 2.1 }
      ].map(project);
      fillProjectedFace(floorPlane, activeCanvas === els.canvas ? shade(floorColor, -10) : "#edf2e9", activeCanvas === els.canvas ? shade(floorColor, 10) : "#d9e0d7", 1);

      const faces = [
        face([{ x: state.wall.width, y: 0, z: backZ }, { x: 0, y: 0, z: backZ }, { x: 0, y: state.wall.height, z: backZ }, { x: state.wall.width, y: state.wall.height, z: backZ }], activeCanvas === els.canvas ? "#1d1e21" : "#d1d9cf", activeCanvas === els.canvas ? "#4b4d52" : "#7e897f", "back"),
        face([{ x: state.wall.width, y: 0, z: frontZ }, { x: state.wall.width, y: 0, z: backZ }, { x: state.wall.width, y: state.wall.height, z: backZ }, { x: state.wall.width, y: state.wall.height, z: frontZ }], activeCanvas === els.canvas ? "#202125" : "#c9d3c5", activeCanvas === els.canvas ? "#4b4d52" : "#7e897f", "right"),
        face([{ x: 0, y: 0, z: backZ }, { x: 0, y: 0, z: frontZ }, { x: 0, y: state.wall.height, z: frontZ }, { x: 0, y: state.wall.height, z: backZ }], activeCanvas === els.canvas ? "#202125" : "#c9d3c5", activeCanvas === els.canvas ? "#4b4d52" : "#7e897f", "left"),
        face([{ x: 0, y: state.wall.height, z: frontZ }, { x: state.wall.width, y: state.wall.height, z: frontZ }, { x: state.wall.width, y: state.wall.height, z: backZ }, { x: 0, y: state.wall.height, z: backZ }], activeCanvas === els.canvas ? shade(state.wall.color, -12) : "#dde4da", activeCanvas === els.canvas ? "#4b4d52" : "#7e897f", "top"),
        face([{ x: 0, y: 0, z: frontZ }, { x: state.wall.width, y: 0, z: frontZ }, { x: state.wall.width, y: state.wall.height, z: frontZ }, { x: 0, y: state.wall.height, z: frontZ }], state.wall.color, "#303137", "front")
      ];
      const frontFace = faces.find(faceDef => faceDef.name === "front");
      const frontIsVisible = frontFace ? visibleFace(frontFace.points) : true;

      const renderables = faces.map(faceDef => ({
        z: faceDef.z,
        draw: () => {
          if (!visibleFace(faceDef.points)) return;
          drawFace(faceDef);
        }
      }));

      if (frontIsVisible) state.items.forEach(rawItem => {
        const item = normalizeItem(rawItem);
        const gap = 6;
        const relief = itemReliefDepth(item);
        const zBackItem = frontZ + gap;
        const zFrontItem = zBackItem + relief;
        const shadowPoints = [
          { x: item.x + 8, y: Math.max(0, item.y - 8), z: frontZ + 1 },
          { x: item.x + item.width + 8, y: Math.max(0, item.y - 8), z: frontZ + 1 },
          { x: item.x + item.width + 16, y: Math.min(state.wall.height, item.y + item.height - 6), z: frontZ + 1 },
          { x: item.x + 16, y: Math.min(state.wall.height, item.y + item.height - 6), z: frontZ + 1 }
        ].map(project);
        const backPoints3d = [
          { x: item.x, y: item.y, z: zBackItem },
          { x: item.x + item.width, y: item.y, z: zBackItem },
          { x: item.x + item.width, y: item.y + item.height, z: zBackItem },
          { x: item.x, y: item.y + item.height, z: zBackItem }
        ];
        const frontPoints3d = [
          { x: item.x, y: item.y, z: zFrontItem },
          { x: item.x + item.width, y: item.y, z: zFrontItem },
          { x: item.x + item.width, y: item.y + item.height, z: zFrontItem },
          { x: item.x, y: item.y + item.height, z: zFrontItem }
        ];
        const backPoints = backPoints3d.map(project);
        const frontPoints = frontPoints3d.map(project);
        const frontCenter = projectedCenter(frontPoints);
        const frontAngle = Math.atan2(frontPoints[1].y - frontPoints[0].y, frontPoints[1].x - frontPoints[0].x);
        const sideStroke = shade(item.color, -34);
        const sideFill = shade(item.color, -22);
        const topFill = shade(item.color, -12);

          renderables.push({
            z: averageProjectedZ(shadowPoints) - 3,
            draw: () => fillProjectedFace(shadowPoints, "rgba(0,0,0,0.12)", "rgba(0,0,0,0)", 0)
          });

        if (item.shape === "circle") {
          renderables.push({
            z: averageProjectedZ(backPoints),
            draw: () => drawProjectedEllipse(item, backPoints, shade(item.color, -26), sideStroke, { center: projectedCenter(backPoints), rotation: frontAngle, drawImage: false })
          });
          renderables.push({
            z: averageProjectedZ(frontPoints) - 0.2,
            draw: () => {
              [0, 1, 2, 3].forEach(index => drawLine(backPoints[index].x, backPoints[index].y, frontPoints[index].x, frontPoints[index].y, sideStroke));
            }
          });
          renderables.push({
            z: averageProjectedZ(frontPoints),
            draw: () => {
              if (item.illuminated) {
                const glow = activeCtx.createRadialGradient(frontCenter.x, frontCenter.y, 0, frontCenter.x, frontCenter.y, 72 * state.view3d.zoom);
                glow.addColorStop(0, "rgba(247, 209, 84, 0.36)");
                glow.addColorStop(1, "rgba(247, 209, 84, 0)");
                activeCtx.fillStyle = glow;
                activeCtx.fillRect(frontCenter.x - 110, frontCenter.y - 110, 220, 220);
              }
              drawProjectedEllipse(item, frontPoints, item.color, "#1f2924", { center: frontCenter, rotation: frontAngle });
            }
          });
        } else {
          const sideFaces = [
            { points: [backPoints3d[0], frontPoints3d[0], frontPoints3d[3], backPoints3d[3]], fill: sideFill },
            { points: [frontPoints3d[1], backPoints3d[1], backPoints3d[2], frontPoints3d[2]], fill: sideFill },
            { points: [backPoints3d[3], frontPoints3d[3], frontPoints3d[2], backPoints3d[2]], fill: topFill }
          ];
          sideFaces.forEach(faceDef => {
            const projected = faceDef.points.map(project);
            renderables.push({
              z: averageProjectedZ(projected),
              draw: () => {
                if (!visibleFace(projected)) return;
                fillProjectedFace(projected, faceDef.fill, sideStroke, 1.2);
              }
            });
          });
          renderables.push({
            z: averageProjectedZ(frontPoints),
            draw: () => {
              if (item.illuminated) {
                const glow = activeCtx.createRadialGradient(frontCenter.x, frontCenter.y, 0, frontCenter.x, frontCenter.y, 72 * state.view3d.zoom);
                glow.addColorStop(0, "rgba(247, 209, 84, 0.36)");
                glow.addColorStop(1, "rgba(247, 209, 84, 0)");
                activeCtx.fillStyle = glow;
                activeCtx.fillRect(frontCenter.x - 110, frontCenter.y - 110, 220, 220);
              }
              fillProjectedFace(frontPoints, item.color, "#1f2924", 1.4);
              drawProjectedImage(item, frontPoints, {
                center: frontCenter,
                rotation: frontAngle
              });
            }
          });
        }
      });

      renderables.sort((a, b) => a.z - b.z).forEach(renderable => renderable.draw());
      applyCinematicLight(width, height);
      drawAxisGizmo(width, height, rotY, rotX, rotZ);
      els.scaleLabel.textContent = `3D zoom ${Math.round(state.view3d.zoom * 100)}% | X ${Math.round(state.view3d.rotX ?? state.view3d.pitch ?? -10)} deg | Y ${Math.round(state.view3d.rotY ?? state.view3d.yaw ?? 24)} deg | Z ${Math.round(state.view3d.rotZ ?? state.view3d.roll ?? 0)} deg`;
    }

    function spaceGeometry(width, height) {
      const pad = 82;
      const scale = Math.min((width - pad * 2) / state.space.width, (height - pad * 2) / state.space.depth) * state.view2d.zoom;
      const w = state.space.width * scale;
      const h = state.space.depth * scale;
      return { scale, x: (width - w) / 2 + number(state.view2d.panX, 0), y: (height - h) / 2 + number(state.view2d.panY, 0), w, h };
    }

    function spacePoint(geom, x, y) {
      return { x: geom.x + x * geom.scale, y: geom.y + geom.h - y * geom.scale };
    }

    function wallSpaceEndpoints(wall) {
      const placement = wall.placement || { x: 0, y: 0, rotation: 0 };
      const angle = (placement.rotation || 0) * Math.PI / 180;
      const dx = Math.cos(angle) * wall.wall.width;
      const dy = Math.sin(angle) * wall.wall.width;
      return {
        a: { x: placement.x, y: placement.y },
        b: { x: placement.x + dx, y: placement.y + dy }
      };
    }

    function drawSpace2D() {
      const { width, height } = clear();
      const geom = spaceGeometry(width, height);
      const floorFill = activeCanvas === els.canvas ? shade(sceneFloorColor(), -18) : "#ffffff";
      const surroundMark = activeCanvas === els.canvas ? contrastText(sceneSurroundColor()) : "#26362f";
      const floorMark = activeCanvas === els.canvas ? contrastText(floorFill) : "#26362f";
      activeCtx.fillStyle = activeCanvas === els.canvas ? sceneSurroundColor() : "#f9fbf7";
      activeCtx.fillRect(0, 0, width, height);
      activeCtx.fillStyle = floorFill;
      activeCtx.strokeStyle = activeCanvas === els.canvas ? shade(sceneFloorColor(), 52) : "#7e897f";
      activeCtx.lineWidth = 2;
      activeCtx.fillRect(geom.x, geom.y, geom.w, geom.h);
      activeCtx.strokeRect(geom.x, geom.y, geom.w, geom.h);
      drawText(`${state.space.width} mm`, geom.x + geom.w / 2, geom.y + geom.h + 34, { color: surroundMark, halo: contrastHalo(surroundMark), size: 13 });
      drawText(`${state.space.depth} mm`, geom.x - 34, geom.y + geom.h / 2, { rotate: -Math.PI / 2, color: surroundMark, halo: contrastHalo(surroundMark), size: 13 });

      state.walls.forEach((wall, index) => {
        const ends = wallSpaceEndpoints(wall);
        const a = spacePoint(geom, ends.a.x, ends.a.y);
        const b = spacePoint(geom, ends.b.x, ends.b.y);
        const selected = wall.id === state.activeWallId;
        drawLine(a.x, a.y, b.x, b.y, selected ? "#d7d3cb" : "#b8c1cb");
        activeCtx.lineWidth = selected ? 8 : 5;
        activeCtx.strokeStyle = selected ? "#d7d3cb" : "#b8c1cb";
        activeCtx.beginPath();
        activeCtx.moveTo(a.x, a.y);
        activeCtx.lineTo(b.x, b.y);
        activeCtx.stroke();
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        drawText(wall.name || `Wall ${index + 1}`, mid.x, mid.y - 18, { color: selected ? "#d7d3cb" : floorMark, halo: contrastHalo(floorMark), size: 12 });
        drawText(`${wall.wall.width} mm`, mid.x, mid.y + 18, { color: floorMark, halo: contrastHalo(floorMark), size: 10, weight: 600 });
      });
      els.scaleLabel.textContent = `Floor plan zoom ${Math.round(state.view2d.zoom * 100)}% | ${state.walls.length} wall${state.walls.length === 1 ? "" : "s"} | ${activeTool() === "hand" ? "drag to pan" : "drag walls to move"}`;
    }

    function drawSpace3D() {
      const { width, height } = clear();
      const surround = activeCanvas === els.canvas ? sceneSurroundColor() : "#eef3ea";
      const floorColor = activeCanvas === els.canvas ? sceneFloorColor() : "#e4ebe0";
      activeCtx.fillStyle = surround;
      activeCtx.fillRect(0, 0, width, height);

      const rotX = (state.view3d.rotX ?? state.view3d.pitch ?? -10) * Math.PI / 180;
      const rotY = (state.view3d.rotY ?? state.view3d.yaw ?? 24) * Math.PI / 180;
      const rotZ = (state.view3d.rotZ ?? state.view3d.roll ?? 0) * Math.PI / 180;
      const maxWallHeight = Math.max(...state.walls.map(wall => wall.wall.height), state.wall.height, 2800);
      const roomScale = Math.min((width * 0.62) / state.space.width, (height * 0.58) / Math.max(state.space.depth, maxWallHeight)) * state.view3d.zoom;
      const cx = width / 2;
      const cy = height / 2 + 88;
      const camera = 16000;

      function rotateRoomPoint(point) {
        let x = point.x - state.space.width / 2;
        let y = point.y - maxWallHeight / 2;
        let z = point.z - state.space.depth / 2;

        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        [x, z] = [x * cosY + z * sinY, -x * sinY + z * cosY];

        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        [y, z] = [y * cosX - z * sinX, y * sinX + z * cosX];

        const cosZ = Math.cos(rotZ);
        const sinZ = Math.sin(rotZ);
        [x, y] = [x * cosZ - y * sinZ, x * sinZ + y * cosZ];

        return { x, y, z };
      }

      function projectRoom(point) {
        const rotated = rotateRoomPoint(point);
        const perspective = camera / (camera - rotated.z);
        return {
          x: cx + rotated.x * roomScale * perspective,
          y: cy - rotated.y * roomScale * perspective,
          z: rotated.z,
          perspective
        };
      }

      function face3d(points, fill, stroke, drawExtra) {
        const projected = points.map(projectRoom);
        return {
          points: projected,
          fill,
          stroke,
          z: averageProjectedZ(projected),
          drawExtra
        };
      }

      function drawRoomOutline(points, color) {
        activeCtx.save();
        activeCtx.strokeStyle = color;
        activeCtx.lineWidth = 1.2;
        activeCtx.beginPath();
        activeCtx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach(point => activeCtx.lineTo(point.x, point.y));
        activeCtx.closePath();
        activeCtx.stroke();
        activeCtx.restore();
      }

      const floorOutline = [
        { x: 0, y: 0, z: 0 },
        { x: state.space.width, y: 0, z: 0 },
        { x: state.space.width, y: 0, z: state.space.depth },
        { x: 0, y: 0, z: state.space.depth }
      ].map(projectRoom);
      fillProjectedFace(floorOutline, activeCanvas === els.canvas ? shade(floorColor, -10) : "#edf2e9", activeCanvas === els.canvas ? shade(floorColor, 10) : "#d9e0d7", 1);
      const faces = [];

      state.walls.forEach((wall, index) => {
        const ends = wallSpaceEndpoints(wall);
        const wallHeight = wall.wall.height;
        const angle = ((wall.placement && wall.placement.rotation) || 0) * Math.PI / 180;
        const ux = Math.cos(angle);
        const uy = Math.sin(angle);
        const nx = -Math.sin(angle);
        const ny = Math.cos(angle);
        const halfDepth = Math.max(30, number(wall.wall.depth, 120) / 2);
        const edgeStroke = wall.id === state.activeWallId ? "#d7d3cb" : "#303137";
        const frontA = { x: ends.a.x + nx * halfDepth, z: ends.a.y + ny * halfDepth };
        const frontB = { x: ends.b.x + nx * halfDepth, z: ends.b.y + ny * halfDepth };
        const backA = { x: ends.a.x - nx * halfDepth, z: ends.a.y - ny * halfDepth };
        const backB = { x: ends.b.x - nx * halfDepth, z: ends.b.y - ny * halfDepth };
        const wallFace = [
          { x: frontA.x, y: 0, z: frontA.z },
          { x: frontB.x, y: 0, z: frontB.z },
          { x: frontB.x, y: wallHeight, z: frontB.z },
          { x: frontA.x, y: wallHeight, z: frontA.z }
        ];
        const wallBack = [
          { x: backB.x, y: 0, z: backB.z },
          { x: backA.x, y: 0, z: backA.z },
          { x: backA.x, y: wallHeight, z: backA.z },
          { x: backB.x, y: wallHeight, z: backB.z }
        ];
        const wallLeft = [
          { x: backA.x, y: 0, z: backA.z },
          { x: frontA.x, y: 0, z: frontA.z },
          { x: frontA.x, y: wallHeight, z: frontA.z },
          { x: backA.x, y: wallHeight, z: backA.z }
        ];
        const wallRight = [
          { x: frontB.x, y: 0, z: frontB.z },
          { x: backB.x, y: 0, z: backB.z },
          { x: backB.x, y: wallHeight, z: backB.z },
          { x: frontB.x, y: wallHeight, z: frontB.z }
        ];
        const wallTop = [
          { x: frontA.x, y: wallHeight, z: frontA.z },
          { x: frontB.x, y: wallHeight, z: frontB.z },
          { x: backB.x, y: wallHeight, z: backB.z },
          { x: backA.x, y: wallHeight, z: backA.z }
        ];
        const wallBackDef = face3d(wallBack, shade(wall.wall.color, -34), edgeStroke);
        const wallFaceDef = face3d(wallFace, wall.wall.color, edgeStroke);
        faces.push(wallBackDef);
        faces.push(face3d(wallLeft, shade(wall.wall.color, -26), edgeStroke));
        faces.push(face3d(wallRight, shade(wall.wall.color, -26), edgeStroke));
        faces.push(face3d(wallTop, shade(wall.wall.color, -12), edgeStroke));
        faces.push(wallFaceDef);

        if (!visibleFace(wallFaceDef.points)) return;
        (wall.items || []).forEach(rawItem => {
          const item = normalizeItem(rawItem);
          const gap = 8;
          const backOffset = halfDepth + gap;
          const frontOffset = backOffset + itemReliefDepth(item);
          const left = item.x;
          const right = item.x + item.width;
          const bottom = item.y;
          const top = item.y + item.height;
          const backPoints3d = [
            { x: ends.a.x + ux * left + nx * backOffset, y: bottom, z: ends.a.y + uy * left + ny * backOffset },
            { x: ends.a.x + ux * right + nx * backOffset, y: bottom, z: ends.a.y + uy * right + ny * backOffset },
            { x: ends.a.x + ux * right + nx * backOffset, y: top, z: ends.a.y + uy * right + ny * backOffset },
            { x: ends.a.x + ux * left + nx * backOffset, y: top, z: ends.a.y + uy * left + ny * backOffset }
          ];
          const frontPoints3d = [
            { x: ends.a.x + ux * left + nx * frontOffset, y: bottom, z: ends.a.y + uy * left + ny * frontOffset },
            { x: ends.a.x + ux * right + nx * frontOffset, y: bottom, z: ends.a.y + uy * right + ny * frontOffset },
            { x: ends.a.x + ux * right + nx * frontOffset, y: top, z: ends.a.y + uy * right + ny * frontOffset },
            { x: ends.a.x + ux * left + nx * frontOffset, y: top, z: ends.a.y + uy * left + ny * frontOffset }
          ];
          const backProjected = backPoints3d.map(projectRoom);
          const frontProjected = frontPoints3d.map(projectRoom);
          const frontCenter = projectedCenter(frontProjected);
          const rotation = Math.atan2(frontProjected[1].y - frontProjected[0].y, frontProjected[1].x - frontProjected[0].x);
          const sideStroke = shade(item.color, -34);
          const sideFill = shade(item.color, -22);
          const topFill = shade(item.color, -12);
          const shadowPoints = [
            { x: ends.a.x + ux * (left + 8) + nx * (halfDepth + 2), y: Math.max(0, bottom - 8), z: ends.a.y + uy * (left + 8) + ny * (halfDepth + 2) },
            { x: ends.a.x + ux * (right + 8) + nx * (halfDepth + 2), y: Math.max(0, bottom - 8), z: ends.a.y + uy * (right + 8) + ny * (halfDepth + 2) },
            { x: ends.a.x + ux * (right + 16) + nx * (halfDepth + 2), y: Math.min(wallHeight, top - 6), z: ends.a.y + uy * (right + 16) + ny * (halfDepth + 2) },
            { x: ends.a.x + ux * (left + 16) + nx * (halfDepth + 2), y: Math.min(wallHeight, top - 6), z: ends.a.y + uy * (left + 16) + ny * (halfDepth + 2) }
          ].map(projectRoom);
          faces.push({
            points: shadowPoints,
            fill: "rgba(0,0,0,0.12)",
            stroke: "rgba(0,0,0,0)",
            z: averageProjectedZ(shadowPoints)
          });
          if (item.shape === "circle") {
            faces.push({
              points: backProjected,
              fill: shade(item.color, -26),
              stroke: sideStroke,
              z: averageProjectedZ(backProjected),
              custom: true,
              drawExtra: projected => drawProjectedEllipse(item, projected, shade(item.color, -26), sideStroke, { center: projectedCenter(projected), rotation, drawImage: false })
            });
            faces.push({
              points: frontProjected,
              fill: item.color,
              stroke: "#1f2924",
              z: averageProjectedZ(frontProjected),
              custom: true,
              drawExtra: projected => {
                if (item.illuminated) {
                  const glow = activeCtx.createRadialGradient(frontCenter.x, frontCenter.y, 0, frontCenter.x, frontCenter.y, 74 * state.view3d.zoom);
                  glow.addColorStop(0, "rgba(247, 209, 84, 0.34)");
                  glow.addColorStop(1, "rgba(247, 209, 84, 0)");
                  activeCtx.fillStyle = glow;
                  activeCtx.fillRect(frontCenter.x - 120, frontCenter.y - 120, 240, 240);
                }
                [0, 1, 2, 3].forEach(index => drawLine(backProjected[index].x, backProjected[index].y, frontProjected[index].x, frontProjected[index].y, sideStroke));
                drawProjectedEllipse(item, projected, item.color, "#1f2924", { center: frontCenter, rotation });
              }
            });
          } else {
            [
              { points: [backPoints3d[0], frontPoints3d[0], frontPoints3d[3], backPoints3d[3]], fill: sideFill },
              { points: [frontPoints3d[1], backPoints3d[1], backPoints3d[2], frontPoints3d[2]], fill: sideFill },
              { points: [backPoints3d[3], frontPoints3d[3], frontPoints3d[2], backPoints3d[2]], fill: topFill }
            ].forEach(faceDef => {
              faces.push(face3d(faceDef.points, faceDef.fill, sideStroke));
            });
            faces.push({
              points: frontProjected,
              fill: item.color,
              stroke: "#1f2924",
              z: averageProjectedZ(frontProjected),
              drawExtra: projected => {
                if (item.illuminated) {
                  const glow = activeCtx.createRadialGradient(frontCenter.x, frontCenter.y, 0, frontCenter.x, frontCenter.y, 74 * state.view3d.zoom);
                  glow.addColorStop(0, "rgba(247, 209, 84, 0.34)");
                  glow.addColorStop(1, "rgba(247, 209, 84, 0)");
                  activeCtx.fillStyle = glow;
                  activeCtx.fillRect(frontCenter.x - 120, frontCenter.y - 120, 240, 240);
                }
                drawProjectedImage(item, projected, {
                  center: frontCenter,
                  rotation
                });
              }
            });
          }
        });
      });

      const sortedFaces = faces.sort((a, b) => a.z - b.z);
      sortedFaces.forEach(face => {
        if (!visibleFace(face.points)) return;
        if (face.custom) {
          if (typeof face.drawExtra === "function") face.drawExtra(face.points);
          return;
        }
        fillProjectedFace(face.points, face.fill, face.stroke, 1.2);
        if (typeof face.drawExtra === "function") face.drawExtra(face.points);
      });

      applyCinematicLight(width, height);
      drawAxisGizmo(width, height, rotY, rotX, rotZ);
      els.scaleLabel.textContent = `Space 3D | ${state.walls.length} wall${state.walls.length === 1 ? "" : "s"} | X ${Math.round(state.view3d.rotX ?? -10)} deg | Y ${Math.round(state.view3d.rotY ?? 24)} deg | Z ${Math.round(state.view3d.rotZ ?? 0)} deg`;
    }

    function drawAxisGizmo(width, height, yaw, pitch, roll) {
      const origin = { x: width - 82, y: height - 76 };
      const axes = [
        { label: "X", color: "#b3261e", point: { x: 1, y: 0, z: 0 } },
        { label: "Y", color: "#d7d3cb", point: { x: 0, y: 1, z: 0 } },
        { label: "Z", color: "#315a9d", point: { x: 0, y: 0, z: 1 } }
      ];
      function rotateUnit(point) {
        let { x, y, z } = point;
        [x, z] = [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)];
        [y, z] = [y * Math.cos(pitch) - z * Math.sin(pitch), y * Math.sin(pitch) + z * Math.cos(pitch)];
        [x, y] = [x * Math.cos(roll) - y * Math.sin(roll), x * Math.sin(roll) + y * Math.cos(roll)];
        return { x: origin.x + x * 34, y: origin.y - y * 34 };
      }
      axes.forEach(axis => {
        const end = rotateUnit(axis.point);
        drawLine(origin.x, origin.y, end.x, end.y, axis.color);
        activeCtx.save();
        activeCtx.fillStyle = axis.color;
        activeCtx.beginPath();
        activeCtx.arc(end.x, end.y, 3.5, 0, Math.PI * 2);
        activeCtx.fill();
        activeCtx.restore();
      });
    }

    function polygon(points, fill, stroke) {
      activeCtx.beginPath();
      activeCtx.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(point => activeCtx.lineTo(point[0], point[1]));
      activeCtx.closePath();
      activeCtx.fillStyle = fill;
      activeCtx.fill();
      activeCtx.strokeStyle = stroke;
      activeCtx.stroke();
    }

    function shade(hex, amount) {
      const color = hex.replace("#", "");
      const num = parseInt(color, 16);
      const r = Math.max(0, Math.min(255, (num >> 16) + amount));
      const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
      const b = Math.max(0, Math.min(255, (num & 255) + amount));
      return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
    }

    function isDark(hex) {
      const color = hex.replace("#", "");
      const num = parseInt(color, 16);
      const r = num >> 16;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return (r * 299 + g * 587 + b * 114) / 1000 < 135;
    }
