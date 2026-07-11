import { buildMetadataJson, clamp, createProceduralTemplateBuilder, linePath, rectPath, renderStructuredSvg, roundValue } from "./helpers.js";

const MAILER_SOURCE_RATIOS = {
  tabBaseInset: 0.31833116883116885,
  tabArcInset: 0.4284415584415584,
  tabHeightOverWidth: 0.10995454545454544,
  taperHeightOverWidth: 0.31789090909090906,
  notchStartInset: 0.24435064935064937,
  notchShoulderInset: 0.30059090909090913,
  notchCenterDx: 0.12271428571428569,
  notchDepthOverWidth: 0.16625454545454554,
  slitInsetOverThumb: 0.7612992125984248,
  slitCp1DxOverThumb: 0.07484251968503979,
  slitCp2DxOverThumb: 0.16326771653543273,
  slitDepthOverThumbRadius: 0.52
};

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

function buildMailerParametricWarps(params, defaults) {
  const xUnitScale = estimateTemplateUnitScale(
    getAxisIntervals([25, 41, 51.6, 205.6, 216.2, 232.2]),
    defaults,
    ["DUST", "H", "L"]
  );
  const yUnitScale = estimateTemplateUnitScale(
    getAxisIntervals([32.6, 44.695, 79.663, 99.263, 110.463, 220.863, 232.063, 342.463]),
    defaults,
    ["TH", "H", "W", "O"]
  );

  const dust = Math.max(0, Number(params.DUST)) * xUnitScale;
  const heightX = Math.max(0, Number(params.H)) * xUnitScale;
  const length = Math.max(0, Number(params.L)) * xUnitScale;
  const heightY = Math.max(0, Number(params.H)) * yUnitScale;
  const width = Math.max(0, Number(params.W)) * yUnitScale;
  const overlap = Math.max(0, Number(params.O)) * yUnitScale;

  const xSource = {
    leftDustStart: 25,
    leftWallStart: 41,
    leftInner: 51.6,
    rightInner: 205.6,
    rightWallEnd: 216.2,
    rightDustEnd: 232.2
  };
  const xTarget = {
    leftDustStart: 51.6 - heightX - dust,
    leftWallStart: 51.6 - heightX,
    leftInner: 51.6,
    rightInner: 51.6 + length,
    rightWallEnd: 51.6 + length + heightX,
    rightDustEnd: 51.6 + length + heightX + dust
  };

  const ySource = {
    topStart: 32.6,
    lidTabEnd: 44.695,
    lidFlapPeakBase: 79.663,
    topWallStart: 99.263,
    baseTop: 110.463,
    baseBottom: 220.863,
    bottomWallEnd: 232.063,
    frontEnd: 342.463
  };
  const yTarget = {
    topStart: 32.6 + (((110.463 - heightY) - overlap) - 79.663),
    lidTabEnd: 44.695 + (((110.463 - heightY) - overlap) - 79.663),
    lidFlapPeakBase: (110.463 - heightY) - overlap,
    topWallStart: 110.463 - heightY,
    baseTop: 110.463,
    baseBottom: 110.463 + width,
    bottomWallEnd: 110.463 + width + heightY,
    frontEnd: (110.463 + width + heightY) + width
  };

  function warpLinear(value, sourceStart, sourceEnd, targetStart, targetEnd) {
    const ratio = (value - sourceStart) / Math.max(1e-6, sourceEnd - sourceStart);
    return targetStart + ratio * (targetEnd - targetStart);
  }

  function xWarpValue(value) {
    if (!Number.isFinite(value)) return value;
    if (value <= xSource.leftWallStart) {
      return warpLinear(value, xSource.leftDustStart, xSource.leftWallStart, xTarget.leftDustStart, xTarget.leftWallStart);
    }
    if (value <= xSource.leftInner) {
      return warpLinear(value, xSource.leftWallStart, xSource.leftInner, xTarget.leftWallStart, xTarget.leftInner);
    }
    if (value <= xSource.rightInner) {
      return warpLinear(value, xSource.leftInner, xSource.rightInner, xTarget.leftInner, xTarget.rightInner);
    }
    if (value <= xSource.rightWallEnd) {
      return warpLinear(value, xSource.rightInner, xSource.rightWallEnd, xTarget.rightInner, xTarget.rightWallEnd);
    }
    return warpLinear(value, xSource.rightWallEnd, xSource.rightDustEnd, xTarget.rightWallEnd, xTarget.rightDustEnd);
  }

  function yWarpValue(value) {
    if (!Number.isFinite(value)) return value;
    if (value <= ySource.lidFlapPeakBase) {
      return value + (yTarget.lidFlapPeakBase - ySource.lidFlapPeakBase);
    }
    if (value <= ySource.topWallStart) {
      return warpLinear(value, ySource.lidFlapPeakBase, ySource.topWallStart, yTarget.lidFlapPeakBase, yTarget.topWallStart);
    }
    if (value <= ySource.baseTop) {
      return warpLinear(value, ySource.topWallStart, ySource.baseTop, yTarget.topWallStart, yTarget.baseTop);
    }
    if (value <= ySource.baseBottom) {
      return warpLinear(value, ySource.baseTop, ySource.baseBottom, yTarget.baseTop, yTarget.baseBottom);
    }
    if (value <= ySource.bottomWallEnd) {
      return warpLinear(value, ySource.baseBottom, ySource.bottomWallEnd, yTarget.baseBottom, yTarget.bottomWallEnd);
    }
    if (value <= ySource.frontEnd) {
      return warpLinear(value, ySource.bottomWallEnd, ySource.frontEnd, yTarget.bottomWallEnd, yTarget.frontEnd);
    }
    return value + (yTarget.frontEnd - ySource.frontEnd);
  }

  function xScaleAt(value) {
    if (value <= xSource.leftWallStart) {
      return (xTarget.leftWallStart - xTarget.leftDustStart) / Math.max(1e-6, xSource.leftWallStart - xSource.leftDustStart);
    }
    if (value <= xSource.leftInner) {
      return (xTarget.leftInner - xTarget.leftWallStart) / Math.max(1e-6, xSource.leftInner - xSource.leftWallStart);
    }
    if (value <= xSource.rightInner) {
      return (xTarget.rightInner - xTarget.leftInner) / Math.max(1e-6, xSource.rightInner - xSource.leftInner);
    }
    if (value <= xSource.rightWallEnd) {
      return (xTarget.rightWallEnd - xTarget.rightInner) / Math.max(1e-6, xSource.rightWallEnd - xSource.rightInner);
    }
    return (xTarget.rightDustEnd - xTarget.rightWallEnd) / Math.max(1e-6, xSource.rightDustEnd - xSource.rightWallEnd);
  }

  function yScaleAt(value) {
    if (value <= ySource.lidFlapPeakBase) {
      return 1;
    }
    if (value <= ySource.topWallStart) {
      return (yTarget.topWallStart - yTarget.lidFlapPeakBase) / Math.max(1e-6, ySource.topWallStart - ySource.lidFlapPeakBase);
    }
    if (value <= ySource.baseTop) {
      return (yTarget.baseTop - yTarget.topWallStart) / Math.max(1e-6, ySource.baseTop - ySource.topWallStart);
    }
    if (value <= ySource.baseBottom) {
      return (yTarget.baseBottom - yTarget.baseTop) / Math.max(1e-6, ySource.baseBottom - ySource.baseTop);
    }
    if (value <= ySource.bottomWallEnd) {
      return (yTarget.bottomWallEnd - yTarget.baseBottom) / Math.max(1e-6, ySource.bottomWallEnd - ySource.baseBottom);
    }
    if (value <= ySource.frontEnd) {
      return (yTarget.frontEnd - yTarget.bottomWallEnd) / Math.max(1e-6, ySource.frontEnd - ySource.bottomWallEnd);
    }
    return 1;
  }

  return {
    xWarp: { warp: xWarpValue, scaleAt: xScaleAt },
    yWarp: { warp: yWarpValue, scaleAt: yScaleAt }
  };
}

