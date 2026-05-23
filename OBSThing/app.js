const MIRRORS = [
  { host: "bingo.kevcyg.net", label: "Bingo" },
  { host: "bango.kevcyg.net", label: "Bango" },
  { host: "bongo.kevcyg.net", label: "Bongo" },
  { host: "bungo.kevcyg.net", label: "Bungo" }
];

const CHAT_SERVERS = {
  "bingo.kevcyg.net": "wss://chit.kevcyg.net",
  "bango.kevcyg.net": "wss://chat.kevcyg.net",
  "bongo.kevcyg.net": "wss://chot.kevcyg.net",
  "bungo.kevcyg.net": "wss://chut.kevcyg.net"
};

let activeChatSocket = null;
let seenSnipeSignatures = new Set();
let chatPlayerColors = new Map();
let canvasReferenceScaleObserver = null;
const CHAT_MAX_MESSAGES = 80;
const MAX_SEEN_SNIPE_SIGNATURES = 10;

const BASE = {
  mirror: "bingo.kevcyg.net",
  leftName: "",
  rightName: "",
  hueShift: 0,
  saturation: 100,
  brightness: 100,
  contrast: 100,
  disableBeeVfx: false,
  board: { show: true },
  chat: { show: true },
  points: { show: true },
  timer: { show: true }
};

const FIXED_LAYOUT = {
  canvasWidth: 1920,
  canvasHeight: 1080,
  board: { x: 715, y: 606, w: 490, h: 475 },
  chat: { x: 0, y: 760, w: 440, h: 320 },
  points: { x: 1480, y: 760, w: 440, h: 320 },
  timer: { x: 906, y: 12, w: 109, h: 57 }
};

const ELEMENT_ORDER = [
  { key: "board", name: "Bingo board", preview: "Bingo board" },
  { key: "chat", name: "Chat", preview: "Live chat" },
  { key: "points", name: "Point counter", preview: "Point counter" },
  { key: "timer", name: "Timer", preview: "Timer" }
];
const OBS_OVERRIDE_STORAGE_KEY = "jsrf-bingo-obs-override-v1";
const PLAYER_NAME_MAX_LENGTH = 24;
const FX_FIELDS = ["hueShift", "saturation", "brightness", "contrast"];
const FX_LIMITS = {
  hueShift: { min: -180, max: 180, unit: "deg" },
  saturation: { min: 0, max: 220, unit: "%" },
  brightness: { min: 0, max: 180, unit: "%" },
  contrast: { min: 0, max: 180, unit: "%" }
};
const FX_FILTER_FUNCTIONS = {
  hueShift: "hue-rotate",
  saturation: "saturate",
  brightness: "brightness",
  contrast: "contrast"
};

function byId(id) {
  return document.getElementById(id);
}

