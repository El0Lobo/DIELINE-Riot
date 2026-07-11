import { buildMetadataJson, clamp, createProceduralTemplateBuilder, renderStructuredSvg, roundValue } from "./helpers.js";
const giftboxSvgSource = String.raw`<?xml version='1.0' encoding='UTF-8'?>
<svg xmlns="http://www.w3.org/2000/svg" id="Structured_Giftbox_Template" viewBox="0 0 566 806" width="200.0000mm" height="284.5001mm" data-box-app="BoxBuilder" data-box-version="1.0" data-box-role="template" data-unit="mm">
  <title>Structured giftbox dieline</title>
  <desc>Structured version of the uploaded giftbox SVG with visible cut/fold lines, hidden panel faces, metadata, and clipped artwork groups.</desc>

  <metadata id="box-template-metadata" type="application/json"><![CDATA[
{
  "schema": "box-template-v1",
  "source": {
    "file": "giftbox-50x40x60_mm___7jpy0v54.svg",
    "viewBox": "0 0 566 806",
    "width": "200.0000mm",
    "height": "284.5001mm",
    "unit": "mm",
    "note": "Structured from the uploaded Templatemaker giftbox dieline."
  },
  "template": "giftbox",
  "nominalDimensions": {
    "lengthMm": 50,
    "widthMm": 40,
    "heightMm": 60
  },
  "floorPanel": "bottom-panel",
  "panels": [
    {
      "id": "top-left-dust-flap",
      "label": "top-left\ndust-flap",
      "type": "panel",
      "standardName": "top-left-dust-flap",
      "displayName": "Top Left Dust Flap",
      "isGlue": false,
      "labelLayout": {
        "text": "top-left\ndust-flap",
        "x": 155.2,
        "y": 99,
        "fontSize": 15,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": "left-panel",
      "foldId": "page-fold-top-left-dust-flap",
      "foldAngleDeg": -180,
      "path": "M 99.21 127.1 L 107.71 118.6 L 111.93 70.41 L 194.88 70.41 L 205.51 110.1 L 208.34 112.93 L 211.18 115.76 L 211.18 127.1 Z",
      "labelPosition": [
        155.2,
        99
      ],
      "displayLabel": "top-left\ndust-flap",
      "sourceId": "top-left-dust-flap",
      "meshD": "M 99.21 127.1 L 107.71 118.6 L 111.93 70.41 L 194.88 70.41 L 205.51 110.1 L 208.34 112.93 L 211.18 115.76 L 211.18 127.1 Z",
      "pathId": "panel-top-left-dust-flap",
      "clipPathId": "clip-top-left-dust-flap",
      "objectId": ""
    },
    {
      "id": "left-glue-flap",
      "label": "left-glue-flap",
      "type": "glue-flap",
      "standardName": "left-glue-flap",
      "displayName": "Left Glue Flap",
      "isGlue": true,
      "labelLayout": {
        "text": "left-glue-flap",
        "x": 85,
        "y": 212,
        "fontSize": 20,
        "rotationDeg": 90,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": "left-panel",
      "foldId": "page-fold-glue-vert-right",
      "foldAngleDeg": 90,
      "path": "M 70.87 133.52 L 99.21 128.52 L 99.21 295.76 L 70.87 290.77 Z",
      "labelPosition": [
        85,
        212
      ],
      "displayLabel": "left-glue-flap",
      "sourceId": "left-glue-flap",
      "meshD": "M 70.87 133.52 L 99.21 128.52 L 99.21 295.76 L 70.87 290.77 Z",
      "pathId": "panel-left-glue-flap",
      "clipPathId": "clip-left-glue-flap",
      "objectId": ""
    },
    {
      "id": "left-panel",
      "label": "left-panel",
      "type": "panel",
      "standardName": "left-panel",
      "displayName": "Left Panel",
      "isGlue": false,
      "labelLayout": {
        "text": "left-panel",
        "x": 155.9,
        "y": 212,
        "fontSize": 20,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": "front-panel",
      "foldId": "page-fold-ver-l",
      "foldAngleDeg": 90,
      "path": "M 99.21 127.1 L 212.6 127.1 L 212.6 297.18 L 99.21 297.18 Z",
      "labelPosition": [
        155.9,
        212
      ],
      "displayLabel": "left-panel",
      "sourceId": "left-panel",
      "meshD": "M 99.21 127.1 L 212.6 127.1 L 212.6 297.18 L 99.21 297.18 Z",
      "pathId": "panel-left-panel",
      "clipPathId": "clip-left-panel",
      "objectId": ""
    },
    {
      "id": "front-panel",
      "label": "front-panel",
      "type": "panel",
      "standardName": "front-panel",
      "displayName": "Front Panel",
      "isGlue": false,
      "labelLayout": {
        "text": "front-panel",
        "x": 283.46,
        "y": 354,
        "fontSize": 20,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": "bottom-panel",
      "foldId": "page-fold-front-panel",
      "foldAngleDeg": 90,
      "path": "M 212.6 127.1 L 262.2 127.1 A 21.26 21.26 0 0 0 283.46 148.36 A 21.26 21.26 0 0 0 304.72 127.1 L 354.33 127.1 L 354.33 297.18 L 212.6 297.18 Z",
      "labelPosition": [
        283.46,
        354
      ],
      "displayLabel": "front-panel",
      "sourceId": "front-panel",
      "meshD": "M 212.6 127.1 L 262.2 127.1 A 21.26 21.26 0 0 0 283.46 148.36 A 21.26 21.26 0 0 0 304.72 127.1 L 354.33 127.1 L 354.33 297.18 L 212.6 297.18 Z",
      "pathId": "panel-front-panel",
      "clipPathId": "clip-front-panel",
      "objectId": ""
    },
    {
      "id": "top-right-dust-flap",
      "label": "top-right\ndust-flap",
      "type": "panel",
      "standardName": "top-right-dust-flap",
      "displayName": "Top Right Dust Flap",
      "isGlue": false,
      "labelLayout": {
        "text": "top-right\ndust-flap",
        "x": 411.7,
        "y": 99,
        "fontSize": 15,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": "right-panel",
      "foldId": "page-fold-top-right-dust-flap",
      "foldAngleDeg": -180,
      "path": "M 355.75 127.1 L 355.75 115.76 L 358.58 112.93 L 361.42 110.1 L 372.05 70.41 L 455 70.41 L 459.21 118.6 L 467.72 127.1 Z",
      "labelPosition": [
        411.7,
        99
      ],
      "displayLabel": "top-right\ndust-flap",
      "sourceId": "top-right-dust-flap",
      "meshD": "M 355.75 127.1 L 355.75 115.76 L 358.58 112.93 L 361.42 110.1 L 372.05 70.41 L 455 70.41 L 459.21 118.6 L 467.72 127.1 Z",
      "pathId": "panel-top-right-dust-flap",
      "clipPathId": "clip-top-right-dust-flap",
      "objectId": ""
    },
    {
      "id": "right-panel",
      "label": "right-panel",
      "type": "panel",
      "standardName": "right-panel",
      "displayName": "Right Panel",
      "isGlue": false,
      "labelLayout": {
        "text": "right-panel",
        "x": 411,
        "y": 212,
        "fontSize": 20,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": "front-panel",
      "foldId": "page-fold-ver-r",
      "foldAngleDeg": -90,
      "path": "M 354.33 127.1 L 467.72 127.1 L 467.72 297.18 L 354.33 297.18 Z",
      "labelPosition": [
        411,
        212
      ],
      "displayLabel": "right-panel",
      "sourceId": "right-panel",
      "meshD": "M 354.33 127.1 L 467.72 127.1 L 467.72 297.18 L 354.33 297.18 Z",
      "pathId": "panel-right-panel",
      "clipPathId": "clip-right-panel",
      "objectId": ""
    },
    {
      "id": "right-glue-flap",
      "label": "right-glue-flap",
      "type": "glue-flap",
      "standardName": "right-glue-flap",
      "displayName": "Right Glue Flap",
      "isGlue": true,
      "labelLayout": {
        "text": "right-glue-flap",
        "x": 482,
        "y": 212,
        "fontSize": 20,
        "rotationDeg": 270,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": "right-panel",
      "foldId": "page-fold-glue-vert-left",
      "foldAngleDeg": -90,
      "path": "M 467.72 128.52 L 496.06 133.52 L 496.06 290.77 L 467.72 295.76 Z",
      "labelPosition": [
        482,
        212
      ],
      "displayLabel": "right-glue-flap",
      "sourceId": "right-glue-flap",
      "meshD": "M 467.72 128.52 L 496.06 133.52 L 496.06 290.77 L 467.72 295.76 Z",
      "pathId": "panel-right-glue-flap",
      "clipPathId": "clip-right-glue-flap",
      "objectId": ""
    },
    {
      "id": "bottom-panel",
      "label": "bottom-panel",
      "type": "panel",
      "standardName": "bottom-panel",
      "displayName": "Bottom Panel",
      "isGlue": false,
      "labelLayout": {
        "text": "bottom-panel",
        "x": 283.46,
        "y": 637,
        "fontSize": 20,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": "back-panel",
      "foldId": "page-fold-hor-2",
      "foldAngleDeg": 90,
      "path": "M 212.6 297.18 L 354.33 297.18 L 354.33 410.57 L 212.6 410.57 Z",
      "labelPosition": [
        283.46,
        637
      ],
      "displayLabel": "bottom-panel",
      "sourceId": "bottom-panel",
      "meshD": "M 212.6 297.18 L 354.33 297.18 L 354.33 410.57 L 212.6 410.57 Z",
      "pathId": "panel-bottom-panel",
      "clipPathId": "clip-bottom-panel",
      "objectId": ""
    },
    {
      "id": "back-panel",
      "label": "back-panel",
      "type": "panel",
      "standardName": "back-panel",
      "displayName": "Back Panel",
      "isGlue": false,
      "labelLayout": {
        "text": "back-panel",
        "x": 283.46,
        "y": 495,
        "fontSize": 20,
        "rotationDeg": 180,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": null,
      "foldId": null,
      "foldAngleDeg": 0,
      "path": "M 212.6 410.57 L 354.33 410.57 L 354.33 580.65 L 212.6 580.65 Z",
      "sourceId": "back-panel",
      "displayLabel": "back-panel",
      "labelPosition": [
        283.46,
        495
      ],
      "meshD": "M 212.6 410.57 L 354.33 410.57 L 354.33 580.65 L 212.6 580.65 Z",
      "pathId": "panel-back-panel",
      "clipPathId": "clip-back-panel",
      "objectId": ""
    },
    {
      "id": "top-panel",
      "label": "top-panel",
      "type": "panel",
      "standardName": "top-panel",
      "displayName": "Top Panel",
      "isGlue": false,
      "labelLayout": {
        "text": "top-panel",
        "x": 283.46,
        "y": 212,
        "fontSize": 20,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": "back-panel",
      "foldId": "page-fold-hor-1",
      "foldAngleDeg": 90,
      "path": "M 212.6 580.65 L 354.33 580.65 L 354.33 694.03 L 212.6 694.03 Z",
      "labelPosition": [
        283.46,
        212
      ],
      "displayLabel": "top-panel",
      "sourceId": "top-panel",
      "meshD": "M 212.6 580.65 L 354.33 580.65 L 354.33 694.03 L 212.6 694.03 Z",
      "pathId": "panel-top-panel",
      "clipPathId": "clip-top-panel",
      "objectId": ""
    },
    {
      "id": "tuck-flap",
      "label": "tuck-flap",
      "type": "panel",
      "standardName": "tuck-flap",
      "displayName": "Tuck Flap",
      "isGlue": false,
      "labelLayout": {
        "text": "tuck-flap",
        "x": 283.46,
        "y": 716,
        "fontSize": 20,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": "top-panel",
      "foldId": "page-fold-tuck-fold",
      "foldAngleDeg": -180,
      "path": "M 212.6 694.03 L 226.77 694.03 L 229.61 691.2 L 337.32 691.2 L 340.16 694.03 L 354.33 694.03 L 352.91 706.79 A 28.35 28.35 0 0 1 324.57 735.13 L 242.36 735.13 A 28.35 28.35 0 0 1 214.02 706.79 Z",
      "labelPosition": [
        283.46,
        716
      ],
      "displayLabel": "tuck-flap",
      "sourceId": "tuck-flap",
      "meshD": "M 212.6 694.03 L 226.77 694.03 L 229.61 691.2 L 337.32 691.2 L 340.16 694.03 L 354.33 694.03 L 352.91 706.79 A 28.35 28.35 0 0 1 324.57 735.13 L 242.36 735.13 A 28.35 28.35 0 0 1 214.02 706.79 Z",
      "pathId": "panel-tuck-flap",
      "clipPathId": "clip-tuck-flap",
      "objectId": ""
    },
    {
      "id": "bottom-left-glue-flap",
      "label": "bottom-left\nglue-flap",
      "type": "glue-flap",
      "standardName": "bottom-left-glue-flap",
      "displayName": "bottom-left-glue-flap",
      "isGlue": true,
      "labelLayout": {
        "text": "bottom-left\nglue-flap",
        "x": 151,
        "y": 311,
        "fontSize": 10,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": "left-panel",
      "foldId": "page-fold-glue-hor-left",
      "foldAngleDeg": 90,
      "path": "M 99.21 297.18 L 212.6 297.18 L 206.18 325.53 L 99.21 325.53 Z",
      "sourceId": "bottom-left-glue-flap",
      "labelPosition": [
        151,
        311
      ],
      "displayLabel": "bottom-left\nglue-flap",
      "meshD": "M 99.21 297.18 L 212.6 297.18 L 206.18 325.53 L 99.21 325.53 Z",
      "pathId": "panel-bottom-left-glue-flap",
      "clipPathId": "clip-bottom-left-glue-flap",
      "objectId": ""
    },
    {
      "id": "bottom-right-glue-flap",
      "label": "bottom-right\nglue-flap",
      "type": "glue-flap",
      "standardName": "bottom-right-glue-flap",
      "displayName": "bottom-right-glue-flap",
      "isGlue": true,
      "labelLayout": {
        "text": "bottom-right\nglue-flap",
        "x": 415,
        "y": 311,
        "fontSize": 10,
        "rotationDeg": 0,
        "maxWidth": 0,
        "lineHeight": 1.2
      },
      "foldParent": "right-panel",
      "foldId": "page-fold-glue-hor-left",
      "foldAngleDeg": -90,
      "path": "M 354.33 297.18 L 467.72 297.18 L 467.72 325.53 L 360.75 325.53 Z",
      "sourceId": "bottom-right-glue-flap",
      "labelPosition": [
        415,
        311
      ],
      "displayLabel": "bottom-right\nglue-flap",
      "meshD": "M 354.33 297.18 L 467.72 297.18 L 467.72 325.53 L 360.75 325.53 Z",
      "pathId": "panel-bottom-right-glue-flap",
      "clipPathId": "clip-bottom-right-glue-flap",
      "objectId": ""
    }
  ],
  "folds": [
    {
      "id": "page-fold-top-left-dust-flap",
      "d": "M 99.21 127.1 L 211.18 127.1"
    },
    {
      "id": "page-fold-top-right-dust-flap",
      "d": "M 355.75 127.1 L 467.72 127.1"
    },
    {
      "id": "page-fold-top-panel",
      "d": "M 212.6 297.18 L 354.33 297.18"
    },
    {
      "id": "page-fold-hor-1",
      "d": "M 212.6 580.65 L 354.33 580.65"
    },
    {
      "id": "page-fold-hor-2",
      "d": "M 354.33 410.57 L 212.6 410.57"
    },
    {
      "id": "page-fold-glue-hor-left",
      "d": "M 99.21 297.18 L 467.72 297.18"
    },
    {
      "id": "page-fold-glue-vert-left",
      "d": "M 467.72 297.18 L 467.72 127.1"
    },
    {
      "id": "page-fold-dust-r",
      "d": "M 467.72 127.1 L 354.33 127.1"
    },
    {
      "id": "page-fold-dust-l",
      "d": "M 212.6 127.1 L 99.21 127.1"
    },
    {
      "id": "page-fold-glue-vert-right",
      "d": "M 99.21 127.1 L 99.21 297.18"
    },
    {
      "id": "page-fold-ver-l",
      "d": "M 212.6 297.18 L 212.6 127.1"
    },
    {
      "id": "page-fold-ver-r",
      "d": "M 354.33 127.1 L 354.33 297.18"
    },
    {
      "id": "page-fold-tuck-fold",
      "d": "M 229.61 691.2 L 337.32 691.2"
    }
  ],
  "cutPaths": [
    {
      "id": "page-cut-tuck",
      "d": "M 212.6 694.03 L 226.77 694.03 L 229.61 691.2"
    },
    {
      "id": "page-cut-tuck-slit2",
      "d": "M 337.32 691.2 L 340.16 694.03 L 354.33 694.03"
    },
    {
      "id": "page-cut-tuck-slitlock-tuck",
      "d": "M 214.02 694.03 L 214.02 706.79 A 28.35 28.35 0 0 0 242.36 735.13 L 324.57 735.13 A 28.35 28.35 0 0 0 352.91 706.79 L 352.91 694.03"
    },
    {
      "id": "page-cut-front-left",
      "d": "M 354.33 694.03 L 354.33 580.65 L 354.33 410.57 L 354.33 297.18"
    },
    {
      "id": "page-cut-left",
      "d": "M 354.33 297.18 L 355.75 297.18 L 360.75 325.53 L 467.72 325.53 L 467.72 297.18 L 467.72 295.76 L 496.06 290.77 L 496.06 133.52 L 467.72 128.52 L 467.72 127.1"
    },
    {
      "id": "page-cut-north",
      "d": "M 467.72 127.1 L 459.21 118.6 L 455.0 70.41 L 372.05 70.41 L 361.42 110.1 L 358.58 112.93 L 355.75 115.76 L 355.75 127.1 L 354.33 127.1 L 304.72 127.1 L 304.72 127.1 A 21.26 21.26 0 0 1 283.46 148.36 L 283.46 148.36 A 0.0 0.0 0 0 0 283.46 148.36 L 283.46 148.36 A 21.26 21.26 0 0 1 262.2 127.1 L 262.2 127.1 L 212.6 127.1 L 211.18 127.1 L 211.18 115.76 L 208.34 112.93 L 205.51 110.1 L 194.88 70.41 L 111.93 70.41 L 107.71 118.6 L 99.21 127.1"
    },
    {
      "id": "page-cut-right",
      "d": "M 99.21 127.1 L 99.21 128.52 L 70.87 133.52 L 70.87 290.77 L 99.21 295.76 L 99.21 297.18 L 99.21 325.53 L 206.18 325.53 L 211.18 297.18 L 212.6 297.18"
    },
    {
      "id": "page-cut-front-right",
      "d": "M 212.6 297.18 L 212.6 410.57 L 212.6 580.65 L 212.6 694.03"
    }
  ]
}
  ]]></metadata>

  <defs>
    <clipPath id="clip-top-left-dust-flap"><path d="M 99.21 127.1 L 107.71 118.6 L 111.93 70.41 L 194.88 70.41 L 205.51 110.1 L 208.34 112.93 L 211.18 115.76 L 211.18 127.1 Z"/></clipPath>
    <clipPath id="clip-left-glue-flap"><path d="M 70.87 133.52 L 99.21 128.52 L 99.21 295.76 L 70.87 290.77 Z"/></clipPath>
    <clipPath id="clip-left-panel"><path d="M 99.21 127.1 L 212.6 127.1 L 212.6 297.18 L 99.21 297.18 Z"/></clipPath>
    <clipPath id="clip-front-panel"><path d="M 212.6 127.1 L 262.2 127.1 A 21.26 21.26 0 0 0 283.46 148.36 A 21.26 21.26 0 0 0 304.72 127.1 L 354.33 127.1 L 354.33 297.18 L 212.6 297.18 Z"/></clipPath>
    <clipPath id="clip-top-right-dust-flap"><path d="M 355.75 127.1 L 355.75 115.76 L 358.58 112.93 L 361.42 110.1 L 372.05 70.41 L 455 70.41 L 459.21 118.6 L 467.72 127.1 Z"/></clipPath>
    <clipPath id="clip-right-panel"><path d="M 354.33 127.1 L 467.72 127.1 L 467.72 297.18 L 354.33 297.18 Z"/></clipPath>
    <clipPath id="clip-right-glue-flap"><path d="M 467.72 128.52 L 496.06 133.52 L 496.06 290.77 L 467.72 295.76 Z"/></clipPath>
    <clipPath id="clip-bottom-panel"><path d="M 212.6 297.18 L 354.33 297.18 L 354.33 410.57 L 212.6 410.57 Z"/></clipPath>
    <clipPath id="clip-back-panel"><path d="M 212.6 410.57 L 354.33 410.57 L 354.33 580.65 L 212.6 580.65 Z"/></clipPath>
    <clipPath id="clip-top-panel"><path d="M 212.6 580.65 L 354.33 580.65 L 354.33 694.03 L 212.6 694.03 Z"/></clipPath>
    <clipPath id="clip-tuck-flap"><path d="M 212.6 694.03 L 226.77 694.03 L 229.61 691.2 L 337.32 691.2 L 340.16 694.03 L 354.33 694.03 L 352.91 706.79 A 28.35 28.35 0 0 1 324.57 735.13 L 242.36 735.13 A 28.35 28.35 0 0 1 214.02 706.79 Z"/></clipPath>
    <clipPath id="clip-bottom-left-glue-flap"><path d="M 99.21 297.18 L 212.6 297.18 L 206.18 325.53 L 99.21 325.53 Z"/></clipPath>
    <clipPath id="clip-bottom-right-glue-flap"><path d="M 354.33 297.18 L 467.72 297.18 L 467.72 325.53 L 360.75 325.53 Z"/></clipPath>
    <pattern id="glueHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="transparent"/>
      <line x1="0" y1="0" x2="0" y2="6" stroke="#74001D" stroke-width="1"/>
    </pattern>
    <style><![CDATA[
      .cut-line { fill: none; stroke: #74001D; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; shape-rendering: geometricPrecision; }
      .fold-line { fill: none; stroke: #00AEEF; stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; shape-rendering: geometricPrecision; }
      .glue-area { fill: url(#glueHatch); stroke: #74001D; stroke-width: 1; vector-effect: non-scaling-stroke; opacity: 0.75; }
      .panel-preview { fill: rgba(116, 0, 29, 0.07); stroke: none; }
      .label { font-family: Arial, sans-serif; font-size: 12px; fill: #333333; pointer-events: none; }
    ]]></style>
  </defs>

  <g id="panel-preview" data-box-role="panel-preview" visibility="hidden">
    <path id="preview-top-left-dust-flap" class="panel-preview" d="M 99.21 127.1 L 107.71 118.6 L 111.93 70.41 L 194.88 70.41 L 205.51 110.1 L 208.34 112.93 L 211.18 115.76 L 211.18 127.1 Z"/>
    <path id="preview-left-glue-flap" class="panel-preview" d="M 70.87 133.52 L 99.21 128.52 L 99.21 295.76 L 70.87 290.77 Z"/>
    <path id="preview-left-panel" class="panel-preview" d="M 99.21 127.1 L 212.6 127.1 L 212.6 297.18 L 99.21 297.18 Z"/>
    <path id="preview-front-panel" class="panel-preview" d="M 212.6 127.1 L 262.2 127.1 A 21.26 21.26 0 0 0 283.46 148.36 A 21.26 21.26 0 0 0 304.72 127.1 L 354.33 127.1 L 354.33 297.18 L 212.6 297.18 Z"/>
    <path id="preview-top-right-dust-flap" class="panel-preview" d="M 355.75 127.1 L 355.75 115.76 L 358.58 112.93 L 361.42 110.1 L 372.05 70.41 L 455 70.41 L 459.21 118.6 L 467.72 127.1 Z"/>
    <path id="preview-right-panel" class="panel-preview" d="M 354.33 127.1 L 467.72 127.1 L 467.72 297.18 L 354.33 297.18 Z"/>
    <path id="preview-right-glue-flap" class="panel-preview" d="M 467.72 128.52 L 496.06 133.52 L 496.06 290.77 L 467.72 295.76 Z"/>
    <path id="preview-bottom-panel" class="panel-preview" d="M 212.6 297.18 L 354.33 297.18 L 354.33 410.57 L 212.6 410.57 Z"/>
    <path id="preview-back-panel" class="panel-preview" d="M 212.6 410.57 L 354.33 410.57 L 354.33 580.65 L 212.6 580.65 Z"/>
    <path id="preview-top-panel" class="panel-preview" d="M 212.6 580.65 L 354.33 580.65 L 354.33 694.03 L 212.6 694.03 Z"/>
    <path id="preview-tuck-flap" class="panel-preview" d="M 212.6 694.03 L 226.77 694.03 L 229.61 691.2 L 337.32 691.2 L 340.16 694.03 L 354.33 694.03 L 352.91 706.79 A 28.35 28.35 0 0 1 324.57 735.13 L 242.36 735.13 A 28.35 28.35 0 0 1 214.02 706.79 Z"/>
    <path id="preview-bottom-left-glue-flap" class="panel-preview" d="M 99.21 297.18 L 212.6 297.18 L 206.18 325.53 L 99.21 325.53 Z"/>
    <path id="preview-bottom-right-glue-flap" class="panel-preview" d="M 354.33 297.18 L 467.72 297.18 L 467.72 325.53 L 360.75 325.53 Z"/>
  </g>

  <g id="dieline" data-box-role="dieline">
    <g id="cut-lines" class="cut-line" data-box-role="cut-lines">
      <path id="page-cut-tuck" data-box-role="cut-line" data-line-type="cut" d="M 212.6 694.03 L 226.77 694.03 L 229.61 691.2"/>
      <path id="page-cut-tuck-slit2" data-box-role="cut-line" data-line-type="cut" d="M 337.32 691.2 L 340.16 694.03 L 354.33 694.03"/>
      <path id="page-cut-tuck-slitlock-tuck" data-box-role="cut-line" data-line-type="cut" d="M 214.02 694.03 L 214.02 706.79 A 28.35 28.35 0 0 0 242.36 735.13 L 324.57 735.13 A 28.35 28.35 0 0 0 352.91 706.79 L 352.91 694.03"/>
      <path id="page-cut-front-left" data-box-role="cut-line" data-line-type="cut" d="M 354.33 694.03 L 354.33 580.65 L 354.33 410.57 L 354.33 297.18"/>
      <path id="page-cut-left" data-box-role="cut-line" data-line-type="cut" d="M 354.33 297.18 L 355.75 297.18 L 360.75 325.53 L 467.72 325.53 L 467.72 297.18 L 467.72 295.76 L 496.06 290.77 L 496.06 133.52 L 467.72 128.52 L 467.72 127.1"/>
      <path id="page-cut-north" data-box-role="cut-line" data-line-type="cut" d="M 467.72 127.1 L 459.21 118.6 L 455.0 70.41 L 372.05 70.41 L 361.42 110.1 L 358.58 112.93 L 355.75 115.76 L 355.75 127.1 L 354.33 127.1 L 304.72 127.1 L 304.72 127.1 A 21.26 21.26 0 0 1 283.46 148.36 L 283.46 148.36 A 0.0 0.0 0 0 0 283.46 148.36 L 283.46 148.36 A 21.26 21.26 0 0 1 262.2 127.1 L 262.2 127.1 L 212.6 127.1 L 211.18 127.1 L 211.18 115.76 L 208.34 112.93 L 205.51 110.1 L 194.88 70.41 L 111.93 70.41 L 107.71 118.6 L 99.21 127.1"/>
      <path id="page-cut-right" data-box-role="cut-line" data-line-type="cut" d="M 99.21 127.1 L 99.21 128.52 L 70.87 133.52 L 70.87 290.77 L 99.21 295.76 L 99.21 297.18 L 99.21 325.53 L 206.18 325.53 L 211.18 297.18 L 212.6 297.18"/>
      <path id="page-cut-front-right" data-box-role="cut-line" data-line-type="cut" d="M 212.6 297.18 L 212.6 410.57 L 212.6 580.65 L 212.6 694.03"/>
    </g>
    <g id="glue" class="glue-area" data-box-role="glue" visibility="hidden">
      <polygon id="glue-left" data-box-role="glue-area" data-panel-id="left-glue-flap" points="70.87,133.52 99.21,128.52 99.21,295.76 70.87,290.77"/>
      <polygon id="glue-right" data-box-role="glue-area" data-panel-id="right-glue-flap" points="467.72,128.52 496.06,133.52 496.06,290.77 467.72,295.76"/>
    </g>
    <g id="fold-lines" class="fold-line" data-box-role="fold-lines">
      <path id="page-fold-top-left-dust-flap" data-box-role="fold-line" data-line-type="fold" d="M 99.21 127.1 L 211.18 127.1"/>
      <path id="page-fold-top-right-dust-flap" data-box-role="fold-line" data-line-type="fold" d="M 355.75 127.1 L 467.72 127.1"/>
      <path id="page-fold-front-panel" data-box-role="fold-line" data-line-type="fold" d="M 212.6 297.18 L 354.33 297.18"/>
      <path id="page-fold-hor-1" data-box-role="fold-line" data-line-type="fold" d="M 212.6 580.65 L 354.33 580.65"/>
      <path id="page-fold-hor-2" data-box-role="fold-line" data-line-type="fold" d="M 354.33 410.57 L 212.6 410.57"/>
      <path id="page-fold-glue-hor-left" data-box-role="fold-line" data-line-type="fold" d="M 99.21 297.18 L 467.72 297.18"/>
      <path id="page-fold-glue-vert-left" data-box-role="fold-line" data-line-type="fold" d="M 467.72 297.18 L 467.72 127.1"/>
      <path id="page-fold-dust-r" data-box-role="fold-line" data-line-type="fold" d="M 467.72 127.1 L 354.33 127.1"/>
      <path id="page-fold-dust-l" data-box-role="fold-line" data-line-type="fold" d="M 212.6 127.1 L 99.21 127.1"/>
      <path id="page-fold-glue-vert-right" data-box-role="fold-line" data-line-type="fold" d="M 99.21 127.1 L 99.21 297.18"/>
      <path id="page-fold-ver-l" data-box-role="fold-line" data-line-type="fold" d="M 212.6 297.18 L 212.6 127.1"/>
      <path id="page-fold-ver-r" data-box-role="fold-line" data-line-type="fold" d="M 354.33 127.1 L 354.33 297.18"/>
      <path id="page-fold-tuck-fold" data-box-role="fold-line" data-line-type="fold" d="M 229.61 691.2 L 337.32 691.2"/>
    </g>
  </g>

  <g id="labels" class="label" data-box-role="labels" visibility="hidden">
    <text x="155.2" y="99" text-anchor="middle" data-label-panel-id="top-left-dust-flap">top-left
dust-flap</text>
    <text x="85" y="212" text-anchor="middle" transform="rotate(90 85 212)" data-label-panel-id="left-glue-flap">left-glue-flap</text>
    <text x="155.9" y="212" text-anchor="middle" data-label-panel-id="left-panel">left-panel</text>
    <text x="283.46" y="354" text-anchor="middle" data-label-panel-id="front-panel">front-panel</text>
    <text x="411.7" y="99" text-anchor="middle" data-label-panel-id="top-right-dust-flap">top-right
dust-flap</text>
    <text x="411" y="212" text-anchor="middle" data-label-panel-id="right-panel">right-panel</text>
    <text x="482" y="212" text-anchor="middle" transform="rotate(270 482 212)" data-label-panel-id="right-glue-flap">right-glue-flap</text>
    <text x="283.46" y="637" text-anchor="middle" data-label-panel-id="bottom-panel">bottom-panel</text>
    <text x="283.46" y="495" text-anchor="middle" transform="rotate(180 283.46 495)" data-label-panel-id="back-panel">back-panel</text>
    <text x="283.46" y="212" text-anchor="middle" data-label-panel-id="top-panel">top-panel</text>
    <text x="283.46" y="716" text-anchor="middle" data-label-panel-id="tuck-flap">tuck-flap</text>
    <text x="151" y="311" text-anchor="middle" data-label-panel-id="bottom-left-glue-flap">bottom-left
glue-flap</text>
    <text x="415" y="311" text-anchor="middle" data-label-panel-id="bottom-right-glue-flap">bottom-right
glue-flap</text>
  </g>

  <g id="panels" data-box-role="panels" visibility="hidden">
    <path id="panel-top-left-dust-flap" data-box-role="panel" data-panel-id="top-left-dust-flap" data-panel-type="panel" data-panel-standard-name="top-left-dust-flap" data-panel-display-name="Top Left Dust Flap" data-panel-is-glue="false" data-fold-parent="left-panel" data-fold-id="page-fold-top-left-dust-flap" data-fold-angle-deg="-180" d="M 99.21 127.1 L 107.71 118.6 L 111.93 70.41 L 194.88 70.41 L 205.51 110.1 L 208.34 112.93 L 211.18 115.76 L 211.18 127.1 Z"/>
    <path id="panel-left-glue-flap" data-box-role="panel" data-panel-id="left-glue-flap" data-panel-type="glue-flap" data-panel-standard-name="left-glue-flap" data-panel-display-name="Left Glue Flap" data-panel-is-glue="true" data-fold-parent="left-panel" data-fold-id="page-fold-glue-vert-right" data-fold-angle-deg="90" d="M 70.87 133.52 L 99.21 128.52 L 99.21 295.76 L 70.87 290.77 Z"/>
    <path id="panel-left-panel" data-box-role="panel" data-panel-id="left-panel" data-panel-type="panel" data-panel-standard-name="left-panel" data-panel-display-name="Left Panel" data-panel-is-glue="false" data-fold-parent="front-panel" data-fold-id="page-fold-ver-l" data-fold-angle-deg="90" d="M 99.21 127.1 L 212.6 127.1 L 212.6 297.18 L 99.21 297.18 Z"/>
    <path id="panel-front-panel" data-box-role="panel" data-panel-id="front-panel" data-panel-type="panel" data-panel-standard-name="front-panel" data-panel-display-name="Front Panel" data-panel-is-glue="false" data-fold-parent="bottom-panel" data-fold-id="page-fold-front-panel" data-fold-angle-deg="90" d="M 212.6 127.1 L 262.2 127.1 A 21.26 21.26 0 0 0 283.46 148.36 A 21.26 21.26 0 0 0 304.72 127.1 L 354.33 127.1 L 354.33 297.18 L 212.6 297.18 Z"/>
    <path id="panel-top-right-dust-flap" data-box-role="panel" data-panel-id="top-right-dust-flap" data-panel-type="panel" data-panel-standard-name="top-right-dust-flap" data-panel-display-name="Top Right Dust Flap" data-panel-is-glue="false" data-fold-parent="right-panel" data-fold-id="page-fold-top-right-dust-flap" data-fold-angle-deg="-180" d="M 355.75 127.1 L 355.75 115.76 L 358.58 112.93 L 361.42 110.1 L 372.05 70.41 L 455 70.41 L 459.21 118.6 L 467.72 127.1 Z"/>
    <path id="panel-right-panel" data-box-role="panel" data-panel-id="right-panel" data-panel-type="panel" data-panel-standard-name="right-panel" data-panel-display-name="Right Panel" data-panel-is-glue="false" data-fold-parent="front-panel" data-fold-id="page-fold-ver-r" data-fold-angle-deg="-90" d="M 354.33 127.1 L 467.72 127.1 L 467.72 297.18 L 354.33 297.18 Z"/>
    <path id="panel-right-glue-flap" data-box-role="panel" data-panel-id="right-glue-flap" data-panel-type="glue-flap" data-panel-standard-name="right-glue-flap" data-panel-display-name="Right Glue Flap" data-panel-is-glue="true" data-fold-parent="right-panel" data-fold-id="page-fold-glue-vert-left" data-fold-angle-deg="-90" d="M 467.72 128.52 L 496.06 133.52 L 496.06 290.77 L 467.72 295.76 Z"/>
    <path id="panel-bottom-panel" data-box-role="panel" data-panel-id="bottom-panel" data-panel-type="panel" data-panel-standard-name="bottom-panel" data-panel-display-name="Bottom Panel" data-panel-is-glue="false" data-fold-parent="back-panel" data-fold-id="page-fold-hor-2" data-fold-angle-deg="90" d="M 212.6 297.18 L 354.33 297.18 L 354.33 410.57 L 212.6 410.57 Z"/>
    <path id="panel-back-panel" data-box-role="panel" data-panel-id="back-panel" data-panel-type="panel" data-panel-standard-name="back-panel" data-panel-display-name="Back Panel" data-panel-is-glue="false" data-fold-parent="" data-fold-id="" data-fold-angle-deg="0" d="M 212.6 410.57 L 354.33 410.57 L 354.33 580.65 L 212.6 580.65 Z"/>
    <path id="panel-top-panel" data-box-role="panel" data-panel-id="top-panel" data-panel-type="panel" data-panel-standard-name="top-panel" data-panel-display-name="Top Panel" data-panel-is-glue="false" data-fold-parent="back-panel" data-fold-id="page-fold-hor-1" data-fold-angle-deg="90" d="M 212.6 580.65 L 354.33 580.65 L 354.33 694.03 L 212.6 694.03 Z"/>
    <path id="panel-tuck-flap" data-box-role="panel" data-panel-id="tuck-flap" data-panel-type="panel" data-panel-standard-name="tuck-flap" data-panel-display-name="Tuck Flap" data-panel-is-glue="false" data-fold-parent="top-panel" data-fold-id="page-fold-tuck-fold" data-fold-angle-deg="-180" d="M 212.6 694.03 L 226.77 694.03 L 229.61 691.2 L 337.32 691.2 L 340.16 694.03 L 354.33 694.03 L 352.91 706.79 A 28.35 28.35 0 0 1 324.57 735.13 L 242.36 735.13 A 28.35 28.35 0 0 1 214.02 706.79 Z"/>
    <path id="panel-bottom-left-glue-flap" data-box-role="panel" data-panel-id="bottom-left-glue-flap" data-panel-type="glue-flap" data-panel-standard-name="bottom-left-glue-flap" data-panel-display-name="bottom-left-glue-flap" data-panel-is-glue="true" data-fold-parent="left-panel" data-fold-id="page-fold-glue-hor-left" data-fold-angle-deg="90" d="M 99.21 297.18 L 212.6 297.18 L 206.18 325.53 L 99.21 325.53 Z"/>
    <path id="panel-bottom-right-glue-flap" data-box-role="panel" data-panel-id="bottom-right-glue-flap" data-panel-type="glue-flap" data-panel-standard-name="bottom-right-glue-flap" data-panel-display-name="bottom-right-glue-flap" data-panel-is-glue="true" data-fold-parent="right-panel" data-fold-id="page-fold-glue-hor-left" data-fold-angle-deg="-90" d="M 354.33 297.18 L 467.72 297.18 L 467.72 325.53 L 360.75 325.53 Z"/>
  </g>

  <g id="artwork" data-box-role="artwork">
    <g id="artwork-top-left-dust-flap" data-box-role="artwork-panel" data-panel-id="top-left-dust-flap" clip-path="url(#clip-top-left-dust-flap)"/>
    <g id="artwork-left-glue-flap" data-box-role="artwork-panel" data-panel-id="left-glue-flap" clip-path="url(#clip-left-glue-flap)"/>
    <g id="artwork-left-panel" data-box-role="artwork-panel" data-panel-id="left-panel" clip-path="url(#clip-left-panel)"/>
    <g id="artwork-front-panel" data-box-role="artwork-panel" data-panel-id="front-panel" clip-path="url(#clip-front-panel)"/>
    <g id="artwork-top-right-dust-flap" data-box-role="artwork-panel" data-panel-id="top-right-dust-flap" clip-path="url(#clip-top-right-dust-flap)"/>
    <g id="artwork-right-panel" data-box-role="artwork-panel" data-panel-id="right-panel" clip-path="url(#clip-right-panel)"/>
    <g id="artwork-right-glue-flap" data-box-role="artwork-panel" data-panel-id="right-glue-flap" clip-path="url(#clip-right-glue-flap)"/>
    <g id="artwork-bottom-panel" data-box-role="artwork-panel" data-panel-id="bottom-panel" clip-path="url(#clip-bottom-panel)"/>
    <g id="artwork-back-panel" data-box-role="artwork-panel" data-panel-id="back-panel" clip-path="url(#clip-back-panel)"/>
    <g id="artwork-top-panel" data-box-role="artwork-panel" data-panel-id="top-panel" clip-path="url(#clip-top-panel)"/>
    <g id="artwork-tuck-flap" data-box-role="artwork-panel" data-panel-id="tuck-flap" clip-path="url(#clip-tuck-flap)"/>
    <g id="artwork-bottom-left-glue-flap" data-box-role="artwork-panel" data-panel-id="bottom-left-glue-flap" clip-path="url(#clip-bottom-left-glue-flap)"/>
    <g id="artwork-bottom-right-glue-flap" data-box-role="artwork-panel" data-panel-id="bottom-right-glue-flap" clip-path="url(#clip-bottom-right-glue-flap)"/>
  </g>
</svg>
`;


