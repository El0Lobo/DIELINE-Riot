import { buildMetadataJson, createProceduralTemplateBuilder, linePath, renderStructuredSvg, roundValue } from "./helpers.js";

const SVG_MM_SCALE = 72 / 25.4;
const GLUE_FLAP_HANDLE_RATIO = 0.4477152502;

function mm(value) {
  return value * SVG_MM_SCALE;
}

function arcRadiusFromChordAndSagitta(chord, sagitta) {
  const safeChord = Math.max(0.001, chord);
  const safeSagitta = Math.max(0.001, sagitta);
  return ((safeSagitta * safeSagitta) + ((safeChord * safeChord) / 4)) / (2 * safeSagitta);
}

function arcDepthAtDistance(radius, halfChord, distanceFromCenter) {
  const safeRadius = Math.max(0.001, radius);
  const safeHalfChord = Math.max(0.001, halfChord);
  const safeDistance = Math.min(Math.abs(distanceFromCenter), safeHalfChord);
  const chordOffset = Math.sqrt(Math.max(0, (safeRadius * safeRadius) - (safeHalfChord * safeHalfChord)));
  return Math.sqrt(Math.max(0, (safeRadius * safeRadius) - (safeDistance * safeDistance))) - chordOffset;
}

function buildPolylinePath(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return "";
  }
  return [
    `M ${roundValue(points[0][0])} ${roundValue(points[0][1])}`,
    ...points.slice(1).map(([x, y]) => `L ${roundValue(x)} ${roundValue(y)}`),
    "Z"
  ].join(" ");
}

function buildFlapBandPath(xLeft, xRight, yFold, radius, edge = "top", thumbRadius = 0) {
  const halfChord = (xRight - xLeft) / 2;
  const xMid = (xLeft + xRight) / 2;
  const samples = 28;
  const outerPoints = [];
  const innerPoints = [];

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const x = xLeft + ((xRight - xLeft) * t);
    const depth = arcDepthAtDistance(radius, halfChord, Math.abs(x - xMid));
    const innerY = edge === "top" ? yFold + depth : yFold - depth;
    const outerY = edge === "top" ? yFold - depth : yFold + depth;
    outerPoints.push([x, outerY]);
    innerPoints.push([x, innerY]);
  }

  if (edge === "bottom" && thumbRadius > 0) {
    const filteredOuter = outerPoints.filter(([x]) => Math.abs(x - xMid) >= thumbRadius);
    const notchPoints = [];
    const notchSamples = 14;
    const notchBaseY = yFold + arcDepthAtDistance(radius, halfChord, thumbRadius);
    for (let index = 0; index <= notchSamples; index += 1) {
      const t = index / notchSamples;
      const x = (xMid - thumbRadius) + ((thumbRadius * 2) * t);
      const dx = x - xMid;
      const y = notchBaseY - Math.sqrt(Math.max(0, (thumbRadius * thumbRadius) - (dx * dx)));
      notchPoints.push([x, y]);
    }
    const leftOuter = filteredOuter.filter(([x]) => x < xMid);
    const rightOuter = filteredOuter.filter(([x]) => x > xMid);
    return buildPolylinePath([
      ...leftOuter,
      ...notchPoints,
      ...rightOuter,
      ...innerPoints.slice().reverse()
    ]);
  }

  return buildPolylinePath([
    ...outerPoints,
    ...innerPoints.slice().reverse()
  ]);
}

function buildPanelPath(xLeft, xRight, yTop, yBottom, radius) {
  return [
    `M ${roundValue(xLeft)} ${roundValue(yTop)}`,
    `A ${roundValue(radius)} ${roundValue(radius)} 0 0 0 ${roundValue(xRight)} ${roundValue(yTop)}`,
    `L ${roundValue(xRight)} ${roundValue(yBottom)}`,
    `A ${roundValue(radius)} ${roundValue(radius)} 0 0 1 ${roundValue(xLeft)} ${roundValue(yBottom)}`,
    "Z"
  ].join(" ");
}