function createConfig(source = BASE) {
  const config = { ...source, disableBeeVfx: Boolean(source.disableBeeVfx) };
  for (const { key } of ELEMENT_ORDER) {
    config[key] = { show: Boolean(source[key]?.show) };
  }
  return config;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseIntegerOr(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFxValue(key, value, fallback = BASE[key]) {
  const { min, max } = FX_LIMITS[key];
  return clampNumber(parseIntegerOr(value, fallback), min, max);
}

function readPlayerName(value, fallback = "") {
  return String(value ?? fallback).slice(0, PLAYER_NAME_MAX_LENGTH);
}

function serializePlayerName(value) {
  return readPlayerName(value);
}

function setFxValueLabels(root, selectorPrefix = "") {
  for (const key of FX_FIELDS) {
    const input = selectorPrefix
      ? root.querySelector(`[${selectorPrefix}-field='${key}']`)
      : byId(key);
    const value = selectorPrefix
      ? root.querySelector(`[${selectorPrefix}-value='${key}']`)
      : byId(`${key}Value`);
    value.textContent = `${input.value}${FX_LIMITS[key].unit}`;
  }
}

function buildLayoutFxFilter(config) {
  return FX_FIELDS.map((key) => {
    const unit = FX_LIMITS[key].unit;
    const cssFunction = FX_FILTER_FUNCTIONS[key];
    return `${cssFunction}(${config[key]}${unit})`;
  }).join(" ");
}

function buildNameplateFxFilter(config) {
  return ["hueShift", "saturation", "contrast"].map((key) => {
    const unit = FX_LIMITS[key].unit;
    const cssFunction = FX_FILTER_FUNCTIONS[key];
    return `${cssFunction}(${config[key]}${unit})`;
  }).join(" ");
}

function setPageMode(obsMode) {
  const appRoot = byId("appRoot");
  const panel = byId("configPanel");
  const previewTitle = byId("previewTitle");
  const previewMeta = byId("previewMeta");

  document.body.classList.toggle("obs-mode", obsMode);
  appRoot.className = obsMode ? "obs-only" : "app";
  panel.classList.toggle("hidden", obsMode);
  previewTitle.classList.toggle("hidden", obsMode);
  previewMeta.classList.toggle("hidden", obsMode);
}

function createOverlayImage({ className, src, alt }) {
  const image = document.createElement("img");
  image.className = className;
  image.src = src;
  image.alt = alt;
  return image;
}

function createNameplate(className, name) {
  const nameplate = document.createElement("div");
  nameplate.className = `nameplate ${className}`;
  nameplate.textContent = name;
  nameplate.dataset.name = name;
  return nameplate;
}

function createTopBranding() {
  const branding = document.createElement("div");
  branding.className = "top-branding";
  branding.setAttribute("aria-label", "Twitch, YouTube, Ko-fi slash JSRFBINGO");
  branding.innerHTML = `
    <div class="top-branding-bg color-fx-target" aria-hidden="true"></div>
    <div class="top-branding-content">
      <img class="top-branding-icon twitch-icon" src="./SVGS/Twitch.svg" alt="Twitch">
      <img class="top-branding-icon youtube-icon" src="./SVGS/youtube.webp" alt="YouTube">
      <span class="top-branding-icon kofi-icon-wrap" aria-label="Ko-fi">
        <img class="kofi-icon" src="./SVGS/kofi_symbol.svg" alt="">
      </span>
      <span class="top-branding-separator" aria-hidden="true">/</span>
      <span class="top-branding-handle">JSRFBINGO</span>
    </div>
  `;
  return branding;
}

function setCanvasReferenceScale(canvas) {
  const renderWidth = canvas.clientWidth || FIXED_LAYOUT.canvasWidth;
  canvas.style.setProperty("--layout-reference-scale", String(renderWidth / FIXED_LAYOUT.canvasWidth));
}

function observeCanvasReferenceScale(canvas) {
  setCanvasReferenceScale(canvas);
  if (canvasReferenceScaleObserver || typeof ResizeObserver === "undefined") return;
  canvasReferenceScaleObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      setCanvasReferenceScale(entry.target);
    }
  });
  canvasReferenceScaleObserver.observe(canvas);
}

function mirrorLabel(mirrorHost) {
  const host = normalizeMirror(mirrorHost);
  const mirror = MIRRORS.find((candidate) => candidate.host === host);
  return mirror ? `${mirror.label} (${mirror.host})` : host;
}

function normalizeMirror(raw) {
  if (!raw) return BASE.mirror;
  const host = String(raw)
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  return MIRRORS.some((mirror) => mirror.host === host) ? host : BASE.mirror;
}

function buildSources(mirrorHost) {
  const mirror = normalizeMirror(mirrorHost);
  const origin = `https://${mirror}`;
  const mirrorParam = encodeURIComponent(mirror);
  return {
    board: `${origin}/static_board?mirror=${mirrorParam}`,
    points: `${origin}/static_points?mirror=${mirrorParam}`,
    timer: `${origin}/static_timer?mirror=${mirrorParam}`
  };
}

function chatServerForMirror(mirrorHost) {
  return CHAT_SERVERS[normalizeMirror(mirrorHost)];
}

function closeActiveChatSocket() {
  if (!activeChatSocket) return;
  activeChatSocket.onopen = null;
  activeChatSocket.onmessage = null;
  activeChatSocket.onerror = null;
  activeChatSocket.onclose = null;
  activeChatSocket.close();
  activeChatSocket = null;
}

function parseChatMessage(data) {
  if (Array.isArray(data)) {
    return { message: data.map((item) => String(item)).join(" ") };
  }

  if (!data || typeof data !== "object") {
    return { message: String(data ?? "") };
  }

  const author = data.author || data.user || data.username || data.name || data.player || "";
  const message = data.message || data.msg || data.text || data.content || data.body || "";
  const time = data.time || data.timestamp || "";
  const gameTime = data.in_game_time;
  const color = data.color || "";

  if (message) return { author, message, time, gameTime, color };
  return { message: JSON.stringify(data) };
}

