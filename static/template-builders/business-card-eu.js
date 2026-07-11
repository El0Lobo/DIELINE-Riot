import { createProceduralFlatTemplate, buildRoundedRectPath } from "./flat-common.js";

export default createProceduralFlatTemplate({
  id: "flat-business-card-eu",
  name: "Business Card EU",
  title: "Flat Template: Business Card EU",
  summary: "Single-piece flat business card template with clipped artwork export.",
  icon: "icon-businesscard",
  familyId: "business-cards",
  familyName: "Business Cards",
  familyIcon: "icon-businesscard",
  defaults: {
    W: 85,
    H: 55
  },
  fieldGroups: {
    primary: [
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 1, step: 0.1 }
    ],
    optional: []
  },
  buildShape(params) {
    const width = Math.max(1, Number(params.W) || 85);
    const height = Math.max(1, Number(params.H) || 55);
    const padding = 12;
    return {
      width,
      height,
      padding,
      outerD: buildRoundedRectPath(padding, padding, width, height, 0),
      labelX: width / 2,
      labelY: height / 2
    };
  }
});
