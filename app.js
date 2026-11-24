// Lilith: Steph's AI chief of staff.
// Voice + brain: ElevenLabs agent (Jessica voice). Visuals react to her real voice volume.
import { Conversation } from "https://esm.sh/@elevenlabs/client";

const AGENT_ID = "agent_2801m83tbsr1fy1b39h54qfrc9gn";
const $ = (id) => document.getElementById(id);

const TEAM = {
  tia: { n: "Tia", r: "Trend scout", c: "#b48cff" },
  sam: { n: "Sam", r: "Sourcing", c: "#3ef0c0" },
  cleo: { n: "Cleo", r: "Content", c: "#ff6fd8" },
  ava: { n: "Ava", r: "Affiliates", c: "#ff9a3d" },
  max: { n: "Max", r: "Customer care", c: "#5fb8ff" },
  nia: { n: "Nia", r: "Numbers", c: "#c8ff5a" },
};
const APPS = {
  kalodata: ["Kalodata", "https://www.kalodata.com"],
  tiktok_shop: ["TikTok Shop Seller Center", "https://seller-us.tiktok.com"],
  tiktok_studio: ["TikTok Studio", "https://www.tiktok.com/tiktokstudio"],
  tiktok: ["TikTok", "https://www.tiktok.com"],
  trendsi: ["Trendsi", "https://www.trendsi.com"],
  alibaba: ["Alibaba", "https://www.alibaba.com"],
  gmail: ["Gmail", "https://mail.google.com"],
  elevenlabs: ["ElevenLabs", "https://elevenlabs.io/app/agents"],
};
const CONNECTIONS = [["TikTok Shop", false], ["Kalodata", false], ["Gmail", false]];

/* ---------- panels ---------- */
for (const [id, a] of Object.entries(TEAM)) {
  const b = document.createElement("button");
  b.className = "ag"; b.id = "ag-" + id; b.style.setProperty("--c", a.c);
  b.innerHTML = `<span class="n">${a.n.toUpperCase()} · ${a.r.toUpperCase()}</span><span class="s">Ready</span><span class="t"></span>`;
  b.onclick = () => { if (a.last) $("out").textContent = `${a.n} · ${a.r}\n\n${a.last}`; };
  $("team").append(b);
}
for (const [key, [name, url]] of Object.entries(APPS)) {
  const a = document.createElement("a");
  a.className = "app"; a.href = url; a.target = "_blank"; a.rel = "noopener"; a.textContent = name;
  $("apps").append(a);
}
$("conn").innerHTML = CONNECTIONS.map(([n, on]) => `<span class="chip ${on ? "on" : ""}">${n.toUpperCase()} · ${on ? "CONNECTED" : "NOT YET"}</span>`).join("");
setInterval(() => { $("clock").textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }, 1000);

function logLine(who, text) {
  const l = $("log"); if (l.querySelector(".empty")) l.innerHTML = "";
  const d = document.createElement("div"); d.className = who === "you" ? "me" : "her";
  d.innerHTML = `<b>${who === "you" ? "YOU" : "LILITH"}</b>`; d.append(text);
  l.prepend(d);
}
function setStatus(t) { $("status").textContent = t; }

/* ---------- client tools Lilith can call on this page ---------- */
function approvalCard(question, detail, yesLabel = "Approve", href) {
  return new Promise((res) => {
    const box = $("asks"); if (box.querySelector(".empty")) box.innerHTML = "";
    const c = document.createElement("div"); c.className = "ask";
    c.innerHTML = `<div class="q"></div><div class="d"></div><div class="b"></div>`;
    c.querySelector(".q").textContent = question; c.querySelector(".d").textContent = detail || "";
    const yes = document.createElement(href ? "a" : "button"); yes.className = "btn yes"; yes.textContent = yesLabel;
    if (href) { yes.href = href; yes.target = "_blank"; yes.rel = "noopener"; }
    const no = document.createElement("button"); no.className = "btn"; no.textContent = "Not now";
    const done = (v) => { c.classList.add("done"); c.querySelector(".b").textContent = v ? "Approved" : "Declined"; res(v); };
    yes.addEventListener("click", () => setTimeout(() => done(true), 30)); no.onclick = () => done(false);
    c.querySelector(".b").append(yes, no); box.prepend(c);
  });
}
const clientTools = {
  request_approval: async ({ action, detail }) =>
    (await approvalCard(action, detail)) ? "Stephanie approved." : "Stephanie declined. Do not proceed.",
  open_app: async ({ app, reason }) => {
    const a = APPS[app]; if (!a) return "Unknown app.";
    return (await approvalCard(`Open ${a[0]}?`, reason, `Open ${a[0]}`, a[1])) ? `${a[0]} opened in a new tab.` : "Stephanie declined.";
  },
  team_update: ({ agent, status, result }) => {
    const a = TEAM[agent]; const el = $("ag-" + agent); if (!a || !el) return "Unknown teammate.";
    el.querySelector(".s").textContent = status || "Ready";
    el.classList.toggle("busy", /work|writ|search|find|check|draft|pull/i.test(status || ""));
    if (result) { a.last = result; el.querySelector(".t").textContent = "Tap to see the work"; $("out").textContent = `${a.n} · ${a.r}\n\n${result}`; }
    return "Panel updated.";
  },
};

