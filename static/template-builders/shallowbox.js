import { buildMetadataJson, clamp, createProceduralTemplateBuilder, renderStructuredSvg, roundValue } from "./helpers.js";

// Migrated from static/templates/shallowbox_structured.svg before archiving that fixture.
// These constants preserve the legacy reference geometry while normalizing app-facing
// panel names instead of carrying older display labels like back/bottom/front forward.

const SOURCE_DEFAULTS = {
  L: 150,
  W: 100,
  H: 20,
  DUST: 20,
  TH: 15,
  TUCK: 15,
  GLUE: 30,
  A: 85,
  T: 0.5
};

const SOURCE_X_BREAKPOINTS = [70.87, 99.21, 127.56, 184.25, 609.45, 666.14, 694.49, 722.84];
const SOURCE_Y_BREAKPOINTS = [70.71, 111.82, 395.28, 451.97, 735.44, 792.13];

const SOURCE_OUTLINE_PREFIX_D = "M 184.25 111.82 L 184.25 395.28 L 99.21 402.72 L 99.21 444.53 L 184.25 451.97 L 127.56 451.97 L 119.06 460.48 L 70.87 464.69 L 70.87 717.72 L 110.55 728.35 L 113.39 731.19 L 116.22 734.02 L 127.56 734.02 L 127.56 735.44 L 184.25 735.44 L 99.21 742.88 L 99.21 784.69 L 184.25 792.13";
const SOURCE_OUTLINE_SUFFIX_D = "L 609.45 792.13 L 694.49 784.69 L 694.49 742.88 L 609.45 735.44 L 666.14 735.44 L 666.14 734.02 L 677.48 734.02 L 680.32 731.19 L 683.15 728.35 L 722.84 717.72 L 722.84 464.69 L 674.65 460.48 L 666.14 451.97 L 609.45 451.97 L 694.49 444.53 L 694.49 402.72 L 609.45 395.28 L 609.45 111.82 L 595.28 111.82 L 592.44 114.65";
const SOURCE_SLIT_D = "M 201.26 114.65 L 198.43 111.82 L 184.25 111.82";
const SOURCE_LOCK_CUTOUT_D = "M 608.03 111.82 L 608.03 111.82 A 41.1 41.1 0 0 0 566.93 70.71 L 226.77 70.71 A 41.1 41.1 0 0 0 185.67 111.82 L 185.67 111.82";
const SOURCE_THUMB_RADIUS = 21.26;
const SHALLOWBOX_ASSEMBLED_DEFAULTS = {
  viewName: "custom",
  modelCenter: [0, 0, 29.086],
  cameraPosition: [-395.274, 1251.354, 479.964],
  cameraTarget: [-0.005, 191.146, 15.354],
  cameraOffset: [-395.274, 1251.354, 450.878],
  targetOffset: [-0.005, 191.146, -13.733]
};