const SOURCE_DEFAULTS = {
  L: 50,
  W: 40,
  H: 60,
  TH: 15,
  TUCK: 15,
  GLUE: 10,
  A: 80,
  T: 0.5,
  R: 10
};

const SOURCE_X_BREAKPOINTS = [70.87, 99.21, 212.6, 354.33, 467.72, 496.06];
const SOURCE_Y_BREAKPOINTS = [70.41, 127.1, 297.18, 410.57, 580.65, 694.03, 735.13];
const SOURCE_THUMB_RADIUS = 21.26;
const SOURCE_GLUE_POINTS = {
  "left-glue-flap": "70.87,133.52 99.21,128.52 99.21,295.76 70.87,290.77",
  "right-glue-flap": "467.72,128.52 496.06,133.52 496.06,290.77 467.72,295.76"
};

function extractMetadataJson(svgText) {
  const match = String(svgText).match(/<metadata[^>]*><!\[CDATA\[\s*([\s\S]*?)\s*\]\]><\/metadata>/);
  if (!match) {
    throw new Error("Giftbox builder could not extract metadata from reference SVG.");
  }
  return JSON.parse(match[1]);
}

const SOURCE_METADATA = extractMetadataJson(giftboxSvgSource);

const GIFTBOX_PANEL_METADATA_FIXES = {
  "front-panel": {
    displayName: "Front Panel",
    labelText: "front-panel",
    labelPosition: [283.46, 212],
    rotationDeg: 0
  },
  "bottom-panel": {
    displayName: "Bottom Panel",
    labelText: "bottom-panel",
    labelPosition: [283.46, 354],
    rotationDeg: 0
  },
  "back-panel": {
    displayName: "Back Panel",
    labelText: "back-panel",
    labelPosition: [283.46, 495],
    rotationDeg: 180
  },
  "top-panel": {
    displayName: "Top Panel",
    labelText: "top-panel",
    labelPosition: [283.46, 637],
    rotationDeg: 180
  }
};

