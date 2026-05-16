# Project Status

## Current state

Exhibition Wall Mockup Maker is a static browser app for planning exhibition walls, room layouts, measured PDFs, and presentation snapshots.

Live site:

- [https://tiagomartinspinto.github.io/exhibitionwallmockupmaker/](https://tiagomartinspinto.github.io/exhibitionwallmockupmaker/)

## Shipping status

- GitHub Pages deployment is in place.
- Local autosave and explicit project save/open are in place.
- Measured wall and room PDF export are in place.
- 2D wall guides and rulers are in place.
- 3D wall and room previews are in place.
- Privacy/data-safety notes are present in the app and README.
- Export/share warnings are present near save/export actions.
- Destructive actions now use confirmation dialogs before clearing or resetting project content.
- Undo and Redo toolbar buttons are present in the live editing UI.
- Icon-only controls now include accessibility labels and useful titles.
- Repo checks run on push and pull request.

## Latest polish delivered

- Undo/redo for wall objects, room placeholders, and wall-level changes
- Undo/Redo UI buttons in the view toolbar
- Keyboard shortcuts for delete, duplicate, nudge, escape, and undo/redo
- Confirmation dialogs for clear objects, clear room placeholders, delete wall, reset wall, and sample/demo reset
- Large image and large project file warnings
- Import validation coverage for malformed, partial, and older project files
- Unsaved changes indicator aligned with explicit file saves
- Clear local autosave flow with confirmation
- Accessibility label/title pass for icon-only controls
- README manual QA checklist and public-repo safety notes

## Public repo safety

- Local-only project artifacts are excluded through `.gitignore`
- Repo checks fail if private-style project artifacts are tracked
- The app does not upload project data

## Recommended next checks

- Verify the latest keyboard shortcuts in the live app
- Verify undo/redo around drag, resize, and wall switching
- Verify large-image warnings with an intentionally big embedded image
- Verify project open/save on GitHub Pages in a Chromium-based browser
- Verify confirmation prompts on clear/reset/delete flows in the live app
