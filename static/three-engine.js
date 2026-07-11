import { PANEL_DISPLAY_NAMES } from "./svg-generator.js";
import { buildArtworkSignature, drawUvArtworkOnContext } from "./artwork-engine.js";

const THREE_MODULE = "three";
const ORBIT_CONTROLS_MODULE = "three/addons/controls/OrbitControls.js";
const SVG_LOADER_MODULE = "three/addons/loaders/SVGLoader.js";
const VIEWPORT_GIZMO_MODULE = "./vendor/three-viewport-gizmo.js";

const PANEL_TEXTURE_MAP = {};
const DEFAULT_PAPER_STOCK_ID = "kraft";
const PAPER_STOCKS = {
  kraft: {
    label: "Kraft paper",
    colorUrl: new URL("./papertypes/brown.jpg", import.meta.url).href,
    fallbackColor: "#c8a773",
    grainAlpha: 0.075,
    textureSpanMm: 180,
    roughness: 0.95,
    metalness: 0.02,
    edgeColor: 0xc4a06f
  },
  offwhite: {
    label: "Off-white paper",
    colorUrl: new URL("./papertypes/offwhite.jpg", import.meta.url).href,
    fallbackColor: "#efe8d8",
    grainAlpha: 0.055,
    textureSpanMm: 180,
    roughness: 0.95,
    metalness: 0.02,
    edgeColor: 0xd9cfba
  },
  paper001: {
    label: "Paper 001",
    colorUrl: new URL("./papertypes/library/paper001/color.jpg", import.meta.url).href,
    normalUrl: new URL("./papertypes/library/paper001/normal.jpg", import.meta.url).href,
    roughnessUrl: new URL("./papertypes/library/paper001/roughness.jpg", import.meta.url).href,
    fallbackColor: "#d9d2c3",
    grainAlpha: 0.05,
    textureSpanMm: 220,
    roughness: 0.96,
    metalness: 0.02,
    edgeColor: 0xd0c3ae
  },
  paper002: {
    label: "Paper 002",
    colorUrl: new URL("./papertypes/library/paper002/color.jpg", import.meta.url).href,
    normalUrl: new URL("./papertypes/library/paper002/normal.jpg", import.meta.url).href,
    roughnessUrl: new URL("./papertypes/library/paper002/roughness.jpg", import.meta.url).href,
    fallbackColor: "#d6cfbd",
    grainAlpha: 0.05,
    textureSpanMm: 220,
    roughness: 0.96,
    metalness: 0.02,
    edgeColor: 0xc6b89e
  },
  paper004: {
    label: "Paper 004",
    colorUrl: new URL("./papertypes/library/paper004/color.jpg", import.meta.url).href,
    normalUrl: new URL("./papertypes/library/paper004/normal.jpg", import.meta.url).href,
    roughnessUrl: new URL("./papertypes/library/paper004/roughness.jpg", import.meta.url).href,
    fallbackColor: "#d7c8b2",
    grainAlpha: 0.055,
    textureSpanMm: 220,
    roughness: 0.96,
    metalness: 0.02,
    edgeColor: 0xc9b08c
  },
  paper006: {
    label: "Paper 006",
    colorUrl: new URL("./papertypes/library/paper006/color.jpg", import.meta.url).href,
    normalUrl: new URL("./papertypes/library/paper006/normal.jpg", import.meta.url).href,
    roughnessUrl: new URL("./papertypes/library/paper006/roughness.jpg", import.meta.url).href,
    fallbackColor: "#d3d1c7",
    grainAlpha: 0.045,
    textureSpanMm: 220,
    roughness: 0.95,
    metalness: 0.02,
    edgeColor: 0xc8c4b7
  },
  watercolor001: {
    label: "Watercolor paper 001",
    colorUrl: new URL("./papertypes/library/watercolor-paper-001/color.jpg", import.meta.url).href,
    normalUrl: new URL("./papertypes/library/watercolor-paper-001/normal.jpg", import.meta.url).href,
    roughnessUrl: new URL("./papertypes/library/watercolor-paper-001/roughness.jpg", import.meta.url).href,
    fallbackColor: "#ece4d4",
    grainAlpha: 0.06,
    textureSpanMm: 240,
    roughness: 0.98,
    metalness: 0.01,
    edgeColor: 0xd6c9b1
  },
  paper3: {
    label: "Paper 3",
    colorUrl: new URL("./papertypes/library/paper-3/color.png", import.meta.url).href,
    normalUrl: new URL("./papertypes/library/paper-3/normal.png", import.meta.url).href,
    fallbackColor: "#cfb997",
    grainAlpha: 0.065,
    textureSpanMm: 260,
    roughness: 0.97,
    metalness: 0.01,
    edgeColor: 0xbe9d6d
  },
  paperRough2: {
    label: "Paper rough 2",
    colorUrl: new URL("./papertypes/library/paper-rough-2/color.png", import.meta.url).href,
    normalUrl: new URL("./papertypes/library/paper-rough-2/normal.png", import.meta.url).href,
    fallbackColor: "#d3c2a3",
    grainAlpha: 0.07,
    textureSpanMm: 260,
    roughness: 0.98,
    metalness: 0.01,
    edgeColor: 0xc09e6a
  },
  plastic010: {
    label: "Plastic 010",
    colorUrl: new URL("./papertypes/library/plastic010/color.jpg", import.meta.url).href,
    normalUrl: new URL("./papertypes/library/plastic010/normal.jpg", import.meta.url).href,
    roughnessUrl: new URL("./papertypes/library/plastic010/roughness.jpg", import.meta.url).href,
    fallbackColor: "#d5d3ca",
    grainAlpha: 0.035,
    textureSpanMm: 200,
    roughness: 0.72,
    metalness: 0.01,
    edgeColor: 0xcfd2d3
  }
};

let runtimePromise = null;
const textureCache = new Map();
const pendingTextureCloneUpdates = new WeakMap();

export function getDefaultPaperStockId() {
  return DEFAULT_PAPER_STOCK_ID;
}

export function getPaperStockOptions() {
  return Object.entries(PAPER_STOCKS).map(([id, config]) => ({
    id,
    label: config.label
  }));
}

function loadRuntime() {
  if (!runtimePromise) {
    runtimePromise = Promise.all([
      import(THREE_MODULE),
      import(ORBIT_CONTROLS_MODULE),
      import(SVG_LOADER_MODULE),
      import(VIEWPORT_GIZMO_MODULE)
    ]).then(([THREE, controls, svgLoader, viewportGizmo]) => ({
      THREE,
      OrbitControls: controls.OrbitControls,
      SVGLoader: svgLoader.SVGLoader,
      ViewportGizmo: viewportGizmo.ViewportGizmo
    }));
  }
  return runtimePromise;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isPowerOfTwo(value) {
  return value > 0 && (value & (value - 1)) === 0;
}

function nearestPowerOfTwo(value) {
  const target = Math.max(1, Number(value) || 1);
  return 2 ** Math.max(0, Math.round(Math.log2(target)));
}

function getRepeatSafeTextureSize(width, height) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const maxSide = 2048;
  const aspect = safeWidth / safeHeight;

  if (aspect >= 1) {
    const canvasWidth = maxSide;
    const canvasHeight = clamp(nearestPowerOfTwo(maxSide / aspect), 256, maxSide);
    return { width: canvasWidth, height: canvasHeight };
  }

  const canvasHeight = maxSide;
  const canvasWidth = clamp(nearestPowerOfTwo(maxSide * aspect), 256, maxSide);
  return { width: canvasWidth, height: canvasHeight };
}

function normalizeTextureImageForRepeat(THREE, texture) {
  const image = texture?.image || null;
  const width = Number(image?.width || image?.naturalWidth || 0);
  const height = Number(image?.height || image?.naturalHeight || 0);
  if (!image || width <= 0 || height <= 0 || (isPowerOfTwo(width) && isPowerOfTwo(height))) {
    return texture;
  }

  const canvasSize = getRepeatSafeTextureSize(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;
  const context = canvas.getContext("2d");
  if (!context) {
    return texture;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  texture.image = canvas;
  if (texture.source) {
    texture.source.data = canvas;
  }
  texture.generateMipmaps = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function parseLinePath(d) {
  const tokens = d.match(/[MLHVAmlhva]|-?\d*\.?\d+/g);
  if (!tokens || !tokens.length) {
    return null;
  }

  let index = 0;
  let command = null;
  let current = { x: 0, y: 0 };
  let start = null;
  let end = null;

  function readNumber() {
    if (index >= tokens.length) {
      return null;
    }
    const value = Number(tokens[index]);
    if (!Number.isFinite(value)) {
      return null;
    }
    index += 1;
    return value;
  }

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[MLHVAmlhva]$/.test(token)) {
      command = token;
      index += 1;
      continue;
    }
    if (!command) {
      return null;
    }

    if (command === "M" || command === "L") {
      const x = readNumber();
      const y = readNumber();
      if (x === null || y === null) {
        return null;
      }
      if (command === "M") {
        current = { x, y };
      } else {
        start = start || { ...current };
        current = { x, y };
        end = { ...current };
      }
      continue;
    }

    if (command === "m" || command === "l") {
      const dx = readNumber();
      const dy = readNumber();
      if (dx === null || dy === null) {
        return null;
      }
      if (command === "m") {
        current = { x: current.x + dx, y: current.y + dy };
      } else {
        start = start || { ...current };
        current = { x: current.x + dx, y: current.y + dy };
        end = { ...current };
      }
      continue;
    }

    if (command === "H") {
      const x = readNumber();
      if (x === null) {
        return null;
      }
      start = start || { ...current };
      current = { x, y: current.y };
      end = { ...current };
      continue;
    }

    if (command === "h") {
      const dx = readNumber();
      if (dx === null) {
        return null;
      }
      start = start || { ...current };
      current = { x: current.x + dx, y: current.y };
      end = { ...current };
      continue;
    }

    if (command === "V") {
      const y = readNumber();
      if (y === null) {
        return null;
      }
      start = start || { ...current };
      current = { x: current.x, y };
      end = { ...current };
      continue;
    }

    if (command === "v") {
      const dy = readNumber();
      if (dy === null) {
        return null;
      }
      start = start || { ...current };
      current = { x: current.x, y: current.y + dy };
      end = { ...current };
      continue;
    }

    if (command === "A") {
      const rx = readNumber();
      const ry = readNumber();
      const rotation = readNumber();
      const largeArcFlag = readNumber();
      const sweepFlag = readNumber();
      const x = readNumber();
      const y = readNumber();
      if ([rx, ry, rotation, largeArcFlag, sweepFlag, x, y].some(value => value === null)) {
        return null;
      }
      start = start || { ...current };
      current = { x, y };
      end = { ...current };
      continue;
    }

    if (command === "a") {
      const rx = readNumber();
      const ry = readNumber();
      const rotation = readNumber();
      const largeArcFlag = readNumber();
      const sweepFlag = readNumber();
      const dx = readNumber();
      const dy = readNumber();
      if ([rx, ry, rotation, largeArcFlag, sweepFlag, dx, dy].some(value => value === null)) {
        return null;
      }
      start = start || { ...current };
      current = { x: current.x + dx, y: current.y + dy };
      end = { ...current };
      continue;
    }
  }

  if (!start || !end) {
    return null;
  }

  return { start, end };
}

function makePanelSvg(panel) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">
      <path d="${panel.meshD || panel.d}" />
    </svg>
  `;
}

function buildSimpleShapeFromPathD(THREE, d) {
  if (!/^[\s0-9,.\-MLHVZmlhvz]+$/.test(String(d || ""))) {
    return null;
  }

  const tokens = String(d).match(/[MLHVZmlhvz]|-?\d*\.?\d+/g);
  if (!tokens || !tokens.length) {
    return null;
  }

  let index = 0;
  let command = null;
  let current = { x: 0, y: 0 };
  let startPoint = null;
  const points = [];

  function readNumber() {
    if (index >= tokens.length) return null;
    const value = Number(tokens[index]);
    if (!Number.isFinite(value)) return null;
    index += 1;
    return value;
  }

  function pushPoint(point) {
    const last = points[points.length - 1];
    if (!last || Math.abs(last.x - point.x) > 0.0001 || Math.abs(last.y - point.y) > 0.0001) {
      points.push(point);
    }
  }

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[MLHVZmlhvz]$/.test(token)) {
      command = token;
      index += 1;
      if (command === "Z" || command === "z") {
        break;
      }
      continue;
    }
    if (!command) {
      return null;
    }

    if (command === "M" || command === "L") {
      const x = readNumber();
      const y = readNumber();
      if (x === null || y === null) return null;
      current = { x, y };
      if (!startPoint) {
        startPoint = { ...current };
      }
      pushPoint({ ...current });
      if (command === "M") {
        command = "L";
      }
      continue;
    }

    if (command === "m" || command === "l") {
      const dx = readNumber();
      const dy = readNumber();
      if (dx === null || dy === null) return null;
      current = { x: current.x + dx, y: current.y + dy };
      if (!startPoint) {
        startPoint = { ...current };
      }
      pushPoint({ ...current });
      if (command === "m") {
        command = "l";
      }
      continue;
    }

    if (command === "H" || command === "h") {
      const value = readNumber();
      if (value === null) return null;
      current = {
        x: command === "H" ? value : current.x + value,
        y: current.y
      };
      pushPoint({ ...current });
      continue;
    }

    if (command === "V" || command === "v") {
      const value = readNumber();
      if (value === null) return null;
      current = {
        x: current.x,
        y: command === "V" ? value : current.y + value
      };
      pushPoint({ ...current });
      continue;
    }

    return null;
  }

  if (points.length < 3) {
    return null;
  }

  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
    shape.lineTo(points[pointIndex].x, points[pointIndex].y);
  }
  shape.closePath();
  return [shape];
}

function parsePolylineSubpathsFromPathD(d) {
  const tokens = String(d || "").match(/[MLHVZmlhvz]|-?\d*\.?\d+/g);
  if (!tokens || !tokens.length) {
    return [];
  }

  let index = 0;
  let command = null;
  let current = { x: 0, y: 0 };
  const paths = [];
  let activePath = null;

  function ensurePath(startPoint) {
    if (!activePath) {
      activePath = { points: [{ ...startPoint }], closed: false };
      paths.push(activePath);
    }
  }

  function readNumber() {
    if (index >= tokens.length) return null;
    const value = Number(tokens[index]);
    if (!Number.isFinite(value)) return null;
    index += 1;
    return value;
  }

  function pushPoint(point) {
    ensurePath(point);
    const last = activePath.points[activePath.points.length - 1];
    if (!last || Math.abs(last.x - point.x) > 0.0001 || Math.abs(last.y - point.y) > 0.0001) {
      activePath.points.push({ ...point });
    }
  }

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[MLHVZmlhvz]$/.test(token)) {
      command = token;
      index += 1;
      if (command === "Z" || command === "z") {
        if (activePath) {
          activePath.closed = true;
          activePath = null;
        }
      }
      continue;
    }
    if (!command) {
      return [];
    }

    if (command === "M" || command === "L") {
      const x = readNumber();
      const y = readNumber();
      if (x === null || y === null) return [];
      current = { x, y };
      if (command === "M") {
        activePath = { points: [{ ...current }], closed: false };
        paths.push(activePath);
        command = "L";
      } else {
        pushPoint(current);
      }
      continue;
    }

    if (command === "m" || command === "l") {
      const dx = readNumber();
      const dy = readNumber();
      if (dx === null || dy === null) return [];
      current = { x: current.x + dx, y: current.y + dy };
      if (command === "m") {
        activePath = { points: [{ ...current }], closed: false };
        paths.push(activePath);
        command = "l";
      } else {
        pushPoint(current);
      }
      continue;
    }

    if (command === "H" || command === "h") {
      const value = readNumber();
      if (value === null) return [];
      current = {
        x: command === "H" ? value : current.x + value,
        y: current.y
      };
      pushPoint(current);
      continue;
    }

    if (command === "V" || command === "v") {
      const value = readNumber();
      if (value === null) return [];
      current = {
        x: current.x,
        y: command === "V" ? value : current.y + value
      };
      pushPoint(current);
      continue;
    }

    return [];
  }

  return paths.filter(path => Array.isArray(path.points) && path.points.length >= 2);
}

function lineIntersection(aPoint, aDir, bPoint, bDir) {
  const cross = (aDir.x * bDir.y) - (aDir.y * bDir.x);
  if (Math.abs(cross) < 0.000001) {
    return null;
  }
  const dx = bPoint.x - aPoint.x;
  const dy = bPoint.y - aPoint.y;
  const t = ((dx * bDir.y) - (dy * bDir.x)) / cross;
  return {
    x: aPoint.x + (aDir.x * t),
    y: aPoint.y + (aDir.y * t)
  };
}

function buildSlitShapeFromPolyline(THREE, points, thickness = 0) {
  if (!Array.isArray(points) || points.length < 2) {
    return null;
  }

  const safeThickness = Math.max(0.2, Number(thickness) || 0.4);
  const half = safeThickness * 0.5;
  const dirs = [];
  const normals = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.0001) {
      return null;
    }
    const dir = { x: dx / length, y: dy / length };
    dirs.push(dir);
    normals.push({ x: -dir.y, y: dir.x });
  }

  const leftPoints = [];
  const rightPoints = [];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (index === 0) {
      leftPoints.push({ x: point.x + (normals[0].x * half), y: point.y + (normals[0].y * half) });
      rightPoints.push({ x: point.x - (normals[0].x * half), y: point.y - (normals[0].y * half) });
      continue;
    }
    if (index === points.length - 1) {
      const normal = normals[normals.length - 1];
      leftPoints.push({ x: point.x + (normal.x * half), y: point.y + (normal.y * half) });
      rightPoints.push({ x: point.x - (normal.x * half), y: point.y - (normal.y * half) });
      continue;
    }

    const prevNormal = normals[index - 1];
    const nextNormal = normals[index];
    const prevDir = dirs[index - 1];
    const nextDir = dirs[index];
    const leftIntersection = lineIntersection(
      { x: point.x + (prevNormal.x * half), y: point.y + (prevNormal.y * half) },
      prevDir,
      { x: point.x + (nextNormal.x * half), y: point.y + (nextNormal.y * half) },
      nextDir
    );
    const rightIntersection = lineIntersection(
      { x: point.x - (prevNormal.x * half), y: point.y - (prevNormal.y * half) },
      prevDir,
      { x: point.x - (nextNormal.x * half), y: point.y - (nextNormal.y * half) },
      nextDir
    );
    leftPoints.push(leftIntersection || { x: point.x + (((prevNormal.x + nextNormal.x) * 0.5) * half), y: point.y + (((prevNormal.y + nextNormal.y) * 0.5) * half) });
    rightPoints.push(rightIntersection || { x: point.x - (((prevNormal.x + nextNormal.x) * 0.5) * half), y: point.y - (((prevNormal.y + nextNormal.y) * 0.5) * half) });
  }

  const polygon = [...leftPoints, ...rightPoints.reverse()];
  if (polygon.length < 4) {
    return null;
  }

  const shape = new THREE.Shape();
  shape.moveTo(polygon[0].x, polygon[0].y);
  for (let index = 1; index < polygon.length; index += 1) {
    shape.lineTo(polygon[index].x, polygon[index].y);
  }
  shape.closePath();
  return shape;
}

function loadCutoutShapes(runtime, d) {
  return loadShapesFromPathD(runtime, d);
}

function loadSlitCutShapes(runtime, d, thickness = 0) {
  const { THREE } = runtime;
  const safeThickness = Math.max(1.2, Number(thickness) || 0.4);
  const halfInset = safeThickness * 0.5;
  const slitShapes = [];

  for (const path of parsePolylineSubpathsFromPathD(d)) {
    if (path.closed) {
      continue;
    }
    const slitShape = buildSlitShapeFromPolyline(THREE, path.points, thickness);
    if (!slitShape) {
      continue;
    }

    const points = path.points || [];
    const minX = Math.min(...points.map(point => point.x));
    const maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y));
    const maxY = Math.max(...points.map(point => point.y));
    const width = maxX - minX;
    const height = maxY - minY;
    let offsetX = 0;
    let offsetY = 0;
    const extraInset = Math.max(0.15, safeThickness * 0.25);

    if (width <= height) {
      const anchorX = Math.abs(points[0].x - maxX) < Math.abs(points[0].x - minX) ? maxX : minX;
      offsetX = anchorX === maxX ? -(halfInset + extraInset) : (halfInset + extraInset);
    } else {
      const anchorY = Math.abs(points[0].y - maxY) < Math.abs(points[0].y - minY) ? maxY : minY;
      offsetY = anchorY === maxY ? -(halfInset + extraInset) : (halfInset + extraInset);
    }

    const shiftedPoints = slitShape.getPoints(48).map(point => ({
      x: point.x + offsetX,
      y: point.y + offsetY
    }));
    if (shiftedPoints.length >= 2) {
      const slitPath = new THREE.Path();
      slitPath.moveTo(shiftedPoints[0].x, shiftedPoints[0].y);
      for (let index = 1; index < shiftedPoints.length; index += 1) {
        slitPath.lineTo(shiftedPoints[index].x, shiftedPoints[index].y);
      }
      slitPath.closePath();
      slitShapes.push(slitPath);
    }
  }

  return slitShapes;
}

function makeHolePath(THREE, shape) {
  const hole = new THREE.Path();
  const points = shape.getPoints(48);
  if (!points.length) return hole;
  hole.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    hole.lineTo(points[index].x, points[index].y);
  }
  hole.closePath();
  return hole;
}

function loadPanelShape(runtime, panel, geometry, thickness = 0) {
  const { THREE, SVGLoader } = runtime;
  const simpleShapes = buildSimpleShapeFromPathD(THREE, panel.meshD || panel.d);
  if (simpleShapes) {
    if (panel.cutoutD && simpleShapes[0]) {
      const cutoutShapes = loadCutoutShapes(runtime, panel.cutoutD, thickness);
      for (const cutoutShape of cutoutShapes) {
        simpleShapes[0].holes.push(makeHolePath(THREE, cutoutShape));
      }
    }
    if (panel.slitCutD && simpleShapes[0]) {
      const slitShapes = loadSlitCutShapes(runtime, panel.slitCutD, thickness);
      for (const slitShape of slitShapes) {
        simpleShapes[0].holes.push(makeHolePath(THREE, slitShape));
      }
    }
    return simpleShapes;
  }

  const loader = new SVGLoader();
  const data = loader.parse(makePanelSvg(panel));
  const shapes = [];
  for (const path of data.paths) {
    shapes.push(...SVGLoader.createShapes(path));
  }

  if ((panel.cutoutD && shapes[0]) || (panel.id === "front" && geometry.lockCutoutD && shapes[0])) {
    const cutoutShapes = loadCutoutShapes(runtime, panel.cutoutD || geometry.lockCutoutD, thickness);
    if (shapes[0]) {
      for (const cutoutShape of cutoutShapes) {
        shapes[0].holes.push(makeHolePath(THREE, cutoutShape));
      }
    }
  }
  if (panel.slitCutD && shapes[0]) {
    const slitShapes = loadSlitCutShapes(runtime, panel.slitCutD, thickness);
    for (const slitShape of slitShapes) {
      shapes[0].holes.push(makeHolePath(THREE, slitShape));
    }
  }
  return shapes;
}

// Shape loading helpers
function loadShapesFromPathD(runtime, d) {
  const { SVGLoader } = runtime;
  const loader = new SVGLoader();
  const data = loader.parse(makePanelSvg({ d }));
  const shapes = [];
  for (const path of data.paths) {
    shapes.push(...SVGLoader.createShapes(path));
  }
  return shapes;
}

// Geometry relationship helpers
function buildFoldMap(geometry) {
  const map = new Map();
  for (const fold of geometry.folds) {
    map.set(`${fold.from}->${fold.to}`, fold);
    map.set(`${fold.to}->${fold.from}`, fold);
  }
  return map;
}

function buildChildMap(geometry) {
  const map = new Map();
  for (const panel of geometry.panels) {
    if (!panel.parent) continue;
    if (!map.has(panel.parent)) {
      map.set(panel.parent, []);
    }
    map.get(panel.parent).push(panel);
  }
  return map;
}

// Texture, material, and artwork helpers
function getPaperStockConfig(paperStock = DEFAULT_PAPER_STOCK_ID) {
  return PAPER_STOCKS[paperStock] || PAPER_STOCKS[DEFAULT_PAPER_STOCK_ID];
}

function getPanelTextureUrl(panelId, paperStock = "kraft") {
  return PANEL_TEXTURE_MAP[panelId] || getPaperStockConfig(paperStock).colorUrl || getPaperStockConfig(DEFAULT_PAPER_STOCK_ID).colorUrl;
}

function getCachedTexture(THREE, textureLoader, url, options = {}) {
  if (!url) {
    return null;
  }
  const cacheKey = JSON.stringify([url, !!options.srgb]);
  if (!textureCache.has(cacheKey)) {
    const texture = textureLoader.load(url, loadedTexture => {
      normalizeTextureImageForRepeat(THREE, loadedTexture);
      flushPendingTextureCloneUpdates(loadedTexture);
    });
    if (options.srgb) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    texture.anisotropy = 8;
    textureCache.set(cacheKey, texture);
  }
  return textureCache.get(cacheKey);
}

function getTextureRepeatForBounds(bounds, stock) {
  const span = Math.max(40, Number(stock.textureSpanMm) || 180);
  const width = Math.max(1, Number(bounds?.width) || span);
  const height = Math.max(1, Number(bounds?.height) || span);
  const scale = clamp(Number(bounds?.textureScale) || 1, 0.25, 4);
  return [
    clamp(width / (span * scale), 0.2, 1.25),
    clamp(height / (span * scale), 0.2, 1.25)
  ];
}

function textureHasImageData(texture) {
  const image = texture?.image || null;
  if (!image) {
    return false;
  }
  const width = Number(image.naturalWidth || image.videoWidth || image.width || 0);
  const height = Number(image.naturalHeight || image.videoHeight || image.height || 0);
  return width > 0 && height > 0;
}

function registerPendingTextureClone(sourceTexture, cloneTexture) {
  if (!sourceTexture || !cloneTexture) {
    return;
  }
  let pending = pendingTextureCloneUpdates.get(sourceTexture);
  if (!pending) {
    pending = new Set();
    pendingTextureCloneUpdates.set(sourceTexture, pending);
  }
  pending.add(cloneTexture);
}

function flushPendingTextureCloneUpdates(sourceTexture) {
  const pending = sourceTexture ? pendingTextureCloneUpdates.get(sourceTexture) : null;
  if (!pending || !pending.size || !textureHasImageData(sourceTexture)) {
    return;
  }
  for (const cloneTexture of pending) {
    cloneTexture.image = sourceTexture.image;
    if (sourceTexture.source) {
      cloneTexture.source = sourceTexture.source;
    }
    cloneTexture.needsUpdate = true;
  }
  pendingTextureCloneUpdates.delete(sourceTexture);
}

function cloneConfiguredTexture(THREE, sourceTexture, repeat) {
  if (!sourceTexture) {
    return null;
  }
  const texture = sourceTexture.clone();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0] || 1, repeat[1] || 1);
  texture.anisotropy = 8;
  if (textureHasImageData(sourceTexture)) {
    texture.needsUpdate = true;
  } else {
    registerPendingTextureClone(sourceTexture, texture);
  }
  return texture;
}

function getPaperMaterialResources(THREE, textureLoader, paperStock, bounds, colorUrlOverride = null) {
  const stock = getPaperStockConfig(paperStock);
  const repeat = getTextureRepeatForBounds(bounds, stock);
  return {
    stock,
    colorMap: cloneConfiguredTexture(THREE, getCachedTexture(THREE, textureLoader, colorUrlOverride || stock.colorUrl, {
      srgb: true
    }), repeat),
    normalMap: cloneConfiguredTexture(THREE, getCachedTexture(THREE, textureLoader, stock.normalUrl), repeat),
    roughnessMap: cloneConfiguredTexture(THREE, getCachedTexture(THREE, textureLoader, stock.roughnessUrl), repeat)
  };
}

function createPaperMaterial(THREE, textureLoader, paperStock, bounds, options = {}) {
  const resources = getPaperMaterialResources(THREE, textureLoader, paperStock, bounds, options.colorUrlOverride || null);
  const material = new THREE.MeshStandardMaterial({
    map: resources.colorMap,
    normalMap: resources.normalMap,
    roughnessMap: resources.roughnessMap,
    side: options.side || THREE.DoubleSide,
    roughness: resources.stock.roughness ?? 0.95,
    metalness: resources.stock.metalness ?? 0.02
  });
  return {
    material,
    stock: resources.stock,
    baseTexture: resources.colorMap
  };
}

function buildSideArtworkKey(sideArtwork) {
  return {
    outside: buildArtworkSignature(sideArtwork?.outside || null),
    inside: buildArtworkSignature(sideArtwork?.inside || null)
  };
}

function getArtworkSidesForPreview(activeArtworkSide = "outside") {
  const frontSide = activeArtworkSide === "inside" ? "inside" : "outside";
  return {
    frontSide,
    backSide: frontSide === "inside" ? "outside" : "inside"
  };
}

function applyDoubleSidedFaceMaps(material, frontMap, backMap) {
  if (!material) {
    return;
  }
  material.userData.frontMap = frontMap || null;
  material.userData.backMap = backMap || frontMap || null;
  material.map = material.userData.frontMap || material.userData.backMap || null;
  material.customProgramCacheKey = () => "double-sided-face-maps-v3";
  material.onBeforeCompile = shader => {
    shader.uniforms.backMap = { value: material.userData.backMap || material.userData.frontMap || null };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D backMap;")
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
	vec4 sampledDiffuseColor;
	if ( gl_FrontFacing ) {
		sampledDiffuseColor = texture2D( map, vMapUv );
	} else {
		sampledDiffuseColor = texture2D( backMap, vec2( 1.0 - vMapUv.x, vMapUv.y ) );
	}
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`
      );
    material.userData.shader = shader;
  };
  material.needsUpdate = true;
}

