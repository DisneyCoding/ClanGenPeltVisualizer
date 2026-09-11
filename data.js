export const PATTERNS = [
  { id: "BASEMASK", label: "Basemask", index: 0, groupX: 0, groupY: 0 },
  ...Array.from({ length: 40 }, (_, n) => {
    const index = n + 1;
    return {
      id: `PATTERN_${index}`,
      label: `Pattern ${index}`,
      index,
      groupX: Math.floor(index / 5) % 2,
      groupY: Math.floor(index / 2) % 5
    };
  }),
  { id: "LEGPATTERNGRAD", label: "Legpatterngrad", index: 41, groupX: 1, groupY: 4 }
];

export const POSES = [
  ...Array.from({ length: 27 }, (_, index) => ({ id: `pose_${index}`, label: `Pose ${index + 1}`, index })),
  { id: "adult_short2", label: "Adult Short 2", index: 18 },
  { id: "para_young0", label: "Paralyzed Young", index: 30 }
];