function buildPanelMeshPath(xLeft, xRight, yTop, yBottom, radius) {
  const halfChord = (xRight - xLeft) / 2;
  const xMid = (xLeft + xRight) / 2;
  const samples = 28;
  const topPoints = [];
  const bottomPoints = [];

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const x = xLeft + ((xRight - xLeft) * t);
    const depth = arcDepthAtDistance(radius, halfChord, Math.abs(x - xMid));
    topPoints.push([x, yTop + depth]);
    bottomPoints.push([x, yBottom - depth]);
  }

  return buildPolylinePath([
    ...topPoints,
    ...bottomPoints.slice().reverse()
  ]);
}

function buildGlueFlapPath(xLeft, xRight, yTopArcStart, yBottomArcStart, radius) {
  const handleDepth = radius * GLUE_FLAP_HANDLE_RATIO;
  return [
    `M ${roundValue(xLeft)} ${roundValue(yTopArcStart)}`,
    `C ${roundValue(xLeft)} ${roundValue(yTopArcStart)} ${roundValue(xRight)} ${roundValue(yTopArcStart + handleDepth)} ${roundValue(xRight)} ${roundValue(yTopArcStart + radius)}`,
    `L ${roundValue(xRight)} ${roundValue(yBottomArcStart - radius)}`,
    `C ${roundValue(xRight)} ${roundValue(yBottomArcStart - handleDepth)} ${roundValue(xLeft)} ${roundValue(yBottomArcStart)} ${roundValue(xLeft)} ${roundValue(yBottomArcStart)}`,
    "Z"
  ].join(" ");
}

function buildFrontTopFlapPath(xLeft, xRight, yFold, radius) {
  return buildFlapBandPath(xLeft, xRight, yFold, radius, "top");
}

function buildFrontBottomFlapPath(xLeft, xRight, yFold, radius, thumbRadius = 0) {
  return buildFlapBandPath(xLeft, xRight, yFold, radius, "bottom", thumbRadius);
}

function buildBackTopFlapPath(xLeft, xRight, yFold, radius) {
  return buildFlapBandPath(xLeft, xRight, yFold, radius, "top");
}

function buildBackBottomFlapPath(xLeft, xRight, yFold, radius){
  return buildFlapBandPath(xLeft, xRight, yFold, radius, "bottom");
}

function buildThumbholeCutoutPath(xMid, yBase, thumbRadius) {
  if (!(thumbRadius > 0)) {
    return "";
  }
  return [
    `M ${roundValue(xMid - thumbRadius)} ${roundValue(yBase)}`,
    `A ${roundValue(thumbRadius)} ${roundValue(thumbRadius)} 0 0 1 ${roundValue(xMid)} ${roundValue(yBase - thumbRadius)}`,
    `A ${roundValue(thumbRadius)} ${roundValue(thumbRadius)} 0 0 1 ${roundValue(xMid + thumbRadius)} ${roundValue(yBase)}`,
    "Z"
  ].join(" ");
}

function buildFrontBottomCutPath(xLeft, xMid, xRight, yFold, radius, thumbRadius = 0) {
  if (!(thumbRadius > 0)) {
    return `M ${roundValue(xLeft)} ${roundValue(yFold)} A ${roundValue(radius)} ${roundValue(radius)} 0 0 0 ${roundValue(xRight)} ${roundValue(yFold)}`;
  }
  const halfChord = (xRight - xLeft) / 2;
  const notchEdgeY = yFold + arcDepthAtDistance(radius, halfChord, thumbRadius);
  return [
    `M ${roundValue(xLeft)} ${roundValue(yFold)}`,
    `A ${roundValue(radius)} ${roundValue(radius)} 0 0 0 ${roundValue(xMid - thumbRadius)} ${roundValue(notchEdgeY)}`,
    `A ${roundValue(thumbRadius)} ${roundValue(thumbRadius)} 0 0 1 ${roundValue(xMid)} ${roundValue(notchEdgeY - thumbRadius)}`,
    `A ${roundValue(thumbRadius)} ${roundValue(thumbRadius)} 0 0 1 ${roundValue(xMid + thumbRadius)} ${roundValue(notchEdgeY)}`,
    `A ${roundValue(radius)} ${roundValue(radius)} 0 0 0 ${roundValue(xRight)} ${roundValue(yFold)}`
  ].join(" ");
}