function updateDoubleSidedFaceMaps(material, frontMap, backMap) {
  if (!material) {
    return;
  }
  material.userData.frontMap = frontMap || null;
  material.userData.backMap = backMap || frontMap || null;
  material.map = material.userData.frontMap || material.userData.backMap || null;
  if (material.userData.shader?.uniforms?.backMap) {
    material.userData.shader.uniforms.backMap.value = material.userData.backMap || material.userData.frontMap || null;
  }
  material.needsUpdate = true;
}

function updatePanelFaceMaps(frontMaterial, backMaterial, frontMap, backMap) {
  if (frontMaterial) {
    frontMaterial.map = frontMap || null;
    frontMaterial.needsUpdate = true;
  }
  if (backMaterial) {
    backMaterial.map = backMap || null;
    backMaterial.needsUpdate = true;
  }
}

function classifyExtrudedPanelFaces(THREE, geometry) {
  const indexAttr = geometry.getIndex();
  const positionAttr = geometry.getAttribute("position");
  if (!indexAttr || !positionAttr) {
    return {
      frontCapIndices: [],
      backCapIndices: [],
      edgeIndices: []
    };
  }

  const frontCapIndices = [];
  const backCapIndices = [];
  const edgeIndices = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let index = 0; index < indexAttr.count; index += 3) {
    const ia = indexAttr.getX(index);
    const ib = indexAttr.getX(index + 1);
    const ic = indexAttr.getX(index + 2);
    a.fromBufferAttribute(positionAttr, ia);
    b.fromBufferAttribute(positionAttr, ib);
    c.fromBufferAttribute(positionAttr, ic);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    normal.crossVectors(ab, ac);

    if (Math.abs(normal.z) > Math.max(Math.abs(normal.x), Math.abs(normal.y))) {
      const averageZ = (a.z + b.z + c.z) / 3;
      if (averageZ >= 0) {
        frontCapIndices.push(ia, ib, ic);
      } else {
        backCapIndices.push(ia, ib, ic);
      }
    } else {
      edgeIndices.push(ia, ib, ic);
    }
  }

  return {
    frontCapIndices,
    backCapIndices,
    edgeIndices
  };
}

function cloneFaceMaterialWithMap(THREE, textureLoader, paperStock, bounds, textureMap, colorUrlOverride = null) {
  const { material, stock, baseTexture } = createPaperMaterial(THREE, textureLoader, paperStock, bounds, {
    colorUrlOverride
  });
  material.map = textureMap || baseTexture || null;
  material.needsUpdate = true;
  return {
    material,
    stock,
    baseTexture
  };
}

function syncPanelMaterialState(panelMesh, showLabels = false) {
  if (panelMesh?.userData?.sheetSides) {
    for (const sideMesh of panelMesh.userData.sheetSides) {
      const material = sideMesh?.userData?.faceMaterial || sideMesh?.material || null;
      if (!material) continue;
      material.map = showLabels && sideMesh.userData.labeledMap
        ? sideMesh.userData.labeledMap
        : sideMesh.userData.baseMap;
      material.needsUpdate = true;
    }
    return;
  }

  const nextFrontMap = showLabels && panelMesh.userData.labeledMap
    ? panelMesh.userData.labeledMap
    : panelMesh.userData.baseMap;
  const nextBackMap = showLabels && panelMesh.userData.backLabeledMap
    ? panelMesh.userData.backLabeledMap
    : panelMesh.userData.backBaseMap;
  if (panelMesh.userData.usesDoubleSidedFaceMaps) {
    updateDoubleSidedFaceMaps(panelMesh.userData.faceMaterial, nextFrontMap, nextBackMap);
    return;
  }
  updatePanelFaceMaps(panelMesh.userData.faceMaterial, panelMesh.userData.backFaceMaterial, nextFrontMap, nextBackMap);
}

function cloneIndexedGeometrySubset(geometry, indices) {
  const subset = geometry.clone();
  subset.setIndex(Array.from(indices || []));
  subset.clearGroups();
  if (indices && indices.length) {
    subset.addGroup(0, indices.length, 0);
  }
  subset.computeVertexNormals();
  return subset;
}

function smoothstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function findPanelIdFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData && current.userData.panelId) {
      return current.userData.panelId;
    }
    current = current.parent || null;
  }
  return "";
}

function findPanelIdFromHit(hit) {
  if (!hit || !hit.object) {
    return "";
  }
  const directPanelId = findPanelIdFromObject(hit.object);
  if (directPanelId) {
    return directPanelId;
  }

  const panelIds = hit.object.userData && hit.object.userData.panelIds;
  const panelIndexAttr = hit.object.geometry && hit.object.geometry.getAttribute
    ? hit.object.geometry.getAttribute("panelIndex")
    : null;
  if (!panelIds || !panelIndexAttr || !hit.face) {
    return "";
  }

  const panelIndex = panelIndexAttr.getX(hit.face.a);
  return panelIds[panelIndex] || "";
}

function getPanelLabelText(panel) {
  if (typeof panel.label === "string" && panel.label.trim()) {
    return panel.label;
  }
  return "";
}

function getPanelLabelPosition(panel) {
  if (Array.isArray(panel.labelPosition)) {
    return panel.labelPosition;
  }
  if (Array.isArray(panel.label)) {
    return panel.label;
  }
  return null;
}

function applyPanelBoundingBoxUvs(THREE, geometry) {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  const position = geometry.getAttribute("position");
  if (!bbox || !position) {
    return {
      minX: 0,
      minY: 0,
      width: 1,
      height: 1
    };
  }

  const minX = bbox.min.x;
  const minY = bbox.min.y;
  const width = Math.max(0.0001, bbox.max.x - bbox.min.x);
  const height = Math.max(0.0001, bbox.max.y - bbox.min.y);
  const uvs = [];

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const u = 1 - ((x - minX) / width);
    const v = 1 - ((y - minY) / height);
    uvs.push(u, v);
  }

  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.attributes.uv.needsUpdate = true;

  return {
    minX,
    minY,
    width,
    height
  };
}

function applyPageBoundsUvs(THREE, geometry, pageW, pageH) {
  const position = geometry.getAttribute("position");
  const safePageW = Math.max(0.0001, Number(pageW) || 1);
  const safePageH = Math.max(0.0001, Number(pageH) || 1);
  if (!position) {
    return {
      minX: 0,
      minY: 0,
      width: safePageW,
      height: safePageH
    };
  }

  const uvs = [];
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const u = 1 - (x / safePageW);
    const v = 1 - (y / safePageH);
    uvs.push(u, v);
  }

  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.attributes.uv.needsUpdate = true;

  return {
    minX: 0,
    minY: 0,
    width: safePageW,
    height: safePageH
  };
}

function flipGeometryUvsX(geometry) {
  const uvAttr = geometry?.getAttribute("uv");
  if (!uvAttr) {
    return;
  }
  for (let index = 0; index < uvAttr.count; index += 1) {
    uvAttr.setX(index, 1 - uvAttr.getX(index));
  }
  uvAttr.needsUpdate = true;
}

function getBoundsFromShapeGeometry(THREE, shapes) {
  if (!Array.isArray(shapes) || !shapes.length) {
    return null;
  }
  const geometry = new THREE.ShapeGeometry(shapes);
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  geometry.dispose();
  if (!bbox) {
    return null;
  }
  return {
    minX: bbox.min.x,
    minY: bbox.min.y,
    width: Math.max(0.0001, bbox.max.x - bbox.min.x),
    height: Math.max(0.0001, bbox.max.y - bbox.min.y)
  };
}

function drawPaperFallback(context, width, height, paperStock = "kraft") {
  const stock = getPaperStockConfig(paperStock);
  context.fillStyle = stock.fallbackColor || "#c8a773";
  context.fillRect(0, 0, width, height);

  const grainCount = Math.max(120, Math.round((width * height) / 9000));
  for (let index = 0; index < grainCount; index += 1) {
    const alpha = stock.grainAlpha ?? 0.075;
    context.fillStyle = `rgba(45, 32, 18, ${alpha})`;
    context.fillRect(
      Math.random() * width,
      Math.random() * height,
      Math.max(1, Math.random() * 2.5),
      Math.max(1, Math.random() * 2.5)
    );
  }
}

function drawPanelLabelOnContext(context, panel, panelBounds, width, height) {
  const labelText = getPanelLabelText(panel);
  const labelPosition = getPanelLabelPosition(panel);
  if (!labelText || !Array.isArray(labelPosition)) {
    return;
  }

  const x = ((labelPosition[0] - panelBounds.minX) / Math.max(panelBounds.width, 0.0001)) * width;
  const y = ((labelPosition[1] - panelBounds.minY) / Math.max(panelBounds.height, 0.0001)) * height;

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return;
  }

  const lines = String(labelText).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const longestLine = lines.join(" ").split(/\s+/).reduce((longest, part) => Math.max(longest, part.length), 1);
  const svgFontSize = Number(panel.labelFontSize);
  const rotationDeg = Number(panel.labelRotationDeg) || 0;
  const normalizedRotation = ((rotationDeg % 360) + 360) % 360;
  const isQuarterTurn = normalizedRotation === 90 || normalizedRotation === 270;
  const inlineSpan = isQuarterTurn ? height : width;
  const crossSpan = isQuarterTurn ? width : height;
  const minSpan = Math.max(1, Math.min(inlineSpan, crossSpan));
  const fontScale = Math.min(width / Math.max(panelBounds.width, 0.0001), height / Math.max(panelBounds.height, 0.0001));
  const requestedFontSize = Number.isFinite(svgFontSize) && svgFontSize > 0 ? svgFontSize * fontScale : null;
  const baseFontSize = Math.min(crossSpan * 0.42, minSpan * 0.32);
  const widthLimitedFontSize = (inlineSpan * 0.76) / Math.max(longestLine * 0.62, 1);
  const autoFitFontSize = Math.min(baseFontSize, widthLimitedFontSize);
  const fontSize = clamp(
    requestedFontSize ? Math.min(requestedFontSize, autoFitFontSize) : autoFitFontSize,
    8,
    Math.max(12, minSpan * 0.38)
  );
  const safeInset = Math.max(8, fontSize * 0.7);
  const maxTextWidth = Number.isFinite(Number(panel.labelMaxWidth)) && Number(panel.labelMaxWidth) > 0
    ? Math.min(Number(panel.labelMaxWidth) * fontScale, Math.max(inlineSpan - safeInset * 2, fontSize))
    : Math.max(inlineSpan - safeInset * 2, fontSize);
  const lineHeight = Math.max(0.5, Number(panel.labelLineHeight) || 1.2);
  const lineStep = fontSize * lineHeight;
  const firstLineY = -((lines.length - 1) * lineStep) / 2;
  const blockWidth = maxTextWidth;
  const blockHeight = fontSize + ((lines.length - 1) * lineStep);
  const halfInlineExtent = blockWidth * 0.5;
  const halfCrossExtent = blockHeight * 0.5;
  const halfWidth = isQuarterTurn ? halfCrossExtent : halfInlineExtent;
  const halfHeight = isQuarterTurn ? halfInlineExtent : halfCrossExtent;
  const drawX = clamp(x, safeInset + halfWidth, Math.max(safeInset + halfWidth, width - safeInset - halfWidth));
  const drawY = clamp(y, safeInset + halfHeight, Math.max(safeInset + halfHeight, height - safeInset - halfHeight));

  context.save();
  context.translate(drawX, drawY);
  if (Number.isFinite(rotationDeg)) {
    context.rotate((rotationDeg * Math.PI) / 180);
  }

  const fontWeight = panel.labelLayout?.fontWeight || panel.labelFontWeight || "700";
  const fontStyle = panel.labelLayout?.fontStyle || panel.labelFontStyle || "normal";
  const fontFamily = panel.labelLayout?.fontFamily || panel.labelFontFamily || "Arial, sans-serif";
  const fillStyle = panel.labelLayout?.fill || panel.labelFill || "rgba(38, 32, 24, 0.96)";

  context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.miterLimit = 2;

  context.strokeStyle = "rgba(255, 248, 232, 0.72)";
  context.lineWidth = Math.max(2, fontSize * 0.13);
  for (let index = 0; index < lines.length; index += 1) {
    context.strokeText(lines[index], 0, firstLineY + (index * lineStep), maxTextWidth);
  }

  context.fillStyle = fillStyle;
  for (let index = 0; index < lines.length; index += 1) {
    context.fillText(lines[index], 0, firstLineY + (index * lineStep), maxTextWidth);
  }
  context.restore();
}

function getTemplateFeatureSettings(geometry, templateFeatures) {
  const settingsKey = String(templateFeatures?.settingsKey || "").trim();
  if (!settingsKey) {
    return {};
  }
  return geometry && geometry.templateSettings && geometry.templateSettings[settingsKey]
    ? geometry.templateSettings[settingsKey]
    : {};
}

function normalizeTemplateFeatureSurfaceRect(panel, templateFeatures) {
  const rect = (panel && panel.custom3d ? panel.custom3d.surfaceRect : null) || templateFeatures?.surfaceRect || null;
  if (!rect) {
    return null;
  }
  return {
    x: Number(rect.x) || 0,
    y: Number(rect.y) || 0,
    width: Number(rect.width) || 0,
    height: Number(rect.height) || 0
  };
}

function normalizeTemplateFeatureRect(feature, surfaceRect) {
  if (!feature || !surfaceRect) {
    return null;
  }
  const localX = Math.max(0, Math.min(Number(feature.x) || 0, surfaceRect.width || 0));
  const localY = Math.max(0, Math.min(Number(feature.y) || 0, surfaceRect.height || 0));
  const width = Math.max(0.1, Math.min(Number(feature.width) || 0, Math.max(0.1, surfaceRect.width - localX)));
  const height = Math.max(0.1, Math.min(Number(feature.height) || 0, Math.max(0.1, surfaceRect.height - localY)));
  return {
    enabled: feature.enabled !== false,
    x: surfaceRect.x + localX,
    y: surfaceRect.y + localY,
    width,
    height
  };
}

function mapMmRectToCanvas(rect, bounds, width, height) {
  if (!rect || !bounds) {
    return null;
  }
  return {
    x: ((rect.x - bounds.minX) / Math.max(bounds.width, 0.0001)) * width,
    y: ((rect.y - bounds.minY) / Math.max(bounds.height, 0.0001)) * height,
    width: (rect.width / Math.max(bounds.width, 0.0001)) * width,
    height: (rect.height / Math.max(bounds.height, 0.0001)) * height
  };
}

function buildTemplateFeatureGradientMap(templateFeatures) {
  const gradients = Array.isArray(templateFeatures?.defs?.gradients) ? templateFeatures.defs.gradients : [];
  return new Map(
    gradients
      .filter(gradient => gradient && gradient.id)
      .map(gradient => [gradient.id, gradient])
  );
}

