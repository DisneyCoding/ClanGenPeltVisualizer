# ClanGen Pelt Visualizer

A GitHub Pages-ready browser tool for recoloring ClanGen-style cat pose lineart using a pelt-part mask atlas.

## Folder structure

```text
clangen-pelt-visualizer/
├── index.html
├── style.css
├── script.js
├── data.js
├── colors.js
└── assets/
    ├── lineart.png
    └── pelt_parts_masks.png
```

## Important

The two PNG files are intentionally not included because they are the artwork assets from your project. Put your existing `lineart.png` and `pelt_parts_masks.png` in `assets/`.

`colors.js` currently contains the complete color-parameter structure and the `WHITE` preset that was supplied earlier. Add the remaining ClanGen presets to `PELT_COLORS` when you have the full JSON available.

`data.js` includes a safe 42-pattern/pose scaffold so the site can load. Replace its generic pattern/pose labels and atlas coordinates with your exact `data.js` if you have that file already; the renderer expects each pattern to have `index`, `groupX`, and `groupY`, and each pose to have `index`.

## GitHub Pages

Upload the folder to a GitHub repository and enable GitHub Pages for the branch/folder containing `index.html`. Because this is a client-only ES-module site, no server or build step is required.
