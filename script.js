import { PATTERNS, POSES } from "./data.js";
import { COLOR_PARAMETERS, PATTERN_COLOR_MAP } from "./colors.js";

const PATTERN_BY_ID = new Map(
  PATTERNS.map(pattern => [pattern.id, pattern])
);

const LINEART_URL = "assets/lineart.png";
const MASK_URL = "assets/pelt_parts_masks.png";

const PALETTE_URL = "pelt_color_palettes.json";

const SPRITE_W = 50;
const SPRITE_H = 50;

const GROUP_W = 200;
const GROUP_H = 400;

const canvas = document.getElementById("preview");
const ctx = canvas.getContext("2d", {
  willReadFrequently: true
});

ctx.imageSmoothingEnabled = false;

const lineart = new Image();
const maskAtlas = new Image();

let assetsReady = false;
let currentPoseIndex = 18;

let isFlipped = false;

/*
 * ============================================================
 * PELT RECIPES
 * ============================================================
 */

const RECIPE_FILES = {
  SingleColor: "SingleColourRecipe.json",
  Tabby: "TabbyRecipe.json",
  Ticked: "TickedRecipe.json",
  Mackerel: "MackerelRecipe.json",
  Sokoke: "SokokeRecipe.json",
  Agouti: "AgoutiRecipe.json",
  Speckled: "SpeckledRecipe.json",
  Rosette: "RosetteRecipe.json",
  Freckled: "FreckledRecipe.json",
  Smoke: "SmokeRecipe.json",
  SingleStripe: "SinglestripeRecipe.json",
  Bengal: "BengalRecipe.json",
  Marbled: "MarbledRecipe.json",
  Masked: "MaskedRecipe.json"
};

let peltRecipes = {};

let selectedRecipe = "";
let activeRecipeLayers = [];

// Preserves nested recipe groups and their blend settings.
let activeRecipeTree = null;

/*
 * ============================================================
 * COLOR DATA
 * ============================================================
 */

let peltColors = {};

for (const parameter of COLOR_PARAMETERS) {
  peltColors[parameter.id] = "#FFFFFF";
}

let colorPalettes = {};
let selectedPalette = "WHITE";


/*
 * Returns true if a color parameter exists.
 */
function colorParameterExists(id) {
  return COLOR_PARAMETERS.some(parameter => parameter.id === id);
}


/*
 * Gets the default color category for a pattern.
 *
 * PATTERN_COLOR_MAP connects a pattern index to a
 * COLOR_PARAMETERS ID.
 *
 * If a pattern does not have a mapping, "pattern" is used.
 */
function getDefaultColorCategory(patternIndex) {
  const mappedCategory = PATTERN_COLOR_MAP[patternIndex];

  if (mappedCategory && colorParameterExists(mappedCategory)) {
    return mappedCategory;
  }

  return "pattern";
}


/*
 * ============================================================
 * LAYERS
 * ============================================================
 */

function createLayer(patternIndex, colorCategory = null) {
  return {
    id: crypto.randomUUID(),

    patternIndex,

    /*
     * If a color category was manually supplied, use it.
     * Otherwise, automatically use the category associated
     * with this pattern.
     */
    colorCategory:
      colorCategory && colorParameterExists(colorCategory)
        ? colorCategory
        : getDefaultColorCategory(patternIndex),

    /*
     * A layer can optionally have its own direct color.
     *
     * If this is null, the layer uses its colorCategory.
     */
    colorOverride: null,

    opacity: 1,

    enabled: true
  };
}


/*
 * Base layer uses the color associated with pattern 0.
 */
let layers = [
  createLayer(0)
];

let recipeEditorLayers = [];
let selectedLayerId = layers[0].id;

/*
 * ============================================================
 * RECIPE LOADER
 * ============================================================
 */

async function loadPeltRecipes() {

  const loadedRecipes = {};

  for (const [name, filename] of Object.entries(RECIPE_FILES)) {

    const response = await fetch(
      `assets/pelt_recipes/${filename}`
    );

    if (!response.ok) {
      throw new Error(
        `Could not load recipe: ${filename}`
      );
    }

    const recipe = await response.json();

    if (
      !recipe ||
      !recipe.layers ||
      !recipe.layer_order
    ) {
      throw new Error(
        `Invalid recipe structure: ${filename}`
      );
    }

    loadedRecipes[name] = recipe;
  }

  peltRecipes = loadedRecipes;

  console.log(
    "Loaded pelt recipes:",
    Object.keys(peltRecipes)
  );
}

/*
 * ============================================================
 * RECIPE SELECTOR
 * ============================================================
 */

function populateRecipeSelect() {
  const select = document.getElementById("recipeSelect");

  if (!select) return;

  select.innerHTML = "";

  // Manual layer editing remains available.
  const manualOption = document.createElement("option");
  manualOption.value = "";
  manualOption.textContent = "Manual Layers";
  select.appendChild(manualOption);

  for (const recipeName of Object.keys(peltRecipes)) {
    const option = document.createElement("option");

    option.value = recipeName;
    option.textContent = recipeName;

    select.appendChild(option);
  }

  select.value = selectedRecipe;
}


/*
 * Select a recipe and resolve its layers.
 */
function selectPeltRecipe(recipeName) {

  const recipeSelect =
    document.getElementById("recipeSelect");

  if (recipeSelect) {
    recipeSelect.value = recipeName || "";
  }

  if (!recipeName) {

    selectedRecipe = "";

    activeRecipeLayers = [];
    recipeEditorLayers = [];
    activeRecipeTree = null;

    renderLayers();
    render();

    setStatus("Manual layers selected.");

    return;
  }

  const recipe = peltRecipes[recipeName];

  if (!recipe) {
    setStatus("Recipe could not be found.");
    return;
  }

  selectedRecipe = recipeName;

  activeRecipeLayers = resolveRecipeLayers(recipe);
  recipeEditorLayers = createEditableRecipeLayers(
    activeRecipeLayers
  );

  setStatus(
    `${recipeName} selected. ${activeRecipeLayers.length} recipe layers loaded.`
  );

  console.log("Selected recipe:", recipeName);
  console.log("Resolved recipe layers:", activeRecipeLayers);
  console.log("Recipe render tree:", activeRecipeTree);

  renderLayers();
  render();
}

/*
 * ============================================================
 * RECIPE LAYER RESOLVER
 * ============================================================
 */


/*
 * Recursively expands nested layer-order arrays.
 *
 * ClanGen recipes can group layers together.
 * We preserve their order and group information.
 */
function flattenRecipeOrder(order, result = [], groupPath = []) {

  if (!Array.isArray(order)) {
    return result;
  }

  for (const item of order) {

    if (Array.isArray(item)) {

      const groupId = groupPath.length
        ? `${groupPath.join(".")}.${result.length}`
        : String(result.length);

      flattenRecipeOrder(
        item,
        result,
        [...groupPath, groupId]
      );

    } else {

      if (String(item).startsWith("+blend_mode:")) {

        result.push({
          instruction: String(item),
          groupPath
        });

      } else {

        result.push({
          layerId: String(item),
          groupPath
        });

      }
    }
  }

  return result;
}