function getArcSagitta(radius, chord) {
  const safeRadius = Math.max(radius, chord / 2 + 0.001);
  return safeRadius - Math.sqrt(Math.max(0, safeRadius * safeRadius - (chord * chord) / 4));
}

function buildMailerNotchPath(innerLeft, innerRight, frontWallBottom, frontOverlapBottom, length, width) {
  const centerX = (innerLeft + innerRight) / 2;
  const notchStartX = innerLeft + length * MAILER_SOURCE_RATIOS.notchStartInset;
  const notchEndX = innerRight - length * MAILER_SOURCE_RATIOS.notchStartInset;
  const leftShoulderX = innerLeft + length * MAILER_SOURCE_RATIOS.notchShoulderInset;
  const rightShoulderX = innerRight - length * MAILER_SOURCE_RATIOS.notchShoulderInset;
  const peakControlDx = length * MAILER_SOURCE_RATIOS.notchCenterDx;
  const peakY = frontOverlapBottom - width * MAILER_SOURCE_RATIOS.notchDepthOverWidth;
  return [
    `M ${roundValue(innerLeft)} ${roundValue(frontWallBottom)}`,
    `L ${roundValue(innerLeft)} ${roundValue(frontOverlapBottom)}`,
    `L ${roundValue(notchStartX)} ${roundValue(frontOverlapBottom)}`,
    `C ${roundValue(leftShoulderX)} ${roundValue(frontOverlapBottom)} ${roundValue(centerX - peakControlDx)} ${roundValue(peakY)} ${roundValue(centerX)} ${roundValue(peakY)}`,
    `C ${roundValue(centerX + peakControlDx)} ${roundValue(peakY)} ${roundValue(rightShoulderX)} ${roundValue(frontOverlapBottom)} ${roundValue(notchEndX)} ${roundValue(frontOverlapBottom)}`,
    `L ${roundValue(innerRight)} ${roundValue(frontOverlapBottom)}`,
    `L ${roundValue(innerRight)} ${roundValue(frontWallBottom)}`,
    "Z"
  ].join(" ");
}

