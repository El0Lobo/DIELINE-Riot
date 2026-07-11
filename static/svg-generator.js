import {
  PANEL_DISPLAY_NAMES,
  TEMPLATE_SPECS,
  getTemplateDefinition,
  getTemplateDefaults,
  getTemplateFieldGroups,
  getTemplateFeatureControls as getRegistryTemplateFeatureControls,
  getTemplateParametricRule as getRegistryTemplateParametricRule,
  getTemplateSpec
} from "./template-builders/index.js";
import { getTemplateBuilder } from "./template-builders/index.js";
import { getRenderableArtworkImageDataUrl } from "./artwork-engine.js";

const DEFAULT_TEMPLATE_ID = TEMPLATE_SPECS.length ? TEMPLATE_SPECS[0].id : "";

const PANEL_PREVIEW_FILLS = [
  "rgba(116, 0, 29, 0.050)",
  "rgba(116, 0, 29, 0.075)",
  "rgba(116, 0, 29, 0.100)",
  "rgba(116, 0, 29, 0.125)",
  "rgba(116, 0, 29, 0.085)",
  "rgba(116, 0, 29, 0.060)"
];

const DEFAULT_ARTWORK_DOODLE_COLOR = "#ffbe3b";

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

function getPanelRefinementConfig(refinement, panelId) {
  return refinement && refinement.panels ? refinement.panels[panelId] || null : null;
}

function normalizeLabelText(value, fallback) {
  const text = String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return text.trim() ? text : String(fallback ?? "");
}

function getLabelLayout(panel, refinement, fallbackLabel, defaultFontSize) {
  const config = getPanelRefinementConfig(refinement, panel.id) || {};
  const layout = config.labelLayout || {};
  const defaultPosition = Array.isArray(panel.labelPosition)
    ? panel.labelPosition
    : (Array.isArray(panel.label) ? panel.label : [0, 0]);

  const text = normalizeLabelText(
    layout.text !== undefined ? layout.text : (config.displayName || fallbackLabel),
    fallbackLabel
  );

  return {
    text,
    lines: text.split("\n"),
    x: Number.isFinite(Number(layout.x)) ? Number(layout.x) : (Number(defaultPosition[0]) || 0),
    y: Number.isFinite(Number(layout.y)) ? Number(layout.y) : (Number(defaultPosition[1]) || 0),
    fontSize: Number.isFinite(Number(layout.fontSize)) ? Number(layout.fontSize) : defaultFontSize,
    rotationDeg: Number.isFinite(Number(layout.rotationDeg)) ? Number(layout.rotationDeg) : 0,
    maxWidth: Number.isFinite(Number(layout.maxWidth)) ? Number(layout.maxWidth) : 0,
    lineHeight: Number.isFinite(Number(layout.lineHeight)) ? Number(layout.lineHeight) : 1.2,
    fontFamily: String(layout.fontFamily || "Arial, sans-serif"),
    fontWeight: String(layout.fontWeight || "700"),
    fontStyle: String(layout.fontStyle || "normal"),
    fill: String(layout.fill || "#333333")
  };
}

function buildSvgLabelText(panel, refinement, fallbackLabel, defaultFontSize) {
  const layout = getLabelLayout(panel, refinement, fallbackLabel, defaultFontSize);
  if (!String(layout.text || "").trim()) {
    return "";
  }
  const x = roundValue(layout.x);
  const y = roundValue(layout.y);
  const fontSize = Math.max(0.1, Number(layout.fontSize) || defaultFontSize);
  const lineHeight = Math.max(0.5, Number(layout.lineHeight) || 1.2);
  const lineStep = fontSize * lineHeight;
  const firstY = y - ((layout.lines.length - 1) * lineStep) / 2;
  const transform = layout.rotationDeg
    ? ` transform="rotate(${roundValue(layout.rotationDeg)} ${x} ${y})"`
    : "";
  const widthAttr = layout.maxWidth > 0 ? ` data-label-max-width="${roundValue(layout.maxWidth)}"` : "";
  const fontFamilyAttr = ` font-family="${escapeXml(layout.fontFamily || "Arial, sans-serif")}"`;
  const fontWeightAttr = ` font-weight="${escapeXml(layout.fontWeight || "700")}"`;
  const fontStyleAttr = ` font-style="${escapeXml(layout.fontStyle || "normal")}"`;
  const fillAttr = ` fill="${escapeXml(layout.fill || "#333333")}"`;
  const tspans = layout.lines.map((line, index) => {
    const lineY = roundValue(firstY + index * lineStep);
    return `<tspan x="${x}" y="${lineY}">${escapeXml(line)}</tspan>`;
  }).join("");

  return `<text data-label-panel-id="${escapeXml(panel.id)}" x="${x}" y="${y}" font-size="${roundValue(fontSize)}" text-anchor="middle" dominant-baseline="middle"${fontFamilyAttr}${fontWeightAttr}${fontStyleAttr}${fillAttr}${transform}${widthAttr}>${tspans}</text>`;
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
  if (!artwork) {
    return "";
  }
  const parts = [];
  const outlinePaths = normalizeArtworkOutlinePaths(outlineSource);
  const images = Array.isArray(artwork.images) && artwork.images.length
    ? artwork.images
    : (artwork.image ? [artwork.image] : []);
  const doodles = Array.isArray(artwork.doodles) ? artwork.doodles.filter(doodle => doodle && doodle.d) : [];
  const imageMap = new Map(images.filter(image => image?.dataUrl).map(image => [String(image.id || ""), image]));
  const doodleMap = new Map(doodles.map((doodle, index) => [String(doodle.id || `doodle-${index + 1}`), doodle]));
  const validLayerIds = ["text-layer", ...images.filter(image => image?.dataUrl).map(image => String(image.id || "")), ...doodles.map((doodle, index) => String(doodle.id || `doodle-${index + 1}`))];
  const layerOrder = Array.isArray(artwork.layerOrder) ? artwork.layerOrder.map(id => String(id || "")) : validLayerIds;
  if (artwork.fillColor && Number(artwork.fillOpacity ?? 1) > 0) {
    const fillOpacity = roundValue(Math.max(0, Math.min(1, Number(artwork.fillOpacity) || 0)));
    for (const outlinePath of outlinePaths) {
      const fillRuleAttr = outlinePath.fillRule ? ` fill-rule="${escapeXml(outlinePath.fillRule)}"` : "";
      parts.push(
        `<path d="${escapeXml(outlinePath.d)}" fill="${escapeXml(artwork.fillColor)}" fill-opacity="${fillOpacity}" pointer-events="none"${fillRuleAttr}/>`
      );
    }
  }
  for (const layerId of layerOrder) {
    if (layerId === "text-layer" && String(artwork.text || "").trim()) {
      const x = roundValue(Number(artwork.x) || 0);
      const y = roundValue(Number(artwork.y) || 0);
      const fontSize = roundValue(Math.max(0.1, Number(artwork.fontSize) || 10));
      const lineHeight = Math.max(0.5, Number(artwork.lineHeight) || 1.2);
      const lines = String(artwork.text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
      const lineStep = fontSize * lineHeight;
      const firstY = y - ((lines.length - 1) * lineStep) / 2;
      const rotationDeg = roundValue(Number(artwork.rotationDeg) || 0);
      const transform = rotationDeg ? ` transform="rotate(${rotationDeg} ${x} ${y})"` : "";
      const tspans = lines.map((line, index) => `<tspan x="${x}" y="${roundValue(firstY + index * lineStep)}">${escapeXml(line)}</tspan>`).join("");
      parts.push(
        `<text data-artwork-layer-id="text-layer" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="${escapeXml(artwork.fontFamily || "Arial, sans-serif")}" font-weight="${escapeXml(artwork.fontWeight || "700")}" font-style="${escapeXml(artwork.fontStyle || "normal")}" fill="${escapeXml(artwork.fill || "#333333")}" fill-opacity="${roundValue(Math.max(0, Math.min(1, Number(artwork.textOpacity) || 1)))}"${transform}>${tspans}</text>`
      );
      continue;
    }
    if (imageMap.has(layerId)) {
      const image = imageMap.get(layerId);
      const x = roundValue(Number(image.x) || 0);
      const y = roundValue(Number(image.y) || 0);
      const width = roundValue(Math.max(0, Number(image.width) || 0));
      const height = roundValue(Math.max(0, Number(image.height) || 0));
      const opacity = roundValue(Math.max(0, Math.min(1, Number(image.opacity) || 1)));
      const rotationDeg = roundValue(Number(image.rotationDeg) || 0);
      const centerX = roundValue(x + (width / 2));
      const centerY = roundValue(y + (height / 2));
      const transform = rotationDeg ? ` transform="rotate(${rotationDeg} ${centerX} ${centerY})"` : "";
      if (width > 0 && height > 0) {
        parts.push(
          `<image data-artwork-layer-id="${escapeXml(layerId)}" href="${escapeXml(getRenderableArtworkImageDataUrl(image))}" x="${x}" y="${y}" width="${width}" height="${height}" opacity="${opacity}" preserveAspectRatio="${escapeXml(image.preserveAspectRatio || "xMidYMid meet")}"${transform}/>`
        );
      }
      continue;
    }
    if (doodleMap.has(layerId)) {
      const doodle = doodleMap.get(layerId);
      parts.push(
        `<path data-artwork-layer-id="${escapeXml(layerId)}" d="${escapeXml(doodle.d)}" fill="none" stroke="${escapeXml(doodle.stroke || DEFAULT_ARTWORK_DOODLE_COLOR)}" stroke-width="${roundValue(Math.max(0.1, Number(doodle.strokeWidth) || 2))}" stroke-opacity="${roundValue(Math.max(0, Math.min(1, Number(doodle.opacity) || 1)))}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`
      );
    }
  }
  return parts.join("");
}

function buildCustomFontFaceCss(customFonts = {}) {
  return Object.values(customFonts)
    .filter(font => font && font.family && font.dataUrl)
    .map(font => `@font-face { font-family: '${String(font.family).replace(/'/g, "\\'")}'; src: url(${font.dataUrl}) format('${font.format || "truetype"}'); }`)
    .join("\n");
}

function getActiveSideArtwork(refinement, side) {
  return refinement && refinement.sideArtwork ? refinement.sideArtwork[side] || null : null;
}

function getTemplateFeatureSettings(refinement, templateFeatures) {
  const settingsKey = String(templateFeatures?.settingsKey || "").trim();
  if (!settingsKey) {
    return {};
  }
  return refinement && refinement.templateSettings && refinement.templateSettings[settingsKey]
    ? refinement.templateSettings[settingsKey]
    : {};
}

function ensureTemplateFeatureDefs(doc, templateFeatures) {
  const defsNode = doc.querySelector("defs");
  const gradients = Array.isArray(templateFeatures?.defs?.gradients) ? templateFeatures.defs.gradients : [];
  if (!defsNode || !gradients.length) {
    return;
  }
  for (const gradientDef of gradients) {
    const gradientId = String(gradientDef?.id || "").trim();
    if (!gradientId || doc.getElementById(gradientId)) {
      continue;
    }
    const gradient = doc.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    gradient.setAttribute("id", gradientId);
    gradient.setAttribute("x1", String(gradientDef.x1 ?? 0));
    gradient.setAttribute("y1", String(gradientDef.y1 ?? 0));
    gradient.setAttribute("x2", String(gradientDef.x2 ?? 1));
    gradient.setAttribute("y2", String(gradientDef.y2 ?? 0));
    for (const stopDef of Array.isArray(gradientDef.stops) ? gradientDef.stops : []) {
      const stop = doc.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop.setAttribute("offset", String(stopDef.offset ?? 0));
      stop.setAttribute("stop-color", String(stopDef.color || "#000000"));
      gradient.appendChild(stop);
    }
    defsNode.appendChild(gradient);
  }
}

function normalizeTemplateFeatureRect(feature, surfaceRect) {
  if (!feature || !surfaceRect) {
    return null;
  }
  const localX = Math.max(0, Math.min(Number(feature.x) || 0, Number(surfaceRect.width) || 0));
  const localY = Math.max(0, Math.min(Number(feature.y) || 0, Number(surfaceRect.height) || 0));
  const width = Math.max(0.1, Math.min(Number(feature.width) || 0, Math.max(0.1, (Number(surfaceRect.width) || 0) - localX)));
  const height = Math.max(0.1, Math.min(Number(feature.height) || 0, Math.max(0.1, (Number(surfaceRect.height) || 0) - localY)));
  return {
    enabled: feature.enabled !== false,
    x: roundValue((Number(surfaceRect.x) || 0) + localX),
    y: roundValue((Number(surfaceRect.y) || 0) + localY),
    width: roundValue(width),
    height: roundValue(height)
  };
}

function getTemplateFeatureSvgPaint(paint) {
  if (paint && typeof paint === "object" && paint.type === "gradient" && paint.id) {
    return `url(#${escapeXml(paint.id)})`;
  }
  return escapeXml(paint || "none");
}

function buildTemplateFeatureElementMarkup(element) {
  if (!element || !element.type) {
    return "";
  }
  const opacityAttr = element.opacity !== undefined ? ` opacity="${roundValue(element.opacity)}"` : "";
  if (element.type === "rect") {
    const rxAttr = element.rx !== undefined ? ` rx="${roundValue(element.rx)}"` : "";
    const strokeAttr = element.stroke ? ` stroke="${escapeXml(element.stroke)}"` : "";
    const strokeWidthAttr = element.strokeWidth !== undefined ? ` stroke-width="${roundValue(element.strokeWidth)}"` : "";
    return `<rect x="${roundValue(element.x || 0)}" y="${roundValue(element.y || 0)}" width="${roundValue(element.width || 0)}" height="${roundValue(element.height || 0)}"${rxAttr} fill="${getTemplateFeatureSvgPaint(element.fill)}"${strokeAttr}${strokeWidthAttr}${opacityAttr}/>`;
  }
  if (element.type === "path") {
    const strokeAttr = element.stroke ? ` stroke="${escapeXml(element.stroke)}"` : "";
    const strokeWidthAttr = element.strokeWidth !== undefined ? ` stroke-width="${roundValue(element.strokeWidth)}"` : "";
    return `<path d="${escapeXml(element.d || "")}" fill="${getTemplateFeatureSvgPaint(element.fill)}"${strokeAttr}${strokeWidthAttr}${opacityAttr}/>`;
  }
  return "";
}

function buildTemplateFeatureMarkup(feature, rect) {
  if (!feature || !rect || rect.enabled === false) {
    return "";
  }
  const baseWidth = Math.max(0.0001, Number(feature.baseWidth) || 1);
  const baseHeight = Math.max(0.0001, Number(feature.baseHeight) || 1);
  const scaleX = rect.width / baseWidth;
  const scaleY = rect.height / baseHeight;
  const elements = (Array.isArray(feature.elements) ? feature.elements : [])
    .map(buildTemplateFeatureElementMarkup)
    .join("");
  if (!elements) {
    return "";
  }
  return `<g data-box-role="template-feature" data-feature-id="${escapeXml(feature.id || "")}" transform="translate(${rect.x} ${rect.y}) scale(${roundValue(scaleX)} ${roundValue(scaleY)})" pointer-events="none">${elements}</g>`;
}

function applyTemplateFeatureMarkup(doc, refinement, metadata) {
  const templateFeatures = metadata?.templateFeatures || null;
  const sides = templateFeatures?.sides || null;
  if (!templateFeatures || !sides) {
    return;
  }
  const surfaceRect = metadata && Array.isArray(metadata.panels)
    ? metadata.panels[0]?.custom3d?.surfaceRect || null
    : null;
  if (!surfaceRect) {
    return;
  }
  ensureTemplateFeatureDefs(doc, templateFeatures);
  const featureSettings = getTemplateFeatureSettings(refinement, templateFeatures);
  const outsideArtworkNode = doc.getElementById("artwork-side-outside");
  const insideArtworkNode = doc.getElementById("artwork-side-inside");
  if (outsideArtworkNode) {
    const markup = (Array.isArray(sides.outside) ? sides.outside : [])
      .map(feature => buildTemplateFeatureMarkup(
        feature,
        normalizeTemplateFeatureRect({ ...feature, ...(featureSettings[feature.id] || {}) }, surfaceRect)
      ))
      .join("");
    outsideArtworkNode.insertAdjacentHTML("beforeend", markup);
  }
  if (insideArtworkNode) {
    const markup = (Array.isArray(sides.inside) ? sides.inside : [])
      .map(feature => buildTemplateFeatureMarkup(
        feature,
        normalizeTemplateFeatureRect({ ...feature, ...(featureSettings[feature.id] || {}) }, surfaceRect)
      ))
      .join("");
    insideArtworkNode.insertAdjacentHTML("beforeend", markup);
  }
}

function getStructuralParamKeys(templateId) {
  return [...getTemplateFieldGroups(templateId).primary, ...getTemplateFieldGroups(templateId).optional]
    .filter(field => field.kind === "length" && !["T", "R", "TR"].includes(field.key))
    .map(field => field.key);
}

function getTemplateParametricRule(templateId) {
  return getRegistryTemplateParametricRule(templateId) || null;
}

function getTemplateFeatureControls(templateId) {
  return getRegistryTemplateFeatureControls(templateId) || null;
}

function buildTemplatePanelDefinitionMap(templateId) {
  const template = getTemplateDefinition(templateId);
  return new Map((template.panels || []).map(panel => [panel.id, panel]));
}

function buildTemplateFoldDefinitionMap(templateId) {
  const template = getTemplateDefinition(templateId);
  return new Map((template.folds || []).map(fold => [fold.id, fold]));
}

function parseNumericLength(value) {
  const match = String(value || "").match(/-?\d*\.?\d+/);
  return match ? Number.parseFloat(match[0]) || 0 : 0;
}

function extractLengthUnit(value) {
  const match = String(value || "").match(/[a-z%]+$/i);
  return match ? match[0] : "";
}

function dedupeSortedNumbers(values, tolerance = 0.5) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  const output = [];
  for (const value of sorted) {
    if (!output.length || Math.abs(output[output.length - 1] - value) > tolerance) {
      output.push(value);
    }
  }
  return output;
}

