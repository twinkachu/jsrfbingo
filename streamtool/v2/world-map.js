(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const MAP_URL = new URL("./SVGS/map.svg", document.currentScript.src);
  // Names are emitted by Kevingo's automarker GetLevelFromID. IDs are the game's level IDs.
  const AREAS = [
    { name: "Garage", id: 0, region: "GARAGE_SHAPE" },
    { name: "Shibuya", id: 65536, region: "SHIBUYA_SHAPE" },
    { name: "Chuo", id: 65537, region: "CHUO_SHAPE" },
    { name: "Dogen", id: 65538, region: "DOGEN_SHAPE" },
    { name: "Hikage", id: 65539, region: "HIKAGE_SHAPE" },
    { name: "RDH", id: 131072, region: "RDH_SHAPE" },
    { name: "Sewers", id: 131073, region: "SEWERS_SHAPE" },
    { name: "Kibo", id: 131074, region: "KIBO_SHAPE" },
    { name: "Btm pt.", id: 131075, region: "BOTTOMPT_SHAPE" },
    { name: "FRZ", id: 131076, region: "FRZ_SHAPE" },
    { name: "99th", id: 196608, region: "99TH_SHAPE" },
    { name: "Sky Dino", id: 196609, region: "SKYDINO_SHAPE" },
    { name: "Stadium", id: 196610, region: "STADIUM_SHAPE" },
    { name: "HWY0", id: 196611, region: "HWY0_SHAPE" },
    { name: "SDPP", id: 196612, region: "SDPP_SHAPE" }
  ];
  const areaByLocation = new Map(AREAS.flatMap((area) => [
    [area.name.toLowerCase(), area], [String(area.id), area]
  ]));
  let instanceCount = 0;

  function resolveArea(location) {
    return areaByLocation.get(String(location ?? "").trim().toLowerCase());
  }

  function svgNode(tag, attributes) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
    return node;
  }

  function mount(container) {
    const instance = ++instanceCount;
    container.innerHTML = `
      <div class="world-map-panel">
        <div class="world-map-content">
          <div class="chat-header"><span>PLAYER TRACKER</span></div>
          <div class="world-map-stage">
            <img class="world-map-base" alt="JSRF world map" />
          </div>
        </div>
        <div class="world-map-districts" aria-label="Available points by district"></div>
      </div>
    `;
    const stage = container.querySelector(".world-map-stage");
    stage.querySelector("img").src = MAP_URL.href;
    const totals = new Map();
    // Match the district order engraved in the frame's original bottom row.
    const districts = [...window.Kevingo.districts].sort((a, b) =>
      ["kogane", "benten", "shibuya"].indexOf(a.id) - ["kogane", "benten", "shibuya"].indexOf(b.id));
    for (const district of districts) {
      const cell = document.createElement("div");
      cell.className = "world-map-district";
      cell.style.setProperty("--district-color", district.ink);
      cell.style.setProperty("--district-marker", district.marker);
      const name = document.createElement("span");
      name.textContent = district.name;
      const value = document.createElement("b");
      value.textContent = "—";
      cell.append(value, name);
      container.querySelector(".world-map-districts").appendChild(cell);
      totals.set(district.id, value);
    }

    let snapshot = { users: [], locations: [], points: { ready: false, districts: [] } };
    let tracking = { ownTeamOnly: false, team: null };
    let regions = null;
    let defs = null;
    let previousLocations = "";

    function render() {
      for (const district of snapshot.points.districts || []) {
        const value = totals.get(district.id);
        if (value) value.textContent = snapshot.points.ready ? String(district.availablePoints) : "—";
      }
      const locations = new Map(snapshot.locations.map(({ name, location }) => [name, resolveArea(location)]));
      const players = snapshot.users
        .filter((user) => window.Kevingo.isClaimedTeamColor(user?.team)
          && (!tracking.ownTeamOnly || window.Kevingo.normalizeTeamColor(user.team) === tracking.team))
        .map((user) => {
          const reportedArea = locations.get(user.name);
          return {
            name: user.name,
            color: window.Kevingo.normalizeTeamColor(user.team),
            area: reportedArea || resolveArea("Garage"),
            knownLocation: Boolean(reportedArea)
          };
        });
      const signature = JSON.stringify(players);
      if (signature === previousLocations) return;
      previousLocations = signature;
      if (!regions) return;
      defs.replaceChildren();
      for (const [index, area] of AREAS.entries()) {
        const shape = regions.get(area.region);
        const occupants = players.filter((player) => player.area?.region === area.region);
        const colors = [...new Set(occupants.map((player) => player.color))].sort();
        shape.classList.toggle("world-map-occupied", colors.length > 0);
        const title = shape.querySelector("title");
        title.textContent = `${area.name}${occupants.length ? `: ${occupants.map((player) => `${player.name}${player.knownLocation ? "" : " (location unknown)"}`).join(", ")}` : ""}`;
        if (!colors.length) {
          shape.style.removeProperty("fill");
        } else if (colors.length === 1) {
          shape.style.fill = colors[0];
        } else {
          const id = `world-map-${instance}-${index}`;
          const gradient = svgNode("linearGradient", {
            id, gradientUnits: "objectBoundingBox", x1: 0, y1: 0, x2: 1, y2: 1
          });
          // Paired stops give each team one evenly spaced diagonal section with a crisp boundary.
          colors.forEach((color, section) => {
            gradient.appendChild(svgNode("stop", {
              offset: section / colors.length, "stop-color": color
            }));
            gradient.appendChild(svgNode("stop", {
              offset: (section + 1) / colors.length, "stop-color": color
            }));
          });
          defs.appendChild(gradient);
          shape.style.fill = `url(#${id})`;
        }
      }
    }

    render();
    fetch(MAP_URL).then(async (response) => {
      if (!response.ok) throw new Error(`Map SVG: HTTP ${response.status}`);
      const documentSvg = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
      if (documentSvg.querySelector("parsererror") || documentSvg.documentElement.localName !== "svg") {
        throw new Error("Invalid map SVG");
      }
      const svg = document.importNode(documentSvg.documentElement, true);
      svg.classList.add("world-map-svg");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "Live JSRF player locations");
      const shapes = new Map();
      const labelLayer = document.createElement("div");
      labelLayer.className = "world-map-labels";
      labelLayer.setAttribute("aria-hidden", "true");
      const labels = [];
      for (const area of AREAS) {
        const shape = svg.querySelector(`[id="${area.region}"]`);
        if (!shape) throw new Error(`Missing map region: ${area.region}`);
        const labelPath = svg.querySelector(`[id="${area.region.replace("_SHAPE", "_TEXT")}"]`);
        if (!labelPath) throw new Error(`Missing map label: ${area.name}`);
        shape.classList.add("world-map-region");
        const district = window.Kevingo.districts.find(({ areas }) => areas.includes(area.name));
        shape.style.setProperty("--district-color", district?.ink || "var(--theme-accent-soft)");
        shape.appendChild(svgNode("title", {}));
        shapes.set(area.region, shape);
        const label = document.createElement("span");
        label.className = "world-map-label";
        label.textContent = area.name === "Btm pt." ? "BOTTOM PT."
          : area.name === "Sky Dino" ? "DINO" : area.name.toUpperCase();
        if (area.name === "Shibuya") label.classList.add("world-map-label-shibuya");
        labelLayer.appendChild(label);
        labels.push({ path: labelPath, element: label });
      }
      defs = svgNode("defs", {});
      svg.prepend(defs);
      regions = shapes;
      stage.replaceChildren(svg, labelLayer);
      const placeLabels = () => {
        const bounds = stage.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        for (const { path, element } of labels) {
          const rect = path.getBoundingClientRect();
          element.style.left = `${((rect.left + rect.width / 2 - bounds.left) / bounds.width) * 100}%`;
          element.style.top = `${((rect.top + rect.height / 2 - bounds.top) / bounds.height) * 100}%`;
        }
      };
      new ResizeObserver(placeLabels).observe(stage);
      placeLabels();
      previousLocations = "";
      render();
    }).catch((error) => {
      console.warn("Live map unavailable; keeping base map:", error);
    });

    return { update(nextSnapshot, options = {}) {
      snapshot = nextSnapshot;
      tracking = {
        ownTeamOnly: options.ownTeamOnly === true,
        team: window.Kevingo.isClaimedTeamColor(options.team)
          ? window.Kevingo.normalizeTeamColor(options.team) : null
      };
      render();
    } };
  }

  window.JSRFWorldMap = Object.freeze({ mount, resolveArea });
})();
