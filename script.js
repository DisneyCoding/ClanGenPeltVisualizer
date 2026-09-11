import { PATTERNS, POSES } from "./data.js";
import { COLOR_PARAMETERS, PATTERN_COLOR_MAP } from "./colors.js";

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
const maskAtlas = new Image();
let assetsReady = false;
let currentPoseIndex = 18;
let peltColors = {};
for (const parameter of COLOR_PARAMETERS) {
  peltColors[parameter.id] = "#FFFFFF";
}
let layers = [createLayer(0, "base")];
let selectedLayerId = layers[0].id;
function createLayer(patternIndex, colorCategory = "pattern") {
  return {
    id: crypto.randomUUID(),
    patternIndex,
    colorCategory,
    colorOverride: null,
    opacity: 1,
    enabled: true
  };
}
function patternInfo(index) { return PATTERNS.find(p => p.index === index); }
function poseInfo(index) { return POSES.find(p => p.index === index); }
function normalizeHex(value) { if (!value) return null; let v=String(value).trim(); if(!v.startsWith("#")) v="#"+v; return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toUpperCase() : null; }
function hexToRgb(hex) { const v=normalizeHex(hex); if(!v) return null; return {r:parseInt(v.slice(1,3),16),g:parseInt(v.slice(3,5),16),b:parseInt(v.slice(5,7),16)}; }
function getColorForLayer(layer) {
  return (
    layer.colorOverride ||
    peltColors[layer.colorCategory] ||
    peltColors.base ||
    "#8A684D"
  );
}
function tintMask(maskCanvas, color, opacity) {
  const rgb=hexToRgb(color); if(!rgb) return null;
  const output=document.createElement("canvas"); output.width=SPRITE_W; output.height=SPRITE_H;
  const out=output.getContext("2d");
  out.fillStyle=`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`; out.fillRect(0,0,SPRITE_W,SPRITE_H);
  out.globalCompositeOperation="destination-in"; out.globalAlpha=opacity; out.drawImage(maskCanvas,0,0);
  return output;
}
function getMaskSprite(pattern, poseIndex) {
  if(!pattern) return null;
  const sprite=document.createElement("canvas"); sprite.width=SPRITE_W; sprite.height=SPRITE_H;
  const s=sprite.getContext("2d");
  const poseX=(poseIndex%4)*SPRITE_W, poseY=Math.floor(poseIndex/4)*SPRITE_H;
  s.drawImage(maskAtlas, pattern.groupX*GROUP_W+poseX, pattern.groupY*GROUP_H+poseY, SPRITE_W, SPRITE_H, 0,0,SPRITE_W,SPRITE_H);
  return sprite;
}
function render() {
  if (!assetsReady) return;

  ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);

  for (const layer of layers) {
    if (!layer.enabled) continue;

    const pattern = patternInfo(layer.patternIndex);

    if (!pattern) continue;

    const mask = getMaskSprite(pattern, currentPoseIndex);

    if (!mask) continue;

    const color = getColorForLayer(layer);
    const tinted = tintMask(mask, color, layer.opacity);

    if (tinted) {
      ctx.drawImage(tinted, 0, 0);
    }
  }

  const x = (currentPoseIndex % 4) * SPRITE_W;
  const y = Math.floor(currentPoseIndex / 4) * SPRITE_H;

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
function renderLayers(){
  const container=document.getElementById("layers"); container.innerHTML="";
  [...layers].reverse().forEach(layer=>{
    const pattern=patternInfo(layer.patternIndex) || {label:"Unknown pattern"};
    const row=document.createElement("div"); row.className="layer"+(layer.id===selectedLayerId?" selected":"");
    row.innerHTML=`<div class="layer-top"><input class="layer-enabled" type="checkbox" ${layer.enabled?"checked":""}><div class="layer-name">${pattern.label}</div><div class="layer-buttons"><button data-action="up">↑</button><button data-action="down">↓</button><button data-action="delete">×</button></div></div><div class="layer-controls"><input class="layer-color" type="color" value="${getColorForLayer(layer)}"><input class="layer-opacity" type="range" min="0" max="1" step="0.01" value="${layer.opacity}"><span class="opacity-value">${Math.round(layer.opacity*100)}%</span></div>`;
    row.addEventListener("click",()=>{selectedLayerId=layer.id;renderLayers();});
    row.querySelector(".layer-enabled").addEventListener("change",e=>{layer.enabled=e.target.checked;render();});
    row.querySelector(".layer-color").addEventListener("input",e=>{layer.colorOverride=e.target.value.toUpperCase(); layer.colorCategory=null; render();});
    row.querySelector(".layer-opacity").addEventListener("input",e=>{layer.opacity=Number(e.target.value);row.querySelector(".opacity-value").textContent=Math.round(layer.opacity*100)+"%";render();});
    row.querySelector('[data-action="delete"]').addEventListener("click",e=>{e.stopPropagation();if(layers.length===1)return;layers=layers.filter(x=>x.id!==layer.id);if(!layers.some(x=>x.id===selectedLayerId))selectedLayerId=layers.at(-1).id;renderLayers();render();});
    row.querySelector('[data-action="up"]').addEventListener("click",e=>{e.stopPropagation();moveLayer(layer.id,1);});
    row.querySelector('[data-action="down"]').addEventListener("click",e=>{e.stopPropagation();moveLayer(layer.id,-1);});
    container.appendChild(row);
  });
}
function moveLayer(id,direction){const i=layers.findIndex(x=>x.id===id),t=i+direction;if(i<0||t<0||t>=layers.length)return;[layers[i],layers[t]]=[layers[t],layers[i]];renderLayers();render();}
function renderColorControls(){
  const container=document.getElementById("colorControls"); container.innerHTML="";
  const groups={};
  for(const p of COLOR_PARAMETERS){(groups[p.group]??=[]).push(p);}
  for(const [group,params] of Object.entries(groups)){
    const heading=document.createElement("h3"); heading.textContent=group; heading.style.gridColumn="1/-1"; heading.style.margin="10px 0 0"; container.appendChild(heading);
    for(const p of params){
      const value = peltColors[p.id] || "#FFFFFF"; const el=document.createElement("div"); el.className="color-control";
      el.innerHTML=`<div class="color-top"><span class="color-label">${p.label}</span></div><div class="color-inputs"><input type="color" value="${value}"><input class="hex" type="text" value="${value}" maxlength="7" spellcheck="false"></div>`;
      const color=el.querySelector('input[type="color"]'),hex=el.querySelector(".hex");
      color.addEventListener("input",()=>{peltColors[p.id]=color.value.toUpperCase();hex.value=peltColors[p.id];renderLayers();render();});
      hex.addEventListener("change",()=>{const v=normalizeHex(hex.value);if(!v){hex.value=peltColors[p.id];return;}peltColors[p.id]=v;color.value=v;renderLayers();render();});
      container.appendChild(el);
    }
  }
}
function populateControls() {
  const pose = document.getElementById("poseSelect");
  pose.innerHTML = "";

  POSES.forEach(p => {
    const option = document.createElement("option");
    option.value = p.index;
    option.textContent = p.label;
    pose.appendChild(option);
  });

  pose.value = currentPoseIndex;

  const pattern = document.getElementById("patternSelect");
  pattern.innerHTML = "";

  PATTERNS.forEach(p => {
    const option = document.createElement("option");
    option.value = p.index;
    option.textContent = p.label;
    pattern.appendChild(option);
  });

  updateAssignedColorCategory();
}
function updateAssignedColorCategory() {
  const patternSelect = document.getElementById("patternSelect");
  const display = document.getElementById("assignedColorCategory");

  if (!patternSelect || !display) return;

  const patternIndex = Number(patternSelect.value);
  const colorId = PATTERN_COLOR_MAP[patternIndex] || "base";

  const parameter = COLOR_PARAMETERS.find(
    p => p.id === colorId
  );

  display.textContent = parameter
    ? `${parameter.label} (${parameter.id})`
    : colorId;
}
function randomHex(){return "#"+Math.floor(Math.random()*0x1000000).toString(16).padStart(6,"0").toUpperCase();}
function refreshPelt() {
  renderColorControls();
  renderLayers();

  requestAnimationFrame(() => {
    render();
  });
}
function randomize() {
  // Randomize every color parameter
  for (const parameter of COLOR_PARAMETERS) {
    peltColors[parameter.id] = randomHex();
  }

  // Get all patterns except the base mask
  const usablePatterns = PATTERNS
    .map(pattern => pattern.index)
    .filter(index => index !== 0);

  // Start with the base layer
  layers = [createLayer(0, "base")];

  // Add 1–3 random patterns
  const count = 1 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const patternIndex =
      usablePatterns[Math.floor(Math.random() * usablePatterns.length)];

    const layer = createLayer(patternIndex, "pattern");

    layer.opacity = 0.5 + Math.random() * 0.5;

    layers.push(layer);
  }

  // Select the topmost layer
  selectedLayerId = layers.at(-1).id;

  // Update everything and force a fresh render
  refreshPelt();
}
function savePelt() {
  const data = {
    poseIndex: currentPoseIndex,
    colors: peltColors,

    layers: layers.map(layer => ({
      patternIndex: layer.patternIndex,
      colorCategory: layer.colorCategory
    }))
  };

  downloadBlob(
    JSON.stringify(data, null, 2),
    "clangen-pelt.json",
    "application/json"
  );
}
function loadPelt(file){const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(data.colors&&typeof data.colors==="object")for(const p of COLOR_PARAMETERS){const v=normalizeHex(data.colors[p.id]);if(v)peltColors[p.id]=v;}if(!Array.isArray(data.layers))throw new Error("Invalid layer data.");layers=data.layers.filter(l=>Number.isInteger(l.patternIndex)&&patternInfo(l.patternIndex)).map(l=>({id:crypto.randomUUID(),patternIndex:l.patternIndex,peltColorID:l.peltColorID,colorCategory:l.colorCategory||"base",colorOverride:normalizeHex(l.colorOverride),opacity:Math.max(0,Math.min(1,Number(l.opacity??1))),enabled:l.enabled!==false}));if(!layers.length)layers=[createLayer(0,"base")];selectedLayerId=layers.at(-1).id;if(Number.isInteger(data.poseIndex)&&poseInfo(data.poseIndex)){currentPoseIndex=data.poseIndex;document.getElementById("poseSelect").value=currentPoseIndex;}refreshPelt();setStatus("Pelt loaded.");}catch(err){console.error(err);setStatus("Could not load that pelt file.");}};reader.readAsText(file);}
function downloadBlob(text,name,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function downloadPNG(){const scale=8,output=document.createElement("canvas");output.width=SPRITE_W*scale;output.height=SPRITE_H*scale;const out=output.getContext("2d");out.imageSmoothingEnabled=false;out.drawImage(canvas,0,0,output.width,output.height);output.toBlob(blob=>{const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="clangen-pelt.png";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},"image/png");}
function setStatus(message){document.getElementById("status").textContent=message;}
function loadImage(image,url,name){return new Promise((resolve,reject)=>{image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Could not load ${name}: ${url}`));image.src=url;});}
function resetPelt() {
  peltColors = {};

  for (const parameter of COLOR_PARAMETERS) {
    peltColors[parameter.id] = "#FFFFFF";
  }

  layers = [createLayer(0, "base")];
  selectedLayerId = layers[0].id;

  refreshPelt();
}

document.getElementById("poseSelect").addEventListener("change",e=>{currentPoseIndex=Number(e.target.value);render();});
document.getElementById("addLayerBtn").addEventListener("click",()=>document.getElementById("patternSelect").focus());
document.getElementById("confirmAddBtn").addEventListener("click", () => {const patternIndex = Number(document.getElementById("patternSelect").value);const colorCategory =document.getElementById("newLayerCategory").value;const layer = createLayer(patternIndex, colorCategory);layers.push(layer);selectedLayerId = layer.id;renderLayers();render();});
document.getElementById("randomizeBtn").addEventListener("click",randomize);
document.getElementById("downloadBtn").addEventListener("click",downloadPNG);
document.getElementById("saveBtn").addEventListener("click",savePelt);
document.getElementById("loadInput").addEventListener("change",e=>{if(e.target.files[0])loadPelt(e.target.files[0]);});
document.getElementById("resetBtn").addEventListener("click",resetPelt);
document.getElementById("patternSelect").addEventListener("change", updateAssignedColorCategory);

Promise.all([loadImage(lineart,LINEART_URL,"lineart.png"),loadImage(maskAtlas,MASK_URL,"pelt_parts_masks.png")]).then(()=>{assetsReady=true;populateControls();renderColorControls();renderLayers();render();setStatus("Assets loaded.");}).catch(error=>{console.error(error);populateControls();renderColorControls();renderLayers();setStatus(error.message);});