function collectAxisBreakpoints(doc) {
  const xValues = [];
  const yValues = [];
  const pathNodes = Array.from(doc.querySelectorAll('[data-box-role="panel"], [data-box-role="fold-line"], [data-box-role="cut-line"], [data-box-role="cutout-shape"]'));

  for (const pathNode of pathNodes) {
    const d = pathNode.getAttribute("d");
    if (!d) continue;
    const box = getPathBBox(d);
    xValues.push(box.minX, box.maxX);
    yValues.push(box.minY, box.maxY);
  }

  const root = doc.documentElement;
  if (root && root.viewBox && root.viewBox.baseVal) {
    xValues.push(root.viewBox.baseVal.x, root.viewBox.baseVal.x + root.viewBox.baseVal.width);
    yValues.push(root.viewBox.baseVal.y, root.viewBox.baseVal.y + root.viewBox.baseVal.height);
  }

  return {
    x: dedupeSortedNumbers(xValues),
    y: dedupeSortedNumbers(yValues)
  };
}

function getAxisIntervals(breakpoints) {
  const intervals = [];
  for (let index = 0; index < breakpoints.length - 1; index += 1) {
    const start = breakpoints[index];
    const end = breakpoints[index + 1];
    const length = end - start;
    if (length > 0.5) {
      intervals.push({ start, end, length });
    }
  }
  return intervals;
}

function estimateTemplateUnitScale(intervals, defaults, candidateKeys) {
  const buckets = new Map();
  for (const interval of intervals) {
    for (const key of candidateKeys) {
      const defaultValue = Number(defaults[key]);
      if (!Number.isFinite(defaultValue) || defaultValue <= 0) continue;
      const ratio = interval.length / defaultValue;
      if (!Number.isFinite(ratio) || ratio <= 0) continue;
      const bucket = Math.round(ratio * 20) / 20;
      const current = buckets.get(bucket) || { score: 0, weighted: 0 };
      current.score += interval.length;
      current.weighted += ratio * interval.length;
      buckets.set(bucket, current);
    }
  }

  let bestBucket = null;
  let bestScore = -1;
  for (const [bucket, entry] of buckets.entries()) {
    if (entry.score > bestScore) {
      bestBucket = bucket;
      bestScore = entry.score;
    }
  }

  if (bestBucket === null) {
    return 1;
  }
  const best = buckets.get(bestBucket);
  return best && best.score ? best.weighted / best.score : bestBucket;
}

function buildAxisWarp(breakpoints, params, defaults, candidateKeys, explicitIntervalMap = null) {
  const intervals = getAxisIntervals(breakpoints);
  const unitScale = estimateTemplateUnitScale(intervals, defaults, candidateKeys);
  const nextBreakpoints = [breakpoints[0] || 0];
  const intervalAssignments = [];

  for (const [intervalIndex, interval] of intervals.entries()) {
    let matchedKey = "";
    let matchedTargetLength = interval.length;
    let bestError = Number.POSITIVE_INFINITY;

    const explicitRule = explicitIntervalMap && explicitIntervalMap[intervalIndex];
    const explicitKey = typeof explicitRule === "string" ? explicitRule : (explicitRule && explicitRule.key) || "";
    const explicitMode = explicitRule && typeof explicitRule === "object" ? explicitRule.mode || "scale" : "scale";
    if (explicitKey) {
      const defaultValue = Number(defaults[explicitKey]);
      const nextValue = Number(params[explicitKey]);
      if (Number.isFinite(defaultValue) && defaultValue > 0 && Number.isFinite(nextValue) && nextValue >= 0) {
        matchedKey = explicitKey;
        matchedTargetLength = explicitMode === "absolute"
          ? nextValue * unitScale
          : interval.length * (nextValue / defaultValue);
        bestError = 0;
      }
    }

    if (!explicitKey) {
      for (const key of candidateKeys) {
        const defaultValue = Number(defaults[key]);
        const nextValue = Number(params[key]);
        if (!Number.isFinite(defaultValue) || defaultValue <= 0 || !Number.isFinite(nextValue) || nextValue <= 0) {
          continue;
        }
        const expectedLength = defaultValue * unitScale;
        const error = Math.abs(interval.length - expectedLength) / Math.max(1, expectedLength);
        if (error < bestError) {
          bestError = error;
          matchedKey = key;
          matchedTargetLength = nextValue * unitScale;
        }
      }
    }

    if (bestError > 0.24) {
      matchedKey = "";
      matchedTargetLength = interval.length;
    }

    intervalAssignments.push({
      ...interval,
      paramKey: matchedKey,
      targetLength: matchedTargetLength
    });
    nextBreakpoints.push(nextBreakpoints[nextBreakpoints.length - 1] + matchedTargetLength);
  }

  function scaleAt(value) {
    const assignment = intervalAssignments.find(interval => value >= interval.start && value <= interval.end);
    if (!assignment) {
      return 1;
    }
    return assignment.targetLength / Math.max(1e-6, assignment.length);
  }

  function warp(value) {
    if (!Number.isFinite(value) || !intervalAssignments.length) {
      return value;
    }
    if (value <= intervalAssignments[0].start) {
      return nextBreakpoints[0] + (value - intervalAssignments[0].start);
    }
    for (let index = 0; index < intervalAssignments.length; index += 1) {
      const assignment = intervalAssignments[index];
      if (value <= assignment.end || index === intervalAssignments.length - 1) {
        const ratio = (value - assignment.start) / Math.max(1e-6, assignment.length);
        return nextBreakpoints[index] + ratio * assignment.targetLength;
      }
    }
    const last = intervalAssignments[intervalAssignments.length - 1];
    return nextBreakpoints[nextBreakpoints.length - 1] + (value - last.end);
  }

  return {
    breakpoints,
    nextBreakpoints,
    intervals: intervalAssignments,
    warp,
    scaleAt
  };
}

function buildAnchoredIntervalWarp({ breakpoints, targetLengths, anchoredStartIndices = [] }) {
  const intervals = getAxisIntervals(breakpoints);
  const nextBreakpoints = [...breakpoints];
  const anchoredStarts = new Set(anchoredStartIndices);

  for (let index = 0; index < intervals.length; index += 1) {
    const interval = intervals[index];
    const targetLength = Number.isFinite(targetLengths[index]) ? targetLengths[index] : interval.length;
    if (anchoredStarts.has(index)) {
      nextBreakpoints[index] = nextBreakpoints[index + 1] - targetLength;
    } else {
      nextBreakpoints[index + 1] = nextBreakpoints[index] + targetLength;
    }
  }

  function scaleAt(value) {
    const intervalIndex = intervals.findIndex(interval => value >= interval.start && value <= interval.end);
    if (intervalIndex < 0) {
      return 1;
    }
    return targetLengths[intervalIndex] / Math.max(1e-6, intervals[intervalIndex].length);
  }

  function warp(value) {
    if (!Number.isFinite(value) || !intervals.length) {
      return value;
    }
    if (value <= intervals[0].start) {
      return nextBreakpoints[0] + (value - intervals[0].start);
    }
    for (let index = 0; index < intervals.length; index += 1) {
      const interval = intervals[index];
      if (value <= interval.end || index === intervals.length - 1) {
        const ratio = (value - interval.start) / Math.max(1e-6, interval.length);
        return nextBreakpoints[index] + ratio * targetLengths[index];
      }
    }
    const last = intervals[intervals.length - 1];
    return nextBreakpoints[nextBreakpoints.length - 1] + (value - last.end);
  }

  return {
    breakpoints,
    nextBreakpoints,
    intervals: intervals.map((interval, index) => ({
      ...interval,
      targetLength: targetLengths[index]
    })),
    warp,
    scaleAt
  };
}