/* ---------- voice session ---------- */
let conv = null, mode = "idle", outVol = 0, inVol = 0;
function greeting() { const h = new Date().getHours(); return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

$("go").onclick = async () => {
  if (conv) { await conv.endSession(); return; }
  try {
    setStatus("Connecting"); $("captext").textContent = "Allow the microphone so Lilith can hear you.";
    await navigator.mediaDevices.getUserMedia({ audio: true });
    conv = await Conversation.startSession({
      agentId: AGENT_ID,
      dynamicVariables: { greeting: greeting(), local_time: new Date().toLocaleString() },
      clientTools,
      onConnect: () => { setStatus("Online"); $("go").textContent = "END CONVERSATION"; $("go").classList.add("live"); },
      onDisconnect: () => { conv = null; mode = "idle"; setStatus("Offline"); $("go").textContent = "WAKE LILITH"; $("go").classList.remove("live"); $("captext").textContent = "Lilith is resting. Tap to wake her."; },
      onModeChange: ({ mode: m }) => { mode = m; setStatus(m === "speaking" ? "Speaking" : "Listening"); },
      onMessage: ({ message, source }) => { if (!message) return; $("captext").textContent = message; logLine(source === "user" ? "you" : "lilith", message); },
      onError: (e) => { console.error(e); $("captext").textContent = "Something glitched connecting to Lilith. Tap to try again."; },
    });
  } catch (e) {
    console.error(e); conv = null; setStatus("Offline");
    $("captext").textContent = e && e.name === "NotAllowedError" ? "Lilith needs your microphone. Allow it in your browser, then tap again." : "Couldn't reach Lilith. Check your connection and tap again.";
  }
};

/* ---------- visuals ---------- */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const art = $("art"), stage = $("stage"), hud = $("hudtxt");
const cv = $("fx"), cx = cv.getContext("2d"), W = cv.width, H = cv.height, C = W / 2, HY = H * 0.255;
const sparks = Array.from({ length: 110 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 0.3 + Math.random() * 1.1, r: 0.8 + Math.random() * 2.6, p: Math.random() * 6 }));
const bars = [...document.querySelectorAll(".bars i")];
let rot = 0, last = 0, amp = 0;