function getMailerNotchSegments(innerLeft, innerRight, frontOverlapBottom, length, width) {
  const centerX = (innerLeft + innerRight) / 2;
  const notchStartX = innerLeft + length * MAILER_SOURCE_RATIOS.notchStartInset;
  const notchEndX = innerRight - length * MAILER_SOURCE_RATIOS.notchStartInset;
  const leftShoulderX = innerLeft + length * MAILER_SOURCE_RATIOS.notchShoulderInset;
  const rightShoulderX = innerRight - length * MAILER_SOURCE_RATIOS.notchShoulderInset;
  const peakControlDx = length * MAILER_SOURCE_RATIOS.notchCenterDx;
  const peakY = frontOverlapBottom - width * MAILER_SOURCE_RATIOS.notchDepthOverWidth;
  return {
    notchStartX,
    notchEndX,
    firstCurve: `C ${roundValue(leftShoulderX)} ${roundValue(frontOverlapBottom)} ${roundValue(centerX - peakControlDx)} ${roundValue(peakY)} ${roundValue(centerX)} ${roundValue(peakY)}`,
    secondCurve: `C ${roundValue(centerX + peakControlDx)} ${roundValue(peakY)} ${roundValue(rightShoulderX)} ${roundValue(frontOverlapBottom)} ${roundValue(notchEndX)} ${roundValue(frontOverlapBottom)}`
  };
}

const TEMPLATE_DEFINITION = {
  id: "mailer",
  name: "Mailer",
  icon: "icon-mailer",
  title: "Metric Mailer Generator",
  summary: "Current mailer preset with the structured dieline and lock tab already tuned for the existing geometry.",
  defaults: { L: 154, W: 110, H: 10, O: 20, TH: 25.4, TR: 8, T: 0.4, R: 19, DUST: 16, A: 80 },
  metadataDimensionMap: {
    L: "length",
    W: "width",
    H: "height",
    O: "overlap"
  },
  parametricWarpBuilder: buildMailerParametricWarps,
  fieldGroups: {
    primary: [
      { key: "L", label: "Length", kind: "length", min: 1, step: 0.1 },
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 0.1, step: 0.1 },
      { key: "O", label: "Overlap", kind: "length", min: 0, step: 0.1 }
    ],
    optional: [
      { key: "TH", label: "Thumb Hole Width", kind: "length", min: 0, step: 0.1 },
      { key: "TR", label: "Thumb Hole Rounded Corner", kind: "length", min: 0, step: 0.1 },
      { key: "T", label: "Material Thickness", kind: "length", min: 0, step: 0.1 },
      { key: "R", label: "Rounded Corners Radius", kind: "length", min: 0, step: 0.1 },
      { key: "DUST", label: "Dust Flap Size", kind: "length", min: 0, step: 0.1 },
      { key: "A", label: "Dust Flap Angle", kind: "angle", min: 15, max: 89, step: 1 }
    ]
  },
  parametricRule: {
    xBreakpoints: [25, 41, 51.6, 205.6, 216.2, 232.2],
    xKeys: ["DUST", "H", "L"],
    xIntervals: {
      0: { key: "DUST", mode: "absolute" },
      1: { key: "H", mode: "absolute" },
      2: { key: "L", mode: "absolute" },
      3: { key: "H", mode: "absolute" },
      4: { key: "DUST", mode: "absolute" }
    },
    yBreakpoints: [32.6, 44.695, 79.663, 99.263, 110.463, 220.863, 232.063, 342.463],
    yKeys: ["TH", "H", "W", "O"],
    yIntervals: {
      3: { key: "H", mode: "absolute" },
      4: { key: "W", mode: "absolute" },
      5: { key: "H", mode: "absolute" },
      6: { key: "W", mode: "absolute" }
    }
  },
  defaultAssemblySteps: [
    { type: "fold", foldId: "fold-back-to-bottom", angleDeg: 90, easing: "ease-in-out", syncWithPrevious: false },
    { type: "fold", foldId: "fold-front-to-left-wall", angleDeg: 90, easing: "ease-in-out", syncWithPrevious: false },
    { type: "fold", foldId: "fold-front-to-right-wall", angleDeg: -90, easing: "ease-in-out", syncWithPrevious: false },
    { type: "fold", foldId: "fold-left-wall-to-left-dust-flap", angleDeg: 90, easing: "ease-in-out", syncWithPrevious: false },
    { type: "fold", foldId: "fold-right-wall-to-right-dust-flap", angleDeg: -90, easing: "ease-in-out", syncWithPrevious: false },
    { type: "fold", foldId: "fold-bottom-to-front", angleDeg: 90, easing: "ease-in-out", syncWithPrevious: false },
    { type: "fold", foldId: "fold-back-to-top", angleDeg: -90, easing: "ease-in-out", syncWithPrevious: false },
    { type: "fold", foldId: "fold-top-to-lid-flap", angleDeg: -90, easing: "ease-in-out", syncWithPrevious: false },
    { type: "fold", foldId: "fold-lid-tab-to-lid-flap", angleDeg: -9, easing: "ease-in-out", syncWithPrevious: false }
  ],
  assembledDefaults: {
    viewName: "custom",
    modelCenter: [0, 0, 56.45],
    cameraPosition: [-267.428, 359.251, 253.017],
    cameraTarget: [-0.021, -20.11, 11.261],
    cameraOffset: [-267.428, 359.251, 196.567],
    targetOffset: [-0.021, -20.11, -45.189]
  },
  panels: [
    { id: "lid-tab", displayName: "lid-tab", standardName: "lid-tab", type: "panel", isGlue: false, foldParent: "lid-flap", foldId: "fold-lid-tab-to-lid-flap", foldAngleDeg: -9 },
    { id: "lid-flap", displayName: "lid-flap", standardName: "lid-flap", type: "panel", isGlue: false, foldParent: "top", foldId: "fold-top-to-lid-flap", foldAngleDeg: -90 },
    { id: "top", displayName: "top", standardName: "top", type: "panel", isGlue: false, foldParent: "back", foldId: "fold-back-to-top", foldAngleDeg: -90 },
    { id: "back", displayName: "back", standardName: "back", type: "panel", isGlue: false, foldParent: null, foldId: null, foldAngleDeg: 0 },
    { id: "bottom", displayName: "bottom", standardName: "bottom", type: "panel", isGlue: false, foldParent: "back", foldId: "fold-back-to-bottom", foldAngleDeg: 90 },
    { id: "front", displayName: "front", standardName: "front", type: "panel", isGlue: false, foldParent: "bottom", foldId: "fold-bottom-to-front", foldAngleDeg: 90 },
    { id: "left-wall", displayName: "left-wall", standardName: "left-wall", type: "panel", isGlue: false, foldParent: "front", foldId: "fold-front-to-left-wall", foldAngleDeg: 90 },
    { id: "right-wall", displayName: "right-wall", standardName: "right-wall", type: "panel", isGlue: false, foldParent: "front", foldId: "fold-front-to-right-wall", foldAngleDeg: -90 },
    { id: "left-dust-flap", displayName: "left-dust-flap", standardName: "left-dust-flap", type: "panel", isGlue: false, foldParent: "left-wall", foldId: "fold-left-wall-to-left-dust-flap", foldAngleDeg: 90 },
    { id: "right-dust-flap", displayName: "right-dust-flap", standardName: "right-dust-flap", type: "panel", isGlue: false, foldParent: "right-wall", foldId: "fold-right-wall-to-right-dust-flap", foldAngleDeg: -90 }
  ],
  floorPanel: "bottom",
  assembledFrontPanel: "front",
  custom3d: {
    camera: {
      foldedView: "front",
      facingPanel: "front",
      foldedState: {
        viewName: "custom",
        modelCenter: [0, 0, 56.45],
        cameraPosition: [-267.428, 359.251, 253.017],
        cameraTarget: [-0.021, -20.11, 11.261],
        cameraOffset: [-267.428, 359.251, 196.567],
        targetOffset: [-0.021, -20.11, -45.189]
      }
    }
  }
};

