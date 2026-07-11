import { buildCirclePath, createProceduralFlatTemplate } from "./flat-common.js";

function buildGuideFeature(id, visibleDiameter, bleedDiameter, rimTextDiameter, roundingStartDiameter) {
  const printDiameter = bleedDiameter;
  const center = printDiameter / 2;
  const visibleRadius = visibleDiameter / 2;
  const rimTextRadius = rimTextDiameter / 2;
  const roundingStartRadius = roundingStartDiameter / 2;

  return {
    settingsKey: "buttonGuides",
    surfaceRect: {
      x: 0,
      y: 0,
      width: printDiameter,
      height: printDiameter
    },
    sides: {
      outside: [
        {
          id: `${id}-bleed-guide`,
          enabled: true,
          x: 0,
          y: 0,
          width: printDiameter,
          height: printDiameter,
          baseWidth: printDiameter,
          baseHeight: printDiameter,
          elements: [
            {
              type: "path",
              d: buildCirclePath(center, center, printDiameter / 2),
              fill: "none",
              stroke: "#111827",
              strokeWidth: 0.25,
              opacity: 0.72
            }
          ]
        },
        {
          id: `${id}-rim-text-guide`,
          enabled: true,
          x: 0,
          y: 0,
          width: printDiameter,
          height: printDiameter,
          baseWidth: printDiameter,
          baseHeight: printDiameter,
          elements: [
            {
              type: "path",
              d: buildCirclePath(center, center, rimTextRadius),
              fill: "none",
              stroke: "#dc2626",
              strokeWidth: 0.22,
              opacity: 0.62
            }
          ]
        },
        {
          id: `${id}-visible-guide`,
          enabled: true,
          x: 0,
          y: 0,
          width: printDiameter,
          height: printDiameter,
          baseWidth: printDiameter,
          baseHeight: printDiameter,
          elements: [
            {
              type: "path",
              d: buildCirclePath(center, center, visibleRadius),
              fill: "none",
              stroke: "#0891b2",
              strokeWidth: 0.25,
              opacity: 0.65
            }
          ]
        },
        {
          id: `${id}-rounding-start-guide`,
          enabled: true,
          x: 0,
          y: 0,
          width: printDiameter,
          height: printDiameter,
          baseWidth: printDiameter,
          baseHeight: printDiameter,
          elements: [
            {
              type: "path",
              d: buildCirclePath(center, center, roundingStartRadius),
              fill: "none",
              stroke: "#0f766e",
              strokeWidth: 0.2,
              opacity: 0.55
            }
          ]
        }
      ],
      inside: []
    }
  };
}

function createButtonTemplate({ id, name, visibleDiameter, bleedDiameter, rimTextDiameter, roundingStartDiameter }) {
  const bleed = (bleedDiameter - visibleDiameter) / 2;

  return createProceduralFlatTemplate({
    id,
    name,
    title: `Flat Template: ${name}`,
    summary: `${visibleDiameter} mm round button artwork template matched to the supplied dailybuttons guide file.`,
    icon: "icon-button",
    familyId: "buttons",
    familyName: "Buttons",
    familyIcon: "icon-button",
    variantLabel: name,
    artworkSides: ["outside"],
    defaults: {
      D: visibleDiameter,
      B: bleed,
      E: rimTextDiameter,
      R: roundingStartDiameter
    },
    fieldGroups: {
      primary: [
        { key: "D", label: "Visible Diameter", kind: "length", min: 1, step: 0.1 },
        { key: "B", label: "Bleed / Overfill", kind: "length", min: 0, step: 0.1 }
      ],
      optional: [
        { key: "E", label: "Max Rim Text Diameter", kind: "length", min: 1, step: 0.1 },
        { key: "R", label: "Rounding Starts Diameter", kind: "length", min: 1, step: 0.1 }
      ]
    },
    buildShape(params) {
      const buttonDiameter = Math.max(1, Number(params.D) || visibleDiameter);
      const buttonBleed = Math.max(0, Number(params.B) || 0);
      const printDiameter = buttonDiameter + buttonBleed * 2;
      const edgeTextDiameter = Math.max(1, Math.min(printDiameter, Number(params.E) || rimTextDiameter));
      const roundingDiameter = Math.max(1, Math.min(buttonDiameter, Number(params.R) || roundingStartDiameter));
      const padding = 12;
      const center = padding + printDiameter / 2;

      return {
        width: printDiameter,
        height: printDiameter,
        padding,
        surfaceRect: {
          x: padding,
          y: padding,
          width: printDiameter,
          height: printDiameter
        },
        templateFeatures: buildGuideFeature(id, buttonDiameter, printDiameter, edgeTextDiameter, roundingDiameter),
        outerD: buildCirclePath(center, center, printDiameter / 2),
        labelX: printDiameter / 2,
        labelY: printDiameter / 2
      };
    }
  });
}

export default [
  createButtonTemplate({
    id: "flat-button-25mm",
    name: "25 mm Button",
    visibleDiameter: 25,
    bleedDiameter: 33,
    rimTextDiameter: 27.512,
    roundingStartDiameter: 23.369
  }),
  createButtonTemplate({
    id: "flat-button-31mm",
    name: "31 mm Button",
    visibleDiameter: 31,
    bleedDiameter: 41,
    rimTextDiameter: 36.002,
    roundingStartDiameter: 29.503
  })
];