const FRONT_END_FLAP_TOP_CUSTOM_3D = {
  flapCurve: {
    hingeCurveSign: 1,
    foldAngleSign: 1,
    surfaceZSign: 1,
    zSign: -1
  }
};

const FRONT_END_FLAP_BOTTOM_CUSTOM_3D = {
  flapCurve: {
    hingeCurveSign: -1,
    foldAngleSign: 1,
    surfaceZSign: 1,
    zSign: -1
  }
};

const BACK_END_FLAP_TOP_CUSTOM_3D = {
  flapMorph: {
    shellDirection: 1,
    inwardSign: 1
  },
  flapCurve: {
    hingeCurveSign: 1,
    foldAngleSign: 1,
    surfaceZSign: 1,
    zSign: 1
  }
};

const BACK_END_FLAP_BOTTOM_CUSTOM_3D = {
  flapMorph: {
    shellDirection: 1,
    inwardSign: -1
  },
  flapCurve: {
    hingeCurveSign: -1,
    foldAngleSign: 1,
    surfaceZSign: 1,
    zSign: -1
  }
};

const PANEL_SPECS = [
  {
    id: "front-panel",
    displayName: "Front Panel",
    standardName: "front-panel",
    type: "panel",
    isGlue: false,
    foldParent: null,
    foldId: "",
    foldAngleDeg: 0,
    labelFontSize: 16,
    labelRotationDeg: 0,
    labelPosition: context => [context.frontCenterX, context.centerY],
    d: context => context.frontPanelPath,
    meshD: context => context.frontPanelMeshPath,
    previewCutoutD: context => context.frontBottomThumbholeCutoutPath
  },
  {
    id: "back-panel",
    displayName: "Back Panel",
    standardName: "back-panel",
    type: "panel",
    isGlue: false,
    foldParent: "front-panel",
    foldId: "page1-fold-middle",
    foldAngleDeg: -180,
    labelFontSize: 16,
    labelRotationDeg: 0,
    labelPosition: context => [context.backCenterX, context.centerY],
    d: context => context.backPanelPath,
    meshD: context => context.backPanelMeshPath
  },
  {
    id: "glue-flap",
    displayName: "Glue Flap",
    standardName: "glue-flap",
    type: "glue-flap",
    isGlue: true,
    foldParent: "back-panel",
    foldId: "page1-fold-glue",
    foldAngleDeg: 162,
    labelFontSize: 10,
    labelRotationDeg: 90,
    labelPosition: context => [context.x2 + (context.glueWidth / 2), context.centerY],
    d: context => context.glueFlapPath,
    meshD: context => context.glueFlapPath
  },
  {
    id: "front-top-end-flap",
    displayName: "Front Top End Flap",
    standardName: "front-top-end-flap",
    type: "panel",
    isGlue: false,
    foldParent: "front-panel",
    foldId: "page1-fold-curves-north",
    foldAngleDeg: -90,
    labelFontSize: 12,
    labelRotationDeg: 0,
    custom3d: FRONT_END_FLAP_TOP_CUSTOM_3D,
    labelPosition: context => [context.frontCenterX, context.topFlapCenterY],
    d: context => context.frontTopFlapPath,
    meshD: context => context.frontTopFlapPath
  },
  {
    id: "front-bottom-end-flap",
    displayName: "Front Bottom End Flap",
    standardName: "front-bottom-end-flap",
    type: "panel",
    isGlue: false,
    foldParent: "front-panel",
    foldId: "page1-fold-curves-south",
    foldAngleDeg: 90,
    labelFontSize: 12,
    labelRotationDeg: 0,
    custom3d: FRONT_END_FLAP_BOTTOM_CUSTOM_3D,
    labelPosition: context => [context.frontCenterX, context.bottomFlapCenterY],
    d: context => context.frontBottomFlapPath,
    meshD: context => context.frontBottomFlapPath
  },
  {
    id: "back-top-end-flap",
    displayName: "Back Top End Flap",
    standardName: "back-top-end-flap",
    type: "panel",
    isGlue: false,
    foldParent: "back-panel",
    foldId: "page1-fold-curves-north-back",
    foldAngleDeg: 90,
    labelFontSize: 12,
    labelRotationDeg: 0,
    custom3d: BACK_END_FLAP_TOP_CUSTOM_3D,
    labelPosition: context => [context.backCenterX, context.topFlapCenterY],
    d: context => context.backTopFlapPath,
    meshD: context => context.backTopFlapPath
  },
  {
    id: "back-bottom-end-flap",
    displayName: "Back Bottom End Flap",
    standardName: "back-bottom-end-flap",
    type: "panel",
    isGlue: false,
    foldParent: "back-panel",
    foldId: "page1-fold-curves-south-back",
    foldAngleDeg: 90,
    labelFontSize: 12,
    labelRotationDeg: 0,
    custom3d: BACK_END_FLAP_BOTTOM_CUSTOM_3D,
    labelPosition: context => [context.backCenterX, context.bottomFlapCenterY],
    d: context => context.backBottomFlapPath,
    meshD: context => context.backBottomFlapPath
  }
];

