// Headless-Chrome checks for Caius Run, driven over the DevTools protocol so real
// key / touch / mouse events go through the browser's input pipeline.
// Zero dependencies: Node 22+ (global WebSocket/fetch) and a local google-chrome.
// Usage: node tools/qa/cdp-check.mjs [suite ...]   (default: all suites)
// Each suite saves screenshots to production/qa/evidence/<suite>/.
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PORT = 9333;
const SUITES = process.argv.slice(2);
const want = (name) => SUITES.length === 0 || SUITES.includes(name);
let EVID = "";
const evidenceDir = (suite) => { EVID = resolve("production/qa/evidence", suite); mkdirSync(EVID, { recursive: true }); };
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
const ev = async (expr, commandLineAPI = false) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, includeCommandLineAPI: commandLineAPI });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const S = () => ev("(({rng, ...s}) => JSON.stringify(s))(window.CaiusRun.state)").then(JSON.parse);
const reset = () => ev(`Object.assign(window.CaiusRun.state,{lane:1,laneVis:1,slideFrom:1,slideT:1,queue:[],grounded:true,jumpT:0,jumpY:0})`);
// Opens the game straight into play (skips the Title) unless title=true.
async function open(query = "", { title = false } = {}) {
  await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  const q = title ? query : (query ? query + "&play" : "?play");
  await send("Page.navigate", { url: pathToFileURL(resolve("src/index.html")).href + q });
  await sleep(600);
}
const metrics = (width, height) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: true });
async function waitFor(expr, ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await ev(expr)) return true; await sleep(16); }
  return false;
}

const KEYS = {
  ArrowLeft: { key: "ArrowLeft", vk: 37 }, ArrowRight: { key: "ArrowRight", vk: 39 },
  ArrowUp: { key: "ArrowUp", vk: 38 }, KeyA: { key: "a", vk: 65 }, KeyD: { key: "d", vk: 68 },
  Space: { key: " ", vk: 32 }, Enter: { key: "Enter", vk: 13 },
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

  if (want("input-and-movement")) await suiteInput();
  if (want("obstacles-spawner-collision")) await suiteObstacles();
  if (want("score-and-screens")) await suiteScreens();
} catch (e) {
  check("harness ran without error", false, String(e.stack || e));
} finally {
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  try { ws?.close(); } catch {}
  chrome.kill();
  process.exit(failed ? 1 : 0);
}

async function suiteInput() {
  console.log("\n== input-and-movement ==");
  evidenceDir("input-and-movement");
  await open("?nospawn");
  let s;
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
  s = await S(); check("ArrowLeft: lane 1 -> 0, slide finished", s.lane === 0 && s.laneVis === 0, `lane=${s.lane} vis=${s.laneVis}`);
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
}

