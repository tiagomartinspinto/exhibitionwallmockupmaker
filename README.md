# Exhibition Wall Mockup Maker

by [@tiagomartinspinto](https://github.com/tiagomartinspinto)

Exhibition Wall Mockup Maker is a web app for planning exhibition walls and rooms with clean 2D measured drawings, 3D previews, object placement tools, and PDF exports for construction handoff.

## What it does

- Build multiple walls inside one exhibition project
- Edit wall dimensions, depth, color, and room placement in millimeters
- Place text blocks, screens, graphics, objects, and support elements
- Upload images and preview them in both 2D and 3D
- Drag, align, distribute, resize, and zoom while working
- View the active wall in 2D and 3D
- View the full room as a floor plan and 3D room preview
- Export measured wall PDFs and room plan PDFs
- Export simple snapshot PDFs from the live preview

## Run locally

```sh
npm start
```

Then open:

```txt
http://127.0.0.1:4175
```

The server uses `PORT` when provided and falls back to `4175`.

`server.js` is only for local use, so you can run the app with `npm start` instead of setting up a separate static server by hand. It is not part of the hosted app on GitHub Pages.

## Deploy on GitHub Pages

This repo now includes a GitHub Actions workflow that deploys the app to GitHub Pages whenever `main` is updated.

Expected site URL:

```txt
https://tiagomartinspinto.github.io/exhibitionwallmockupmaker/
```

To enable it in GitHub:

1. Open the repository settings
2. Go to `Pages`
3. Set the source to `GitHub Actions`
4. Push to `main`

After that, GitHub Pages will publish the static app directly from the repo.

## Stack

- Single-page HTML/CSS/JavaScript app
- Small Node HTTP server for local development only
- No framework dependency required

## Repository

[https://github.com/tiagomartinspinto/exhibitionwallmockupmaker](https://github.com/tiagomartinspinto/exhibitionwallmockupmaker)
