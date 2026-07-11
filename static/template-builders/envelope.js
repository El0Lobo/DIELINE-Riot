import { buildMetadataJson, clamp, createProceduralTemplateBuilder, linePath, renderStructuredSvg, roundValue } from "./helpers.js";

const SQRT_13 = Math.sqrt(13);
const U = [3 / SQRT_13, -2 / SQRT_13];
const V = [2 / SQRT_13, 3 / SQRT_13];

const TOP_FLAP = {
  topFlatStartRatio: 71.12 / 150,
  topFlatEndRatio: 78.88 / 150,
  depthRatio: 59.91 / 150
};

const SIDE_FLAP = {
  upperRatio: 44.18 / 100,
  lowerRatio: 55.83 / 100,
  depthRatio: 66.27 / 100
};

const TEMPLATE_DEFINITION = {
  id: "envelope",
  name: "Envelope",
  icon: "icon-envelope",
  title: "Envelope Template",
  summary: "Structured imported envelope dieline with its original panel and fold metadata.",
  defaults: { W: 150, H: 100, O: 12.5, R: 7 },
  metadataDimensionMap: {
    W: "width",
    H: "height",
    O: "overlap"
  },
  custom3d: {
    stackMultiplier: 2,
    camera: {
      flatView: "top",
      foldedView: "front",
      flatPadding: 1.1,
      foldedPadding: 1.26,
      foldedTargetOffset: [0, 0, 0.08]
    }
  },
  fieldGroups: {
    primary: [
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 1, step: 0.1 }
    ],
    optional: [
      { key: "O", label: "Overlap", kind: "length", min: 0, step: 0.1 },
      { key: "R", label: "Rounded Corners Radius", kind: "length", min: 0, step: 0.1 }
    ]
  },
  parametricRule: { xKeys: ["H", "W", "O"], yKeys: ["R", "W", "O"] },
  panels: [
    { id: "body", displayName: "body", standardName: "body", type: "panel", isGlue: false, foldParent: null, foldId: null, foldAngleDeg: 0 },
    { id: "top-flap", displayName: "top-flap", standardName: "top-flap", type: "panel", isGlue: false, foldParent: "body", foldId: "fold-top", foldAngleDeg: 180 },
    { id: "right-flap", displayName: "right-flap", standardName: "right-flap", type: "panel", isGlue: false, foldParent: "body", foldId: "fold-right", foldAngleDeg: 180 },
    { id: "bottom-flap", displayName: "bottom-flap", standardName: "bottom-flap", type: "panel", isGlue: false, foldParent: "body", foldId: "fold-bottom", foldAngleDeg: 180 },
    { id: "left-flap", displayName: "left-flap", standardName: "left-flap", type: "panel", isGlue: false, foldParent: "body", foldId: "fold-left", foldAngleDeg: 180 }
  ],
  floorPanel: "body"
};

function add([ax, ay], [bx, by]) {
  return [ax + bx, ay + by];
}

function mul([x, y], s) {
  return [x * s, y * s];
}

function pathFromPoints(points) {
  const [first, ...rest] = points;
  return [
    `M ${roundValue(first[0])} ${roundValue(first[1])}`,
    ...rest.map(([x, y]) => `L ${roundValue(x)} ${roundValue(y)}`),
    "Z"
  ].join(" ");
}

function obliquePoint(origin, x, y) {
  return add(origin, add(mul(U, x), mul(V, y)));
}

function bounds(points) {
  return points.reduce((box, [x, y]) => ({
    minX: Math.min(box.minX, x),
    minY: Math.min(box.minY, y),
    maxX: Math.max(box.maxX, x),
    maxY: Math.max(box.maxY, y)
  }), {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY
  });
}

function shiftPoint([x, y], dx, dy) {
  return [x + dx, y + dy];
}

