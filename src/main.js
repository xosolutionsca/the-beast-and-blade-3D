console.log("MAIN.JS LOADED ✅");
// The Beast and the Blade — Browser Prototype (Babylon.js)
// Phase 1: movement, chiaroscuro lighting, basic quest flow & UI

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true });

/** GAME STATE **/
const GameState = {
phase: "intro", // intro -> herongate -> graduation -> rent -> lair -> recognition -> epilogue
quests: [],
flags: {
foundPurposeBlade: false,
readNote: false,
facedBeast: false,
},
};

function addQuest(title) {
GameState.quests.push({ title, done: false });
uiSetQuest(title);
}
function completeQuest(title) {
const q = GameState.quests.find(q => q.title === title);
if (q) q.done = true;
}

let ui = {};
function uiCreate(scene) {
const gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
// HUD title
const title = new BABYLON.GUI.TextBlock();
title.text = "The Beast and the Blade";
title.color = "#f2f2f2";
title.fontSize = 20;
title.top = "12px";
title.left = "12px";
title.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
title.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
gui.addControl(title);

// Quest text
const quest = new BABYLON.GUI.TextBlock();
quest.text = "Quest: Survival";
quest.color = "#c9dbff";
quest.fontSize = 16;
quest.top = "40px";
quest.left = "12px";
quest.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
quest.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
gui.addControl(quest);

// Dialogue box
const dialog = new BABYLON.GUI.Rectangle();
dialog.thickness = 1;
dialog.color = "#666";
dialog.background = "rgba(0,0,0,0.55)";
dialog.height = "22%";
dialog.width = "92%";
dialog.cornerRadius = 6;
dialog.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
dialog.alpha = 0.0;
gui.addControl(dialog);

const dialogText = new BABYLON.GUI.TextBlock();
dialogText.textWrapping = true;
dialogText.paddingLeft = "14px";
dialogText.paddingRight = "14px";
dialogText.color = "#f0f0f0";
dialogText.fontSize = 16;
dialog.addControl(dialogText);

function showDialog(text, seconds=4) {
dialog.alpha = 1.0;
dialogText.text = text;
setTimeout(() => { dialog.alpha = 0.0; }, seconds * 1000);
}

ui = { gui, title, quest, dialog, dialogText, showDialog };
}
function uiSetQuest(q) {
if (ui.quest) ui.quest.text = "Quest: " + q;
}

/** SCENE **/
const createScene = () => {
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.03, 0.03, 0.05, 1.0);

// Camera (first-person for MVP)
const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 1.8, -6), scene);
camera.attachControl(canvas, true);
camera.inertia = 0.6;
camera.angularSensibility = 3000;
camera.minZ = 0.05;

// Controls
const input = { fwd:0, strafe:0, sprint:false, interact:false };
scene.onKeyboardObservable.add(kb => {
const down = kb.type === BABYLON.KeyboardEventTypes.KEYDOWN;
switch(kb.event.code) {
case "KeyW": input.fwd = down? 1: (input.fwd===1?0:input.fwd); break;
case "KeyS": input.fwd = down? -1: (input.fwd===-1?0:input.fwd); break;
case "KeyA": input.strafe = down? -1: (input.strafe===-1?0:input.strafe); break;
case "KeyD": input.strafe = down? 1: (input.strafe===1?0:input.strafe); break;
case "ShiftLeft": input.sprint = down; break;
case "KeyE": input.interact = down; break;
}
});

// Ground & “stage”
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 40, height: 40 }, scene);
const groundMat = new BABYLON.PBRMaterial("gmat", scene);
groundMat.albedoColor = new BABYLON.Color3(0.08, 0.08, 0.1);
groundMat.metallic = 0.1;
groundMat.roughness = 0.9;
ground.material = groundMat;

// Chiaroscuro lighting: one intense key spotlight + soft rim + ambient
const key = new BABYLON.SpotLight("key", new BABYLON.Vector3(6, 8, -2), new BABYLON.Vector3(-1, -1.2, 0.2), Math.PI/3, 8, scene);
key.intensity = 750; // bright, focused
key.shadowMinZ = 0.1;
key.shadowMaxZ = 60;

const rim = new BABYLON.HemisphericLight("rim", new BABYLON.Vector3(0, 1, 0), scene);
rim.intensity = 0.2;

// Shadows
const sm = new BABYLON.ShadowGenerator(2048, key);
sm.usePercentageCloserFiltering = true;
sm.bias = 0.0008;

// Props: a simple “Herongate Mask” doorway and a “Lair” cave mouth
const arch = BABYLON.MeshBuilder.CreateTorus("herongate", { diameter: 3.5, thickness: 0.4 }, scene);
arch.position = new BABYLON.Vector3(-5, 2, 4);
const archMat = new BABYLON.PBRMaterial("archMat", scene);
archMat.emissiveColor = new BABYLON.Color3(0.6, 0.2, 0.8);
archMat.roughness = 0.4; archMat.metallic = 0.3;
arch.material = archMat; sm.addShadowCaster(arch);

