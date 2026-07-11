import {
  buildMetadataJson,
  createProceduralTemplateBuilder,
  renderStructuredSvg,
  roundValue
} from "./helpers.js";

const TAG_SOURCE_FILE = "static/templates/flat/tags.svg";

const TAG_VARIANTS = [
  {
    id: "flat-tag-coffin",
    name: "Coffin Tag",
    variantLabel: "Coffin",
    summary: "Coffin-shaped flat tag with a circular hanging cutout.",
    outerD: "M11.77165,125.15748,47.20473,11.77165h70.86614l35.43307,113.38583L118.07087,238.54331H47.20473Z",
    cutoutD: "M82.6378,23.11024a5.66929,5.66929,0,1,0,5.66929,5.66929A5.66929,5.66929,0,0,0,82.6378,23.11024Z"
  },
  {
    id: "flat-tag-two-edges",
    name: "Two Edges Tag",
    variantLabel: "Two Edges",
    summary: "Tall flat tag with rounded shoulder edges and a circular hanging cutout.",
    outerD: "M11.77165,295.23623V82.6378A70.86616,70.86616,0,0,1,82.6378,11.77165h70.86614V224.37008A70.86615,70.86615,0,0,1,82.6378,295.23623Z",
    cutoutD: "M82.6378,20.27559a7.08662,7.08662,0,1,0,7.08661,7.08662A7.08662,7.08662,0,0,0,82.6378,20.27559Z"
  },
  {
    id: "flat-tag-rectangle-indent-corners",
    name: "Rectangle Indent Corners Tag",
    variantLabel: "Indent Corners",
    summary: "Rectangular flat tag with indented corners and a circular hanging cutout.",
    outerD: "M11.77165,40.11811A28.34646,28.34646,0,0,0,40.11811,11.77165h85.03937a28.34646,28.34646,0,0,0,28.34646,28.34646V210.19686a28.34645,28.34645,0,0,0-28.34646,28.34645H40.11811a28.34645,28.34645,0,0,0-28.34646-28.34645Z",
    cutoutD: "M91.14173,34.44882a8.50394,8.50394,0,1,1-8.50393-8.50394A8.50393,8.50393,0,0,1,91.14173,34.44882Z"
  },
  {
    id: "flat-tag-rectangle-cut-corners",
    name: "Rectangle Cut Corners Tag",
    variantLabel: "Cut Corners",
    summary: "Rectangular flat tag with cut corners and a circular hanging cutout.",
    outerD: "M11.77165,37.28347,37.28347,11.77165h90.70866l25.51181,25.51182v175.748l-25.51181,25.51181H37.28347L11.77165,213.0315Z",
    cutoutD: "M91.14173,34.44882a8.50394,8.50394,0,1,1-8.50393-8.50394A8.50393,8.50393,0,0,1,91.14173,34.44882Z"
  },
  {
    id: "flat-tag-teardrop",
    name: "Teardrop Tag",
    variantLabel: "Teardrop",
    summary: "Teardrop-shaped flat tag with a circular hanging cutout.",
    outerD: "M91.811,231.54331A85.03937,85.03937,0,0,1,18.16477,103.98425L67.26228,18.94488a28.34646,28.34646,0,0,1,49.0975,0l49.0975,85.03937A85.03938,85.03938,0,0,1,91.811,231.54331Z",
    cutoutD: "M91.811,14.69291a4.252,4.252,0,1,0,4.252,4.252A4.252,4.252,0,0,0,91.811,14.69291Z"
  },
  {
    id: "flat-tag-offset-rounded",
    name: "Offset Rounded Tag",
    variantLabel: "Offset Rounded",
    summary: "Offset rounded flat tag with a circular hanging cutout.",
    outerD: "M24.44882,49.96063a48.189,48.189,0,0,1,96.378,0h22.67716v235.2756H1.77165V49.96063Z",
    cutoutD: "M72.6378,15.94488A14.17323,14.17323,0,1,0,86.811,30.11811,14.17323,14.17323,0,0,0,72.6378,15.94488Z"
  },
  {
    id: "flat-tag-offset",
    name: "Offset Tag",
    variantLabel: "Offset",
    summary: "Offset rectangular flat tag with a circular hanging cutout.",
    outerD: "M2.77165,65.13386V280.56694a5.6693,5.6693,0,0,0,5.6693,5.66929h130.3937a5.66929,5.66929,0,0,0,5.66929-5.66929V65.13386a5.66929,5.66929,0,0,0-5.66929-5.66929H109.07087V8.441a5.6693,5.6693,0,0,0-5.66929-5.6693H43.874A5.66929,5.66929,0,0,0,38.20473,8.441V59.46457H8.441a5.66929,5.66929,0,0,0-5.6693,5.66929",
    cutoutD: "M73.6378,14.11024a8.50394,8.50394,0,1,0,8.50393,8.50393A8.50393,8.50393,0,0,0,73.6378,14.11024Z"
  },
  {
    id: "flat-tag-rectangle",
    name: "Rectangle Tag",
    variantLabel: "Rectangle",
    summary: "Simple rectangular flat tag with a circular hanging cutout.",
    outerD: "M5.77165,4.77165H147.50394V288.23623H5.77165Z",
    cutoutD: "M76.6378,16.11024a5.66929,5.66929,0,1,1-5.66929,5.66929A5.66929,5.66929,0,0,1,76.6378,16.11024Z"
  },
  {
    id: "flat-tag-round",
    name: "Round Tag",
    variantLabel: "Round",
    summary: "Round flat tag with a circular hanging cutout.",
    outerD: "M1.77165,72.6378A70.86615,70.86615,0,1,0,72.6378,1.77165,70.86615,70.86615,0,0,0,1.77165,72.6378Z",
    cutoutD: "M72.6378,11.69291a7.08662,7.08662,0,1,0,7.08661,7.08662A7.08662,7.08662,0,0,0,72.6378,11.69291Z"
  },
  {
    id: "flat-tag-rectangle-chamfered-corner",
    name: "Rectangle Chamfered Corner Tag",
    variantLabel: "Chamfered Corner",
    summary: "Rectangular flat tag with one chamfered corner and a circular hanging cutout.",
    outerD: "M1.77165,32.11811,30.11811,3.77165H143.50394V230.54331H1.77165Z",
    cutoutD: "M130.748,23.0315a8.50394,8.50394,0,1,1-8.50394-8.50394A8.50394,8.50394,0,0,1,130.748,23.0315Z"
  },
  {
    id: "flat-tag-rectangle-rounded-corner",
    name: "Rectangle Rounded Corner Tag",
    variantLabel: "Rounded Corner",
    summary: "Rectangular flat tag with rounded corners and a circular hanging cutout.",
    outerD: "M1.77165,14.11024A11.33859,11.33859,0,0,1,13.11024,2.77165H132.16536a11.33858,11.33858,0,0,1,11.33858,11.33859V218.20473a11.33858,11.33858,0,0,1-11.33858,11.33858H13.11024A11.33859,11.33859,0,0,1,1.77165,218.20473Z",
    cutoutD: "M132.16536,22.61417a8.50394,8.50394,0,1,1-8.50394-8.50393A8.50394,8.50394,0,0,1,132.16536,22.61417Z"
  },
  {
    id: "flat-tag-rectangle-chamfered",
    name: "Rectangle Chamfered Tag",
    variantLabel: "Chamfered",
    summary: "Rectangular flat tag with chamfered top corners and a circular hanging cutout.",
    outerD: "M1.77165,27.28347,27.28347,1.77165h90.70866l25.51181,25.51182V285.23623H1.77165Z",
    cutoutD: "M81.14173,24.44882a8.50394,8.50394,0,1,1-8.50393-8.50394A8.50393,8.50393,0,0,1,81.14173,24.44882Z"
  },
  {
    id: "flat-tag-rectangle-rounded",
    name: "Rectangle Rounded Tag",
    variantLabel: "Rounded",
    summary: "Rectangular flat tag with rounded corners and a circular hanging cutout.",
    outerD: "M1.77165,7.441A5.6693,5.6693,0,0,1,7.441,1.77165H123.66142a5.6693,5.6693,0,0,1,5.66929,5.6693V251.22048a5.66929,5.66929,0,0,1-5.66929,5.66929H7.441a5.6693,5.6693,0,0,1-5.6693-5.66929Z",
    cutoutD: "M71.22047,18.77953a5.66929,5.66929,0,1,1-5.66929-5.66929A5.66929,5.66929,0,0,1,71.22047,18.77953Z"
  }
];

