const PANEL_PREVIEW_FILLS = [
  "rgba(116, 0, 29, 0.050)",
  "rgba(116, 0, 29, 0.075)",
  "rgba(116, 0, 29, 0.100)",
  "rgba(116, 0, 29, 0.125)",
  "rgba(116, 0, 29, 0.085)",
  "rgba(116, 0, 29, 0.060)"
];

function roundValue(value) {
  return Number.parseFloat(Number(value).toFixed(3));
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function linePath(x1, y1, x2, y2) {
  return `M ${roundValue(x1)} ${roundValue(y1)} L ${roundValue(x2)} ${roundValue(y2)}`;
}

function rectPath(x, y, width, height) {
  const x2 = x + width;
  const y2 = y + height;
  return `M ${roundValue(x)} ${roundValue(y)} L ${roundValue(x2)} ${roundValue(y)} L ${roundValue(x2)} ${roundValue(y2)} L ${roundValue(x)} ${roundValue(y2)} Z`;
}

function isClosedPathData(d) {
  return /(?:Z|z)\s*$/.test(String(d || "").trim());
}

function buildSvgLabelText(panel) {
  const layout = panel.labelLayout || {
    text: "",
    x: panel.labelPosition[0],
    y: panel.labelPosition[1],
    fontSize: 6,
    rotationDeg: 0,
    maxWidth: 0,
    lineHeight: 1.2,
    fontFamily: "Arial, sans-serif",
    fontWeight: "700",
    fontStyle: "normal",
    fill: "#333333"
  };
  const text = String(layout.text || panel.displayName || panel.id);
  if (!String(layout.text || "").trim()) {
    return "";
  }
  const lines = text.split("\n");
  const x = roundValue(layout.x);
  const y = roundValue(layout.y);
  const fontSize = roundValue(layout.fontSize || 6);
  const lineHeight = Number(layout.lineHeight) || 1.2;
  const lineStep = fontSize * lineHeight;
  const firstY = y - ((lines.length - 1) * lineStep) / 2;
  const transform = layout.rotationDeg
    ? ` transform="rotate(${roundValue(layout.rotationDeg)} ${x} ${y})"`
    : "";
  const fontFamily = escapeXml(layout.fontFamily || "Arial, sans-serif");
  const fontWeight = escapeXml(layout.fontWeight || "700");
  const fontStyle = escapeXml(layout.fontStyle || "normal");
  const fill = escapeXml(layout.fill || "#333333");
  const tspans = lines.map((line, index) => {
    const lineY = roundValue(firstY + index * lineStep);
    return `<tspan x="${x}" y="${lineY}">${escapeXml(line)}</tspan>`;
  }).join("");
  return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="${fontFamily}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${fill}"${transform} data-label-panel-id="${escapeXml(panel.id)}">${tspans}</text>`;
}

function normalizeArtworkOutlinePaths(outlineSource) {
  if (Array.isArray(outlineSource)) {
    return outlineSource
      .map(entry => {
        if (!entry) {
          return null;
        }
        if (typeof entry === "string") {
          const d = entry.trim();
          return d ? { d, fillRule: null } : null;
        }
        const d = String(entry.d || "").trim();
        return d ? { d, fillRule: entry.fillRule || null } : null;
      })
      .filter(Boolean);
  }
  const d = String(outlineSource || "").trim();
  return d ? [{ d, fillRule: null }] : [];
}

function buildSideArtworkMarkup(artwork, outlineSource) {
  const safeArtwork = artwork || {};
  const parts = [];
  const outlinePaths = normalizeArtworkOutlinePaths(outlineSource);

  if (safeArtwork.fillColor && Number(safeArtwork.fillOpacity ?? 1) > 0) {
    const fillOpacity = roundValue(clamp(Number(safeArtwork.fillOpacity) || 0, 0, 1));
    for (const outlinePath of outlinePaths) {
      const fillRuleAttr = outlinePath.fillRule ? ` fill-rule="${escapeXml(outlinePath.fillRule)}"` : "";
      parts.push(
        `<path d="${escapeXml(outlinePath.d)}" fill="${escapeXml(safeArtwork.fillColor)}" fill-opacity="${fillOpacity}" pointer-events="none"${fillRuleAttr}/>`
      );
    }
  }

  if (safeArtwork.image && safeArtwork.image.dataUrl) {
    const image = safeArtwork.image;
    const x = roundValue(Number(image.x) || 0);
    const y = roundValue(Number(image.y) || 0);
    const width = roundValue(Math.max(0, Number(image.width) || 0));
    const height = roundValue(Math.max(0, Number(image.height) || 0));
    const opacity = roundValue(clamp(Number(image.opacity) || 1, 0, 1));
    const rotationDeg = roundValue(Number(image.rotationDeg) || 0);
    const centerX = roundValue(x + (width / 2));
    const centerY = roundValue(y + (height / 2));
    const transform = rotationDeg ? ` transform="rotate(${rotationDeg} ${centerX} ${centerY})"` : "";
    if (width > 0 && height > 0) {
      parts.push(
        `<image href="${escapeXml(image.dataUrl)}" x="${x}" y="${y}" width="${width}" height="${height}" opacity="${opacity}" preserveAspectRatio="${escapeXml(image.preserveAspectRatio || "xMidYMid meet")}"${transform}/>`
      );
    }
  }

  if (String(safeArtwork.text || "").trim()) {
    const x = roundValue(Number(safeArtwork.x) || 0);
    const y = roundValue(Number(safeArtwork.y) || 0);
    const fontSize = roundValue(Math.max(0.1, Number(safeArtwork.fontSize) || 10));
    const maxWidth = Math.max(0, Number(safeArtwork.maxWidth) || 0);
    const rotationDeg = roundValue(Number(safeArtwork.rotationDeg) || 0);
    const lineHeight = Math.max(0.5, Number(safeArtwork.lineHeight) || 1.2);
    const lines = wrapArtworkTextLines(String(safeArtwork.text), maxWidth, fontSize);
    const lineStep = fontSize * lineHeight;
    const firstY = y - ((lines.length - 1) * lineStep) / 2;
    const transform = rotationDeg ? ` transform="rotate(${rotationDeg} ${x} ${y})"` : "";
    const tspans = lines.map((line, index) => `<tspan x="${x}" y="${roundValue(firstY + index * lineStep)}">${escapeXml(line)}</tspan>`).join("");
    parts.push(
      `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="${escapeXml(safeArtwork.fontFamily || "Arial, sans-serif")}" font-weight="${escapeXml(safeArtwork.fontWeight || "700")}" font-style="${escapeXml(safeArtwork.fontStyle || "normal")}" fill="${escapeXml(safeArtwork.fill || "#ffffff")}" data-artwork-layer-id="text-layer" data-artwork-preview-text="true"${transform}>${tspans}</text>`
    );
  }

  for (const doodle of Array.isArray(safeArtwork.doodles) ? safeArtwork.doodles : []) {
    if (!doodle || !doodle.d) {
      continue;
    }
    parts.push(
      `<path d="${escapeXml(doodle.d)}" fill="none" stroke="${escapeXml(doodle.stroke || "#ffd166")}" stroke-width="${roundValue(Math.max(0.1, Number(doodle.strokeWidth) || 2))}" stroke-opacity="${roundValue(clamp(Number(doodle.opacity) || 1, 0, 1))}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`
    );
  }

  return parts.join("\n");
}

