# Project Status

## Current state

Exhibition Wall Mockup Maker is a static browser app for planning exhibition walls, room layouts, measured PDFs, and presentation snapshots.

Live site:

- [https://tiagomartinspinto.github.io/exhibitionwallmockupmaker/](https://tiagomartinspinto.github.io/exhibitionwallmockupmaker/)

## Shipping status

- GitHub Pages deployment is in place.
- Local recovery and explicit project save/open are in place.
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

- Final product-design refinement pass focused on clarity, restraint, first-use calm, and canvas dominance
- Primary flow now reads more clearly as Project, Wall, Object, Export, with rare file, wall, view, layout, and export actions behind disclosures
- App wording now uses room items, cutouts, shelves/supports, wall sheets, recovery, and install notes instead of placeholder/admin terminology
- Toolbar and sidebar chrome are lighter, with softer borders, reduced button weight, tighter visible controls, and more space between major sections
- Export PDFs now use a cleaner installation-document title block, stronger project/title hierarchy, calmer metadata placement, and simpler object/room labels
- Calm design refinement pass for sidebar hierarchy, toolbar grouping, starter/empty states, wording, and PDF styling
- Advanced wall placement, media/install notes, guide tools, arrange tools, and export notes now use progressive disclosure
- Keyboard nudge UI refresh fix so selected object X/Y fields and object list update immediately after arrow-key moves
- Regression coverage for keyboard nudge editor sync
- Undo/redo for wall objects, room items, and wall-level changes
- Undo/Redo UI buttons in the view toolbar
- Keyboard shortcuts for delete, duplicate, nudge, escape, and undo/redo
- Confirmation dialogs for clear objects, clear room items, delete wall, reset wall, and sample/demo reset
- Large image and large project file warnings
- Import validation coverage for malformed, partial, and older project files
- Unsaved changes indicator aligned with explicit file saves
- Clear recovery flow with confirmation
- Accessibility label/title pass for icon-only controls
- README manual QA checklist and public-repo safety notes

## Latest verification

- Local browser QA verified 1000px wide layout with two-column app, no horizontal overflow, disclosure-based export/layout controls, and no old placeholder/admin labels visible
- Local browser QA verified 390px mobile layout with no horizontal overflow and preserved toolbar disclosure hierarchy
- Local browser QA verified Export and Layout disclosures reveal the expected controls, and Room 3D hides 2D layout tools while showing rotate controls
- Local browser screenshot capture saved wide and mobile references to `/private/tmp/ewmm-final-product-design-desktop-full.jpg` and `/private/tmp/ewmm-final-product-design-mobile.jpg`
- PDF download event verification was not available in the browser surface; PDF changes were verified through code review and script syntax checks
- Local import/normalization regression tests pass
- Browser script syntax checks pass for all app scripts
- Local browser QA verified duplicate, delete, escape, nudge, undo, and redo keyboard flows
- Local browser QA verified canvas drag and resize with undo/redo
- Local browser QA verified wall add, wall switching, and toolbar undo/redo around wall history
- Local browser design QA verified desktop layout, 390px mobile layout without horizontal overflow, toolbar disclosures, and guide/arrange visibility across 2D/3D views

## Public repo safety

- Local-only project artifacts are excluded through `.gitignore`
- Repo checks fail if private-style project artifacts are tracked
- The app does not upload project data

## Recommended next checks

- Verify the latest keyboard, drag, resize, and wall-switching flows once more on the deployed GitHub Pages site after pushing
- Verify large-image warnings with an intentionally big embedded image in a desktop browser
- Verify project open/save on GitHub Pages in a Chromium-based browser with native file picker support
- Verify confirmation prompts on clear/reset/delete flows in the live app
