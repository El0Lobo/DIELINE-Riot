import {
  buildMetadataJson,
  clamp,
  createProceduralTemplateBuilder,
  linePath,
  renderStructuredSvg,
  roundValue
} from "./helpers.js";

function labelLayout(text, fontSize, rotationDeg = 0, maxWidth = 0, lineHeight = 1.2) {
  return { text, fontSize, rotationDeg, maxWidth, lineHeight };
}

function createFoldAssemblyStep(foldId) {
  return {
    type: "fold",
    foldId,
    easing: "ease-in-out",
    syncWithPrevious: false
  };
}

function createModelRotationAssemblyStep(axis, angleDeg, objectId = "__all__") {
  return {
    type: "model-rotation",
    objectId,
    axis,
    angleDeg,
    easing: "ease-in-out",
    syncWithPrevious: false
  };
}

function createObjectMoveAssemblyStep(objectId, axis, distanceMm) {
  return {
    type: "object-move",
    objectId,
    axis,
    distanceMm,
    easing: "ease-in-out",
    syncWithPrevious: false
  };
}

const DEFAULT_ASSEMBLY_STEPS = [
  createFoldAssemblyStep("merged-fold-inside-left/lid-left-wall"),
  createFoldAssemblyStep("merged-fold-inside-right/lid-right-wall"),
  createFoldAssemblyStep("merged-fold-outside-flap-4/lid-top-left-corner-flap"),
  createFoldAssemblyStep("merged-fold-outside-flap-3/lid-top-right-corner-flap"),
  createFoldAssemblyStep("merged-fold-outside-flap-1/lid-bottom-left-corner-flap"),
  createFoldAssemblyStep("merged-fold-outside-flap-2/lid-bottom-right-corner-flap"),
  createFoldAssemblyStep("merged-fold-inside-top/lid-top-wall"),
  createFoldAssemblyStep("merged-fold-inside-bottom/lid-bottom-wall"),
  createFoldAssemblyStep("merged-fold-anonymous-path-9/base-left-wall"),
  createFoldAssemblyStep("merged-fold-anonymous-path-7/base-right-wall"),
  createFoldAssemblyStep("merged-fold-anonymous-path-9/base-top-left-corner-flap"),
  createFoldAssemblyStep("merged-fold-anonymous-path-8/base-top-right-corner-flap"),
  createFoldAssemblyStep("merged-fold-anonymous-path-6/base-bottom-left-corner-flap"),
  createFoldAssemblyStep("merged-fold-anonymous-path-7/base-bottom-right-corner-flap"),
  createFoldAssemblyStep("merged-fold-anonymous-path-8/base-top-wall"),
  createFoldAssemblyStep("merged-fold-anonymous-path-10-bottom/base-bottom-wall"),
  createModelRotationAssemblyStep("x", 180, "lid"),
  createObjectMoveAssemblyStep("lid", "z", 107),
  createObjectMoveAssemblyStep("box-base", "x", -28),
  createObjectMoveAssemblyStep("lid", "y", 200),
  createObjectMoveAssemblyStep("lid", "y", 66),
  createObjectMoveAssemblyStep("lid", "z", -74)
];

