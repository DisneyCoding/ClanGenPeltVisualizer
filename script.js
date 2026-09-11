import { PATTERNS, POSES } from "./data.js";
import {
  COLOR_PARAMETERS,
  PELT_COLORS
} from "./colors.js";


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


let currentPoseIndex = 18;
let assetsReady = false;


/*
 * ------------------------------------------------------------
 * COLOR SYSTEM
 * ------------------------------------------------------------
 *
 * peltColors contains the 41 ClanGen color parameters.
 *
 * Layers reference these parameters by name instead of storing
 * their own hex color.
 */

let peltColors = createDefaultColors();


function createDefaultColors() {
  const white = PELT_COLORS.WHITE;

  const result = {};

  for (const parameter of COLOR_PARAMETERS) {
    result[parameter.id] =
      normalizeHex(white?.[parameter.id]) || "#FFFFFF";
  }

  return result;
}


/*
 * ------------------------------------------------------------
 * LAYERS
 * ------------------------------------------------------------
 */

let layers = [
  {
    id: crypto.randomUUID(),
    patternIndex: 0,
    colorCategory: "base",
    opacity: 1,
    enabled: true
  }
];

let selectedLayerId = layers[0].id;


/*
 * ------------------------------------------------------------
 * BASIC HELPERS
 * ------------------------------------------------------------
 */

function patternInfo(index) {
  return PATTERNS.find(pattern => pattern.index === index);
}


function poseInfo(index) {
  return POSES.find(pose => pose.index === index);
}


function normalizeHex(value) {
  if (!value) return null;

  let v = String(value).trim();

  if (!v.startsWith("#")) {
    v = "#" + v;
  }

  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    return v.toUpperCase();
  }

  return null;
}


function hexToRgb(hex) {
  const value = normalizeHex(hex);

  if (!value) return null;

  return {
    r: parseInt(value.slice(1, 3), 16),
    g: parseInt(value.slice(3, 5), 16),
    b: parseInt(value.slice(5, 7), 16)
  };
}


/*
 * ------------------------------------------------------------
 * COLOR LOOKUP
 * ------------------------------------------------------------
 */

function getCategoryColor(category) {
  return peltColors[category] || "#FF00FF";
}


function getCategoryLabel(category) {
  const parameter = COLOR_PARAMETERS.find(
    item => item.id === category
  );

  return parameter ? parameter.label : category;
}


/*
 * ------------------------------------------------------------
 * COLOR EDITOR
 * ------------------------------------------------------------
 */

function populateColorControls() {
  const container = document.getElementById("colors");

  container.innerHTML = "";

  let currentGroup = null;

  for (const parameter of COLOR_PARAMETERS) {

    if (parameter.group !== currentGroup) {
      currentGroup = parameter.group;

      const heading = document.createElement("h3");
      heading.className = "color-group-title";
      heading.textContent = currentGroup;

      container.appendChild(heading);
    }


    const row = document.createElement("div");
    row.className = "color-row";


    const label = document.createElement("label");
    label.textContent = parameter.label;
    label.htmlFor = `color-${parameter.id}`;


    const colorInput = document.createElement("input");

    colorInput.type = "color";
    colorInput.id = `color-${parameter.id}`;
    colorInput.value =
      normalizeHex(peltColors[parameter.id]) || "#FFFFFF";


    const hexInput = document.createElement("input");

    hexInput.type = "text";
    hexInput.value =
      normalizeHex(peltColors[parameter.id]) || "#FFFFFF";

    hexInput.maxLength = 7;
    hexInput.spellcheck = false;


    colorInput.addEventListener("input", () => {

      const value =
        colorInput.value.toUpperCase();

      peltColors[parameter.id] = value;

      hexInput.value = value;

      render();
    });


    hexInput.addEventListener("change", () => {

      const value = normalizeHex(hexInput.value);

      if (!value) {
        hexInput.value =
          peltColors[parameter.id];

        return;
      }

      peltColors[parameter.id] = value;

      colorInput.value = value;

      render();
    });


    row.appendChild(label);
    row.appendChild(colorInput);
    row.appendChild(hexInput);

    container.appendChild(row);
  }
}


