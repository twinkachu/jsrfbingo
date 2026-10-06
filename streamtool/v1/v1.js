let activeFeedConnection = null;
let activeTimerFrame = null;
let seenSnipeSignatures = new Set();
let chatPlayerColors = new Map();
let chatEmoteMap = new Map();
let chatEmoteLoadPromise = null;
let canvasReferenceScaleObserver = null;
const CHAT_MAX_MESSAGES = 80;
const CHAT_7TV_CHANNEL_ID = "58301305";
const MAX_SEEN_SNIPE_SIGNATURES = 10;
const BOARD_SIZE = window.Kevingo.boardSize;

const BASE = {
  playerSource: "manual",
  playerAliases: [],
  playerSide: "left",
  playerFallbackP1: "",
  playerFallbackP2: "FRIEND!",
  frameAuto: false,
  leftName: "",
  rightName: "",
  twitchChannel: "",
  twitch: { show: true },
  map: { show: true },
  themePreset: "base",
  themeHue: 183,
  themeColor: null,
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
  board: { x: 722.5, y: 611, w: 475, h: 469 },
  chat: { x: 0, y: 760, w: 440, h: 320 },
  points: { x: 1480, y: 760, w: 440, h: 320 },
  timer: { x: 906, y: 6, w: 109, h: 57 }
};

