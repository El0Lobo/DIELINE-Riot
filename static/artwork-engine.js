const artworkImageCache = new Map();
const tintedSvgDataUrlCache = new Map();
const artworkTextSvgCache = new Map();
const DEFAULT_ARTWORK_DOODLE_COLOR = "#ffbe3b";

function decodeDataUrlText(dataUrl) {
  const value = String(dataUrl || "");
  const match = value.match(/^data:([^,]*?),(.*)$/i);
  if (!match) {
    return "";
  }
  const [, meta, payload] = match;
  if (/;base64/i.test(meta)) {
    try {
      return atob(payload);
    } catch {
      return "";
    }
  }
  try {
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
}

function encodeSvgDataUrl(svgText) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shouldRetintSvgPaintValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "none" || normalized === "transparent") {
    return false;
  }
  return !normalized.startsWith("url(");
}

function retintSvgStyle(styleText, color) {
  const declarations = String(styleText || "")
    .split(";")
    .map(part => part.trim())
    .filter(Boolean);
  let touched = false;
  const next = declarations.map(declaration => {
    const separatorIndex = declaration.indexOf(":");
    if (separatorIndex < 0) {
      return declaration;
    }
    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
    const value = declaration.slice(separatorIndex + 1).trim();
    if ((property === "fill" || property === "stroke") && shouldRetintSvgPaintValue(value)) {
      touched = true;
      return `${property}:${color}`;
    }
    return declaration;
  });
  return { style: next.join("; "), touched };
}