/*
 * Update all color controls to match peltColors.
 */

function syncColorControls() {

  for (const parameter of COLOR_PARAMETERS) {

    const value =
      normalizeHex(peltColors[parameter.id]) ||
      "#FFFFFF";

    const colorInput =
      document.getElementById(
        `color-${parameter.id}`
      );

    if (!colorInput) continue;

    const row = colorInput.parentElement;

    const hexInput =
      row.querySelector('input[type="text"]');

    colorInput.value = value;
    hexInput.value = value;
  }
}


/*
 * ------------------------------------------------------------
 * COLOR PRESETS
 * ------------------------------------------------------------
 */

function populateColorPresets() {

  const select =
    document.getElementById("colorPresetSelect");

  select.innerHTML = "";

  for (const presetName of Object.keys(PELT_COLORS)) {

    const option =
      document.createElement("option");

    option.value = presetName;
    option.textContent = presetName;

    select.appendChild(option);
  }

  if (PELT_COLORS.WHITE) {
    select.value = "WHITE";
  }
}


function applyColorPreset(name) {

  const preset = PELT_COLORS[name];

  if (!preset) return;

  for (const parameter of COLOR_PARAMETERS) {

    const value =
      normalizeHex(preset[parameter.id]);

    if (value) {
      peltColors[parameter.id] = value;
    }
  }

  syncColorControls();
  render();
}


/*
 * ------------------------------------------------------------
 * MASK COLORING
 * ------------------------------------------------------------
 */

