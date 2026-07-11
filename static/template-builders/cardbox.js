import { buildMetadataJson, clamp, createProceduralTemplateBuilder, renderStructuredSvg, roundValue } from "./helpers.js";

// Migrated from static/templates/cardbox_structured.svg before archiving that fixture.
// These constants preserve the legacy reference geometry while normalizing old SVG naming
// mistakes such as left-side/right-side into the app-facing left-wall/right-wall ids.

const SOURCE_DEFAULTS = {
  L: 60,
  W: 30,
  H: 90,
  TH: 10,
  TUCK: 20,
  GLUE: 15,
  A: 80,
  T: 0.5,
  R: 15
};

const SOURCE_X_BREAKPOINTS = [74.1, 116.5, 286.7, 371.8, 542.0, 627.1];
const SOURCE_Y_BREAKPOINTS = [101.1, 159.4, 241.6, 496.9, 580.6, 638.8];
const SOURCE_X_UNITS_PER_MM = (SOURCE_X_BREAKPOINTS[2] - SOURCE_X_BREAKPOINTS[1]) / SOURCE_DEFAULTS.L;
const SOURCE_Y_UNITS_PER_MM = (SOURCE_Y_BREAKPOINTS[3] - SOURCE_Y_BREAKPOINTS[2]) / SOURCE_DEFAULTS.H;

const SOURCE_OUTLINE_D = "M524.9,580.6l2.8,2.8H542v-86.5l8.5,8.5l5.5,62.4h49.6L620,514l2.8-2.8l2.8-2.8v-11.3h1.4V241.6 l-8.5-8.5l-5.5-62.4h-49.6L549,224.6l-2.8,2.8l-2.8,2.8v11.3H542h-70.9c0,7.8-6.3,14.2-14.2,14.2c-7.8,0-14.2-6.3-14.2-14.2h-70.9 h-1.4v-11.3l-2.8-2.8l-2.8-2.8l-14.4-53.9h-49.6l-5.5,62.4l-8.5,8.5v-85.1h-14.2l-2.8,2.8l15.6-2.8v-12.8 c0-23.5-19.1-42.6-42.6-42.6h-82.3c-23.5,0-42.6,19.1-42.6,42.6v12.8l15.6,2.8l-2.8-2.8h-14.2v85.1l-42.6,7.5v240.3l42.6,7.5h170.2 h1.4v11.3l2.8,2.8l2.8,2.8l14.4,53.9h49.6l5.5-62.4l8.5-8.5v86.5H386l2.8-2.8l-15.6,2.8v12.8c0,23.5,19.1,42.6,42.6,42.6H498 c23.5,0,42.6-19.1,42.6-42.6v-12.8L524.9,580.6z";
const SOURCE_GLUE_POINTS = "74.1,249.1 116.8,241.6 116.5,496.9 74.1,489.4";
const CARDBOX_ASSEMBLED_DEFAULTS = {
  viewName: "custom",
  modelCenter: [0, 0, 128.405],
  cameraPosition: [425.18, -700.058, 535.289],
  cameraTarget: [105.417, 15.435, 14.716],
  cameraOffset: [425.18, -700.058, 406.884],
  targetOffset: [105.417, 15.435, -113.689]
};