function createRoundedRectPath(context, x, y, width, height, radius = 0) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  if (!safeRadius) {
    context.rect(x, y, width, height);
    return;
  }
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function resolveTemplateFeatureCanvasPaint(context, paint, gradientMap, baseWidth, baseHeight) {
  if (paint && typeof paint === "object" && paint.type === "gradient" && paint.id && gradientMap.has(paint.id)) {
    const gradientDef = gradientMap.get(paint.id);
    const gradient = context.createLinearGradient(
      Number(gradientDef.x1 || 0) * baseWidth,
      Number(gradientDef.y1 || 0) * baseHeight,
      Number(gradientDef.x2 || 0) * baseWidth,
      Number(gradientDef.y2 || 0) * baseHeight
    );
    for (const stopDef of Array.isArray(gradientDef.stops) ? gradientDef.stops : []) {
      gradient.addColorStop(Number(stopDef.offset || 0), String(stopDef.color || "#000000"));
    }
    return gradient;
  }
  return typeof paint === "string" ? paint : null;
}

function drawTemplateFeatureElementOnContext(context, element, gradientMap, baseWidth, baseHeight) {
  if (!element || !element.type) {
    return;
  }
  context.save();
  context.globalAlpha = element.opacity !== undefined ? Number(element.opacity) || 1 : 1;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (element.type === "rect") {
    createRoundedRectPath(
      context,
      Number(element.x) || 0,
      Number(element.y) || 0,
      Number(element.width) || 0,
      Number(element.height) || 0,
      Number(element.rx) || 0
    );
  } else if (element.type === "path") {
    const path = new Path2D(String(element.d || ""));
    const fillPaint = resolveTemplateFeatureCanvasPaint(context, element.fill, gradientMap, baseWidth, baseHeight);
    if (fillPaint && fillPaint !== "none") {
      context.fillStyle = fillPaint;
      context.fill(path);
    }
    if (element.stroke) {
      context.strokeStyle = String(element.stroke);
      context.lineWidth = Number(element.strokeWidth) || 1;
      context.stroke(path);
    }
    context.restore();
    return;
  } else {
    context.restore();
    return;
  }

  const fillPaint = resolveTemplateFeatureCanvasPaint(context, element.fill, gradientMap, baseWidth, baseHeight);
  if (fillPaint && fillPaint !== "none") {
    context.fillStyle = fillPaint;
    context.fill();
  }
  if (element.stroke) {
    context.strokeStyle = String(element.stroke);
    context.lineWidth = Number(element.strokeWidth) || 1;
    context.stroke();
  }
  context.restore();
}

function drawTemplateFeatureOnContext(context, feature, rect, gradientMap) {
  if (!feature || !rect || rect.enabled === false) {
    return;
  }
  const baseWidth = Math.max(0.0001, Number(feature.baseWidth) || 1);
  const baseHeight = Math.max(0.0001, Number(feature.baseHeight) || 1);
  context.save();
  context.translate(rect.x, rect.y);
  context.scale(rect.width / baseWidth, rect.height / baseHeight);
  for (const element of Array.isArray(feature.elements) ? feature.elements : []) {
    drawTemplateFeatureElementOnContext(context, element, gradientMap, baseWidth, baseHeight);
  }
  context.restore();
}

function drawTemplateFeaturesOnContext(context, geometry, panel, side, bounds, width, height) {
  const templateFeatures = geometry?.templateFeatures || null;
  const sideFeatures = templateFeatures?.sides?.[side] || null;
  if (!templateFeatures || !Array.isArray(sideFeatures) || !sideFeatures.length) {
    return;
  }
  const featureSettings = getTemplateFeatureSettings(geometry, templateFeatures);
  const surfaceRect = normalizeTemplateFeatureSurfaceRect(panel, templateFeatures);
  if (!surfaceRect) {
    return;
  }
  const gradientMap = buildTemplateFeatureGradientMap(templateFeatures);
  for (const feature of sideFeatures) {
    const rect = mapMmRectToCanvas(
      normalizeTemplateFeatureRect({ ...feature, ...(featureSettings[feature.id] || {}) }, surfaceRect),
      bounds,
      width,
      height
    );
    drawTemplateFeatureOnContext(context, feature, rect, gradientMap);
  }
}

function getPrintedTextureSize(panelBounds) {
  const safeWidth = Math.max(panelBounds.width, 0.0001);
  const safeHeight = Math.max(panelBounds.height, 0.0001);
  const longestSide = Math.max(safeWidth, safeHeight);
  const shortestSide = Math.min(safeWidth, safeHeight);
  const maxCanvasSide = 2048;
  const minCanvasSide = 96;
  const basePixelsPerUnit = 8;
  const minPixelsPerUnit = minCanvasSide / shortestSide;
  const maxPixelsPerUnit = maxCanvasSide / longestSide;
  const pixelsPerUnit = clamp(basePixelsPerUnit, minPixelsPerUnit, maxPixelsPerUnit);

  return {
    width: Math.max(minCanvasSide, Math.round(safeWidth * pixelsPerUnit)),
    height: Math.max(minCanvasSide, Math.round(safeHeight * pixelsPerUnit))
  };
}

function paintTiledPaperSurface(context, image, width, height, textureScale, paperStock = "kraft") {
  const safeScale = clamp(Number(textureScale) || 1, 0.25, 4);
  context.clearRect(0, 0, width, height);
  if (image && image.width && image.height) {
    const pattern = context.createPattern(image, "repeat");
    if (pattern) {
      if (typeof pattern.setTransform === "function" && typeof DOMMatrix === "function") {
        pattern.setTransform(new DOMMatrix([safeScale, 0, 0, safeScale, 0, 0]));
        context.fillStyle = pattern;
        context.fillRect(0, 0, width, height);
        return;
      }
      context.save();
      context.scale(1 / safeScale, 1 / safeScale);
      context.fillStyle = pattern;
      context.fillRect(0, 0, width * safeScale, height * safeScale);
      context.restore();
      return;
    }
    context.drawImage(image, 0, 0, width, height);
    return;
  }
  drawPaperFallback(context, width, height, paperStock);
}

function createPrintedPanelTexture(THREE, panel, paperTextureUrl, panelBounds, paperStock = "kraft", artworkBounds = panelBounds, textureScale = 1, geometry = null, side = "outside") {
  const { width, height } = getPrintedTextureSize(panelBounds);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  const artworkCanvas = document.createElement("canvas");
  artworkCanvas.width = width;
  artworkCanvas.height = height;
  const artworkContext = artworkCanvas.getContext("2d");

  const artworkTexture = new THREE.CanvasTexture(artworkCanvas);
  artworkTexture.colorSpace = THREE.SRGBColorSpace;
  artworkTexture.anisotropy = 8;

  const labeledTexture = new THREE.CanvasTexture(canvas);
  labeledTexture.colorSpace = THREE.SRGBColorSpace;
  labeledTexture.anisotropy = 8;

  const redraw = image => {
    paintTiledPaperSurface(artworkContext, image, width, height, textureScale, paperStock);
    paintTiledPaperSurface(context, image, width, height, textureScale, paperStock);

    drawUvArtworkOnContext(artworkContext, panel.activeSideArtwork || null, artworkBounds, width, height, panel.d || "", () => redraw(image));
    drawTemplateFeaturesOnContext(artworkContext, geometry, panel, side, artworkBounds, width, height);
    context.drawImage(artworkCanvas, 0, 0);
    drawPanelLabelOnContext(context, panel, artworkBounds, width, height);
    artworkTexture.needsUpdate = true;
    labeledTexture.needsUpdate = true;
  };

  redraw(null);

  if (paperTextureUrl) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => redraw(image);
    image.onerror = () => redraw(null);
    image.src = paperTextureUrl;
  }

  return { artworkTexture, labeledTexture };
}

// Flat and extruded panel builders
function createDoubleSidedPanel(THREE, textureLoader, panel, shapes, paperStock, thickness = 0, origin = { x: 0, y: 0 }, textureScale = 1, sharedSheetTextures = null, geometry = null) {
  const paperTextureUrl = getPanelTextureUrl(panel.id, paperStock);
  const swapArtworkFaces = !!(panel?.custom3d?.swapArtworkFaces || geometry?.custom3d?.swapArtworkFaces);
  const safeThickness = Math.max(0, Number(thickness) || 0);
  const depth = Math.max(0.02, safeThickness);
  const bevelSize = Math.min(Math.max(depth * 0.18, 0.02), 0.12);
  const bevelThickness = bevelSize * 0.85;
  const extrudedGeometry = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize,
    bevelThickness,
    bevelOffset: 0,
    curveSegments: 48
  });
  extrudedGeometry.translate(0, 0, -depth * 0.5);
  const { edgeIndices } = classifyExtrudedPanelFaces(THREE, extrudedGeometry);
  const edgeGeometry = edgeIndices.length
    ? cloneIndexedGeometrySubset(extrudedGeometry, edgeIndices)
    : extrudedGeometry.clone();
  const frontGeometry = ensureFrontFacingGeometry(THREE, new THREE.ShapeGeometry(shapes, 48));
  const backGeometry = frontGeometry.clone();
  invertIndexedGeometryWinding(backGeometry);
  backGeometry.computeVertexNormals();
  // ExtrudeGeometry's bevel caps extend past the nominal depth on both sides.
  // Keep the printed planes just outside those caps so the body cannot hide them.
  const faceOffset = bevelThickness + Math.max(0.001, depth * 0.01);
  frontGeometry.translate(0, 0, (depth * 0.5) + faceOffset);
  backGeometry.translate(0, 0, (-depth * 0.5) - faceOffset);
  const panelBounds = sharedSheetTextures && geometry
    ? applyPageBoundsUvs(THREE, frontGeometry, geometry.pageW, geometry.pageH)
    : applyPanelBoundingBoxUvs(THREE, frontGeometry);
  if (sharedSheetTextures && geometry) {
    applyPageBoundsUvs(THREE, backGeometry, geometry.pageW, geometry.pageH);
    applyPageBoundsUvs(THREE, edgeGeometry, geometry.pageW, geometry.pageH);
  } else {
    applyPanelBoundingBoxUvs(THREE, backGeometry);
    applyPanelBoundingBoxUvs(THREE, edgeGeometry);
  }
  flipGeometryUvsX(backGeometry);
  panelBounds.textureScale = textureScale;
  const artworkBounds = panelBounds;
  const { artworkTexture, labeledTexture } = sharedSheetTextures
    ? sharedSheetTextures
    : createPrintedPanelTexture(THREE, panel, paperTextureUrl, panelBounds, paperStock, artworkBounds, textureScale, geometry, "outside");
  const resolvedFrontMap = artworkTexture || null;
  const resolvedBackMap = sharedSheetTextures?.backArtworkTexture || null;
  const resolvedFrontLabeledMap = labeledTexture || resolvedFrontMap;
  const resolvedBackLabeledMap = sharedSheetTextures?.backLabeledTexture || resolvedBackMap;
  const frontMap = swapArtworkFaces ? resolvedFrontMap : resolvedBackMap;
  const backMap = swapArtworkFaces ? resolvedBackMap : resolvedFrontMap;
  const frontLabeledMap = swapArtworkFaces ? resolvedFrontLabeledMap : resolvedBackLabeledMap;
  const backLabeledMap = swapArtworkFaces ? resolvedBackLabeledMap : resolvedFrontLabeledMap;
  const { material: faceMaterial, stock, baseTexture: faceTexture } = cloneFaceMaterialWithMap(
    THREE,
    textureLoader,
    paperStock,
    panelBounds,
    frontMap,
    paperTextureUrl
  );
  const { material: backFaceMaterial, baseTexture: backFaceTexture } = cloneFaceMaterialWithMap(
    THREE,
    textureLoader,
    paperStock,
    panelBounds,
    backMap,
    paperTextureUrl
  );
  faceMaterial.side = THREE.FrontSide;
  backFaceMaterial.side = THREE.FrontSide;
  faceMaterial.polygonOffset = true;
  faceMaterial.polygonOffsetFactor = -2;
  faceMaterial.polygonOffsetUnits = -2;
  backFaceMaterial.polygonOffset = true;
  backFaceMaterial.polygonOffsetFactor = -2;
  backFaceMaterial.polygonOffsetUnits = -2;
  const edgeMaterial3d = new THREE.MeshStandardMaterial({
    color: stock.edgeColor || 0xc4a06f,
    side: THREE.DoubleSide,
    flatShading: true,
    roughness: 0.98,
    metalness: 0.01
  });
  updatePanelFaceMaps(
    faceMaterial,
    backFaceMaterial,
    frontMap || faceTexture,
    backMap || backFaceTexture || faceTexture
  );

  const group = new THREE.Group();
  const frontMesh = new THREE.Mesh(frontGeometry, faceMaterial);
  const backMesh = new THREE.Mesh(backGeometry, backFaceMaterial);
  const edgeMesh = new THREE.Mesh(edgeGeometry, edgeMaterial3d);
  for (const mesh of [frontMesh, backMesh, edgeMesh]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.panelId = panel.id;
  }
  edgeMesh.renderOrder = 0;
  backMesh.renderOrder = 1;
  frontMesh.renderOrder = 2;
  frontMesh.userData.faceMaterial = faceMaterial;
  frontMesh.userData.backFaceMaterial = backFaceMaterial;
  frontMesh.userData.faceMaterials = [faceMaterial, backFaceMaterial];
  frontMesh.userData.edgeMaterial = edgeMaterial3d;
  frontMesh.userData.baseFaceColor = faceMaterial.color.clone();
  frontMesh.userData.baseEdgeColor = edgeMaterial3d.color.clone();
  frontMesh.userData.baseEmissive = faceMaterial.emissive.clone();
  frontMesh.userData.baseMap = frontMap || faceTexture;
  frontMesh.userData.labeledMap = frontLabeledMap || frontMesh.userData.baseMap;
  frontMesh.userData.backBaseMap = backMap || backFaceTexture || faceTexture;
  frontMesh.userData.backLabeledMap = backLabeledMap || frontMesh.userData.backBaseMap;
  group.add(edgeMesh);
  group.add(backMesh);
  group.add(frontMesh);
  group.userData.panelMesh = frontMesh;
  group.userData.deformerMeshes = [frontMesh, backMesh, edgeMesh];
  return group;
}

// Geometry refinement helpers
function subdivideTriangleSheetGeometry(THREE, geometry, levels = 1) {
  let working = geometry.index ? geometry.toNonIndexed() : geometry.clone();

  for (let level = 0; level < levels; level += 1) {
    const positionAttr = working.getAttribute("position");
    const uvAttr = working.getAttribute("uv");
    if (!positionAttr || positionAttr.count % 3 !== 0) {
      break;
    }

    const nextPositions = [];
    const nextUvs = [];

    function pushVertex(px, py, pz, ux = 0, uy = 0) {
      nextPositions.push(px, py, pz);
      nextUvs.push(ux, uy);
    }

    function midpoint(a, b) {
      return [
        (a[0] + b[0]) * 0.5,
        (a[1] + b[1]) * 0.5,
        (a[2] + b[2]) * 0.5
      ];
    }

    function midpointUv(a, b) {
      return [
        (a[0] + b[0]) * 0.5,
        (a[1] + b[1]) * 0.5
      ];
    }

    function emitTriangle(pa, pb, pc, ua, ub, uc) {
      pushVertex(pa[0], pa[1], pa[2], ua[0], ua[1]);
      pushVertex(pb[0], pb[1], pb[2], ub[0], ub[1]);
      pushVertex(pc[0], pc[1], pc[2], uc[0], uc[1]);
    }

    for (let index = 0; index < positionAttr.count; index += 3) {
      const p0 = [positionAttr.getX(index), positionAttr.getY(index), positionAttr.getZ(index)];
      const p1 = [positionAttr.getX(index + 1), positionAttr.getY(index + 1), positionAttr.getZ(index + 1)];
      const p2 = [positionAttr.getX(index + 2), positionAttr.getY(index + 2), positionAttr.getZ(index + 2)];
      const uv0 = uvAttr ? [uvAttr.getX(index), uvAttr.getY(index)] : [0, 0];
      const uv1 = uvAttr ? [uvAttr.getX(index + 1), uvAttr.getY(index + 1)] : [0, 0];
      const uv2 = uvAttr ? [uvAttr.getX(index + 2), uvAttr.getY(index + 2)] : [0, 0];
      const p01 = midpoint(p0, p1);
      const p12 = midpoint(p1, p2);
      const p20 = midpoint(p2, p0);
      const uv01 = midpointUv(uv0, uv1);
      const uv12 = midpointUv(uv1, uv2);
      const uv20 = midpointUv(uv2, uv0);

      emitTriangle(p0, p01, p20, uv0, uv01, uv20);
      emitTriangle(p01, p1, p12, uv01, uv1, uv12);
      emitTriangle(p20, p12, p2, uv20, uv12, uv2);
      emitTriangle(p01, p12, p20, uv01, uv12, uv20);
    }

    const refined = new THREE.BufferGeometry();
    refined.setAttribute("position", new THREE.Float32BufferAttribute(nextPositions, 3));
    refined.setAttribute("uv", new THREE.Float32BufferAttribute(nextUvs, 2));
    working.dispose();
    working = refined;
  }

  return working;
}

function weldSheetVertices(THREE, geometry, precision = 1e5) {
  const positionAttr = geometry.getAttribute("position");
  const uvAttr = geometry.getAttribute("uv");
  if (!positionAttr) {
    return geometry;
  }

  const vertexMap = new Map();
  const positions = [];
  const uvs = [];
  const indices = [];

  function quantize(value) {
    return Math.round(value * precision);
  }

  for (let index = 0; index < positionAttr.count; index += 1) {
    const px = positionAttr.getX(index);
    const py = positionAttr.getY(index);
    const pz = positionAttr.getZ(index);
    const ux = uvAttr ? uvAttr.getX(index) : 0;
    const uy = uvAttr ? uvAttr.getY(index) : 0;
    const key = `${quantize(px)},${quantize(py)},${quantize(pz)},${quantize(ux)},${quantize(uy)}`;

    let nextIndex = vertexMap.get(key);
    if (nextIndex == null) {
      nextIndex = positions.length / 3;
      vertexMap.set(key, nextIndex);
      positions.push(px, py, pz);
      uvs.push(ux, uy);
    }
    indices.push(nextIndex);
  }

  const welded = new THREE.BufferGeometry();
  welded.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  welded.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  welded.setIndex(indices);
  geometry.dispose();
  return welded;
}

function invertIndexedGeometryWinding(geometry) {
  const indexAttr = geometry.getIndex();
  if (indexAttr) {
    for (let index = 0; index < indexAttr.count; index += 3) {
      const b = indexAttr.getX(index + 1);
      const c = indexAttr.getX(index + 2);
      indexAttr.setX(index + 1, c);
      indexAttr.setX(index + 2, b);
    }
    indexAttr.needsUpdate = true;
    return geometry;
  }

  const positionAttr = geometry.getAttribute("position");
  const uvAttr = geometry.getAttribute("uv");
  if (!positionAttr || positionAttr.count % 3 !== 0) {
    return geometry;
  }

  for (let index = 0; index < positionAttr.count; index += 3) {
    for (const attr of [positionAttr, uvAttr].filter(Boolean)) {
      const itemSize = attr.itemSize;
      const valuesB = [];
      const valuesC = [];
      for (let component = 0; component < itemSize; component += 1) {
        valuesB.push(attr.array[((index + 1) * itemSize) + component]);
        valuesC.push(attr.array[((index + 2) * itemSize) + component]);
      }
      for (let component = 0; component < itemSize; component += 1) {
        attr.array[((index + 1) * itemSize) + component] = valuesC[component];
        attr.array[((index + 2) * itemSize) + component] = valuesB[component];
      }
      attr.needsUpdate = true;
    }
  }

  return geometry;
}

function ensureFrontFacingGeometry(THREE, geometry) {
  const indexAttr = geometry.getIndex();
  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr) {
    return geometry;
  }

  let signedZ = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();

  if (indexAttr && indexAttr.count >= 3) {
    for (let index = 0; index < indexAttr.count; index += 3) {
      a.fromBufferAttribute(positionAttr, indexAttr.getX(index));
      b.fromBufferAttribute(positionAttr, indexAttr.getX(index + 1));
      c.fromBufferAttribute(positionAttr, indexAttr.getX(index + 2));
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      normal.crossVectors(ab, ac);
      signedZ += normal.z;
    }
  } else if (positionAttr.count >= 3) {
    for (let index = 0; index < positionAttr.count; index += 3) {
      a.fromBufferAttribute(positionAttr, index);
      b.fromBufferAttribute(positionAttr, index + 1);
      c.fromBufferAttribute(positionAttr, index + 2);
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      normal.crossVectors(ab, ac);
      signedZ += normal.z;
    }
  }

  if (signedZ < 0) {
    invertIndexedGeometryWinding(geometry);
  }

  geometry.computeVertexNormals();
  return geometry;
}