/*
 * ============================================================
 * RECIPE RENDER TREE
 * ============================================================
 */

/*
 * Parse a blend instruction.
 *
 * Examples:
 * +blend_mode:mask
 * +blend_mode:multiply
 * +blend_mode:mask,opacity:50
 */
function parseBlendInstruction(instruction, group) {

  const settings = String(instruction)
    .replace("+blend_mode:", "")
    .split(",");

  for (const setting of settings) {

    const [key, value] = setting
      .split(":")
      .map(part => part.trim());

    if (key === "mask" || key === "multiply" || key === "normal") {
      group.blendMode = key;
    }

    if (key === "opacity") {

      const opacity = Number(value);

      if (Number.isFinite(opacity)) {
        group.opacity = Math.max(
          0,
          Math.min(100, opacity)
        );
      }
    }
  }
}


/*
 * Recursively convert recipe layer_order into
 * a tree of layers and compound groups.
 */
function parseRecipeOrderTree(order) {

  function parseGroup(items) {

    const group = {
      type: "group",
      blendMode: "normal",
      opacity: 100,
      children: []
    };

    for (const item of items) {

      // Nested arrays become compound groups.
      if (Array.isArray(item)) {

        group.children.push(
          parseGroup(item)
        );

        continue;
      }

      const value = String(item);

      // Blend instructions modify their containing group.
      if (value.startsWith("+blend_mode:")) {

        parseBlendInstruction(
          value,
          group
        );

        continue;
      }

      // Ordinary recipe layer.
      group.children.push({
        type: "layer",
        id: value
      });
    }

    return group;
  }

  return parseGroup(order);
}


/*
 * Resolve the render tree's layer references
 * into actual mask and color information.
 */
function resolveRecipeRenderTree(order, recipeLayerData) {

  const tree = parseRecipeOrderTree(order);

  function resolveNode(node) {

    if (node.type === "group") {

      return {
        ...node,

        children: node.children
          .map(resolveNode)
          .filter(Boolean)
      };
    }

    const layerData = recipeLayerData[node.id];

    if (!layerData) {

      console.warn(
        `Render tree layer ${node.id} is missing.`
      );

      return null;
    }

    const maskPattern = PATTERN_BY_ID.get(
      layerData.group_name
    );

    if (!maskPattern) {

      console.warn(
        `Mask pattern ${layerData.group_name} was not found.`
      );
    }

    return {

      type: "layer",

      id: node.id,

      groupName: layerData.group_name,

      maskPattern: maskPattern || null,

      maskIndex: maskPattern?.index ?? null,

      groupX: maskPattern?.groupX ?? null,

      groupY: maskPattern?.groupY ?? null,

      colorParameter: layerData.color || null,

      blendMode: layerData.blend_mode || "normal",

      opacity: layerData.opacity ?? 100

    };
  }

  return resolveNode(tree);
}



/*
 * Check whether an exception applies to the
 * currently selected palette and pose.
 */
function recipeExceptionMatches(exception) {

  // Check palette restrictions.
  if (exception.colors) {

    const allowedColors = Array.isArray(exception.colors)
      ? exception.colors
      : [exception.colors];

    if (!allowedColors.includes(selectedPalette)) {
      return false;
    }
  }

  // Check pose restrictions.
  if (exception.poses) {

    const currentPose = POSES.find(
      pose => pose.index === currentPoseIndex
    );

    if (!currentPose) {
      return false;
    }

    const allowedPoses = exception.poses.map(
      pose => String(pose).toLowerCase()
    );

    const currentPoseId = String(
      currentPose.id
    ).toLowerCase();

    if (!allowedPoses.includes(currentPoseId)) {
      return false;
    }
  }

  return true;
}


function getRecipeExceptionSpecificity(exception) {
  let specificity = 0;

  if (exception.colors) {
    specificity++;
  }

  if (exception.poses) {
    specificity++;
  }

  return specificity;
}


/*
 * Resolve the base recipe and its applicable exceptions.
 */

function resolveRecipeLayers(recipe) {
  let layerOrder = recipe.layer_order;

  let recipeLayerData = {
    ...recipe.layers
  };

  // Find the most specific matching exception.
  let bestException = null;
  let bestSpecificity = -1;

  for (const exception of recipe.exceptions || []) {
    if (!recipeExceptionMatches(exception)) {
      continue;
    }

    const specificity =
      getRecipeExceptionSpecificity(exception);

    if (specificity > bestSpecificity) {
      bestSpecificity = specificity;
      bestException = exception;
    }
  }

  // Apply only the most specific matching exception.
  if (bestException) {
    if (bestException.layer_order) {
      layerOrder = bestException.layer_order;
    }

    if (bestException.layers) {
      recipeLayerData = {
        ...recipeLayerData,
        ...bestException.layers
      };
    }
  }

  // Build the nested structure used by the recipe renderer.
  activeRecipeTree = resolveRecipeRenderTree(
    layerOrder,
    recipeLayerData
  );

  // Keep the existing flattened layers for the layer editor.
  const orderedLayers = flattenRecipeOrder(layerOrder);
  const resolvedLayers = [];

  for (const entry of orderedLayers) {
    if (entry.instruction) {
      resolvedLayers.push({
        type: "instruction",
        instruction: entry.instruction
      });

      continue;
    }

    const layerData = recipeLayerData[entry.layerId];

    if (!layerData) {
      console.warn(
        `Recipe layer ${entry.layerId} is missing.`
      );

      continue;
    }

    const maskPattern = PATTERN_BY_ID.get(
      layerData.group_name
    );

    if (!maskPattern) {
      console.warn(
        `Mask pattern ${layerData.group_name} was not found in PATTERNS.`
      );
    }

    resolvedLayers.push({
      type: "layer",
      id: entry.layerId,
      groupPath: entry.groupPath,
      groupName: layerData.group_name,
      maskPattern: maskPattern || null,
      maskIndex: maskPattern?.index ?? null,
      groupX: maskPattern?.groupX ?? null,
      groupY: maskPattern?.groupY ?? null,
      colorParameter: layerData.color || null,
      blendMode: layerData.blend_mode || "normal",
      opacity: layerData.opacity ?? 100
    });
  }

  return resolvedLayers;
}

/*
 * Convert resolved recipe layers into editable layers.
 */

function createEditableRecipeLayers(recipeLayers, previousLayers = []) {
  const previousLayerMap = new Map(
    previousLayers.map(layer => [
      layer.recipeLayerId,
      layer
    ])
  );

  return recipeLayers
    .filter(layer => layer.type === "layer")
    .map(layer => {
      const previous = previousLayerMap.get(layer.id);

      return {
        id: crypto.randomUUID(),

        recipeLayerId: layer.id,

        patternIndex: layer.maskIndex,

        groupName: layer.groupName,

        colorCategory: layer.colorParameter,

        colorOverride: null,

        opacity: previous
          ? previous.opacity
          : layer.opacity / 100,

        enabled: previous
          ? previous.enabled
          : true,

        blendMode: layer.blendMode,

        groupPath: layer.groupPath,

        isRecipeLayer: true
      };
    });
}