const TEMPLATE_DEFINITION = {
  id: "shallowbox",
  name: "Shallow Box",
  icon: "icon-shallowbox",
  title: "Shallow Box Template",
  summary: "Procedurally generated shallow box dieline, including side dust flaps, lower glue flaps, tuck flap, thumb hole, and glue tabs.",
  defaults: { L: 150, W: 100, H: 20, DUST: 20, TH: 15, TUCK: 15, GLUE: 30, A: 85, T: 0.5 },
  metadataDimensionMap: {
    L: "length",
    W: "width",
    H: "height"
  },
  custom3d: {
    camera: {
      flatView: "top",
      foldedView: "front",
      facingPanel: "front-wall",
      flatPadding: 1.1,
      foldedPadding: 1.24,
      foldedTargetOffset: [0, 0.04, 0.08]
    }
  },
  fieldGroups: {
    primary: [
      { key: "L", label: "Length", kind: "length", min: 1, step: 0.1 },
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 0.1, step: 0.1 }
    ],
    optional: [
      { key: "DUST", label: "Dust Flap Size", kind: "length", min: 0, step: 0.1 },
      { key: "TH", label: "Thumb Hole Diameter", kind: "length", min: 0, step: 0.1 },
      { key: "TUCK", label: "Tuck Flap Size", kind: "length", min: 0, step: 0.1 },
      { key: "GLUE", label: "Glue Flap Size", kind: "length", min: 0, step: 0.1 },
      { key: "A", label: "Glue Flap Angle", kind: "angle", min: 0, max: 89, step: 1 },
      { key: "T", label: "Material Thickness", kind: "length", min: 0, step: 0.1 }
    ]
  },
  parametricRule: { xKeys: ["DUST", "W", "L", "H"], yKeys: ["TUCK", "H", "W", "DUST"] },
  panels: [
    { id: "lid-panel", displayName: "lid-panel", standardName: "lid-panel", type: "panel", isGlue: false, foldParent: "rear-wall", foldId: "fold-rear-wall-to-lid-panel", foldAngleDeg: -90 },
    { id: "lid-flap", displayName: "lid-flap", standardName: "lid-flap", type: "panel", isGlue: false, foldParent: "lid-panel", foldId: "fold-lid-panel-to-lid-flap", foldAngleDeg: 90 },
    { id: "rear-wall", displayName: "rear-wall", standardName: "rear-wall", type: "panel", isGlue: false, foldParent: "base", foldId: "fold-base-to-rear-wall", foldAngleDeg: -90 },
    { id: "base", displayName: "base", standardName: "base", type: "panel", isGlue: false, foldParent: null, foldId: null, foldAngleDeg: 0 },
    { id: "front-wall", displayName: "front-wall", standardName: "front-wall", type: "panel", isGlue: false, foldParent: "base", foldId: "fold-base-to-front-wall", foldAngleDeg: 90 },
    { id: "left-wall", displayName: "left-wall", standardName: "left-wall", type: "panel", isGlue: false, foldParent: "base", foldId: "fold-base-to-left-wall", foldAngleDeg: -90 },
    { id: "right-wall", displayName: "right-wall", standardName: "right-wall", type: "panel", isGlue: false, foldParent: "base", foldId: "fold-base-to-right-wall", foldAngleDeg: -90 },
    { id: "top-left-glue-flap", displayName: "top-left-glue-flap", standardName: "top-left-glue-flap", type: "glue-flap", isGlue: true, foldParent: "rear-wall", foldId: "fold-rear-wall-to-top-left-glue-flap", foldAngleDeg: 90 },
    { id: "top-right-glue-flap", displayName: "top-right-glue-flap", standardName: "top-right-glue-flap", type: "glue-flap", isGlue: true, foldParent: "rear-wall", foldId: "fold-rear-wall-to-top-right-glue-flap", foldAngleDeg: 90 },
    { id: "bottom-left-glue-flap", displayName: "bottom-left-glue-flap", standardName: "bottom-left-glue-flap", type: "glue-flap", isGlue: true, foldParent: "front-wall", foldId: "fold-front-wall-to-bottom-left-glue-flap", foldAngleDeg: 90 },
    { id: "bottom-right-glue-flap", displayName: "bottom-right-glue-flap", standardName: "bottom-right-glue-flap", type: "glue-flap", isGlue: true, foldParent: "front-wall", foldId: "fold-front-wall-to-bottom-right-glue-flap", foldAngleDeg: 90 },
    { id: "left-dust-flap", displayName: "left-dust-flap", standardName: "left-dust-flap", type: "panel", isGlue: false, foldParent: "left-wall", foldId: "fold-left-wall-to-left-dust-flap", foldAngleDeg: 90 },
    { id: "right-dust-flap", displayName: "right-dust-flap", standardName: "right-dust-flap", type: "panel", isGlue: false, foldParent: "right-wall", foldId: "fold-right-wall-to-right-dust-flap", foldAngleDeg: 90 }
  ],
  defaultFoldProgress: 0
};