async function suiteObstacles() {
  console.log("\n== obstacles-spawner-collision ==");
  evidenceDir("obstacles-spawner-collision");
  await open("?nospawn");
  const C = await ev("JSON.stringify(window.CaiusRun.CONFIG)").then(JSON.parse);

  // --- pure rules -------------------------------------------------------------
  const ft = await ev("JSON.stringify(window.CaiusRun.fairnessSelfTest(20000, 1))").then(JSON.parse);
  check(`fairness self-test: ${ft.rows} rows at difficulty 0/0.5/1 always leave a reachable lane, never 3 crates`, ft.ok, ft.failures.join("; "));
  const ft2 = await ev("JSON.stringify(window.CaiusRun.fairnessSelfTest(20000, 987654))").then(JSON.parse);
  check("fairness self-test, second seed", ft2.ok, ft2.failures.join("; "));
  const dens = await ev(`(() => { const R = window.CaiusRun, rng = R.mulberry32(3); const avg = (d) => { let prev=[0,1,2], n=0; for (let i=0;i<5000;i++){ const r=R.generateRow(prev,d,rng); n+=r.filter(Boolean).length; prev=R.passableLanes(r);} return n/5000; }; return JSON.stringify({ d0: avg(0), d1: avg(1), g0: R.rowGapTime(0), g1: R.rowGapTime(1), safe: R.minSafeGapTime() }); })()`).then(JSON.parse);
  check("density rises: more obstacles per row at difficulty 1", dens.d1 > dens.d0 + 0.3, `avg ${dens.d0.toFixed(2)} -> ${dens.d1.toFixed(2)}`);
  check("density rises: shorter row gap at difficulty 1, still >= safe minimum", dens.g1 < dens.g0 && dens.g1 >= dens.safe, `gap ${dens.g0}s -> ${dens.g1}s, safe ${dens.safe.toFixed(2)}s`);
  const sp = await ev("JSON.stringify([0, 30, 60, 90, 300].map(window.CaiusRun.speedAt))").then(JSON.parse);
  check("speed ramps gradually from base to cap", sp[0] === C.baseSpeed && sp[1] < sp[2] && sp[2] < sp[3] && sp[4] === C.maxSpeed, sp.map((v) => v.toFixed(2)).join(" -> "));
  const H = (t, lane, z, dl, dy) => ev(`window.CaiusRun.hitTest("${t}", ${lane}, ${z}, ${dl}, ${dy})`);
  check("hit: crate in dog lane at dog depth, grounded", await H("crate", 1, C.dogZ, 1, 0));
  check("hit: crate cannot be jumped (dog at jump peak)", await H("crate", 1, C.dogZ, 1, C.jumpHeight));
  check("hit: log grounded", await H("log", 1, C.dogZ, 1, 0));
  check("no hit: log while airborne above it", !(await H("log", 1, C.dogZ, 1, 0.5)));
  check("no hit: cone while airborne above it", !(await H("cone", 1, C.dogZ, 1, 0.5)));
  check("no hit: crate in neighbouring lane", !(await H("crate", 0, C.dogZ, 1, 0)));
  check("no hit: crate still far ahead", !(await H("crate", 1, C.dogZ + 1, 1, 0)));
  check("hit: half-way through a slide into a crate lane", await H("crate", 2, C.dogZ, 1.5, 0));
  for (const t of ["log", "cone"]) {
    const ok = await ev(`window.CaiusRun.canClearLow("${t}", ${C.maxSpeed}) && window.CaiusRun.canClearLow("${t}", ${C.baseSpeed})`);
    check(`jump clears a ${t} at base and max speed (story 002 deferred AC)`, ok);
  }

  // --- live: spawning -----------------------------------------------------------
  await open("?seed=7");
  await sleep(2600);
  let s = await S();
  const zs = s.obstacles.map((o) => o.wz - s.scroll);
  check("obstacles spawn ahead and move toward the camera", s.obstacles.length > 0 && Math.max(...zs) <= C.spawnAhead + C.maxSpeed * C.rowGapTimeStart && zs.every((z) => z > C.despawnBehind), `${s.obstacles.length} obstacles, z ${Math.min(...zs).toFixed(1)}..${Math.max(...zs).toFixed(1)}`);
  await shot("01-obstacles-approaching.png");
  await waitFor("window.CaiusRun.state.crashed", 12000);
  s = await S();
  check("idle dog eventually crashes into something (collision live)", s.crashed && !s.running, `crashed on ${s.crashedOn} after ${s.time.toFixed(1)}s`);
  await shot("02-crash.png");
  const sc1 = (await S()).scroll; await sleep(300); const sc2 = (await S()).scroll;
  check("after a crash the run stops advancing", sc1 === sc2);

  // --- live: scripted encounters (no random spawns) ----------------------------------
  const place = (type, lane, ahead) => ev(`(() => { const s = window.CaiusRun.state; s.obstacles.push({ type: "${type}", lane: ${lane}, wz: s.scroll + ${C.dogZ} + ${ahead} }); })()`);
  // Jump at the moment the obstacle is half a jump away, from inside the page so timing is exact.
  const autoJump = () => ev(`(() => { const R = window.CaiusRun; const lead = () => R.state.speed * R.CONFIG.jumpAirtime / 2; const tick = () => { const o = R.state.obstacles[0]; if (!o) return; if (o.wz - R.state.scroll - R.CONFIG.dogZ <= lead()) R.jump(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })()`);
  for (const speed of [C.baseSpeed, C.maxSpeed]) {
    for (const type of ["log", "cone"]) {
      await open(`?nospawn&speed=${speed}`);
      await place(type, 1, speed * 0.8); await autoJump(); await sleep(1600); s = await S();
      check(`well-timed jump clears a ${type} at speed ${speed}`, !s.crashed && s.obstacles.length === 0, s.crashed ? `crashed on ${s.crashedOn}` : "passed + despawned");
    }
  }
  await open(`?nospawn&speed=${C.baseSpeed}`);
  await place("log", 1, 1.5); await sleep(1500); s = await S();
  check("running into a log without jumping ends the run", s.crashed && s.crashedOn === "log");
  await open(`?nospawn&speed=${C.baseSpeed}`);
  await place("crate", 1, 1.5); await autoJump(); await sleep(1500); s = await S();
  check("jumping into a crate still ends the run", s.crashed && s.crashedOn === "crate");
  await open(`?nospawn&speed=${C.baseSpeed}`);
  await place("crate", 1, 2.5); await sleep(200); await key("ArrowLeft"); await sleep(1500); s = await S();
  check("switching lanes avoids a crate", !s.crashed && s.lane === 0);
  await open(`?nospawn&speed=${C.baseSpeed}`);
  await place("crate", 0, 1.2); await place("cone", 2, 1.2); await sleep(1200);
  await shot("03-row-passing-dog.png");
  await sleep(600); s = await S();
  check("obstacles in other lanes pass by and despawn", !s.crashed && s.obstacles.length === 0);
}

