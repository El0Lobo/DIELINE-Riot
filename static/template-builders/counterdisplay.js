import {
  buildMetadataJson,
  clamp,
  createProceduralTemplateBuilder,
  linePath,
  rectPath,
  renderStructuredSvg,
  roundValue
} from "./helpers.js";

const SOURCE_DEFAULTS = {
  L: 50,
  W: 60,
  H: 80,
  FRONT: 25,
  T: 0.5
};

const SOURCE_UNIT = (440.79 - 299.06) / SOURCE_DEFAULTS.L;
const SOURCE_LEFT_MARGIN = 70.87;
const SOURCE_TOP_MARGIN = 70.51;

const TEMPLATE_DEFINITION = {
  id: "counterdisplay",
  name: "Counter Display",
  icon: "icon-counterdisplay",
  title: "Counter Display Template",
  summary: "Generated counter display with a stepped front opening and integrated display side flaps.",
  defaults: { L: 50, W: 60, H: 80, FRONT: 25 },
  metadataDimensionMap: {
    L: "length",
    W: "width",
    H: "height",
    FRONT: "front"
  },
  custom3d: {
    showFlatSheet: true,
    camera: {
      flatView: "top",
      foldedView: "front",
      flatPadding: 1.14,
      foldedPadding: 1.32,
      foldedTargetOffset: [0.02, 0.04, 0.1]
    }
  },
  fieldGroups: {
    primary: [
      { key: "L", label: "Length", kind: "length", min: 1, step: 0.1 },
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 1, step: 0.1 },
      { key: "FRONT", label: "Front", kind: "length", min: 0, step: 0.1 }
    ],
    optional: []
  },
  parametricRule: { xKeys: ["W", "L", "FRONT"], yKeys: ["H", "W", "H"] },
  panels: [
    { id: "base-panel", displayName: "Base Panel", standardName: "base-panel", type: "panel", isGlue: false, foldParent: null, foldId: null, foldAngleDeg: 0 },
    { id: "left-panel", displayName: "Back Panel", standardName: "back-panel", type: "panel", isGlue: false, foldParent: "base-panel", foldId: "page-fold-base-rectangle-1-left", foldAngleDeg: 90 },
    { id: "top-left-glue-flap", displayName: "Right Side Glue Flap", standardName: "right-side-glue-flap", type: "glue-flap", isGlue: true, foldParent: "top-left-flap", foldId: "page-fold-outline-flap-4", foldAngleDeg: 90 },
    { id: "top-left-flap", displayName: "Right Side Panel", standardName: "right-side-panel", type: "panel", isGlue: false, foldParent: "base-panel", foldId: "page-fold-base-rectangle-1-top", foldAngleDeg: -90 },
    { id: "bottom-left-glue-flap", displayName: "Left Side Glue Flap", standardName: "left-side-glue-flap", type: "glue-flap", isGlue: true, foldParent: "bottom-left-flap", foldId: "page-fold-outline-flap-1", foldAngleDeg: 90 },
    { id: "bottom-left-flap", displayName: "Left Side Panel", standardName: "left-side-panel", type: "panel", isGlue: false, foldParent: "base-panel", foldId: "page-fold-base-rectangle-1-bottom", foldAngleDeg: 90 },
    { id: "right-side-wall", displayName: "Front Panel", standardName: "front-panel", type: "panel", isGlue: false, foldParent: "base-panel", foldId: "page-fold-base-rectangle-1-right", foldAngleDeg: -90 },
    { id: "top-right-flap", displayName: "Front Right Glue Flap", standardName: "front-right-glue-flap", type: "glue-flap", isGlue: true, foldParent: "top-left-flap", foldId: "page-fold-outline-flap-3", foldAngleDeg: -90 },
    { id: "bottom-right-flap", displayName: "Front Left Glue Flap", standardName: "front-left-glue-flap", type: "glue-flap", isGlue: true, foldParent: "bottom-left-flap", foldId: "page-fold-outline-flap-2", foldAngleDeg: -90 }
  ],
  foldDisplayNames: {
    "page-fold-base-rectangle-1-left": "base-panel to back-panel",
    "page-fold-outline-flap-4": "right-side-panel to right-side-glue-flap",
    "page-fold-base-rectangle-1-top": "base-panel to right-side-panel",
    "page-fold-base-rectangle-1-right": "base-panel to front-panel",
    "page-fold-outline-flap-3": "right-side-panel to front-right-glue-flap",
    "page-fold-outline-flap-2": "left-side-panel to front-left-glue-flap",
    "page-fold-base-rectangle-1-bottom": "base-panel to left-side-panel",
    "page-fold-outline-flap-1": "left-side-panel to left-side-glue-flap"
  }
};