const lair = BABYLON.MeshBuilder.CreateCylinder("lair", { diameterTop: 3.5, diameterBottom: 4.5, height: 3.2, tessellation: 6 }, scene);
lair.rotation.z = Math.PI/2;
lair.position = new BABYLON.Vector3(8, 1.6, 2);
const lairMat = new BABYLON.PBRMaterial("lairMat", scene);
lairMat.albedoColor = new BABYLON.Color3(0.05, 0.05, 0.07);
lair.material = lairMat; sm.addShadowCaster(lair);

// Purpose Blade (pickup)
const blade = BABYLON.MeshBuilder.CreateBox("blade", { height: 0.05, width: 0.8, depth: 0.12 }, scene);
blade.position = new BABYLON.Vector3(-5, 1.0, 3.8);
const bladeMat = new BABYLON.PBRMaterial("bladeMat", scene);
bladeMat.albedoColor = new BABYLON.Color3(0.85, 0.85, 0.9);
bladeMat.emissiveColor = new BABYLON.Color3(0.2, 0.3, 0.9);
blade.material = bladeMat; sm.addShadowCaster(blade);

// Familiar Beast (placeholder: smoky sphere that pulses)
const beast = BABYLON.MeshBuilder.CreateSphere("beast", { diameter: 2 }, scene);
beast.position = new BABYLON.Vector3(11, 1.1, 2);
const beastMat = new BABYLON.PBRMaterial("beastMat", scene);
beastMat.emissiveColor = new BABYLON.Color3(0.5, 0.05, 0.05);
beastMat.albedoColor = new BABYLON.Color3(0.06, 0.02, 0.02);
beast.material = beastMat; sm.addShadowCaster(beast);
beast.setEnabled(false); // locked until “lair” phase

// Post-processing pipeline for moody look
const pipeline = new BABYLON.DefaultRenderingPipeline("default", true, scene, [camera]);
pipeline.fxaaEnabled = true;
pipeline.imageProcessingEnabled = true;
pipeline.imageProcessing.contrast = 1.6;
pipeline.imageProcessing.exposure = 0.85;
pipeline.bloomEnabled = true;
pipeline.bloomThreshold = 0.7;
pipeline.bloomWeight = 0.25;
scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
scene.fogDensity = 0.008;
scene.fogColor = new BABYLON.Color3(0.02, 0.02, 0.035);

// UI
uiCreate(scene);
addQuest("Survival");

// Simple proximity interaction helper
function near(a, b, dist=2.0) { return BABYLON.Vector3.Distance(a.position, b.position) <= dist; }

// Story beats
function tryInteractions() {
// Pick up Purpose Blade at Herongate
if (!GameState.flags.foundPurposeBlade && near(camera, blade, 2.0)) {
ui.showDialog("You feel it hum in your hand: the Purpose Blade. [E] to claim.");
if (input.interact) {
GameState.flags.foundPurposeBlade = true;
blade.dispose();
ui.showDialog("Purpose Blade acquired. +Clarity. +Persistence.");
completeQuest("Survival");
addQuest("Revisit: Herongate Mask");
GameState.phase = "herongate";
}
}

// Transition to Lair (after Herongate step)
if (GameState.phase === "herongate" && near(camera, arch, 2.5)) {
ui.showDialog("Curtain Drop. Promises flicker. Keep going.");
addQuest("Confront the Past");
GameState.phase = "lair";
beast.setEnabled(true);
}

// Confront Familiar Beast
if (GameState.phase === "lair" && near(camera, beast, 3.0)) {
ui.showDialog("The Familiar Beast stirs: guilt, fear, old echoes… [E] to name it.");
if (input.interact) {
GameState.phase = "recognition";
GameState.flags.facedBeast = true;
ui.showDialog("You name it. You walk past it. It does not follow.");
setTimeout(() => {
addQuest("Live with Purpose");
GameState.phase = "epilogue";
}, 2500);
}
}
}

// Movement loop
scene.onBeforeRenderObservable.add(() => {
const dt = scene.getEngine().getDeltaTime() / 1000;
const speed = (input.sprint ? 6.5 : 3.0);
const move = new BABYLON.Vector3(input.strafe, 0, input.fwd).normalize().scale(speed * dt || 0);

// Move relative to camera orientation
const forward = camera.getDirection(BABYLON.Axis.Z);
const right = camera.getDirection(BABYLON.Axis.X);
const desired = forward.scale(move.z).add(right.scale(move.x));
camera.position.addInPlace(desired);

// Beast pulse
if (beast.isEnabled()) {
const t = performance.now() * 0.002;
beast.scaling.setAll(1.0 + Math.sin(t)*0.05);
beast.material.emissiveColor = new BABYLON.Color3(0.45 + Math.abs(Math.sin(t))*0.35, 0.06, 0.06);
}

input.interact = false; // one-shot
tryInteractions();
});

return scene;
};

const scene = createScene();
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
