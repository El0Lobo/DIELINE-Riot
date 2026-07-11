import {
  buildMetadataJson,
  clamp,
  createProceduralTemplateBuilder,
  linePath,
  renderStructuredSvg,
  roundValue
} from "./helpers.js";

const SOURCE_UNIT = 72 / 25.4;
const SOURCE_DEFAULTS = {
  L: 70,
  W: 40,
  H: 10,
  T: 0.5,
  CLEARANCE: 2,
  GLUE: 10,
  A: 85
};

function mm(value) {
  return roundValue(value * SOURCE_UNIT);
}

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
  createFoldAssemblyStep("fold-drawer-base-to-right-wall"),
  createFoldAssemblyStep("fold-drawer-base-to-left-wall"),
  createFoldAssemblyStep("fold-drawer-right-wall-to-back-glue-flap"),
  createFoldAssemblyStep("fold-drawer-right-wall-to-front-glue-flap"),
  createFoldAssemblyStep("fold-drawer-left-wall-to-back-glue-flap"),
  createFoldAssemblyStep("fold-drawer-left-wall-to-front-glue-flap"),
  createFoldAssemblyStep("fold-drawer-base-to-back-wall"),
  createFoldAssemblyStep("fold-drawer-base-to-front-wall"),
  createFoldAssemblyStep("fold-drawer-back-wall-to-back-return"),
  createFoldAssemblyStep("fold-drawer-front-wall-to-front-return"),
  createFoldAssemblyStep("fold-sleeve-panel-1-to-panel-2"),
  createFoldAssemblyStep("fold-sleeve-panel-2-to-panel-3"),
  createFoldAssemblyStep("fold-sleeve-panel-4-to-glue-flap"),
  createFoldAssemblyStep("fold-sleeve-panel-3-to-panel-4"),
  createModelRotationAssemblyStep("z", 90, "drawer"),
  createObjectMoveAssemblyStep("drawer", "x", -160),
  createObjectMoveAssemblyStep("drawer", "z", -33),
  createObjectMoveAssemblyStep("drawer", "y", 200),
  createObjectMoveAssemblyStep("sleeve", "y", -55)
];

const MATCHBOX_ASSEMBLED_DEFAULTS = {
  viewName: "custom",
  modelCenter: [0, 0, 21.077],
  cameraPosition: [335.011, -507.251, 322.746],
  cameraTarget: [0, 0, 0.981],
  cameraOffset: [335.011, -507.251, 301.67],
  targetOffset: [0, 0, -20.096]
};

function polygonPath(points) {
  return `M ${points.map(([x, y]) => `${roundValue(x)} ${roundValue(y)}`).join(" L ")} Z`;
}

function bboxCenter(points) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [roundValue((minX + maxX) * 0.5), roundValue((minY + maxY) * 0.5)];
}