function reorderRecipeTreeFromEditor(node, previousLayers) {
  if (!node || node.type !== "group") return;

  const previousOrder = new Map(
    previousLayers.map((layer, index) => [
      layer.recipeLayerId,
      index
    ])
  );

  // Process nested groups first.
  for (const child of node.children) {
    if (child.type === "group") {
      reorderRecipeTreeFromEditor(child, previousLayers);
    }
  }

  // Reorder consecutive layers without moving
  // layers across compound group boundaries.
  let start = 0;

  while (start < node.children.length) {
    if (node.children[start].type !== "layer") {
      start++;
      continue;
    }

    let end = start;

    while (
      end < node.children.length &&
      node.children[end].type === "layer"
    ) {
      end++;
    }

    const originalPositions = node.children
      .slice(start, end);

    const sortedLayers = originalPositions
      .map((layer, index) => ({
        layer,
        originalIndex: index
      }))
      .sort((a, b) => {
        const aRank = previousOrder.has(a.layer.id)
          ? previousOrder.get(a.layer.id)
          : Infinity;

        const bRank = previousOrder.has(b.layer.id)
          ? previousOrder.get(b.layer.id)
          : Infinity;

        if (aRank !== bRank) {
          return aRank - bRank;
        }

        return a.originalIndex - b.originalIndex;
      })
      .map(item => item.layer);

    node.children.splice(
      start,
      sortedLayers.length,
      ...sortedLayers
    );

    start = end;
  }
}


function synchronizeRecipeEditorOrder() {
  const recipeOrder = [];

  function collectLayerOrder(node) {
    if (!node) return;

    if (node.type === "layer") {
      recipeOrder.push(node.id);
      return;
    }

    for (const child of node.children || []) {
      collectLayerOrder(child);
    }
  }

  collectLayerOrder(activeRecipeTree);

  const orderMap = new Map(
    recipeOrder.map((id, index) => [id, index])
  );

  recipeEditorLayers.sort((a, b) => {
    return (
      (orderMap.get(a.recipeLayerId) ?? Infinity) -
      (orderMap.get(b.recipeLayerId) ?? Infinity)
    );
  });

  activeRecipeLayers.sort((a, b) => {
    return (
      (orderMap.get(a.id) ?? Infinity) -
      (orderMap.get(b.id) ?? Infinity)
    );
  });
}


/*
 * ============================================================
 * COLOR PALETTE LOADER
 * ============================================================
 */

async function loadColorPalettes() {
  const response = await fetch(PALETTE_URL);

  if (!response.ok) {
    throw new Error("Could not load color palettes.");
  }

  const palettes = await response.json();

  if (
    !palettes ||
    typeof palettes !== "object" ||
    Array.isArray(palettes)
  ) {
    throw new Error("Invalid color palette file.");
  }

  colorPalettes = palettes;

  if (!colorPalettes.WHITE) {
    throw new Error("The WHITE color palette is missing.");
  }

  console.log(
    "Loaded color palettes:",
    Object.keys(colorPalettes)
  );
}

/*
 * ============================================================
 * COLOR PALETTE SELECTION
 * ============================================================
 */

function populatePaletteSelect() {
  const select = document.getElementById("paletteSelect");

  if (!select) return;

  select.innerHTML = "";

  // Add all available ClanGen palettes.
  for (const paletteName of Object.keys(colorPalettes)) {
    const option = document.createElement("option");

    option.value = paletteName;
    option.textContent = paletteName;

    select.appendChild(option);
  }

  // Add the custom option.
  const customOption = document.createElement("option");

  customOption.value = "Custom";
  customOption.textContent = "Custom";

  select.appendChild(customOption);

  select.value = selectedPalette;
}


function applyColorPalette(paletteName) {
  const palette = colorPalettes[paletteName];

  if (!palette) return;

  selectedPalette = paletteName;

  /*
   * Apply the palette's color to every registered
   * color parameter.
   *
   * Parameters missing from a palette receive white
   * instead of retaining colors from the previous palette.
   */
  for (const parameter of COLOR_PARAMETERS) {
    const paletteColor = normalizeHex(
      palette[parameter.id]
    );

    peltColors[parameter.id] =
      paletteColor || "#FFFFFF";
  }

  const select = document.getElementById("paletteSelect");

  if (select) {
    select.value = paletteName;
  }

  syncColorControls();
  renderPatternPreview();

  setStatus(`Applied ${paletteName} palette.`);

  if (selectedRecipe) {
    selectPeltRecipe(selectedRecipe);
  }
}


function markPaletteCustom() {
  selectedPalette = "Custom";

  const select = document.getElementById("paletteSelect");

  if (select) {
    select.value = "Custom";
  }
}

/*
 * ============================================================
 * LOOKUP FUNCTIONS
 * ============================================================
 */

function patternInfo(index) {
  return PATTERNS.find(p => p.index === index);
}

function poseInfo(index) {
  return POSES.find(p => p.index === index);
}


/*
 * ============================================================
 * COLOR FUNCTIONS
 * ============================================================
 */

function normalizeHex(value) {
  if (!value) return null;

  let v = String(value).trim();

  if (!v.startsWith("#")) {
    v = "#" + v;
  }

  return /^#[0-9a-fA-F]{6}$/.test(v)
    ? v.toUpperCase()
    : null;
}


function hexToRgb(hex) {
  const v = normalizeHex(hex);

  if (!v) return null;

  return {
    r: parseInt(v.slice(1, 3), 16),
    g: parseInt(v.slice(3, 5), 16),
    b: parseInt(v.slice(5, 7), 16)
  };
}


/*
 * Gets the actual color that a layer should use.
 *
 * Priority:
 *
 * 1. Direct layer color override
 * 2. The color parameter assigned to the layer
 * 3. Base color
 * 4. Brown fallback
 */
function getColorForLayer(layer) {
  return (
    layer.colorOverride ||
    peltColors[layer.colorCategory] ||
    peltColors.base ||
    "#8A684D"
  );
}

function getRecipeLayerColor(recipeLayer) {

  if (!recipeLayer.colorParameter) {
    return "#FFFFFF";
  }

  return peltColors[recipeLayer.colorParameter] || "#FFFFFF";
}


function renderRecipeLayers() {
  if (!activeRecipeTree) return;

  for (const child of activeRecipeTree.children) {
    const layerCanvas = renderRecipeTreeNode(child);

    if (!layerCanvas) continue;

    compositeCanvas(
      ctx.canvas,
      layerCanvas,
      child.blendMode || "normal",
      getRecipeNodeOpacity(child)
    );
  }
}



function getEditableRecipeLayer(recipeLayerId) {
  return recipeEditorLayers.find(
    layer => layer.recipeLayerId === recipeLayerId
  );
}


