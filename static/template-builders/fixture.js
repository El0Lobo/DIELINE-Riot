import { createTemplateBuilder } from "./helpers.js";

function createFixtureTemplateBuilder(definition, sourceFile, svgText) {
  return createTemplateBuilder(definition, {
    id: definition.id,
    mode: "fixture",
    sourceFile,
    svgText: svgText || ""
  });
}

export {
  createFixtureTemplateBuilder
};
