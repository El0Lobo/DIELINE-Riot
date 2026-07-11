import { createProceduralFlatTemplate, buildRoundedRectPath } from "./flat-common.js";

const PLAYING_CARD_DEFAULT_ASSEMBLED_DEFAULTS = {
  viewName: "custom",
  modelCenter: [0, 0, 60.522],
  cameraPosition: [72.269, -253.153, 182.085],
  cameraTarget: [-17.731, 8.628, 34.841],
  cameraOffset: [72.269, -253.153, 121.563],
  targetOffset: [-17.731, 8.628, -25.681],
  modelRotationSteps: [
    { objectId: "__all__", axis: "x", angleDeg: -90 }
  ]
};

const PLAYING_CARD_DEFAULT_ASSEMBLY_STEPS = [
  { type: "model-rotation", objectId: "__all__", axis: "x", angleDeg: -90, easing: "ease-in-out", syncWithPrevious: false }
];

const PLAYING_CARD_DEFAULT_CUSTOM_3D = {
  camera: {
    flatView: "top",
    foldedView: "custom",
    flatPadding: 1.08,
    foldedPadding: 1.08,
    foldedState: PLAYING_CARD_DEFAULT_ASSEMBLED_DEFAULTS
  }
};

export default [
  createProceduralFlatTemplate({
    id: "flat-playing-card-tarot",
    name: "Tarot Card",
    title: "Flat Template: Tarot Card",
    summary: "Tarot-size rounded card format extracted from the flat card comparison sheet.",
    icon: "icon-cards",
    familyId: "playing-cards",
    familyName: "Playing Cards",
    familyIcon: "icon-cards",
    variantLabel: "Tarot",
    custom3d: PLAYING_CARD_DEFAULT_CUSTOM_3D,
    assembledDefaults: PLAYING_CARD_DEFAULT_ASSEMBLED_DEFAULTS,
    defaultAssemblySteps: PLAYING_CARD_DEFAULT_ASSEMBLY_STEPS,
    defaults: { W: 70, H: 120, R: 6 },
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
      const width = Math.max(1, Number(params.W) || 70);
      const height = Math.max(1, Number(params.H) || 120);
      const radius = Math.max(0, Number(params.R) || 6);
      const padding = 12;
      return {
        width,
        height,
        radius,
        padding,
        outerD: buildRoundedRectPath(padding, padding, width, height, radius),
        labelX: width / 2,
        labelY: height / 2
      };
    }
  }),
  createProceduralFlatTemplate({
    id: "flat-playing-card-poker",
    name: "Poker Card",
    title: "Flat Template: Poker Card",
    summary: "Poker-size rounded card format extracted from the flat card comparison sheet.",
    icon: "icon-cards",
    familyId: "playing-cards",
    familyName: "Playing Cards",
    familyIcon: "icon-cards",
    variantLabel: "Poker",
    custom3d: PLAYING_CARD_DEFAULT_CUSTOM_3D,
    assembledDefaults: PLAYING_CARD_DEFAULT_ASSEMBLED_DEFAULTS,
    defaultAssemblySteps: PLAYING_CARD_DEFAULT_ASSEMBLY_STEPS,
    defaults: { W: 63.5, H: 88.9, R: 3.5 },
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
      const width = Math.max(1, Number(params.W) || 63.5);
      const height = Math.max(1, Number(params.H) || 88.9);
      const radius = Math.max(0, Number(params.R) || 3.5);
      const padding = 12;
      return {
        width,
        height,
        radius,
        padding,
        outerD: buildRoundedRectPath(padding, padding, width, height, radius),
        labelX: width / 2,
        labelY: height / 2
      };
    }
  }),
  createProceduralFlatTemplate({
    id: "flat-playing-card-bridge",
    name: "Bridge Card",
    title: "Flat Template: Bridge Card",
    summary: "Bridge-size rounded card format extracted from the flat card comparison sheet.",
    icon: "icon-cards",
    familyId: "playing-cards",
    familyName: "Playing Cards",
    familyIcon: "icon-cards",
    variantLabel: "Bridge",
    custom3d: PLAYING_CARD_DEFAULT_CUSTOM_3D,
    assembledDefaults: PLAYING_CARD_DEFAULT_ASSEMBLED_DEFAULTS,
    defaultAssemblySteps: PLAYING_CARD_DEFAULT_ASSEMBLY_STEPS,
    defaults: { W: 57.2, H: 88.9, R: 3.5 },
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
      const width = Math.max(1, Number(params.W) || 57.2);
      const height = Math.max(1, Number(params.H) || 88.9);
      const radius = Math.max(0, Number(params.R) || 3.5);
      const padding = 12;
      return {
        width,
        height,
        radius,
        padding,
        outerD: buildRoundedRectPath(padding, padding, width, height, radius),
        labelX: width / 2,
        labelY: height / 2
      };
    }
  }),
  createProceduralFlatTemplate({
    id: "flat-playing-card-mini",
    name: "Mini Card",
    title: "Flat Template: Mini Card",
    summary: "Mini rounded card format extracted from the flat card comparison sheet.",
    icon: "icon-cards",
    familyId: "playing-cards",
    familyName: "Playing Cards",
    familyIcon: "icon-cards",
    variantLabel: "Mini",
    custom3d: PLAYING_CARD_DEFAULT_CUSTOM_3D,
    assembledDefaults: PLAYING_CARD_DEFAULT_ASSEMBLED_DEFAULTS,
    defaultAssemblySteps: PLAYING_CARD_DEFAULT_ASSEMBLY_STEPS,
    defaults: { W: 44.5, H: 63.5, R: 3 },
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
      const width = Math.max(1, Number(params.W) || 44.5);
      const height = Math.max(1, Number(params.H) || 63.5);
      const radius = Math.max(0, Number(params.R) || 3);
      const padding = 12;
      return {
        width,
        height,
        radius,
        padding,
        outerD: buildRoundedRectPath(padding, padding, width, height, radius),
        labelX: width / 2,
        labelY: height / 2
      };
    }
  })
];