function getRecipeNodeOpacity(node) {
  if (node.type === "layer") {
    const editableLayer = getEditableRecipeLayer(node.id);

    return editableLayer
      ? editableLayer.opacity
      : (node.opacity ?? 100) / 100;
  }

  return (node.opacity ?? 100) / 100;
}



function renderRecipeTreeNode(node) {
  if (!node) return null;

  // A recipe layer
  if (node.type === "layer") {
    const editableLayer = getEditableRecipeLayer(node.id);

    if (!editableLayer || !editableLayer.enabled) {
      return null;
    }

    const layerCanvas = createRecipeLayerCanvas({
      ...editableLayer,
      blendMode: node.blendMode || editableLayer.blendMode
    });

    return layerCanvas;
  }

  // A compound group
  const groupCanvas = document.createElement("canvas");
  groupCanvas.width = SPRITE_W;
  groupCanvas.height = SPRITE_H;

  for (const child of node.children) {
    const childCanvas = renderRecipeTreeNode(child);

    if (!childCanvas) continue;

    compositeCanvas(
      groupCanvas,
      childCanvas,
      child.blendMode || "normal",
      getRecipeNodeOpacity(child)
    );
  }

  return groupCanvas;
}


/*
 * ============================================================
 * MASK RENDERING
 * ============================================================
 */

function tintMask(maskCanvas, color, opacity) {
  const rgb = hexToRgb(color);

  if (!rgb) return null;

  const output = document.createElement("canvas");

  output.width = SPRITE_W;
  output.height = SPRITE_H;

  const out = output.getContext("2d");

  out.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  out.fillRect(0, 0, SPRITE_W, SPRITE_H);

  out.globalCompositeOperation = "destination-in";
  out.globalAlpha = opacity;

  out.drawImage(maskCanvas, 0, 0);

  return output;
}


/*
 * Apply a blend mode when drawing one canvas
 * onto another.
 */

function compositeCanvas(
  destination,
  source,
  blendMode = "normal",
  opacity = 1
) {
  const context = destination.getContext("2d");

  opacity = Math.max(0, Math.min(1, opacity));

  // ClanGen mask blending:
  // Multiply all four RGBA channels.
  if (blendMode === "mask") {
    const destinationData = context.getImageData(
      0, 0, destination.width, destination.height
    );

    const sourceData = source.getContext("2d").getImageData(
      0, 0, source.width, source.height
    );

    const destinationPixels = destinationData.data;
    const sourcePixels = sourceData.data;

    for (let i = 0; i < destinationPixels.length; i += 4) {
      for (let channel = 0; channel < 4; channel++) {
        const original = destinationPixels[i + channel];

        const multiplied =
          original * sourcePixels[i + channel] / 255;

        destinationPixels[i + channel] = Math.round(
          original * (1 - opacity) +
          multiplied * opacity
        );
      }
    }

    context.putImageData(destinationData, 0, 0);
    return;
  }

  // Normal and multiply blending.
  context.save();
  context.globalAlpha = opacity;

  if (blendMode === "multiply") {
    context.globalCompositeOperation = "multiply";
  } else {
    context.globalCompositeOperation = "source-over";
  }

  context.drawImage(source, 0, 0);
  context.restore();
}




/*
 * Create a colored canvas for one recipe layer.
 */


function createRecipeLayerCanvas(layer) {
  if (!layer.enabled) return null;

  const pattern = patternInfo(layer.patternIndex);
  if (!pattern) return null;

  const mask = getMaskSprite(pattern, currentPoseIndex);
  if (!mask) return null;

  const color = getColorForLayer(layer);

  return tintMask(mask, color, 1);
}





function getMaskSprite(pattern, poseIndex) {
  if (!pattern) return null;

  const sprite = document.createElement("canvas");

  sprite.width = SPRITE_W;
  sprite.height = SPRITE_H;

  const s = sprite.getContext("2d");

  const poseX =
    (poseIndex % 4) * SPRITE_W;

  const poseY =
    Math.floor(poseIndex / 4) * SPRITE_H;

  s.drawImage(
    maskAtlas,

    pattern.groupX * GROUP_W + poseX,
    pattern.groupY * GROUP_H + poseY,

    SPRITE_W,
    SPRITE_H,

    0,
    0,
    SPRITE_W,
    SPRITE_H
  );

  return sprite;
}


/*
 * ============================================================
 * MAIN RENDER
 * ============================================================
 */

function render() {

  if (!assetsReady) return;

  ctx.clearRect(
    0,
    0,
    SPRITE_W,
    SPRITE_H
  );

  ctx.save();

  if (isFlipped) {
    ctx.translate(SPRITE_W, 0);
    ctx.scale(-1, 1);
  }

  /*
   * Draw either the selected recipe
   * or the manually configured layers.
   */
  if (selectedRecipe && activeRecipeLayers.length > 0) {

    renderRecipeLayers();

  } else {

    for (const layer of layers) {

      if (!layer.enabled) continue;

      const pattern = patternInfo(layer.patternIndex);

      if (!pattern) continue;

      const mask = getMaskSprite(
        pattern,
        currentPoseIndex
      );

      if (!mask) continue;

      const color = getColorForLayer(layer);

      const tinted = tintMask(
        mask,
        color,
        layer.opacity
      );

      if (tinted) {
        ctx.drawImage(
          tinted,
          0,
          0
        );
      }
    }
  }

  /*
   * Draw lineart over the colored masks.
   */
  const x =
    (currentPoseIndex % 4) * SPRITE_W;

  const y =
    Math.floor(currentPoseIndex / 4) * SPRITE_H;

  ctx.drawImage(
    lineart,
    x,
    y,
    SPRITE_W,
    SPRITE_H,
    0,
    0,
    SPRITE_W,
    SPRITE_H
  );

  ctx.restore();
}

/*
 * ============================================================
 * NEW PATTERN PREVIEW
 * ============================================================
 */

function renderPatternPreview() {
    if (!assetsReady) return;

    const previewCanvas = document.getElementById("patternPreview");
    const previewLabel = document.getElementById("patternPreviewLabel");

    if (!previewCanvas) return;

    const previewCtx = previewCanvas.getContext("2d");

    previewCtx.clearRect(
        0,
        0,
        SPRITE_W,
        SPRITE_H
    );

    const patternIndex = Number(
        document.getElementById("patternSelect").value
    );

    const colorCategory = document.getElementById("newLayerCategory").value;

    const pattern = patternInfo(patternIndex);

    if (!pattern) return;

    // Get the selected pattern's mask.
    const mask = getMaskSprite(
        pattern,
        currentPoseIndex
    );

    if (!mask) return;

    // Use the currently selected color parameter.
    const color = peltColors[colorCategory] || "#FFFFFF";

    // Apply the selected color to the mask.
    const tinted = tintMask(
        mask,
        color,
        1
    );

    if (tinted) {
        previewCtx.drawImage(
            tinted,
            0,
            0
        );
    }

    // Draw lineart over the preview.
    const x = (currentPoseIndex % 4) * SPRITE_W;
    const y = Math.floor(currentPoseIndex / 4) * SPRITE_H;

    previewCtx.drawImage(
        lineart,
        x,
        y,
        SPRITE_W,
        SPRITE_H,
        0,
        0,
        SPRITE_W,
        SPRITE_H
    );

    if (previewLabel) {
        const colorParameter = COLOR_PARAMETERS.find(
            parameter => parameter.id === colorCategory
        );

        previewLabel.textContent =
            `${pattern.label} — ${colorParameter?.label || colorCategory}`;
    }
}