const TEMPLATE_DEFINITION = {
  id: "box-with-lid",
  name: "Box With Lid",
  icon: "icon-boxlid",
  title: "Box With Lid Template",
  summary: "Structured imported two-part box and lid template, kept as two independent folded pieces.",
  defaults: { L: 170, W: 110, H: 70, LIDH: 40, CLEARANCE: 4, GLUE: 10, A: 45 },
  metadataDimensionMap: {
    L: "length",
    W: "width",
    H: "height",
    LIDH: "lidHeight"
  },
  fieldGroups: {
    primary: [
      { key: "L", label: "Length", kind: "length", min: 1, step: 0.1 },
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 1, step: 0.1 },
      { key: "LIDH", label: "Lid Height", kind: "length", min: 0, step: 0.1 }
    ],
    optional: [
      { key: "CLEARANCE", label: "Clearance (percentage)", kind: "scalar", min: 0, step: 0.1 },
      { key: "GLUE", label: "Glue Flap Size", kind: "length", min: 0, step: 0.1 },
      { key: "A", label: "Glue Flap Angle", kind: "angle", min: 0, max: 89, step: 1 }
    ]
  },
  custom3d: {
    disablePanelCreaseDeformation: true,
    camera: {
      flatView: "top",
      foldedView: "iso",
      flatPadding: 1.12,
      foldedPadding: 1.35,
      foldedTargetOffset: [0.03, -0.03, 0.12]
    }
  },
  panels: [
    { id: "lid-base", displayName: "Lid Base", standardName: "lid-base", type: "panel", isGlue: false, foldParent: null, foldId: null, foldAngleDeg: 0, labelLayout: labelLayout("Lid Base", 18) },
    { id: "lid-top-wall", displayName: "Lid Top Wall", standardName: "lid-top-wall", type: "panel", isGlue: false, foldParent: "lid-base", foldId: "merged-fold-inside-top/lid-top-wall", foldAngleDeg: -90, labelLayout: labelLayout("Lid Top Wall", 11) },
    { id: "lid-bottom-wall", displayName: "Lid Bottom Wall", standardName: "lid-bottom-wall", type: "panel", isGlue: false, foldParent: "lid-base", foldId: "merged-fold-inside-bottom/lid-bottom-wall", foldAngleDeg: 90, labelLayout: labelLayout("Lid Bottom Wall", 11) },
    { id: "lid-left-wall", displayName: "Lid Left Wall", standardName: "lid-left-wall", type: "panel", isGlue: false, foldParent: "lid-base", foldId: "merged-fold-inside-left/lid-left-wall", foldAngleDeg: 90, labelLayout: labelLayout("Lid Left Wall", 11, 90) },
    { id: "lid-right-wall", displayName: "Lid Right Wall", standardName: "lid-right-wall", type: "panel", isGlue: false, foldParent: "lid-base", foldId: "merged-fold-inside-right/lid-right-wall", foldAngleDeg: -90, labelLayout: labelLayout("Lid Right Wall", 11, 270) },
    { id: "lid-top-left-corner-flap", displayName: "Lid Top Left Corner Flap", standardName: "lid-top-left-corner-flap", type: "panel", isGlue: false, foldParent: "lid-left-wall", foldId: "merged-fold-outside-flap-4/lid-top-left-corner-flap", foldAngleDeg: -90, labelLayout: labelLayout("Lid Top Left Corner Flap", 8) },
    { id: "lid-top-right-corner-flap", displayName: "Lid Top Right Corner Flap", standardName: "lid-top-right-corner-flap", type: "panel", isGlue: false, foldParent: "lid-right-wall", foldId: "merged-fold-outside-flap-3/lid-top-right-corner-flap", foldAngleDeg: -90, labelLayout: labelLayout("Lid Top Right Corner Flap", 8) },
    { id: "lid-bottom-left-corner-flap", displayName: "Lid Bottom Left Corner Flap", standardName: "lid-bottom-left-corner-flap", type: "panel", isGlue: false, foldParent: "lid-left-wall", foldId: "merged-fold-outside-flap-1/lid-bottom-left-corner-flap", foldAngleDeg: 90, labelLayout: labelLayout("Lid Bottom Left Corner Flap", 8) },
    { id: "lid-bottom-right-corner-flap", displayName: "Lid Bottom Right Corner Flap", standardName: "lid-bottom-right-corner-flap", type: "panel", isGlue: false, foldParent: "lid-right-wall", foldId: "merged-fold-outside-flap-2/lid-bottom-right-corner-flap", foldAngleDeg: 90, labelLayout: labelLayout("Lid Bottom Right Corner Flap", 8) },
    { id: "base-bottom", displayName: "Box Base", standardName: "base-bottom", type: "panel", isGlue: false, foldParent: null, foldId: null, foldAngleDeg: 0, labelLayout: labelLayout("Box Base", 18) },
    { id: "base-top-wall", displayName: "Base Top Wall", standardName: "base-top-wall", type: "panel", isGlue: false, foldParent: "base-bottom", foldId: "merged-fold-anonymous-path-8/base-top-wall", foldAngleDeg: -90, labelLayout: labelLayout("Base Top Wall", 11) },
    { id: "base-bottom-wall", displayName: "Base Bottom Wall", standardName: "base-bottom-wall", type: "panel", isGlue: false, foldParent: "base-bottom", foldId: "merged-fold-anonymous-path-10-bottom/base-bottom-wall", foldAngleDeg: 90, labelLayout: labelLayout("Base Bottom Wall", 11) },
    { id: "base-left-wall", displayName: "Base Left Wall", standardName: "base-left-wall", type: "panel", isGlue: false, foldParent: "base-bottom", foldId: "merged-fold-anonymous-path-9/base-left-wall", foldAngleDeg: 90, labelLayout: labelLayout("Base Left Wall", 11, 90) },
    { id: "base-right-wall", displayName: "Base Right Wall", standardName: "base-right-wall", type: "panel", isGlue: false, foldParent: "base-bottom", foldId: "merged-fold-anonymous-path-7/base-right-wall", foldAngleDeg: -90, labelLayout: labelLayout("Base Right Wall", 11, 270) },
    { id: "base-top-left-corner-flap", displayName: "Base Top Left Corner Flap", standardName: "base-top-left-corner-flap", type: "panel", isGlue: false, foldParent: "base-left-wall", foldId: "merged-fold-anonymous-path-9/base-top-left-corner-flap", foldAngleDeg: -90, labelLayout: labelLayout("Base Top Left Corner Flap", 8) },
    { id: "base-top-right-corner-flap", displayName: "Base Top Right Corner Flap", standardName: "base-top-right-corner-flap", type: "panel", isGlue: false, foldParent: "base-right-wall", foldId: "merged-fold-anonymous-path-8/base-top-right-corner-flap", foldAngleDeg: -90, labelLayout: labelLayout("Base Top Right Corner Flap", 8) },
    { id: "base-bottom-left-corner-flap", displayName: "Base Bottom Left Corner Flap", standardName: "base-bottom-left-corner-flap", type: "panel", isGlue: false, foldParent: "base-left-wall", foldId: "merged-fold-anonymous-path-6/base-bottom-left-corner-flap", foldAngleDeg: 90, labelLayout: labelLayout("Base Bottom Left Corner Flap", 8) },
    { id: "base-bottom-right-corner-flap", displayName: "Base Bottom Right Corner Flap", standardName: "base-bottom-right-corner-flap", type: "panel", isGlue: false, foldParent: "base-right-wall", foldId: "merged-fold-anonymous-path-7/base-bottom-right-corner-flap", foldAngleDeg: 90, labelLayout: labelLayout("Base Bottom Right Corner Flap", 8) }
  ],
  foldSequence: [
    "merged-fold-inside-left/lid-left-wall",
    "merged-fold-inside-right/lid-right-wall",
    "merged-fold-outside-flap-4/lid-top-left-corner-flap",
    "merged-fold-outside-flap-3/lid-top-right-corner-flap",
    "merged-fold-outside-flap-1/lid-bottom-left-corner-flap",
    "merged-fold-outside-flap-2/lid-bottom-right-corner-flap",
    "merged-fold-inside-top/lid-top-wall",
    "merged-fold-inside-bottom/lid-bottom-wall",
    "merged-fold-anonymous-path-9/base-left-wall",
    "merged-fold-anonymous-path-7/base-right-wall",
    "merged-fold-anonymous-path-9/base-top-left-corner-flap",
    "merged-fold-anonymous-path-8/base-top-right-corner-flap",
    "merged-fold-anonymous-path-6/base-bottom-left-corner-flap",
    "merged-fold-anonymous-path-7/base-bottom-right-corner-flap",
    "merged-fold-anonymous-path-8/base-top-wall",
    "merged-fold-anonymous-path-10-bottom/base-bottom-wall"
  ],
  defaultFoldAngles: {
    "merged-fold-inside-right/lid-right-wall": 90,
    "merged-fold-outside-flap-4/lid-top-left-corner-flap": -90,
    "merged-fold-outside-flap-3/lid-top-right-corner-flap": -90,
    "merged-fold-outside-flap-1/lid-bottom-left-corner-flap": 90,
    "merged-fold-outside-flap-2/lid-bottom-right-corner-flap": 90,
    "merged-fold-anonymous-path-9/base-top-left-corner-flap": -90,
    "merged-fold-anonymous-path-8/base-top-right-corner-flap": -90,
    "merged-fold-anonymous-path-6/base-bottom-left-corner-flap": 90,
    "merged-fold-anonymous-path-7/base-bottom-right-corner-flap": 90,
    "merged-fold-anonymous-path-8/base-top-wall": -90
  },
  defaultAssemblySteps: DEFAULT_ASSEMBLY_STEPS
};