function tokenizePathData(d) {
  return String(d || "").match(/[AaCcHhLlMmQqSsTtVvZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
}

function absolutizePathData(d) {
  const tokens = tokenizePathData(d);
  const commands = [];
  const paramCounts = {
    M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0
  };
  let index = 0;
  let command = "";
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[AaCcHhLlMmQqSsTtVvZz]$/.test(token)) {
      command = token;
      index += 1;
      if (command === "Z" || command === "z") {
        commands.push({ cmd: "Z", values: [] });
        currentX = startX;
        currentY = startY;
      }
      continue;
    }
    if (!command) {
      break;
    }

    const upper = command.toUpperCase();
    const isRelative = command !== upper;
    const paramCount = paramCounts[upper];
    if (!paramCount) {
      break;
    }
    if (index + paramCount > tokens.length) {
      break;
    }

    const values = tokens.slice(index, index + paramCount).map(value => Number(value));
    index += paramCount;

    if (upper === "M") {
      const x = isRelative ? currentX + values[0] : values[0];
      const y = isRelative ? currentY + values[1] : values[1];
      commands.push({ cmd: "M", values: [x, y] });
      currentX = x;
      currentY = y;
      startX = x;
      startY = y;
      command = isRelative ? "l" : "L";
      continue;
    }

    if (upper === "L") {
      const x = isRelative ? currentX + values[0] : values[0];
      const y = isRelative ? currentY + values[1] : values[1];
      commands.push({ cmd: "L", values: [x, y] });
      currentX = x;
      currentY = y;
      continue;
    }

    if (upper === "H") {
      const x = isRelative ? currentX + values[0] : values[0];
      commands.push({ cmd: "H", values: [x] });
      currentX = x;
      continue;
    }

    if (upper === "V") {
      const y = isRelative ? currentY + values[0] : values[0];
      commands.push({ cmd: "V", values: [y] });
      currentY = y;
      continue;
    }

    if (upper === "C") {
      const x1 = isRelative ? currentX + values[0] : values[0];
      const y1 = isRelative ? currentY + values[1] : values[1];
      const x2 = isRelative ? currentX + values[2] : values[2];
      const y2 = isRelative ? currentY + values[3] : values[3];
      const x = isRelative ? currentX + values[4] : values[4];
      const y = isRelative ? currentY + values[5] : values[5];
      commands.push({ cmd: "C", values: [x1, y1, x2, y2, x, y] });
      currentX = x;
      currentY = y;
      continue;
    }

    if (upper === "S") {
      const x2 = isRelative ? currentX + values[0] : values[0];
      const y2 = isRelative ? currentY + values[1] : values[1];
      const x = isRelative ? currentX + values[2] : values[2];
      const y = isRelative ? currentY + values[3] : values[3];
      commands.push({ cmd: "S", values: [x2, y2, x, y] });
      currentX = x;
      currentY = y;
      continue;
    }

    if (upper === "Q") {
      const x1 = isRelative ? currentX + values[0] : values[0];
      const y1 = isRelative ? currentY + values[1] : values[1];
      const x = isRelative ? currentX + values[2] : values[2];
      const y = isRelative ? currentY + values[3] : values[3];
      commands.push({ cmd: "Q", values: [x1, y1, x, y] });
      currentX = x;
      currentY = y;
      continue;
    }

    if (upper === "T") {
      const x = isRelative ? currentX + values[0] : values[0];
      const y = isRelative ? currentY + values[1] : values[1];
      commands.push({ cmd: "T", values: [x, y] });
      currentX = x;
      currentY = y;
      continue;
    }

    if (upper === "A") {
      const x = isRelative ? currentX + values[5] : values[5];
      const y = isRelative ? currentY + values[6] : values[6];
      commands.push({ cmd: "A", values: [values[0], values[1], values[2], values[3], values[4], x, y] });
      currentX = x;
      currentY = y;
    }
  }

  return commands;
}

function formatPathData(commands) {
  return commands.map(command => {
    if (command.cmd === "Z") {
      return "Z";
    }
    return `${command.cmd} ${command.values.map(value => roundValue(value)).join(" ")}`;
  }).join(" ");
}

function warpPathData(d, warpX, warpY, scaleXAt, scaleYAt) {
  const commands = absolutizePathData(d).map(command => {
    if (command.cmd === "M" || command.cmd === "L" || command.cmd === "T") {
      return {
        cmd: command.cmd,
        values: [warpX(command.values[0]), warpY(command.values[1])]
      };
    }
    if (command.cmd === "H") {
      return {
        cmd: "H",
        values: [warpX(command.values[0])]
      };
    }
    if (command.cmd === "V") {
      return {
        cmd: "V",
        values: [warpY(command.values[0])]
      };
    }
    if (command.cmd === "C") {
      return {
        cmd: "C",
        values: [
          warpX(command.values[0]), warpY(command.values[1]),
          warpX(command.values[2]), warpY(command.values[3]),
          warpX(command.values[4]), warpY(command.values[5])
        ]
      };
    }
    if (command.cmd === "S") {
      return {
        cmd: "S",
        values: [
          warpX(command.values[0]), warpY(command.values[1]),
          warpX(command.values[2]), warpY(command.values[3])
        ]
      };
    }
    if (command.cmd === "Q") {
      return {
        cmd: "Q",
        values: [
          warpX(command.values[0]), warpY(command.values[1]),
          warpX(command.values[2]), warpY(command.values[3])
        ]
      };
    }
    if (command.cmd === "A") {
      const endX = command.values[5];
      const endY = command.values[6];
      return {
        cmd: "A",
        values: [
          command.values[0] * scaleXAt(endX),
          command.values[1] * scaleYAt(endY),
          command.values[2],
          command.values[3],
          command.values[4],
          warpX(endX),
          warpY(endY)
        ]
      };
    }
    return command;
  });

  return formatPathData(commands);
}

function warpPoints(points, warpX, warpY) {
  return String(points || "")
    .trim()
    .split(/\s+/)
    .map(pair => {
      const [x, y] = pair.split(",").map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return pair;
      }
      return `${roundValue(warpX(x))},${roundValue(warpY(y))}`;
    })
    .join(" ");
}

function updateTemplateMetadataDimensions(metadata, params, templateId) {
  const template = getTemplateDefinition(templateId);
  if (metadata.dimensions) {
    const mapping = template.metadataDimensionMap || {};

    for (const [paramKey, metadataKey] of Object.entries(mapping)) {
      if (Number.isFinite(params[paramKey])) {
        metadata.dimensions[metadataKey] = roundValue(params[paramKey]);
      }
    }
  }

  if (metadata.optionalParameters) {
    const mapping = {
      TH: "thumbHoleWidth",
      TUCK: "tuckFlapSize",
      GLUE: "glueFlapSize",
      DUST: "dustFlapSize",
      ROOFH: "roofHeight",
      TOPFLAP: "topFlap",
      FRONT: "front",
      O: "overlap",
      TR: "thumbHoleRoundedCorner"
    };
    for (const [paramKey, metadataKey] of Object.entries(mapping)) {
      if (Number.isFinite(params[paramKey]) && metadata.optionalParameters[metadataKey] !== undefined) {
        metadata.optionalParameters[metadataKey] = roundValue(params[paramKey]);
      }
    }
  }

  if (metadata.nominalDimensions) {
    const mapping = {
      L: "lengthMm",
      W: "widthMm",
      H: "heightMm",
      O: "overlapMm",
      DUST: "dustFlapSizeMm",
      GLUE: "glueFlapSizeMm",
      TH: "thumbHoleWidthMm",
      TUCK: "tuckFlapSizeMm",
      ROOFH: "roofHeightMm",
      TOPFLAP: "topFlapMm",
      FRONT: "frontMm",
      LIDH: "lidHeightMm"
    };
    for (const [paramKey, metadataKey] of Object.entries(mapping)) {
      if (Number.isFinite(params[paramKey]) && metadata.nominalDimensions[metadataKey] !== undefined) {
        metadata.nominalDimensions[metadataKey] = roundValue(params[paramKey]);
      }
    }
  }
}