// Curved shell mesh builders
function createCurvedShellBandPanel(runtime, textureLoader, panel, geometry, paperStock, profile, origin = { x: 0, y: 0 }, textureScale = 1, sharedSheetTextures = null) {
  const { THREE } = runtime;
  const shapes = loadPanelShape(runtime, panel, geometry, 0);
  if (!shapes.length) {
    return createDoubleSidedPanel(THREE, textureLoader, panel, shapes, paperStock, 0, origin, textureScale);
  }
  const shapeGeometry = new THREE.ShapeGeometry(shapes, 160);
  shapeGeometry.computeBoundingBox();
  const bbox = shapeGeometry.boundingBox;
  const panelWidth = bbox ? (bbox.max.x - bbox.min.x) : Math.max(0.001, Number(profile?.width) || 0.001);
  const panelHeight = bbox ? (bbox.max.y - bbox.min.y) : 0;
  const minX = bbox ? bbox.min.x : 0;
  const minY = bbox ? bbox.min.y : 0;
  const maxY = bbox ? bbox.max.y : panelHeight;
  const halfWidth = Math.max(0.001, panelWidth * 0.5);
  const sagitta = Math.max(0.001, Number(profile?.sagitta) || 0.001);
  const radius = ((sagitta * sagitta) + (halfWidth * halfWidth)) / (2 * sagitta);
  const chordOffset = Math.sqrt(Math.max(0, (radius * radius) - (halfWidth * halfWidth)));
  const columns = 64;
  const rows = 24;
  const positions = [];
  const uvs = [];
  const indices = [];

  function foldOffsetAtX(x) {
    const dx = Math.abs((x - minX) - halfWidth);
    return Math.sqrt(Math.max(0, (radius * radius) - (dx * dx))) - chordOffset;
  }

  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const x = minX + (panelWidth * u);
      const offset = foldOffsetAtX(x);
      const topY = minY + offset;
      const bottomY = maxY - offset;
      const y = topY + ((bottomY - topY) * v);
      positions.push(x, y, 0);
      uvs.push(u, panelHeight > 0 ? ((y - minY) / panelHeight) : v);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const topLeft = (row * (columns + 1)) + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + columns + 1;
      const bottomRight = bottomLeft + 1;
      indices.push(topLeft, bottomLeft, topRight);
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }

  const panelGeometry = new THREE.BufferGeometry();
  panelGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  panelGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  panelGeometry.setIndex(indices);
  shapeGeometry.dispose();
  ensureFrontFacingGeometry(THREE, panelGeometry);
  panelGeometry.computeBoundingBox();
  panelGeometry.computeBoundingSphere();

  const panelBounds = sharedSheetTextures && geometry
    ? applyPageBoundsUvs(THREE, panelGeometry, geometry.pageW, geometry.pageH)
    : applyPanelBoundingBoxUvs(THREE, panelGeometry);
  panelBounds.textureScale = textureScale;
  const paperTextureUrl = getPanelTextureUrl(panel.id, paperStock);
  const artworkBounds = panelBounds;
  const { artworkTexture, labeledTexture, backArtworkTexture, backLabeledTexture } = sharedSheetTextures
    ? {
        artworkTexture: sharedSheetTextures.artworkTexture,
        labeledTexture: sharedSheetTextures.labeledTexture,
        backArtworkTexture: sharedSheetTextures.backArtworkTexture,
        backLabeledTexture: sharedSheetTextures.backLabeledTexture
      }
    : {
        ...createPrintedPanelTexture(THREE, panel, paperTextureUrl, panelBounds, paperStock, artworkBounds, textureScale),
        backArtworkTexture: null,
        backLabeledTexture: null
      };
  const { material: faceMaterial, baseTexture: faceTexture } = createPaperMaterial(THREE, textureLoader, paperStock, panelBounds, {
    colorUrlOverride: paperTextureUrl
  });
  const outsideMap = artworkTexture || faceTexture;
  const insideMap = backArtworkTexture || faceTexture;
  const swapArtworkFaces = !!(panel?.custom3d?.swapArtworkFaces || geometry?.custom3d?.swapArtworkFaces);
  const frontMap = swapArtworkFaces ? outsideMap : insideMap;
  const backMap = swapArtworkFaces ? insideMap : outsideMap;
  applyDoubleSidedFaceMaps(faceMaterial, frontMap, backMap);

  const panelMesh = new THREE.Mesh(panelGeometry, faceMaterial);
  panelMesh.castShadow = false;
  panelMesh.receiveShadow = true;
  panelMesh.userData.panelId = panel.id;
  panelMesh.userData.faceMaterial = faceMaterial;
  panelMesh.userData.baseFaceColor = faceMaterial.color.clone();
  panelMesh.userData.baseEmissive = faceMaterial.emissive.clone();
  panelMesh.userData.baseMap = frontMap;
  panelMesh.userData.labeledMap = labeledTexture;
  panelMesh.userData.backBaseMap = backMap;
  panelMesh.userData.backLabeledMap = backLabeledTexture || backMap;
  panelMesh.userData.usesDoubleSidedFaceMaps = true;
  panelMesh.userData.edgeMaterial = null;

  const group = new THREE.Group();
  group.add(panelMesh);
  group.userData.panelMesh = panelMesh;
  return group;
}

function createCurvedShellFlapBandPanel(runtime, textureLoader, panel, geometry, paperStock, profile, origin = { x: 0, y: 0 }, textureScale = 1, sharedSheetTextures = null) {
  const { THREE } = runtime;
  const shapes = loadPanelShape(runtime, panel, { panels: [panel], lockCutoutD: "" }, 0);
  if (!shapes.length) {
    return createDoubleSidedPanel(THREE, textureLoader, panel, shapes, paperStock, 0, origin, textureScale);
  }
  const shapeGeometry = new THREE.ShapeGeometry(shapes, 160);
  // End flaps need vertices through their depth as well as along the curved
  // outline; the distributed cap bend below cannot curve a coarse triangle.
  const refinedGeometry = subdivideTriangleSheetGeometry(THREE, shapeGeometry, 4);
  shapeGeometry.dispose();
  const panelGeometry = weldSheetVertices(THREE, refinedGeometry);
  ensureFrontFacingGeometry(THREE, panelGeometry);
  panelGeometry.computeBoundingBox();
  panelGeometry.computeBoundingSphere();

  const panelBounds = sharedSheetTextures && geometry
    ? applyPageBoundsUvs(THREE, panelGeometry, geometry.pageW, geometry.pageH)
    : applyPanelBoundingBoxUvs(THREE, panelGeometry);
  panelBounds.textureScale = textureScale;
  const paperTextureUrl = getPanelTextureUrl(panel.id, paperStock);
  const artworkBounds = panelBounds;
  const { artworkTexture, labeledTexture, backArtworkTexture, backLabeledTexture } = sharedSheetTextures
    ? {
        artworkTexture: sharedSheetTextures.artworkTexture,
        labeledTexture: sharedSheetTextures.labeledTexture,
        backArtworkTexture: sharedSheetTextures.backArtworkTexture,
        backLabeledTexture: sharedSheetTextures.backLabeledTexture
      }
    : {
        ...createPrintedPanelTexture(THREE, panel, paperTextureUrl, panelBounds, paperStock, artworkBounds, textureScale),
        backArtworkTexture: null,
        backLabeledTexture: null
      };
  const { material: faceMaterial, baseTexture: faceTexture } = createPaperMaterial(THREE, textureLoader, paperStock, panelBounds, {
    colorUrlOverride: paperTextureUrl
  });
  const outsideMap = artworkTexture || faceTexture;
  const insideMap = backArtworkTexture || faceTexture;
  const swapArtworkFaces = !!(panel?.custom3d?.swapArtworkFaces || geometry?.custom3d?.swapArtworkFaces);
  const frontMap = swapArtworkFaces ? outsideMap : insideMap;
  const backMap = swapArtworkFaces ? insideMap : outsideMap;
  applyDoubleSidedFaceMaps(faceMaterial, frontMap, backMap);

  const panelMesh = new THREE.Mesh(panelGeometry, faceMaterial);
  panelMesh.castShadow = false;
  panelMesh.receiveShadow = true;
  panelMesh.userData.panelId = panel.id;
  panelMesh.userData.faceMaterial = faceMaterial;
  panelMesh.userData.baseFaceColor = faceMaterial.color.clone();
  panelMesh.userData.baseEmissive = faceMaterial.emissive.clone();
  panelMesh.userData.baseMap = frontMap;
  panelMesh.userData.labeledMap = labeledTexture;
  panelMesh.userData.backBaseMap = backMap;
  panelMesh.userData.backLabeledMap = backLabeledTexture || backMap;
  panelMesh.userData.usesDoubleSidedFaceMaps = true;
  panelMesh.userData.edgeMaterial = null;

  const shellDeformer = createCurvedShellSurfaceDeformer(panelMesh, profile, 1);
  if (shellDeformer) {
    applyCurvedShellSurfaceDeformation(shellDeformer, 1);
    panelMesh.userData.shellDeformer = shellDeformer;
  }

  const group = new THREE.Group();
  group.add(panelMesh);
  group.userData.panelMesh = panelMesh;
  return group;
}

// Fold helpers
function buildFoldProgressMap(foldIds, foldProgress, foldSequence, foldLocks) {
  const sequence = Array.isArray(foldSequence) && foldSequence.length ? foldSequence : foldIds;
  const stepCount = sequence.length || 1;
  const timeline = clamp(foldProgress, 0, 1) * stepCount;
  const progressMap = new Map();

  for (const foldId of foldIds) {
    const stepIndex = Math.max(0, sequence.indexOf(foldId));
    const localProgress = foldLocks && foldLocks[foldId] ? 1 : clamp(timeline - stepIndex, 0, 1);
    progressMap.set(foldId, localProgress);
  }

  return progressMap;
}

function createCenteredDoubleSidedPanel(runtime, textureLoader, panel, geometry, paperStock, thickness, center, textureScale = 1) {
  const shapes = loadPanelShape(runtime, panel, geometry, thickness);
  const group = createDoubleSidedPanel(runtime.THREE, textureLoader, panel, shapes, paperStock, thickness, center, textureScale);
  const panelMesh = group.userData.panelMesh || null;
  if (panelMesh) {
    panelMesh.geometry.translate(-center.x, -center.y, 0);
  }
  group.position.set(center.x, center.y, 0);
  group.userData.flatPosition = new runtime.THREE.Vector3(center.x, center.y, 0);
  group.userData.finalPosition = new runtime.THREE.Vector3(center.x, center.y, 0);
  group.userData.flatQuaternion = new runtime.THREE.Quaternion();
  group.userData.finalQuaternion = new runtime.THREE.Quaternion();
  return { group, panelMesh };
}

/*
function createCurvedShellFlapMesh(runtime, panel, geometry, paperStock, profile, options = {}) {
  // Dead helper. The live curved-shell builders are createCurvedShellBandPanel()
  // and createCurvedShellFlapBandPanel().
}

function updateCustomMeshMorph(mesh, progress) {
  // Dead helper. No current callers in this file.
}
*/

// Flap shell morphing
function updateCurvedShellFlapMorph(mesh, shellProgress, flapProgress) {
  if (!mesh || !mesh.geometry) {
    return;
  }
  const positionAttr = mesh.geometry.getAttribute("position");
  const flatPositions = mesh.userData.flatPositions;
  const shellPositions = mesh.userData.shellPositions;
  const foldedPositions = mesh.userData.foldedPositions;
  const shellT = clamp(shellProgress, 0, 1);
  const flapT = clamp(flapProgress, 0, 1);

  for (let index = 0; index < positionAttr.count; index += 1) {
    const offset = index * 3;
    const shellX = flatPositions[offset] + ((shellPositions[offset] - flatPositions[offset]) * shellT);
    const shellY = flatPositions[offset + 1] + ((shellPositions[offset + 1] - flatPositions[offset + 1]) * shellT);
    const shellZ = flatPositions[offset + 2] + ((shellPositions[offset + 2] - flatPositions[offset + 2]) * shellT);
    positionAttr.setXYZ(
      index,
      shellX + ((foldedPositions[offset] - shellX) * flapT),
      shellY + ((foldedPositions[offset + 1] - shellY) * flapT),
      shellZ + ((foldedPositions[offset + 2] - shellZ) * flapT)
    );
  }

  positionAttr.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
}

/*
function updatePartTransform(group, progress) {
  // Dead helper. No current callers in this file.
}
*/

// Crease connectors
function createCreaseConnector(THREE, line, thickness = 0, origin = { x: 0, y: 0 }) {
  const hingeLength = Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y);
  if (hingeLength < 0.001) {
    return null;
  }

  const safeThickness = Math.max(0.02, Number(thickness) || 0.02);
  const axis = new THREE.Vector3(line.end.x - line.start.x, line.end.y - line.start.y, 0).normalize();
  const radius = Math.max(0.05, safeThickness * 0.62);
  const radialSegments = 20;
  const material = new THREE.MeshStandardMaterial({
    color: 0xc4a06f,
    roughness: 0.98,
    metalness: 0.01
  });
  const group = new THREE.Group();
  group.position.set(
    ((line.start.x + line.end.x) * 0.5) - origin.x,
    ((line.start.y + line.end.y) * 0.5) - origin.y,
    0
  );
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);

  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, hingeLength, radialSegments, 1, false),
    material
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.visible = false;
  group.add(mesh);

  group.userData.mesh = mesh;
  group.userData.radius = radius;
  group.userData.hingeLength = hingeLength;
  group.userData.radialSegments = radialSegments;

  return group;
}

function updateCreaseConnector(THREE, connector, appliedAngle) {
  if (!connector || !connector.userData || !connector.userData.mesh) {
    return;
  }

  const mesh = connector.userData.mesh;
  if (Math.abs(appliedAngle) <= 0.001) {
    mesh.visible = false;
    return;
  }

  mesh.visible = true;
}

// Single sheet preview helpers
function getSheetTextureSize(pageW, pageH) {
  const safeWidth = Math.max(pageW, 0.0001);
  const safeHeight = Math.max(pageH, 0.0001);
  const longestSide = Math.max(safeWidth, safeHeight);
  const shortestSide = Math.min(safeWidth, safeHeight);
  const maxCanvasSide = 4096;
  const minCanvasSide = 512;
  const basePixelsPerUnit = 4;
  const minPixelsPerUnit = minCanvasSide / shortestSide;
  const maxPixelsPerUnit = maxCanvasSide / longestSide;
  const pixelsPerUnit = clamp(basePixelsPerUnit, minPixelsPerUnit, maxPixelsPerUnit);

  return {
    width: Math.max(minCanvasSide, Math.round(safeWidth * pixelsPerUnit)),
    height: Math.max(minCanvasSide, Math.round(safeHeight * pixelsPerUnit))
  };
}

function createSheetPrintedTextures(THREE, geometry, paperTextureUrl, paperStock = "kraft", options = {}) {
  const { width, height } = getSheetTextureSize(geometry.pageW || 1, geometry.pageH || 1);
  const bounds = {
    minX: 0,
    minY: 0,
    width: Math.max(geometry.pageW || 1, 0.0001),
    height: Math.max(geometry.pageH || 1, 0.0001)
  };
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseContext = baseCanvas.getContext("2d");

  const labeledCanvas = document.createElement("canvas");
  labeledCanvas.width = width;
  labeledCanvas.height = height;
  const labeledContext = labeledCanvas.getContext("2d");

  const baseTexture = new THREE.CanvasTexture(baseCanvas);
  baseTexture.colorSpace = THREE.SRGBColorSpace;
  baseTexture.anisotropy = 8;

  const labeledTexture = new THREE.CanvasTexture(labeledCanvas);
  labeledTexture.colorSpace = THREE.SRGBColorSpace;
  labeledTexture.anisotropy = 8;
  const artwork = options.artwork !== undefined
    ? options.artwork
    : (geometry.activeSideArtwork || geometry.sideArtwork?.outside || null);
  const includeLabels = options.includeLabels !== false;
  const transparentBackground = options.transparentBackground === true;
  const textureScale = clamp(Number(options.textureScale) || 1, 0.25, 4);
  const side = options.side === "inside" ? "inside" : "outside";

  const redraw = image => {
    for (const context of [baseContext, labeledContext]) {
      if (!transparentBackground) {
        paintTiledPaperSurface(context, image, width, height, textureScale, paperStock);
      }
    }

    drawUvArtworkOnContext(
      baseContext,
      artwork,
      bounds,
      width,
      height,
      "",
      () => redraw(image)
    );
    for (const panel of geometry.panels || []) {
      drawTemplateFeaturesOnContext(baseContext, geometry, panel, side, bounds, width, height);
    }
    labeledContext.drawImage(baseCanvas, 0, 0);

    if (includeLabels) {
      for (const panel of geometry.panels || []) {
        drawPanelLabelOnContext(labeledContext, panel, bounds, width, height);
      }
    }

    baseTexture.needsUpdate = true;
    labeledTexture.needsUpdate = true;
  };

  redraw(null);

  if (paperTextureUrl && !transparentBackground) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => redraw(image);
    image.onerror = () => redraw(null);
    image.src = paperTextureUrl;
  }

  return { baseTexture, labeledTexture };
}

function buildSingleSheetGeometry(THREE, runtime, geometry) {
  const positions = [];
  const uvs = [];
  const panelIndices = [];
  const indices = [];
  const panelIds = [];
  let vertexOffset = 0;

  for (const panel of geometry.panels || []) {
    const panelIndex = panelIds.length;
    panelIds.push(panel.id);
    const shapes = loadPanelShape(runtime, panel, geometry, 0);
    const panelGeometry = new THREE.ShapeGeometry(shapes, 48);
    const panelPositions = panelGeometry.getAttribute("position");
    const panelIndicesAttr = panelGeometry.index;
    if (!panelPositions) {
      panelGeometry.dispose();
      continue;
    }

    for (let index = 0; index < panelPositions.count; index += 1) {
      const x = panelPositions.getX(index);
      const y = panelPositions.getY(index);
      positions.push(x, y, 0);
      uvs.push(
        x / Math.max(geometry.pageW || 1, 0.0001),
        1 - (y / Math.max(geometry.pageH || 1, 0.0001))
      );
      panelIndices.push(panelIndex);
    }

    if (panelIndicesAttr) {
      for (let index = 0; index < panelIndicesAttr.count; index += 1) {
        indices.push(panelIndicesAttr.getX(index) + vertexOffset);
      }
    } else {
      for (let index = 0; index < panelPositions.count; index += 3) {
        indices.push(vertexOffset + index, vertexOffset + index + 1, vertexOffset + index + 2);
      }
    }

    vertexOffset += panelPositions.count;
    panelGeometry.dispose();
  }

  const mergedGeometry = new THREE.BufferGeometry();
  mergedGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  mergedGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  mergedGeometry.setAttribute("panelIndex", new THREE.Float32BufferAttribute(panelIndices, 1));
  mergedGeometry.setIndex(indices);
  mergedGeometry.computeVertexNormals();

  return {
    geometry: mergedGeometry,
    panelIds,
    basePositions: Float32Array.from(positions)
  };
}

function createSingleSheetMesh(runtime, geometry, paperStock = "kraft", textureScale = 1) {
  const { THREE } = runtime;
  const paperTextureUrl = getPaperStockConfig(paperStock).colorUrl || getPaperStockConfig(DEFAULT_PAPER_STOCK_ID).colorUrl;
  const built = buildSingleSheetGeometry(THREE, runtime, geometry);
  const outsideTextures = createSheetPrintedTextures(THREE, geometry, paperTextureUrl, paperStock, {
    artwork: geometry.sideArtwork?.outside || null,
    textureScale,
    side: "outside"
  });
  const insideTextures = createSheetPrintedTextures(THREE, geometry, paperTextureUrl, paperStock, {
    artwork: geometry.sideArtwork?.inside || null,
    textureScale,
    side: "inside"
  });
  const { material: outsideMaterial } = createPaperMaterial(THREE, new THREE.TextureLoader(), paperStock, {
    width: geometry.pageW || 1,
    height: geometry.pageH || 1,
    textureScale
  });
  const { material: insideMaterial } = createPaperMaterial(THREE, new THREE.TextureLoader(), paperStock, {
    width: geometry.pageW || 1,
    height: geometry.pageH || 1,
    textureScale
  });
  /*
   * The flat-sheet preview uses the generated canvas for labels and panel highlights,
   * but still benefits from the stock's normal and roughness maps.
   */
  outsideMaterial.map = outsideTextures.baseTexture;
  outsideMaterial.side = THREE.BackSide;
  outsideMaterial.needsUpdate = true;

  insideMaterial.map = insideTextures.baseTexture;
  insideMaterial.side = THREE.FrontSide;
  insideMaterial.needsUpdate = true;

  const outsideMesh = new THREE.Mesh(built.geometry, outsideMaterial);
  const insideMesh = new THREE.Mesh(built.geometry.clone(), insideMaterial);
  for (const sideMesh of [outsideMesh, insideMesh]) {
    sideMesh.castShadow = true;
    sideMesh.receiveShadow = true;
    sideMesh.userData.panelIds = built.panelIds;
    sideMesh.userData.basePositions = built.basePositions;
  }
  outsideMesh.userData.baseMap = outsideTextures.baseTexture;
  outsideMesh.userData.labeledMap = outsideTextures.labeledTexture;
  outsideMesh.userData.faceMaterial = outsideMaterial;
  outsideMesh.userData.sheetSide = "outside";
  insideMesh.userData.baseMap = insideTextures.baseTexture;
  insideMesh.userData.labeledMap = insideTextures.labeledTexture;
  insideMesh.userData.faceMaterial = insideMaterial;
  insideMesh.userData.sheetSide = "inside";

  const group = new THREE.Group();
  group.add(outsideMesh, insideMesh);
  group.userData.panelIds = built.panelIds;
  group.userData.basePositions = built.basePositions;
  group.userData.sheetSides = [outsideMesh, insideMesh];
  group.userData.outsideMesh = outsideMesh;
  group.userData.insideMesh = insideMesh;
  group.userData.baseMap = outsideTextures.baseTexture;
  group.userData.labeledMap = outsideTextures.labeledTexture;
  group.userData.faceMaterial = outsideMaterial;
  return group;
}

function updateSingleSheetMesh(instance, geometry, showLabels = false) {
  const mesh = instance.singleSheetMesh;
  if (!mesh || !instance.rootGroup) {
    return;
  }

  instance.rootGroup.updateMatrixWorld(true);
  const rootInverse = new instance.THREE.Matrix4().copy(instance.rootGroup.matrixWorld).invert();
  const panelMatrices = new Map();
  for (const panelId of mesh.userData.panelIds || []) {
    const node = instance.panelNodes.get(panelId);
    if (!node) continue;
    panelMatrices.set(
      panelId,
      new instance.THREE.Matrix4().multiplyMatrices(rootInverse, node.matrixWorld)
    );
  }

  const targetMeshes = mesh.userData.sheetSides || [mesh];
  const vertex = new instance.THREE.Vector3();
  for (const targetMesh of targetMeshes) {
    const positionAttr = targetMesh.geometry.getAttribute("position");
    const panelIndexAttr = targetMesh.geometry.getAttribute("panelIndex");
    const basePositions = targetMesh.userData.basePositions || mesh.userData.basePositions;
    const panelIds = targetMesh.userData.panelIds || mesh.userData.panelIds || [];
    if (!positionAttr || !panelIndexAttr || !basePositions) {
      continue;
    }

    for (let index = 0; index < positionAttr.count; index += 1) {
      const panelId = panelIds[panelIndexAttr.getX(index)];
      const matrix = panelMatrices.get(panelId);
      const offset = index * 3;
      vertex.set(
        basePositions[offset],
        basePositions[offset + 1],
        basePositions[offset + 2]
      );
      if (matrix) {
        vertex.applyMatrix4(matrix);
      }
      positionAttr.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }

    positionAttr.needsUpdate = true;
    targetMesh.geometry.computeVertexNormals();
    targetMesh.geometry.computeBoundingBox();
    targetMesh.geometry.computeBoundingSphere();
  }

  syncPanelMaterialState(mesh, showLabels);
}