function normalizePlayerColorName(name) {
  return String(name ?? "").trim().toLowerCase();
}

function isValidChatColor(color) {
  return /^#[0-9a-f]{3,8}$/i.test(String(color ?? "").trim());
}

function registerChatPlayerColor(author, color) {
  const key = normalizePlayerColorName(author);
  if (!key || !isValidChatColor(color)) return;
  chatPlayerColors.set(key, String(color).trim());
}

function chatColorForPlayer(name) {
  return chatPlayerColors.get(normalizePlayerColorName(name)) || "";
}

function formatClock(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatGameTime(value) {
  if (value === null || value === undefined) return "";
  const total = Number(value);
  if (!Number.isFinite(total)) return String(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function createChatMessage(data, shouldAnimate = true) {
  const parsed = parseChatMessage(data);
  registerChatPlayerColor(parsed.author, parsed.color);

  const message = document.createElement("div");
  message.className = "message";
  if (!shouldAnimate) message.classList.add("message-static");

  if (parsed.time) {
    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent = `${formatClock(parsed.time)} `;
    message.appendChild(time);
  }

  if (parsed.gameTime !== null && parsed.gameTime !== undefined) {
    const gameTime = document.createElement("span");
    gameTime.className = "message-game-time";
    gameTime.textContent = `(${formatGameTime(parsed.gameTime)}) `;
    message.appendChild(gameTime);
  }

  if (parsed.author) {
    const author = document.createElement("span");
    author.className = "message-author";
    if (parsed.color) author.style.color = parsed.color;
    author.textContent = `${parsed.author}: `;
    message.appendChild(author);
  }

  const body = document.createElement("span");
  body.className = "message-body";
  body.textContent = parsed.message;
  message.appendChild(body);

  return message;
}

function appendChatMessage(log, data, shouldAnimate = true) {
  const message = createChatMessage(data, shouldAnimate);
  log.appendChild(message);
  trimChatLog(log);
  scrollChatToBottom(log);
}

function trimChatLog(log) {
  while (log.children.length > CHAT_MAX_MESSAGES) {
    log.firstElementChild.remove();
  }
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeSnipeSignatureText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeSnipeSignatureTime(value) {
  if (value === null || value === undefined || value === "") return "";
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return numericValue.toFixed(3);
  return normalizeSnipeSignatureText(value);
}

function createSnipeSignature(snipe) {
  const sniper = normalizeSnipeSignatureText(snipe.sniper);
  const sniped = normalizeSnipeSignatureText(snipe.sniped);
  const goal = normalizeSnipeSignatureText(snipe.goal);
  if (!sniper || !sniped || !goal) return "";

  return [
    sniper,
    sniped,
    goal,
    normalizeSnipeSignatureTime(snipe.time)
  ].join("|");
}

function rememberSnipeSignature(signature) {
  if (seenSnipeSignatures.has(signature)) return false;

  seenSnipeSignatures.add(signature);
  while (seenSnipeSignatures.size > MAX_SEEN_SNIPE_SIGNATURES) {
    const oldestSignature = seenSnipeSignatures.values().next().value;
    seenSnipeSignatures.delete(oldestSignature);
  }

  return true;
}

function showSnipeNotification(slot, data) {
  const snipe = parseMaybeJson(data);
  if (!snipe || typeof snipe !== "object") return;

  const signature = createSnipeSignature(snipe);
  if (!signature || !rememberSnipeSignature(signature)) return;

  const existing = slot.querySelector(".snipe-notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = "snipe-notification";
  notification.innerHTML = `
    <div class="snipe-kicker">SNIPE</div>
    <div class="snipe-main">
      <span class="snipe-sniper"></span>
      <span class="snipe-action">sniped</span>
      <span class="snipe-sniped"></span>
    </div>
    <div class="snipe-goal"></div>
    <div class="snipe-time">
      <span class="snipe-time-label"></span>
      <span class="snipe-time-value"></span>
    </div>
  `;

  const sniper = notification.querySelector(".snipe-sniper");
  const sniped = notification.querySelector(".snipe-sniped");
  const sniperColor = chatColorForPlayer(snipe.sniper);
  const snipedColor = chatColorForPlayer(snipe.sniped);
  sniper.textContent = snipe.sniper || "Someone";
  sniped.textContent = snipe.sniped || "someone";
  if (sniperColor) sniper.style.color = sniperColor;
  if (snipedColor) sniped.style.color = snipedColor;
  notification.querySelector(".snipe-goal").textContent = snipe.goal || "";
  const timeLabel = notification.querySelector(".snipe-time-label");
  const timeValue = notification.querySelector(".snipe-time-value");
  if (Number.isFinite(Number(snipe.time))) {
    timeLabel.textContent = "by ";
    timeValue.textContent = `${Number(snipe.time).toFixed(3)}s`;
  } else {
    timeLabel.textContent = "";
    timeValue.textContent = "";
  }

  slot.appendChild(notification);
  window.setTimeout(() => {
    notification.classList.add("snipe-notification-out");
    window.setTimeout(() => notification.remove(), 450);
  }, 4600);
}

function showDemoSnipeNotification(config = null) {
  const slot = document.querySelector(".chat-slot");
  if (!slot) return;
  const leftName = readPlayerName(config?.leftName || "");
  const rightName = readPlayerName(config?.rightName || "");
  const sniper = leftName || "P1";
  const sniped = rightName || "P2";

  showSnipeNotification(slot, {
    sniper,
    sniped,
    goal: "Shibuya 093 - Cubby",
    time: (Math.random() * 3 + 0.1).toFixed(3)
  });
}

function scrollChatToBottom(log) {
  requestAnimationFrame(() => {
    log.scrollTop = log.scrollHeight;
  });
}

function handleChatPayload(slot, log, payload) {
  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    appendChatMessage(log, payload);
    return;
  }

  if (event.type === "history" && Array.isArray(event.data)) {
    log.innerHTML = "";
    const fragment = document.createDocumentFragment();
    event.data.slice(-CHAT_MAX_MESSAGES).forEach((message) => {
      fragment.appendChild(createChatMessage(message, false));
    });
    log.appendChild(fragment);
    scrollChatToBottom(log);
    return;
  }

  if (event.type === "message") {
    appendChatMessage(log, event.data);
    return;
  }

  if (event.type === "snipe") {
    showSnipeNotification(slot, event.data);
    return;
  }

  if (event.type === "notification" && event.data) {
    const notification = parseMaybeJson(event.data);
    if (notification && typeof notification === "object" && notification.type === "snipe") {
      showSnipeNotification(slot, notification.data);
      return;
    }
    appendChatMessage(log, event.data);
  }
}

function connectChat(slot, mirrorHost) {
  const server = chatServerForMirror(mirrorHost);
  const log = document.createElement("div");
  log.className = "chat-log";

  slot.append(log);

  try {
    const socket = new WebSocket(server);
    activeChatSocket = socket;

    socket.addEventListener("open", () => {
      const username = `CHAT_READER_${Math.random().toString(36).slice(2, 8)}`;
      socket.send(JSON.stringify({ username }));
    });

    socket.addEventListener("message", (event) => {
      handleChatPayload(slot, log, event.data);
    });

    socket.addEventListener("error", () => {
      appendChatMessage(log, { content: "Chat connection error.", color: "#ff6b6b" });
    });

    socket.addEventListener("close", () => {
      if (activeChatSocket === socket) {
        activeChatSocket = null;
      }
    });
  } catch (error) {
    appendChatMessage(log, { content: "Unable to connect to chat.", color: "#ff6b6b" });
  }
}

function parseConfig(searchParams) {
  const config = createConfig();

  config.mirror = normalizeMirror(searchParams.get("mirror"));
  config.leftName = searchParams.has("leftName")
    ? readPlayerName(searchParams.get("leftName"))
    : "";
  config.rightName = searchParams.has("rightName")
    ? readPlayerName(searchParams.get("rightName"))
    : "";
  for (const key of FX_FIELDS) {
    config[key] = parseFxValue(key, searchParams.get(key) ?? String(BASE[key]));
  }
  config.disableBeeVfx = searchParams.get("disableBeeVfx") === "1";

  for (const { key } of ELEMENT_ORDER) {
    const current = config[key];
    const enabled = searchParams.get(key);
    if (enabled !== null) {
      current.show = enabled === "1";
    }
  }

  return config;
}

function configToSerializable(config) {
  const serialized = createConfig();
  serialized.mirror = normalizeMirror(config.mirror);
  serialized.leftName = serializePlayerName(config.leftName);
  serialized.rightName = serializePlayerName(config.rightName);
  for (const key of FX_FIELDS) {
    const { min, max } = FX_LIMITS[key];
    serialized[key] = clampNumber(parseIntegerOr(config[key], BASE[key]), min, max);
  }
  serialized.disableBeeVfx = Boolean(config.disableBeeVfx);
  for (const { key } of ELEMENT_ORDER) {
    serialized[key].show = Boolean(config[key] && config[key].show);
  }
  return serialized;
}

function configSignature(config) {
  return JSON.stringify(configToSerializable(config));
}

function readObsOverride(baseConfig) {
  let parsed;
  try {
    parsed = JSON.parse(localStorage.getItem(OBS_OVERRIDE_STORAGE_KEY) || "null");
  } catch {
    localStorage.removeItem(OBS_OVERRIDE_STORAGE_KEY);
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (typeof parsed.urlSignature !== "string" || !parsed.overrideConfig) {
    localStorage.removeItem(OBS_OVERRIDE_STORAGE_KEY);
    return null;
  }
  const currentSignature = configSignature(baseConfig);
  if (parsed.urlSignature !== currentSignature) {
    localStorage.removeItem(OBS_OVERRIDE_STORAGE_KEY);
    return null;
  }
  return configToSerializable(parsed.overrideConfig);
}

function writeObsOverride(baseConfig, overrideConfig) {
  const payload = {
    urlSignature: configSignature(baseConfig),
    overrideConfig: configToSerializable(overrideConfig)
  };
  localStorage.setItem(OBS_OVERRIDE_STORAGE_KEY, JSON.stringify(payload));
}

function clearObsOverride() {
  localStorage.removeItem(OBS_OVERRIDE_STORAGE_KEY);
}

function buildUrl(config, obsMode) {
  const url = new URL(window.location.href);
  url.search = "";
  const p = url.searchParams;
  p.set("mode", obsMode ? "obs" : "config");
  p.set("mirror", normalizeMirror(config.mirror));
  p.set("leftName", serializePlayerName(config.leftName));
  p.set("rightName", serializePlayerName(config.rightName));
  for (const key of FX_FIELDS) {
    p.set(key, String(config[key] ?? BASE[key]));
  }
  p.set("disableBeeVfx", config.disableBeeVfx ? "1" : "0");

  for (const { key } of ELEMENT_ORDER) {
    const el = config[key];
    p.set(key, el.show ? "1" : "0");
  }

  return url.toString();
}

function buildElementCard(key, name, data) {
  return `
    <div class="card">
      <label class="toggle"><input data-field="${key}.show" type="checkbox" ${data.show ? "checked" : ""}>${name}</label>
    </div>
  `;
}

function createSlot(key, name, preview, isEnabled, obsMode, sources, mirrorHost) {
  if (!isEnabled) return null;
  const cfg = FIXED_LAYOUT[key];

  const slot = document.createElement("section");
  slot.className = "slot";
  slot.classList.add(`${key}-slot`);

  const xPct = (cfg.x / FIXED_LAYOUT.canvasWidth) * 100;
  const yPct = (cfg.y / FIXED_LAYOUT.canvasHeight) * 100;
  const wPct = (cfg.w / FIXED_LAYOUT.canvasWidth) * 100;
  const hPct = (cfg.h / FIXED_LAYOUT.canvasHeight) * 100;

  slot.style.left = `${xPct}%`;
  slot.style.top = `${yPct}%`;
  slot.style.width = `${wPct}%`;
  slot.style.height = `${hPct}%`;

  if (!obsMode) {
    slot.classList.add("placeholder");
    slot.dataset.previewText = preview || name;
    return slot;
  }
  if (key !== "board") {
    slot.classList.add("fg");
  }

  if (key === "chat") {
    connectChat(slot, mirrorHost);
    return slot;
  }

  const iframe = document.createElement("iframe");
  iframe.src = sources[key];
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer";
  iframe.setAttribute("scrolling", "no");
  if (key === "points") {
    const pointsScale = Math.min(cfg.w / 360, cfg.h / 260);
    slot.style.setProperty("--points-scale", String(pointsScale));
  } else if (key === "timer") {
    const timerScale = Math.min(cfg.w / 92, cfg.h / 48);
    slot.style.setProperty("--timer-scale", String(timerScale));
  }

  slot.appendChild(iframe);

  return slot;
}

function renderLayout(config, obsMode) {
  closeActiveChatSocket();
  const canvas = byId("canvas");
  canvas.innerHTML = "";

  setPageMode(obsMode);
  canvas.classList.toggle("bee-vfx-disabled", Boolean(config.disableBeeVfx));

  canvas.style.aspectRatio = `${FIXED_LAYOUT.canvasWidth} / ${FIXED_LAYOUT.canvasHeight}`;
  observeCanvasReferenceScale(canvas);
  canvas.style.setProperty("--layout-fx-filter", buildLayoutFxFilter(config));
  canvas.style.setProperty("--nameplate-fx-filter", buildNameplateFxFilter(config));
  const sources = buildSources(config.mirror);
  const mirrorHost = normalizeMirror(config.mirror);

  for (const { key, name, preview } of ELEMENT_ORDER) {
    const slot = createSlot(key, name, preview, config[key].show, obsMode, sources, mirrorHost);
    if (slot) canvas.appendChild(slot);
  }

  canvas.appendChild(createOverlayImage({
    className: "overlay color-fx-target",
    src: "./image.png",
    alt: "JSRF Bingo overlay"
  }));

  if (!config.disableBeeVfx) {
    const gridLines = document.createElement("div");
    gridLines.className = "grid-lines color-fx-target";
    gridLines.setAttribute("aria-hidden", "true");
    gridLines.innerHTML = '<span class="grid-lines-left"></span><span class="grid-lines-right"></span>';
    canvas.appendChild(gridLines);
  }

  canvas.appendChild(createNameplate("left-nameplate", config.leftName));
  canvas.appendChild(createNameplate("right-nameplate", config.rightName));

  canvas.appendChild(createTopBranding());

  if (!obsMode) {
    const previewMeta = byId("previewMeta");
    const renderWidth = canvas.clientWidth || 1;
    const scale = renderWidth / FIXED_LAYOUT.canvasWidth;
    previewMeta.textContent = `Mirror: ${mirrorLabel(config.mirror)}. Preview scale: ${(scale * 100).toFixed(1)}% (fixed ${FIXED_LAYOUT.canvasWidth}x${FIXED_LAYOUT.canvasHeight} layout).`;
  }
}

function syncConfigToForm(config) {
  const mirrorSelect = byId("mirrorSelect");
  const leftName = byId("leftName");
  const rightName = byId("rightName");
  mirrorSelect.innerHTML = MIRRORS.map((mirror) => `
    <label class="mirror-option">
      <input
        type="radio"
        name="configMirror"
        data-field="mirror"
        value="${mirror.host}"
      >
      <span>${mirror.label}</span>
    </label>
  `).join("");
  const mirror = normalizeMirror(config.mirror);
  mirrorSelect.querySelectorAll("[data-field='mirror']").forEach((input) => {
    input.checked = input.value === mirror;
  });
  leftName.value = String(config.leftName ?? "");
  rightName.value = String(config.rightName ?? "");
  for (const key of FX_FIELDS) {
    byId(key).value = String(config[key] ?? BASE[key]);
  }
  byId("disableBeeVfx").checked = Boolean(config.disableBeeVfx);
  setFxValueLabels(document);
  const root = byId("elementsRoot");
  root.innerHTML = ELEMENT_ORDER.map(({ key, name }) => buildElementCard(key, name, config[key])).join("");
}

function readConfigFromForm(currentConfig) {
  const next = createConfig(currentConfig);
  const mirrorInput = document.querySelector("#mirrorSelect [data-field='mirror']:checked");
  next.mirror = normalizeMirror(mirrorInput ? mirrorInput.value : BASE.mirror);
  next.leftName = readPlayerName(byId("leftName").value);
  next.rightName = readPlayerName(byId("rightName").value);
  for (const key of FX_FIELDS) {
    next[key] = Number.parseInt(byId(key).value, 10);
  }
  next.disableBeeVfx = byId("disableBeeVfx").checked;
  setFxValueLabels(document);

  document.querySelectorAll("[data-field$='.show']").forEach((input) => {
    const [key, prop] = input.dataset.field.split(".");
    next[key][prop] = input.checked;
  });

  return next;
}

function updateUrlOutput(config) {
  const out = byId("urlOutput");
  out.value = buildUrl(config, true);
  const configUrl = buildUrl(config, false);
  history.replaceState(null, "", configUrl);
}

function copyObsUrl(config) {
  const text = buildUrl(config, true);
  navigator.clipboard.writeText(text).then(() => {
    const btn = byId("copyUrl");
    const prev = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(() => { btn.textContent = prev; }, 900);
  }).catch(() => {
    const out = byId("urlOutput");
    out.focus();
    out.select();
  });
}

function wireUi(state) {
  const mirrorSelect = byId("mirrorSelect");
  const leftName = byId("leftName");
  const rightName = byId("rightName");
  const elementsRoot = byId("elementsRoot");
  const resetBtn = byId("applyPreset");
  const copyBtn = byId("copyUrl");

  const onAnyChange = () => {
    state.config = readConfigFromForm(state.config);
    renderLayout(state.config, false);
    updateUrlOutput(state.config);
  };

  mirrorSelect.addEventListener("change", onAnyChange);
  leftName.addEventListener("input", onAnyChange);
  rightName.addEventListener("input", onAnyChange);
  for (const key of FX_FIELDS) {
    byId(key).addEventListener("input", onAnyChange);
  }
  byId("disableBeeVfx").addEventListener("change", onAnyChange);
  elementsRoot.addEventListener("change", onAnyChange);

  resetBtn.addEventListener("click", () => {
    state.config = createConfig();
    syncConfigToForm(state.config);
    renderLayout(state.config, false);
    updateUrlOutput(state.config);
  });

  copyBtn.addEventListener("click", () => copyObsUrl(state.config));
}

function readObsMenuConfig(root, currentConfig) {
  const next = createConfig(currentConfig);
  const mirrorInput = root.querySelector("[data-obs-field='mirror']:checked");
  next.mirror = normalizeMirror(mirrorInput ? mirrorInput.value : BASE.mirror);
  next.leftName = readPlayerName(root.querySelector("[data-obs-field='leftName']").value);
  next.rightName = readPlayerName(root.querySelector("[data-obs-field='rightName']").value);
  for (const key of FX_FIELDS) {
    next[key] = parseFxValue(key, root.querySelector(`[data-obs-field='${key}']`).value);
  }
  next.disableBeeVfx = root.querySelector("[data-obs-field='disableBeeVfx']").checked;
  for (const { key } of ELEMENT_ORDER) {
    const toggle = root.querySelector(`[data-obs-field='${key}.show']`);
    next[key].show = Boolean(toggle && toggle.checked);
  }
  return next;
}

function syncObsMenuValues(root, config) {
  const mirror = normalizeMirror(config.mirror);
  root.querySelectorAll("[data-obs-field='mirror']").forEach((input) => {
    input.checked = input.value === mirror;
  });
  root.querySelector("[data-obs-field='leftName']").value = String(config.leftName ?? "");
  root.querySelector("[data-obs-field='rightName']").value = String(config.rightName ?? "");
  for (const key of FX_FIELDS) {
    root.querySelector(`[data-obs-field='${key}']`).value = String(config[key] ?? BASE[key]);
  }
  root.querySelector("[data-obs-field='disableBeeVfx']").checked = Boolean(config.disableBeeVfx);
  setFxValueLabels(root, "data-obs");
  for (const { key } of ELEMENT_ORDER) {
    const toggle = root.querySelector(`[data-obs-field='${key}.show']`);
    if (toggle) toggle.checked = Boolean(config[key] && config[key].show);
  }
}

function setupObsMenu(state) {
  const existing = byId("obsMenuOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("aside");
  overlay.id = "obsMenuOverlay";
  overlay.className = "obs-menu-overlay";
  overlay.innerHTML = `
    <button class="obs-menu-hitarea" id="obsMenuHitArea" aria-label="Open OBS config"></button>
    <section class="obs-menu hidden" id="obsMenuPanel" aria-label="OBS config">
      <h2>OBS Config</h2>
      <div class="row">
        <label>Gameplay mirror</label>
        <div class="obs-mirror-grid" role="radiogroup" aria-label="Gameplay mirror">
          ${MIRRORS.map((mirror, idx) => `
            <label class="obs-mirror-option">
              <input
                data-obs-field="mirror"
                type="radio"
                name="obsMirror"
                value="${mirror.host}"
                ${idx === 0 ? "checked" : ""}
              >
              <span>${mirror.label}</span>
            </label>
          `).join("")}
        </div>
      </div>
      <div class="row">
        <label>Left Player Name</label>
        <input data-obs-field="leftName" type="text" maxlength="24">
      </div>
      <div class="row">
        <label>Right Player Name</label>
        <input data-obs-field="rightName" type="text" maxlength="24">
      </div>
      <div class="row fx-row">
        <label>Hue Shift</label>
        <input data-obs-field="hueShift" type="range" min="-180" max="180" step="1">
        <span class="fx-value" data-obs-value="hueShift">0deg</span>
      </div>
      <div class="row fx-row">
        <label>Saturation</label>
        <input data-obs-field="saturation" type="range" min="0" max="220" step="1">
        <span class="fx-value" data-obs-value="saturation">100%</span>
      </div>
      <div class="row fx-row">
        <label>Brightness</label>
        <input data-obs-field="brightness" type="range" min="0" max="180" step="1">
        <span class="fx-value" data-obs-value="brightness">100%</span>
      </div>
      <div class="row fx-row">
        <label>Contrast</label>
        <input data-obs-field="contrast" type="range" min="0" max="180" step="1">
        <span class="fx-value" data-obs-value="contrast">100%</span>
      </div>
      <label class="toggle bfx-toggle"><input data-obs-field="disableBeeVfx" type="checkbox">Disable BFX</label>
      <div class="obs-menu-toggles">
        ${ELEMENT_ORDER.map(({ key, name }) => `<label class="toggle"><input data-obs-field="${key}.show" type="checkbox">${name}</label>`).join("")}
      </div>
      <div class="actions obs-menu-actions">
        <button type="button" id="obsMenuSave">Save</button>
        <button type="button" id="obsMenuReset">Reset to URL</button>
        <button type="button" id="obsMenuClose">Close</button>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);

  const hitArea = overlay.querySelector("#obsMenuHitArea");
  const panel = overlay.querySelector("#obsMenuPanel");
  const closeBtn = overlay.querySelector("#obsMenuClose");
  const saveBtn = overlay.querySelector("#obsMenuSave");
  const resetBtn = overlay.querySelector("#obsMenuReset");

  const openMenu = () => {
    panel.classList.remove("hidden");
    hitArea.classList.add("hidden");
  };
  const closeMenu = () => {
    panel.classList.add("hidden");
    hitArea.classList.remove("hidden");
  };

  hitArea.addEventListener("click", (event) => {
    if (event.shiftKey) {
      event.preventDefault();
      showDemoSnipeNotification(state.config);
      return;
    }
    syncObsMenuValues(panel, state.config);
    openMenu();
  });

  closeBtn.addEventListener("click", closeMenu);

  panel.addEventListener("input", (event) => {
    const field = event.target.dataset?.obsField;
    if (!field) return;
    state.config = readObsMenuConfig(panel, state.config);
    renderLayout(state.config, true);
    syncObsMenuValues(panel, state.config);
  });
  panel.addEventListener("change", (event) => {
    const field = event.target.dataset?.obsField;
    if (!field) return;
    state.config = readObsMenuConfig(panel, state.config);
    renderLayout(state.config, true);
    syncObsMenuValues(panel, state.config);
  });

  saveBtn.addEventListener("click", () => {
    state.config = readObsMenuConfig(panel, state.config);
    writeObsOverride(state.baseConfig, state.config);
    renderLayout(state.config, true);
    closeMenu();
  });

  resetBtn.addEventListener("click", () => {
    clearObsOverride();
    state.config = createConfig(state.baseConfig);
    syncObsMenuValues(panel, state.config);
    renderLayout(state.config, true);
  });
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const obsMode = params.get("mode") === "obs";
  const baseConfig = parseConfig(params);
  const overrideConfig = readObsOverride(baseConfig);
  const config = overrideConfig || baseConfig;

  if (obsMode) {
    const state = { baseConfig, config };
    renderLayout(state.config, true);
    setupObsMenu(state);
    return;
  }

  const state = { config };
  syncConfigToForm(state.config);
  renderLayout(state.config, false);
  updateUrlOutput(state.config);
  wireUi(state);
}

init();