function buildParametricStructuredSvg(svgText, templateId, params) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const sourceDoc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const template = getTemplateDefinition(templateId);
  const defaults = getTemplateDefaults(templateId);
  const fallbackKeys = getStructuralParamKeys(templateId);
  const rule = getTemplateParametricRule(templateId);
  const xKeys = rule && Array.isArray(rule.xKeys) && rule.xKeys.length ? rule.xKeys : fallbackKeys;
  const yKeys = rule && Array.isArray(rule.yKeys) && rule.yKeys.length ? rule.yKeys : fallbackKeys;
  const xIntervals = rule && rule.xIntervals ? rule.xIntervals : null;
  const yIntervals = rule && rule.yIntervals ? rule.yIntervals : null;
  if (!xKeys.length && !yKeys.length) {
    return svgText;
  }

  const sourcePanelBoxes = new Map();
  for (const panelNode of Array.from(sourceDoc.querySelectorAll('[data-box-role="panel"]'))) {
    const panelId = panelNode.getAttribute("data-panel-id");
    const d = panelNode.getAttribute("d");
    if (!panelId || !d) {
      continue;
    }
    try {
      sourcePanelBoxes.set(panelId, getPathBBox(d));
    } catch (_error) {
      // Ignore panels that cannot be measured in the source SVG.
    }
  }

  const sourceLabelPositions = new Map();
  for (const textNode of Array.from(sourceDoc.querySelectorAll("text"))) {
    const panelId = textNode.getAttribute("data-label-panel-id");
    if (!panelId) {
      continue;
    }
    const x = Number.parseFloat(textNode.getAttribute("x") || "0") || 0;
    const y = Number.parseFloat(textNode.getAttribute("y") || "0") || 0;
    sourceLabelPositions.set(panelId, { x, y });
  }

  let xWarp;
  let yWarp;
  if (template && typeof template.parametricWarpBuilder === "function") {
    ({ xWarp, yWarp } = template.parametricWarpBuilder(params, defaults, rule));
  } else {
    const discoveredBreakpoints = collectAxisBreakpoints(doc);
    const xBreakpoints = rule && Array.isArray(rule.xBreakpoints) && rule.xBreakpoints.length ? rule.xBreakpoints : discoveredBreakpoints.x;
    const yBreakpoints = rule && Array.isArray(rule.yBreakpoints) && rule.yBreakpoints.length ? rule.yBreakpoints : discoveredBreakpoints.y;
    xWarp = buildAxisWarp(xBreakpoints, params, defaults, xKeys, xIntervals);
    yWarp = buildAxisWarp(yBreakpoints, params, defaults, yKeys, yIntervals);
  }

  const pathNodes = Array.from(doc.querySelectorAll("path"));
  for (const pathNode of pathNodes) {
    const d = pathNode.getAttribute("d");
    if (!d) continue;
    pathNode.setAttribute("d", warpPathData(d, xWarp.warp, yWarp.warp, xWarp.scaleAt, yWarp.scaleAt));
  }

  const polygonNodes = Array.from(doc.querySelectorAll("polygon, polyline"));
  for (const polygonNode of polygonNodes) {
    const points = polygonNode.getAttribute("points");
    if (!points) continue;
    polygonNode.setAttribute("points", warpPoints(points, xWarp.warp, yWarp.warp));
  }

  const panelNodes = Array.from(doc.querySelectorAll('[data-box-role="panel"]'));

  const warpedPanelBoxes = new Map();
  for (const panelNode of panelNodes) {
    const panelId = panelNode.getAttribute("data-panel-id");
    const d = panelNode.getAttribute("d");
    if (!panelId || !d) {
      continue;
    }
    try {
      warpedPanelBoxes.set(panelId, getPathBBox(d));
    } catch (_error) {
      // Keep going if measurement fails.
    }
  }

  const textNodes = Array.from(doc.querySelectorAll("text"));
  for (const textNode of textNodes) {
    const panelId = textNode.getAttribute("data-label-panel-id");
    const sourceBox = panelId ? sourcePanelBoxes.get(panelId) : null;
    const warpedBox = panelId ? warpedPanelBoxes.get(panelId) : null;
    const sourceLabel = panelId ? sourceLabelPositions.get(panelId) : null;
    const anchoredPoint = sourceBox && warpedBox && sourceLabel
      ? {
          x: roundValue(warpedBox.minX + ((sourceLabel.x - sourceBox.minX) / Math.max(1e-6, sourceBox.maxX - sourceBox.minX)) * (warpedBox.maxX - warpedBox.minX)),
          y: roundValue(warpedBox.minY + ((sourceLabel.y - sourceBox.minY) / Math.max(1e-6, sourceBox.maxY - sourceBox.minY)) * (warpedBox.maxY - warpedBox.minY))
        }
      : null;
    if (textNode.hasAttribute("x")) {
      const nextX = anchoredPoint ? anchoredPoint.x : roundValue(xWarp.warp(Number.parseFloat(textNode.getAttribute("x") || "0") || 0));
      textNode.setAttribute("x", nextX);
    }
    if (textNode.hasAttribute("y")) {
      const nextY = anchoredPoint ? anchoredPoint.y : roundValue(yWarp.warp(Number.parseFloat(textNode.getAttribute("y") || "0") || 0));
      textNode.setAttribute("y", nextY);
    }
    const transform = textNode.getAttribute("transform") || "";
    const rotationMatch = transform.match(/rotate\(\s*(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s+(-?\d*\.?\d+)\s*\)/);
    if (rotationMatch) {
      const angle = Number.parseFloat(rotationMatch[1]) || 0;
      const cx = anchoredPoint ? anchoredPoint.x : xWarp.warp(Number.parseFloat(rotationMatch[2]) || 0);
      const cy = anchoredPoint ? anchoredPoint.y : yWarp.warp(Number.parseFloat(rotationMatch[3]) || 0);
      textNode.setAttribute("transform", `rotate(${roundValue(angle)} ${roundValue(cx)} ${roundValue(cy)})`);
    }
  }

  const root = doc.documentElement;
  if (root && root.viewBox && root.viewBox.baseVal) {
    const x0 = root.viewBox.baseVal.x;
    const y0 = root.viewBox.baseVal.y;
    const x1 = x0 + root.viewBox.baseVal.width;
    const y1 = y0 + root.viewBox.baseVal.height;
    const nextX0 = xWarp.warp(x0);
    const nextY0 = yWarp.warp(y0);
    const nextX1 = xWarp.warp(x1);
    const nextY1 = yWarp.warp(y1);
    root.setAttribute("viewBox", `${roundValue(nextX0)} ${roundValue(nextY0)} ${roundValue(nextX1 - nextX0)} ${roundValue(nextY1 - nextY0)}`);

    const widthAttr = root.getAttribute("width");
    const heightAttr = root.getAttribute("height");
    if (widthAttr) {
      const nextWidth = parseNumericLength(widthAttr) * ((nextX1 - nextX0) / Math.max(1e-6, x1 - x0));
      root.setAttribute("width", `${roundValue(nextWidth)}${extractLengthUnit(widthAttr)}`);
    }
    if (heightAttr) {
      const nextHeight = parseNumericLength(heightAttr) * ((nextY1 - nextY0) / Math.max(1e-6, y1 - y0));
      root.setAttribute("height", `${roundValue(nextHeight)}${extractLengthUnit(heightAttr)}`);
    }
  }

  const metadataNode = doc.getElementById("box-template-metadata");
  if (metadataNode) {
    try {
      const metadata = JSON.parse(metadataNode.textContent || "{}");
      const templatePanelDefinitions = buildTemplatePanelDefinitionMap(templateId);
      const templateFoldDefinitions = buildTemplateFoldDefinitionMap(templateId);
      updateTemplateMetadataDimensions(metadata, params, templateId);
      if (Array.isArray(metadata.viewBox) && metadata.viewBox.length === 4) {
        metadata.viewBox = root.getAttribute("viewBox").split(/\s+/).map(Number);
      } else if (metadata.source && metadata.source.viewBox) {
        metadata.source.viewBox = root.getAttribute("viewBox");
      }
      if (metadata.source && root.getAttribute("width")) metadata.source.width = root.getAttribute("width");
      if (metadata.source && root.getAttribute("height")) metadata.source.height = root.getAttribute("height");
      if (Array.isArray(metadata.panels)) {
        for (const panel of metadata.panels) {
          const templatePanel = templatePanelDefinitions.get(panel.id) || {};
          const sourceBox = sourcePanelBoxes.get(panel.id);
          const warpedBox = warpedPanelBoxes.get(panel.id);
          const sourceLabel = sourceLabelPositions.get(panel.id);
          const anchoredPoint = sourceBox && warpedBox && sourceLabel
            ? {
                x: roundValue(warpedBox.minX + ((sourceLabel.x - sourceBox.minX) / Math.max(1e-6, sourceBox.maxX - sourceBox.minX)) * (warpedBox.maxX - warpedBox.minX)),
                y: roundValue(warpedBox.minY + ((sourceLabel.y - sourceBox.minY) / Math.max(1e-6, sourceBox.maxY - sourceBox.minY)) * (warpedBox.maxY - warpedBox.minY))
              }
            : null;
          if (panel.path) {
            panel.path = warpPathData(panel.path, xWarp.warp, yWarp.warp, xWarp.scaleAt, yWarp.scaleAt);
          }
          if (panel.meshD) {
            panel.meshD = warpPathData(panel.meshD, xWarp.warp, yWarp.warp, xWarp.scaleAt, yWarp.scaleAt);
          }
          panel.standardName = templatePanel.standardName || panel.standardName || panel.id;
          panel.displayName = templatePanel.displayName || panel.displayName || panel.displayLabel || panel.label || panel.id;
          panel.displayLabel = templatePanel.displayName || panel.displayLabel || panel.label || panel.displayName || panel.id;
          panel.type = templatePanel.type || panel.type || "panel";
          panel.isGlue = templatePanel.isGlue ?? panel.isGlue ?? false;
          panel.foldParent = templatePanel.foldParent ?? panel.foldParent ?? null;
          panel.foldId = templatePanel.foldId ?? panel.foldId ?? null;
          panel.foldAngleDeg = templatePanel.foldAngleDeg ?? panel.foldAngleDeg ?? 0;
          if (Array.isArray(panel.labelPosition)) {
            panel.labelPosition = anchoredPoint
              ? [anchoredPoint.x, anchoredPoint.y]
              : [roundValue(xWarp.warp(Number(panel.labelPosition[0]) || 0)), roundValue(yWarp.warp(Number(panel.labelPosition[1]) || 0))];
          }
          if (panel.labelLayout) {
            panel.labelLayout.x = anchoredPoint ? anchoredPoint.x : roundValue(xWarp.warp(Number(panel.labelLayout.x) || 0));
            panel.labelLayout.y = anchoredPoint ? anchoredPoint.y : roundValue(yWarp.warp(Number(panel.labelLayout.y) || 0));
          }
        }
      }
      for (const collectionKey of ["folds", "cutPaths", "sourcePaths"]) {
        if (Array.isArray(metadata[collectionKey])) {
          for (const entry of metadata[collectionKey]) {
            const templateFold = collectionKey === "folds" ? templateFoldDefinitions.get(entry.id) || null : null;
            if (entry.d) {
              entry.d = warpPathData(entry.d, xWarp.warp, yWarp.warp, xWarp.scaleAt, yWarp.scaleAt);
            }
            if (templateFold) {
              entry.from = templateFold.from || entry.from || null;
              entry.to = templateFold.to || entry.to || null;
              entry.displayName = templateFold.displayName || entry.displayName || makeImportedFoldLabel(templateFold.from, templateFold.to);
            }
          }
        }
      }
      if (Array.isArray(metadata.glueAreas)) {
        for (const entry of metadata.glueAreas) {
          if (entry.points) {
            entry.points = warpPoints(entry.points, xWarp.warp, yWarp.warp);
          }
        }
      }
      metadataNode.textContent = JSON.stringify(metadata, null, 2);
    } catch (_error) {
      // Keep the SVG valid even if metadata cannot be updated.
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

const importedTemplateCache = new Map();
let measureSvg = null;

function ensureMeasureSvg() {
  if (measureSvg) {
    return measureSvg;
  }
  measureSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  measureSvg.setAttribute("width", "0");
  measureSvg.setAttribute("height", "0");
  measureSvg.style.position = "absolute";
  measureSvg.style.left = "-9999px";
  measureSvg.style.top = "-9999px";
  measureSvg.style.pointerEvents = "none";
  measureSvg.style.opacity = "0";
  document.body.appendChild(measureSvg);
  return measureSvg;
}

function getPathBBox(d) {
  const svg = ensureMeasureSvg();
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  svg.appendChild(path);
  const box = path.getBBox();
  svg.removeChild(path);
  return {
    minX: box.x,
    minY: box.y,
    maxX: box.x + box.width,
    maxY: box.y + box.height,
    width: box.width,
    height: box.height,
    centerX: box.x + box.width / 2,
    centerY: box.y + box.height / 2
  };
}

function isClosedPathData(d) {
  const value = String(d || "").trim();
  if (!value) {
    return false;
  }
  if (/[zZ]\s*$/.test(value)) {
    return true;
  }
  const segments = parseSimplePathSegments(value);
  if (!segments.length) {
    return false;
  }
  const first = segments[0].start;
  const last = segments[segments.length - 1].end;
  return Math.hypot(last.x - first.x, last.y - first.y) <= 0.5;
}

function isBBoxContainedWithin(inner, outer, tolerance = 0.75) {
  if (!inner || !outer) {
    return false;
  }
  return inner.minX >= outer.minX - tolerance
    && inner.maxX <= outer.maxX + tolerance
    && inner.minY >= outer.minY - tolerance
    && inner.maxY <= outer.maxY + tolerance;
}

function countBBoxTouches(inner, outer, tolerance = 0.75) {
  let count = 0;
  if (Math.abs(inner.minX - outer.minX) <= tolerance) count += 1;
  if (Math.abs(inner.maxX - outer.maxX) <= tolerance) count += 1;
  if (Math.abs(inner.minY - outer.minY) <= tolerance) count += 1;
  if (Math.abs(inner.maxY - outer.maxY) <= tolerance) count += 1;
  return count;
}

function attachInteriorOpenCutPathsToPanels(panels, panelBoxes, cutLineNodes) {
  if (!Array.isArray(panels) || !panels.length || !Array.isArray(cutLineNodes) || !cutLineNodes.length) {
    return;
  }

  for (const cutLineNode of cutLineNodes) {
    const d = cutLineNode.getAttribute("d") || "";
    if (!d || isClosedPathData(d)) {
      continue;
    }

    let cutBox;
    try {
      cutBox = getPathBBox(d);
    } catch (_error) {
      continue;
    }

    const candidates = panels
      .map(panel => ({
        panel,
        panelBox: panelBoxes.get(panel.id)
      }))
      .filter(({ panelBox }) => panelBox && isBBoxContainedWithin(cutBox, panelBox))
      .map(({ panel, panelBox }) => ({
        panel,
        panelBox,
        touches: countBBoxTouches(cutBox, panelBox),
        widthRatio: cutBox.width / Math.max(panelBox.width, 1e-6),
        heightRatio: cutBox.height / Math.max(panelBox.height, 1e-6),
        panelArea: panelBox.width * panelBox.height
      }))
      .filter(candidate => candidate.touches <= 1)
      .filter(candidate => candidate.widthRatio < 0.8 && candidate.heightRatio < 0.8)
      .filter(candidate => candidate.widthRatio < 0.35 || candidate.heightRatio < 0.35)
      .sort((left, right) => left.panelArea - right.panelArea);

    if (!candidates.length) {
      continue;
    }

    const targetPanel = candidates[0].panel;
    targetPanel.slitCutD = targetPanel.slitCutD
      ? `${targetPanel.slitCutD} ${d}`
      : d;
  }
}

function parseSimplePathSegments(d) {
  const tokens = String(d || "").match(/[MLHVZmlhvz]|-?\d*\.?\d+/g);
  if (!tokens || !tokens.length) {
    return [];
  }

  const segments = [];
  let index = 0;
  let command = null;
  let current = { x: 0, y: 0 };
  let subpathStart = null;

  function readNumber() {
    if (index >= tokens.length) return null;
    const value = Number(tokens[index]);
    if (!Number.isFinite(value)) return null;
    index += 1;
    return value;
  }

  function pushSegment(nextPoint) {
    segments.push({
      start: { ...current },
      end: { ...nextPoint }
    });
    current = nextPoint;
  }

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[MLHVZmlhvz]$/.test(token)) {
      command = token;
      index += 1;
      if (command === "Z" || command === "z") {
        if (subpathStart && (current.x !== subpathStart.x || current.y !== subpathStart.y)) {
          pushSegment({ ...subpathStart });
        }
      }
      continue;
    }
    if (!command) {
      break;
    }

    if (command === "M" || command === "L") {
      const x = readNumber();
      const y = readNumber();
      if (x === null || y === null) break;
      const nextPoint = { x, y };
      if (command === "M") {
        current = nextPoint;
        subpathStart = { ...nextPoint };
        command = "L";
      } else {
        pushSegment(nextPoint);
      }
      continue;
    }

    if (command === "m" || command === "l") {
      const dx = readNumber();
      const dy = readNumber();
      if (dx === null || dy === null) break;
      const nextPoint = { x: current.x + dx, y: current.y + dy };
      if (command === "m") {
        current = nextPoint;
        subpathStart = { ...nextPoint };
        command = "l";
      } else {
        pushSegment(nextPoint);
      }
      continue;
    }

    if (command === "H" || command === "h") {
      const value = readNumber();
      if (value === null) break;
      pushSegment({
        x: command === "H" ? value : current.x + value,
        y: current.y
      });
      continue;
    }

    if (command === "V" || command === "v") {
      const value = readNumber();
      if (value === null) break;
      pushSegment({
        x: current.x,
        y: command === "V" ? value : current.y + value
      });
    }
  }

  return segments;
}

function lineFromSegment(segment) {
  return `M ${roundValue(segment.start.x)} ${roundValue(segment.start.y)} L ${roundValue(segment.end.x)} ${roundValue(segment.end.y)}`;
}

function overlapSize(a0, a1, b0, b1) {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function inferSharedEdge(parentBox, childBox) {
  const tolerance = 1;
  const horizontalOverlap = overlapSize(parentBox.minX, parentBox.maxX, childBox.minX, childBox.maxX);
  const verticalOverlap = overlapSize(parentBox.minY, parentBox.maxY, childBox.minY, childBox.maxY);

  if (horizontalOverlap > tolerance) {
    if (Math.abs(parentBox.minY - childBox.maxY) <= tolerance) {
      return {
        orientation: "horizontal",
        start: { x: Math.max(parentBox.minX, childBox.minX), y: parentBox.minY },
        end: { x: Math.min(parentBox.maxX, childBox.maxX), y: parentBox.minY }
      };
    }
    if (Math.abs(parentBox.maxY - childBox.minY) <= tolerance) {
      return {
        orientation: "horizontal",
        start: { x: Math.max(parentBox.minX, childBox.minX), y: parentBox.maxY },
        end: { x: Math.min(parentBox.maxX, childBox.maxX), y: parentBox.maxY }
      };
    }
  }

  if (verticalOverlap > tolerance) {
    if (Math.abs(parentBox.minX - childBox.maxX) <= tolerance) {
      return {
        orientation: "vertical",
        start: { x: parentBox.minX, y: Math.max(parentBox.minY, childBox.minY) },
        end: { x: parentBox.minX, y: Math.min(parentBox.maxY, childBox.maxY) }
      };
    }
    if (Math.abs(parentBox.maxX - childBox.minX) <= tolerance) {
      return {
        orientation: "vertical",
        start: { x: parentBox.maxX, y: Math.max(parentBox.minY, childBox.minY) },
        end: { x: parentBox.maxX, y: Math.min(parentBox.maxY, childBox.maxY) }
      };
    }
  }

  return null;
}

function getSegmentScore(segment, expectedEdge) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const orientation = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
  let score = orientation === expectedEdge.orientation ? 0 : 10000;

  if (expectedEdge.orientation === "horizontal") {
    const y = (segment.start.y + segment.end.y) * 0.5;
    const minX = Math.min(segment.start.x, segment.end.x);
    const maxX = Math.max(segment.start.x, segment.end.x);
    score += Math.abs(y - expectedEdge.start.y) * 20;
    score += Math.abs(minX - Math.min(expectedEdge.start.x, expectedEdge.end.x));
    score += Math.abs(maxX - Math.max(expectedEdge.start.x, expectedEdge.end.x));
  } else {
    const x = (segment.start.x + segment.end.x) * 0.5;
    const minY = Math.min(segment.start.y, segment.end.y);
    const maxY = Math.max(segment.start.y, segment.end.y);
    score += Math.abs(x - expectedEdge.start.x) * 20;
    score += Math.abs(minY - Math.min(expectedEdge.start.y, expectedEdge.end.y));
    score += Math.abs(maxY - Math.max(expectedEdge.start.y, expectedEdge.end.y));
  }

  return score;
}

function getExpectedEdgeLength(expectedEdge) {
  const dx = expectedEdge.end.x - expectedEdge.start.x;
  const dy = expectedEdge.end.y - expectedEdge.start.y;
  return Math.hypot(dx, dy);
}

function getSegmentAlignmentMetrics(segment, expectedEdge) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const orientation = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
  if (orientation !== expectedEdge.orientation) {
    return {
      offset: Number.POSITIVE_INFINITY,
      overlapRatio: 0
    };
  }

  if (expectedEdge.orientation === "horizontal") {
    const y = (segment.start.y + segment.end.y) * 0.5;
    const overlap = overlapSize(
      Math.min(segment.start.x, segment.end.x),
      Math.max(segment.start.x, segment.end.x),
      Math.min(expectedEdge.start.x, expectedEdge.end.x),
      Math.max(expectedEdge.start.x, expectedEdge.end.x)
    );
    const expectedLength = Math.max(1, Math.abs(expectedEdge.end.x - expectedEdge.start.x));
    return {
      offset: Math.abs(y - expectedEdge.start.y),
      overlapRatio: overlap / expectedLength
    };
  }

  const x = (segment.start.x + segment.end.x) * 0.5;
  const overlap = overlapSize(
    Math.min(segment.start.y, segment.end.y),
    Math.max(segment.start.y, segment.end.y),
    Math.min(expectedEdge.start.y, expectedEdge.end.y),
    Math.max(expectedEdge.start.y, expectedEdge.end.y)
  );
  const expectedLength = Math.max(1, Math.abs(expectedEdge.end.y - expectedEdge.start.y));
  return {
    offset: Math.abs(x - expectedEdge.start.x),
    overlapRatio: overlap / expectedLength
  };
}