// Generic fold deformers
function createPanelDeformer(THREE, panelMesh, origin, hingeStart, hingeEnd, thickness = 0, options = {}) {
  const geometry = panelMesh.geometry;
  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr) {
    return null;
  }

  const axis2 = new THREE.Vector2(hingeEnd.x - hingeStart.x, hingeEnd.y - hingeStart.y);
  const axisLength = axis2.length();
  if (axisLength < 0.001) {
    return null;
  }

  const axis = new THREE.Vector3(axis2.x / axisLength, axis2.y / axisLength, 0);
  const normal2 = new THREE.Vector2(-axis.y, axis.x);
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  const center = bbox ? bbox.getCenter(new THREE.Vector3()) : new THREE.Vector3(origin.x, origin.y, 0);
  const centerRelative = new THREE.Vector2(center.x - origin.x, center.y - origin.y);
  const normalSign = Math.sign(centerRelative.dot(normal2)) || 1;
  const angleScale = Number.isFinite(options.angleScale) ? options.angleScale : 1;
  const angleDirection = Number.isFinite(options.angleDirection) ? options.angleDirection : -1;
  const creaseScale = Number.isFinite(options.creaseScale) ? options.creaseScale : 1;
  const hingePullScale = Number.isFinite(options.hingePullScale) ? options.hingePullScale : 0;

  return {
    mesh: panelMesh,
    geometry,
    positionAttr,
    basePositions: Float32Array.from(positionAttr.array),
    origin: new THREE.Vector3(origin.x, origin.y, 0),
    axis,
    normal2,
    normalSign,
    angleScale,
    angleDirection,
    hingePullScale,
    creaseWidth: Math.max(0.55, thickness * 0.85 * creaseScale)
  };
}

// Curved shell deformers
function createCurvedShellSurfaceDeformer(panelMesh, profile, direction = 1, options = {}) {
  const geometry = panelMesh.geometry;
  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr || !profile) {
    return null;
  }
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  if (!bbox) {
    return null;
  }
  const centerX = Number.isFinite(Number(options.centerX)) ? Number(options.centerX) : ((bbox.min.x + bbox.max.x) / 2);
  const halfWidth = Number.isFinite(Number(options.halfWidth))
    ? Math.max(0.001, Number(options.halfWidth))
    : Math.max(0.001, (bbox.max.x - bbox.min.x) / 2);
  const sagitta = Math.max(0.001, Number(profile.sagitta) || 0);
  const radius = ((sagitta * sagitta) + (halfWidth * halfWidth)) / (2 * sagitta);
  const centerOffsetZ = radius - sagitta;
  return {
    kind: "curved-shell-surface",
    mesh: panelMesh,
    geometry,
    positionAttr,
    basePositions: Float32Array.from(positionAttr.array),
    centerX,
    radius,
    centerOffsetZ,
    direction
  };
}

function createCurvedShellGlueFlapDeformer(panelMesh, profile, options = {}) {
  const geometry = panelMesh.geometry;
  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr || !profile) {
    return null;
  }
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  if (!bbox) {
    return null;
  }
  const hingeX = Number.isFinite(Number(options.hingeX)) ? Number(options.hingeX) : bbox.min.x;
  const glueWidth = Math.max(0.001, (bbox.max.x - bbox.min.x));
  const parentHalfWidth = Math.max(0.001, Number(options.parentHalfWidth) || ((Number(profile.width) || 0) * 0.5));
  const sagitta = Math.max(0.001, Number(profile.sagitta) || 0);
  const radius = ((sagitta * sagitta) + (parentHalfWidth * parentHalfWidth)) / (2 * sagitta);
  const chordOffset = Math.sqrt(Math.max(0, (radius * radius) - (parentHalfWidth * parentHalfWidth)));
  const edgeSlope = -(parentHalfWidth / Math.max(0.001, chordOffset));
  return {
    kind: "curved-shell-glue-surface",
    mesh: panelMesh,
    geometry,
    positionAttr,
    basePositions: Float32Array.from(positionAttr.array),
    hingeX,
    glueWidth,
    edgeSlope,
    slopeScale: 0.18
  };
}

function applyCurvedShellSurfaceDeformation(deformer, progress = 1) {
  const { geometry, positionAttr, basePositions, centerX, radius, centerOffsetZ, direction } = deformer;
  const t = clamp(progress, 0, 1);
  for (let index = 0; index < positionAttr.count; index += 1) {
    const offset = index * 3;
    const baseX = basePositions[offset];
    const localX = baseX - centerX;
    const inside = Math.max(0, (radius * radius) - (localX * localX));
    const arcZ = (-centerOffsetZ + Math.sqrt(inside)) * direction;
    positionAttr.array[offset] = baseX;
    positionAttr.array[offset + 1] = basePositions[offset + 1];
    positionAttr.array[offset + 2] = basePositions[offset + 2] + (arcZ * t);
  }
  positionAttr.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

function applyCurvedShellGlueFlapDeformation(deformer, progress = 1) {
  const { geometry, positionAttr, basePositions, hingeX, glueWidth, edgeSlope, slopeScale } = deformer;
  const tProgress = clamp(progress, 0, 1);
  const startSlope = edgeSlope * glueWidth * slopeScale;

  for (let index = 0; index < positionAttr.count; index += 1) {
    const offset = index * 3;
    const baseX = basePositions[offset];
    const localT = clamp((baseX - hingeX) / Math.max(0.001, glueWidth), 0, 1);
    const h10 = (localT * localT * localT) - (2 * localT * localT) + localT;
    const glueZ = h10 * startSlope;
    positionAttr.array[offset] = baseX;
    positionAttr.array[offset + 1] = basePositions[offset + 1];
    positionAttr.array[offset + 2] = basePositions[offset + 2] + (glueZ * tProgress);
  }

  positionAttr.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

function createCurvedShellFlapDeformer(panelMesh, origin, profile, edge = "top", panel = null, parentSurface = null) {
  const geometry = panelMesh.geometry;
  const positionAttr = geometry.getAttribute("position");
  if (!positionAttr || !profile) {
    return null;
  }
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  const flapMorph = panel && panel.custom3d && panel.custom3d.flapMorph
    ? panel.custom3d.flapMorph
    : null;
  const flapCurve = panel && panel.custom3d && panel.custom3d.flapCurve
    ? panel.custom3d.flapCurve
    : null;
  const width = Math.max(0.001, Number(profile.width) || 0);
  const sagitta = Math.max(0.001, Number(profile.sagitta) || 0);
  const radius = ((sagitta * sagitta) + ((width * width) / 4)) / (2 * sagitta);
  const centerOffset = radius - sagitta;
  const centerOffsetZ = radius - sagitta;
  const inheritedSurface = parentSurface && parentSurface.kind === "curved-shell-surface"
    ? parentSurface
    : null;
  return {
    kind: "curved-shell-flap",
    mesh: panelMesh,
    geometry,
    positionAttr,
    basePositions: Float32Array.from(positionAttr.array),
    originX: Number(origin.x) || 0,
    originY: Number(origin.y) || 0,
    width,
    centerX: inheritedSurface ? inheritedSurface.centerX : ((Number(origin.x) || 0) + (width * 0.5)),
    radius: inheritedSurface ? inheritedSurface.radius : radius,
    centerOffset: inheritedSurface ? inheritedSurface.centerOffsetZ : centerOffset,
    centerOffsetZ: inheritedSurface ? inheritedSurface.centerOffsetZ : centerOffsetZ,
    parentSurfaceDirection: inheritedSurface ? inheritedSurface.direction : null,
    maxCurveOffset: sagitta,
    concavityScale: Number.isFinite(Number(profile.endCapConcavity))
      ? clamp(Number(profile.endCapConcavity), 0, 1)
      : 0.4,
    bbox: bbox
      ? {
          minX: bbox.min.x,
          maxX: bbox.max.x,
          minY: bbox.min.y,
          maxY: bbox.max.y
        }
      : null,
    isBottom: edge === "bottom",
    isFront: String(panelMesh.userData.panelId || "").startsWith("front-"),
    shellDirection: flapMorph && Number.isFinite(Number(flapMorph.shellDirection))
      ? Number(flapMorph.shellDirection)
      : null,
    inwardSign: flapMorph && Number.isFinite(Number(flapMorph.inwardSign))
      ? Number(flapMorph.inwardSign)
      : null,
    hingeCurveSign: Number.isFinite(Number(flapCurve && flapCurve.hingeCurveSign))
      ? Number(flapCurve.hingeCurveSign)
      : null,
    foldAngleSign: Number.isFinite(Number(flapCurve && flapCurve.foldAngleSign))
      ? Number(flapCurve.foldAngleSign)
      : null,
    surfaceZSign: Number.isFinite(Number(flapCurve && flapCurve.surfaceZSign))
      ? Number(flapCurve.surfaceZSign)
      : null,
    zSign: Number.isFinite(Number(flapCurve && flapCurve.zSign))
      ? Number(flapCurve.zSign)
      : null
  };
}

function applyCurvedShellFlapDeformation(deformer, foldAngle) {
  const { geometry, positionAttr, basePositions, originY, centerX, radius, centerOffset, centerOffsetZ, parentSurfaceDirection, maxCurveOffset, concavityScale, isBottom, isFront, shellDirection, inwardSign, hingeCurveSign, foldAngleSign, surfaceZSign, zSign } = deformer;
  const resolvedFoldAngleSign = Number.isFinite(foldAngleSign) ? foldAngleSign : 1;
  const angle = (Number(foldAngle) || 0) * resolvedFoldAngleSign;
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);

  for (let index = 0; index < positionAttr.count; index += 1) {
    const offset = index * 3;
    const baseX = basePositions[offset];
    const baseY = basePositions[offset + 1];
    const dx = baseX - centerX;
    const inside = Math.max(0, (radius * radius) - (dx * dx));
    const curveOffset = Math.sqrt(inside) - centerOffset;
    const resolvedSurfaceZSign = Number.isFinite(parentSurfaceDirection)
      ? parentSurfaceDirection
      : (Number.isFinite(shellDirection)
          ? shellDirection
          : (Number.isFinite(surfaceZSign) ? surfaceZSign : 1));
    const shellZ = (-centerOffsetZ + Math.sqrt(inside)) * resolvedSurfaceZSign;
    const resolvedHingeCurveSign = Number.isFinite(hingeCurveSign)
      ? hingeCurveSign
      : (isBottom ? -1 : 1);
    const hingeY = originY + (curveOffset * resolvedHingeCurveSign);
    const relativeY = baseY - hingeY;
    const flapDepth = Math.max(0.001, curveOffset * 2);
    const depthProgress = clamp(Math.abs(relativeY) / flapDepth, 0, 1);
    // The assembled pillow end is concave: its center pulls toward the body,
    // rather than bulging past the outer cut edge.
    const inwardCurveDirection = isBottom ? -1 : 1;
    const bendProgress = Math.sin(Math.min(Math.PI * 0.5, Math.abs(angle)));
    const lateralFade = smoothstep01(curveOffset / Math.max(0.001, maxCurveOffset));
    const curvedY = inwardCurveDirection
      * curveOffset
      * concavityScale
      * lateralFade
      * lateralFade
      * Math.sin(Math.PI * depthProgress)
      * bendProgress;
    const resolvedZSign = Number.isFinite(inwardSign)
      ? inwardSign
      : (Number.isFinite(zSign)
        ? zSign
        : (isBottom
          ? (isFront ? -1 : 1)
          : (isFront ? 1 : -1)));

    positionAttr.array[offset] = baseX;
    // The parent surface supplies the open-state curve. Folding adds the cap
    // bow without moving either shared boundary edge away from that surface.
    positionAttr.array[offset + 1] = hingeY + (relativeY * cosAngle) + curvedY;
    const finalZ = shellZ + (relativeY * sinAngle * resolvedZSign);
    positionAttr.array[offset + 2] = finalZ;
  }

  positionAttr.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

}

// Deformation application
function applyPanelCreaseDeformation(THREE, deformer, foldAngle) {
  if (deformer && deformer.kind === "curved-shell-surface") {
    applyCurvedShellSurfaceDeformation(deformer, 1);
    return;
  }
  if (deformer && deformer.kind === "curved-shell-glue-surface") {
    applyCurvedShellGlueFlapDeformation(deformer, 1);
    return;
  }
  if (deformer && deformer.kind === "curved-shell-flap") {
    applyCurvedShellFlapDeformation(deformer, foldAngle);
    return;
  }
  const { geometry, positionAttr, basePositions, origin, axis, normal2, normalSign, creaseWidth, angleScale, angleDirection, hingePullScale } = deformer;
  const vertex = new THREE.Vector3();
  const rotated = new THREE.Vector3();
  const relative = new THREE.Vector3();
  const hingePoint2 = new THREE.Vector2(origin.x, origin.y);
  const activeAngle = Number(foldAngle) || 0;

  for (let index = 0; index < positionAttr.count; index += 1) {
    const offset = index * 3;
    const baseX = basePositions[offset];
    const baseY = basePositions[offset + 1];
    const baseZ = basePositions[offset + 2];
    const inPlane = new THREE.Vector2(baseX - hingePoint2.x, baseY - hingePoint2.y);
    const distance = Math.max(0, inPlane.dot(normal2) * normalSign);
    const normalizedDistance = distance / creaseWidth;
    const falloff = normalizedDistance >= 1 ? 0 : Math.pow(1 - smoothstep01(normalizedDistance), 2.4);

    if (falloff <= 0.0001 || Math.abs(activeAngle) <= 0.0001) {
      positionAttr.array[offset] = baseX;
      positionAttr.array[offset + 1] = baseY;
      positionAttr.array[offset + 2] = baseZ;
      continue;
    }

    relative.set(baseX - origin.x, baseY - origin.y, baseZ);
    rotated.copy(relative).applyAxisAngle(axis, activeAngle * angleDirection * angleScale * falloff);
    vertex.copy(rotated).add(origin);
    if (hingePullScale > 0) {
      const hingePull = Math.sin(Math.abs(activeAngle) * 0.5) * hingePullScale * falloff;
      vertex.x -= normal2.x * normalSign * hingePull;
      vertex.y -= normal2.y * normalSign * hingePull;
    }
    positionAttr.array[offset] = vertex.x;
    positionAttr.array[offset + 1] = vertex.y;
    positionAttr.array[offset + 2] = vertex.z;
  }

  positionAttr.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

function normalizeHingeLine(line, foldId = "") {
  if (!line) {
    return line;
  }

  const isImportedFold = String(foldId).startsWith("page-fold");
  if (!isImportedFold) {
    return line;
  }

  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const isHorizontal = Math.abs(dx) >= Math.abs(dy);
  const shouldSwap = isHorizontal ? line.end.x < line.start.x : line.end.y < line.start.y;

  if (!shouldSwap) {
    return line;
  }

  return {
    start: { ...line.end },
    end: { ...line.start }
  };
}

// Scene tree assembly
function buildPanelTree(runtime, geometry, paperStock, thickness = 0, textureScale = 1, options = {}) {
  const { THREE } = runtime;
  const foldMap = buildFoldMap(geometry);
  const childMap = buildChildMap(geometry);
  const foldById = new Map((geometry.folds || []).map(fold => [fold.id, fold]));
  const panels = new Map(geometry.panels.map(panel => [panel.id, panel]));
  const textureLoader = new THREE.TextureLoader();
  const custom3d = geometry.custom3d || null;
  const isCurvedShellModel = custom3d && custom3d.kind === "curved-shell";
  const curvedShellProfile = isCurvedShellModel
    ? geometry.custom3d.profile || null
    : null;
  const closureBiasByFold = (custom3d && custom3d.foldClosureBiasDeg) || {};
  const stackMultiplier = Number(custom3d && custom3d.stackMultiplier) || 1;
  const disablePanelCreaseDeformation = !!(custom3d && custom3d.disablePanelCreaseDeformation);
  const excludedPanelIds = new Set(Array.isArray(custom3d && custom3d.excludePanelIds) ? custom3d.excludePanelIds : []);
  const sharedPaperTextureUrl = getPaperStockConfig(paperStock).colorUrl || null;
  const frontSharedTextures = createSheetPrintedTextures(THREE, geometry, sharedPaperTextureUrl, paperStock, {
    artwork: geometry.sideArtwork?.outside || null,
    includeLabels: true,
    textureScale,
    side: "outside"
  });
  const backSharedTextures = createSheetPrintedTextures(THREE, geometry, sharedPaperTextureUrl, paperStock, {
    artwork: geometry.sideArtwork?.inside || null,
    includeLabels: false,
    textureScale,
    side: "inside"
  });
  const sharedSideTextures = {
    artworkTexture: frontSharedTextures.baseTexture,
    labeledTexture: frontSharedTextures.labeledTexture,
    backArtworkTexture: backSharedTextures.baseTexture,
    backLabeledTexture: backSharedTextures.labeledTexture
  };
  const root = new THREE.Group();
  const pivots = [];
  const pivotMap = new Map();
  const deformers = [];
  const panelNodes = new Map();
  const panelMeshes = new Map();
  const foldHighlights = new Map();
  let flatSheet = null;

  function createNode(panelId, origin, options = {}) {
    if (excludedPanelIds.has(panelId)) {
      return new THREE.Group();
    }
    const skipFoldId = options.skipFoldId || "";
    const panel = panels.get(panelId);
    const objectId = panel && panel.objectId ? panel.objectId : "";
    const node = new THREE.Group();
    node.userData.panelId = panelId;
    node.userData.objectId = objectId;
    panelNodes.set(panelId, node);

    const shapes = loadPanelShape(runtime, panel, geometry, thickness);
    const meshGroup = isCurvedShellModel && curvedShellProfile
      ? ((panelId === "front-panel" || panelId === "back-panel")
          ? createCurvedShellBandPanel(runtime, textureLoader, panel, geometry, paperStock, curvedShellProfile, origin, textureScale, sharedSideTextures)
          : (/-end-flap$/.test(panelId)
              ? createCurvedShellFlapBandPanel(runtime, textureLoader, panel, geometry, paperStock, curvedShellProfile, origin, textureScale, sharedSideTextures)
              : createDoubleSidedPanel(THREE, textureLoader, panel, shapes, paperStock, thickness, origin, textureScale, sharedSideTextures, geometry)))
      : createDoubleSidedPanel(THREE, textureLoader, panel, shapes, paperStock, thickness, origin, textureScale, sharedSideTextures, geometry);
    const panelMesh = meshGroup.userData.panelMesh || null;
    const panelDeformerMeshes = Array.isArray(meshGroup.userData.deformerMeshes) && meshGroup.userData.deformerMeshes.length
      ? meshGroup.userData.deformerMeshes
      : (panelMesh ? [panelMesh] : []);
    meshGroup.position.set(-origin.x, -origin.y, 0);
    node.add(meshGroup);
    if (panelMesh) {
      panelMeshes.set(panelId, panelMesh);
      if (isCurvedShellModel && curvedShellProfile && (panelId === "front-panel" || panelId === "back-panel")) {
        const surfaceDeformer = createCurvedShellSurfaceDeformer(panelMesh, curvedShellProfile, 1);
        if (surfaceDeformer) {
          surfaceDeformer.foldId = "__curved-shell-surface__";
          panelMesh.userData.curvedShellSurfaceDeformer = surfaceDeformer;
          deformers.push(surfaceDeformer);
        }
      } else if (isCurvedShellModel && curvedShellProfile && panelId === "glue-flap") {
        panelMesh.geometry.computeBoundingBox();
        const glueBox = panelMesh.geometry.boundingBox;
        const glueHingeX = glueBox ? glueBox.min.x : null;
        const glueDeformer = createCurvedShellGlueFlapDeformer(panelMesh, curvedShellProfile, {
          hingeX: glueHingeX,
          parentHalfWidth: curvedShellProfile.width * 0.5
        });
        if (glueDeformer) {
          glueDeformer.foldId = "__curved-shell-surface__";
          deformers.push(glueDeformer);
        }
      }
    }

    const children = childMap.get(panelId) || [];
    for (const child of children) {
      if (excludedPanelIds.has(child.id)) {
        continue;
      }
      const fold = foldMap.get(`${child.id}->${panelId}`);
      if (!fold) continue;
      if (skipFoldId && fold.id === skipFoldId) continue;
      const line = normalizeHingeLine(parseLinePath(fold.hingeD || fold.d), fold.id);
      if (!line) continue;

      const pivot = new THREE.Group();
      pivot.position.set(line.start.x - origin.x, line.start.y - origin.y, 0);
      const axis = new THREE.Vector3(line.end.x - line.start.x, line.end.y - line.start.y, 0).normalize();
      pivot.userData.axis = axis;
      pivot.userData.panelId = child.id;
      pivot.userData.objectId = child.objectId || "";
      pivot.userData.foldId = fold.id;
      pivot.userData.foldAngleRad = Number.isFinite(fold.angleDeg) ? (fold.angleDeg * (Math.PI / 180)) : null;
      pivot.userData.angleFactor = 1;
      pivot.userData.directionMultiplier = 1;
      pivot.userData.closureBiasRad = ((Number(closureBiasByFold[fold.id]) || 0) * Math.PI) / 180;
      pivot.userData.stackMultiplier = stackMultiplier;
      pivot.userData.hingeLength = Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y);
      pivot.userData.thickness = thickness;
      pivot.userData.disableRigidRotation = isCurvedShellModel && /-end-flap$/.test(child.id);
      pivots.push(pivot);
      if (!pivotMap.has(fold.id)) {
        pivotMap.set(fold.id, pivot);
      }

      if (!isCurvedShellModel) {
        const highlightGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, Math.max(0.8, thickness * 0.8 + 0.2)),
          new THREE.Vector3(line.end.x - line.start.x, line.end.y - line.start.y, Math.max(0.8, thickness * 0.8 + 0.2))
        ]);
        const highlightMaterial = new THREE.LineBasicMaterial({
          color: 0x76d7ff,
          transparent: true,
          opacity: 0.95
        });
        const highlightLine = new THREE.Line(highlightGeometry, highlightMaterial);
        highlightLine.visible = false;
        pivot.add(highlightLine);
        if (!foldHighlights.has(fold.id)) {
          foldHighlights.set(fold.id, []);
        }
        foldHighlights.get(fold.id).push(highlightLine);

        const creaseConnector = createCreaseConnector(THREE, line, thickness, origin);
        if (creaseConnector) {
          node.add(creaseConnector);
          pivot.userData.creaseConnector = creaseConnector;
        }
      }

      const childNode = createNode(child.id, line.start);
      pivot.userData.childNode = childNode;
      const childPanelMesh = childNode.children[0] && childNode.children[0].userData ? childNode.children[0].userData.panelMesh : null;
      const childDeformerMeshes = childNode.children[0] && childNode.children[0].userData && Array.isArray(childNode.children[0].userData.deformerMeshes)
        ? childNode.children[0].userData.deformerMeshes
        : (childPanelMesh ? [childPanelMesh] : []);
      if (panelDeformerMeshes.length && !isCurvedShellModel && !disablePanelCreaseDeformation) {
        for (const deformerMesh of panelDeformerMeshes) {
          const parentDeformer = createPanelDeformer(THREE, deformerMesh, line.start, line.start, line.end, thickness, {
            angleDirection: 1,
            angleScale: 0.22,
            creaseScale: 0.7,
            hingePullScale: Math.max(0.08, thickness * 0.16)
          });
          if (parentDeformer) {
            parentDeformer.foldId = fold.id;
            deformers.push(parentDeformer);
          }
        }
      }
      if (childPanelMesh) {
        if (isCurvedShellModel && curvedShellProfile && /-end-flap$/.test(child.id)) {
          const flapDeformer = createCurvedShellFlapDeformer(
            childPanelMesh,
            line.start,
            curvedShellProfile,
            child.id.includes("-bottom-") ? "bottom" : "top",
            child,
            panelMesh.userData.curvedShellSurfaceDeformer || null
          );
          if (flapDeformer) {
            flapDeformer.foldId = fold.id;
            flapDeformer.panelId = child.id;
            deformers.push(flapDeformer);
          }
        } else if (!isCurvedShellModel && !disablePanelCreaseDeformation) {
          for (const deformerMesh of childDeformerMeshes) {
            const deformer = createPanelDeformer(THREE, deformerMesh, line.start, line.start, line.end, thickness, {
              angleDirection: -1,
              angleScale: 0.42,
              creaseScale: 0.9,
              hingePullScale: Math.max(0.12, thickness * 0.22)
            });
            if (deformer) {
              deformer.foldId = fold.id;
              deformers.push(deformer);
            }
          }
        }
      }
      pivot.add(childNode);
      node.add(pivot);
    }

    return node;
  }

  const rootPanels = geometry.rootPanels && geometry.rootPanels.length ? geometry.rootPanels : [geometry.rootPanel || "base"];
  const floorFold = geometry.floorFoldId ? foldById.get(geometry.floorFoldId) : null;
  const floorFoldLine = floorFold ? normalizeHingeLine(parseLinePath(floorFold.hingeD || floorFold.d), floorFold.id) : null;
  const floorDistribution = geometry.floorFoldDistribution || {};
  const fromFactor = Number.isFinite(floorDistribution.from) ? floorDistribution.from : 0.5;
  const toFactor = Number.isFinite(floorDistribution.to) ? floorDistribution.to : 0.5;

  if (floorFold && floorFoldLine) {
    const hingeOrigin = floorFoldLine.start;
    const hingeAxis = new THREE.Vector3(
      floorFoldLine.end.x - floorFoldLine.start.x,
      floorFoldLine.end.y - floorFoldLine.start.y,
      0
    ).normalize();
    const hingeLength = Math.hypot(
      floorFoldLine.end.x - floorFoldLine.start.x,
      floorFoldLine.end.y - floorFoldLine.start.y
    );

    const rootSides = [
      { panelId: floorFold.from, angleFactor: fromFactor, directionMultiplier: 1 },
      { panelId: floorFold.to, angleFactor: toFactor, directionMultiplier: -1 }
    ];

    for (const side of rootSides) {
      if (excludedPanelIds.has(side.panelId)) {
        continue;
      }
      const pivot = new THREE.Group();
      pivot.position.set(0, 0, 0);
      pivot.userData.axis = hingeAxis.clone();
      pivot.userData.panelId = side.panelId;
      pivot.userData.objectId = panels.get(side.panelId)?.objectId || "";
      pivot.userData.foldId = floorFold.id;
      pivot.userData.foldAngleRad = Number.isFinite(floorFold.angleDeg) ? (floorFold.angleDeg * (Math.PI / 180)) : null;
      pivot.userData.angleFactor = side.angleFactor;
      pivot.userData.directionMultiplier = side.directionMultiplier;
      pivot.userData.stackMultiplier = stackMultiplier;
      pivot.userData.hingeLength = hingeLength;
      pivot.userData.thickness = thickness;
      pivots.push(pivot);
      if (!pivotMap.has(floorFold.id)) {
        pivotMap.set(floorFold.id, pivot);
      }

      const floorHighlightGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, Math.max(0.8, thickness * 0.8 + 0.2)),
        new THREE.Vector3(
          (floorFoldLine.end.x - floorFoldLine.start.x),
          (floorFoldLine.end.y - floorFoldLine.start.y),
          Math.max(0.8, thickness * 0.8 + 0.2)
        )
      ]);
      const floorHighlightMaterial = new THREE.LineBasicMaterial({
        color: 0x76d7ff,
        transparent: true,
        opacity: 0.95
      });
      const floorHighlightLine = new THREE.Line(floorHighlightGeometry, floorHighlightMaterial);
      floorHighlightLine.visible = false;
      pivot.add(floorHighlightLine);
      if (!foldHighlights.has(floorFold.id)) {
        foldHighlights.set(floorFold.id, []);
      }
      foldHighlights.get(floorFold.id).push(floorHighlightLine);

      const floorCreaseConnector = createCreaseConnector(THREE, floorFoldLine, thickness, { x: 0, y: 0 });
      if (floorCreaseConnector) {
        root.add(floorCreaseConnector);
        pivot.userData.creaseConnector = floorCreaseConnector;
      }

      const childNode = createNode(side.panelId, hingeOrigin, { skipFoldId: floorFold.id });
      pivot.userData.childNode = childNode;
      pivot.add(childNode);
      root.add(pivot);
    }
  } else {
    for (const rootPanelId of rootPanels) {
      if (excludedPanelIds.has(rootPanelId)) {
        continue;
      }
      root.add(createNode(rootPanelId, { x: 0, y: 0 }));
    }
  }

  if (geometry.flatSheetD) {
    const flatSheetShapes = loadShapesFromPathD(runtime, geometry.flatSheetD);
    flatSheet = createDoubleSidedPanel(
      THREE,
      textureLoader,
      {
        id: "flat-sheet",
        d: geometry.flatSheetD,
        label: "",
        labelPosition: null
      },
      flatSheetShapes,
      paperStock,
      thickness,
      { x: 0, y: 0 },
      textureScale,
      sharedSideTextures,
      geometry
    );
    flatSheet.position.z = -0.04;
    root.add(flatSheet);
  }

  for (const child of root.children) {
    child.userData.basePosition = child.position.clone();
    child.userData.baseQuaternion = child.quaternion.clone();
  }

  return { root, pivots, pivotMap, deformers, panelNodes, panelMeshes, foldHighlights, flatSheet };
}

