(() => {
  const panel = document.getElementById("v2Twitch");
  const log = document.getElementById("v2TwitchLog");
  const channelLabel = document.getElementById("v2TwitchChannelLabel");
  if (new URLSearchParams(location.search).get("preview") === "1") return;
  let activeStop = null;
  let activeChannel = null;

  function start(channel) {
    const showStatus = (message) => {
      if (log.querySelector(".message")) return;
      const status = document.createElement("div");
      status.className = "twitch-status";
      status.textContent = message;
      log.replaceChildren(status);
    };

    if (!/^[a-z0-9_]{3,25}$/.test(channel)) {
      showStatus("Add a Twitch channel in setup to show live chat.");
      return () => {};
    }
    channelLabel.textContent = `#${channel}`;

    const maxMessages = 50;
    const globalEmotes = new Map();
    const channelEmotes = new Map();
    const messageData = new WeakMap();
    let socket;
    let reconnectTimer;
    let reconnectDelay = 1000;
    let roomId = "";
    let stopped = false;
    let authRejected = false;

    function addEmotes(target, items, getName, getUrl) {
      for (const item of Array.isArray(items) ? items : []) {
        const name = getName(item);
        const url = getUrl(item);
        if (name && url) target.set(name, url);
      }
    }

    function refreshMessages() {
      if (stopped) return;
      for (const message of log.querySelectorAll(".message")) {
        const data = messageData.get(message);
        if (!data) continue;
        const body = message.querySelector(".message-text");
        const sender = body.firstElementChild;
        body.replaceChildren(sender);
        appendMessageText(body, data.text, data.emotes);
      }
    }

    async function fetchJson(url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} from ${url}`);
      return response.json();
    }

    function ffzUrl(emote) {
      const path = emote?.urls?.[2] || emote?.urls?.[1];
      return path?.startsWith("//") ? `https:${path}` : path;
    }

    async function loadGlobalEmotes() {
      const results = await Promise.allSettled([
        fetchJson("https://7tv.io/v3/emote-sets/global"),
        fetchJson("https://api.betterttv.net/3/cached/emotes/global"),
        fetchJson("https://api.frankerfacez.com/v1/set/global")
      ]);
      const [seven, bttv, ffz] = results.map((result) => result.status === "fulfilled" ? result.value : null);
      addEmotes(globalEmotes, seven?.emotes, (emote) => emote.name, (emote) => emote.id && `https://cdn.7tv.app/emote/${emote.id}/2x.webp`);
      addEmotes(globalEmotes, bttv, (emote) => emote.code, (emote) => emote.id && `https://cdn.betterttv.net/emote/${emote.id}/2x`);
      for (const id of ffz?.default_sets || []) {
        addEmotes(globalEmotes, ffz.sets?.[id]?.emoticons, (emote) => emote.name, ffzUrl);
      }
      refreshMessages();
    }

    async function loadChannelEmotes(id) {
      const results = await Promise.allSettled([
        fetchJson(`https://7tv.io/v3/users/twitch/${id}`),
        fetchJson(`https://api.betterttv.net/3/cached/users/twitch/${id}`),
        fetchJson(`https://api.frankerfacez.com/v1/room/id/${id}`)
      ]);
      const [seven, bttv, ffz] = results.map((result) => result.status === "fulfilled" ? result.value : null);
      addEmotes(channelEmotes, seven?.emote_set?.emotes, (emote) => emote.name, (emote) => emote.id && `https://cdn.7tv.app/emote/${emote.id}/2x.webp`);
      addEmotes(channelEmotes, [...(bttv?.channelEmotes || []), ...(bttv?.sharedEmotes || [])], (emote) => emote.code, (emote) => emote.id && `https://cdn.betterttv.net/emote/${emote.id}/2x`);
      for (const set of Object.values(ffz?.sets || {})) {
        addEmotes(channelEmotes, set.emoticons, (emote) => emote.name, ffzUrl);
      }
      refreshMessages();
    }

    function emoteImage(name, url) {
      const image = document.createElement("img");
      image.className = "chat-emote";
      image.src = url;
      image.alt = name;
      image.title = name;
      image.loading = "lazy";
      image.decoding = "async";
      return image;
    }

    function appendThirdPartyEmotes(target, text) {
      for (const part of text.split(/(\s+)/)) {
        if (!part) continue;
        const imageUrl = channelEmotes.get(part) || globalEmotes.get(part);
        target.appendChild(imageUrl ? emoteImage(part, imageUrl) : document.createTextNode(part));
      }
    }

    function appendMessageText(target, text, emoteTag) {
      const ranges = [];
      for (const entry of (emoteTag || "").split("/")) {
        const [id, positions] = entry.split(":");
        // Channel emotes use opaque IDs such as emotesv2_…, while older emotes use numbers.
        if (!/^[a-zA-Z0-9_-]+$/.test(id) || !positions) continue;
        for (const position of positions.split(",")) {
          const match = position.match(/^(\d+)-(\d+)$/);
          if (match) ranges.push({ start: Number(match[1]), end: Number(match[2]) + 1, id });
        }
      }
      ranges.sort((a, b) => a.start - b.start);
      const characters = Array.from(text);
      let cursor = 0;
      for (const { start, end, id } of ranges) {
        if (start < cursor || end <= start || end > characters.length) continue;
        appendThirdPartyEmotes(target, characters.slice(cursor, start).join(""));
        const name = characters.slice(start, end).join("");
        target.appendChild(emoteImage(name, `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`));
        cursor = end;
      }
      appendThirdPartyEmotes(target, characters.slice(cursor).join(""));
    }

    function unescapeTag(value) {
      return value.replace(/\\([sn:r\\])/g, (_, code) => ({ s: " ", n: "\n", ":": ";", r: "\r", "\\": "\\" })[code]);
    }

    function parseIrcLine(line) {
      const match = line.match(/^(?:@([^ ]+) )?(?::([^ ]+) )?([A-Z0-9]+)(?: (.*))?$/);
      if (!match) return null;
      const tags = Object.fromEntries((match[1] || "").split(";").filter(Boolean).map((part) => {
        const separator = part.indexOf("=");
        return separator === -1 ? [part, ""] : [part.slice(0, separator), unescapeTag(part.slice(separator + 1))];
      }));
      return { tags, prefix: match[2] || "", command: match[3], payload: match[4] || "" };
    }

    function appendMessage({ tags, prefix, payload }) {
      const text = payload.slice(payload.indexOf(" :") + 2).replace(/^\u0001ACTION ([\s\S]*)\u0001$/, "$1");
      if (!text) return;
      const author = tags["display-name"] || prefix.split("!")[0] || "viewer";
      const message = document.createElement("div");
      message.className = "message";
      const body = document.createElement("div");
      body.className = "message-text";
      const sender = document.createElement("span");
      sender.className = "message-sender";
      sender.textContent = `${author}: `;
      if (/^#[\da-f]{6}$/i.test(tags.color || "")) sender.style.color = tags.color;
      body.appendChild(sender);
      appendMessageText(body, text, tags.emotes);
      message.appendChild(body);
      messageData.set(message, { text, emotes: tags.emotes });
      log.querySelector(".twitch-status")?.remove();
      log.appendChild(message);
      while (log.children.length > maxMessages) log.firstElementChild.remove();
      log.scrollTop = log.scrollHeight;
    }

    function handleLine(line, connection) {
      if (line.startsWith("PING ")) {
        connection.send(`PONG ${line.slice(5)}`);
        return;
      }
      const parsed = parseIrcLine(line);
      if (!parsed) return;
      if (parsed.command === "ROOMSTATE" || parsed.command === "PRIVMSG") {
        const id = parsed.tags["room-id"];
        if (id && id !== roomId) {
          roomId = id;
          loadChannelEmotes(id);
        }
      }
      if (parsed.command === "PRIVMSG") {
        appendMessage(parsed);
      } else if (parsed.command === "NOTICE" && /authentication failed|improperly formatted auth/i.test(parsed.payload)) {
        authRejected = true;
        showStatus("Twitch rejected the chat connection.");
        connection.close();
      }
    }

    function connect() {
      showStatus("Connecting to Twitch chat…");
      const connection = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
      socket = connection;
      connection.addEventListener("open", () => {
        if (stopped || connection !== socket) { connection.close(); return; }
        reconnectDelay = 1000;
        channelLabel.textContent = `#${channel}`;
        const guest = `justinfan${Math.floor(Math.random() * 80000) + 1000}`;
        connection.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
        connection.send("PASS SCHMOOPIIE");
        connection.send(`NICK ${guest}`);
        connection.send(`JOIN #${channel}`);
        log.querySelector(".twitch-status")?.remove();
      });
      connection.addEventListener("message", (event) => {
        if (stopped || connection !== socket) return;
        for (const line of String(event.data).split("\r\n")) if (line) handleLine(line, connection);
      });
      connection.addEventListener("close", () => {
        if (stopped || authRejected || connection !== socket) return;
        channelLabel.textContent = `#${channel} · reconnecting`;
        showStatus("Twitch chat disconnected. Reconnecting…");
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      });
      connection.addEventListener("error", () => connection.close());
    }

    loadGlobalEmotes();
    connect();
    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }

  window.JSRFV2Config.subscribe((config) => {
    panel.hidden = !config.twitch;
    const nextChannel = config.twitch ? config.twitchChannel : null;
    if (nextChannel === activeChannel) return;
    activeStop?.();
    activeChannel = nextChannel;
    log.replaceChildren();
    channelLabel.textContent = "";
    activeStop = nextChannel === null ? null : start(nextChannel);
  });
  window.addEventListener("pagehide", () => activeStop?.());
})();
