import { jsPDF } from 'jspdf';
import { GeneratedPattern, PatternConfig } from './patternEngine';

// Watermark helper for Free Plan PDF exports across all pages
function applyFreePlanWatermarkToPDF(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    // High-visibility semi-transparent diagonal watermark centered across each PDF page
    doc.saveGraphicsState();
    try {
      const gState = new (doc as any).GState({ opacity: 0.55 });
      doc.setGState(gState);
    } catch {
      // Fallback if GState constructor is unavailable in environment
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(224, 108, 56);
    doc.text('Stitchly powered by stitchedmemories.com', pw / 2, ph / 2, {
      angle: 45,
      align: 'center',
      baseline: 'middle',
    });

    doc.restoreGraphicsState();
  }
}

// Helper to format consistent footers based on plan tier
function getFooterText(config: PatternConfig, sectionName: string, patternName: string): string {
  if (config.planTier === 'studio') {
    // Studio Plan: Commercial pattern selling rights - NO platform branding
    return `${patternName} • ${sectionName}`;
  }
  // Free & Pro Plan:
  return `Stitchly powered by stitchedmemories.com • ${sectionName}`;
}
function isLightColor(hex: string): boolean {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2) || '00', 16);
  const g = parseInt(clean.substring(2, 4) || '00', 16);
  const b = parseInt(clean.substring(4, 6) || '00', 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

// Generate a small canvas data URL for a color swatch
function createColorSwatchDataUrl(hex: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 30;
  canvas.height = 30;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, 30, 30);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 30, 30);
  }
  return canvas.toDataURL('image/png');
}

/**
 * Render the full pattern preview overview canvas
 */
function renderFullPatternCanvas(
  pattern: GeneratedPattern,
  mode: 'color' | 'symbol',
  config?: PatternConfig
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const maxDim = 1200; // High resolution rendering for crisp preview page
  const scale = Math.min(1, maxDim / Math.max(pattern.widthStitches, pattern.heightStitches));
  const cellSize = Math.max(4, Math.floor(16 * scale));

  canvas.width = pattern.widthStitches * cellSize;
  canvas.height = pattern.heightStitches * cellSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < pattern.heightStitches; y++) {
    for (let x = 0; x < pattern.widthStitches; x++) {
      const index = y * pattern.widthStitches + x;
      const dmc = pattern.pixelDmcMap[index];
      const px = x * cellSize;
      const py = y * cellSize;

      if (mode === 'color') {
        ctx.fillStyle = dmc.hex;
        ctx.fillRect(px, py, cellSize, cellSize);
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px, py, cellSize, cellSize);
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, cellSize, cellSize);
      }
    }
  }

  // Overlay 10-stitch grid lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= pattern.widthStitches; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x * cellSize, 0);
    ctx.lineTo(x * cellSize, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= pattern.heightStitches; y += 10) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellSize);
    ctx.lineTo(canvas.width, y * cellSize);
    ctx.stroke();
  }

  return canvas;
}

/**
 * Render a visual map of page arrangement order diagram
 */
function renderPageArrangementMapCanvas(
  pattern: GeneratedPattern,
  numChunksX: number,
  numChunksY: number,
  chunkSize: number,
  startPageNum: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const boxWidth = 140;
  const boxHeight = 100;
  const gap = 12;
  const margin = 24;

  canvas.width = margin * 2 + numChunksX * boxWidth + (numChunksX - 1) * gap;
  canvas.height = margin * 2 + numChunksY * boxHeight + (numChunksY - 1) * gap;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#FAF6EE';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let currentPage = startPageNum;

  for (let cy = 0; cy < numChunksY; cy++) {
    for (let cx = 0; cx < numChunksX; cx++) {
      const bx = margin + cx * (boxWidth + gap);
      const by = margin + cy * (boxHeight + gap);

      const startX = cx * chunkSize;
      const startY = cy * chunkSize;
      const countX = Math.min(chunkSize, pattern.widthStitches - startX);
      const countY = Math.min(chunkSize, pattern.heightStitches - startY);

      // Card box
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(bx, by, boxWidth, boxHeight);
      ctx.strokeStyle = '#3D5239';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, boxWidth, boxHeight);

      // Page Badge Header
      ctx.fillStyle = '#3D5239';
      ctx.fillRect(bx, by, boxWidth, 26);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`PAGE ${currentPage}`, bx + boxWidth / 2, by + 13);

      // Section Position info
      ctx.fillStyle = '#1D231E';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`Row ${cy + 1}, Column ${cx + 1}`, bx + boxWidth / 2, by + 44);

      ctx.fillStyle = '#E06C38';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`Stitches X: ${startX + 1} - ${startX + countX}`, bx + boxWidth / 2, by + 62);
      ctx.fillText(`Stitches Y: ${startY + 1} - ${startY + countY}`, bx + boxWidth / 2, by + 76);

      ctx.fillStyle = '#7A8877';
      ctx.font = '9px sans-serif';
      ctx.fillText(`(${countX} x ${countY} grid)`, bx + boxWidth / 2, by + 90);

      currentPage++;
    }
  }

  return canvas;
}