const SOURCE_PANELS = [
  {
    id: "lid-panel",
    displayName: "lid-panel",
    standardName: "lid-panel",
    type: "panel",
    isGlue: false,
    parent: "rear-wall",
    foldId: "fold-rear-wall-to-lid-panel",
    angle: -90,
    d: "M 184.25 395.28 L 184.25 111.82 L 198.43 111.82 L 201.26 114.65 L 592.44 114.65 L 595.28 111.82 L 609.45 111.82 L 609.45 395.28 Z",
    meshD: "M 184.25 395.28 L 184.25 111.82 L 198.43 111.82 L 201.26 114.65 L 592.44 114.65 L 595.28 111.82 L 609.45 111.82 L 609.45 395.28 Z",
    labelText: "lid-panel",
    labelPosition: [396.85, 255],
    fontSize: 30,
    rotationDeg: 180
  },
  {
    id: "lid-flap",
    displayName: "lid-flap",
    standardName: "lid-flap",
    type: "panel",
    isGlue: false,
    parent: "lid-panel",
    foldId: "fold-lid-panel-to-lid-flap",
    angle: 90,
    d: "M 201.26 114.65 L 198.43 111.82 L 185.67 111.82 A 41.1 41.1 0 0 1 226.77 70.71 L 566.93 70.71 A 41.1 41.1 0 0 1 608.03 111.82 L 595.28 111.82 L 592.44 114.65 Z",
    meshD: "M 201.26 114.65 L 198.43 111.82 L 185.67 111.82 A 41.1 41.1 0 0 1 226.77 70.71 L 566.93 70.71 A 41.1 41.1 0 0 1 608.03 111.82 L 595.28 111.82 L 592.44 114.65 Z",
    labelText: "lid-flap",
    labelPosition: [396.85, 98],
    fontSize: 20,
    rotationDeg: 180
  },
  {
    id: "rear-wall",
    displayName: "rear-wall",
    standardName: "rear-wall",
    type: "panel",
    isGlue: false,
    parent: "base",
    foldId: "fold-base-to-rear-wall",
    angle: -90,
    d: "M 184.25 395.28 L 609.45 395.28 L 609.45 451.97 L 184.25 451.97 Z",
    meshD: "M 184.25 395.28 L 609.45 395.28 L 609.45 451.97 L 184.25 451.97 Z",
    labelText: "rear-wall",
    labelPosition: [396.85, 423.6],
    fontSize: 28,
    rotationDeg: 0
  },
  {
    id: "base",
    displayName: "base",
    standardName: "base",
    type: "panel",
    isGlue: false,
    parent: null,
    foldId: "",
    angle: 0,
    d: "M 184.25 451.97 L 609.45 451.97 L 609.45 735.44 L 184.25 735.44 Z",
    meshD: "M 184.25 451.97 L 609.45 451.97 L 609.45 735.44 L 184.25 735.44 Z",
    labelText: "base",
    labelPosition: [396.85, 593.7],
    fontSize: 38,
    rotationDeg: 0
  },
  {
    id: "front-wall",
    displayName: "front-wall",
    standardName: "front-wall",
    type: "panel",
    isGlue: false,
    parent: "base",
    foldId: "fold-base-to-front-wall",
    angle: 90,
    d: "M 184.25 735.44 L 609.45 735.44 L 609.45 792.13 L 418.11 792.13 A 21.26 21.26 0 0 0 396.85 770.87 A 21.26 21.26 0 0 0 375.59 792.13 L 184.25 792.13 Z",
    meshD: "M 184.25 735.44 L 609.45 735.44 L 609.45 792.13 L 418.11 792.13 A 21.26 21.26 0 0 0 396.85 770.87 A 21.26 21.26 0 0 0 375.59 792.13 L 184.25 792.13 Z",
    labelText: "front-wall",
    labelPosition: [396.85, 755.8],
    fontSize: 24,
    rotationDeg: 180
  },
  {
    id: "left-wall",
    displayName: "left-wall",
    standardName: "left-wall",
    type: "panel",
    isGlue: false,
    parent: "base",
    foldId: "fold-base-to-left-wall",
    angle: 90,
    d: "M 127.56 451.97 L 184.25 451.97 L 184.25 734.02 L 127.56 734.02 Z",
    meshD: "M 127.56 451.97 L 184.25 451.97 L 184.25 734.02 L 127.56 734.02 Z",
    labelText: "left-wall",
    labelPosition: [155.9, 593],
    fontSize: 24,
    rotationDeg: 270
  },
  {
    id: "right-wall",
    displayName: "right-wall",
    standardName: "right-wall",
    type: "panel",
    isGlue: false,
    parent: "base",
    foldId: "fold-base-to-right-wall",
    angle: 90,
    d: "M 609.45 451.97 L 666.14 451.97 L 666.14 735.44 L 609.45 735.44 Z",
    meshD: "M 609.45 451.97 L 666.14 451.97 L 666.14 735.44 L 609.45 735.44 Z",
    labelText: "right-wall",
    labelPosition: [637.8, 593.7],
    fontSize: 24,
    rotationDeg: 90
  },
  {
    id: "top-left-glue-flap",
    displayName: "top-left-glue-flap",
    standardName: "top-left-glue-flap",
    type: "glue-flap",
    isGlue: true,
    parent: "rear-wall",
    foldId: "fold-rear-wall-to-top-left-glue-flap",
    angle: 90,
    d: "M 99.21 402.72 L 184.25 395.28 L 184.25 451.97 L 99.21 444.53 Z",
    meshD: "M 99.21 402.72 L 184.25 395.28 L 184.25 451.97 L 99.21 444.53 Z",
    labelText: "top-left-glue-flap",
    labelPosition: [141.7, 423.6],
    fontSize: 12,
    rotationDeg: 0
  },
  {
    id: "top-right-glue-flap",
    displayName: "top-right-glue-flap",
    standardName: "top-right-glue-flap",
    type: "glue-flap",
    isGlue: true,
    parent: "rear-wall",
    foldId: "fold-rear-wall-to-top-right-glue-flap",
    angle: -90,
    d: "M 609.45 395.28 L 694.49 402.72 L 694.49 444.53 L 609.45 451.97 Z",
    meshD: "M 609.45 395.28 L 694.49 402.72 L 694.49 444.53 L 609.45 451.97 Z",
    labelText: "top-right-glue-flap",
    labelPosition: [652, 423.6],
    fontSize: 12,
    rotationDeg: 0
  },
  {
    id: "bottom-left-glue-flap",
    displayName: "bottom-left-glue-flap",
    standardName: "bottom-left-glue-flap",
    type: "glue-flap",
    isGlue: true,
    parent: "front-wall",
    foldId: "fold-front-wall-to-bottom-left-glue-flap",
    angle: 90,
    d: "M 99.21 742.88 L 184.25 735.44 L 184.25 792.13 L 99.21 784.69 Z",
    meshD: "M 99.21 742.88 L 184.25 735.44 L 184.25 792.13 L 99.21 784.69 Z",
    labelText: "bottom-left-glue-flap",
    labelPosition: [141.7, 763.8],
    fontSize: 12,
    rotationDeg: 0
  },
  {
    id: "bottom-right-glue-flap",
    displayName: "bottom-right-glue-flap",
    standardName: "bottom-right-glue-flap",
    type: "glue-flap",
    isGlue: true,
    parent: "front-wall",
    foldId: "fold-front-wall-to-bottom-right-glue-flap",
    angle: -90,
    d: "M 609.45 735.44 L 694.49 742.88 L 694.49 784.69 L 609.45 792.13 Z",
    meshD: "M 609.45 735.44 L 694.49 742.88 L 694.49 784.69 L 609.45 792.13 Z",
    labelText: "bottom-right-glue-flap",
    labelPosition: [652, 763.8],
    fontSize: 12,
    rotationDeg: 0
  },
  {
    id: "left-dust-flap",
    displayName: "left-dust-flap",
    standardName: "left-dust-flap",
    type: "panel",
    isGlue: false,
    parent: "left-wall",
    foldId: "fold-left-wall-to-left-dust-flap",
    angle: 90,
    d: "M 70.87 464.69 L 119.06 460.48 L 127.56 451.97 L 127.56 734.02 L 116.22 734.02 L 113.39 731.19 L 110.55 728.35 L 70.87 717.72 Z",
    meshD: "M 70.87 464.69 L 119.06 460.48 L 127.56 451.97 L 127.56 734.02 L 116.22 734.02 L 113.39 731.19 L 110.55 728.35 L 70.87 717.72 Z",
    labelText: "left-dust-flap",
    labelPosition: [98, 593.7],
    fontSize: 17,
    rotationDeg: 270
  },
  {
    id: "right-dust-flap",
    displayName: "right-dust-flap",
    standardName: "right-dust-flap",
    type: "panel",
    isGlue: false,
    parent: "right-wall",
    foldId: "fold-right-wall-to-right-dust-flap",
    angle: 90,
    d: "M 666.14 451.97 L 674.65 460.48 L 722.84 464.69 L 722.84 717.72 L 683.15 728.35 L 680.32 731.19 L 677.48 734.02 L 666.14 734.02 Z",
    meshD: "M 666.14 451.97 L 674.65 460.48 L 722.84 464.69 L 722.84 717.72 L 683.15 728.35 L 680.32 731.19 L 677.48 734.02 L 666.14 734.02 Z",
    labelText: "right-dust-flap",
    labelPosition: [696, 593.7],
    fontSize: 17,
    rotationDeg: 90
  }
];

