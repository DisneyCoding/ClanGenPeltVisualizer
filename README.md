# ClanGen Pelt Visualizer

This is a GitHub Pages that will generate pelts, pelt patterns, and pelt colors, all within your browser!! 

Something that isn't included are the base game pelts, so those colors won't show. Torties are also not avaliable.

If you want to save the PNG of the Cat, click "Download PNG" and if you wanted to save the JSON of the cat, then click "Save" and you can load saved cats by clicking "Load" and picking the save file.

The save files will look something like this:

```json
{
  "poseIndex": 18,
  "colors": {
    "base": "#7D5C9E",
    "base_gradient_bottom": "#A542C3",
    "base_gradient_top": "#14A3A2",
    "pattern": "#37261C",
    "pattern_gradient_top": "#F40283",
    "pattern_fill": "#7A8BE3",
    "masked_light_pattern": "#CC4225",
    "newborn_base": "#EB1759",
    "newborn_base_gradient_bottom": "#6C3C13",
    "newborn_base_gradient_top": "#D15CDD",
    "newborn_pattern": "#5EE991",
    "newborn_pattern_gradient_top": "#9EF479",
    "newborn_pattern_fill": "#8C7E8E",
    "smoke_base": "#3E94A1",
    "smoke_base_gradient_top": "#4A99A2",
    "smoke_base_gradient_bottom": "#06E22C",
    "smoke_pattern": "#BEBD90",
    "smoke_pattern_gradient_top": "#48BC49",
    "freckled_pattern_gradient_top": "#27FA41",
    "exotic_base": "#C51551",
    "exotic_base_gradient_bottom": "#68283C",
    "exotic_base_gradient_top": "#FA3E6F",
    "exotic_pattern": "#52C6B8",
    "exotic_pattern_gradient_top": "#1980F3",
    "exotic_pattern_fill": "#66245E",
    "exotic_pattern_fill_gradient_top": "#C0ED46",
    "exotic_light_pattern": "#F4A628",
    "exotic_muzzle": "#5CBC12",
    "newborn_exotic_base": "#D37407",
    "newborn_exotic_base_gradient_bottom": "#B372A1",
    "newborn_exotic_base_gradient_top": "#9E1417",
    "newborn_exotic_pattern": "#97CC0B",
    "newborn_exotic_pattern_gradient_top": "#26B001",
    "newborn_exotic_pattern_fill": "#7A0C68",
    "newborn_exotic_pattern_fill_gradient_top": "#C2462A",
    "newborn_exotic_light_pattern": "#4A517B",
    "newborn_exotic_muzzle": "#A1CA7D"
  },
  "layers": [
    {
      "patternIndex": 0,
      "colorCategory": "base"
    },
    {
      "patternIndex": 27,
      "colorCategory": "pattern"
    },
    {
      "patternIndex": 24,
      "colorCategory": "pattern"
    },
    {
      "patternIndex": 36,
      "colorCategory": "pattern"
    }
  ]
}
```

PoseIndex is the pose of the cat, usually no need to use this, just for reference for this GitHub Page.

colors is all the colors, in the format you would need to put into the game!!

layers is the custom pelt type if you wanted to make that a pelt recipe, like how Agouti, Bengal, and Classic have layers in the game