const GIFTBOX_ASSEMBLED_DEFAULTS = {
  viewName: "custom",
  modelCenter: [283.495, 368.276, 85.76],
  cameraPosition: [-176.555, -478.123, 494.846],
  cameraTarget: [283.465, 402.77, 0.981],
  cameraOffset: [-460.05, -846.399, 409.086],
  targetOffset: [-0.03, 34.494, -84.779]
};

const SOURCE_PANELS = SOURCE_METADATA.panels.map(panel => ({
  id: panel.id,
  displayName: GIFTBOX_PANEL_METADATA_FIXES[panel.id]?.displayName || panel.displayName || panel.id,
  standardName: panel.standardName || panel.id,
  type: panel.type || "panel",
  isGlue: Boolean(panel.isGlue),
  parent: panel.foldParent || null,
  foldId: panel.foldId || "",
  angle: Number(panel.foldAngleDeg) || 0,
  d: panel.path,
  meshD: panel.meshD || panel.path,
  labelText: GIFTBOX_PANEL_METADATA_FIXES[panel.id]?.labelText || panel.labelLayout?.text || panel.label || panel.id,
  labelPosition: Array.isArray(GIFTBOX_PANEL_METADATA_FIXES[panel.id]?.labelPosition)
    ? GIFTBOX_PANEL_METADATA_FIXES[panel.id].labelPosition
    : (Array.isArray(panel.labelPosition) ? panel.labelPosition : [0, 0]),
  rotationDeg: GIFTBOX_PANEL_METADATA_FIXES[panel.id]?.rotationDeg ?? (Number(panel.labelLayout?.rotationDeg) || 0),
  fontSize: Number(panel.labelLayout?.fontSize) || 12
}));