/**
 * Render a sub-grid section of the pattern onto an offscreen canvas
 */
function renderSubGridCanvas(
  pattern: GeneratedPattern,
  startX: number,
  startY: number,
  countX: number,
  countY: number,
  mode: 'color' | 'symbol',
  config: PatternConfig
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const cellSize = 30; // 30px per stitch cell = crisp zoomed-in detail
  const labelMargin = 34; // margin for stitch coordinate numbers

  const canvasWidth = countX * cellSize + labelMargin;
  const canvasHeight = countY * cellSize + labelMargin;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Ruler margins
  ctx.fillStyle = '#F5EFE4';
  ctx.fillRect(0, 0, canvasWidth, labelMargin);
  ctx.fillRect(0, 0, labelMargin, canvasHeight);

  ctx.strokeStyle = '#C5D3C2';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, labelMargin, labelMargin);

  // Draw Stitches
  for (let cy = 0; cy < countY; cy++) {
    const y = startY + cy;
    if (y >= pattern.heightStitches) break;

    for (let cx = 0; cx < countX; cx++) {
      const x = startX + cx;
      if (x >= pattern.widthStitches) break;

      const index = y * pattern.widthStitches + x;
      const dmc = pattern.pixelDmcMap[index];

      const px = labelMargin + cx * cellSize;
      const py = labelMargin + cy * cellSize;

      if (mode === 'color') {
        // Fill colored cell
        ctx.fillStyle = dmc.hex;
        ctx.fillRect(px, py, cellSize, cellSize);

        // Draw symbol inside cell with automatic contrast text color
        ctx.fillStyle = isLightColor(dmc.hex) ? '#000000' : '#FFFFFF';
        ctx.font = `bold ${Math.floor(cellSize * 0.55)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dmc.symbol, px + cellSize / 2, py + cellSize / 2);
      } else {
        // B&W Symbol Chart
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px, py, cellSize, cellSize);
        ctx.strokeStyle = '#D0D0D0';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, cellSize, cellSize);

        // Draw symbol
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.floor(cellSize * 0.6)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dmc.symbol, px + cellSize / 2, py + cellSize / 2);
      }
    }
  }

  // Draw 10-stitch Bold Lines & 1-stitch Fine Lines
  for (let cx = 0; cx <= countX; cx++) {
    const x = startX + cx;
    if (x > pattern.widthStitches) break;

    const px = labelMargin + cx * cellSize;
    const isTen = x % 10 === 0;

    ctx.beginPath();
    ctx.strokeStyle = isTen ? '#000000' : 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = isTen ? 2 : 0.6;
    ctx.moveTo(px, labelMargin);
    ctx.lineTo(px, canvasHeight);
    ctx.stroke();

    // Draw ruler number at top margin
    if (isTen && x > 0 && cx < countX) {
      ctx.fillStyle = '#1D231E';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(x.toString(), px, labelMargin / 2);
    }
  }

  for (let cy = 0; cy <= countY; cy++) {
    const y = startY + cy;
    if (y > pattern.heightStitches) break;

    const py = labelMargin + cy * cellSize;
    const isTen = y % 10 === 0;

    ctx.beginPath();
    ctx.strokeStyle = isTen ? '#000000' : 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = isTen ? 2 : 0.6;
    ctx.moveTo(labelMargin, py);
    ctx.lineTo(canvasWidth, py);
    ctx.stroke();

    // Draw ruler number at left margin
    if (isTen && y > 0 && cy < countY) {
      ctx.fillStyle = '#1D231E';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(y.toString(), labelMargin / 2, py);
    }
  }

  return canvas;
}

/**
 * Build complete multi-page PDF for Color Pattern or Symbol Chart
 */
export async function buildPatternPDFDoc(
  pattern: GeneratedPattern,
  mode: 'color' | 'symbol',
  config: PatternConfig,
  patternName: string
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~297 mm
  const margin = 12; // 12 mm margin
  const isStudio = config.planTier === 'studio';

  const modeTitle = mode === 'color' ? 'Full Color Pattern Chart (with Symbols)' : 'Printable Black & White Symbol Chart';

  // --- PAGE 1: DEDICATED FULL CONVERTED IMAGE PREVIEW (MAX POSSIBLE SIZE) ---
  // Header
  if (isStudio) {
    // Studio Plan: Commercial selling rights - NO platform branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(29, 35, 30);
    doc.text(patternName, margin, margin + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 110, 98);
    doc.text(`${modeTitle} (${config.brand} Threads)`, margin, margin + 15);
  } else {
    // Free & Pro Plan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(29, 35, 30);
    doc.text('StitchedMemories', margin, margin + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(224, 108, 56);
    doc.text('Your Photo, Stitched into a Keepsake', margin + 68, margin + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 110, 98);
    doc.text(`${patternName} • ${modeTitle} (${config.brand} Threads)`, margin, margin + 15);
  }

  // Dedicated Max-Size Converted Image Preview Box
  const fullImageCanvas = renderFullPatternCanvas(pattern, mode, config);
  const fullImageDataUrl = fullImageCanvas.toDataURL('image/png');

  const maxPreviewWidth = pageWidth - margin * 2; // 186 mm
  const maxPreviewHeight = pageHeight - margin * 2 - 38; // 235 mm
  const ratio = fullImageCanvas.height / fullImageCanvas.width;

  let previewW = maxPreviewWidth;
  let previewH = previewW * ratio;
  if (previewH > maxPreviewHeight) {
    previewH = maxPreviewHeight;
    previewW = previewH / ratio;
  }

  const previewX = margin + (maxPreviewWidth - previewW) / 2;
  const previewY = margin + 20 + (maxPreviewHeight - previewH) / 2;

  // Background card frame
  doc.setFillColor(250, 246, 238);
  doc.setDrawColor(232, 225, 210);
  doc.roundedRect(margin, margin + 18, maxPreviewWidth, maxPreviewHeight + 4, 3, 3, 'FD');

  // Center high-res converted pattern preview in max size
  doc.addImage(fullImageDataUrl, 'PNG', previewX, previewY, previewW, previewH);

  // Bottom Metadata Bar on Page 1
  const summaryY = pageHeight - margin - 6;
  doc.setFillColor(61, 82, 57);
  doc.rect(margin, summaryY - 4, maxPreviewWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const summaryText = `Grid: ${pattern.widthStitches}x${pattern.heightStitches} sts  |  Fabric: ${config.fabricCount}-Count Aida  |  Size: ${pattern.physicalWidthInches}"x${pattern.physicalHeightInches}" (${Math.round(pattern.physicalWidthInches * 2.54)}x${Math.round(pattern.physicalHeightInches * 2.54)}cm)  |  Threads: ${pattern.flossList.length} ${config.brand} Colors  |  Stitches: ${pattern.totalStitches.toLocaleString()}`;
  doc.text(summaryText, pageWidth / 2, summaryY + 1, { align: 'center' });

  // --- PAGE 2: PATTERN SPECIFICATIONS & FLOSS LEGEND TABLE ---
  doc.addPage();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(29, 35, 30);
  doc.text('Pattern Specifications & Floss Legend', margin, margin + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 110, 98);
  doc.text(`Complete Thread Key for ${patternName} (${pattern.flossList.length} ${config.brand} Colors)`, margin, margin + 15);

  // Metadata Card Box
  const metaX = margin;
  const metaY = margin + 20;
  const metaW = pageWidth - margin * 2;
  const metaH = 28;

  doc.setFillColor(250, 246, 238);
  doc.setDrawColor(232, 225, 210);
  doc.roundedRect(metaX, metaY, metaW, metaH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(29, 35, 30);

  doc.text(`Grid Dimensions: ${pattern.widthStitches} x ${pattern.heightStitches} stitches`, metaX + 6, metaY + 8);
  doc.text(`Fabric: ${config.fabricCount}-Count Aida`, metaX + 95, metaY + 8);

  doc.text(`Finished Size: ${pattern.physicalWidthInches}" x ${pattern.physicalHeightInches}" (${Math.round(pattern.physicalWidthInches * 2.54)} x ${Math.round(pattern.physicalHeightInches * 2.54)} cm)`, metaX + 6, metaY + 17);
  doc.text(`Total Stitches: ${pattern.totalStitches.toLocaleString()}  |  Brand: ${config.brand}`, metaX + 95, metaY + 17);

  // Floss Legend Table
  const startTableY = metaY + metaH + 8;
  const tableRowHeight = 8;
  const colSymbol = margin;
  const colSwatch = margin + 18;
  const colCode = margin + 34;
  const colName = margin + 64;
  const colStitches = margin + 125;
  const colSkeins = margin + 160;

  // Table Header
  doc.setFillColor(61, 82, 57);
  doc.rect(margin, startTableY, pageWidth - margin * 2, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Symbol', colSymbol + 2, startTableY + 5);
  doc.text('Color', colSwatch + 2, startTableY + 5);
  doc.text(`${config.brand} Code`, colCode + 2, startTableY + 5);
  doc.text('Thread Name', colName + 2, startTableY + 5);
  doc.text('Stitches (%)', colStitches + 2, startTableY + 5);
  doc.text('Skeins Needed', colSkeins + 2, startTableY + 5);

  let currentY = startTableY + 7;

  pattern.flossList.forEach((item, index) => {
    if (currentY + tableRowHeight > pageHeight - 15) {
      // Print footer for current page before adding new page
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(120, 130, 118);
      doc.text(getFooterText(config, 'Specifications & Floss Legend', patternName), margin, pageHeight - 8);

      doc.addPage();
      currentY = margin + 10;

      // Repeat Table Header
      doc.setFillColor(61, 82, 57);
      doc.rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('Symbol', colSymbol + 2, currentY + 5);
      doc.text('Color', colSwatch + 2, currentY + 5);
      doc.text(`${config.brand} Code`, colCode + 2, currentY + 5);
      doc.text('Thread Name', colName + 2, currentY + 5);
      doc.text('Stitches (%)', colStitches + 2, currentY + 5);
      doc.text('Skeins Needed', colSkeins + 2, currentY + 5);

      currentY += 7;
    }

    if (index % 2 === 0) {
      doc.setFillColor(250, 246, 238);
      doc.rect(margin, currentY, pageWidth - margin * 2, tableRowHeight, 'F');
    }

    doc.setDrawColor(232, 225, 210);
    doc.line(margin, currentY + tableRowHeight, pageWidth - margin, currentY + tableRowHeight);

    // Symbol Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(item.dmc.symbol, colSymbol + 5, currentY + 5.5);

    // Swatch
    const swatchUrl = createColorSwatchDataUrl(item.dmc.hex);
    doc.addImage(swatchUrl, 'PNG', colSwatch + 2, currentY + 1.5, 5, 5);

    // Code & Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(29, 35, 30);
    const codeText = config.brand === 'Anchor' ? item.dmc.anchorCode : item.dmc.code;
    doc.text(codeText, colCode + 2, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.text(item.dmc.name, colName + 2, currentY + 5);

    // Stitches & Skeins
    doc.text(`${item.stitchCount} sts (${item.percentage}%)`, colStitches + 2, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(224, 108, 56);
    doc.text(`${item.skeinsNeeded} ${item.skeinsNeeded === 1 ? 'skein' : 'skeins'}`, colSkeins + 2, currentY + 5);

    currentY += tableRowHeight;
  });

  // Footer on specifications page
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 118);
  doc.text(getFooterText(config, 'Specifications & Floss Legend', patternName), margin, pageHeight - 8);

  // --- PAGE ARRANGEMENT ORDER MAP PAGE ---
  const chunkSize = 30; // 30 stitches per PDF page section chunk
  const numChunksX = Math.ceil(pattern.widthStitches / chunkSize);
  const numChunksY = Math.ceil(pattern.heightStitches / chunkSize);

  // We add an Arrangement Map Page before the section pages
  doc.addPage();
  const arrangementPageNum = doc.getNumberOfPages();
  const startZoomedPageNum = arrangementPageNum + 1;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(29, 35, 30);
  doc.text('Page Arrangement Order & Section Layout Map', margin, margin + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 110, 98);
  doc.text(
    'Your pattern is divided into high-resolution zoomed grid pages. Use this diagram to guide your stitching sequence:',
    margin,
    margin + 15
  );

  const mapCanvas = renderPageArrangementMapCanvas(
    pattern,
    numChunksX,
    numChunksY,
    chunkSize,
    startZoomedPageNum
  );
  const mapImgData = mapCanvas.toDataURL('image/png');

  const maxMapW = pageWidth - margin * 2;
  const maxMapH = pageHeight - margin * 2 - 35;
  const mapRatio = mapCanvas.height / mapCanvas.width;
  let mapW = maxMapW;
  let mapH = mapW * mapRatio;
  if (mapH > maxMapH) {
    mapH = maxMapH;
    mapW = mapH / mapRatio;
  }

  const mapX = margin + (maxMapW - mapW) / 2;
  const mapY = margin + 22;

  doc.addImage(mapImgData, 'PNG', mapX, mapY, mapW, mapH);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 118);
  doc.text(getFooterText(config, 'Page Layout Map', patternName), margin, pageHeight - 8);
  doc.text(`Page ${arrangementPageNum}`, pageWidth - margin - 15, pageHeight - 8);

  // --- ZOOMED MULTI-PAGE PATTERN GRID SECTIONS ---
  for (let chunkY = 0; chunkY < numChunksY; chunkY++) {
    for (let chunkX = 0; chunkX < numChunksX; chunkX++) {
      doc.addPage();

      const startX = chunkX * chunkSize;
      const startY = chunkY * chunkSize;
      const countX = Math.min(chunkSize, pattern.widthStitches - startX);
      const countY = Math.min(chunkSize, pattern.heightStitches - startY);

      const sectionLabel = `Grid Section (Row ${chunkY + 1}/${numChunksY}, Col ${chunkX + 1}/${numChunksX}) — Stitches ${startX + 1}-${startX + countX} x ${startY + 1}-${startY + countY}`;

      // Page Section Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(29, 35, 30);
      doc.text(patternName, margin, margin + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(224, 108, 56);
      if (isStudio) {
        doc.text(sectionLabel, margin, margin + 12);
      } else {
        doc.text(`${modeTitle} — ${sectionLabel}`, margin, margin + 12);
      }

      // Render section canvas
      const sectionCanvas = renderSubGridCanvas(
        pattern,
        startX,
        startY,
        countX,
        countY,
        mode,
        config
      );

      const imgData = sectionCanvas.toDataURL('image/png');

      const maxDrawWidth = pageWidth - margin * 2;
      const maxDrawHeight = pageHeight - margin * 2 - 25;

      const canvasRatio = sectionCanvas.height / sectionCanvas.width;
      let drawWidth = maxDrawWidth;
      let drawHeight = drawWidth * canvasRatio;

      if (drawHeight > maxDrawHeight) {
        drawHeight = maxDrawHeight;
        drawWidth = drawHeight / canvasRatio;
      }

      const drawX = margin + (maxDrawWidth - drawWidth) / 2;
      const drawY = margin + 16;

      doc.addImage(imgData, 'PNG', drawX, drawY, drawWidth, drawHeight);

      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(120, 130, 118);
      doc.text(getFooterText(config, sectionLabel, patternName), margin, pageHeight - 8);
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin - 15, pageHeight - 8);
    }
  }

  // Apply Free Plan Watermark to ALL pages if on Free plan
  if (config.planTier === 'free') {
    applyFreePlanWatermarkToPDF(doc);
  }

  return doc;
}

/**
 * Generate and download complete multi-page PDF for Color Pattern or Symbol Chart (triggers file download)
 */
export async function exportPatternToPDF(
  pattern: GeneratedPattern,
  mode: 'color' | 'symbol',
  config: PatternConfig,
  patternName: string
): Promise<void> {
  const doc = await buildPatternPDFDoc(pattern, mode, config, patternName);
  const cleanFileName = (patternName || 'pattern').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const fileName = `${cleanFileName}-${mode}-chart.pdf`;

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

/**
 * Generate and open PDF in a browser tab for previewing without downloading
 */
export async function previewPatternPDF(
  pattern: GeneratedPattern,
  mode: 'color' | 'symbol',
  config: PatternConfig,
  patternName: string,
  existingTab?: Window | null
): Promise<void> {
  const doc = await buildPatternPDFDoc(pattern, mode, config, patternName);
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  if (existingTab && !existingTab.closed) {
    existingTab.location.href = blobUrl;
  } else {
    window.open(blobUrl, '_blank');
  }
}

/**
 * Generate PDF as a Blob object for cloud storage uploads
 */
export async function generatePatternPDFBlob(
  pattern: GeneratedPattern,
  mode: 'color' | 'symbol',
  config: PatternConfig,
  patternName: string
): Promise<Blob> {
  const doc = await buildPatternPDFDoc(pattern, mode, config, patternName);
  return doc.output('blob');
}

/**
 * Trigger real file download for remote PDF URL or blob URL
 */
export async function downloadFileFromUrl(url: string, defaultFilename: string): Promise<void> {
  if (!url) return;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP status ${response.status}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    const filename = defaultFilename.endsWith('.pdf') ? defaultFilename : `${defaultFilename}.pdf`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (err) {
    console.warn('[downloadFileFromUrl] Fetch failed, falling back to anchor click:', err);
    const link = document.createElement('a');
    link.href = url;
    const filename = defaultFilename.endsWith('.pdf') ? defaultFilename : `${defaultFilename}.pdf`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