function measurePathBounds(pathDataList) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const d of pathDataList) {
    const numbers = String(d || "").match(/-?\d*\.?\d+/g);
    if (!numbers || !numbers.length) {
      continue;
    }
    for (let index = 0; index < numbers.length; index += 2) {
      const x = Number(numbers[index]);
      const y = Number(numbers[index + 1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { minX, minY, maxX, maxY };
}

function panelFromPoints(definition, points, objectId, overrides = {}) {
  const labelPosition = overrides.labelPosition || bboxCenter(points);
  return {
    id: definition.id,
    standardName: definition.standardName,
    displayName: definition.displayName,
    label: definition.labelLayout?.text || definition.displayName,
    type: definition.type,
    isGlue: definition.isGlue,
    parent: definition.foldParent,
    foldId: definition.foldId || "",
    angle: definition.foldAngleDeg,
    d: polygonPath(points),
    meshD: polygonPath(overrides.meshPoints || points),
    labelPosition,
    labelLayout: {
      ...(definition.labelLayout || labelLayout(definition.displayName, 6)),
      x: labelPosition[0],
      y: labelPosition[1]
    },
    objectId,
    cutoutD: overrides.cutoutD || "",
    slitCutD: overrides.slitCutD || ""
  };
}

const TEMPLATE_DEFINITION = {
  id: "matchbox",
  name: "Matchbox",
  icon: "icon-matchbox",
  title: "Matchbox Template",
  summary: "Procedural two-part matchbox with a folded drawer, outer sleeve, and thickness-based lock slits.",
  defaults: { ...SOURCE_DEFAULTS },
  metadataDimensionMap: {
    L: "length",
    W: "width",
    H: "height"
  },
  fieldGroups: {
    primary: [
      { key: "L", label: "Length", kind: "length", min: 1, step: 0.1 },
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 0.1, step: 0.1 },
      { key: "CLEARANCE", label: "Clearance", kind: "length", min: 0, step: 0.1 }
    ],
    optional: [
      { key: "GLUE", label: "Glue Flap Size", kind: "length", min: 0, step: 0.1 },
      { key: "A", label: "Glue Flap Angle", kind: "angle", min: 0, max: 89, step: 1 },
      { key: "T", label: "Material Thickness", kind: "length", min: 0, step: 0.1 }
    ]
  },
  parametricRule: { xKeys: ["H", "L", "H", "GLUE", "CLEARANCE"], yKeys: ["H", "W", "H", "L"] },
  custom3d: {
    disablePanelCreaseDeformation: true,
    camera: {
      flatView: "top",
      foldedView: "iso",
      flatPadding: 1.14,
      foldedPadding: 1.34,
      foldedTargetOffset: [0.02, -0.02, 0.12]
    },
    excludePanelIds: [
      "drawer-front-left-glue-flap",
      "drawer-front-right-glue-flap",
      "drawer-back-right-glue-flap",
      "drawer-back-left-glue-flap"
    ]
  },
  floorPanelsByObject: {
    drawer: "drawer-base",
    sleeve: "sleeve-panel-4"
  },
  panels: [
    { id: "drawer-base", displayName: "Drawer Base", standardName: "drawer-base", type: "panel", isGlue: false, foldParent: null, foldId: null, foldAngleDeg: 0, labelLayout: labelLayout("Drawer Base", 10) },
    { id: "drawer-front-wall", displayName: "Drawer Front Wall", standardName: "drawer-front-wall", type: "panel", isGlue: false, foldParent: "drawer-base", foldId: "fold-drawer-base-to-front-wall", foldAngleDeg: -90, labelLayout: labelLayout("Drawer Front Wall", 6) },
    { id: "drawer-back-wall", displayName: "Drawer Back Wall", standardName: "drawer-back-wall", type: "panel", isGlue: false, foldParent: "drawer-base", foldId: "fold-drawer-base-to-back-wall", foldAngleDeg: 90, labelLayout: labelLayout("Drawer Back Wall", 6) },
    { id: "drawer-left-wall", displayName: "Drawer Left Wall", standardName: "drawer-left-wall", type: "panel", isGlue: false, foldParent: "drawer-base", foldId: "fold-drawer-base-to-left-wall", foldAngleDeg: 90, labelLayout: labelLayout("Drawer Left Wall", 5) },
    { id: "drawer-right-wall", displayName: "Drawer Right Wall", standardName: "drawer-right-wall", type: "panel", isGlue: false, foldParent: "drawer-base", foldId: "fold-drawer-base-to-right-wall", foldAngleDeg: 90, labelLayout: labelLayout("Drawer Right Wall", 5) },
    { id: "drawer-front-double-wall", displayName: "Drawer Front Return", standardName: "drawer-front-double-wall", type: "panel", isGlue: false, foldParent: "drawer-front-wall", foldId: "fold-drawer-front-wall-to-front-return", foldAngleDeg: 180, labelLayout: labelLayout("Drawer Front Return", 5) },
    { id: "drawer-back-double-wall", displayName: "Drawer Back Return", standardName: "drawer-back-double-wall", type: "panel", isGlue: false, foldParent: "drawer-back-wall", foldId: "fold-drawer-back-wall-to-back-return", foldAngleDeg: 180, labelLayout: labelLayout("Drawer Back Return", 5) },
    { id: "drawer-front-left-glue-flap", displayName: "Drawer Front Glue Flap", standardName: "drawer-front-left-glue-flap", type: "glue-flap", isGlue: true, foldParent: "drawer-left-wall", foldId: "fold-drawer-left-wall-to-front-glue-flap", foldAngleDeg: 0, labelLayout: labelLayout("Drawer Front\nGlue Flap", 4) },
    { id: "drawer-front-right-glue-flap", displayName: "Drawer Front Glue Flap", standardName: "drawer-front-right-glue-flap", type: "glue-flap", isGlue: true, foldParent: "drawer-right-wall", foldId: "fold-drawer-right-wall-to-front-glue-flap", foldAngleDeg: 0, labelLayout: labelLayout("Drawer Front\nGlue Flap", 4) },
    { id: "drawer-back-right-glue-flap", displayName: "Drawer Back Glue Flap", standardName: "drawer-back-right-glue-flap", type: "glue-flap", isGlue: true, foldParent: "drawer-right-wall", foldId: "fold-drawer-right-wall-to-back-glue-flap", foldAngleDeg: 0, labelLayout: labelLayout("Drawer Back\nGlue Flap", 4) },
    { id: "drawer-back-left-glue-flap", displayName: "Drawer Back Glue Flap", standardName: "drawer-back-left-glue-flap", type: "glue-flap", isGlue: true, foldParent: "drawer-left-wall", foldId: "fold-drawer-left-wall-to-back-glue-flap", foldAngleDeg: 0, labelLayout: labelLayout("Drawer Back\nGlue Flap", 4) },
    { id: "sleeve-panel-1", displayName: "Sleeve Side Wall", standardName: "sleeve-panel-1", type: "panel", isGlue: false, foldParent: null, foldId: null, foldAngleDeg: 0, labelLayout: labelLayout("Sleeve Side Wall", 6, 90) },
    { id: "sleeve-panel-2", displayName: "Sleeve Front Face", standardName: "sleeve-panel-2", type: "panel", isGlue: false, foldParent: "sleeve-panel-1", foldId: "fold-sleeve-panel-1-to-panel-2", foldAngleDeg: 90, labelLayout: labelLayout("Sleeve Front Face", 8, 90) },
    { id: "sleeve-panel-3", displayName: "Sleeve Side Wall", standardName: "sleeve-panel-3", type: "panel", isGlue: false, foldParent: "sleeve-panel-2", foldId: "fold-sleeve-panel-2-to-panel-3", foldAngleDeg: -90, labelLayout: labelLayout("Sleeve Side Wall", 6, 90) },
    { id: "sleeve-panel-4", displayName: "Sleeve Back Face", standardName: "sleeve-panel-4", type: "panel", isGlue: false, foldParent: "sleeve-panel-3", foldId: "fold-sleeve-panel-3-to-panel-4", foldAngleDeg: 90, labelLayout: labelLayout("Sleeve Back Face", 8, 90) },
    { id: "sleeve-glue-flap", displayName: "Sleeve Glue Flap", standardName: "sleeve-glue-flap", type: "glue-flap", isGlue: true, foldParent: "sleeve-panel-4", foldId: "fold-sleeve-panel-4-to-glue-flap", foldAngleDeg: -90, labelLayout: labelLayout("Sleeve Glue Flap", 5, 90) }
  ],
  foldSequence: [
    "fold-drawer-base-to-right-wall",
    "fold-drawer-base-to-left-wall",
    "fold-drawer-right-wall-to-back-glue-flap",
    "fold-drawer-right-wall-to-front-glue-flap",
    "fold-drawer-left-wall-to-back-glue-flap",
    "fold-drawer-left-wall-to-front-glue-flap",
    "fold-drawer-base-to-back-wall",
    "fold-drawer-base-to-front-wall",
    "fold-drawer-back-wall-to-back-return",
    "fold-drawer-front-wall-to-front-return",
    "fold-sleeve-panel-1-to-panel-2",
    "fold-sleeve-panel-2-to-panel-3",
    "fold-sleeve-panel-4-to-glue-flap",
    "fold-sleeve-panel-3-to-panel-4"
  ],
  defaultAssemblySteps: DEFAULT_ASSEMBLY_STEPS
};

function buildMatchboxGeometry(params, template) {
  const L = Math.max(1, Number(params.L) || template.defaults.L);
  const W = Math.max(1, Number(params.W) || template.defaults.W);
  const H = Math.max(0.1, Number(params.H) || template.defaults.H);
  const T = Math.max(0, Number(params.T) || template.defaults.T);
  const CLEARANCE = Math.max(0, Number(params.CLEARANCE) || template.defaults.CLEARANCE);
  const GLUE = Math.max(0, Number(params.GLUE) || template.defaults.GLUE);
  const A = clamp(Number(params.A) || template.defaults.A, 0, 89);

  const definitions = new Map(template.panels.map(panel => [panel.id, panel]));

  const marginMm = 25;
  const gapMm = 25;

  const baseX = mm(marginMm + (2 * H) + (4 * T));
  const baseY = mm(marginMm + H);
  const baseRightX = roundValue(baseX + mm(L));
  const baseBottomY = roundValue(baseY + mm(W));

  const wallDepth = mm(H);
  const wallSpan = mm(L - T);
  const wallTopY = mm(marginMm);
  const wallBottomY = baseBottomY;
  const wallPanelBottomY = roundValue(baseBottomY + wallDepth);
  const wallPanelX = roundValue(baseX + mm(T * 0.5));
  const bevel = mm(T);
  const returnDepth = mm(H + T);
  const bumpDepth = mm(3 * T);
  const doubleFoldInset = mm(T * 0.5);
  const slitInset = mm(W / 3);
  const slitDepth = mm(2 * T);

  const drawerFrontWallPoints = [
    [baseRightX, baseY],
    [roundValue(baseRightX + wallDepth), baseY],
    [roundValue(baseRightX + wallDepth + bevel), roundValue(baseY + bevel)],
    [roundValue(baseRightX + wallDepth + bevel + returnDepth), roundValue(baseY + bevel)],
    [roundValue(baseRightX + wallDepth + bevel + returnDepth), roundValue(baseY + slitInset)],
    [roundValue(baseRightX + wallDepth + bevel + returnDepth + bumpDepth), roundValue(baseY + slitInset)],
    [roundValue(baseRightX + wallDepth + bevel + returnDepth + bumpDepth), roundValue(baseBottomY - slitInset)],
    [roundValue(baseRightX + wallDepth + bevel + returnDepth), roundValue(baseBottomY - slitInset)],
    [roundValue(baseRightX + wallDepth + bevel + returnDepth), roundValue(baseBottomY - bevel)],
    [roundValue(baseRightX + wallDepth + bevel), roundValue(baseBottomY - bevel)],
    [roundValue(baseRightX + wallDepth), baseBottomY],
    [baseRightX, baseBottomY]
  ];
  const drawerFrontWallMeshPoints = [
    [baseRightX, baseY],
    [roundValue(baseRightX + wallDepth), baseY],
    [roundValue(baseRightX + wallDepth), baseBottomY],
    [baseRightX, baseBottomY]
  ];
  const drawerBackWallPoints = [
    [baseX, baseY],
    [roundValue(baseX - wallDepth), baseY],
    [roundValue(baseX - wallDepth - bevel), roundValue(baseY + bevel)],
    [roundValue(baseX - wallDepth - bevel - returnDepth), roundValue(baseY + bevel)],
    [roundValue(baseX - wallDepth - bevel - returnDepth), roundValue(baseY + slitInset)],
    [roundValue(baseX - wallDepth - bevel - returnDepth - bumpDepth), roundValue(baseY + slitInset)],
    [roundValue(baseX - wallDepth - bevel - returnDepth - bumpDepth), roundValue(baseBottomY - slitInset)],
    [roundValue(baseX - wallDepth - bevel - returnDepth), roundValue(baseBottomY - slitInset)],
    [roundValue(baseX - wallDepth - bevel - returnDepth), roundValue(baseBottomY - bevel)],
    [roundValue(baseX - wallDepth - bevel), roundValue(baseBottomY - bevel)],
    [roundValue(baseX - wallDepth), baseBottomY],
    [baseX, baseBottomY]
  ];
  const drawerBackWallMeshPoints = [
    [roundValue(baseX - wallDepth), baseY],
    [baseX, baseY],
    [baseX, baseBottomY],
    [roundValue(baseX - wallDepth), baseBottomY]
  ];

  const drawerFrontReturnPoints = [
    [roundValue(baseRightX + wallDepth + doubleFoldInset), roundValue(baseY + doubleFoldInset)],
    [roundValue(baseRightX + wallDepth + bevel + returnDepth), roundValue(baseY + bevel)],
    [roundValue(baseRightX + wallDepth + bevel + returnDepth), roundValue(baseY + slitInset)],
    [roundValue(baseRightX + wallDepth + bevel + returnDepth + bumpDepth), roundValue(baseY + slitInset)],
    [roundValue(baseRightX + wallDepth + bevel + returnDepth + bumpDepth), roundValue(baseBottomY - slitInset)],
    [roundValue(baseRightX + wallDepth + bevel + returnDepth), roundValue(baseBottomY - slitInset)],
    [roundValue(baseRightX + wallDepth + bevel + returnDepth), roundValue(baseBottomY - bevel)],
    [roundValue(baseRightX + wallDepth + doubleFoldInset), roundValue(baseBottomY - doubleFoldInset)]
  ];
  const drawerBackReturnPoints = [
    [roundValue(baseX - wallDepth - doubleFoldInset), roundValue(baseY + doubleFoldInset)],
    [roundValue(baseX - wallDepth - bevel - returnDepth), roundValue(baseY + bevel)],
    [roundValue(baseX - wallDepth - bevel - returnDepth), roundValue(baseY + slitInset)],
    [roundValue(baseX - wallDepth - bevel - returnDepth - bumpDepth), roundValue(baseY + slitInset)],
    [roundValue(baseX - wallDepth - bevel - returnDepth - bumpDepth), roundValue(baseBottomY - slitInset)],
    [roundValue(baseX - wallDepth - bevel - returnDepth), roundValue(baseBottomY - slitInset)],
    [roundValue(baseX - wallDepth - bevel - returnDepth), roundValue(baseBottomY - bevel)],
    [roundValue(baseX - wallDepth - doubleFoldInset), roundValue(baseBottomY - doubleFoldInset)]
  ];

  const drawerFrontSlitD = linePath(baseRightX, baseBottomY - slitInset, baseRightX - slitDepth, baseBottomY - slitInset)
    + ` L ${roundValue(baseRightX - slitDepth)} ${roundValue(baseY + slitInset)}`
    + ` L ${baseRightX} ${roundValue(baseY + slitInset)}`;
  const drawerBackSlitD = linePath(baseX, baseY + slitInset, baseX + slitDepth, baseY + slitInset)
    + ` L ${roundValue(baseX + slitDepth)} ${roundValue(baseBottomY - slitInset)}`
    + ` L ${baseX} ${roundValue(baseBottomY - slitInset)}`;
  const drawerPanels = [
    panelFromPoints(definitions.get("drawer-base"), [
      [baseX, baseY],
      [baseRightX, baseY],
      [baseRightX, baseBottomY],
      [baseX, baseBottomY]
    ], "drawer"),
    panelFromPoints(definitions.get("drawer-front-wall"), drawerFrontWallPoints, "drawer", {
      meshPoints: drawerFrontWallMeshPoints,
      slitCutD: drawerFrontSlitD
    }),
    panelFromPoints(definitions.get("drawer-back-wall"), drawerBackWallPoints, "drawer", {
      meshPoints: drawerBackWallMeshPoints,
      slitCutD: drawerBackSlitD
    }),
    panelFromPoints(definitions.get("drawer-left-wall"), [
      [wallPanelX, baseBottomY],
      [roundValue(wallPanelX + wallSpan), baseBottomY],
      [roundValue(wallPanelX + wallSpan), wallPanelBottomY],
      [wallPanelX, wallPanelBottomY]
    ], "drawer"),
    panelFromPoints(definitions.get("drawer-right-wall"), [
      [wallPanelX, wallTopY],
      [roundValue(wallPanelX + wallSpan), wallTopY],
      [roundValue(wallPanelX + wallSpan), baseY],
      [wallPanelX, baseY]
    ], "drawer"),
    panelFromPoints(definitions.get("drawer-front-double-wall"), drawerFrontReturnPoints, "drawer"),
    panelFromPoints(definitions.get("drawer-back-double-wall"), drawerBackReturnPoints, "drawer"),
    panelFromPoints(definitions.get("drawer-front-left-glue-flap"), [
      [roundValue(baseRightX - mm(T * 0.5)), baseBottomY],
      [roundValue(baseRightX - mm(T * 0.5) + wallDepth), baseBottomY],
      [roundValue(baseRightX - mm(T * 0.5) + wallDepth), wallPanelBottomY],
      [roundValue(baseRightX - mm(T * 0.5)), wallPanelBottomY]
    ], "drawer"),
    panelFromPoints(definitions.get("drawer-front-right-glue-flap"), [
      [roundValue(baseRightX - mm(T * 0.5)), wallTopY],
      [roundValue(baseRightX - mm(T * 0.5) + wallDepth), wallTopY],
      [roundValue(baseRightX - mm(T * 0.5) + wallDepth), baseY],
      [roundValue(baseRightX - mm(T * 0.5)), baseY]
    ], "drawer"),
    panelFromPoints(definitions.get("drawer-back-right-glue-flap"), [
      [roundValue(baseX + mm(T * 0.5) - wallDepth), wallTopY],
      [roundValue(baseX + mm(T * 0.5)), wallTopY],
      [roundValue(baseX + mm(T * 0.5)), baseY],
      [roundValue(baseX + mm(T * 0.5) - wallDepth), baseY]
    ], "drawer"),
    panelFromPoints(definitions.get("drawer-back-left-glue-flap"), [
      [roundValue(baseX + mm(T * 0.5) - wallDepth), baseBottomY],
      [roundValue(baseX + mm(T * 0.5)), baseBottomY],
      [roundValue(baseX + mm(T * 0.5)), wallPanelBottomY],
      [roundValue(baseX + mm(T * 0.5) - wallDepth), wallPanelBottomY]
    ], "drawer")
  ];

  const sleeveY = mm(marginMm + (2 * H) + W + gapMm);
  const sleeveBottomY = roundValue(sleeveY + mm(L));
  const sleeveSide = mm(H + (2 * CLEARANCE));
  const sleeveFace = mm(W + (2 * CLEARANCE));
  const sleeveGlueSkew = mm(GLUE * Math.tan(((90 - A) * Math.PI) / 180));

  const sleeveX1 = mm(marginMm);
  const sleeveX2 = roundValue(sleeveX1 + sleeveSide);
  const sleeveX3 = roundValue(sleeveX2 + sleeveFace);
  const sleeveX4 = roundValue(sleeveX3 + sleeveSide);
  const sleeveX5 = roundValue(sleeveX4 + sleeveFace);
  const sleeveX6 = roundValue(sleeveX5 + mm(GLUE));

  const sleevePanels = [
    panelFromPoints(definitions.get("sleeve-panel-1"), [
      [sleeveX1, sleeveY],
      [sleeveX2, sleeveY],
      [sleeveX2, sleeveBottomY],
      [sleeveX1, sleeveBottomY]
    ], "sleeve"),
    panelFromPoints(definitions.get("sleeve-panel-2"), [
      [sleeveX2, sleeveY],
      [sleeveX3, sleeveY],
      [sleeveX3, sleeveBottomY],
      [sleeveX2, sleeveBottomY]
    ], "sleeve"),
    panelFromPoints(definitions.get("sleeve-panel-3"), [
      [sleeveX3, sleeveY],
      [sleeveX4, sleeveY],
      [sleeveX4, sleeveBottomY],
      [sleeveX3, sleeveBottomY]
    ], "sleeve"),
    panelFromPoints(definitions.get("sleeve-panel-4"), [
      [sleeveX4, sleeveY],
      [sleeveX5, sleeveY],
      [sleeveX5, sleeveBottomY],
      [sleeveX4, sleeveBottomY]
    ], "sleeve"),
    panelFromPoints(definitions.get("sleeve-glue-flap"), [
      [sleeveX5, sleeveY],
      [sleeveX6, roundValue(sleeveY + sleeveGlueSkew)],
      [sleeveX6, roundValue(sleeveBottomY - sleeveGlueSkew)],
      [sleeveX5, sleeveBottomY]
    ], "sleeve")
  ];

  const folds = [
    {
      id: "fold-drawer-base-to-front-wall",
      from: "drawer-base",
      to: "drawer-front-wall",
      d: `${linePath(baseRightX, baseBottomY, baseRightX, roundValue(baseBottomY - slitInset))} ${linePath(baseRightX, roundValue(baseY + slitInset), baseRightX, baseY)}`,
      hingeD: linePath(baseRightX, baseBottomY, baseRightX, baseY),
      angleDeg: -90,
      displayName: "Drawer Base to Drawer Front Wall"
    },
    {
      id: "fold-drawer-base-to-back-wall",
      from: "drawer-base",
      to: "drawer-back-wall",
      d: `${linePath(baseX, baseY, baseX, roundValue(baseY + slitInset))} ${linePath(baseX, roundValue(baseBottomY - slitInset), baseX, baseBottomY)}`,
      hingeD: linePath(baseX, baseY, baseX, baseBottomY),
      angleDeg: 90,
      displayName: "Drawer Base to Drawer Back Wall"
    },
    { id: "fold-drawer-base-to-left-wall", from: "drawer-base", to: "drawer-left-wall", d: linePath(baseX, baseBottomY, baseRightX, baseBottomY), angleDeg: 90, displayName: "Drawer Base to Drawer Left Wall" },
    { id: "fold-drawer-base-to-right-wall", from: "drawer-base", to: "drawer-right-wall", d: linePath(baseRightX, baseY, baseX, baseY), angleDeg: 90, displayName: "Drawer Base to Drawer Right Wall" },
    { id: "fold-drawer-front-wall-to-front-return", from: "drawer-front-wall", to: "drawer-front-double-wall", d: linePath(roundValue(baseRightX + wallDepth + doubleFoldInset), roundValue(baseY + doubleFoldInset), roundValue(baseRightX + wallDepth + doubleFoldInset), roundValue(baseBottomY - doubleFoldInset)), angleDeg: -180, displayName: "Drawer Front Wall to Drawer Front Return" },
    { id: "fold-drawer-back-wall-to-back-return", from: "drawer-back-wall", to: "drawer-back-double-wall", d: linePath(roundValue(baseX - wallDepth - doubleFoldInset), roundValue(baseBottomY - doubleFoldInset), roundValue(baseX - wallDepth - doubleFoldInset), roundValue(baseY + doubleFoldInset)), angleDeg: -180, displayName: "Drawer Back Wall to Drawer Back Return" },
    { id: "fold-drawer-left-wall-to-front-glue-flap", from: "drawer-left-wall", to: "drawer-front-left-glue-flap", d: linePath(roundValue(baseRightX - mm(T * 0.5)), wallPanelBottomY, roundValue(baseRightX - mm(T * 0.5)), baseBottomY), angleDeg: 0, displayName: "Drawer Left Wall to Drawer Front Glue Flap" },
    { id: "fold-drawer-right-wall-to-front-glue-flap", from: "drawer-right-wall", to: "drawer-front-right-glue-flap", d: linePath(roundValue(baseRightX - mm(T * 0.5)), baseY, roundValue(baseRightX - mm(T * 0.5)), wallTopY), angleDeg: 0, displayName: "Drawer Right Wall to Drawer Front Glue Flap" },
    { id: "fold-drawer-right-wall-to-back-glue-flap", from: "drawer-right-wall", to: "drawer-back-right-glue-flap", d: linePath(roundValue(baseX + mm(T * 0.5)), wallTopY, roundValue(baseX + mm(T * 0.5)), baseY), angleDeg: 0, displayName: "Drawer Right Wall to Drawer Back Glue Flap" },
    { id: "fold-drawer-left-wall-to-back-glue-flap", from: "drawer-left-wall", to: "drawer-back-left-glue-flap", d: linePath(roundValue(baseX + mm(T * 0.5)), baseBottomY, roundValue(baseX + mm(T * 0.5)), wallPanelBottomY), angleDeg: 0, displayName: "Drawer Left Wall to Drawer Back Glue Flap" },
    { id: "fold-sleeve-panel-1-to-panel-2", from: "sleeve-panel-1", to: "sleeve-panel-2", d: linePath(sleeveX2, sleeveY, sleeveX2, sleeveBottomY), angleDeg: 90, displayName: "Sleeve Side Wall to Sleeve Front Face" },
    { id: "fold-sleeve-panel-2-to-panel-3", from: "sleeve-panel-2", to: "sleeve-panel-3", d: linePath(sleeveX3, sleeveBottomY, sleeveX3, sleeveY), angleDeg: -90, displayName: "Sleeve Front Face to Sleeve Side Wall" },
    { id: "fold-sleeve-panel-3-to-panel-4", from: "sleeve-panel-3", to: "sleeve-panel-4", d: linePath(sleeveX4, sleeveY, sleeveX4, sleeveBottomY), angleDeg: 90, displayName: "Sleeve Side Wall to Sleeve Back Face" },
    { id: "fold-sleeve-panel-4-to-glue-flap", from: "sleeve-panel-4", to: "sleeve-glue-flap", d: linePath(sleeveX5, sleeveBottomY, sleeveX5, sleeveY), angleDeg: -90, displayName: "Sleeve Back Face to Sleeve Glue Flap" }
  ];

  const cutPaths = [
    { id: "cut-drawer-bottom", d: `M ${roundValue(baseX - wallDepth + bevel)} ${baseBottomY} L ${roundValue(baseX + mm(T * 0.5) - wallDepth)} ${baseBottomY} L ${roundValue(baseX + mm(T * 0.5) - wallDepth)} ${wallPanelBottomY} L ${wallPanelX} ${wallPanelBottomY} L ${roundValue(baseRightX - mm(T * 0.5))} ${wallPanelBottomY} L ${roundValue(baseRightX - mm(T * 0.5) + wallDepth)} ${wallPanelBottomY} L ${roundValue(baseRightX - mm(T * 0.5) + wallDepth)} ${baseBottomY} L ${roundValue(baseRightX + wallDepth - bevel)} ${baseBottomY}` },
    { id: "cut-drawer-front", d: `M ${baseRightX} ${baseBottomY} L ${roundValue(baseRightX + wallDepth)} ${baseBottomY} L ${roundValue(baseRightX + wallDepth + bevel)} ${roundValue(baseBottomY - bevel)} L ${roundValue(baseRightX + wallDepth + bevel + returnDepth)} ${roundValue(baseBottomY - bevel)} L ${roundValue(baseRightX + wallDepth + bevel + returnDepth)} ${roundValue(baseBottomY - slitInset)} L ${roundValue(baseRightX + wallDepth + bevel + returnDepth + bumpDepth)} ${roundValue(baseBottomY - slitInset)} L ${roundValue(baseRightX + wallDepth + bevel + returnDepth + bumpDepth)} ${roundValue(baseY + slitInset)} L ${roundValue(baseRightX + wallDepth + bevel + returnDepth)} ${roundValue(baseY + slitInset)} L ${roundValue(baseRightX + wallDepth + bevel + returnDepth)} ${roundValue(baseY + bevel)} L ${roundValue(baseRightX + wallDepth + bevel)} ${roundValue(baseY + bevel)} L ${roundValue(baseRightX + wallDepth)} ${baseY} L ${baseRightX} ${baseY}` },
    { id: "cut-drawer-top", d: `M ${roundValue(baseRightX + wallDepth - bevel)} ${baseY} L ${roundValue(baseRightX - mm(T * 0.5) + wallDepth)} ${baseY} L ${roundValue(baseRightX - mm(T * 0.5) + wallDepth)} ${wallTopY} L ${roundValue(baseRightX - mm(T * 0.5))} ${wallTopY} L ${wallPanelX} ${wallTopY} L ${roundValue(baseX + mm(T * 0.5) - wallDepth)} ${wallTopY} L ${roundValue(baseX + mm(T * 0.5) - wallDepth)} ${baseY} L ${roundValue(baseX - wallDepth + bevel)} ${baseY}` },
    { id: "cut-drawer-back", d: `M ${baseX} ${baseY} L ${roundValue(baseX - wallDepth)} ${baseY} L ${roundValue(baseX - wallDepth - bevel)} ${roundValue(baseY + bevel)} L ${roundValue(baseX - wallDepth - bevel - returnDepth)} ${roundValue(baseY + bevel)} L ${roundValue(baseX - wallDepth - bevel - returnDepth)} ${roundValue(baseY + slitInset)} L ${roundValue(baseX - wallDepth - bevel - returnDepth - bumpDepth)} ${roundValue(baseY + slitInset)} L ${roundValue(baseX - wallDepth - bevel - returnDepth - bumpDepth)} ${roundValue(baseBottomY - slitInset)} L ${roundValue(baseX - wallDepth - bevel - returnDepth)} ${roundValue(baseBottomY - slitInset)} L ${roundValue(baseX - wallDepth - bevel - returnDepth)} ${roundValue(baseBottomY - bevel)} L ${roundValue(baseX - wallDepth - bevel)} ${roundValue(baseBottomY - bevel)} L ${roundValue(baseX - wallDepth)} ${baseBottomY} L ${baseX} ${baseBottomY}` },
    { id: "cut-drawer-front-slit", d: drawerFrontSlitD },
    { id: "cut-drawer-back-slit", d: drawerBackSlitD },
    { id: "cut-sleeve-outline", d: `M ${sleeveX5} ${sleeveY} L ${sleeveX1} ${sleeveY} L ${sleeveX1} ${sleeveBottomY} L ${sleeveX5} ${sleeveBottomY} L ${sleeveX6} ${roundValue(sleeveBottomY - sleeveGlueSkew)} L ${sleeveX6} ${roundValue(sleeveY + sleeveGlueSkew)} L ${sleeveX5} ${sleeveY}` }
  ];

  const panels = [...drawerPanels, ...sleevePanels];
  const bounds = measurePathBounds([
    ...panels.map(panel => panel.d),
    ...panels.map(panel => panel.cutoutD).filter(Boolean),
    ...panels.map(panel => panel.slitCutD).filter(Boolean),
    ...folds.map(fold => fold.d),
    ...cutPaths.map(path => path.d)
  ]);
  const pageW = roundValue(bounds.maxX + bounds.minX);
  const pageH = roundValue(bounds.maxY + bounds.minY);

  const geometry = {
    pageW,
    pageH,
    outlineD: "",
    slitD: "",
    lockCutoutD: "",
    panels,
    folds,
    cutPaths,
    glueAreas: [],
    rootPanel: "drawer-base",
    rootPanels: ["drawer-base", "sleeve-panel-1"],
    floorPanel: "drawer-base",
    floorPanelsByObject: {
      drawer: "drawer-base",
      sleeve: "sleeve-panel-4"
    },
    floorFoldId: "",
    floorFoldDistribution: null,
    foldSequence: [...template.foldSequence],
    defaultAssemblySteps: template.defaultAssemblySteps.map(step => ({ ...step })),
    assembledDefaults: MATCHBOX_ASSEMBLED_DEFAULTS,
    custom3d: { ...(template.custom3d || {}) },
    __cacheKey: JSON.stringify({
      templateId: template.id,
      dimensions: {
        L: roundValue(L),
        W: roundValue(W),
        H: roundValue(H),
        T: roundValue(T),
        CLEARANCE: roundValue(CLEARANCE),
        GLUE: roundValue(GLUE),
        A: roundValue(A)
      }
    })
  };

  const metadataJson = buildMetadataJson(
    template,
    geometry,
    { length: L, width: W, height: H },
    {
      glueFlapSize: GLUE,
      materialThickness: T,
      clearance: CLEARANCE,
      glueFlapAngle: A
    },
    "static/template-builders/matchbox.js"
  );
  metadataJson.custom3d = geometry.custom3d;

  return {
    svgText: renderStructuredSvg(template, geometry, metadataJson),
    metadata: metadataJson,
    geometry
  };
}

export default createProceduralTemplateBuilder(TEMPLATE_DEFINITION, buildMatchboxGeometry);
