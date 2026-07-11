import {
  buildMetadataJson,
  createProceduralTemplateBuilder,
  createTemplateBuilder,
  renderStructuredSvg,
  roundValue
} from "./helpers.js";

function makeFlatPanel(id, label) {
  return {
    id,
    displayName: label,
    standardName: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    type: "panel",
    isGlue: false,
    foldParent: "",
    foldId: "",
    foldAngleDeg: 0,
    labelLayout: {
      text: label,
      fontSize: 6,
      rotationDeg: 0,
      maxWidth: 0,
      lineHeight: 1.2
    }
  };
}

function createFlatTemplate({
  id,
  name,
  title,
  summary,
  structuredFile,
  panelId,
  cutPathIds,
  icon = "icon-flat",
  familyId = "flat",
  familyName = "Flat",
  familyIcon = icon,
  variantLabel = name
}) {
  return createTemplateBuilder({
    id,
    name,
    icon,
    title,
    summary,
    defaults: {},
    fieldGroups: {
      primary: [],
      optional: []
    },
    panels: [makeFlatPanel(panelId, name)],
    structuredFile,
    familyId,
    familyName,
    familyIcon,
    variantLabel,
    includePanelIds: [panelId],
    includeCutPathIds: cutPathIds
  }, {
    id
  });
}

export {
  createFlatTemplate
};

function buildRoundedRectPath(x, y, width, height, radius = 0) {
  const maxRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  const right = x + width;
  const bottom = y + height;
  if (!maxRadius) {
    return `M${roundValue(x)},${roundValue(y)}H${roundValue(right)}V${roundValue(bottom)}H${roundValue(x)}Z`;
  }
  return [
    `M${roundValue(x + maxRadius)},${roundValue(y)}`,
    `H${roundValue(right - maxRadius)}`,
    `A${roundValue(maxRadius)},${roundValue(maxRadius)},0,0,1,${roundValue(right)},${roundValue(y + maxRadius)}`,
    `V${roundValue(bottom - maxRadius)}`,
    `A${roundValue(maxRadius)},${roundValue(maxRadius)},0,0,1,${roundValue(right - maxRadius)},${roundValue(bottom)}`,
    `H${roundValue(x + maxRadius)}`,
    `A${roundValue(maxRadius)},${roundValue(maxRadius)},0,0,1,${roundValue(x)},${roundValue(bottom - maxRadius)}`,
    `V${roundValue(y + maxRadius)}`,
    `A${roundValue(maxRadius)},${roundValue(maxRadius)},0,0,1,${roundValue(x + maxRadius)},${roundValue(y)}`,
    "Z"
  ].join(" ");
}

function buildCirclePath(cx, cy, radius) {
  const safeRadius = Math.max(0, radius);
  return [
    `M${roundValue(cx - safeRadius)},${roundValue(cy)}`,
    `A${roundValue(safeRadius)},${roundValue(safeRadius)},0,1,0,${roundValue(cx + safeRadius)},${roundValue(cy)}`,
    `A${roundValue(safeRadius)},${roundValue(safeRadius)},0,1,0,${roundValue(cx - safeRadius)},${roundValue(cy)}`,
    "Z"
  ].join(" ");
}

function buildEuroSlotPath(cx, cy, width, height) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const left = cx - safeWidth / 2;
  const right = cx + safeWidth / 2;
  const top = cy - safeHeight / 2;
  const bottom = cy + safeHeight / 2;
  const arcRadius = Math.min(safeHeight / 2, safeWidth / 3);
  const neckInset = Math.max(0.4, safeWidth * 0.12);
  return [
    `M${roundValue(left + arcRadius)},${roundValue(top)}`,
    `H${roundValue(cx - neckInset)}`,
    `A${roundValue(arcRadius)},${roundValue(arcRadius)},0,0,1,${roundValue(cx + neckInset)},${roundValue(top)}`,
    `H${roundValue(right - arcRadius)}`,
    `A${roundValue(arcRadius)},${roundValue(arcRadius)},0,0,1,${roundValue(right)},${roundValue(top + arcRadius)}`,
    `V${roundValue(bottom - arcRadius)}`,
    `A${roundValue(arcRadius)},${roundValue(arcRadius)},0,0,1,${roundValue(right - arcRadius)},${roundValue(bottom)}`,
    `H${roundValue(left + arcRadius)}`,
    `A${roundValue(arcRadius)},${roundValue(arcRadius)},0,0,1,${roundValue(left)},${roundValue(bottom - arcRadius)}`,
    `V${roundValue(top + arcRadius)}`,
    `A${roundValue(arcRadius)},${roundValue(arcRadius)},0,0,1,${roundValue(left + arcRadius)},${roundValue(top)}`,
    "Z"
  ].join(" ");
}