const FOLD_SPECS = [
  {
    id: "page1-fold-curves-south",
    from: "front-panel",
    to: "front-bottom-end-flap",
    displayName: "front panel to bottom end flap",
    d: context => context.frontBottomFoldPath,
    hingeD: context => context.frontBottomFoldPath,
    angleDeg: 90,
    sequenceOrder: 5
  },
  {
    id: "page1-fold-curves-north",
    from: "front-panel",
    to: "front-top-end-flap",
    displayName: "front panel to top end flap",
    d: context => context.frontTopFoldPath,
    hingeD: context => context.frontTopFoldPath,
    angleDeg: -90,
    sequenceOrder: 2
  },
  {
    id: "page1-fold-curves-south-back",
    from: "back-panel",
    to: "back-bottom-end-flap",
    displayName: "back panel to bottom end flap",
    d: context => context.backBottomFoldPath,
    hingeD: context => context.backBottomFoldPath,
    angleDeg: 90,
    sequenceOrder: 4
  },
  {
    id: "page1-fold-curves-north-back",
    from: "back-panel",
    to: "back-top-end-flap",
    displayName: "back panel to top end flap",
    d: context => context.backTopFoldPath,
    hingeD: context => context.backTopFoldPath,
    angleDeg: 90,
    sequenceOrder: 3
  },
  {
    id: "page1-fold-glue",
    from: "back-panel",
    to: "glue-flap",
    displayName: "back panel to glue flap",
    d: context => context.glueFoldPath,
    hingeD: context => context.glueFoldPath,
    angleDeg: 162,
    sequenceOrder: 1
  },
  {
    id: "page1-fold-middle",
    from: "front-panel",
    to: "back-panel",
    displayName: "front panel to back panel",
    d: context => context.middleFoldPath,
    hingeD: context => context.middleFoldPath,
    angleDeg: -180,
    sequenceOrder: 0
  }
];

function buildPillowpackCustom3d(context) {
  return {
    centers: {
      frontX: context.frontCenterX,
      backX: context.backCenterX,
      glueX: context.x2 + (context.glueWidth / 2),
      centerY: context.centerY,
      topY: context.yTop,
      bottomY: context.yBottom
    },
    camera: {
      flatView: "top",
      foldedView: "front",
      flatPadding: 1.12,
      foldedPadding: 1.24,
      foldedTargetOffset: [0, 0.02, 0.08]
    },
    kind: "curved-shell",
    swapArtworkFaces: true,
    profile: {
      width: context.bodyWidth,
      sagitta: context.flapSagitta,
      thumbRadius: context.thumbRadius,
      endCapConcavity: 0.4
    }
  };
}

