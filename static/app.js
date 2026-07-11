import {
  PANEL_DISPLAY_NAMES,
  TEMPLATE_SPECS,
  buildSvgMarkup,
  buildTemplateGeometry,
  getTemplateDefaults,
  getTemplateFieldGroups,
  getTemplateDefinition,
  getTemplateFeatureControls,
  getTemplateSpec
} from "./svg-generator.js";
import { getRenderableArtworkImageDataUrl, isSvgArtworkDataUrl } from "./artwork-engine.js";
import {
  get3dPreviewSnapshot,
  getDefaultPaperStockId,
  getPaperStockOptions,
  init3dPreview,
  update3dPreview
} from "./three-engine.js";

const unitRadios = Array.from(document.querySelectorAll('input[name="unit"]'));
const templatePicker = document.getElementById("templatePicker");
const templateVariantFieldEl = document.getElementById("templateVariantField");
const templateVariantPickerEl = document.getElementById("templateVariantPicker");
const templateTitle = document.getElementById("templateTitle");
const stageTemplateName = document.getElementById("stageTemplateName");
const previewEl = document.getElementById("preview");
const previewZoomOutEl = document.getElementById("previewZoomOut");
const previewZoomResetEl = document.getElementById("previewZoomReset");
const previewZoomInEl = document.getElementById("previewZoomIn");
const previewZoomValueEl = document.getElementById("previewZoomValue");
const previewSideSwitchEl = document.getElementById("previewSideSwitch");
const previewWorkbenchEl = document.getElementById("previewWorkbench");
const modelWorkbenchEl = document.getElementById("modelWorkbench");
const modelEl = document.getElementById("model3d");
const statusEl = document.getElementById("status");
const foldSlider = document.getElementById("foldProgress");
const showModelLabelsEl = document.getElementById("showModelLabels");
const autoAssembleModelEl = document.getElementById("autoAssembleModel");
const captureAssembledDefaultEl = document.getElementById("captureAssembledDefault");
const addModelRotationStepEl = document.getElementById("addModelRotationStep");
const addObjectMoveStepEl = document.getElementById("addObjectMoveStep");
const materialPresetEl = document.getElementById("materialPreset");
const materialThicknessEl = document.getElementById("materialThickness");
const paperStockEl = document.getElementById("paperStock");
const textureScaleEl = document.getElementById("textureScale");
const assemblyPlanControlsEl = document.getElementById("assemblyPlanControls");
const templatePrimaryGroupEl = document.getElementById("templatePrimaryGroup");
const templateOptionalGroupEl = document.getElementById("templateOptionalGroup");
const templateRefinementControlsEl = document.getElementById("templateRefinementControls");
const structuredSvgOutputEl = document.getElementById("structuredSvgOutput");
const copyStructuredSvgOutputEl = document.getElementById("copyStructuredSvgOutput");
const exportPrintReadySvgEl = document.getElementById("exportPrintReadySvg");
const labelLayoutWorkbenchEl = document.getElementById("labelLayoutWorkbench");
const foldPlanPanelEl = document.getElementById("foldPlanPanel");
const toggleLabelLayoutWorkbenchEl = document.getElementById("toggleLabelLayoutWorkbench");
const toggleFoldPlanPanelEl = document.getElementById("toggleFoldPlanPanel");
const previewEditOverlayEl = document.getElementById("previewEditOverlay");
const previewLayerOverlayEl = document.getElementById("previewLayerOverlay");
const artworkImageInputEl = document.getElementById("artworkImageInput");
const fontFileInputEl = document.getElementById("fontFileInput");

const MATERIAL_PRESETS = {
  "strong-paper": 0.4,
  "folding-board": 0.6,
  "light-cardboard": 1.2
};

const initialTemplateId = TEMPLATE_SPECS.length ? TEMPLATE_SPECS[0].id : "";
const TEMPLATE_FAMILIES = buildTemplateFamilies(TEMPLATE_SPECS);
const STEP_EASING_OPTIONS = [
  { value: "ease-in-out", label: "ease in/out" },
  { value: "linear", label: "linear" },
  { value: "instant", label: "instant" }
];
const DEFAULT_FONT_OPTIONS = [
  "Arial, sans-serif",
  "OlivettiLettera22Typewriter, 'Olivetti Lettera 22 Typewriter', serif",
  "'DejaVu Sans', sans-serif",
  "'DejaVu Sans Mono', monospace",
  "'DejaVu Serif', serif",
  "Ubuntu, sans-serif",
  "'Ubuntu Condensed', sans-serif",
  "'Ubuntu Mono', monospace"
];
let availableFontOptions = [...DEFAULT_FONT_OPTIONS];

const state = {
  unit: "mm",
  templateId: initialTemplateId,
  paperStock: getDefaultPaperStockId(),
  textureScale: 1,
  showPanels: false,
  showLabels: false,
  showModelLabels: false,
  previewSide: "outside",
  previewZoom: 1,
  labelLayoutWorkbenchCollapsed: true,
  foldPlanCollapsed: true,
  selectedPanelId: "",
  selectedFoldId: "",
  selectedObjectId: "",
  foldLocks: {},
  fold: getTemplateSpec(initialTemplateId).defaultFoldProgress ?? 0,
  autoAssemble: false,
  autoAssembleOrbitDeg: 0,
  autoAssembleRaf: 0,
  autoAssembleCameraStart: null,
  autoAssembleStartProgress: 0,
  assemblySteps: [],
  templateRefinements: {},
  lastSvgMarkup: "",
  lastGeometry: null,
  renderToken: 0,
  doodleMode: false,
  customFonts: {},
  editMode: false,
  editTool: "select",
  artworkHistory: {
    outside: { undo: [], redo: [] },
    inside: { undo: [], redo: [] }
  }
};

const EDIT_3D_RENDER_DELAY_MS = 140;
let refinementRenderToken = 0;
let queued3dRenderTimer = 0;
let activeArtworkDrag = null;
let activeTextBoxDrag = null;
let previewInteractionFramePending = false;
let liveDoodlePreviewPath = null;
let liveImageTransformOverlay = null;
let liveDoodleCursor = null;
let liveTextBoxFrame = null;
let inlineTextEditorEl = null;
let lastDoodleCursorPoint = null;
let activeArtworkHistoryCapture = null;
let activeEraserPointerId = 0;

function $(id) {
  return document.getElementById(id);
}

function roundValue(value) {
  return Number.parseFloat(Number(value).toFixed(3));
}

function normalizeFontOptionLabel(value) {
  return String(value || "")
    .split(",")[0]
    .replace(/^['"]|['"]$/g, "")
    .trim() || "Font";
}

function normalizeFontFamilyValue(value) {
  return String(value || "").trim();
}

function ensureFontOption(value) {
  const normalized = normalizeFontFamilyValue(value);
  if (!normalized) {
    return;
  }
  if (!availableFontOptions.includes(normalized)) {
    availableFontOptions = [normalized, ...availableFontOptions];
  }
}

function guessFontFormat(fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".woff2")) return "woff2";
  if (lower.endsWith(".woff")) return "woff";
  if (lower.endsWith(".otf")) return "opentype";
  return "truetype";
}

function normalizeFontFamilyNameFromFile(fileName) {
  return String(fileName || "Custom Font")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim() || "Custom Font";
}

async function registerCustomFont({ family, dataUrl, format, sourceName = "" }) {
  const normalizedFamily = normalizeFontFamilyValue(family);
  if (!normalizedFamily || !dataUrl) {
    return null;
  }
  const face = new FontFace(normalizedFamily, `url(${JSON.stringify(dataUrl)}) format("${format || "truetype"}")`);
  await face.load();
  document.fonts.add(face);
  state.customFonts[normalizedFamily] = {
    family: normalizedFamily,
    dataUrl,
    format: format || "truetype",
    sourceName: sourceName || normalizedFamily
  };
  ensureFontOption(normalizedFamily);
  return normalizedFamily;
}