const SOURCE_CUT_PATHS = new Map(
  (SOURCE_METADATA.cutPaths || []).map(path => [path.id, path.d])
);

const TEMPLATE_DEFINITION = {
  id: "giftbox",
  name: "Gift Box",
  icon: "icon-giftbox",
  title: "Gift Box Template",
  summary: "Procedurally generated gift box dieline with tuck flap, thumb notch, and glue flaps.",
  defaults: { L: 50, W: 40, H: 60, TH: 15, TUCK: 15, GLUE: 10, A: 80, T: 0.5, R: 10 },
  metadataDimensionMap: {
    L: "length",
    W: "width",
    H: "height"
  },
  custom3d: {
    swapArtworkFaces: true,
    camera: {
      flatView: "top",
      foldedView: "front",
      facingPanel: "front-panel",
      flatPadding: 1.1,
      foldedPadding: 1.2,
      foldedState: GIFTBOX_ASSEMBLED_DEFAULTS
    }
  },
  fieldGroups: {
    primary: [
      { key: "L", label: "Length", kind: "length", min: 1, step: 0.1 },
      { key: "W", label: "Width", kind: "length", min: 1, step: 0.1 },
      { key: "H", label: "Height", kind: "length", min: 1, step: 0.1 }
    ],
    optional: [
      { key: "TH", label: "Thumb Hole Diameter", kind: "length", min: 0, step: 0.1 },
      { key: "TUCK", label: "Tuck Flap Size", kind: "length", min: 0, step: 0.1 },
      { key: "GLUE", label: "Glue Flap Size", kind: "length", min: 0, step: 0.1 },
      { key: "A", label: "Glue Flap Angle", kind: "angle", min: 0, max: 89, step: 1 },
      { key: "T", label: "Material Thickness", kind: "length", min: 0, step: 0.1 },
      { key: "R", label: "Rounded Corners Radius", kind: "length", min: 0, step: 0.1 }
    ]
  },
  parametricRule: { xKeys: ["GLUE", "W", "L", "TH"], yKeys: ["DUST", "H", "GLUE", "W", "TUCK"] },
  panels: [
    { id: "top-left-dust-flap", displayName: "Top Left Dust Flap", standardName: "top-left-dust-flap", type: "panel", isGlue: false, foldParent: "left-panel", foldId: "page-fold-top-left-dust-flap", foldAngleDeg: -90 },
    { id: "left-glue-flap", displayName: "Left Glue Flap", standardName: "left-glue-flap", type: "glue-flap", isGlue: true, foldParent: "left-panel", foldId: "page-fold-glue-vert-right", foldAngleDeg: 90 },
    { id: "left-panel", displayName: "Left Panel", standardName: "left-panel", type: "panel", isGlue: false, foldParent: "front-panel", foldId: "page-fold-ver-l", foldAngleDeg: 90 },
    { id: "front-panel", displayName: "Front Panel", standardName: "front-panel", type: "panel", isGlue: false, foldParent: "bottom-panel", foldId: "page-fold-front-panel", foldAngleDeg: -90 },
    { id: "top-right-dust-flap", displayName: "Top Right Dust Flap", standardName: "top-right-dust-flap", type: "panel", isGlue: false, foldParent: "right-panel", foldId: "page-fold-top-right-dust-flap", foldAngleDeg: -90 },
    { id: "right-panel", displayName: "Right Panel", standardName: "right-panel", type: "panel", isGlue: false, foldParent: "front-panel", foldId: "page-fold-ver-r", foldAngleDeg: -90 },
    { id: "right-glue-flap", displayName: "Right Glue Flap", standardName: "right-glue-flap", type: "glue-flap", isGlue: true, foldParent: "right-panel", foldId: "page-fold-glue-vert-left", foldAngleDeg: -90 },
    { id: "bottom-panel", displayName: "Bottom Panel", standardName: "bottom-panel", type: "panel", isGlue: false, foldParent: "back-panel", foldId: "page-fold-hor-2", foldAngleDeg: -90 },
    { id: "back-panel", displayName: "Back Panel", standardName: "back-panel", type: "panel", isGlue: false, foldParent: null, foldId: null, foldAngleDeg: 0 },
    { id: "top-panel", displayName: "Top Panel", standardName: "top-panel", type: "panel", isGlue: false, foldParent: "back-panel", foldId: "page-fold-hor-1", foldAngleDeg: 90 },
    { id: "tuck-flap", displayName: "Tuck Flap", standardName: "tuck-flap", type: "panel", isGlue: false, foldParent: "top-panel", foldId: "page-fold-tuck-fold", foldAngleDeg: 90 },
    { id: "bottom-left-glue-flap", displayName: "bottom-left-glue-flap", standardName: "bottom-left-glue-flap", type: "glue-flap", isGlue: true, foldParent: "left-panel", foldId: "page-fold-glue-hor-left", foldAngleDeg: 90 },
    { id: "bottom-right-glue-flap", displayName: "bottom-right-glue-flap", standardName: "bottom-right-glue-flap", type: "glue-flap", isGlue: true, foldParent: "right-panel", foldId: "page-fold-glue-hor-right", foldAngleDeg: 90 }
  ]
};