const SOURCE_FOLDS = [
  { id: "fold-base-to-front-wall", from: "base", to: "front-wall", d: "M 184.25 735.44 L 609.45 735.44", angleDeg: 90, displayName: "base to front-wall" },
  { id: "fold-base-to-left-wall", from: "base", to: "left-wall", d: "M 184.25 735.44 L 184.25 451.97", angleDeg: -90, displayName: "base to left-wall" },
  { id: "fold-base-to-right-wall", from: "base", to: "right-wall", d: "M 609.45 451.97 L 609.45 735.44", angleDeg: -90, displayName: "base to right-wall" },
  { id: "fold-base-to-rear-wall", from: "base", to: "rear-wall", d: "M 184.25 451.97 L 609.45 451.97", angleDeg: -90, displayName: "base to rear-wall" },
  { id: "fold-rear-wall-to-top-left-glue-flap", from: "rear-wall", to: "top-left-glue-flap", d: "M 184.25 395.28 L 184.25 451.97", angleDeg: 90, displayName: "rear-wall to top-left-glue-flap" },
  { id: "fold-left-wall-to-left-dust-flap", from: "left-wall", to: "left-dust-flap", d: "M 127.56 451.97 L 127.56 734.02", angleDeg: 90, displayName: "left-wall to left-dust-flap" },
  { id: "fold-front-wall-to-bottom-left-glue-flap", from: "front-wall", to: "bottom-left-glue-flap", d: "M 184.25 735.44 L 184.25 792.13", angleDeg: 90, displayName: "front-wall to bottom-left-glue-flap" },
  { id: "fold-front-wall-to-bottom-right-glue-flap", from: "front-wall", to: "bottom-right-glue-flap", d: "M 609.45 792.13 L 609.45 735.44", angleDeg: 90, displayName: "front-wall to bottom-right-glue-flap" },
  { id: "fold-right-wall-to-right-dust-flap", from: "right-wall", to: "right-dust-flap", d: "M 666.14 735.44 L 666.14 451.98", angleDeg: 90, displayName: "right-wall to right-dust-flap" },
  { id: "fold-rear-wall-to-top-right-glue-flap", from: "rear-wall", to: "top-right-glue-flap", d: "M 609.45 451.97 L 609.45 395.28", angleDeg: 90, displayName: "rear-wall to top-right-glue-flap" },
  { id: "fold-rear-wall-to-lid-panel", from: "rear-wall", to: "lid-panel", d: "M 184.25 395.28 L 609.45 395.28", angleDeg: -90, displayName: "rear-wall to lid-panel" },
  { id: "fold-lid-panel-to-lid-flap", from: "lid-panel", to: "lid-flap", d: "M 592.44 114.65 L 201.26 114.65", angleDeg: 90, displayName: "lid-panel to lid-flap" }
];