async function loadBrowserFontOptions() {
  if (typeof window === "undefined" || typeof window.queryLocalFonts !== "function") {
    return;
  }
  try {
    const fonts = await window.queryLocalFonts();
    const families = Array.from(new Set(
      fonts
        .map(font => normalizeFontFamilyValue(font.family))
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
    if (families.length) {
      availableFontOptions = Array.from(new Set([...DEFAULT_FONT_OPTIONS, ...families]));
    }
  } catch (_error) {
    // The API is permission-gated and not available in every browser/context.
  }
}

function easeInOutCubic(value) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function getAssemblyStateForProgress(progress) {
  const steps = Array.isArray(state.assemblySteps) ? state.assemblySteps : [];
  const slots = [];
  for (const step of steps) {
    if (step.syncWithPrevious && slots.length) {
      slots[slots.length - 1].push(step);
    } else {
      slots.push([step]);
    }
  }
  const totalSteps = Math.max(1, slots.length);
  const timeline = clamp(progress, 0, 1) * totalSteps;
  const foldProgressById = {};
  const foldAnglesDeg = {};
  const modelRotationSteps = [];
  const objectMoveTotals = new Map();

  for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
    const local = clamp(timeline - slotIndex, 0, 1);
    for (const step of slots[slotIndex]) {
      const eased = applyAssemblyStepEasing(local, step.easing);
      if (step.type === "fold") {
        foldProgressById[step.foldId] = eased;
        foldAnglesDeg[step.foldId] = Number(step.angleDeg) || 0;
        continue;
      }
      if (step.type === "model-rotation") {
        modelRotationSteps.push({
          objectId: step.objectId || "__all__",
          axis: step.axis || "z",
          angleDeg: roundValue((Number(step.angleDeg) || 0) * eased)
        });
        continue;
      }
      if (step.type === "object-move") {
        const key = `${step.objectId || "__default__"}:${step.axis || "x"}`;
        objectMoveTotals.set(key, roundValue((objectMoveTotals.get(key) || 0) + ((Number(step.distanceMm) || 0) * eased)));
        continue;
      }
    }
  }

  return {
    foldProgressById,
    foldAnglesDeg,
    modelRotationSteps: modelRotationSteps.filter(step => Math.abs(step.angleDeg) > 0.0001),
    objectMoveSteps: Array.from(objectMoveTotals.entries()).map(([key, distanceMm]) => {
      const [objectId, axis] = key.split(":");
      return { objectId, axis, distanceMm };
    }).filter(step => Math.abs(step.distanceMm) > 0.0001)
  };
}

function applyAssemblyStepEasing(value, easing = "ease-in-out") {
  const progress = clamp(value, 0, 1);
  if (easing === "instant") {
    return progress > 0 ? 1 : 0;
  }
  if (easing === "linear") {
    return progress;
  }
  return easeInOutCubic(progress);
}

function makeAssemblyStepId(type = "step") {
  return `${type}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneAssemblyStep(step) {
  return { ...step };
}

function buildTemplateFamilies(templates) {
  const families = new Map();
  for (const template of templates) {
    const familyId = template.familyId || template.id;
    if (!families.has(familyId)) {
      families.set(familyId, {
        id: familyId,
        name: template.familyName || template.name,
        icon: template.familyIcon || template.icon,
        templates: []
      });
    }
    families.get(familyId).templates.push(template);
  }
  return Array.from(families.values());
}

function renderPaperStockOptions() {
  const options = getPaperStockOptions();
  paperStockEl.innerHTML = options.map(option => (
    `<option value="${option.id}">${option.label}</option>`
  )).join("");
  if (!options.some(option => option.id === state.paperStock)) {
    state.paperStock = getDefaultPaperStockId();
  }
  paperStockEl.value = state.paperStock;
}

function getTemplateFamily(templateId = state.templateId) {
  return TEMPLATE_FAMILIES.find(family => family.templates.some(template => template.id === templateId)) || null;
}

function unitFactor() {
  if (state.unit === "cm") return 10;
  return 1;
}

function inputToMm(value) {
  const number = Number.parseFloat(value);
  const safe = Number.isFinite(number) ? number : 0;
  return safe * unitFactor();
}

function mmToInput(value) {
  return value / unitFactor();
}

function formatInputValue(value) {
  return roundValue(mmToInput(value));
}

function getDefaultFold(templateId) {
  const template = getTemplateSpec(templateId);
  return Number.isFinite(template.defaultFoldProgress) ? template.defaultFoldProgress : 0;
}

function getMaterialThicknessMm() {
  return Math.max(0, inputToMm(materialThicknessEl.value));
}

function getTextureScale() {
  const value = Number.parseFloat(textureScaleEl?.value);
  return clamp(Number.isFinite(value) ? value : state.textureScale, 0.25, 4);
}

function getTemplateFields(templateId = state.templateId) {
  const fieldGroups = getTemplateFieldGroups(templateId);
  return [...fieldGroups.primary, ...fieldGroups.optional].filter(field => field.key !== "T");
}

function getFieldInput(fieldKey) {
  return document.querySelector(`[data-param-key="${fieldKey}"]`);
}

function isLengthField(field) {
  return field.kind === "length";
}

function parseFieldValue(field, rawValue) {
  const number = Number.parseFloat(rawValue);
  const safe = Number.isFinite(number) ? number : 0;
  const min = field.min !== undefined ? field.min : 0;
  return isLengthField(field) ? Math.max(min, inputToMm(safe)) : safe;
}

function formatFieldValue(field, value) {
  return isLengthField(field) ? formatInputValue(value) : roundValue(value);
}

function renderFieldMarkup(field) {
  const minAttr = field.min !== undefined ? ` min="${field.min}"` : "";
  const maxAttr = field.max !== undefined ? ` max="${field.max}"` : "";
  const stepAttr = field.step !== undefined ? ` step="${field.step}"` : "";
  return `<label class="field">${field.label} <input data-param-key="${field.key}" data-unit-kind="${field.kind}" type="number"${minAttr}${maxAttr}${stepAttr}></label>`;
}

function getTemplateFeaturePreviewGeometry(templateId) {
  const template = getTemplateDefinition(templateId);
  if (!template || typeof template.buildShape !== "function") {
    return null;
  }
  try {
    return template.buildShape(getTemplateDefaults(templateId));
  } catch (_error) {
    return null;
  }
}

function getTemplateFeatureGroupMarkup(templateId = state.templateId, refinement = getActiveRefinement(), geometry = state.lastGeometry) {
  if (templateId !== CREDIT_CARD_TEMPLATE_ID) {
    return "";
  }
  const templateControls = getTemplateFeatureControls(templateId);
  const featureGeometry = geometry || getTemplateFeaturePreviewGeometry(templateId);
  const templateFeatures = featureGeometry?.templateFeatures || null;
  const settingsKey = String(templateControls?.settingsKey || templateFeatures?.settingsKey || "").trim();
  const surfaceRect = getTemplateFeatureSurfaceRect(featureGeometry);
  if (!templateControls || !templateFeatures || !settingsKey || !surfaceRect) {
    return "";
  }

  const settings = getTemplateFeatureSettings(refinement, featureGeometry);
  const maxWidth = roundValue(surfaceRect.width);
  const maxHeight = roundValue(surfaceRect.height);
  const sideEntries = Object.entries(templateFeatures.sides || {})
    .filter(([, features]) => Array.isArray(features) && features.length);
  if (!sideEntries.length) {
    return "";
  }

  const sideLabelMap = templateControls.sideLabels || {};

  return `
    <div class="field-group">
      <p class="section-label">${escapeHtml(templateControls.title || "Template Features")}</p>
      ${templateControls.description ? `<p class="template-desc">${escapeHtml(templateControls.description)}</p>` : ""}
      ${sideEntries.map(([side, features]) => `
        <details class="refinement-collapsible" open>
          <summary>${escapeHtml(sideLabelMap[side] || formatTemplateFeatureTitle(side))}</summary>
          <div class="refinement-grid refinement-editor-grid">
            ${features.map(feature => {
              const featureSettings = settings[feature.id] || {};
              const featureLabel = feature.label || feature.title || formatTemplateFeatureTitle(feature.id);
              return `
                <label class="field-checkbox refinement-toggle-field">Show ${escapeHtml(featureLabel.toLowerCase())}
                  <input type="checkbox" data-template-setting-group="${escapeHtml(feature.id)}" data-template-setting-key="enabled"${featureSettings.enabled !== false ? " checked" : ""}>
                </label>
                <label class="field">${escapeHtml(featureLabel)} X
                  <input type="number" min="0" max="${maxWidth}" step="0.1" data-template-setting-group="${escapeHtml(feature.id)}" data-template-setting-key="x" value="${roundValue(featureSettings.x ?? feature.x ?? 0)}">
                </label>
                <label class="field">${escapeHtml(featureLabel)} Y
                  <input type="number" min="0" max="${maxHeight}" step="0.1" data-template-setting-group="${escapeHtml(feature.id)}" data-template-setting-key="y" value="${roundValue(featureSettings.y ?? feature.y ?? 0)}">
                </label>
                <label class="field">${escapeHtml(featureLabel)} Width
                  <input type="number" min="0.1" max="${maxWidth}" step="0.1" data-template-setting-group="${escapeHtml(feature.id)}" data-template-setting-key="width" value="${roundValue(featureSettings.width ?? feature.width ?? 0)}">
                </label>
                <label class="field">${escapeHtml(featureLabel)} Height
                  <input type="number" min="0.1" max="${maxHeight}" step="0.1" data-template-setting-group="${escapeHtml(feature.id)}" data-template-setting-key="height" value="${roundValue(featureSettings.height ?? feature.height ?? 0)}">
                </label>
              `;
            }).join("")}
          </div>
        </details>
      `).join("")}
    </div>
  `;
}

function renderTemplateFields(templateId, geometry = state.lastGeometry, { preserveValues = true } = {}) {
  const currentValues = preserveValues
    ? new Map(Array.from(document.querySelectorAll("[data-param-key]"), input => [input.dataset.paramKey, input.value]))
    : new Map();
  const fieldGroups = getTemplateFieldGroups(templateId);
  const primaryFields = fieldGroups.primary.filter(field => field.key !== "T");
  const optionalFields = fieldGroups.optional.filter(field => field.key !== "T");
  const featureMarkup = getTemplateFeatureGroupMarkup(templateId, getActiveRefinement(), geometry);
  templatePrimaryGroupEl.innerHTML = primaryFields.length ? `
    <p class="section-label">Dimensions</p>
    ${primaryFields.map(renderFieldMarkup).join("")}
  ` : "";
  templatePrimaryGroupEl.hidden = !primaryFields.length;
  templateOptionalGroupEl.innerHTML = optionalFields.length ? `
    <p class="section-label">Optional Parameters</p>
    ${optionalFields.map(renderFieldMarkup).join("")}
  ` : "";
  if (featureMarkup) {
    templateOptionalGroupEl.innerHTML += featureMarkup;
  }
  templateOptionalGroupEl.hidden = !templateOptionalGroupEl.innerHTML.trim();
  for (const [fieldKey, value] of currentValues) {
    const input = getFieldInput(fieldKey);
    if (input) {
      input.value = value;
    }
  }
}

function isTemplateParameterInputFocused() {
  return Boolean(document.activeElement?.matches?.("input[data-param-key], input[data-global-param-key]"));
}

function syncMaterialPresetFromThickness() {
  const thickness = getMaterialThicknessMm();
  const matched = Object.entries(MATERIAL_PRESETS).find(([, mm]) => Math.abs(mm - thickness) < 0.001);
  materialPresetEl.value = matched ? matched[0] : "custom";
}

function readParams() {
  const params = { ...getTemplateDefaults(state.templateId) };
  for (const field of getTemplateFields()) {
    const input = getFieldInput(field.key);
    if (!input) continue;
    params[field.key] = parseFieldValue(field, input.value);
  }
  params.T = getMaterialThicknessMm();
  return params;
}

function applyTemplateDefaults(templateId) {
  const template = getTemplateDefinition(templateId);
  if (template.defaultPaperStock) {
    state.paperStock = template.defaultPaperStock;
    if (paperStockEl) {
      paperStockEl.value = state.paperStock;
    }
  }
  const currentThickness = Number.isFinite(Number(template.defaultMaterialThickness))
    ? Number(template.defaultMaterialThickness)
    : (materialThicknessEl.value
      ? getMaterialThicknessMm()
      : (MATERIAL_PRESETS[materialPresetEl.value] || MATERIAL_PRESETS["strong-paper"]));
  renderTemplateFields(templateId, null, { preserveValues: false });
  const defaults = getTemplateDefaults(templateId);
  for (const field of getTemplateFields(templateId)) {
    const input = getFieldInput(field.key);
    if (!input) continue;
    input.value = formatFieldValue(field, defaults[field.key] !== undefined ? defaults[field.key] : 0);
  }
  materialThicknessEl.value = formatInputValue(currentThickness);
  syncMaterialPresetFromThickness();
}

function updateTemplateInfo() {
  const template = getTemplateSpec(state.templateId);
  templateTitle.textContent = template.title;
  if (stageTemplateName) stageTemplateName.textContent = template.name;
}

function getFoldLabel(foldId) {
  const geometryFold = state.lastGeometry && state.lastGeometry.folds
    ? state.lastGeometry.folds.find(fold => fold.id === foldId)
    : null;
  return (geometryFold && geometryFold.displayName) || foldId;
}

function getFoldAccentColor(foldId) {
  const sequence = state.assemblySteps
    .filter(step => step.type === "fold")
    .map(step => step.foldId);
  const index = Math.max(0, sequence.indexOf(foldId));
  const hue = (index * 137.508 + 210) % 360;
  const saturation = 78 + ((index % 3) * 6);
  const lightness = 66 + ((index % 4) * 4);
  return `hsl(${roundValue(hue)} ${roundValue(Math.min(saturation, 96))}% ${roundValue(Math.min(lightness, 82))}%)`;
}

function getFoldById(foldId) {
  return state.lastGeometry && state.lastGeometry.folds
    ? state.lastGeometry.folds.find(fold => fold.id === foldId) || null
    : null;
}

function getDefaultFoldSequenceForGeometry(geometry) {
  if (!geometry) {
    return [];
  }
  const controllableFolds = geometry.custom3d && Array.isArray(geometry.custom3d.controllableFolds)
    ? geometry.custom3d.controllableFolds.filter(foldId => geometry.folds.some(fold => fold.id === foldId))
    : null;
  if (controllableFolds && controllableFolds.length) {
    return controllableFolds;
  }
  return Array.isArray(geometry.foldSequence) && geometry.foldSequence.length
    ? geometry.foldSequence.filter(foldId => geometry.folds.some(fold => fold.id === foldId))
    : geometry.folds.map(fold => fold.id);
}

function getDefaultFoldAngleForId(foldId, geometry) {
  const geometryFold = geometry && geometry.folds
    ? geometry.folds.find(fold => fold.id === foldId)
    : null;
  if (geometryFold && Number.isFinite(geometryFold.angleDeg)) {
    return roundValue(geometryFold.angleDeg);
  }
  return 90;
}

function getGeometryObjectIds(geometry) {
  if (!geometry || !Array.isArray(geometry.panels)) {
    return [];
  }
  return Array.from(new Set(
    geometry.panels
      .map(panel => String(panel.objectId || "").trim() || "__default__")
  ));
}

function getObjectLabel(objectId) {
  return objectId === "__default__"
    ? "Primary Object"
    : objectId.split("-").map(part => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : "").join(" ");
}

function getPanelLabel(panelId) {
  return getPanelById(panelId)?.displayName || panelId || "panel";
}

function createDefaultFoldAssemblyStep(foldId, geometry) {
  return {
    id: makeAssemblyStepId("fold"),
    type: "fold",
    foldId,
    angleDeg: getDefaultFoldAngleForId(foldId, geometry),
    easing: "ease-in-out",
    syncWithPrevious: false
  };
}

function normalizeAssemblyStep(step, geometry) {
  if (!step || typeof step !== "object") {
    return null;
  }
  if (step.type === "fold") {
    if (!geometry || !Array.isArray(geometry.folds) || !geometry.folds.some(fold => fold.id === step.foldId)) {
      return null;
    }
    return {
      id: step.id || makeAssemblyStepId("fold"),
      type: "fold",
      foldId: step.foldId,
      angleDeg: Number.isFinite(Number(step.angleDeg)) ? Number(step.angleDeg) : getDefaultFoldAngleForId(step.foldId, geometry),
      easing: step.easing || "ease-in-out",
      syncWithPrevious: !!step.syncWithPrevious
    };
  }
  if (step.type === "model-rotation") {
    const objectIds = getGeometryObjectIds(geometry);
    const objectId = step.objectId === "__all__"
      ? "__all__"
      : (objectIds.includes(step.objectId) ? step.objectId : "__all__");
    return {
      id: step.id || makeAssemblyStepId("rotation"),
      type: "model-rotation",
      objectId,
      axis: ["x", "y", "z"].includes(step.axis) ? step.axis : "z",
      angleDeg: Number.isFinite(Number(step.angleDeg)) ? Number(step.angleDeg) : 0,
      easing: step.easing || "ease-in-out",
      syncWithPrevious: !!step.syncWithPrevious
    };
  }
  if (step.type === "object-move") {
    const objectIds = getGeometryObjectIds(geometry);
    const objectId = objectIds.includes(step.objectId) ? step.objectId : (objectIds[0] || "__default__");
    return {
      id: step.id || makeAssemblyStepId("move"),
      type: "object-move",
      objectId,
      axis: ["x", "y", "z"].includes(step.axis) ? step.axis : "x",
      distanceMm: Number.isFinite(Number(step.distanceMm)) ? Number(step.distanceMm) : 0,
      easing: step.easing || "ease-in-out",
      syncWithPrevious: !!step.syncWithPrevious
    };
  }
  return null;
}

function syncAssemblyStepsToRefinement() {
  const refinement = getActiveRefinement();
  if (!refinement) {
    return;
  }
  refinement.assemblySteps = state.assemblySteps.map(cloneAssemblyStep);
}

function ensureAssemblyStepsForGeometry(geometry) {
  const refinement = getActiveRefinement();
  const defaultFoldIds = getDefaultFoldSequenceForGeometry(geometry);
  const sourceSteps = refinement && Array.isArray(refinement.assemblySteps) && refinement.assemblySteps.length
    ? refinement.assemblySteps
    : (Array.isArray(geometry.defaultAssemblySteps) ? geometry.defaultAssemblySteps : []);
  const normalized = sourceSteps
    .map(step => normalizeAssemblyStep(step, geometry))
    .filter(Boolean);
  const foldIdsInSteps = new Set(normalized.filter(step => step.type === "fold").map(step => step.foldId));
  for (const foldId of defaultFoldIds) {
    if (!foldIdsInSteps.has(foldId)) {
      normalized.push(createDefaultFoldAssemblyStep(foldId, geometry));
    }
  }
  state.assemblySteps = normalized;
  if (refinement) {
    refinement.assemblySteps = normalized.map(cloneAssemblyStep);
  }
}

function getPanelById(panelId) {
  return state.lastGeometry && state.lastGeometry.panels
    ? state.lastGeometry.panels.find(panel => panel.id === panelId) || null
    : null;
}

function getFoldObjectId(foldId) {
  if (!state.lastGeometry || !Array.isArray(state.lastGeometry.folds)) {
    return "__default__";
  }
  const fold = state.lastGeometry.folds.find(item => item.id === foldId);
  if (!fold) {
    return "__default__";
  }
  const fromPanel = getPanelById(fold.from);
  const toPanel = getPanelById(fold.to);
  return (toPanel && toPanel.objectId) || (fromPanel && fromPanel.objectId) || "__default__";
}

function getFoldObjectGroups(geometry) {
  if (!geometry || !Array.isArray(geometry.panels)) {
    return [];
  }

  const groups = new Map();
  for (const panel of geometry.panels) {
    const objectId = String(panel.objectId || "").trim() || "__default__";
    if (!groups.has(objectId)) {
      groups.set(objectId, {
        objectId,
        label: objectId === "__default__"
          ? "Primary Object"
          : objectId.split("-").map(part => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : "").join(" "),
        foldIds: [],
        panelIds: []
      });
    }
    groups.get(objectId).panelIds.push(panel.id);
  }

  for (const fold of geometry.folds || []) {
    const objectId = getFoldObjectId(fold.id);
    if (!groups.has(objectId)) {
      groups.set(objectId, {
        objectId,
        label: objectId === "__default__"
          ? "Primary Object"
          : objectId.split("-").map(part => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : "").join(" "),
        foldIds: [],
        panelIds: []
      });
    }
    groups.get(objectId).foldIds.push(fold.id);
  }

  return Array.from(groups.values());
}

function selectFold(foldId) {
  const fold = getFoldById(foldId);
  state.selectedFoldId = foldId || "";
  state.selectedPanelId = fold ? (fold.to || fold.from || "") : "";
  state.selectedObjectId = getFoldObjectId(foldId);
}

function selectPanel(panelId) {
  const panel = getPanelById(panelId);
  state.selectedPanelId = panelId || "";
  state.selectedFoldId = panel && panel.foldId ? panel.foldId : "";
  if (panel && panel.objectId) {
    state.selectedObjectId = panel.objectId;
  }
  if (panel && panel.objectId) {
    const refinement = getActiveRefinement();
    if (refinement) {
      refinement.selectedObjectId = panel.objectId;
    }
  }
}

function slugifyPanelName(value, fallback = "panel") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function getPanelRefinementName(config, panelId) {
  return String(config.displayName || config.standardName || panelId || "").trim() || panelId;
}

function getPanelRefinementType(panel) {
  return panel.isGlue ? "glue-flap" : "panel";
}

function getComputedRefinementPanelType(config, fallbackType) {
  if (config && config.isGlue !== undefined) {
    return config.isGlue ? "glue-flap" : "panel";
  }
  if (String(config && config.type ? config.type : fallbackType || "").includes("glue")) {
    return "glue-flap";
  }
  return "panel";
}

function cloneLabelLayout(layout) {
  if (!layout) {
    return undefined;
  }
  return {
    text: String(layout.text || ""),
    x: Number.isFinite(Number(layout.x)) ? Number(layout.x) : 0,
    y: Number.isFinite(Number(layout.y)) ? Number(layout.y) : 0,
    fontSize: Number.isFinite(Number(layout.fontSize)) ? Number(layout.fontSize) : getDefaultLabelFontSize(),
    rotationDeg: Number.isFinite(Number(layout.rotationDeg)) ? Number(layout.rotationDeg) : 0,
    maxWidth: Number.isFinite(Number(layout.maxWidth)) ? Number(layout.maxWidth) : 0,
    lineHeight: Number.isFinite(Number(layout.lineHeight)) ? Number(layout.lineHeight) : 1.2,
    fontFamily: String(layout.fontFamily || "Arial, sans-serif"),
    fontWeight: String(layout.fontWeight || "700"),
    fontStyle: String(layout.fontStyle || "normal"),
    fill: String(layout.fill || "#333333")
  };
}

const CREDIT_CARD_TEMPLATE_ID = "flat-credit-card";

function clonePlainData(value) {
  if (Array.isArray(value)) {
    return value.map(clonePlainData);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clonePlainData(item)])
    );
  }
  return value;
}

function mergePlainDataWithDefaults(currentValue, defaultValue) {
  if (Array.isArray(defaultValue)) {
    return currentValue !== undefined ? clonePlainData(currentValue) : clonePlainData(defaultValue);
  }
  if (defaultValue && typeof defaultValue === "object") {
    const currentObject = currentValue && typeof currentValue === "object" ? currentValue : {};
    const keys = new Set([
      ...Object.keys(defaultValue),
      ...Object.keys(currentObject)
    ]);
    return Object.fromEntries(
      Array.from(keys).map(key => [
        key,
        mergePlainDataWithDefaults(currentObject[key], defaultValue[key])
      ])
    );
  }
  return currentValue !== undefined ? currentValue : defaultValue;
}

function getTemplateRefinementDefaults(templateId = state.templateId, geometry = state.lastGeometry) {
  const template = getTemplateDefinition(templateId);
  if (!template) {
    return {};
  }
  const rawDefaults = typeof template.getTemplateRefinementDefaults === "function"
    ? template.getTemplateRefinementDefaults(readParams(), geometry)
    : (template.templateRefinementDefaults || {});
  return mergePlainDataWithDefaults(undefined, rawDefaults || {});
}

function getTemplateFeatureSettingsKey(geometry = state.lastGeometry) {
  return String(geometry?.templateFeatures?.settingsKey || "").trim();
}

function getTemplateFeatureDefaultSettings(geometry = state.lastGeometry) {
  const templateFeatures = geometry?.templateFeatures || null;
  const defaults = {};
  const sides = templateFeatures?.sides || {};
  for (const sideFeatures of Object.values(sides)) {
    for (const feature of Array.isArray(sideFeatures) ? sideFeatures : []) {
      defaults[feature.id] = {
        enabled: feature.enabled !== false,
        x: Number(feature.x) || 0,
        y: Number(feature.y) || 0,
        width: Number(feature.width) || 0,
        height: Number(feature.height) || 0
      };
    }
  }
  return defaults;
}

function getTemplateFeatureSurfaceRect(geometry = state.lastGeometry) {
  const templateFeatures = geometry?.templateFeatures || null;
  const panel = geometry && Array.isArray(geometry.panels) ? geometry.panels[0] : null;
  const rect = panel && panel.custom3d ? panel.custom3d.surfaceRect : null;
  if (rect) {
    return {
      x: Number(rect.x) || 0,
      y: Number(rect.y) || 0,
      width: Number(rect.width) || 0,
      height: Number(rect.height) || 0
    };
  }
  const d = panel?.d || "";
  if (!d || typeof document === "undefined") {
    return templateFeatures?.surfaceRect || null;
  }
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.style.left = "-9999px";
  svg.style.top = "-9999px";
  svg.style.visibility = "hidden";
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", d);
  svg.appendChild(path);
  document.body.appendChild(svg);
  let bbox = null;
  try {
    const box = path.getBBox();
    bbox = {
      x: Number(box.x) || 0,
      y: Number(box.y) || 0,
      width: Number(box.width) || 0,
      height: Number(box.height) || 0
    };
  } catch (_error) {
    bbox = null;
  } finally {
    svg.remove();
  }
  return bbox || templateFeatures?.surfaceRect || null;
}

function getTemplateFeatureSettings(refinement = getActiveRefinement(), geometry = state.lastGeometry) {
  const settingsKey = getTemplateFeatureSettingsKey(geometry);
  if (!settingsKey) {
    return {};
  }
  return refinement && refinement.templateSettings && refinement.templateSettings[settingsKey]
    ? refinement.templateSettings[settingsKey]
    : {};
}

function syncWorkbenchPanelVisibility() {
  if (previewWorkbenchEl) {
    previewWorkbenchEl.dataset.labelWorkbenchCollapsed = String(Boolean(state.labelLayoutWorkbenchCollapsed));
  }
  if (modelWorkbenchEl) {
    modelWorkbenchEl.dataset.foldPlanCollapsed = String(Boolean(state.foldPlanCollapsed));
  }
  if (labelLayoutWorkbenchEl) {
    labelLayoutWorkbenchEl.hidden = Boolean(state.labelLayoutWorkbenchCollapsed) || !state.lastGeometry;
  }
  if (toggleLabelLayoutWorkbenchEl) {
    toggleLabelLayoutWorkbenchEl.setAttribute("aria-expanded", String(!state.labelLayoutWorkbenchCollapsed));
    toggleLabelLayoutWorkbenchEl.textContent = state.labelLayoutWorkbenchCollapsed ? "Show layout" : "Hide layout";
  }
  if (foldPlanPanelEl) {
    foldPlanPanelEl.hidden = Boolean(state.foldPlanCollapsed);
  }
  if (toggleFoldPlanPanelEl) {
    toggleFoldPlanPanelEl.setAttribute("aria-expanded", String(!state.foldPlanCollapsed));
    toggleFoldPlanPanelEl.textContent = state.foldPlanCollapsed ? "Show plan" : "Hide plan";
  }
}

function makeArtworkLayerId(type = "image") {
  return `${type}-${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_ARTWORK_DOODLE_COLOR = "#ffbe3b";

function normalizeArtworkImage(image, fallbackId = "") {
  if (!image || !image.dataUrl) {
    return null;
  }
  return {
    id: String(image.id || fallbackId || makeArtworkLayerId("image")),
    name: String(image.name || image.label || "Image"),
    dataUrl: String(image.dataUrl || ""),
    x: Number.isFinite(Number(image.x)) ? Number(image.x) : 0,
    y: Number.isFinite(Number(image.y)) ? Number(image.y) : 0,
    width: Number.isFinite(Number(image.width)) ? Number(image.width) : 0,
    height: Number.isFinite(Number(image.height)) ? Number(image.height) : 0,
    opacity: Number.isFinite(Number(image.opacity)) ? Number(image.opacity) : 1,
    tintColor: String(image.tintColor || ""),
    rotationDeg: Number.isFinite(Number(image.rotationDeg)) ? Number(image.rotationDeg) : 0,
    preserveAspectRatio: String(image.preserveAspectRatio || "xMidYMid meet")
  };
}

function normalizeArtworkDoodle(doodle, fallbackId = "") {
  if (!doodle || !doodle.d) {
    return null;
  }
  return {
    id: String(doodle.id || fallbackId || makeArtworkLayerId("doodle")),
    d: String(doodle.d || ""),
    stroke: String(doodle.stroke || DEFAULT_ARTWORK_DOODLE_COLOR),
    strokeWidth: Number.isFinite(Number(doodle.strokeWidth)) ? Number(doodle.strokeWidth) : 2,
    opacity: Number.isFinite(Number(doodle.opacity)) ? Number(doodle.opacity) : 1
  };
}

function syncArtworkImages(artwork) {
  if (!artwork) {
    return [];
  }
  const rawImages = Array.isArray(artwork.images) && artwork.images.length
    ? artwork.images
    : (artwork.image ? [artwork.image] : []);
  const images = rawImages
    .map((image, index) => normalizeArtworkImage(image, `image-${index + 1}`))
    .filter(Boolean);
  artwork.images = images;
  if (!images.length) {
    artwork.activeImageId = "";
    artwork.image = null;
    return images;
  }
  const selected = images.find(image => image.id === artwork.activeImageId) || images[images.length - 1];
  artwork.activeImageId = selected.id;
  artwork.image = selected;
  return images;
}

function getSelectedArtworkImage(artwork) {
  const images = syncArtworkImages(artwork);
  return images.find(image => image.id === artwork.activeImageId) || images[images.length - 1] || null;
}

function syncArtworkLayers(artwork) {
  if (!artwork) {
    return [];
  }
  const textLayerId = "text-layer";
  const hasArtworkText = Boolean(String(artwork.text || "").trim());
  const images = syncArtworkImages(artwork);
  const doodles = Array.isArray(artwork.doodles)
    ? artwork.doodles.map((doodle, index) => normalizeArtworkDoodle(doodle, `doodle-${index + 1}`)).filter(Boolean)
    : [];
  artwork.doodles = doodles;
  const validIds = new Set([
    ...(hasArtworkText ? [textLayerId] : []),
    ...images.map(image => image.id),
    ...doodles.map(doodle => doodle.id)
  ]);
  const existingOrder = Array.isArray(artwork.layerOrder) ? artwork.layerOrder.map(id => String(id || "")) : [];
  const nextOrder = existingOrder.filter(id => validIds.has(id));
  for (const id of validIds) {
    if (!nextOrder.includes(id)) {
      nextOrder.push(id);
    }
  }
  artwork.layerOrder = nextOrder;
  if (!validIds.has(String(artwork.activeLayerId || ""))) {
    artwork.activeLayerId = artwork.activeImageId || nextOrder[nextOrder.length - 1] || "";
  }
  if (String(artwork.activeLayerId || "").startsWith("image-")) {
    artwork.activeImageId = String(artwork.activeLayerId || "");
  } else if (!validIds.has(String(artwork.activeImageId || ""))) {
    artwork.activeImageId = images[images.length - 1]?.id || "";
  }
  artwork.image = getSelectedArtworkImage(artwork);
  return getArtworkLayerEntries(artwork);
}

function getArtworkLayerEntries(artwork) {
  if (!artwork) {
    return [];
  }
  const hasArtworkText = Boolean(String(artwork.text || "").trim());
  const images = syncArtworkImages(artwork);
  const doodles = Array.isArray(artwork.doodles) ? artwork.doodles : [];
  const imageMap = new Map(images.map(image => [image.id, image]));
  const doodleMap = new Map(doodles.map(doodle => [doodle.id, doodle]));
  const entries = [];
  for (const id of Array.isArray(artwork.layerOrder) ? artwork.layerOrder : []) {
    if (id === "text-layer" && hasArtworkText) {
      entries.push({
        id,
        type: "text",
        name: String(artwork.text || "").trim() || "Text",
        opacity: Number.isFinite(Number(artwork.textOpacity)) ? Number(artwork.textOpacity) : 1
      });
      continue;
    }
    if (imageMap.has(id)) {
      const image = imageMap.get(id);
      entries.push({
        id,
        type: "image",
        name: image.name || "Image",
        opacity: Number.isFinite(Number(image.opacity)) ? Number(image.opacity) : 1,
        image
      });
      continue;
    }
    if (doodleMap.has(id)) {
      const doodle = doodleMap.get(id);
      entries.push({
        id,
        type: "doodle",
        name: `Doodle ${doodles.findIndex(item => item.id === id) + 1}`,
        opacity: Number.isFinite(Number(doodle.opacity)) ? Number(doodle.opacity) : 1,
        doodle
      });
    }
  }
  return entries;
}

function getSelectedArtworkLayer(artwork) {
  const layers = syncArtworkLayers(artwork);
  return layers.find(layer => layer.id === artwork.activeLayerId) || layers[layers.length - 1] || null;
}

function getSelectedArtworkDoodle(artwork) {
  const selectedLayer = getSelectedArtworkLayer(artwork);
  return selectedLayer?.type === "doodle" ? selectedLayer.doodle || null : null;
}

function setActiveArtworkLayer(artwork, layerId) {
  if (!artwork) {
    return null;
  }
  artwork.activeLayerId = String(layerId || "");
  const selected = getSelectedArtworkLayer(artwork);
  artwork.activeLayerId = selected?.id || "text-layer";
  artwork.activeImageId = selected?.type === "image" ? selected.id : (artwork.activeImageId || "");
  artwork.image = getSelectedArtworkImage(artwork);
  return selected;
}

function moveArtworkLayerById(artwork, layerId, direction) {
  const layers = syncArtworkLayers(artwork);
  const index = layers.findIndex(layer => layer.id === layerId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= layers.length) {
    return false;
  }
  const order = [...artwork.layerOrder];
  const [moved] = order.splice(index, 1);
  order.splice(nextIndex, 0, moved);
  artwork.layerOrder = order;
  setActiveArtworkLayer(artwork, layerId);
  return true;
}

function deleteArtworkLayerById(artwork, layerId) {
  if (!artwork || !layerId) {
    return false;
  }
  if (layerId === "text-layer") {
    artwork.text = "";
    artwork.activeLayerId = artwork.layerOrder.find(id => id !== "text-layer") || "text-layer";
    syncArtworkLayers(artwork);
    return true;
  }
  const imageCount = syncArtworkImages(artwork).length;
  const filteredImages = syncArtworkImages(artwork).filter(image => image.id !== layerId);
  artwork.images = filteredImages;
  if (artwork.images.length !== imageCount) {
    if (artwork.activeImageId === layerId || artwork.image?.id === layerId) {
      artwork.activeImageId = "";
    }
    if (artwork.image?.id === layerId) {
      artwork.image = null;
    }
    syncArtworkLayers(artwork);
    return true;
  }
  const doodleCount = Array.isArray(artwork.doodles) ? artwork.doodles.length : 0;
  artwork.doodles = (Array.isArray(artwork.doodles) ? artwork.doodles : []).filter(doodle => doodle.id !== layerId);
  if (artwork.doodles.length !== doodleCount) {
    if (artwork.activeLayerId === layerId) {
      artwork.activeLayerId = "";
    }
    syncArtworkLayers(artwork);
    return true;
  }
  return false;
}

function getArtworkHistoryBucket(side = getActiveArtworkSide()) {
  if (!state.artworkHistory[side]) {
    state.artworkHistory[side] = { undo: [], redo: [] };
  }
  return state.artworkHistory[side];
}

function serializeArtworkSnapshot(snapshot) {
  return JSON.stringify(cloneSideArtworkConfig(snapshot) || null);
}

function snapshotSideArtwork(side = getActiveArtworkSide()) {
  const refinement = getActiveRefinement();
  return cloneSideArtworkConfig(refinement?.sideArtwork?.[side] || null);
}

function pushArtworkUndoSnapshot(snapshot, side = getActiveArtworkSide()) {
  const bucket = getArtworkHistoryBucket(side);
  const serialized = serializeArtworkSnapshot(snapshot);
  const last = bucket.undo.length ? serializeArtworkSnapshot(bucket.undo[bucket.undo.length - 1]) : "";
  if (serialized === last) {
    return;
  }
  bucket.undo.push(snapshot);
  if (bucket.undo.length > 80) {
    bucket.undo.shift();
  }
  bucket.redo = [];
}

function recordArtworkHistoryNow(side = getActiveArtworkSide()) {
  pushArtworkUndoSnapshot(snapshotSideArtwork(side), side);
}

function beginArtworkHistoryCapture(key, side = getActiveArtworkSide()) {
  if (activeArtworkHistoryCapture && activeArtworkHistoryCapture.key === key && activeArtworkHistoryCapture.side === side) {
    return;
  }
  activeArtworkHistoryCapture = {
    key,
    side,
    snapshot: snapshotSideArtwork(side)
  };
}

function commitArtworkHistoryCapture(key = "") {
  if (!activeArtworkHistoryCapture) {
    return;
  }
  if (key && activeArtworkHistoryCapture.key !== key) {
    return;
  }
  const { side, snapshot } = activeArtworkHistoryCapture;
  const current = snapshotSideArtwork(side);
  if (serializeArtworkSnapshot(snapshot) !== serializeArtworkSnapshot(current)) {
    pushArtworkUndoSnapshot(snapshot, side);
  }
  activeArtworkHistoryCapture = null;
}

function cancelArtworkHistoryCapture() {
  activeArtworkHistoryCapture = null;
}

async function applyArtworkHistorySnapshot(snapshot, side = getActiveArtworkSide()) {
  const refinement = getActiveRefinement();
  if (!refinement) {
    return;
  }
  refinement.sideArtwork = refinement.sideArtwork || { outside: null, inside: null };
  refinement.sideArtwork[side] = cloneSideArtworkConfig(snapshot);
  renderPreviewEditOverlay();
  renderPreviewLayerOverlay();
  await renderPreviewFromCurrentRefinement({ sync3d: "deferred" });
}

async function undoArtworkEdit() {
  const side = getActiveArtworkSide();
  const bucket = getArtworkHistoryBucket(side);
  if (!bucket.undo.length) {
    return;
  }
  cancelArtworkHistoryCapture();
  const current = snapshotSideArtwork(side);
  const previous = bucket.undo.pop();
  bucket.redo.push(current);
  await applyArtworkHistorySnapshot(previous, side);
}

async function redoArtworkEdit() {
  const side = getActiveArtworkSide();
  const bucket = getArtworkHistoryBucket(side);
  if (!bucket.redo.length) {
    return;
  }
  cancelArtworkHistoryCapture();
  const current = snapshotSideArtwork(side);
  const next = bucket.redo.pop();
  bucket.undo.push(current);
  await applyArtworkHistorySnapshot(next, side);
}

function cloneArtworkConfig(artwork) {
  if (!artwork) {
    return null;
  }
  const temp = {
    fillColor: artwork.fillColor || "",
    fillOpacity: Number.isFinite(Number(artwork.fillOpacity)) ? Number(artwork.fillOpacity) : 0,
    textOpacity: Number.isFinite(Number(artwork.textOpacity)) ? Number(artwork.textOpacity) : 1,
    activeLayerId: String(artwork.activeLayerId || ""),
    layerOrder: Array.isArray(artwork.layerOrder) ? artwork.layerOrder.map(id => String(id || "")) : [],
    activeImageId: String(artwork.activeImageId || ""),
    image: artwork.image ? normalizeArtworkImage(artwork.image) : null,
    images: Array.isArray(artwork.images) ? artwork.images.map((image, index) => normalizeArtworkImage(image, `image-${index + 1}`)).filter(Boolean) : [],
    doodleStroke: artwork.doodleStroke || DEFAULT_ARTWORK_DOODLE_COLOR,
    doodleStrokeWidth: Number.isFinite(Number(artwork.doodleStrokeWidth)) ? Number(artwork.doodleStrokeWidth) : 2,
    doodleOpacity: Number.isFinite(Number(artwork.doodleOpacity)) ? Number(artwork.doodleOpacity) : 1,
    eraserSize: Number.isFinite(Number(artwork.eraserSize)) ? Number(artwork.eraserSize) : 12,
    doodles: Array.isArray(artwork.doodles) ? artwork.doodles.map((doodle, index) => normalizeArtworkDoodle(doodle, `doodle-${index + 1}`)).filter(Boolean) : []
  };
  syncArtworkLayers(temp);
  return temp;
}

function cloneSideArtworkConfig(artwork) {
  if (!artwork) {
    return null;
  }
  const cloned = {
    text: String(artwork.text || ""),
    x: Number.isFinite(Number(artwork.x)) ? Number(artwork.x) : 0,
    y: Number.isFinite(Number(artwork.y)) ? Number(artwork.y) : 0,
    fontSize: Number.isFinite(Number(artwork.fontSize)) ? Number(artwork.fontSize) : 10,
    maxWidth: Number.isFinite(Number(artwork.maxWidth)) ? Number(artwork.maxWidth) : 0,
    rotationDeg: Number.isFinite(Number(artwork.rotationDeg)) ? Number(artwork.rotationDeg) : 0,
    lineHeight: Number.isFinite(Number(artwork.lineHeight)) ? Number(artwork.lineHeight) : 1.2,
    fontFamily: String(artwork.fontFamily || "Arial, sans-serif"),
    fontWeight: String(artwork.fontWeight || "700"),
    fontStyle: String(artwork.fontStyle || "normal"),
    fill: String(artwork.fill || "#333333"),
    fillColor: String(artwork.fillColor || ""),
    fillOpacity: Number.isFinite(Number(artwork.fillOpacity)) ? Number(artwork.fillOpacity) : 0,
    textOpacity: Number.isFinite(Number(artwork.textOpacity)) ? Number(artwork.textOpacity) : 1,
    activeLayerId: String(artwork.activeLayerId || ""),
    layerOrder: Array.isArray(artwork.layerOrder) ? artwork.layerOrder.map(id => String(id || "")) : [],
    activeImageId: String(artwork.activeImageId || ""),
    image: artwork.image ? normalizeArtworkImage(artwork.image) : null,
    images: Array.isArray(artwork.images) ? artwork.images.map((image, index) => normalizeArtworkImage(image, `image-${index + 1}`)).filter(Boolean) : [],
    doodleStroke: String(artwork.doodleStroke || DEFAULT_ARTWORK_DOODLE_COLOR),
    doodleStrokeWidth: Number.isFinite(Number(artwork.doodleStrokeWidth)) ? Number(artwork.doodleStrokeWidth) : 2,
    doodleOpacity: Number.isFinite(Number(artwork.doodleOpacity)) ? Number(artwork.doodleOpacity) : 1,
    eraserSize: Number.isFinite(Number(artwork.eraserSize)) ? Number(artwork.eraserSize) : 12,
    doodles: Array.isArray(artwork.doodles) ? artwork.doodles.map((doodle, index) => normalizeArtworkDoodle(doodle, `doodle-${index + 1}`)).filter(Boolean) : []
  };
  syncArtworkLayers(cloned);
  return cloned;
}

function getGeometryRefinementSeed(panel) {
  const defaultName = PANEL_DISPLAY_NAMES[panel.id] || panel.displayName || panel.label || panel.id;
  const displayName = String(panel.displayName || panel.label || defaultName).trim() || defaultName;
  const standardName = String(panel.standardName || "").trim() || slugifyPanelName(displayName, panel.id);
  return {
    sourceId: String(panel.sourceId || standardName || panel.id),
    displayName,
    standardName,
    type: getPanelRefinementType(panel),
    isGlue: panel.isGlue !== undefined ? Boolean(panel.isGlue) : String(panel.type || "").includes("glue"),
    labelLayout: cloneLabelLayout(panel.labelLayout),
    artwork: cloneArtworkConfig(panel.artwork)
  };
}

function mergeGeneratedLabelLayout(currentLayout, generatedLayout) {
  const nextGenerated = cloneLabelLayout(generatedLayout);
  if (!nextGenerated) {
    return currentLayout ? cloneLabelLayout(currentLayout) : null;
  }
  if (!currentLayout) {
    return nextGenerated;
  }
  const nextCurrent = cloneLabelLayout(currentLayout);
  return {
    ...nextGenerated,
    text: nextCurrent.text || nextGenerated.text,
    x: Number.isFinite(Number(nextCurrent.x)) ? Number(nextCurrent.x) : nextGenerated.x,
    y: Number.isFinite(Number(nextCurrent.y)) ? Number(nextCurrent.y) : nextGenerated.y,
    fontSize: Number.isFinite(Number(nextCurrent.fontSize)) ? Number(nextCurrent.fontSize) : nextGenerated.fontSize,
    rotationDeg: Number.isFinite(Number(nextCurrent.rotationDeg)) ? Number(nextCurrent.rotationDeg) : nextGenerated.rotationDeg,
    maxWidth: Number.isFinite(Number(nextCurrent.maxWidth)) ? Number(nextCurrent.maxWidth) : nextGenerated.maxWidth,
    lineHeight: Number.isFinite(Number(nextCurrent.lineHeight)) ? Number(nextCurrent.lineHeight) : nextGenerated.lineHeight,
    fontFamily: nextCurrent.fontFamily || nextGenerated.fontFamily,
    fontWeight: nextCurrent.fontWeight || nextGenerated.fontWeight,
    fontStyle: nextCurrent.fontStyle || nextGenerated.fontStyle,
    fill: nextCurrent.fill || nextGenerated.fill
  };
}

function ensureRefinementForGeometry(geometry) {
  if (!geometry || !geometry.panels) {
    return;
  }

  const existing = state.templateRefinements[state.templateId] || {};
  const templateSettingsDefaults = getTemplateRefinementDefaults(state.templateId, geometry);
  const existingPanels = existing.panels || {};
  const nextPanels = {};
  const objectIds = Array.from(new Set(
    geometry.panels
      .map(panel => String(panel.objectId || "").trim())
      .filter(Boolean)
  ));
  const defaultFloorPanelsByObject = Object.fromEntries(
    objectIds.map(objectId => {
      const objectPanels = geometry.panels.filter(panel => (panel.objectId || "") === objectId);
      const defaultPanelId = (geometry.floorPanelsByObject && geometry.floorPanelsByObject[objectId])
        || (objectPanels.find(panel => !panel.parent)?.id)
        || (objectPanels[0] && objectPanels[0].id)
        || "";
      return [objectId, defaultPanelId];
    })
  );
  const defaultAssembledDefaults = geometry.assembledDefaults
    || (geometry.custom3d && geometry.custom3d.camera && geometry.custom3d.camera.foldedState)
    || null;

  for (const panel of geometry.panels) {
    const current = existingPanels[panel.id] || {};
    const templatePanel = getGeometryRefinementSeed(panel);
    const defaultName = PANEL_DISPLAY_NAMES[panel.id] || panel.displayName || panel.label || panel.id;
    const displayName = current.displayName || templatePanel.displayName || defaultName;
    const standardName = current.standardName || templatePanel.standardName || slugifyPanelName(displayName, panel.id);
    nextPanels[panel.id] = {
      sourceId: current.sourceId || templatePanel.sourceId || standardName,
      displayName,
      standardName,
      type: current.type || templatePanel.type || getPanelRefinementType(panel),
      isGlue: current.isGlue !== undefined ? current.isGlue : (templatePanel.isGlue !== undefined ? templatePanel.isGlue : String(panel.type || "").includes("glue")),
      labelLayout: mergeGeneratedLabelLayout(current.labelLayout, templatePanel.labelLayout),
      artwork: cloneArtworkConfig(current.artwork || templatePanel.artwork)
    };
  }

  const templateSettings = mergePlainDataWithDefaults(existing.templateSettings, templateSettingsDefaults);
  const featureSettingsKey = getTemplateFeatureSettingsKey(geometry);
  const generatedFeatureDefaults = featureSettingsKey ? templateSettingsDefaults?.[featureSettingsKey] : null;
  if (featureSettingsKey && generatedFeatureDefaults && templateSettings[featureSettingsKey]) {
    for (const [featureId, defaults] of Object.entries(generatedFeatureDefaults)) {
      const current = templateSettings[featureSettingsKey][featureId];
      if (!current || current.userEdited !== true) {
        templateSettings[featureSettingsKey][featureId] = clonePlainData(defaults);
      }
    }
  }

  state.templateRefinements[state.templateId] = {
    floorPanel: existing.floorPanel || geometry.floorPanel || geometry.rootPanel || (geometry.rootPanels && geometry.rootPanels[0]) || (geometry.panels[0] && geometry.panels[0].id) || "",
    floorPanelsByObject: {
      ...defaultFloorPanelsByObject,
      ...(existing.floorPanelsByObject || {})
    },
    assembledFrontPanel: (
      existing.assembledFrontPanel
      && !(
        existing.assembledFrontPanel === (geometry.rootPanel || "")
        && geometry.assembledFrontPanel
        && geometry.assembledFrontPanel !== geometry.rootPanel
      )
    )
      ? existing.assembledFrontPanel
      : (geometry.assembledFrontPanel || geometry.rootPanel || (geometry.panels[0] && geometry.panels[0].id) || ""),
    assembledDefaults: existing.assembledDefaults || defaultAssembledDefaults,
    assemblySteps: Array.isArray(existing.assemblySteps) ? existing.assemblySteps.map(cloneAssemblyStep) : [],
    selectedObjectId: existing.selectedObjectId || objectIds[0] || "",
    customFonts: {
      ...(existing.customFonts || {}),
      ...state.customFonts
    },
    sideArtwork: {
      outside: cloneSideArtworkConfig(existing.sideArtwork?.outside),
      inside: cloneSideArtworkConfig(existing.sideArtwork?.inside)
    },
    templateSettings,
    panels: nextPanels
  };
}

function getActiveRefinement() {
  if (!state.lastGeometry) {
    return null;
  }
  ensureRefinementForGeometry(state.lastGeometry);
  return state.templateRefinements[state.templateId] || null;
}

function renderPanelOptionList(panels, refinement, selectedId) {
  return panels.map(panel => {
    const config = refinement.panels[panel.id];
    return `<option value="${panel.id}"${panel.id === selectedId ? " selected" : ""}>${getPanelRefinementName(config, panel.id)}</option>`;
  }).join("");
}

function isSameLabelLayout(left, right) {
  const a = cloneLabelLayout(left);
  const b = cloneLabelLayout(right);
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.text === b.text
    && a.x === b.x
    && a.y === b.y
    && a.fontSize === b.fontSize
    && a.rotationDeg === b.rotationDeg
    && a.maxWidth === b.maxWidth
    && a.lineHeight === b.lineHeight
    && a.fontFamily === b.fontFamily
    && a.fontWeight === b.fontWeight
    && a.fontStyle === b.fontStyle
    && a.fill === b.fill;
}

function isSameArtwork(left, right) {
  return JSON.stringify(cloneArtworkConfig(left)) === JSON.stringify(cloneArtworkConfig(right));
}

function buildRefinementChangeSummary() {
  const geometry = state.lastGeometry;
  const refinement = getActiveRefinement();
  if (!geometry || !refinement) {
    return "No template loaded.";
  }

  const template = getTemplateSpec(state.templateId);
  const lines = [
    `template: ${state.templateId}`,
    `template_title: ${template.title}`
  ];
  const defaultFloorPanel = geometry.floorPanel || geometry.rootPanel || (geometry.rootPanels && geometry.rootPanels[0]) || "";
  if ((refinement.floorPanel || "") !== (defaultFloorPanel || "")) {
    lines.push(`Floor panel: ${defaultFloorPanel || "none"} -> ${refinement.floorPanel || "none"}`);
  }
  for (const group of getObjectPanelGroups(geometry)) {
    if (group.objectId === "__default__") {
      continue;
    }
    const defaultObjectFloor = (geometry.floorPanelsByObject && geometry.floorPanelsByObject[group.objectId])
      || group.panels.find(panel => !panel.parent)?.id
      || (group.panels[0] && group.panels[0].id)
      || "";
    const nextObjectFloor = (refinement.floorPanelsByObject && refinement.floorPanelsByObject[group.objectId]) || defaultObjectFloor;
    if ((nextObjectFloor || "") !== (defaultObjectFloor || "")) {
      lines.push(`${group.label} floor: ${defaultObjectFloor || "none"} -> ${nextObjectFloor || "none"}`);
    }
  }

  for (const panel of geometry.panels) {
    const current = refinement.panels[panel.id];
    if (!current) {
      continue;
    }
    const defaults = getGeometryRefinementSeed(panel);
    const panelLines = [];

    if ((current.displayName || "") !== (defaults.displayName || "")) {
      panelLines.push(`name "${defaults.displayName}" -> "${current.displayName}"`);
    }
    if (Boolean(current.isGlue) !== Boolean(defaults.isGlue)) {
      panelLines.push(`role ${defaults.isGlue ? "glue-flap" : "panel"} -> ${current.isGlue ? "glue-flap" : "panel"}`);
    }
    if (!isSameLabelLayout(current.labelLayout, defaults.labelLayout)) {
      const currentLayout = current.labelLayout || {};
      const defaultLayout = defaults.labelLayout || {};
      const labelLayoutChanges = [];

      if ((currentLayout.text || "") !== (defaultLayout.text || "")) {
        labelLayoutChanges.push(`text "${defaultLayout.text || ""}" -> "${currentLayout.text || ""}"`);
      }
      if (roundValue(currentLayout.x) !== roundValue(defaultLayout.x)) {
        labelLayoutChanges.push(`x ${roundValue(defaultLayout.x)} -> ${roundValue(currentLayout.x)}`);
      }
      if (roundValue(currentLayout.y) !== roundValue(defaultLayout.y)) {
        labelLayoutChanges.push(`y ${roundValue(defaultLayout.y)} -> ${roundValue(currentLayout.y)}`);
      }
      if (roundValue(currentLayout.fontSize) !== roundValue(defaultLayout.fontSize)) {
        labelLayoutChanges.push(`font size ${roundValue(defaultLayout.fontSize)} -> ${roundValue(currentLayout.fontSize)}`);
      }
      if (roundValue(currentLayout.rotationDeg) !== roundValue(defaultLayout.rotationDeg)) {
        labelLayoutChanges.push(`rotation ${roundValue(defaultLayout.rotationDeg)}° -> ${roundValue(currentLayout.rotationDeg)}°`);
      }
      if (roundValue(currentLayout.maxWidth) !== roundValue(defaultLayout.maxWidth)) {
        labelLayoutChanges.push(`max width ${roundValue(defaultLayout.maxWidth)} -> ${roundValue(currentLayout.maxWidth)}`);
      }
      if (roundValue(currentLayout.lineHeight) !== roundValue(defaultLayout.lineHeight)) {
        labelLayoutChanges.push(`line height ${roundValue(defaultLayout.lineHeight)} -> ${roundValue(currentLayout.lineHeight)}`);
      }
      if ((currentLayout.fontFamily || "") !== (defaultLayout.fontFamily || "")) {
        labelLayoutChanges.push(`font family "${defaultLayout.fontFamily || ""}" -> "${currentLayout.fontFamily || ""}"`);
      }
      if ((currentLayout.fontWeight || "") !== (defaultLayout.fontWeight || "")) {
        labelLayoutChanges.push(`font weight "${defaultLayout.fontWeight || ""}" -> "${currentLayout.fontWeight || ""}"`);
      }
      if ((currentLayout.fontStyle || "") !== (defaultLayout.fontStyle || "")) {
        labelLayoutChanges.push(`font style "${defaultLayout.fontStyle || ""}" -> "${currentLayout.fontStyle || ""}"`);
      }
      if ((currentLayout.fill || "") !== (defaultLayout.fill || "")) {
        labelLayoutChanges.push(`font color "${defaultLayout.fill || ""}" -> "${currentLayout.fill || ""}"`);
      }

      panelLines.push(`label layout ${labelLayoutChanges.join(", ")}`);
    }
    if (!isSameArtwork(current.artwork, defaults.artwork)) {
      panelLines.push("artwork updated");
    }

    if (panelLines.length) {
      lines.push(`${panel.id}: ${panelLines.join("; ")}`);
    }
  }

  const defaultStepsSource = Array.isArray(geometry.defaultAssemblySteps) && geometry.defaultAssemblySteps.length
    ? geometry.defaultAssemblySteps
    : [];
  const defaultSteps = defaultStepsSource.length
    ? (() => {
        const normalized = defaultStepsSource.map(step => normalizeAssemblyStep(step, geometry)).filter(Boolean);
        const foldIdsInSteps = new Set(normalized.filter(step => step.type === "fold").map(step => step.foldId));
        for (const foldId of getDefaultFoldSequenceForGeometry(geometry)) {
          if (!foldIdsInSteps.has(foldId)) {
            normalized.push(createDefaultFoldAssemblyStep(foldId, geometry));
          }
        }
        return normalized;
      })()
    : getDefaultFoldSequenceForGeometry(geometry).map(foldId => createDefaultFoldAssemblyStep(foldId, geometry));
  const currentSteps = Array.isArray(state.assemblySteps) ? state.assemblySteps : [];
  const stepsChanged = JSON.stringify(defaultSteps.map(step => {
    if (step.type === "fold") {
      return { type: step.type, foldId: step.foldId, angleDeg: roundValue(step.angleDeg), easing: step.easing };
    }
    if (step.type === "model-rotation") {
      return { type: step.type, axis: step.axis, angleDeg: roundValue(step.angleDeg), easing: step.easing };
    }
    return { type: step.type, objectId: step.objectId, axis: step.axis, distanceMm: roundValue(step.distanceMm), easing: step.easing };
  })) !== JSON.stringify(currentSteps.map(step => {
    if (step.type === "fold") {
      return { type: step.type, foldId: step.foldId, angleDeg: roundValue(step.angleDeg), easing: step.easing };
    }
    if (step.type === "model-rotation") {
      return { type: step.type, axis: step.axis, angleDeg: roundValue(step.angleDeg), easing: step.easing };
    }
    return { type: step.type, objectId: step.objectId, axis: step.axis, distanceMm: roundValue(step.distanceMm), easing: step.easing };
  }));

  if (stepsChanged) {
    lines.push("Animation steps:");
    for (const [index, step] of currentSteps.entries()) {
      if (step.type === "fold") {
        lines.push(`  ${index + 1}. fold ${getFoldLabel(step.foldId)} @ ${roundValue(step.angleDeg)}° (${step.easing})`);
      } else if (step.type === "model-rotation") {
        const objectLabel = (step.objectId || "__all__") === "__all__"
          ? "whole model"
          : getObjectLabel(step.objectId);
        lines.push(`  ${index + 1}. rotate ${objectLabel} ${String(step.axis || "z").toUpperCase()} ${roundValue(step.angleDeg)}° (${step.easing})`);
      } else if (step.type === "object-move") {
        lines.push(`  ${index + 1}. move ${getObjectLabel(step.objectId || "__default__")} ${String(step.axis || "x").toUpperCase()} ${roundValue(step.distanceMm)}mm (${step.easing})`);
      }
    }
  }

  if (refinement.assembledDefaults) {
    const assembledDefaults = refinement.assembledDefaults;
    const cameraPosition = Array.isArray(assembledDefaults.cameraPosition)
      ? `[${assembledDefaults.cameraPosition.map(value => roundValue(value)).join(", ")}]`
      : "[]";
    const cameraTarget = Array.isArray(assembledDefaults.cameraTarget)
      ? `[${assembledDefaults.cameraTarget.map(value => roundValue(value)).join(", ")}]`
      : "[]";
    const modelCenter = Array.isArray(assembledDefaults.modelCenter)
      ? `[${assembledDefaults.modelCenter.map(value => roundValue(value)).join(", ")}]`
      : "[]";
    const cameraOffset = Array.isArray(assembledDefaults.cameraOffset)
      ? `[${assembledDefaults.cameraOffset.map(value => roundValue(value)).join(", ")}]`
      : "[]";
    const targetOffset = Array.isArray(assembledDefaults.targetOffset)
      ? `[${assembledDefaults.targetOffset.map(value => roundValue(value)).join(", ")}]`
      : "[]";
    lines.push("Assembled default:");
    lines.push(`  view: ${assembledDefaults.viewName || "custom"}`);
    lines.push(`  model_center: ${modelCenter}`);
    lines.push(`  camera_position: ${cameraPosition}`);
    lines.push(`  camera_target: ${cameraTarget}`);
    lines.push(`  camera_offset: ${cameraOffset}`);
    lines.push(`  target_offset: ${targetOffset}`);
    if (Array.isArray(assembledDefaults.modelRotationSteps) && assembledDefaults.modelRotationSteps.length) {
      lines.push("  model_rotations:");
      for (const step of assembledDefaults.modelRotationSteps) {
        lines.push(`    - object=${step.objectId || "__all__"} axis=${String(step.axis || "z").toUpperCase()} angle_deg=${roundValue(step.angleDeg)}`);
      }
    }
    if (Array.isArray(assembledDefaults.objectMoveSteps) && assembledDefaults.objectMoveSteps.length) {
      lines.push("  object_moves:");
      for (const step of assembledDefaults.objectMoveSteps) {
        lines.push(`    - object=${step.objectId || "__default__"} axis=${String(step.axis || "x").toUpperCase()} distance_mm=${roundValue(step.distanceMm)}`);
      }
    }
  }

  const templateFeatures = geometry?.templateFeatures || null;
  const settingsKey = getTemplateFeatureSettingsKey(geometry);
  if (templateFeatures && settingsKey) {
    const currentSettings = refinement.templateSettings?.[settingsKey] || {};
    const defaultSettings = getTemplateFeatureDefaultSettings(geometry);
    for (const [featureId, defaults] of Object.entries(defaultSettings)) {
      const current = currentSettings[featureId] || {};
      const changed = [];
      for (const key of ["enabled", "x", "y", "width", "height"]) {
        const currentValue = key === "enabled" ? Boolean(current[key] !== false) : roundValue(current[key] || 0);
        const defaultValue = key === "enabled" ? Boolean(defaults[key] !== false) : roundValue(defaults[key] || 0);
        if (currentValue !== defaultValue) {
          changed.push(`${key} ${defaultValue} -> ${currentValue}`);
        }
      }
      if (changed.length) {
        lines.push(`${featureId}: ${changed.join(", ")}`);
      }
    }
  }

  if ((refinement.assembledFrontPanel || "") !== ((geometry.assembledFrontPanel || geometry.rootPanel || "") || "")) {
    lines.push(`assembled_front_panel: ${refinement.assembledFrontPanel || "none"}`);
  }

  return lines.length ? lines.join("\n") : "No refinement changes yet.";
}

function syncStructuredSvgOutput() {
  if (!structuredSvgOutputEl) {
    return;
  }
  structuredSvgOutputEl.value = buildRefinementChangeSummary();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getPanelDefaultLabelPosition(panel) {
  if (Array.isArray(panel.labelPosition)) {
    return [Number(panel.labelPosition[0]) || 0, Number(panel.labelPosition[1]) || 0];
  }
  if (Array.isArray(panel.label)) {
    return [Number(panel.label[0]) || 0, Number(panel.label[1]) || 0];
  }
  return [0, 0];
}

function getDefaultLabelFontSize() {
  return Number(getTemplateDefinition(state.templateId)?.labelDefaults?.fontSize) || 4;
}

function ensureLabelLayout(panel) {
  const refinement = getActiveRefinement();
  if (!refinement || !panel || !refinement.panels[panel.id]) {
    return null;
  }

  const config = refinement.panels[panel.id];
  const [x, y] = getPanelDefaultLabelPosition(panel);

  if (!config.labelLayout) {
    config.labelLayout = {
      text: "",
      x: roundValue(x),
      y: roundValue(y),
      fontSize: getDefaultLabelFontSize(),
      rotationDeg: 0,
      maxWidth: 0,
      lineHeight: 1.2
    };
  }

  if (config.labelLayout.text === undefined || config.labelLayout.text === null) config.labelLayout.text = "";
  if (!Number.isFinite(Number(config.labelLayout.x))) config.labelLayout.x = roundValue(x);
  if (!Number.isFinite(Number(config.labelLayout.y))) config.labelLayout.y = roundValue(y);
  if (!Number.isFinite(Number(config.labelLayout.fontSize))) config.labelLayout.fontSize = getDefaultLabelFontSize();
  if (!Number.isFinite(Number(config.labelLayout.rotationDeg))) config.labelLayout.rotationDeg = 0;
  if (!Number.isFinite(Number(config.labelLayout.maxWidth))) config.labelLayout.maxWidth = 0;
  if (!Number.isFinite(Number(config.labelLayout.lineHeight))) config.labelLayout.lineHeight = 1.2;
  if (!config.labelLayout.fontFamily) config.labelLayout.fontFamily = "Arial, sans-serif";
  if (!config.labelLayout.fontWeight) config.labelLayout.fontWeight = "700";
  if (!config.labelLayout.fontStyle) config.labelLayout.fontStyle = "normal";
  if (!config.labelLayout.fill) config.labelLayout.fill = "#333333";

  return config.labelLayout;
}

function ensureArtworkConfig(panel) {
  const refinement = getActiveRefinement();
  if (!refinement || !panel || !refinement.panels[panel.id]) {
    return null;
  }
  if (!refinement.panels[panel.id].artwork) {
    refinement.panels[panel.id].artwork = {};
  }
  const artwork = refinement.panels[panel.id].artwork;
  if (!artwork.fillColor) artwork.fillColor = "";
  if (!Number.isFinite(Number(artwork.fillOpacity))) artwork.fillOpacity = 0;
  if (!Number.isFinite(Number(artwork.doodleOpacity))) artwork.doodleOpacity = 1;
  if (!Number.isFinite(Number(artwork.eraserSize))) artwork.eraserSize = 12;
  if (!artwork.doodleStroke) artwork.doodleStroke = DEFAULT_ARTWORK_DOODLE_COLOR;
  if (!Number.isFinite(Number(artwork.doodleStrokeWidth))) artwork.doodleStrokeWidth = 2;
  if (!Array.isArray(artwork.doodles)) artwork.doodles = [];
  syncArtworkImages(artwork);
  return artwork;
}

function getActiveArtworkSide() {
  return getSupportedPreviewSide(state.previewSide);
}

function getModelArtworkSide() {
  return getSupportedPreviewSide(state.previewSide);
}

function getArtworkSideLabel(side) {
  if (getTemplateArtworkSides().length <= 1) {
    return "design";
  }
  if (state.templateId === "pillowpack") {
    return side === "inside" ? "outside" : "inside";
  }
  return side === "inside" ? "inside" : "outside";
}

function getTemplateArtworkSides(templateId = state.templateId) {
  const sides = getTemplateSpec(templateId).artworkSides;
  return Array.isArray(sides) && sides.length
    ? sides.filter(side => side === "outside" || side === "inside")
    : ["outside", "inside"];
}

function supportsArtworkSide(side, templateId = state.templateId) {
  return getTemplateArtworkSides(templateId).includes(side);
}

function getSupportedPreviewSide(side = state.previewSide, templateId = state.templateId) {
  const normalizedSide = side === "inside" ? "inside" : "outside";
  if (supportsArtworkSide(normalizedSide, templateId)) {
    return normalizedSide;
  }
  return getTemplateArtworkSides(templateId)[0] || "outside";
}

function ensureSupportedPreviewSide() {
  state.previewSide = getSupportedPreviewSide(state.previewSide);
}

function ensureSideArtworkConfig() {
  const refinement = getActiveRefinement();
  if (!refinement) {
    return null;
  }
  if (!refinement.sideArtwork) {
    refinement.sideArtwork = { outside: null, inside: null };
  }
  const side = getActiveArtworkSide();
  if (!refinement.sideArtwork[side]) {
    refinement.sideArtwork[side] = {
      text: "",
      x: 0,
      y: 0,
      fontSize: 18,
      maxWidth: 0,
      rotationDeg: 0,
      lineHeight: 1.2,
      fontFamily: "Arial, sans-serif",
      fontWeight: "700",
      fontStyle: "normal",
      fill: "#ffffff",
      fillColor: "",
      fillOpacity: 0,
      textOpacity: 1,
      activeLayerId: "",
      layerOrder: [],
      activeImageId: "",
      image: null,
      images: [],
      doodleStroke: DEFAULT_ARTWORK_DOODLE_COLOR,
      doodleStrokeWidth: 2,
      doodleOpacity: 1,
      eraserSize: 12,
      doodles: []
    };
  }
  const artwork = refinement.sideArtwork[side];
  if (!artwork.text) artwork.text = "";
  if (!Number.isFinite(Number(artwork.x))) artwork.x = 0;
  if (!Number.isFinite(Number(artwork.y))) artwork.y = 0;
  if (!Number.isFinite(Number(artwork.fontSize))) artwork.fontSize = 18;
  if (!Number.isFinite(Number(artwork.maxWidth))) artwork.maxWidth = 0;
  if (!Number.isFinite(Number(artwork.rotationDeg))) artwork.rotationDeg = 0;
  if (!Number.isFinite(Number(artwork.lineHeight))) artwork.lineHeight = 1.2;
  if (!artwork.fontFamily) artwork.fontFamily = "Arial, sans-serif";
  if (!artwork.fontWeight) artwork.fontWeight = "700";
  if (!artwork.fontStyle) artwork.fontStyle = "normal";
  if (!artwork.fill) artwork.fill = "#ffffff";
  if (!artwork.fillColor) artwork.fillColor = "";
  if (!Number.isFinite(Number(artwork.fillOpacity))) artwork.fillOpacity = 0;
  if (!Number.isFinite(Number(artwork.textOpacity))) artwork.textOpacity = 1;
  if (!Number.isFinite(Number(artwork.doodleOpacity))) artwork.doodleOpacity = 1;
  if (!Number.isFinite(Number(artwork.eraserSize))) artwork.eraserSize = 12;
  if (!artwork.doodleStroke) artwork.doodleStroke = DEFAULT_ARTWORK_DOODLE_COLOR;
  if (!Number.isFinite(Number(artwork.doodleStrokeWidth))) artwork.doodleStrokeWidth = 2;
  if (!Array.isArray(artwork.doodles)) artwork.doodles = [];
  syncArtworkLayers(artwork);
  return artwork;
}

function getSelectedLabelPanel() {
  if (!state.lastGeometry || !state.lastGeometry.panels.length) {
    return null;
  }
  return state.lastGeometry.panels.find(panel => panel.id === state.selectedPanelId) || state.lastGeometry.panels[0];
}

function getObjectPanelGroups(geometry) {
  if (!geometry || !Array.isArray(geometry.panels)) {
    return [];
  }

  const groups = new Map();
  for (const panel of geometry.panels) {
    const objectId = String(panel.objectId || "").trim() || "__default__";
    if (!groups.has(objectId)) {
      groups.set(objectId, []);
    }
    groups.get(objectId).push(panel);
  }

  return Array.from(groups.entries()).map(([objectId, panels]) => ({
    objectId,
    label: objectId === "__default__"
      ? "Primary Object"
      : objectId.split("-").map(part => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : "").join(" "),
    panels
  }));
}

function buildCombinedPanelEditorMarkup(panel, refinement) {
  if (!panel || !refinement || !refinement.panels[panel.id]) {
    return "";
  }

  const config = refinement.panels[panel.id];
  const layout = ensureLabelLayout(panel);
  const objectGroups = getObjectPanelGroups(state.lastGeometry);
  const selectedObjectId = panel.objectId || refinement.selectedObjectId || (objectGroups[0] && objectGroups[0].objectId) || "__default__";
  const activeObjectGroup = objectGroups.find(group => group.objectId === selectedObjectId) || objectGroups[0] || null;
  const visiblePanels = activeObjectGroup ? activeObjectGroup.panels : state.lastGeometry.panels;
  const activeFloorPanelId = (refinement.floorPanelsByObject && refinement.floorPanelsByObject[selectedObjectId]) || refinement.floorPanel;
  const isFloorPanel = activeFloorPanelId === panel.id;
  const assembledFrontPanelId = refinement.assembledFrontPanel || panel.id;
  const showObjectSelector = objectGroups.length > 1;
  const objectOptions = objectGroups.map(group => {
    const selected = group.objectId === selectedObjectId ? " selected" : "";
    return `<option value="${escapeHtml(group.objectId)}"${selected}>${escapeHtml(group.label)}</option>`;
  }).join("");
  const panelOptions = visiblePanels.map(item => {
    const itemConfig = refinement.panels[item.id];
    const selected = item.id === panel.id ? " selected" : "";
    return `<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(getPanelRefinementName(itemConfig, item.id))}</option>`;
  }).join("");

  return `
    <section class="refinement-panel-row refinement-panel-editor">
      <div class="refinement-panel-heading refinement-panel-editor-heading">
        <div>
          <strong>${escapeHtml(getPanelRefinementName(config, panel.id))}</strong>
          <span>${panel.parent ? `parent: ${escapeHtml(panel.parent)}` : "root panel"}</span>
        </div>
        <div class="refinement-toggle-row">
          <label class="field-checkbox refinement-toggle-field">Floor Panel
            <input type="checkbox" data-floor-panel-toggle="${panel.id}"${isFloorPanel ? " checked" : ""}>
          </label>
          <label class="field-checkbox refinement-toggle-field">Glue Section
            <input type="checkbox" data-refine-panel="${panel.id}" data-refine-key="isGlue"${config.isGlue ? " checked" : ""}>
          </label>
        </div>
      </div>

      <details class="refinement-collapsible" open>
        <summary>Internal Panel Setup</summary>
        <div class="refinement-grid refinement-editor-grid">
        ${showObjectSelector ? `<label class="field">Object
          <select data-object-panel-select>${objectOptions}</select>
        </label>` : ""}
        <label class="field">Panel
          <select data-label-panel-select>${panelOptions}</select>
        </label>
        <label class="field">Name
          <span class="field-note">internal panel name</span>
          <input type="text" data-refine-panel="${panel.id}" data-refine-key="displayName" value="${escapeHtml(config.displayName || config.standardName || panel.id)}">
        </label>
        <label class="field">Facing panel
          <select data-assembled-front-panel-select>
            ${visiblePanels.map(item => {
              const itemConfig = refinement.panels[item.id];
              const selected = item.id === assembledFrontPanelId ? " selected" : "";
              return `<option value="${escapeHtml(item.id)}"${selected}>${escapeHtml(getPanelRefinementName(itemConfig, item.id))}</option>`;
            }).join("")}
          </select>
        </label>
        <label class="field">X position
          <input type="number" step="0.1" data-label-layout-key="x" value="${roundValue(layout.x)}">
        </label>
        <label class="field">Y position
          <input type="number" step="0.1" data-label-layout-key="y" value="${roundValue(layout.y)}">
        </label>
        <label class="field">Font size
          <input type="number" min="0.1" step="0.1" data-label-layout-key="fontSize" value="${roundValue(layout.fontSize)}">
        </label>
        <label class="field">Font family
          <select data-label-layout-key="fontFamily">
            ${(() => {
              ensureFontOption(layout.fontFamily);
              return availableFontOptions.map(option => `<option value="${escapeHtml(option)}"${option === layout.fontFamily ? " selected" : ""}>${escapeHtml(normalizeFontOptionLabel(option))}</option>`).join("");
            })()}
          </select>
        </label>
        <label class="field">Custom font family
          <input type="text" data-label-layout-key="fontFamily" value="${escapeHtml(layout.fontFamily || "")}" placeholder="Type any installed font name">
        </label>
        <label class="field">Font weight
          <select data-label-layout-key="fontWeight">
            <option value="400"${layout.fontWeight === "400" ? " selected" : ""}>Regular</option>
            <option value="700"${layout.fontWeight === "700" ? " selected" : ""}>Bold</option>
            <option value="900"${layout.fontWeight === "900" ? " selected" : ""}>Black</option>
          </select>
        </label>
        <label class="field">Font style
          <select data-label-layout-key="fontStyle">
            <option value="normal"${layout.fontStyle === "normal" ? " selected" : ""}>Normal</option>
            <option value="italic"${layout.fontStyle === "italic" ? " selected" : ""}>Italic</option>
          </select>
        </label>
        <label class="field">Type color
          <input type="color" data-label-layout-key="fill" value="${escapeHtml(layout.fill || "#333333")}">
        </label>
        <label class="field">Rotation°
          <input type="number" step="1" data-label-layout-key="rotationDeg" value="${roundValue(layout.rotationDeg)}">
        </label>
        <label class="field">Max width
          <input type="number" min="0" step="0.1" data-label-layout-key="maxWidth" value="${roundValue(layout.maxWidth)}">
        </label>
        <label class="field">Line height
          <input type="number" min="0.5" step="0.05" data-label-layout-key="lineHeight" value="${roundValue(layout.lineHeight)}">
        </label>
        </div>
        <div class="label-layout-nudges refinement-editor-actions">
        <button type="button" data-label-nudge="up">up</button>
        <button type="button" data-label-nudge="down">down</button>
        <button type="button" data-label-nudge="left">left</button>
        <button type="button" data-label-nudge="right">right</button>
        <button type="button" data-label-reset>reset selected</button>
        </div>
      </details>
    </section>
  `;
}

function formatTemplateFeatureTitle(featureId = "") {
  return String(featureId || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, char => char.toUpperCase()) || "Feature";
}

function buildTemplateFeatureEditorMarkup(refinement) {
  const geometry = state.lastGeometry;
  const templateFeatures = geometry?.templateFeatures || null;
  const settingsKey = getTemplateFeatureSettingsKey(geometry);
  const surfaceRect = getTemplateFeatureSurfaceRect(geometry);
  if (!templateFeatures || !settingsKey || !surfaceRect) {
    return "";
  }

  const settings = getTemplateFeatureSettings(refinement, geometry);
  const maxWidth = roundValue(surfaceRect.width);
  const maxHeight = roundValue(surfaceRect.height);
  const sideEntries = Object.entries(templateFeatures.sides || {})
    .filter(([, features]) => Array.isArray(features) && features.length);
  if (!sideEntries.length) {
    return "";
  }

  const sideLabelMap = {
    outside: "Front",
    inside: "Back"
  };

  return `
    <section class="refinement-panel-row refinement-panel-editor">
      <div class="refinement-panel-heading refinement-panel-editor-heading">
        <div>
          <strong>Card Features</strong>
          <span>Shown above the artwork in SVG and 3D</span>
        </div>
      </div>
      ${sideEntries.map(([side, features]) => `
        <details class="refinement-collapsible" open>
          <summary>${escapeHtml(sideLabelMap[side] || formatTemplateFeatureTitle(side))}</summary>
          <div class="refinement-grid refinement-editor-grid">
            ${features.map(feature => {
              const featureSettings = settings[feature.id] || {};
              const featureLabel = feature.label || feature.title || formatTemplateFeatureTitle(feature.id);
              return `
                <label class="field-checkbox refinement-toggle-field">Show ${escapeHtml(featureLabel.toLowerCase())}
                  <input type="checkbox" data-template-setting-group="${escapeHtml(feature.id)}" data-template-setting-key="enabled"${featureSettings.enabled !== false ? " checked" : ""}>
                </label>
                <label class="field">${escapeHtml(featureLabel)} X
                  <input type="number" min="0" max="${maxWidth}" step="0.1" data-template-setting-group="${escapeHtml(feature.id)}" data-template-setting-key="x" value="${roundValue(featureSettings.x ?? feature.x ?? 0)}">
                </label>
                <label class="field">${escapeHtml(featureLabel)} Y
                  <input type="number" min="0" max="${maxHeight}" step="0.1" data-template-setting-group="${escapeHtml(feature.id)}" data-template-setting-key="y" value="${roundValue(featureSettings.y ?? feature.y ?? 0)}">
                </label>
                <label class="field">${escapeHtml(featureLabel)} Width
                  <input type="number" min="0.1" max="${maxWidth}" step="0.1" data-template-setting-group="${escapeHtml(feature.id)}" data-template-setting-key="width" value="${roundValue(featureSettings.width ?? feature.width ?? 0)}">
                </label>
                <label class="field">${escapeHtml(featureLabel)} Height
                  <input type="number" min="0.1" max="${maxHeight}" step="0.1" data-template-setting-group="${escapeHtml(feature.id)}" data-template-setting-key="height" value="${roundValue(featureSettings.height ?? feature.height ?? 0)}">
                </label>
              `;
            }).join("")}
          </div>
        </details>
      `).join("")}
    </section>
  `;
}

function applyRefinementToGeometry(geometry, refinement) {
  if (!geometry || !refinement || !refinement.panels) {
    return geometry;
  }

  return {
    ...geometry,
    templateId: state.templateId,
    floorPanel: (refinement.floorPanel
      || geometry.floorPanel
      || geometry.rootPanel),
    assembledFrontPanel: refinement.assembledFrontPanel || geometry.assembledFrontPanel || geometry.rootPanel || "",
    floorPanelsByObject: {
      ...(geometry.floorPanelsByObject || {}),
      ...(refinement.floorPanelsByObject || {})
    },
    sideArtwork: {
      outside: cloneSideArtworkConfig(refinement.sideArtwork?.outside),
      inside: cloneSideArtworkConfig(refinement.sideArtwork?.inside)
    },
    templateSettings: clonePlainData(refinement.templateSettings || {}),
    activeArtworkSide: getModelArtworkSide(),
    activeSideArtwork: cloneSideArtworkConfig(refinement.sideArtwork?.[getModelArtworkSide()]),
    panels: geometry.panels.map(panel => {
      const config = refinement.panels[panel.id] || {};
      const layout = ensureLabelLayout(panel);
      const computedType = getComputedRefinementPanelType(config, panel.type);
      const nextPanel = {
        ...panel,
        type: computedType,
        isGlue: config.isGlue !== undefined ? Boolean(config.isGlue) : String(computedType).includes("glue"),
        standardName: config.standardName || panel.standardName || panel.id,
        displayName: config.displayName || panel.displayName || panel.label || PANEL_DISPLAY_NAMES[panel.id] || panel.id,
        displayLabel: config.displayName || panel.displayLabel || panel.label || PANEL_DISPLAY_NAMES[panel.id] || panel.id
      };

      if (layout) {
        nextPanel.label = String(layout.text || "");
        nextPanel.labelPosition = [Number(layout.x) || 0, Number(layout.y) || 0];
        nextPanel.labelFontSize = Number(layout.fontSize) || getDefaultLabelFontSize();
        nextPanel.labelRotationDeg = Number(layout.rotationDeg) || 0;
        nextPanel.labelMaxWidth = Number(layout.maxWidth) || 0;
        nextPanel.labelLineHeight = Number(layout.lineHeight) || 1.2;
        nextPanel.labelLayout = cloneLabelLayout(layout);
      }
      nextPanel.artwork = cloneArtworkConfig(config.artwork);
      nextPanel.activeSideArtwork = cloneSideArtworkConfig(refinement.sideArtwork?.[getModelArtworkSide()]);

      return nextPanel;
    })
  };
}

function renderTemplateRefinementControls() {
  if (!state.lastGeometry) {
    templateRefinementControlsEl.innerHTML = "";
    if (structuredSvgOutputEl) {
      structuredSvgOutputEl.value = "";
    }
    labelLayoutWorkbenchEl.innerHTML = "";
    syncWorkbenchPanelVisibility();
    return;
  }

  const refinement = getActiveRefinement();
  const selectedPanel = getSelectedLabelPanel();
  templateRefinementControlsEl.innerHTML = "";

  labelLayoutWorkbenchEl.innerHTML = buildCombinedPanelEditorMarkup(selectedPanel, refinement);
  syncWorkbenchPanelVisibility();
}

function syncPanelDisplayName(refinement, panelId, rawValue, previousVisibleName) {
  if (!refinement || !refinement.panels[panelId]) {
    return;
  }
  const nextDisplayName = String(rawValue || "").trim() || panelId;
  const nextStandardName = slugifyPanelName(nextDisplayName, panelId);
  refinement.panels[panelId].displayName = nextDisplayName;
  refinement.panels[panelId].standardName = nextStandardName;
  refinement.panels[panelId].sourceId = nextStandardName;
}

function ensureSvgLabelsVisible() {
  if (state.showLabels) {
    return;
  }
  state.showLabels = true;
  $("showLabels").checked = true;
}

function handlePreviewRenderError(error, message = "Preview failed to update.") {
  statusEl.textContent = message;
  console.error(error);
}

function queue3dRender(delayMs = EDIT_3D_RENDER_DELAY_MS) {
  if (queued3dRenderTimer) {
    clearTimeout(queued3dRenderTimer);
  }
  queued3dRenderTimer = window.setTimeout(() => {
    queued3dRenderTimer = 0;
    render3d().catch(error => {
      handlePreviewRenderError(error, "3D preview failed to update.");
    });
  }, Math.max(0, delayMs));
}

async function renderPreviewFromCurrentRefinement({ sync3d = "deferred", refreshEditOverlay = true, refreshLayerOverlay = true } = {}) {
  if (!state.lastGeometry) {
    return;
  }
  ensureSupportedPreviewSide();
  const renderToken = ++refinementRenderToken;

  const markup = await buildSvgMarkup({
    templateId: state.templateId,
    params: readParams(),
    showPanels: state.showPanels,
    showLabels: state.showLabels,
    refinement: getActiveRefinement(),
    previewSide: state.previewSide
  });

  if (renderToken !== refinementRenderToken) {
    return;
  }

  state.lastSvgMarkup = markup;
  syncStructuredSvgOutput();
  previewEl.innerHTML = markup;
  applyPreviewViewportUi();
  if (refreshEditOverlay) {
    renderPreviewEditOverlay();
  } else {
    renderLiveImageTransformOverlay();
    renderLiveTextBoxFrame();
    renderInlineTextEditor();
    if (state.editMode && ["doodle", "eraser"].includes(state.editTool)) {
      updateDoodleCursorFromLastPoint();
    } else {
      clearLiveDoodleCursor();
    }
  }
  if (refreshLayerOverlay) {
    renderPreviewLayerOverlay();
  }
  if (sync3d === "immediate") {
    if (queued3dRenderTimer) {
      clearTimeout(queued3dRenderTimer);
      queued3dRenderTimer = 0;
    }
    await render3d();
  } else if (sync3d === "deferred") {
    queue3dRender();
  }
  statusEl.textContent = state.editMode
    ? (state.editTool === "doodle"
      ? "Doodle mode active: drag on the selected panel in the SVG preview."
      : "Edit mode active.")
    : "";
}

function getSelectedPanelPreviewPath() {
  if (!state.selectedPanelId) {
    return null;
  }
  return previewEl.querySelector(`#preview-${CSS.escape(state.selectedPanelId)}`);
}

function getSelectedPanelPreviewSvg() {
  return previewEl.querySelector("svg");
}

function getPointerSvgPoint(event) {
  const svg = getSelectedPanelPreviewSvg();
  if (!svg || typeof svg.createSVGPoint !== "function") {
    return null;
  }
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }
  return point.matrixTransform(ctm.inverse());
}

function normalizeDegrees(value) {
  let degrees = Number(value) || 0;
  while (degrees > 180) degrees -= 360;
  while (degrees <= -180) degrees += 360;
  return roundValue(degrees);
}

function getActiveArtworkImage() {
  const artwork = ensureSideArtworkConfig();
  return artwork ? getSelectedArtworkImage(artwork) : null;
}

function getImageTransformMetrics(image = getActiveArtworkImage()) {
  if (!image) {
    return null;
  }
  const x = Number(image.x) || 0;
  const y = Number(image.y) || 0;
  const width = Math.max(0, Number(image.width) || 0);
  const height = Math.max(0, Number(image.height) || 0);
  if (!(width > 0) || !(height > 0)) {
    return null;
  }
  const rotationDeg = Number(image.rotationDeg) || 0;
  const radians = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const center = {
    x: x + (width / 2),
    y: y + (height / 2)
  };
  const rotatePoint = (localX, localY) => ({
    x: center.x + (localX * cos) - (localY * sin),
    y: center.y + (localX * sin) + (localY * cos)
  });
  const corners = {
    nw: rotatePoint(-(width / 2), -(height / 2)),
    ne: rotatePoint(width / 2, -(height / 2)),
    se: rotatePoint(width / 2, height / 2),
    sw: rotatePoint(-(width / 2), height / 2)
  };
  const topMid = rotatePoint(0, -(height / 2));
  const rotateHandle = rotatePoint(0, -(height / 2) - Math.max(10, Math.min(width, height) * 0.18));
  return {
    x,
    y,
    width,
    height,
    rotationDeg,
    radians,
    cos,
    sin,
    center,
    corners,
    topMid,
    rotateHandle
  };
}

function getArtworkTextLinesForBox(artwork) {
  const text = String(artwork?.text || "");
  const fontSize = Math.max(1, Number(artwork?.fontSize) || 18);
  const maxWidth = Math.max(0, Number(artwork?.maxWidth) || 0);
  if (!text.trim()) {
    return [""];
  }
  const paragraphs = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (!(maxWidth > 0)) {
    return paragraphs.length ? paragraphs : [""];
  }
  const maxChars = Math.max(1, Math.floor(maxWidth / fontSize / 0.58));
  const lines = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    lines.push(current);
  }
  return lines.length ? lines : [""];
}

function getTextTransformMetrics(artwork = ensureSideArtworkConfig()) {
  if (!artwork) {
    return null;
  }
  const width = Math.max(8, Number(artwork.maxWidth) || (Number(artwork.fontSize) || 18) * 5);
  const fontSize = Math.max(1, Number(artwork.fontSize) || 18);
  const lineHeight = Math.max(0.5, Number(artwork.lineHeight) || 1.2);
  const lines = getArtworkTextLinesForBox(artwork);
  const height = Math.max(fontSize, fontSize * lineHeight * Math.max(1, lines.length));
  const center = {
    x: Number(artwork.x) || 0,
    y: Number(artwork.y) || 0
  };
  const rotationDeg = Number(artwork.rotationDeg) || 0;
  const radians = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const rotatePoint = (localX, localY) => ({
    x: center.x + (localX * cos) - (localY * sin),
    y: center.y + (localX * sin) + (localY * cos)
  });
  const corners = {
    nw: rotatePoint(-(width / 2), -(height / 2)),
    ne: rotatePoint(width / 2, -(height / 2)),
    se: rotatePoint(width / 2, height / 2),
    sw: rotatePoint(-(width / 2), height / 2)
  };
  const topMid = rotatePoint(0, -(height / 2));
  const rotateHandle = rotatePoint(0, -(height / 2) - Math.max(10, Math.min(width, height) * 0.24));
  return {
    x: center.x - (width / 2),
    y: center.y - (height / 2),
    width,
    height,
    fontSize,
    lineHeight,
    lineCount: Math.max(1, lines.length),
    rotationDeg,
    radians,
    cos,
    sin,
    center,
    corners,
    topMid,
    rotateHandle
  };
}

function clearLiveImageTransformOverlay() {
  if (liveImageTransformOverlay && liveImageTransformOverlay.parentNode) {
    liveImageTransformOverlay.parentNode.removeChild(liveImageTransformOverlay);
  }
  liveImageTransformOverlay = null;
}

function getActiveArtworkTransformTarget() {
  const artwork = ensureSideArtworkConfig();
  if (!state.editMode || !artwork) {
    return null;
  }
  const selectedLayer = getSelectedArtworkLayer(artwork);
  const selectedImage = getSelectedArtworkImage(artwork);
  if (
    selectedImage?.dataUrl
    && (state.editTool === "move-image" || activeArtworkDrag?.tool?.includes("image") || (state.editTool === "select" && selectedLayer?.type === "image"))
  ) {
    return {
      type: "image",
      metrics: getImageTransformMetrics(selectedImage)
    };
  }
  if (
    (Number(artwork.maxWidth) > 0 || String(artwork.text || "").trim())
    && (state.editTool === "move-text" || activeArtworkDrag?.tool?.includes("text") || (state.editTool === "select" && selectedLayer?.type === "text"))
  ) {
    return {
      type: "text",
      metrics: getTextTransformMetrics(artwork)
    };
  }
  return null;
}

function renderLiveImageTransformOverlay() {
  clearLiveImageTransformOverlay();
  const svg = previewEl.querySelector("svg");
  const target = getActiveArtworkTransformTarget();
  const metrics = target?.metrics;
  if (!svg || !target || !metrics) {
    return;
  }

  const ns = "http://www.w3.org/2000/svg";
  const screenScale = getSvgScreenScale(svg);
  const handleRadius = roundValue(4.8 / screenScale);
  const handleStrokeWidth = roundValue(1.2 / screenScale);
  const frameStrokeWidth = roundValue(1.25 / screenScale);
  const stemStrokeWidth = roundValue(1.1 / screenScale);
  const group = document.createElementNS(ns, "g");
  group.setAttribute("class", "artwork-transform-overlay");
  group.setAttribute("data-artwork-transform-overlay", target.type);

  const frame = document.createElementNS(ns, "path");
  frame.setAttribute(
    "d",
    `M ${roundValue(metrics.corners.nw.x)} ${roundValue(metrics.corners.nw.y)} L ${roundValue(metrics.corners.ne.x)} ${roundValue(metrics.corners.ne.y)} L ${roundValue(metrics.corners.se.x)} ${roundValue(metrics.corners.se.y)} L ${roundValue(metrics.corners.sw.x)} ${roundValue(metrics.corners.sw.y)} Z`
  );
  frame.setAttribute("class", "artwork-transform-frame");
  frame.setAttribute("data-artwork-handle", `move-${target.type}`);
  frame.setAttribute("stroke-width", String(frameStrokeWidth));
  group.appendChild(frame);

  const stem = document.createElementNS(ns, "line");
  stem.setAttribute("x1", String(roundValue(metrics.topMid.x)));
  stem.setAttribute("y1", String(roundValue(metrics.topMid.y)));
  stem.setAttribute("x2", String(roundValue(metrics.rotateHandle.x)));
  stem.setAttribute("y2", String(roundValue(metrics.rotateHandle.y)));
  stem.setAttribute("class", "artwork-transform-stem");
  stem.setAttribute("pointer-events", "none");
  stem.setAttribute("stroke-width", String(stemStrokeWidth));
  group.appendChild(stem);

  const cornerAnchors = {
    nw: "se",
    ne: "sw",
    se: "nw",
    sw: "ne"
  };
  for (const [handle, point] of Object.entries(metrics.corners)) {
    const knob = document.createElementNS(ns, "circle");
    knob.setAttribute("cx", String(roundValue(point.x)));
    knob.setAttribute("cy", String(roundValue(point.y)));
    knob.setAttribute("r", String(handleRadius));
    knob.setAttribute("stroke-width", String(handleStrokeWidth));
    knob.setAttribute("class", "artwork-transform-handle");
    knob.setAttribute("data-artwork-handle", handle);
    knob.setAttribute("data-artwork-anchor", cornerAnchors[handle]);
    group.appendChild(knob);
  }

  const rotateKnob = document.createElementNS(ns, "circle");
  rotateKnob.setAttribute("cx", String(roundValue(metrics.rotateHandle.x)));
  rotateKnob.setAttribute("cy", String(roundValue(metrics.rotateHandle.y)));
  rotateKnob.setAttribute("r", String(handleRadius));
  rotateKnob.setAttribute("stroke-width", String(handleStrokeWidth));
  rotateKnob.setAttribute("class", "artwork-transform-handle artwork-transform-rotate");
  rotateKnob.setAttribute("data-artwork-handle", `rotate-${target.type}`);
  group.appendChild(rotateKnob);

  svg.appendChild(group);
  liveImageTransformOverlay = group;
}

function seedArtworkImageForActiveSide(dataUrl, imageName = "") {
  const outlinePath = previewEl.querySelector("#cut-outline");
  const bbox = outlinePath && typeof outlinePath.getBBox === "function"
    ? outlinePath.getBBox()
    : { x: 0, y: 0, width: 120, height: 120 };
  const artwork = ensureSideArtworkConfig();
  if (!artwork) {
    return;
  }
  const nextImage = {
    id: makeArtworkLayerId("image"),
    name: String(imageName || `Image ${syncArtworkImages(artwork).length + 1}`),
    dataUrl,
    x: roundValue(bbox.x + (bbox.width * 0.15)),
    y: roundValue(bbox.y + (bbox.height * 0.15)),
    width: roundValue(bbox.width * 0.7),
    height: roundValue(bbox.height * 0.7),
    opacity: 1,
    rotationDeg: 0,
    preserveAspectRatio: "xMidYMid meet"
  };
  const images = syncArtworkImages(artwork);
  artwork.images = [...images, nextImage];
  artwork.activeImageId = nextImage.id;
  artwork.activeLayerId = nextImage.id;
  syncArtworkLayers(artwork);
}

function queueInteractivePreviewRefresh() {
  if (previewInteractionFramePending) {
    return;
  }
  previewInteractionFramePending = true;
  requestAnimationFrame(() => {
    previewInteractionFramePending = false;
    renderPreviewFromCurrentRefinement({ sync3d: "skip", refreshEditOverlay: false, refreshLayerOverlay: false }).catch(error => {
      handlePreviewRenderError(error);
    });
  });
}

function updateDraggedArtworkPosition(point) {
  if (!activeArtworkDrag || !point) {
    return false;
  }
  const artwork = ensureSideArtworkConfig();
  if (!artwork) {
    return false;
  }
  if (activeArtworkDrag.tool === "move-text") {
    artwork.x = roundValue(point.x - activeArtworkDrag.offsetX);
    artwork.y = roundValue(point.y - activeArtworkDrag.offsetY);
    return true;
  }
  if (activeArtworkDrag.tool === "resize-text") {
    const { anchor, signX, signY } = activeArtworkDrag;
    if (!anchor) {
      return false;
    }
    const metrics = getTextTransformMetrics(artwork);
    if (!metrics) {
      return false;
    }
    const deltaX = point.x - anchor.x;
    const deltaY = point.y - anchor.y;
    const projectedWidth = (deltaX * metrics.cos) + (deltaY * metrics.sin);
    const projectedHeight = (-deltaX * metrics.sin) + (deltaY * metrics.cos);
    const width = Math.max(8, signX * projectedWidth);
    const height = Math.max(6, signY * projectedHeight);
    const centerX = anchor.x + ((signX * width * metrics.cos) / 2) - ((signY * height * metrics.sin) / 2);
    const centerY = anchor.y + ((signX * width * metrics.sin) / 2) + ((signY * height * metrics.cos) / 2);
    const lineHeight = Math.max(0.5, Number(artwork.lineHeight) || 1.2);
    const lineCount = Math.max(1, Number(activeArtworkDrag.lineCount) || metrics.lineCount || 1);
    artwork.maxWidth = roundValue(width);
    artwork.fontSize = roundValue(Math.max(4, height / lineHeight / lineCount));
    artwork.x = roundValue(centerX);
    artwork.y = roundValue(centerY);
    return true;
  }
  if (activeArtworkDrag.tool === "rotate-text") {
    const metrics = getTextTransformMetrics(artwork);
    if (!metrics) {
      return false;
    }
    const angleDeg = (Math.atan2(point.y - metrics.center.y, point.x - metrics.center.x) * 180) / Math.PI + 90;
    artwork.rotationDeg = normalizeDegrees(angleDeg);
    return true;
  }
  const selectedImage = getSelectedArtworkImage(artwork);
  if (activeArtworkDrag.tool === "move-image" && selectedImage) {
    selectedImage.x = roundValue(point.x - activeArtworkDrag.offsetX);
    selectedImage.y = roundValue(point.y - activeArtworkDrag.offsetY);
    return true;
  }
  if (activeArtworkDrag.tool === "resize-image" && selectedImage) {
    const { anchor, signX, signY } = activeArtworkDrag;
    if (!anchor) {
      return false;
    }
    const metrics = getImageTransformMetrics(selectedImage);
    if (!metrics) {
      return false;
    }
    const deltaX = point.x - anchor.x;
    const deltaY = point.y - anchor.y;
    const projectedWidth = (deltaX * metrics.cos) + (deltaY * metrics.sin);
    const projectedHeight = (-deltaX * metrics.sin) + (deltaY * metrics.cos);
    const width = Math.max(6, signX * projectedWidth);
    const height = Math.max(6, signY * projectedHeight);
    const centerX = anchor.x + ((signX * width * metrics.cos) / 2) - ((signY * height * metrics.sin) / 2);
    const centerY = anchor.y + ((signX * width * metrics.sin) / 2) + ((signY * height * metrics.cos) / 2);
    selectedImage.width = roundValue(width);
    selectedImage.height = roundValue(height);
    selectedImage.x = roundValue(centerX - (width / 2));
    selectedImage.y = roundValue(centerY - (height / 2));
    return true;
  }
  if (activeArtworkDrag.tool === "rotate-image" && selectedImage) {
    const metrics = getImageTransformMetrics(selectedImage);
    if (!metrics) {
      return false;
    }
    const angleDeg = (Math.atan2(point.y - metrics.center.y, point.x - metrics.center.x) * 180) / Math.PI + 90;
    selectedImage.rotationDeg = normalizeDegrees(angleDeg);
    return true;
  }
  return false;
}

function ensureLiveDoodlePreviewPath() {
  const side = getActiveArtworkSide();
  const root = previewEl.querySelector(`#artwork-side-${CSS.escape(side)}`);
  if (!root) {
    return null;
  }
  if (liveDoodlePreviewPath && liveDoodlePreviewPath.isConnected) {
    return liveDoodlePreviewPath;
  }
  const svg = previewEl.querySelector("svg");
  if (!svg) {
    return null;
  }
  liveDoodlePreviewPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  liveDoodlePreviewPath.setAttribute("fill", "none");
  liveDoodlePreviewPath.setAttribute("stroke-linecap", "round");
  liveDoodlePreviewPath.setAttribute("stroke-linejoin", "round");
  liveDoodlePreviewPath.setAttribute("vector-effect", "non-scaling-stroke");
  liveDoodlePreviewPath.setAttribute("pointer-events", "none");
  root.appendChild(liveDoodlePreviewPath);
  return liveDoodlePreviewPath;
}

function buildSmoothedDoodlePath(points) {
  if (!Array.isArray(points) || !points.length) {
    return "";
  }
  const normalized = points.map(point => [Number(point[0]) || 0, Number(point[1]) || 0]);
  if (normalized.length === 1) {
    return `M ${roundValue(normalized[0][0])} ${roundValue(normalized[0][1])}`;
  }
  if (normalized.length === 2) {
    return `M ${roundValue(normalized[0][0])} ${roundValue(normalized[0][1])} L ${roundValue(normalized[1][0])} ${roundValue(normalized[1][1])}`;
  }

  const filtered = normalized.map((point, index) => {
    if (index === 0 || index === normalized.length - 1) {
      return point;
    }
    const previous = normalized[index - 1];
    const next = normalized[index + 1];
    return [
      (previous[0] + (point[0] * 2) + next[0]) / 4,
      (previous[1] + (point[1] * 2) + next[1]) / 4
    ];
  });

  const parts = [`M ${roundValue(filtered[0][0])} ${roundValue(filtered[0][1])}`];
  for (let index = 1; index < filtered.length - 2; index += 1) {
    const point = filtered[index];
    const next = filtered[index + 1];
    const midpointX = (point[0] + next[0]) / 2;
    const midpointY = (point[1] + next[1]) / 2;
    parts.push(`Q ${roundValue(point[0])} ${roundValue(point[1])} ${roundValue(midpointX)} ${roundValue(midpointY)}`);
  }
  const control = filtered[filtered.length - 2];
  const end = filtered[filtered.length - 1];
  parts.push(`Q ${roundValue(control[0])} ${roundValue(control[1])} ${roundValue(end[0])} ${roundValue(end[1])}`);
  return parts.join(" ");
}

function updateLiveDoodlePreview() {
  if (!activeDoodlePoints.length) {
    return;
  }
  const artwork = ensureSideArtworkConfig();
  const path = ensureLiveDoodlePreviewPath();
  if (!artwork || !path) {
    return;
  }
  const pathData = buildSmoothedDoodlePath(activeDoodlePoints);
  path.setAttribute("d", pathData);
  path.setAttribute("stroke", getCurrentDoodleBrushColor(artwork));
  path.setAttribute("stroke-width", String(Number(artwork.doodleStrokeWidth) || 2));
  path.setAttribute("stroke-opacity", String(clamp(Number(artwork.doodleOpacity) || 1, 0, 1)));
}

function clearLiveDoodlePreview() {
  if (liveDoodlePreviewPath && liveDoodlePreviewPath.parentNode) {
    liveDoodlePreviewPath.parentNode.removeChild(liveDoodlePreviewPath);
  }
  liveDoodlePreviewPath = null;
}

function clearLiveTextBoxFrame() {
  if (liveTextBoxFrame && liveTextBoxFrame.parentNode) {
    liveTextBoxFrame.parentNode.removeChild(liveTextBoxFrame);
  }
  liveTextBoxFrame = null;
}

function setArtworkPreviewTextHidden(hidden) {
  const root = previewEl.querySelector(`#artwork-side-${CSS.escape(getActiveArtworkSide())}`);
  if (!root) {
    return;
  }
  root.querySelectorAll('[data-artwork-preview-text="true"], [data-artwork-layer-id="text-layer"]').forEach(node => {
    if (hidden) {
      node.setAttribute("data-inline-editor-hidden", "true");
      node.style.visibility = "hidden";
    } else if (node.getAttribute("data-inline-editor-hidden") === "true") {
      node.removeAttribute("data-inline-editor-hidden");
      node.style.visibility = "";
    }
  });
}

function ensureLiveTextBoxFrame() {
  const svg = previewEl.querySelector("svg");
  if (!svg) {
    return null;
  }
  if (liveTextBoxFrame && liveTextBoxFrame.isConnected) {
    return liveTextBoxFrame;
  }
  liveTextBoxFrame = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  liveTextBoxFrame.setAttribute("class", "artwork-textbox-frame");
  liveTextBoxFrame.setAttribute("pointer-events", "none");
  svg.appendChild(liveTextBoxFrame);
  return liveTextBoxFrame;
}

function updateTextBoxFrameFromDrag() {
  if (!activeTextBoxDrag) {
    clearLiveTextBoxFrame();
    return;
  }
  const frame = ensureLiveTextBoxFrame();
  if (!frame) {
    return;
  }
  const minX = Math.min(activeTextBoxDrag.start.x, activeTextBoxDrag.current.x);
  const minY = Math.min(activeTextBoxDrag.start.y, activeTextBoxDrag.current.y);
  const width = Math.max(8, Math.abs(activeTextBoxDrag.current.x - activeTextBoxDrag.start.x));
  const height = Math.max(Math.max(10, Number(activeTextBoxDrag.fontSize) || 18), Math.abs(activeTextBoxDrag.current.y - activeTextBoxDrag.start.y));
  frame.setAttribute("x", String(roundValue(minX)));
  frame.setAttribute("y", String(roundValue(minY)));
  frame.setAttribute("width", String(roundValue(width)));
  frame.setAttribute("height", String(roundValue(height)));
}

function applyTextBoxDragToArtwork(point, finalize = false) {
  if (!activeTextBoxDrag || !point) {
    return false;
  }
  const artwork = ensureSideArtworkConfig();
  if (!artwork) {
    return false;
  }
  activeTextBoxDrag.current = { x: point.x, y: point.y };
  const dx = activeTextBoxDrag.current.x - activeTextBoxDrag.start.x;
  const dy = activeTextBoxDrag.current.y - activeTextBoxDrag.start.y;
  const dragged = Math.hypot(dx, dy) >= 2;
  const width = dragged
    ? Math.max(8, Math.abs(dx))
    : Math.max(48, Number(artwork.maxWidth) || (Number(artwork.fontSize) || 18) * 5);
  const height = dragged
    ? Math.max(Math.max(10, Number(artwork.fontSize) || 18), Math.abs(dy))
    : Math.max(10, Number(artwork.fontSize) || 18);
  const minX = dragged ? Math.min(activeTextBoxDrag.start.x, activeTextBoxDrag.current.x) : activeTextBoxDrag.start.x;
  const minY = dragged ? Math.min(activeTextBoxDrag.start.y, activeTextBoxDrag.current.y) : activeTextBoxDrag.start.y;
  artwork.x = roundValue(minX + (width / 2));
  artwork.y = roundValue(minY + (height / 2));
  artwork.maxWidth = roundValue(width);
  artwork.rotationDeg = 0;
  setActiveArtworkLayer(artwork, "text-layer");
  updateTextBoxFrameFromDrag();
  if (finalize) {
    clearLiveTextBoxFrame();
  }
  return true;
}

function renderLiveTextBoxFrame() {
  if (activeTextBoxDrag) {
    updateTextBoxFrameFromDrag();
    return;
  }
  clearLiveTextBoxFrame();
}

function clearInlineTextEditor({ commit = true } = {}) {
  if (!inlineTextEditorEl) {
    setArtworkPreviewTextHidden(false);
    return;
  }
  if (commit) {
    commitArtworkHistoryCapture("inline-text");
  } else {
    cancelArtworkHistoryCapture();
  }
  inlineTextEditorEl.remove();
  inlineTextEditorEl = null;
  setArtworkPreviewTextHidden(false);
}

function svgPointToPreviewSurface(point) {
  const svg = getSelectedPanelPreviewSvg();
  const surface = previewEl.parentElement;
  if (!svg || !surface || !point || typeof DOMPoint === "undefined") {
    return null;
  }
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return null;
  }
  const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(ctm);
  const surfaceRect = surface.getBoundingClientRect();
  return {
    x: screenPoint.x - surfaceRect.left,
    y: screenPoint.y - surfaceRect.top
  };
}

function getSvgLengthInPreviewPixels(length = 0) {
  const start = svgPointToPreviewSurface({ x: 0, y: 0 });
  const end = svgPointToPreviewSurface({ x: Number(length) || 0, y: 0 });
  if (!start || !end) {
    return Math.max(80, Number(length) || 0);
  }
  return Math.max(1, Math.abs(end.x - start.x));
}

function beginTextTransformDrag(handleType, event) {
  const point = getPointerSvgPoint(event);
  const artwork = ensureSideArtworkConfig();
  if (!point || !artwork) {
    return false;
  }
  const metrics = getTextTransformMetrics(artwork);
  if (!metrics) {
    return false;
  }
  if (handleType === "rotate-text") {
    activeArtworkDrag = {
      pointerId: event.pointerId,
      tool: "rotate-text"
    };
  } else if (["nw", "ne", "se", "sw"].includes(handleType)) {
    const anchorMap = {
      nw: "se",
      ne: "sw",
      se: "nw",
      sw: "ne"
    };
    const signMap = {
      nw: { signX: -1, signY: -1 },
      ne: { signX: 1, signY: -1 },
      se: { signX: 1, signY: 1 },
      sw: { signX: -1, signY: 1 }
    };
    activeArtworkDrag = {
      pointerId: event.pointerId,
      tool: "resize-text",
      anchor: metrics.corners[anchorMap[handleType]],
      lineCount: metrics.lineCount,
      ...signMap[handleType]
    };
  } else if (handleType === "move-text") {
    activeArtworkDrag = {
      pointerId: event.pointerId,
      tool: "move-text",
      offsetX: point.x - (Number(artwork.x) || 0),
      offsetY: point.y - (Number(artwork.y) || 0)
    };
  }
  if (!activeArtworkDrag) {
    return false;
  }
  beginArtworkHistoryCapture("artwork-drag");
  state.editTool = "move-text";
  setActiveArtworkLayer(artwork, "text-layer");
  updateDraggedArtworkPosition(point);
  try {
    previewEl.setPointerCapture(event.pointerId);
  } catch (error) {
    // Pointer capture can fail if the browser has already reassigned this pointer.
  }
  queueInteractivePreviewRefresh();
  renderPreviewEditOverlay();
  return true;
}

function createInlineTextEditor() {
  const surface = previewEl.parentElement;
  if (!surface) {
    return null;
  }
  const editor = document.createElement("div");
  editor.className = "artwork-inline-text-editor";
  editor.innerHTML = `
    <div class="artwork-inline-text-toolbar">
      <select data-inline-text-font></select>
      <button type="button" data-inline-text-size="8">S</button>
      <button type="button" data-inline-text-size="18">M</button>
      <button type="button" data-inline-text-size="32">L</button>
      <input type="color" data-inline-text-color aria-label="Text color">
    </div>
    <div class="artwork-inline-text-selector" aria-hidden="true">
      <span class="artwork-inline-text-move-rail artwork-inline-text-move-rail-top" data-inline-text-handle="move-text"></span>
      <span class="artwork-inline-text-move-rail artwork-inline-text-move-rail-right" data-inline-text-handle="move-text"></span>
      <span class="artwork-inline-text-move-rail artwork-inline-text-move-rail-bottom" data-inline-text-handle="move-text"></span>
      <span class="artwork-inline-text-move-rail artwork-inline-text-move-rail-left" data-inline-text-handle="move-text"></span>
      <span class="artwork-inline-text-corner" data-inline-text-handle="nw"></span>
      <span class="artwork-inline-text-corner" data-inline-text-handle="ne"></span>
      <span class="artwork-inline-text-corner" data-inline-text-handle="se"></span>
      <span class="artwork-inline-text-corner" data-inline-text-handle="sw"></span>
      <span class="artwork-inline-text-rotate-stem"></span>
      <span class="artwork-inline-text-rotate" data-inline-text-handle="rotate-text"></span>
    </div>
    <div class="artwork-inline-text-box" data-inline-text-content contenteditable="true" spellcheck="false"></div>
  `;
  const fontSelect = editor.querySelector("[data-inline-text-font]");
  if (fontSelect) {
    fontSelect.innerHTML = availableFontOptions
      .map(option => `<option value="${escapeHtml(option)}">${escapeHtml(normalizeFontOptionLabel(option))}</option>`)
      .join("");
  }
  editor.addEventListener("pointerdown", event => {
    const transformHandle = event.target.closest("[data-inline-text-handle]");
    if (transformHandle && beginTextTransformDrag(transformHandle.dataset.inlineTextHandle || "", event)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    beginArtworkHistoryCapture("inline-text");
    event.stopPropagation();
  });
  editor.addEventListener("focusin", () => {
    beginArtworkHistoryCapture("inline-text");
  });
  editor.addEventListener("input", event => {
    const artwork = ensureSideArtworkConfig();
    if (!artwork) {
      return;
    }
    const content = event.target.closest("[data-inline-text-content]");
    if (content) {
      artwork.text = content.innerText.replace(/\u00a0/g, " ");
      setActiveArtworkLayer(artwork, "text-layer");
      renderLiveImageTransformOverlay();
      queue3dRender();
      return;
    }
  });
  editor.addEventListener("change", event => {
    const artwork = ensureSideArtworkConfig();
    if (!artwork) {
      return;
    }
    const font = event.target.closest("[data-inline-text-font]");
    if (font) {
      artwork.fontFamily = font.value || "Arial, sans-serif";
    }
    const color = event.target.closest("[data-inline-text-color]");
    if (color) {
      artwork.fill = color.value || "#ffffff";
    }
    setActiveArtworkLayer(artwork, "text-layer");
    renderPreviewFromCurrentRefinement({ sync3d: "deferred", refreshEditOverlay: false, refreshLayerOverlay: false }).catch(handlePreviewRenderError);
  });
  editor.addEventListener("click", event => {
    const sizeButton = event.target.closest("[data-inline-text-size]");
    if (!sizeButton) {
      return;
    }
    const artwork = ensureSideArtworkConfig();
    if (!artwork) {
      return;
    }
    artwork.fontSize = Number(sizeButton.dataset.inlineTextSize) || artwork.fontSize || 18;
    setActiveArtworkLayer(artwork, "text-layer");
    renderInlineTextEditor({ focus: true });
    renderPreviewFromCurrentRefinement({ sync3d: "deferred", refreshEditOverlay: false, refreshLayerOverlay: false }).catch(handlePreviewRenderError);
  });
  editor.addEventListener("blur", event => {
    if (editor.contains(event.relatedTarget)) {
      return;
    }
    commitArtworkHistoryCapture("inline-text");
    renderPreviewFromCurrentRefinement({ sync3d: "deferred", refreshEditOverlay: false, refreshLayerOverlay: false }).catch(handlePreviewRenderError);
  }, true);
  surface.appendChild(editor);
  return editor;
}

function renderInlineTextEditor({ focus = false } = {}) {
  if (!state.editMode || state.editTool !== "move-text") {
    clearInlineTextEditor();
    return;
  }
  const artwork = ensureSideArtworkConfig();
  if (!artwork) {
    clearInlineTextEditor({ commit: false });
    return;
  }
  if (!activeTextBoxDrag && !(Number(artwork.maxWidth) > 0) && !String(artwork.text || "").trim()) {
    clearInlineTextEditor({ commit: false });
    return;
  }
  const maxWidth = Math.max(48, Number(artwork.maxWidth) || (Number(artwork.fontSize) || 18) * 5);
  const center = svgPointToPreviewSurface({ x: Number(artwork.x) || 0, y: Number(artwork.y) || 0 });
  if (!center) {
    clearInlineTextEditor({ commit: false });
    return;
  }
  const widthPx = Math.max(96, getSvgLengthInPreviewPixels(maxWidth));
  const svgScale = getSvgScreenScale();
  const fontSizePx = Math.max(8, (Number(artwork.fontSize) || 18) * svgScale);
  inlineTextEditorEl = inlineTextEditorEl || createInlineTextEditor();
  if (!inlineTextEditorEl) {
    return;
  }
  inlineTextEditorEl.style.left = `${roundValue(center.x - (widthPx / 2))}px`;
  inlineTextEditorEl.style.top = `${roundValue(center.y)}px`;
  inlineTextEditorEl.style.width = `${roundValue(widthPx)}px`;
  inlineTextEditorEl.style.transform = `translateY(-50%) rotate(${roundValue(Number(artwork.rotationDeg) || 0)}deg)`;
  inlineTextEditorEl.style.setProperty("--inline-text-color", artwork.fill || "#ffffff");
  inlineTextEditorEl.style.setProperty("--inline-text-font-size", `${roundValue(fontSizePx)}px`);
  inlineTextEditorEl.style.setProperty("--inline-text-font-family", artwork.fontFamily || "Arial, sans-serif");
  inlineTextEditorEl.style.setProperty("--inline-text-line-height", String(Math.max(0.5, Number(artwork.lineHeight) || 1.2)));
  setArtworkPreviewTextHidden(true);
  const fontSelect = inlineTextEditorEl.querySelector("[data-inline-text-font]");
  if (fontSelect) {
    fontSelect.value = artwork.fontFamily || "Arial, sans-serif";
  }
  const colorInput = inlineTextEditorEl.querySelector("[data-inline-text-color]");
  if (colorInput) {
    colorInput.value = /^#[0-9a-f]{6}$/i.test(String(artwork.fill || "")) ? artwork.fill : "#ffffff";
  }
  const content = inlineTextEditorEl.querySelector("[data-inline-text-content]");
  if (content && content !== document.activeElement) {
    content.innerText = artwork.text || "";
  }
  if (focus && content) {
    content.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(content);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function ensureLiveDoodleCursor() {
  const svg = previewEl.querySelector("svg");
  if (!svg) {
    return null;
  }
  if (liveDoodleCursor && liveDoodleCursor.isConnected) {
    return liveDoodleCursor;
  }
  liveDoodleCursor = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  liveDoodleCursor.setAttribute("class", "artwork-doodle-cursor");
  liveDoodleCursor.setAttribute("pointer-events", "none");
  liveDoodleCursor.setAttribute("vector-effect", "non-scaling-stroke");
  svg.appendChild(liveDoodleCursor);
  return liveDoodleCursor;
}

function clearLiveDoodleCursor() {
  if (liveDoodleCursor && liveDoodleCursor.parentNode) {
    liveDoodleCursor.parentNode.removeChild(liveDoodleCursor);
  }
  liveDoodleCursor = null;
  lastDoodleCursorPoint = null;
}

function syncArtworkSwatchSelection(color) {
  if (!previewEditOverlayEl) {
    return;
  }
  const normalized = String(color || "").toLowerCase();
  for (const swatch of previewEditOverlayEl.querySelectorAll("[data-side-color]")) {
    const swatchColor = String(swatch.dataset.sideColor || "").toLowerCase();
    const isActive = swatchColor === normalized;
    swatch.dataset.active = String(isActive);
    swatch.setAttribute("aria-pressed", String(isActive));
  }
}

function getActiveArtworkSwatchColor() {
  if (!previewEditOverlayEl) {
    return "";
  }
  const activeSwatch = previewEditOverlayEl.querySelector('[data-side-color][data-active="true"]');
  return String(activeSwatch?.dataset.sideColor || "").trim();
}

function getCurrentDoodleBrushColor(artwork) {
  return getActiveArtworkSwatchColor() || String(artwork?.doodleStroke || DEFAULT_ARTWORK_DOODLE_COLOR);
}

function getSvgScreenScale(svg = getSelectedPanelPreviewSvg()) {
  if (!svg) {
    return 1;
  }
  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return 1;
  }
  const scaleX = Math.hypot(ctm.a, ctm.b);
  const scaleY = Math.hypot(ctm.c, ctm.d);
  return Math.max(0.0001, (scaleX + scaleY) / 2);
}

function syncArtworkPreviewLayerStyles() {
  const artwork = ensureSideArtworkConfig();
  if (!artwork) {
    return;
  }
  for (const layer of syncArtworkLayers(artwork)) {
    const node = previewEl.querySelector(`[data-artwork-layer-id="${CSS.escape(layer.id)}"]`);
    if (!node) {
      continue;
    }
    if (layer.type === "doodle" && layer.doodle) {
      node.setAttribute("stroke", layer.doodle.stroke || DEFAULT_ARTWORK_DOODLE_COLOR);
      node.setAttribute("stroke-width", String(roundValue(Math.max(0.1, Number(layer.doodle.strokeWidth) || 2))));
      node.setAttribute("stroke-opacity", String(roundValue(clamp(Number(layer.doodle.opacity) || 1, 0, 1))));
      continue;
    }
    if (layer.type === "image" && layer.image) {
      node.setAttribute("href", getRenderableArtworkImageDataUrl(layer.image));
      node.setAttribute("opacity", String(roundValue(clamp(Number(layer.image.opacity) || 1, 0, 1))));
      continue;
    }
    if (layer.type === "text") {
      node.setAttribute("fill", artwork.fill || "#ffffff");
      node.setAttribute("fill-opacity", String(roundValue(clamp(Number(artwork.textOpacity) || 1, 0, 1))));
    }
  }
}

function applyArtworkSwatchColor(artwork, color) {
  if (!artwork || !state.editMode) {
    return false;
  }
  recordArtworkHistoryNow();
  const selectedLayer = getSelectedArtworkLayer(artwork);
  artwork.doodleStroke = color;
  if (["doodle", "eraser"].includes(state.editTool)) {
    // In doodle mode the swatch controls the brush color for future strokes.
    // Recoloring the selected doodle here makes every prior stroke follow the
    // latest swatch selection, which collapses multi-color drawing.
  } else if (selectedLayer?.type === "doodle") {
    selectedLayer.doodle.stroke = color;
  } else if (selectedLayer?.type === "image" && selectedLayer.image && isSvgArtworkDataUrl(selectedLayer.image.dataUrl)) {
    selectedLayer.image.tintColor = color;
  } else {
    artwork.fill = color;
    artwork.fillColor = color;
    if (artwork.fillOpacity <= 0) {
      artwork.fillOpacity = 0.3;
    }
  }
  syncArtworkSwatchSelection(color);
  syncArtworkPreviewLayerStyles();
  updateLiveDoodlePreview();
  updateDoodleCursorFromLastPoint();
  renderPreviewEditOverlay();
  renderPreviewFromCurrentRefinement({ refreshEditOverlay: false }).catch(error => {
    statusEl.textContent = "Preview failed to update.";
    console.error(error);
  });
  return true;
}

function updateDoodleCursor(point) {
  const artwork = ensureSideArtworkConfig();
  if (!artwork || !state.editMode || !["doodle", "eraser"].includes(state.editTool) || !point) {
    clearLiveDoodleCursor();
    return;
  }
  const cursor = ensureLiveDoodleCursor();
  if (!cursor) {
    return;
  }
  lastDoodleCursorPoint = point;
  cursor.setAttribute("data-tool", state.editTool);
  cursor.setAttribute("cx", String(roundValue(point.x)));
  cursor.setAttribute("cy", String(roundValue(point.y)));
  if (state.editTool === "eraser") {
    cursor.style.removeProperty("fill");
    cursor.style.removeProperty("stroke");
  } else {
    const color = getCurrentDoodleBrushColor(artwork);
    cursor.style.fill = `${color}22`;
    cursor.style.stroke = color;
  }
  const svgScreenScale = getSvgScreenScale();
  const radius = state.editTool === "eraser"
    ? Math.max(1, Number(artwork.eraserSize) || 12)
    : Math.max(0.5 / svgScreenScale, ((Number(artwork.doodleStrokeWidth) || 2) * 0.5) / svgScreenScale);
  cursor.setAttribute("r", String(roundValue(radius)));
}

function updateDoodleCursorFromLastPoint() {
  if (lastDoodleCursorPoint) {
    updateDoodleCursor(lastDoodleCursorPoint);
  }
}

function parseDoodlePathPoints(pathData) {
  const numbers = String(pathData || "").match(/-?\d*\.?\d+/g) || [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([Number(numbers[index]) || 0, Number(numbers[index + 1]) || 0]);
  }
  return points;
}

function distancePointToSegment(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start[0], point.y - start[1]);
  }
  const t = clamp((((point.x - start[0]) * dx) + ((point.y - start[1]) * dy)) / ((dx * dx) + (dy * dy)), 0, 1);
  const nearestX = start[0] + (dx * t);
  const nearestY = start[1] + (dy * t);
  return Math.hypot(point.x - nearestX, point.y - nearestY);
}

function eraseDoodlesAtPoint(point) {
  const artwork = ensureSideArtworkConfig();
  if (!artwork || !point || !Array.isArray(artwork.doodles) || !artwork.doodles.length) {
    return false;
  }
  const radius = Math.max(1, Number(artwork.eraserSize) || 12);
  const before = artwork.doodles.length;
  artwork.doodles = artwork.doodles.filter(doodle => {
    const points = parseDoodlePathPoints(doodle.d);
    if (points.length === 1) {
      return Math.hypot(point.x - points[0][0], point.y - points[0][1]) > radius;
    }
    for (let index = 0; index < points.length - 1; index += 1) {
      if (distancePointToSegment(point, points[index], points[index + 1]) <= radius) {
        return false;
      }
    }
    return true;
  });
  syncArtworkLayers(artwork);
  return artwork.doodles.length !== before;
}

function isPointInsideSelectedPanel(point) {
  if (!point || !state.selectedPanelId) {
    return false;
  }
  const panelPath = previewEl.querySelector(`#panel-${CSS.escape(state.selectedPanelId)}`) || getSelectedPanelPreviewPath();
  if (!panelPath) {
    return false;
  }
  if (typeof panelPath.isPointInFill === "function") {
    try {
      return panelPath.isPointInFill(point);
    } catch (_error) {
      // fallback to bbox below
    }
  }
  if (typeof panelPath.getBBox === "function") {
    const bbox = panelPath.getBBox();
    return point.x >= bbox.x
      && point.x <= bbox.x + bbox.width
      && point.y >= bbox.y
      && point.y <= bbox.y + bbox.height;
  }
  return false;
}

function getPanelIdAtPoint(point) {
  if (!point) {
    return "";
  }
  const hitCandidates = [
    ...Array.from(previewEl.querySelectorAll('#panel-preview path[id^="preview-"]')).reverse(),
    ...Array.from(previewEl.querySelectorAll('[data-box-role="panel"][data-panel-id]')).reverse()
  ];
  for (const panelPath of hitCandidates) {
    if (typeof panelPath.isPointInFill === "function") {
      try {
        if (panelPath.isPointInFill(point)) {
          return (panelPath.getAttribute("data-panel-id")
            || (panelPath.id || "").replace(/^preview-/, "").replace(/^panel-/, "")).trim();
        }
      } catch (_error) {
        continue;
      }
    }
  }
  return "";
}

function renderPreviewLayerOverlay() {
  if (!previewLayerOverlayEl) {
    return;
  }
  if (!state.lastGeometry || !state.editMode) {
    previewLayerOverlayEl.hidden = true;
    previewLayerOverlayEl.innerHTML = "";
    return;
  }
  const artwork = ensureSideArtworkConfig();
  const side = getActiveArtworkSide();
  const layers = artwork ? syncArtworkLayers(artwork) : [];
  const selectedLayer = artwork ? getSelectedArtworkLayer(artwork) : null;
  const selectedIndex = layers.findIndex(layer => layer.id === selectedLayer?.id);
  const bucket = getArtworkHistoryBucket(side);
  previewLayerOverlayEl.hidden = false;
  previewLayerOverlayEl.innerHTML = `
    <div class="preview-layer-panel">
      <div class="preview-layer-panel-header">
        <span>${getArtworkSideLabel(side)} layers</span>
        <div class="preview-layer-history">
          <button type="button" data-artwork-undo${bucket.undo.length ? "" : " disabled"}>undo</button>
          <button type="button" data-artwork-redo${bucket.redo.length ? "" : " disabled"}>redo</button>
        </div>
      </div>
      <div class="preview-layer-panel-body">
        ${layers.length ? `
          <div class="preview-layer-list">
            ${layers.map(layer => `
              <button type="button" class="preview-layer-row${layer.id === selectedLayer?.id ? " is-active" : ""}" data-select-artwork-layer="${layer.id}">
                <span class="preview-layer-row-name">${escapeHtml(layer.name || layer.type)}</span>
                <span class="preview-layer-row-meta">${escapeHtml(layer.type)} · ${roundValue(layer.opacity ?? 1) * 100}%</span>
              </button>
            `).join("")}
          </div>
          <div class="preview-layer-controls">
            <label class="preview-edit-slider-label">selected opacity</label>
            <input type="range" min="0" max="1" step="0.05" value="${roundValue(selectedLayer?.opacity ?? 1)}" data-layer-opacity>
            <div class="preview-layer-actions">
              <button type="button" data-move-artwork-layer="${selectedLayer?.id || ""}" data-direction="up"${!selectedLayer || selectedIndex <= 0 ? " disabled" : ""}>up</button>
              <button type="button" data-move-artwork-layer="${selectedLayer?.id || ""}" data-direction="down"${!selectedLayer || selectedIndex === layers.length - 1 ? " disabled" : ""}>down</button>
              <button type="button" data-delete-artwork-layer="${selectedLayer?.id || ""}"${!selectedLayer ? " disabled" : ""}>delete</button>
            </div>
          </div>
        ` : `<div class="preview-layer-empty">No artwork layers yet.</div>`}
      </div>
    </div>
  `;
}

function renderPreviewEditOverlay() {
  if (!previewEditOverlayEl) {
    return;
  }
  if (!state.lastGeometry) {
    clearLiveImageTransformOverlay();
    clearLiveDoodleCursor();
    clearLiveTextBoxFrame();
    if (previewWorkbenchEl) {
      previewWorkbenchEl.dataset.editMode = "false";
    }
    previewEditOverlayEl.hidden = true;
    previewEditOverlayEl.innerHTML = "";
    renderPreviewLayerOverlay();
    return;
  }
  if (previewWorkbenchEl) {
    previewWorkbenchEl.dataset.editMode = String(state.editMode);
  }
  previewEl.dataset.editTool = state.editMode ? state.editTool : "";
  const side = getActiveArtworkSide();
  const artwork = ensureSideArtworkConfig() || {
    text: "",
    fill: "#333333",
    fillColor: "",
    fillOpacity: 0,
    doodleStroke: DEFAULT_ARTWORK_DOODLE_COLOR,
    doodleStrokeWidth: 2,
    fontSize: 18
  };
  const swatches = ["#f5f5f5", "#aab0c8", "#d88cf1", "#a841d4", "#4d6df3", "#50a7f5", "#ffbe3b", "#ff7a10", "#14a57a", "#46c85a", "#ff7f88", "#ef3939"];
  const sizeOptions = [
    { label: "S", value: 8 },
    { label: "M", value: 18 },
    { label: "L", value: 32 },
    { label: "XL", value: 48 }
  ];
  const selectedLayer = getSelectedArtworkLayer(artwork);
  const selectedSvgImage = selectedLayer?.type === "image" && isSvgArtworkDataUrl(selectedLayer.image?.dataUrl || "")
    ? selectedLayer.image
    : null;
  const colorTarget = String(
    (selectedLayer?.type === "doodle" || ["doodle", "eraser"].includes(state.editTool))
      ? getCurrentDoodleBrushColor(artwork)
      : (selectedSvgImage?.tintColor || "")
        || artwork.fill
  ).toLowerCase();
  const showTextEditor = state.editTool === "move-text" || selectedLayer?.type === "text";
  const hasText = Boolean(String(artwork.text || "").trim());
  const images = syncArtworkImages(artwork);
  const selectedImage = getSelectedArtworkImage(artwork);
  const hasImage = images.length > 0;
  const hasDoodles = Array.isArray(artwork.doodles) && artwork.doodles.length > 0;
  const controlsImageOpacity = selectedLayer?.type === "image";
  const controlsDoodleOpacity = selectedLayer?.type === "doodle" || ["doodle", "eraser"].includes(state.editTool);
  const opacityLabel = controlsImageOpacity
    ? "image opacity"
    : (selectedLayer?.type === "text" ? "text opacity" : (controlsDoodleOpacity ? "doodle opacity" : "fill opacity"));
  const opacityValue = controlsImageOpacity
    ? roundValue(selectedImage?.opacity ?? 1)
    : roundValue(
      selectedLayer?.type === "text"
        ? (artwork.textOpacity ?? 1)
        : (selectedLayer?.type === "doodle"
          ? (selectedLayer.opacity ?? 1)
          : (controlsDoodleOpacity ? (artwork.doodleOpacity ?? 1) : (artwork.fillOpacity || 0.3)))
    );
  const brushLabel = state.editTool === "eraser" ? "eraser size" : "brush width";
  const brushValue = roundValue(state.editTool === "eraser" ? (artwork.eraserSize || 12) : (artwork.doodleStrokeWidth || 2));
  previewEditOverlayEl.hidden = false;
  if (!state.editMode) {
      previewEditOverlayEl.innerHTML = `
      <button type="button" class="preview-edit-launcher" data-edit-mode-toggle="on">EDIT</button>
    `;
    clearLiveImageTransformOverlay();
    clearLiveDoodleCursor();
    clearLiveTextBoxFrame();
    renderPreviewLayerOverlay();
    return;
  }
  previewEditOverlayEl.innerHTML = `
    <div class="preview-edit-panel">
      <div class="preview-edit-panel-header">${getArtworkSideLabel(side)} artwork</div>
      <div class="preview-edit-swatches">
        ${swatches.map(color => {
          const isActive = colorTarget === String(color).toLowerCase();
          return `<button type="button" class="swatch" data-side-color="${color}" data-active="${isActive}" aria-pressed="${isActive}" title="${color}" style="--swatch:${color}"${state.editMode ? "" : " disabled"}></button>`;
        }).join("")}
      </div>
      <label class="preview-edit-slider-label">${opacityLabel}</label>
      <input type="range" min="0" max="1" step="0.05" value="${opacityValue}" data-side-opacity${state.editMode ? "" : " disabled"}>
      ${["doodle", "eraser"].includes(state.editTool) ? `
      <div class="preview-edit-brush-row">
        <label class="preview-edit-slider-label">${brushLabel}</label>
        <div class="preview-edit-brush-controls">
          <input type="range" min="1" max="40" step="0.5" value="${brushValue}" data-side-brush-width>
          <input type="number" min="1" max="40" step="0.5" value="${brushValue}" data-side-brush-width-number>
        </div>
      </div>` : ""}
      <div class="preview-edit-size-row">
        ${sizeOptions.map(option => `<button type="button" data-side-size="${option.value}" data-active="${Math.abs(((state.editTool === "doodle") ? artwork.doodleStrokeWidth : (state.editTool === "eraser" ? artwork.eraserSize : artwork.fontSize)) - option.value) < 0.001}"${state.editMode ? "" : " disabled"}>${option.label}</button>`).join("")}
      </div>
      ${showTextEditor ? `
      <select class="preview-edit-font-select" data-side-font-family${state.editMode ? "" : " disabled"}>
        ${availableFontOptions.map(option => `<option value="${escapeHtml(option)}"${option === artwork.fontFamily ? " selected" : ""}>${escapeHtml(normalizeFontOptionLabel(option))}</option>`).join("")}
      </select>` : ""}
      ${(showTextEditor || hasText || hasImage || hasDoodles) ? `
      <div class="preview-edit-panel-actions">
        ${(showTextEditor || hasText) ? `<button type="button" data-clear-side-text${state.editMode ? "" : " disabled"}>text</button>` : ""}
        ${(selectedLayer?.type === "image" || hasImage) ? `<button type="button" data-clear-side-image${state.editMode ? "" : " disabled"}>selected image</button>` : ""}
        ${(selectedLayer?.type === "doodle" || state.editTool === "doodle" || hasDoodles) ? `<button type="button" data-clear-side-doodles${state.editMode ? "" : " disabled"}>doodles</button>` : ""}
      </div>` : ""}
      <div class="preview-edit-hint">${state.editTool === "move-text"
        ? "Click or drag on the artwork, then edit text in the inline box."
        : state.editTool === "move-image"
          ? "Drag the frame to move the image, corners to resize, and the top handle to rotate."
          : state.editTool === "doodle"
            ? "Drag on the active side to doodle."
            : state.editTool === "eraser"
              ? "Drag on the active side to erase doodle strokes."
            : (hasImage ? "Select the uploaded image to adjust it." : `Editing the ${side} side.`)}</div>
    </div>
    <div class="preview-edit-toolbar preview-edit-toolbar-bottom">
      <button type="button" data-edit-mode-toggle="off" data-active="true">ESC</button>
      <button type="button" data-edit-tool="select" data-active="${state.editTool === "select"}" title="Select"${state.editMode ? "" : " disabled"}>◧</button>
      <button type="button" data-edit-tool="move-text" data-active="${state.editTool === "move-text"}" title="Text"${state.editMode ? "" : " disabled"}>T</button>
      <button type="button" data-edit-tool="move-image" data-active="${state.editTool === "move-image"}" title="Image"${state.editMode ? "" : " disabled"}>▣</button>
      <button type="button" data-edit-tool="doodle" data-active="${state.editTool === "doodle"}" title="Doodle"${state.editMode ? "" : " disabled"}>✎</button>
      <button type="button" data-edit-tool="eraser" data-active="${state.editTool === "eraser"}" title="Eraser"${state.editMode ? "" : " disabled"}>⌫</button>
      <button type="button" data-overlay-upload-image title="Upload image"${state.editMode ? "" : " disabled"}>🖼</button>
      <button type="button" data-overlay-upload-font title="Upload font"${state.editMode ? "" : " disabled"}>𝙵</button>
    </div>
  `;
  renderLiveImageTransformOverlay();
  renderLiveTextBoxFrame();
  renderInlineTextEditor();
  renderPreviewLayerOverlay();
  if (!["doodle", "eraser"].includes(state.editTool)) {
    clearLiveDoodleCursor();
  }
  if (state.editTool !== "move-text" && !activeTextBoxDrag) {
    clearLiveTextBoxFrame();
  }
}

function renderFoldDirectionControls() {
  if (!assemblyPlanControlsEl) {
    return;
  }
  if (!state.lastGeometry) {
    assemblyPlanControlsEl.innerHTML = "";
    return;
  }

  const objectIds = getGeometryObjectIds(state.lastGeometry);
  const objectOptions = objectIds.map(objectId => `<option value="${escapeHtml(objectId)}">${escapeHtml(getObjectLabel(objectId))}</option>`).join("");
  const renderTimingControl = step => `
    <span class="fold-angle-control">
      <span class="fold-angle-label">Timing</span>
      <span class="fold-angle-control-row">
        <label class="checkbox">
          <input type="checkbox" data-step-id="${step.id}" data-step-key="syncWithPrevious"${step.syncWithPrevious ? " checked" : ""}>
          <span>run with previous step</span>
        </label>
      </span>
    </span>
  `;
  assemblyPlanControlsEl.innerHTML = state.assemblySteps.length ? state.assemblySteps.map((step, index) => {
    const accent = step.type === "fold"
      ? getFoldAccentColor(step.foldId)
      : (step.type === "model-rotation" ? "rgba(255, 122, 61, 0.95)" : "rgba(118, 215, 255, 0.95)");
    if (step.type === "fold") {
      const isLocked = !!state.foldLocks[step.foldId];
      return `
        <div class="fold-direction-item${state.selectedFoldId === step.foldId ? " is-selected" : ""}${isLocked ? " is-locked" : ""}" data-step-id="${step.id}" data-select-fold="${step.foldId}" style="--fold-accent:${accent};">
          <span class="fold-direction-title">${index + 1}. ${getFoldLabel(step.foldId)}</span>
          <span class="fold-order-controls">
            <button type="button" data-move-step="${step.id}" data-direction="up">up</button>
            <button type="button" data-move-step="${step.id}" data-direction="down">down</button>
            <button type="button" data-toggle-fold-lock="${step.foldId}">${isLocked ? "unlock" : "lock"}</button>
          </span>
          <span class="fold-settings">
            <span class="fold-angle-control">
              <span class="fold-angle-label">Bend angle</span>
              <span class="fold-angle-control-row">
                <span class="fold-angle-range">
                  <span>-180°</span>
                  <input type="range" min="-180" max="180" step="1" data-step-id="${step.id}" data-step-key="angleDeg" value="${roundValue(step.angleDeg)}">
                  <span>180°</span>
                </span>
                <input class="fold-angle-input" type="number" min="-180" max="180" step="1" data-step-id="${step.id}" data-step-key="angleDeg" value="${roundValue(step.angleDeg)}">
              </span>
            </span>
            <span class="fold-angle-control">
              <span class="fold-angle-label">Easing</span>
              <span class="fold-angle-control-row">
                <select data-step-id="${step.id}" data-step-key="easing">
                  ${STEP_EASING_OPTIONS.map(option => `<option value="${option.value}"${option.value === step.easing ? " selected" : ""}>${option.label}</option>`).join("")}
                </select>
              </span>
            </span>
            ${renderTimingControl(step)}
          </span>
        </div>
      `;
    }
    if (step.type === "model-rotation") {
      const objectOptions = [
        `<option value="__all__"${(step.objectId || "__all__") === "__all__" ? " selected" : ""}>Whole model</option>`,
        ...getGeometryObjectIds(state.lastGeometry).map(objectId =>
          `<option value="${escapeHtml(objectId)}"${objectId === (step.objectId || "") ? " selected" : ""}>${escapeHtml(getObjectLabel(objectId))}</option>`
        )
      ].join("");
      return `
        <div class="fold-direction-item fold-direction-item-rotation" data-step-id="${step.id}" style="--fold-accent:${accent};">
          <span class="fold-direction-title">${index + 1}. rotate ${escapeHtml((step.objectId || "__all__") === "__all__" ? "whole model" : getObjectLabel(step.objectId))}</span>
          <span class="fold-order-controls">
            <button type="button" data-move-step="${step.id}" data-direction="up">up</button>
            <button type="button" data-move-step="${step.id}" data-direction="down">down</button>
            <button type="button" data-delete-step="${step.id}">remove</button>
          </span>
          <span class="fold-settings">
            <span class="fold-angle-control">
              <span class="fold-angle-label">Object</span>
              <span class="fold-angle-control-row">
                <select data-step-id="${step.id}" data-step-key="objectId">
                  ${objectOptions}
                </select>
              </span>
            </span>
            <span class="fold-angle-control">
              <span class="fold-angle-label">Rotation axis</span>
              <span class="fold-angle-control-row">
                <select data-step-id="${step.id}" data-step-key="axis">
                  <option value="z"${step.axis === "z" ? " selected" : ""}>Z axis</option>
                  <option value="x"${step.axis === "x" ? " selected" : ""}>X axis</option>
                  <option value="y"${step.axis === "y" ? " selected" : ""}>Y axis</option>
                </select>
              </span>
            </span>
            <span class="fold-angle-control">
              <span class="fold-angle-label">Rotation angle</span>
              <span class="fold-angle-control-row">
                <span class="fold-angle-range">
                  <span>-180°</span>
                  <input type="range" min="-180" max="180" step="1" data-step-id="${step.id}" data-step-key="angleDeg" value="${roundValue(step.angleDeg)}">
                  <span>180°</span>
                </span>
                <input class="fold-angle-input" type="number" min="-180" max="180" step="1" data-step-id="${step.id}" data-step-key="angleDeg" value="${roundValue(step.angleDeg)}">
              </span>
            </span>
            <span class="fold-angle-control">
              <span class="fold-angle-label">Easing</span>
              <span class="fold-angle-control-row">
                <select data-step-id="${step.id}" data-step-key="easing">
                  ${STEP_EASING_OPTIONS.map(option => `<option value="${option.value}"${option.value === step.easing ? " selected" : ""}>${option.label}</option>`).join("")}
                </select>
              </span>
            </span>
            ${renderTimingControl(step)}
          </span>
        </div>
      `;
    }
    return `
      <div class="fold-direction-item fold-direction-item-move" data-step-id="${step.id}" style="--fold-accent:${accent};">
        <span class="fold-direction-title">${index + 1}. move ${escapeHtml(getObjectLabel(step.objectId || "__default__"))}</span>
        <span class="fold-order-controls">
          <button type="button" data-move-step="${step.id}" data-direction="up">up</button>
          <button type="button" data-move-step="${step.id}" data-direction="down">down</button>
          <button type="button" data-delete-step="${step.id}">remove</button>
        </span>
        <span class="fold-settings">
          <span class="fold-angle-control">
            <span class="fold-angle-label">Object</span>
            <span class="fold-angle-control-row">
              <select data-step-id="${step.id}" data-step-key="objectId">${objectOptions.replace(`value="${escapeHtml(step.objectId || "__default__")}"`, `value="${escapeHtml(step.objectId || "__default__")}" selected`)}</select>
            </span>
          </span>
          <span class="fold-angle-control">
            <span class="fold-angle-label">Move axis</span>
            <span class="fold-angle-control-row">
              <select data-step-id="${step.id}" data-step-key="axis">
                <option value="x"${step.axis === "x" ? " selected" : ""}>X axis</option>
                <option value="y"${step.axis === "y" ? " selected" : ""}>Y axis</option>
                <option value="z"${step.axis === "z" ? " selected" : ""}>Z axis</option>
              </select>
            </span>
          </span>
          <span class="fold-angle-control">
            <span class="fold-angle-label">Distance</span>
            <span class="fold-angle-control-row">
              <span class="fold-angle-range">
                <span>-200</span>
                <input type="range" min="-200" max="200" step="1" data-step-id="${step.id}" data-step-key="distanceMm" value="${roundValue(step.distanceMm)}">
                <span>200mm</span>
              </span>
              <input class="fold-angle-input" type="number" min="-200" max="200" step="1" data-step-id="${step.id}" data-step-key="distanceMm" value="${roundValue(step.distanceMm)}">
            </span>
          </span>
          <span class="fold-angle-control">
            <span class="fold-angle-label">Easing</span>
            <span class="fold-angle-control-row">
              <select data-step-id="${step.id}" data-step-key="easing">
                ${STEP_EASING_OPTIONS.map(option => `<option value="${option.value}"${option.value === step.easing ? " selected" : ""}>${option.label}</option>`).join("")}
              </select>
            </span>
          </span>
          ${renderTimingControl(step)}
        </span>
      </div>
    `;
  }).join("") : `<div class="fold-direction-empty">No animation steps yet.</div>`;
}

function buildFoldPlanSummary() {
  const lines = [
    `template: ${state.templateId}`,
    `animation_progress: ${roundValue(state.fold * 100)}%`,
    "animation_plan:"
  ];
  for (const [index, step] of state.assemblySteps.entries()) {
    const timing = step.syncWithPrevious ? " with_previous" : "";
    if (step.type === "fold") {
      lines.push(`${index + 1}. fold ${getFoldLabel(step.foldId)} angle=${roundValue(step.angleDeg)} easing=${step.easing}${timing}`);
    } else if (step.type === "model-rotation") {
      lines.push(`${index + 1}. rotate object=${step.objectId || "__all__"} axis=${step.axis} angle=${roundValue(step.angleDeg)} easing=${step.easing}${timing}`);
    } else if (step.type === "object-move") {
      lines.push(`${index + 1}. move object=${step.objectId} axis=${step.axis} distance_mm=${roundValue(step.distanceMm)} easing=${step.easing}${timing}`);
    }
  }

  return lines.join("\n");
}

function updatePreviewSideUi() {
  ensureSupportedPreviewSide();
  previewEl.dataset.previewSide = state.previewSide;
  const supportedSides = getTemplateArtworkSides();
  previewSideSwitchEl.hidden = supportedSides.length <= 1;
  for (const button of previewSideSwitchEl.querySelectorAll("[data-preview-side]")) {
    const side = button.dataset.previewSide === "inside" ? "inside" : "outside";
    const active = side === state.previewSide;
    const supported = supportedSides.includes(side);
    button.hidden = !supported;
    button.disabled = !supported;
    button.textContent = getArtworkSideLabel(side);
    button.setAttribute("aria-pressed", String(active));
    button.dataset.active = String(active);
  }
}

function updatePreviewZoomUi() {
  if (previewZoomValueEl) {
    previewZoomValueEl.textContent = `${Math.round(state.previewZoom * 100)}%`;
  }
}

function applyPreviewViewportUi() {
  updatePreviewSideUi();
  updatePreviewZoomUi();
  const svg = previewEl.querySelector("svg");
  if (!svg) {
    return;
  }
  const zoom = roundValue(state.previewZoom);
  svg.style.width = `${zoom * 100}%`;
  svg.style.maxWidth = "none";
  svg.style.height = `min(${54 * zoom}vh, ${740 * zoom}px)`;
  svg.style.overflow = "visible";
  svg.style.transform = getActiveArtworkSide() === "inside" ? "scaleX(-1)" : "";
  recenterPreviewStage();
}

function applyPreviewZoomChange() {
  applyPreviewViewportUi();
  renderLiveImageTransformOverlay();
  renderLiveTextBoxFrame();
}

function recenterPreviewStage() {
  requestAnimationFrame(() => {
    previewEl.scrollLeft = Math.max(0, (previewEl.scrollWidth - previewEl.clientWidth) / 2);
    previewEl.scrollTop = Math.max(0, (previewEl.scrollHeight - previewEl.clientHeight) / 2);
  });
}

function getAssemblyStepById(stepId) {
  return state.assemblySteps.find(step => step.id === stepId) || null;
}

function updateAssemblyStepValue(stepId, key, rawValue) {
  const step = getAssemblyStepById(stepId);
  if (!step) {
    return null;
  }
  if (key === "angleDeg") {
    step.angleDeg = clamp(Number.parseFloat(rawValue) || 0, -180, 180);
  } else if (key === "distanceMm") {
    step.distanceMm = clamp(Number.parseFloat(rawValue) || 0, -200, 200);
  } else if (key === "axis") {
    step.axis = ["x", "y", "z"].includes(rawValue) ? rawValue : (step.type === "model-rotation" ? "z" : "x");
  } else if (key === "objectId") {
    step.objectId = step.type === "model-rotation"
      ? (rawValue || "__all__")
      : (rawValue || "__default__");
  } else if (key === "syncWithPrevious") {
    step.syncWithPrevious = Boolean(rawValue);
    const stepIndex = state.assemblySteps.findIndex(candidate => candidate.id === stepId);
    if (stepIndex <= 0) {
      step.syncWithPrevious = false;
    }
  } else if (key === "easing") {
    step.easing = STEP_EASING_OPTIONS.some(option => option.value === rawValue) ? rawValue : "ease-in-out";
  }
  syncAssemblyStepsToRefinement();
  return step;
}

function renderTemplatePicker() {
  templatePicker.innerHTML = TEMPLATE_FAMILIES.map(family => {
    const active = family.templates.some(template => template.id === state.templateId);
    return `
      <button class="template-option" type="button" role="tab" aria-selected="${active}" aria-label="${family.name}" data-template-family-id="${family.id}" data-active="${active}">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <use href="#${family.icon}"></use>
        </svg>
        <span class="template-meta">
          <span class="template-name">${family.name}</span>
        </span>
      </button>
    `;
  }).join("");
}

function updateTemplatePickerState() {
  const activeFamilyId = getTemplateFamily(state.templateId)?.id || "";
  for (const button of templatePicker.querySelectorAll("button[data-template-family-id]")) {
    const active = button.dataset.templateFamilyId === activeFamilyId;
    button.dataset.active = String(active);
    button.setAttribute("aria-selected", String(active));
  }
}

function renderTemplateVariantPicker() {
  const family = getTemplateFamily();
  if (!family || family.templates.length < 2) {
    templateVariantFieldEl.hidden = true;
    templateVariantPickerEl.innerHTML = "";
    return;
  }

  templateVariantFieldEl.hidden = false;
  templateVariantPickerEl.innerHTML = family.templates.map(template => `
    <option value="${template.id}"${template.id === state.templateId ? " selected" : ""}>${template.variantLabel || template.name}</option>
  `).join("");
}

function ensureFoldStateForGeometry(geometry) {
  ensureAssemblyStepsForGeometry(geometry);
  if (state.selectedFoldId && !geometry.folds.some(fold => fold.id === state.selectedFoldId)) {
    state.selectedFoldId = "";
  }
  if (state.selectedPanelId && !geometry.panels.some(panel => panel.id === state.selectedPanelId)) {
    state.selectedPanelId = "";
  }
  state.foldLocks = Object.fromEntries(
    Object.entries(state.foldLocks || {}).filter(([foldId, locked]) => locked && geometry.folds.some(fold => fold.id === foldId))
  );
  const foldObjectGroups = getFoldObjectGroups(geometry);
  if (foldObjectGroups.length) {
    const validObjectIds = new Set(foldObjectGroups.map(group => group.objectId));
    if (!state.selectedObjectId || !validObjectIds.has(state.selectedObjectId)) {
      const selectedPanel = state.selectedPanelId
        ? geometry.panels.find(panel => panel.id === state.selectedPanelId) || null
        : null;
      state.selectedObjectId = (selectedPanel && selectedPanel.objectId)
        || (geometry.floorPanelsByObject && Object.keys(geometry.floorPanelsByObject)[0])
        || foldObjectGroups[0].objectId;
    }
  } else {
    state.selectedObjectId = "";
  }
}

async function render() {
  const renderToken = ++state.renderToken;
  updateTemplateInfo();
  updateTemplatePickerState();
  renderTemplateVariantPicker();
  applyPreviewViewportUi();
  try {
    const params = readParams();
    const geometry = await buildTemplateGeometry(params, state.templateId);

    if (renderToken !== state.renderToken) {
      return;
    }

    state.lastGeometry = geometry;
    ensureFoldStateForGeometry(geometry);
    ensureRefinementForGeometry(geometry);
    ensureAssemblyStepsForGeometry(geometry);
    if (!isTemplateParameterInputFocused()) {
      renderTemplateFields(state.templateId, geometry);
    }
    const refinement = state.templateRefinements[state.templateId] || null;
    ensureSupportedPreviewSide();
    const markup = await buildSvgMarkup({
      templateId: state.templateId,
      params,
      showPanels: state.showPanels,
      showLabels: state.showLabels,
      refinement,
      previewSide: state.previewSide
    });

    if (renderToken !== state.renderToken) {
      return;
    }

    state.lastSvgMarkup = markup;
    syncStructuredSvgOutput();
    renderFoldDirectionControls();
    renderTemplateRefinementControls();
    previewEl.innerHTML = markup;
    applyPreviewViewportUi();
    renderPreviewEditOverlay();
    await render3d();
    statusEl.textContent = "";
  } catch (error) {
    if (renderToken !== state.renderToken) {
      return;
    }
    statusEl.textContent = "Preview failed to update.";
    console.error(error);
  }
}

async function render3d() {
  if (!state.lastGeometry) {
    return;
  }
  const assemblyState = getAssemblyStateForProgress(state.fold);
  const preserveCurrentCamera = !!state.preserveCameraOnNextRender;
  state.preserveCameraOnNextRender = false;
  foldSlider.value = String(Math.round(state.fold * 100));
  const refinement = getActiveRefinement();
  const modelGeometry = applyRefinementToGeometry(state.lastGeometry, refinement);
  const assembledDefaults = (refinement && refinement.assembledDefaults)
    || modelGeometry.assembledDefaults
    || (modelGeometry.custom3d && modelGeometry.custom3d.camera && modelGeometry.custom3d.camera.foldedState)
    || null;
  const autoAssembleBlendProgress = state.autoAssemble
    ? clamp((state.fold - state.autoAssembleStartProgress) / Math.max(0.0001, 1 - state.autoAssembleStartProgress), 0, 1)
    : 1;
  await update3dPreview(modelEl, modelGeometry, {
    templateId: state.templateId,
    paperStock: state.paperStock,
    textureScale: state.textureScale,
    thickness: getMaterialThicknessMm(),
    showLabels: state.showModelLabels,
    fold: state.fold,
    preserveCurrentCamera,
    orbitYawDeg: state.autoAssembleOrbitDeg,
    autoAssembleCamera: state.autoAssemble,
    assembledDefaults,
    cameraTransition: state.autoAssemble && state.autoAssembleCameraStart
      ? {
          start: state.autoAssembleCameraStart,
          end: assembledDefaults || state.autoAssembleCameraStart,
          progress: autoAssembleBlendProgress
        }
      : null,
    foldLocks: state.foldLocks,
    foldAnglesDeg: assemblyState.foldAnglesDeg,
    foldProgressById: assemblyState.foldProgressById,
    modelRotationSteps: assemblyState.modelRotationSteps,
    objectMoveSteps: assemblyState.objectMoveSteps,
    selectedObjectId: state.selectedObjectId,
    selectedPanelId: state.selectedPanelId,
    selectedFoldId: state.selectedFoldId,
    onPanelSelect: panelId => {
      selectPanel(panelId);
      renderFoldDirectionControls();
      render3d().catch(error => {
        statusEl.textContent = "3D preview failed to update.";
        console.error(error);
      });
    }
  });
}

function stopAutoAssemble(resetOrbit = true) {
  if (state.autoAssembleRaf) {
    cancelAnimationFrame(state.autoAssembleRaf);
    state.autoAssembleRaf = 0;
  }
  state.autoAssemble = false;
  state.autoAssembleCameraStart = null;
  if (resetOrbit) {
    state.autoAssembleOrbitDeg = 0;
  }
  if (autoAssembleModelEl) {
    autoAssembleModelEl.checked = false;
  }
}

function startAutoAssemble() {
  stopAutoAssemble(false);
  state.autoAssemble = true;
  if (autoAssembleModelEl) {
    autoAssembleModelEl.checked = true;
  }
  const startProgress = state.fold;
  state.autoAssembleStartProgress = startProgress;
  const startOrbit = state.autoAssembleOrbitDeg;
  const durationMs = 2800;
  const assembleOrbitSweepDeg = 28;
  const continuousOrbitSpeedDegPerSecond = 12;
  get3dPreviewSnapshot(modelEl).then(snapshot => {
    if (!state.autoAssemble) {
      return;
    }
    state.autoAssembleCameraStart = snapshot;
    const startedAt = performance.now();
    let previousNow = startedAt;

    const step = now => {
      if (!state.autoAssemble) {
        state.autoAssembleRaf = 0;
        return;
      }
      const progress = Math.min(1, (now - startedAt) / durationMs);
      if (progress < 1) {
        const eased = easeInOutCubic(progress);
        state.fold = roundValue(startProgress + ((1 - startProgress) * eased));
        state.autoAssembleOrbitDeg = roundValue(startOrbit + ((assembleOrbitSweepDeg - startOrbit) * eased));
      } else {
        const deltaSeconds = Math.max(0, (now - previousNow) / 1000);
        state.fold = 1;
        state.autoAssembleOrbitDeg = roundValue(state.autoAssembleOrbitDeg + (continuousOrbitSpeedDegPerSecond * deltaSeconds));
      }
      previousNow = now;
      render3d().catch(error => {
        statusEl.textContent = "3D preview failed to update.";
        console.error(error);
      });
      state.autoAssembleRaf = requestAnimationFrame(step);
    };

    state.autoAssembleRaf = requestAnimationFrame(step);
  }).catch(error => {
    state.autoAssembleCameraStart = null;
    console.error(error);
  });
}

function captureAssembledDefault() {
  const refinement = getActiveRefinement();
  if (!refinement) {
    return;
  }
  get3dPreviewSnapshot(modelEl).then(snapshot => {
    const assembledState = getAssemblyStateForProgress(1);
    refinement.assembledDefaults = {
      cameraPosition: snapshot.cameraPosition,
      cameraTarget: snapshot.cameraTarget,
      modelCenter: snapshot.modelCenter,
      cameraOffset: snapshot.cameraOffset,
      targetOffset: snapshot.targetOffset,
      viewName: snapshot.viewName,
      modelRotationSteps: assembledState.modelRotationSteps,
      objectMoveSteps: assembledState.objectMoveSteps
    };
    syncStructuredSvgOutput();
    statusEl.textContent = "Captured assembled camera defaults for the current assembled step state.";
    render3d().catch(error => {
      statusEl.textContent = "3D preview failed to update.";
      console.error(error);
    });
  }).catch(error => {
    statusEl.textContent = "Capture of assembled defaults failed.";
    console.error(error);
  });
}

function setTemplate(templateId) {
  state.templateId = templateId;
  ensureSupportedPreviewSide();
  state.assemblySteps = [];
  state.foldLocks = {};
  state.selectedPanelId = "";
  state.selectedFoldId = "";
  state.selectedObjectId = "";
  state.fold = getDefaultFold(templateId);
  stopAutoAssemble();
  applyTemplateDefaults(templateId);
  render().catch(error => {
    statusEl.textContent = "Preview failed to update.";
    console.error(error);
  });
}

function buildDownloadName(params) {
  const fieldGroups = getTemplateFieldGroups(state.templateId);
  const dimensionValues = fieldGroups.primary
    .map(field => params[field.key])
    .filter(value => Number.isFinite(value))
    .map(value => `${roundValue(value)}mm`);
  return `${state.templateId}${dimensionValues.length ? `-${dimensionValues.join("x")}` : ""}.svg`;
}

async function getSvgMarkupForExport({ showPanels, showLabels, preferCached = false } = {}) {
  const params = readParams();
  const refinement = getActiveRefinement();
  ensureSupportedPreviewSide();
  if (preferCached && state.lastSvgMarkup) {
    return state.lastSvgMarkup;
  }
  return buildSvgMarkup({
    templateId: state.templateId,
    params,
    showPanels: showPanels ?? state.showPanels,
    showLabels: showLabels ?? state.showLabels,
    refinement,
    previewSide: state.previewSide
  });
}

function parseCssRgba(value) {
  const match = String(value || "").trim().match(/^rgba?\(\s*([.\d]+)[,\s]+([.\d]+)[,\s]+([.\d]+)(?:[,\s/]+([.\d]+))?\s*\)$/i);
  if (!match) {
    return null;
  }
  return {
    color: `rgb(${Math.round(Number(match[1]))}, ${Math.round(Number(match[2]))}, ${Math.round(Number(match[3]))})`,
    alpha: match[4] === undefined ? 1 : clamp(Number(match[4]), 0, 1)
  };
}

function removeInternalSvgExportNodes(svg) {
  svg.querySelectorAll("metadata, script").forEach(node => node.remove());
  svg.querySelectorAll("[visibility='hidden'], [display='none']").forEach(node => {
    if (node.tagName.toLowerCase() !== "defs") {
      node.remove();
    }
  });
}

function syncExportPanelGeometry(svg) {
  const panelsById = new Map(
    Array.from(svg.querySelectorAll('path[id^="panel-"]'))
      .map(panel => [panel.id.replace(/^panel-/, ""), panel])
  );

  for (const previewPath of svg.querySelectorAll('path[id^="preview-"]')) {
    const panelId = previewPath.id.replace(/^preview-/, "");
    const panelPath = panelsById.get(panelId);
    if (!panelPath) {
      continue;
    }
    previewPath.setAttribute("d", panelPath.getAttribute("d") || "");
    if (panelPath.hasAttribute("fill-rule")) {
      previewPath.setAttribute("fill-rule", panelPath.getAttribute("fill-rule"));
    } else {
      previewPath.removeAttribute("fill-rule");
    }
  }

  for (const clipPath of svg.querySelectorAll('clipPath[id^="clip-"]')) {
    const panelId = clipPath.id.replace(/^clip-/, "");
    const panelPath = panelsById.get(panelId);
    const clipShape = clipPath.querySelector("path");
    if (!panelPath || !clipShape) {
      continue;
    }
    clipShape.setAttribute("d", panelPath.getAttribute("d") || "");
    if (panelPath.hasAttribute("fill-rule")) {
      clipShape.setAttribute("clip-rule", panelPath.getAttribute("fill-rule"));
    } else {
      clipShape.removeAttribute("clip-rule");
    }
  }

  const modelClip = svg.querySelector("#clip-model-outline");
  if (modelClip && panelsById.size) {
    modelClip.replaceChildren(...Array.from(panelsById.values()).map(panelPath => {
      const clipShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
      clipShape.setAttribute("d", panelPath.getAttribute("d") || "");
      if (panelPath.hasAttribute("fill-rule")) {
        clipShape.setAttribute("clip-rule", panelPath.getAttribute("fill-rule"));
      }
      return clipShape;
    }));
  }
}

function removeEmptyClippedExportGroups(svg) {
  const hasVisibleExportContent = node => Boolean(node.querySelector("path, image, text, rect, circle, ellipse, polygon, polyline, line"));
  Array.from(svg.querySelectorAll("[clip-path]")).forEach(node => {
    if (!hasVisibleExportContent(node)) {
      node.remove();
    }
  });
  svg.querySelectorAll("#labels[clip-path]").forEach(node => node.removeAttribute("clip-path"));
}

function removeEditorOnlyExportNodes(svg) {
  svg.querySelectorAll([
    "[data-artwork-transform-overlay]",
    "[data-artwork-handle]",
    ".artwork-transform-overlay",
    ".artwork-transform-frame",
    ".artwork-transform-stem",
    ".artwork-transform-handle",
    ".artwork-doodle-cursor",
    "[data-live-text-box-frame]",
    "[data-live-image-transform-overlay]"
  ].join(",")).forEach(node => node.remove());
}

function hideFoldLinesForExport(svg) {
  const foldNodes = svg.querySelectorAll('[data-box-role="fold-line"], #fold-lines path, #fold-lines line, #fold-lines polyline');
  foldNodes.forEach(node => {
    node.setAttribute("fill", "none");
    node.setAttribute("stroke-opacity", "0");
    node.setAttribute("opacity", "0");
    node.removeAttribute("visibility");
    node.removeAttribute("display");
  });
  const foldGroup = svg.querySelector("#fold-lines");
  if (foldGroup) {
    foldGroup.setAttribute("opacity", "0");
    foldGroup.removeAttribute("visibility");
    foldGroup.removeAttribute("display");
  }
}

function inlineComputedSvgPresentation(sourceSvg, exportSvg) {
  const sourceNodes = [sourceSvg, ...sourceSvg.querySelectorAll("*")];
  const exportNodes = [exportSvg, ...exportSvg.querySelectorAll("*")];
  const presentationAttributes = [
    "fill",
    "fill-opacity",
    "stroke",
    "stroke-opacity",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-dasharray",
    "opacity",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "text-anchor",
    "dominant-baseline"
  ];

  sourceNodes.forEach((sourceNode, index) => {
    const exportNode = exportNodes[index];
    if (!exportNode || sourceNode.nodeType !== Node.ELEMENT_NODE || exportNode.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    const tagName = sourceNode.tagName.toLowerCase();
    if (["defs", "style", "metadata", "clipPath", "linearGradient", "stop"].includes(tagName)) {
      return;
    }

    const computed = getComputedStyle(sourceNode);
    if (computed.display === "none" || computed.visibility === "hidden") {
      exportNode.setAttribute("data-export-hidden", "true");
      return;
    }

    for (const attr of presentationAttributes) {
      const value = computed.getPropertyValue(attr);
      if (value && value !== "normal" && value !== "auto") {
        exportNode.setAttribute(attr, value);
      }
    }

    const parsedFill = parseCssRgba(exportNode.getAttribute("fill"));
    if (parsedFill) {
      const existingFillOpacity = Number.parseFloat(exportNode.getAttribute("fill-opacity") || "1");
      exportNode.setAttribute("fill", parsedFill.color);
      exportNode.setAttribute("fill-opacity", String(roundValue(clamp((Number.isFinite(existingFillOpacity) ? existingFillOpacity : 1) * parsedFill.alpha, 0, 1))));
    }

    const parsedStroke = parseCssRgba(exportNode.getAttribute("stroke"));
    if (parsedStroke) {
      const existingStrokeOpacity = Number.parseFloat(exportNode.getAttribute("stroke-opacity") || "1");
      exportNode.setAttribute("stroke", parsedStroke.color);
      exportNode.setAttribute("stroke-opacity", String(roundValue(clamp((Number.isFinite(existingStrokeOpacity) ? existingStrokeOpacity : 1) * parsedStroke.alpha, 0, 1))));
    }
  });

  exportSvg.querySelectorAll("[data-export-hidden='true']").forEach(node => node.remove());
}

function simplifySvgForIllustrator(svg) {
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.removeAttribute("style");
  svg.removeAttribute("data-preview-side");
  svg.querySelectorAll("[pointer-events]").forEach(node => node.removeAttribute("pointer-events"));
  svg.querySelectorAll("[vector-effect]").forEach(node => node.removeAttribute("vector-effect"));
  svg.querySelectorAll("*").forEach(node => {
    node.removeAttribute("style");
    for (const attr of Array.from(node.attributes)) {
      if (attr.name.startsWith("data-") || attr.name === "class") {
        node.removeAttribute(attr.name);
      }
    }
  });

  const defs = svg.querySelector("defs");
  if (defs && !defs.querySelector("clipPath, linearGradient, radialGradient, pattern, marker, filter, style")) {
    defs.remove();
  }
}

function getPreviewSvgMarkupForExport() {
  const sourceSvg = previewEl.querySelector("svg");
  if (!sourceSvg) {
    return "";
  }
  const exportSvg = sourceSvg.cloneNode(true);
  syncExportPanelGeometry(exportSvg);
  inlineComputedSvgPresentation(sourceSvg, exportSvg);
  removeEditorOnlyExportNodes(exportSvg);
  hideFoldLinesForExport(exportSvg);
  removeEmptyClippedExportGroups(exportSvg);
  removeInternalSvgExportNodes(exportSvg);
  simplifySvgForIllustrator(exportSvg);
  return new XMLSerializer().serializeToString(exportSvg);
}

async function downloadMarkup(markup, filename) {
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadSvg() {
  const markup = getPreviewSvgMarkupForExport() || await getSvgMarkupForExport({ preferCached: true });
  await downloadMarkup(markup, buildDownloadName(readParams()));
  statusEl.textContent = "SVG downloaded.";
}

async function copySvg() {
  try {
    const markup = getPreviewSvgMarkupForExport() || await getSvgMarkupForExport({ preferCached: true });
    await navigator.clipboard.writeText(markup);
    statusEl.textContent = "SVG copied to clipboard.";
  } catch (error) {
    statusEl.textContent = "Copy failed. Use Download SVG instead.";
  }
}

templatePicker.addEventListener("click", event => {
  const button = event.target.closest("button[data-template-family-id]");
  if (!button) return;
  const family = TEMPLATE_FAMILIES.find(entry => entry.id === button.dataset.templateFamilyId);
  if (!family || !family.templates.length) return;
  setTemplate(family.templates[0].id);
});

templateVariantPickerEl.addEventListener("change", event => {
  const value = String(event.target.value || "").trim();
  if (!value || value === state.templateId) return;
  setTemplate(value);
});

previewSideSwitchEl.addEventListener("click", event => {
  const button = event.target.closest("button[data-preview-side]");
  if (!button) return;
  const requestedSide = button.dataset.previewSide === "inside" ? "inside" : "outside";
  if (!supportsArtworkSide(requestedSide)) {
    return;
  }
  state.previewSide = requestedSide;
  renderPreviewFromCurrentRefinement().catch(error => {
    statusEl.textContent = "Preview failed to update.";
    console.error(error);
  });
});

if (toggleLabelLayoutWorkbenchEl) {
  toggleLabelLayoutWorkbenchEl.addEventListener("click", () => {
    state.labelLayoutWorkbenchCollapsed = !state.labelLayoutWorkbenchCollapsed;
    syncWorkbenchPanelVisibility();
  });
}

if (toggleFoldPlanPanelEl) {
  toggleFoldPlanPanelEl.addEventListener("click", () => {
    state.foldPlanCollapsed = !state.foldPlanCollapsed;
    syncWorkbenchPanelVisibility();
  });
}

previewZoomOutEl.addEventListener("click", () => {
  state.previewZoom = Math.max(0.25, roundValue(state.previewZoom - 0.1));
  applyPreviewZoomChange();
});

previewZoomResetEl.addEventListener("click", () => {
  state.previewZoom = 1;
  applyPreviewZoomChange();
});

previewZoomInEl.addEventListener("click", () => {
  state.previewZoom = Math.min(4, roundValue(state.previewZoom + 0.1));
  applyPreviewZoomChange();
});

document.querySelector(".controls").addEventListener("input", event => {
  const input = event.target.closest("input[data-param-key]");
  const globalInput = event.target.closest("input[data-global-param-key]");
  if (!input && !globalInput) return;
  if ((input && input.dataset.paramKey === "T") || (globalInput && globalInput.dataset.globalParamKey === "T")) {
    syncMaterialPresetFromThickness();
  }
  render().catch(error => {
    statusEl.textContent = "Preview failed to update.";
    console.error(error);
  });
});

for (const radio of unitRadios) {
  radio.addEventListener("change", event => {
    const oldValues = Object.fromEntries(
      getTemplateFields().map(field => {
        const input = getFieldInput(field.key);
        return [field.key, input ? parseFieldValue(field, input.value) : 0];
      })
    );
    const oldThickness = inputToMm(materialThicknessEl.value);
    state.unit = event.target.value;
    for (const field of getTemplateFields()) {
      const input = getFieldInput(field.key);
      if (!input) continue;
      input.value = formatFieldValue(field, oldValues[field.key]);
    }
    materialThicknessEl.value = formatInputValue(oldThickness);
    render().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
  });
}

$("showPanels").addEventListener("change", event => {
  state.showPanels = event.target.checked;
  render().catch(error => {
    statusEl.textContent = "Preview failed to update.";
    console.error(error);
  });
});

$("showLabels").addEventListener("change", event => {
  state.showLabels = event.target.checked;
  render().catch(error => {
    statusEl.textContent = "Preview failed to update.";
    console.error(error);
  });
});

showModelLabelsEl.addEventListener("change", event => {
  state.showModelLabels = event.target.checked;
  render3d().catch(error => {
    statusEl.textContent = "3D preview failed to update.";
    console.error(error);
  });
});

$("downloadSvg").addEventListener("click", downloadSvg);
$("copySvg").addEventListener("click", copySvg);
materialPresetEl.addEventListener("change", event => {
  const preset = event.target.value;
  if (preset !== "custom") {
    materialThicknessEl.value = formatInputValue(MATERIAL_PRESETS[preset]);
  }
  render().catch(error => {
    statusEl.textContent = "Preview failed to update.";
    console.error(error);
  });
});
paperStockEl.addEventListener("change", event => {
  state.paperStock = event.target.value;
  render3d().catch(error => {
    statusEl.textContent = "3D preview failed to update.";
    console.error(error);
  });
});
if (textureScaleEl) {
  textureScaleEl.addEventListener("input", event => {
    state.textureScale = clamp(Number.parseFloat(event.target.value) || 1, 0.25, 4);
    render3d().catch(error => {
      statusEl.textContent = "3D preview failed to update.";
      console.error(error);
    });
  });
}
if (assemblyPlanControlsEl) {
assemblyPlanControlsEl.addEventListener("input", event => {
  const input = event.target.closest("[data-step-id][data-step-key]");
  if (!input) {
    return;
  }
  stopAutoAssemble();
  const rawValue = input.dataset.stepKey === "syncWithPrevious" ? input.checked : input.value;
  const step = updateAssemblyStepValue(input.dataset.stepId, input.dataset.stepKey, rawValue);
  if (!step) {
    return;
  }
  for (const peer of assemblyPlanControlsEl.querySelectorAll(`[data-step-id="${step.id}"][data-step-key="${input.dataset.stepKey}"]`)) {
    if (peer !== input) {
      const nextValue = step[input.dataset.stepKey];
      if (peer instanceof HTMLInputElement && peer.type === "checkbox") {
        peer.checked = Boolean(nextValue);
      } else if ("value" in peer) {
        peer.value = typeof nextValue === "number" ? String(roundValue(nextValue)) : String(nextValue);
      }
    }
  }
  syncStructuredSvgOutput();
  render3d().catch(error => {
    statusEl.textContent = "3D preview failed to update.";
    console.error(error);
  });
});

assemblyPlanControlsEl.addEventListener("change", event => {
  const input = event.target.closest("[data-step-id][data-step-key]");
  if (!input) {
    return;
  }
  stopAutoAssemble();
  const rawValue = input.dataset.stepKey === "syncWithPrevious" ? input.checked : input.value;
  updateAssemblyStepValue(input.dataset.stepId, input.dataset.stepKey, rawValue);
  renderFoldDirectionControls();
  render3d().catch(error => {
    statusEl.textContent = "3D preview failed to update.";
    console.error(error);
  });
});

assemblyPlanControlsEl.addEventListener("click", event => {
  const interactive = event.target.closest("button, select, input");
  if (!interactive) {
    const item = event.target.closest("[data-select-fold]");
    if (item) {
      selectFold(item.dataset.selectFold);
      renderFoldDirectionControls();
      render3d().catch(error => {
        statusEl.textContent = "3D preview failed to update.";
        console.error(error);
      });
    }
    return;
  }

  const deleteButton = event.target.closest("button[data-delete-step]");
  if (deleteButton) {
    state.assemblySteps = state.assemblySteps.filter(step => step.id !== deleteButton.dataset.deleteStep);
    if (state.assemblySteps[0]) {
      state.assemblySteps[0].syncWithPrevious = false;
    }
    syncAssemblyStepsToRefinement();
    renderFoldDirectionControls();
    syncStructuredSvgOutput();
    render3d().catch(error => {
      statusEl.textContent = "3D preview failed to update.";
      console.error(error);
    });
    return;
  }

  const lockButton = event.target.closest("button[data-toggle-fold-lock]");
  if (lockButton) {
    stopAutoAssemble();
    const foldId = lockButton.dataset.toggleFoldLock || "";
    if (foldId) {
      state.foldLocks[foldId] = !state.foldLocks[foldId];
      if (!state.foldLocks[foldId]) {
        delete state.foldLocks[foldId];
      }
      renderFoldDirectionControls();
      render3d().catch(error => {
        statusEl.textContent = "3D preview failed to update.";
        console.error(error);
      });
    }
    return;
  }

  const button = event.target.closest("button[data-move-step]");
  if (!button) return;
  const stepId = button.dataset.moveStep;
  const currentIndex = state.assemblySteps.findIndex(step => step.id === stepId);
  if (currentIndex < 0) return;

  const targetIndex = button.dataset.direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= state.assemblySteps.length) return;

  const nextSteps = [...state.assemblySteps];
  const [movedStep] = nextSteps.splice(currentIndex, 1);
  nextSteps.splice(targetIndex, 0, movedStep);
  if (nextSteps[0]) {
    nextSteps[0].syncWithPrevious = false;
  }
  state.assemblySteps = nextSteps;
  syncAssemblyStepsToRefinement();
  renderFoldDirectionControls();
  syncStructuredSvgOutput();
  render3d().catch(error => {
    statusEl.textContent = "3D preview failed to update.";
    console.error(error);
  });
});
}

labelLayoutWorkbenchEl.addEventListener("input", event => {
  const refinement = getActiveRefinement();
  if (!refinement) return;

  const labelInput = event.target.closest("[data-label-layout-key]");
  if (labelInput) {
    ensureSvgLabelsVisible();
    const panel = getSelectedLabelPanel();
    if (!panel) return;
    const layout = ensureLabelLayout(panel);
    if (!layout) return;
    const key = labelInput.dataset.labelLayoutKey;
    if (["text", "fontFamily", "fontWeight", "fontStyle", "fill"].includes(key)) {
      layout[key] = labelInput.value;
      if (key === "fontFamily") {
        ensureFontOption(layout[key]);
      }
    } else {
      const nextValue = Number.parseFloat(labelInput.value);
      if (!Number.isFinite(nextValue)) {
        return;
      }
      layout[key] = nextValue;
    }
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
    return;
  }

  const panelInput = event.target.closest("[data-refine-panel]");
  if (panelInput) {
    const panelId = panelInput.dataset.refinePanel;
    const key = panelInput.dataset.refineKey;
    if (!refinement.panels[panelId]) return;
    const panelConfig = refinement.panels[panelId];
    const previousVisibleName = getPanelRefinementName(panelConfig, panelId);
    if (key === "displayName") {
      syncPanelDisplayName(refinement, panelId, panelInput.value, previousVisibleName);
    } else {
      refinement.panels[panelId][key] = panelInput.type === "checkbox" ? panelInput.checked : panelInput.value;
    }
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
    return;
  }

  const artworkInput = event.target.closest("[data-artwork-key]");
  if (artworkInput) {
    const panel = getSelectedLabelPanel();
    if (!panel) return;
    const artwork = ensureArtworkConfig(panel);
    if (!artwork) return;
    const key = artworkInput.dataset.artworkKey;
    artwork[key] = artworkInput.type === "color" ? artworkInput.value : Number.parseFloat(artworkInput.value);
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
    return;
  }

  const artworkImageInput = event.target.closest("[data-artwork-image-key]");
  if (artworkImageInput) {
    const panel = getSelectedLabelPanel();
    if (!panel) return;
    const artwork = ensureArtworkConfig(panel);
    if (!artwork) return;
    let image = getSelectedArtworkImage(artwork);
    if (!image) {
      image = {
        id: makeArtworkLayerId("image"),
        name: "Image",
        dataUrl: "",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        opacity: 1,
        rotationDeg: 0,
        preserveAspectRatio: "xMidYMid meet"
      };
      artwork.images = [...syncArtworkImages(artwork), image];
      artwork.activeImageId = image.id;
      syncArtworkImages(artwork);
    }
    const key = artworkImageInput.dataset.artworkImageKey;
    image[key] = Number.parseFloat(artworkImageInput.value) || 0;
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
  }
});

function handleTemplateFeatureSettingInput(event) {
  const refinement = getActiveRefinement();
  if (!refinement) return;

  const templateSettingInput = event.target.closest("[data-template-setting-group][data-template-setting-key]");
  if (templateSettingInput) {
    const geometry = state.lastGeometry;
    const settingsKey = getTemplateFeatureSettingsKey(geometry);
    if (!settingsKey) {
      return;
    }
    refinement.templateSettings = mergePlainDataWithDefaults(
      refinement.templateSettings,
      getTemplateRefinementDefaults(state.templateId, geometry)
    );
    refinement.templateSettings[settingsKey] = refinement.templateSettings[settingsKey] || {};
    refinement.templateSettings[settingsKey][templateSettingInput.dataset.templateSettingGroup] =
      refinement.templateSettings[settingsKey][templateSettingInput.dataset.templateSettingGroup] || {};
    const group = refinement.templateSettings[settingsKey][templateSettingInput.dataset.templateSettingGroup];
    group.userEdited = true;
    const key = templateSettingInput.dataset.templateSettingKey;
    if (templateSettingInput.type === "checkbox") {
      group[key] = templateSettingInput.checked;
    } else {
      const nextValue = Number.parseFloat(templateSettingInput.value);
      if (!Number.isFinite(nextValue)) {
        return;
      }
      group[key] = nextValue;
    }
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
  }
}

if (templateOptionalGroupEl) {
  templateOptionalGroupEl.addEventListener("input", handleTemplateFeatureSettingInput);
  templateOptionalGroupEl.addEventListener("change", handleTemplateFeatureSettingInput);
}

templateRefinementControlsEl.addEventListener("input", event => {
  const refinement = getActiveRefinement();
  if (!refinement) return;

  const labelInput = event.target.closest("[data-label-layout-key]");
  if (labelInput) {
    ensureSvgLabelsVisible();
    const panel = getSelectedLabelPanel();
    if (!panel) return;
    const layout = ensureLabelLayout(panel);
    if (!layout) return;
    const key = labelInput.dataset.labelLayoutKey;
    if (["text", "fontFamily", "fontWeight", "fontStyle", "fill"].includes(key)) {
      layout[key] = labelInput.value;
      if (key === "fontFamily") {
        ensureFontOption(layout[key]);
      }
    } else {
      const nextValue = Number.parseFloat(labelInput.value);
      if (!Number.isFinite(nextValue)) {
        return;
      }
      layout[key] = nextValue;
    }
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
    return;
  }

  const artworkInput = event.target.closest("[data-artwork-key]");
  if (artworkInput) {
    const panel = getSelectedLabelPanel();
    if (!panel) return;
    const artwork = ensureArtworkConfig(panel);
    if (!artwork) return;
    const key = artworkInput.dataset.artworkKey;
    artwork[key] = artworkInput.type === "color" ? artworkInput.value : Number.parseFloat(artworkInput.value);
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
    return;
  }

  const artworkImageInput = event.target.closest("[data-artwork-image-key]");
  if (artworkImageInput) {
    const panel = getSelectedLabelPanel();
    if (!panel) return;
    const artwork = ensureArtworkConfig(panel);
    if (!artwork) return;
    let image = getSelectedArtworkImage(artwork);
    if (!image) {
      image = {
        id: makeArtworkLayerId("image"),
        name: "Image",
        dataUrl: "",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        opacity: 1,
        rotationDeg: 0,
        preserveAspectRatio: "xMidYMid meet"
      };
      artwork.images = [...syncArtworkImages(artwork), image];
      artwork.activeImageId = image.id;
      syncArtworkImages(artwork);
    }
    const key = artworkImageInput.dataset.artworkImageKey;
    image[key] = Number.parseFloat(artworkImageInput.value) || 0;
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
    return;
  }

  const panelInput = event.target.closest("[data-refine-panel]");
  if (panelInput) {
    const panelId = panelInput.dataset.refinePanel;
    const key = panelInput.dataset.refineKey;
    if (!refinement.panels[panelId]) return;
    const panelConfig = refinement.panels[panelId];
    const previousVisibleName = getPanelRefinementName(panelConfig, panelId);
    if (key === "displayName") {
      syncPanelDisplayName(refinement, panelId, panelInput.value, previousVisibleName);
    } else {
      refinement.panels[panelId][key] = panelInput.type === "checkbox" ? panelInput.checked : panelInput.value;
    }
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
    return;
  }

  const rootInput = event.target.closest("[data-refine-root]");
  if (rootInput) {
    refinement[rootInput.dataset.refineRoot] = rootInput.value;
    render().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
  }
});

labelLayoutWorkbenchEl.addEventListener("change", event => {
  const floorPanelToggle = event.target.closest("[data-floor-panel-toggle]");
  if (floorPanelToggle) {
    const refinement = getActiveRefinement();
    if (!refinement) return;
    const panelId = floorPanelToggle.dataset.floorPanelToggle;
    const panel = state.lastGeometry && state.lastGeometry.panels
      ? state.lastGeometry.panels.find(item => item.id === panelId) || null
      : null;
    if (floorPanelToggle.checked) {
      if (panel && panel.objectId) {
        refinement.floorPanelsByObject = refinement.floorPanelsByObject || {};
        refinement.floorPanelsByObject[panel.objectId] = panelId;
        if ((refinement.selectedObjectId || "") === panel.objectId || !refinement.floorPanel) {
          refinement.floorPanel = panelId;
        }
      } else {
        refinement.floorPanel = panelId;
      }
    }
    renderTemplateRefinementControls();
    render().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
    return;
  }

  const labelPanelSelect = event.target.closest("[data-label-panel-select]");
  if (labelPanelSelect) {
    ensureSvgLabelsVisible();
    selectPanel(labelPanelSelect.value);
    renderTemplateRefinementControls();
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
    return;
  }

  const objectPanelSelect = event.target.closest("[data-object-panel-select]");
  if (objectPanelSelect) {
    const refinement = getActiveRefinement();
    if (!refinement || !state.lastGeometry) return;
    refinement.selectedObjectId = objectPanelSelect.value;
    const objectPanels = state.lastGeometry.panels.filter(panel => (panel.objectId || "__default__") === objectPanelSelect.value);
    if (objectPanels.length) {
      selectPanel(objectPanels.some(panel => panel.id === state.selectedPanelId) ? state.selectedPanelId : objectPanels[0].id);
    }
    renderTemplateRefinementControls();
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
  }
});

templateRefinementControlsEl.addEventListener("change", event => {
  const labelPanelSelect = event.target.closest("[data-label-panel-select]");
  if (labelPanelSelect) {
    ensureSvgLabelsVisible();
    selectPanel(labelPanelSelect.value);
    renderTemplateRefinementControls();
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
    return;
  }

  const assembledFrontPanelSelect = event.target.closest("[data-assembled-front-panel-select]");
  if (assembledFrontPanelSelect) {
    const refinement = getActiveRefinement();
    if (!refinement) return;
    refinement.assembledFrontPanel = assembledFrontPanelSelect.value;
    syncStructuredSvgOutput();
    renderTemplateRefinementControls();
    render3d().catch(error => {
      statusEl.textContent = "3D preview failed to update.";
      console.error(error);
    });
  }
});

labelLayoutWorkbenchEl.addEventListener("click", async event => {
  const nudgeButton = event.target.closest("[data-label-nudge]");
  const resetButton = event.target.closest("[data-label-reset]");

  if (!nudgeButton && !resetButton) {
    return;
  }

  ensureSvgLabelsVisible();
  const panel = getSelectedLabelPanel();
  const layout = ensureLabelLayout(panel);
  if (!panel || !layout) return;

  if (resetButton) {
    const [x, y] = getPanelDefaultLabelPosition(panel);
    layout.text = "";
    layout.x = roundValue(x);
    layout.y = roundValue(y);
    layout.fontSize = getDefaultLabelFontSize();
    layout.rotationDeg = 0;
    layout.maxWidth = 0;
    layout.lineHeight = 1.2;
    layout.fontFamily = "Arial, sans-serif";
    layout.fontWeight = "700";
    layout.fontStyle = "normal";
    layout.fill = "#333333";
  } else {
    const step = event.shiftKey ? 10 : 1;
    const direction = nudgeButton.dataset.labelNudge;
    if (direction === "left") layout.x = roundValue((Number(layout.x) || 0) - step);
    if (direction === "right") layout.x = roundValue((Number(layout.x) || 0) + step);
    if (direction === "up") layout.y = roundValue((Number(layout.y) || 0) - step);
    if (direction === "down") layout.y = roundValue((Number(layout.y) || 0) + step);
  }

  renderTemplateRefinementControls();
  renderPreviewFromCurrentRefinement().catch(error => {
    statusEl.textContent = "Preview failed to update.";
    console.error(error);
  });
});

labelLayoutWorkbenchEl.addEventListener("click", event => {
  const uploadFontButton = event.target.closest("[data-upload-font-file]");
  if (uploadFontButton) {
    if (!fontFileInputEl) {
      return;
    }
    fontFileInputEl.click();
    return;
  }

  const uploadButton = event.target.closest("[data-upload-artwork-image]");
  if (uploadButton) {
    if (!artworkImageInputEl) {
      return;
    }
    artworkImageInputEl.click();
    return;
  }

  const clearImageButton = event.target.closest("[data-clear-artwork-image]");
  if (clearImageButton) {
    const panel = getSelectedLabelPanel();
    const artwork = ensureArtworkConfig(panel);
    if (!artwork) {
      return;
    }
    artwork.images = [];
    artwork.activeImageId = "";
    artwork.image = null;
    renderTemplateRefinementControls();
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
    return;
  }

  const toggleDoodleButton = event.target.closest("[data-toggle-doodle-mode]");
  if (toggleDoodleButton) {
    state.doodleMode = toggleDoodleButton.dataset.toggleDoodleMode === "on";
    state.editMode = state.doodleMode || state.editMode;
    state.editTool = state.doodleMode ? "doodle" : (state.editTool === "doodle" ? "select" : state.editTool);
    renderTemplateRefinementControls();
    renderPreviewEditOverlay();
    statusEl.textContent = state.doodleMode
      ? "Doodle mode active: drag on the selected panel in the SVG preview."
      : "Doodle mode stopped.";
    return;
  }

  const clearDoodlesButton = event.target.closest("[data-clear-doodles]");
  if (clearDoodlesButton) {
    const panel = getSelectedLabelPanel();
    const artwork = ensureArtworkConfig(panel);
    if (!artwork) {
      return;
    }
    artwork.doodles = [];
    renderPreviewFromCurrentRefinement().catch(error => {
      statusEl.textContent = "Preview failed to update.";
      console.error(error);
    });
  }
});

if (previewEditOverlayEl) {
  previewEditOverlayEl.addEventListener("pointerdown", event => {
    if (event.target.closest("[data-side-opacity], [data-side-brush-width], [data-side-brush-width-number], [data-side-text], [data-side-font-family]")) {
      beginArtworkHistoryCapture("overlay-input");
    }
  });

  previewEditOverlayEl.addEventListener("input", event => {
    const artwork = ensureSideArtworkConfig();
    if (!artwork || !state.editMode) {
      return;
    }
    const textInput = event.target.closest("[data-side-text]");
    if (textInput) {
      artwork.text = textInput.value;
      setActiveArtworkLayer(artwork, "text-layer");
      renderPreviewFromCurrentRefinement({ sync3d: "skip", refreshEditOverlay: false, refreshLayerOverlay: false }).catch(error => {
        statusEl.textContent = "Preview failed to update.";
        console.error(error);
      });
      return;
    }
    const fontSelect = event.target.closest("[data-side-font-family]");
    if (fontSelect) {
      artwork.fontFamily = fontSelect.value || "Arial, sans-serif";
      setActiveArtworkLayer(artwork, "text-layer");
      renderPreviewFromCurrentRefinement({ sync3d: "skip", refreshEditOverlay: false, refreshLayerOverlay: false }).catch(error => {
        statusEl.textContent = "Preview failed to update.";
        console.error(error);
      });
      return;
    }
    const opacityInput = event.target.closest("[data-side-opacity]");
    if (opacityInput) {
      const value = clamp(Number.parseFloat(opacityInput.value) || 0, 0, 1);
      const selectedLayer = getSelectedArtworkLayer(artwork);
      if (selectedLayer?.type === "text") {
        artwork.textOpacity = value;
      } else if (selectedLayer?.type === "doodle") {
        selectedLayer.doodle.opacity = value;
        artwork.doodleOpacity = value;
      } else if (["doodle", "eraser"].includes(state.editTool)) {
        artwork.doodleOpacity = value;
        updateLiveDoodlePreview();
      } else if (selectedLayer?.type === "image" && getSelectedArtworkImage(artwork)) {
        getSelectedArtworkImage(artwork).opacity = value;
      } else {
        artwork.fillOpacity = value;
      }
      renderPreviewFromCurrentRefinement({ sync3d: "skip", refreshEditOverlay: false, refreshLayerOverlay: false }).catch(error => {
        statusEl.textContent = "Preview failed to update.";
        console.error(error);
      });
      return;
    }
    const brushWidthInput = event.target.closest("[data-side-brush-width], [data-side-brush-width-number]");
    if (brushWidthInput) {
      const nextValue = clamp(Number.parseFloat(brushWidthInput.value) || 2, 1, 40);
      if (state.editTool === "eraser") {
        artwork.eraserSize = nextValue;
      } else {
        artwork.doodleStrokeWidth = nextValue;
      }
      const pairSelector = brushWidthInput.hasAttribute("data-side-brush-width")
        ? "[data-side-brush-width-number]"
        : "[data-side-brush-width]";
      const paired = previewEditOverlayEl.querySelector(pairSelector);
      if (paired && paired !== brushWidthInput) {
        paired.value = String(nextValue);
      }
      updateLiveDoodlePreview();
      updateDoodleCursorFromLastPoint();
      return;
    }
  });

  previewEditOverlayEl.addEventListener("change", event => {
    if (event.target.closest("[data-side-opacity], [data-side-brush-width], [data-side-brush-width-number], [data-side-text], [data-side-font-family]")) {
      commitArtworkHistoryCapture("overlay-input");
      renderPreviewEditOverlay();
      renderPreviewLayerOverlay();
    }
  });

  previewEditOverlayEl.addEventListener("click", event => {
    const artwork = ensureSideArtworkConfig();
    const toggle = event.target.closest("[data-edit-mode-toggle]");
    if (toggle) {
      state.editMode = toggle.dataset.editModeToggle === "on";
      if (!state.editMode) {
        cancelArtworkHistoryCapture();
        state.editTool = "select";
        state.doodleMode = false;
      }
      renderTemplateRefinementControls();
      renderPreviewEditOverlay();
      statusEl.textContent = state.editMode ? "Edit mode enabled." : "Edit mode disabled.";
      return;
    }
    const toolButton = event.target.closest("[data-edit-tool]");
    if (toolButton && state.editMode) {
      state.editTool = toolButton.dataset.editTool || "select";
      state.doodleMode = state.editTool === "doodle";
      if (state.editTool === "move-text" && artwork) {
        setActiveArtworkLayer(artwork, "text-layer");
      }
      if (state.editTool === "move-image" && artwork && getSelectedArtworkImage(artwork)) {
        setActiveArtworkLayer(artwork, getSelectedArtworkImage(artwork)?.id || "");
      }
      renderTemplateRefinementControls();
      renderPreviewEditOverlay();
      if (state.editTool === "move-text") {
        requestAnimationFrame(() => renderInlineTextEditor({ focus: true }));
      }
      return;
    }
    const colorButton = event.target.closest("[data-side-color]");
    if (colorButton && state.editMode && artwork) {
      const color = colorButton.dataset.sideColor || DEFAULT_ARTWORK_DOODLE_COLOR;
      syncArtworkSwatchSelection(color);
      applyArtworkSwatchColor(artwork, color);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const sizeButton = event.target.closest("[data-side-size]");
    if (sizeButton && state.editMode && artwork) {
      recordArtworkHistoryNow();
      const size = Number(sizeButton.dataset.sideSize) || 18;
      if (state.editTool === "doodle") {
        artwork.doodleStrokeWidth = size;
        updateLiveDoodlePreview();
        updateDoodleCursorFromLastPoint();
      } else if (state.editTool === "eraser") {
        artwork.eraserSize = size;
        updateDoodleCursorFromLastPoint();
      } else {
        artwork.fontSize = size;
      }
      renderPreviewEditOverlay();
      renderPreviewFromCurrentRefinement({ refreshEditOverlay: false }).catch(error => {
        statusEl.textContent = "Preview failed to update.";
        console.error(error);
      });
      return;
    }
    if (event.target.closest("[data-overlay-upload-image]") && state.editMode && artworkImageInputEl) {
      artworkImageInputEl.click();
      return;
    }
    if (event.target.closest("[data-overlay-upload-font]") && state.editMode && fontFileInputEl) {
      fontFileInputEl.click();
      return;
    }
    if (event.target.closest("[data-clear-side-text]") && state.editMode && artwork) {
      recordArtworkHistoryNow();
      artwork.text = "";
      artwork.activeLayerId = "text-layer";
      renderPreviewEditOverlay();
      renderPreviewFromCurrentRefinement().catch(error => {
        statusEl.textContent = "Preview failed to update.";
        console.error(error);
      });
      return;
    }
    if (event.target.closest("[data-clear-side-image]") && state.editMode && artwork) {
      recordArtworkHistoryNow();
      deleteArtworkLayerById(artwork, getSelectedArtworkImage(artwork)?.id || "");
      renderPreviewEditOverlay();
      renderPreviewFromCurrentRefinement().catch(error => {
        statusEl.textContent = "Preview failed to update.";
        console.error(error);
      });
      return;
    }
    const selectLayerButton = event.target.closest("[data-select-artwork-layer]");
    if (selectLayerButton && state.editMode && artwork) {
      const selectedLayer = setActiveArtworkLayer(artwork, String(selectLayerButton.dataset.selectArtworkLayer || ""));
      state.editTool = selectedLayer?.type === "text" ? "move-text" : (selectedLayer?.type === "doodle" ? "doodle" : "move-image");
      renderPreviewEditOverlay();
      renderPreviewFromCurrentRefinement({ refreshEditOverlay: false }).catch(error => {
        statusEl.textContent = "Preview failed to update.";
        console.error(error);
      });
      return;
    }
    const moveLayerButton = event.target.closest("[data-move-artwork-layer]");
    if (moveLayerButton && state.editMode && artwork) {
      recordArtworkHistoryNow();
      const layerId = String(moveLayerButton.dataset.moveArtworkLayer || "");
      const direction = moveLayerButton.dataset.direction === "up" ? -1 : 1;
      if (moveArtworkLayerById(artwork, layerId, direction)) {
        renderPreviewEditOverlay();
        renderPreviewLayerOverlay();
        renderPreviewFromCurrentRefinement().catch(error => {
          statusEl.textContent = "Preview failed to update.";
          console.error(error);
        });
      }
      return;
    }
    const deleteLayerButton = event.target.closest("[data-delete-artwork-layer]");
    if (deleteLayerButton && state.editMode && artwork) {
      event.preventDefault();
      event.stopPropagation();
      recordArtworkHistoryNow();
      deleteArtworkLayerById(artwork, String(deleteLayerButton.dataset.deleteArtworkLayer || ""));
      renderPreviewEditOverlay();
      renderPreviewLayerOverlay();
      renderPreviewFromCurrentRefinement().catch(error => {
        statusEl.textContent = "Preview failed to update.";
        console.error(error);
      });
      return;
    }
    if (event.target.closest("[data-clear-side-doodles]") && state.editMode && artwork) {
      recordArtworkHistoryNow();
      artwork.doodles = [];
      syncArtworkLayers(artwork);
      renderPreviewFromCurrentRefinement().catch(error => {
        statusEl.textContent = "Preview failed to update.";
        console.error(error);
      });
    }
  });
}

if (previewLayerOverlayEl) {
  previewLayerOverlayEl.addEventListener("pointerdown", event => {
    if (event.target.closest("[data-layer-opacity]")) {
      beginArtworkHistoryCapture("layer-opacity");
    }
  });

  previewLayerOverlayEl.addEventListener("input", event => {
    const artwork = ensureSideArtworkConfig();
    if (!artwork || !state.editMode) {
      return;
    }
    const opacityInput = event.target.closest("[data-layer-opacity]");
    if (opacityInput) {
      const selectedLayer = getSelectedArtworkLayer(artwork);
      if (!selectedLayer) {
        return;
      }
      const value = clamp(Number.parseFloat(opacityInput.value) || 0, 0, 1);
      if (selectedLayer.type === "text") {
        artwork.textOpacity = value;
      } else if (selectedLayer.type === "image" && selectedLayer.image) {
        selectedLayer.image.opacity = value;
      } else if (selectedLayer.type === "doodle" && selectedLayer.doodle) {
        selectedLayer.doodle.opacity = value;
      }
      renderPreviewFromCurrentRefinement({ sync3d: "skip", refreshEditOverlay: false, refreshLayerOverlay: false }).catch(error => {
        statusEl.textContent = "Preview failed to update.";
        console.error(error);
      });
    }
  });

  previewLayerOverlayEl.addEventListener("change", event => {
    if (event.target.closest("[data-layer-opacity]")) {
      commitArtworkHistoryCapture("layer-opacity");
      renderPreviewEditOverlay();
      renderPreviewLayerOverlay();
    }
  });

  previewLayerOverlayEl.addEventListener("click", event => {
    const artwork = ensureSideArtworkConfig();
    if (!artwork || !state.editMode) {
      return;
    }
    const undoButton = event.target.closest("[data-artwork-undo]");
    if (undoButton) {
      undoArtworkEdit().catch(handlePreviewRenderError);
      return;
    }
    const redoButton = event.target.closest("[data-artwork-redo]");
    if (redoButton) {
      redoArtworkEdit().catch(handlePreviewRenderError);
      return;
    }
    const selectLayerButton = event.target.closest("[data-select-artwork-layer]");
    if (selectLayerButton) {
      const selectedLayer = setActiveArtworkLayer(artwork, String(selectLayerButton.dataset.selectArtworkLayer || ""));
      state.editTool = selectedLayer?.type === "text" ? "move-text" : (selectedLayer?.type === "doodle" ? "doodle" : "move-image");
      renderPreviewEditOverlay();
      renderPreviewLayerOverlay();
      return;
    }
    const moveLayerButton = event.target.closest("[data-move-artwork-layer]");
    if (moveLayerButton) {
      recordArtworkHistoryNow();
      const layerId = String(moveLayerButton.dataset.moveArtworkLayer || "");
      const direction = moveLayerButton.dataset.direction === "up" ? -1 : 1;
      if (moveArtworkLayerById(artwork, layerId, direction)) {
        renderPreviewEditOverlay();
        renderPreviewLayerOverlay();
        renderPreviewFromCurrentRefinement().catch(error => {
          statusEl.textContent = "Preview failed to update.";
          console.error(error);
        });
      }
      return;
    }
    const deleteLayerButton = event.target.closest("[data-delete-artwork-layer]");
    if (deleteLayerButton) {
      event.preventDefault();
      event.stopPropagation();
      recordArtworkHistoryNow();
      deleteArtworkLayerById(artwork, String(deleteLayerButton.dataset.deleteArtworkLayer || ""));
      renderPreviewEditOverlay();
      renderPreviewLayerOverlay();
      renderPreviewFromCurrentRefinement().catch(error => {
        statusEl.textContent = "Preview failed to update.";
        console.error(error);
      });
    }
  });
}

templateRefinementControlsEl.addEventListener("click", async event => {
  const nudgeButton = event.target.closest("[data-label-nudge]");
  const resetButton = event.target.closest("[data-label-reset]");

  if (!nudgeButton && !resetButton) {
    return;
  }

  ensureSvgLabelsVisible();
  const panel = getSelectedLabelPanel();
  const layout = ensureLabelLayout(panel);
  if (!panel || !layout) return;

  if (resetButton) {
    const [x, y] = getPanelDefaultLabelPosition(panel);
    layout.text = "";
    layout.x = roundValue(x);
    layout.y = roundValue(y);
    layout.fontSize = getDefaultLabelFontSize();
    layout.rotationDeg = 0;
    layout.maxWidth = 0;
    layout.lineHeight = 1.2;
    layout.fontFamily = "Arial, sans-serif";
    layout.fontWeight = "700";
    layout.fontStyle = "normal";
    layout.fill = "#333333";
  } else {
    const step = event.shiftKey ? 10 : 1;
    const direction = nudgeButton.dataset.labelNudge;
    if (direction === "left") layout.x = roundValue((Number(layout.x) || 0) - step);
    if (direction === "right") layout.x = roundValue((Number(layout.x) || 0) + step);
    if (direction === "up") layout.y = roundValue((Number(layout.y) || 0) - step);
    if (direction === "down") layout.y = roundValue((Number(layout.y) || 0) + step);
  }

  renderTemplateRefinementControls();
  renderPreviewFromCurrentRefinement().catch(error => {
    statusEl.textContent = "Preview failed to update.";
    console.error(error);
  });
});

if (copyStructuredSvgOutputEl) {
  copyStructuredSvgOutputEl.addEventListener("click", async () => {
    try {
      const markup = structuredSvgOutputEl ? structuredSvgOutputEl.value : "";
      if (!markup) {
        statusEl.textContent = "No change summary available yet.";
        return;
      }
      await navigator.clipboard.writeText(markup);
      statusEl.textContent = "Change summary copied to clipboard.";
    } catch (error) {
      statusEl.textContent = "Change summary copy failed.";
    }
  });
}

if (exportPrintReadySvgEl) {
  exportPrintReadySvgEl.addEventListener("click", async () => {
    try {
      const baseName = buildDownloadName(readParams()).replace(/\.svg$/i, "");
      const markup = getPreviewSvgMarkupForExport() || await getSvgMarkupForExport({ preferCached: true });
      await downloadMarkup(markup, `${baseName}-print-ready.svg`);
      statusEl.textContent = "Print-ready SVG downloaded.";
    } catch (error) {
      statusEl.textContent = "Print-ready SVG export failed.";
      console.error(error);
    }
  });
}

if (artworkImageInputEl) {
  artworkImageInputEl.addEventListener("change", event => {
    const files = Array.from(event.target.files || []).filter(Boolean);
    if (!files.length) {
      return;
    }
    recordArtworkHistoryNow();
    let remaining = files.length;
    const completeUpload = () => {
      remaining -= 1;
      if (remaining > 0) {
        return;
      }
      state.editMode = true;
      state.editTool = "move-image";
      renderPreviewEditOverlay();
      renderPreviewFromCurrentRefinement({ sync3d: "deferred" }).catch(error => {
        handlePreviewRenderError(error);
      });
      statusEl.textContent = `${files.length} image${files.length === 1 ? "" : "s"} uploaded on the ${getArtworkSideLabel(getActiveArtworkSide())} side.`;
    };
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = loadEvent => {
        const dataUrl = String(loadEvent.target?.result || "");
        if (dataUrl) {
          seedArtworkImageForActiveSide(dataUrl, file.name.replace(/\.[^.]+$/, ""));
        }
        completeUpload();
      };
      reader.onerror = completeUpload;
      reader.readAsDataURL(file);
    }
    event.target.value = "";
  });
}

if (fontFileInputEl) {
  fontFileInputEl.addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async loadEvent => {
      try {
        const dataUrl = String(loadEvent.target?.result || "");
        const family = normalizeFontFamilyNameFromFile(file.name);
        const registeredFamily = await registerCustomFont({
          family,
          dataUrl,
          format: guessFontFormat(file.name),
          sourceName: file.name
        });
        const artwork = ensureSideArtworkConfig();
        const refinement = getActiveRefinement();
        if (registeredFamily && artwork) {
          artwork.fontFamily = registeredFamily;
        }
        if (refinement) {
          refinement.customFonts = {
            ...(refinement.customFonts || {}),
            ...state.customFonts
          };
        }
        renderPreviewEditOverlay();
        renderPreviewFromCurrentRefinement().catch(error => {
          statusEl.textContent = "Preview failed to update.";
          console.error(error);
        });
        statusEl.textContent = `Loaded font "${registeredFamily}" from ${file.name}.`;
      } catch (error) {
        statusEl.textContent = "Font upload failed.";
        console.error(error);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

let activeDoodlePoints = [];
let activeDoodlePanelId = "";

function appendDoodlePoint(point) {
  if (!point) {
    return;
  }
  const nextPoint = [Number(point.x), Number(point.y)];
  const previousPoint = activeDoodlePoints[activeDoodlePoints.length - 1];
  if (!previousPoint || Math.hypot(nextPoint[0] - previousPoint[0], nextPoint[1] - previousPoint[1]) >= 0.8) {
    activeDoodlePoints.push(nextPoint);
  }
}

previewEl.addEventListener("pointerdown", event => {
  if (state.editMode) {
    const handle = event.target.closest?.("[data-artwork-handle]");
    if (handle) {
      const point = getPointerSvgPoint(event);
      const artwork = ensureSideArtworkConfig();
      const selectedImage = artwork ? getSelectedArtworkImage(artwork) : null;
      if (!point || !artwork) {
        return;
      }
      const handleType = handle.getAttribute("data-artwork-handle");
      const overlayType = handle.closest("[data-artwork-transform-overlay]")?.getAttribute("data-artwork-transform-overlay") || "image";
      if (overlayType === "text") {
        if (beginTextTransformDrag(handleType, event)) {
          event.preventDefault();
        }
        return;
      }
      if (!selectedImage) {
        return;
      }
      if (handleType === "rotate-image") {
        activeArtworkDrag = {
          pointerId: event.pointerId,
          tool: "rotate-image"
        };
      } else if (["nw", "ne", "se", "sw"].includes(handleType)) {
        const anchorKey = handle.getAttribute("data-artwork-anchor") || "se";
        const metrics = getImageTransformMetrics(selectedImage);
        const signMap = {
          nw: { signX: -1, signY: -1 },
          ne: { signX: 1, signY: -1 },
          se: { signX: 1, signY: 1 },
          sw: { signX: -1, signY: 1 }
        };
        if (!metrics) {
          return;
        }
        activeArtworkDrag = {
          pointerId: event.pointerId,
          tool: "resize-image",
          anchor: metrics.corners[anchorKey],
          ...signMap[handleType]
        };
      } else if (handleType === "move-image") {
        activeArtworkDrag = {
          pointerId: event.pointerId,
          tool: "move-image",
          offsetX: point.x - (Number(selectedImage.x) || 0),
          offsetY: point.y - (Number(selectedImage.y) || 0)
        };
      }
      if (activeArtworkDrag) {
        beginArtworkHistoryCapture("artwork-drag");
        state.editTool = "move-image";
        setActiveArtworkLayer(artwork, selectedImage.id);
        previewEl.setPointerCapture(event.pointerId);
        queueInteractivePreviewRefresh();
        renderPreviewEditOverlay();
        event.preventDefault();
        return;
      }
    }
  }
  if (state.editMode && state.editTool === "move-text") {
    const point = getPointerSvgPoint(event);
    if (!point) {
      return;
    }
    const artwork = ensureSideArtworkConfig();
    if (!artwork) {
      return;
    }
    const hasPlacedTextBox = Number(artwork.maxWidth) > 0 || String(artwork.text || "").trim();
    if (hasPlacedTextBox) {
      setActiveArtworkLayer(artwork, "text-layer");
      renderInlineTextEditor({ focus: false });
      event.preventDefault();
      return;
    }
    activeTextBoxDrag = {
      pointerId: event.pointerId,
      start: { x: point.x, y: point.y },
      current: { x: point.x, y: point.y },
      fontSize: Number(artwork.fontSize) || 18
    };
    beginArtworkHistoryCapture("text-box");
    setActiveArtworkLayer(artwork, "text-layer");
    applyTextBoxDragToArtwork(point);
    previewEl.setPointerCapture(event.pointerId);
    queueInteractivePreviewRefresh();
    renderPreviewEditOverlay();
    event.preventDefault();
    return;
  }
  if (state.editMode && state.editTool === "move-image") {
    const point = getPointerSvgPoint(event);
    if (!point) {
      return;
    }
    const artwork = ensureSideArtworkConfig();
    if (!artwork) {
      return;
    }
    const selectedImage = getSelectedArtworkImage(artwork);
    if (!selectedImage) {
      statusEl.textContent = "Upload an image first.";
      return;
    }
    activeArtworkDrag = {
      pointerId: event.pointerId,
      tool: "move-image",
      offsetX: point.x - (Number(selectedImage.x) || 0),
      offsetY: point.y - (Number(selectedImage.y) || 0)
    };
    beginArtworkHistoryCapture("artwork-drag");
    setActiveArtworkLayer(artwork, selectedImage.id);
    updateDraggedArtworkPosition(point);
    previewEl.setPointerCapture(event.pointerId);
    queueInteractivePreviewRefresh();
    event.preventDefault();
    return;
  }
  if (!state.editMode || !["doodle", "eraser"].includes(state.editTool)) {
    return;
  }
  const point = getPointerSvgPoint(event);
  if (!point) {
    return;
  }
  updateDoodleCursor(point);
  beginArtworkHistoryCapture(state.editTool);
  if (state.editTool === "eraser") {
    activeEraserPointerId = event.pointerId;
    if (eraseDoodlesAtPoint(point)) {
      queueInteractivePreviewRefresh();
    }
    previewEl.setPointerCapture(event.pointerId);
    event.preventDefault();
    return;
  }
  activeDoodlePanelId = getActiveArtworkSide();
  activeDoodlePoints = [];
  appendDoodlePoint(point);
  updateLiveDoodlePreview();
  previewEl.setPointerCapture(event.pointerId);
  event.preventDefault();
});

previewEl.addEventListener("pointermove", event => {
  if (activeTextBoxDrag && activeTextBoxDrag.pointerId === event.pointerId) {
    const point = getPointerSvgPoint(event);
    if (!point) {
      return;
    }
    if (applyTextBoxDragToArtwork(point)) {
      queueInteractivePreviewRefresh();
    }
    event.preventDefault();
    return;
  }
  if (activeArtworkDrag && activeArtworkDrag.pointerId === event.pointerId) {
    const point = getPointerSvgPoint(event);
    if (!point) {
      return;
    }
    if (updateDraggedArtworkPosition(point)) {
      renderLiveImageTransformOverlay();
      renderInlineTextEditor();
      queueInteractivePreviewRefresh();
    }
    event.preventDefault();
    return;
  }
  const hoverPoint = getPointerSvgPoint(event);
  if (state.editMode && ["doodle", "eraser"].includes(state.editTool) && hoverPoint) {
    updateDoodleCursor(hoverPoint);
  }
  if (state.editMode && state.editTool === "eraser" && activeEraserPointerId === event.pointerId && hoverPoint) {
    if (eraseDoodlesAtPoint(hoverPoint)) {
      queueInteractivePreviewRefresh();
    }
    event.preventDefault();
    return;
  }
  if (!state.editMode || state.editTool !== "doodle" || !activeDoodlePoints.length || activeDoodlePanelId !== getActiveArtworkSide()) {
    return;
  }
  const point = hoverPoint;
  if (!point) {
    return;
  }
  appendDoodlePoint(point);
  updateLiveDoodlePreview();
});

previewEl.addEventListener("pointerup", event => {
  if (activeTextBoxDrag && activeTextBoxDrag.pointerId === event.pointerId) {
    const point = getPointerSvgPoint(event);
    if (point) {
      applyTextBoxDragToArtwork(point, true);
    }
    previewEl.releasePointerCapture(event.pointerId);
    activeTextBoxDrag = null;
    commitArtworkHistoryCapture("text-box");
    renderTemplateRefinementControls();
    renderPreviewFromCurrentRefinement({ sync3d: "deferred" }).catch(error => {
      handlePreviewRenderError(error);
    });
    requestAnimationFrame(() => renderInlineTextEditor({ focus: true }));
    return;
  }
  if (activeArtworkDrag && activeArtworkDrag.pointerId === event.pointerId) {
    const point = getPointerSvgPoint(event);
    if (point) {
      updateDraggedArtworkPosition(point);
    }
    previewEl.releasePointerCapture(event.pointerId);
    activeArtworkDrag = null;
    commitArtworkHistoryCapture("artwork-drag");
    renderTemplateRefinementControls();
    renderPreviewFromCurrentRefinement({ sync3d: "deferred" }).catch(error => {
      handlePreviewRenderError(error);
    });
    return;
  }
  if (state.editMode && state.editTool === "eraser" && activeEraserPointerId === event.pointerId) {
    previewEl.releasePointerCapture(event.pointerId);
    activeEraserPointerId = 0;
    commitArtworkHistoryCapture("eraser");
    renderPreviewFromCurrentRefinement({ sync3d: "deferred" }).catch(error => {
      handlePreviewRenderError(error);
    });
    updateDoodleCursor(getPointerSvgPoint(event));
    return;
  }
  if (!activeDoodlePoints.length || activeDoodlePanelId !== getActiveArtworkSide()) {
    clearLiveDoodlePreview();
    activeDoodlePoints = [];
    activeDoodlePanelId = "";
    commitArtworkHistoryCapture("doodle");
    updateDoodleCursor(getPointerSvgPoint(event));
    return;
  }
  previewEl.releasePointerCapture(event.pointerId);
  const releasePoint = getPointerSvgPoint(event);
  appendDoodlePoint(releasePoint);
  const artwork = ensureSideArtworkConfig();
  if (artwork && activeDoodlePoints.length > 1) {
    const pathData = buildSmoothedDoodlePath(activeDoodlePoints);
    const brushColor = getCurrentDoodleBrushColor(artwork);
    artwork.doodleStroke = brushColor;
    const doodle = {
      id: makeArtworkLayerId("doodle"),
      d: pathData,
      stroke: brushColor,
      strokeWidth: Number(artwork.doodleStrokeWidth) || 2,
      opacity: clamp(Number(artwork.doodleOpacity) || 1, 0, 1)
    };
    artwork.doodles.push(doodle);
    artwork.activeLayerId = doodle.id;
    syncArtworkLayers(artwork);
    renderPreviewFromCurrentRefinement({ sync3d: "immediate" }).catch(error => {
      handlePreviewRenderError(error);
    });
  }
  clearLiveDoodlePreview();
  activeDoodlePoints = [];
  activeDoodlePanelId = "";
  commitArtworkHistoryCapture("doodle");
  updateDoodleCursor(getPointerSvgPoint(event));
});

previewEl.addEventListener("pointercancel", event => {
  if (activeTextBoxDrag && activeTextBoxDrag.pointerId === event.pointerId) {
    activeTextBoxDrag = null;
    clearLiveTextBoxFrame();
    cancelArtworkHistoryCapture();
    queueInteractivePreviewRefresh();
  }
  clearLiveDoodlePreview();
  clearLiveDoodleCursor();
  if (activeArtworkDrag && activeArtworkDrag.pointerId === event.pointerId) {
    activeArtworkDrag = null;
    cancelArtworkHistoryCapture();
    queueInteractivePreviewRefresh();
  }
  if (activeEraserPointerId === event.pointerId) {
    activeEraserPointerId = 0;
    cancelArtworkHistoryCapture();
  }
});

previewEl.addEventListener("pointerleave", () => {
  clearLiveDoodleCursor();
});

previewEl.addEventListener("click", event => {
  if (state.editMode && state.editTool === "move-text") {
    event.preventDefault();
    return;
  }
  const previewPath = event.target.closest?.('path[id^="preview-"], path[data-panel-id]');
  const point = getPointerSvgPoint(event);
  const clickedPanelId = previewPath
    ? (previewPath.getAttribute("data-panel-id") || previewPath.id.replace(/^preview-/, "").replace(/^panel-/, "")).trim()
    : getPanelIdAtPoint(point);
  if (clickedPanelId) {
    selectPanel(clickedPanelId);
    renderTemplateRefinementControls();
    renderPreviewEditOverlay();
  }
});

foldSlider.addEventListener("input", event => {
  stopAutoAssemble();
  state.fold = clamp((Number.parseFloat(event.target.value) || 0) / 100, 0, 1);
  render3d().catch(error => {
    statusEl.textContent = "3D preview failed to update.";
    console.error(error);
  });
});

if (autoAssembleModelEl) {
  autoAssembleModelEl.addEventListener("change", event => {
    if (event.target.checked) {
      startAutoAssemble();
      return;
    }
    stopAutoAssemble();
    state.preserveCameraOnNextRender = true;
    render3d().catch(error => {
      statusEl.textContent = "3D preview failed to update.";
      console.error(error);
    });
  });
}

if (captureAssembledDefaultEl) {
  captureAssembledDefaultEl.addEventListener("click", () => {
    captureAssembledDefault();
  });
}

if (addModelRotationStepEl) {
  addModelRotationStepEl.addEventListener("click", () => {
    if (!state.lastGeometry) {
      return;
    }
    state.assemblySteps.push(normalizeAssemblyStep({
      type: "model-rotation",
      objectId: "__all__",
      axis: "z",
      angleDeg: 0,
      easing: "ease-in-out"
    }, state.lastGeometry));
    syncAssemblyStepsToRefinement();
    renderFoldDirectionControls();
    syncStructuredSvgOutput();
    render3d().catch(error => {
      statusEl.textContent = "3D preview failed to update.";
      console.error(error);
    });
  });
}

if (addObjectMoveStepEl) {
  addObjectMoveStepEl.addEventListener("click", () => {
    if (!state.lastGeometry) {
      return;
    }
    const objectId = getGeometryObjectIds(state.lastGeometry)[0] || "__default__";
    state.assemblySteps.push(normalizeAssemblyStep({
      type: "object-move",
      objectId,
      axis: "x",
      distanceMm: 0,
      easing: "ease-in-out"
    }, state.lastGeometry));
    syncAssemblyStepsToRefinement();
    renderFoldDirectionControls();
    syncStructuredSvgOutput();
    render3d().catch(error => {
      statusEl.textContent = "3D preview failed to update.";
      console.error(error);
    });
  });
}

renderTemplatePicker();
renderTemplateVariantPicker();
renderPaperStockOptions();
if (textureScaleEl) {
  textureScaleEl.value = String(state.textureScale);
  state.textureScale = getTextureScale();
}
updatePreviewZoomUi();
syncWorkbenchPanelVisibility();
applyTemplateDefaults(state.templateId);
loadBrowserFontOptions()
  .finally(() => init3dPreview(modelEl))
  .then(() => render())
  .catch(error => {
    statusEl.textContent = "Preview failed to initialize.";
    console.error(error);
  });
