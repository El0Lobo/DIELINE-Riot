import {
  buildRoundedRectPath,
  buildEuroSlotPath,
  createProceduralFlatTemplate
} from "./flat-common.js";

export default createProceduralFlatTemplate({
  id: "flat-hang-tab-euro-slot",
  name: "Hang Tab",
  title: "Flat Template: Hang Tab With Euro Slot",
  summary: "Single-piece hang tab template with euro-slot cutout preserved in export.",
  icon: "icon-hangtab",
  familyId: "hang-tabs",
  familyName: "Hang Tabs",
  familyIcon: "icon-hangtab",
  assembledFrontPanel: "flat-hang-tab-euro-slot-panel",
  assembledDefaults: {
    viewName: "custom",
    modelCenter: [0, 0, 60.75],
    cameraPosition: [139.235, 240.439, 168.575],
    cameraTarget: [20.41, 11.015, 75.757],
    cameraOffset: [139.235, 240.439, 107.825],
    targetOffset: [20.41, 11.015, 15.007],
    modelRotationSteps: [
      { objectId: "__all__", axis: "x", angleDeg: -90 }
    ]
  },
  defaultAssemblySteps: [
    { type: "model-rotation", objectId: "__all__", axis: "x", angleDeg: -90, easing: "ease-in-out" }
  ],
  defaults: {
    W: 75,
    H: 120,
    R: 8,
    SLOTW: 24,
    SLOTH: 6,
    SLOTY: 13
  },
  fieldGroups: {
    primary: [
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 1, step: 0.1 }
    ],
    optional: [
      { key: "R", label: "Corner Radius", kind: "length", min: 0, step: 0.1 },
      { key: "SLOTW", label: "Slot Width", kind: "length", min: 1, step: 0.1 },
      { key: "SLOTH", label: "Slot Height", kind: "length", min: 1, step: 0.1 },
      { key: "SLOTY", label: "Slot Offset Y", kind: "length", min: 0, step: 0.1 }
    ]
  },
  buildShape(params) {
    const width = Math.max(1, Number(params.W) || 75);
    const height = Math.max(1, Number(params.H) || 120);
    const radius = Math.max(0, Number(params.R) || 8);
    const slotWidth = Math.max(1, Number(params.SLOTW) || 24);
    const slotHeight = Math.max(1, Number(params.SLOTH) || 6);
    const slotY = Math.max(slotHeight / 2, Number(params.SLOTY) || 13);
    const padding = 12;
    return {
      width,
      height,
      radius,
      slotWidth,
      slotHeight,
      padding,
      outerD: buildRoundedRectPath(padding, padding, width, height, radius),
      cutoutD: buildEuroSlotPath(padding + width / 2, padding + slotY, slotWidth, slotHeight),
      labelX: width / 2,
      labelY: height / 2
    };
  }
});