const SOURCE_FOLDS = [
  { id: "page-fold-top-left-dust-flap", from: "left-panel", to: "top-left-dust-flap", d: "M 99.21 127.1 L 211.18 127.1", angleDeg: -90, displayName: "left-panel to top-left-dust-flap" },
  { id: "page-fold-glue-vert-right", from: "left-panel", to: "left-glue-flap", d: "M 99.21 127.1 L 99.21 297.18", angleDeg: 90, displayName: "left-panel to left-glue-flap" },
  { id: "page-fold-ver-l", from: "front-panel", to: "left-panel", d: "M 212.6 297.18 L 212.6 127.1", angleDeg: 90, displayName: "front-panel to left-panel" },
  { id: "page-fold-front-panel", from: "bottom-panel", to: "front-panel", d: "M 212.6 297.18 L 354.33 297.18", angleDeg: -90, displayName: "bottom-panel to front-panel" },
  { id: "page-fold-top-right-dust-flap", from: "right-panel", to: "top-right-dust-flap", d: "M 355.75 127.1 L 467.72 127.1", angleDeg: -90, displayName: "right-panel to top-right-dust-flap" },
  { id: "page-fold-ver-r", from: "front-panel", to: "right-panel", d: "M 354.33 127.1 L 354.33 297.18", angleDeg: -90, displayName: "front-panel to right-panel" },
  { id: "page-fold-glue-vert-left", from: "right-panel", to: "right-glue-flap", d: "M 467.72 297.18 L 467.72 127.1", angleDeg: -90, displayName: "right-panel to right-glue-flap" },
  { id: "page-fold-hor-2", from: "back-panel", to: "bottom-panel", d: "M 354.33 410.57 L 212.6 410.57", angleDeg: -90, displayName: "back-panel to bottom-panel" },
  { id: "page-fold-hor-1", from: "back-panel", to: "top-panel", d: "M 212.6 580.65 L 354.33 580.65", angleDeg: 90, displayName: "back-panel to top-panel" },
  { id: "page-fold-tuck-fold", from: "top-panel", to: "tuck-flap", d: "M 229.61 691.2 L 337.32 691.2", angleDeg: 90, displayName: "top-panel to tuck-flap" },
  { id: "page-fold-glue-hor-left", from: "left-panel", to: "bottom-left-glue-flap", d: "M 99.21 297.18 L 212.6 297.18", angleDeg: 90, displayName: "left-panel to bottom-left-glue-flap" },
  { id: "page-fold-glue-hor-right", from: "right-panel", to: "bottom-right-glue-flap", d: "M 354.33 297.18 L 467.72 297.18", angleDeg: 90, displayName: "right-panel to bottom-right-glue-flap" }
];