// Lifecycle helpers
function disposeGroup(group) {
  group.traverse(object => {
    if (object.geometry) {
      object.geometry.dispose();
    }
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        for (const key of ["map", "normalMap", "roughnessMap", "alphaMap", "aoMap", "bumpMap", "displacementMap", "emissiveMap", "metalnessMap"]) {
          if (material[key] && typeof material[key].dispose === "function") {
            material[key].dispose();
          }
        }
        material.dispose();
      }
    }
  });
}

// Fold application
function applyFold(THREE, pivots, deformers, foldProgress, foldAnglesDeg, foldSequence, foldLocks, custom3d = null, foldProgressById = null) {
  const sequence = Array.isArray(foldSequence) && foldSequence.length
    ? foldSequence
    : pivots.map(pivot => pivot.userData.foldId).filter(Boolean);
  const stepCount = sequence.length || 1;
  const timeline = clamp(foldProgress, 0, 1) * stepCount;
  const foldAngles = new Map();
  const sequenceIndex = new Map(sequence.map((foldId, index) => [foldId, index]));
  const defaultAngleDegByFoldId = new Map();
  for (const pivot of pivots) {
    const foldId = pivot.userData.foldId;
    if (!foldId || defaultAngleDegByFoldId.has(foldId)) {
      continue;
    }
    const defaultAngleRad = pivot.userData.foldAngleRad !== null && pivot.userData.foldAngleRad !== undefined
      ? pivot.userData.foldAngleRad
      : 0;
    defaultAngleDegByFoldId.set(foldId, (defaultAngleRad * 180) / Math.PI);
  }
  const drivenFolds = custom3d && custom3d.drivenFolds && typeof custom3d.drivenFolds === "object"
    ? custom3d.drivenFolds
    : {};
  const foldStateCache = new Map();

  function resolveFoldState(foldId, trail = new Set()) {
    if (foldStateCache.has(foldId)) {
      return foldStateCache.get(foldId);
    }

    let state = {
      localProgress: 0,
      signedAngleDeg: 0
    };

    const driven = drivenFolds[foldId];
    if (driven && driven.source && !trail.has(foldId)) {
      trail.add(foldId);
      const sourceState = resolveFoldState(driven.source, trail);
      trail.delete(foldId);
      const progressScale = Number.isFinite(driven.progressScale) ? driven.progressScale : 1;
      const angleScale = Number.isFinite(driven.angleScale) ? driven.angleScale : 1;
      const angleOffsetDeg = Number.isFinite(driven.angleOffsetDeg) ? driven.angleOffsetDeg : 0;
      state = {
        localProgress: clamp(sourceState.localProgress * progressScale, 0, 1),
        signedAngleDeg: (sourceState.signedAngleDeg * angleScale) + angleOffsetDeg
      };
    } else {
      const stepIndex = sequenceIndex.has(foldId) ? sequenceIndex.get(foldId) : -1;
      const localProgress = foldLocks && foldLocks[foldId]
        ? 1
        : (foldProgressById && foldProgressById[foldId] !== undefined
            ? clamp(Number(foldProgressById[foldId]) || 0, 0, 1)
            : (stepIndex >= 0 ? clamp(timeline - stepIndex, 0, 1) : 0));
      const overrideAngleDeg = foldAnglesDeg && Number.isFinite(foldAnglesDeg[foldId]) ? foldAnglesDeg[foldId] : null;
      const defaultAngleDeg = defaultAngleDegByFoldId.get(foldId) || 0;
      state = {
        localProgress,
        signedAngleDeg: overrideAngleDeg !== null ? overrideAngleDeg : defaultAngleDeg
      };
    }

    foldStateCache.set(foldId, state);
    return state;
  }

  for (const pivot of pivots) {
    const foldId = pivot.userData.foldId;
    const foldState = resolveFoldState(foldId);
    const localProgress = foldState.localProgress;
    const signedAngleRad = (foldState.signedAngleDeg * Math.PI) / 180;
    const angleFactor = Number.isFinite(pivot.userData.angleFactor) ? pivot.userData.angleFactor : 1;
    const directionMultiplier = Number.isFinite(pivot.userData.directionMultiplier) ? pivot.userData.directionMultiplier : 1;
    const closureBiasRad = Number.isFinite(pivot.userData.closureBiasRad) ? pivot.userData.closureBiasRad : 0;
    const baseAngle = signedAngleRad * directionMultiplier * angleFactor * localProgress;
    const appliedAngle = baseAngle + (Math.sign(baseAngle) || 0) * closureBiasRad * localProgress;
    if (pivot.userData.disableRigidRotation) {
      pivot.quaternion.identity();
    } else {
      pivot.quaternion.setFromAxisAngle(
        pivot.userData.axis,
        appliedAngle
      );
    }
    updateCreaseConnector(THREE, pivot.userData.creaseConnector, appliedAngle);
    const childNode = pivot.userData.childNode || null;
    if (childNode) {
      if (pivot.userData.disableRigidRotation) {
        childNode.position.z = 0;
      } else {
        const hingeThickness = Math.max(0, Number(pivot.userData.thickness) || 0);
        const stackMultiplier = Math.max(1, Number(pivot.userData.stackMultiplier) || 1);
        const separationDirection = Math.sign(appliedAngle) || Math.sign(directionMultiplier) || 1;
        const separation = Math.sin(Math.abs(appliedAngle)) * Math.min(Math.max(hingeThickness * 0.08, 0.01), 0.05);
        const stackProgress = clamp((Math.abs(appliedAngle) - (Math.PI * 0.5)) / (Math.PI * 0.5), 0, 1);
        const stackedThickness = hingeThickness * stackMultiplier * stackProgress;
        childNode.position.z = (separation * separationDirection) - stackedThickness;
      }
    }
    if (!foldAngles.has(foldId)) {
      foldAngles.set(foldId, signedAngleRad * directionMultiplier * angleFactor * localProgress);
    }
  }

  for (const deformer of deformers || []) {
    applyPanelCreaseDeformation(THREE, deformer, foldAngles.get(deformer.foldId) || 0);
  }
}

// Selection and highlight helpers
function updatePanelSelection(instance, geometry, selectedPanelId = "", selectedFoldId = "", showLabels = false) {
  const selectedPanels = new Set();
  if (selectedPanelId) {
    selectedPanels.add(selectedPanelId);
  }
  if (selectedFoldId && geometry && Array.isArray(geometry.folds)) {
    const fold = geometry.folds.find(item => item.id === selectedFoldId);
    if (fold) {
      if (fold.from) selectedPanels.add(fold.from);
      if (fold.to) selectedPanels.add(fold.to);
    }
  }

  for (const [panelId, mesh] of instance.panelMeshes || []) {
    const faceMaterial = mesh.userData.faceMaterial;
    const backFaceMaterial = mesh.userData.backFaceMaterial;
    const edgeMaterial = mesh.userData.edgeMaterial;
    if (!faceMaterial || !edgeMaterial) continue;
    const isSelected = selectedPanels.has(panelId);
    for (const material of [faceMaterial, backFaceMaterial].filter(Boolean)) {
      material.emissive.copy(mesh.userData.baseEmissive);
      material.emissive.setHex(isSelected ? 0x3f2814 : 0x000000);
      material.emissiveIntensity = isSelected ? 0.34 : 0;
    }
    edgeMaterial.color.copy(isSelected ? new instance.THREE.Color(0xf3d08b) : mesh.userData.baseEdgeColor);
  }

  for (const [panelId, mesh] of instance.panelMeshes || []) {
    syncPanelMaterialState(mesh, showLabels);
  }

  for (const [foldId, lines] of instance.foldHighlights || []) {
    const active = foldId === selectedFoldId;
    for (const line of lines) {
      line.visible = active;
    }
  }
}

// Layout and transform helpers
function findDirectChildAncestor(root, node) {
  let current = node || null;
  while (current && current.parent && current.parent !== root) {
    current = current.parent;
  }
  return current && current.parent === root ? current : null;
}

function restoreTargetGroupBaseline(targetGroup) {
  if (!targetGroup) {
    return;
  }
  const basePosition = targetGroup.userData && targetGroup.userData.basePosition;
  const baseQuaternion = targetGroup.userData && targetGroup.userData.baseQuaternion;
  if (basePosition) {
    targetGroup.position.copy(basePosition);
  } else {
    targetGroup.position.set(0, 0, 0);
  }
  if (baseQuaternion) {
    targetGroup.quaternion.copy(baseQuaternion);
  } else {
    targetGroup.quaternion.identity();
  }
}

function alignTargetGroupToFloor(instance, targetGroup, floorReference, floorLift) {
  const { THREE, rootGroup } = instance;
  if (!targetGroup || !floorReference) {
    return;
  }

  restoreTargetGroupBaseline(targetGroup);
  rootGroup.updateMatrixWorld(true);
  const baselineBottomBox = new THREE.Box3().setFromObject(floorReference);
  const baselineBottomCenter = baselineBottomBox.getCenter(new THREE.Vector3());

  const bottomQuaternion = floorReference.getWorldQuaternion(new THREE.Quaternion());
  const bottomNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(bottomQuaternion).normalize();
  const correction = new THREE.Quaternion().setFromUnitVectors(bottomNormal, new THREE.Vector3(0, 0, 1));
  targetGroup.quaternion.premultiply(correction);
  rootGroup.updateMatrixWorld(true);

  const bottomBox = new THREE.Box3().setFromObject(floorReference);
  const bottomCenter = bottomBox.getCenter(new THREE.Vector3());
  targetGroup.position.x += baselineBottomCenter.x - bottomCenter.x;
  targetGroup.position.y += baselineBottomCenter.y - bottomCenter.y;
  targetGroup.position.z -= bottomBox.min.z;
  targetGroup.position.z += floorLift;
  rootGroup.updateMatrixWorld(true);
}

function recenterModelOnGrid(instance, target = null) {
  const { THREE, rootGroup } = instance;
  const thickness = Math.max(0, Number(instance.lastThickness) || 0);
  const floorLift = Math.max(0.35, (thickness * 0.5) + 0.25);
  const subject = target || instance.meshTree || rootGroup;
  const sceneBox = new THREE.Box3().setFromObject(subject);
  if (sceneBox.isEmpty()) {
    return;
  }
  const sceneCenter = sceneBox.getCenter(new THREE.Vector3());
  rootGroup.position.x -= sceneCenter.x;
  rootGroup.position.y -= sceneCenter.y;
  rootGroup.position.z -= sceneBox.min.z;
  rootGroup.position.z += floorLift;
  rootGroup.updateMatrixWorld(true);
}