function polygonPath(points) {
  return `M ${points.map(([x, y]) => `${roundValue(x)} ${roundValue(y)}`).join(" L ")} Z`;
}

function openPolylinePath(points) {
  return `M ${points.map(([x, y]) => `${roundValue(x)} ${roundValue(y)}`).join(" L ")}`;
}

function rectPath(x, y, width, height) {
  return polygonPath([
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height]
  ]);
}

function makePanel(definition, d, labelPosition, objectId) {
  return {
    id: definition.id,
    standardName: definition.standardName,
    displayName: definition.displayName,
    label: definition.displayName,
    type: definition.type,
    isGlue: definition.isGlue,
    parent: definition.foldParent,
    foldId: definition.foldId || "",
    angle: definition.foldAngleDeg,
    d,
    meshD: d,
    labelPosition,
    labelLayout: {
      ...definition.labelLayout,
      x: roundValue(labelPosition[0]),
      y: roundValue(labelPosition[1])
    },
    objectId
  };
}

function getDefinitionValue(definitions, panelId, key, fallback) {
  const definition = definitions.get(panelId);
  if (!definition || definition[key] === undefined || definition[key] === null || definition[key] === "") {
    return fallback;
  }
  return definition[key];
}

function buildCornerFlapPoints(side, vertical, x, y, width, height, inset, depth) {
  if (side === "left" && vertical === "top") {
    return [
      [x, y],
      [x + inset, y - depth],
      [x + width - inset, y - depth],
      [x + width, y]
    ];
  }
  if (side === "right" && vertical === "top") {
    return [
      [x, y],
      [x + inset, y - depth],
      [x + width - inset, y - depth],
      [x + width, y]
    ];
  }
  if (side === "left" && vertical === "bottom") {
    return [
      [x, y],
      [x + inset, y + depth],
      [x + width - inset, y + depth],
      [x + width, y]
    ];
  }
  return [
    [x, y],
    [x + inset, y + depth],
    [x + width - inset, y + depth],
    [x + width, y]
  ];
}

