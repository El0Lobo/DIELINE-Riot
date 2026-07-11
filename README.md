# DIELINE Riot

DIELINE Riot is a browser-based dieline builder for creating customizable packaging nets. It combines a structured 2D SVG workspace with a synchronized 3D folding preview, artwork tools, and print-ready SVG export.

The project is a static web application: there is no build step, backend, or package installation required.

## Features

- Parametric templates for boxes, mailers, envelopes, tags, cards, buttons, and other packaging formats
- Measurements in millimetres or centimetres, with millimetres kept as the canonical internal unit
- Live structured SVG preview with inside and outside artwork surfaces
- Interactive 3D preview with paper textures, material thickness, and fold progress
- Artwork tools for text, images, freehand drawing, layout, and custom fonts
- Editable fold directions and assembly animation steps
- Panel labels and fills for inspecting template structure
- Standard and print-ready SVG downloads, plus copy-to-clipboard output
- SVG metadata describing panels, folds, and artwork relationships

## Run locally

DIELINE Riot uses JavaScript modules, so serve the repository over HTTP instead of opening `index.html` directly.

With Python:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

You can use any other static file server as well. An internet connection is currently required to load Three.js and its addons from unpkg.

## Basic workflow

1. Choose a template from the template bar.
2. Enter the required dimensions and adjust any optional construction settings.
3. Select the preview stock, texture scale, and material thickness.
4. Inspect the generated net in the 2D workspace and switch between its outside and inside surfaces.
5. Open the layout tools to add and position artwork, text, or images on individual panels.
6. Use the folded model to verify the result and adjust the fold sequence if needed.
7. Download the SVG, copy its markup, or use **Export Print-Ready SVG** for cleaned production artwork.

## Project structure

```text
.
├── index.html                    # Application shell and controls
└── static/
    ├── app.js                    # UI state, editing, previews, and export workflow
    ├── artwork-engine.js         # Artwork processing helpers
    ├── svg-generator.js          # Structured SVG generation
    ├── three-engine.js           # Three.js folded-model preview
    ├── style.css                 # Application styling
    ├── template-builders/        # Parametric template definitions
    ├── templates/                # Source structured SVG templates
    ├── papertypes/               # Preview material textures
    ├── assets/                   # Branding and visual assets
    ├── fonts/                    # Bundled fonts
    └── vendor/                   # Vendored browser modules
```

## Adding or changing templates

Parametric templates live in `static/template-builders/`. Each builder defines its identity, input fields, defaults, panels, geometry, and fold behavior. Export the builder from `static/template-builders/index.js` to make it available in the interface.

Some templates also reference structured source files in `static/templates/`. Keep panel and fold identifiers stable when editing these files because the artwork editor, 3D preview, and exported metadata use them to relate the flat net to the folded model.

## Browser notes

A current desktop browser with JavaScript modules, SVG, Canvas, and WebGL support is recommended. Loading fonts installed on the local system uses the permission-gated Local Font Access API where available; users can also import supported font files (`.ttf`, `.otf`, `.woff`, or `.woff2`) through the interface.

## Technology

- HTML, CSS, and vanilla JavaScript modules
- SVG for dieline generation and artwork
- [Three.js](https://threejs.org/) for the interactive folded preview