function buildRuntimePanel(spec, context) {
  const [labelX, labelY] = spec.labelPosition(context);
  const d = spec.d(context);
  return {
    id: spec.id,
    standardName: spec.standardName,
    displayName: spec.displayName,
    label: spec.displayName,
    type: spec.type,
    isGlue: spec.isGlue,
    parent: spec.foldParent,
    foldId: spec.foldId,
    angle: spec.foldAngleDeg,
    d,
    meshD: spec.meshD ? spec.meshD(context) : d,
    previewCutoutD: spec.previewCutoutD ? spec.previewCutoutD(context) : "",
    labelPosition: [labelX, labelY],
    labelLayout: {
      text: spec.displayName,
      x: labelX,
      y: labelY,
      fontSize: spec.labelFontSize,
      rotationDeg: spec.labelRotationDeg || 0,
      maxWidth: 0,
      lineHeight: 1.2
    },
    custom3d: spec.custom3d || null,
    objectId: "pillowpack"
  };
}

function buildTemplatePanel(spec) {
  return {
    id: spec.id,
    displayName: spec.displayName,
    standardName: spec.standardName,
    type: spec.type,
    isGlue: spec.isGlue,
    foldParent: spec.foldParent,
    foldId: spec.foldId || null,
    foldAngleDeg: spec.foldAngleDeg,
    custom3d: spec.custom3d || null
  };
}

const TEMPLATE_PANELS = PANEL_SPECS.map(buildTemplatePanel);
const TEMPLATE_FOLD_SEQUENCE = [...FOLD_SPECS]
  .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
  .map(fold => fold.id);