const TEMPLATE_DEFINITION = {
  id: "cardbox",
  name: "Cardbox",
  icon: "icon-cardbox",
  title: "Cardbox Generator",
  summary: "Procedural card box with thumb cutout and tuck flap defaults matching the normalized reference net.",
  defaults: { L: 60, W: 30, H: 90, TH: 10, TUCK: 20, GLUE: 15, A: 80, T: 0.5, R: 15 },
  labelDefaults: {
    fontSize: 12
  },
  metadataDimensionMap: {
    L: "length",
    W: "width",
    H: "height"
  },
  custom3d: {
    foldClosureBiasDeg: {
      "fold-back-to-top": 0.12,
      "fold-back-to-left-glue-flap": 0.12
    },
    camera: {
      flatView: "top",
      foldedView: "front",
      flatPadding: 1.12,
      foldedPadding: 1.28,
      foldedTargetOffset: [0, 0.03, 0.1]
    }
  },
  fieldGroups: {
    primary: [
      { key: "L", label: "Length", kind: "length", min: 1, step: 0.1 },
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 0.1, step: 0.1 }
    ],
    optional: [
      { key: "TH", label: "Thumb Hole Diameter", kind: "length", min: 0, step: 0.1 },
      { key: "TUCK", label: "Tuck Flap Size", kind: "length", min: 0, step: 0.1 },
      { key: "GLUE", label: "Glue Flap Size", kind: "length", min: 0, step: 0.1 },
      { key: "A", label: "Glue Flap Angle", kind: "angle", min: 0, max: 89, step: 1 },
      { key: "T", label: "Material Thickness", kind: "length", min: 0, step: 0.1 },
      { key: "R", label: "Rounded Corners Radius", kind: "length", min: 0, step: 0.1 }
    ]
  },
  parametricRule: { xKeys: ["GLUE", "L", "W"], yKeys: ["TUCK", "H", "W"] },
  panels: [
    { id: "top-flap", displayName: "top-flap", standardName: "top-flap", type: "panel", isGlue: false, foldParent: "top", foldId: "fold-top-to-top-flap", foldAngleDeg: 90 },
    { id: "top", displayName: "top", standardName: "top", type: "panel", isGlue: false, foldParent: "back", foldId: "fold-back-to-top", foldAngleDeg: -90 },
    { id: "back", displayName: "back", standardName: "back", type: "panel", isGlue: false, foldParent: "left-wall", foldId: "fold-left-wall-to-back", foldAngleDeg: -90 },
    { id: "left-wall", displayName: "left-wall", standardName: "left-wall", type: "panel", isGlue: false, foldParent: "front", foldId: "fold-front-to-left-wall", foldAngleDeg: 90 },
    { id: "front", displayName: "front", standardName: "front", type: "panel", isGlue: false, foldParent: null, foldId: null, foldAngleDeg: 0 },
    { id: "right-wall", displayName: "right-wall", standardName: "right-wall", type: "panel", isGlue: false, foldParent: "front", foldId: "fold-front-to-right-wall", foldAngleDeg: 90 },
    { id: "left-glue-flap", displayName: "left-glue-flap", standardName: "left-glue-flap", type: "glue-flap", isGlue: true, foldParent: "back", foldId: "fold-back-to-left-glue-flap", foldAngleDeg: 90 },
    { id: "bottom", displayName: "bottom", standardName: "bottom", type: "panel", isGlue: false, foldParent: "front", foldId: "fold-front-to-bottom", foldAngleDeg: -90 },
    { id: "bottom-flap", displayName: "bottom-flap", standardName: "bottom-flap", type: "panel", isGlue: false, foldParent: "bottom", foldId: "fold-bottom-to-bottom-flap", foldAngleDeg: 90 },
    { id: "top-left-dust-flap", displayName: "top-left dust-flap", standardName: "top-left-dust-flap", type: "panel", isGlue: false, foldParent: "left-wall", foldId: "fold-left-wall-to-top-left-dust-flap", foldAngleDeg: -91 },
    { id: "bottom-left-dust-flap", displayName: "bottom-left Dust-flap", standardName: "bottom-left-dust-flap", type: "panel", isGlue: false, foldParent: "left-wall", foldId: "fold-left-wall-to-bottom-left-dust-flap", foldAngleDeg: -91 },
    { id: "top-right-dust-flap", displayName: "top-right dust-flap", standardName: "top-right-dust-flap", type: "panel", isGlue: false, foldParent: "right-wall", foldId: "fold-right-wall-to-top-right-dust-flap", foldAngleDeg: 90 },
    { id: "bottom-right-dust-flap", displayName: "bottom-right dust-flap", standardName: "bottom-right-dust-flap", type: "panel", isGlue: false, foldParent: "right-wall", foldId: "fold-right-wall-to-bottom-right-dust-flap", foldAngleDeg: 90 }
  ]
};