const SHALLOWBOX_FOLD_SEQUENCE = [
  "fold-rear-wall-to-top-left-glue-flap",
  "fold-rear-wall-to-top-right-glue-flap",
  "fold-front-wall-to-bottom-left-glue-flap",
  "fold-front-wall-to-bottom-right-glue-flap",
  "fold-left-wall-to-left-dust-flap",
  "fold-right-wall-to-right-dust-flap",
  "fold-base-to-rear-wall",
  "fold-base-to-front-wall",
  "fold-base-to-right-wall",
  "fold-base-to-left-wall",
  "fold-lid-panel-to-lid-flap",
  "fold-rear-wall-to-lid-panel"
];

function createIntervalWarp(breakpoints, targetLengths) {
  const intervals = [];
  const targets = [breakpoints[0]];
  for (let index = 0; index < breakpoints.length - 1; index += 1) {
    intervals.push({
      start: breakpoints[index],
      end: breakpoints[index + 1],
      length: breakpoints[index + 1] - breakpoints[index],
      targetLength: targetLengths[index]
    });
    targets.push(targets[index] + targetLengths[index]);
  }

  function warp(value) {
    if (!Number.isFinite(value)) {
      return value;
    }
    if (value <= intervals[0].start) {
      return targets[0] + (value - intervals[0].start);
    }
    for (let index = 0; index < intervals.length; index += 1) {
      const interval = intervals[index];
      if (value <= interval.end || index === intervals.length - 1) {
        const ratio = (value - interval.start) / Math.max(interval.length, 1e-6);
        return targets[index] + ratio * interval.targetLength;
      }
    }
    const last = intervals[intervals.length - 1];
    return targets[targets.length - 1] + (value - last.end);
  }

  function scaleAt(value) {
    if (!Number.isFinite(value)) {
      return 1;
    }
    for (let index = 0; index < intervals.length; index += 1) {
      const interval = intervals[index];
      if (value <= interval.end || index === intervals.length - 1) {
        return interval.targetLength / Math.max(interval.length, 1e-6);
      }
    }
    const last = intervals[intervals.length - 1];
    return last.targetLength / Math.max(last.length, 1e-6);
  }

  return { warp, scaleAt };
}

function warpPoint(point, xWarp, yWarp) {
  return [roundValue(xWarp(point[0])), roundValue(yWarp(point[1]))];
}

function buildThumbNotchSegment(leftX, rightX, bottomY, centerX, radius) {
  if (radius <= 0.001) {
    return `L ${roundValue(rightX)} ${roundValue(bottomY)}`;
  }

  const forward = rightX >= leftX;
  const shoulderLeft = centerX - radius;
  const shoulderRight = centerX + radius;
  const firstShoulder = forward ? shoulderLeft : shoulderRight;
  const secondShoulder = forward ? shoulderRight : shoulderLeft;
  const apexY = bottomY - radius;
  const direction = forward ? 1 : -1;
  const cpDx = radius * 0.55 * direction;
  const cpDy = radius * 0.92;

  return [
    `L ${roundValue(firstShoulder)} ${roundValue(bottomY)}`,
    `C ${roundValue(firstShoulder + cpDx)} ${roundValue(bottomY)} ${roundValue(centerX - cpDx)} ${roundValue(apexY)} ${roundValue(centerX)} ${roundValue(apexY)}`,
    `C ${roundValue(centerX + cpDx)} ${roundValue(apexY)} ${roundValue(secondShoulder - cpDx)} ${roundValue(bottomY)} ${roundValue(secondShoulder)} ${roundValue(bottomY)}`,
    `L ${roundValue(rightX)} ${roundValue(bottomY)}`
  ].join(" ");
}

function buildThumbCutoutPath(leftX, rightX, topY, bottomY, centerX, radius) {
  return [
    `M ${roundValue(leftX)} ${roundValue(topY)}`,
    `L ${roundValue(rightX)} ${roundValue(topY)}`,
    `L ${roundValue(rightX)} ${roundValue(bottomY)}`,
    buildThumbNotchSegment(rightX, leftX, bottomY, centerX, radius),
    `L ${roundValue(leftX)} ${roundValue(topY)}`,
    "Z"
  ].join(" ");
}

