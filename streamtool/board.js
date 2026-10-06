(() => {
  const BOARD_SIZE = window.Kevingo.boardSize;

  function parseHexColor(color) {
    const normalized = window.Kevingo.normalizeTeamColor(color);
    const match = normalized.match(/^#([0-9A-F]{6})$/);
    if (!match) return null;
    return {
      r: Number.parseInt(match[1].slice(0, 2), 16),
      g: Number.parseInt(match[1].slice(2, 4), 16),
      b: Number.parseInt(match[1].slice(4, 6), 16)
    };
  }

  function contrastingTextColor(color) {
    const rgb = parseHexColor(color);
    if (!rgb) return "#f4ffff";
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return luminance > 0.55 ? "#071b1b" : "#f4ffff";
  }

  function isPinkTeamColor(color) {
    const rgb = parseHexColor(color);
    return Boolean(rgb && rgb.r >= 180 && rgb.b >= 90 && rgb.r - rgb.g >= 50 && rgb.b - rgb.g >= 20);
  }

  function mount(container, {
    statusText = "Waiting for board",
    className = "",
    width = "100%",
    height = "100%"
  } = {}) {
    if (!container) throw new TypeError("BingoBoard.mount requires a container element");
    const shell = document.createElement("div");
    shell.className = `board-shell bingo-board-shell ${className}`.trim();
    shell.style.width = width;
    shell.style.height = height;
    const grid = document.createElement("div");
    grid.className = "board-grid bingo-board-grid";
    grid.setAttribute("aria-label", "Bingo board");
    const status = document.createElement("div");
    status.className = "board-status bingo-board-status";
    status.textContent = statusText;
    shell.append(grid, status);
    container.replaceChildren(shell);
    let refreshAnimation = null;
    let refreshSwapFrame = null;
    let refreshTransitionId = 0;

    function update(board, { markingSquareIndexes = new Set() } = {}) {
      const squares = Array.isArray(board) ? board.slice(0, BOARD_SIZE) : [];
      const ready = squares.length === BOARD_SIZE;
      status.classList.toggle("hidden", ready);
      if (!ready) return;

      const fragment = document.createDocumentFragment();
      squares.forEach((square, index) => {
        const { area, goal, district } = window.Kevingo.parseBoardSquareText(square);
        const color = window.Kevingo.normalizeTeamColor(square?.color);
        const claimed = window.Kevingo.isClaimedTeamColor(color);
        const graffiti = window.Kevingo.squareHasGraffiti(square);
        const tile = document.createElement("article");
        tile.className = "board-square bingo-board-square";
        tile.classList.toggle("board-square-claimed", claimed);
        tile.classList.toggle("board-square-graffiti", graffiti);
        tile.classList.toggle("board-square-mark-flash", markingSquareIndexes.has(index));
        tile.style.setProperty("--square-fill", claimed ? color : "#111");
        tile.style.setProperty(
          "--square-ink",
          graffiti || isPinkTeamColor(color) ? "#fff" : contrastingTextColor(claimed ? color : "")
        );
        tile.classList.toggle("board-square-unclaimed", !claimed);
        tile.classList.toggle(`board-square-${district}`, !claimed && Boolean(district));

        const text = document.createElement("div");
        text.className = "board-square-text bingo-board-square-text";
        const areaLabel = document.createElement("span");
        areaLabel.className = "board-square-area bingo-board-square-area";
        areaLabel.textContent = area;
        const goalLabel = document.createElement("span");
        goalLabel.className = "board-square-goal bingo-board-square-goal";
        goalLabel.textContent = goal;
        text.append(areaLabel, goalLabel);
        tile.append(text);
        fragment.append(tile);
      });
      grid.replaceChildren(fragment);
    }

    function cancelRefreshAnimation() {
      refreshTransitionId += 1;
      if (refreshSwapFrame !== null) {
        cancelAnimationFrame(refreshSwapFrame);
        refreshSwapFrame = null;
      }
      refreshAnimation?.cancel();
      refreshAnimation = null;
    }

    function animateRefresh(getBoard) {
      cancelRefreshAnimation();
      const transitionId = refreshTransitionId;
      const duration = 520;
      const swapAt = 220;
      const animation = refreshAnimation = grid.animate([
        { offset: 0, filter: "blur(0) saturate(1) brightness(1)", transform: "scale(1)", opacity: 1 },
        { offset: 0.28, filter: "blur(7px) saturate(1.6) brightness(1.3)", transform: "scale(1.02)", opacity: 1 },
        { offset: 0.43, filter: "blur(12px) saturate(2.4) brightness(3.2)", transform: "scale(1.03)", opacity: 1 },
        { offset: 0.49, filter: "blur(11px) saturate(2.1) brightness(2.6)", transform: "scale(1.028)", opacity: 1 },
        { offset: 0.68, filter: "blur(8px) saturate(1.6) brightness(1.6)", transform: "scale(1.02)", opacity: 1 },
        { offset: 0.84, filter: "blur(4px) saturate(1.2) brightness(1.2)", transform: "scale(1.01)", opacity: 1 },
        { offset: 1, filter: "blur(0) saturate(1) brightness(1)", transform: "scale(1)", opacity: 1 }
      ], { duration, easing: "ease-in-out", fill: "both" });

      const swapAtFlash = () => {
        if (refreshTransitionId !== transitionId) return;
        if ((Number(animation.currentTime) || 0) < swapAt) {
          refreshSwapFrame = requestAnimationFrame(swapAtFlash);
          return;
        }
        refreshSwapFrame = null;
        update(getBoard());
      };
      refreshSwapFrame = requestAnimationFrame(swapAtFlash);

      return animation.finished.then(() => {
        if (refreshTransitionId !== transitionId) return false;
        animation.cancel();
        if (refreshAnimation === animation) refreshAnimation = null;
        return true;
      }, () => false);
    }

    update([]);
    return Object.freeze({
      shell,
      grid,
      status,
      update,
      animateRefresh,
      cancelRefreshAnimation,
      resize(nextWidth = "100%", nextHeight = "100%") {
        shell.style.width = nextWidth;
        shell.style.height = nextHeight;
      }
    });
  }

  window.BingoBoard = Object.freeze({ mount, size: BOARD_SIZE });
})();