/*
 * ============================================================
 * LAYER UI
 * ============================================================
 */


function renderLayers() {
  const container =
    document.getElementById("layers");

  container.innerHTML = "";

  // Choose which collection the editor displays.
  const editingRecipe = Boolean(selectedRecipe);

  const displayedLayers = editingRecipe
    ? recipeEditorLayers
    : layers;

  /*
   * Reverse the array so the topmost layer appears first
   * in the interface.
   */
  [...displayedLayers].reverse().forEach(layer => {

    const pattern =
      patternInfo(layer.patternIndex) || {
        label: layer.groupName || "Unknown pattern"
      };

    const row =
      document.createElement("div");

    row.className =
      "layer" +
      (layer.id === selectedLayerId
        ? " selected"
        : "");

    row.innerHTML = `
      <div class="layer-top">

        <input
          class="layer-enabled"
          type="checkbox"
          ${layer.enabled ? "checked" : ""}
        >

        <div class="layer-name">
          ${layer.groupName || pattern.label}
        </div>

        <div class="layer-buttons">

          <button data-action="up">
            ↑
          </button>

          <button data-action="down">
            ↓
          </button>

          <button data-action="delete">
            ×
          </button>

        </div>

      </div>

      <div class="layer-controls">

        <input
          class="layer-opacity"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value="${layer.opacity}"
        >

        <span class="opacity-value">
          ${Math.round(layer.opacity * 100)}%
        </span>

      </div>
    `;

    /*
     * Select layer.
     */
    row.addEventListener("click", () => {
      selectedLayerId = layer.id;
      renderLayers();
    });

    /*
     * Enable / disable layer.
     */
    
    /*
    * Enable / disable layer.
    */
    const enabledCheckbox =
      row.querySelector(".layer-enabled");

    // Prevent checkbox clicks from selecting the parent row.
    enabledCheckbox.addEventListener("click", e => {
      e.stopPropagation();
    });

    enabledCheckbox.addEventListener("change", e => {

      layer.enabled = e.target.checked;

      render();
    });


    /*
     * Opacity.
     */
    row
      .querySelector(".layer-opacity")
      .addEventListener("input", e => {

        layer.opacity =
          Number(e.target.value);

        row
          .querySelector(".opacity-value")
          .textContent =
          Math.round(layer.opacity * 100) + "%";

        render();
      });

    /*
     * Delete layer.
     */
    row
      .querySelector('[data-action="delete"]')
      .addEventListener("click", e => {

        e.stopPropagation();

        if (editingRecipe) {
          recipeEditorLayers =
            recipeEditorLayers.filter(
              x => x.id !== layer.id
            );

          activeRecipeLayers =
            activeRecipeLayers.filter(
              x => x.id !== layer.recipeLayerId
            );

        } else {

          if (layers.length === 1) {
            return;
          }

          layers =
            layers.filter(
              x => x.id !== layer.id
            );
        }

        if (
          !displayedLayers.some(
            x => x.id === selectedLayerId
          )
        ) {
          selectedLayerId =
            displayedLayers.at(-1)?.id || null;
        }

        renderLayers();
        render();
      });

    /*
     * Move layer up.
     */
    row
      .querySelector('[data-action="up"]')
      .addEventListener("click", e => {

        e.stopPropagation();

        if (editingRecipe) {
          moveRecipeLayer(layer.id, 1);
        } else {
          moveLayer(layer.id, 1);
        }
      });

    /*
     * Move layer down.
     */
    row
      .querySelector('[data-action="down"]')
      .addEventListener("click", e => {

        e.stopPropagation();

        if (editingRecipe) {
          moveRecipeLayer(layer.id, -1);
        } else {
          moveLayer(layer.id, -1);
        }
      });

    container.appendChild(row);
  });
}

function moveRecipeLayer(layerId, direction) {
  const editorIndex = recipeEditorLayers.findIndex(
    layer => layer.id === layerId
  );

  if (editorIndex === -1 || !activeRecipeTree) return;

  const recipeLayerId =
    recipeEditorLayers[editorIndex].recipeLayerId;

  // Find the group containing the requested recipe layer.
  function findParentGroup(node, targetId) {
    if (!node || node.type !== "group") return null;

    for (const child of node.children) {
      if (child.type === "layer" && child.id === targetId) {
        return node;
      }

      if (child.type === "group") {
        const result = findParentGroup(child, targetId);

        if (result) return result;
      }
    }

    return null;
  }

  const parentGroup = findParentGroup(
    activeRecipeTree,
    recipeLayerId
  );

  if (!parentGroup) return;

  const siblings = parentGroup.children;

  const treeIndex = siblings.findIndex(
    child => child.type === "layer" &&
      child.id === recipeLayerId
  );

  const newTreeIndex = treeIndex + direction;

  if (
    treeIndex === -1 ||
    newTreeIndex < 0 ||
    newTreeIndex >= siblings.length
  ) {
    return;
  }

  // Only allow reordering with another layer
  // in the same compound group.
  const neighboringNode = siblings[newTreeIndex];

  if (neighboringNode.type !== "layer") return;

  // Find the neighboring layer in the editor.
  const neighboringEditorIndex = recipeEditorLayers.findIndex(
    layer => layer.recipeLayerId === neighboringNode.id
  );

  if (neighboringEditorIndex === -1) return;

  // Swap the actual recipe tree nodes.
  [siblings[treeIndex], siblings[newTreeIndex]] = [
    siblings[newTreeIndex],
    siblings[treeIndex]
  ];

  // Keep the editor list synchronized.
  [
    recipeEditorLayers[editorIndex],
    recipeEditorLayers[neighboringEditorIndex]
  ] = [
    recipeEditorLayers[neighboringEditorIndex],
    recipeEditorLayers[editorIndex]
  ];

  // Keep the flattened recipe layers synchronized.
  const recipeOrder = recipeEditorLayers.map(
    layer => layer.recipeLayerId
  );

  activeRecipeLayers.sort((a, b) => {
    return (
      recipeOrder.indexOf(a.id) -
      recipeOrder.indexOf(b.id)
    );
  });

  renderLayers();
  render();
}


function moveLayer(id, direction) {
  const i =
    layers.findIndex(
      x => x.id === id
    );

  const target =
    i + direction;

  if (
    i < 0 ||
    target < 0 ||
    target >= layers.length
  ) {
    return;
  }

  [
    layers[i],
    layers[target]
  ] = [
    layers[target],
    layers[i]
  ];

  renderLayers();
  render();
}