function alignModelToFloor(instance) {
  const { THREE, rootGroup, panelNodes, foldPivotMap, meshTree } = instance;
  const thickness = Math.max(0, Number(instance.lastThickness) || 0);
  const floorLift = Math.max(0.35, (thickness * 0.5) + 0.25);
  if (instance.floorFoldId && foldPivotMap && foldPivotMap.has(instance.floorFoldId)) {
    const hingePivot = foldPivotMap.get(instance.floorFoldId);
    rootGroup.position.set(0, 0, 0);
    rootGroup.quaternion.identity();
    rootGroup.updateMatrixWorld(true);

    const hingeStart = hingePivot.getWorldPosition(new THREE.Vector3());
    const hingeAxis = hingePivot.userData.axis.clone()
      .applyQuaternion(hingePivot.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();
    const projectedAxis = new THREE.Vector3(hingeAxis.x, hingeAxis.y, 0);
    if (projectedAxis.lengthSq() > 0.000001) {
      projectedAxis.normalize();
      const correction = new THREE.Quaternion().setFromUnitVectors(hingeAxis, projectedAxis);
      rootGroup.quaternion.premultiply(correction);
      rootGroup.updateMatrixWorld(true);
    }

    const correctedStart = hingePivot.getWorldPosition(new THREE.Vector3());
    const correctedAxis = hingePivot.userData.axis.clone()
      .applyQuaternion(hingePivot.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();
    const hingeEnd = correctedStart.clone().add(correctedAxis.multiplyScalar(hingePivot.userData.hingeLength || 0));
    const hingeMidpoint = correctedStart.clone().add(hingeEnd).multiplyScalar(0.5);

    rootGroup.position.x -= hingeMidpoint.x;
    rootGroup.position.y -= hingeMidpoint.y;
    rootGroup.position.z -= hingeMidpoint.z;
    rootGroup.position.z += Math.max(0.6, floorLift + 0.2);
    rootGroup.updateMatrixWorld(true);
    return;
  }

  rootGroup.position.set(0, 0, 0);
  rootGroup.quaternion.identity();
  rootGroup.updateMatrixWorld(true);

  const floorPanelsByObject = instance.floorPanelsByObject || null;
  const hasObjectFloorOverrides = meshTree
    && floorPanelsByObject
    && Object.keys(floorPanelsByObject).length > 0;

  if (hasObjectFloorOverrides) {
    const alignedTargets = new Set();
    for (const [objectId, floorPanelId] of Object.entries(floorPanelsByObject)) {
      if (!floorPanelId) {
        continue;
      }
      const bottomNode = panelNodes.get(floorPanelId);
      const bottomMesh = instance.panelMeshes && instance.panelMeshes.get(floorPanelId);
      const floorReference = bottomMesh || bottomNode;
      if (!floorReference) {
        continue;
      }
      const objectRoot = findDirectChildAncestor(meshTree, bottomNode || floorReference);
      if (!objectRoot || alignedTargets.has(objectRoot)) {
        continue;
      }
      const rootObjectId = String(objectRoot.userData && objectRoot.userData.objectId || "").trim();
      if (rootObjectId && objectId && rootObjectId !== objectId) {
        continue;
      }
      alignTargetGroupToFloor(instance, objectRoot, floorReference, floorLift);
      alignedTargets.add(objectRoot);
    }

    recenterModelOnGrid(instance, meshTree);
    return;
  }

  const floorPanelId = instance.floorPanelId || "bottom";
  const bottomNode = panelNodes.get(floorPanelId);
  const bottomMesh = instance.panelMeshes && instance.panelMeshes.get(floorPanelId);
  const floorReference = bottomMesh || bottomNode;
  if (!floorReference) return;
  alignTargetGroupToFloor(instance, meshTree || rootGroup, floorReference, floorLift);
  recenterModelOnGrid(instance, meshTree || rootGroup);
}

function resolveObjectRootMap(instance, geometry) {
  const map = new Map();
  const meshTree = instance.meshTree;
  if (!meshTree || !geometry || !Array.isArray(geometry.panels)) {
    return map;
  }
  const panelsByObject = new Map();
  for (const panel of geometry.panels) {
    const objectId = String(panel.objectId || "").trim() || "__default__";
    if (!panelsByObject.has(objectId)) {
      panelsByObject.set(objectId, []);
    }
    panelsByObject.get(objectId).push(panel.id);
  }
  for (const [objectId, panelIds] of panelsByObject.entries()) {
    for (const panelId of panelIds) {
      const panelNode = instance.panelNodes && instance.panelNodes.get(panelId);
      const objectRoot = findDirectChildAncestor(meshTree, panelNode);
      if (objectRoot) {
        map.set(objectId, objectRoot);
        break;
      }
    }
  }
  return map;
}

function applyObjectMoves(instance, geometry, objectMoveSteps = []) {
  if (!Array.isArray(objectMoveSteps) || !objectMoveSteps.length) {
    return;
  }
  const objectRoots = resolveObjectRootMap(instance, geometry);
  for (const step of objectMoveSteps) {
    const objectRoot = objectRoots.get(step.objectId || "__default__");
    if (!objectRoot) {
      continue;
    }
    const distance = Number(step.distanceMm) || 0;
    if (Math.abs(distance) < 0.0001) {
      continue;
    }
    if (step.axis === "y") {
      objectRoot.position.y += distance;
    } else if (step.axis === "z") {
      objectRoot.position.z += distance;
    } else {
      objectRoot.position.x += distance;
    }
  }
  instance.rootGroup.updateMatrixWorld(true);
}

// Camera helpers
function getVisibleObjectBox(THREE, root) {
  const box = new THREE.Box3();
  const childBox = new THREE.Box3();
  let hasBounds = false;

  function visit(object, ancestorsVisible = true) {
    const isVisible = ancestorsVisible && object.visible !== false;
    if (!isVisible) {
      return;
    }
    if (object.geometry && object.matrixWorld) {
      if (!object.geometry.boundingBox) {
        object.geometry.computeBoundingBox();
      }
      if (object.geometry.boundingBox) {
        childBox.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
        box.union(childBox);
        hasBounds = true;
      }
    }
    for (const child of object.children || []) {
      visit(child, isVisible);
    }
  }

  root.updateMatrixWorld(true);
  visit(root, true);
  return hasBounds ? box : new THREE.Box3();
}

function getPanelWorldFocus(instance, panelId = "") {
  if (!panelId || !instance.panelMeshes || !instance.panelMeshes.has(panelId)) {
    return null;
  }
  const mesh = instance.panelMeshes.get(panelId);
  if (!mesh || !mesh.geometry) {
    return null;
  }
  mesh.updateWorldMatrix(true, false);
  if (!mesh.geometry.boundingBox) {
    mesh.geometry.computeBoundingBox();
  }
  const box = mesh.geometry.boundingBox;
  if (!box) {
    return null;
  }
  const center = box.getCenter(new instance.THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
  const normal = new instance.THREE.Vector3(0, 0, 1)
    .applyQuaternion(mesh.getWorldQuaternion(new instance.THREE.Quaternion()))
    .normalize();
  return { center, normal };
}

function fitCamera(instance, geometry) {
  const { THREE, camera, controls, rootGroup } = instance;
  const box = getVisibleObjectBox(THREE, rootGroup);
  if (box.isEmpty()) {
    return;
  }
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const custom3d = geometry.custom3d || {};
  const cameraConfig = custom3d.camera || {};
  const presentationMode = getPresentationMode(instance, geometry);
  const cameraState = resolveCameraState(cameraConfig, presentationMode);
  const requestedViewName = instance.activeViewName === "top" || instance.activeViewName === "bottom"
    ? instance.activeViewName
    : (instance.cameraMode === "preset" && instance.activeViewName
        ? instance.activeViewName
        : (presentationMode === "flat"
            ? "top"
            : (cameraConfig.foldedView || "iso")));
  const viewName = resolveArtworkAwareViewName(geometry, requestedViewName);

  if (cameraState) {
    applyCapturedCameraState(instance, cameraState);
    instance.activeViewName = cameraState.viewName || viewName;
    instance.scene.userData.geometrySize = geometry.pageW * geometry.pageH;
    instance.lastCameraFrameSignature = JSON.stringify([
      instance.lastGeometryKey || "",
      presentationMode,
      instance.activeViewName,
      roundNumber(size.x),
      roundNumber(size.y),
      roundNumber(size.z)
    ]);
    return;
  }

  applyCameraView(instance, {
    box,
    size,
    center,
    viewName,
    padding: resolveCameraPadding(cameraConfig, presentationMode),
    targetOffset: resolveCameraTargetOffset(cameraConfig, presentationMode, size),
    saveAsDefault: true
  });

  instance.scene.userData.geometrySize = geometry.pageW * geometry.pageH;
  instance.lastCameraFrameSignature = JSON.stringify([
    instance.lastGeometryKey || "",
    presentationMode,
    viewName,
    roundNumber(size.x),
    roundNumber(size.y),
    roundNumber(size.z)
  ]);
}

function roundNumber(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function resolveCameraPadding(cameraConfig, presentationMode) {
  const modePadding = presentationMode === "flat"
    ? cameraConfig.flatPadding
    : cameraConfig.foldedPadding;
  const rawPadding = modePadding ?? cameraConfig.padding;
  const fallback = presentationMode === "folded" ? 1.42 : 1.18;
  const minimum = presentationMode === "folded" ? 1.38 : 1.08;
  return Math.min(3, Math.max(minimum, Number(rawPadding) || fallback));
}

function hasCapturedCameraState(cameraState) {
  if (!cameraState || typeof cameraState !== "object") {
    return false;
  }
  return (
    (Array.isArray(cameraState.cameraPosition) && Array.isArray(cameraState.cameraTarget))
    || (
      Array.isArray(cameraState.cameraOffset)
      && Array.isArray(cameraState.targetOffset)
      && (
        Array.isArray(cameraState.modelCenter)
        || Array.isArray(cameraState.anchorCenter)
        || Array.isArray(cameraState.center)
      )
    )
  );
}

function getCameraPreset(cameraConfig, viewName) {
  if (!cameraConfig || !cameraConfig.views || typeof cameraConfig.views !== "object") {
    return null;
  }
  const preset = cameraConfig.views[viewName];
  return preset && typeof preset === "object" ? preset : null;
}

function resolveCameraState(cameraConfig, presentationMode) {
  if (!cameraConfig || typeof cameraConfig !== "object") {
    return null;
  }
  if (presentationMode === "flat") {
    return null;
  }
  const directState = presentationMode === "flat"
    ? cameraConfig.flatState
    : cameraConfig.foldedState;
  if (hasCapturedCameraState(directState)) {
    return directState;
  }
  const namedView = presentationMode === "flat"
    ? cameraConfig.flatView
    : cameraConfig.foldedView;
  const preset = getCameraPreset(cameraConfig, namedView);
  if (hasCapturedCameraState(preset)) {
    return preset;
  }
  return null;
}

function resolveCameraTargetOffset(cameraConfig, presentationMode, size) {
  const rawOffset = presentationMode === "flat"
    ? (cameraConfig.flatTargetOffset || cameraConfig.targetOffset)
    : (cameraConfig.foldedTargetOffset || cameraConfig.targetOffset);
  const [x = 0, y = 0, z = 0] = Array.isArray(rawOffset) ? rawOffset : [];
  return {
    x: (Number(x) || 0) * size.x,
    y: (Number(y) || 0) * size.y,
    z: (Number(z) || 0) * Math.max(size.z, Math.max(size.x, size.y) * 0.25)
  };
}

function getViewVector(THREE, viewName) {
  const viewVectors = {
    top: [0, -0.001, 1],
    bottom: [0, 0.001, -1],
    front: [0, 1, 0.14],
    back: [0, -1, 0.14],
    right: [1, 0, 0.14],
    left: [-1, 0, 0.14],
    iso: [1.08, -1.14, 0.84]
  };
  const raw = viewVectors[viewName] || viewVectors.iso;
  return new THREE.Vector3(raw[0], raw[1], raw[2]).normalize();
}

function getViewUpVector(THREE) {
  return new THREE.Vector3(0, 0, 1);
}

function resolveArtworkAwareViewName(geometry, requestedViewName = "top") {
  if (requestedViewName !== "top" && requestedViewName !== "bottom") {
    return requestedViewName;
  }
  const requested = requestedViewName === "bottom" ? "bottom" : "top";
  const activeArtworkSide = geometry?.activeArtworkSide === "inside" ? "inside" : "outside";
  if (requested === "top") {
    return activeArtworkSide === "inside" ? "bottom" : "top";
  }
  return activeArtworkSide === "inside" ? "top" : "bottom";
}

function getPresentationMode(instance, geometry) {
  const lastFold = instance.lastFold !== undefined && instance.lastFold !== null ? instance.lastFold : 1;
  const hasFoldableGeometry = Array.isArray(geometry.folds)
    && geometry.folds.length > 0
    && Array.isArray(instance.foldPivots)
    && instance.foldPivots.length > 0;
  if (!hasFoldableGeometry || lastFold <= 0.001) {
    return "flat";
  }
  return "folded";
}

function applyCameraView(instance, options = {}) {
  const { THREE, camera, controls } = instance;
  const box = options.box || getVisibleObjectBox(THREE, instance.rootGroup);
  if (box.isEmpty()) {
    return;
  }
  const size = options.size || box.getSize(new THREE.Vector3());
  const center = options.center || box.getCenter(new THREE.Vector3());
  const padding = Math.max(1.02, Number(options.padding) || 1.22);
  const targetOffset = options.targetOffset || { x: 0, y: 0, z: 0 };
  const target = center.clone().add(new THREE.Vector3(
    Number(targetOffset.x) || 0,
    Number(targetOffset.y) || 0,
    Number(targetOffset.z) || 0
  ));
  const viewVector = options.viewVector
    ? options.viewVector.clone().normalize()
    : getViewVector(THREE, options.viewName || "iso");
  const viewUp = options.viewUp
    ? options.viewUp.clone().normalize()
    : getViewUpVector(THREE, options.viewName || "iso");
  const aspect = Math.max(0.1, camera.aspect || 1);
  const halfHeight = Math.max(1, size.y * 0.5 * padding);
  const halfWidth = Math.max(1, size.x * 0.5 * padding);
  const verticalFov = (camera.fov * Math.PI) / 180;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const heightDistance = halfHeight / Math.tan(verticalFov / 2);
  const widthDistance = halfWidth / Math.tan(horizontalFov / 2);
  const depthPadding = Math.max(size.z * 1.15, Math.max(size.x, size.y) * 0.08, 16);
  const distance = Math.max(heightDistance, widthDistance) + depthPadding;

  camera.up.copy(viewUp);
  camera.position.copy(target.clone().add(viewVector.multiplyScalar(distance)));
  camera.near = Math.max(0.5, distance / 200);
  camera.far = Math.max(2000, distance * 12);
  camera.updateProjectionMatrix();
  controls.target.copy(target);
  controls.minDistance = Math.max(24, distance * 0.28);
  controls.maxDistance = Math.max(controls.minDistance + 100, distance * 4.5);
  controls.update();
  controls.saveState?.();

  instance.activeViewName = options.viewName || "iso";
  if (options.saveAsDefault) {
    instance.defaultCameraState = {
      position: camera.position.clone(),
      target: controls.target.clone(),
      viewName: instance.activeViewName
    };
  }
  syncViewButtons(instance);
}

function buildCameraViewState(instance, options = {}) {
  const { THREE, camera } = instance;
  const box = options.box || getVisibleObjectBox(THREE, instance.rootGroup);
  if (box.isEmpty()) {
    return null;
  }
  const size = options.size || box.getSize(new THREE.Vector3());
  const center = options.center || box.getCenter(new THREE.Vector3());
  const padding = Math.max(1.02, Number(options.padding) || 1.22);
  const targetOffset = options.targetOffset || { x: 0, y: 0, z: 0 };
  const target = center.clone().add(new THREE.Vector3(
    Number(targetOffset.x) || 0,
    Number(targetOffset.y) || 0,
    Number(targetOffset.z) || 0
  ));
  const viewName = options.viewName || "iso";
  const viewVector = options.viewVector
    ? options.viewVector.clone().normalize()
    : getViewVector(THREE, viewName);
  const viewUp = (options.viewUp || getViewUpVector(THREE, viewName)).clone().normalize();
  const planeUp = viewUp.clone().sub(viewVector.clone().multiplyScalar(viewUp.dot(viewVector)));
  if (planeUp.lengthSq() < 0.000001) {
    planeUp.set(0, 0, 1).sub(viewVector.clone().multiplyScalar(viewVector.z));
  }
  planeUp.normalize();
  const planeRight = new THREE.Vector3().crossVectors(planeUp, viewVector).normalize();
  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z)
  ];
  let minRight = Infinity;
  let maxRight = -Infinity;
  let minUp = Infinity;
  let maxUp = -Infinity;
  let minDepth = Infinity;
  let maxDepth = -Infinity;
  for (const corner of corners) {
    const relative = corner.clone().sub(target);
    const rightDistance = relative.dot(planeRight);
    const upDistance = relative.dot(planeUp);
    const depthDistance = relative.dot(viewVector);
    minRight = Math.min(minRight, rightDistance);
    maxRight = Math.max(maxRight, rightDistance);
    minUp = Math.min(minUp, upDistance);
    maxUp = Math.max(maxUp, upDistance);
    minDepth = Math.min(minDepth, depthDistance);
    maxDepth = Math.max(maxDepth, depthDistance);
  }
  const aspect = Math.max(0.1, camera.aspect || 1);
  const halfHeight = Math.max(1, (maxUp - minUp) * 0.5 * padding);
  const halfWidth = Math.max(1, (maxRight - minRight) * 0.5 * padding);
  const verticalFov = (camera.fov * Math.PI) / 180;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const heightDistance = halfHeight / Math.tan(verticalFov / 2);
  const widthDistance = halfWidth / Math.tan(horizontalFov / 2);
  const depthPadding = Math.max((maxDepth - minDepth) * 0.55, Math.max(size.x, size.y, size.z) * 0.04, 8);
  const distance = Math.max(heightDistance, widthDistance) + depthPadding;

  return {
    position: target.clone().add(viewVector.multiplyScalar(distance)),
    target,
    viewName
  };
}

function setCameraMode(instance, mode) {
  instance.cameraMode = mode;
  if (mode === "manual") {
    instance.activeViewName = "custom";
  }
  syncViewButtons(instance);
}

function setManualCameraMode(instance, { preserveView = false } = {}) {
  instance.cameraMode = "manual";
  if (!preserveView) {
    instance.activeViewName = "custom";
  }
  syncViewButtons(instance);
}

function syncViewButtons(instance) {
  if (!instance.viewButtons) {
    return;
  }
  instance.viewButtons.forEach((button, viewName) => {
    button.setAttribute("aria-pressed", String(viewName === instance.activeViewName));
  });
}

function stepCameraZoom(instance, direction) {
  const { camera, controls } = instance;
  const offset = camera.position.clone().sub(controls.target);
  const currentDistance = offset.length();
  if (!Number.isFinite(currentDistance) || currentDistance <= 0.0001) {
    return;
  }

  const nextDistance = clamp(
    currentDistance * (direction === "in" ? 0.84 : 1.18),
    controls.minDistance || 24,
    controls.maxDistance || 2400
  );

  camera.position.copy(
    controls.target.clone().add(offset.normalize().multiplyScalar(nextDistance))
  );
  camera.updateProjectionMatrix();
  setManualCameraMode(instance, { preserveView: true });
  renderFrame(instance);
}

function applyModelRotation(instance, axisName = "z", rotationDeg = 0) {
  const { THREE, rootGroup } = instance;
  const degrees = Number(rotationDeg) || 0;
  if (Math.abs(degrees) < 0.0001) {
    return;
  }

  const axis = new THREE.Vector3(
    axisName === "x" ? 1 : 0,
    axisName === "y" ? 1 : 0,
    axisName === "z" ? 1 : 0
  ).normalize();
  const radians = (degrees * Math.PI) / 180;
  const floorLift = Math.max(0.35, ((Number(instance.lastThickness) || 0) * 0.5) + 0.25);

  rootGroup.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, radians));
  rootGroup.updateMatrixWorld(true);

  const rotatedBox = new THREE.Box3().setFromObject(rootGroup);
  const rotatedCenter = rotatedBox.getCenter(new THREE.Vector3());
  rootGroup.position.x -= rotatedCenter.x;
  rootGroup.position.y -= rotatedCenter.y;
  rootGroup.position.z -= rotatedBox.min.z;
  rootGroup.position.z += floorLift;
  rootGroup.updateMatrixWorld(true);
}

function applyModelRotationSteps(instance, geometry, modelRotationSteps = []) {
  const steps = Array.isArray(modelRotationSteps) ? modelRotationSteps : [];
  if (!steps.length) {
    return;
  }
  const { THREE, rootGroup } = instance;
  const floorLift = Math.max(0.35, ((Number(instance.lastThickness) || 0) * 0.5) + 0.25);
  const objectRoots = resolveObjectRootMap(instance, geometry);
  for (const step of steps) {
    const degrees = Number(step.angleDeg) || 0;
    if (Math.abs(degrees) < 0.0001) {
      continue;
    }
    const axis = new THREE.Vector3(
      step.axis === "x" ? 1 : 0,
      step.axis === "y" ? 1 : 0,
      step.axis === "z" ? 1 : 0
    ).normalize();
    const radians = (degrees * Math.PI) / 180;
    const objectId = step.objectId || "__all__";
    if (objectId !== "__all__") {
      const objectRoot = objectRoots.get(objectId);
      if (!objectRoot) {
        continue;
      }
      const originalBox = new THREE.Box3().setFromObject(objectRoot);
      const originalCenter = originalBox.getCenter(new THREE.Vector3());
      const originalMinZ = originalBox.min.z;
      objectRoot.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, radians));
      rootGroup.updateMatrixWorld(true);
      const rotatedBox = new THREE.Box3().setFromObject(objectRoot);
      const rotatedCenter = rotatedBox.getCenter(new THREE.Vector3());
      objectRoot.position.x += originalCenter.x - rotatedCenter.x;
      objectRoot.position.y += originalCenter.y - rotatedCenter.y;
      objectRoot.position.z += originalMinZ - rotatedBox.min.z;
      continue;
    }
    rootGroup.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, radians));
  }
  rootGroup.updateMatrixWorld(true);
  const rotatedBox = new THREE.Box3().setFromObject(rootGroup);
  const rotatedCenter = rotatedBox.getCenter(new THREE.Vector3());
  rootGroup.position.x -= rotatedCenter.x;
  rootGroup.position.y -= rotatedCenter.y;
  rootGroup.position.z -= rotatedBox.min.z;
  rootGroup.position.z += floorLift;
  rootGroup.updateMatrixWorld(true);
}

function applyCameraOrbit(instance, orbitYawDeg = 0, baseState = null) {
  const orbitBase = baseState || instance.defaultCameraState;
  if (!orbitBase) {
    return;
  }
  const { THREE, camera, controls } = instance;
  const radians = ((Number(orbitYawDeg) || 0) * Math.PI) / 180;
  const baseTarget = orbitBase.target.clone();
  const offset = orbitBase.position.clone().sub(baseTarget);
  offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), radians);
  camera.position.copy(baseTarget.clone().add(offset));
  controls.target.copy(baseTarget);
  camera.updateProjectionMatrix();
  controls.update();
}

function buildCameraStateFromCaptured(capturedState, THREE) {
  if (!capturedState) {
    return null;
  }
  const anchorCenter = Array.isArray(capturedState.modelCenter)
    ? capturedState.modelCenter
    : (Array.isArray(capturedState.anchorCenter) ? capturedState.anchorCenter : capturedState.center);
  if (Array.isArray(capturedState.cameraOffset) && Array.isArray(capturedState.targetOffset) && Array.isArray(anchorCenter)) {
    const [mx = 0, my = 0, mz = 0] = anchorCenter;
    const [cpx = 0, cpy = 0, cpz = 0] = capturedState.cameraOffset;
    const [ctx = 0, cty = 0, ctz = 0] = capturedState.targetOffset;
    const modelCenter = new THREE.Vector3(mx, my, mz);
    return {
      position: modelCenter.clone().add(new THREE.Vector3(cpx, cpy, cpz)),
      target: modelCenter.clone().add(new THREE.Vector3(ctx, cty, ctz)),
      viewName: capturedState.viewName || "custom"
    };
  }
  if (!Array.isArray(capturedState.cameraPosition) || !Array.isArray(capturedState.cameraTarget)) {
    return null;
  }
  const [px = 0, py = 0, pz = 0] = capturedState.cameraPosition;
  const [tx = 0, ty = 0, tz = 0] = capturedState.cameraTarget;
  return {
    position: new THREE.Vector3(px, py, pz),
    target: new THREE.Vector3(tx, ty, tz),
    viewName: capturedState.viewName || "custom"
  };
}

function blendCameraStates(startState, endState, progress, THREE) {
  if (!startState || !endState) {
    return endState || startState || null;
  }
  const t = clamp(Number(progress) || 0, 0, 1);
  return {
    position: startState.position.clone().lerp(endState.position, t),
    target: startState.target.clone().lerp(endState.target, t),
    viewName: t >= 1 ? (endState.viewName || "custom") : (startState.viewName || "custom")
  };
}

function applyCameraState(instance, cameraState, saveAsDefault = false) {
  if (!cameraState) {
    return;
  }
  const { THREE, camera, controls } = instance;
  camera.up.copy(getViewUpVector(THREE, cameraState.viewName || "iso"));
  camera.position.copy(cameraState.position);
  controls.target.copy(cameraState.target);
  camera.updateProjectionMatrix();
  controls.update();
  controls.saveState?.();
  if (saveAsDefault) {
    instance.defaultCameraState = {
      position: camera.position.clone(),
      target: controls.target.clone(),
      viewName: cameraState.viewName || "custom"
    };
  }
}

function applyCapturedCameraState(instance, capturedState) {
  let cameraState = null;
  if (capturedState && Array.isArray(capturedState.cameraOffset) && Array.isArray(capturedState.targetOffset)) {
    const modelCenter = getRootGroupCenter(instance);
    const [cpx = 0, cpy = 0, cpz = 0] = capturedState.cameraOffset;
    const [ctx = 0, cty = 0, ctz = 0] = capturedState.targetOffset;
    cameraState = {
      position: modelCenter.clone().add(new instance.THREE.Vector3(cpx, cpy, cpz)),
      target: modelCenter.clone().add(new instance.THREE.Vector3(ctx, cty, ctz)),
      viewName: capturedState.viewName || "custom"
    };
  } else {
    cameraState = buildCameraStateFromCaptured(capturedState, instance.THREE);
  }
  if (!cameraState) {
    return;
  }
  applyCameraState(instance, cameraState, true);
}

function resetCamera(instance, geometry) {
  setCameraMode(instance, "auto");
  instance.controls.reset?.();
  const presentationMode = getPresentationMode(instance, geometry);
  if (presentationMode === "flat") {
    applyPresetView(instance, geometry, "top");
    setCameraMode(instance, "auto");
  } else {
    fitCamera(instance, geometry);
  }
  renderFrame(instance);
}

function applyPresetView(instance, geometry, viewName) {
  instance.controls.reset?.();
  const box = new instance.THREE.Box3().setFromObject(instance.rootGroup);
  if (box.isEmpty()) {
    return;
  }
  const size = box.getSize(new instance.THREE.Vector3());
  const presentationMode = getPresentationMode(instance, geometry);
  const cameraConfig = (geometry.custom3d && geometry.custom3d.camera) || {};
  const preset = getCameraPreset(cameraConfig, viewName);
  const resolvedViewName = resolveArtworkAwareViewName(geometry, viewName);
  if (presentationMode !== "flat" && hasCapturedCameraState(preset)) {
    applyCapturedCameraState(instance, preset);
    setCameraMode(instance, "preset");
    instance.activeViewName = viewName || preset.viewName || "custom";
    instance.lastCameraFrameSignature = JSON.stringify([
      instance.lastGeometryKey || "",
      presentationMode,
      instance.activeViewName,
      roundNumber(size.x),
      roundNumber(size.y),
      roundNumber(size.z)
    ]);
    renderFrame(instance);
    return;
  }
  applyCameraView(instance, {
    box,
    size,
    center: box.getCenter(new instance.THREE.Vector3()),
    viewName: resolvedViewName,
    padding: resolveCameraPadding(cameraConfig, presentationMode),
    targetOffset: resolveCameraTargetOffset(cameraConfig, presentationMode, size),
    saveAsDefault: false
  });
  setCameraMode(instance, "preset");
  instance.lastCameraFrameSignature = JSON.stringify([
    instance.lastGeometryKey || "",
    presentationMode,
    viewName,
    roundNumber(size.x),
    roundNumber(size.y),
    roundNumber(size.z)
  ]);
  renderFrame(instance);
}