function makeFallbackFoldId(parentId, childId) {
  return `fold-${parentId}-to-${childId}`;
}

function makeImportedFoldLabel(fromLabel, toLabel) {
  return `${fromLabel} to ${toLabel}`;
}

function renameFoldReference(foldId, foldRenameMap) {
  if (!foldId) {
    return foldId;
  }
  if (foldRenameMap.has(foldId)) {
    return foldRenameMap.get(foldId);
  }
  if (String(foldId).includes("/")) {
    return String(foldId)
      .split("/")
      .map(part => foldRenameMap.get(part) || part)
      .join("/");
  }
  return foldId;
}

function isGluePanelEnabled(config, fallbackType = "") {
  if (config && config.isGlue !== undefined) {
    return Boolean(config.isGlue);
  }
  return String(config && config.type ? config.type : fallbackType).includes("glue");
}

function getComputedStructuredPanelType(config, fallbackType = "") {
  if (isGluePanelEnabled(config, fallbackType)) {
    return "glue-flap";
  }
  return "panel";
}

function findMatchingGluePanelId(glueAreaId, panelIds) {
  const normalized = String(glueAreaId || "").toLowerCase();
  if (!normalized) {
    return "";
  }

  const directMatch = panelIds.find(panelId => normalized.includes(String(panelId).toLowerCase()));
  if (directMatch) {
    return directMatch;
  }

  const stem = normalized.replace(/^glue-?/, "").trim();
  if (!stem) {
    return "";
  }

  return panelIds.find(panelId => {
    const lowerPanelId = String(panelId).toLowerCase();
    return lowerPanelId.includes(stem) && lowerPanelId.includes("glue");
  }) || "";
}

function resolveImportedPanelParents(panels, panelBoxes) {
  const panelMap = new Map(panels.map(panel => [panel.id, panel]));

  for (const panel of panels) {
    if (!panel.parent) continue;
    if (panel.foldId) continue;

    const declaredParent = panelMap.get(panel.parent);
    const hasDeclaredSharedEdge = declaredParent && inferSharedEdge(panelBoxes.get(declaredParent.id), panelBoxes.get(panel.id));
    if (hasDeclaredSharedEdge) {
      continue;
    }

    const candidates = panels.filter(candidate => candidate.id !== panel.id)
      .map(candidate => ({
        panel: candidate,
        edge: inferSharedEdge(panelBoxes.get(candidate.id), panelBoxes.get(panel.id))
      }))
      .filter(candidate => candidate.edge);

    if (!candidates.length) {
      continue;
    }

    if (declaredParent) {
      const declaredAncestorCandidate = candidates.find(candidate => candidate.panel.id === declaredParent.parent);
      if (declaredAncestorCandidate) {
        panel.parent = declaredAncestorCandidate.panel.id;
        continue;
      }
    }

    candidates.sort((left, right) => {
      const leftDeclared = left.panel.id === panel.parent ? 1 : 0;
      const rightDeclared = right.panel.id === panel.parent ? 1 : 0;
      return rightDeclared - leftDeclared;
    });
    panel.parent = candidates[0].panel.id;
  }
}

