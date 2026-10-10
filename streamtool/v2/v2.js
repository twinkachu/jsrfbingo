(() => {
  const params = new URLSearchParams(window.location.search);
  const previewMode = params.get("preview") === "1";
  const settings = window.JSRFV2Config;
  let config = settings.current;
  const canvas = document.getElementById("v2Canvas");
  canvas.classList.toggle("bee-vfx-disabled", config.disableBeeVfx);
  window.JSRFTheme.apply(canvas, { preset: config.themePreset, hue: config.themeHue, themeColor: config.themeColor });
  window.JSRFTheme.mountFrame(canvas);
  const CHAT_MAX_MESSAGES = 80;
  const CHAT_7TV_CHANNEL_ID = "58301305";
  const PREVIEW_67_EMOTE_ID = "01M1VX1FMSSNNSHMH92GQX67AQ";
  const chatLog = document.querySelector("#v2Chat .chat-log");
  const chatPlayerColors = new Map();
  const snipeProcessor = window.KevingoSnipes.createProcessor();
  const timerElement = document.getElementById("v2Timer");
  let timerFrame = null;
  let chatEmotes = previewMode
    ? new Map([["67", `https://cdn.7tv.app/emote/${PREVIEW_67_EMOTE_ID}/3x.webp`]])
    : new Map();
  let showedConnectionError = false;

  async function loadChatEmotes() {
    try {
      const response = await fetch(`https://7tv.io/v3/users/twitch/${CHAT_7TV_CHANNEL_ID}`);
      if (!response.ok) return;
      const data = await response.json();
      const emotes = data?.emote_set?.emotes;
      if (!Array.isArray(emotes)) return;
      chatEmotes = new Map(emotes
        .filter((emote) => emote?.name && emote?.id
          && (emote.name === "67" || emote.name.length > 3 || emote.name.toUpperCase() === emote.name))
        .map((emote) => [emote.name, `https://cdn.7tv.app/emote/${emote.id}/3x.webp`]));
      [...chatLog.querySelectorAll(".message")].forEach((message) => {
        if (message.__chatData) message.replaceWith(createChatMessage(message.__chatData, false));
      });
    } catch (error) {
      console.warn("Failed to fetch 7TV emotes:", error);
    }
  }

  function appendTextWithEmotes(container, value) {
    String(value ?? "").split(/(\s+)/).forEach((part) => {
      if (!part) return;
      const src = chatEmotes.get(part);
      if (!src) {
        container.appendChild(document.createTextNode(part));
        return;
      }
      const image = document.createElement("img");
      image.className = "chat-emote";
      image.src = src;
      image.alt = part;
      image.title = part;
      image.loading = "lazy";
      image.decoding = "async";
      container.appendChild(image);
    });
  }

  function parseBoardEvent(parsed) {
    const content = String(parsed.message ?? "").trim();
    const automark = content.startsWith("[AUTOMARK]");
    const body = content.replace(/^\[AUTOMARK\]\s*/, "");
    const match = body.match(/^(.+?)\s+(marked|unmarked)\s+(.+)$/);
    if (!match || (parsed.author && match[1] !== parsed.author)) return null;
    return { automark, player: match[1], action: match[2], objective: match[3] };
  }

  function appendEventObjective(container, objective, separator = ": ") {
    const normalized = String(objective ?? "").replace(/^(.+?)\s+\d{3}\s+-\s+/, "$1 - ");
    const district = window.Kevingo.districts.find(({ areas }) => areas.some((name) => normalized.startsWith(name)));
    const area = district?.areas.find((name) => normalized.startsWith(name));
    if (!area) {
      appendTextWithEmotes(container, normalized);
      return;
    }

    const label = document.createElement("span");
    label.className = "event-objective-district";
    label.style.color = district.ink;
    label.textContent = area;
    container.appendChild(label);
    const detail = normalized.slice(area.length).replace(/^\s*-\s*/, "").trim();
    if (detail) {
      const description = document.createElement("span");
      description.className = "event-objective-detail";
      appendTextWithEmotes(description, `${separator}${detail}`);
      container.appendChild(description);
    }
  }

  function createBoardEventMessage(parsed, event, animate, sourceData) {
    const message = document.createElement("div");
    message.className = "message chat-event";
    if (!animate) message.classList.add("message-static");
    message.__chatData = sourceData;
    if (/^#[0-9a-f]{3,8}$/i.test(parsed.color || "")) {
      message.style.setProperty("--event-accent", parsed.color);
    }

    const meta = document.createElement("div");
    meta.className = "event-meta";
    meta.textContent = event.automark ? "AUTOMARK" : "BOARD";
    const body = document.createElement("div");
    body.className = "event-body";
    const player = document.createElement("span");
    player.className = "event-player";
    player.textContent = event.player;
    if (/^#[0-9a-f]{3,8}$/i.test(parsed.color || "")) player.style.color = parsed.color;
    const action = document.createElement("span");
    action.className = "event-action";
    action.textContent = event.action;
    const objective = document.createElement("span");
    objective.className = "event-objective-detail";
    appendEventObjective(objective, event.objective);
    body.append(player, action, objective);

    if (parsed.gameTime !== null && parsed.gameTime !== undefined) {
      const seconds = Number(parsed.gameTime);
      const time = document.createElement("span");
      time.className = "event-game-time";
      time.textContent = ` at ${Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}` : parsed.gameTime}`;
      body.appendChild(time);
    }
    message.append(meta, body);
    return message;
  }

  function createChatMessage(data, animate = true) {
    const parsed = window.Kevingo.parseChatMessage(data);
    if (parsed.author && /^#[0-9a-f]{3,8}$/i.test(String(parsed.color || ""))) {
      chatPlayerColors.set(parsed.author.trim().toLowerCase(), String(parsed.color).trim());
    }
    const boardEvent = parseBoardEvent(parsed);
    if (boardEvent) return createBoardEventMessage(parsed, boardEvent, animate, data);
    const message = document.createElement("div");
    message.className = "message";
    if (!animate) message.classList.add("message-static");
    message.__chatData = data;

    if (parsed.gameTime !== null && parsed.gameTime !== undefined) {
      const meta = document.createElement("div");
      meta.className = "message-meta";
      const time = Number(parsed.gameTime);
      meta.textContent = Number.isFinite(time)
        ? `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`
        : String(parsed.gameTime);
      message.appendChild(meta);
    }

    const text = document.createElement("div");
    text.className = "message-text";
    if (parsed.author) {
      const author = document.createElement("span");
      author.className = "message-sender";
      if (/^#[0-9a-f]{3,8}$/i.test(String(parsed.color || ""))) {
        author.style.color = parsed.color;
      }
      author.textContent = `${parsed.author}: `;
      text.appendChild(author);
    }
    appendTextWithEmotes(text, parsed.message);
    message.appendChild(text);
    return message;
  }

  function appendChatMessage(data, animate = true) {
    const message = createChatMessage(data, animate);
    chatLog.appendChild(message);
    while (chatLog.children.length > CHAT_MAX_MESSAGES) chatLog.firstElementChild.remove();
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function formatTimer(ms) {
    const totalSeconds = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
  }

  function renderTimer(timer, status = "") {
    timerElement.querySelector(".v2-timer-value").textContent = timer.gameStopped
      ? "STOPPED"
      : formatTimer(timer.elapsedMs);
    timerElement.classList.toggle("timer-running", Boolean(timer.gameRunning));
    timerElement.classList.toggle("timer-stopped", Boolean(timer.gameStopped));
  }

  function showSnipeNotice(data) {
    const snipe = snipeProcessor.accept(data);
    if (!snipe) return;
    document.querySelector("#v2Chat .v2-snipe-notice")?.remove();
    const notice = document.createElement("div");
    notice.className = "v2-snipe-notice";
    const time = Number(snipe.time);
    notice.innerHTML = `
      <div class="v2-snipe-kicker">SNIPE</div>
      <div class="v2-snipe-main"><span class="v2-snipe-sniper"></span><span class="v2-snipe-action">sniped</span><span class="v2-snipe-sniped"></span></div>
      <div class="v2-snipe-goal"></div>
      <div class="v2-snipe-time"><span class="v2-snipe-time-value"></span></div>`;

    const sniper = notice.querySelector(".v2-snipe-sniper");
    const sniped = notice.querySelector(".v2-snipe-sniped");
    sniper.textContent = snipe.sniper || "Someone";
    sniped.textContent = snipe.sniped || "someone";
    const sniperColor = chatPlayerColors.get(sniper.textContent.trim().toLowerCase());
    const snipedColor = chatPlayerColors.get(sniped.textContent.trim().toLowerCase());
    if (sniperColor) sniper.style.color = sniperColor;
    if (snipedColor) sniped.style.color = snipedColor;
    appendEventObjective(notice.querySelector(".v2-snipe-goal"), snipe.goal, " - ");
    notice.querySelector(".v2-snipe-time-value").textContent = Number.isFinite(time) ? `${time.toFixed(3)}s` : "";
    notice.querySelector(".v2-snipe-time").hidden = !Number.isFinite(time);
    document.getElementById("v2Chat").appendChild(notice);
    window.setTimeout(() => {
      notice.classList.add("v2-snipe-notice-out");
      window.setTimeout(() => notice.remove(), 450);
    }, 4600);
  }

  window.addEventListener("jsrf-v2-test-snipe", () => {
    showSnipeNotice({
      sniper: leftNameElement.dataset.name || "P1",
      sniped: rightNameElement.dataset.name || "P2",
      goal: "Shibuya 093 - Cubby",
      time: (Math.random() * 3 + 0.1).toFixed(3)
    });
  });

  function handleChatPayload(rawMessage) {
    let event;
    try {
      event = typeof rawMessage === "string" ? JSON.parse(rawMessage) : rawMessage;
    } catch {
      appendChatMessage(rawMessage);
      return;
    }
    if (event?.type === "history" && Array.isArray(event.data)) {
      chatLog.replaceChildren();
      event.data.slice(-CHAT_MAX_MESSAGES).forEach((message) => appendChatMessage(message, false));
    } else if (event?.type === "message") {
      appendChatMessage(event.data);
    } else if (event?.type === "snipe") {
      showSnipeNotice(event.data);
    } else if (event?.type === "notification" && event.data) {
      const notification = window.KevingoSnipes.parseMaybeJson(event.data);
      if (notification && typeof notification === "object" && notification.type === "snipe") showSnipeNotice(notification.data);
      else appendChatMessage(event.data);
    }
  }

  if (!previewMode) loadChatEmotes();

  document.getElementById("v2Chat").hidden = !config.chat;
  const pointsElement = document.getElementById("v2Points");
  pointsElement.hidden = !config.points;
  const mapElement = document.getElementById("v2Map");
  mapElement.hidden = !config.map;
  const points = window.BingoScoreboard.mount(pointsElement);
  const worldMap = window.JSRFWorldMap.mount(mapElement);
  let pointsStatus = "";
  const leftName = config.leftName;
  const rightName = config.rightName;
  const leftNameElement = document.getElementById("v2LeftName");
  const rightNameElement = document.getElementById("v2RightName");
  leftNameElement.textContent = leftName;
  rightNameElement.textContent = rightName;
  leftNameElement.dataset.name = leftName;
  rightNameElement.dataset.name = rightName;

  function updatePlayers(snapshot) {
    const resolved = window.KevingoPlayers.resolve(config, snapshot.users);
    worldMap.update(snapshot, {
      ownTeamOnly: config.mapOwnTeam && config.playerSource === "kevingo",
      team: resolved.player?.team
    });
    snapshot.users.forEach((user) => {
      if (user?.name && window.Kevingo.isClaimedTeamColor(user.team)) {
        chatPlayerColors.set(user.name.trim().toLowerCase(), window.Kevingo.normalizeTeamColor(user.team));
      }
    });
    for (const [element, name] of [[leftNameElement, resolved.leftName], [rightNameElement, resolved.rightName]]) {
      element.textContent = name;
      element.dataset.name = name;
    }
    window.JSRFTheme.apply(canvas, window.JSRFTheme.forPlayer(config, resolved.player), { animate: true });
  }

  const boardElement = document.getElementById("v2Board");
  const board = window.BingoBoard.mount(boardElement, {
    className: "v2-board",
    statusText: "Waiting for board data"
  });
  let currentBoard = [];
  let boardTransitionId = 0;

  if (previewMode) {
    const areas = window.Kevingo.districts.flatMap((district) => district.areas);
    const sampleBoard = Array.from({ length: 25 }, (_, index) => ({
      name: `${areas[index % areas.length]} - Tricks x ${10 + index * 5}`,
      color: [0, 6, 12, 18].includes(index) ? "#1c5bd4"
        : [4, 8, 20].includes(index) ? "#fa5bb6" : "#101010"
    }));
    const twitchLog = document.getElementById("v2TwitchLog");
    document.getElementById("v2TwitchChannelLabel").textContent = "#example";
    for (const [author, message] of [["Beee231", "Waow your layout is soo coolll"], ["TN_Hive", "tuff snipe"]]) {
      const row = document.createElement("div");
      row.className = "message message-static";
      const text = document.createElement("div");
      text.className = "message-text";
      const sender = document.createElement("span");
      sender.className = "message-sender";
      sender.textContent = `${author}: `;
      text.append(sender, message);
      row.appendChild(text);
      twitchLog.appendChild(row);
    }
    board.update(sampleBoard);
    renderTimer({ elapsedMs: 7 * 60 * 1000 + 24 * 1000, gameRunning: true, gameStopped: false });
    let previousNames = "";
    function updatePreview(data) {
      canvas.classList.toggle("bee-vfx-disabled", data.disableBeeVfx === true);
      const left = String(data.leftName || (data.sourced ? "" : "Player 1")).slice(0, 24);
      const right = String(data.rightName || (data.sourced ? "" : "Player 2")).slice(0, 24);
      leftNameElement.textContent = left;
      rightNameElement.textContent = right;
      boardElement.hidden = data.board === false;
      document.getElementById("v2Chat").hidden = data.chat === false;
      pointsElement.hidden = data.points === false;
      timerElement.hidden = data.timer === false;
      mapElement.hidden = data.map === false;
      document.getElementById("v2Twitch").hidden = data.twitch === false;
      window.JSRFTheme.apply(canvas, data.theme);
      const names = JSON.stringify([left, right, data.sourced, data.mapOwnTeam]);
      if (names === previousNames) return;
      previousNames = names;
      const users = [
        { name: left, team: "#1c5bd4" },
        { name: right, team: "#fa5bb6" }
      ];
      const samplePoints = window.Kevingo.calculateScoreboard(sampleBoard, users);
      points.update(samplePoints);
      worldMap.update({ users, locations: [{ name: left, location: "Shibuya" }, { name: right, location: "Kibo" }], points: samplePoints }, { ownTeamOnly: data.sourced && data.mapOwnTeam, team: "#1c5bd4" });
      chatLog.replaceChildren();
      appendChatMessage({ username: left, content: `[AUTOMARK] ${left} marked Shibuya - Tricks x 10`, color: "#1c5bd4", in_game_time: 444 }, false);
      appendChatMessage({ username: right, content: "67", color: "#fa5bb6", in_game_time: 445 }, false);
    }
    updatePreview({
      theme: { preset: config.themePreset, hue: config.themeHue, themeColor: config.themeColor },
      board: config.board,
      chat: config.chat,
      points: config.points,
      timer: config.timer,
      map: config.map,
      mapOwnTeam: config.mapOwnTeam,
      sourced: config.playerSource === "kevingo",
      twitch: config.twitch,
      disableBeeVfx: config.disableBeeVfx
    });
    window.addEventListener("message", (event) => {
      if (event.source !== window.parent || (location.origin !== "null" && event.origin !== location.origin)) return;
      if (event.data?.type === "jsrf-v2-preview") updatePreview(event.data);
    });
    return;
  }

  let client;
  let feedStatus = "";
  const renderSnapshot = (snapshot) => renderTimer(snapshot.timer, feedStatus);
  const tick = () => {
    if (!client) return;
    renderSnapshot(client.getSnapshot());
    timerFrame = requestAnimationFrame(tick);
  };
  client = window.Kevingo.createGameClient({
    onChat(message, rawMessage) {
      handleChatPayload(rawMessage);
    },
    onStatus(status) {
      feedStatus = status.state === "reconnecting" ? "RECONNECTING"
        : status.state === "error" ? "ERROR" : "";
      if (client) renderSnapshot(client.getSnapshot());
      if (status.state === "connected") {
        pointsStatus = "";
      } else if (status.state === "reconnecting") {
        pointsStatus = `Reconnecting in ${Math.ceil(status.delayMs / 1000)}s`;
      } else {
        pointsStatus = status.message || "Connection error";
      }
      if (client) points.update(client.getSnapshot().points, pointsStatus);
      if (status.state === "error" && !showedConnectionError) {
        appendChatMessage({ content: `${status.message}. Reconnecting...`, color: "#ff6b6b" });
        showedConnectionError = true;
      } else if (status.state === "connected" && showedConnectionError) {
        appendChatMessage({ content: "Feed reconnected.", color: "#7CFF9B" });
        showedConnectionError = false;
      }
    },
    onUpdate(snapshot, event) {
      updatePlayers(snapshot);
      renderSnapshot(snapshot);
      if (event.type === "board" || event.type === "new_board") {
        const nextBoard = snapshot.board;
        const markingSquareIndexes = event.type === "board"
          ? window.Kevingo.newlyClaimedSquareIndexes(currentBoard, nextBoard)
          : new Set();
        const shouldAnimateBoard = event.type === "new_board"
          && currentBoard.length === window.BingoBoard.size
          && nextBoard.length === window.BingoBoard.size
          && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        currentBoard = nextBoard;
        if (shouldAnimateBoard) {
          const transitionId = ++boardTransitionId;
          board.animateRefresh(() => currentBoard).then((completed) => {
            if (!completed || transitionId !== boardTransitionId) return;
            board.update(currentBoard);
          });
        } else {
          boardTransitionId += 1;
          board.cancelRefreshAnimation();
          board.update(nextBoard, { markingSquareIndexes });
        }
      }
      if (event.type === "board" || event.type === "new_board" || event.type === "user_list") {
        points.update(snapshot.points, pointsStatus);
      }
    }
  });
  updatePlayers(client.getSnapshot());
  renderSnapshot(client.getSnapshot());
  timerFrame = requestAnimationFrame(tick);
  settings.subscribe((next) => {
    config = next;
    canvas.classList.toggle("bee-vfx-disabled", config.disableBeeVfx);
    document.getElementById("v2Chat").hidden = !config.chat;
    pointsElement.hidden = !config.points;
    mapElement.hidden = !config.map;
    boardElement.hidden = !config.board;
    timerElement.hidden = !config.timer;
    updatePlayers(client.getSnapshot());
  });
  settings.menu();
})();
