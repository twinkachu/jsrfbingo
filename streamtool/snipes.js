(() => {
  const MAX_SEEN_SNIPE_SIGNATURES = 10;

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

  // One cache per overlay, retained across reconnects and board changes like V1.
  function createProcessor() {
    const seenSnipeSignatures = new Set();

    function rememberSnipeSignature(signature) {
      if (seenSnipeSignatures.has(signature)) return false;

      seenSnipeSignatures.add(signature);
      while (seenSnipeSignatures.size > MAX_SEEN_SNIPE_SIGNATURES) {
        const oldestSignature = seenSnipeSignatures.values().next().value;
        seenSnipeSignatures.delete(oldestSignature);
      }

      return true;
    }

    function accept(data) {
      const snipe = parseMaybeJson(data);
      if (!snipe || typeof snipe !== "object") return null;
      const signature = createSnipeSignature(snipe);
      if (!signature || !rememberSnipeSignature(signature)) return null;
      return snipe;
    }

    return Object.freeze({ accept });
  }

  window.KevingoSnipes = Object.freeze({ parseMaybeJson, createProcessor });
})();