function lineIntersection(a1, a2, b1, b2) {
  const dax = a2[0] - a1[0];
  const day = a2[1] - a1[1];
  const dbx = b2[0] - b1[0];
  const dby = b2[1] - b1[1];
  const denom = dax * dby - day * dbx;
  if (Math.abs(denom) < 1e-9) {
    return [(a2[0] + b1[0]) / 2, (a2[1] + b1[1]) / 2];
  }
  const dx = b1[0] - a1[0];
  const dy = b1[1] - a1[1];
  const t = (dx * dby - dy * dbx) / denom;
  return [a1[0] + dax * t, a1[1] + day * t];
}

function centroid(points) {
  const [sumX, sumY] = points.reduce(
    ([ax, ay], [x, y]) => [ax + x, ay + y],
    [0, 0]
  );
  return [sumX / points.length, sumY / points.length];
}

function buildEnvelopeGeometry(params, template) {
  const W = Math.max(1, Number(params.W) || template.defaults.W);
  const H = Math.max(1, Number(params.H) || template.defaults.H);
  const O = Math.max(0, Number(params.O) || template.defaults.O);
  const requestedRadius = Math.max(0, Number(params.R) || template.defaults.R);

  const topDepth = TOP_FLAP.depthRatio * W;
  const topFlatStart = TOP_FLAP.topFlatStartRatio * W;
  const topFlatEnd = TOP_FLAP.topFlatEndRatio * W;
  const sideDepth = SIDE_FLAP.depthRatio * H;
  const sideUpper = SIDE_FLAP.upperRatio * H;
  const sideLower = SIDE_FLAP.lowerRatio * H;
  const topArcChord = Math.max(0.1, topFlatEnd - topFlatStart);
  const sideArcChord = Math.max(0.1, sideLower - sideUpper);
  const topRadius = clamp(requestedRadius, topArcChord / 2, Math.max(topDepth, topArcChord));
  const sideRadius = clamp(requestedRadius, sideArcChord / 2, Math.max(sideDepth, sideArcChord));

  const origin = [0, 0];

  const A = obliquePoint(origin, 0, 0);
  const B = obliquePoint(origin, W, 0);
  const C = obliquePoint(origin, W, H);
  const D = obliquePoint(origin, 0, H);

  const topOuterA = obliquePoint(origin, 0, -O);
  const topOuterB = obliquePoint(origin, W, -O);
  const topArcStart = obliquePoint(origin, topFlatEnd, -topDepth);
  const topArcEnd = obliquePoint(origin, topFlatStart, -topDepth);

  const rightArcStart = obliquePoint(origin, W + sideDepth, sideLower);
  const rightArcEnd = obliquePoint(origin, W + sideDepth, sideUpper);

  const bottomArcStart = obliquePoint(origin, W - topFlatEnd, H + topDepth);
  const bottomArcEnd = obliquePoint(origin, W - topFlatStart, H + topDepth);
  const bottomOuterB = obliquePoint(origin, W, H + O);
  const bottomOuterA = obliquePoint(origin, 0, H + O);

  const leftArcStart = obliquePoint(origin, -sideDepth, H - sideLower);
  const leftArcEnd = obliquePoint(origin, -sideDepth, H - sideUpper);

  const perimeterPoints = [
    D,
    bottomOuterA,
    bottomArcStart,
    bottomArcEnd,
    bottomOuterB,
    C,
    rightArcStart,
    rightArcEnd,
    B,
    topOuterB,
    topArcStart,
    topArcEnd,
    topOuterA,
    A,
    leftArcStart,
    leftArcEnd
  ];

  const box = bounds(perimeterPoints);
  const margin = 25;
  const dx = margin - box.minX;
  const dy = margin - box.minY;
  const shift = point => shiftPoint(point, dx, dy);

  const sA = shift(A);
  const sB = shift(B);
  const sC = shift(C);
  const sD = shift(D);
  const sTopOuterA = shift(topOuterA);
  const sTopOuterB = shift(topOuterB);
  const sTopArcStart = shift(topArcStart);
  const sTopArcEnd = shift(topArcEnd);
  const sRightArcStart = shift(rightArcStart);
  const sRightArcEnd = shift(rightArcEnd);
  const sBottomArcStart = shift(bottomArcStart);
  const sBottomArcEnd = shift(bottomArcEnd);
  const sBottomOuterB = shift(bottomOuterB);
  const sBottomOuterA = shift(bottomOuterA);
  const sLeftArcStart = shift(leftArcStart);
  const sLeftArcEnd = shift(leftArcEnd);

  const bodyPoints = [sA, sB, sC, sD];
  const topFlapPoints = [sA, sB, sTopOuterB, sTopArcStart, sTopArcEnd, sTopOuterA];
  const rightFlapPoints = [sB, sC, sRightArcStart, sRightArcEnd];
  const bottomFlapPoints = [sC, sD, sBottomOuterA, sBottomArcStart, sBottomArcEnd, sBottomOuterB];
  const leftFlapPoints = [sD, sA, sLeftArcStart, sLeftArcEnd];
  const topCornerControl = lineIntersection(sTopOuterB, sTopArcStart, sTopOuterA, sTopArcEnd);
  const rightCornerControl = lineIntersection(sC, sRightArcStart, sB, sRightArcEnd);
  const bottomCornerControl = lineIntersection(sBottomOuterA, sBottomArcStart, sBottomOuterB, sBottomArcEnd);
  const leftCornerControl = lineIntersection(sA, sLeftArcStart, sD, sLeftArcEnd);

  const bodyCenter = centroid(bodyPoints);
  const topFlapCenter = centroid(topFlapPoints);
  const rightFlapCenter = centroid(rightFlapPoints);
  const bottomFlapCenter = centroid(bottomFlapPoints);
  const leftFlapCenter = centroid(leftFlapPoints);
  const labelScale = Math.min(W / 150, H / 100);
  const bodyFontSize = clamp(16 * labelScale, 6, 18);
  const flapFontSize = clamp(10 * labelScale, 5, 11);

  const bodyPath = pathFromPoints(bodyPoints);
  const topFlapPath = [
    `M ${roundValue(sA[0])} ${roundValue(sA[1])}`,
    `L ${roundValue(sB[0])} ${roundValue(sB[1])}`,
    `L ${roundValue(sTopOuterB[0])} ${roundValue(sTopOuterB[1])}`,
    `L ${roundValue(sTopArcStart[0])} ${roundValue(sTopArcStart[1])}`,
    `Q ${roundValue(topCornerControl[0])} ${roundValue(topCornerControl[1])} ${roundValue(sTopArcEnd[0])} ${roundValue(sTopArcEnd[1])}`,
    `L ${roundValue(sTopOuterA[0])} ${roundValue(sTopOuterA[1])}`,
    "Z"
  ].join(" ");
  const rightFlapPath = [
    `M ${roundValue(sB[0])} ${roundValue(sB[1])}`,
    `L ${roundValue(sC[0])} ${roundValue(sC[1])}`,
    `L ${roundValue(sRightArcStart[0])} ${roundValue(sRightArcStart[1])}`,
    `Q ${roundValue(rightCornerControl[0])} ${roundValue(rightCornerControl[1])} ${roundValue(sRightArcEnd[0])} ${roundValue(sRightArcEnd[1])}`,
    "Z"
  ].join(" ");
  const bottomFlapPath = [
    `M ${roundValue(sC[0])} ${roundValue(sC[1])}`,
    `L ${roundValue(sD[0])} ${roundValue(sD[1])}`,
    `L ${roundValue(sBottomOuterA[0])} ${roundValue(sBottomOuterA[1])}`,
    `L ${roundValue(sBottomArcStart[0])} ${roundValue(sBottomArcStart[1])}`,
    `Q ${roundValue(bottomCornerControl[0])} ${roundValue(bottomCornerControl[1])} ${roundValue(sBottomArcEnd[0])} ${roundValue(sBottomArcEnd[1])}`,
    `L ${roundValue(sBottomOuterB[0])} ${roundValue(sBottomOuterB[1])}`,
    "Z"
  ].join(" ");
  const leftFlapPath = [
    `M ${roundValue(sD[0])} ${roundValue(sD[1])}`,
    `L ${roundValue(sA[0])} ${roundValue(sA[1])}`,
    `L ${roundValue(sLeftArcStart[0])} ${roundValue(sLeftArcStart[1])}`,
    `Q ${roundValue(leftCornerControl[0])} ${roundValue(leftCornerControl[1])} ${roundValue(sLeftArcEnd[0])} ${roundValue(sLeftArcEnd[1])}`,
    "Z"
  ].join(" ");

  const outlineD = [
    `M ${roundValue(sD[0])} ${roundValue(sD[1])}`,
    `L ${roundValue(sBottomOuterA[0])} ${roundValue(sBottomOuterA[1])}`,
    `L ${roundValue(sBottomArcStart[0])} ${roundValue(sBottomArcStart[1])}`,
    `Q ${roundValue(bottomCornerControl[0])} ${roundValue(bottomCornerControl[1])} ${roundValue(sBottomArcEnd[0])} ${roundValue(sBottomArcEnd[1])}`,
    `L ${roundValue(sBottomOuterB[0])} ${roundValue(sBottomOuterB[1])}`,
    `L ${roundValue(sC[0])} ${roundValue(sC[1])}`,
    `L ${roundValue(sRightArcStart[0])} ${roundValue(sRightArcStart[1])}`,
    `Q ${roundValue(rightCornerControl[0])} ${roundValue(rightCornerControl[1])} ${roundValue(sRightArcEnd[0])} ${roundValue(sRightArcEnd[1])}`,
    `L ${roundValue(sB[0])} ${roundValue(sB[1])}`,
    `L ${roundValue(sTopOuterB[0])} ${roundValue(sTopOuterB[1])}`,
    `L ${roundValue(sTopArcStart[0])} ${roundValue(sTopArcStart[1])}`,
    `Q ${roundValue(topCornerControl[0])} ${roundValue(topCornerControl[1])} ${roundValue(sTopArcEnd[0])} ${roundValue(sTopArcEnd[1])}`,
    `L ${roundValue(sTopOuterA[0])} ${roundValue(sTopOuterA[1])}`,
    `L ${roundValue(sA[0])} ${roundValue(sA[1])}`,
    `L ${roundValue(sLeftArcStart[0])} ${roundValue(sLeftArcStart[1])}`,
    `Q ${roundValue(leftCornerControl[0])} ${roundValue(leftCornerControl[1])} ${roundValue(sLeftArcEnd[0])} ${roundValue(sLeftArcEnd[1])}`,
    "Z"
  ].join(" ");

  const panels = [
    {
      id: "body",
      standardName: "body",
      displayName: "body",
      label: "body",
      type: "panel",
      isGlue: false,
      parent: null,
      foldId: "",
      angle: 0,
      d: bodyPath,
      meshD: bodyPath,
      labelPosition: bodyCenter,
      labelLayout: { text: "body", x: bodyCenter[0], y: bodyCenter[1], fontSize: bodyFontSize, rotationDeg: -33, maxWidth: 0, lineHeight: 1.2 },
      objectId: ""
    },
    {
      id: "top-flap",
      standardName: "top-flap",
      displayName: "top-flap",
      label: "top-flap",
      type: "panel",
      isGlue: false,
      parent: "body",
      foldId: "fold-top",
      angle: 180,
      d: topFlapPath,
      meshD: topFlapPath,
      labelPosition: topFlapCenter,
      labelLayout: { text: "top-flap", x: topFlapCenter[0], y: topFlapCenter[1], fontSize: flapFontSize, rotationDeg: 150, maxWidth: 0, lineHeight: 1.2 },
      objectId: ""
    },
    {
      id: "right-flap",
      standardName: "right-flap",
      displayName: "right-flap",
      label: "right-flap",
      type: "panel",
      isGlue: false,
      parent: "body",
      foldId: "fold-right",
      angle: 180,
      d: rightFlapPath,
      meshD: rightFlapPath,
      labelPosition: rightFlapCenter,
      labelLayout: { text: "right-flap", x: rightFlapCenter[0], y: rightFlapCenter[1], fontSize: flapFontSize, rotationDeg: -33, maxWidth: 0, lineHeight: 1.2 },
      objectId: ""
    },
    {
      id: "bottom-flap",
      standardName: "bottom-flap",
      displayName: "bottom-flap",
      label: "bottom-flap",
      type: "panel",
      isGlue: false,
      parent: "body",
      foldId: "fold-bottom",
      angle: 180,
      d: bottomFlapPath,
      meshD: bottomFlapPath,
      labelPosition: bottomFlapCenter,
      labelLayout: { text: "bottom-flap", x: bottomFlapCenter[0], y: bottomFlapCenter[1], fontSize: flapFontSize, rotationDeg: 150, maxWidth: 0, lineHeight: 1.2 },
      objectId: ""
    },
    {
      id: "left-flap",
      standardName: "left-flap",
      displayName: "left-flap",
      label: "left-flap",
      type: "panel",
      isGlue: false,
      parent: "body",
      foldId: "fold-left",
      angle: 180,
      d: leftFlapPath,
      meshD: leftFlapPath,
      labelPosition: leftFlapCenter,
      labelLayout: { text: "left-flap", x: leftFlapCenter[0], y: leftFlapCenter[1], fontSize: flapFontSize, rotationDeg: -33, maxWidth: 0, lineHeight: 1.2 },
      objectId: ""
    }
  ];

  const folds = [
    { id: "fold-top", from: "body", to: "top-flap", d: linePath(sA[0], sA[1], sB[0], sB[1]), angleDeg: -180, displayName: "body to top-flap" },
    { id: "fold-right", from: "body", to: "right-flap", d: linePath(sB[0], sB[1], sC[0], sC[1]), angleDeg: -180, displayName: "body to right-flap" },
    { id: "fold-bottom", from: "body", to: "bottom-flap", d: linePath(sC[0], sC[1], sD[0], sD[1]), angleDeg: -180, displayName: "body to bottom-flap" },
    { id: "fold-left", from: "body", to: "left-flap", d: linePath(sD[0], sD[1], sA[0], sA[1]), angleDeg: -180, displayName: "body to left-flap" }
  ];

  const geometry = {
    pageW: roundValue(box.maxX - box.minX + margin * 2),
    pageH: roundValue(box.maxY - box.minY + margin * 2),
    outlineD,
    slitD: "",
    lockCutoutD: "",
    panels,
    folds,
    glueAreas: [],
    rootPanel: "body",
    rootPanels: ["body"],
    floorPanel: "body",
    floorFoldId: "",
    floorFoldDistribution: { from: 0.5, to: 0.5 },
    flatSheetD: "",
    __cacheKey: JSON.stringify({
      templateId: "envelope",
      dimensions: { W: roundValue(W), H: roundValue(H), O: roundValue(O), R: roundValue(requestedRadius) }
    })
  };

  const metadataJson = buildMetadataJson(
    template,
    geometry,
    { width: W, height: H, overlap: O },
    { overlap: O, roundedCornersRadius: requestedRadius },
    "static/template-builders/envelope.js"
  );

  return {
    svgText: renderStructuredSvg(template, geometry, metadataJson),
    metadata: metadataJson,
    geometry
  };
}

export default createProceduralTemplateBuilder(TEMPLATE_DEFINITION, buildEnvelopeGeometry);
