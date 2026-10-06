(() => {
  const PRESETS = Object.freeze({
    base: { label: "Base", color: "#53b6bc", hue: 183 },
    ruby: { label: "Ruby", color: "#E81010", hue: 0 },
    sapphire: { label: "Sapphire", color: "#175FE5", hue: 219 },
    emerald: { label: "Emerald", color: "#15AA0D", hue: 117, highlightOffset: 210 },
    pink: { label: "Pink", color: "#FF69B4", hue: 330 },
    purple: { label: "Purple", color: "#8013E0", hue: 272 }
  });
  const DEFAULT_THEME = "base";

  function normalize(value) {
    const preset = String(value?.preset || value?.theme || DEFAULT_THEME).toLowerCase();
    const rawHue = value?.hue ?? value?.themeHue;
    const hue = rawHue === null || rawHue === undefined || rawHue === "" ? NaN : Number(rawHue);
    const rawColor = String(value?.baseColor ?? value?.themeColor ?? "");
    const baseColor = preset === "custom" && /^#[\da-f]{6}$/i.test(rawColor)
      ? rawColor.toLowerCase() : null;
    return {
      preset: Object.hasOwn(PRESETS, preset) || preset === "custom" ? preset : DEFAULT_THEME,
      hue: baseColor ? hueFromHex(baseColor)
        : Number.isFinite(hue) ? ((Math.round(hue) % 360) + 360) % 360 : PRESETS[DEFAULT_THEME].hue,
      baseColor
    };
  }

  function resolvedHue(selection) {
    const theme = normalize(selection);
    return theme.preset === "custom" ? theme.hue : PRESETS[theme.preset].hue;
  }

  function color(hue, saturation, lightness) {
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }

  function palette(selection) {
    const theme = normalize(selection);
    const hue = resolvedHue(theme);
    const preset = PRESETS[theme.preset];
    const frameBase = theme.baseColor || preset?.color;
    const custom = theme.baseColor ? hslFromHex(theme.baseColor) : null;
    const saturation = (maximum) => custom ? Math.min(custom.saturation, maximum) : maximum;
    const shade = (ratio, minimum, maximum) => Math.max(minimum, Math.min(maximum, custom.lightness * ratio));
    // Frame and panels carry the team hue; highlights use one split-complementary hue.
    const highlightHue = (hue + (preset?.highlightOffset ?? 150)) % 360;
    return {
      "--theme-frame-base": frameBase || color(hue, 78, 64),
      "--theme-frame-grid": custom ? color(hue, custom.saturation, shade(0.78, 8, 78))
        : frameBase ? `color-mix(in srgb, ${frameBase} 78%, black)` : color(hue, 70, 48),
      "--theme-frame-box": custom ? color(hue, custom.saturation, shade(0.66, 6, 66))
        : frameBase ? `color-mix(in srgb, ${frameBase} 66%, black)` : color(hue, 70, 42),
      "--theme-frame-border": custom ? color(hue, saturation(68), shade(0.48, 12, 32))
        : frameBase ? `color-mix(in srgb, ${frameBase} 48%, black)` : color(hue, 68, 32),
      "--theme-shell": color(hue, saturation(65), custom ? shade(0.44, 10, 27) : 27),
      "--theme-panel": color(hue, saturation(61), custom ? shade(0.28, 7, 17) : 17),
      "--theme-recess": color(hue, saturation(60), custom ? shade(0.16, 4, 10) : 10),
      "--theme-recess-deep": color(hue, saturation(60), custom ? shade(0.1, 2, 6) : 6),
      "--theme-accent": color(hue, saturation(98), 70),
      "--theme-accent-soft": color(hue, saturation(84), 85),
      "--theme-glow": `hsla(${hue} ${saturation(98)}% 70% / 0.22)`,
      "--theme-highlight": color(highlightHue, saturation(96), 66),
      "--theme-highlight-soft": color(highlightHue, saturation(82), 82),
      "--theme-border-subtle": `hsla(${hue} ${saturation(90)}% 83% / 0.27)`,
      "--theme-border-faint": `hsla(${hue} ${saturation(90)}% 83% / 0.16)`,
      "--theme-text": color(hue, saturation(36), 98),
      "--theme-muted": color(hue, saturation(53), 80)
    };
  }

  function hslFromHex(value) {
    if (!/^#[\da-f]{6}$/i.test(String(value))) return null;
    const [r, g, b] = [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
    const high = Math.max(r, g, b);
    const low = Math.min(r, g, b);
    const span = high - low;
    const lightness = (high + low) / 2;
    if (!span) return { hue: PRESETS[DEFAULT_THEME].hue, saturation: 0, lightness: lightness * 100 };
    let hue = high === r ? ((g - b) / span) % 6 : high === g ? (b - r) / span + 2 : (r - g) / span + 4;
    hue = (hue * 60 + 360) % 360;
    return { hue: Math.round(hue), saturation: span / (1 - Math.abs(2 * lightness - 1)) * 100, lightness: lightness * 100 };
  }

  function hueFromHex(value) {
    return hslFromHex(value)?.hue ?? PRESETS[DEFAULT_THEME].hue;
  }

  function hexFromHue(hue) {
    const normalized = ((Number(hue) % 360) + 360) % 360;
    const chroma = 0.78;
    const x = chroma * (1 - Math.abs((normalized / 60) % 2 - 1));
    const [r, g, b] = normalized < 60 ? [chroma, x, 0]
      : normalized < 120 ? [x, chroma, 0]
        : normalized < 180 ? [0, chroma, x]
          : normalized < 240 ? [0, x, chroma]
            : normalized < 300 ? [x, 0, chroma] : [chroma, 0, x];
    return `#${[r, g, b].map((part) => Math.round((part + 0.11) * 255).toString(16).padStart(2, "0")).join("")}`;
  }

  function forPlayer(config, player) {
    const selected = normalize({ preset: config.themePreset, hue: config.themeHue, themeColor: config.themeColor });
    if (config.playerSource !== 'kevingo' || !config.frameAuto
      || !player || !window.Kevingo.isClaimedTeamColor(player.team)) return selected;
    const team = window.Kevingo.normalizeTeamColor(player.team);
    const presets = { '#DB1111': 'ruby', '#195BD7': 'sapphire', '#159C0E': 'emerald', '#FF69B4': 'pink', '#8013E0': 'purple' };
    return presets[team] ? { preset: presets[team] }
      : normalize({ preset: 'custom', baseColor: team });
  }

  // Typed, inherited colors let every panel follow the same palette transition.
  const paletteProperties = Object.keys(palette({ preset: DEFAULT_THEME }));
  if (window.CSS?.registerProperty) {
    for (const name of paletteProperties) {
      window.CSS.registerProperty({ name, syntax: '<color>', inherits: true, initialValue: '#000000' });
    }
  }

  function apply(target, selection, { animate = false } = {}) {
    const theme = normalize(selection);
    target.classList.toggle("theme-custom-color", Boolean(theme.baseColor));
    if (animate && window.CSS?.registerProperty) {
      target.classList.add('theme-color-transition');
      target.style.transitionProperty = paletteProperties.join(', ');
    }
    const colors = palette(theme);
    for (const [name, value] of Object.entries(colors)) target.style.setProperty(name, value);
  }

  async function mountFrame(canvas) {
    const image = canvas.querySelector("img.v2-frame");
    if (!image) return;
    try {
      const response = await fetch(image.src);
      if (!response.ok) throw new Error(`Frame SVG: HTTP ${response.status}`);
      const svgDocument = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
      if (svgDocument.querySelector("parsererror") || svgDocument.documentElement.localName !== "svg") {
        throw new Error("Invalid frame SVG");
      }
      const svg = document.importNode(svgDocument.documentElement, true);
      svg.classList.add("v2-frame");
      svg.setAttribute("aria-hidden", "true");
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      image.replaceWith(svg);
    } catch (error) {
      console.warn("Frame theming unavailable; keeping default-color frame:", error);
    }
  }

  window.JSRFTheme = Object.freeze({ PRESETS, DEFAULT_THEME, normalize, resolvedHue, palette, hueFromHex, hexFromHue, forPlayer, apply, mountFrame });
})();