const SOURCE_PANELS = [
  {
    id: "top-flap",
    displayName: "top-flap",
    standardName: "top-flap",
    type: "panel",
    isGlue: false,
    parent: "top",
    foldId: "fold-top-to-top-flap",
    angle: 90,
    d: "M 133.5 159.4 L 133.5 143.7 C 133.5 120.2 152.6 101.1 176.1 101.1 L 242.5 101.1 C 266 101.1 285.1 120.2 285.1 143.7 L 285.1 156.6 L 269.6 159.4 L 133.5 159.4 Z",
    meshD: "M 133.5 159.4 L 116.5 156.6 L 116.5 143.7 C 116.5 120.2 135.6 101.1 159.1 101.1 L 244.1 101.1 C 267.6 101.1 286.7 120.2 286.7 143.7 L 286.7 156.6 L 269.6 159.4 Z",
    labelText: "top-flap",
    labelPosition: [199.3, 130],
    rotationDeg: 180,
    fontSize: 20
  },
  {
    id: "top",
    displayName: "top",
    standardName: "top",
    type: "panel",
    isGlue: false,
    parent: "back",
    foldId: "fold-back-to-top",
    angle: 90,
    d: "M 116.5 159.4 L 286.7 156.6 L 286.7 241.6 L 116.5 241.6 Z",
    meshD: "M 116.5 159.4 L 286.7 159.4 L 286.7 241.6 L 116.5 241.6 Z",
    labelText: "top",
    labelPosition: [201.6, 199],
    rotationDeg: 180,
    fontSize: 30
  },
  {
    id: "back",
    displayName: "back",
    standardName: "back",
    type: "panel",
    isGlue: false,
    parent: "left-wall",
    foldId: "fold-left-wall-to-back",
    angle: 90,
    d: "M 116.5 241.6 L 286.7 241.6 L 286.7 496.9 L 116.5 496.9 Z",
    meshD: "M 116.5 241.6 L 286.7 241.6 L 286.7 496.9 L 116.5 496.9 Z",
    labelText: "back",
    labelPosition: [201.6, 369.3],
    rotationDeg: 0,
    fontSize: 30
  },
  {
    id: "left-wall",
    displayName: "left-wall",
    standardName: "left-wall",
    type: "panel",
    isGlue: false,
    parent: "front",
    foldId: "fold-front-to-left-wall",
    angle: 90,
    d: "M 286.7 241.6 L 371.8 241.6 L 371.8 496.9 L 286.7 496.9 Z",
    meshD: "M 286.7 241.6 L 371.8 241.6 L 371.8 496.9 L 286.7 496.9 Z",
    labelText: "left-wall",
    labelPosition: [329.25, 369.3],
    rotationDeg: 90,
    fontSize: 25
  },
  {
    id: "front",
    displayName: "front",
    standardName: "front",
    type: "panel",
    isGlue: false,
    parent: null,
    foldId: "",
    angle: 0,
    d: "M 371.8 241.6 L 542.0 241.6 L 542.0 496.9 L 371.8 496.9 Z",
    meshD: "M 371.8 241.6 L 442.7 241.6 C 442.7 249.4 449.1 255.8 456.9 255.8 C 464.7 255.8 471.1 249.4 471.1 241.6 L 542.0 241.6 L 542.0 496.9 L 371.8 496.9 Z",
    labelText: "front",
    labelPosition: [456.9, 369.3],
    rotationDeg: 0,
    fontSize: 30
  },
  {
    id: "right-wall",
    displayName: "right-wall",
    standardName: "right-wall",
    type: "panel",
    isGlue: false,
    parent: "front",
    foldId: "fold-front-to-right-wall",
    angle: -90,
    d: "M 542.0 241.6 L 627.1 241.6 L 627.1 496.9 L 542.0 496.9 Z",
    meshD: "M 542.0 241.6 L 627.1 241.6 L 627.1 496.9 L 542.0 496.9 Z",
    labelText: "right-wall",
    labelPosition: [584.55, 369.3],
    rotationDeg: 270,
    fontSize: 25
  },
  {
    id: "left-glue-flap",
    displayName: "left-glue-flap",
    standardName: "left-glue-flap",
    type: "glue-flap",
    isGlue: true,
    parent: "back",
    foldId: "fold-back-to-left-glue-flap",
    angle: 0,
    d: "M 74.1 249.1 L 116.5 241.6 L 116.5 496.9 L 74.1 489.4 Z",
    meshD: "M 74.1 249.1 L 116.5 241.6 L 116.5 496.9 L 74.1 489.4 Z",
    labelText: "left-glue-flap",
    labelPosition: [95, 369.3],
    rotationDeg: 90,
    fontSize: 20
  },
  {
    id: "bottom",
    displayName: "bottom",
    standardName: "bottom",
    type: "panel",
    isGlue: false,
    parent: "front",
    foldId: "fold-front-to-bottom",
    angle: 90,
    d: "M 371.8 496.9 L 542 496.9 L 542 580.6 L 388.8 580.6 L 371.8 496.9 Z",
    meshD: "M 371.8 496.9 L 542 496.9 L 542 580.6 L 371.8 580.6 Z",
    labelText: "bottom",
    labelPosition: [456.9, 540],
    rotationDeg: 0,
    fontSize: 30
  },
  {
    id: "bottom-flap",
    displayName: "bottom-flap",
    standardName: "bottom-flap",
    type: "panel",
    isGlue: false,
    parent: "bottom",
    foldId: "fold-bottom-to-bottom-flap",
    angle: 90,
    d: "M 388.8 580.6 L 525 580.6 L 540.6 583.4 L 540.6 596.2 C 540.6 619.7 521.5 638.8 498 638.8 L 415.7 638.8 C 392.2 638.8 373.1 619.7 373.1 596.2 L 373.1 583.4 L 388.8 580.6 Z",
    meshD: "M 388.8 580.6 L 525 580.6 L 540.6 583.4 L 540.6 596.2 C 540.6 619.7 521.5 638.8 498 638.8 L 415.7 638.8 C 392.2 638.8 373.1 619.7 373.1 596.2 L 373.1 583.4 L 388.8 580.6 Z",
    labelText: "bottom-flap",
    labelPosition: [456.9, 614],
    rotationDeg: 0,
    fontSize: 20
  },
  {
    id: "top-left-dust-flap",
    displayName: "top-left dust-flap",
    standardName: "top-left-dust-flap",
    type: "panel",
    isGlue: false,
    parent: "left-wall",
    foldId: "fold-left-wall-to-top-left-dust-flap",
    angle: 90,
    d: "M 286.7 241.6 L 295.2 233.1 L 300.7 170.7 L 350.3 170.7 L 364.7 224.6 L 370.4 230.2 L 370.4 241.6 Z",
    meshD: "M 286.7 241.6 L 295.2 233.1 L 300.7 170.7 L 350.3 170.7 L 364.7 224.6 L 370.4 230.2 L 370.4 241.6 Z",
    labelText: "top-left\ndust-flap",
    labelPosition: [328, 210],
    rotationDeg: 0,
    fontSize: 12
  },
  {
    id: "bottom-left-dust-flap",
    displayName: "bottom-left dust-flap",
    standardName: "bottom-left-dust-flap",
    type: "panel",
    isGlue: false,
    parent: "left-wall",
    foldId: "fold-left-wall-to-bottom-left-dust-flap",
    angle: 90,
    d: "M 286.7 496.9 L 371.8 496.9 L 363.2 505.3 L 357.7 567.7 L 308.1 567.7 L 293.7 513.8 L 288.1 508.2 Z",
    meshD: "M 286.7 496.9 L 371.8 496.9 L 363.2 505.3 L 357.7 567.7 L 308.1 567.7 L 293.7 513.8 L 288.1 508.2 Z",
    labelText: "bottom-left\ndust-flap",
    labelPosition: [328, 532],
    rotationDeg: 0,
    fontSize: 12
  },
  {
    id: "top-right-dust-flap",
    displayName: "top-right dust-flap",
    standardName: "top-right-dust-flap",
    type: "panel",
    isGlue: false,
    parent: "right-wall",
    foldId: "fold-right-wall-to-top-right-dust-flap",
    angle: 90,
    d: "M 543.4 241.6 L 543.4 230.3 L 549 224.7 L 563.4 170.8 L 613 170.8 L 618.5 233.2 L 627.1 241.6 Z",
    meshD: "M 543.4 241.6 L 543.4 230.3 L 549 224.7 L 563.4 170.8 L 613 170.8 L 618.5 233.2 L 627.1 241.6 Z",
    labelText: "top-right\ndust-flap",
    labelPosition: [584, 210],
    rotationDeg: 0,
    fontSize: 12
  },
  {
    id: "bottom-right-dust-flap",
    displayName: "bottom-right dust-flap",
    standardName: "bottom-right-dust-flap",
    type: "panel",
    isGlue: false,
    parent: "right-wall",
    foldId: "fold-right-wall-to-bottom-right-dust-flap",
    angle: 90,
    d: "M 542 496.9 L 625.6 497.1 L 625.6 508.4 L 620 514 L 605.6 567.8 L 556 567.8 L 550.5 505.4 Z",
    meshD: "M 542 496.9 L 625.6 497.1 L 625.6 508.4 L 620 514 L 605.6 567.8 L 556 567.8 L 550.5 505.4 Z",
    labelText: "bottom-right\ndust-flap",
    labelPosition: [584, 532],
    rotationDeg: 0,
    fontSize: 12
  }
];

