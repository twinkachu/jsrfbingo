(() => {
  // Configuration describes identity hints; live roster values never overwrite it.
  function aliases(value) {
    const values = Array.isArray(value) ? value : String(value ?? '').split(/[,\n]/);
    return [...new Set(values.map((name) => String(name).trim().slice(0, 80)).filter(Boolean))].slice(0, 20);
  }
  function normalize(value = {}) {
    return {
      playerSource: value.playerSource === 'kevingo' ? 'kevingo' : 'manual',
      playerAliases: aliases(value.playerAliases),
      playerSide: value.playerSide === 'right' ? 'right' : 'left',
      playerFallbackP1: String(value.playerFallbackP1 ?? '').trim().slice(0, 24),
      playerFallbackP2: String(value.playerFallbackP2 ?? 'FRIEND!').trim().slice(0, 24),
      frameAuto: value.frameAuto === true
    };
  }
  function read(params) {
    return normalize({ playerSource: params.get('playerSource'), playerAliases: params.getAll('playerAlias'),
      playerSide: params.get('playerSide'), playerFallbackP1: params.get('playerFallbackP1'),
      playerFallbackP2: params.get('playerFallbackP2'), frameAuto: params.get('frameAuto') === '1' || (!params.has('frameAuto') && params.get('playerSource') === 'kevingo') });
  }
  function write(params, config) {
    const value = normalize(config);
    params.set('playerSource', value.playerSource);
    params.delete('playerAlias');
    value.playerAliases.forEach((name) => params.append('playerAlias', name));
    params.set('playerSide', value.playerSide);
    params.set('playerFallbackP1', value.playerFallbackP1);
    params.set('playerFallbackP2', value.playerFallbackP2);
    params.set('frameAuto', value.frameAuto ? '1' : '0');
  }
  const nameKey = (value) => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  function similarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    let row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const next = [i];
      for (let j = 1; j <= b.length; j++) {
        next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      row = next;
    }
    const editScore = 1 - row[b.length] / Math.max(a.length, b.length);
    // Recognize familiar names with playful prefixes/suffixes, without treating tiny substrings as identities.
    const shorter = a.length <= b.length ? a : b;
    const longer = a.length > b.length ? a : b;
    const contained = shorter.length >= 4 && longer.includes(shorter)
      ? 0.8 + 0.15 * shorter.length / longer.length : 0;
    return Math.max(editScore, contained);
  }
  function resolve(config, users = []) {
    const settings = normalize(config);
    if (settings.playerSource !== 'kevingo') {
      return { leftName: config.leftName || '', rightName: config.rightName || '', player: null, status: 'manual', candidates: [] };
    }
    const roster = users.filter((user) => typeof user?.name === 'string' && user.name.trim());
    const fallbackP1 = settings.playerFallbackP1 || settings.playerAliases.find((alias) => nameKey(alias)) || '';
    const fallbackP2 = settings.playerFallbackP2;
    const otherSide = settings.playerSide === 'left' ? 'right' : 'left';
    const applyFallbacks = () => {
      result[`${settings.playerSide}Name`] = fallbackP1;
      result[`${otherSide}Name`] = fallbackP2;
    };
    const keys = settings.playerAliases.map(nameKey).filter(Boolean);
    const candidates = roster.map((player) => ({ player, score: Math.max(0, ...keys.map((key) => similarity(key, nameKey(player.name)))) }))
      .sort((a, b) => b.score - a.score || a.player.name.localeCompare(b.player.name));
    const best = candidates[0];
    const ambiguous = best && candidates[1] && best.score - candidates[1].score < 0.08;
    const player = best?.score >= 0.75 && !ambiguous ? best.player : null;
    const result = { leftName: '', rightName: '', player, partner: null, candidates,
      status: !keys.length ? 'aliases' : !roster.length ? 'waiting' : ambiguous && best.score >= 0.75 ? 'ambiguous' : !player ? 'unmatched' : 'matched' };
    if (!player) {
      applyFallbacks();
      return result;
    }
    result[`${settings.playerSide}Name`] = player.name.slice(0, 24);
    if (!window.Kevingo.isClaimedTeamColor(player.team)) {
      result.status = 'unteamed';
      applyFallbacks();
      return result;
    }
    const teamRoster = roster.filter((user) => window.Kevingo.isClaimedTeamColor(user.team));
    const others = teamRoster.filter((user) => user !== player);
    const teammates = others.filter((user) => window.Kevingo.normalizeTeamColor(user.team) === window.Kevingo.normalizeTeamColor(player.team));
    result.partner = teammates.length === 1 ? teammates[0] : teamRoster.length === 2 ? others[0] : null;
    result.status = result.partner ? 'matched' : teammates.length > 1 ? 'teammates' : 'partner';
    result[`${otherSide}Name`] = result.partner?.name.slice(0, 24) || fallbackP2;
    return result;
  }
  window.KevingoPlayers = Object.freeze({ aliases, normalize, read, write, resolve });
})();