/*
 * ============================================================
 * COLOR PARAMETER UI
 * ============================================================
 */

function renderColorControls() {
  const container =
    document.getElementById("colorControls");

  if (!container) return;

  container.innerHTML = "";

  const groups = {};

  for (const parameter of COLOR_PARAMETERS) {
    (groups[parameter.group] ??= [])
      .push(parameter);
  }


  for (
    const [group, params]
    of Object.entries(groups)
  ) {

    const heading =
      document.createElement("h3");

    heading.textContent = group;

    heading.style.gridColumn =
      "1/-1";

    heading.style.margin =
      "10px 0 0";

    container.appendChild(heading);


    for (const parameter of params) {

      const value =
        peltColors[parameter.id] ||
        "#FFFFFF";

      const element =
        document.createElement("div");

      element.className =
        "color-control";


      element.innerHTML = `
        <div class="color-top">
          <span class="color-label">
            ${parameter.label}
          </span>
        </div>

        <div class="color-inputs">

          <input
            type="color"
            value="${value}"
          >

          <input
            class="hex"
            type="text"
            value="${value}"
            maxlength="7"
            spellcheck="false"
          >

        </div>
      `;


      const color =
        element.querySelector(
          'input[type="color"]'
        );

      const hex =
        element.querySelector(".hex");


      /*
       * Color picker.
       */
      color.addEventListener(
        "input",
        () => {
          peltColors[parameter.id] =
            color.value.toUpperCase();

          markPaletteCustom();

          hex.value =
            peltColors[parameter.id];

          refreshColorCategoryOptions();
          renderLayers();
          render();
          renderPatternPreview();
        }
      );


      /*
       * Hexadecimal text input.
       */
      hex.addEventListener(
        "change",
        () => {
          const value =
            normalizeHex(hex.value);

          if (!value) {
            hex.value =
              peltColors[parameter.id];

            return;
          }

          peltColors[parameter.id] =
            value;

          markPaletteCustom();

          color.value =
            value;

          refreshColorCategoryOptions();

          renderLayers();
          render();

          renderPatternPreview();

        }
      );


      container.appendChild(element);
    }
  }
}

/*
 * ============================================================
 * SYNCHRONIZE COLOR CONTROLS
 * ============================================================
 */

function syncColorControls() {

  // Rebuild the color pickers and hex inputs
  // using the current values in peltColors.
  renderColorControls();

  // Update the color-category dropdown.
  refreshColorCategoryOptions();

  // Update the layer color previews.
  renderLayers();

  // Update the cat preview.
  render();
}


/*
 * ============================================================
 * DROPDOWN CONTROLS
 * ============================================================
 */

function populateControls() {

  /*
   * ----------------------------
   * POSE SELECT
   * ----------------------------
   */

  const pose =
    document.getElementById("poseSelect");

  pose.innerHTML = "";

  POSES.forEach(p => {

    const option =
      document.createElement("option");

    option.value =
      p.index;

    option.textContent =
      p.label;

    pose.appendChild(option);
  });

  pose.value =
    currentPoseIndex;


  /*
   * ----------------------------
   * PATTERN SELECT
   * ----------------------------
   */

  const pattern =
    document.getElementById("patternSelect");

  pattern.innerHTML = "";

  PATTERNS.forEach(p => {

    const option =
      document.createElement("option");

    option.value =
      p.index;

    option.textContent =
      p.label;

    pattern.appendChild(option);
  });


  /*
   * ----------------------------
   * COLOR CATEGORY SELECT
   * ----------------------------
   */

  const category = document.getElementById("newLayerCategory");

  if (category) {
    category.innerHTML = "";

    for (const parameter of COLOR_PARAMETERS) {
      const option = document.createElement("option");

      option.value = parameter.id;

      option.textContent =
        `${parameter.label} — ${peltColors[parameter.id] || "#FFFFFF"}`;

      category.appendChild(option);
    }
  }


  /*
   * Automatically assign the color category
   * associated with the currently selected pattern.
   */
  updateAssignedColorCategory();
}


function refreshColorCategoryOptions() {
  const category = document.getElementById("newLayerCategory");

  if (!category) return;

  const currentValue = category.value;

  category.innerHTML = "";

  for (const parameter of COLOR_PARAMETERS) {
    const option = document.createElement("option");

    option.value = parameter.id;

    option.textContent =
      `${parameter.label} — ${peltColors[parameter.id] || "#FFFFFF"}`;

    category.appendChild(option);
  }

  if (colorParameterExists(currentValue)) {
    category.value = currentValue;
  }
}


/*
 * Automatically chooses the color category associated
 * with the selected pattern.
 *
 * The user can still manually change the dropdown
 * afterward.
 */
function updateAssignedColorCategory() {

  const patternSelect =
    document.getElementById(
      "patternSelect"
    );

  if (!patternSelect) return;

  const patternIndex =
    Number(patternSelect.value);

  const colorId =
    getDefaultColorCategory(
      patternIndex
    );


  /*
   * Update the actual color-category dropdown.
   */
  const category =
    document.getElementById(
      "newLayerCategory"
    );

  if (category) {
    category.value = colorId;
  }


  /*
   * Optional display showing the assigned category.
   *
   * This only works if your HTML contains:
   *
   * <span id="assignedColorCategory"></span>
   */
  const display =
    document.getElementById(
      "assignedColorCategory"
    );

  if (!display) return;

  const parameter =
    COLOR_PARAMETERS.find(
      p => p.id === colorId
    );

  display.textContent =
    parameter
      ? `${parameter.label} (${parameter.id})`
      : colorId;


  renderPatternPreview();
}


/*
 * ============================================================
 * RANDOMIZATION
 * ============================================================
 */

function randomHex() {
    // Generate a random number between 0 and 16777215.
    const randomColor = Math.floor(Math.random() * 0xFFFFFF);

    // Convert the number to a hexadecimal string.
    const hex = randomColor.toString(16).padStart(6, "0");

    // Return the color with a # prefix.
    return "#" + hex.toUpperCase();
}

function randomizeColors() {
    // Randomize every color parameter.
    for (const parameter of COLOR_PARAMETERS) {
        peltColors[parameter.id] = randomHex();
    }

    markPaletteCustom();

    // Remove direct layer overrides so layers use
    // their assigned color parameters again.
    for (const layer of layers) {
        layer.colorOverride = null;
    }

    syncColorControls();
}


function randomizePattern() {
    // Preserve the existing base layer and its settings.
    let base = layers.find(layer => layer.patternIndex === 0);

    if (!base) {
        base = createLayer(0);
    }

    // Use actual pattern indices, not array positions.
    const usablePatterns = PATTERNS
        .filter(pattern => pattern.index !== 0);

    // Randomly choose between 1 and 5 additional patterns.
    const count = 1 + Math.floor(Math.random() * 5);

    // Shuffle the available patterns so we don't select
    // the same pattern more than once.
    const shuffledPatterns = [...usablePatterns]
        .sort(() => Math.random() - 0.5);

    const newLayers = [base];

    for (let i = 0; i < count && i < shuffledPatterns.length; i++) {
        const patternIndex = shuffledPatterns[i].index;

        // Assign the appropriate color category.
        newLayers.push(createLayer(patternIndex));
    }

    layers = newLayers;

    selectedLayerId = layers[layers.length - 1].id;

    refreshPelt();
}