function extractNumbers(pathData) {
  return Array.from(String(pathData).matchAll(/-?\d*\.?\d+(?:e[-+]?\d+)?/ig), match => Number(match[0]));
}

function vectorAngle(ux, uy, vx, vy) {
  const dot = (ux * vx) + (uy * vy);
  const len = Math.max(1e-9, Math.hypot(ux, uy) * Math.hypot(vx, vy));
  const sign = (ux * vy) - (uy * vx) < 0 ? -1 : 1;
  return sign * Math.acos(Math.max(-1, Math.min(1, dot / len)));
}

function sampleArcBounds(startX, startY, rx, ry, rotationDeg, largeArcFlag, sweepFlag, endX, endY, includePoint) {
  const phi = (rotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx2 = (startX - endX) / 2;
  const dy2 = (startY - endY) / 2;
  const x1p = (cosPhi * dx2) + (sinPhi * dy2);
  const y1p = (-sinPhi * dx2) + (cosPhi * dy2);

  let safeRx = Math.abs(rx);
  let safeRy = Math.abs(ry);
  if (!safeRx || !safeRy) {
    includePoint(endX, endY);
    return;
  }

  const radiiCheck = (x1p * x1p) / (safeRx * safeRx) + (y1p * y1p) / (safeRy * safeRy);
  if (radiiCheck > 1) {
    const scale = Math.sqrt(radiiCheck);
    safeRx *= scale;
    safeRy *= scale;
  }

  const rxSq = safeRx * safeRx;
  const rySq = safeRy * safeRy;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;
  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const numerator = Math.max(0, (rxSq * rySq) - (rxSq * y1pSq) - (rySq * x1pSq));
  const denominator = Math.max(1e-9, (rxSq * y1pSq) + (rySq * x1pSq));
  const factor = sign * Math.sqrt(numerator / denominator);
  const cxp = factor * ((safeRx * y1p) / safeRy);
  const cyp = factor * (-(safeRy * x1p) / safeRx);
  const centerX = (cosPhi * cxp) - (sinPhi * cyp) + ((startX + endX) / 2);
  const centerY = (sinPhi * cxp) + (cosPhi * cyp) + ((startY + endY) / 2);

  const startVectorX = (x1p - cxp) / safeRx;
  const startVectorY = (y1p - cyp) / safeRy;
  const endVectorX = (-x1p - cxp) / safeRx;
  const endVectorY = (-y1p - cyp) / safeRy;
  const startAngle = vectorAngle(1, 0, startVectorX, startVectorY);
  let deltaAngle = vectorAngle(startVectorX, startVectorY, endVectorX, endVectorY);
  if (!sweepFlag && deltaAngle > 0) {
    deltaAngle -= Math.PI * 2;
  } else if (sweepFlag && deltaAngle < 0) {
    deltaAngle += Math.PI * 2;
  }

  const steps = Math.max(24, Math.ceil(Math.abs(deltaAngle) / (Math.PI / 12)));
  for (let index = 0; index <= steps; index += 1) {
    const angle = startAngle + (deltaAngle * (index / steps));
    const x = centerX + (safeRx * Math.cos(angle) * cosPhi) - (safeRy * Math.sin(angle) * sinPhi);
    const y = centerY + (safeRx * Math.cos(angle) * sinPhi) + (safeRy * Math.sin(angle) * cosPhi);
    includePoint(x, y);
  }
}

function estimatePathBounds(pathData) {
  const tokens = tokenizePathData(pathData);
  const xs = [];
  const ys = [];
  let index = 0;
  let command = "";
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;

  const includePoint = (x, y) => {
    xs.push(Number(x) || 0);
    ys.push(Number(y) || 0);
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[AaHhLlMmVvZz]$/.test(token)) {
      command = token;
      index += 1;
      if (command === "Z" || command === "z") {
        currentX = startX;
        currentY = startY;
        includePoint(currentX, currentY);
        continue;
      }
    }

    if (!command) {
      break;
    }

    const relative = command === command.toLowerCase();
    switch (command.toUpperCase()) {
      case "M":
      case "L": {
        while (index + 1 < tokens.length && !/^[AaHhLlMmVvZz]$/.test(tokens[index])) {
          const rawX = Number(tokens[index]);
          const rawY = Number(tokens[index + 1]);
          if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) {
            break;
          }
          index += 2;
          currentX = relative ? currentX + rawX : rawX;
          currentY = relative ? currentY + rawY : rawY;
          if (command.toUpperCase() === "M") {
            startX = currentX;
            startY = currentY;
            command = relative ? "l" : "L";
          }
          includePoint(currentX, currentY);
        }
        break;
      }
      case "H": {
        while (index < tokens.length && !/^[AaHhLlMmVvZz]$/.test(tokens[index])) {
          const rawX = Number(tokens[index]);
          index += 1;
          currentX = relative ? currentX + rawX : rawX;
          includePoint(currentX, currentY);
        }
        break;
      }
      case "V": {
        while (index < tokens.length && !/^[AaHhLlMmVvZz]$/.test(tokens[index])) {
          const rawY = Number(tokens[index]);
          index += 1;
          currentY = relative ? currentY + rawY : rawY;
          includePoint(currentX, currentY);
        }
        break;
      }
      case "A": {
        while (index + 6 < tokens.length && !/^[AaHhLlMmVvZz]$/.test(tokens[index])) {
          const rx = Number(tokens[index]);
          const ry = Number(tokens[index + 1]);
          const rotation = Number(tokens[index + 2]);
          const largeArcFlag = Number(tokens[index + 3]) ? 1 : 0;
          const sweepFlag = Number(tokens[index + 4]) ? 1 : 0;
          const rawX = Number(tokens[index + 5]);
          const rawY = Number(tokens[index + 6]);
          index += 7;
          const endX = relative ? currentX + rawX : rawX;
          const endY = relative ? currentY + rawY : rawY;
          sampleArcBounds(currentX, currentY, rx, ry, rotation, largeArcFlag, sweepFlag, endX, endY, includePoint);
          currentX = endX;
          currentY = endY;
        }
        break;
      }
      default: {
        const fallback = extractNumbers(pathData);
        for (let numberIndex = 0; numberIndex < fallback.length - 1; numberIndex += 2) {
          includePoint(fallback[numberIndex], fallback[numberIndex + 1]);
        }
        index = tokens.length;
        break;
      }
    }
  }

  return {
    minX: xs.length ? Math.min(...xs) : 0,
    maxX: xs.length ? Math.max(...xs) : 0,
    minY: ys.length ? Math.min(...ys) : 0,
    maxY: ys.length ? Math.max(...ys) : 0
  };
}