function wrapArtworkTextLines(text, maxWidth = 0, fontSize = 10) {
  const hardLines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const width = Number(maxWidth) || 0;
  if (!(width > 0)) {
    return hardLines;
  }
  const maxChars = Math.max(1, Math.floor(width / Math.max(1, Number(fontSize) || 10) / 0.58));
  const wrapped = [];
  for (const hardLine of hardLines) {
    const words = hardLine.split(/\s+/).filter(Boolean);
    if (!words.length) {
      wrapped.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && candidate.length > maxChars) {
        wrapped.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    wrapped.push(line);
  }
  return wrapped;
}

function getRenderablePanelPath(panel) {
  const renderCutoutD = panel.previewCutoutD || panel.cutoutD || "";
  if (renderCutoutD && isClosedPathData(renderCutoutD)) {
    return {
      d: `${panel.d} ${renderCutoutD}`,
      fillRule: "evenodd"
    };
  }
  return {
    d: panel.d,
    fillRule: null
  };
}

function ensureGeometryOutlineD(geometry) {
  if (!geometry || (typeof geometry.outlineD === "string" && geometry.outlineD.trim())) {
    return geometry;
  }
  const derivedOutlineD = Array.isArray(geometry?.panels)
    ? geometry.panels
      .map(panel => getRenderablePanelPath(panel).d)
      .filter(Boolean)
      .join(" ")
    : "";
  geometry.outlineD = derivedOutlineD;
  return geometry;
}

function buildMetadataJson(template, geometry, dimensions, optionalParameters, sourceFile) {
  ensureGeometryOutlineD(geometry);
  const cutPaths = Array.isArray(geometry.cutPaths) && geometry.cutPaths.length
    ? geometry.cutPaths.map(path => ({ id: path.id, d: path.d, type: path.type || "cut" }))
    : [
        { id: "cut-outline", d: geometry.outlineD, type: "cut" },
        { id: "cut-lock-slit", d: geometry.slitD, type: "cut" },
        { id: "cut-lock-cutout-closed", d: geometry.lockCutoutD, type: "cutout-body" }
      ].filter(path => path.d);

  return {
    schema: "box-template-v1",
    generator: "boxmaker-js-builder-v1",
    template: template.id,
    templateLabel: template.name,
    unit: "mm",
    dimensions,
    optionalParameters,
    viewBox: [0, 0, roundValue(geometry.pageW), roundValue(geometry.pageH)],
    panels: geometry.panels.map(panel => ({
      id: panel.id,
      label: panel.label,
      displayLabel: panel.label,
      displayName: panel.displayName,
      standardName: panel.standardName,
      type: panel.type,
      isGlue: panel.isGlue,
      labelPosition: panel.labelPosition.map(roundValue),
      labelLayout: {
        ...panel.labelLayout,
        x: roundValue(panel.labelLayout.x),
        y: roundValue(panel.labelLayout.y),
        fontSize: roundValue(panel.labelLayout.fontSize),
        rotationDeg: roundValue(panel.labelLayout.rotationDeg || 0),
        maxWidth: roundValue(panel.labelLayout.maxWidth || 0),
        lineHeight: roundValue(panel.labelLayout.lineHeight || 1.2),
        fontFamily: panel.labelLayout.fontFamily || "Arial, sans-serif",
        fontWeight: panel.labelLayout.fontWeight || "700",
        fontStyle: panel.labelLayout.fontStyle || "normal",
        fill: panel.labelLayout.fill || "#333333"
      },
      foldParent: panel.parent,
      foldId: panel.foldId,
      foldAngleDeg: panel.angle,
      path: panel.d,
      pathId: `panel-${panel.id}`,
      clipPathId: `clip-${panel.id}`,
      sourceId: panel.standardName,
      meshD: panel.meshD,
      cutoutD: panel.cutoutD || "",
      slitCutD: panel.slitCutD || "",
      objectId: panel.objectId || "",
      artwork: panel.artwork || null,
      custom3d: panel.custom3d || null
    })),
    folds: geometry.folds.map(fold => ({
      id: fold.id,
      from: fold.from,
      to: fold.to,
      displayName: fold.displayName,
      d: fold.d,
      angleDeg: Number.isFinite(fold.angleDeg) ? roundValue(fold.angleDeg) : 0
    })),
    foldSequence: Array.isArray(geometry.foldSequence) ? [...geometry.foldSequence] : [],
    defaultAssemblySteps: Array.isArray(geometry.defaultAssemblySteps)
      ? geometry.defaultAssemblySteps.map(step => ({ ...step }))
      : [],
    defaultFoldAngles: Object.fromEntries(
      (geometry.folds || [])
        .filter(fold => fold.id)
        .map(fold => [fold.id, Number.isFinite(fold.angleDeg) ? roundValue(fold.angleDeg) : 0])
    ),
    source: {
      file: sourceFile,
      unit: "mm",
      note: "Generated directly from the template JS builder."
    },
    nominalDimensions: {
      lengthMm: roundValue(dimensions.length || 0),
      widthMm: roundValue(dimensions.width || 0),
      heightMm: roundValue(dimensions.height || 0),
      overlapMm: roundValue(dimensions.overlap || 0),
      thumbHoleWidthMm: roundValue(optionalParameters.thumbHoleWidth || 0),
      thumbHoleRoundedCornerMm: roundValue(optionalParameters.thumbHoleRoundedCorner || 0),
      materialThicknessMm: roundValue(optionalParameters.materialThickness || 0),
      roundedCornersRadiusMm: roundValue(optionalParameters.roundedCornersRadius || 0),
      dustFlapSizeMm: roundValue(optionalParameters.dustFlapSize || 0),
      dustFlapAngleDeg: roundValue(optionalParameters.dustFlapAngle || 0)
    },
    custom3d: geometry.custom3d || null,
    templateFeatures: geometry.templateFeatures || null,
    assembledDefaults: geometry.assembledDefaults
      || (geometry.custom3d && geometry.custom3d.camera && geometry.custom3d.camera.foldedState)
      || null,
    floorPanel: geometry.floorPanel,
    assembledFrontPanel: geometry.assembledFrontPanel || "",
    floorPanelsByObject: geometry.floorPanelsByObject || {},
    sideArtwork: geometry.sideArtwork || { outside: null, inside: null },
    glueAreas: geometry.glueAreas.map(area => ({
      id: area.id,
      points: area.points
    })),
    cutPaths
  };
}

function renderStructuredSvg(template, geometry, metadataJson) {
  ensureGeometryOutlineD(geometry);
  const renderablePanels = geometry.panels.map(panel => ({
    panel,
    renderable: getRenderablePanelPath(panel)
  }));
  const outlinePaths = renderablePanels.map(entry => entry.renderable);
  const previewPaths = geometry.panels.map((panel, index) => {
    const renderable = getRenderablePanelPath(panel);
    const fillRuleAttr = renderable.fillRule ? ` fill-rule="${renderable.fillRule}"` : "";
    return `    <path id="preview-${escapeXml(panel.id)}" class="panel-preview" fill="${PANEL_PREVIEW_FILLS[index % PANEL_PREVIEW_FILLS.length]}"${fillRuleAttr} d="${escapeXml(renderable.d)}" />`;
  }).join("\n");
  const clipPaths = geometry.panels.map(panel => {
    const renderable = getRenderablePanelPath(panel);
    const clipRuleAttr = renderable.fillRule ? ` clip-rule="${renderable.fillRule}"` : "";
    return `    <clipPath id="clip-${escapeXml(panel.id)}"><path${clipRuleAttr} d="${escapeXml(renderable.d)}" /></clipPath>`;
  }).join("\n");
  const panelPaths = geometry.panels.map(panel => {
    const renderable = getRenderablePanelPath(panel);
    const fillRuleAttr = renderable.fillRule ? ` fill-rule="${renderable.fillRule}"` : "";
    const objectIdAttr = panel.objectId ? ` data-object-id="${escapeXml(panel.objectId)}"` : "";
    const cutoutAttr = panel.cutoutD ? ` data-panel-cutout-d="${escapeXml(panel.cutoutD)}"` : "";
    const slitCutAttr = panel.slitCutD ? ` data-panel-slit-cut-d="${escapeXml(panel.slitCutD)}"` : "";
    return `    <path id="panel-${escapeXml(panel.id)}" data-box-role="panel" data-panel-id="${escapeXml(panel.id)}" data-panel-type="${escapeXml(panel.type)}" data-panel-standard-name="${escapeXml(panel.standardName)}" data-panel-display-name="${escapeXml(panel.displayName)}" data-panel-is-glue="${panel.isGlue ? "true" : "false"}"${objectIdAttr}${cutoutAttr}${slitCutAttr} data-fold-parent="${escapeXml(panel.parent || "")}" data-fold-id="${escapeXml(panel.foldId || "")}" data-fold-angle-deg="${roundValue(panel.angle)}"${fillRuleAttr} d="${escapeXml(renderable.d)}"/>`;
  }).join("\n");
  const foldPaths = geometry.folds.map(fold =>
    `    <path id="${escapeXml(fold.id)}" data-box-role="fold-line" data-line-type="fold" data-fold-from="${escapeXml(fold.from)}" data-fold-to="${escapeXml(fold.to)}" d="${escapeXml(fold.d)}" />`
  ).join("\n");
  const cutPaths = Array.isArray(geometry.cutPaths) && geometry.cutPaths.length
    ? geometry.cutPaths
    : [
        { id: "cut-outline", d: geometry.outlineD, type: "cut" },
        { id: "cut-lock-slit", d: geometry.slitD, type: "cut" },
        { id: "cut-lock-cutout-closed", d: geometry.lockCutoutD, type: "cutout-body" }
      ].filter(path => path.d);
  const renderedCutPaths = cutPaths.map(path => {
    if ((path.type || "cut") === "cutout-body") {
      return `    <path id="${escapeXml(path.id)}" class="cutout-hatch" data-box-role="cutout-shape" data-line-type="cutout-body" d="${escapeXml(path.d)}" />`;
    }
    return `    <path id="${escapeXml(path.id)}" class="cut-line" data-box-role="cut-line" data-line-type="cut" d="${escapeXml(path.d)}" />`;
  }).join("\n");
  const labels = geometry.panels.map(panel => `    ${buildSvgLabelText(panel)}`).join("\n");
  const metadataText = JSON.stringify(metadataJson, null, 2);
  const outlineClipPaths = outlinePaths.map(renderable => {
    const clipRuleAttr = renderable.fillRule ? ` clip-rule="${renderable.fillRule}"` : "";
    return `      <path${clipRuleAttr} d="${escapeXml(renderable.d)}" />`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Structured_${escapeXml(template.name.replace(/\s+/g, "_"))}_Template"
     xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${roundValue(geometry.pageW)} ${roundValue(geometry.pageH)}"
     width="${roundValue(geometry.pageW)}mm"
     height="${roundValue(geometry.pageH)}mm"
     data-box-app="BoxBuilder"
     data-box-version="1.0"
     data-box-role="template"
     data-template-id="${escapeXml(template.id)}"
     data-unit="mm">
  <title>${escapeXml(template.name)} structured dieline</title>
  <desc>Generated directly from the ${escapeXml(template.id)} template builder.</desc>
  <metadata id="box-template-metadata" type="application/json"><![CDATA[
${metadataText}
  ]]></metadata>

  <defs>
    <clipPath id="clip-model-outline">
${outlineClipPaths}
    </clipPath>
${clipPaths}
    <pattern id="cutoutHatch" patternUnits="userSpaceOnUse" width="2.5" height="2.5" patternTransform="rotate(45)">
      <rect width="2.5" height="2.5" fill="transparent" />
      <line x1="0" y1="0" x2="0" y2="2.5" stroke="#74001D" stroke-width="0.18" />
      <line x1="0" y1="0" x2="2.5" y2="0" stroke="#74001D" stroke-width="0.18" />
    </pattern>
    <pattern id="glueHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="transparent" />
      <line x1="0" y1="0" x2="0" y2="6" stroke="#74001D" stroke-width="1" />
    </pattern>
    <style><![CDATA[
      .cut-line { fill: none; stroke: #74001D; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; shape-rendering: geometricPrecision; }
      .cutout-hatch { fill: url(#cutoutHatch); stroke: #74001D; stroke-width: 1; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
      .fold-line { fill: none; stroke: #00AEEF; stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; shape-rendering: geometricPrecision; }
      .glue-area { fill: url(#glueHatch); stroke: #74001D; stroke-width: 1; vector-effect: non-scaling-stroke; opacity: 0.75; }
      .panel-preview { fill: rgba(116, 0, 29, 0.07); stroke: none; }
      .label { font-family: Arial, sans-serif; font-size: 4mm; fill: #333333; pointer-events: none; }
    ]]></style>
  </defs>

  <g id="panel-preview" data-box-role="panel-preview" visibility="hidden">
${previewPaths}
  </g>

  <g id="dieline" data-box-role="dieline">
${renderedCutPaths}
    <g id="fold-lines" class="fold-line">
${foldPaths}
    </g>
  </g>

  <g id="labels" class="label" data-box-role="labels" visibility="hidden" clip-path="url(#clip-model-outline)">
${labels}
  </g>

  <g id="panels" data-box-role="panels" visibility="hidden">
${panelPaths}
  </g>

  <g id="artwork" data-box-role="artwork" clip-path="url(#clip-model-outline)">
    <g id="artwork-side-outside" data-box-role="artwork-side" data-artwork-side="outside">
      ${buildSideArtworkMarkup(geometry.sideArtwork?.outside, outlinePaths)}
    </g>
    <g id="artwork-side-inside" data-box-role="artwork-side" data-artwork-side="inside">
      ${buildSideArtworkMarkup(geometry.sideArtwork?.inside, outlinePaths)}
    </g>
  </g>
</svg>`;
}

function cloneField(field) {
  return { ...field };
}

function clonePanelDefinition(panel) {
  return { ...panel };
}

function buildFoldDefinitions(panels, foldDisplayNames = {}) {
  const panelMap = new Map(panels.map(panel => [panel.id, panel]));
  const folds = [];
  const seen = new Set();

  for (const panel of panels) {
    if (!panel.foldId || !panel.foldParent || seen.has(panel.foldId)) {
      continue;
    }
    seen.add(panel.foldId);
    const parentPanel = panelMap.get(panel.foldParent);
    const defaultDisplayName = parentPanel
      ? `${parentPanel.displayName} to ${panel.displayName}`
      : panel.foldId;
    folds.push({
      id: panel.foldId,
      from: panel.foldParent,
      to: panel.id,
      displayName: foldDisplayNames[panel.foldId] || defaultDisplayName
    });
  }

  return folds;
}

function buildDefaultFoldAngles(panels) {
  return Object.fromEntries(
    panels
      .filter(panel => panel.foldId && panel.foldParent && Number.isFinite(panel.foldAngleDeg))
      .map(panel => [panel.foldId, panel.foldAngleDeg])
  );
}

function createTemplateBuilder(definition, runtimeConfig) {
  const panels = (definition.panels || []).map(clonePanelDefinition);
  const fieldGroups = definition.fieldGroups || {};
  const folds = Array.isArray(definition.folds)
    ? definition.folds.map(fold => ({ ...fold }))
    : buildFoldDefinitions(panels, definition.foldDisplayNames || {});

  return Object.freeze({
    ...runtimeConfig,
    ...definition,
    defaults: { ...(definition.defaults || {}) },
    featureControls: definition.featureControls ? JSON.parse(JSON.stringify(definition.featureControls)) : null,
    fieldGroups: {
      primary: (fieldGroups.primary || []).map(cloneField),
      optional: (fieldGroups.optional || []).map(cloneField)
    },
    parametricRule: definition.parametricRule ? { ...definition.parametricRule } : null,
    panels,
    folds,
    defaultFoldAngles: {
      ...buildDefaultFoldAngles(panels),
      ...(definition.defaultFoldAngles || {})
    },
    defaultFoldProgress: Number.isFinite(definition.defaultFoldProgress)
      ? definition.defaultFoldProgress
      : 0
  });
}

function createProceduralTemplateBuilder(definition, build) {
  return createTemplateBuilder(definition, {
    id: definition.id,
    mode: "procedural",
    build
  });
}

export {
  buildFoldDefinitions,
  clamp,
  createTemplateBuilder,
  createProceduralTemplateBuilder,
  linePath,
  rectPath,
  renderStructuredSvg,
  buildMetadataJson,
  roundValue
};