function buildObjectGeometry(config) {
  const {
    prefix,
    objectId,
    x,
    y,
    length,
    width,
    wallHeight,
    flapDepth,
    flapInset
  } = config;

  const leftWallX = x - wallHeight;
  const rightWallX = x + length;
  const topWallY = y - wallHeight;
  const bottomWallY = y + width;

  const definitions = new Map(TEMPLATE_DEFINITION.panels.map(panel => [panel.id, panel]));
  const panels = [
    makePanel(definitions.get(`${prefix}-base`) || definitions.get("base-bottom"), rectPath(x, y, length, width), [x + length / 2, y + width / 2], objectId),
    makePanel(definitions.get(`${prefix}-top-wall`) || definitions.get("base-top-wall"), rectPath(x, topWallY, length, wallHeight), [x + length / 2, topWallY + wallHeight / 2], objectId),
    makePanel(definitions.get(`${prefix}-bottom-wall`) || definitions.get("base-bottom-wall"), rectPath(x, bottomWallY, length, wallHeight), [x + length / 2, bottomWallY + wallHeight / 2], objectId),
    makePanel(definitions.get(`${prefix}-left-wall`) || definitions.get("base-left-wall"), rectPath(leftWallX, y, wallHeight, width), [leftWallX + wallHeight / 2, y + width / 2], objectId),
    makePanel(definitions.get(`${prefix}-right-wall`) || definitions.get("base-right-wall"), rectPath(rightWallX, y, wallHeight, width), [rightWallX + wallHeight / 2, y + width / 2], objectId)
  ];

  const topLeftFlapPoints = buildCornerFlapPoints("left", "top", leftWallX, y, wallHeight, width, flapInset, flapDepth);
  const topRightFlapPoints = buildCornerFlapPoints("right", "top", rightWallX, y, wallHeight, width, flapInset, flapDepth);
  const bottomLeftFlapPoints = buildCornerFlapPoints("left", "bottom", leftWallX, y + width, wallHeight, width, flapInset, flapDepth);
  const bottomRightFlapPoints = buildCornerFlapPoints("right", "bottom", rightWallX, y + width, wallHeight, width, flapInset, flapDepth);

  panels.push(
    makePanel(definitions.get(`${prefix}-top-left-corner-flap`) || definitions.get("base-top-left-corner-flap"), polygonPath(topLeftFlapPoints), [leftWallX + wallHeight / 2, y - flapDepth / 2], objectId),
    makePanel(definitions.get(`${prefix}-top-right-corner-flap`) || definitions.get("base-top-right-corner-flap"), polygonPath(topRightFlapPoints), [rightWallX + wallHeight / 2, y - flapDepth / 2], objectId),
    makePanel(definitions.get(`${prefix}-bottom-left-corner-flap`) || definitions.get("base-bottom-left-corner-flap"), polygonPath(bottomLeftFlapPoints), [leftWallX + wallHeight / 2, y + width + flapDepth / 2], objectId),
    makePanel(definitions.get(`${prefix}-bottom-right-corner-flap`) || definitions.get("base-bottom-right-corner-flap"), polygonPath(bottomRightFlapPoints), [rightWallX + wallHeight / 2, y + width + flapDepth / 2], objectId)
  );

  const foldIds = {
    base: prefix === "lid" ? "lid-base" : "base-bottom",
    top: `${prefix}-top-wall`,
    bottom: `${prefix}-bottom-wall`,
    left: `${prefix}-left-wall`,
    right: `${prefix}-right-wall`,
    topLeft: `${prefix}-top-left-corner-flap`,
    topRight: `${prefix}-top-right-corner-flap`,
    bottomLeft: `${prefix}-bottom-left-corner-flap`,
    bottomRight: `${prefix}-bottom-right-corner-flap`
  };

  const folds = [
    {
      id: getDefinitionValue(definitions, foldIds.top, "foldId", ""),
      from: foldIds.base,
      to: foldIds.top,
      d: linePath(x, y, x + length, y),
      angleDeg: getDefinitionValue(definitions, foldIds.top, "foldAngleDeg", 90),
      displayName: `${getDefinitionValue(definitions, foldIds.base, "displayName", foldIds.base)} to ${getDefinitionValue(definitions, foldIds.top, "displayName", foldIds.top)}`
    },
    {
      id: getDefinitionValue(definitions, foldIds.bottom, "foldId", ""),
      from: foldIds.base,
      to: foldIds.bottom,
      d: linePath(x, y + width, x + length, y + width),
      angleDeg: getDefinitionValue(definitions, foldIds.bottom, "foldAngleDeg", 90),
      displayName: `${getDefinitionValue(definitions, foldIds.base, "displayName", foldIds.base)} to ${getDefinitionValue(definitions, foldIds.bottom, "displayName", foldIds.bottom)}`
    },
    {
      id: getDefinitionValue(definitions, foldIds.left, "foldId", ""),
      from: foldIds.base,
      to: foldIds.left,
      d: linePath(x, y, x, y + width),
      angleDeg: getDefinitionValue(definitions, foldIds.left, "foldAngleDeg", 90),
      displayName: `${getDefinitionValue(definitions, foldIds.base, "displayName", foldIds.base)} to ${getDefinitionValue(definitions, foldIds.left, "displayName", foldIds.left)}`
    },
    {
      id: getDefinitionValue(definitions, foldIds.right, "foldId", ""),
      from: foldIds.base,
      to: foldIds.right,
      d: linePath(x + length, y, x + length, y + width),
      angleDeg: getDefinitionValue(definitions, foldIds.right, "foldAngleDeg", 90),
      displayName: `${getDefinitionValue(definitions, foldIds.base, "displayName", foldIds.base)} to ${getDefinitionValue(definitions, foldIds.right, "displayName", foldIds.right)}`
    },
    {
      id: getDefinitionValue(definitions, foldIds.topLeft, "foldId", ""),
      from: foldIds.left,
      to: foldIds.topLeft,
      d: linePath(leftWallX, y, x, y),
      angleDeg: getDefinitionValue(definitions, foldIds.topLeft, "foldAngleDeg", 90),
      displayName: `${getDefinitionValue(definitions, foldIds.left, "displayName", foldIds.left)} to ${getDefinitionValue(definitions, foldIds.topLeft, "displayName", foldIds.topLeft)}`
    },
    {
      id: getDefinitionValue(definitions, foldIds.topRight, "foldId", ""),
      from: foldIds.right,
      to: foldIds.topRight,
      d: linePath(rightWallX, y, rightWallX + wallHeight, y),
      angleDeg: getDefinitionValue(definitions, foldIds.topRight, "foldAngleDeg", 90),
      displayName: `${getDefinitionValue(definitions, foldIds.right, "displayName", foldIds.right)} to ${getDefinitionValue(definitions, foldIds.topRight, "displayName", foldIds.topRight)}`
    },
    {
      id: getDefinitionValue(definitions, foldIds.bottomLeft, "foldId", ""),
      from: foldIds.left,
      to: foldIds.bottomLeft,
      d: linePath(leftWallX, y + width, x, y + width),
      angleDeg: getDefinitionValue(definitions, foldIds.bottomLeft, "foldAngleDeg", 90),
      displayName: `${getDefinitionValue(definitions, foldIds.left, "displayName", foldIds.left)} to ${getDefinitionValue(definitions, foldIds.bottomLeft, "displayName", foldIds.bottomLeft)}`
    },
    {
      id: getDefinitionValue(definitions, foldIds.bottomRight, "foldId", ""),
      from: foldIds.right,
      to: foldIds.bottomRight,
      d: linePath(rightWallX, y + width, rightWallX + wallHeight, y + width),
      angleDeg: getDefinitionValue(definitions, foldIds.bottomRight, "foldAngleDeg", 90),
      displayName: `${getDefinitionValue(definitions, foldIds.right, "displayName", foldIds.right)} to ${getDefinitionValue(definitions, foldIds.bottomRight, "displayName", foldIds.bottomRight)}`
    }
  ].filter(fold => fold.id);

  const cutPaths = [
    { id: `cut-${prefix}-top-wall`, d: openPolylinePath([[x, y], [x, topWallY], [x + length, topWallY], [x + length, y]]), type: "cut" },
    { id: `cut-${prefix}-bottom-wall`, d: openPolylinePath([[x + length, y + width], [x + length, bottomWallY + wallHeight], [x, bottomWallY + wallHeight], [x, y + width]]), type: "cut" },
    { id: `cut-${prefix}-left-wall`, d: linePath(leftWallX, y, leftWallX, y + width), type: "cut" },
    { id: `cut-${prefix}-right-wall`, d: linePath(rightWallX + wallHeight, y, rightWallX + wallHeight, y + width), type: "cut" },
    { id: `cut-${prefix}-top-left-flap`, d: openPolylinePath(topLeftFlapPoints), type: "cut" },
    { id: `cut-${prefix}-top-right-flap`, d: openPolylinePath(topRightFlapPoints), type: "cut" },
    { id: `cut-${prefix}-bottom-left-flap`, d: openPolylinePath(bottomLeftFlapPoints), type: "cut" },
    { id: `cut-${prefix}-bottom-right-flap`, d: openPolylinePath(bottomRightFlapPoints), type: "cut" }
  ];

  return {
    panels,
    folds,
    cutPaths,
    bounds: {
      minX: leftWallX,
      maxX: rightWallX + wallHeight,
      minY: topWallY,
      maxY: bottomWallY + wallHeight
    }
  };
}