function buildPillowpackGeometry(params, template) {
  const L = Math.max(1, Number(params.L) || template.defaults.L);
  const W = Math.max(1, Number(params.W) || template.defaults.W);
  const H = Math.max(0.1, Number(params.H) || template.defaults.H);
  const GLUE = Math.max(0, Number(params.GLUE) || template.defaults.GLUE);
  const TH = Math.max(0, Number(params.TH) || template.defaults.TH);

  const bodyWidth = mm(W);
  const bodyLength = mm(L);
  const flapSagitta = mm(H / 2);
  const flapRadius = arcRadiusFromChordAndSagitta(bodyWidth, flapSagitta);
  const glueWidth = mm(GLUE);
  const glueRadius = Math.max(0.001, mm(H / 2 + (GLUE / 2)));
  const thumbRadius = mm(TH / 2);
  const marginX = mm(25);
  const marginY = mm(40.5);

  const x0 = marginX;
  const x1 = x0 + bodyWidth;
  const x2 = x1 + bodyWidth;
  const x3 = x2 + glueWidth;
  const yTop = marginY;
  const yBottom = yTop + bodyLength;
  const yBottomPeak = yBottom + flapSagitta;
  const pageW = x3 + marginX;
  const pageH = yBottomPeak + marginY;

  const frontCenterX = x0 + bodyWidth / 2;
  const backCenterX = x1 + bodyWidth / 2;
  const centerY = yTop + bodyLength / 2;
  const topFlapCenterY = yTop;
  const bottomFlapCenterY = yBottom;

  const frontPanelPath = buildPanelPath(x0, x1, yTop, yBottom, flapRadius);
  const backPanelPath = buildPanelPath(x1, x2, yTop, yBottom, flapRadius);
  const frontPanelMeshPath = buildPanelMeshPath(x0, x1, yTop, yBottom, flapRadius);
  const backPanelMeshPath = buildPanelMeshPath(x1, x2, yTop, yBottom, flapRadius);
  const glueFlapPath = buildGlueFlapPath(x2, x3, yTop, yBottom, glueRadius);
  const frontTopFlapPath = buildFrontTopFlapPath(x0, x1, yTop, flapRadius);
  const frontBottomFlapPath = buildFrontBottomFlapPath(x0, x1, yBottom, flapRadius, thumbRadius);
  const backTopFlapPath = buildBackTopFlapPath(x1, x2, yTop, flapRadius);
  const backBottomFlapPath = buildBackBottomFlapPath(x1, x2, yBottom, flapRadius);
  const frontBottomNotchEdgeY = yBottom + arcDepthAtDistance(flapRadius, bodyWidth / 2, thumbRadius);
  const frontBottomThumbholeCutoutPath = buildThumbholeCutoutPath(frontCenterX, frontBottomNotchEdgeY, thumbRadius);

  const frontTopFoldPath = `M ${roundValue(x0)} ${roundValue(yTop)} A ${roundValue(flapRadius)} ${roundValue(flapRadius)} 0 0 0 ${roundValue(x1)} ${roundValue(yTop)}`;
  const backTopFoldPath = `M ${roundValue(x1)} ${roundValue(yTop)} A ${roundValue(flapRadius)} ${roundValue(flapRadius)} 0 0 0 ${roundValue(x2)} ${roundValue(yTop)}`;
  const frontBottomFoldPath = `M ${roundValue(x0)} ${roundValue(yBottom)} A ${roundValue(flapRadius)} ${roundValue(flapRadius)} 0 0 1 ${roundValue(x1)} ${roundValue(yBottom)}`;
  const backBottomFoldPath = `M ${roundValue(x1)} ${roundValue(yBottom)} A ${roundValue(flapRadius)} ${roundValue(flapRadius)} 0 0 1 ${roundValue(x2)} ${roundValue(yBottom)}`;
  const middleFoldPath = linePath(x1, yBottom, x1, yTop);
  const glueFoldPath = linePath(x2, yTop, x2, yBottom);

  const frontBottomCutPath = buildFrontBottomCutPath(x0, frontCenterX, x1, yBottom, flapRadius, thumbRadius);
  const context = {
    x0,
    x1,
    x2,
    x3,
    yTop,
    yBottom,
    bodyWidth,
    bodyLength,
    flapSagitta,
    glueWidth,
    thumbRadius,
    frontCenterX,
    backCenterX,
    centerY,
    topFlapCenterY,
    bottomFlapCenterY,
    frontPanelPath,
    backPanelPath,
    frontPanelMeshPath,
    backPanelMeshPath,
    glueFlapPath,
    frontTopFlapPath,
    frontBottomFlapPath,
    backTopFlapPath,
    backBottomFlapPath,
    frontBottomThumbholeCutoutPath,
    frontTopFoldPath,
    backTopFoldPath,
    frontBottomFoldPath,
    backBottomFoldPath,
    middleFoldPath,
    glueFoldPath
  };
  const custom3d = buildPillowpackCustom3d(context);

  const cutPaths = [
    {
      id: "page1-cut-curves-south-left",
      d: frontBottomCutPath
    },
    {
      id: "page1-cut-curves-and-glue-east",
      d: [
        `M ${roundValue(x1)} ${roundValue(yBottom)}`,
        `A ${roundValue(flapRadius)} ${roundValue(flapRadius)} 0 0 0 ${roundValue(x2)} ${roundValue(yBottom)}`,
        `C ${roundValue(x2)} ${roundValue(yBottom)} ${roundValue(x3)} ${roundValue(yBottom - (glueRadius * GLUE_FLAP_HANDLE_RATIO))} ${roundValue(x3)} ${roundValue(yBottom - glueRadius)}`,
        `L ${roundValue(x3)} ${roundValue(yTop + glueRadius)}`,
        `C ${roundValue(x3)} ${roundValue(yTop + (glueRadius * GLUE_FLAP_HANDLE_RATIO))} ${roundValue(x2)} ${roundValue(yTop)} ${roundValue(x2)} ${roundValue(yTop)}`,
        `A ${roundValue(flapRadius)} ${roundValue(flapRadius)} 0 0 0 ${roundValue(x1)} ${roundValue(yTop)}`
      ].join(" ")
    },
    {
      id: "page1-cut-curves-north-left",
      d: `M ${roundValue(x1)} ${roundValue(yTop)} A ${roundValue(flapRadius)} ${roundValue(flapRadius)} 0 0 0 ${roundValue(x0)} ${roundValue(yTop)}`
    },
    {
      id: "page1-cut-west",
      d: linePath(x0, yBottom, x0, yTop)
    }
  ].filter(path => path.d);
  const panels = PANEL_SPECS.map(spec => buildRuntimePanel(spec, context));
  const folds = FOLD_SPECS.map(spec => ({
    id: spec.id,
    from: spec.from,
    to: spec.to,
    displayName: spec.displayName,
    d: spec.d(context),
    hingeD: spec.hingeD(context),
    angleDeg: spec.angleDeg
  }));
  const foldSequence = TEMPLATE_FOLD_SEQUENCE;

  const geometry = {
    pageW: roundValue(pageW),
    pageH: roundValue(pageH),
    outlineD: "",
    slitD: "",
    lockCutoutD: "",
    cutPaths,
    panels,
    folds,
    glueAreas: [],
    rootPanel: "front-panel",
    rootPanels: ["front-panel"],
    floorPanel: "front-panel",
    floorFoldId: "",
    floorFoldDistribution: null,
    foldSequence,
    defaultAssemblySteps: TEMPLATE_DEFINITION.defaultAssemblySteps.map(step => ({ ...step })),
    flatSheetD: "",
    custom3d,
    __cacheKey: JSON.stringify({
      templateId: "pillowpack",
      cutPaths: cutPaths.map(path => ({ id: path.id, d: path.d })),
      panels: panels.map(panel => ({
        id: panel.id,
        d: panel.d,
        meshD: panel.meshD || "",
        parent: panel.parent,
        foldId: panel.foldId,
        angle: panel.angle,
        custom3d: panel.custom3d || null
      })),
      folds: folds.map(fold => ({ id: fold.id, d: fold.d, angleDeg: fold.angleDeg })),
      custom3d
    })
  };

  const metadataJson = buildMetadataJson(
    template,
    geometry,
    { length: L, width: W, height: H },
    { glueFlapSize: GLUE, thumbHoleDiameter: TH },
    "static/template-builders/pillowpack.js"
  );
  metadataJson.custom3d = geometry.custom3d;
  metadataJson.nominalDimensions.lengthMm = roundValue(L);
  metadataJson.nominalDimensions.widthMm = roundValue(W);
  metadataJson.nominalDimensions.heightMm = roundValue(H);
  metadataJson.nominalDimensions.glueFlapSizeMm = roundValue(GLUE);
  metadataJson.nominalDimensions.thumbHoleDiameterMm = roundValue(TH);

  return {
    svgText: renderStructuredSvg(template, geometry, metadataJson),
    metadata: metadataJson,
    geometry
  };
}

const TEMPLATE_DEFINITION = {
  id: "pillowpack",
  name: "Pillow Pack",
  icon: "icon-pillowpack",
  title: "Pillow Pack Template",
  summary: "Procedurally generated pillow pack dieline with curved shell panels, curved end flaps, and a formed 3D preview path.",
  defaults: { L: 80, W: 70, H: 15, GLUE: 15, TH: 10 },
  metadataDimensionMap: {
    L: "length",
    W: "width",
    H: "height"
  },
  fieldGroups: {
    primary: [
      { key: "L", label: "Length", kind: "length", min: 1, step: 0.1 },
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 0.1, step: 0.1 }
    ],
    optional: [
      { key: "GLUE", label: "Glue Flap Size", kind: "length", min: 0, step: 0.1 },
      { key: "TH", label: "Thumb Hole Diameter", kind: "length", min: 0, step: 0.1 }
    ]
  },
  panels: TEMPLATE_PANELS,
  floorPanel: "front-panel",
  defaultFoldProgress: 0,
  foldSequence: TEMPLATE_FOLD_SEQUENCE,
  defaultAssemblySteps: []
};

export default createProceduralTemplateBuilder(TEMPLATE_DEFINITION, buildPillowpackGeometry);