const GIFTBOX_FOLD_SEQUENCE = [
  "page-fold-glue-hor-right",
  "page-fold-glue-hor-left",
  "page-fold-glue-vert-left",
  "page-fold-glue-vert-right",
  "page-fold-top-right-dust-flap",
  "page-fold-top-left-dust-flap",
  "page-fold-ver-l",
  "page-fold-ver-r",
  "page-fold-hor-2",
  "page-fold-front-panel",
  "page-fold-tuck-fold",
  "page-fold-hor-1"
];

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
      const [x, y] = entry.split(",").map(Number);
      return `${roundValue(xWarp(x))},${roundValue(yWarp(y))}`;
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
        throw new Error(`Unsupported SVG path command in giftbox builder: ${command}`);
    }
  }

  return out.join(" ");
}

function buildTopThumbNotchSegment(startX, endX, topY, centerX, radius) {
  if (radius <= 0.001) {
    return `L ${roundValue(endX)} ${roundValue(topY)}`;
  }

  const forward = endX >= startX;
  const shoulderLeft = centerX - radius;
  const shoulderRight = centerX + radius;
  const apexY = topY + radius;
  const firstShoulder = forward ? shoulderLeft : shoulderRight;
  const secondShoulder = forward ? shoulderRight : shoulderLeft;
  const direction = forward ? 1 : -1;
  const cpDx = radius * 0.55 * direction;
  const cpDy = radius * 0.92;

  return [
    `L ${roundValue(firstShoulder)} ${roundValue(topY)}`,
    `C ${roundValue(firstShoulder + cpDx)} ${roundValue(topY)} ${roundValue(centerX - cpDx)} ${roundValue(apexY)} ${roundValue(centerX)} ${roundValue(apexY)}`,
    `C ${roundValue(centerX + cpDx)} ${roundValue(apexY)} ${roundValue(secondShoulder - cpDx)} ${roundValue(topY)} ${roundValue(secondShoulder)} ${roundValue(topY)}`,
    `L ${roundValue(endX)} ${roundValue(topY)}`
  ].join(" ");
}

