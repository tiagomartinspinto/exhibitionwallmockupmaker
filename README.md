# Exhibition Wall Mockup Maker

Browser-based exhibition planning for measured wall layouts, room planning, and quick visual mockups.

Live app: [tiagomartinspinto.github.io/exhibitionwallmockupmaker](https://tiagomartinspinto.github.io/exhibitionwallmockupmaker/)

Created by [@tiagomartinspinto](https://github.com/tiagomartinspinto)

## Overview

Exhibition Wall Mockup Maker is a static web app for planning exhibition walls and rooms in a way that is visual enough for design review and clear enough for installation prep.

It brings together:

- measured 2D wall layouts
- room floor plans
- 3D wall and room previews
- room placeholders with width, depth, and height
- drag-and-drop editing
- image placement on wall objects
- local project save and reopen
- PDF export for technical and presentation use

## What you can do

- create projects with multiple walls
- define wall width, height, depth, color, and placement in the room
- place title text, explanatory text, screens, graphics, objects, and supports
- drag, resize, align, and distribute objects on the wall
- zoom and pan in 2D views with a hand tool
- use rulers and drag-out guides in the 2D wall view
- inspect the wall in 3D and preview the full exhibition room
- define room placeholders as simple volumes so the floor plan and room 3D stay in sync
- upload images and preview them in both 2D and 3D
- save a project file locally on your machine and reopen it later
- keep working with browser autosave in the background
- export measured PDFs for the active wall and room plan
- export cleaner snapshot PDFs from the current preview

## Who it is for

- exhibition designers
- artists preparing installation layouts
- curators and producers reviewing wall compositions
- museum and fabrication teams who need readable setup references

## Live site

[Open the app](https://tiagomartinspinto.github.io/exhibitionwallmockupmaker/)

## Local preview

This project is fully static. Any simple local server works.

```sh
python3 -m http.server 4175
```

Then open:

```txt
http://127.0.0.1:4175
```

## Project files

The app supports explicit project files in addition to browser autosave.

- `Save` saves the current project
- `Save as` lets you choose a new local file
- `Open` loads a previously saved project
- `Clear local autosave` removes only this browser's recovery copy after confirmation
- browser autosave keeps a local working copy in the background
- when a real project file handle is available, the app also autosaves back to that file on a calmer timer
- the interface shows the timestamp of the last save
- guides are saved per wall and can be reused when reopening a project

Project files are stored as JSON on the user's machine.

On Chromium-based browsers, the app can use the browser's native file picker for a smoother save/open flow. On browsers without that support, it falls back to download/upload behavior.

## Privacy and data safety

This app does not upload project data. Files stay in your browser/local JSON unless you manually export or share them.

Exported `.ewmm` / JSON / PDF files may contain sensitive project information such as room layouts, object names, dimensions, images, and unpublished exhibition details. Share them carefully.

Browser autosave is local to the current browser profile. Clearing browser storage or using the in-app `Clear local autosave` action removes that recovery copy, but does not delete the project currently open in memory and does not delete any JSON file you already saved to disk.

## Deployment and repo safety

The live app is published with GitHub Pages from `main`.

This repository also includes a GitHub Action that runs on push and pull request to check:

- browser script syntax
- presence of the app CSP
- safe external link attributes (`rel="noopener noreferrer"`)
- absence of unsandboxed iframe usage
- absence of local/private project artifacts in tracked files

Recommended local-only directories and project artifacts are excluded in `.gitignore`, including:

- `*.ewmm`
- `*.ewmm.json`
- `exports/`
- `private/`
- `local-projects/`

## Project structure

```txt
index.html         App shell and markup
css/styles.css     Interface styling
js/core.js         Shared globals and DOM references
js/course-data.js  Shared object/placeholder config and sample data
js/model.js        State model and wall/item helpers
js/rendering.js    2D and 3D canvas rendering
js/ui.js           UI rendering helpers
js/interactions.js Selection, dragging, zoom, pan, persistence
js/export.js       PDF and snapshot export
js/boot.js         Startup and event wiring
```

## Stack

- HTML
- CSS
- vanilla JavaScript
- HTML canvas
- GitHub Pages

No framework, no build step, no backend.

## Notes

- All planning dimensions are handled in millimeters.
- The live editing view is intentionally cleaner than the export PDF.
- Working data is stored in browser local storage for autosave.
- Projects can also be explicitly saved as local JSON files and reopened later.
- The app does not currently use iframes. If embeds are added later, they should be sandboxed deliberately.

## Repository

[github.com/tiagomartinspinto/exhibitionwallmockupmaker](https://github.com/tiagomartinspinto/exhibitionwallmockupmaker)