const SOURCE_FOLDS = [
  { id: "fold-front-to-right-wall", from: "front", to: "right-wall", d: "M542,496.9V241.6", angleDeg: 90, displayName: "front to right-wall" },
  { id: "fold-front-to-left-wall", from: "front", to: "left-wall", d: "M371.8,241.6v255.3", angleDeg: 90, displayName: "front to left-wall" },
  { id: "fold-left-wall-to-back", from: "left-wall", to: "back", d: "M286.7,496.9V241.6", angleDeg: -90, displayName: "left-wall to back" },
  { id: "fold-right-wall-to-bottom-right-dust-flap", from: "right-wall", to: "bottom-right-dust-flap", d: "M542,496.9h83.7", angleDeg: 90, displayName: "right-wall to bottom-right dust-flap" },
  { id: "fold-bottom-to-bottom-flap", from: "bottom", to: "bottom-flap", d: "M388.8,580.6H525", angleDeg: 90, displayName: "bottom to bottom-flap" },
  { id: "fold-front-to-bottom", from: "front", to: "bottom", d: "M542,496.9H371.8", angleDeg: -90, displayName: "front to bottom" },
  { id: "fold-right-wall-to-top-right-dust-flap", from: "right-wall", to: "top-right-dust-flap", d: "M627.1,241.6h-83.7", angleDeg: 90, displayName: "right-wall to top-right dust-flap" },
  { id: "fold-left-wall-to-bottom-left-dust-flap", from: "left-wall", to: "bottom-left-dust-flap", d: "M371.8,496.9h-85.1", angleDeg: -91, displayName: "left-wall to bottom-left dust-flap" },
  { id: "fold-left-wall-to-top-left-dust-flap", from: "left-wall", to: "top-left-dust-flap", d: "M286.7,241.6h85.1", angleDeg: -91, displayName: "left-wall to top-left dust-flap" },
  { id: "fold-back-to-top", from: "back", to: "top", d: "M116.5,241.6h170.2", angleDeg: -90, displayName: "back to top" },
  { id: "fold-top-to-top-flap", from: "top", to: "top-flap", d: "M269.6,159.4H133.5", angleDeg: 90, displayName: "top to top-flap" },
  { id: "fold-back-to-left-glue-flap", from: "back", to: "left-glue-flap", d: "M 116.5 241.6 L 116.5 496.9", angleDeg: 90, displayName: "back to left glue flap" }
];

