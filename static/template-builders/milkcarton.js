import { buildMetadataJson, clamp, createProceduralTemplateBuilder, linePath, renderStructuredSvg, roundValue } from "./helpers.js";

const SOURCE_DEFAULTS = {
  L: 100,
  W: 80,
  H: 140,
  ROOFH: 25,
  TOPFLAP: 18,
  R: 8,
  GLUE: 30,
  O: 20,
  T: 0.5
};

const SOURCE_X_BREAKPOINTS = [70.87, 354.33, 581.1, 864.57, 1091.34, 1176.38];
const SOURCE_Y_BREAKPOINTS = [69.87, 126.56, 239.95, 636.8, 812.11, 840.46, 863.13];
const SOURCE_PAGE = { width: 1247, height: 934 };
const SOURCE_SIDE_GLUE_AREA = "1091.34,239.95 1176.38,239.95 1176.38,840.46 1091.34,840.46";
const RAW_SOURCE_DATA = 
{
  "panels": [
    {
      "id": "roof-panel-1",
      "label": "Roof Panel 1",
      "type": "panel",
      "foldParent": "body-panel-1",
      "foldId": "page-mountain-mount-hor-2",
      "foldAngleDeg": -90,
      "path": "M 70.87 126.56 L 354.33 126.56 L 354.33 239.95 L 70.87 239.95 Z",
      "sourceId": "roof-panel-1",
      "displayLabel": "Roof Panel 1",
      "displayName": "Roof Panel 1",
      "standardName": "roof-panel-1",
      "isGlue": false,
      "labelPosition": [
        212.6,
        183
      ],
      "labelLayout": {
        "text": "Roof Panel 1",
        "x": 212.6,
        "y": 183,
        "fontSize": 4,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 70.87 126.56 L 354.33 126.56 L 354.33 239.95 L 70.87 239.95 Z",
      "pathId": "panel-roof-panel-1",
      "clipPathId": "clip-roof-panel-1",
      "objectId": ""
    },
    {
      "id": "roof-gable-panel-2-left-triangle",
      "label": "RG2-L",
      "type": "plane",
      "foldParent": "roof-gable-panel-2",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 354.33 126.56 L 467.72 126.56 L 354.33 239.95 Z",
      "sourceId": "roof-gable-panel-2-left-triangle",
      "displayLabel": "RG2-L",
      "displayName": "Roof Gable Panel 2 Left Triangle",
      "standardName": "roof-gable-panel-2-left-triangle",
      "isGlue": false,
      "labelPosition": [
        392.13,
        164.36
      ],
      "labelLayout": {
        "text": "RG2-L",
        "x": 392.13,
        "y": 164.36,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 354.33 126.56 L 467.72 126.56 L 354.33 239.95 Z",
      "pathId": "plane-roof-gable-panel-2-left-triangle",
      "clipPathId": "clip-roof-gable-panel-2-left-triangle",
      "objectId": ""
    },
    {
      "id": "roof-gable-panel-2-blue-triangle",
      "label": "RG2-C",
      "type": "plane",
      "foldParent": "roof-gable-panel-2",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 354.33 239.95 L 467.72 126.56 L 581.1 239.95 Z",
      "sourceId": "roof-gable-panel-2-blue-triangle",
      "displayLabel": "RG2-C",
      "displayName": "Roof Gable Panel 2 Center Triangle",
      "standardName": "roof-gable-panel-2-blue-triangle",
      "isGlue": false,
      "labelPosition": [
        467.72,
        202.15
      ],
      "labelLayout": {
        "text": "RG2-C",
        "x": 467.72,
        "y": 202.15,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 354.33 239.95 L 467.72 126.56 L 581.1 239.95 Z",
      "pathId": "plane-roof-gable-panel-2-blue-triangle",
      "clipPathId": "clip-roof-gable-panel-2-blue-triangle",
      "objectId": ""
    },
    {
      "id": "roof-gable-panel-2-right-triangle",
      "label": "RG2-R",
      "type": "plane",
      "foldParent": "roof-gable-panel-2",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 467.72 126.56 L 581.1 126.56 L 581.1 239.95 Z",
      "sourceId": "roof-gable-panel-2-right-triangle",
      "displayLabel": "RG2-R",
      "displayName": "Roof Gable Panel 2 Right Triangle",
      "standardName": "roof-gable-panel-2-right-triangle",
      "isGlue": false,
      "labelPosition": [
        543.29,
        164.36
      ],
      "labelLayout": {
        "text": "RG2-R",
        "x": 543.29,
        "y": 164.36,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 467.72 126.56 L 581.1 126.56 L 581.1 239.95 Z",
      "pathId": "plane-roof-gable-panel-2-right-triangle",
      "clipPathId": "clip-roof-gable-panel-2-right-triangle",
      "objectId": ""
    },
    {
      "id": "roof-panel-3",
      "label": "Roof Panel 3",
      "type": "panel",
      "foldParent": "body-panel-3",
      "foldId": "page-mountain-mount-hor-2",
      "foldAngleDeg": -90,
      "path": "M 581.1 126.56 L 670.2 73.1 A 22.68 22.68 0 0 1 681.87 69.87 L 763.8 69.87 A 22.68 22.68 0 0 1 775.46 73.1 L 864.57 126.56 L 864.57 239.95 L 581.1 239.95 Z",
      "sourceId": "roof-panel-3",
      "displayLabel": "Roof Panel 3",
      "displayName": "Roof Panel 3",
      "standardName": "roof-panel-3",
      "isGlue": false,
      "labelPosition": [
        722.84,
        159
      ],
      "labelLayout": {
        "text": "Roof Panel 3",
        "x": 722.84,
        "y": 159,
        "fontSize": 4,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 581.1 126.56 L 670.2 73.1 A 22.68 22.68 0 0 1 681.87 69.87 L 763.8 69.87 A 22.68 22.68 0 0 1 775.46 73.1 L 864.57 126.56 L 864.57 239.95 L 581.1 239.95 Z",
      "pathId": "panel-roof-panel-3",
      "clipPathId": "clip-roof-panel-3",
      "objectId": ""
    },
    {
      "id": "roof-gable-panel-4-left-triangle",
      "label": "RG4-L",
      "type": "plane",
      "foldParent": "roof-gable-panel-4",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 864.57 126.56 L 977.95 126.56 L 864.57 239.95 Z",
      "sourceId": "roof-gable-panel-4-left-triangle",
      "displayLabel": "RG4-L",
      "displayName": "Roof Gable Panel 4 Left Triangle",
      "standardName": "roof-gable-panel-4-left-triangle",
      "isGlue": false,
      "labelPosition": [
        902.36,
        164.36
      ],
      "labelLayout": {
        "text": "RG4-L",
        "x": 902.36,
        "y": 164.36,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 864.57 126.56 L 977.95 126.56 L 864.57 239.95 Z",
      "pathId": "plane-roof-gable-panel-4-left-triangle",
      "clipPathId": "clip-roof-gable-panel-4-left-triangle",
      "objectId": ""
    },
    {
      "id": "roof-gable-panel-4-blue-triangle",
      "label": "RG4-C",
      "type": "plane",
      "foldParent": "roof-gable-panel-4",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 864.57 239.95 L 977.95 126.56 L 1091.34 239.95 Z",
      "sourceId": "roof-gable-panel-4-blue-triangle",
      "displayLabel": "RG4-C",
      "displayName": "Roof Gable Panel 4 Center Triangle",
      "standardName": "roof-gable-panel-4-blue-triangle",
      "isGlue": false,
      "labelPosition": [
        977.95,
        202.15
      ],
      "labelLayout": {
        "text": "RG4-C",
        "x": 977.95,
        "y": 202.15,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 864.57 239.95 L 977.95 126.56 L 1091.34 239.95 Z",
      "pathId": "plane-roof-gable-panel-4-blue-triangle",
      "clipPathId": "clip-roof-gable-panel-4-blue-triangle",
      "objectId": ""
    },
    {
      "id": "roof-gable-panel-4-right-triangle",
      "label": "RG4-R",
      "type": "plane",
      "foldParent": "roof-gable-panel-4",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 977.95 126.56 L 1091.34 126.56 L 1091.34 239.95 Z",
      "sourceId": "roof-gable-panel-4-right-triangle",
      "displayLabel": "RG4-R",
      "displayName": "Roof Gable Panel 4 Right Triangle",
      "standardName": "roof-gable-panel-4-right-triangle",
      "isGlue": false,
      "labelPosition": [
        1053.52,
        164.36
      ],
      "labelLayout": {
        "text": "RG4-R",
        "x": 1053.52,
        "y": 164.36,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 977.95 126.56 L 1091.34 126.56 L 1091.34 239.95 Z",
      "pathId": "plane-roof-gable-panel-4-right-triangle",
      "clipPathId": "clip-roof-gable-panel-4-right-triangle",
      "objectId": ""
    },
    {
      "id": "body-panel-1",
      "label": "Body Panel 1",
      "type": "panel",
      "foldParent": null,
      "foldId": null,
      "foldAngleDeg": 0,
      "path": "M 70.87 239.95 L 354.33 239.95 L 354.33 636.8 L 70.87 636.8 Z",
      "sourceId": "body-panel-1",
      "displayLabel": "Body Panel 1",
      "displayName": "Body Panel 1",
      "standardName": "body-panel-1",
      "isGlue": false,
      "labelPosition": [
        212.6,
        438.4
      ],
      "labelLayout": {
        "text": "Body Panel 1",
        "x": 212.6,
        "y": 438.4,
        "fontSize": 4,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 70.87 239.95 L 354.33 239.95 L 354.33 636.8 L 70.87 636.8 Z",
      "pathId": "panel-body-panel-1",
      "clipPathId": "clip-body-panel-1",
      "objectId": ""
    },
    {
      "id": "body-panel-2",
      "label": "Body Panel 2",
      "type": "panel",
      "foldParent": "body-panel-1",
      "foldId": "page-mountain-mount-ver-1",
      "foldAngleDeg": 90,
      "path": "M 354.33 239.95 L 581.1 239.95 L 581.1 636.8 L 354.33 636.8 Z",
      "sourceId": "body-panel-2",
      "displayLabel": "Body Panel 2",
      "displayName": "Body Panel 2",
      "standardName": "body-panel-2",
      "isGlue": false,
      "labelPosition": [
        467.72,
        438.4
      ],
      "labelLayout": {
        "text": "Body Panel 2",
        "x": 467.72,
        "y": 438.4,
        "fontSize": 4,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 354.33 239.95 L 581.1 239.95 L 581.1 636.8 L 354.33 636.8 Z",
      "pathId": "panel-body-panel-2",
      "clipPathId": "clip-body-panel-2",
      "objectId": ""
    },
    {
      "id": "body-panel-3",
      "label": "Body Panel 3",
      "type": "panel",
      "foldParent": "body-panel-2",
      "foldId": "page-mountain-mount-ver-2",
      "foldAngleDeg": 90,
      "path": "M 581.1 239.95 L 864.57 239.95 L 864.57 636.8 L 581.1 636.8 Z",
      "sourceId": "body-panel-3",
      "displayLabel": "Body Panel 3",
      "displayName": "Body Panel 3",
      "standardName": "body-panel-3",
      "isGlue": false,
      "labelPosition": [
        722.84,
        438.4
      ],
      "labelLayout": {
        "text": "Body Panel 3",
        "x": 722.84,
        "y": 438.4,
        "fontSize": 4,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 581.1 239.95 L 864.57 239.95 L 864.57 636.8 L 581.1 636.8 Z",
      "pathId": "panel-body-panel-3",
      "clipPathId": "clip-body-panel-3",
      "objectId": ""
    },
    {
      "id": "body-panel-4",
      "label": "Body Panel 4",
      "type": "panel",
      "foldParent": "body-panel-3",
      "foldId": "page-mountain-mount-ver-3",
      "foldAngleDeg": 90,
      "path": "M 864.57 239.95 L 1091.34 239.95 L 1091.34 636.8 L 864.57 636.8 Z",
      "sourceId": "body-panel-4",
      "displayLabel": "Body Panel 4",
      "displayName": "Body Panel 4",
      "standardName": "body-panel-4",
      "isGlue": false,
      "labelPosition": [
        977.95,
        438.4
      ],
      "labelLayout": {
        "text": "Body Panel 4",
        "x": 977.95,
        "y": 438.4,
        "fontSize": 4,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 864.57 239.95 L 1091.34 239.95 L 1091.34 636.8 L 864.57 636.8 Z",
      "pathId": "panel-body-panel-4",
      "clipPathId": "clip-body-panel-4",
      "objectId": ""
    },
    {
      "id": "side-glue-flap-top",
      "label": "SG-T",
      "type": "panel",
      "foldParent": "body-panel-4",
      "foldId": "page-mountain-mount-ver-4",
      "foldAngleDeg": 0,
      "path": "M 1091.34 239.95 L 1176.38 239.95 L 1176.38 636.8 L 1091.34 636.8 Z",
      "sourceId": "side-glue-flap-top",
      "displayLabel": "SG-T",
      "displayName": "Side Glue Flap Top",
      "standardName": "side-glue-flap-top",
      "isGlue": true,
      "labelPosition": [
        1133.86,
        438.38
      ],
      "labelLayout": {
        "text": "SG-T",
        "x": 1133.86,
        "y": 438.38,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 1091.34 239.95 L 1176.38 239.95 L 1176.38 636.8 L 1091.34 636.8 Z",
      "pathId": "panel-side-glue-flap-top",
      "clipPathId": "clip-side-glue-flap-top",
      "objectId": ""
    },
    {
      "id": "side-glue-flap-middle",
      "label": "SG-M",
      "type": "panel",
      "foldParent": "side-glue-flap-top",
      "foldId": "page-mountain-mount-hor-1",
      "foldAngleDeg": 0,
      "path": "M 1091.34 636.8 L 1176.38 636.8 L 1176.38 812.11 L 1091.34 812.11 Z",
      "sourceId": "side-glue-flap-middle",
      "displayLabel": "SG-M",
      "displayName": "Side Glue Flap Middle",
      "standardName": "side-glue-flap-middle",
      "isGlue": true,
      "labelPosition": [
        1133.86,
        724.46
      ],
      "labelLayout": {
        "text": "SG-M",
        "x": 1133.86,
        "y": 724.46,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 1091.34 636.8 L 1176.38 636.8 L 1176.38 812.11 L 1091.34 812.11 Z",
      "pathId": "panel-side-glue-flap-middle",
      "clipPathId": "clip-side-glue-flap-middle",
      "objectId": ""
    },
    {
      "id": "side-glue-flap-bottom",
      "label": "SG-B",
      "type": "panel",
      "foldParent": "side-glue-flap-middle",
      "foldId": "page-valley-valley-hor-1",
      "foldAngleDeg": 0,
      "path": "M 1091.34 812.11 L 1176.38 812.11 L 1176.38 840.46 L 1091.34 840.46 Z",
      "sourceId": "side-glue-flap-bottom",
      "displayLabel": "SG-B",
      "displayName": "Side Glue Flap Bottom",
      "standardName": "side-glue-flap-bottom",
      "isGlue": true,
      "labelPosition": [
        1133.86,
        826.29
      ],
      "labelLayout": {
        "text": "SG-B",
        "x": 1133.86,
        "y": 826.29,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 1091.34 812.11 L 1176.38 812.11 L 1176.38 840.46 L 1091.34 840.46 Z",
      "pathId": "panel-side-glue-flap-bottom",
      "clipPathId": "clip-side-glue-flap-bottom",
      "objectId": ""
    },
    {
      "id": "bottom-flap-1",
      "label": "Bottom Flap 1",
      "type": "panel",
      "foldParent": "body-panel-1",
      "foldId": "page-mountain-mount-hor-1",
      "foldAngleDeg": 90,
      "path": "M 70.87 636.8 L 354.33 636.8 L 354.33 840.46 A 22.68 22.68 0 0 1 331.65 863.13 L 93.54 863.13 A 22.68 22.68 0 0 1 70.87 840.46 Z",
      "sourceId": "bottom-flap-1",
      "displayLabel": "Bottom Flap 1",
      "displayName": "Bottom Flap 1",
      "standardName": "bottom-flap-1",
      "isGlue": false,
      "labelPosition": [
        212.6,
        744
      ],
      "labelLayout": {
        "text": "Bottom Flap 1",
        "x": 212.6,
        "y": 744,
        "fontSize": 4,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 70.87 636.8 L 354.33 636.8 L 354.33 840.46 A 22.68 22.68 0 0 1 331.65 863.13 L 93.54 863.13 A 22.68 22.68 0 0 1 70.87 840.46 Z",
      "pathId": "panel-bottom-flap-1",
      "clipPathId": "clip-bottom-flap-1",
      "objectId": ""
    },
    {
      "id": "bottom-flap-1-blue-triangle",
      "label": "BF1-T",
      "type": "plane",
      "foldParent": "bottom-flap-1",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 354.33 636.8 L 354.33 812.11 L 240.94 812.11 Z",
      "sourceId": "bottom-flap-1-blue-triangle",
      "displayLabel": "BF1-T",
      "displayName": "Bottom Flap 1 Triangle",
      "standardName": "bottom-flap-1-blue-triangle",
      "isGlue": false,
      "labelPosition": [
        316.53,
        753.67
      ],
      "labelLayout": {
        "text": "BF1-T",
        "x": 316.53,
        "y": 753.67,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 354.33 636.8 L 354.33 812.11 L 240.94 812.11 Z",
      "pathId": "plane-bottom-flap-1-blue-triangle",
      "clipPathId": "clip-bottom-flap-1-blue-triangle",
      "objectId": ""
    },
    {
      "id": "bottom-flap-1-bottom-tab-left",
      "label": "BF1-BL",
      "type": "plane",
      "foldParent": "bottom-flap-1",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 70.87 812.11 L 240.94 812.11 L 240.94 863.13 L 93.54 863.13 A 22.68 22.68 0 0 1 70.87 840.46 Z",
      "sourceId": "bottom-flap-1-bottom-tab-left",
      "displayLabel": "BF1-BL",
      "displayName": "Bottom Flap 1 Bottom Tab Left",
      "standardName": "bottom-flap-1-bottom-tab-left",
      "isGlue": false,
      "labelPosition": [
        156,
        839
      ],
      "labelLayout": {
        "text": "BF1-BL",
        "x": 156,
        "y": 839,
        "fontSize": 4,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 70.87 812.11 L 240.94 812.11 L 240.94 863.13 L 93.54 863.13 A 22.68 22.68 0 0 1 70.87 840.46 Z",
      "pathId": "plane-bottom-flap-1-bottom-tab-left",
      "clipPathId": "clip-bottom-flap-1-bottom-tab-left",
      "objectId": ""
    },
    {
      "id": "bottom-flap-1-bottom-tab-right",
      "label": "BF1-BR",
      "type": "plane",
      "foldParent": "bottom-flap-1",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 240.94 812.11 L 354.33 812.11 L 354.33 840.46 A 22.68 22.68 0 0 1 331.65 863.13 L 240.94 863.13 Z",
      "sourceId": "bottom-flap-1-bottom-tab-right",
      "displayLabel": "BF1-BR",
      "displayName": "Bottom Flap 1 Bottom Tab Right",
      "standardName": "bottom-flap-1-bottom-tab-right",
      "isGlue": false,
      "labelPosition": [
        295,
        839
      ],
      "labelLayout": {
        "text": "BF1-BR",
        "x": 295,
        "y": 839,
        "fontSize": 4,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 240.94 812.11 L 354.33 812.11 L 354.33 840.46 A 22.68 22.68 0 0 1 331.65 863.13 L 240.94 863.13 Z",
      "pathId": "plane-bottom-flap-1-bottom-tab-right",
      "clipPathId": "clip-bottom-flap-1-bottom-tab-right",
      "objectId": ""
    },
    {
      "id": "bottom-gable-flap-2-left-triangle",
      "label": "BG2-L",
      "type": "plane",
      "foldParent": "bottom-gable-flap-2",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 354.33 636.8 L 354.33 812.11 L 467.72 812.11 Z",
      "sourceId": "bottom-gable-flap-2-left-triangle",
      "displayLabel": "BG2-L",
      "displayName": "Bottom Gable Flap 2 Left Triangle",
      "standardName": "bottom-gable-flap-2-left-triangle",
      "isGlue": false,
      "labelPosition": [
        392.13,
        753.67
      ],
      "labelLayout": {
        "text": "BG2-L",
        "x": 392.13,
        "y": 753.67,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 354.33 636.8 L 354.33 812.11 L 467.72 812.11 Z",
      "pathId": "plane-bottom-gable-flap-2-left-triangle",
      "clipPathId": "clip-bottom-gable-flap-2-left-triangle",
      "objectId": ""
    },
    {
      "id": "bottom-gable-flap-2-blue-triangle",
      "label": "BG2-C",
      "type": "plane",
      "foldParent": "bottom-gable-flap-2",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 354.33 636.8 L 467.72 812.11 L 581.1 636.8 Z",
      "sourceId": "bottom-gable-flap-2-blue-triangle",
      "displayLabel": "BG2-C",
      "displayName": "Bottom Gable Flap 2 Center Triangle",
      "standardName": "bottom-gable-flap-2-blue-triangle",
      "isGlue": false,
      "labelPosition": [
        467.72,
        695.24
      ],
      "labelLayout": {
        "text": "BG2-C",
        "x": 467.72,
        "y": 695.24,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 354.33 636.8 L 467.72 812.11 L 581.1 636.8 Z",
      "pathId": "plane-bottom-gable-flap-2-blue-triangle",
      "clipPathId": "clip-bottom-gable-flap-2-blue-triangle",
      "objectId": ""
    },
    {
      "id": "bottom-gable-flap-2-right-triangle",
      "label": "BG2-R",
      "type": "plane",
      "foldParent": "bottom-gable-flap-2",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 581.1 636.8 L 581.1 812.11 L 467.72 812.11 Z",
      "sourceId": "bottom-gable-flap-2-right-triangle",
      "displayLabel": "BG2-R",
      "displayName": "Bottom Gable Flap 2 Right Triangle",
      "standardName": "bottom-gable-flap-2-right-triangle",
      "isGlue": false,
      "labelPosition": [
        543.29,
        753.67
      ],
      "labelLayout": {
        "text": "BG2-R",
        "x": 543.29,
        "y": 753.67,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 581.1 636.8 L 581.1 812.11 L 467.72 812.11 Z",
      "pathId": "plane-bottom-gable-flap-2-right-triangle",
      "clipPathId": "clip-bottom-gable-flap-2-right-triangle",
      "objectId": ""
    },
    {
      "id": "bottom-gable-flap-2-bottom-tab-left",
      "label": "BG2-BL",
      "type": "plane",
      "foldParent": "bottom-gable-flap-2-blue-triangle",
      "foldId": "page-valley-valley-hor-1",
      "foldAngleDeg": 0,
      "path": "M 354.33 812.11 L 467.72 812.11 L 467.72 840.46 L 354.33 840.46 Z",
      "sourceId": "bottom-gable-flap-2-bottom-tab-left",
      "displayLabel": "BG2-BL",
      "displayName": "Bottom Gable Flap 2 Bottom Tab Left",
      "standardName": "bottom-gable-flap-2-bottom-tab-left",
      "isGlue": false,
      "labelPosition": [
        411.03,
        826.29
      ],
      "labelLayout": {
        "text": "BG2-BL",
        "x": 411.03,
        "y": 826.29,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 354.33 812.11 L 467.72 812.11 L 467.72 840.46 L 354.33 840.46 Z",
      "pathId": "plane-bottom-gable-flap-2-bottom-tab-left",
      "clipPathId": "clip-bottom-gable-flap-2-bottom-tab-left",
      "objectId": ""
    },
    {
      "id": "bottom-gable-flap-2-bottom-tab-right",
      "label": "BG2-BR",
      "type": "plane",
      "foldParent": "bottom-gable-flap-2-blue-triangle",
      "foldId": "page-valley-valley-hor-1",
      "foldAngleDeg": 0,
      "path": "M 467.72 812.11 L 581.1 812.11 L 581.1 840.46 L 467.72 840.46 Z",
      "sourceId": "bottom-gable-flap-2-bottom-tab-right",
      "displayLabel": "BG2-BR",
      "displayName": "Bottom Gable Flap 2 Bottom Tab Right",
      "standardName": "bottom-gable-flap-2-bottom-tab-right",
      "isGlue": false,
      "labelPosition": [
        524.41,
        826.29
      ],
      "labelLayout": {
        "text": "BG2-BR",
        "x": 524.41,
        "y": 826.29,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 467.72 812.11 L 581.1 812.11 L 581.1 840.46 L 467.72 840.46 Z",
      "pathId": "plane-bottom-gable-flap-2-bottom-tab-right",
      "clipPathId": "clip-bottom-gable-flap-2-bottom-tab-right",
      "objectId": ""
    },
    {
      "id": "bottom-flap-3",
      "label": "Bottom Flap 3",
      "type": "panel",
      "foldParent": "body-panel-3",
      "foldId": "page-mountain-mount-hor-1",
      "foldAngleDeg": 90,
      "path": "M 581.1 636.8 L 864.57 636.8 L 864.57 840.46 A 22.68 22.68 0 0 1 841.89 863.13 L 603.78 863.13 A 22.68 22.68 0 0 1 581.1 840.46 Z",
      "sourceId": "bottom-flap-3",
      "displayLabel": "Bottom Flap 3",
      "displayName": "Bottom Flap 3",
      "standardName": "bottom-flap-3",
      "isGlue": false,
      "labelPosition": [
        722.84,
        744
      ],
      "labelLayout": {
        "text": "Bottom Flap 3",
        "x": 722.84,
        "y": 744,
        "fontSize": 4,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 581.1 636.8 L 864.57 636.8 L 864.57 840.46 A 22.68 22.68 0 0 1 841.89 863.13 L 603.78 863.13 A 22.68 22.68 0 0 1 581.1 840.46 Z",
      "pathId": "panel-bottom-flap-3",
      "clipPathId": "clip-bottom-flap-3",
      "objectId": ""
    },
    {
      "id": "bottom-flap-3-blue-triangle",
      "label": "BF3-T",
      "type": "plane",
      "foldParent": "bottom-flap-3",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 581.1 636.8 L 694.49 812.11 L 581.1 812.11 Z",
      "sourceId": "bottom-flap-3-blue-triangle",
      "displayLabel": "BF3-T",
      "displayName": "Bottom Flap 3 Triangle",
      "standardName": "bottom-flap-3-blue-triangle",
      "isGlue": false,
      "labelPosition": [
        618.9,
        753.67
      ],
      "labelLayout": {
        "text": "BF3-T",
        "x": 618.9,
        "y": 753.67,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 581.1 636.8 L 694.49 812.11 L 581.1 812.11 Z",
      "pathId": "plane-bottom-flap-3-blue-triangle",
      "clipPathId": "clip-bottom-flap-3-blue-triangle",
      "objectId": ""
    },
    {
      "id": "bottom-flap-3-bottom-tab-left",
      "label": "BF3-BL",
      "type": "plane",
      "foldParent": "bottom-flap-3",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 581.1 812.11 L 694.49 812.11 L 694.49 863.13 L 603.78 863.13 A 22.68 22.68 0 0 1 581.1 840.46 Z",
      "sourceId": "bottom-flap-3-bottom-tab-left",
      "displayLabel": "BF3-BL",
      "displayName": "Bottom Flap 3 Bottom Tab Left",
      "standardName": "bottom-flap-3-bottom-tab-left",
      "isGlue": false,
      "labelPosition": [
        638,
        839
      ],
      "labelLayout": {
        "text": "BF3-BL",
        "x": 638,
        "y": 839,
        "fontSize": 4,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 581.1 812.11 L 694.49 812.11 L 694.49 863.13 L 603.78 863.13 A 22.68 22.68 0 0 1 581.1 840.46 Z",
      "pathId": "plane-bottom-flap-3-bottom-tab-left",
      "clipPathId": "clip-bottom-flap-3-bottom-tab-left",
      "objectId": ""
    },
    {
      "id": "bottom-flap-3-bottom-tab-right",
      "label": "BF3-BR",
      "type": "plane",
      "foldParent": "bottom-flap-3",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 694.49 812.11 L 864.57 812.11 L 864.57 840.46 A 22.68 22.68 0 0 1 841.89 863.13 L 694.49 863.13 Z",
      "sourceId": "bottom-flap-3-bottom-tab-right",
      "displayLabel": "BF3-BR",
      "displayName": "Bottom Flap 3 Bottom Tab Right",
      "standardName": "bottom-flap-3-bottom-tab-right",
      "isGlue": false,
      "labelPosition": [
        776,
        839
      ],
      "labelLayout": {
        "text": "BF3-BR",
        "x": 776,
        "y": 839,
        "fontSize": 4,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 694.49 812.11 L 864.57 812.11 L 864.57 840.46 A 22.68 22.68 0 0 1 841.89 863.13 L 694.49 863.13 Z",
      "pathId": "plane-bottom-flap-3-bottom-tab-right",
      "clipPathId": "clip-bottom-flap-3-bottom-tab-right",
      "objectId": ""
    },
    {
      "id": "bottom-gable-flap-4-left-triangle",
      "label": "BG4-L",
      "type": "plane",
      "foldParent": "bottom-gable-flap-4",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 864.57 636.8 L 864.57 812.11 L 977.95 812.11 Z",
      "sourceId": "bottom-gable-flap-4-left-triangle",
      "displayLabel": "BG4-L",
      "displayName": "Bottom Gable Flap 4 Left Triangle",
      "standardName": "bottom-gable-flap-4-left-triangle",
      "isGlue": false,
      "labelPosition": [
        902.36,
        753.67
      ],
      "labelLayout": {
        "text": "BG4-L",
        "x": 902.36,
        "y": 753.67,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 864.57 636.8 L 864.57 812.11 L 977.95 812.11 Z",
      "pathId": "plane-bottom-gable-flap-4-left-triangle",
      "clipPathId": "clip-bottom-gable-flap-4-left-triangle",
      "objectId": ""
    },
    {
      "id": "bottom-gable-flap-4-blue-triangle",
      "label": "BG4-C",
      "type": "plane",
      "foldParent": "bottom-gable-flap-4",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 864.57 636.8 L 977.95 812.11 L 1091.34 636.8 Z",
      "sourceId": "bottom-gable-flap-4-blue-triangle",
      "displayLabel": "BG4-C",
      "displayName": "Bottom Gable Flap 4 Center Triangle",
      "standardName": "bottom-gable-flap-4-blue-triangle",
      "isGlue": false,
      "labelPosition": [
        977.95,
        695.24
      ],
      "labelLayout": {
        "text": "BG4-C",
        "x": 977.95,
        "y": 695.24,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 864.57 636.8 L 977.95 812.11 L 1091.34 636.8 Z",
      "pathId": "plane-bottom-gable-flap-4-blue-triangle",
      "clipPathId": "clip-bottom-gable-flap-4-blue-triangle",
      "objectId": ""
    },
    {
      "id": "bottom-gable-flap-4-right-triangle",
      "label": "BG4-R",
      "type": "plane",
      "foldParent": "bottom-gable-flap-4",
      "foldId": "",
      "foldAngleDeg": 0,
      "path": "M 1091.34 636.8 L 1091.34 812.11 L 977.95 812.11 Z",
      "sourceId": "bottom-gable-flap-4-right-triangle",
      "displayLabel": "BG4-R",
      "displayName": "Bottom Gable Flap 4 Right Triangle",
      "standardName": "bottom-gable-flap-4-right-triangle",
      "isGlue": false,
      "labelPosition": [
        1053.52,
        753.67
      ],
      "labelLayout": {
        "text": "BG4-R",
        "x": 1053.52,
        "y": 753.67,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 1091.34 636.8 L 1091.34 812.11 L 977.95 812.11 Z",
      "pathId": "plane-bottom-gable-flap-4-right-triangle",
      "clipPathId": "clip-bottom-gable-flap-4-right-triangle",
      "objectId": ""
    },
    {
      "id": "bottom-gable-flap-4-bottom-tab-left",
      "label": "BG4-BL",
      "type": "plane",
      "foldParent": "bottom-gable-flap-4-blue-triangle",
      "foldId": "page-valley-valley-hor-1",
      "foldAngleDeg": 0,
      "path": "M 864.57 812.11 L 977.95 812.11 L 977.95 840.46 L 864.57 840.46 Z",
      "sourceId": "bottom-gable-flap-4-bottom-tab-left",
      "displayLabel": "BG4-BL",
      "displayName": "Bottom Gable Flap 4 Bottom Tab Left",
      "standardName": "bottom-gable-flap-4-bottom-tab-left",
      "isGlue": false,
      "labelPosition": [
        921.26,
        826.29
      ],
      "labelLayout": {
        "text": "BG4-BL",
        "x": 921.26,
        "y": 826.29,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 864.57 812.11 L 977.95 812.11 L 977.95 840.46 L 864.57 840.46 Z",
      "pathId": "plane-bottom-gable-flap-4-bottom-tab-left",
      "clipPathId": "clip-bottom-gable-flap-4-bottom-tab-left",
      "objectId": ""
    },
    {
      "id": "bottom-gable-flap-4-bottom-tab-right",
      "label": "BG4-BR",
      "type": "plane",
      "foldParent": "bottom-gable-flap-4-blue-triangle",
      "foldId": "page-valley-valley-hor-1",
      "foldAngleDeg": 0,
      "path": "M 977.95 812.11 L 1091.34 812.11 L 1091.34 840.46 L 977.95 840.46 Z",
      "sourceId": "bottom-gable-flap-4-bottom-tab-right",
      "displayLabel": "BG4-BR",
      "displayName": "Bottom Gable Flap 4 Bottom Tab Right",
      "standardName": "bottom-gable-flap-4-bottom-tab-right",
      "isGlue": false,
      "labelPosition": [
        1034.65,
        826.29
      ],
      "labelLayout": {
        "text": "BG4-BR",
        "x": 1034.65,
        "y": 826.29,
        "fontSize": 3,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "meshD": "M 977.95 812.11 L 1091.34 812.11 L 1091.34 840.46 L 977.95 840.46 Z",
      "pathId": "plane-bottom-gable-flap-4-bottom-tab-right",
      "clipPathId": "clip-bottom-gable-flap-4-bottom-tab-right",
      "objectId": ""
    }
  ],
  "folds": {
    "valley": [
      {
        "id": "page-valley-valley-hor-1",
        "d": "M 70.87 812.11 L 1176.38 812.11"
      },
      {
        "id": "page-valley-valley-diag-1",
        "d": "M 354.33 636.8 L 467.72 812.11 L 581.1 636.8"
      },
      {
        "id": "page-valley-valley-diag-2",
        "d": "M 864.57 636.8 L 977.95 812.11 L 1091.34 636.8"
      },
      {
        "id": "page-valley-valley-diag-3",
        "d": "M 354.33 239.95 L 467.72 126.56 L 581.1 239.95"
      },
      {
        "id": "page-valley-valley-diag-4",
        "d": "M 864.57 239.95 L 977.95 126.56 L 1091.34 239.95"
      },
      {
        "id": "page-valley-val-ver-1",
        "d": "M 240.94 863.13 L 240.94 812.11 L 354.33 636.8"
      },
      {
        "id": "page-valley-val-ver-2",
        "d": "M 694.49 863.13 L 694.49 812.11 L 581.1 636.8"
      }
    ],
    "mountain": [
      {
        "id": "page-mountain-mount-hor-1",
        "d": "M 70.87 636.8 L 1176.38 636.8"
      },
      {
        "id": "page-mountain-mount-hor-2",
        "d": "M 70.87 239.95 L 1091.34 239.95"
      },
      {
        "id": "page-mountain-mount-ver-1",
        "d": "M 354.33 840.46 L 354.33 126.56"
      },
      {
        "id": "page-mountain-mount-ver-2",
        "d": "M 581.1 840.46 L 581.1 126.56"
      },
      {
        "id": "page-mountain-mount-ver-3",
        "d": "M 864.57 840.46 L 864.57 126.56"
      },
      {
        "id": "page-mountain-mount-ver-4",
        "d": "M 1091.34 840.46 L 1091.34 239.95"
      },
      {
        "id": "page-mountain-mount-ver-5",
        "d": "M 467.72 812.11 L 467.72 840.46"
      },
      {
        "id": "page-mountain-mount-ver-6",
        "d": "M 977.95 812.11 L 977.95 840.46"
      }
    ]
  },
  "cutPaths": [
    {
      "id": "page-cut-cut-oultine",
      "d": "M 70.87 812.11 L 70.87 840.46 L 70.87 840.46 A 22.68 22.68 0 0 0 93.54 863.13 L 93.54 863.13 L 331.65 863.13 L 331.65 863.13 A 22.68 22.68 0 0 0 354.33 840.46 L 354.33 840.46 L 581.1 840.46 L 581.1 840.46 A 22.68 22.68 0 0 0 603.78 863.13 L 603.78 863.13 L 841.89 863.13 L 841.89 863.13 A 22.68 22.68 0 0 0 864.57 840.46 L 864.57 840.46 L 1176.38 840.46 L 1176.38 239.95 L 1091.34 239.95 L 1091.34 126.56 L 864.57 126.56 L 775.46 73.1 A 22.68 22.68 0 0 0 763.8 69.87 L 681.87 69.87 A 22.68 22.68 0 0 0 670.2 73.1 L 581.1 126.56 L 70.87 126.56 L 70.87 812.11"
    }
  ],
  "composites": {
    "roof-gable-panel-2": "M 354.33 126.56 L 581.1 126.56 L 581.1 239.95 L 354.33 239.95 Z",
    "roof-gable-panel-4": "M 864.57 126.56 L 1091.34 126.56 L 1091.34 239.95 L 864.57 239.95 Z",
    "bottom-gable-flap-2": "M 354.33 636.8 L 581.1 636.8 L 581.1 840.46 L 354.33 840.46 Z",
    "bottom-gable-flap-4": "M 864.57 636.8 L 1091.34 636.8 L 1091.34 840.46 L 864.57 840.46 Z",
    "side-glue-flap": "M 1091.34 239.95 L 1176.38 239.95 L 1176.38 840.46 L 1091.34 840.46 Z"
  }
}
;

const RAW_PANEL_MAP = new Map((RAW_SOURCE_DATA.panels || []).map(panel => [panel.id, panel]));

function getRawPanel(id) {
  const panel = RAW_PANEL_MAP.get(id);
  if (!panel) {
    throw new Error(`Milkcarton builder missing raw panel: ${id}`);
  }
  return panel;
}

function createPanelFromRaw(id, overrides = {}) {
  const panel = getRawPanel(id);
  const labelLayout = panel.labelLayout || {};
  const panelId = overrides.id || id;
  const labelText = Object.prototype.hasOwnProperty.call(overrides, "labelText")
    ? overrides.labelText
    : (labelLayout.text || panel.label || panel.displayName || panelId);
  return {
    id: panelId,
    displayName: overrides.displayName || panel.displayName || panelId,
    standardName: overrides.standardName || panel.standardName || panelId,
    labelText,
    type: overrides.type || panel.type || "panel",
    isGlue: overrides.isGlue !== undefined ? overrides.isGlue : Boolean(panel.isGlue),
    parent: overrides.parent !== undefined ? overrides.parent : (panel.foldParent || null),
    foldId: overrides.foldId !== undefined ? overrides.foldId : (panel.foldId || ""),
    angle: overrides.angle !== undefined ? overrides.angle : (Number(panel.foldAngleDeg) || 0),
    d: overrides.d || panel.path,
    meshD: overrides.meshD || panel.meshD || overrides.d || panel.path,
    labelPosition: overrides.labelPosition || (Array.isArray(panel.labelPosition) ? panel.labelPosition : [0, 0]),
    labelLayout: {
      text: labelText,
      x: overrides.labelPosition ? overrides.labelPosition[0] : (Number(labelLayout.x) || 0),
      y: overrides.labelPosition ? overrides.labelPosition[1] : (Number(labelLayout.y) || 0),
      fontSize: overrides.fontSize || Number(labelLayout.fontSize) || 4,
      rotationDeg: overrides.rotationDeg !== undefined ? overrides.rotationDeg : (Number(labelLayout.rotationDeg) || 0),
      maxWidth: Number(labelLayout.maxWidth) || 0,
      lineHeight: Number(labelLayout.lineHeight) || 1.2
    },
    objectId: panel.objectId || ""
  };
}

const SOURCE_PANELS = [
  createPanelFromRaw("roof-panel-1", { foldId: "fold-body-panel-1-to-roof-panel-1", angle: -90 }),
  createPanelFromRaw("roof-gable-panel-2-left-triangle", { parent: "roof-gable-panel-2-blue-triangle", foldId: "fold-roof-gable-panel-2-blue-to-left", angle: 0 }),
  createPanelFromRaw("roof-gable-panel-2-blue-triangle", { parent: "body-panel-2", foldId: "fold-body-panel-2-to-roof-gable-panel-2-blue", angle: -90 }),
  createPanelFromRaw("roof-gable-panel-2-right-triangle", { parent: "roof-gable-panel-2-blue-triangle", foldId: "fold-roof-gable-panel-2-blue-to-right", angle: 0 }),
  createPanelFromRaw("roof-panel-3", { foldId: "fold-body-panel-3-to-roof-panel-3", angle: -90 }),
  createPanelFromRaw("roof-gable-panel-4-left-triangle", { parent: "roof-gable-panel-4-blue-triangle", foldId: "fold-roof-gable-panel-4-blue-to-left", angle: 0 }),
  createPanelFromRaw("roof-gable-panel-4-blue-triangle", { parent: "body-panel-4", foldId: "fold-body-panel-4-to-roof-gable-panel-4-blue", angle: -90 }),
  createPanelFromRaw("roof-gable-panel-4-right-triangle", { parent: "roof-gable-panel-4-blue-triangle", foldId: "fold-roof-gable-panel-4-blue-to-right", angle: 0 }),
  createPanelFromRaw("body-panel-1", { parent: null, foldId: "", angle: 0 }),
  createPanelFromRaw("body-panel-2", { foldId: "fold-body-panel-1-to-body-panel-2", angle: 90 }),
  createPanelFromRaw("body-panel-3", { foldId: "fold-body-panel-2-to-body-panel-3", angle: 90 }),
  createPanelFromRaw("body-panel-4", { foldId: "fold-body-panel-3-to-body-panel-4", angle: 90 }),
  createPanelFromRaw("side-glue-flap-top", { type: "glue-flap", foldId: "fold-body-panel-4-to-side-glue-flap-top", angle: 0 }),
  createPanelFromRaw("side-glue-flap-middle", { type: "glue-flap", foldId: "fold-side-glue-flap-top-to-side-glue-flap-middle", angle: 0 }),
  createPanelFromRaw("side-glue-flap-bottom", { type: "glue-flap", foldId: "fold-side-glue-flap-middle-to-side-glue-flap-bottom", angle: 0 }),
  createPanelFromRaw("bottom-flap-1", { foldId: "fold-body-panel-1-to-bottom-flap-1", angle: 90 }),
  createPanelFromRaw("bottom-flap-1-blue-triangle", { parent: "bottom-flap-1", foldId: "fold-bottom-flap-1-to-blue", angle: 0 }),
  createPanelFromRaw("bottom-flap-1-bottom-tab-left", { foldId: "fold-bottom-flap-1-to-bottom-tab-left", angle: 0 }),
  createPanelFromRaw("bottom-flap-1-bottom-tab-right", { foldId: "fold-bottom-flap-1-to-bottom-tab-right", angle: 0 }),
  createPanelFromRaw("bottom-gable-flap-2-left-triangle", { parent: "bottom-gable-flap-2-blue-triangle", foldId: "fold-bottom-gable-flap-2-blue-to-left", angle: 0 }),
  createPanelFromRaw("bottom-gable-flap-2-blue-triangle", { parent: "body-panel-2", foldId: "fold-body-panel-2-to-bottom-gable-flap-2-blue", angle: 90 }),
  createPanelFromRaw("bottom-gable-flap-2-right-triangle", { parent: "bottom-gable-flap-2-blue-triangle", foldId: "fold-bottom-gable-flap-2-blue-to-right", angle: 0 }),
  createPanelFromRaw("bottom-gable-flap-2-bottom-tab-left", { parent: "bottom-gable-flap-2-blue-triangle", foldId: "fold-bottom-gable-flap-2-blue-to-bottom-tab-left", angle: 0 }),
  createPanelFromRaw("bottom-gable-flap-2-bottom-tab-right", { parent: "bottom-gable-flap-2-blue-triangle", foldId: "fold-bottom-gable-flap-2-blue-to-bottom-tab-right", angle: 0 }),
  createPanelFromRaw("bottom-flap-3", { foldId: "fold-body-panel-3-to-bottom-flap-3", angle: 90 }),
  createPanelFromRaw("bottom-flap-3-blue-triangle", { parent: "bottom-flap-3", foldId: "fold-bottom-flap-3-to-blue", angle: 0 }),
  createPanelFromRaw("bottom-flap-3-bottom-tab-left", { foldId: "fold-bottom-flap-3-to-bottom-tab-left", angle: 0 }),
  createPanelFromRaw("bottom-flap-3-bottom-tab-right", { foldId: "fold-bottom-flap-3-to-bottom-tab-right", angle: 0 }),
  createPanelFromRaw("bottom-gable-flap-4-left-triangle", { parent: "bottom-gable-flap-4-blue-triangle", foldId: "fold-bottom-gable-flap-4-blue-to-left", angle: 0 }),
  createPanelFromRaw("bottom-gable-flap-4-blue-triangle", { parent: "body-panel-4", foldId: "fold-body-panel-4-to-bottom-gable-flap-4-blue", angle: 90 }),
  createPanelFromRaw("bottom-gable-flap-4-right-triangle", { parent: "bottom-gable-flap-4-blue-triangle", foldId: "fold-bottom-gable-flap-4-blue-to-right", angle: 0 }),
  createPanelFromRaw("bottom-gable-flap-4-bottom-tab-left", { parent: "bottom-gable-flap-4-blue-triangle", foldId: "fold-bottom-gable-flap-4-blue-to-bottom-tab-left", angle: 0 }),
  createPanelFromRaw("bottom-gable-flap-4-bottom-tab-right", { parent: "bottom-gable-flap-4-blue-triangle", foldId: "fold-bottom-gable-flap-4-blue-to-bottom-tab-right", angle: 0 })
];

const RAW_FOLD_PATHS = Object.values(RAW_SOURCE_DATA.folds || {}).reduce((map, entries) => {
  entries.forEach(entry => {
    map[entry.id] = entry.d;
  });
  return map;
}, {});

const SOURCE_FOLDS = [
  { id: "fold-body-panel-1-to-body-panel-2", from: "body-panel-1", to: "body-panel-2", angleDeg: 90, displayName: "Body Panel 1 to Body Panel 2", d: linePath(354.33, 239.95, 354.33, 636.8) },
  { id: "fold-body-panel-2-to-body-panel-3", from: "body-panel-2", to: "body-panel-3", angleDeg: 90, displayName: "Body Panel 2 to Body Panel 3", d: linePath(581.1, 239.95, 581.1, 636.8) },
  { id: "fold-body-panel-3-to-body-panel-4", from: "body-panel-3", to: "body-panel-4", angleDeg: 90, displayName: "Body Panel 3 to Body Panel 4", d: linePath(864.57, 239.95, 864.57, 636.8) },
  { id: "fold-body-panel-1-to-roof-panel-1", from: "body-panel-1", to: "roof-panel-1", angleDeg: -90, displayName: "Body Panel 1 to Roof Panel 1", d: linePath(70.87, 239.95, 354.33, 239.95) },
  { id: "fold-body-panel-2-to-roof-gable-panel-2-blue", from: "body-panel-2", to: "roof-gable-panel-2-blue-triangle", angleDeg: -90, displayName: "Body Panel 2 to Roof Gable Panel 2 Center", d: linePath(354.33, 239.95, 581.1, 239.95), hingeD: linePath(354.33, 239.95, 581.1, 239.95) },
  { id: "fold-roof-gable-panel-2-blue-to-left", from: "roof-gable-panel-2-blue-triangle", to: "roof-gable-panel-2-left-triangle", angleDeg: 0, displayName: "Roof Gable Panel 2 Center to Left", d: linePath(354.33, 239.95, 467.72, 126.56), hingeD: linePath(354.33, 239.95, 467.72, 126.56) },
  { id: "fold-roof-gable-panel-2-blue-to-right", from: "roof-gable-panel-2-blue-triangle", to: "roof-gable-panel-2-right-triangle", angleDeg: 0, displayName: "Roof Gable Panel 2 Center to Right", d: linePath(467.72, 126.56, 581.1, 239.95), hingeD: linePath(467.72, 126.56, 581.1, 239.95) },
  { id: "fold-body-panel-3-to-roof-panel-3", from: "body-panel-3", to: "roof-panel-3", angleDeg: -90, displayName: "Body Panel 3 to Roof Panel 3", d: linePath(581.1, 239.95, 864.57, 239.95) },
  { id: "fold-body-panel-4-to-roof-gable-panel-4-blue", from: "body-panel-4", to: "roof-gable-panel-4-blue-triangle", angleDeg: -90, displayName: "Body Panel 4 to Roof Gable Panel 4 Center", d: linePath(864.57, 239.95, 1091.34, 239.95), hingeD: linePath(864.57, 239.95, 1091.34, 239.95) },
  { id: "fold-roof-gable-panel-4-blue-to-left", from: "roof-gable-panel-4-blue-triangle", to: "roof-gable-panel-4-left-triangle", angleDeg: 0, displayName: "Roof Gable Panel 4 Center to Left", d: linePath(864.57, 239.95, 977.95, 126.56), hingeD: linePath(864.57, 239.95, 977.95, 126.56) },
  { id: "fold-roof-gable-panel-4-blue-to-right", from: "roof-gable-panel-4-blue-triangle", to: "roof-gable-panel-4-right-triangle", angleDeg: 0, displayName: "Roof Gable Panel 4 Center to Right", d: linePath(977.95, 126.56, 1091.34, 239.95), hingeD: linePath(977.95, 126.56, 1091.34, 239.95) },
  { id: "fold-body-panel-1-to-bottom-flap-1", from: "body-panel-1", to: "bottom-flap-1", angleDeg: 90, displayName: "Body Panel 1 to Bottom Flap 1", d: linePath(70.87, 636.8, 354.33, 636.8) },
  { id: "fold-bottom-flap-1-to-blue", from: "bottom-flap-1", to: "bottom-flap-1-blue-triangle", angleDeg: 0, displayName: "Bottom Flap 1 to Triangle", d: linePath(240.94, 812.11, 354.33, 636.8), hingeD: linePath(240.94, 812.11, 354.33, 636.8) },
  { id: "fold-body-panel-2-to-bottom-gable-flap-2-blue", from: "body-panel-2", to: "bottom-gable-flap-2-blue-triangle", angleDeg: 90, displayName: "Body Panel 2 to Bottom Gable Flap 2 Center", d: linePath(354.33, 636.8, 581.1, 636.8), hingeD: linePath(354.33, 636.8, 581.1, 636.8) },
  { id: "fold-bottom-gable-flap-2-blue-to-left", from: "bottom-gable-flap-2-blue-triangle", to: "bottom-gable-flap-2-left-triangle", angleDeg: 0, displayName: "Bottom Gable Flap 2 Center to Left", d: linePath(354.33, 636.8, 467.72, 812.11), hingeD: linePath(354.33, 636.8, 467.72, 812.11) },
  { id: "fold-bottom-gable-flap-2-blue-to-right", from: "bottom-gable-flap-2-blue-triangle", to: "bottom-gable-flap-2-right-triangle", angleDeg: 0, displayName: "Bottom Gable Flap 2 Center to Right", d: linePath(467.72, 812.11, 581.1, 636.8), hingeD: linePath(467.72, 812.11, 581.1, 636.8) },
  { id: "fold-bottom-gable-flap-2-blue-to-bottom-tab-left", from: "bottom-gable-flap-2-blue-triangle", to: "bottom-gable-flap-2-bottom-tab-left", angleDeg: 0, displayName: "Bottom Gable Flap 2 Center to Left Tab", d: linePath(354.33, 812.11, 467.72, 812.11), hingeD: linePath(354.33, 812.11, 467.72, 812.11) },
  { id: "fold-bottom-gable-flap-2-blue-to-bottom-tab-right", from: "bottom-gable-flap-2-blue-triangle", to: "bottom-gable-flap-2-bottom-tab-right", angleDeg: 0, displayName: "Bottom Gable Flap 2 Center to Right Tab", d: linePath(467.72, 812.11, 581.1, 812.11), hingeD: linePath(467.72, 812.11, 581.1, 812.11) },
  { id: "fold-body-panel-3-to-bottom-flap-3", from: "body-panel-3", to: "bottom-flap-3", angleDeg: 90, displayName: "Body Panel 3 to Bottom Flap 3", d: linePath(581.1, 636.8, 864.57, 636.8) },
  { id: "fold-bottom-flap-3-to-blue", from: "bottom-flap-3", to: "bottom-flap-3-blue-triangle", angleDeg: 0, displayName: "Bottom Flap 3 to Triangle", d: linePath(581.1, 636.8, 694.49, 812.11), hingeD: linePath(581.1, 636.8, 694.49, 812.11) },
  { id: "fold-body-panel-4-to-bottom-gable-flap-4-blue", from: "body-panel-4", to: "bottom-gable-flap-4-blue-triangle", angleDeg: 90, displayName: "Body Panel 4 to Bottom Gable Flap 4 Center", d: linePath(864.57, 636.8, 1091.34, 636.8), hingeD: linePath(864.57, 636.8, 1091.34, 636.8) },
  { id: "fold-bottom-gable-flap-4-blue-to-left", from: "bottom-gable-flap-4-blue-triangle", to: "bottom-gable-flap-4-left-triangle", angleDeg: 0, displayName: "Bottom Gable Flap 4 Center to Left", d: linePath(864.57, 636.8, 977.95, 812.11), hingeD: linePath(864.57, 636.8, 977.95, 812.11) },
  { id: "fold-bottom-gable-flap-4-blue-to-right", from: "bottom-gable-flap-4-blue-triangle", to: "bottom-gable-flap-4-right-triangle", angleDeg: 0, displayName: "Bottom Gable Flap 4 Center to Right", d: linePath(977.95, 812.11, 1091.34, 636.8), hingeD: linePath(977.95, 812.11, 1091.34, 636.8) },
  { id: "fold-bottom-gable-flap-4-blue-to-bottom-tab-left", from: "bottom-gable-flap-4-blue-triangle", to: "bottom-gable-flap-4-bottom-tab-left", angleDeg: 0, displayName: "Bottom Gable Flap 4 Center to Left Tab", d: linePath(864.57, 812.11, 977.95, 812.11), hingeD: linePath(864.57, 812.11, 977.95, 812.11) },
  { id: "fold-bottom-gable-flap-4-blue-to-bottom-tab-right", from: "bottom-gable-flap-4-blue-triangle", to: "bottom-gable-flap-4-bottom-tab-right", angleDeg: 0, displayName: "Bottom Gable Flap 4 Center to Right Tab", d: linePath(977.95, 812.11, 1091.34, 812.11), hingeD: linePath(977.95, 812.11, 1091.34, 812.11) },
  { id: "fold-body-panel-4-to-side-glue-flap-top", from: "body-panel-4", to: "side-glue-flap-top", angleDeg: 0, displayName: "Body Panel 4 to Side Glue Flap Top", d: linePath(1091.34, 239.95, 1091.34, 636.8) },
  { id: "fold-side-glue-flap-top-to-side-glue-flap-middle", from: "side-glue-flap-top", to: "side-glue-flap-middle", angleDeg: 0, displayName: "Side Glue Flap Top to Middle", d: linePath(1091.34, 636.8, 1176.38, 636.8) },
  { id: "fold-side-glue-flap-middle-to-side-glue-flap-bottom", from: "side-glue-flap-middle", to: "side-glue-flap-bottom", angleDeg: 0, displayName: "Side Glue Flap Middle to Bottom", d: linePath(1091.34, 812.11, 1176.38, 812.11) },
  { id: "fold-bottom-flap-1-to-bottom-tab-left", from: "bottom-flap-1", to: "bottom-flap-1-bottom-tab-left", angleDeg: 0, displayName: "Bottom Flap 1 to Left Tab", d: linePath(70.87, 812.11, 240.94, 812.11) },
  { id: "fold-bottom-flap-1-to-bottom-tab-right", from: "bottom-flap-1", to: "bottom-flap-1-bottom-tab-right", angleDeg: 0, displayName: "Bottom Flap 1 to Right Tab", d: linePath(240.94, 812.11, 354.33, 812.11) },
  { id: "fold-bottom-flap-3-to-bottom-tab-left", from: "bottom-flap-3", to: "bottom-flap-3-bottom-tab-left", angleDeg: 0, displayName: "Bottom Flap 3 to Left Tab", d: linePath(581.1, 812.11, 694.49, 812.11) },
  { id: "fold-bottom-flap-3-to-bottom-tab-right", from: "bottom-flap-3", to: "bottom-flap-3-bottom-tab-right", angleDeg: 0, displayName: "Bottom Flap 3 to Right Tab", d: linePath(694.49, 812.11, 864.57, 812.11) },
  { id: "page-valley-val-ver-1", from: "bottom-flap-1", to: "bottom-flap-1", angleDeg: 0, displayName: "Bottom Flap 1 Inner Fold", d: RAW_FOLD_PATHS["page-valley-val-ver-1"] || "" },
  { id: "page-valley-val-ver-2", from: "bottom-flap-3", to: "bottom-flap-3", angleDeg: 0, displayName: "Bottom Flap 3 Inner Fold", d: RAW_FOLD_PATHS["page-valley-val-ver-2"] || "" },
  { id: "page-valley-valley-diag-1", from: "bottom-gable-flap-2-blue-triangle", to: "bottom-gable-flap-2-blue-triangle", angleDeg: 0, displayName: "Bottom Gable Flap 2 Diagonal Fold", d: RAW_FOLD_PATHS["page-valley-valley-diag-1"] || "" },
  { id: "page-valley-valley-diag-2", from: "bottom-gable-flap-4-blue-triangle", to: "bottom-gable-flap-4-blue-triangle", angleDeg: 0, displayName: "Bottom Gable Flap 4 Diagonal Fold", d: RAW_FOLD_PATHS["page-valley-valley-diag-2"] || "" },
  { id: "page-valley-valley-diag-3", from: "roof-gable-panel-2-blue-triangle", to: "roof-gable-panel-2-blue-triangle", angleDeg: 0, displayName: "Roof Gable Panel 2 Diagonal Fold", d: RAW_FOLD_PATHS["page-valley-valley-diag-3"] || "" },
  { id: "page-valley-valley-diag-4", from: "roof-gable-panel-4-blue-triangle", to: "roof-gable-panel-4-blue-triangle", angleDeg: 0, displayName: "Roof Gable Panel 4 Diagonal Fold", d: RAW_FOLD_PATHS["page-valley-valley-diag-4"] || "" },
  { id: "page-mountain-mount-ver-5", from: "bottom-gable-flap-2-blue-triangle", to: "bottom-gable-flap-2-blue-triangle", angleDeg: 0, displayName: "Bottom Gable Flap 2 Center Crease", d: RAW_FOLD_PATHS["page-mountain-mount-ver-5"] || "" },
  { id: "page-mountain-mount-ver-6", from: "bottom-gable-flap-4-blue-triangle", to: "bottom-gable-flap-4-blue-triangle", angleDeg: 0, displayName: "Bottom Gable Flap 4 Center Crease", d: RAW_FOLD_PATHS["page-mountain-mount-ver-6"] || "" }
].filter(fold => fold.d);

const SOURCE_RENDER_FOLDS = [
  { id: "page-valley-valley-hor-1", from: "bottom-flap-1", to: "side-glue-flap-bottom", angleDeg: 0, displayName: "Bottom Tabs Fold Line", d: RAW_FOLD_PATHS["page-valley-valley-hor-1"] || "" },
  { id: "page-valley-valley-diag-1", from: "bottom-gable-flap-2-blue-triangle", to: "bottom-gable-flap-2-blue-triangle", angleDeg: 0, displayName: "Bottom Gable Flap 2 Diagonal Fold", d: RAW_FOLD_PATHS["page-valley-valley-diag-1"] || "" },
  { id: "page-valley-valley-diag-2", from: "bottom-gable-flap-4-blue-triangle", to: "bottom-gable-flap-4-blue-triangle", angleDeg: 0, displayName: "Bottom Gable Flap 4 Diagonal Fold", d: RAW_FOLD_PATHS["page-valley-valley-diag-2"] || "" },
  { id: "page-valley-valley-diag-3", from: "roof-gable-panel-2-blue-triangle", to: "roof-gable-panel-2-blue-triangle", angleDeg: 0, displayName: "Roof Gable Panel 2 Diagonal Fold", d: RAW_FOLD_PATHS["page-valley-valley-diag-3"] || "" },
  { id: "page-valley-valley-diag-4", from: "roof-gable-panel-4-blue-triangle", to: "roof-gable-panel-4-blue-triangle", angleDeg: 0, displayName: "Roof Gable Panel 4 Diagonal Fold", d: RAW_FOLD_PATHS["page-valley-valley-diag-4"] || "" },
  { id: "page-valley-val-ver-1", from: "bottom-flap-1", to: "bottom-flap-1", angleDeg: 0, displayName: "Bottom Flap 1 Inner Fold", d: RAW_FOLD_PATHS["page-valley-val-ver-1"] || "" },
  { id: "page-valley-val-ver-2", from: "bottom-flap-3", to: "bottom-flap-3", angleDeg: 0, displayName: "Bottom Flap 3 Inner Fold", d: RAW_FOLD_PATHS["page-valley-val-ver-2"] || "" },
  { id: "page-mountain-mount-hor-1", from: "bottom-flap-1", to: "side-glue-flap-middle", angleDeg: 90, displayName: "Body Panels to Bottom Flaps", d: RAW_FOLD_PATHS["page-mountain-mount-hor-1"] || "" },
  { id: "page-mountain-mount-hor-2", from: "roof-panel-1", to: "roof-gable-panel-4", angleDeg: -90, displayName: "Body Panels to Roof Panels", d: RAW_FOLD_PATHS["page-mountain-mount-hor-2"] || "" },
  { id: "page-mountain-mount-ver-1", from: "body-panel-1", to: "body-panel-2", angleDeg: 90, displayName: "Body Panel 1 to Body Panel 2", d: RAW_FOLD_PATHS["page-mountain-mount-ver-1"] || "" },
  { id: "page-mountain-mount-ver-2", from: "body-panel-2", to: "body-panel-3", angleDeg: 90, displayName: "Body Panel 2 to Body Panel 3", d: RAW_FOLD_PATHS["page-mountain-mount-ver-2"] || "" },
  { id: "page-mountain-mount-ver-3", from: "body-panel-3", to: "body-panel-4", angleDeg: 90, displayName: "Body Panel 3 to Body Panel 4", d: RAW_FOLD_PATHS["page-mountain-mount-ver-3"] || "" },
  { id: "page-mountain-mount-ver-4", from: "body-panel-4", to: "side-glue-flap-top", angleDeg: 0, displayName: "Body Panel 4 to Side Glue Flap", d: RAW_FOLD_PATHS["page-mountain-mount-ver-4"] || "" },
  { id: "page-mountain-mount-ver-5", from: "bottom-gable-flap-2-blue-triangle", to: "bottom-gable-flap-2-blue-triangle", angleDeg: 0, displayName: "Bottom Gable Flap 2 Center Crease", d: RAW_FOLD_PATHS["page-mountain-mount-ver-5"] || "" },
  { id: "page-mountain-mount-ver-6", from: "bottom-gable-flap-4-blue-triangle", to: "bottom-gable-flap-4-blue-triangle", angleDeg: 0, displayName: "Bottom Gable Flap 4 Center Crease", d: RAW_FOLD_PATHS["page-mountain-mount-ver-6"] || "" }
].filter(fold => fold.d);

const SOURCE_ALL_FOLDS = SOURCE_RENDER_FOLDS.map(fold => ({
  ...fold,
  id: `render-${fold.id}`
})).concat(
  SOURCE_FOLDS
);

const SOURCE_CUT_PATHS = (RAW_SOURCE_DATA.cutPaths || []).map(path => ({
  id: path.id,
  d: path.d,
  type: path.type || "cut"
}));

const TEMPLATE_DEFINITION = {
  id: "milkcarton",
  name: "Milk Carton",
  icon: "icon-milkcarton",
  title: "Milk Carton Template",
  summary: "Procedurally generated milk carton dieline with roof gables, segmented glue flap, and the updated structured sub-panels.",
  defaults: { ...SOURCE_DEFAULTS },
  metadataDimensionMap: {
    L: "length",
    W: "width",
    H: "height"
  },
  fieldGroups: {
    primary: [
      { key: "L", label: "Length", kind: "length", min: 1, step: 0.1 },
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 1, step: 0.1 },
      { key: "ROOFH", label: "Roof Height", kind: "length", min: 0, step: 0.1 },
      { key: "TOPFLAP", label: "Top Flap", kind: "length", min: 0, step: 0.1 }
    ],
    optional: [
      { key: "R", label: "Rounded Corners Radius", kind: "length", min: 0, step: 0.1 },
      { key: "GLUE", label: "Glue Flap Size", kind: "length", min: 0, step: 0.1 },
      { key: "O", label: "Overlap", kind: "length", min: 0, step: 0.1 },
      { key: "T", label: "Material Thickness", kind: "length", min: 0, step: 0.1 }
    ]
  },
  parametricRule: { xKeys: ["L", "W", "GLUE"], yKeys: ["ROOFH", "TOPFLAP", "H", "O", "R"] },
  panels: SOURCE_PANELS.map(panel => ({
    id: panel.id,
    displayName: panel.displayName,
    standardName: panel.standardName,
    type: panel.type,
    isGlue: panel.isGlue,
    foldParent: panel.parent,
    foldId: panel.foldId,
    foldAngleDeg: panel.angle
  })),
  folds: SOURCE_ALL_FOLDS.map(fold => ({
    id: fold.id,
    from: fold.from,
    to: fold.to,
    displayName: fold.displayName
  })),
  floorPanel: "body-panel-1",
  custom3d: {
    disablePanelCreaseDeformation: true,
    camera: {
      flatView: "top",
      foldedView: "front",
      flatPadding: 1.14,
      foldedPadding: 1.3,
      foldedTargetOffset: [0, 0.05, 0.14]
    },
    controllableFolds: [
      "fold-body-panel-4-to-side-glue-flap-top",
      "fold-side-glue-flap-top-to-side-glue-flap-middle",
      "fold-side-glue-flap-middle-to-side-glue-flap-bottom",
      "fold-body-panel-3-to-body-panel-4",
      "fold-body-panel-2-to-body-panel-3",
      "fold-body-panel-1-to-body-panel-2",
      "fold-body-panel-1-to-bottom-flap-1",
      "fold-body-panel-2-to-bottom-gable-flap-2-blue",
      "fold-body-panel-3-to-bottom-flap-3",
      "fold-body-panel-4-to-bottom-gable-flap-4-blue",
      "fold-body-panel-1-to-roof-panel-1",
      "fold-body-panel-2-to-roof-gable-panel-2-blue",
      "fold-body-panel-3-to-roof-panel-3",
      "fold-body-panel-4-to-roof-gable-panel-4-blue"
    ],
    drivenFolds: {
      "fold-bottom-flap-1-to-blue": { source: "fold-body-panel-1-to-bottom-flap-1", angleScale: 1, progressScale: 1 },
      "fold-bottom-flap-3-to-blue": { source: "fold-body-panel-3-to-bottom-flap-3", angleScale: 1, progressScale: 1 },
      "fold-bottom-gable-flap-2-blue-to-left": { source: "fold-body-panel-2-to-bottom-gable-flap-2-blue", angleScale: -1, progressScale: 1 },
      "fold-bottom-gable-flap-2-blue-to-right": { source: "fold-body-panel-2-to-bottom-gable-flap-2-blue", angleScale: -1, progressScale: 1 },
      "fold-bottom-gable-flap-4-blue-to-left": { source: "fold-body-panel-4-to-bottom-gable-flap-4-blue", angleScale: -1, progressScale: 1 },
      "fold-bottom-gable-flap-4-blue-to-right": { source: "fold-body-panel-4-to-bottom-gable-flap-4-blue", angleScale: -1, progressScale: 1 },
      "fold-roof-gable-panel-2-blue-to-left": { source: "fold-body-panel-2-to-roof-gable-panel-2-blue", angleScale: -1, progressScale: 1 },
      "fold-roof-gable-panel-2-blue-to-right": { source: "fold-body-panel-2-to-roof-gable-panel-2-blue", angleScale: -1, progressScale: 1 },
      "fold-roof-gable-panel-4-blue-to-left": { source: "fold-body-panel-4-to-roof-gable-panel-4-blue", angleScale: -1, progressScale: 1 },
      "fold-roof-gable-panel-4-blue-to-right": { source: "fold-body-panel-4-to-roof-gable-panel-4-blue", angleScale: -1, progressScale: 1 }
    }
  },
  foldSequence: [
    "fold-body-panel-4-to-side-glue-flap-top",
    "fold-side-glue-flap-top-to-side-glue-flap-middle",
    "fold-side-glue-flap-middle-to-side-glue-flap-bottom",
    "fold-body-panel-3-to-body-panel-4",
    "fold-body-panel-2-to-body-panel-3",
    "fold-body-panel-1-to-body-panel-2",
    "fold-body-panel-1-to-bottom-flap-1",
    "fold-bottom-flap-1-to-blue",
    "fold-body-panel-3-to-bottom-flap-3",
    "fold-bottom-flap-3-to-blue",
    "fold-body-panel-2-to-bottom-gable-flap-2-blue",
    "fold-bottom-gable-flap-2-blue-to-left",
    "fold-bottom-gable-flap-2-blue-to-right",
    "fold-body-panel-4-to-bottom-gable-flap-4-blue",
    "fold-bottom-gable-flap-4-blue-to-left",
    "fold-bottom-gable-flap-4-blue-to-right",
    "fold-bottom-flap-1-to-bottom-tab-left",
    "fold-bottom-flap-1-to-bottom-tab-right",
    "fold-bottom-gable-flap-2-blue-to-bottom-tab-left",
    "fold-bottom-gable-flap-2-blue-to-bottom-tab-right",
    "fold-bottom-flap-3-to-bottom-tab-left",
    "fold-bottom-flap-3-to-bottom-tab-right",
    "fold-bottom-gable-flap-4-blue-to-bottom-tab-left",
    "fold-bottom-gable-flap-4-blue-to-bottom-tab-right",
    "page-valley-val-ver-1",
    "page-valley-val-ver-2",
    "page-mountain-mount-ver-5",
    "page-mountain-mount-ver-6",
    "fold-body-panel-1-to-roof-panel-1",
    "fold-body-panel-2-to-roof-gable-panel-2-blue",
    "fold-roof-gable-panel-2-blue-to-left",
    "fold-roof-gable-panel-2-blue-to-right",
    "fold-body-panel-3-to-roof-panel-3",
    "fold-body-panel-4-to-roof-gable-panel-4-blue",
    "fold-roof-gable-panel-4-blue-to-left",
    "fold-roof-gable-panel-4-blue-to-right",
    "page-valley-valley-diag-1",
    "page-valley-valley-diag-2",
    "page-valley-valley-diag-3",
    "page-valley-valley-diag-4"
  ]
};

function createIntervalWarp(breakpoints, targetLengths) {
  const intervals = [];
  const targets = [breakpoints[0]];
  for (let index = 0; index < breakpoints.length - 1; index += 1) {
    intervals.push({
      start: breakpoints[index],
      end: breakpoints[index + 1],
      length: breakpoints[index + 1] - breakpoints[index],
      targetLength: targetLengths[index]
    });
    targets.push(targets[index] + targetLengths[index]);
  }

  function warp(value) {
    if (!Number.isFinite(value)) {
      return value;
    }
    if (value <= intervals[0].start) {
      return targets[0] + (value - intervals[0].start);
    }
    for (let index = 0; index < intervals.length; index += 1) {
      const interval = intervals[index];
      if (value <= interval.end || index === intervals.length - 1) {
        const ratio = (value - interval.start) / Math.max(interval.length, 1e-6);
        return targets[index] + ratio * interval.targetLength;
      }
    }
    const last = intervals[intervals.length - 1];
    return targets[targets.length - 1] + (value - last.end);
  }

  function scaleAt(value) {
    if (!Number.isFinite(value)) {
      return 1;
    }
    if (value <= intervals[0].start) {
      return intervals[0].targetLength / Math.max(intervals[0].length, 1e-6);
    }
    for (let index = 0; index < intervals.length; index += 1) {
      const interval = intervals[index];
      if (value <= interval.end || index === intervals.length - 1) {
        return interval.targetLength / Math.max(interval.length, 1e-6);
      }
    }
    const last = intervals[intervals.length - 1];
    return last.targetLength / Math.max(last.length, 1e-6);
  }

  return { warp, scaleAt };
}

function warpPoint(point, xWarp, yWarp) {
  return [roundValue(xWarp(point[0])), roundValue(yWarp(point[1]))];
}

function warpPointsString(points, xWarp, yWarp) {
  return points
    .trim()
    .split(/\s+/)
    .map(entry => {
      const parts = entry.split(",").map(Number);
      return `${roundValue(xWarp(parts[0]))},${roundValue(yWarp(parts[1]))}`;
    })
    .join(" ");
}

function warpPathData(path, xWarp, yWarp, xScaleAt, yScaleAt) {
  const tokens = String(path).match(/[AaCcHhLlMmQqSsTtVvZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  if (!tokens) {
    return "";
  }

  let index = 0;
  let command = "";
  let current = { x: 0, y: 0 };
  let subpathStart = { x: 0, y: 0 };
  const out = [];

  const isCommand = token => /^[AaCcHhLlMmQqSsTtVvZz]$/.test(token);
  const nextNumber = () => Number(tokens[index++]);
  const push = value => out.push(String(value));

  while (index < tokens.length) {
    const token = tokens[index];
    if (isCommand(token)) {
      command = token;
      index += 1;
      push(command);
      if (command === "Z" || command === "z") {
        current = { ...subpathStart };
      }
      continue;
    }

    switch (command) {
      case "M":
      case "L": {
        const x = nextNumber();
        const y = nextNumber();
        current = { x, y };
        if (command === "M") {
          subpathStart = { ...current };
        }
        push(roundValue(xWarp(x)));
        push(roundValue(yWarp(y)));
        break;
      }
      case "m":
      case "l": {
        const dx = nextNumber();
        const dy = nextNumber();
        const next = { x: current.x + dx, y: current.y + dy };
        if (command === "m" && current.x === 0 && current.y === 0) {
          subpathStart = { ...next };
        }
        push(roundValue(xWarp(next.x) - xWarp(current.x)));
        push(roundValue(yWarp(next.y) - yWarp(current.y)));
        current = next;
        break;
      }
      case "H": {
        const x = nextNumber();
        current.x = x;
        push(roundValue(xWarp(x)));
        break;
      }
      case "h": {
        const dx = nextNumber();
        const nextX = current.x + dx;
        push(roundValue(xWarp(nextX) - xWarp(current.x)));
        current.x = nextX;
        break;
      }
      case "V": {
        const y = nextNumber();
        current.y = y;
        push(roundValue(yWarp(y)));
        break;
      }
      case "v": {
        const dy = nextNumber();
        const nextY = current.y + dy;
        push(roundValue(yWarp(nextY) - yWarp(current.y)));
        current.y = nextY;
        break;
      }
      case "C": {
        const x1 = nextNumber();
        const y1 = nextNumber();
        const x2 = nextNumber();
        const y2 = nextNumber();
        const x = nextNumber();
        const y = nextNumber();
        push(roundValue(xWarp(x1)));
        push(roundValue(yWarp(y1)));
        push(roundValue(xWarp(x2)));
        push(roundValue(yWarp(y2)));
        push(roundValue(xWarp(x)));
        push(roundValue(yWarp(y)));
        current = { x, y };
        break;
      }
      case "c": {
        const dx1 = nextNumber();
        const dy1 = nextNumber();
        const dx2 = nextNumber();
        const dy2 = nextNumber();
        const dx = nextNumber();
        const dy = nextNumber();
        push(roundValue(xWarp(current.x + dx1) - xWarp(current.x)));
        push(roundValue(yWarp(current.y + dy1) - yWarp(current.y)));
        push(roundValue(xWarp(current.x + dx2) - xWarp(current.x)));
        push(roundValue(yWarp(current.y + dy2) - yWarp(current.y)));
        push(roundValue(xWarp(current.x + dx) - xWarp(current.x)));
        push(roundValue(yWarp(current.y + dy) - yWarp(current.y)));
        current = { x: current.x + dx, y: current.y + dy };
        break;
      }
      case "Q": {
        const x1 = nextNumber();
        const y1 = nextNumber();
        const x = nextNumber();
        const y = nextNumber();
        push(roundValue(xWarp(x1)));
        push(roundValue(yWarp(y1)));
        push(roundValue(xWarp(x)));
        push(roundValue(yWarp(y)));
        current = { x, y };
        break;
      }
      case "q": {
        const dx1 = nextNumber();
        const dy1 = nextNumber();
        const dx = nextNumber();
        const dy = nextNumber();
        push(roundValue(xWarp(current.x + dx1) - xWarp(current.x)));
        push(roundValue(yWarp(current.y + dy1) - yWarp(current.y)));
        push(roundValue(xWarp(current.x + dx) - xWarp(current.x)));
        push(roundValue(yWarp(current.y + dy) - yWarp(current.y)));
        current = { x: current.x + dx, y: current.y + dy };
        break;
      }
      case "A": {
        const rx = nextNumber();
        const ry = nextNumber();
        const rotation = nextNumber();
        const largeArc = nextNumber();
        const sweep = nextNumber();
        const x = nextNumber();
        const y = nextNumber();
        push(roundValue(Math.abs(rx * xScaleAt((current.x + x) / 2))));
        push(roundValue(Math.abs(ry * yScaleAt((current.y + y) / 2))));
        push(roundValue(rotation));
        push(roundValue(largeArc));
        push(roundValue(sweep));
        push(roundValue(xWarp(x)));
        push(roundValue(yWarp(y)));
        current = { x, y };
        break;
      }
      case "a": {
        const rx = nextNumber();
        const ry = nextNumber();
        const rotation = nextNumber();
        const largeArc = nextNumber();
        const sweep = nextNumber();
        const dx = nextNumber();
        const dy = nextNumber();
        const next = { x: current.x + dx, y: current.y + dy };
        push(roundValue(Math.abs(rx * xScaleAt((current.x + next.x) / 2))));
        push(roundValue(Math.abs(ry * yScaleAt((current.y + next.y) / 2))));
        push(roundValue(rotation));
        push(roundValue(largeArc));
        push(roundValue(sweep));
        push(roundValue(xWarp(next.x) - xWarp(current.x)));
        push(roundValue(yWarp(next.y) - yWarp(current.y)));
        current = next;
        break;
      }
      default:
        throw new Error(`Unsupported SVG path command in milkcarton builder: ${command}`);
    }
  }

  return out.join(" ");
}

function buildMilkcartonGeometry(params, template) {
  const L = Math.max(1, Number(params.L) || template.defaults.L);
  const W = Math.max(1, Number(params.W) || template.defaults.W);
  const H = Math.max(1, Number(params.H) || template.defaults.H);
  const ROOFH = Math.max(0, Number(params.ROOFH) || template.defaults.ROOFH);
  const TOPFLAP = Math.max(0, Number(params.TOPFLAP) || template.defaults.TOPFLAP);
  const R = Math.max(0, Number(params.R) || template.defaults.R);
  const GLUE = Math.max(0, Number(params.GLUE) || template.defaults.GLUE);
  const O = Math.max(0, Number(params.O) || template.defaults.O);
  const T = Math.max(0, Number(params.T) || template.defaults.T);

  const xWarp = createIntervalWarp(SOURCE_X_BREAKPOINTS, [
    (SOURCE_X_BREAKPOINTS[1] - SOURCE_X_BREAKPOINTS[0]) * (L / SOURCE_DEFAULTS.L),
    (SOURCE_X_BREAKPOINTS[2] - SOURCE_X_BREAKPOINTS[1]) * (W / SOURCE_DEFAULTS.W),
    (SOURCE_X_BREAKPOINTS[3] - SOURCE_X_BREAKPOINTS[2]) * (L / SOURCE_DEFAULTS.L),
    (SOURCE_X_BREAKPOINTS[4] - SOURCE_X_BREAKPOINTS[3]) * (W / SOURCE_DEFAULTS.W),
    (SOURCE_X_BREAKPOINTS[5] - SOURCE_X_BREAKPOINTS[4]) * (GLUE / SOURCE_DEFAULTS.GLUE)
  ]);
  const yWarp = createIntervalWarp(SOURCE_Y_BREAKPOINTS, [
    (SOURCE_Y_BREAKPOINTS[1] - SOURCE_Y_BREAKPOINTS[0]) * (Math.max(O, 0.1) / Math.max(SOURCE_DEFAULTS.O, 0.1)),
    (SOURCE_Y_BREAKPOINTS[2] - SOURCE_Y_BREAKPOINTS[1]) * ((ROOFH + TOPFLAP) / Math.max(SOURCE_DEFAULTS.ROOFH + SOURCE_DEFAULTS.TOPFLAP, 0.1)),
    (SOURCE_Y_BREAKPOINTS[3] - SOURCE_Y_BREAKPOINTS[2]) * (H / SOURCE_DEFAULTS.H),
    (SOURCE_Y_BREAKPOINTS[4] - SOURCE_Y_BREAKPOINTS[3]) * (Math.max(W - O, 0.1) / Math.max(SOURCE_DEFAULTS.W - SOURCE_DEFAULTS.O, 0.1)),
    (SOURCE_Y_BREAKPOINTS[5] - SOURCE_Y_BREAKPOINTS[4]) * (Math.max(O * 0.5, 0.1) / Math.max(SOURCE_DEFAULTS.O * 0.5, 0.1)),
    (SOURCE_Y_BREAKPOINTS[6] - SOURCE_Y_BREAKPOINTS[5]) * (Math.max(R, 0.1) / Math.max(SOURCE_DEFAULTS.R, 0.1))
  ]);

  const labelScale = Math.sqrt((L / SOURCE_DEFAULTS.L) * (H / SOURCE_DEFAULTS.H));
  const panels = SOURCE_PANELS.map(panel => {
    const warpedLabel = warpPoint(panel.labelPosition, xWarp.warp, yWarp.warp);
    const d = warpPathData(panel.d, xWarp.warp, yWarp.warp, xWarp.scaleAt, yWarp.scaleAt);
    const meshD = warpPathData(panel.meshD || panel.d, xWarp.warp, yWarp.warp, xWarp.scaleAt, yWarp.scaleAt);
    return {
      id: panel.id,
      standardName: panel.standardName,
      displayName: panel.displayName,
      label: panel.labelText,
      type: panel.type,
      isGlue: panel.isGlue,
      parent: panel.parent,
      foldId: panel.foldId,
      angle: panel.angle,
      d,
      meshD,
      labelPosition: warpedLabel,
      labelLayout: {
        text: panel.labelText,
        x: warpedLabel[0],
        y: warpedLabel[1],
        fontSize: roundValue(clamp(panel.labelLayout.fontSize * labelScale, 5, 24)),
        rotationDeg: panel.labelLayout.rotationDeg,
        maxWidth: panel.labelLayout.maxWidth,
        lineHeight: panel.labelLayout.lineHeight
      },
      objectId: panel.objectId || ""
    };
  });

  const folds = SOURCE_ALL_FOLDS.map(fold => ({
    id: fold.id,
    from: fold.from,
    to: fold.to,
    d: warpPathData(fold.d, xWarp.warp, yWarp.warp, xWarp.scaleAt, yWarp.scaleAt),
    angleDeg: fold.angleDeg,
    displayName: fold.displayName
  }));

  const cutPaths = SOURCE_CUT_PATHS.map(path => ({
    id: path.id,
    type: path.type,
    d: warpPathData(path.d, xWarp.warp, yWarp.warp, xWarp.scaleAt, yWarp.scaleAt)
  }));

  const geometry = {
    pageW: roundValue(xWarp.warp(SOURCE_PAGE.width)),
    pageH: roundValue(yWarp.warp(SOURCE_PAGE.height)),
    outlineD: cutPaths[0] ? cutPaths[0].d : "",
    slitD: "",
    lockCutoutD: "",
    cutPaths,
    panels,
    folds,
    glueAreas: [
      {
        id: "glue-side",
        points: warpPointsString(SOURCE_SIDE_GLUE_AREA, xWarp.warp, yWarp.warp)
      }
    ],
    rootPanel: "body-panel-1",
    rootPanels: ["body-panel-1"],
    floorPanel: "body-panel-1",
    floorFoldId: "",
    floorFoldDistribution: null,
    foldSequence: [...template.foldSequence],
    custom3d: {
      ...(template.custom3d || {})
    },
    flatSheetD: "",
    __cacheKey: JSON.stringify({
      templateId: "milkcarton",
      dimensions: {
        L: roundValue(L),
        W: roundValue(W),
        H: roundValue(H),
        ROOFH: roundValue(ROOFH),
        TOPFLAP: roundValue(TOPFLAP),
        R: roundValue(R),
        GLUE: roundValue(GLUE),
        O: roundValue(O),
        T: roundValue(T)
      },
      panels: panels.map(panel => ({
        id: panel.id,
        d: panel.d,
        meshD: panel.meshD,
        parent: panel.parent,
        foldId: panel.foldId,
        angle: panel.angle
      })),
      folds: folds.map(fold => ({ id: fold.id, d: fold.d, angleDeg: fold.angleDeg })),
      cutPaths: cutPaths.map(path => ({ id: path.id, d: path.d })),
      custom3d: {
        ...(template.custom3d || {})
      }
    })
  };

  const metadataJson = buildMetadataJson(
    template,
    geometry,
    { length: L, width: W, height: H, overlap: O },
    {
      roundedCornersRadius: R,
      glueFlapSize: GLUE,
      materialThickness: T
    },
    "static/template-builders/milkcarton.js"
  );
  metadataJson.custom3d = geometry.custom3d;
  metadataJson.nominalDimensions.roofMm = roundValue(ROOFH);
  metadataJson.nominalDimensions.topFlapMm = roundValue(TOPFLAP);
  metadataJson.nominalDimensions.glueFlapSizeMm = roundValue(GLUE);
  metadataJson.nominalDimensions.roundedCornersRadiusMm = roundValue(R);
  metadataJson.nominalDimensions.materialThicknessMm = roundValue(T);
  metadataJson.nominalDimensions.overlapMm = roundValue(O);

  return {
    svgText: renderStructuredSvg(template, geometry, metadataJson),
    metadata: metadataJson,
    geometry
  };
}

export default createProceduralTemplateBuilder(TEMPLATE_DEFINITION, buildMilkcartonGeometry);