function buildBoxWithLidGeometry(params, template) {
  const L = Math.max(1, Number(params.L) || template.defaults.L);
  const W = Math.max(1, Number(params.W) || template.defaults.W);
  const H = Math.max(0.1, Number(params.H) || template.defaults.H);
  const LIDH = Math.max(0, Number(params.LIDH) || template.defaults.LIDH);
  const CLEARANCE = Math.max(0, Number(params.CLEARANCE) || template.defaults.CLEARANCE);
  const GLUE = Math.max(0, Number(params.GLUE) || template.defaults.GLUE);
  const A = clamp(Number(params.A) || template.defaults.A, 0, 89);

  const lidLength = roundValue(L * (1 + CLEARANCE / 100));
  const lidWidth = roundValue(W * (1 + CLEARANCE / 100));
  const lidWallHeight = roundValue(LIDH);
  const baseWallHeight = roundValue(H);
  const lidFlapDepth = roundValue(Math.min(GLUE, Math.max(0, lidWallHeight)));
  const baseFlapDepth = roundValue(Math.min(GLUE, Math.max(0, baseWallHeight)));
  const flapInsetFactor = Math.tan((Math.max(1, A) * Math.PI) / 180);
  const lidFlapInset = roundValue(Math.min(lidWallHeight / 2, flapInsetFactor > 0 ? lidFlapDepth / flapInsetFactor : lidFlapDepth));
  const baseFlapInset = roundValue(Math.min(baseWallHeight / 2, flapInsetFactor > 0 ? baseFlapDepth / flapInsetFactor : baseFlapDepth));

  const margin = 20;
  const gap = Math.max(20, Math.max(H, LIDH) * 0.5);
  const lidX = margin + lidWallHeight;
  const lidY = margin + lidWallHeight;

  const lidGeometry = buildObjectGeometry({
    prefix: "lid",
    objectId: "lid",
    x: lidX,
    y: lidY,
    length: lidLength,
    width: lidWidth,
    wallHeight: lidWallHeight,
    flapDepth: lidFlapDepth,
    flapInset: lidFlapInset
  });

  const baseX = margin + baseWallHeight;
  const baseY = lidGeometry.bounds.maxY + lidFlapDepth + gap + baseWallHeight;
  const baseGeometry = buildObjectGeometry({
    prefix: "base",
    objectId: "box-base",
    x: baseX,
    y: baseY,
    length: L,
    width: W,
    wallHeight: baseWallHeight,
    flapDepth: baseFlapDepth,
    flapInset: baseFlapInset
  });

  const pageW = roundValue(Math.max(lidGeometry.bounds.maxX, baseGeometry.bounds.maxX) + margin);
  const pageH = roundValue(baseGeometry.bounds.maxY + baseFlapDepth + margin);

  const geometry = {
    pageW,
    pageH,
    outlineD: "",
    slitD: "",
    lockCutoutD: "",
    panels: [...lidGeometry.panels, ...baseGeometry.panels],
    folds: [...lidGeometry.folds, ...baseGeometry.folds],
    foldSequence: TEMPLATE_DEFINITION.foldSequence,
    defaultAssemblySteps: TEMPLATE_DEFINITION.defaultAssemblySteps.map(step => ({ ...step })),
    glueAreas: [],
    cutPaths: [...lidGeometry.cutPaths, ...baseGeometry.cutPaths],
    rootPanel: "lid-base",
    rootPanels: ["lid-base", "base-bottom"],
    floorPanel: "base-bottom",
    floorFoldId: "",
    floorFoldDistribution: null,
    flatSheetD: "",
    __cacheKey: JSON.stringify({
      templateId: "box-with-lid",
      dimensions: {
        L: roundValue(L),
        W: roundValue(W),
        H: roundValue(H),
        LIDH: roundValue(LIDH),
        CLEARANCE: roundValue(CLEARANCE),
        GLUE: roundValue(GLUE),
        A: roundValue(A)
      }
    })
  };

  const metadataJson = buildMetadataJson(
    template,
    geometry,
    { length: L, width: W, height: H, lidHeight: LIDH },
    {
      glueFlapSize: GLUE,
      overlap: CLEARANCE,
      dustFlapAngle: A
    },
    "static/template-builders/box-with-lid.js"
  );

  metadataJson.nominalDimensions.lidHeightMm = roundValue(LIDH);
  metadataJson.nominalDimensions.overlapMm = roundValue(CLEARANCE);

  return {
    svgText: renderStructuredSvg(template, geometry, metadataJson),
    metadata: metadataJson,
    geometry
  };
}

export default createProceduralTemplateBuilder(TEMPLATE_DEFINITION, buildBoxWithLidGeometry);