function buildFrontPanelPath(xWarp, yWarp, thumbRadius) {
  const left = warpPoint([212.6, 127.1], xWarp, yWarp);
  const right = warpPoint([354.33, 127.1], xWarp, yWarp);
  const bottomRight = warpPoint([354.33, 297.18], xWarp, yWarp);
  const bottomLeft = warpPoint([212.6, 297.18], xWarp, yWarp);
  const centerX = roundValue(xWarp(283.46));

  return [
    `M ${left[0]} ${left[1]}`,
    buildTopThumbNotchSegment(left[0], right[0], left[1], centerX, thumbRadius),
    `L ${bottomRight[0]} ${bottomRight[1]}`,
    `L ${bottomLeft[0]} ${bottomLeft[1]}`,
    "Z"
  ].join(" ");
}

function buildNorthCutPath(xWarp, yWarp, thumbRadius) {
  const points = [
    [467.72, 127.1],
    [459.21, 118.6],
    [455.0, 70.41],
    [372.05, 70.41],
    [361.42, 110.1],
    [358.58, 112.93],
    [355.75, 115.76],
    [355.75, 127.1],
    [354.33, 127.1]
  ].map(point => warpPoint(point, xWarp, yWarp));
  const centerX = roundValue(xWarp(283.46));
  const topY = roundValue(yWarp(127.1));
  const tail = [
    [211.18, 127.1],
    [211.18, 115.76],
    [208.34, 112.93],
    [205.51, 110.1],
    [194.88, 70.41],
    [111.93, 70.41],
    [107.71, 118.6],
    [99.21, 127.1]
  ].map(point => warpPoint(point, xWarp, yWarp));

  return [
    `M ${points[0][0]} ${points[0][1]}`,
    ...points.slice(1).map(point => `L ${point[0]} ${point[1]}`),
    buildTopThumbNotchSegment(points[8][0], roundValue(xWarp(212.6)), topY, centerX, thumbRadius),
    ...tail.map(point => `L ${point[0]} ${point[1]}`)
  ].join(" ");
}