function createProceduralFlatTemplate({
  id,
  name,
  title,
  summary,
  panelId = `${id}-panel`,
  icon = "icon-flat",
  familyId = "flat",
  familyName = "Flat",
  familyIcon = icon,
  variantLabel = name,
  defaults,
  fieldGroups,
  buildShape,
  defaultPaperStock,
  defaultMaterialThickness,
  featureControls = null,
  getTemplateRefinementDefaults = null,
  templateRefinementDefaults = null,
  custom3d = null,
  assembledDefaults = null,
  assembledFrontPanel = "",
  defaultAssemblySteps = []
}) {
  const panelDefinition = makeFlatPanel(panelId, name);
  const definition = {
    id,
    name,
    icon,
    title,
    summary,
    defaults: { ...defaults },
    buildShape,
    defaultPaperStock,
    defaultMaterialThickness,
    featureControls,
    getTemplateRefinementDefaults,
    templateRefinementDefaults,
    fieldGroups: {
      primary: (fieldGroups?.primary || []).map(field => ({ ...field })),
      optional: (fieldGroups?.optional || []).map(field => ({ ...field }))
    },
    familyId,
    familyName,
    familyIcon,
    variantLabel,
    panels: [panelDefinition]
  };

  return createProceduralTemplateBuilder(definition, (params, template) => {
    const shape = buildShape(params || template.defaults || {});
    const padding = Math.max(12, Number(shape.padding) || 0);
    const surfaceRect = shape.surfaceRect || {
      x: padding,
      y: padding,
      width: Number(shape.width) || 0,
      height: Number(shape.height) || 0
    };
    const pageW = roundValue((Number(shape.width) || 0) + padding * 2);
    const pageH = roundValue((Number(shape.height) || 0) + padding * 2);
    const outerD = String(shape.outerD || "");
    const cutoutD = String(shape.cutoutD || "");
    const labelX = roundValue(padding + (Number(shape.labelX) || (Number(shape.width) || 0) / 2));
    const labelY = roundValue(padding + (Number(shape.labelY) || (Number(shape.height) || 0) / 2));
    const geometry = {
      pageW,
      pageH,
      templateFeatures: shape.templateFeatures ? JSON.parse(JSON.stringify(shape.templateFeatures)) : null,
      outlineD: outerD,
      slitD: "",
      lockCutoutD: "",
      cutPaths: [
        { id: `${id}-outline`, d: outerD, type: "cut" },
        ...(cutoutD ? [{ id: `${id}-cutout`, d: cutoutD, type: "cut" }] : [])
      ],
      glueAreas: [],
      folds: [],
      foldSequence: [],
      rootPanel: panelId,
      rootPanels: [panelId],
      floorPanel: panelId,
      assembledFrontPanel: assembledFrontPanel || panelId,
      floorPanelsByObject: {},
      assembledDefaults: assembledDefaults || null,
      defaultAssemblySteps: Array.isArray(defaultAssemblySteps) ? defaultAssemblySteps.map(step => ({ ...step })) : [],
      custom3d: custom3d || {
        camera: {
          flatView: "top",
          foldedView: "top",
          flatPadding: 1.08,
          foldedPadding: 1.08
        }
      },
      panels: [
        {
          id: panelId,
          standardName: panelDefinition.standardName,
          displayName: name,
          label: name,
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
          },
          custom3d: {
            ...(shape.panelCustom3d || {}),
            surfaceRect: {
              x: roundValue(surfaceRect.x),
              y: roundValue(surfaceRect.y),
              width: roundValue(surfaceRect.width),
              height: roundValue(surfaceRect.height)
            }
          }
        }
      ]
    };
    const metadataJson = buildMetadataJson(
      template,
      geometry,
      {
        length: Number(shape.width) || 0,
        width: Number(shape.height) || 0,
        height: 0,
        overlap: 0
      },
      {
        materialThickness: Number(params.T) || 0,
        roundedCornersRadius: Number(shape.radius) || 0,
        holeDiameter: Number(shape.holeDiameter) || 0,
        slotWidth: Number(shape.slotWidth) || 0,
        slotHeight: Number(shape.slotHeight) || 0
      },
      `static/template-builders/${id}.js`
    );
    metadataJson.custom3d = geometry.custom3d;
    return {
      svgText: renderStructuredSvg(template, geometry, metadataJson),
      metadata: metadataJson,
      geometry
    };
  });
}

export {
  buildRoundedRectPath,
  buildCirclePath,
  buildEuroSlotPath,
  createProceduralFlatTemplate
};