function frame(t) {
  const dt = Math.min(50, t - last) / 1000; last = t;
  if (conv) { try { outVol = conv.getOutputVolume(); inVol = conv.getInputVolume(); } catch (e) {} }
  const target = mode === "speaking" ? Math.min(1, outVol * 2.2) : conv ? Math.min(0.5, inVol * 1.6) * 0.6 : 0.05 + 0.03 * Math.sin(t / 900);
  amp += (target - amp) * 0.25;
  rot += dt * (0.25 + amp * 1.2) * (reduce ? 0.3 : 1);
  cx.clearRect(0, 0, W, H); cx.lineCap = "round";
  const R = W * 0.36;
  const ring = (r, w, col, len, segs, sp) => { cx.strokeStyle = col; cx.lineWidth = w; cx.shadowColor = col; cx.shadowBlur = 20; for (let i = 0; i < segs; i++) { const a = rot * sp + i * 6.283 / segs; cx.beginPath(); cx.arc(C, HY, r, a, a + len); cx.stroke(); } cx.shadowBlur = 0; };
  ring(R * 1.02, 3, `rgba(217,107,255,${0.35 + amp * 0.6})`, 0.9, 3, 0.7);
  ring(R * 1.12, 2, `rgba(110,140,255,${0.3 + amp * 0.5})`, 0.3, 7, -1);
  if (amp > 0.08) {
    cx.strokeStyle = `rgba(230,150,255,${Math.min(1, amp * 1.4)})`; cx.lineWidth = 3; cx.shadowColor = "#d96bff"; cx.shadowBlur = 24; cx.beginPath();
    for (let i = 0; i <= 200; i++) { const a = i / 200 * 6.283, r = R * 0.92 + Math.sin(a * 9 + t / 80) * R * 0.07 * amp + Math.sin(a * 23 - t / 60) * R * 0.04 * amp; const x = C + Math.cos(a) * r, y = HY + Math.sin(a) * r; i ? cx.lineTo(x, y) : cx.moveTo(x, y); }
    cx.closePath(); cx.stroke(); cx.shadowBlur = 0;
  }
  const fr = W * (0.12 + amp * 0.05), g = cx.createRadialGradient(C, H * 0.27, 0, C, H * 0.27, fr);
  g.addColorStop(0, `rgba(255,170,90,${0.15 + amp * 0.75})`); g.addColorStop(0.5, `rgba(220,110,255,${0.08 + amp * 0.35})`); g.addColorStop(1, "rgba(160,80,255,0)");
  cx.fillStyle = g; cx.beginPath(); cx.arc(C, H * 0.27, fr, 0, 6.283); cx.fill();
  const kg = cx.createRadialGradient(C, H * 0.571, 0, C, H * 0.571, W * 0.05);
  kg.addColorStop(0, `rgba(240,180,255,${0.3 + amp * 0.6})`); kg.addColorStop(1, "rgba(160,80,255,0)");
  cx.fillStyle = kg; cx.beginPath(); cx.arc(C, H * 0.571, W * 0.05, 0, 6.283); cx.fill();
  for (const p of sparks) { p.y -= p.v * (reduce ? 0.3 : 1) * (1 + amp * 3); if (p.y < 0) { p.y = H; p.x = Math.random() * W; } const a = 0.2 + 0.4 * Math.abs(Math.sin(t / 500 + p.p)); cx.fillStyle = `rgba(${200 + Math.round(40 * Math.sin(p.p))},170,255,${a})`; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill(); }
  art.style.filter = `brightness(${(1 + amp * 0.22).toFixed(3)}) saturate(${(1 + amp * 0.3).toFixed(3)})`;
  bars.forEach((b, i) => { b.style.height = `${5 + Math.abs(Math.sin(t / 90 + i)) * 15 * Math.max(amp, mode === "listening" ? inVol : 0)}px`; });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- startup: particles gather from the core into Lilith ---------- */
const bc = $("boot"), bx = bc.getContext("2d"), BW = bc.width, BH = bc.height;
const off = document.createElement("canvas"); off.width = BW; off.height = BH; const ox = off.getContext("2d");
let P = null, bootT0 = 0, bootRun = 0;
function buildParticles() {
  ox.drawImage(art, 0, 0, BW, BH); let d; try { d = ox.getImageData(0, 0, BW, BH).data; } catch (e) { return null; }
  const sx = BW * 0.5, sy = BH * 0.83, tx = [], ty = [], cr = [], cg = [], cb = [];
  for (let y = 0; y < BH; y += 3) for (let x = 0; x < BW; x += 3) { const i = (y * BW + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2], l = 0.3 * r + 0.59 * g + 0.11 * b; if (l < 40 || Math.random() > l / 255 * 1.5) continue; tx.push(x + Math.random() * 2); ty.push(y + Math.random() * 2); cr.push(r); cg.push(g); cb.push(b); }
  const n = tx.length, o = { n, sx, sy, rT: new Float32Array(n), th: new Float32Array(n), dl: new Float32Array(n), du: new Float32Array(n), sp: new Float32Array(n), r: cr, g: cg, b: cb };
  let maxR = 0; for (let i = 0; i < n; i++) { const dx = tx[i] - sx, dy = ty[i] - sy; o.rT[i] = Math.hypot(dx, dy); o.th[i] = Math.atan2(dy, dx); if (o.rT[i] > maxR) maxR = o.rT[i]; }
  for (let i = 0; i < n; i++) { o.dl[i] = 0.35 + o.rT[i] / maxR * 1.5 + Math.random() * 0.5; o.du[i] = 1.3 + Math.random() * 0.8; o.sp[i] = (Math.random() < 0.5 ? -1 : 1) * (1.6 + Math.random() * 2.2); }
  o.img = ox.createImageData(BW, BH); o.u32 = new Uint32Array(o.img.data.buffer); return o;
}
function bootFrame(now) {
  if (!bootRun) return; const t = (now - bootT0) / 1000, o = P, px = o.img.data; o.u32.fill(0); let arrived = 0;
  for (let i = 0; i < o.n; i++) { const k = (t - o.dl[i]) / o.du[i]; if (k <= 0) continue; let e = 1; if (k < 1) { const q = 1 - k; e = 1 - q * q * q; } else arrived++;
    const rr = o.rT[i] * e, a = o.th[i] + (1 - e) * o.sp[i], x = (o.sx + Math.cos(a) * rr) | 0, y = (o.sy + Math.sin(a) * rr) | 0; if (x < 0 || y < 0 || x >= BW || y >= BH) continue;
    const j = (y * BW + x) * 4, m = e * e, f = 2.1; px[j] = Math.min(255, px[j] + (70 * (1 - m) + o.r[i] * m) * f); px[j + 1] = Math.min(255, px[j + 1] + (190 * (1 - m) + o.g[i] * m) * f); px[j + 2] = Math.min(255, px[j + 2] + (255 * (1 - m) + o.b[i] * m) * f); px[j + 3] = 255; }
  ox.putImageData(o.img, 0, 0); bx.clearRect(0, 0, BW, BH); bx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) { const rad = BW * (0.05 + i * 0.045) + Math.sin(t * 3 + i) * 2; bx.strokeStyle = `rgba(80,180,255,${0.35 - i * 0.05})`; bx.lineWidth = 1; bx.beginPath(); bx.ellipse(o.sx, o.sy, rad * 1.6, rad * 0.55, 0, 0, 6.283); bx.stroke(); }
  bx.filter = "blur(4px)"; bx.drawImage(off, 0, 0); bx.drawImage(off, 0, 0); bx.filter = "none"; bx.drawImage(off, 0, 0);
  const cr = BW * 0.07 * (1 + 0.25 * Math.sin(t * 8)) * (t < 3.6 ? 1 : Math.max(0, 1 - (t - 3.6)));
  if (cr > 0) { const g = bx.createRadialGradient(o.sx, o.sy, 0, o.sx, o.sy, cr); g.addColorStop(0, "rgba(240,250,255,1)"); g.addColorStop(0.3, "rgba(90,190,255,.8)"); g.addColorStop(1, "rgba(60,120,255,0)"); bx.fillStyle = g; bx.beginPath(); bx.arc(o.sx, o.sy, cr, 0, 6.283); bx.fill(); }
  bx.globalCompositeOperation = "source-over";
  const pct = Math.round(arrived / o.n * 100); hud.textContent = pct < 100 ? `ASSEMBLING... ${pct}%` : "STATUS: ONLINE";
  if (t > 4.3 && stage.classList.contains("booting")) { stage.classList.remove("booting"); bc.style.opacity = 0; }
  if (t > 5.6) { bootRun = 0; setTimeout(() => { hud.style.opacity = 0; }, 1200); return; }
  requestAnimationFrame(bootFrame);
}
async function startBoot() {
  try { await art.decode(); } catch (e) {}
  if (reduce || !(P || (P = buildParticles()))) { stage.classList.remove("booting"); bc.style.opacity = 0; hud.style.opacity = 0; return; }
  stage.classList.add("booting"); bc.style.opacity = 1; hud.style.opacity = 1; bootT0 = performance.now(); bootRun = 1; requestAnimationFrame(bootFrame);
}
startBoot();
let wasHidden = false;
document.addEventListener("visibilitychange", () => { if (document.hidden) wasHidden = true; else if (wasHidden) { wasHidden = false; startBoot(); } });