const CARD_FOLD_SEQUENCE = [
  "fold-back-to-left-glue-flap",
  "fold-left-wall-to-top-left-dust-flap",
  "fold-right-wall-to-top-right-dust-flap",
  "fold-left-wall-to-bottom-left-dust-flap",
  "fold-right-wall-to-bottom-right-dust-flap",
  "fold-top-to-top-flap",
  "fold-bottom-to-bottom-flap",
  "fold-front-to-bottom",
  "fold-front-to-right-wall",
  "fold-front-to-left-wall",
  "fold-left-wall-to-back",
  "fold-back-to-top"
];

function createIntervalWarp(breakpoints, targetLengths, { sourceUnitsPerMm = 1, targetStart = breakpoints[0] } = {}) {
  const intervals = [];
  const targets = [targetStart];
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
      return targets[0] + (value - intervals[0].start) / Math.max(sourceUnitsPerMm, 1e-6);
    }
    for (let index = 0; index < intervals.length; index += 1) {
      const interval = intervals[index];
      if (value <= interval.end || index === intervals.length - 1) {
        const ratio = (value - interval.start) / Math.max(interval.length, 1e-6);
        return targets[index] + ratio * interval.targetLength;
      }
    }
    const last = intervals[intervals.length - 1];
    return targets[targets.length - 1] + (value - last.end) / Math.max(sourceUnitsPerMm, 1e-6);
  }

  return { warp };
}