function applyStructuredSvgRefinement(doc, refinement, activePreviewSide = "outside") {
  const metadataNode = doc.getElementById("box-template-metadata");
  let metadata = null;
  if (metadataNode) {
    try {
      metadata = JSON.parse(metadataNode.textContent || "{}");
    } catch (_error) {
      metadata = null;
    }
  }

  if (!refinement) {
    applyTemplateFeatureMarkup(doc, null, metadata);
    const outsideArtworkNode = doc.getElementById("artwork-side-outside");
    const insideArtworkNode = doc.getElementById("artwork-side-inside");
    if (outsideArtworkNode) {
      outsideArtworkNode.setAttribute("visibility", activePreviewSide === "outside" ? "visible" : "hidden");
    }
    if (insideArtworkNode) {
      insideArtworkNode.setAttribute("visibility", activePreviewSide === "inside" ? "visible" : "hidden");
    }
    return;
  }

  const panels = Array.from(doc.querySelectorAll('[data-box-role="panel"]'));
  const panelIds = panels.map(panel => panel.getAttribute("data-panel-id")).filter(Boolean);
  const renameMap = new Map(
    panelIds.map(panelId => {
      const config = refinement.panels && refinement.panels[panelId];
      return [panelId, (config && config.standardName) || panelId];
    })
  );
  const foldRenameMap = new Map();
  const labelNodes = Array.from(doc.querySelectorAll('#labels text'));
  const defsNode = doc.querySelector("defs");
  const labelNodeMap = new Map(
    labelNodes
      .map(node => [node.getAttribute("data-label-panel-id"), node])
      .filter(([panelId]) => Boolean(panelId))
  );

  panels.forEach((panelEl, index) => {
    const panelId = panelEl.getAttribute("data-panel-id");
    const config = refinement.panels && refinement.panels[panelId];
    if (!config) {
      return;
    }

    const computedType = getComputedStructuredPanelType(
      config,
      panelEl.getAttribute("data-panel-type") || ""
    );
    panelEl.setAttribute("data-panel-type", computedType);
    panelEl.setAttribute("data-panel-standard-name", config.standardName || panelId);
    panelEl.setAttribute("data-panel-display-name", config.displayName || config.standardName || panelId);
    panelEl.setAttribute("data-panel-is-glue", isGluePanelEnabled(config, computedType) ? "true" : "false");

    const previewPath = doc.getElementById(`preview-${panelId}`);
    if (previewPath) {
      if (isGluePanelEnabled(config, computedType)) {
        previewPath.setAttribute("style", "fill: url(#glueHatch); opacity: 0.75;");
      } else {
        previewPath.setAttribute("style", `fill: ${PANEL_PREVIEW_FILLS[index % PANEL_PREVIEW_FILLS.length]}; opacity: 1;`);
      }
    }

    const labelNode = labelNodeMap.get(panelId) || labelNodes[index] || null;
    const fallbackLabel = config.displayName || config.standardName || panelId;
    const layout = getLabelLayout({ id: panelId, labelPosition: labelNode ? [
      Number.parseFloat(labelNode.getAttribute("x") || "0") || 0,
      Number.parseFloat(labelNode.getAttribute("y") || "0") || 0
    ] : [0, 0] }, refinement, "", 12);

    if (labelNode) {
      const replacement = new DOMParser().parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${buildSvgLabelText({ id: panelId, labelPosition: [layout.x, layout.y] }, refinement, fallbackLabel, layout.fontSize)}</svg>`,
        "image/svg+xml"
      ).documentElement.firstElementChild;
      if (replacement) {
        replacement.setAttribute("data-label-panel-id", panelId);
        labelNode.replaceWith(doc.importNode(replacement, true));
      }
    }

    if (metadata && Array.isArray(metadata.panels)) {
      const metadataPanel = metadata.panels.find(panel => panel.id === panelId);
      if (metadataPanel) {
        metadataPanel.label = layout.text || config.displayName || metadataPanel.label || panelId;
        metadataPanel.displayLabel = config.displayName || metadataPanel.displayLabel || metadataPanel.label || panelId;
        metadataPanel.displayName = config.displayName || metadataPanel.displayName || metadataPanel.displayLabel || metadataPanel.label || panelId;
        metadataPanel.artworkText = layout.text || "";
        metadataPanel.standardName = config.standardName || metadataPanel.standardName || panelId;
        metadataPanel.labelPosition = [roundValue(layout.x), roundValue(layout.y)];
        metadataPanel.labelLayout = {
          text: layout.text,
          x: roundValue(layout.x),
          y: roundValue(layout.y),
          fontSize: roundValue(layout.fontSize),
          rotationDeg: roundValue(layout.rotationDeg),
          maxWidth: roundValue(layout.maxWidth),
          lineHeight: roundValue(layout.lineHeight),
          fontFamily: layout.fontFamily || "Arial, sans-serif",
          fontWeight: layout.fontWeight || "700",
          fontStyle: layout.fontStyle || "normal",
          fill: layout.fill || "#333333"
        };
        metadataPanel.type = computedType;
        metadataPanel.isGlue = isGluePanelEnabled(config, computedType);
        metadataPanel.artwork = config.artwork || null;
      }
    }

  });

  for (const [sourceId, targetId] of renameMap.entries()) {
    if (!targetId || targetId === sourceId) {
      continue;
    }

    const previewPath = doc.getElementById(`preview-${sourceId}`);
    if (previewPath) {
      previewPath.setAttribute("id", `preview-${targetId}`);
    }

    const panelEl = doc.getElementById(`panel-${sourceId}`);
    if (panelEl) {
      panelEl.setAttribute("id", `panel-${targetId}`);
      panelEl.setAttribute("data-panel-id", targetId);
      const foldParent = panelEl.getAttribute("data-fold-parent") || "";
      if (renameMap.has(foldParent)) {
        panelEl.setAttribute("data-fold-parent", renameMap.get(foldParent));
      }
    }

    const clipPath = doc.getElementById(`clip-${sourceId}`);
    if (clipPath) {
      clipPath.setAttribute("id", `clip-${targetId}`);
    }

    const artworkEl = doc.getElementById(`artwork-${sourceId}`);
    if (artworkEl) {
      artworkEl.setAttribute("id", `artwork-${targetId}`);
      artworkEl.setAttribute("data-panel-id", targetId);
      artworkEl.setAttribute("clip-path", `url(#clip-${targetId})`);
    }

    const glueAreas = Array.from(doc.querySelectorAll(`[data-panel-id="${sourceId}"]`));
    for (const glueArea of glueAreas) {
      if (glueArea.getAttribute("data-box-role") === "glue-area") {
        glueArea.setAttribute("data-panel-id", targetId);
      }
    }

    const labelNode = labelNodeMap.get(sourceId);
    if (labelNode) {
      labelNode.setAttribute("data-label-panel-id", targetId);
    }
  }

  const foldLineNodes = Array.from(doc.querySelectorAll('[data-box-role="fold-line"]'));
  for (const foldLineNode of foldLineNodes) {
    const sourceFrom = foldLineNode.getAttribute("data-fold-from") || "";
    const sourceTo = foldLineNode.getAttribute("data-fold-to") || "";
    const nextFrom = renameMap.get(sourceFrom) || sourceFrom;
    const nextTo = renameMap.get(sourceTo) || sourceTo;
    if (sourceFrom) {
      foldLineNode.setAttribute("data-fold-from", nextFrom);
    }
    if (sourceTo) {
      foldLineNode.setAttribute("data-fold-to", nextTo);
    }
    const currentFoldId = foldLineNode.getAttribute("id") || "";
    if (currentFoldId && sourceFrom && sourceTo && currentFoldId === `fold-${sourceFrom}-to-${sourceTo}`) {
      const nextFoldId = `fold-${nextFrom}-to-${nextTo}`;
      foldRenameMap.set(currentFoldId, nextFoldId);
      foldLineNode.setAttribute("id", nextFoldId);
    }
  }

  if (foldRenameMap.size) {
    for (const panelEl of panels) {
      const foldId = panelEl.getAttribute("data-fold-id") || "";
      const nextFoldId = renameFoldReference(foldId, foldRenameMap);
      if (nextFoldId !== foldId) {
        panelEl.setAttribute("data-fold-id", nextFoldId);
      }
    }
  }

  if (metadata) {
    if (Array.isArray(metadata.panels)) {
      for (const metadataPanel of metadata.panels) {
        const sourceId = metadataPanel.id;
        const targetId = renameMap.get(sourceId) || sourceId;
        metadataPanel.id = targetId;
        if (metadataPanel.foldParent && renameMap.has(metadataPanel.foldParent)) {
          metadataPanel.foldParent = renameMap.get(metadataPanel.foldParent);
        }
        metadataPanel.foldId = renameFoldReference(metadataPanel.foldId, foldRenameMap);
      }
    }
    if (Array.isArray(metadata.folds)) {
      for (const metadataFold of metadata.folds) {
        const sourceFrom = metadataFold.from || metadataFold.panelFrom || metadataFold.foldFrom || "";
        const sourceTo = metadataFold.to || metadataFold.panelTo || metadataFold.foldTo || "";
        const nextFrom = renameMap.get(sourceFrom) || sourceFrom;
        const nextTo = renameMap.get(sourceTo) || sourceTo;
        metadataFold.id = renameFoldReference(metadataFold.id, foldRenameMap);
        if ("from" in metadataFold) metadataFold.from = nextFrom;
        if ("to" in metadataFold) metadataFold.to = nextTo;
        if ("panelFrom" in metadataFold) metadataFold.panelFrom = nextFrom;
        if ("panelTo" in metadataFold) metadataFold.panelTo = nextTo;
        if ("foldFrom" in metadataFold) metadataFold.foldFrom = nextFrom;
        if ("foldTo" in metadataFold) metadataFold.foldTo = nextTo;
        if (nextFrom && nextTo) {
          metadataFold.displayName = makeImportedFoldLabel(nextFrom, nextTo);
        }
      }
    }
    const floorPanelId = refinement.floorPanel || metadata.floorPanel || metadata.basePanel || null;
    metadata.floorPanel = floorPanelId && renameMap.has(floorPanelId) ? renameMap.get(floorPanelId) : floorPanelId;
    if (refinement.floorPanelsByObject && typeof refinement.floorPanelsByObject === "object") {
      metadata.floorPanelsByObject = Object.fromEntries(
        Object.entries(refinement.floorPanelsByObject).map(([objectId, panelId]) => [
          objectId,
          panelId && renameMap.has(panelId) ? renameMap.get(panelId) : panelId
        ])
      );
    }
    delete metadata.basePanel;
    metadata.customFonts = refinement.customFonts || metadata.customFonts || {};
    metadata.sideArtwork = refinement.sideArtwork || metadata.sideArtwork || { outside: null, inside: null };
    metadata.templateSettings = refinement.templateSettings || metadata.templateSettings || {};
    metadataNode.textContent = JSON.stringify(metadata, null, 2);
  }

  if (defsNode) {
    const customFontCss = buildCustomFontFaceCss(refinement.customFonts || metadata?.customFonts || {});
    let customFontStyleNode = defsNode.querySelector("#uploaded-font-faces");
    if (customFontCss) {
      if (!customFontStyleNode) {
        customFontStyleNode = doc.createElementNS("http://www.w3.org/2000/svg", "style");
        customFontStyleNode.setAttribute("id", "uploaded-font-faces");
        defsNode.appendChild(customFontStyleNode);
      }
      customFontStyleNode.textContent = customFontCss;
    } else if (customFontStyleNode) {
      customFontStyleNode.remove();
    }
  }

  const outsideArtworkNode = doc.getElementById("artwork-side-outside");
  const insideArtworkNode = doc.getElementById("artwork-side-inside");
  const outlinePaths = Array.from(doc.querySelectorAll('[data-box-role="panel"]'))
    .map(panelNode => ({
      d: panelNode.getAttribute("d") || "",
      fillRule: panelNode.getAttribute("fill-rule") || null
    }))
    .filter(entry => entry.d);
  if (outsideArtworkNode) {
    outsideArtworkNode.innerHTML = buildSideArtworkMarkup(getActiveSideArtwork(refinement, "outside"), outlinePaths);
    outsideArtworkNode.setAttribute("visibility", activePreviewSide === "outside" ? "visible" : "hidden");
  }
  if (insideArtworkNode) {
    insideArtworkNode.innerHTML = buildSideArtworkMarkup(getActiveSideArtwork(refinement, "inside"), outlinePaths);
    insideArtworkNode.setAttribute("visibility", activePreviewSide === "inside" ? "visible" : "hidden");
  }
  applyTemplateFeatureMarkup(doc, refinement, metadata);

  const glueAreaNodes = Array.from(doc.querySelectorAll('[data-box-role="glue-area"]'));
  for (const glueAreaNode of glueAreaNodes) {
    const matchedPanelId = glueAreaNode.getAttribute("data-panel-id") || findMatchingGluePanelId(glueAreaNode.id, panelIds);
    if (!matchedPanelId || !refinement.panels || !refinement.panels[matchedPanelId]) {
      continue;
    }
    const config = refinement.panels[matchedPanelId];
    if (isGluePanelEnabled(config, "glue-flap")) {
      glueAreaNode.removeAttribute("display");
      glueAreaNode.removeAttribute("visibility");
    } else {
      glueAreaNode.setAttribute("display", "none");
      glueAreaNode.setAttribute("visibility", "hidden");
    }
  }
}

function normalizeStructuredSvgMarkup(svgText, showPanels, showLabels, refinement = null, previewSide = "outside") {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  normalizeStructuredSvgCanvas(doc);
  applyStructuredSvgRefinement(doc, refinement, previewSide);
  applyStructuredSvgDisplayStyles(doc);
  const panelPreview = doc.getElementById("panel-preview");
  const labels = doc.getElementById("labels");
  const glueGroup = doc.getElementById("glue");
  const gluePanelMap = new Map(
    Array.from(doc.querySelectorAll('[data-box-role="panel"]')).map(panel => [
      panel.getAttribute("data-panel-id") || "",
      panel.getAttribute("data-panel-is-glue") === "true"
        || String(panel.getAttribute("data-panel-type") || "").includes("glue")
    ])
  );

  if (glueGroup) {
    glueGroup.removeAttribute("visibility");
  }

  if (panelPreview) {
    const previewPaths = Array.from(panelPreview.querySelectorAll("path"));
    previewPaths.forEach((path, index) => {
      const previewId = path.getAttribute("id") || "";
      const panelId = previewId.startsWith("preview-") ? previewId.slice("preview-".length) : "";
      const isGluePanel = gluePanelMap.get(panelId) === true;
      if (!path.getAttribute("fill")) {
        path.setAttribute("fill", PANEL_PREVIEW_FILLS[index % PANEL_PREVIEW_FILLS.length]);
      }
      path.setAttribute("stroke", "none");
      path.removeAttribute("visibility");
      path.setAttribute("pointer-events", "all");
      path.setAttribute("fill-opacity", showPanels || isGluePanel ? "1" : "0");
    });
    panelPreview.removeAttribute("visibility");
  }

  if (labels) {
    if (showLabels) {
      labels.removeAttribute("visibility");
    } else {
      labels.setAttribute("visibility", "hidden");
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

function transformPathData(pathData, { translateX = 0, translateY = 0 }) {
  const tokens = tokenizePathData(pathData);
  const output = [];
  let index = 0;
  let command = "";
  const paramCounts = {
    M: 2, L: 2, T: 2,
    H: 1, V: 1,
    S: 4, Q: 4,
    C: 6,
    A: 7,
    Z: 0
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[AaCcHhLlMmQqSsTtVvZz]$/.test(token)) {
      command = token;
      output.push(command);
      index += 1;
      if (command === "Z" || command === "z") {
        continue;
      }
    }

    if (!command) {
      break;
    }

    const upper = command.toUpperCase();
    const isRelative = command !== upper;
    const paramCount = paramCounts[upper];
    if (!paramCount) {
      break;
    }

    while (index < tokens.length && !/^[AaCcHhLlMmQqSsTtVvZz]$/.test(tokens[index])) {
      const values = [];
      for (let offset = 0; offset < paramCount; offset += 1) {
        if (index >= tokens.length || /^[AaCcHhLlMmQqSsTtVvZz]$/.test(tokens[index])) {
          break;
        }
        values.push(Number(tokens[index]));
        index += 1;
      }
      if (values.length !== paramCount) {
        break;
      }

      let transformed = values;
      if (!isRelative) {
        if (upper === "M" || upper === "L" || upper === "T") {
          transformed = [values[0] + translateX, values[1] + translateY];
        } else if (upper === "H") {
          transformed = [values[0] + translateX];
        } else if (upper === "V") {
          transformed = [values[0] + translateY];
        } else if (upper === "S" || upper === "Q") {
          transformed = [values[0] + translateX, values[1] + translateY, values[2] + translateX, values[3] + translateY];
        } else if (upper === "C") {
          transformed = [
            values[0] + translateX, values[1] + translateY,
            values[2] + translateX, values[3] + translateY,
            values[4] + translateX, values[5] + translateY
          ];
        } else if (upper === "A") {
          transformed = [values[0], values[1], values[2], values[3], values[4], values[5] + translateX, values[6] + translateY];
        }
      }

      output.push(transformed.map(value => String(roundValue(value))).join(","));
    }
  }

  return output.join(" ");
}

function translateRotateTransform(transformText, translateX, translateY) {
  const match = String(transformText || "").match(/rotate\(\s*(-?\d*\.?\d+)(?:\s+|,\s*)(-?\d*\.?\d+)(?:\s+|,\s*)(-?\d*\.?\d+)\s*\)/i);
  if (!match) {
    return transformText;
  }
  const angle = Number(match[1]);
  const x = Number(match[2]) + translateX;
  const y = Number(match[3]) + translateY;
  return `rotate(${roundValue(angle)} ${roundValue(x)} ${roundValue(y)})`;
}

function normalizeStructuredSvgCanvas(doc) {
  const root = doc.documentElement;
  const pathNodes = Array.from(doc.querySelectorAll("path[d]"));
  const boxes = pathNodes
    .map(node => {
      try {
        return getPathBBox(node.getAttribute("d") || "");
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean);

  if (!boxes.length) {
    return;
  }

  const minX = Math.min(...boxes.map(box => box.minX));
  const minY = Math.min(...boxes.map(box => box.minY));
  const maxX = Math.max(...boxes.map(box => box.maxX));
  const maxY = Math.max(...boxes.map(box => box.maxY));
  const padding = Math.max(12, roundValue(Math.min(40, Math.max(maxX - minX, maxY - minY) * 0.04)));
  const translateX = padding - minX;
  const translateY = padding - minY;
  const nextWidth = roundValue((maxX - minX) + padding * 2);
  const nextHeight = roundValue((maxY - minY) + padding * 2);
  const currentWidth = parseNumericLength(root.getAttribute("width") || "");
  const currentHeight = parseNumericLength(root.getAttribute("height") || "");
  const currentViewBox = (root.getAttribute("viewBox") || "").trim().split(/\s+/).map(Number);
  const widthScale = currentViewBox.length === 4 && Number.isFinite(currentWidth) && currentViewBox[2]
    ? currentWidth / currentViewBox[2]
    : 1;
  const heightScale = currentViewBox.length === 4 && Number.isFinite(currentHeight) && currentViewBox[3]
    ? currentHeight / currentViewBox[3]
    : 1;
  const widthUnit = extractLengthUnit(root.getAttribute("width") || "") || "mm";
  const heightUnit = extractLengthUnit(root.getAttribute("height") || "") || "mm";

  for (const pathNode of pathNodes) {
    pathNode.setAttribute("d", transformPathData(pathNode.getAttribute("d") || "", { translateX, translateY }));
    if (pathNode.hasAttribute("data-panel-mesh-d")) {
      pathNode.setAttribute(
        "data-panel-mesh-d",
        transformPathData(pathNode.getAttribute("data-panel-mesh-d") || "", { translateX, translateY })
      );
    }
    if (pathNode.hasAttribute("data-panel-cutout-d")) {
      pathNode.setAttribute(
        "data-panel-cutout-d",
        transformPathData(pathNode.getAttribute("data-panel-cutout-d") || "", { translateX, translateY })
      );
    }
    if (pathNode.hasAttribute("data-panel-slit-cut-d")) {
      pathNode.setAttribute(
        "data-panel-slit-cut-d",
        transformPathData(pathNode.getAttribute("data-panel-slit-cut-d") || "", { translateX, translateY })
      );
    }
  }

  const labelNodes = Array.from(doc.querySelectorAll("text, tspan"));
  for (const labelNode of labelNodes) {
    if (labelNode.hasAttribute("x")) {
      labelNode.setAttribute("x", String(roundValue((Number(labelNode.getAttribute("x")) || 0) + translateX)));
    }
    if (labelNode.hasAttribute("y")) {
      labelNode.setAttribute("y", String(roundValue((Number(labelNode.getAttribute("y")) || 0) + translateY)));
    }
    if (labelNode.hasAttribute("transform")) {
      labelNode.setAttribute("transform", translateRotateTransform(labelNode.getAttribute("transform") || "", translateX, translateY));
    }
  }

  root.setAttribute("viewBox", `0 0 ${nextWidth} ${nextHeight}`);
  root.setAttribute("width", `${roundValue(nextWidth * widthScale)}${widthUnit}`);
  root.setAttribute("height", `${roundValue(nextHeight * heightScale)}${heightUnit}`);
  root.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const metadataNode = doc.getElementById("box-template-metadata");
  if (metadataNode) {
    try {
      const metadata = JSON.parse(metadataNode.textContent || "{}");
      metadata.viewBox = [0, 0, nextWidth, nextHeight];
      if (metadata.source) {
        metadata.source.viewBox = `0 0 ${nextWidth} ${nextHeight}`;
        metadata.source.width = root.getAttribute("width");
        metadata.source.height = root.getAttribute("height");
      }
      if (Array.isArray(metadata.panels)) {
        for (const panel of metadata.panels) {
          if (typeof panel.path === "string" && panel.path.trim()) {
            panel.path = transformPathData(panel.path, { translateX, translateY });
          }
          if (typeof panel.meshD === "string" && panel.meshD.trim()) {
            panel.meshD = transformPathData(panel.meshD, { translateX, translateY });
          }
          if (typeof panel.cutoutD === "string" && panel.cutoutD.trim()) {
            panel.cutoutD = transformPathData(panel.cutoutD, { translateX, translateY });
          }
          if (typeof panel.slitCutD === "string" && panel.slitCutD.trim()) {
            panel.slitCutD = transformPathData(panel.slitCutD, { translateX, translateY });
          }
          if (Array.isArray(panel.labelPosition) && panel.labelPosition.length >= 2) {
            panel.labelPosition = [
              roundValue((Number(panel.labelPosition[0]) || 0) + translateX),
              roundValue((Number(panel.labelPosition[1]) || 0) + translateY)
            ];
          }
          if (panel.labelLayout) {
            panel.labelLayout.x = roundValue((Number(panel.labelLayout.x) || 0) + translateX);
            panel.labelLayout.y = roundValue((Number(panel.labelLayout.y) || 0) + translateY);
          }
        }
      }
      metadataNode.textContent = JSON.stringify(metadata, null, 2);
    } catch (_error) {
      // ignore malformed metadata during display normalization
    }
  }
}

function applyStructuredSvgDisplayStyles(doc) {
  for (const cutLineNode of doc.querySelectorAll('[data-box-role="cut-line"]')) {
    cutLineNode.setAttribute("fill", "none");
    cutLineNode.setAttribute("stroke", "#74001D");
    cutLineNode.setAttribute("stroke-width", "2");
    cutLineNode.setAttribute("stroke-linecap", "round");
    cutLineNode.setAttribute("stroke-linejoin", "round");
    cutLineNode.setAttribute("vector-effect", "non-scaling-stroke");
  }
  for (const foldLineNode of doc.querySelectorAll('[data-box-role="fold-line"]')) {
    foldLineNode.setAttribute("fill", "none");
    foldLineNode.setAttribute("stroke", "#00AEEF");
    foldLineNode.setAttribute("stroke-width", "1.2");
    foldLineNode.setAttribute("stroke-linecap", "round");
    foldLineNode.setAttribute("stroke-linejoin", "round");
    foldLineNode.setAttribute("vector-effect", "non-scaling-stroke");
  }
  for (const cutoutNode of doc.querySelectorAll('[data-box-role="cutout-shape"]')) {
    cutoutNode.setAttribute("stroke", "#74001D");
    cutoutNode.setAttribute("stroke-width", "1");
    cutoutNode.setAttribute("stroke-linecap", "round");
    cutoutNode.setAttribute("stroke-linejoin", "round");
    cutoutNode.setAttribute("vector-effect", "non-scaling-stroke");
  }
}

function parseImportedTemplateSvg(svgText, templateId) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const metadataNode = doc.getElementById("box-template-metadata");
  const metadataText = metadataNode ? metadataNode.textContent : "{}";
  const metadata = JSON.parse(metadataText);
  const template = getTemplateDefinition(templateId);
  const templatePanelDefinitions = buildTemplatePanelDefinitionMap(templateId);
  const templateFoldDefinitions = buildTemplateFoldDefinitionMap(templateId);
  const metadataPanels = new Map((metadata.panels || []).map(panel => [panel.id, panel]));
  const foldPaths = Array.from(doc.querySelectorAll('[data-box-role="fold-line"]'));
  const cutLineNodes = Array.from(doc.querySelectorAll('[data-box-role="cut-line"]'));
  const foldPathMap = new Map(foldPaths.map(path => [path.id, path.getAttribute("d")]));
  const labelNodes = Array.from(doc.querySelectorAll('#labels text'));
  const panelElements = Array.from(doc.querySelectorAll('[data-box-role="panel"]'));
  const panels = panelElements.map((panelEl, index) => {
    const id = panelEl.getAttribute("data-panel-id");
    const templatePanel = templatePanelDefinitions.get(id) || {};
    const meta = metadataPanels.get(id) || {};
    const labelNode = labelNodes.find(node => node.getAttribute("data-label-panel-id") === id)
      || labelNodes.find(node => node.textContent === (templatePanel.displayName || meta.displayLabel || meta.label || PANEL_DISPLAY_NAMES[id] || id))
      || labelNodes[index]
      || null;
    if (labelNode && !labelNode.getAttribute("data-label-panel-id")) {
      labelNode.setAttribute("data-label-panel-id", id);
    }
    const labelNodeX = labelNode ? (Number.parseFloat(labelNode.getAttribute("x") || "0") || 0) : 0;
    const labelNodeY = labelNode ? (Number.parseFloat(labelNode.getAttribute("y") || "0") || 0) : 0;
    const d = panelEl.getAttribute("d");
    const rawPanelType = panelEl.getAttribute("data-panel-type") || templatePanel.type || meta.type || "panel";
    const rawPanelGlue = panelEl.getAttribute("data-panel-is-glue") || String(templatePanel.isGlue ?? meta.isGlue ?? "");
    const templateLabelLayout = templatePanel.labelLayout || null;
    const artworkText = meta.artworkText ?? meta.labelLayout?.text ?? templateLabelLayout?.text ?? "";
    const mergedLabelLayout = (meta.labelLayout || templateLabelLayout)
      ? {
          text: String(artworkText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n"),
          x: Number.isFinite(Number(meta.labelLayout?.x))
            ? Number(meta.labelLayout.x)
            : (Number.isFinite(Number(templateLabelLayout?.x)) ? Number(templateLabelLayout.x) : labelNodeX),
          y: Number.isFinite(Number(meta.labelLayout?.y))
            ? Number(meta.labelLayout.y)
            : (Number.isFinite(Number(templateLabelLayout?.y)) ? Number(templateLabelLayout.y) : labelNodeY),
          fontSize: Number.isFinite(Number(meta.labelLayout?.fontSize))
            ? Number(meta.labelLayout.fontSize)
            : (Number(templateLabelLayout?.fontSize) || 0),
          rotationDeg: Number.isFinite(Number(meta.labelLayout?.rotationDeg))
            ? Number(meta.labelLayout.rotationDeg)
            : (Number(templateLabelLayout?.rotationDeg) || 0),
          maxWidth: Number.isFinite(Number(meta.labelLayout?.maxWidth))
            ? Number(meta.labelLayout.maxWidth)
            : (Number(templateLabelLayout?.maxWidth) || 0),
          lineHeight: Number.isFinite(Number(meta.labelLayout?.lineHeight))
            ? Number(meta.labelLayout.lineHeight)
            : (Number(templateLabelLayout?.lineHeight) || 1.2),
          fontFamily: meta.labelLayout?.fontFamily || templateLabelLayout?.fontFamily || "Arial, sans-serif",
          fontWeight: meta.labelLayout?.fontWeight || templateLabelLayout?.fontWeight || "700",
          fontStyle: meta.labelLayout?.fontStyle || templateLabelLayout?.fontStyle || "normal",
          fill: meta.labelLayout?.fill || templateLabelLayout?.fill || "#333333"
        }
      : null;

    return {
      id,
      sourceId: templatePanel.standardName || meta.sourceId || meta.standardName || id,
      type: isGluePanelEnabled(
        {
          isGlue: rawPanelGlue.toLowerCase() === "true",
          type: rawPanelType
        },
        rawPanelType
      ) ? "glue-flap" : "panel",
      standardName: templatePanel.standardName || panelEl.getAttribute("data-panel-standard-name") || meta.standardName || id,
      displayName: templatePanel.displayName || panelEl.getAttribute("data-panel-display-name") || meta.displayName || meta.displayLabel || meta.label || PANEL_DISPLAY_NAMES[id] || id,
      isGlue: rawPanelGlue.toLowerCase() === "true",
      parent: templatePanel.foldParent ?? panelEl.getAttribute("data-fold-parent") ?? meta.foldParent ?? null,
      foldId: templatePanel.foldId || panelEl.getAttribute("data-fold-id") || meta.foldId || "",
      angle: Number.isFinite(templatePanel.foldAngleDeg)
        ? templatePanel.foldAngleDeg
        : (Number.parseFloat(panelEl.getAttribute("data-fold-angle-deg") || meta.foldAngleDeg || "0") || 0),
      d,
      meshD: panelEl.getAttribute("data-panel-mesh-d") || meta.meshD || meta.meshPath || d,
      label: String(artworkText || ""),
      labelLayout: mergedLabelLayout,
      labelPosition: Array.isArray(meta.labelPosition)
        ? meta.labelPosition
        : (labelNode ? [labelNodeX, labelNodeY] : null),
      objectId: panelEl.getAttribute("data-object-id") || "",
      cutoutD: meta.cutoutD || panelEl.getAttribute("data-panel-cutout-d") || "",
      slitCutD: meta.slitCutD || panelEl.getAttribute("data-panel-slit-cut-d") || "",
      artwork: meta.artwork || null,
      custom3d: meta.custom3d || templatePanel.custom3d || null
    };
  });

  const panelBoxes = new Map(panels.map(panel => [panel.id, getPathBBox(panel.d)]));
  attachInteriorOpenCutPathsToPanels(panels, panelBoxes, cutLineNodes);
  resolveImportedPanelParents(panels, panelBoxes);
  const panelMap = new Map(panels.map(panel => [panel.id, panel]));
  const folds = [];
  const usedFoldIds = new Map();

  for (const panel of panels) {
    if (!panel.parent) continue;
    const parentPanel = panelMap.get(panel.parent);
    if (!parentPanel) continue;

    const expectedEdge = inferSharedEdge(panelBoxes.get(parentPanel.id), panelBoxes.get(panel.id));
    const candidateSegments = [];
    const foldIdParts = panel.foldId ? panel.foldId.split("/") : [];

    for (const [pathId, pathD] of foldPathMap.entries()) {
      if (
        pathId === panel.foldId ||
        foldIdParts.includes(pathId) ||
        (panel.foldId && panel.foldId.startsWith(pathId)) ||
        (panel.foldId && pathId.startsWith(panel.foldId))
      ) {
        candidateSegments.push(...parseSimplePathSegments(pathD));
      }
    }

    let hingeSegment = null;
    if (candidateSegments.length) {
      if (expectedEdge) {
        const rankedSegments = [...candidateSegments].sort((a, b) => getSegmentScore(a, expectedEdge) - getSegmentScore(b, expectedEdge));
        const bestSegment = rankedSegments[0];
        const metrics = getSegmentAlignmentMetrics(bestSegment, expectedEdge);
        hingeSegment = metrics.offset <= 2 && metrics.overlapRatio >= 0.35
          ? bestSegment
          : {
              start: expectedEdge.start,
              end: expectedEdge.end
            };
      } else {
        hingeSegment = candidateSegments[0];
      }
    } else if (expectedEdge) {
      hingeSegment = {
        start: expectedEdge.start,
        end: expectedEdge.end
      };
    }

    if (!hingeSegment) continue;

    const baseFoldId = panel.foldId || makeFallbackFoldId(parentPanel.id, panel.id);
    const foldInstanceCount = usedFoldIds.get(baseFoldId) || 0;
    usedFoldIds.set(baseFoldId, foldInstanceCount + 1);
    const foldId = foldInstanceCount ? `${baseFoldId}__${panel.id}` : baseFoldId;
    const templateFold = templateFoldDefinitions.get(baseFoldId) || templateFoldDefinitions.get(panel.foldId) || null;
    const templateFoldDisplayName = templateFold && templateFold.from === parentPanel.id && templateFold.to === panel.id
      ? templateFold.displayName
      : "";
    folds.push({
      id: foldId,
      from: parentPanel.id,
      to: panel.id,
      d: lineFromSegment(hingeSegment),
      angleDeg: panel.angle,
      displayName: templateFoldDisplayName || makeImportedFoldLabel(parentPanel.label, panel.label)
    });
  }

  const rootPanels = panels.filter(panel => !panel.parent).map(panel => panel.id);
  const floorPanel = template.floorPanel || metadata.floorPanel || metadata.basePanel || rootPanels[0] || (panels[0] && panels[0].id) || "base";
  const floorPanelsByObject = template.floorPanelsByObject || metadata.floorPanelsByObject || null;
  const floorFoldId = template.floorFoldId || metadata.floorFold || metadata.floorFoldId || metadata.floorHingeFold || "";
  const floorFoldDistribution = template.floorFoldDistribution || metadata.floorFoldDistribution || null;
  const custom3d = template.custom3d || metadata.custom3d || null;
  const assembledDefaults = metadata.assembledDefaults
    || (custom3d && custom3d.camera && custom3d.camera.foldedState)
    || null;
  const assembledFrontPanel = template.assembledFrontPanel
    || metadata.assembledFrontPanel
    || "";
  const defaultAssemblySteps = Array.isArray(template.defaultAssemblySteps) && template.defaultAssemblySteps.length
    ? template.defaultAssemblySteps.map(step => ({ ...step }))
    : (Array.isArray(metadata.defaultAssemblySteps) ? metadata.defaultAssemblySteps.map(step => ({ ...step })) : []);
  const foldSequence = Array.isArray(template.foldSequence) && template.foldSequence.length
    ? template.foldSequence
    : (Array.isArray(metadata.foldSequence) ? metadata.foldSequence : []);
  const viewBox = metadata.viewBox || [];
  const outlineNode = doc.getElementById("cut-outline");
  const slitNode = doc.getElementById("cut-lock-slit");
  const cutoutNode = doc.getElementById("cut-lock-cutout-closed");

  return {
    svgText,
    metadata,
    geometry: {
      pageW: Number(viewBox[2]) || Number(doc.documentElement.viewBox.baseVal.width) || 1000,
      pageH: Number(viewBox[3]) || Number(doc.documentElement.viewBox.baseVal.height) || 1000,
      outlineD: outlineNode ? outlineNode.getAttribute("d") : "",
      slitD: slitNode ? slitNode.getAttribute("d") : "",
      lockCutoutD: cutoutNode ? cutoutNode.getAttribute("d") : "",
      templateFeatures: metadata.templateFeatures || null,
      panels,
      folds,
      glueAreas: Array.from(doc.querySelectorAll('[data-box-role="glue-area"]')).map((area, index) => ({
        id: area.id || `glue-${index + 1}`,
        points: area.getAttribute("points")
      })),
      rootPanel: rootPanels[0] || "base",
      rootPanels,
      floorPanel,
      floorPanelsByObject,
      floorFoldId,
      floorFoldDistribution,
      foldSequence,
      defaultAssemblySteps,
      custom3d,
      assembledDefaults,
      assembledFrontPanel,
      sideArtwork: metadata.sideArtwork || { outside: null, inside: null },
      flatSheetD: template.custom3d && template.custom3d.showFlatSheet ? (outlineNode ? outlineNode.getAttribute("d") : "") : "",
      __cacheKey: JSON.stringify({
        templateId,
        rootPanels,
        floorPanel,
        floorPanelsByObject,
        floorFoldId,
        floorFoldDistribution,
        foldSequence,
        defaultAssemblySteps,
        custom3d,
        templateFeatures: metadata.templateFeatures || null,
        assembledDefaults,
        assembledFrontPanel,
        outlineD: outlineNode ? outlineNode.getAttribute("d") : "",
        panels: panels.map(panel => ({
          id: panel.id,
          d: panel.d || "",
          meshD: panel.meshD || "",
          cutoutD: panel.cutoutD || "",
          slitCutD: panel.slitCutD || "",
          parent: panel.parent || "",
          foldId: panel.foldId || "",
          angle: panel.angle || 0
        })),
        folds: folds.map(fold => ({
          id: fold.id,
          d: fold.d || "",
          angleDeg: fold.angleDeg || 0
        }))
      })
    }
  };
}

function filterStructuredSvgForTemplate(svgText, template) {
  const keepPanelIds = new Set(template.includePanelIds || []);
  const keepCutPathIds = new Set(template.includeCutPathIds || []);
  if (!keepPanelIds.size && !keepCutPathIds.size) {
    return svgText;
  }

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const root = doc.documentElement;
  const metadataNode = doc.getElementById("box-template-metadata");
  let metadata = null;

  if (metadataNode) {
    try {
      metadata = JSON.parse(metadataNode.textContent || "{}");
    } catch (_error) {
      metadata = null;
    }
  }

  const panelNodes = Array.from(doc.querySelectorAll('[data-box-role="panel"]'));
  for (const panelNode of panelNodes) {
    const panelId = panelNode.getAttribute("data-panel-id") || "";
    if (!keepPanelIds.has(panelId)) {
      panelNode.remove();
    }
  }

  const previewNodes = Array.from(doc.querySelectorAll('#panel-preview path'));
  for (const previewNode of previewNodes) {
    const previewId = previewNode.getAttribute("id") || "";
    const panelId = previewId.startsWith("preview-") ? previewId.slice("preview-".length) : "";
    if (!keepPanelIds.has(panelId)) {
      previewNode.remove();
    }
  }

  const artworkNodes = Array.from(doc.querySelectorAll('[data-box-role="artwork-panel"]'));
  for (const artworkNode of artworkNodes) {
    const panelId = artworkNode.getAttribute("data-panel-id") || "";
    if (!keepPanelIds.has(panelId)) {
      artworkNode.remove();
    }
  }

  const metadataPanelOrder = Array.isArray(metadata?.panels)
    ? metadata.panels.map(panel => panel.id)
    : panelNodes.map(panelNode => panelNode.getAttribute("data-panel-id") || "");
  const labelNodes = Array.from(doc.querySelectorAll('#labels text'));
  for (const [index, labelNode] of labelNodes.entries()) {
    const inferredPanelId = labelNode.getAttribute("data-label-panel-id") || metadataPanelOrder[index] || "";
    if (inferredPanelId && !labelNode.getAttribute("data-label-panel-id")) {
      labelNode.setAttribute("data-label-panel-id", inferredPanelId);
    }
    if (inferredPanelId && !keepPanelIds.has(inferredPanelId)) {
      labelNode.remove();
    }
  }

  const remainingLabelNodes = Array.from(doc.querySelectorAll('#labels text'));
  if (remainingLabelNodes.length === 1) {
    remainingLabelNodes[0].textContent = template.name;
  }

  const clipPathNodes = Array.from(doc.querySelectorAll('clipPath[id^="clip-"]'));
  for (const clipPathNode of clipPathNodes) {
    const panelId = clipPathNode.id.slice("clip-".length);
    if (!keepPanelIds.has(panelId)) {
      clipPathNode.remove();
    }
  }

  const cutPathNodes = Array.from(doc.querySelectorAll('[data-box-role="cut-line"], [data-box-role="cutout-shape"]'));
  for (const cutPathNode of cutPathNodes) {
    if (!keepCutPathIds.has(cutPathNode.id || "")) {
      cutPathNode.remove();
    }
  }

  const keptPathDs = [];
  for (const panelNode of doc.querySelectorAll('[data-box-role="panel"]')) {
    const d = panelNode.getAttribute("d");
    if (d) keptPathDs.push(d);
  }
  for (const cutPathNode of doc.querySelectorAll('[data-box-role="cut-line"], [data-box-role="cutout-shape"]')) {
    const d = cutPathNode.getAttribute("d");
    if (d) keptPathDs.push(d);
  }

  if (keptPathDs.length) {
    const boxes = keptPathDs.map(getPathBBox);
    const minX = Math.min(...boxes.map(box => box.minX));
    const minY = Math.min(...boxes.map(box => box.minY));
    const maxX = Math.max(...boxes.map(box => box.maxX));
    const maxY = Math.max(...boxes.map(box => box.maxY));
    const padding = 5;
    const nextViewBox = [
      roundValue(minX - padding),
      roundValue(minY - padding),
      roundValue((maxX - minX) + padding * 2),
      roundValue((maxY - minY) + padding * 2)
    ];
    const originalViewBox = (root.getAttribute("viewBox") || "").trim().split(/\s+/).map(Number);
    const widthValue = parseNumericLength(root.getAttribute("width") || "");
    const heightValue = parseNumericLength(root.getAttribute("height") || "");
    const widthUnit = extractLengthUnit(root.getAttribute("width") || "") || "mm";
    const heightUnit = extractLengthUnit(root.getAttribute("height") || "") || "mm";
    const widthScale = originalViewBox.length === 4 && Number.isFinite(widthValue) && originalViewBox[2]
      ? widthValue / originalViewBox[2]
      : 1;
    const heightScale = originalViewBox.length === 4 && Number.isFinite(heightValue) && originalViewBox[3]
      ? heightValue / originalViewBox[3]
      : 1;

    root.setAttribute("viewBox", nextViewBox.join(" "));
    root.setAttribute("width", `${roundValue(nextViewBox[2] * widthScale)}${widthUnit}`);
    root.setAttribute("height", `${roundValue(nextViewBox[3] * heightScale)}${heightUnit}`);

    if (metadata) {
      metadata.viewBox = nextViewBox;
      if (metadata.source) {
        metadata.source.viewBox = nextViewBox.join(" ");
        metadata.source.width = root.getAttribute("width");
        metadata.source.height = root.getAttribute("height");
      }
    }
  }

  root.setAttribute("data-template-id", template.id);
  if (metadata) {
    metadata.template = template.id;
    metadata.templateLabel = template.name;
    metadata.basePanel = template.includePanelIds?.[0] || metadata.basePanel || "";
    metadata.floorPanel = template.includePanelIds?.[0] || metadata.floorPanel || metadata.basePanel || "";
    if (Array.isArray(metadata.panels)) {
      metadata.panels = metadata.panels
        .filter(panel => keepPanelIds.has(panel.id))
        .map(panel => ({
          ...panel,
          label: template.name,
          displayLabel: template.name,
          displayName: template.name
        }));
    }
    if (Array.isArray(metadata.cutPaths)) {
      metadata.cutPaths = metadata.cutPaths.filter(path => keepCutPathIds.has(path.id));
    }
    if (Array.isArray(metadata.objects)) {
      metadata.objects = metadata.objects.filter(object => {
        const panelIds = Array.isArray(object.panelIds) ? object.panelIds : [];
        return panelIds.some(panelId => keepPanelIds.has(panelId)) || keepPanelIds.has(object.basePanel || "");
      });
    }
    metadataNode.textContent = JSON.stringify(metadata, null, 2);
  }

  return new XMLSerializer().serializeToString(doc);
}

async function loadImportedTemplate(templateId, structuredFileOverride = "") {
  const template = getTemplateSpec(templateId);
  const structuredFile = structuredFileOverride || template.structuredFile || "";
  if (!structuredFile) {
    return null;
  }
  const cacheKey = `${templateId}:${structuredFile}`;
  if (importedTemplateCache.has(cacheKey)) {
    return importedTemplateCache.get(cacheKey);
  }

  const promise = fetch(new URL(structuredFile, import.meta.url), { cache: "no-store" })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load structured SVG for ${templateId}.`);
      }
      return response.text();
    })
    .then(svgText => ({
      templateId,
      svgText
    }));

  importedTemplateCache.set(cacheKey, promise);
  return promise;
}

async function getGeneratedStructuredTemplate(templateId, params) {
  const template = getTemplateDefinition(templateId);
  const templateBuilder = getTemplateBuilder(templateId);
  if (templateBuilder && templateBuilder.mode === "procedural" && typeof templateBuilder.build === "function") {
    return templateBuilder.build(params || {}, template);
  }
  if (templateBuilder && templateBuilder.mode === "fixture" && templateBuilder.svgText) {
    const regeneratedSvg = filterStructuredSvgForTemplate(
      buildParametricStructuredSvg(templateBuilder.svgText, templateId, params || {}),
      template
    );
    return parseImportedTemplateSvg(regeneratedSvg, templateId);
  }
  const importedTemplate = await loadImportedTemplate(templateId);
  if (!importedTemplate) {
    throw new Error(`Missing structured SVG template for ${templateId}.`);
  }
  const regeneratedSvg = filterStructuredSvgForTemplate(
    buildParametricStructuredSvg(importedTemplate.svgText, templateId, params || {}),
    template
  );
  return parseImportedTemplateSvg(regeneratedSvg, templateId);
}

async function buildTemplateGeometry(params, templateId = DEFAULT_TEMPLATE_ID) {
  const generatedTemplate = await getGeneratedStructuredTemplate(templateId, params);
  const normalizedSvg = normalizeStructuredSvgMarkup(
    generatedTemplate.svgText,
    false,
    false,
    null,
    "outside"
  );
  return parseImportedTemplateSvg(normalizedSvg, templateId).geometry;
}

async function buildSvgMarkup({ templateId = DEFAULT_TEMPLATE_ID, params, showPanels = false, showLabels = false, refinement = null, previewSide = "outside" }) {
  const generatedTemplate = await getGeneratedStructuredTemplate(templateId, params);
  return normalizeStructuredSvgMarkup(generatedTemplate.svgText, showPanels, showLabels, refinement, previewSide);
}

export {
  PANEL_DISPLAY_NAMES,
  TEMPLATE_SPECS,
  buildSvgMarkup,
  buildTemplateGeometry,
  getTemplateDefinition,
  getTemplateDefaults,
  getTemplateFieldGroups,
  getTemplateFeatureControls,
  getTemplateSpec
};