const ELEMENT_ORDER = [
  { key: "board", name: "Bingo board", preview: "Bingo board" },
  { key: "chat", name: "Chat", preview: "Live chat" },
  { key: "points", name: "Point counter", preview: "Point counter" },
  { key: "timer", name: "Timer", preview: "Timer" }
];
const V2_PANEL_CONTROLS = [
  { key: "board", input: "v2BoardVisible" },
  { key: "chat", input: "v2ChatVisible" },
  { key: "points", input: "v2PointsVisible" },
  { key: "timer", input: "v2TimerVisible" },
  { key: "map", input: "v2MapVisible" },
  { key: "twitch", input: "v2TwitchVisible" }
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
  const config = { ...source, ...window.KevingoPlayers.normalize(source), disableBeeVfx: Boolean(source.disableBeeVfx) };
  config.twitch = { show: Boolean(source.twitch?.show) };
  config.map = { show: source.map?.show !== false };
  const theme = normalizeV2Theme(source);
  config.themePreset = theme.preset;
  config.themeHue = theme.hue;
  config.themeColor = theme.baseColor;
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

function readTwitchChannel(value) {
  const input = String(value ?? "").trim();
  if (!input) return "";
  const match = input.match(/^(?:https?:\/\/)?(?:(?:www|m)\.)?twitch\.tv\/([a-z0-9_]{3,25})\/?(?:\?.*)?$/i);
  if (match) return match[1].toLowerCase();
  const handle = input.replace(/^@/, "");
  return /^[a-z0-9_]{3,25}$/i.test(handle) ? handle.toLowerCase() : "";
}

function normalizeV2Theme(source) {
  return window.JSRFTheme?.normalize({ preset: source.themePreset, hue: source.themeHue, themeColor: source.themeColor })
    || { preset: BASE.themePreset, hue: BASE.themeHue, baseColor: null };
}

function buildThemePresetControls() {
  const root = byId("v2ThemePresets");
  if (!root) return;
  for (const [id, preset] of Object.entries(window.JSRFTheme.PRESETS)) {
    const label = document.createElement("label");
    label.className = "v2-theme-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "v2ThemePreset";
    input.value = id;
    const display = document.createElement("span");
    const swatch = document.createElement("i");
    swatch.className = "v2-theme-swatch";
    swatch.style.setProperty("--theme-swatch", preset.color);
    display.append(swatch, preset.label);
    label.append(input, display);
    root.appendChild(label);
  }
  const custom = document.createElement("label");
  custom.className = "v2-theme-option";
  custom.innerHTML = '<input type="radio" name="v2ThemePreset" value="custom"><span><i class="v2-theme-swatch v2-theme-custom-swatch"></i>Custom</span>';
  root.appendChild(custom);
}

function syncThemeControls(config) {
  const selected = byId("v2ThemePresets").querySelector(`input[value="${config.themePreset}"]`);
  if (selected) selected.checked = true;
  byId("v2CustomColorRow").classList.toggle("hidden", config.themePreset !== "custom");
  const color = config.themeColor || window.JSRFTheme.hexFromHue(config.themeHue);
  byId("v2ThemeColor").value = color;
  byId("v2ThemeColorValue").textContent = color.toUpperCase();
}

let setupUsers = [];

function livePresentation(config) {
  const resolved = window.KevingoPlayers.resolve(config, setupUsers);
  return { ...config, leftName: resolved.leftName, rightName: resolved.rightName };
}

function updateV2Preview(config) {
  const resolved = window.KevingoPlayers.resolve(config, setupUsers);
  byId("v2Preview")?.contentWindow?.postMessage({
    type: "jsrf-v2-preview",
    theme: window.JSRFTheme.forPlayer(config, resolved.player),
    sourced: config.playerSource === "kevingo",
    leftName: resolved.leftName,
    rightName: resolved.rightName,
    board: config.board.show,
    chat: config.chat.show,
    points: config.points.show,
    timer: config.timer.show,
    map: config.map.show,
    twitch: config.twitch.show,
    disableBeeVfx: config.disableBeeVfx
  }, location.origin === "null" ? "*" : location.origin);
}

function observeV2PreviewSize() {
  const canvas = byId("v2PreviewWrap")?.querySelector(".v2-preview-canvas");
  const iframe = byId("v2Preview");
  if (!canvas || !iframe) return;
  const resize = () => { iframe.style.transform = `scale(${canvas.clientWidth / 1920})`; };
  new ResizeObserver(resize).observe(canvas);
  resize();
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
  if (appRoot) appRoot.className = obsMode ? "obs-only" : "app";
  panel?.classList.toggle("hidden", obsMode);
  previewTitle?.classList.toggle("hidden", obsMode);
  previewMeta?.classList.toggle("hidden", obsMode);
}

function createOverlayImage({ className, src, alt }) {
  const image = document.createElement("img");
  image.className = className;
  image.src = src;
  image.alt = alt;
  return image;
}

function createFrameShadow(image) {
  const shadow = document.createElement("canvas");
  shadow.className = "frame-shadow";
  shadow.setAttribute("aria-hidden", "true");

  const draw = () => {
    shadow.width = image.naturalWidth;
    shadow.height = image.naturalHeight;
    const context = shadow.getContext("2d");
    if (!context) return;
    // Expand the silhouette equally around each opening. The artwork above
    // covers the original frame, leaving a hard inset shadow inside its cutouts.
    const inset = 4;
    for (const x of [-inset, 0, inset]) {
      for (const y of [-inset, 0, inset]) {
        context.drawImage(image, x, y);
      }
    }
    context.globalCompositeOperation = "source-in";
    context.fillStyle = "rgba(0, 0, 0, 0.4)";
    context.fillRect(0, 0, shadow.width, shadow.height);
    context.globalCompositeOperation = "source-over";
  };

  if (image.complete && image.naturalWidth) draw();
  else image.addEventListener("load", draw, { once: true });
  return shadow;
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

function closeActiveFeedSocket() {
  if (activeTimerFrame !== null) {
    cancelAnimationFrame(activeTimerFrame);
    activeTimerFrame = null;
  }
  activeFeedConnection?.close();
  activeFeedConnection = null;
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

function formatGameTime(value) {
  if (value === null || value === undefined) return "";
  const total = Number(value);
  if (!Number.isFinite(total)) return String(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function applyMessageColor(element, color) {
  if (isValidChatColor(color)) {
    element.style.color = String(color).trim();
  }
}

async function loadChatEmotes() {
  if (chatEmoteMap.size) return;
  if (chatEmoteLoadPromise) return chatEmoteLoadPromise;

  chatEmoteLoadPromise = fetchChatEmotes();
  return chatEmoteLoadPromise;
}

async function fetchChatEmotes() {
  if (chatEmoteMap.size) return;

  try {
    const response = await fetch(`https://7tv.io/v3/users/twitch/${CHAT_7TV_CHANNEL_ID}`);
    if (!response.ok) return;
    const data = await response.json();
    const emotes = data?.emote_set?.emotes;
    if (!Array.isArray(emotes)) return;

    const nextEmoteMap = new Map();
    emotes.forEach((emote) => {
      if (!emote?.name || !emote?.id) return;
      if (emote.name.length > 3 || emote.name.toUpperCase() === emote.name) {
        nextEmoteMap.set(emote.name, `https://cdn.7tv.app/emote/${emote.id}/3x.webp`);
      }
    });
    chatEmoteMap = nextEmoteMap;
  } catch (error) {
    console.warn("Failed to fetch 7TV emotes:", error);
  } finally {
    chatEmoteLoadPromise = null;
  }
}

function createChatEmote(name, src) {
  const image = document.createElement("img");
  image.className = "chat-emote";
  image.src = src;
  image.alt = name;
  image.title = name;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

function appendTextWithEmotes(container, value) {
  String(value ?? "").split(/(\s+)/).forEach((part) => {
    if (!part) return;
    const emoteSrc = chatEmoteMap.get(part);
    container.appendChild(emoteSrc ? createChatEmote(part, emoteSrc) : document.createTextNode(part));
  });
}

function districtAreas() {
  const shibuyaCho = ["Shibuya", "Chuo", "Hikage", "Dogen"];
  const benten = ["99th", "SDPP", "HWY0", "Sky Dino", "Stadium"];
  const kogane = ["Sewers", "Kibo", "FRZ", "Btm pt.", "RDH"];

  return { shibuyaCho, benten, kogane, all: [...shibuyaCho, ...benten, ...kogane] };
}

function districtClass(area) {
  const { shibuyaCho, benten, kogane } = districtAreas();

  if (shibuyaCho.includes(area)) return "district-green";
  if (benten.includes(area)) return "district-blue";
  if (kogane.includes(area)) return "district-red";
  return "";
}

function parseBoardEventMessage(message) {
  const content = String(message?.message ?? "").trim();
  const automark = content.startsWith("[AUTOMARK]");
  const body = content.replace(/^\[AUTOMARK\]\s*/, "");
  const match = body.match(/^(.+?)\s+(marked|unmarked)\s+(.+)$/);

  if (!match) return null;
  if (message.author && match[1] !== message.author) return null;

  return {
    automark,
    player: match[1],
    action: match[2],
    objective: match[3]
  };
}

function formatObjective(objective) {
  const withoutSoulNumber = String(objective ?? "").replace(/^(.+?)\s+\d{3}\s+-\s+/, "$1 - ");
  const area = districtAreas().all.find((name) => withoutSoulNumber.startsWith(name));

  if (!area) {
    return { area: null, detail: withoutSoulNumber };
  }

  const detail = withoutSoulNumber.slice(area.length).replace(/^\s*-\s*/, "").trim();
  return { area, detail };
}

function appendEventObjective(container, objective) {
  const { area, detail } = formatObjective(objective);

  if (area) {
    const district = document.createElement("span");
    district.className = `event-objective-district ${districtClass(area)}`.trim();
    appendTextWithEmotes(district, area);
    container.appendChild(district);
  }

  const detailNode = document.createElement("span");
  detailNode.className = "event-objective-detail";
  appendTextWithEmotes(detailNode, area && detail ? `: ${detail}` : detail);
  container.appendChild(detailNode);
}

function createChatEventMessage(parsed, event, shouldAnimate) {
  const message = document.createElement("div");
  message.className = "message chat-event";
  message.style.setProperty("--event-accent", isValidChatColor(parsed.color) ? parsed.color : "#7db7e8");
  if (!shouldAnimate) message.classList.add("message-static");

  const meta = document.createElement("div");
  meta.className = "event-meta";

  const label = document.createElement("span");
  label.textContent = event.automark ? "AUTOMARK" : "BOARD";
  meta.appendChild(label);

  const body = document.createElement("div");
  body.className = "event-body";

  const player = document.createElement("span");
  player.className = "event-player";
  applyMessageColor(player, parsed.color);
  player.textContent = event.player;
  body.appendChild(player);

  const action = document.createElement("span");
  action.className = "event-action";
  action.textContent = event.action;
  body.appendChild(action);

  appendEventObjective(body, event.objective);

  if (parsed.gameTime !== null && parsed.gameTime !== undefined) {
    const timePrefix = document.createElement("span");
    timePrefix.className = "event-time-prefix";
    timePrefix.textContent = " at ";
    body.appendChild(timePrefix);

    const gameTime = document.createElement("span");
    gameTime.className = "event-game-time";
    gameTime.textContent = formatGameTime(parsed.gameTime);
    body.appendChild(gameTime);
  }

  message.append(meta, body);
  return message;
}

function createChatMessage(data, shouldAnimate = true) {
  const parsed = window.Kevingo.parseChatMessage(data);
  registerChatPlayerColor(parsed.author, parsed.color);
  const event = parseBoardEventMessage(parsed);

  if (event) {
    const eventMessage = createChatEventMessage(parsed, event, shouldAnimate);
    eventMessage.__chatMessageSource = { data, shouldAnimate };
    return eventMessage;
  }

  const message = document.createElement("div");
  message.className = "message";
  if (!shouldAnimate) message.classList.add("message-static");

  const meta = document.createElement("div");
  meta.className = "message-meta";

  if (parsed.gameTime !== null && parsed.gameTime !== undefined) {
    const gameTime = document.createElement("span");
    gameTime.className = "message-game-time";
    gameTime.textContent = formatGameTime(parsed.gameTime);
    meta.appendChild(gameTime);
  }

  const text = document.createElement("div");
  text.className = "message-text";
  if (parsed.author) {
    const author = document.createElement("span");
    author.className = "message-sender";
    applyMessageColor(author, parsed.color);
    author.textContent = `${parsed.author}: `;
    text.appendChild(author);
  }
  appendTextWithEmotes(text, parsed.message);

  if (meta.childNodes.length) {
    message.appendChild(meta);
  }
  message.appendChild(text);
  message.__chatMessageSource = { data, shouldAnimate };

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

function createChat(slot) {
  const panel = document.createElement("div");
  panel.className = "chat-panel";
  const log = document.createElement("div");
  log.className = "chat-log";

  panel.append(log);
  slot.append(panel);
  loadChatEmotes().then(() => {
    [...log.querySelectorAll(".message")].forEach((message) => {
      const source = message.__chatMessageSource;
      if (!source) return;
      message.replaceWith(createChatMessage(source.data, false));
    });
  });
  return log;
}

function createBoard(slot) {
  slot._bingoBoard = window.BingoBoard.mount(slot);
}

function formatTimer(ms) {
  const safeMs = Math.max(0, Number(ms) || 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderScoreboard(slot, scoreboard, status = "") {
  slot?._scoreboard?.update(scoreboard, status);
}

function renderTimer(slot, elapsedMs, gameRunning, gameStopped, status = "") {
  if (!slot) return;
  const value = slot.querySelector(".custom-timer-value");
  const state = slot.querySelector(".custom-timer-state");
  if (!value || !state) return;

  value.textContent = gameStopped ? "STOPPED" : formatTimer(elapsedMs);
  state.textContent = status || (gameRunning ? "LIVE" : "READY");
  slot.classList.toggle("timer-running", Boolean(gameRunning));
  slot.classList.toggle("timer-stopped", Boolean(gameStopped));
}

function createScoreboard(slot) {
  slot._scoreboard = window.BingoScoreboard.mount(slot);
}

function createTimer(slot) {
  slot.innerHTML = `
    <div class="custom-timer-shell">
      <div class="custom-timer-value">00:00</div>
      <div class="custom-timer-state">READY</div>
    </div>
  `;
}

function connectGameFeed({ boardSlot, chatSlot, pointsSlot, timerSlot }, config) {
  if (!boardSlot && !chatSlot && !pointsSlot && !timerSlot && config.playerSource !== "kevingo") return;
  const updateNames = (snapshot) => {
    const resolved = window.KevingoPlayers.resolve(config, snapshot.users);
    for (const side of ["left", "right"]) {
      const element = byId("canvas").querySelector(`.${side}-nameplate`);
      if (element) { element.textContent = resolved[`${side}Name`]; element.dataset.name = element.textContent; }
    }
  };
  const chatLog = chatSlot ? createChat(chatSlot) : null;
  const presentation = {
    board: [],
    markingSquareIndexes: new Set(),
    boardTransitionId: 0,
    boardTransitioning: false,
    feedStatus: "",
    scoreboardStatus: ""
  };
  let showedConnectionError = false;
  let client;

  const renderSnapshot = (snapshot) => {
    updateNames(snapshot);
    renderScoreboard(pointsSlot, snapshot.points, presentation.scoreboardStatus);
    renderTimer(
      timerSlot,
      snapshot.timer.elapsedMs,
      snapshot.timer.gameRunning,
      snapshot.timer.gameStopped,
      presentation.feedStatus
    );
  };
  const updateBoard = () => {
    if (!presentation.boardTransitioning) {
      boardSlot?._bingoBoard?.update(presentation.board, {
        markingSquareIndexes: presentation.markingSquareIndexes
      });
    }
  };
  const tick = () => {
    if (!activeFeedConnection) return;
    const { timer } = client.getSnapshot();
    renderTimer(timerSlot, timer.elapsedMs, timer.gameRunning, timer.gameStopped, presentation.feedStatus);
    activeTimerFrame = requestAnimationFrame(tick);
  };

  client = window.Kevingo.createGameClient({
    onStatus(status) {
      if (status.state === "connected") {
        if (showedConnectionError && chatLog) {
          appendChatMessage(chatLog, { content: "Feed reconnected.", color: "#7CFF9B" });
        }
        showedConnectionError = false;
        presentation.feedStatus = "";
        presentation.scoreboardStatus = "";
      } else if (status.state === "reconnecting") {
        presentation.feedStatus = "RECONNECTING";
        presentation.scoreboardStatus = `Reconnecting in ${Math.ceil(status.delayMs / 1000)}s`;
      } else {
        presentation.feedStatus = "ERROR";
        presentation.scoreboardStatus = status.message;
        if (!showedConnectionError && chatLog) {
          appendChatMessage(chatLog, { content: `${status.message}. Reconnecting...`, color: "#ff6b6b" });
        }
        showedConnectionError = true;
      }
      const snapshot = client?.getSnapshot();
      if (snapshot) renderSnapshot(snapshot);
      else renderTimer(timerSlot, 0, false, false, presentation.feedStatus);
    },
    onChat(message, rawMessage) {
      if (chatSlot) handleChatPayload(chatSlot, chatLog, rawMessage);
    },
    onUpdate(snapshot, event) {
      updateNames(snapshot);
      if (event.type === "board" || event.type === "new_board") {
        const nextBoard = snapshot.board;
        const shouldAnimateBoard = event.type === "new_board"
          && presentation.board.length === BOARD_SIZE
          && nextBoard.length === BOARD_SIZE
          && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        presentation.markingSquareIndexes = event.type === "board"
          ? window.Kevingo.newlyClaimedSquareIndexes(presentation.board, nextBoard)
          : new Set();
        presentation.board = nextBoard;
        if (shouldAnimateBoard) {
          presentation.boardTransitioning = true;
          const transitionId = ++presentation.boardTransitionId;
          const refresh = boardSlot?._bingoBoard?.animateRefresh(() => presentation.board);
          if (!refresh) {
            presentation.boardTransitioning = false;
            updateBoard();
          } else refresh.then((completed) => {
            if (!completed || transitionId !== presentation.boardTransitionId) return;
            presentation.boardTransitioning = false;
            updateBoard();
          });
        } else {
          boardSlot?._bingoBoard?.cancelRefreshAnimation();
          presentation.boardTransitionId += 1;
          presentation.boardTransitioning = false;
          updateBoard();
        }
      }
      if (event.type === "board" || event.type === "new_board" || event.type === "user_list") {
        renderScoreboard(pointsSlot, snapshot.points, presentation.scoreboardStatus);
      }
      renderTimer(
        timerSlot,
        snapshot.timer.elapsedMs,
        snapshot.timer.gameRunning,
        snapshot.timer.gameStopped,
        presentation.feedStatus
      );
    }
  });
  activeFeedConnection = client;
  renderSnapshot(client.getSnapshot());
  if (timerSlot) activeTimerFrame = requestAnimationFrame(tick);
}

function parseConfig(searchParams) {
  const config = createConfig();
  Object.assign(config, window.KevingoPlayers.read(searchParams));

  config.leftName = searchParams.has("leftName")
    ? readPlayerName(searchParams.get("leftName"))
    : "";
  config.rightName = searchParams.has("rightName")
    ? readPlayerName(searchParams.get("rightName"))
    : "";
  config.twitchChannel = readTwitchChannel(searchParams.get("twitchChannel"));
  config.twitch.show = searchParams.get("twitch") !== "0";
  config.map.show = searchParams.get("map") !== "0";
  const theme = normalizeV2Theme({ themePreset: searchParams.get("theme"), themeHue: searchParams.get("themeHue"), themeColor: searchParams.get("themeColor") });
  config.themePreset = theme.preset;
  config.themeHue = theme.hue;
  config.themeColor = theme.baseColor;
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
  Object.assign(serialized, window.KevingoPlayers.normalize(config));
  serialized.leftName = serializePlayerName(config.leftName);
  serialized.rightName = serializePlayerName(config.rightName);
  serialized.twitchChannel = readTwitchChannel(config.twitchChannel);
  serialized.twitch.show = config.twitch?.show !== false;
  serialized.map.show = config.map?.show !== false;
  const theme = normalizeV2Theme(config);
  serialized.themePreset = theme.preset;
  serialized.themeHue = theme.hue;
  serialized.themeColor = theme.baseColor;
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
  // Older manual overrides lack sourced-player fields. Normalize their signature before comparing.
  let savedSignature;
  try {
    savedSignature = configSignature(JSON.parse(parsed.urlSignature));
  } catch {
    localStorage.removeItem(OBS_OVERRIDE_STORAGE_KEY);
    return null;
  }
  if (savedSignature !== currentSignature) {
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

function writeFrameParams(p, config, frameVersion) {
  window.KevingoPlayers.write(p, config);
  p.set("leftName", serializePlayerName(config.leftName));
  p.set("rightName", serializePlayerName(config.rightName));
  p.set("disableBeeVfx", config.disableBeeVfx ? "1" : "0");
  if (frameVersion === "v2") {
    if (config.twitchChannel) p.set("twitchChannel", readTwitchChannel(config.twitchChannel));
    p.set("theme", config.themePreset);
    if (config.themePreset === "custom") {
      if (config.themeColor) p.set("themeColor", config.themeColor);
      else p.set("themeHue", String(config.themeHue)); // Preserve legacy hue-only custom themes.
    }
    for (const { key } of V2_PANEL_CONTROLS) p.set(key, config[key].show ? "1" : "0");
    return;
  }
  for (const key of FX_FIELDS) p.set(key, String(config[key] ?? BASE[key]));
  for (const { key } of ELEMENT_ORDER) p.set(key, config[key].show ? "1" : "0");
}

function buildObsUrl(config) {
  const frameVersion = byId("frameVersion")?.value || "v2";
  const url = new URL(`${frameVersion}/`, new URL("./", window.location.href));
  writeFrameParams(url.searchParams, config, frameVersion);
  return url.toString();
}

function buildElementCard(key, name, data) {
  return `
    <div class="card">
      <label class="toggle"><input data-field="${key}.show" type="checkbox" ${data.show ? "checked" : ""}>${name}</label>
    </div>
  `;
}

function createSlot(key, name, preview, isEnabled, obsMode) {
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

  if (key === "board") {
    createBoard(slot);
    return slot;
  }

  if (key === "chat") {
    return slot;
  }

  if (key === "points") {
    createScoreboard(slot);
    return slot;
  }

  if (key === "timer") {
    createTimer(slot);
    return slot;
  }

  return slot;
}

function renderLayout(config, obsMode) {
  closeActiveFeedSocket();
  const canvas = byId("canvas");
  canvas.innerHTML = "";

  setPageMode(obsMode);
  canvas.classList.toggle("bee-vfx-disabled", Boolean(config.disableBeeVfx));

  canvas.style.aspectRatio = `${FIXED_LAYOUT.canvasWidth} / ${FIXED_LAYOUT.canvasHeight}`;
  observeCanvasReferenceScale(canvas);
  canvas.style.setProperty("--layout-fx-filter", buildLayoutFxFilter(config));
  canvas.style.setProperty("--nameplate-fx-filter", buildNameplateFxFilter(config));
  const gameSlots = { boardSlot: null, chatSlot: null, pointsSlot: null, timerSlot: null };

  for (const { key, name, preview } of ELEMENT_ORDER) {
    const slot = createSlot(key, name, preview, config[key].show, obsMode);
    if (!slot) continue;
    if (key === "board") gameSlots.boardSlot = slot;
    if (key === "chat") gameSlots.chatSlot = slot;
    if (key === "points") gameSlots.pointsSlot = slot;
    if (key === "timer") gameSlots.timerSlot = slot;
    canvas.appendChild(slot);
  }

  const frameImage = createOverlayImage({
    className: "overlay color-fx-target",
    src: "./image.png",
    alt: "JSRF Bingo overlay"
  });
  canvas.append(createFrameShadow(frameImage), frameImage);

  const centerDivider = document.createElement("div");
  centerDivider.className = "center-divider color-fx-target";
  centerDivider.setAttribute("aria-hidden", "true");
  canvas.appendChild(centerDivider);

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
  if (obsMode) connectGameFeed(gameSlots, config);

  if (!obsMode) {
    const previewMeta = byId("previewMeta");
    const renderWidth = canvas.clientWidth || 1;
    const scale = renderWidth / FIXED_LAYOUT.canvasWidth;
    if (previewMeta) {
      previewMeta.textContent = `Preview scale: ${(scale * 100).toFixed(1)}% (fixed ${FIXED_LAYOUT.canvasWidth}x${FIXED_LAYOUT.canvasHeight} layout).`;
    }
  }
}

function syncConfigToForm(config) {
  byId("playerSource").value = config.playerSource;
  byId("playerAliases").value = config.playerAliases.join("\n");
  byId("playerSide").value = config.playerSide;
  byId("playerFallbackP1").value = config.playerFallbackP1;
  byId("playerFallbackP1").placeholder = config.playerAliases[0] || "First Kevingo user";
  byId("playerFallbackP2").value = config.playerFallbackP2;
  byId("frameAuto").checked = config.frameAuto;
  syncPlayerControls(config);
  const leftName = byId("leftName");
  const rightName = byId("rightName");
  leftName.value = String(config.leftName ?? "");
  rightName.value = String(config.rightName ?? "");
  for (const { key, input } of V2_PANEL_CONTROLS) byId(input).checked = Boolean(config[key].show);
  byId("v2TwitchChannel").value = config.twitchChannel || "";
  syncThemeControls(config);
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
  next.playerSource = byId("playerSource").value;
  next.playerAliases = window.KevingoPlayers.aliases(byId("playerAliases").value);
  next.playerSide = byId("playerSide").value;
  next.playerFallbackP1 = byId("playerFallbackP1").value;
  next.playerFallbackP2 = byId("playerFallbackP2").value;
  next.frameAuto = byId("frameAuto").checked;
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
  if (byId("frameVersion")?.value === "v2") {
    for (const { key, input } of V2_PANEL_CONTROLS) next[key].show = byId(input).checked;
    next.twitchChannel = readTwitchChannel(byId("v2TwitchChannel").value);
    const selectedTheme = document.querySelector('[name="v2ThemePreset"]:checked')?.value;
    next.themePreset = selectedTheme || window.JSRFTheme.DEFAULT_THEME;
    if (selectedTheme === "custom") {
      next.themeColor = byId("v2ThemeColor").value.toLowerCase();
      next.themeHue = window.JSRFTheme.hueFromHex(next.themeColor);
    } else {
      next.themeColor = null;
    }
  }

  return next;
}

function updateUrlOutput(config) {
  const out = byId("urlOutput");
  out.value = buildObsUrl(config);
  const configUrl = new URL(window.location.href);
  configUrl.search = "";
  const p = configUrl.searchParams;
  const frameVersion = byId("frameVersion")?.value || "v2";
  if (frameVersion === "v1") p.set("frameVersion", "v1");
  writeFrameParams(p, config, frameVersion);
  history.replaceState(null, "", configUrl);
}

function copyObsUrl(config) {
  const text = buildObsUrl(config);
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
  const leftName = byId("leftName");
  const rightName = byId("rightName");
  const elementsRoot = byId("elementsRoot");
  const resetBtn = byId("applyPreset");
  const copyBtn = byId("copyUrl");

  const onAnyChange = () => {
    syncFrameConfigVisibility();
    state.config = readConfigFromForm(state.config);
    syncPlayerControls(state.config);
    renderLayout(livePresentation(state.config), false);
    updateUrlOutput(state.config);
    updateV2Preview(state.config);
  };

  byId("playerSource").addEventListener("change", () => {
    byId("frameAuto").checked = byId("playerSource").value === "kevingo";
    onAnyChange();
  });
  byId("frameAuto").addEventListener("change", onAnyChange);
  byId("playerAliases").addEventListener("input", onAnyChange);
  byId("playerSide").addEventListener("change", onAnyChange);
  byId("playerFallbackP1").addEventListener("input", onAnyChange);
  byId("playerFallbackP2").addEventListener("input", onAnyChange);
  leftName.addEventListener("input", onAnyChange);
  rightName.addEventListener("input", onAnyChange);
  for (const { input } of V2_PANEL_CONTROLS) byId(input).addEventListener("change", onAnyChange);
  byId("v2TwitchChannel").addEventListener("input", onAnyChange);
  byId("v2ThemePresets").addEventListener("change", () => {
    byId("v2CustomColorRow").classList.toggle("hidden", document.querySelector('[name="v2ThemePreset"]:checked')?.value !== "custom");
    onAnyChange();
  });
  byId("v2ThemeColor").addEventListener("input", () => {
    byId("v2ThemeColorValue").textContent = byId("v2ThemeColor").value.toUpperCase();
    onAnyChange();
  });
  byId("v2Preview").addEventListener("load", () => updateV2Preview(state.config));
  for (const key of FX_FIELDS) {
    byId(key).addEventListener("input", onAnyChange);
  }
  byId("disableBeeVfx").addEventListener("change", onAnyChange);
  elementsRoot.addEventListener("change", onAnyChange);
  byId("frameVersion")?.addEventListener("change", () => {
    for (const { key, input } of V2_PANEL_CONTROLS) {
      byId(input).checked = Boolean(state.config[key].show);
      const v1Toggle = elementsRoot.querySelector(`[data-field='${key}.show']`);
      if (v1Toggle) v1Toggle.checked = Boolean(state.config[key].show);
    }
    onAnyChange();
  });

  resetBtn.addEventListener("click", () => {
    state.config = createConfig();
    syncConfigToForm(state.config);
    syncPlayerControls(state.config);
    renderLayout(livePresentation(state.config), false);
    updateUrlOutput(state.config);
    updateV2Preview(state.config);
  });

  copyBtn.addEventListener("click", () => copyObsUrl(state.config));
}

function syncPlayerControls(config) {
  const sourced = config.playerSource === 'kevingo';
  byId('kevingoPlayerConfig').classList.toggle('hidden', !sourced);
  byId('playerFallbackP1').placeholder = config.playerAliases[0] || 'First Kevingo user';
  byId('manualPlayerConfig').classList.toggle('hidden', sourced);
  byId('frameAutoOption').classList.toggle('hidden', !sourced);
  byId('v2CustomColorRow').classList.toggle('hidden', config.themePreset !== 'custom');
}

function connectSetupRoster(state) {
  window.Kevingo.createGameClient({
    onUpdate(snapshot, event) {
      if (!['user_list', 'users_reset'].includes(event.type)) return;
      setupUsers = snapshot.users;
      renderLayout(livePresentation(state.config), false);
      updateV2Preview(state.config);
    }
  });
}

function syncFrameConfigVisibility() {
  const isV2 = byId("frameVersion")?.value === "v2";
  byId("v1OnlyConfig")?.classList.toggle("hidden", isV2);
  byId("v2PanelConfig")?.classList.toggle("hidden", !isV2);
  byId("v2ThemeConfig")?.classList.toggle("hidden", !isV2);
  byId("v2PreviewWrap")?.classList.toggle("hidden", !isV2);
  byId("previewWrap")?.classList.toggle("hidden", isV2);
}

function readObsMenuConfig(root, currentConfig) {
  const next = createConfig(currentConfig);
  next.playerSource = root.querySelector("[data-obs-field=playerSource]").value;
  next.playerAliases = window.KevingoPlayers.aliases(root.querySelector("[data-obs-field=playerAliases]").value);
  next.playerSide = root.querySelector("[data-obs-field=playerSide]").value;
  next.playerFallbackP1 = root.querySelector("[data-obs-field=playerFallbackP1]").value;
  next.playerFallbackP2 = root.querySelector("[data-obs-field=playerFallbackP2]").value;
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
  root.querySelector("[data-obs-field=playerSource]").value = config.playerSource;
  root.querySelector("[data-obs-field=playerAliases]").value = config.playerAliases.join("\n");
  root.querySelector("[data-obs-field=playerSide]").value = config.playerSide;
  root.querySelector("[data-obs-field=playerFallbackP1]").value = config.playerFallbackP1;
  root.querySelector("[data-obs-field=playerFallbackP1]").placeholder = config.playerAliases[0] || "First Kevingo user";
  root.querySelector("[data-obs-field=playerFallbackP2]").value = config.playerFallbackP2;
  root.querySelector("[data-obs-sourced]").hidden = config.playerSource !== "kevingo";
  root.querySelector("[data-obs-manual]").hidden = config.playerSource === "kevingo";
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
        <label>Configuration</label>
        <select data-obs-field="playerSource"><option value="manual">Manual</option><option value="kevingo">Kevingo Sourced</option></select>
      </div>
      <div data-obs-sourced>
        <div class="row"><label>Kevingo User</label><textarea data-obs-field="playerAliases" rows="3" maxlength="1600"></textarea><p class="frame-note">Use lots of names? Enter alt names separated by a new line! Case insensitive.</p></div>
        <div class="row"><label>Side</label><select data-obs-field="playerSide"><option value="left">Left</option><option value="right">Right</option></select></div>
        <details class="player-fallback-drawer">
          <summary>Fallback names</summary>
          <div class="row"><label>Fallback P1 name</label><input data-obs-field="playerFallbackP1" type="text" maxlength="24" placeholder="First Kevingo user"></div>
          <div class="row"><label>Fallback P2 name</label><input data-obs-field="playerFallbackP2" type="text" maxlength="24" placeholder="FRIEND!"></div>
        </details>
      </div>
      <div data-obs-manual>
      <div class="row">
        <label>Left Player Name</label>
        <input data-obs-field="leftName" type="text" maxlength="24">
      </div>
      <div class="row">
        <label>Right Player Name</label>
        <input data-obs-field="rightName" type="text" maxlength="24">
      </div>
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
  buildThemePresetControls();
  observeV2PreviewSize();
  const params = new URLSearchParams(window.location.search);
  const isVersionedRoute = /\/v\d+\//.test(window.location.pathname);
  const frameVersion = byId("frameVersion");
  if (frameVersion) {
    const pathVersion = window.location.pathname.match(/\/v(\d+)\//)?.[1];
    frameVersion.value = pathVersion ? `v${pathVersion}` : "v2";
    if (!pathVersion && params.get("frameVersion") === "v1") frameVersion.value = "v1";
  }
  syncFrameConfigVisibility();
  const obsMode = isVersionedRoute || params.get("mode") === "obs";
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
  renderLayout(livePresentation(state.config), false);
  updateUrlOutput(state.config);
  updateV2Preview(state.config);
  wireUi(state);
  connectSetupRoster(state);
}

init();