async function suiteScreens() {
  console.log("\n== score-and-screens ==");
  evidenceDir("score-and-screens");
  await open("?seed=11", { title: true });
  const C = await ev("JSON.stringify(window.CaiusRun.CONFIG)").then(JSON.parse);
  const U = () => ev("JSON.stringify((({buttons, ...u}) => u)(window.CaiusRun.ui))").then(JSON.parse);
  const crateAhead = (ahead = 0.6) => ev(`(() => { const s = window.CaiusRun.state; s.obstacles.push({ type: "crate", lane: s.lane, wz: s.scroll + ${C.dogZ} + ${ahead} }); })()`);
  const button = () => ev("JSON.stringify(window.CaiusRun.ui.buttons.find(b => b.id === 'retry'))").then(JSON.parse);
  const tapAt = async (x, y) => { await touch("touchStart", x, y); await sleep(30); await touch("touchEnd"); };

  // --- Title -----------------------------------------------------------------
  await open("?seed=11", { title: true });
  let u = await U(), s = await S();
  check("page opens on the Title screen", u.screen === "title");
  await sleep(500);
  await shot("01-title-390x844.png");
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await tapAt(195, 500); await sleep(120); u = await U(); s = await S();
  check("tap on Title starts the run", u.screen === "playing" && s.running);
  check("the starting tap does not also make the dog jump", s.grounded);

  // --- Play HUD ----------------------------------------------------------------
  const sc0 = await ev("window.CaiusRun.currentScore()"); await sleep(1500); const sc1 = await ev("window.CaiusRun.currentScore()");
  check("live score increases while running", sc1 > sc0, `${sc0} -> ${sc1}`);
  await shot("02-play-hud.png");

  // --- Game Over ------------------------------------------------------------------
  await crateAhead(); await waitFor("window.CaiusRun.ui.screen === 'gameover'", 2000);
  u = await U(); s = await S();
  const frozen = await ev("window.CaiusRun.currentScore()");
  check("crash shows Game Over with the final score", u.screen === "gameover" && u.lastScore === frozen && !s.running, `score ${u.lastScore}`);
  check("first run sets the session best", u.best === u.lastScore && u.newBest);
  let b = await button();
  check("Try Again button is large (>= 56 px tall)", b && b.h >= 56, b ? `${Math.round(b.w)}x${Math.round(b.h)}` : "missing");
  await tapAt(b.x + b.w / 2, b.y + b.h / 2); await sleep(60); u = await U();
  check("a tap in the first 400 ms of Game Over is ignored", u.screen === "gameover");
  await sleep(500);
  await shot("03-game-over-new-best.png");
  await tapAt(b.x + b.w / 2, b.y - 80); await sleep(60); u = await U();
  check("a tap outside the button does nothing", u.screen === "gameover");
  const t0 = Date.now(); await tapAt(b.x + b.w / 2, b.y + b.h / 2); const ok = await waitFor("window.CaiusRun.ui.screen === 'playing'", 1000); const dt = Date.now() - t0;
  s = await S();
  check("Try Again restarts instantly, straight into play (no Title, no reload)", ok && dt < 1000 && s.running && s.time < 0.5 && s.scroll < 1, `${dt} ms, scroll ${s.scroll.toFixed(2)}`);
  check("restart resets lane, jump and obstacles", s.lane === C.startLane && s.grounded && s.queue.length === 0 && s.obstacles.length <= 4);
  await sleep(150); await crateAhead(); await waitFor("window.CaiusRun.ui.screen === 'gameover'", 2000);
  u = await U();
  check("a lower second score keeps the old best, no 'New best' badge", u.lastScore < u.best && !u.newBest, `score ${u.lastScore}, best ${u.best}`);
  await sleep(500); await shot("04-game-over-not-best.png");
  await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await key("Space"); await sleep(80); u = await U();
  check("Space on Game Over (after the delay) restarts", u.screen === "playing");

  // --- full loop, repeated ------------------------------------------------------------
  const listeners = () => ev("(() => { const c = getEventListeners(document.getElementById('game')); const d = getEventListeners(document); const w = getEventListeners(window); return JSON.stringify([c, d, w].map(o => Object.values(o).reduce((a, l) => a + l.length, 0))); })()", true).then(JSON.parse);
  const before = await listeners();
  let loopsOk = true;
  for (let i = 0; i < 12; i++) {
    await sleep(100); await crateAhead();
    if (!(await waitFor("window.CaiusRun.ui.screen === 'gameover'", 2000))) { loopsOk = false; break; }
    await sleep(C.gameOverInputDelayMs + 30); await key("Enter");
    if (!(await waitFor("window.CaiusRun.ui.screen === 'playing'", 1000))) { loopsOk = false; break; }
  }
  const after = await listeners();
  check("start -> play -> die -> retry repeats 12 times", loopsOk);
  check("no duplicated listeners after 12 retries", JSON.stringify(before) === JSON.stringify(after), `${before} vs ${after}`);
  const fps = await ev("new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); })");
  check("still animating smoothly after the retries", fps >= 50, `${fps} frames in 1 s (headless)`);

  // --- small phone: nothing clipped ----------------------------------------------------
  await metrics(360, 640);
  await open("?seed=11", { title: true }); await sleep(400); await shot("05-title-360x640.png");
  await key("Enter"); await sleep(300); await crateAhead(); await waitFor("window.CaiusRun.ui.screen === 'gameover'", 2000); await sleep(500);
  await shot("06-game-over-360x640.png");
  b = await button();
  check("Game Over button fits a 360x640 screen", b && b.x >= 0 && b.x + b.w <= 360 && b.y + b.h <= 640);
  await metrics(390, 844);
}