function retintSvgMarkup(svgText, color) {
  if (!svgText || typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
    return svgText;
  }
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() === "parsererror") {
    return svgText;
  }

  const paintableTags = new Set(["path", "rect", "circle", "ellipse", "polygon", "polyline", "line", "text", "tspan"]);
  for (const element of Array.from(root.querySelectorAll("*"))) {
    const tag = element.tagName.toLowerCase();
    if (!paintableTags.has(tag)) {
      continue;
    }
    let hasFill = false;
    let hasStroke = false;
    if (element.hasAttribute("fill")) {
      hasFill = true;
      if (shouldRetintSvgPaintValue(element.getAttribute("fill"))) {
        element.setAttribute("fill", color);
      }
    }
    if (element.hasAttribute("stroke")) {
      hasStroke = true;
      if (shouldRetintSvgPaintValue(element.getAttribute("stroke"))) {
        element.setAttribute("stroke", color);
      }
    }
    if (element.hasAttribute("style")) {
      const result = retintSvgStyle(element.getAttribute("style"), color);
      if (result.touched) {
        element.setAttribute("style", result.style);
      }
    }
    if (!hasFill && !hasStroke && !element.hasAttribute("style")) {
      element.setAttribute("fill", color);
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

export function isSvgArtworkDataUrl(dataUrl) {
  const value = String(dataUrl || "").trim();
  if (!value.startsWith("data:")) {
    return false;
  }
  if (/^data:image\/svg\+xml/i.test(value)) {
    return true;
  }
  return /^\s*<svg[\s>]/i.test(decodeDataUrlText(value));
}

export function getRenderableArtworkImageDataUrl(image) {
  if (!image || !image.dataUrl) {
    return "";
  }
  const tintColor = String(image.tintColor || "").trim();
  if (!tintColor || !isSvgArtworkDataUrl(image.dataUrl)) {
    return String(image.dataUrl || "");
  }
  const cacheKey = `${image.dataUrl}::${tintColor.toLowerCase()}`;
  if (tintedSvgDataUrlCache.has(cacheKey)) {
    return tintedSvgDataUrlCache.get(cacheKey);
  }
  const tinted = encodeSvgDataUrl(retintSvgMarkup(decodeDataUrlText(image.dataUrl), tintColor));
  tintedSvgDataUrlCache.set(cacheKey, tinted);
  return tinted;
}

function normalizeArtworkImages(artwork) {
  if (!artwork) {
    return [];
  }
  const rawImages = Array.isArray(artwork.images) && artwork.images.length
    ? artwork.images
    : (artwork.image ? [artwork.image] : []);
  return rawImages
    .filter(image => image && image.dataUrl)
    .map((image, index) => ({
      id: String(image.id || `image-${index + 1}`),
      dataUrl: String(image.dataUrl || ""),
      x: Number(image.x) || 0,
      y: Number(image.y) || 0,
      width: Number(image.width) || 0,
      height: Number(image.height) || 0,
      opacity: Number.isFinite(Number(image.opacity)) ? Number(image.opacity) : 1,
      tintColor: String(image.tintColor || ""),
      rotationDeg: Number(image.rotationDeg) || 0,
      preserveAspectRatio: String(image.preserveAspectRatio || "xMidYMid meet")
    }));
}

function normalizeArtworkDoodles(artwork) {
  return Array.isArray(artwork?.doodles)
    ? artwork.doodles
      .filter(doodle => doodle && doodle.d)
      .map((doodle, index) => ({
        id: String(doodle.id || `doodle-${index + 1}`),
        d: String(doodle.d || ""),
        stroke: String(doodle.stroke || DEFAULT_ARTWORK_DOODLE_COLOR),
        strokeWidth: Number(doodle.strokeWidth) || 0,
        opacity: Number(doodle.opacity) || 0
      }))
    : [];
}

function getArtworkLayerEntries(artwork) {
  if (!artwork) {
    return [];
  }
  const images = normalizeArtworkImages(artwork);
  const doodles = normalizeArtworkDoodles(artwork);
  const imageMap = new Map(images.map(image => [image.id, image]));
  const doodleMap = new Map(doodles.map(doodle => [doodle.id, doodle]));
  const validIds = ["text-layer", ...images.map(image => image.id), ...doodles.map(doodle => doodle.id)];
  const layerOrder = Array.isArray(artwork.layerOrder) ? artwork.layerOrder.map(id => String(id || "")) : validIds;
  const entries = [];
  for (const id of layerOrder) {
    if (id === "text-layer") {
      entries.push({ id, type: "text" });
    } else if (imageMap.has(id)) {
      entries.push({ id, type: "image", image: imageMap.get(id) });
    } else if (doodleMap.has(id)) {
      entries.push({ id, type: "doodle", doodle: doodleMap.get(id) });
    }
  }
  return entries;
}

export function buildArtworkSignature(artwork) {
  if (!artwork) {
    return null;
  }
  const images = normalizeArtworkImages(artwork);
  return {
    text: String(artwork.text || ""),
    x: Number(artwork.x) || 0,
    y: Number(artwork.y) || 0,
    fontSize: Number(artwork.fontSize) || 0,
    rotationDeg: Number(artwork.rotationDeg) || 0,
    maxWidth: Number(artwork.maxWidth) || 0,
    lineHeight: Number(artwork.lineHeight) || 0,
    fontFamily: String(artwork.fontFamily || ""),
    fontWeight: String(artwork.fontWeight || ""),
    fontStyle: String(artwork.fontStyle || ""),
    fill: String(artwork.fill || ""),
    fillColor: String(artwork.fillColor || ""),
    fillOpacity: Number(artwork.fillOpacity) || 0,
    textOpacity: Number.isFinite(Number(artwork.textOpacity)) ? Number(artwork.textOpacity) : 1,
    activeLayerId: String(artwork.activeLayerId || ""),
    layerOrder: Array.isArray(artwork.layerOrder) ? artwork.layerOrder.map(id => String(id || "")) : [],
    activeImageId: String(artwork.activeImageId || ""),
    images,
    doodleOpacity: Number.isFinite(Number(artwork.doodleOpacity)) ? Number(artwork.doodleOpacity) : 1,
    doodles: normalizeArtworkDoodles(artwork).map(doodle => ({
      id: String(doodle.id || ""),
      d: String(doodle.d || ""),
      stroke: String(doodle.stroke || ""),
      strokeWidth: Number(doodle.strokeWidth) || 0,
      opacity: Number(doodle.opacity) || 0
    }))
  };
}

function wrapCanvasTextLines(context, text, maxWidth = 0) {
  const hardLines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const width = Number(maxWidth) || 0;
  if (!(width > 0)) {
    return hardLines;
  }
  const wrapped = [];
  for (const hardLine of hardLines) {
    const words = hardLine.split(/\s+/).filter(Boolean);
    if (!words.length) {
      wrapped.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > width) {
        wrapped.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    wrapped.push(line);
  }
  return wrapped;
}

function wrapArtworkTextLines(text, maxWidth = 0, fontSize = 10) {
  const hardLines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const width = Number(maxWidth) || 0;
  if (!(width > 0)) {
    return hardLines;
  }
  const maxChars = Math.max(1, Math.floor(width / Math.max(1, Number(fontSize) || 10) / 0.58));
  const lines = [];
  for (const hardLine of hardLines) {
    const words = hardLine.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    lines.push(current);
  }
  return lines.length ? lines : [""];
}

function buildArtworkTextSvgDataUrl(artwork, bounds) {
  const x = Number(artwork.x) || 0;
  const y = Number(artwork.y) || 0;
  const fontSize = Math.max(0.1, Number(artwork.fontSize) || 10);
  const maxWidth = Math.max(0, Number(artwork.maxWidth) || 0);
  const rotationDeg = Number(artwork.rotationDeg) || 0;
  const lineHeight = Math.max(0.5, Number(artwork.lineHeight) || 1.2);
  const lines = wrapArtworkTextLines(String(artwork.text || ""), maxWidth, fontSize);
  const lineStep = fontSize * lineHeight;
  const firstY = y - ((lines.length - 1) * lineStep) / 2;
  const transform = rotationDeg ? ` transform="rotate(${roundNumber(rotationDeg)} ${roundNumber(x)} ${roundNumber(y)})"` : "";
  const tspans = lines
    .map((line, index) => `<tspan x="${roundNumber(x)}" y="${roundNumber(firstY + (index * lineStep))}">${escapeXml(line)}</tspan>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${roundNumber(bounds.minX)} ${roundNumber(bounds.minY)} ${roundNumber(bounds.width)} ${roundNumber(bounds.height)}" width="${roundNumber(bounds.width)}" height="${roundNumber(bounds.height)}"><text x="${roundNumber(x)}" y="${roundNumber(y)}" text-anchor="middle" dominant-baseline="middle" font-family="${escapeXml(artwork.fontFamily || "Arial, sans-serif")}" font-weight="${escapeXml(artwork.fontWeight || "700")}" font-style="${escapeXml(artwork.fontStyle || "normal")}" font-size="${roundNumber(fontSize)}" fill="${escapeXml(artwork.fill || "#ffffff")}" fill-opacity="${roundNumber(Math.max(0, Math.min(1, Number(artwork.textOpacity) || 1)))}"${transform}>${tspans}</text></svg>`;
  return encodeSvgDataUrl(svg);
}

function roundNumber(value) {
  return Number.parseFloat(Number(value || 0).toFixed(3));
}

export function drawUvArtworkOnContext(context, artwork, bounds, width, height, clipPathD = "", onAsyncReady = null) {
  if (!artwork) {
    return;
  }

  const scaleX = width / Math.max(bounds.width, 0.0001);
  const scaleY = height / Math.max(bounds.height, 0.0001);
  const clipPath = typeof Path2D !== "undefined" && clipPathD ? new Path2D(clipPathD) : null;

  context.save();
  context.scale(scaleX, scaleY);
  context.translate(-bounds.minX, -bounds.minY);

  if (clipPath) {
    context.save();
    context.clip(clipPath);
  }

  if (artwork.fillColor && Number(artwork.fillOpacity ?? 1) > 0) {
    context.globalAlpha = Math.max(0, Math.min(1, Number(artwork.fillOpacity) || 0));
    context.fillStyle = artwork.fillColor;
    if (clipPath) {
      context.fill(clipPath);
    } else {
      context.fillRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
    }
    context.globalAlpha = 1;
  }

  for (const layer of getArtworkLayerEntries(artwork)) {
    if (layer.type === "image" && layer.image) {
      const imageConfig = layer.image;
      const image = getArtworkImage(getRenderableArtworkImageDataUrl(imageConfig), onAsyncReady);
      if (!image) {
        continue;
      }
      context.globalAlpha = Math.max(0, Math.min(1, Number(imageConfig.opacity) || 1));
      const widthMm = Number(imageConfig.width) || 0;
      const heightMm = Number(imageConfig.height) || 0;
      const centerX = (Number(imageConfig.x) || 0) + (widthMm / 2);
      const centerY = (Number(imageConfig.y) || 0) + (heightMm / 2);
      context.save();
      context.translate(centerX, centerY);
      context.rotate(((Number(imageConfig.rotationDeg) || 0) * Math.PI) / 180);
      drawArtworkImageWithAspect(
        context,
        image,
        -(widthMm / 2),
        -(heightMm / 2),
        widthMm,
        heightMm,
        imageConfig.preserveAspectRatio || "xMidYMid meet"
      );
      context.restore();
      context.globalAlpha = 1;
      continue;
    }
    if (layer.type === "text" && String(artwork.text || "").trim()) {
      const cacheKey = JSON.stringify({
        text: String(artwork.text || ""),
        x: Number(artwork.x) || 0,
        y: Number(artwork.y) || 0,
        fontSize: Number(artwork.fontSize) || 0,
        maxWidth: Number(artwork.maxWidth) || 0,
        rotationDeg: Number(artwork.rotationDeg) || 0,
        lineHeight: Number(artwork.lineHeight) || 0,
        fontFamily: String(artwork.fontFamily || ""),
        fontWeight: String(artwork.fontWeight || ""),
        fontStyle: String(artwork.fontStyle || ""),
        fill: String(artwork.fill || ""),
        textOpacity: Number.isFinite(Number(artwork.textOpacity)) ? Number(artwork.textOpacity) : 1,
        bounds
      });
      let dataUrl = artworkTextSvgCache.get(cacheKey);
      if (!dataUrl) {
        dataUrl = buildArtworkTextSvgDataUrl(artwork, bounds);
        artworkTextSvgCache.set(cacheKey, dataUrl);
        if (artworkTextSvgCache.size > 80) {
          artworkTextSvgCache.delete(artworkTextSvgCache.keys().next().value);
        }
      }
      const image = getArtworkImage(dataUrl, onAsyncReady);
      if (image) {
        context.drawImage(image, bounds.minX, bounds.minY, bounds.width, bounds.height);
      }
      continue;
    }
    if (layer.type === "doodle" && layer.doodle && typeof Path2D !== "undefined") {
      context.strokeStyle = layer.doodle.stroke || DEFAULT_ARTWORK_DOODLE_COLOR;
      context.lineWidth = Math.max(0.1, Number(layer.doodle.strokeWidth) || 2);
      context.globalAlpha = Math.max(0, Math.min(1, Number(layer.doodle.opacity) || 1));
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke(new Path2D(layer.doodle.d));
      context.globalAlpha = 1;
    }
  }

  if (clipPath) {
    context.restore();
  }
  context.restore();
}

function getArtworkImage(dataUrl, onReady) {
  if (!dataUrl) {
    return null;
  }
  const cached = artworkImageCache.get(dataUrl);
  if (cached) {
    if (cached.complete && cached.naturalWidth > 0 && cached.naturalHeight > 0) {
      return cached;
    }
    if (typeof onReady === "function") {
      cached.addEventListener("load", onReady, { once: true });
    }
    return null;
  }
  const image = new Image();
  image.crossOrigin = "anonymous";
  if (typeof onReady === "function") {
    image.addEventListener("load", onReady, { once: true });
  }
  image.addEventListener("error", () => {
    artworkImageCache.delete(dataUrl);
  }, { once: true });
  image.src = dataUrl;
  artworkImageCache.set(dataUrl, image);
  return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0 ? image : null;
}

function drawArtworkImageWithAspect(context, image, x, y, width, height, preserveAspectRatio = "xMidYMid meet") {
  const targetWidth = Math.max(0, Number(width) || 0);
  const targetHeight = Math.max(0, Number(height) || 0);
  if (!(targetWidth > 0) || !(targetHeight > 0)) {
    return;
  }

  const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
  const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);
  const raw = String(preserveAspectRatio || "xMidYMid meet").trim();
  if (!raw || raw === "none") {
    context.drawImage(image, x, y, targetWidth, targetHeight);
    return;
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  const align = parts[0] || "xMidYMid";
  const mode = parts[1] || "meet";
  const scale = mode === "slice"
    ? Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight)
    : Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);

  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;

  let offsetX = 0;
  let offsetY = 0;

  if (align.startsWith("xMid")) {
    offsetX = (targetWidth - drawWidth) * 0.5;
  } else if (align.startsWith("xMax")) {
    offsetX = targetWidth - drawWidth;
  }

  if (align.endsWith("YMid")) {
    offsetY = (targetHeight - drawHeight) * 0.5;
  } else if (align.endsWith("YMax")) {
    offsetY = targetHeight - drawHeight;
  }

  if (mode === "slice") {
    context.save();
    context.beginPath();
    context.rect(x, y, targetWidth, targetHeight);
    context.clip();
    context.drawImage(image, x + offsetX, y + offsetY, drawWidth, drawHeight);
    context.restore();
    return;
  }

  context.drawImage(image, x + offsetX, y + offsetY, drawWidth, drawHeight);
}
