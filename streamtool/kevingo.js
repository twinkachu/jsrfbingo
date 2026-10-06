(() => {
  const SERVER = "wss://chat.kevcyg.net";
  const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 15000];
  const STABLE_CONNECTION_MS = 30000;
  const BOARD_SIZE = 25;
  const UNCLAIMED_COLOR = "#101010";
  const BINGO_LINE_BONUS = 2;
  const GRAFFITI_BONUS = 2;
  const BASE_POINTS_TO_WIN = 13;
  const SPECTATOR_COLORS = new Set([
    "#FFFFFF", "#F5F5F5", "#EEEEEE", "#E8E8E8", "#DDDDDD", "#D9D9D9", "#CCCCCC", "#C0C0C0"
  ]);
  const DISTRICT_GROUPS = [
    { id: "shibuya", name: "Shibuya", color: "green", ink: "#89e989", marker: "#188842", areas: ["Shibuya", "Chuo", "Hikage", "Dogen"] },
    { id: "kogane", name: "Kogane", color: "red", ink: "#ff0000", marker: "#cc3333", areas: ["Sewers", "Kibo", "FRZ", "Btm pt.", "RDH"] },
    { id: "benten", name: "Benten", color: "blue", ink: "#a0baff", marker: "#3333cc", areas: ["99th", "SDPP", "HWY0", "Sky Dino", "Stadium"] }
  ].map((district) => Object.freeze({ ...district, areas: Object.freeze(district.areas) }));
  const BINGO_LINES = [
    [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19], [20, 21, 22, 23, 24], [0, 5, 10, 15, 20],
    [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24], [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
  ];

  let activeConnection = null;
  const username = `CUSTOM_OVERLAY_READER${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;

  function connect({ onMessage, onStatus } = {}) {
    if (activeConnection) activeConnection.close();

    let socket = null;
    let reconnectTimer = null;
    let stableTimer = null;
    let reconnectAttempt = 0;
    let closed = false;
    let connectionErrorReported = false;

    const reportStatus = (status) => onStatus?.(status);
    const clearTimers = () => {
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (stableTimer !== null) window.clearTimeout(stableTimer);
      reconnectTimer = null;
      stableTimer = null;
    };
    const scheduleReconnect = () => {
      if (closed || reconnectTimer !== null) return;
      if (stableTimer !== null) window.clearTimeout(stableTimer);
      stableTimer = null;
      const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
      reconnectAttempt += 1;
      reportStatus({ state: "reconnecting", delayMs: delay });
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        openSocket();
      }, delay);
    };
    const openSocket = () => {
      if (closed) return;
      try {
        socket = new WebSocket(SERVER);
        const currentSocket = socket;
        currentSocket.addEventListener("open", () => {
          if (closed || socket !== currentSocket) return;
          reportStatus({ state: "connected" });
          connectionErrorReported = false;
          stableTimer = window.setTimeout(() => {
            stableTimer = null;
            if (!closed && socket === currentSocket) reconnectAttempt = 0;
          }, STABLE_CONNECTION_MS);
          currentSocket.send(JSON.stringify({ username }));
          currentSocket.send(JSON.stringify({ type: "info", data: { type: "Teams" } }));
          currentSocket.send(JSON.stringify({ type: "info", data: { type: "Start Time" } }));
          currentSocket.send(JSON.stringify({ type: "info", data: { type: "Game Active" } }));
        });
        currentSocket.addEventListener("message", (event) => {
          if (closed || socket !== currentSocket) return;
          let message;
          try {
            message = JSON.parse(event.data);
          } catch {
            return;
          }
          onMessage?.(message, event.data);
        });
        currentSocket.addEventListener("error", () => {
          if (closed || socket !== currentSocket) return;
          if (!connectionErrorReported) {
            reportStatus({ state: "error", message: "Connection error" });
            connectionErrorReported = true;
          }
          currentSocket.close();
        });
        currentSocket.addEventListener("close", () => {
          if (closed || socket !== currentSocket) return;
          socket = null;
          scheduleReconnect();
        });
      } catch {
        reportStatus({ state: "error", message: "Unable to connect" });
        connectionErrorReported = true;
        scheduleReconnect();
      }
    };

    const connection = {
      close() {
        if (closed) return;
        closed = true;
        clearTimers();
        const currentSocket = socket;
        socket = null;
        if (currentSocket) currentSocket.close();
        if (activeConnection === connection) activeConnection = null;
      }
    };
    activeConnection = connection;
    openSocket();
    return connection;
  }

  function normalizeTeamColor(color) {
    return String(color ?? "").trim().toUpperCase();
  }

  function parseHexColor(color) {
    const match = normalizeTeamColor(color).match(/^#([0-9A-F]{6})$/);
    if (!match) return null;
    return {
      r: Number.parseInt(match[1].slice(0, 2), 16),
      g: Number.parseInt(match[1].slice(2, 4), 16),
      b: Number.parseInt(match[1].slice(4, 6), 16)
    };
  }

  function isNeutralSpectatorColor(color) {
    const rgb = parseHexColor(color);
    if (!rgb) return false;
    return Math.max(rgb.r, rgb.g, rgb.b) >= 170
      && Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b) <= 26;
  }

  function isClaimedTeamColor(color) {
    const normalized = normalizeTeamColor(color);
    return /^#[0-9A-F]{6}$/.test(normalized)
      && normalized !== UNCLAIMED_COLOR
      && !SPECTATOR_COLORS.has(normalized)
      && !isNeutralSpectatorColor(normalized);
  }

  function squareHasGraffiti(square) {
    return String(square?.name ?? "").toUpperCase().includes("GRAFFITI");
  }

  function parseBoardSquareText(square) {
    const name = String(square?.name ?? square?.text ?? "").trim();
    const district = DISTRICT_GROUPS.find(({ areas }) => areas.some((area) => name.includes(area)));
    const area = district?.areas.find((candidate) => name.includes(candidate)) || "";
    const goal = name.includes("GRAFFITI")
      ? "GRAFFITI"
      : name.includes("Unlock")
        ? `Unlock ${name.split("Unlock")[1]?.trim() || "Unlock"}`
        : name.includes("-")
          ? name.slice(name.indexOf("-") + 1).trim()
          : name;
    return { area, goal, district: district?.color || "" };
  }

  function newlyClaimedSquareIndexes(previousBoard, nextBoard) {
    if (!Array.isArray(previousBoard) || previousBoard.length !== BOARD_SIZE) return new Set();
    if (!Array.isArray(nextBoard) || nextBoard.length !== BOARD_SIZE) return new Set();
    const indexes = new Set();
    nextBoard.forEach((square, index) => {
      if (!isClaimedTeamColor(previousBoard[index]?.color) && isClaimedTeamColor(square?.color)) {
        indexes.add(index);
      }
    });
    return indexes;
  }

  function addToCount(map, key, amount = 1) {
    map.set(key, (map.get(key) || 0) + amount);
  }

  function calculateScoreboard(board, users) {
    const points = new Map();
    const squares = new Map();
    const districts = DISTRICT_GROUPS.map(({ id, name, color, ink }) => ({ id, name, color, ink, availablePoints: 0 }));
    const teamColors = [];
    let pointsToWin = BASE_POINTS_TO_WIN;
    if (!Array.isArray(board) || board.length < BOARD_SIZE) {
      return { pointsToWin, teams: [], districts, ready: false };
    }

    const normalizedBoard = board.slice(0, BOARD_SIZE).map((square) => ({
      ...square,
      color: normalizeTeamColor(square?.color)
    }));
    for (const square of normalizedBoard) {
      const graffiti = squareHasGraffiti(square);
      if (graffiti) pointsToWin += 1;
      if (!isClaimedTeamColor(square.color)) {
        const district = districts.find(({ color }) => color === parseBoardSquareText(square).district);
        if (district) district.availablePoints += 1 + (graffiti ? GRAFFITI_BONUS : 0);
        continue;
      }
      addToCount(squares, square.color);
      addToCount(points, square.color);
      if (graffiti) addToCount(points, square.color, GRAFFITI_BONUS);
    }
    for (const line of BINGO_LINES) {
      const lineColor = normalizedBoard[line[0]]?.color;
      if (!isClaimedTeamColor(lineColor) || !line.every((index) => normalizedBoard[index]?.color === lineColor)) continue;
      addToCount(points, lineColor, BINGO_LINE_BONUS);
      pointsToWin += 1;
    }

    const membersByTeam = new Map();
    if (Array.isArray(users)) {
      for (const user of users) {
        const team = normalizeTeamColor(user?.team);
        if (!isClaimedTeamColor(team)) continue;
        if (!teamColors.includes(team)) teamColors.push(team);
        if (!membersByTeam.has(team)) membersByTeam.set(team, []);
        membersByTeam.get(team).push(user);
      }
    }
    const teams = teamColors.map((color) => ({
      color,
      members: membersByTeam.get(color) || [],
      score: points.get(color) || 0,
      squares: squares.get(color) || 0
    }));
    return { pointsToWin, teams, districts, ready: true };
  }

  function parseChatMessage(data) {
    if (Array.isArray(data)) return { message: data.map((item) => String(item)).join(" ") };
    if (!data || typeof data !== "object") return { message: String(data ?? "") };
    const author = data.author || data.user || data.username || data.name || data.player || "";
    const message = data.message || data.msg || data.text || data.content || data.body || "";
    if (message) return { author, message, gameTime: data.in_game_time, color: data.color || "" };
    return { message: JSON.stringify(data) };
  }

  function parseMaybeJson(value) {
    if (typeof value !== "string") return value;
    try { return JSON.parse(value); } catch { return value; }
  }

  function readInfoValue(data) {
    if (!data || typeof data !== "object") return data;
    return data.value ?? data.result ?? data.data ?? data.timestamp ?? null;
  }

  function isTruthyInfoValue(value) {
    return value === true || value === "true" || value === 1 || value === "1";
  }

  function serverTimestampToMs(value) {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000000) : null;
  }

  function createGameClient({ onUpdate, onChat, onStatus } = {}) {
    const locations = new Map();
    const data = {
      board: [],
      users: [],
      gameRunning: false,
      gameStarted: false,
      gameStopped: false,
      startClientMs: null,
      minimumElapsedMs: 0,
      elapsedMs: 0,
      points: calculateScoreboard([], [])
    };

    function getSnapshot() {
      if (data.gameRunning && data.startClientMs !== null) {
        data.elapsedMs = Math.max(data.elapsedMs, performance.now() - data.startClientMs);
      }
      return {
        board: data.board,
        users: data.users,
        points: data.points,
        locations: [...locations].map(([name, location]) => ({ name, location })),
        timer: {
          elapsedMs: data.elapsedMs,
          gameRunning: data.gameRunning,
          gameStarted: data.gameStarted,
          gameStopped: data.gameStopped
        }
      };
    }

    function publish(type, message) {
      onUpdate?.(getSnapshot(), { type, message });
    }

    function applyStartTimestamp(value) {
      const timestampMs = serverTimestampToMs(value);
      if (timestampMs === null) return false;
      const elapsed = Math.max(data.minimumElapsedMs, Date.now() - timestampMs, 0);
      data.startClientMs = performance.now() - elapsed;
      data.elapsedMs = elapsed;
      return true;
    }

    function applyMinimumElapsed(elapsedMs) {
      if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return false;
      data.minimumElapsedMs = Math.max(data.minimumElapsedMs, elapsedMs);
      if (data.elapsedMs >= data.minimumElapsedMs) return false;
      data.elapsedMs = data.minimumElapsedMs;
      if (data.gameRunning) data.startClientMs = performance.now() - data.elapsedMs;
      return true;
    }

    const connection = connect({
      onStatus(status) {
        if (status.state !== "connected") {
          locations.clear();
          data.users = [];
          data.points = calculateScoreboard(data.board, []);
          publish("users_reset");
        }
        onStatus?.(status);
      },
      onMessage(message, rawMessage) {
        let changed = false;
        if (message.type === "message") {
          const rawSeconds = message.data?.in_game_time;
          const seconds = rawSeconds === null || rawSeconds === undefined || rawSeconds === ""
            ? NaN
            : Number(rawSeconds);
          if (Number.isFinite(seconds) && seconds >= 0) changed = applyMinimumElapsed(seconds * 1000);
          onChat?.(message, rawMessage);
          if (changed) publish("timer_sync", message);
          return;
        }
        if (["history", "snipe", "notification"].includes(message.type)) {
          onChat?.(message, rawMessage);
          return;
        }
        if (message.type === "board" || message.type === "new_board") {
          data.board = Array.isArray(message.data) ? message.data : [];
          data.points = calculateScoreboard(data.board, data.users);
          if (message.type === "new_board") {
            data.gameRunning = false;
            data.gameStarted = false;
            data.gameStopped = false;
            data.startClientMs = null;
            data.minimumElapsedMs = 0;
            data.elapsedMs = 0;
          }
          publish(message.type, message);
          return;
        }
        const infoPayload = message.type === "info" ? parseMaybeJson(message.data) : null;
        const roster = message.type === "user_list" ? message.data
          : String(infoPayload?.type).toLowerCase() === "teams" ? infoPayload.data : null;
        if (message.type === "user_list" || roster !== null) {
          data.users = Array.isArray(roster) ? roster : [];
          const names = new Set(data.users.map((user) => user?.name));
          for (const name of locations.keys()) {
            if (!names.has(name)) locations.delete(name);
          }
          for (const user of data.users) {
            if (typeof user?.name === "string" && Object.hasOwn(user, "location")) {
              locations.set(user.name, user.location);
            }
          }
          data.points = calculateScoreboard(data.board, data.users);
          publish("user_list", message);
          return;
        }
        if (message.type === "location_update") {
          const { name, location } = message.data || {};
          if (typeof name !== "string" || !name.trim()) return;
          locations.set(name, location);
          publish(message.type, message);
          return;
        }
        if (message.type === "game_start" && message.data?.result !== "false") {
          data.minimumElapsedMs = 0;
          if (applyStartTimestamp(message.data?.timestamp)) {
            data.gameRunning = true;
            data.gameStarted = true;
            data.gameStopped = false;
            publish(message.type, message);
          }
          return;
        }
        if (message.type === "result") {
          getSnapshot();
          data.gameRunning = false;
          data.gameStopped = true;
          publish(message.type, message);
          return;
        }
        if (message.type === "info") {
          const info = parseMaybeJson(message.data);
          const infoType = String(info?.type ?? info?.name ?? "").toLowerCase();
          const value = readInfoValue(info);
          if (infoType === "start time") {
            if (applyStartTimestamp(value)) {
              data.gameStarted = true;
              changed = true;
            }
          } else if (infoType === "game active") {
            if (!isTruthyInfoValue(value)) getSnapshot();
            data.gameRunning = isTruthyInfoValue(value);
            if (data.gameRunning) {
              data.gameStarted = true;
              data.gameStopped = false;
            } else if (data.gameStarted) {
              data.gameStopped = true;
            }
            changed = true;
          }
          if (changed) publish(message.type, message);
        }
      }
    });

    return {
      close: () => connection.close(),
      getSnapshot
    };
  }

  window.Kevingo = Object.freeze({
    connect,
    createGameClient,
    normalizeTeamColor,
    isClaimedTeamColor,
    squareHasGraffiti,
    parseBoardSquareText,
    newlyClaimedSquareIndexes,
    calculateScoreboard,
    parseChatMessage,
    districts: Object.freeze(DISTRICT_GROUPS),
    basePointsToWin: BASE_POINTS_TO_WIN,
    boardSize: BOARD_SIZE
  });
})();
