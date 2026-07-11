import { createProceduralFlatTemplate, buildRoundedRectPath } from "./flat-common.js";

const CHIP_BASE_WIDTH = 12.954;
const CHIP_BASE_HEIGHT = 11.684;

const CREDIT_CARD_FEATURE_DEFS = {
  gradients: [
    {
      id: "credit-card-chip-gold",
      type: "linear",
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 1,
      stops: [
        { offset: 0, color: "#ffe27a" },
        { offset: 0.45, color: "#f2b90f" },
        { offset: 1, color: "#fff3a8" }
      ]
    },
    {
      id: "credit-card-mag-stripe",
      type: "linear",
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 1,
      stops: [
        { offset: 0, color: "#202020" },
        { offset: 0.5, color: "#000000" },
        { offset: 1, color: "#2b2b2b" }
      ]
    }
  ]
};

const CHIP_ELEMENTS = [
  {
    type: "rect",
    x: 0,
    y: 0,
    width: CHIP_BASE_WIDTH,
    height: CHIP_BASE_HEIGHT,
    rx: 1.6,
    fill: { type: "gradient", id: "credit-card-chip-gold" },
    stroke: "#6f5a1f",
    strokeWidth: 0.45
  },
  { type: "path", d: "M5.15 0.45 v10.784", fill: "none", stroke: "#7a641e", strokeWidth: 0.35 },
  { type: "path", d: "M7.80 0.45 v10.784", fill: "none", stroke: "#7a641e", strokeWidth: 0.35 },
  { type: "path", d: "M0.55 3.25 h3.1 q1.55 0 1.55 1.55 v2.05 q0 1.55-1.55 1.55 h-3.1", fill: "none", stroke: "#7a641e", strokeWidth: 0.35 },
  { type: "path", d: "M12.40 3.25 h-3.1 q-1.55 0-1.55 1.55 v2.05 q0 1.55 1.55 1.55 h3.1", fill: "none", stroke: "#7a641e", strokeWidth: 0.35 },
  { type: "path", d: "M0.6 2.1 h3.35 q1.55 0 1.55 1.45 v4.55 q0 1.45-1.55 1.45 h-3.35", fill: "none", stroke: "#b78610", strokeWidth: 0.32, opacity: 0.7 },
  { type: "path", d: "M12.35 2.1 h-3.35 q-1.55 0-1.55 1.45 v4.55 q0 1.45 1.55 1.45 h3.35", fill: "none", stroke: "#b78610", strokeWidth: 0.32, opacity: 0.7 }
];

function buildCreditCardTemplateFeatures(width, height) {
  return {
    settingsKey: "creditCard",
    surfaceRect: {
      x: 0,
      y: 0,
      width,
      height
    },
    defs: CREDIT_CARD_FEATURE_DEFS,
    sides: {
      outside: [
        {
          id: "frontChip",
          enabled: true,
          x: 8.636,
          y: 18.034,
          width: CHIP_BASE_WIDTH,
          height: CHIP_BASE_HEIGHT,
          baseWidth: CHIP_BASE_WIDTH,
          baseHeight: CHIP_BASE_HEIGHT,
          elements: CHIP_ELEMENTS.map(element => ({ ...element }))
        }
      ],
      inside: [
        {
          id: "backMagStripe",
          enabled: true,
          x: 0,
          y: 5.66,
          width,
          height: Math.min(9.52, height),
          baseWidth: 1,
          baseHeight: 1,
          elements: [
            {
              type: "rect",
              x: 0,
              y: 0,
              width: 1,
              height: 1,
              fill: { type: "gradient", id: "credit-card-mag-stripe" }
            }
          ]
        }
      ]
    }
  };
}

function buildCreditCardFeatureDefaults(params = {}) {
  const width = Math.max(1, Number(params.W) || 85.6);
  const height = Math.max(1, Number(params.H) || 54);
  const templateFeatures = buildCreditCardTemplateFeatures(width, height);
  const featureDefaults = {};
  for (const feature of [...templateFeatures.sides.outside, ...templateFeatures.sides.inside]) {
    featureDefaults[feature.id] = {
      enabled: feature.enabled !== false,
      x: feature.x,
      y: feature.y,
      width: feature.width,
      height: feature.height
    };
  }
  return { creditCard: featureDefaults };
}

const CREDIT_CARD_DEFAULT_ASSEMBLED_DEFAULTS = {
  modelRotationSteps: [
    { objectId: "__all__", axis: "x", angleDeg: -90 }
  ]
};

const CREDIT_CARD_DEFAULT_ASSEMBLY_STEPS = [
  { type: "model-rotation", objectId: "__all__", axis: "x", angleDeg: -90, easing: "ease-in-out", syncWithPrevious: false }
];

export default createProceduralFlatTemplate({
  id: "flat-credit-card",
  name: "Credit Card",
  title: "Flat Template: Credit Card",
  summary: "Rounded credit-card style flat template for single-face print work.",
  icon: "icon-creditcard",
  familyId: "credit-cards",
  familyName: "Credit Cards",
  familyIcon: "icon-creditcard",
  defaultPaperStock: "plastic010",
  defaultMaterialThickness: 0.76,
  featureControls: {
    kind: "template-features",
    settingsKey: "creditCard",
    title: "Card Features",
    description: "Shown above the artwork in SVG and 3D",
    sideLabels: {
      outside: "Front",
      inside: "Back"
    }
  },
  getTemplateRefinementDefaults: buildCreditCardFeatureDefaults,
  assembledDefaults: CREDIT_CARD_DEFAULT_ASSEMBLED_DEFAULTS,
  defaultAssemblySteps: CREDIT_CARD_DEFAULT_ASSEMBLY_STEPS,
  defaults: {
    W: 85.6,
    H: 54,
    R: 2
  },
  fieldGroups: {
    primary: [
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 1, step: 0.1 }
    ],
    optional: [
      { key: "R", label: "Corner Radius", kind: "length", min: 0, step: 0.1 }
    ]
  },
  buildShape(params) {
    const width = Math.max(1, Number(params.W) || 85.6);
    const height = Math.max(1, Number(params.H) || 54);
    const radius = Math.max(0, Number(params.R) || 2);
    const padding = 12;
    return {
      width,
      height,
      radius,
      padding,
      surfaceRect: {
        x: padding,
        y: padding,
        width,
        height
      },
      templateFeatures: buildCreditCardTemplateFeatures(width, height),
      outerD: buildRoundedRectPath(padding, padding, width, height, radius),
      labelX: width / 2,
      labelY: height / 2
    };
  }
});
