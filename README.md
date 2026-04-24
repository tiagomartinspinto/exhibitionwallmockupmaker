# Exhibition Wall Mockup Maker

by [@tiagomartinspinto](https://github.com/tiagomartinspinto)

Live site: [tiagomartinspinto.github.io/exhibitionwallmockupmaker](https://tiagomartinspinto.github.io/exhibitionwallmockupmaker/)

Exhibition Wall Mockup Maker is a browser-based planning tool for exhibition designers, artists, and museum teams who need to turn wall ideas into clear install-ready layouts.

It combines measured 2D wall drawings, room planning, 3D previews, drag-and-drop editing, and PDF export in one static web app.

## What it is for

Use it to:

- plan one or many exhibition walls inside the same project
- place text, screens, printed graphics, physical objects, and support elements
- test wall compositions inside an exhibition room
- check overlaps before installation
- export readable wall drawings for production and construction teams

## Main features

- multi-wall projects with tabs
- editable wall size, depth, color, and placement in millimeters
- floor-plan view for the exhibition room
- 3D wall preview and 3D room preview
- drag, resize, align, distribute, zoom, and pan tools
- image uploads shown in both 2D and 3D
- PDF export for active wall drawings and room plans
- snapshot PDF export from the current preview
- dark and light interface modes

## Live app

[Open the app](https://tiagomartinspinto.github.io/exhibitionwallmockupmaker/)

## Run locally

This project is fully static. Any simple local server works.

```sh
python3 -m http.server 4175
```

Then open:

```txt
http://127.0.0.1:4175
```

## GitHub Pages

The site is published directly from the repository root through GitHub Pages.

Current live URL:

```txt
https://tiagomartinspinto.github.io/exhibitionwallmockupmaker/
```

Recommended Pages settings:

1. Open `Settings`
2. Go to `Pages`
3. Set source to `Deploy from a branch`
4. Choose `main`
5. Choose `/ (root)`

## Project structure

```txt
index.html         App markup
css/styles.css     App styling
js/core.js         Shared globals and DOM references
js/model.js        State and data helpers
js/rendering.js    2D and 3D drawing logic
js/ui.js           UI rendering helpers
js/interactions.js Selection, drag, zoom, pan, persistence
js/export.js       PDF and snapshot export
js/boot.js         Startup and event wiring
```

## Tech

- HTML
- CSS
- vanilla JavaScript
- HTML canvas
- GitHub Pages

No framework, no build step, no backend.

## Notes

- Measurements are handled in millimeters.
- The live editing view is intentionally cleaner than the exported construction PDF.
- The app stores working state in the browser, so projects remain local to the device/browser unless exported.

## Repository

[github.com/tiagomartinspinto/exhibitionwallmockupmaker](https://github.com/tiagomartinspinto/exhibitionwallmockupmaker)