function buildGiftboxGeometry(params, template) {
  const L = Math.max(1, Number(params.L) || template.defaults.L);
  const W = Math.max(1, Number(params.W) || template.defaults.W);
  const H = Math.max(1, Number(params.H) || template.defaults.H);
  const TH = Math.max(0, Number(params.TH) || template.defaults.TH);
  const TUCK = Math.max(0, Number(params.TUCK) || template.defaults.TUCK);
  const GLUE = Math.max(0, Number(params.GLUE) || template.defaults.GLUE);
  const A = clamp(Number(params.A) || template.defaults.A, 0, 89);
  const T = Math.max(0, Number(params.T) || template.defaults.T);
  const R = Math.max(0, Number(params.R) || template.defaults.R);

  const xWarp = createIntervalWarp(SOURCE_X_BREAKPOINTS, [
    (SOURCE_X_BREAKPOINTS[1] - SOURCE_X_BREAKPOINTS[0]) * (GLUE / SOURCE_DEFAULTS.GLUE),
    (SOURCE_X_BREAKPOINTS[2] - SOURCE_X_BREAKPOINTS[1]) * (W / SOURCE_DEFAULTS.W),
    (SOURCE_X_BREAKPOINTS[3] - SOURCE_X_BREAKPOINTS[2]) * (L / SOURCE_DEFAULTS.L),
    (SOURCE_X_BREAKPOINTS[4] - SOURCE_X_BREAKPOINTS[3]) * (W / SOURCE_DEFAULTS.W),
    (SOURCE_X_BREAKPOINTS[5] - SOURCE_X_BREAKPOINTS[4]) * (GLUE / SOURCE_DEFAULTS.GLUE)
  ]);
  const yWarp = createIntervalWarp(SOURCE_Y_BREAKPOINTS, [
    (SOURCE_Y_BREAKPOINTS[1] - SOURCE_Y_BREAKPOINTS[0]) * (W / SOURCE_DEFAULTS.W),
    (SOURCE_Y_BREAKPOINTS[2] - SOURCE_Y_BREAKPOINTS[1]) * (H / SOURCE_DEFAULTS.H),
    (SOURCE_Y_BREAKPOINTS[3] - SOURCE_Y_BREAKPOINTS[2]) * (W / SOURCE_DEFAULTS.W),
    (SOURCE_Y_BREAKPOINTS[4] - SOURCE_Y_BREAKPOINTS[3]) * (H / SOURCE_DEFAULTS.H),
    (SOURCE_Y_BREAKPOINTS[5] - SOURCE_Y_BREAKPOINTS[4]) * (W / SOURCE_DEFAULTS.W),
    (SOURCE_Y_BREAKPOINTS[6] - SOURCE_Y_BREAKPOINTS[5]) * (TUCK / SOURCE_DEFAULTS.TUCK)
  ]);

  const thumbScale = TH > 0 ? TH / SOURCE_DEFAULTS.TH : 0;
  const thumbRadius = SOURCE_THUMB_RADIUS * thumbScale;
  const labelScale = Math.sqrt((L / SOURCE_DEFAULTS.L) * (H / SOURCE_DEFAULTS.H));

  const panels = SOURCE_PANELS.map(panel => {
    const warpedLabel = warpPoint(panel.labelPosition, xWarp.warp, yWarp.warp);
    const d = panel.id === "front-panel"
      ? buildFrontPanelPath(xWarp.warp, yWarp.warp, thumbRadius)
      : warpPathData(panel.d, xWarp.warp, yWarp.warp, xWarp.scaleAt, yWarp.scaleAt);
    const displayName = panel.displayName;
    const labelText = panel.labelText;
    const rotationDeg = panel.rotationDeg;

    return {
      id: panel.id,
      standardName: panel.standardName,
      displayName,
      label: labelText,
      type: panel.type,
      isGlue: panel.isGlue,
      parent: panel.parent,
      foldId: panel.id === "bottom-right-glue-flap" ? "page-fold-glue-hor-right" : panel.foldId,
      angle: panel.angle,
      d,
      meshD: panel.id === "front-panel"
        ? d
        : warpPathData(panel.meshD, xWarp.warp, yWarp.warp, xWarp.scaleAt, yWarp.scaleAt),
      labelPosition: warpedLabel,
      labelLayout: {
        text: labelText,
        x: warpedLabel[0],
        y: warpedLabel[1],
        fontSize: roundValue(clamp(panel.fontSize * labelScale, 7, 30)),
        rotationDeg,
        maxWidth: 0,
        lineHeight: 1.2
      },
      objectId: ""
    };
  });

  const folds = SOURCE_FOLDS.map(fold => ({
    id: fold.id,
    from: fold.from,
    to: fold.to,
    d: warpPathData(fold.d, xWarp.warp, yWarp.warp, xWarp.scaleAt, yWarp.scaleAt),
    angleDeg: fold.angleDeg,
    displayName: fold.displayName
  }));

  const cutPathOrder = [
    "page-cut-tuck",
    "page-cut-tuck-slitlock-tuck",
    "page-cut-tuck-slit2",
    "page-cut-front-left",
    "page-cut-left",
    "page-cut-north",
    "page-cut-right",
    "page-cut-front-right"
  ];
  const outlineD = cutPathOrder.map(id => {
    if (id === "page-cut-north") {
      return buildNorthCutPath(xWarp.warp, yWarp.warp, thumbRadius);
    }
    return warpPathData(SOURCE_CUT_PATHS.get(id) || "", xWarp.warp, yWarp.warp, xWarp.scaleAt, yWarp.scaleAt);
  }).join(" ");

  const geometry = {
    pageW: roundValue(xWarp.warp(566)),
    pageH: roundValue(yWarp.warp(806)),
    outlineD,
    slitD: "",
    lockCutoutD: "",
    panels,
    folds,
    foldSequence: GIFTBOX_FOLD_SEQUENCE,
    glueAreas: [
      { id: "glue-left", points: warpPointsString(SOURCE_GLUE_POINTS["left-glue-flap"], xWarp.warp, yWarp.warp) },
      { id: "glue-right", points: warpPointsString(SOURCE_GLUE_POINTS["right-glue-flap"], xWarp.warp, yWarp.warp) }
    ],
    rootPanel: "back-panel",
    rootPanels: ["back-panel"],
    floorPanel: "bottom-panel",
    assembledDefaults: GIFTBOX_ASSEMBLED_DEFAULTS,
    custom3d: { ...(template.custom3d || {}) },
    floorFoldId: "",
    floorFoldDistribution: null,
    flatSheetD: "",
    __cacheKey: JSON.stringify({
      templateId: "giftbox",
      dimensions: {
        L: roundValue(L),
        W: roundValue(W),
        H: roundValue(H),
        TH: roundValue(TH),
        TUCK: roundValue(TUCK),
        GLUE: roundValue(GLUE),
        A: roundValue(A),
        T: roundValue(T),
        R: roundValue(R)
      }
    })
  };

  const metadataJson = buildMetadataJson(
    template,
    geometry,
    { length: L, width: W, height: H },
    {
      thumbHoleWidth: TH,
      tuckFlapSize: TUCK,
      glueFlapSize: GLUE,
      dustFlapAngle: A,
      materialThickness: T,
      roundedCornersRadius: R
    },
    "static/template-builders/giftbox.js"
  );

  return {
    svgText: renderStructuredSvg(template, geometry, metadataJson),
    metadata: metadataJson,
    geometry
  };
}

export default createProceduralTemplateBuilder(TEMPLATE_DEFINITION, buildGiftboxGeometry);