function buildGeometryMetrics(bounds) {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  return {
    ...bounds,
    width,
    height,
    centerX: bounds.minX + width / 2,
    centerY: bounds.minY + height / 2
  };
}

function tokenizePathData(pathData) {
  return String(pathData || "").match(/[AaCcHhLlMmQqSsTtVvZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
}

function formatPathNumber(value) {
  return String(roundValue(value));
}

function transformPath(pathData, { scaleX = 1, scaleY = 1, translateX = 0, translateY = 0 }) {
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

  function transformAxis(value, axis, isRelative) {
    const scaled = axis === "x" ? value * scaleX : value * scaleY;
    if (isRelative) {
      return scaled;
    }
    return scaled + (axis === "x" ? translateX : translateY);
  }

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
      throw new Error(`Unsupported SVG path command in tags builder: ${command}`);
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
      if (upper === "M" || upper === "L" || upper === "T") {
        transformed = [
          transformAxis(values[0], "x", isRelative),
          transformAxis(values[1], "y", isRelative)
        ];
      } else if (upper === "H") {
        transformed = [transformAxis(values[0], "x", isRelative)];
      } else if (upper === "V") {
        transformed = [transformAxis(values[0], "y", isRelative)];
      } else if (upper === "S" || upper === "Q") {
        transformed = [
          transformAxis(values[0], "x", isRelative),
          transformAxis(values[1], "y", isRelative),
          transformAxis(values[2], "x", isRelative),
          transformAxis(values[3], "y", isRelative)
        ];
      } else if (upper === "C") {
        transformed = [
          transformAxis(values[0], "x", isRelative),
          transformAxis(values[1], "y", isRelative),
          transformAxis(values[2], "x", isRelative),
          transformAxis(values[3], "y", isRelative),
          transformAxis(values[4], "x", isRelative),
          transformAxis(values[5], "y", isRelative)
        ];
      } else if (upper === "A") {
        transformed = [
          values[0] * scaleX,
          values[1] * scaleY,
          values[2],
          values[3],
          values[4],
          transformAxis(values[5], "x", isRelative),
          transformAxis(values[6], "y", isRelative)
        ];
      }

      output.push(transformed.map(formatPathNumber).join(","));
    }
  }

  return output.join(" ");
}

