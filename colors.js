
export const COLOR_PARAMETERS = [
  // Normal
  ["base","Base","Normal"],
  ["base_gradient_bottom","Base Gradient Bottom","Normal"],
  ["base_gradient_top","Base Gradient Top","Normal"],
  ["base_gradient_legs_tail","Base Gradient Legs/Tail","Normal"],
  ["pattern","Pattern","Normal"],
  ["pattern_gradient_top","Pattern Gradient Top","Normal"],
  ["pattern_gradient_bottom","Pattern Gradient Bottom","Normal"],
  ["pattern_fill","Pattern Fill","Normal"],
  ["masked_light_pattern","Masked Light Pattern","Normal"],
  ["masked_light_pattern_ghost_chin","Masked Light Pattern Ghost Chin","Normal"],

  // Newborn
  ["newborn_base","Newborn Base","Newborn"],
  ["newborn_base_gradient_bottom","Newborn Base Gradient Bottom","Newborn"],
  ["newborn_base_gradient_top","Newborn Base Gradient Top","Newborn"],
  ["newborn_pattern","Newborn Pattern","Newborn"],
  ["newborn_pattern_gradient_top","Newborn Pattern Gradient Top","Newborn"],
  ["newborn_pattern_fill","Newborn Pattern Fill","Newborn"],

  // Smoke
  ["smoke_base","Smoke Base","Smoke"],
  ["smoke_base_gradient_top","Smoke Base Gradient Top","Smoke"],
  ["smoke_base_gradient_bottom","Smoke Base Gradient Bottom","Smoke"],
  ["smoke_base_gradient_legs_tail","Smoke Base Gradient Legs/Tail","Smoke"],
  ["smoke_pattern","Smoke Pattern","Smoke"],
  ["smoke_pattern_gradient_top","Smoke Pattern Gradient Top","Smoke"],

  // Freckled
  ["freckled_pattern_gradient_top","Freckled Pattern Gradient Top","Freckled"],
  ["chinchilla_freckled_pattern_body","Chinchilla Freckled Pattern Body","Freckled"],
  ["chinchilla_pattern_gradient_front","Chinchilla Pattern Gradient Front","Freckled"],

  // Exotic
  ["exotic_base","Exotic Base","Exotic"],
  ["exotic_base_gradient_bottom","Exotic Base Gradient Bottom","Exotic"],
  ["exotic_base_gradient_top","Exotic Base Gradient Top","Exotic"],
  ["exotic_base_gradient_legs_tail","Exotic Base Gradient Legs/Tail","Exotic"],
  ["exotic_pattern","Exotic Pattern","Exotic"],
  ["exotic_pattern_gradient_top","Exotic Pattern Gradient Top","Exotic"],
  ["exotic_pattern_gradient_bottom","Exotic Pattern Gradient Bottom","Exotic"],
  ["exotic_pattern_fill","Exotic Pattern Fill","Exotic"],
  ["exotic_pattern_fill_gradient_top","Exotic Pattern Fill Gradient Top","Exotic"],
  ["exotic_light_pattern","Exotic Light Pattern","Exotic"],
  ["exotic_muzzle","Exotic Muzzle","Exotic"],

  // Newborn Exotic
  ["newborn_exotic_base","Newborn Exotic Base","Newborn Exotic"],
  ["newborn_exotic_base_gradient_bottom","Newborn Exotic Base Gradient Bottom","Newborn Exotic"],
  ["newborn_exotic_base_gradient_top","Newborn Exotic Base Gradient Top","Newborn Exotic"],
  ["newborn_exotic_pattern","Newborn Exotic Pattern","Newborn Exotic"],
  ["newborn_exotic_pattern_gradient_top","Newborn Exotic Pattern Gradient Top","Newborn Exotic"],
  ["newborn_exotic_pattern_fill","Newborn Exotic Pattern Fill","Newborn Exotic"],
  ["newborn_exotic_pattern_fill_gradient_top","Newborn Exotic Pattern Fill Gradient Top","Newborn Exotic"],
  ["newborn_exotic_light_pattern","Newborn Exotic Light Pattern","Newborn Exotic"],
  ["newborn_exotic_muzzle","Newborn Exotic Muzzle","Newborn Exotic"],
  ["newborn_exotic_gradient_bottom","Newborn Exotic Gradient Bottom","Newborn Exotic"],
  ["newborn_exotic_gradient_top","Newborn Exotic Gradient Top","Newborn Exotic"],

  // Special color variations
  ["base_gradient_bottom_singlecolour_black","Base Gradient Bottom Singlecolour Black","Special"],
  ["base_gradient_top_singlecolour_black","Base Gradient Top Singlecolour Black","Special"],
  ["base_singlecolour_black","Base Singlecolour Black","Special"],
  ["newborn_base_gradient_bottom_singlecolour_black","Newborn Base Gradient Bottom Singlecolour Black","Special"],
  ["newborn_base_gradient_top_singlecolour_black","Newborn Base Gradient Top Singlecolour Black","Special"],
  ["newborn_base_singlecolour_black","Newborn Base Singlecolour Black","Special"],
  ["singlecolour_blossom_base_gradient_top","Singlecolour Blossom Base Gradient Top","Special"],
  ["singlecolour_chinchilla_base_gradient_top","Singlecolour Chinchilla Base Gradient Top","Special"],
  ["singlecolour_honey_base_gradient_top","Singlecolour Honey Base Gradient Top","Special"]
].map(([id,label,group]) => ({id,label,group}));


export const PATTERN_COLOR_MAP = {
  0: "base",
  1: "base_gradient_bottom",
  2: "base_gradient_top",
  3: "pattern",
  4: "pattern_gradient_top",
  5: "pattern_fill",
  6: "masked_light_pattern",
  7: "newborn_base",
  8: "newborn_base_gradient_bottom",
  9: "newborn_base_gradient_top",
  10: "newborn_pattern",
  11: "newborn_pattern_gradient_top",
  12: "newborn_pattern_fill",
  13: "smoke_base",
  14: "smoke_base_gradient_top",
  15: "smoke_base_gradient_bottom",
  16: "smoke_pattern",
  17: "smoke_pattern_gradient_top",
  18: "freckled_pattern_gradient_top",
  19: "exotic_base",
  20: "exotic_base_gradient_bottom",
  21: "exotic_base_gradient_top",
  22: "exotic_pattern",
  23: "exotic_pattern_gradient_top",
  24: "exotic_pattern_fill",
  25: "exotic_pattern_fill_gradient_top",
  26: "exotic_light_pattern",
  27: "exotic_muzzle",
  28: "newborn_exotic_base",
  29: "newborn_exotic_base_gradient_bottom",
  30: "newborn_exotic_base_gradient_top",
  31: "newborn_exotic_pattern",
  32: "newborn_exotic_pattern_gradient_top",
  33: "newborn_exotic_pattern_fill",
  34: "newborn_exotic_pattern_fill_gradient_top",
  35: "newborn_exotic_light_pattern",
  36: "newborn_exotic_muzzle"
};