/*
 * ============================================================
 * SAVE
 * ============================================================
 */


function getRecipeSaveData() {

  if (!selectedRecipe || !activeRecipeTree) {
    return null;
  }

  return {
    name: selectedRecipe,

    layers: recipeEditorLayers.map(layer => ({
      recipeLayerId: layer.recipeLayerId,
      opacity: layer.opacity,
      enabled: layer.enabled
    })),

    order: recipeEditorLayers.map(
      layer => layer.recipeLayerId
    )
  };
}


function restoreRecipeSaveData(recipeData) {

  if (
    !recipeData ||
    typeof recipeData.name !== "string" ||
    !peltRecipes[recipeData.name]
  ) {
    return false;
  }

  // Select the saved recipe.
  selectPeltRecipe(recipeData.name);

  if (!Array.isArray(recipeData.layers)) {
    return true;
  }

  // Restore opacity and visibility.
  for (const savedLayer of recipeData.layers) {

    const layer = getEditableRecipeLayer(
      savedLayer.recipeLayerId
    );

    if (!layer) continue;

    layer.opacity = Math.max(
      0,
      Math.min(
        1,
        Number(savedLayer.opacity ?? layer.opacity)
      )
    );

    layer.enabled = savedLayer.enabled !== false;
  }

  // Restore layer ordering.
  if (Array.isArray(recipeData.order) && activeRecipeTree) {

    const savedOrder = new Map(
      recipeData.order.map((id, index) => [id, index])
    );

    function restoreOrder(node) {

      if (!node || node.type !== "group") return;

      for (const child of node.children) {
        if (child.type === "group") {
          restoreOrder(child);
        }
      }

      node.children.sort((a, b) => {

        if (a.type !== "layer" || b.type !== "layer") {
          return 0;
        }

        const aOrder = savedOrder.get(a.id);
        const bOrder = savedOrder.get(b.id);

        if (aOrder === undefined || bOrder === undefined) {
          return 0;
        }

        return aOrder - bOrder;
      });
    }

    restoreOrder(activeRecipeTree);
  }

  synchronizeRecipeEditorOrder();

  renderLayers();
  render();

  return true;
}


function savePelt() {

  const data = {

    version: 2,

    recipe:
      getRecipeSaveData(),

    poseIndex:
      currentPoseIndex,

    palette:
      selectedPalette,

    /*
     * Every COLOR_PARAMETERS color is saved.
     */
    colors:
      peltColors,

    /*
     * Every layer remembers which
     * color parameter it uses.
     */
    layers:
      layers.map(layer => ({

        patternIndex:
          layer.patternIndex,

        colorCategory:
          PATTERN_COLOR_MAP[layer.patternIndex] || layer.colorCategory
      }))
  };


  downloadBlob(
    JSON.stringify(
      data,
      null,
      2
    ),

    "clangen-pelt.json",

    "application/json"
  );
}


/*
 * ============================================================
 * LOAD
 * ============================================================
 */

function loadPelt(file) {

  const reader =
    new FileReader();


  reader.onload = () => {

    try {

      const data =
        JSON.parse(
          reader.result
        );

      
      /*
      * Validate the save file.
      */
      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
      ) {
        throw new Error("Invalid save file.");
      }

      if (
        data.version !== undefined &&
        (
          !Number.isInteger(data.version) ||
          data.version < 1 ||
          data.version > 2
        )
      ) {
        throw new Error("Unsupported save-file version.");
      }

      /*
       * Load colors.
       */
      if (
        data.colors &&
        typeof data.colors === "object"
      ) {

        for (
          const parameter
          of COLOR_PARAMETERS
        ) {

          const value =
            normalizeHex(
              data.colors[
                parameter.id
              ]
            );

          if (value) {
            peltColors[
              parameter.id
            ] = value;
          }
        }
      }

      /*
      * Restore the selected palette.
      *
      * Older save files without a palette name
      * are treated as Custom.
      */
      if (
        typeof data.palette === "string" &&
        (
          colorPalettes[data.palette] ||
          data.palette === "Custom"
        )
      ) {
        selectedPalette = data.palette;
      } else {
        selectedPalette = "Custom";
      }

      const paletteSelect =
        document.getElementById("paletteSelect");

      if (paletteSelect) {
        paletteSelect.value = selectedPalette;
      }


      /*
       * Make sure layer data exists.
       */
      if (!Array.isArray(data.layers)) {
        throw new Error(
          "Invalid layer data."
        );
      }


      /*
       * Restore layers.
       */
      layers =
        data.layers

          .filter(layer =>
            Number.isInteger(
              layer.patternIndex
            ) &&
            patternInfo(
              layer.patternIndex
            )
          )

          .map(layer => {

            /*
             * Use the saved category if it is valid.
             *
             * Otherwise, automatically determine
             * the category from PATTERN_COLOR_MAP.
             */
            const savedCategory =
              colorParameterExists(
                layer.colorCategory
              )
                ? layer.colorCategory
                : getDefaultColorCategory(
                    layer.patternIndex
                  );


            return {

              id:
                crypto.randomUUID(),

              patternIndex:
                layer.patternIndex,

              colorCategory:
                savedCategory,

              colorOverride:
                normalizeHex(
                  layer.colorOverride
                ),

              opacity:
                Math.max(
                  0,
                  Math.min(
                    1,
                    Number(
                      layer.opacity ?? 1
                    )
                  )
                ),

              enabled:
                layer.enabled !== false
            };
          });


      /*
       * Make sure there is always a layer.
       */
      if (!layers.length) {

        layers = [
          createLayer(0)
        ];
      }


      selectedLayerId =
        layers.at(-1).id;


      /*
       * Restore pose.
       */
      if (
        Number.isInteger(
          data.poseIndex
        ) &&
        poseInfo(
          data.poseIndex
        )
      ) {

        currentPoseIndex =
          data.poseIndex;

        document.getElementById(
          "poseSelect"
        ).value =
          currentPoseIndex;
      }


      /*
      * Restore recipe, if present.
      */
      if (data.recipe) {
        const restored = restoreRecipeSaveData(data.recipe);

        if (!restored) {
          console.warn(
            "Saved recipe could not be restored."
          );
        }
      } else {
        selectPeltRecipe("");
      }

      refreshPelt();

      setStatus(
        "Pelt loaded."
      );

    } catch (error) {

      console.error(error);

      setStatus(
        "Could not load that pelt file."
      );
    }
  };


  reader.readAsText(file);
}


/*
 * ============================================================
 * FILE / DOWNLOAD FUNCTIONS
 * ============================================================
 */