function createTagBuilder(variant) {
  const outerMetrics = buildGeometryMetrics(estimatePathBounds(variant.outerD));
  const cutoutMetrics = buildGeometryMetrics(estimatePathBounds(variant.cutoutD));
  const isRoundTag = variant.id === "flat-tag-round";
  const panelId = `${variant.id}-panel`;
  const cutoutId = `${variant.id}-cutout`;
  const panelDefinition = {
    id: panelId,
    displayName: variant.name,
    standardName: variant.variantLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    type: "panel",
    isGlue: false,
    foldParent: "",
    foldId: "",
    foldAngleDeg: 0,
    labelLayout: {
      text: variant.name,
      fontSize: 6,
      rotationDeg: 0,
      maxWidth: 0,
      lineHeight: 1.2
    }
  };

  const definition = {
    id: variant.id,
    name: variant.name,
    icon: "icon-tag",
    title: `Flat Template: ${variant.name}`,
    summary: variant.summary,
    defaults: isRoundTag
      ? {
          D: roundValue((outerMetrics.width + outerMetrics.height) / 2),
          HOLE: roundValue((cutoutMetrics.width + cutoutMetrics.height) / 2),
          HOLEX: roundValue(cutoutMetrics.centerX - outerMetrics.minX),
          HOLEY: roundValue(cutoutMetrics.centerY - outerMetrics.minY)
        }
      : {
          W: roundValue(outerMetrics.width),
          H: roundValue(outerMetrics.height),
          HOLE: roundValue((cutoutMetrics.width + cutoutMetrics.height) / 2),
          HOLEX: roundValue(cutoutMetrics.centerX - outerMetrics.minX),
          HOLEY: roundValue(cutoutMetrics.centerY - outerMetrics.minY)
        },
    fieldGroups: {
      primary: isRoundTag
        ? [
            { key: "D", label: "Diameter", kind: "length", min: 1, step: 0.1 }
          ]
        : [
            { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
            { key: "H", label: "Height", kind: "length", min: 1, step: 0.1 }
          ],
      optional: [
        { key: "HOLE", label: "Hole Diameter", kind: "length", min: 0.1, step: 0.1 },
        { key: "HOLEX", label: "Hole Offset X", kind: "length", min: 0, step: 0.1 },
        { key: "HOLEY", label: "Hole Offset Y", kind: "length", min: 0, step: 0.1 }
      ]
    },
    familyId: "tags",
    familyName: "Tags",
    familyIcon: "icon-tag",
    variantLabel: variant.variantLabel,
    panels: [panelDefinition]
  };

  return createProceduralTemplateBuilder(definition, (params, template) => {
    const referenceWidth = isRoundTag ? definition.defaults.D : definition.defaults.W;
    const referenceHeight = isRoundTag ? definition.defaults.D : definition.defaults.H;
    const targetWidth = isRoundTag
      ? Math.max(1, Number(params.D) || definition.defaults.D)
      : Math.max(1, Number(params.W) || definition.defaults.W);
    const targetHeight = isRoundTag
      ? Math.max(1, Number(params.D) || definition.defaults.D)
      : Math.max(1, Number(params.H) || definition.defaults.H);
    const holeDiameter = Math.max(0.1, Number(params.HOLE) || definition.defaults.HOLE);
    const holeOffsetX = Math.max(0, Number(params.HOLEX) || definition.defaults.HOLEX);
    const holeOffsetY = Math.max(0, Number(params.HOLEY) || definition.defaults.HOLEY);
    const outerScaleX = targetWidth / Math.max(outerMetrics.width, 1e-6);
    const outerScaleY = targetHeight / Math.max(outerMetrics.height, 1e-6);
    const padding = 12;
    const outerD = transformPath(variant.outerD, {
      scaleX: outerScaleX,
      scaleY: outerScaleY,
      translateX: padding - (outerMetrics.minX * outerScaleX),
      translateY: padding - (outerMetrics.minY * outerScaleY)
    });
    const holeScale = holeDiameter / Math.max((cutoutMetrics.width + cutoutMetrics.height) / 2, 1e-6);
    const holeCenterX = padding + ((holeOffsetX / Math.max(referenceWidth, 1e-6)) * targetWidth);
    const holeCenterY = padding + ((holeOffsetY / Math.max(referenceHeight, 1e-6)) * targetHeight);
    const cutoutD = transformPath(variant.cutoutD, {
      scaleX: holeScale,
      scaleY: holeScale,
      translateX: holeCenterX - (cutoutMetrics.centerX * holeScale),
      translateY: holeCenterY - (cutoutMetrics.centerY * holeScale)
    });
    const pageW = roundValue(targetWidth + padding * 2);
    const pageH = roundValue(targetHeight + padding * 2);
    const labelX = roundValue(padding + targetWidth / 2);
    const labelY = roundValue(padding + targetHeight / 2);
    const geometry = {
      pageW,
      pageH,
      outlineD: outerD,
      slitD: "",
      lockCutoutD: "",
      cutPaths: [
        { id: `${variant.id}-outline`, d: outerD, type: "cut" },
        { id: cutoutId, d: cutoutD, type: "cut" }
      ],
      glueAreas: [],
      folds: [],
      foldSequence: [],
      rootPanel: panelId,
      rootPanels: [panelId],
      floorPanel: panelId,
      floorPanelsByObject: {},
      panels: [
        {
          id: panelId,
          standardName: panelDefinition.standardName,
          displayName: variant.name,
          label: variant.name,
          type: "panel",
          isGlue: false,
          parent: "",
          foldId: "",
          angle: 0,
          d: outerD,
          meshD: outerD,
          cutoutD,
          slitCutD: "",
          labelPosition: [labelX, labelY],
          labelLayout: {
            ...panelDefinition.labelLayout,
            x: labelX,
            y: labelY
          }
        }
      ]
    };

    const metadataJson = buildMetadataJson(
      template,
      geometry,
      { length: targetWidth, width: targetHeight, height: 0, overlap: 0 },
      {
        materialThickness: 0,
        holeDiameter,
        holeOffsetX,
        holeOffsetY
      },
      TAG_SOURCE_FILE
    );

    return {
      svgText: renderStructuredSvg(template, geometry, metadataJson),
      metadata: metadataJson,
      geometry
    };
  });
}

export default TAG_VARIANTS.map(createTagBuilder);
