(() => {
  const STORAGE_KEY = "jsrf-bingo-obs-override-v2";
  const params = new URLSearchParams(location.search);
  const previewMode = params.get("preview") === "1";
  const panelNames = {
    board: "Bingo board", chat: "Game feed", points: "Points", timer: "Timer",
    map: "Player tracker", twitch: "Twitch chat"
  };
  const listeners = new Set();

  function twitchChannel(value) {
    const input = String(value ?? "").trim();
    const match = input.match(/^(?:https?:\/\/)?(?:(?:www|m)\.)?twitch\.tv\/([a-z0-9_]{3,25})\/?(?:\?.*)?$/i);
    const handle = match?.[1] || input.replace(/^@/, "");
    return /^[a-z0-9_]{3,25}$/i.test(handle) ? handle.toLowerCase() : "";
  }

  function normalize(source = {}) {
    const players = window.KevingoPlayers.normalize(source);
    const theme = window.JSRFTheme.normalize({
      preset: source.themePreset, hue: source.themeHue, themeColor: source.themeColor
    });
    const config = {
      ...players,
      leftName: String(source.leftName ?? "").slice(0, 24),
      rightName: String(source.rightName ?? "").slice(0, 24),
      themePreset: theme.preset,
      themeHue: theme.hue,
      themeColor: theme.baseColor,
      twitchChannel: twitchChannel(source.twitchChannel),
      disableBeeVfx: source.disableBeeVfx === true
    };
    for (const key of Object.keys(panelNames)) config[key] = source[key] !== false;
    return config;
  }

  function fromUrl(search) {
    return normalize({
      ...window.KevingoPlayers.read(search),
      leftName: search.get("leftName"), rightName: search.get("rightName"),
      themePreset: search.get("theme"), themeHue: search.get("themeHue"), themeColor: search.get("themeColor"),
      twitchChannel: search.get("twitchChannel"),
      disableBeeVfx: search.get("disableBeeVfx") === "1",
      ...Object.fromEntries(Object.keys(panelNames).map((key) => [key, search.get(key) !== "0"]))
    });
  }

  const base = fromUrl(params);
  const signature = JSON.stringify(base);
  function storedOverride() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.urlSignature === signature && saved.overrideConfig) return normalize(saved.overrideConfig);
      if (saved) localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Could not read V2 OBS settings:", error);
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
    }
    return null;
  }

  let current = previewMode ? base : storedOverride() || base;
  function update(next) {
    current = normalize(next);
    for (const listener of listeners) listener(current);
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ urlSignature: signature, overrideConfig: current }));
      return true;
    } catch (error) {
      console.warn("Could not save V2 OBS settings:", error);
      return false;
    }
  }
  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) { console.warn("Could not clear V2 OBS settings:", error); }
    update(base);
  }
  function subscribe(listener) {
    listeners.add(listener);
    listener(current);
    return () => listeners.delete(listener);
  }

  function menu() {
    if (previewMode) return;
    const overlay = document.createElement("aside");
    overlay.className = "v2-obs-menu-overlay";
    overlay.innerHTML = `
      <button class="v2-obs-menu-hitarea" type="button" aria-label="Open OBS config"></button>
      <section class="v2-obs-menu" aria-label="OBS config" hidden>
        <h2>OBS Config</h2>
        <div class="v2-obs-menu-grid">
          <div class="v2-obs-menu-section">
            <h3>Players</h3>
            <div class="v2-obs-choice-label">Configuration</div>
            <div class="v2-obs-choice-group" role="group" aria-label="Player configuration">
              <button type="button" data-choice="playerSource" data-value="manual">Manual</button>
              <button type="button" data-choice="playerSource" data-value="kevingo">Kevingo Sourced</button>
            </div>
            <div data-sourced hidden>
              <label>Kevingo names or aliases <textarea data-field="playerAliases" rows="3" maxlength="1600" placeholder="One name per line"></textarea></label>
              <details class="player-fallback-drawer">
                <summary>Fallback names</summary>
                <label>Fallback P1 name <input data-field="playerFallbackP1" type="text" maxlength="24" placeholder="First Kevingo user"></label>
                <label>Fallback P2 name <input data-field="playerFallbackP2" type="text" maxlength="24" placeholder="FRIEND!"></label>
              </details>
              <div class="v2-obs-choice-label">Side</div>
              <div class="v2-obs-choice-group" role="group" aria-label="Player side">
                <button type="button" data-choice="playerSide" data-value="left">Left</button>
                <button type="button" data-choice="playerSide" data-value="right">Right</button>
              </div>
              <label class="v2-obs-check"><input data-field="frameAuto" type="checkbox"> Auto swap frame color with my team</label>
            </div>
            <div data-manual>
              <label>Left player name <input data-field="leftName" type="text" maxlength="24"></label>
              <label>Right player name <input data-field="rightName" type="text" maxlength="24"></label>
            </div>
          </div>
          <div class="v2-obs-menu-section">
            <h3>Frame color</h3>
            <div class="v2-obs-theme-options" role="group" aria-label="Default frame color"></div>
            <label data-custom-color hidden>Custom hex color <input data-field="themeColor" type="text" inputmode="text" maxlength="7" spellcheck="false" placeholder="#53b6bc" aria-describedby="v2ObsColorHelp"></label>
            <p id="v2ObsColorHelp" data-custom-color hidden>Enter six hex digits after #.</p>
            <p>The default color is used until your team is known.</p>
          </div>
          <div class="v2-obs-menu-section">
            <h3>Panels and effects</h3>
            <div class="v2-obs-panel-options">
              ${Object.entries(panelNames).map(([key, label]) => `<label class="v2-obs-check"><input data-field="${key}" type="checkbox"> ${label}</label>`).join("")}
              <label class="v2-obs-check"><input data-field="disableBeeVfx" type="checkbox"> Disable BFX</label>
            </div>
            <label>Twitch channel URL or name <input data-field="twitchChannel" type="text" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://www.twitch.tv/channel"></label>
          </div>
        </div>
        <div class="v2-obs-menu-actions">
          <span class="v2-obs-menu-status" role="status"></span>
          <button data-action="save" type="button">Save</button>
          <button data-action="reset" type="button">Reset to URL</button>
          <button data-action="close" type="button">Close</button>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    const hitArea = overlay.querySelector(".v2-obs-menu-hitarea");
    const panel = overlay.querySelector(".v2-obs-menu");
    const status = panel.querySelector(".v2-obs-menu-status");
    const field = (name) => panel.querySelector(`[data-field="${name}"]`);
    const choice = (name) => panel.querySelector(`[data-choice="${name}"][aria-pressed="true"]`)?.dataset.value;
    const options = panel.querySelector(".v2-obs-theme-options");
    for (const [name, preset] of Object.entries(window.JSRFTheme.PRESETS)) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "v2-obs-theme-option";
      option.dataset.choice = "themePreset";
      option.dataset.value = name;
      option.innerHTML = `<span class="v2-obs-theme-swatch"></span><span>${preset.label}</span>`;
      option.querySelector(".v2-obs-theme-swatch").style.background = preset.color;
      options.appendChild(option);
    }
    const custom = document.createElement("button");
    custom.type = "button";
    custom.className = "v2-obs-theme-option";
    custom.dataset.choice = "themePreset";
    custom.dataset.value = "custom";
    custom.innerHTML = '<span class="v2-obs-theme-swatch"></span><span>Custom</span>';
    options.appendChild(custom);

    function sync(config) {
      for (const key of ["leftName", "rightName", "twitchChannel"]) field(key).value = config[key];
      field("playerAliases").value = config.playerAliases.join("\n");
      field("playerFallbackP1").value = config.playerFallbackP1;
      field("playerFallbackP1").placeholder = config.playerAliases[0] || "First Kevingo user";
      field("playerFallbackP2").value = config.playerFallbackP2;
      for (const key of ["frameAuto", "disableBeeVfx", ...Object.keys(panelNames)]) field(key).checked = config[key];
      panel.querySelectorAll("[data-choice]").forEach((button) => {
        button.setAttribute("aria-pressed", String(config[button.dataset.choice] === button.dataset.value));
      });
      field("themeColor").value = config.themeColor || window.JSRFTheme.hexFromHue(config.themeHue);
      field("themeColor").removeAttribute("aria-invalid");
      custom.querySelector(".v2-obs-theme-swatch").style.background = field("themeColor").value;
      panel.querySelector("[data-sourced]").hidden = config.playerSource !== "kevingo";
      panel.querySelector("[data-manual]").hidden = config.playerSource === "kevingo";
      panel.querySelectorAll("[data-custom-color]").forEach((element) => { element.hidden = config.themePreset !== "custom"; });
    }
    function validCustomColor() {
      if (choice("themePreset") !== "custom" || /^#[\da-f]{6}$/i.test(field("themeColor").value.trim())) {
        field("themeColor").removeAttribute("aria-invalid");
        return true;
      }
      field("themeColor").setAttribute("aria-invalid", "true");
      status.textContent = "Enter a color like #53b6bc";
      return false;
    }
    function read() {
      const themePreset = choice("themePreset") || "base";
      const themeColor = themePreset === "custom" ? field("themeColor").value.trim().toLowerCase() : null;
      return normalize({
        ...current,
        playerSource: choice("playerSource"),
        playerAliases: window.KevingoPlayers.aliases(field("playerAliases").value),
        playerFallbackP1: field("playerFallbackP1").value,
        playerFallbackP2: field("playerFallbackP2").value,
        playerSide: choice("playerSide"),
        frameAuto: field("frameAuto").checked,
        leftName: field("leftName").value, rightName: field("rightName").value,
        themePreset, themeColor,
        themeHue: themeColor ? window.JSRFTheme.hueFromHex(themeColor) : current.themeHue,
        twitchChannel: field("twitchChannel").value,
        disableBeeVfx: field("disableBeeVfx").checked,
        ...Object.fromEntries(Object.keys(panelNames).map((key) => [key, field(key).checked]))
      });
    }
    function open() { sync(current); panel.hidden = false; hitArea.hidden = true; status.textContent = ""; }
    function close() { panel.hidden = true; hitArea.hidden = false; }
    hitArea.addEventListener("click", (event) => {
      if (event.shiftKey) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("jsrf-v2-test-snipe"));
        return;
      }
      open();
    });
    panel.querySelector('[data-action="close"]').addEventListener("click", close);
    panel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-choice]");
      if (!button || !panel.contains(button)) return;
      const previous = choice(button.dataset.choice);
      panel.querySelectorAll(`[data-choice="${button.dataset.choice}"]`).forEach((option) => {
        option.setAttribute("aria-pressed", String(option === button));
      });
      if (!validCustomColor()) {
        panel.querySelectorAll(`[data-choice="${button.dataset.choice}"]`).forEach((option) => {
          option.setAttribute("aria-pressed", String(option.dataset.value === previous));
        });
        return;
      }
      update(read());
      sync(current);
      status.textContent = "Unsaved changes";
    });
    panel.addEventListener("input", (event) => {
      if (!event.target.matches("input, textarea")) return;
      // Rejoin Twitch after the channel field is committed, not on every keystroke.
      if (event.target === field("twitchChannel")) { status.textContent = "Unsaved changes"; return; }
      if (!validCustomColor()) return;
      update(read());
      if (event.target === field("themeColor")) {
        custom.querySelector(".v2-obs-theme-swatch").style.background = field("themeColor").value.trim();
      }
      if (event.target.type !== "text" && event.target.tagName !== "TEXTAREA") sync(current);
      status.textContent = "Unsaved changes";
    });
    panel.addEventListener("change", (event) => {
      if (!event.target.matches("input, textarea") || !validCustomColor()) return;
      update(read());
      sync(current);
      status.textContent = "Unsaved changes";
    });
    panel.querySelector('[data-action="save"]').addEventListener("click", () => {
      if (!validCustomColor()) return;
      update(read());
      if (save()) close();
      else status.textContent = "Could not save in this browser";
    });
    panel.querySelector('[data-action="reset"]').addEventListener("click", () => {
      reset();
      sync(current);
      status.textContent = "Restored URL settings";
    });
  }

  window.JSRFV2Config = Object.freeze({ get current() { return current; }, update, subscribe, save, reset, menu, normalize, fromUrl });
})();