const PANEL_DEFS = [
  {
    id: "base-panel",
    standardName: "base-panel",
    displayName: "Base Panel",
    labelText: "base-panel",
    type: "panel",
    isGlue: false,
    parent: null,
    foldId: "",
    angle: 0,
    fontSize: 20
  },
  {
    id: "left-panel",
    standardName: "back-panel",
    displayName: "Back Panel",
    labelText: "back-panel",
    type: "panel",
    isGlue: false,
    parent: "base-panel",
    foldId: "page-fold-base-rectangle-1-left",
    angle: 90,
    fontSize: 18
  },
  {
    id: "top-left-glue-flap",
    standardName: "right-side-glue-flap",
    displayName: "Right Side Glue Flap",
    labelText: "right-side-glue-flap",
    type: "glue-flap",
    isGlue: true,
    parent: "top-left-flap",
    foldId: "page-fold-outline-flap-4",
    angle: 90,
    fontSize: 10
  },
  {
    id: "top-left-flap",
    standardName: "right-side-panel",
    displayName: "Right Side Panel",
    labelText: "right-side-panel",
    type: "panel",
    isGlue: false,
    parent: "base-panel",
    foldId: "page-fold-base-rectangle-1-top",
    angle: -90,
    fontSize: 14
  },
  {
    id: "bottom-left-glue-flap",
    standardName: "left-side-glue-flap",
    displayName: "Left Side Glue Flap",
    labelText: "left-side-glue-flap",
    type: "glue-flap",
    isGlue: true,
    parent: "bottom-left-flap",
    foldId: "page-fold-outline-flap-1",
    angle: 90,
    fontSize: 10
  },
  {
    id: "bottom-left-flap",
    standardName: "left-side-panel",
    displayName: "Left Side Panel",
    labelText: "left-side-panel",
    type: "panel",
    isGlue: false,
    parent: "base-panel",
    foldId: "page-fold-base-rectangle-1-bottom",
    angle: 90,
    fontSize: 14
  },
  {
    id: "right-side-wall",
    standardName: "front-panel",
    displayName: "Front Panel",
    labelText: "front-panel",
    type: "panel",
    isGlue: false,
    parent: "base-panel",
    foldId: "page-fold-base-rectangle-1-right",
    angle: -90,
    fontSize: 12
  },
  {
    id: "top-right-flap",
    standardName: "front-right-glue-flap",
    displayName: "Front Right Glue Flap",
    labelText: "front-right-glue-flap",
    type: "glue-flap",
    isGlue: true,
    parent: "top-left-flap",
    foldId: "page-fold-outline-flap-3",
    angle: -90,
    fontSize: 8
  },
  {
    id: "bottom-right-flap",
    standardName: "front-left-glue-flap",
    displayName: "Front Left Glue Flap",
    labelText: "front-left-glue-flap",
    type: "glue-flap",
    isGlue: true,
    parent: "bottom-left-flap",
    foldId: "page-fold-outline-flap-2",
    angle: -90,
    fontSize: 8
  }
];

const FOLD_DEFS = [
  {
    id: "page-fold-base-rectangle-1-left",
    from: "base-panel",
    to: "left-panel",
    angleDeg: 90,
    displayName: "base-panel to back-panel"
  },
  {
    id: "page-fold-outline-flap-4",
    from: "top-left-flap",
    to: "top-left-glue-flap",
    angleDeg: 90,
    displayName: "right-side-panel to right-side-glue-flap"
  },
  {
    id: "page-fold-base-rectangle-1-top",
    from: "base-panel",
    to: "top-left-flap",
    angleDeg: -90,
    displayName: "base-panel to right-side-panel"
  },
  {
    id: "page-fold-base-rectangle-1-right",
    from: "base-panel",
    to: "right-side-wall",
    angleDeg: -90,
    displayName: "base-panel to front-panel"
  },
  {
    id: "page-fold-outline-flap-3",
    from: "top-left-flap",
    to: "top-right-flap",
    angleDeg: -90,
    displayName: "right-side-panel to front-right-glue-flap"
  },
  {
    id: "page-fold-outline-flap-2",
    from: "bottom-left-flap",
    to: "bottom-right-flap",
    angleDeg: -90,
    displayName: "left-side-panel to front-left-glue-flap"
  },
  {
    id: "page-fold-base-rectangle-1-bottom",
    from: "base-panel",
    to: "bottom-left-flap",
    angleDeg: 90,
    displayName: "base-panel to left-side-panel"
  },
  {
    id: "page-fold-outline-flap-1",
    from: "bottom-left-flap",
    to: "bottom-left-glue-flap",
    angleDeg: 90,
    displayName: "left-side-panel to left-side-glue-flap"
  }
];

