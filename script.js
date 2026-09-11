const LINEART_URL = "assets/lineart.png";
const MASK_URL = "assets/pelt_parts_masks.png";

const SPRITE_W = 50;
const SPRITE_H = 50;
const GROUP_W = 200;
const GROUP_H = 400;

const canvas = document.getElementById("preview");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
ctx.imageSmoothingEnabled = false;

const lineart = new Image();
lineart.src = LINEART_URL;
const maskAtlas = new Image();
maskAtlas.src = MASK_URL;

let layers = [
  {
    id: crypto.randomUUID(),
    patternIndex: 0,
    color: "#8A684D",
    opacity: 1,
    enabled: true
  }
];

let selectedLayerId = layers[0].id;
let currentPoseIndex = 18; // adult_short2
let assetsReady = false;

import { PATTERNS, POSES } from "./data.js";

function patternInfo(index) {
  return PATTERNS[index];
}

function poseInfo(index) {
  return POSES.find(p => p.index === index);
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function normalizeHex(value) {
  if (!value) return null;
  let v = value.trim();
  if (!v.startsWith("#")) v = "#" + v;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
  return null;
}

function tintMask(maskCanvas, color, opacity) {
  const rgb = hexToRgb(color);
  if (!rgb) return null;

  const output = document.createElement("canvas");
  output.width = SPRITE_W;
  output.height = SPRITE_H;

  const out = output.getContext("2d", { willReadFrequently: true });
  out.clearRect(0, 0, SPRITE_W, SPRITE_H);

  out.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  out.fillRect(0, 0, SPRITE_W, SPRITE_H);

  // Keep the mask's alpha as the transparency of the colored layer.
  out.globalCompositeOperation = "destination-in";
  out.globalAlpha = opacity;
  out.drawImage(maskCanvas, 0, 0);

  return output;
}

function getMaskSprite(pattern, poseIndex) {
  const groupX = pattern.groupX * GROUP_W;
  const groupY = pattern.groupY * GROUP_H;

  const poseX = (poseIndex % 4) * SPRITE_W;
  const poseY = Math.floor(poseIndex / 4) * SPRITE_H;

  const sprite = document.createElement("canvas");
  sprite.width = SPRITE_W;
  sprite.height = SPRITE_H;

  sprite.getContext("2d").drawImage(
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

function render() {
  if (!assetsReady) return;

  ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);

  for (const layer of layers) {
    if (!layer.enabled) continue;

    const pattern = patternInfo(layer.patternIndex);
    const mask = getMaskSprite(pattern, currentPoseIndex);
    const tinted = tintMask(mask, layer.color, layer.opacity);

    if (tinted) {
      ctx.drawImage(tinted, 0, 0);
    }
  }

  // Lineart is deliberately rendered last.
  const lineX = (currentPoseIndex % 4) * SPRITE_W;
  const lineY = Math.floor(currentPoseIndex / 4) * SPRITE_H;

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

function renderLayers() {
  const container = document.getElementById("layers");
  container.innerHTML = "";

  [...layers].reverse().forEach(layer => {
    const pattern = patternInfo(layer.patternIndex);
    const row = document.createElement("div");
    row.className = "layer" + (layer.id === selectedLayerId ? " selected" : "");

    row.innerHTML = `
      <div class="layer-top">
        <input class="layer-enabled" type="checkbox" ${layer.enabled ? "checked" : ""} title="Enable layer">
        <div class="layer-name">${pattern.label}</div>
        <div class="layer-buttons">
          <button data-action="up" title="Move up">↑</button>
          <button data-action="down" title="Move down">↓</button>
          <button data-action="delete" title="Delete layer">×</button>
        </div>
      </div>
      <div class="layer-controls">
        <input class="layer-color" type="color" value="${layer.color}">
        <input class="layer-opacity" type="range" min="0" max="1" step="0.01" value="${layer.opacity}">
        <span class="opacity-value">${Math.round(layer.opacity * 100)}%</span>
      </div>
    `;

    row.addEventListener("click", () => {
      selectedLayerId = layer.id;
      renderLayers();
    });

    row.querySelector(".layer-enabled").addEventListener("change", e => {
      layer.enabled = e.target.checked;
      render();
    });

    row.querySelector(".layer-color").addEventListener("input", e => {
      layer.color = e.target.value.toUpperCase();
      syncColorControls();
      render();
    });

    row.querySelector(".layer-opacity").addEventListener("input", e => {
      layer.opacity = Number(e.target.value);
      row.querySelector(".opacity-value").textContent =
        Math.round(layer.opacity * 100) + "%";
      render();
    });

    row.querySelector('[data-action="delete"]').addEventListener("click", e => {
      e.stopPropagation();
      if (layers.length === 1) return;
      layers = layers.filter(x => x.id !== layer.id);
      if (!layers.some(x => x.id === selectedLayerId)) {
        selectedLayerId = layers[layers.length - 1].id;
      }
      renderLayers();
      render();
    });

    row.querySelector('[data-action="up"]').addEventListener("click", e => {
      e.stopPropagation();
      moveLayer(layer.id, 1);
    });

    row.querySelector('[data-action="down"]').addEventListener("click", e => {
      e.stopPropagation();
      moveLayer(layer.id, -1);
    });

    container.appendChild(row);
  });
}

function moveLayer(id, direction) {
  const index = layers.findIndex(x => x.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= layers.length) return;

  [layers[index], layers[target]] = [layers[target], layers[index]];
  renderLayers();
  render();
}

function syncColorControls() {
  const base = layers.find(l => l.patternIndex === 0);
  if (base) {
    document.getElementById("baseColor").value = base.color;
    document.getElementById("baseHex").value = base.color;
  }
}

function addLayer(patternIndex, color) {
  const layer = {
    id: crypto.randomUUID(),
    patternIndex,
    color: normalizeHex(color) || "#4B382C",
    opacity: 1,
    enabled: true
  };

  layers.push(layer);
  selectedLayerId = layer.id;
  renderLayers();
  render();
}

function populateControls() {
  const poseSelect = document.getElementById("poseSelect");
  for (const pose of POSES) {
    const option = document.createElement("option");
    option.value = pose.index;
    option.textContent = pose.label;
    poseSelect.appendChild(option);
  }
  poseSelect.value = currentPoseIndex;

  const patternSelect = document.getElementById("patternSelect");
  PATTERNS.forEach((pattern, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = pattern.label;
    patternSelect.appendChild(option);
  });
}

function wireColorPair(colorId, hexId, onChange) {
  const color = document.getElementById(colorId);
  const hex = document.getElementById(hexId);

  color.addEventListener("input", () => {
    const value = color.value.toUpperCase();
    hex.value = value;
    onChange(value);
  });

  hex.addEventListener("change", () => {
    const value = normalizeHex(hex.value);
    if (!value) {
      hex.value = color.value.toUpperCase();
      return;
    }
    color.value = value;
    onChange(value);
  });
}

function setBaseColor(value) {
  const base = layers.find(l => l.patternIndex === 0);
  if (!base) return;
  base.color = value;
  renderLayers();
  render();
}

function randomHex() {
  return "#" + Math.floor(Math.random() * 0x1000000)
    .toString(16).padStart(6, "0").toUpperCase();
}

function randomize() {
  const base = layers.find(l => l.patternIndex === 0);
  if (base) base.color = randomHex();

  const usablePatterns = PATTERNS.map((_, i) => i).filter(i => i !== 0);
  const count = 1 + Math.floor(Math.random() * 3);

  layers = [base || {
    id: crypto.randomUUID(),
    patternIndex: 0,
    color: randomHex(),
    opacity: 1,
    enabled: true
  }];

  for (let i = 0; i < count; i++) {
    const patternIndex = usablePatterns[
      Math.floor(Math.random() * usablePatterns.length)
    ];
    layers.push({
      id: crypto.randomUUID(),
      patternIndex,
      color: randomHex(),
      opacity: 0.5 + Math.random() * 0.5,
      enabled: true
    });
  }

  selectedLayerId = layers[layers.length - 1].id;
  syncColorControls();
  renderLayers();
  render();
}

function savePelt() {
  const data = {
    version: 1,
    poseIndex: currentPoseIndex,
    layers: layers.map(({ patternIndex, color, opacity, enabled }) => ({
      patternIndex, color, opacity, enabled
    }))
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clangen-pelt.json";
  a.click();
  URL.revokeObjectURL(url);
}

function loadPelt(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!Array.isArray(data.layers)) throw new Error("Invalid layer data.");

      layers = data.layers
        .filter(l =>
          Number.isInteger(l.patternIndex) &&
          PATTERNS.some(p => p.index === l.patternIndex)
        )
        .map(l => ({
          id: crypto.randomUUID(),
          patternIndex: l.patternIndex,
          color: normalizeHex(l.color) || "#8A684D",
          opacity: Math.max(0, Math.min(1, Number(l.opacity ?? 1))),
          enabled: l.enabled !== false
        }));

      if (!layers.length) throw new Error("No valid layers found.");

      selectedLayerId = layers[layers.length - 1].id;

      if (Number.isInteger(data.poseIndex) && poseInfo(data.poseIndex)) {
        currentPoseIndex = data.poseIndex;
        document.getElementById("poseSelect").value = currentPoseIndex;
      }

      syncColorControls();
      renderLayers();
      render();
      setStatus("Pelt loaded.");
    } catch (error) {
      setStatus("Could not load that pelt file.");
      console.error(error);
    }
  };

  reader.readAsText(file);
}

function downloadPNG() {
  const scale = 8;
  const output = document.createElement("canvas");
  output.width = SPRITE_W * scale;
  output.height = SPRITE_H * scale;

  const out = output.getContext("2d");
  out.imageSmoothingEnabled = false;
  out.drawImage(canvas, 0, 0, output.width, output.height);

  output.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clangen-pelt.png";
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function setStatus(message) {
  document.getElementById("status").textContent = message;
}

document.getElementById("poseSelect").addEventListener("change", e => {
  currentPoseIndex = Number(e.target.value);
  render();
});

document.getElementById("addLayerBtn").addEventListener("click", () => {
  document.getElementById("patternSelect").focus();
});

document.getElementById("confirmAddBtn").addEventListener("click", () => {
  const patternIndex = Number(document.getElementById("patternSelect").value);
  const color = document.getElementById("newLayerColor").value;
  addLayer(patternIndex, color);
});

document.getElementById("randomizeBtn").addEventListener("click", randomize);

document.getElementById("resetBtn").addEventListener("click", () => {
  layers = [{
    id: crypto.randomUUID(),
    patternIndex: 0,
    color: "#8A684D",
    opacity: 1,
    enabled: true
  }];
  selectedLayerId = layers[0].id;
  syncColorControls();
  renderLayers();
  render();
});

document.getElementById("downloadBtn").addEventListener("click", downloadPNG);
document.getElementById("saveBtn").addEventListener("click", savePelt);

document.getElementById("loadInput").addEventListener("change", e => {
  if (e.target.files[0]) loadPelt(e.target.files[0]);
});

wireColorPair("baseColor", "baseHex", setBaseColor);

wireColorPair("patternColor", "patternHex", value => {
  const selected = layers.find(l => l.id === selectedLayerId);
  if (selected) {
    selected.color = value;
    renderLayers();
    render();
  }
});

wireColorPair("secondaryColor", "secondaryHex", () => {});
function loadImage(image, url, name) {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);

    image.onerror = () => {
      reject(new Error(`Could not load ${name}: ${url}`));
    };

    image.src = url;
  });
}

Promise.all([
  loadImage(lineart, LINEART_URL, "lineart.png"),
  loadImage(maskAtlas, MASK_URL, "pelt_parts_masks.png")
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
    syncColorControls();
    renderLayers();
    render();

    setStatus("Assets loaded.");
  })
  .catch(error => {
    console.error(error);
    setStatus(error.message);
  });