function tintMask(maskCanvas, color, opacity) {

  const rgb = hexToRgb(color);

  if (!rgb) return null;


  const output =
    document.createElement("canvas");

  output.width = SPRITE_W;
  output.height = SPRITE_H;


  const out =
    output.getContext("2d", {
      willReadFrequently: true
    });


  out.clearRect(
    0,
    0,
    SPRITE_W,
    SPRITE_H
  );


  out.fillStyle =
    `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

  out.fillRect(
    0,
    0,
    SPRITE_W,
    SPRITE_H
  );


  /*
   * Use the mask alpha as the transparency
   * of the colored layer.
   */

  out.globalCompositeOperation =
    "destination-in";

  out.globalAlpha = opacity;

  out.drawImage(
    maskCanvas,
    0,
    0
  );


  return output;
}


/*
 * ------------------------------------------------------------
 * MASK ATLAS
 * ------------------------------------------------------------
 */

function getMaskSprite(pattern, poseIndex) {

  const groupX =
    pattern.groupX * GROUP_W;

  const groupY =
    pattern.groupY * GROUP_H;


  const poseX =
    (poseIndex % 4) * SPRITE_W;

  const poseY =
    Math.floor(poseIndex / 4) * SPRITE_H;


  const sprite =
    document.createElement("canvas");

  sprite.width = SPRITE_W;
  sprite.height = SPRITE_H;


  const spriteCtx =
    sprite.getContext("2d");

  spriteCtx.imageSmoothingEnabled = false;


  spriteCtx.drawImage(
    maskAtlas,

    groupX + poseX,
    groupY + poseY,

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
 * ------------------------------------------------------------
 * MAIN RENDER
 * ------------------------------------------------------------
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
   * Render each pelt layer.
   */

  for (const layer of layers) {

    if (!layer.enabled) continue;


    const pattern =
      patternInfo(layer.patternIndex);

    if (!pattern) continue;


    const mask =
      getMaskSprite(
        pattern,
        currentPoseIndex
      );


    const color =
      getCategoryColor(
        layer.colorCategory
      );


    const tinted =
      tintMask(
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
   * Lineart is rendered last.
   */

  const lineX =
    (currentPoseIndex % 4) * SPRITE_W;

  const lineY =
    Math.floor(currentPoseIndex / 4) * SPRITE_H;


  ctx.drawImage(
    lineart,

    lineX,
    lineY,

    SPRITE_W,
    SPRITE_H,

    0,
    0,

    SPRITE_W,
    SPRITE_H
  );
}


/*
 * ------------------------------------------------------------
 * LAYER UI
 * ------------------------------------------------------------
 */

function renderLayers() {

  const container =
    document.getElementById("layers");

  container.innerHTML = "";


  /*
   * Reverse display order so the topmost layer
   * appears first in the UI.
   */

  [...layers]
    .reverse()
    .forEach(layer => {

      const pattern =
        patternInfo(layer.patternIndex);

      if (!pattern) return;


      const row =
        document.createElement("div");

      row.className =
        "layer" +
        (
          layer.id === selectedLayerId
            ? " selected"
            : ""
        );


      row.innerHTML = `
        <div class="layer-top">

          <input
            class="layer-enabled"
            type="checkbox"
            ${layer.enabled ? "checked" : ""}
            title="Enable layer"
          >

          <div class="layer-name">
            ${pattern.label}
          </div>

          <div class="layer-buttons">

            <button
              data-action="up"
              title="Move up"
            >↑</button>

            <button
              data-action="down"
              title="Move down"
            >↓</button>

            <button
              data-action="delete"
              title="Delete layer"
            >×</button>

          </div>

        </div>

        <div class="layer-controls">

          <span class="layer-color-category">
            ${getCategoryLabel(layer.colorCategory)}
          </span>

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


      row.addEventListener("click", () => {

        selectedLayerId =
          layer.id;

        renderLayers();
      });


      row
        .querySelector(".layer-enabled")
        .addEventListener(
          "change",
          event => {

            layer.enabled =
              event.target.checked;

            render();
          }
        );


      row
        .querySelector(".layer-opacity")
        .addEventListener(
          "input",
          event => {

            layer.opacity =
              Number(event.target.value);

            row
              .querySelector(".opacity-value")
              .textContent =
                Math.round(
                  layer.opacity * 100
                ) + "%";

            render();
          }
        );


      row
        .querySelector('[data-action="delete"]')
        .addEventListener(
          "click",
          event => {

            event.stopPropagation();

            if (layers.length === 1) {
              return;
            }


            layers =
              layers.filter(
                item => item.id !== layer.id
              );


            if (
              !layers.some(
                item =>
                  item.id === selectedLayerId
              )
            ) {

              selectedLayerId =
                layers[
                  layers.length - 1
                ].id;
            }


            renderLayers();
            render();
          }
        );


      row
        .querySelector('[data-action="up"]')
        .addEventListener(
          "click",
          event => {

            event.stopPropagation();

            moveLayer(
              layer.id,
              1
            );
          }
        );


      row
        .querySelector('[data-action="down"]')
        .addEventListener(
          "click",
          event => {

            event.stopPropagation();

            moveLayer(
              layer.id,
              -1
            );
          }
        );


      container.appendChild(row);
    });
}


/*
 * ------------------------------------------------------------
 * MOVE LAYER
 * ------------------------------------------------------------
 */

function moveLayer(id, direction) {

  const index =
    layers.findIndex(
      layer => layer.id === id
    );


  const target =
    index + direction;


  if (
    index < 0 ||
    target < 0 ||
    target >= layers.length
  ) {
    return;
  }


  [
    layers[index],
    layers[target]
  ] = [
    layers[target],
    layers[index]
  ];


  renderLayers();
  render();
}


/*
 * ------------------------------------------------------------
 * ADD LAYER
 * ------------------------------------------------------------
 */

function addLayer(
  patternIndex,
  colorCategory
) {

  const layer = {

    id: crypto.randomUUID(),

    patternIndex,

    colorCategory:
      colorCategory || "pattern",

    opacity: 1,

    enabled: true
  };


  layers.push(layer);

  selectedLayerId =
    layer.id;


  renderLayers();
  render();
}


/*
 * ------------------------------------------------------------
 * POPULATE SELECT MENUS
 * ------------------------------------------------------------
 */

