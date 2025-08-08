// The Beast and the Blade — Browser Prototype (Babylon.js)
// One-file clean build: movement, chiaroscuro lighting, prompts, sticky E, correct loop

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true });

/** GAME STATE **/
const GameState = {
phase: "intro", // intro -> herongate -> lair -> recognition -> epilogue (others later)
// Camera (first-person MVP)
const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 1.8, -6), scene);
camera.attachControl(canvas, true);
camera.inertia = 0.6;
camera.angularSensibility = 3000;
camera.minZ = 0.05;

// Pointer lock for reliable input focus
canvas.addEventListener("click", () => {
const rpl = canvas.requestPointerLock || canvas.mozRequestPointerLock;
if (rpl) rpl.call(canvas);
});

// Controls (with sticky E)
const input = { fwd: 0, strafe: 0, sprint: false, interact: false, interactCooldown: 0 };
scene.onKeyboardObservable.add(kb => {
const down = kb.type === BABYLON.KeyboardEventTypes.KEYDOWN;
switch (kb.event.code) {
case "KeyW": input.fwd = down ? 1 : (input.fwd === 1 ? 0 : input.fwd); break;
case "KeyS": input.fwd = down ? -1 : (input.fwd === -1 ? 0 : input.fwd); break;
case "KeyA": input.strafe = down ? -1 : (input.strafe === -1 ? 0 : input.strafe); break;
case "KeyD": input.strafe = down ? 1 : (input.strafe === 1 ? 0 : input.strafe); break;
case "ShiftLeft": input.sprint = down; break;
case "KeyE":
if (down) {
input.interact = true;
input.interactCooldown = 0.35; // sticky time window
}
break;
}
});
// Extra fallback so E works even if canvas focus is weird
window.addEventListener("keydown", (e) => {
if (e.code === "KeyE") {
input.interact = true;
input.interactCooldown = 0.35;
}
});

// Ground & “stage”
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 40, height: 40 }, scene);
const groundMat = new BABYLON.PBRMaterial("gmat", scene);
groundMat.albedoColor = new BABYLON.Color3(0.08, 0.08, 0.1);
groundMat.metallic = 0.1;
groundMat.roughness = 0.9;
ground.material = groundMat;

// Lighting: strong key + soft ambient (chiaroscuro)
const key = new BABYLON.SpotLight(
"key",
new BABYLON.Vector3(6, 8, -2),
new BABYLON.Vector3(-1, -1.2, 0.2),
Math.PI / 3,
8,
scene
);
key.intensity = 750;

const rim = new BABYLON.HemisphericLight("rim", new BABYLON.Vector3(0, 1, 0), scene);
rim.intensity = 0.2;

// Shadows
const sm = new BABYLON.ShadowGenerator(2048, key);
sm.usePercentageCloserFiltering = true;
sm.bias = 0.0008;

// Props: Herongate arch + Lair “cave”
const arch = BABYLON.MeshBuilder.CreateTorus("herongate", { diameter: 3.5, thickness: 0.4 }, scene);
arch.position = new BABYLON.Vector3(-5, 2, 4);
const archMat = new BABYLON.PBRMaterial("archMat", scene);
archMat.emissiveColor = new BABYLON.Color3(0.6, 0.2, 0.8);
archMat.roughness = 0.4; archMat.metallic = 0.3;
arch.material = archMat; sm.addShadowCaster(arch);

const lair = BABYLON.MeshBuilder.CreateCylinder("lair", { diameterTop: 3.5, diameterBottom: 4.5, height: 3.2, tessellation: 6 }, scene);
lair.rotation.z = Math.PI / 2;
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

// Familiar Beast (placeholder pulse sphere)
const beast = BABYLON.MeshBuilder.CreateSphere("beast", { diameter: 2 }, scene);
beast.position = new BABYLON.Vector3(11, 1.1, 2);
const beastMat = new BABYLON.PBRMaterial("beastMat", scene);
beastMat.emissiveColor = new BABYLON.Color3(0.5, 0.05, 0.05);
beastMat.albedoColor = new BABYLON.Color3(0.06, 0.02, 0.02);
beast.material = beastMat; sm.addShadowCaster(beast);
beast.setEnabled(false); // unlocked in "lair"

// Post-processing & fog for mood
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

// UI & quest
uiCreate(scene);
addQuest("Survival");

// Floating "Press E" prompt
const interactPrompt = new BABYLON.GUI.TextBlock();
interactPrompt.text = "";
interactPrompt.color = "#ffffaa";
interactPrompt.fontSize = 18;
interactPrompt.top = "-40px"; // above center
interactPrompt.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
ui.gui.addControl(interactPrompt);
function showPrompt(text) { interactPrompt.text = text; }
function hidePrompt() { interactPrompt.text = ""; }

// Helper: proximity
function near(a, b, dist = 2.0) {
return BABYLON.Vector3.Distance(a.position, b.position) <= dist;
}

// Story beats / interactions
function tryInteractions() {
hidePrompt();

// Pick up Purpose Blade
if (!GameState.flags.foundPurposeBlade && near(camera, blade, 3.0)) {
showPrompt("Press E to claim the Purpose Blade");
if (input.interact) {
GameState.flags.foundPurposeBlade = true;
blade.dispose();
ui.showDialog("Purpose Blade acquired. +Clarity. +Persistence.");
completeQuest("Survival");
addQuest("Revisit: Herongate Mask");
GameState.phase = "herongate";
console.log("Picked up Purpose Blade");
}
}

// Enter Lair (after Herongate step)
if (GameState.phase === "herongate" && near(camera, arch, 3.0)) {
showPrompt("Press E to enter the Lair");
if (input.interact) {
ui.showDialog("Curtain Drop. Promises flicker. Keep going.");
addQuest("Confront the Past");
GameState.phase = "lair";
beast.setEnabled(true);
console.log("Entered Lair");
}
}

// Confront Familiar Beast
if (GameState.phase === "lair" && near(camera, beast, 3.5)) {
showPrompt("Press E to confront the Familiar Beast");
if (input.interact) {
GameState.phase = "recognition";
GameState.flags.facedBeast = true;
ui.showDialog("You name it. You walk past it. It does not follow.");
setTimeout(() => {
addQuest("Live with Purpose");
GameState.phase = "epilogue";
}, 2500);
console.log("Confronted Familiar Beast");
}
}
}

// Render loop
scene.onBeforeRenderObservable.add(() => {
const dt = scene.getEngine().getDeltaTime() / 1000;

// Movement
const speed = (input.sprint ? 6.5 : 3.0);
const move = new BABYLON.Vector3(input.strafe, 0, input.fwd).normalize().scale(speed * dt || 0);
const forward = camera.getDirection(BABYLON.Axis.Z);
const right = camera.getDirection(BABYLON.Axis.X);
camera.position.addInPlace(forward.scale(move.z).add(right.scale(move.x)));

// Beast pulse
if (beast.isEnabled()) {
const t = performance.now() * 0.002;
beast.scaling.setAll(1.0 + Math.sin(t) * 0.05);
beast.material.emissiveColor = new BABYLON.Color3(
0.45 + Math.abs(Math.sin(t)) * 0.35,
0.06,
0.06
);
}

// ✅ Interactions BEFORE resetting input
tryInteractions();

// Then decay/reset E
if (input.interactCooldown > 0) {
input.interactCooldown -= dt;
} else {
input.interact = false;
}
});

return scene;
};

const scene = createScene();
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
