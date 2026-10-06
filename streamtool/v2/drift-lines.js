(() => {
  const lineCounts = [19, 18]; // 37 total, approximately 15% fewer than 44.
  const randomBetween = (min, max) => min + Math.random() * (max - min);

  document.querySelectorAll(".v2-grid-lines-left, .v2-grid-lines-right").forEach((lane, laneIndex) => {
    const lines = document.createDocumentFragment();

    for (let index = 0; index < lineCounts[laneIndex]; index += 1) {
      const line = document.createElement("span");
      const duration = randomBetween(3.4, 6.4) / 1.1;
      const width = index % 5 === 0 ? randomBetween(16, 38) : randomBetween(2, 12);
      line.className = "v2-drift-line";
      if (index % 2 === 1) line.classList.add("v2-drift-line-reverse");
      if (index % 4 >= 2) line.classList.add("v2-drift-line-late-turn");
      line.style.setProperty("--line-width", `${width.toFixed(1)}px`);
      line.style.setProperty("--line-alpha", (randomBetween(0.12, 0.4) * 0.9).toFixed(2));
      line.style.setProperty("--line-rest-position", `${randomBetween(0, 95).toFixed(1)}%`);
      line.style.setProperty("--line-duration", `${duration.toFixed(2)}s`);
      line.style.setProperty("--line-delay", `${-randomBetween(0, duration).toFixed(2)}s`);
      lines.appendChild(line);
    }

    lane.appendChild(lines);
  });
})();