function populateControls() {

  /*
   * Pose selector
   */

  const poseSelect =
    document.getElementById(
      "poseSelect"
    );


  poseSelect.innerHTML = "";


  for (const pose of POSES) {

    const option =
      document.createElement("option");

    option.value =
      pose.index;

    option.textContent =
      pose.label;

    poseSelect.appendChild(option);
  }


  poseSelect.value =
    currentPoseIndex;


  /*
   * Pattern selector
   */

  const patternSelect =
    document.getElementById(
      "patternSelect"
    );


  patternSelect.innerHTML = "";


  for (const pattern of PATTERNS) {

    const option =
      document.createElement("option");

    option.value =
      pattern.index;

    option.textContent =
      pattern.label;

    patternSelect.appendChild(option);
  }


  /*
   * Layer color category selector
   */

  const categorySelect =
    document.getElementById(
      "newLayerCategory"
    );


  categorySelect.innerHTML = "";


  for (const parameter of COLOR_PARAMETERS) {

    const option =
      document.createElement("option");

    option.value =
      parameter.id;

    option.textContent =
      `${parameter.group}: ${parameter.label}`;

    categorySelect.appendChild(option);
  }


  /*
   * Pattern is the default category.
   */

  categorySelect.value =
    "pattern";
}


/*
 * ------------------------------------------------------------
 * RANDOM COLORS
 * ------------------------------------------------------------
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


/*
 * ------------------------------------------------------------
 * RANDOMIZE
 * ------------------------------------------------------------
 */

function randomize() {

  /*
   * Randomize every ClanGen color parameter.
   */

  for (const parameter of COLOR_PARAMETERS) {

    peltColors[parameter.id] =
      randomHex();
  }


  /*
   * Create a random collection of layers.
   */

  const usablePatterns =
    PATTERNS
      .map((_, index) => index)
      .filter(index => index !== 0);


  const count =
    1 + Math.floor(
      Math.random() * 3
    );


  layers = [
    {
      id: crypto.randomUUID(),
      patternIndex: 0,
      colorCategory: "base",
      opacity: 1,
      enabled: true
    }
  ];


  for (let i = 0; i < count; i++) {

    const patternIndex =
      usablePatterns[
        Math.floor(
          Math.random() *
          usablePatterns.length
        )
      ];


    const category =
      COLOR_PARAMETERS[
        Math.floor(
          Math.random() *
          COLOR_PARAMETERS.length
        )
      ].id;


    layers.push({

      id: crypto.randomUUID(),

      patternIndex,

      colorCategory:
        category,

      opacity:
        0.5 +
        Math.random() * 0.5,

      enabled: true
    });
  }


  selectedLayerId =
    layers[
      layers.length - 1
    ].id;


  syncColorControls();

  renderLayers();

  render();
}


/*
 * ------------------------------------------------------------
 * SAVE PELT
 * ------------------------------------------------------------
 */

function savePelt() {

  const data = {

    version: 3,

    poseIndex:
      currentPoseIndex,

    colors: {
      ...peltColors
    },

    layers:
      layers.map(
        ({
          patternIndex,
          colorCategory,
          opacity,
          enabled
        }) => ({
          patternIndex,
          colorCategory,
          opacity,
          enabled
        })
      )
  };


  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const a =
    document.createElement("a");


  a.href = url;

  a.download =
    "clangen-pelt.json";

  a.click();


  URL.revokeObjectURL(url);
}