function warpPoint(point, xWarp, yWarp) {
  return [roundValue(xWarp(point[0])), roundValue(yWarp(point[1]))];
}

function warpPointsString(points, xWarp, yWarp) {
  return points
    .trim()
    .split(/\s+/)
    .map(entry => {
      const [x, y] = entry.split(",").map(Number);
      return `${roundValue(xWarp(x))},${roundValue(yWarp(y))}`;
    })
    .join(" ");
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
        push(roundValue(xWarp(x)));
        push(roundValue(yWarp(y)));
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
        push(roundValue(xWarp(next.x) - xWarp(current.x)));
        push(roundValue(yWarp(next.y) - yWarp(current.y)));
        current = next;
        break;
      }
      case "H": {
        const x = nextNumber();
        current.x = x;
        push(roundValue(xWarp(x)));
        break;
      }
      case "h": {
        const dx = nextNumber();
        const nextX = current.x + dx;
        push(roundValue(xWarp(nextX) - xWarp(current.x)));
        current.x = nextX;
        break;
      }
      case "V": {
        const y = nextNumber();
        current.y = y;
        push(roundValue(yWarp(y)));
        break;
      }
      case "v": {
        const dy = nextNumber();
        const nextY = current.y + dy;
        push(roundValue(yWarp(nextY) - yWarp(current.y)));
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
        push(roundValue(xWarp(x1)));
        push(roundValue(yWarp(y1)));
        push(roundValue(xWarp(x2)));
        push(roundValue(yWarp(y2)));
        push(roundValue(xWarp(x)));
        push(roundValue(yWarp(y)));
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
        push(roundValue(xWarp(current.x + dx1) - xWarp(current.x)));
        push(roundValue(yWarp(current.y + dy1) - yWarp(current.y)));
        push(roundValue(xWarp(current.x + dx2) - xWarp(current.x)));
        push(roundValue(yWarp(current.y + dy2) - yWarp(current.y)));
        push(roundValue(xWarp(current.x + dx) - xWarp(current.x)));
        push(roundValue(yWarp(current.y + dy) - yWarp(current.y)));
        current = { x: current.x + dx, y: current.y + dy };
        break;
      }
      case "Q": {
        const x1 = nextNumber();
        const y1 = nextNumber();
        const x = nextNumber();
        const y = nextNumber();
        push(roundValue(xWarp(x1)));
        push(roundValue(yWarp(y1)));
        push(roundValue(xWarp(x)));
        push(roundValue(yWarp(y)));
        current = { x, y };
        break;
      }
      case "q": {
        const dx1 = nextNumber();
        const dy1 = nextNumber();
        const dx = nextNumber();
        const dy = nextNumber();
        push(roundValue(xWarp(current.x + dx1) - xWarp(current.x)));
        push(roundValue(yWarp(current.y + dy1) - yWarp(current.y)));
        push(roundValue(xWarp(current.x + dx) - xWarp(current.x)));
        push(roundValue(yWarp(current.y + dy) - yWarp(current.y)));
        current = { x: current.x + dx, y: current.y + dy };
        break;
      }
      default:
        throw new Error(`Unsupported SVG path command in cardbox builder: ${command}`);
    }
  }

  return out.join(" ");
}

