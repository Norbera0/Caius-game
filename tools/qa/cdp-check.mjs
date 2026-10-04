// Headless-Chrome check for story 002 (input + movement), driven over the DevTools
// protocol so real key / touch / mouse events go through the browser's input pipeline.
// Zero dependencies: Node 22+ (global WebSocket/fetch) and a local google-chrome.
// Usage: node tools/qa/cdp-check.mjs [evidence-dir]
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PORT = 9333;
const EVID = resolve(process.argv[2] ?? "production/qa/evidence/input-and-movement");
mkdirSync(EVID, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const chrome = spawn("google-chrome", [
  "--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "caius-"))}`, "--window-size=390,844", "about:blank",
], { stdio: "ignore" });

async function waitForChrome() {
  for (let i = 0; i < 50; i++) {
    try { return await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch { await sleep(100); }
  }
  throw new Error("chrome did not start");
}

let ws, nextId = 1;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = nextId++;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params }));
});
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const S = () => ev("JSON.stringify(window.CaiusRun.state)").then(JSON.parse);
const reset = () => ev(`Object.assign(window.CaiusRun.state,{lane:1,laneVis:1,slideFrom:1,slideT:1,queue:[],grounded:true,jumpT:0,jumpY:0})`);

const KEYS = {
  ArrowLeft: { key: "ArrowLeft", vk: 37 }, ArrowRight: { key: "ArrowRight", vk: 39 },
  ArrowUp: { key: "ArrowUp", vk: 38 }, KeyA: { key: "a", vk: 65 }, KeyD: { key: "d", vk: 68 },
  Space: { key: " ", vk: 32 },
};
async function key(code, autoRepeat = false) {
  const k = KEYS[code];
  const base = { code, key: k.key, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk, autoRepeat };
  await send("Input.dispatchKeyEvent", { type: "keyDown", ...base });
  await send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
}
const touch = (type, x, y) => send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
async function swipe(dx, dy, steps = 4) {
  await touch("touchStart", 195, 600);
  for (let i = 1; i <= steps; i++) { await touch("touchMove", 195 + (dx * i) / steps, 600 + (dy * i) / steps); await sleep(8); }
  await touch("touchEnd");
}
const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(EVID, name), Buffer.from(r.data, "base64"));
};