/*
 * ------------------------------------------------------------
 * LOAD PELT
 * ------------------------------------------------------------
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


      if (
        !Array.isArray(
          data.layers
        )
      ) {
        throw new Error(
          "Invalid layer data."
        );
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
       * Load layers.
       */

      layers =
        data.layers

          .filter(layer =>
            Number.isInteger(
              layer.patternIndex
            ) &&
            PATTERNS.some(
              pattern =>
                pattern.index ===
                layer.patternIndex
            )
          )

          .map(layer => {

            let colorCategory =
              layer.colorCategory;


            /*
             * If this is an old save file
             * that does not have colorCategory,
             * use pattern as the fallback.
             */

            if (
              !COLOR_PARAMETERS.some(
                parameter =>
                  parameter.id ===
                  colorCategory
              )
            ) {

              if (
                layer.patternIndex === 0
              ) {
                colorCategory =
                  "base";
              } else {
                colorCategory =
                  "pattern";
              }
            }


            return {

              id:
                crypto.randomUUID(),

              patternIndex:
                layer.patternIndex,

              colorCategory,

              opacity:
                Math.max(
                  0,
                  Math.min(
                    1,
                    Number(
                      layer.opacity ??
                      1
                    )
                  )
                ),

              enabled:
                layer.enabled !== false
            };
          });


      if (!layers.length) {

        throw new Error(
          "No valid layers found."
        );
      }


      selectedLayerId =
        layers[
          layers.length - 1
        ].id;


      /*
       * Load pose.
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


      syncColorControls();

      renderLayers();

      render();

      setStatus(
        "Pelt loaded."
      );

    } catch (error) {

      setStatus(
        "Could not load that pelt file."
      );

      console.error(error);
    }
  };


  reader.readAsText(file);
}


/*
 * ------------------------------------------------------------
 * DOWNLOAD PNG
 * ------------------------------------------------------------
 */

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


  output.toBlob(blob => {

    const url =
      URL.createObjectURL(blob);


    const a =
      document.createElement("a");


    a.href = url;

    a.download =
      "clangen-pelt.png";

    a.click();


    URL.revokeObjectURL(url);

  }, "image/png");
}


/*
 * ------------------------------------------------------------
 * STATUS
 * ------------------------------------------------------------
 */

function setStatus(message) {

  document.getElementById(
    "status"
  ).textContent =
    message;
}


/*
 * ------------------------------------------------------------
 * IMAGE LOADING
 * ------------------------------------------------------------
 */

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
        () => reject(
          new Error(
            `Could not load ${name}: ${url}`
          )
        );


      image.src = url;
    }
  );
}


/*
 * ------------------------------------------------------------
 * EVENT LISTENERS
 * ------------------------------------------------------------
 */

document
  .getElementById("poseSelect")
  .addEventListener(
    "change",
    event => {

      currentPoseIndex =
        Number(
          event.target.value
        );

      render();
    }
  );


document
  .getElementById("colorPresetSelect")
  .addEventListener(
    "change",
    event => {

      applyColorPreset(
        event.target.value
      );
    }
  );


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


      const colorCategory =
        document.getElementById(
          "newLayerCategory"
        ).value;


      addLayer(
        patternIndex,
        colorCategory
      );
    }
  );


document
  .getElementById("randomizeBtn")
  .addEventListener(
    "click",
    randomize
  );


document
  .getElementById("resetBtn")
  .addEventListener(
    "click",
    () => {

      /*
       * Reset to WHITE.
       */

      peltColors =
        createDefaultColors();


      layers = [
        {
          id:
            crypto.randomUUID(),

          patternIndex: 0,

          colorCategory:
            "base",

          opacity: 1,

          enabled: true
        }
      ];


      selectedLayerId =
        layers[0].id;


      document.getElementById(
        "colorPresetSelect"
      ).value =
        "WHITE";


      syncColorControls();

      renderLayers();

      render();
    }
  );


document
  .getElementById("downloadBtn")
  .addEventListener(
    "click",
    downloadPNG
  );


document
  .getElementById("saveBtn")
  .addEventListener(
    "click",
    savePelt
  );


document
  .getElementById("loadInput")
  .addEventListener(
    "change",
    event => {

      if (
        event.target.files[0]
      ) {

        loadPelt(
          event.target.files[0]
        );
      }
    }
  );


/*
 * ------------------------------------------------------------
 * STARTUP
 * ------------------------------------------------------------
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

    console.log(
      "Lineart loaded:",
      lineart.naturalWidth,
      "x",
      lineart.naturalHeight
    );


    console.log(
      "Mask atlas loaded:",
      maskAtlas.naturalWidth,
      "x",
      maskAtlas.naturalHeight
    );


    assetsReady = true;


    populateControls();

    populateColorControls();

    populateColorPresets();

    syncColorControls();

    renderLayers();

    render();


    setStatus(
      "Assets loaded."
    );
  })

  .catch(error => {

    console.error(error);

    setStatus(
      error.message
    );
  });