function buildCardboxGeometry(params, template) {
  const L = Math.max(1, Number(params.L) || template.defaults.L);
  const W = Math.max(1, Number(params.W) || template.defaults.W);
  const H = Math.max(0.1, Number(params.H) || template.defaults.H);
  const TH = Math.max(0, Number(params.TH) || template.defaults.TH);
  const TUCK = Math.max(0, Number(params.TUCK) || template.defaults.TUCK);
  const GLUE = Math.max(0, Number(params.GLUE) || template.defaults.GLUE);
  const A = clamp(Number(params.A) || template.defaults.A, 0, 89);
  const T = Math.max(0, Number(params.T) || template.defaults.T);
  const R = Math.max(0, Number(params.R) || template.defaults.R);

  const xWarp = createIntervalWarp(SOURCE_X_BREAKPOINTS, [
    GLUE,
    L,
    W,
    L,
    W
  ], {
    sourceUnitsPerMm: SOURCE_X_UNITS_PER_MM,
    targetStart: SOURCE_X_BREAKPOINTS[0] / SOURCE_X_UNITS_PER_MM
  });
  const yWarp = createIntervalWarp(SOURCE_Y_BREAKPOINTS, [
    TUCK,
    W,
    H,
    W,
    TUCK
  ], {
    sourceUnitsPerMm: SOURCE_Y_UNITS_PER_MM,
    targetStart: SOURCE_Y_BREAKPOINTS[0] / SOURCE_Y_UNITS_PER_MM
  });

  const panels = SOURCE_PANELS.map(panel => {
    const warpedLabel = warpPoint(panel.labelPosition, xWarp.warp, yWarp.warp);
    const fontScale = Math.sqrt((L / SOURCE_DEFAULTS.L) * (H / SOURCE_DEFAULTS.H));
    const warpedPanelD = warpPathData(panel.d, xWarp.warp, yWarp.warp);
    const warpedMeshD = warpPathData(panel.meshD, xWarp.warp, yWarp.warp);
    const artworkClipD = ["top", "bottom"].includes(panel.id) ? warpedMeshD : warpedPanelD;
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
      d: artworkClipD,
      meshD: warpedMeshD,
      labelPosition: warpedLabel,
      labelLayout: {
        text: panel.labelText,
        x: warpedLabel[0],
        y: warpedLabel[1],
        fontSize: roundValue(clamp(panel.fontSize * fontScale, 7, 32)),
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
    d: warpPathData(fold.d, xWarp.warp, yWarp.warp),
    angleDeg: fold.angleDeg,
    displayName: fold.displayName
  }));

  const outlineD = warpPathData(SOURCE_OUTLINE_D, xWarp.warp, yWarp.warp);
  const gluePoints = warpPointsString(SOURCE_GLUE_POINTS, xWarp.warp, yWarp.warp);
  const pageW = roundValue(xWarp.warp(694.5));
  const pageH = roundValue(yWarp.warp(678.9));

  const geometry = {
    pageW,
    pageH,
    outlineD,
    slitD: "",
    lockCutoutD: "",
    panels,
    folds,
    foldSequence: CARD_FOLD_SEQUENCE,
    glueAreas: [
      {
        id: "glue-area",
        points: gluePoints
      }
    ],
    rootPanel: "front",
    rootPanels: ["front"],
    floorPanel: "bottom",
    assembledDefaults: CARDBOX_ASSEMBLED_DEFAULTS,
    floorFoldId: "",
    floorFoldDistribution: null,
    flatSheetD: "",
    __cacheKey: JSON.stringify({
      templateId: "cardbox",
      dimensions: {
        L: roundValue(L),
        W: roundValue(W),
        H: roundValue(H),
        TH: roundValue(TH),
        TUCK: roundValue(TUCK),
        GLUE: roundValue(GLUE),
        A: roundValue(A),
        T: roundValue(T),
        R: roundValue(R)
      }
    })
  };

  const metadataJson = buildMetadataJson(
    template,
    geometry,
    { length: L, width: W, height: H },
    {
      thumbHoleWidth: TH,
      tuckFlapSize: TUCK,
      glueFlapSize: GLUE,
      materialThickness: T,
      roundedCornersRadius: R,
      dustFlapAngle: A
    },
    "static/template-builders/cardbox.js"
  );

  return {
    svgText: renderStructuredSvg(template, geometry, metadataJson),
    metadata: metadataJson,
    geometry
  };
}

export default createProceduralTemplateBuilder(TEMPLATE_DEFINITION, buildCardboxGeometry);