const COUNTERDISPLAY_FOLD_SEQUENCE = [
  "page-fold-outline-flap-4",
  "page-fold-outline-flap-3",
  "page-fold-outline-flap-2",
  "page-fold-outline-flap-1",
  "page-fold-base-rectangle-1-left",
  "page-fold-base-rectangle-1-top",
  "page-fold-base-rectangle-1-bottom",
  "page-fold-base-rectangle-1-right"
];

function mm(value) {
  return value * SOURCE_UNIT;
}

function buildPolygonPath(points) {
  return `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${roundValue(point[0])} ${roundValue(point[1])}`).join(" ")} Z`;
}

function buildCounterdisplayGeometry(params = {}, template) {
  const L = clamp(Number(params.L) || SOURCE_DEFAULTS.L, 1, 1000);
  const W = clamp(Number(params.W) || SOURCE_DEFAULTS.W, 1, 1000);
  const H = clamp(Number(params.H) || SOURCE_DEFAULTS.H, 1, 1000);
  const FRONT = clamp(Number(params.FRONT) || SOURCE_DEFAULTS.FRONT, 0, H);
  const T = SOURCE_DEFAULTS.T;

  const leftOuter = SOURCE_LEFT_MARGIN;
  const topOuter = SOURCE_TOP_MARGIN;

  const baseLeft = leftOuter + mm(H);
  const seamLeft = baseLeft + mm(T);
  const glueLeft = seamLeft - mm(W / 2);
  const seamRight = seamLeft + mm(L);
  const baseRight = seamRight + mm(T);
  const frontRight = seamRight + mm(FRONT);
  const flapRight = seamRight + mm(W / 2);

  const upperFront = topOuter + mm(H - FRONT);
  const baseTop = upperFront + mm(FRONT);
  const baseBottom = baseTop + mm(W);
  const lowerFront = baseBottom + mm(FRONT);
  const bottomOuter = lowerFront + mm(H - FRONT);

  const pageW = roundValue(leftOuter + flapRight);
  const pageH = roundValue(topOuter + bottomOuter);
  const labelScale = Math.sqrt((L / SOURCE_DEFAULTS.L) * (W / SOURCE_DEFAULTS.W));

  const panelPaths = {
    "base-panel": rectPath(baseLeft, baseTop, baseRight - baseLeft, baseBottom - baseTop),
    "left-panel": rectPath(leftOuter, baseTop, baseLeft - leftOuter, baseBottom - baseTop),
    "top-left-glue-flap": rectPath(glueLeft, topOuter, seamLeft - glueLeft, baseTop - topOuter),
    "top-left-flap": buildPolygonPath([
      [seamLeft, topOuter],
      [seamRight, upperFront],
      [seamRight, baseTop],
      [seamLeft, baseTop]
    ]),
    "bottom-left-glue-flap": rectPath(glueLeft, baseBottom, seamLeft - glueLeft, bottomOuter - baseBottom),
    "bottom-left-flap": buildPolygonPath([
      [seamLeft, baseBottom],
      [seamRight, baseBottom],
      [seamRight, lowerFront],
      [seamLeft, bottomOuter]
    ]),
    "right-side-wall": rectPath(seamRight, baseTop, frontRight - seamRight, baseBottom - baseTop),
    "top-right-flap": rectPath(seamRight, upperFront, flapRight - seamRight, baseTop - upperFront),
    "bottom-right-flap": rectPath(seamRight, baseBottom, flapRight - seamRight, lowerFront - baseBottom)
  };

  const labelPositions = {
    "base-panel": [(baseLeft + baseRight) / 2, (baseTop + baseBottom) / 2],
    "left-panel": [(leftOuter + baseLeft) / 2, (baseTop + baseBottom) / 2],
    "top-left-glue-flap": [(glueLeft + seamLeft) / 2, (topOuter + baseTop) / 2],
    "top-left-flap": [seamLeft + (seamRight - seamLeft) * 0.36, topOuter + (baseTop - topOuter) * 0.57],
    "bottom-left-glue-flap": [(glueLeft + seamLeft) / 2, (baseBottom + bottomOuter) / 2],
    "bottom-left-flap": [seamLeft + (seamRight - seamLeft) * 0.36, baseBottom + (bottomOuter - baseBottom) * 0.383],
    "right-side-wall": [(seamRight + frontRight) / 2, (baseTop + baseBottom) / 2],
    "top-right-flap": [(seamRight + flapRight) / 2, (upperFront + baseTop) / 2],
    "bottom-right-flap": [(seamRight + flapRight) / 2, (baseBottom + lowerFront) / 2]
  };

  const panels = PANEL_DEFS.map(panel => {
    const labelPosition = labelPositions[panel.id];
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
      d: panelPaths[panel.id],
      meshD: panelPaths[panel.id],
      labelPosition: labelPosition.map(roundValue),
      labelLayout: {
        text: panel.labelText,
        x: roundValue(labelPosition[0]),
        y: roundValue(labelPosition[1]),
        fontSize: roundValue(clamp(panel.fontSize * labelScale, 7, 24)),
        rotationDeg: 0,
        maxWidth: 0,
        lineHeight: 1.2
      },
      objectId: ""
    };
  });

  const folds = [
    { id: "page-fold-base-rectangle-1-left", d: linePath(baseLeft, baseTop, baseLeft, baseBottom) },
    { id: "page-fold-outline-flap-4", d: linePath(seamLeft, topOuter, seamLeft, baseTop) },
    { id: "page-fold-base-rectangle-1-top", d: linePath(seamLeft, baseTop, seamRight, baseTop) },
    { id: "page-fold-base-rectangle-1-right", d: linePath(baseRight, baseBottom, baseRight, baseTop) },
    { id: "page-fold-outline-flap-3", d: linePath(seamRight, baseTop, seamRight, upperFront) },
    { id: "page-fold-outline-flap-2", d: linePath(seamRight, lowerFront, seamRight, baseBottom) },
    { id: "page-fold-base-rectangle-1-bottom", d: linePath(seamLeft, baseBottom, seamRight, baseBottom) },
    { id: "page-fold-outline-flap-1", d: linePath(seamLeft, baseBottom, seamLeft, bottomOuter) }
  ].map(fold => {
    const definition = FOLD_DEFS.find(entry => entry.id === fold.id);
    return {
      ...fold,
      from: definition.from,
      to: definition.to,
      angleDeg: definition.angleDeg,
      displayName: definition.displayName
    };
  });

  const outlineD = [
    `M ${roundValue(seamLeft)} ${roundValue(baseBottom)}`,
    `L ${roundValue(glueLeft)} ${roundValue(baseBottom)}`,
    `L ${roundValue(glueLeft)} ${roundValue(bottomOuter)}`,
    `L ${roundValue(seamLeft)} ${roundValue(bottomOuter)}`,
    `L ${roundValue(seamRight)} ${roundValue(lowerFront)}`,
    `L ${roundValue(flapRight)} ${roundValue(lowerFront)}`,
    `L ${roundValue(flapRight)} ${roundValue(baseBottom)}`,
    `L ${roundValue(seamRight)} ${roundValue(baseBottom)}`,
    `L ${roundValue(frontRight)} ${roundValue(baseBottom)}`,
    `L ${roundValue(frontRight)} ${roundValue(baseTop)}`,
    `L ${roundValue(seamRight)} ${roundValue(baseTop)}`,
    `L ${roundValue(flapRight)} ${roundValue(baseTop)}`,
    `L ${roundValue(flapRight)} ${roundValue(upperFront)}`,
    `L ${roundValue(seamRight)} ${roundValue(upperFront)}`,
    `L ${roundValue(seamLeft)} ${roundValue(topOuter)}`,
    `L ${roundValue(glueLeft)} ${roundValue(topOuter)}`,
    `L ${roundValue(glueLeft)} ${roundValue(baseTop)}`,
    `L ${roundValue(leftOuter)} ${roundValue(baseTop)}`,
    `L ${roundValue(leftOuter)} ${roundValue(baseBottom)}`,
    `L ${roundValue(glueLeft)} ${roundValue(baseBottom)}`,
    `L ${roundValue(glueLeft)} ${roundValue(bottomOuter)}`
  ].join(" ");

  const slitD = [
    linePath(glueLeft, baseTop, seamLeft, baseTop),
    linePath(glueLeft, baseBottom, seamLeft, baseBottom)
  ].join(" ");

  const geometry = {
    pageW,
    pageH,
    outlineD,
    slitD,
    lockCutoutD: "",
    panels,
    folds,
    foldSequence: COUNTERDISPLAY_FOLD_SEQUENCE,
    glueAreas: [],
    rootPanel: "base-panel",
    rootPanels: ["base-panel"],
    floorPanel: "base-panel",
    floorFoldId: "",
    floorFoldDistribution: null,
    flatSheetD: outlineD,
    __cacheKey: JSON.stringify({
      templateId: "counterdisplay",
      dimensions: {
        L: roundValue(L),
        W: roundValue(W),
        H: roundValue(H),
        FRONT: roundValue(FRONT)
      }
    })
  };

  const metadataJson = buildMetadataJson(
    template,
    geometry,
    { length: L, width: W, height: H },
    { front: FRONT, materialThickness: T },
    "static/template-builders/counterdisplay.js"
  );

  return {
    svgText: renderStructuredSvg(template, geometry, metadataJson),
    metadata: metadataJson,
    geometry
  };
}

export default createProceduralTemplateBuilder(TEMPLATE_DEFINITION, buildCounterdisplayGeometry);