function renderFrame(instance) {
  instance.controls.update();
  instance.lightHolder.quaternion.copy(instance.camera.quaternion);
  instance.renderer.render(instance.scene, instance.camera);
  if (instance.gizmo) {
    instance.gizmo.render();
  }
}

function getRootGroupCenter(instance) {
  const box = getVisibleObjectBox(instance.THREE, instance.rootGroup);
  if (box.isEmpty()) {
    return new instance.THREE.Vector3(0, 0, 0);
  }
  return box.getCenter(new instance.THREE.Vector3());
}

function setCanvasSize(instance) {
  const rect = instance.container.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  instance.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  instance.renderer.setSize(width, height, false);
  instance.camera.aspect = width / height;
  instance.camera.updateProjectionMatrix();
  instance.controls.handleResize?.();
  if (instance.gizmo) {
    instance.gizmo.update();
  }
  if (instance.isCameraLocked) {
    renderFrame(instance);
    return;
  }
  if (instance.lastGeometry && instance.cameraMode === "preset" && instance.activeViewName && instance.activeViewName !== "custom") {
    applyPresetView(instance, instance.lastGeometry, instance.activeViewName);
  } else if (instance.lastGeometry && instance.cameraMode !== "manual") {
    fitCamera(instance, instance.lastGeometry);
  }
  renderFrame(instance);
}

// Preview bootstrap
async function createPreview(container) {
  const runtime = await loadRuntime();
  const { THREE, OrbitControls, ViewportGizmo } = runtime;
  THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

  const canvas = document.createElement("canvas");
  canvas.className = "model-canvas";
  container.innerHTML = "";
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 1, 5000);
  camera.up.set(0, 0, 1);

  const ambient = new THREE.AmbientLight(0xfff6ea, 0.9);
  const hemiLight = new THREE.HemisphereLight(0xbfe3ff, 0x0b1017, 0.8);
  scene.add(ambient, hemiLight);

  const shadowFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(2200, 2200),
    new THREE.ShadowMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22
    })
  );
  shadowFloor.position.z = -0.35;
  shadowFloor.receiveShadow = true;
  scene.add(shadowFloor);

  const grid = new THREE.GridHelper(1200, 24, 0x365266, 0x243341);
  grid.rotation.x = Math.PI / 2;
  grid.position.z = 0;
  scene.add(grid);

  const lightHolder = new THREE.Group();
  const keyLight = new THREE.DirectionalLight(0xfff1cf, 2.6);
  keyLight.position.set(220, -280, 320);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 40;
  keyLight.shadow.camera.far = 1200;
  keyLight.shadow.camera.left = -420;
  keyLight.shadow.camera.right = 420;
  keyLight.shadow.camera.top = 420;
  keyLight.shadow.camera.bottom = -420;
  keyLight.shadow.bias = -0.0005;

  const fillLight = new THREE.DirectionalLight(0x9ed8ff, 1.15);
  fillLight.position.set(-320, 260, 220);

  const rimLight = new THREE.PointLight(0xffb27a, 700, 0, 2);
  rimLight.position.set(0, 340, 180);

  lightHolder.add(keyLight, fillLight, rimLight);
  scene.add(lightHolder);

  const controls = new OrbitControls(camera, canvas);
  controls.minDistance = 24;
  controls.maxDistance = 2400;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 1.1;
  controls.panSpeed = 0.8;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = false;

  canvas.addEventListener("contextmenu", event => {
    event.preventDefault();
  });

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const gizmo = new ViewportGizmo(camera, renderer, {
    type: "sphere",
    container,
    placement: "top-right",
    size: 96,
    offset: {
      top: 12,
      right: 12,
      bottom: 12,
      left: 12
    },
    animated: true,
    speed: 1.35,
    background: {
      enabled: false
    },
    font: {
      family: "\"Olivetti Lettera 22 Typewriter\", monospace",
      weight: 700
    },
    x: {
      label: "X",
      color: 0xff4d6d,
      opacity: 1,
      scale: 0.78,
      line: true,
      labelColor: 0x2b0d13,
      hover: { color: 0xff6f89, labelColor: 0x1b0508, opacity: 1, scale: 0.82 }
    },
    y: {
      label: "Y",
      color: 0xb7f000,
      opacity: 1,
      scale: 0.78,
      line: true,
      labelColor: 0x223100,
      hover: { color: 0xc8ff1a, labelColor: 0x182400, opacity: 1, scale: 0.82 }
    },
    z: {
      label: "Z",
      color: 0x4b9cff,
      opacity: 1,
      scale: 0.78,
      line: true,
      labelColor: 0x061a35,
      hover: { color: 0x72b4ff, labelColor: 0x041020, opacity: 1, scale: 0.82 }
    },
    nx: {
      label: "",
      color: 0xff4d6d,
      opacity: 0.45,
      scale: 0.46,
      hover: { color: 0xff6f89, opacity: 0.9, scale: 0.52 }
    },
    ny: {
      label: "",
      color: 0xb7f000,
      opacity: 0.45,
      scale: 0.46,
      hover: { color: 0xc8ff1a, opacity: 0.9, scale: 0.52 }
    },
    nz: {
      label: "",
      color: 0x4b9cff,
      opacity: 0.45,
      scale: 0.46,
      hover: { color: 0x72b4ff, opacity: 0.9, scale: 0.52 }
    }
  });
  gizmo.attachControls(controls);

  const viewOverlay = document.createElement("div");
  viewOverlay.className = "model-view-overlay";
  viewOverlay.innerHTML = `
    <div class="model-view-actions">
      <button type="button" class="model-view-chip" data-view="top" aria-pressed="false">Top</button>
      <button type="button" class="model-view-chip" data-view="iso" aria-pressed="false">Iso</button>
      <div class="model-view-zoom" aria-label="3D zoom controls" role="group">
        <button type="button" class="model-view-chip model-view-chip-icon" data-action="zoom-in" aria-label="Zoom in">+</button>
        <button type="button" class="model-view-chip model-view-chip-icon" data-action="zoom-out" aria-label="Zoom out">−</button>
      </div>
      <button type="button" class="model-view-chip" data-action="fit">Fit</button>
      <label class="model-view-lock">
        <input type="checkbox" data-action="lock-camera">
        <span>Lock camera</span>
      </label>
    </div>
  `;
  container.appendChild(viewOverlay);

  const instance = {
    runtime,
    THREE,
    container,
    canvas,
    renderer,
    scene,
    camera,
    controls,
    lightHolder,
    rootGroup,
    gizmo,
    meshTree: null,
    singleSheetMesh: null,
    foldPivots: [],
    panelDeformers: [],
    panelNodes: new Map(),
    panelMeshes: new Map(),
    foldHighlights: new Map(),
    cameraMode: "auto",
    isCameraLocked: false,
    activeViewName: "iso",
    lastCameraFrameSignature: "",
    lastCameraFitSignature: "",
    defaultCameraState: null,
    lastGeometry: null,
    viewButtons: new Map(),
    isApplyingProgrammaticView: false,
    resizeObserver: null,
    animationFrame: 0,
    pointerDown: null,
    onPanelSelect: null
  };

  const markUserCameraPose = () => {
    setManualCameraMode(instance);
  };
  canvas.addEventListener("pointerdown", event => {
    markUserCameraPose();
    instance.pointerDown = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener("wheel", markUserCameraPose, { passive: true });
  canvas.addEventListener("touchstart", markUserCameraPose, { passive: true });
  controls.addEventListener("start", () => {
    if (!instance.isApplyingProgrammaticView) {
      markUserCameraPose();
    }
  });

  viewOverlay.querySelectorAll("[data-view]").forEach(button => {
    const viewName = button.dataset.view;
    instance.viewButtons.set(viewName, button);
    button.addEventListener("click", () => {
      if (!instance.lastGeometry) {
        return;
      }
      instance.isApplyingProgrammaticView = true;
      try {
        applyPresetView(instance, instance.lastGeometry, viewName);
      } finally {
        instance.isApplyingProgrammaticView = false;
      }
    });
  });
  viewOverlay.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      if (!instance.lastGeometry) {
        return;
      }
      const action = button.dataset.action;
      instance.isApplyingProgrammaticView = true;
      try {
        if (action === "fit") {
          resetCamera(instance, instance.lastGeometry);
          return;
        }
        if (action === "zoom-in") {
          stepCameraZoom(instance, "in");
          return;
        }
        if (action === "zoom-out") {
          stepCameraZoom(instance, "out");
        }
      } finally {
        instance.isApplyingProgrammaticView = false;
      }
    });
  });
  const lockCameraInput = viewOverlay.querySelector('[data-action="lock-camera"]');
  if (lockCameraInput) {
    lockCameraInput.addEventListener("change", () => {
      instance.isCameraLocked = !!lockCameraInput.checked;
      if (instance.isCameraLocked) {
        setManualCameraMode(instance, { preserveView: true });
      }
    });
  }
  canvas.addEventListener("pointerup", event => {
    if (!instance.pointerDown || !instance.onPanelSelect) {
      return;
    }
    const dx = event.clientX - instance.pointerDown.x;
    const dy = event.clientY - instance.pointerDown.y;
    instance.pointerDown = null;
    if ((dx * dx) + (dy * dy) > 36) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(rootGroup, true);
    const hit = hits.find(entry => findPanelIdFromHit(entry));
    if (!hit) {
      return;
    }
    const panelId = findPanelIdFromHit(hit);
    if (panelId) {
      instance.onPanelSelect(panelId);
    }
  });

  const tick = () => {
    renderFrame(instance);
    instance.animationFrame = requestAnimationFrame(tick);
  };
  tick();

  setCanvasSize(instance);
  const resizeObserver = new ResizeObserver(() => setCanvasSize(instance));
  resizeObserver.observe(container);
  instance.resizeObserver = resizeObserver;

  return instance;
}

export async function init3dPreview(container) {
  if (!container.__threePreview) {
    container.__threePreview = createPreview(container);
  }
  return container.__threePreview;
}

export async function update3dPreview(container, geometry, options = {}) {
  const instance = await init3dPreview(container);
  instance.lastGeometry = geometry;
  if (instance.meshTree) {
    instance.meshTree.visible = true;
  }
  const paperStock = options.paperStock || "kraft";
  const textureScale = clamp(Number(options.textureScale) || 1, 0.25, 4);
  const thickness = Math.max(0, Number(options.thickness) || 0);
  const fold = clamp(typeof options.fold === "number" ? options.fold : 1, 0, 1);
  instance.lastFold = fold;
  const foldAnglesDeg = options.foldAnglesDeg || {};
  const foldProgressById = options.foldProgressById || null;
  const foldSequence = options.foldSequence
    || geometry.foldSequence
    || ((geometry.folds || []).map(foldItem => foldItem.id).filter(Boolean));
  const foldLocks = options.foldLocks || {};
  const modelRotationSteps = Array.isArray(options.modelRotationSteps) ? options.modelRotationSteps : [];
  const objectMoveSteps = Array.isArray(options.objectMoveSteps) ? options.objectMoveSteps : [];
  const orbitYawDeg = Number(options.orbitYawDeg) || 0;
  const useAutoAssembleCamera = options.autoAssembleCamera === true;
  const preserveCurrentCamera = options.preserveCurrentCamera === true;
  const cameraConfig = (geometry.custom3d && geometry.custom3d.camera) || {};
  const useCapturedAssembledCamera = options.useCapturedAssembledCamera === true;
  const assembledDefaults = useCapturedAssembledCamera
    ? (options.assembledDefaults || resolveCameraState(cameraConfig, "folded") || geometry.assembledDefaults || null)
    : null;
  const cameraTransition = useCapturedAssembledCamera ? (options.cameraTransition || null) : null;
  const hasAssembledCameraBase = useCapturedAssembledCamera && fold >= 0.999 && !!assembledDefaults;
  instance.onPanelSelect = typeof options.onPanelSelect === "function" ? options.onPanelSelect : null;
  const geometrySignature = geometry.__cacheKey
    || geometry.cacheKey
    || JSON.stringify({
      pageW: geometry.pageW,
      pageH: geometry.pageH,
      outlineD: geometry.outlineD || "",
      slitD: geometry.slitD || "",
      lockCutoutD: geometry.lockCutoutD || "",
      flatSheetD: geometry.flatSheetD || "",
      panels: (geometry.panels || []).map(panel => ({
        id: panel.id,
        d: panel.d || "",
        meshD: panel.meshD || "",
        parent: panel.parent || "",
        angle: panel.angle,
        label: panel.label || "",
        displayLabel: panel.displayLabel || "",
        labelPosition: panel.labelPosition || null,
        labelFontSize: panel.labelFontSize || null,
        labelRotationDeg: panel.labelRotationDeg || 0,
        labelMaxWidth: panel.labelMaxWidth || 0,
        labelLineHeight: panel.labelLineHeight || 1.2
      })),
      sideArtwork: buildSideArtworkKey(geometry.sideArtwork || null),
      templateFeatures: geometry.templateFeatures || null,
      templateSettings: geometry.templateSettings || null,
      activeArtworkSide: geometry.activeArtworkSide || "outside",
      activeSideArtwork: buildArtworkSignature(geometry.activeSideArtwork || null),
      folds: (geometry.folds || []).map(fold => ({
        id: fold.id,
        d: fold.d || "",
        angleDeg: fold.angleDeg
      }))
    });
  const geometryKey = JSON.stringify([
    options.templateId || "template",
    paperStock,
    textureScale,
    thickness,
    geometrySignature,
    buildSideArtworkKey(geometry.sideArtwork || null),
    geometry.activeArtworkSide || "outside",
    buildArtworkSignature(geometry.activeSideArtwork || null)
  ]);

  instance.floorPanelId = geometry.floorPanel || geometry.rootPanel || (geometry.rootPanels && geometry.rootPanels[0]) || "bottom";
  instance.floorFoldId = geometry.floorFoldId || "";
  instance.floorPanelsByObject = geometry.floorPanelsByObject || null;

  if (instance.lastGeometryKey !== geometryKey) {
    if (instance.meshTree) {
      instance.rootGroup.remove(instance.meshTree);
      disposeGroup(instance.meshTree);
    }
    if (instance.singleSheetMesh) {
      instance.rootGroup.remove(instance.singleSheetMesh);
      disposeGroup(instance.singleSheetMesh);
    }

    const tree = buildPanelTree(instance.runtime, geometry, paperStock, thickness, textureScale);
    instance.meshTree = tree.root;
    instance.singleSheetMesh = createSingleSheetMesh(instance.runtime, geometry, paperStock, textureScale);
    instance.foldPivots = tree.pivots;
    instance.foldPivotMap = tree.pivotMap;
    instance.panelDeformers = tree.deformers;
    instance.panelNodes = tree.panelNodes;
    instance.panelMeshes = tree.panelMeshes;
    instance.foldHighlights = tree.foldHighlights;
    instance.flatSheet = tree.flatSheet;
    instance.customModelKind = tree.customModelKind || "";
    instance.customControllers = tree.customControllers || null;
    instance.lastThickness = thickness;
    instance.rootGroup.add(instance.meshTree);
    if (instance.singleSheetMesh) {
      instance.rootGroup.add(instance.singleSheetMesh);
    }
    instance.lastGeometryKey = geometryKey;
    if (instance.cameraMode === "manual") {
      instance.cameraMode = "auto";
      instance.activeViewName = fold <= 0.001 ? "top" : "iso";
    } else if (fold <= 0.001 && instance.cameraMode === "auto") {
      instance.activeViewName = "top";
    }
  }
  applyFold(instance.THREE, instance.foldPivots, instance.panelDeformers, fold, foldAnglesDeg, foldSequence, foldLocks, geometry.custom3d || null, foldProgressById);
  updatePanelSelection(instance, geometry, options.selectedPanelId || "", options.selectedFoldId || "", options.showLabels);
  const useFlatSheetView = getPresentationMode(instance, geometry) === "flat";
  if (instance.meshTree) {
    instance.meshTree.visible = !useFlatSheetView;
  }
  if (instance.singleSheetMesh) {
    instance.singleSheetMesh.visible = useFlatSheetView;
    syncPanelMaterialState(instance.singleSheetMesh, options.showLabels);
  }
  if (instance.flatSheet) {
    instance.flatSheet.visible = false;
  }
  alignModelToFloor(instance);
  applyObjectMoves(instance, geometry, objectMoveSteps);
  applyModelRotationSteps(instance, geometry, modelRotationSteps);
  const presentationMode = getPresentationMode(instance, geometry);
  const hasCameraTransition = !!(cameraTransition && cameraTransition.start && cameraTransition.end);
  const autoAssembleCameraBox = useAutoAssembleCamera
    ? getVisibleObjectBox(instance.THREE, instance.rootGroup)
    : null;
  const autoAssembleCameraSize = autoAssembleCameraBox && !autoAssembleCameraBox.isEmpty()
    ? autoAssembleCameraBox.getSize(new instance.THREE.Vector3())
    : null;
  const autoAssembleCameraBase = useAutoAssembleCamera
    ? buildCameraViewState(instance, {
        box: autoAssembleCameraBox,
        size: autoAssembleCameraSize,
        viewName: "front",
        viewVector: new instance.THREE.Vector3(0.34, 1, 0.28),
        padding: 1.2,
        targetOffset: { x: 0, y: 0, z: 0.08 * Math.max(1, autoAssembleCameraSize?.z || 1) }
      })
    : null;
  const transformCameraSignature = [
    modelRotationSteps.map(step => [step.objectId || "__all__", step.axis, roundNumber(step.angleDeg)]),
    objectMoveSteps.map(step => [step.objectId || "__default__", step.axis, roundNumber(step.distanceMm)])
  ];
  const cameraFrameSignature = JSON.stringify([
    instance.lastGeometryKey,
    presentationMode,
    instance.cameraMode,
    instance.activeViewName,
    hasCameraTransition,
    useAutoAssembleCamera,
    transformCameraSignature
  ]);
  const sceneFrameSignature = JSON.stringify([
    instance.lastGeometryKey,
    presentationMode,
    instance.cameraMode,
    instance.activeViewName,
    hasCameraTransition,
    modelRotationSteps.map(step => [step.objectId || "__all__", step.axis, roundNumber(step.angleDeg)]),
    objectMoveSteps.map(step => [step.objectId, step.axis, roundNumber(step.distanceMm)]),
    roundNumber(orbitYawDeg)
  ]);
  if (hasCameraTransition) {
    if (!instance.isCameraLocked) {
      const startState = buildCameraStateFromCaptured(cameraTransition.start, instance.THREE);
      const endState = autoAssembleCameraBase || buildCameraStateFromCaptured(cameraTransition.end, instance.THREE);
      const blendedState = blendCameraStates(startState, endState, cameraTransition.progress, instance.THREE);
      applyCameraState(instance, blendedState, true);
      applyCameraOrbit(instance, orbitYawDeg, blendedState);
    }
  } else if (preserveCurrentCamera) {
    setManualCameraMode(instance);
  } else if (autoAssembleCameraBase) {
    if (!instance.isCameraLocked) {
      applyCameraState(instance, autoAssembleCameraBase, true);
    }
  } else if (instance.cameraMode === "preset") {
    if (!instance.isCameraLocked && cameraFrameSignature !== instance.lastCameraFitSignature) {
      instance.isApplyingProgrammaticView = true;
      try {
        applyPresetView(instance, geometry, instance.activeViewName || "iso");
      } finally {
        instance.isApplyingProgrammaticView = false;
      }
    }
  } else if (instance.cameraMode === "auto") {
    if (!instance.isCameraLocked && cameraFrameSignature !== instance.lastCameraFitSignature) {
      if (hasAssembledCameraBase) {
        fitCamera(instance, geometry);
        applyCapturedCameraState(instance, assembledDefaults);
      } else {
        fitCamera(instance, geometry);
      }
    }
  } else if (!instance.isCameraLocked && hasAssembledCameraBase && cameraFrameSignature !== instance.lastCameraFitSignature) {
    applyCapturedCameraState(instance, assembledDefaults);
  } else {
    // keep current manual camera state
  }
  const assembledCameraBase = hasAssembledCameraBase
    ? buildCameraStateFromCaptured(assembledDefaults, instance.THREE)
    : null;
  if (instance.isCameraLocked) {
    // preserve current locked camera pose
  } else if (hasCameraTransition) {
    // already applied above
  } else if (autoAssembleCameraBase) {
    applyCameraOrbit(instance, orbitYawDeg, autoAssembleCameraBase);
  } else if (assembledCameraBase) {
    applyCameraOrbit(instance, orbitYawDeg, assembledCameraBase);
  } else {
    applyCameraOrbit(instance, orbitYawDeg);
  }
  instance.lastCameraFitSignature = cameraFrameSignature;
  instance.lastCameraFrameSignature = sceneFrameSignature;
  renderFrame(instance);
}

export async function get3dPreviewSnapshot(container) {
  const instance = await init3dPreview(container);
  const modelCenter = getRootGroupCenter(instance);
  const cameraOffset = instance.camera.position.clone().sub(modelCenter);
  const targetOffset = instance.controls.target.clone().sub(modelCenter);
  return {
    cameraPosition: [
      roundNumber(instance.camera.position.x),
      roundNumber(instance.camera.position.y),
      roundNumber(instance.camera.position.z)
    ],
    cameraTarget: [
      roundNumber(instance.controls.target.x),
      roundNumber(instance.controls.target.y),
      roundNumber(instance.controls.target.z)
    ],
    modelCenter: [
      roundNumber(modelCenter.x),
      roundNumber(modelCenter.y),
      roundNumber(modelCenter.z)
    ],
    cameraOffset: [
      roundNumber(cameraOffset.x),
      roundNumber(cameraOffset.y),
      roundNumber(cameraOffset.z)
    ],
    targetOffset: [
      roundNumber(targetOffset.x),
      roundNumber(targetOffset.y),
      roundNumber(targetOffset.z)
    ],
    viewName: instance.activeViewName || "custom",
    cameraMode: instance.cameraMode || "manual"
  };
}

export {};
