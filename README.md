<<<<<<< HEAD
# Exhibition Wall Mockup Maker

by @tiagomartinspinto.

Web app for creating measured exhibition wall mockups with 2D construction guides, clean 3D previews, object alignment tools, and A3 PNG export.

## Run locally

```sh
npm start
```

Then visit:

```txt
http://127.0.0.1:4175
```

The local server uses `PORT` when provided, otherwise it defaults to `4175`.

## Deploy on Render

Create a new Render Web Service and use:

```txt
Build Command: npm install
Start Command: npm start
```

Render will provide the `PORT` environment variable automatically.

## What works now

- Wall width, height, depth, and color in millimeters.
- Project title for the exhibition.
- Exhibition space dimensions for room-level planning.
- Floor, surrounding, and cinematic light controls for preview scenes.
- Multiple wall tabs in one project.
- Move walls around in the 2D exhibition space plan.
- Add artworks, screens, labels, text, illumination, shelves, and openings.
- Upload artwork/images and place them on the wall.
- Auto-generated object IDs for drawings and schedules.
- Rectangular and circular object shapes.
- 2D measured elevation with object dimensions, zoom, and draggable positioning.
- Compact 2D labels with object size and x/y position.
- Always-visible 2D x/y position guide lines from the wall edges to each object.
- Shift-click multi-select in 2D or in the object list.
- Align selected objects left, center, right, top, middle, bottom, or distribute spacing.
- Snap guides while dragging or resizing.
- Basic resize handle for selected objects.
- Leader-line callouts when labels are cramped or near the preview edge.
- 3-axis wall 3D preview with zoom, mouse drag rotation, X/Y/Z buttons, and object-name-only labels.
- Whole-project Space 2D and true Space 3D overview views.
- Overlap detection in the object list and 2D preview.
- Contrast-aware measurement labels for light and dark wall colors.
- Export A3 PNG at 300 dpi resolution for construction reference.
- Print / Save as PDF through the browser print dialog.
- Object schedule included on A3 handoff sheets.

## Good next steps

- Export a print-ready PDF with scale and object schedule.
- Save multiple projects.
- Add wall openings/doors as editable space-planning elements.
=======
# exhibitionwallmockupmaker
>>>>>>> 6d80300dadf8e37ed67c24cab07da93a2a7114cb
