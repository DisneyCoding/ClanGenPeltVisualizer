# ClanGen Pelt Visualizer

A GitHub Pages prototype for experimenting with ClanGen pelt masks.

## Current features

- Uses the supplied ClanGen `lineart.png`.
- Uses the supplied ClanGen `pelt_parts_masks.png`.
- Selects individual 50x50 ClanGen poses.
- Selects the 42 individual pelt-part mask groups.
- Applies hex colors to masks in the browser.
- Add/remove/reorder/enable/disable layers.
- Change layer opacity.
- Save/load pelt configurations as JSON.
- Export the preview as a PNG.
- Randomize a pelt.

## Important asset layout

ClanGen's current pose data uses a 4x8 sprite layout, with 50x50 sprites. The pelt mask atlas is organized into 200x400 groups, each containing the same 4x8 pose layout.

This prototype therefore treats:

- one pose = 50x50 pixels
- one pelt mask group = 200x400 pixels
- mask group position = pattern index in a 10-column atlas

## GitHub Pages

Upload this entire folder to a GitHub repository and enable GitHub Pages for the branch/folder containing `index.html`.

No server is required. Everything happens in the browser.

## Next development steps

1. Organize masks into user-friendly categories.
2. Add ClanGen's actual pelt color palettes.
3. Add white patches, tortie, eyes, skin, scars, accessories, and other sprite layers.
4. Add thumbnails for patterns.
5. Add pattern compatibility rules.
6. Add a proper custom pattern editor.
7. Add export/import formats appropriate for the intended ClanGen workflow.