function downloadBlob(
  text,
  name,
  type
) {

  const blob =
    new Blob(
      [text],
      { type }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href =
    url;

  a.download =
    name;

  a.click();


  setTimeout(
    () =>
      URL.revokeObjectURL(url),
    1000
  );
}


function downloadPNG() {

  const scale = 8;

  const output =
    document.createElement("canvas");

  output.width =
    SPRITE_W * scale;

  output.height =
    SPRITE_H * scale;


  const out =
    output.getContext("2d");

  out.imageSmoothingEnabled =
    false;


  out.drawImage(
    canvas,

    0,
    0,

    output.width,
    output.height
  );


  output.toBlob(
    blob => {

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href =
        url;

      a.download =
        "clangen-pelt.png";

      a.click();


      setTimeout(
        () =>
          URL.revokeObjectURL(url),
        1000
      );
    },

    "image/png"
  );
}


/*
 * ============================================================
 * STATUS / ASSET LOADING
 * ============================================================
 */

function setStatus(message) {

  const status =
    document.getElementById(
      "status"
    );

  if (status) {
    status.textContent =
      message;
  }
}


function loadImage(
  image,
  url,
  name
) {

  return new Promise(
    (resolve, reject) => {

      image.onload =
        () => resolve(image);

      image.onerror =
        () =>
          reject(
            new Error(
              `Could not load ${name}: ${url}`
            )
          );

      image.src =
        url;
    }
  );
}


/*
 * ============================================================
 * RESET
 * ============================================================
 */

function resetPelt() {

  /*
   * Reset to the WHITE ClanGen palette.
   */
  applyColorPalette("WHITE");

  layers = [
    createLayer(0)
  ];

  selectedLayerId =
    layers[0].id;

  refreshPelt();

  renderPatternPreview();
}


/*
 * ============================================================
 * REFRESH
 * ============================================================
 */

function refreshPelt() {

  renderColorControls();

  renderLayers();


  /*
   * Wait one animation frame so the UI
   * and color controls have updated before
   * rendering the canvas.
   */
  requestAnimationFrame(() => {
    render();
  });
}


/*
 * ============================================================
 * EVENT LISTENERS
 * ============================================================
 */

/*
 * Color palette selection.
 */

document
  .getElementById("paletteSelect")
  .addEventListener("change", e => {
    const previousLayers = recipeEditorLayers;

    const paletteName = e.target.value;

    if (paletteName === "Custom") {
      selectedPalette = "Custom";
    } else {
      applyColorPalette(paletteName);
    }

    if (selectedRecipe) {
      const recipe = peltRecipes[selectedRecipe];

      if (recipe) {
        activeRecipeLayers = resolveRecipeLayers(recipe);

        reorderRecipeTreeFromEditor(
          activeRecipeTree,
          previousLayers
        );

        recipeEditorLayers = createEditableRecipeLayers(
          activeRecipeLayers,
          previousLayers
        );

        synchronizeRecipeEditorOrder();

        renderLayers();
      }
    }

    render();
  });


/*
 * Pose selection.
 */


document
  .getElementById("poseSelect")
  .addEventListener("change", e => {
    const previousLayers = recipeEditorLayers;

    currentPoseIndex = Number(e.target.value);

    if (selectedRecipe) {
      const recipe = peltRecipes[selectedRecipe];

      if (recipe) {
        activeRecipeLayers = resolveRecipeLayers(recipe);

        reorderRecipeTreeFromEditor(
          activeRecipeTree,
          previousLayers
        );

        recipeEditorLayers = createEditableRecipeLayers(
          activeRecipeLayers,
          previousLayers
        );

        synchronizeRecipeEditorOrder();

        renderLayers();
      }
    }

    render();
    renderPatternPreview();
  });



/*
 * Pelt recipe selection.
 */
document
  .getElementById("recipeSelect")
  .addEventListener("change", e => {

    selectPeltRecipe(e.target.value);

  });


/*
 * Add pattern button.
 */
document
  .getElementById("addLayerBtn")
  .addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "patternSelect"
        )
        .focus();
    }
  );


/*
 * Pattern selection.
 *
 * This automatically changes the color-category
 * dropdown to the color associated with that pattern.
 */
document.getElementById("patternSelect").addEventListener("change", () => {
    renderPatternPreview();
});

document.getElementById("flipBtn").addEventListener("click", () => {
    isFlipped = !isFlipped;

    document.getElementById("flipBtn").textContent =
        isFlipped ? "Flip" : "Flip";

    render();
});


/*
 * Confirm adding a pattern.
 *
 * The user can accept the automatically assigned
 * color category or manually choose another one.
 */
document
  .getElementById("confirmAddBtn")
  .addEventListener(
    "click",
    () => {

      const patternIndex =
        Number(
          document.getElementById(
            "patternSelect"
          ).value
        );


      const categoryElement =
        document.getElementById(
          "newLayerCategory"
        );


      const colorCategory =
        categoryElement
          ? categoryElement.value
          : getDefaultColorCategory(
              patternIndex
            );


      const layer =
        createLayer(
          patternIndex,
          colorCategory
        );


      layers.push(layer);


      selectedLayerId =
        layer.id;


      renderLayers();
      render();
    }
  );

document
    .getElementById("newLayerCategory")
    .addEventListener(
        "change",
        renderPatternPreview
    );

/*
 * Randomize.
 */
document.getElementById("randomizeColorBtn").addEventListener("click", randomizeColors);

document.getElementById("randomizePatternBtn").addEventListener("click", randomizePattern);


/*
 * Download PNG.
 */
document
  .getElementById("downloadBtn")
  .addEventListener(
    "click",
    downloadPNG
  );


/*
 * Save pelt.
 */
document
  .getElementById("saveBtn")
  .addEventListener(
    "click",
    savePelt
  );


/*
 * Load pelt.
 */
document
  .getElementById("loadInput")
  .addEventListener(
    "change",
    e => {

      if (e.target.files[0]) {
        loadPelt(
          e.target.files[0]
        );
      }
    }
  );


/*
 * Reset.
 */
document
  .getElementById("resetBtn")
  .addEventListener(
    "click",
    resetPelt
  );


/*
 * ============================================================
 * INITIALIZATION
 * ============================================================
 */

Promise.all([

  loadImage(
    lineart,
    LINEART_URL,
    "lineart.png"
  ),

  loadImage(
    maskAtlas,
    MASK_URL,
    "pelt_parts_masks.png"
  ),

  loadPeltRecipes(),

  loadColorPalettes()

])

  .then(() => {

    assetsReady = true;

    populateControls();

    populateRecipeSelect();

    populatePaletteSelect();

    applyColorPalette("WHITE");

    renderColorControls();

    renderLayers();

    render();

    renderPatternPreview();

    setStatus(
      "Assets loaded."
    );
  })

  .catch(error => {

    console.error(error);

    populateControls();

    renderColorControls();

    renderLayers();

    setStatus(
      error.message
    );
  });