function buildOutlineWithThumb(xWarp, yWarp, thumbRadius) {
  const prefix = warpPathData(SOURCE_OUTLINE_PREFIX_D, xWarp, yWarp);
  const suffix = warpPathData(SOURCE_OUTLINE_SUFFIX_D, xWarp, yWarp);
  if (thumbRadius <= 0.001) {
    return `${prefix} L ${roundValue(xWarp.warp(609.45))} ${roundValue(yWarp.warp(792.13))} ${suffix}`;
  }

  const centerX = roundValue(xWarp.warp(396.85));
  const bottomY = roundValue(yWarp.warp(792.13));
  return [
    prefix,
    buildThumbNotchSegment(xWarp.warp(184.25), xWarp.warp(609.45), bottomY, centerX, thumbRadius),
    suffix
  ].join(" ");
}

function warpPathData(path, xWarp, yWarp) {
  const tokens = String(path).match(/[AaCcHhLlMmQqSsTtVvZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  if (!tokens) {
    return "";
  }

  let index = 0;
  let command = "";
  let current = { x: 0, y: 0 };
  let subpathStart = { x: 0, y: 0 };
  const out = [];

  const isCommand = token => /^[AaCcHhLlMmQqSsTtVvZz]$/.test(token);
  const nextNumber = () => Number(tokens[index++]);
  const push = value => out.push(String(value));

  while (index < tokens.length) {
    const token = tokens[index];
    if (isCommand(token)) {
      command = token;
      index += 1;
      push(command);
      if (command === "Z" || command === "z") {
        current = { ...subpathStart };
      }
      continue;
    }

    switch (command) {
      case "M":
      case "L": {
        const x = nextNumber();
        const y = nextNumber();
        current = { x, y };
        if (command === "M") {
          subpathStart = { ...current };
        }
        push(roundValue(xWarp.warp(x)));
        push(roundValue(yWarp.warp(y)));
        break;
      }
      case "m":
      case "l": {
        const dx = nextNumber();
        const dy = nextNumber();
        const next = { x: current.x + dx, y: current.y + dy };
        if (command === "m" && current.x === 0 && current.y === 0) {
          subpathStart = { ...next };
        }
        push(roundValue(xWarp.warp(next.x) - xWarp.warp(current.x)));
        push(roundValue(yWarp.warp(next.y) - yWarp.warp(current.y)));
        current = next;
        break;
      }
      case "H": {
        const x = nextNumber();
        current.x = x;
        push(roundValue(xWarp.warp(x)));
        break;
      }
      case "h": {
        const dx = nextNumber();
        const nextX = current.x + dx;
        push(roundValue(xWarp.warp(nextX) - xWarp.warp(current.x)));
        current.x = nextX;
        break;
      }
      case "V": {
        const y = nextNumber();
        current.y = y;
        push(roundValue(yWarp.warp(y)));
        break;
      }
      case "v": {
        const dy = nextNumber();
        const nextY = current.y + dy;
        push(roundValue(yWarp.warp(nextY) - yWarp.warp(current.y)));
        current.y = nextY;
        break;
      }
      case "C": {
        const x1 = nextNumber();
        const y1 = nextNumber();
        const x2 = nextNumber();
        const y2 = nextNumber();
        const x = nextNumber();
        const y = nextNumber();
        push(roundValue(xWarp.warp(x1)));
        push(roundValue(yWarp.warp(y1)));
        push(roundValue(xWarp.warp(x2)));
        push(roundValue(yWarp.warp(y2)));
        push(roundValue(xWarp.warp(x)));
        push(roundValue(yWarp.warp(y)));
        current = { x, y };
        break;
      }
      case "c": {
        const dx1 = nextNumber();
        const dy1 = nextNumber();
        const dx2 = nextNumber();
        const dy2 = nextNumber();
        const dx = nextNumber();
        const dy = nextNumber();
        push(roundValue(xWarp.warp(current.x + dx1) - xWarp.warp(current.x)));
        push(roundValue(yWarp.warp(current.y + dy1) - yWarp.warp(current.y)));
        push(roundValue(xWarp.warp(current.x + dx2) - xWarp.warp(current.x)));
        push(roundValue(yWarp.warp(current.y + dy2) - yWarp.warp(current.y)));
        push(roundValue(xWarp.warp(current.x + dx) - xWarp.warp(current.x)));
        push(roundValue(yWarp.warp(current.y + dy) - yWarp.warp(current.y)));
        current = { x: current.x + dx, y: current.y + dy };
        break;
      }
      case "Q": {
        const x1 = nextNumber();
        const y1 = nextNumber();
        const x = nextNumber();
        const y = nextNumber();
        push(roundValue(xWarp.warp(x1)));
        push(roundValue(yWarp.warp(y1)));
        push(roundValue(xWarp.warp(x)));
        push(roundValue(yWarp.warp(y)));
        current = { x, y };
        break;
      }
      case "q": {
        const dx1 = nextNumber();
        const dy1 = nextNumber();
        const dx = nextNumber();
        const dy = nextNumber();
        push(roundValue(xWarp.warp(current.x + dx1) - xWarp.warp(current.x)));
        push(roundValue(yWarp.warp(current.y + dy1) - yWarp.warp(current.y)));
        push(roundValue(xWarp.warp(current.x + dx) - xWarp.warp(current.x)));
        push(roundValue(yWarp.warp(current.y + dy) - yWarp.warp(current.y)));
        current = { x: current.x + dx, y: current.y + dy };
        break;
      }
      case "A": {
        const rx = nextNumber();
        const ry = nextNumber();
        const rotation = nextNumber();
        const largeArc = nextNumber();
        const sweep = nextNumber();
        const x = nextNumber();
        const y = nextNumber();
        const scaledRx = Math.abs(rx * xWarp.scaleAt((current.x + x) / 2));
        const scaledRy = Math.abs(ry * yWarp.scaleAt((current.y + y) / 2));
        push(roundValue(scaledRx));
        push(roundValue(scaledRy));
        push(roundValue(rotation));
        push(roundValue(largeArc));
        push(roundValue(sweep));
        push(roundValue(xWarp.warp(x)));
        push(roundValue(yWarp.warp(y)));
        current = { x, y };
        break;
      }
      case "a": {
        const rx = nextNumber();
        const ry = nextNumber();
        const rotation = nextNumber();
        const largeArc = nextNumber();
        const sweep = nextNumber();
        const dx = nextNumber();
        const dy = nextNumber();
        const next = { x: current.x + dx, y: current.y + dy };
        const scaledRx = Math.abs(rx * xWarp.scaleAt((current.x + next.x) / 2));
        const scaledRy = Math.abs(ry * yWarp.scaleAt((current.y + next.y) / 2));
        push(roundValue(scaledRx));
        push(roundValue(scaledRy));
        push(roundValue(rotation));
        push(roundValue(largeArc));
        push(roundValue(sweep));
        push(roundValue(xWarp.warp(next.x) - xWarp.warp(current.x)));
        push(roundValue(yWarp.warp(next.y) - yWarp.warp(current.y)));
        current = next;
        break;
      }
      default:
        throw new Error(`Unsupported SVG path command in shallowbox builder: ${command}`);
    }
  }

  return out.join(" ");
}

function buildShallowboxGeometry(params, template) {
  const L = Math.max(1, Number(params.L) || template.defaults.L);
  const W = Math.max(1, Number(params.W) || template.defaults.W);
  const H = Math.max(0.1, Number(params.H) || template.defaults.H);
  const DUST = Math.max(0, Number(params.DUST) || template.defaults.DUST);
  const TH = Math.max(0, Number(params.TH) || template.defaults.TH);
  const TUCK = Math.max(0, Number(params.TUCK) || template.defaults.TUCK);
  const GLUE = Math.max(0, Number(params.GLUE) || template.defaults.GLUE);
  const A = clamp(Number(params.A) || template.defaults.A, 0, 89);
  const T = Math.max(0, Number(params.T) || template.defaults.T);

  const glueBevel = Math.max(GLUE - H, 0);
  const dustOuter = Math.max(DUST - glueBevel, 0.1);

  const xWarp = createIntervalWarp(SOURCE_X_BREAKPOINTS, [
    dustOuter * ((SOURCE_X_BREAKPOINTS[1] - SOURCE_X_BREAKPOINTS[0]) / 10),
    glueBevel * ((SOURCE_X_BREAKPOINTS[2] - SOURCE_X_BREAKPOINTS[1]) / 10),
    (SOURCE_X_BREAKPOINTS[3] - SOURCE_X_BREAKPOINTS[2]) * (H / SOURCE_DEFAULTS.H),
    (SOURCE_X_BREAKPOINTS[4] - SOURCE_X_BREAKPOINTS[3]) * (L / SOURCE_DEFAULTS.L),
    (SOURCE_X_BREAKPOINTS[5] - SOURCE_X_BREAKPOINTS[4]) * (H / SOURCE_DEFAULTS.H),
    glueBevel * ((SOURCE_X_BREAKPOINTS[6] - SOURCE_X_BREAKPOINTS[5]) / 10),
    dustOuter * ((SOURCE_X_BREAKPOINTS[7] - SOURCE_X_BREAKPOINTS[6]) / 10)
  ]);
  const yWarp = createIntervalWarp(SOURCE_Y_BREAKPOINTS, [
    (SOURCE_Y_BREAKPOINTS[1] - SOURCE_Y_BREAKPOINTS[0]) * (TUCK / SOURCE_DEFAULTS.TUCK),
    (SOURCE_Y_BREAKPOINTS[2] - SOURCE_Y_BREAKPOINTS[1]) * (W / SOURCE_DEFAULTS.W),
    (SOURCE_Y_BREAKPOINTS[3] - SOURCE_Y_BREAKPOINTS[2]) * (H / SOURCE_DEFAULTS.H),
    (SOURCE_Y_BREAKPOINTS[4] - SOURCE_Y_BREAKPOINTS[3]) * (W / SOURCE_DEFAULTS.W),
    (SOURCE_Y_BREAKPOINTS[5] - SOURCE_Y_BREAKPOINTS[4]) * (H / SOURCE_DEFAULTS.H)
  ]);

  const labelScale = Math.sqrt((L / SOURCE_DEFAULTS.L) * (W / SOURCE_DEFAULTS.W));
  const thumbScale = TH > 0 ? TH / SOURCE_DEFAULTS.TH : 0;
  const thumbRadius = SOURCE_THUMB_RADIUS * thumbScale;
  const frontWallPath = buildThumbCutoutPath(
    xWarp.warp(184.25),
    xWarp.warp(609.45),
    yWarp.warp(735.44),
    yWarp.warp(792.13),
    xWarp.warp(396.85),
    thumbRadius
  );

  const panels = SOURCE_PANELS.map(panel => {
    const warpedLabel = warpPoint(panel.labelPosition, xWarp.warp, yWarp.warp);
    const fontSizeMultiplier = panel.id === "base" ? 1 : panel.id.includes("glue-flap") || panel.id.includes("dust-flap") ? 0.9 : 1;
    const pathD = panel.id === "front-wall" ? frontWallPath : warpPathData(panel.d, xWarp, yWarp);
    return {
      id: panel.id,
      standardName: panel.standardName,
      displayName: panel.displayName,
      label: panel.labelText,
      type: panel.type,
      isGlue: panel.isGlue,
      parent: panel.parent,
      foldId: panel.foldId,
      angle: panel.angle,
      d: pathD,
      meshD: panel.id === "front-wall" ? frontWallPath : warpPathData(panel.meshD, xWarp, yWarp),
      labelPosition: warpedLabel,
      labelLayout: {
        text: panel.labelText,
        x: warpedLabel[0],
        y: warpedLabel[1],
        fontSize: roundValue(clamp(panel.fontSize * labelScale * fontSizeMultiplier, 6, 30)),
        rotationDeg: panel.rotationDeg,
        maxWidth: 0,
        lineHeight: 1.2
      },
      objectId: ""
    };
  });

  const folds = SOURCE_FOLDS.map(fold => ({
    id: fold.id,
    from: fold.from,
    to: fold.to,
    d: warpPathData(fold.d, xWarp, yWarp),
    angleDeg: fold.angleDeg,
    displayName: fold.displayName
  }));

  const outlineD = buildOutlineWithThumb(xWarp, yWarp, thumbRadius);
  const slitD = warpPathData(SOURCE_SLIT_D, xWarp, yWarp);
  const lockCutoutD = warpPathData(SOURCE_LOCK_CUTOUT_D, xWarp, yWarp);
  const pageW = roundValue(xWarp.warp(793));
  const pageH = roundValue(yWarp.warp(863));

  const geometry = {
    pageW,
    pageH,
    outlineD,
    slitD,
    lockCutoutD,
    panels,
    folds,
    foldSequence: SHALLOWBOX_FOLD_SEQUENCE,
    glueAreas: [],
    rootPanel: "base",
    rootPanels: ["base"],
    floorPanel: "base",
    assembledDefaults: SHALLOWBOX_ASSEMBLED_DEFAULTS,
    floorFoldId: "",
    floorFoldDistribution: null,
    custom3d: { ...(template.custom3d || {}) },
    flatSheetD: "",
    __cacheKey: JSON.stringify({
      templateId: "shallowbox",
      dimensions: {
        L: roundValue(L),
        W: roundValue(W),
        H: roundValue(H),
        DUST: roundValue(DUST),
        TH: roundValue(TH),
        TUCK: roundValue(TUCK),
        GLUE: roundValue(GLUE),
        A: roundValue(A),
        T: roundValue(T),
        thumbScale: roundValue(thumbScale)
      }
    })
  };

  const metadataJson = buildMetadataJson(
    template,
    geometry,
    { length: L, width: W, height: H },
    {
      dustFlapSize: DUST,
      thumbHoleWidth: TH,
      tuckFlapSize: TUCK,
      glueFlapSize: GLUE,
      dustFlapAngle: A,
      materialThickness: T
    },
    "static/template-builders/shallowbox.js"
  );

  return {
    svgText: renderStructuredSvg(template, geometry, metadataJson),
    metadata: metadataJson,
    geometry
  };
}

export default createProceduralTemplateBuilder(TEMPLATE_DEFINITION, buildShallowboxGeometry);
