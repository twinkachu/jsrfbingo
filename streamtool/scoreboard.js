(() => {
  const BASE_POINTS_TO_WIN = window.Kevingo.basePointsToWin;

  function buildScoreProgressSegments(teams, pointsToWin) {
    if (teams.length > 2) return [];
    const target = Math.max(1, Number(pointsToWin) || BASE_POINTS_TO_WIN);
    return teams.slice(0, 2).map((team, index) => ({
      color: team.color,
      side: index === 0 ? "left" : "right",
      percent: Math.min(50, Math.max(0, (team.score / target) * 50))
    })).filter((segment) => segment.percent > 0);
  }

  function renderScoreProgress(balance, balanceBar, teams, pointsToWin) {
    const segments = buildScoreProgressSegments(teams, pointsToWin);
    balance.classList.toggle("hidden", !segments.length);

    const activeColors = new Set(segments.map((segment) => segment.color));
    [...balanceBar.children].forEach((child) => {
      if (!activeColors.has(child.dataset.teamColor)) child.remove();
    });

    segments.forEach((segment) => {
      let node = [...balanceBar.children].find((child) => child.dataset.teamColor === segment.color);
      if (!node) {
        node = document.createElement("div");
        node.className = "scoreboard-balance-segment";
        node.dataset.teamColor = segment.color;
        node.style.background = segment.color;
        node.style.width = "0%";
        balanceBar.appendChild(node);
        node.getBoundingClientRect();
      }
      node.classList.toggle("scoreboard-balance-segment-left", segment.side === "left");
      node.classList.toggle("scoreboard-balance-segment-right", segment.side === "right");
      node.style.width = `${segment.percent.toFixed(2)}%`;
    });
  }

  function leaderboardTeams(teams) {
    return teams
      .map((team, stableIndex) => ({ ...team, stableIndex }))
      .sort((a, b) => b.score - a.score || b.squares - a.squares || a.stableIndex - b.stableIndex);
  }

  function teamDisplayName(team) {
    const names = team.members
      .map((member) => String(member?.name ?? "").trim())
      .filter(Boolean)
      .join(" / ");
    return names || team.color;
  }

  function createScoreboardRow(team) {
    const row = document.createElement("div");
    row.className = "scoreboard-row";
    row.dataset.teamColor = team.color;
    row.innerHTML = `
      <div class="scoreboard-rank"></div>
      <div class="scoreboard-team">
        <span class="scoreboard-name"></span>
        <div class="scoreboard-meta"></div>
      </div>
      <div class="scoreboard-score"></div>
    `;
    return row;
  }

  function updateScoreboardRow(row, team, index) {
    const previousScore = row.dataset.score;
    row.style.setProperty("--team-color", team.color);
    row.querySelector(".scoreboard-rank").textContent = String(index + 1);
    row.querySelector(".scoreboard-name").textContent = teamDisplayName(team);
    row.querySelector(".scoreboard-meta").textContent = `${team.squares} sq`;
    row.querySelector(".scoreboard-score").textContent = String(team.score);
    row.dataset.score = String(team.score);
    row.classList.toggle("scoreboard-leader", index === 0);

    if (previousScore !== undefined && previousScore !== String(team.score)) {
      const score = row.querySelector(".scoreboard-score");
      score.classList.remove("scoreboard-score-changed");
      score.offsetWidth;
      score.classList.add("scoreboard-score-changed");
    }
  }

  function animateScoreboardMoves(list, oldRects, oldRanks) {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    [...list.querySelectorAll(".scoreboard-row")].forEach((row) => {
      const oldRect = oldRects.get(row.dataset.teamColor);
      if (!oldRect) return;

      const newRect = row.getBoundingClientRect();
      const deltaX = oldRect.left - newRect.left;
      const deltaY = oldRect.top - newRect.top;
      if (!deltaX && !deltaY) return;

      const previousRank = oldRanks.get(row.dataset.teamColor);
      const currentRank = Number(row.dataset.rank);
      const movedIntoLead = currentRank === 0 && previousRank !== 0;
      const movedDownFromLead = previousRank === 0 && currentRank > 0;
      const midpointScale = movedIntoLead ? 1.05 : movedDownFromLead ? 0.95 : 1;

      row.getAnimations().forEach((animation) => animation.cancel());
      row.animate([
        { transform: `translate(${deltaX}px, ${deltaY}px) scale(1)` },
        { transform: `translate(${deltaX / 2}px, ${deltaY / 2}px) scale(${midpointScale})`, offset: 0.5 },
        { transform: "translate(0, 0) scale(1)" }
      ], {
        duration: 520,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)"
      });
    });
  }

  function renderScoreboardRows(list, teams) {
    const rankedTeams = leaderboardTeams(teams);
    const oldRects = new Map();
    const oldRanks = new Map();

    [...list.querySelectorAll(".scoreboard-row")].forEach((row) => {
      oldRects.set(row.dataset.teamColor, row.getBoundingClientRect());
      oldRanks.set(row.dataset.teamColor, Number(row.dataset.rank));
    });

    const activeColors = new Set(rankedTeams.map((team) => team.color));
    [...list.querySelectorAll(".scoreboard-row")].forEach((row) => {
      if (!activeColors.has(row.dataset.teamColor)) row.remove();
    });

    rankedTeams.forEach((team, index) => {
      let row = [...list.querySelectorAll(".scoreboard-row")]
        .find((candidate) => candidate.dataset.teamColor === team.color);
      if (!row) row = createScoreboardRow(team);
      row.dataset.rank = String(index);
      updateScoreboardRow(row, team, index);
      list.appendChild(row);
    });

    animateScoreboardMoves(list, oldRects, oldRanks);
  }

  function renderScoreboard(slot, scoreboard, status = "") {
    if (!slot) return;
    const list = slot.querySelector(".scoreboard-list");
    const target = slot.querySelector(".scoreboard-target-value");
    const balance = slot.querySelector(".scoreboard-balance");
    const balanceBar = slot.querySelector(".scoreboard-balance-bar");
    const statusNode = slot.querySelector(".scoreboard-status");
    if (!list || !target || !balance || !balanceBar || !statusNode) return;

    target.textContent = String(scoreboard.pointsToWin);
    slot.dataset.teamCount = String(scoreboard.teams.length);
    slot.dataset.teamDensity = scoreboard.teams.length > 4
      ? "dense"
      : scoreboard.teams.length > 2
        ? "compact"
        : "normal";
    statusNode.textContent = status;
    renderScoreProgress(balance, balanceBar, scoreboard.teams, scoreboard.pointsToWin);

    if (!scoreboard.teams.length) {
      list.innerHTML = "";
      const empty = document.createElement("div");
      empty.className = "scoreboard-empty";
      empty.textContent = scoreboard.ready ? "Waiting for teams" : "No board data yet";
      list.appendChild(empty);
      return;
    }

    list.querySelector(".scoreboard-empty")?.remove();
    renderScoreboardRows(list, scoreboard.teams);
  }

  function mount(slot) {
    slot.innerHTML = `
      <div class="scoreboard-shell">
        <div class="scoreboard-panel">
          <div class="scoreboard-header">
            <span class="scoreboard-title">Score</span>
            <span class="scoreboard-target">To win <b class="scoreboard-target-value">13</b></span>
          </div>
          <div class="scoreboard-balance hidden" aria-label="Team progress toward points to win">
            <div class="scoreboard-balance-rail">
              <div class="scoreboard-balance-marker" aria-hidden="true"></div>
              <div class="scoreboard-balance-bar"></div>
            </div>
          </div>
          <div class="scoreboard-list"></div>
          <div class="scoreboard-status"></div>
        </div>
      </div>
    `;
    renderScoreboard(slot, { pointsToWin: BASE_POINTS_TO_WIN, teams: [], ready: false });
    return Object.freeze({
      update(scoreboard, status = "") {
        renderScoreboard(slot, scoreboard, status);
      }
    });
  }

  window.BingoScoreboard = Object.freeze({ mount });
})();
