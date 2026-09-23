# Project Status

## Current state

Exhibition Wall Mockup Maker is a static browser app for planning exhibition walls, room layouts, measured PDFs, and presentation snapshots.

Live site:

- [https://tiagomartinspinto.github.io/exhibitionwallmockupmaker/](https://tiagomartinspinto.github.io/exhibitionwallmockupmaker/)

## Design and safety review (2026-09-23)

### Completed

- Design review against canvas-tool patterns (single reserved accent, 4/8px spacing rhythm, flat hairline chrome, weight-led hierarchy, 40px+ touch targets, product/canvas as the protagonist)
- Active tab/tool/toggle borders now follow the theme accent, so selected states are visible in light mode (previously hard-coded to the dark-theme color)
- Focus ring is now a solid, high-contrast color in both themes
- Sidebar spacing moved onto a 4/8px rhythm; app name reduced so the project title and canvas lead the hierarchy
- Object panel shows position and size before the Appearance and Text & install disclosures; position labels now read `Left edge mm` / `Bottom edge mm`, matching wall-sheet wording
- Closed disclosures no longer reserve empty space; toolbar View/Layout/Export summaries align with the Tools group
- On screens up to 920px wide the canvas and toolbar come first and the editing panel follows below
- Touch devices get 40px minimum tool and view buttons
- Canvas status line reads clearly over rulers and suggests next steps on an empty wall side
- View switcher and tool buttons expose their state with `aria-pressed`
- Opened project files are sanitized: colors must be `#rrggbb`, IDs are bounded strings, and images must be embedded `data:image/...` (remote image URLs are dropped, so shared files cannot trigger network requests)
- Item and room-item list rows escape every interpolated value
- Startup error screen renders the error message as text, not HTML
- CSP no longer allows remote `https:` images; the ignored `frame-ancestors` meta directive was removed
- `.gitignore` also covers PDFs, env files, editor folders, and temporary files
- Regression test for hostile project values (HTML in IDs/colors, remote image URLs)

### Fixed during pre-commit verification (2026-09-23)

- Toggling light/dark mode no longer marks the project as unsaved or triggers a project-file autosave; the theme is still remembered in local recovery
- Legacy single-wall project files (top-level `wall`/`items`, version 1-2) now open correctly; previously they were ignored and the previously open walls stayed on screen
- A damaged project file is rejected with a friendly message and the open project is kept intact (previously a mid-load error could leave it half-replaced)
- Opened files also validate wall/room colors, wall dimensions and placement, view name, project text fields, and skip `null`/non-object entries
- `Clear recovery` now stays cleared: closing or reloading the tab no longer re-creates the recovery copy until the next edit or project open
- First click on an object or room item `Remove` button after editing a field now works (lists are no longer rebuilt when nothing changed)
- Guide show/hide button now updates its highlighted and `aria-pressed` state immediately
- Canvas status line starts clear of the vertical ruler
- Touch devices get 40px minimum height on all buttons and disclosure summaries (previously only tool/view buttons); links now show the focus ring
- Asset cache-busting version bumped to `2026-09-23-3`
- Regression tests added for each fix above

### Verification results (2026-09-23, local Chromium via Playwright)

- Import/round-trip: current v6, legacy v1 and v2, partial, wrong-type, 20-object, hostile, and damaged fixtures; walls, objects, embedded images, guides, room items, metadata, and notes survive open/save/reopen unchanged
- Malformed, `null`, array, non-project, and walls-not-array files show friendly errors
- Security: HTML/script values render as text; `http://`, `https://`, protocol-relative, `javascript:`, and `blob:` image sources are dropped; `data:image/...` images load; no network requests while opening hostile files; CSP blocks injected inline scripts, handlers, remote scripts, styles, images, frames, and fetch
- Layout at 1440, 1000, 921, 920, and 390px in both themes: no horizontal overflow, canvas-first at 920px and below, disclosures stay in view, focus ring on every tab stop, touch targets 40px+ on coarse pointers
- Interaction: add, rename while typing, drag move, handle resize, duplicate, delete, undo/redo (keyboard and toolbar), arrow and Shift+arrow nudge, Escape, wall-side switch, room item add/edit/remove, guides, theme, save, save copy (download and native picker), open, recovery, clear recovery, empty-side hint
- PDFs generated and inspected for wall sheet, all walls, room plan, labels, installation package, and snapshots in all four views: valid (`qpdf --check`), A3 landscape, expected page counts, project/wall/room metadata, dimensions, object codes and names, and footers present; filenames are slugged from project and wall names

### Remaining tasks

- Consider rewriting the 4 early commits authored with a local machine hostname e-mail (history rewrite is optional and requires force-push)
- Older history still contains an old tooling-specific workflow branch filter and error-message wording; current files are clean (history rewrite optional)
- Consider a compact horizontal layout for View/Layout/Export disclosures on phones (they currently stack)
- Consider making PDF text selectable/searchable (PDFs are rasterized canvas images today)

### Known issues

- Dragging the bottom-right resize handle downward shrinks the object (the handle moves the top edge vertically); consider anchoring the top edge instead
- Switching view, wall, wall side, zoom, or tool still marks the project as unsaved because view state is stored in the project file
- Opening a project file applies the theme saved in that file
- Clearing guides is not part of undo history
- Room plan PDFs use the project floor color, which prints as a large dark area with the default colors
- Snapshot PDFs are rendered at A4 proportions but placed on an A3 page box (same aspect ratio, so no distortion)
- Canvas labels can overlap at small zoom levels on narrow screens (pre-existing rendering behavior)
- Clickjacking protection (`frame-ancestors`) cannot be set from a `<meta>` tag; GitHub Pages does not allow custom headers. Risk is low because all data is local.
- Images picked through the file input are accepted only when the browser reports an image MIME type
- Browser verification ran in Chromium only; Safari and Firefox were not exercised

## Shipping status

- GitHub Pages deployment is in place.
- Local recovery and explicit project save/open are in place.
- Measured wall and room PDF export are in place.
- Production metadata, object label PDFs, and combined installation package PDFs are in place.
- 2D wall guides and rulers are in place.
- 3D wall and room previews are in place.
- Privacy/data-safety notes are present in the app and README.
- Export/share warnings are present near save/export actions.
- Destructive actions now use confirmation dialogs before clearing or resetting project content.
- Undo and Redo toolbar buttons are present in the live editing UI.
- Icon-only controls now include accessibility labels and useful titles.
- Repo checks run on push and pull request.

## Latest polish delivered

- Museum-production workflow pass for installation sheets, project metadata, print-ready labels, package exports, production notes, scale confidence, and technician usability
- Project files now preserve venue, install dates, prepared-by, revision, and project-wide production notes
- Export menu now includes object label sheets and a combined installation package with cover sheet, room plan, wall sheets, and labels
- Installation PDFs now carry production metadata, revision/prepared details, and scale-confidence footer guidance for technicians
- Package cover sheets summarize contents, production flags, site checks, and project notes
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

- Import/normalization tests now cover production metadata round-tripping through project snapshots
- Local browser QA verified production metadata controls, label/package export buttons, cache-busted assets, and no old admin-style labels visible
- Local browser QA verified 390px mobile production layout without horizontal overflow
- Local browser QA verified 1000px wide layout with two-column app, no horizontal overflow, disclosure-based export/layout controls, and no old placeholder/admin labels visible
- Local browser QA verified 390px mobile layout with no horizontal overflow and preserved toolbar disclosure hierarchy
- Local browser QA verified Export and Layout disclosures reveal the expected controls, and Room 3D hides 2D layout tools while showing rotate controls
- Local browser screenshot capture of wide and mobile layouts was reviewed (screenshots kept outside the repo)
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
- Opened project files cannot load remote images; imported colors, IDs, and images are validated
- No secrets, credentials, analytics, or remote scripts are present in tracked files or history

## Recommended next checks

- Verify the latest keyboard, drag, resize, and wall-switching flows once more on the deployed GitHub Pages site after pushing
- Verify large-image warnings with an intentionally big embedded image in a desktop browser
- Verify project open/save on GitHub Pages in a Chromium-based browser with native file picker support
- Verify confirmation prompts on clear/reset/delete flows in the live app