try {
  const targets = await waitForChrome();
  const page = targets.find((t) => t.type === "page");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); }
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const url = pathToFileURL(resolve("src/index.html")).href;
  await send("Page.navigate", { url });
  await sleep(800);

  // --- pure gesture classifier ---------------------------------------------
  const cg = (...a) => ev(`window.CaiusRun.classifyGesture(${a.join(",")})`);
  check("classify: -31px x = left", (await cg(-31, 0, 100, true)) === "left");
  check("classify: exactly 30px x = right", (await cg(30, 2, 100, true)) === "right");
  check("classify: -31px y = up", (await cg(0, -31, 100, true)) === "up");
  check("classify: dominant axis wins (20,-40) = up", (await cg(20, -40, 100, true)) === "up");
  check("classify: 29px short touch released = tap", (await cg(29, 0, 100, true)) === "tap");
  check("classify: 29px while finger down = undecided", (await cg(29, 0, 100, false)) === null);
  check("classify: slow press 400ms released = ignored", (await cg(0, 0, 400, true)) === null);

  // --- keyboard -------------------------------------------------------------
  await reset(); await key("ArrowLeft"); await sleep(250);
  let s = await S(); check("ArrowLeft: lane 1 -> 0, slide finished", s.lane === 0 && s.laneVis === 0, `lane=${s.lane} vis=${s.laneVis}`);
  await key("ArrowLeft"); await sleep(250); s = await S();
  check("ArrowLeft at left edge: clamped at lane 0", s.lane === 0);
  await key("KeyD"); await sleep(250); s = await S(); check("D: lane 0 -> 1", s.lane === 1);
  await key("KeyD"); await sleep(250); await key("KeyD"); await sleep(250); s = await S();
  check("D at right edge: clamped at lane 2", s.lane === 2);
  await key("KeyA"); await sleep(250); s = await S(); check("A: lane 2 -> 1", s.lane === 1);
  await key("ArrowRight"); await sleep(250); s = await S(); check("ArrowRight: lane 1 -> 2", s.lane === 2);
  await reset(); await key("ArrowLeft"); await key("ArrowLeft", true); await sleep(300); s = await S();
  check("held key (autoRepeat) does not repeat the move", s.lane === 0 && s.queue.length === 0, `lane=${s.lane}`);

  // --- eased slide: sample mid-way -------------------------------------------
  await reset(); await key("ArrowRight"); await sleep(55);
  s = await S(); check("slide is eased: laneVis strictly between 1 and 2 mid-slide", s.laneVis > 1 && s.laneVis < 2, `vis=${s.laneVis.toFixed(3)}`);
  await shot("01-mid-slide.png"); await sleep(200); s = await S();
  check("slide ends exactly on lane 2", s.laneVis === 2);

  // --- buffering ---------------------------------------------------------------
  await reset(); await ev(`window.CaiusRun.moveLane(-1)`); await key("ArrowRight"); await sleep(400); s = await S();
  check("buffer: left then immediate right during slide -> back to lane 1", s.lane === 1 && s.queue.length === 0, `lane=${s.lane}`);
  await reset(); await ev(`window.CaiusRun.state.lane=0;window.CaiusRun.state.laneVis=0;window.CaiusRun.state.slideFrom=0`);
  await key("ArrowRight"); await key("ArrowRight"); await sleep(450); s = await S();
  check("buffer: two quick rights from lane 0 -> lane 2", s.lane === 2, `lane=${s.lane}`);
  await reset(); await key("ArrowLeft"); await key("ArrowRight"); await key("ArrowLeft"); await key("ArrowRight"); await sleep(500); s = await S();
  check("buffer holds at most 1 queued move", s.queue.length === 0 && s.lane >= 0 && s.lane <= 2, `lane=${s.lane}`);

  // --- jump ----------------------------------------------------------------------
  await reset(); await key("Space");
  let peak = 0, i = 0, wasUp = false;
  for (; i < 40; i++) { s = await S(); peak = Math.max(peak, s.jumpY); if (!s.grounded) wasUp = true; if (peak > 0.7 && !s.grounded && !globalThis.shot2) { globalThis.shot2 = true; await shot("02-jump-peak.png"); } if (wasUp && s.grounded) break; await sleep(20); }
  const cfg = await ev("JSON.stringify(window.CaiusRun.CONFIG)").then(JSON.parse);
  check("Space: airborne then lands", wasUp && s.grounded && s.jumpY === 0);
  check("jump peak close to CONFIG.jumpHeight", peak > cfg.jumpHeight * 0.85 && peak <= cfg.jumpHeight + 1e-9, `peak=${peak.toFixed(3)} of ${cfg.jumpHeight}`);
  await reset(); await key("Space"); await sleep(150); const t0 = (await S()).jumpT; await key("Space"); await sleep(30); const t1 = (await S()).jumpT;
  check("no double jump: second Space mid-air does not restart the jump", t1 > t0, `jumpT ${t0.toFixed(3)} -> ${t1.toFixed(3)}`);
  await sleep(600);
  const g = await ev("window.CaiusRun.jumpGravity()"); const air = await ev(`window.CaiusRun.jumpAirDistance(${cfg.baseSpeed})`);
  check("derived gravity matches h and airtime (8h/T^2)", Math.abs(g - (8 * cfg.jumpHeight) / cfg.jumpAirtime ** 2) < 1e-9, `g=${g.toFixed(2)}`);
  console.log(`INFO  jump covers ${air.toFixed(2)} z units at baseSpeed ${cfg.baseSpeed}; re-verify against obstacle depth + maxSpeed in story 003`);

  // --- mouse (touch emulation off) ---------------------------------------------------
  await reset();
  const mouse = (type, x, y) => send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
  await mouse("mousePressed", 195, 600); await mouse("mouseMoved", 240, 600); await mouse("mouseMoved", 290, 600); await mouse("mouseReleased", 290, 600); await sleep(250); s = await S();
  check("mouse drag right: exactly one lane (no double fire)", s.lane === 2, `lane=${s.lane}`);
  await reset(); await mouse("mousePressed", 195, 600); await mouse("mouseReleased", 195, 600); await sleep(40); s = await S();
  check("mouse click = tap = jump", !s.grounded); await sleep(700);

  // --- touch ----------------------------------------------------------------------------
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await reset(); await swipe(-80, 0); await sleep(250); s = await S();
  check("touch swipe left: exactly one lane", s.lane === 0, `lane=${s.lane}`);
  await shot("03-after-swipe-left.png");
  await reset(); await swipe(80, 0); await sleep(250); s = await S(); check("touch swipe right: exactly one lane", s.lane === 2, `lane=${s.lane}`);
  await reset(); await touch("touchStart", 195, 600); await touch("touchMove", 150, 600); await touch("touchMove", 60, 600); await touch("touchMove", -50, 600); await touch("touchEnd"); await sleep(250); s = await S();
  check("one long touch fires one move only", s.lane === 0, `lane=${s.lane}`);
  await reset(); await swipe(0, -80); await sleep(40); s = await S(); check("touch swipe up: jump", !s.grounded); await sleep(700);
  await reset(); await touch("touchStart", 195, 600); await sleep(60); await touch("touchEnd"); await sleep(40); s = await S(); check("touch tap: jump", !s.grounded); await sleep(700);
  await reset(); await touch("touchStart", 195, 600); await touch("touchMove", 205, 603); await touch("touchEnd"); await sleep(40); s = await S(); check("tiny wobble (10px) then release = tap = jump", !s.grounded); await sleep(700);
  await reset(); await touch("touchStart", 195, 600); await sleep(450); await touch("touchEnd"); await sleep(40); s = await S(); check("slow press 450ms, no move: nothing happens", s.grounded && s.lane === 1);
  await reset(); await swipe(0, 80); await sleep(60); s = await S(); check("swipe down: ignored", s.grounded && s.lane === 1);

  // --- page scroll / zoom blocking -----------------------------------------------------------
  const page1 = await ev(`JSON.stringify({
    vp: document.querySelector('meta[name=viewport]').content,
    ta: getComputedStyle(document.body).touchAction, ob: getComputedStyle(document.documentElement).overscrollBehaviorY,
    ov: getComputedStyle(document.body).overflow, cta: getComputedStyle(document.getElementById('game')).touchAction,
    sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight, sy: scrollY,
    tm: (()=>{const e=new TouchEvent('touchmove',{cancelable:true,bubbles:true});document.dispatchEvent(e);return e.defaultPrevented})(),
    ts: (()=>{const e=new TouchEvent('touchstart',{cancelable:true,bubbles:true});document.dispatchEvent(e);return e.defaultPrevented})(),
    dc: (()=>{const e=new MouseEvent('dblclick',{cancelable:true,bubbles:true});document.dispatchEvent(e);return e.defaultPrevented})() })`).then(JSON.parse);
  check("viewport meta blocks user zoom", /user-scalable=no/.test(page1.vp) && /maximum-scale=1/.test(page1.vp), page1.vp);
  check("CSS touch-action:none and overscroll-behavior:none", page1.ta === "none" && page1.cta === "none" && page1.ob === "none", `${page1.ta}/${page1.cta}/${page1.ob}`);
  check("body overflow hidden, page not scrollable", page1.ov === "hidden" && page1.sh <= page1.ch && page1.sy === 0, `sh=${page1.sh} ch=${page1.ch}`);
  check("touchstart, touchmove and dblclick are preventDefault-ed", page1.tm && page1.ts && page1.dc);
  await swipe(0, -120); await sleep(100); check("after vertical swipe: scrollY still 0", (await ev("scrollY")) === 0);
} catch (e) {
  check("harness ran without error", false, String(e));
} finally {
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  try { ws?.close(); } catch {}
  chrome.kill();
  process.exit(failed ? 1 : 0);
}
