import mailer from "./mailer.js";
import cardbox from "./cardbox.js";
import envelope from "./envelope.js";
import shallowbox from "./shallowbox.js";
import milkcarton from "./milkcarton.js";
import giftbox from "./giftbox.js";
import boxWithLid from "./box-with-lid.js";
import pillowpack from "./pillowpack.js";
import matchbox from "./matchbox.js";
import counterdisplay from "./counterdisplay.js";
import businessCardEu from "./business-card-eu.js";
import creditCard from "./credit-card.js";
import hangTab from "./hang-tab.js";
import playingCardSizeForms from "./playing-card-size-forms.js";
import tagsLayered from "./tags-layered.js";
import buttons from "./buttons.js";

const TEMPLATE_BUILDERS = [
  mailer,
  cardbox,
  envelope,
  shallowbox,
  milkcarton,
  giftbox,
  boxWithLid,
  pillowpack,
  matchbox,
  counterdisplay,
  businessCardEu,
  creditCard,
  hangTab,
  ...buttons,
  ...playingCardSizeForms,
  ...tagsLayered
];

const TEMPLATE_BUILDER_MAP = new Map(TEMPLATE_BUILDERS.map(builder => [builder.id, builder]));
const TEMPLATE_SPECS = TEMPLATE_BUILDERS.map(template => ({
  id: template.id,
  name: template.name,
  icon: template.icon,
  title: template.title,
  summary: template.summary,
  defaults: { ...template.defaults },
  featureControls: template.featureControls ? JSON.parse(JSON.stringify(template.featureControls)) : null,
  fieldGroups: {
    primary: (template.fieldGroups?.primary || []).map(field => ({ ...field })),
    optional: (template.fieldGroups?.optional || []).map(field => ({ ...field }))
  },
  familyId: template.familyId || template.id,
  familyName: template.familyName || template.name,
  familyIcon: template.familyIcon || template.icon,
  variantLabel: template.variantLabel || template.name,
  artworkSides: Array.isArray(template.artworkSides) ? [...template.artworkSides] : ["outside", "inside"],
  structuredFile: template.structuredFile,
  defaultFoldProgress: Number.isFinite(template.defaultFoldProgress) ? template.defaultFoldProgress : 0
}));

const PANEL_DISPLAY_NAMES = Object.fromEntries(
  TEMPLATE_BUILDERS.flatMap(template => (template.panels || []).map(panel => [panel.id, panel.displayName]))
);

function getTemplateBuilder(templateId) {
  return TEMPLATE_BUILDER_MAP.get(templateId) || null;
}

function getTemplateDefinition(templateId) {
  return getTemplateBuilder(templateId) || TEMPLATE_BUILDERS[0];
}

function getTemplateSpec(templateId) {
  const template = getTemplateDefinition(templateId);
  return TEMPLATE_SPECS.find(spec => spec.id === template.id) || TEMPLATE_SPECS[0];
}

function getTemplateDefaults(templateId) {
  return { ...getTemplateDefinition(templateId).defaults };
}

function getTemplateFieldGroups(templateId) {
  const template = getTemplateDefinition(templateId);
  return {
    primary: (template.fieldGroups?.primary || []).map(field => ({ ...field })),
    optional: (template.fieldGroups?.optional || []).map(field => ({ ...field }))
  };
}

function getTemplateFeatureControls(templateId) {
  const template = getTemplateDefinition(templateId);
  return template.featureControls ? JSON.parse(JSON.stringify(template.featureControls)) : null;
}

function getTemplateParametricRule(templateId) {
  return getTemplateDefinition(templateId).parametricRule || null;
}

export {
  PANEL_DISPLAY_NAMES,
  TEMPLATE_BUILDERS,
  TEMPLATE_SPECS,
  getTemplateBuilder,
  getTemplateDefinition,
  getTemplateDefaults,
  getTemplateFieldGroups,
  getTemplateFeatureControls,
  getTemplateParametricRule,
  getTemplateSpec
};
