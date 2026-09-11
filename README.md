# ClanGen Pelt Visualizer

This is a GitHub Pages that will generate pelts, pelt patterns, and pelt colors, all within your browser!! 

Something that isn't included are the base game pelts, so those colors won't show. Torties are also not avaliable.

If you want to save the PNG of the Cat, click "Download PNG" and if you wanted to save the JSON of the cat, then click "Save" and you can load saved cats by clicking "Load" and picking the save file.

The save files will look something like this:

```json
{
  "poseIndex": 18,
  "colors": {
    "base": "#D76707",
    "base_gradient_bottom": "#CFFB97",
    "base_gradient_top": "#E33100",
    "pattern": "#02C68E",
    "pattern_gradient_top": "#A522A5",
    "pattern_fill": "#393BA1",
    "masked_light_pattern": "#6FD10C",
    "newborn_base": "#08CEC5",
    "newborn_base_gradient_bottom": "#6978C0",
    "newborn_base_gradient_top": "#138661",
    "newborn_pattern": "#7BDC43",
    "newborn_pattern_gradient_top": "#A0BA78",
    "newborn_pattern_fill": "#BDE9A0",
    "smoke_base": "#9E0D1C",
    "smoke_base_gradient_top": "#3F7A99",
    "smoke_base_gradient_bottom": "#22E026",
    "smoke_pattern": "#05AA24",
    "smoke_pattern_gradient_top": "#E4FA69",
    "freckled_pattern_gradient_top": "#C2BE86",
    "exotic_base": "#587B20",
    "exotic_base_gradient_bottom": "#8B5D2F",
    "exotic_base_gradient_top": "#D46ECA",
    "exotic_pattern": "#CA5CE5",
    "exotic_pattern_gradient_top": "#3CFD40",
    "exotic_pattern_fill": "#817065",
    "exotic_pattern_fill_gradient_top": "#F3CB3C",
    "exotic_light_pattern": "#A9B451",
    "exotic_muzzle": "#490E22",
    "newborn_exotic_base": "#8EE07E",
    "newborn_exotic_base_gradient_bottom": "#AE424D",
    "newborn_exotic_base_gradient_top": "#14E245",
    "newborn_exotic_pattern": "#E7E50F",
    "newborn_exotic_pattern_gradient_top": "#9880AF",
    "newborn_exotic_pattern_fill": "#9C7DC4",
    "newborn_exotic_pattern_fill_gradient_top": "#09872B",
    "newborn_exotic_light_pattern": "#0D9190",
    "newborn_exotic_muzzle": "#38BBBF"
  },
  "layers": [
    {
      "patternIndex": 0,
      "colorCategory": "base"
    },
    {
      "patternIndex": 27,
      "colorCategory": "exotic_muzzle"
    }
  ]
}
```

PoseIndex is the pose of the cat, usually no need to use this, just for reference for this GitHub Page.

colors is all the colors, in the format you would need to put into the game!!

layers is the custom pelt type if you wanted to make that a pelt recipe, like how Agouti, Bengal, and Classic have layers in the game, this however is not formatted how the game wants it.
