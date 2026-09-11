import { PATTERNS, POSES } from "./data.js";
import { COLOR_PARAMETERS, PATTERN_COLOR_MAP } from "./colors.js";

const LINEART_URL = "assets/lineart.png";
const MASK_URL = "assets/pelt_parts_masks.png";

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


/*
 * ============================================================
 * COLOR DATA
 * ============================================================
 */

let peltColors = {};

for (const parameter of COLOR_PARAMETERS) {
  peltColors[parameter.id] = "#FFFFFF";
}


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

let selectedLayerId = layers[0].id;


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

  /*
   * Draw each enabled pelt-part layer.
   *
   * Each layer can have a different colorCategory,
   * meaning different pelt parts can use completely
   * different colors.
   */
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


  /*
   * Draw the lineart over the colored masks.
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

  /*
   * Reverse the array so the topmost layer appears first
   * in the interface.
   */
  [...layers].reverse().forEach(layer => {
    const pattern =
      patternInfo(layer.patternIndex) || {
        label: "Unknown pattern"
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
          ${pattern.label}
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
          class="layer-color"
          type="color"
          value="${getColorForLayer(layer)}"
        >

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
    row
      .querySelector(".layer-enabled")
      .addEventListener("change", e => {

        layer.enabled =
          e.target.checked;

        render();
      });


    /*
     * Direct color override.
     *
     * If the user manually changes this color,
     * the layer stops using its COLOR_PARAMETERS
     * category and instead uses this exact color.
     */
    row
      .querySelector(".layer-color")
      .addEventListener("input", e => {

        layer.colorOverride =
          e.target.value.toUpperCase();

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

        if (layers.length === 1) {
          return;
        }

        layers =
          layers.filter(
            x => x.id !== layer.id
          );

        if (
          !layers.some(
            x => x.id === selectedLayerId
          )
        ) {
          selectedLayerId =
            layers.at(-1).id;
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

        moveLayer(
          layer.id,
          1
        );
      });


    /*
     * Move layer down.
     */
    row
      .querySelector('[data-action="down"]')
      .addEventListener("click", e => {

        e.stopPropagation();

        moveLayer(
          layer.id,
          -1
        );
      });


    container.appendChild(row);
  });
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

          hex.value =
            peltColors[parameter.id];

          renderLayers();
          render();
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

          color.value =
            value;

          renderLayers();
          render();
        }
      );


      container.appendChild(element);
    }
  }
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

  const category =
    document.getElementById(
      "newLayerCategory"
    );

  if (category) {

    category.innerHTML = "";

    COLOR_PARAMETERS.forEach(parameter => {

      const option =
        document.createElement("option");

      option.value =
        parameter.id;

      option.textContent =
        `${parameter.label} (${parameter.id})`;

      category.appendChild(option);
    });
  }


  /*
   * Automatically assign the color category
   * associated with the currently selected pattern.
   */
  updateAssignedColorCategory();
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
}


/*
 * ============================================================
 * RANDOMIZATION
 * ============================================================
 */

function randomHex() {

  return (
    "#" +
    Math.floor(
      Math.random() * 0x1000000
    )
      .toString(16)
      .padStart(6, "0")
      .toUpperCase()
  );
}


function randomize() {

  /*
   * Give every COLOR_PARAMETERS entry
   * its own random color.
   *
   * This is important because different
   * pelt parts can reference different
   * color parameters.
   */
  for (const parameter of COLOR_PARAMETERS) {

    peltColors[parameter.id] =
      randomHex();
  }


  /*
   * Get every pattern except BASEMASK.
   */
  const usablePatterns =
    PATTERNS
      .map(pattern => pattern.index)
      .filter(index => index !== 0);


  /*
   * Base layer.
   */
  layers = [
    createLayer(0)
  ];


  /*
   * Add 1–3 random patterns.
   *
   * createLayer() automatically chooses
   * the COLOR_PARAMETERS category associated
   * with each pattern.
   */
  const count =
    1 + Math.floor(
      Math.random() * 3
    );


  for (let i = 0; i < count; i++) {

    const patternIndex =
      usablePatterns[
        Math.floor(
          Math.random() *
          usablePatterns.length
        )
      ];


    const layer =
      createLayer(patternIndex);


    layer.opacity =
      0.5 +
      Math.random() * 0.5;


    layers.push(layer);
  }


  /*
   * Select the top layer.
   */
  selectedLayerId =
    layers.at(-1).id;


  refreshPelt();
}


/*
 * ============================================================
 * SAVE
 * ============================================================
 */

function savePelt() {

  const data = {

    poseIndex:
      currentPoseIndex,

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
          layer.colorCategory,

        colorOverride:
          layer.colorOverride,

        opacity:
          layer.opacity,

        enabled:
          layer.enabled
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

  peltColors = {};

  for (const parameter of COLOR_PARAMETERS) {

    peltColors[parameter.id] =
      "#FFFFFF";
  }


  layers = [
    createLayer(0)
  ];


  selectedLayerId =
    layers[0].id;


  refreshPelt();
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
 * Pose selection.
 */
document
  .getElementById("poseSelect")
  .addEventListener(
    "change",
    e => {

      currentPoseIndex =
        Number(e.target.value);

      render();
    }
  );


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
document
  .getElementById("patternSelect")
  .addEventListener(
    "change",
    updateAssignedColorCategory
  );


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


/*
 * Randomize.
 */
document
  .getElementById("randomizeBtn")
  .addEventListener(
    "click",
    randomize
  );


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
  )

])

  .then(() => {

    assetsReady = true;

    populateControls();

    renderColorControls();

    renderLayers();

    render();

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