function buildMailerGeometry(params, template) {
  const L = Math.max(1, Number(params.L) || template.defaults.L);
  const W = Math.max(1, Number(params.W) || template.defaults.W);
  const H = Math.max(0.1, Number(params.H) || template.defaults.H);
  const O = Math.max(0, Number(params.O) || template.defaults.O);
  const TH = Math.max(0, Number(params.TH) || template.defaults.TH);
  const TR = Math.max(0, Number(params.TR) || template.defaults.TR);
  const T = Math.max(0, Number(params.T) || template.defaults.T);
  const R = Math.max(0, Number(params.R) || template.defaults.R);
  const DUST = Math.max(0, Number(params.DUST) || template.defaults.DUST);
  const A = clamp(Number(params.A) || template.defaults.A, 15, 89);

  const margin = 25;
  const innerLeft = margin + DUST + H;
  const innerRight = innerLeft + L;
  const leftWallOuter = innerLeft - H;
  const rightWallOuter = innerRight + H;
  const leftDustOuter = leftWallOuter - DUST;
  const rightDustOuter = rightWallOuter + DUST;
  const tabHeight = Math.max(4, W * MAILER_SOURCE_RATIOS.tabHeightOverWidth);
  const taperHeight = Math.max(6, W * MAILER_SOURCE_RATIOS.taperHeightOverWidth);
  const lipHeight = Math.max(0, O - T);
  const tipY = margin;
  const tabBaseY = tipY + tabHeight;
  const slopeStartY = tabBaseY + taperHeight;
  const rearWallTop = slopeStartY + lipHeight;
  const effectiveWallHeight = H + T * 3;
  const effectiveBaseHeight = W + T;
  const effectiveFrontOverlapHeight = W + T;
  const rearWallBottom = rearWallTop + effectiveWallHeight;
  const baseBottom = rearWallBottom + effectiveBaseHeight;
  const frontWallBottom = baseBottom + effectiveWallHeight;
  const frontOverlapBottom = frontWallBottom + effectiveFrontOverlapHeight;
  const dustInset = DUST > 0 ? DUST * Math.tan(((90 - A) * Math.PI) / 180) : 0;

  const tabBaseInset = L * MAILER_SOURCE_RATIOS.tabBaseInset;
  const tabArcInset = L * MAILER_SOURCE_RATIOS.tabArcInset;
  const tabBaseLeft = innerLeft + tabBaseInset;
  const tabBaseRight = innerRight - tabBaseInset;
  const tabArcLeft = innerLeft + tabArcInset;
  const tabArcRight = innerRight - tabArcInset;
  const tabArcChord = Math.max(0.001, tabArcRight - tabArcLeft);
  const tabTipSagitta = getArcSagitta(R, tabArcChord);
  const tabTipControlY = tipY - tabTipSagitta * 2;

  const lidTabPath = [
    `M ${roundValue(tabBaseLeft)} ${roundValue(tabBaseY)}`,
    `L ${roundValue(tabArcLeft)} ${roundValue(tipY)}`,
    `Q ${roundValue((tabArcLeft + tabArcRight) / 2)} ${roundValue(tabTipControlY)} ${roundValue(tabArcRight)} ${roundValue(tipY)}`,
    `L ${roundValue(tabBaseRight)} ${roundValue(tabBaseY)}`,
    "Z"
  ].join(" ");
  const lidFlapPath = [
    `M ${roundValue(innerLeft)} ${roundValue(rearWallTop)}`,
    `L ${roundValue(innerLeft)} ${roundValue(slopeStartY)}`,
    `L ${roundValue(tabBaseLeft)} ${roundValue(tabBaseY)}`,
    `L ${roundValue(tabBaseRight)} ${roundValue(tabBaseY)}`,
    `L ${roundValue(innerRight)} ${roundValue(slopeStartY)}`,
    `L ${roundValue(innerRight)} ${roundValue(rearWallTop)}`,
    "Z"
  ].join(" ");
  const rearWallPath = rectPath(innerLeft, rearWallTop, L, effectiveWallHeight);
  const basePath = rectPath(innerLeft, rearWallBottom, L, effectiveBaseHeight);
  const frontWallPath = rectPath(innerLeft, baseBottom, L, effectiveWallHeight);
  const notchSegments = getMailerNotchSegments(innerLeft, innerRight, frontOverlapBottom, L, W);
  const frontOverlapPath = buildMailerNotchPath(innerLeft, innerRight, frontWallBottom, frontOverlapBottom, L, W);
  const leftWallPath = rectPath(leftWallOuter, frontWallBottom, H, effectiveFrontOverlapHeight);
  const rightWallPath = rectPath(innerRight, frontWallBottom, H, effectiveFrontOverlapHeight);
  const leftDustFlapPath = [
    `M ${roundValue(leftWallOuter)} ${roundValue(frontWallBottom)}`,
    `L ${roundValue(leftDustOuter)} ${roundValue(frontWallBottom + dustInset)}`,
    `L ${roundValue(leftDustOuter)} ${roundValue(frontOverlapBottom - dustInset)}`,
    `L ${roundValue(leftWallOuter)} ${roundValue(frontOverlapBottom)}`,
    "Z"
  ].join(" ");
  const rightDustFlapPath = [
    `M ${roundValue(rightWallOuter)} ${roundValue(frontWallBottom)}`,
    `L ${roundValue(rightDustOuter)} ${roundValue(frontWallBottom + dustInset)}`,
    `L ${roundValue(rightDustOuter)} ${roundValue(frontOverlapBottom - dustInset)}`,
    `L ${roundValue(rightWallOuter)} ${roundValue(frontOverlapBottom)}`,
    "Z"
  ].join(" ");
  const outlineD = [
    `M ${roundValue(innerRight)} ${roundValue(frontWallBottom)}`,
    `L ${roundValue(innerRight)} ${roundValue(slopeStartY)}`,
    `L ${roundValue(tabBaseRight)} ${roundValue(tabBaseY)}`,
    `L ${roundValue(tabArcRight)} ${roundValue(tipY)}`,
    `Q ${roundValue((tabArcLeft + tabArcRight) / 2)} ${roundValue(tabTipControlY)} ${roundValue(tabArcLeft)} ${roundValue(tipY)}`,
    `L ${roundValue(tabBaseLeft)} ${roundValue(tabBaseY)}`,
    `L ${roundValue(innerLeft)} ${roundValue(slopeStartY)}`,
    `L ${roundValue(innerLeft)} ${roundValue(frontWallBottom)}`,
    `L ${roundValue(leftWallOuter)} ${roundValue(frontWallBottom)}`,
    `L ${roundValue(leftDustOuter)} ${roundValue(frontWallBottom + dustInset)}`,
    `L ${roundValue(leftDustOuter)} ${roundValue(frontOverlapBottom - dustInset)}`,
    `L ${roundValue(leftWallOuter)} ${roundValue(frontOverlapBottom)}`,
    `L ${roundValue(innerLeft)} ${roundValue(frontOverlapBottom)}`,
    `L ${roundValue(notchSegments.notchStartX)} ${roundValue(frontOverlapBottom)}`,
    notchSegments.firstCurve,
    notchSegments.secondCurve,
    `L ${roundValue(innerRight)} ${roundValue(frontOverlapBottom)}`,
    `L ${roundValue(rightWallOuter)} ${roundValue(frontOverlapBottom)}`,
    `L ${roundValue(rightDustOuter)} ${roundValue(frontOverlapBottom - dustInset)}`,
    `L ${roundValue(rightDustOuter)} ${roundValue(frontWallBottom + dustInset)}`,
    `L ${roundValue(rightWallOuter)} ${roundValue(frontWallBottom)}`,
    `L ${roundValue(innerRight)} ${roundValue(frontWallBottom)}`
  ].join(" ");

  const slitDepth = clamp(TR * MAILER_SOURCE_RATIOS.slitDepthOverThumbRadius, 1.8, 6);
  const slitCenterX = (innerLeft + innerRight) / 2;
  const slitY = frontWallBottom + (W + T) / 2;
  const slitStartX = tabBaseLeft;
  const slitEndX = tabBaseRight;
  const slitInnerStartX = slitCenterX - TH * MAILER_SOURCE_RATIOS.slitInsetOverThumb;
  const slitInnerEndX = slitCenterX + TH * MAILER_SOURCE_RATIOS.slitInsetOverThumb;
  const slitCp1Dx = TH * MAILER_SOURCE_RATIOS.slitCp1DxOverThumb;
  const slitCp2Dx = TH * MAILER_SOURCE_RATIOS.slitCp2DxOverThumb;
  const cutoutThickness = Math.max(T, 0.2);
  const slitD = [
    `M ${roundValue(slitStartX)} ${roundValue(slitY)}`,
    `L ${roundValue(slitInnerStartX)} ${roundValue(slitY)}`,
    `C ${roundValue(slitInnerStartX + slitCp1Dx)} ${roundValue(slitY)} ${roundValue(slitCenterX - slitCp2Dx)} ${roundValue(slitY - slitDepth)} ${roundValue(slitCenterX)} ${roundValue(slitY - slitDepth)}`,
    `C ${roundValue(slitCenterX + slitCp2Dx)} ${roundValue(slitY - slitDepth)} ${roundValue(slitInnerEndX - slitCp1Dx)} ${roundValue(slitY)} ${roundValue(slitInnerEndX)} ${roundValue(slitY)}`,
    `L ${roundValue(slitEndX)} ${roundValue(slitY)}`
  ].join(" ");
  const lockCutoutD = [
    `M ${roundValue(slitStartX)} ${roundValue(slitY)}`,
    `L ${roundValue(slitInnerStartX)} ${roundValue(slitY)}`,
    `C ${roundValue(slitInnerStartX + slitCp1Dx)} ${roundValue(slitY)} ${roundValue(slitCenterX - slitCp2Dx)} ${roundValue(slitY - slitDepth)} ${roundValue(slitCenterX)} ${roundValue(slitY - slitDepth)}`,
    `C ${roundValue(slitCenterX + slitCp2Dx)} ${roundValue(slitY - slitDepth)} ${roundValue(slitInnerEndX - slitCp1Dx)} ${roundValue(slitY)} ${roundValue(slitInnerEndX)} ${roundValue(slitY)}`,
    `L ${roundValue(slitEndX)} ${roundValue(slitY)}`,
    `L ${roundValue(slitEndX)} ${roundValue(slitY + cutoutThickness)}`,
    `L ${roundValue(slitStartX)} ${roundValue(slitY + cutoutThickness)}`,
    "Z"
  ].join(" ");

  const panels = [
    { id: "lid-tab", standardName: "lid-tab", displayName: "lid-tab", label: "lid-tab", type: "panel", isGlue: false, parent: "lid-flap", foldId: "fold-lid-tab-to-lid-flap", angle: -9, d: lidTabPath, meshD: lidTabPath, labelPosition: [(innerLeft + innerRight) / 2, (tipY + tabBaseY) / 2], labelLayout: { text: "lid-tab", x: (innerLeft + innerRight) / 2, y: (tipY + tabBaseY) / 2, fontSize: 6, rotationDeg: 0, maxWidth: 0, lineHeight: 1.2 }, objectId: "" },
    { id: "lid-flap", standardName: "lid-flap", displayName: "lid-flap", label: "lid-flap", type: "panel", isGlue: false, parent: "top", foldId: "fold-top-to-lid-flap", angle: -90, d: lidFlapPath, meshD: lidFlapPath, labelPosition: [(innerLeft + innerRight) / 2, (tabBaseY + rearWallTop) / 2], labelLayout: { text: "lid-flap", x: (innerLeft + innerRight) / 2, y: (tabBaseY + rearWallTop) / 2, fontSize: 12, rotationDeg: 0, maxWidth: 0, lineHeight: 1.2 }, objectId: "" },
    { id: "top", standardName: "top", displayName: "top", label: "top", type: "panel", isGlue: false, parent: "back", foldId: "fold-back-to-top", angle: -90, d: rearWallPath, meshD: rearWallPath, labelPosition: [(innerLeft + innerRight) / 2, rearWallTop + H / 2], labelLayout: { text: "top", x: (innerLeft + innerRight) / 2, y: rearWallTop + H / 2, fontSize: 6, rotationDeg: 180, maxWidth: 0, lineHeight: 1.2 }, objectId: "" },
    { id: "back", standardName: "back", displayName: "back", label: "back", type: "panel", isGlue: false, parent: null, foldId: "", angle: 0, d: basePath, meshD: basePath, labelPosition: [(innerLeft + innerRight) / 2, rearWallBottom + W / 2], labelLayout: { text: "back", x: (innerLeft + innerRight) / 2, y: rearWallBottom + W / 2, fontSize: 14, rotationDeg: 0, maxWidth: 0, lineHeight: 1.2 }, objectId: "" },
    { id: "bottom", standardName: "bottom", displayName: "bottom", label: "bottom", type: "panel", isGlue: false, parent: "back", foldId: "fold-back-to-bottom", angle: 90, d: frontWallPath, meshD: frontWallPath, labelPosition: [(innerLeft + innerRight) / 2, baseBottom + H / 2], labelLayout: { text: "bottom", x: (innerLeft + innerRight) / 2, y: baseBottom + H / 2, fontSize: 6, rotationDeg: 180, maxWidth: 0, lineHeight: 1.2 }, objectId: "" },
    { id: "front", standardName: "front", displayName: "front", label: "front", type: "panel", isGlue: false, parent: "bottom", foldId: "fold-bottom-to-front", angle: 90, d: frontOverlapPath, meshD: frontOverlapPath, labelPosition: [(innerLeft + innerRight) / 2, frontWallBottom + W * 0.36], labelLayout: { text: "front", x: (innerLeft + innerRight) / 2, y: frontWallBottom + W * 0.36, fontSize: 12, rotationDeg: 180, maxWidth: 0, lineHeight: 1.2 }, objectId: "" },
    { id: "left-wall", standardName: "left-wall", displayName: "left-wall", label: "left-wall", type: "panel", isGlue: false, parent: "front", foldId: "fold-front-to-left-wall", angle: 90, d: leftWallPath, meshD: leftWallPath, labelPosition: [leftWallOuter + H / 2, frontWallBottom + W / 2], labelLayout: { text: "left-wall", x: leftWallOuter + H / 2, y: frontWallBottom + W / 2, fontSize: 5, rotationDeg: 90, maxWidth: 0, lineHeight: 1.2 }, objectId: "" },
    { id: "right-wall", standardName: "right-wall", displayName: "right-wall", label: "right-wall", type: "panel", isGlue: false, parent: "front", foldId: "fold-front-to-right-wall", angle: -90, d: rightWallPath, meshD: rightWallPath, labelPosition: [innerRight + H / 2, frontWallBottom + W / 2], labelLayout: { text: "right-wall", x: innerRight + H / 2, y: frontWallBottom + W / 2, fontSize: 5, rotationDeg: 270, maxWidth: 0, lineHeight: 1.2 }, objectId: "" },
    { id: "left-dust-flap", standardName: "left-dust-flap", displayName: "left-dust-flap", label: "left-dust-flap", type: "panel", isGlue: false, parent: "left-wall", foldId: "fold-left-wall-to-left-dust-flap", angle: 90, d: leftDustFlapPath, meshD: leftDustFlapPath, labelPosition: [leftDustOuter + DUST / 2, frontWallBottom + W / 2], labelLayout: { text: "left-dust-flap", x: leftDustOuter + DUST / 2, y: frontWallBottom + W / 2, fontSize: 4.5, rotationDeg: 90, maxWidth: 0, lineHeight: 1.2 }, objectId: "" },
    { id: "right-dust-flap", standardName: "right-dust-flap", displayName: "right-dust-flap", label: "right-dust-flap", type: "panel", isGlue: false, parent: "right-wall", foldId: "fold-right-wall-to-right-dust-flap", angle: -90, d: rightDustFlapPath, meshD: rightDustFlapPath, labelPosition: [rightWallOuter + DUST / 2, frontWallBottom + W / 2], labelLayout: { text: "right-dust-flap", x: rightWallOuter + DUST / 2, y: frontWallBottom + W / 2, fontSize: 4.5, rotationDeg: 270, maxWidth: 0, lineHeight: 1.2 }, objectId: "" }
  ];

  const folds = [
    { id: "fold-lid-tab-to-lid-flap", from: "lid-flap", to: "lid-tab", d: linePath(tabBaseLeft, tabBaseY, tabBaseRight, tabBaseY), angleDeg: -9, displayName: "lid-flap to lid-tab" },
    { id: "fold-top-to-lid-flap", from: "top", to: "lid-flap", d: linePath(innerLeft, rearWallTop, innerRight, rearWallTop), angleDeg: -90, displayName: "top to lid-flap" },
    { id: "fold-back-to-top", from: "back", to: "top", d: linePath(innerLeft, rearWallBottom, innerRight, rearWallBottom), angleDeg: -90, displayName: "back to top" },
    { id: "fold-back-to-bottom", from: "back", to: "bottom", d: linePath(innerLeft, baseBottom, innerRight, baseBottom), angleDeg: 90, displayName: "back to bottom" },
    { id: "fold-bottom-to-front", from: "bottom", to: "front", d: linePath(innerLeft, frontWallBottom, innerRight, frontWallBottom), angleDeg: 90, displayName: "bottom to front" },
    { id: "fold-front-to-left-wall", from: "front", to: "left-wall", d: linePath(innerLeft, frontWallBottom, innerLeft, frontOverlapBottom), angleDeg: 90, displayName: "front to left-wall" },
    { id: "fold-left-wall-to-left-dust-flap", from: "left-wall", to: "left-dust-flap", d: linePath(leftWallOuter, frontWallBottom, leftWallOuter, frontOverlapBottom), angleDeg: 90, displayName: "left-wall to left-dust-flap" },
    { id: "fold-front-to-right-wall", from: "front", to: "right-wall", d: linePath(innerRight, frontWallBottom, innerRight, frontOverlapBottom), angleDeg: -90, displayName: "front to right-wall" },
    { id: "fold-right-wall-to-right-dust-flap", from: "right-wall", to: "right-dust-flap", d: linePath(rightWallOuter, frontWallBottom, rightWallOuter, frontOverlapBottom), angleDeg: -90, displayName: "right-wall to right-dust-flap" }
  ];
  const foldSequence = [
    "fold-back-to-bottom",
    "fold-front-to-left-wall",
    "fold-front-to-right-wall",
    "fold-left-wall-to-left-dust-flap",
    "fold-right-wall-to-right-dust-flap",
    "fold-bottom-to-front",
    "fold-back-to-top",
    "fold-top-to-lid-flap",
    "fold-lid-tab-to-lid-flap"
  ];

  const minX = leftDustOuter;
  const maxX = rightDustOuter;
  const pageW = maxX - minX + margin * 2;
  const pageH = frontOverlapBottom + margin;

  const shifted = value => value - minX + margin;
  const shiftPath = d => d.replace(/-?\d*\.?\d+/g, (token, offset, source) => {
    const prev = source.slice(0, offset).trim().slice(-1);
    const num = Number(token);
    if (!Number.isFinite(num)) return token;
    const isX = /[MLCQ]\s*$/.test(source.slice(0, offset)) || /[ ,]/.test(prev);
    return token;
  });

  function shiftPointArray(point) {
    return [shifted(point[0]), point[1]];
  }

  function shiftPathX(d) {
    let expectingX = false;
    let lastCommand = "";
    return d.replace(/[MLCQZ]|-?\d*\.?\d+/g, token => {
      if (/^[MLCQZ]$/.test(token)) {
        lastCommand = token;
        expectingX = token !== "Z";
        return token;
      }
      const value = Number(token);
      if (!Number.isFinite(value)) {
        return token;
      }
      const nextValue = expectingX ? shifted(value) : value;
      if (lastCommand === "Q" || lastCommand === "C" || lastCommand === "M" || lastCommand === "L") {
        expectingX = !expectingX;
      }
      return String(roundValue(nextValue));
    });
  }

  const shiftedPanels = panels.map(panel => ({
    ...panel,
    d: shiftPathX(panel.d),
    meshD: shiftPathX(panel.meshD),
    labelPosition: shiftPointArray(panel.labelPosition),
    labelLayout: {
      ...panel.labelLayout,
      x: shifted(panel.labelLayout.x)
    }
  }));
  const shiftedFolds = folds.map(fold => ({
    ...fold,
    d: shiftPathX(fold.d)
  }));
  const geometry = {
    pageW: roundValue(pageW),
    pageH: roundValue(pageH),
    outlineD: shiftPathX(outlineD),
    slitD: shiftPathX(slitD),
    lockCutoutD: shiftPathX(lockCutoutD),
    panels: shiftedPanels,
    folds: shiftedFolds,
    glueAreas: [],
    rootPanel: "back",
    rootPanels: ["back"],
    floorPanel: "bottom",
    assembledFrontPanel: "front",
    floorFoldId: "",
    floorFoldDistribution: null,
    foldSequence,
    flatSheetD: "",
    custom3d: {
      camera: {
        foldedView: "front",
        facingPanel: "front"
      }
    },
    __cacheKey: JSON.stringify({
      templateId: "mailer",
      outlineD: shiftPathX(outlineD),
      panels: shiftedPanels.map(panel => ({ id: panel.id, d: panel.d, parent: panel.parent, foldId: panel.foldId, angle: panel.angle })),
      folds: shiftedFolds.map(fold => ({ id: fold.id, d: fold.d, angleDeg: fold.angleDeg })),
      foldSequence
    })
  };

  const metadataJson = buildMetadataJson(
    template,
    geometry,
    { length: L, width: W, height: H, overlap: O },
    {
      thumbHoleWidth: TH,
      thumbHoleRoundedCorner: TR,
      materialThickness: T,
      roundedCornersRadius: R,
      dustFlapSize: DUST,
      dustFlapAngle: A
    },
    "static/template-builders/mailer.js"
  );

  return {
    svgText: renderStructuredSvg(template, geometry, metadataJson),
    metadata: metadataJson,
    geometry
  };
}

export default createProceduralTemplateBuilder(TEMPLATE_DEFINITION, buildMailerGeometry);
