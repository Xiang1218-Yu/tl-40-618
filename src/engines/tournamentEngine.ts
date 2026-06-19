import {
  Team,
  Judge,
  Topic,
  MatchPairing,
  TournamentType,
  DebateFormat,
  AvoidanceConflict,
  TeamRanking,
} from '@/types';
import { uid } from './scoringEngine';

const randFloat = () => Math.random();

export const shuffle = <T>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(randFloat() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const nextPowerOfTwo = (n: number): number => {
  if (n <= 0) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
};

export const calculateTotalRounds = (teamCount: number, type: TournamentType): number => {
  switch (type) {
    case 'single_elimination':
      return Math.max(1, Math.ceil(Math.log2(nextPowerOfTwo(teamCount))));
    case 'round_robin':
      return teamCount % 2 === 0 ? teamCount - 1 : teamCount;
    case 'swiss':
      return Math.min(teamCount - 1, Math.max(4, Math.ceil(Math.log2(teamCount) + 1)));
  }
};

export const generateSingleElimination = (
  teams: Team[],
  tournamentId: string,
  topics: Topic[],
  judges: Judge[],
  format: DebateFormat,
  judgesPerMatch: number
): MatchPairing[] => {
  const sorted = [...teams].sort((a, b) => a.seed - b.seed);
  const count = sorted.length;
  const totalRounds = calculateTotalRounds(count, 'single_elimination');
  const paddedCount = nextPowerOfTwo(count);

  const byes = paddedCount - count;
  const byeTeams = sorted.slice(0, byes);
  const competing = shuffle(sorted.slice(byes));

  const round1Pairs: { pro: Team; con: Team | null }[] = [];

  if (byes > 0) {
    const byePairings = byeTeams.map((t) => ({ pro: t, con: null as Team | null }));
    for (let i = 0; i < competing.length; i += 2) {
      if (i + 1 < competing.length) {
        round1Pairs.push({ pro: competing[i], con: competing[i + 1] });
      }
    }
    round1Pairs.unshift(...byePairings);
  } else {
    for (let i = 0; i < sorted.length; i += 2) {
      if (i + 1 < sorted.length) {
        round1Pairs.push({ pro: sorted[i], con: sorted[i + 1] });
      }
    }
  }

  const pairings: MatchPairing[] = [];
  const availableTopics = topics.filter((t) => t.formats.includes(format));
  const topicQueue = shuffle(availableTopics);
  let topicCursor = 0;
  const nextTopic = () => {
    const t = topicQueue[topicCursor % topicQueue.length];
    topicCursor++;
    return t?.id ?? (topics[0]?.id || '');
  };

  round1Pairs.forEach((pair, i) => {
    const topicId = nextTopic();
    const judgeIds = assignJudges(
      pair.pro,
      pair.con,
      judges,
      [],
      judgesPerMatch
    ).map((j) => j.id);

    if (pair.con == null) {
      pairings.push({
        id: uid(),
        tournamentId,
        round: 1,
        matchNumber: i + 1,
        proTeamId: pair.pro.id,
        conTeamId: '__bye__',
        topicId,
        judgeIds,
        status: 'finished',
        winner: 'pro',
      });
    } else {
      pairings.push({
        id: uid(),
        tournamentId,
        round: 1,
        matchNumber: i + 1,
        proTeamId: pair.pro.id,
        conTeamId: pair.con.id,
        topicId,
        judgeIds,
        status: 'pending',
      });
    }
  });

  let prevRoundMatches = pairings.filter((m) => m.round === 1);
  for (let round = 2; round <= totalRounds; round++) {
    const matchCount = prevRoundMatches.length / 2;
    const newMatches: MatchPairing[] = [];
    for (let i = 0; i < matchCount; i++) {
      newMatches.push({
        id: uid(),
        tournamentId,
        round,
        matchNumber: i + 1,
        proTeamId: `__tbd_r${round}_${i}_a`,
        conTeamId: `__tbd_r${round}_${i}_b`,
        topicId: nextTopic(),
        judgeIds: [],
        status: 'pending',
      });
    }
    pairings.push(...newMatches);
    prevRoundMatches = newMatches;
  }

  return pairings;
};

export const generateRoundRobin = (
  teams: Team[],
  tournamentId: string,
  topics: Topic[],
  judges: Judge[],
  format: DebateFormat,
  judgesPerMatch: number
): MatchPairing[] => {
  const pairings: MatchPairing[] = [];
  const availableTopics = shuffle(topics.filter((t) => t.formats.includes(format)));
  let topicIdx = 0;
  const nextTopic = () => {
    const id = availableTopics[topicIdx % Math.max(1, availableTopics.length)]?.id;
    topicIdx++;
    return id ?? (topics[0]?.id || '');
  };

  let arr = [...teams];
  const hasBye = arr.length % 2 !== 0;
  if (hasBye) {
    arr = [{ id: '__bye__', name: '轮空', institution: '', players: [], seed: 999, createdAt: 0 } as Team, ...arr];
  }
  const n = arr.length;
  const totalRounds = n - 1;
  const half = n / 2;

  for (let round = 0; round < totalRounds; round++) {
    let matchNum = 1;
    for (let i = 0; i < half; i++) {
      const teamA = arr[i];
      const teamB = arr[n - 1 - i];
      if (teamA.id !== '__bye__' && teamB.id !== '__bye__') {
        const proFirst = round % 2 === 0;
        const pro = proFirst ? teamA : teamB;
        const con = proFirst ? teamB : teamA;
        const judgeIds = assignJudges(pro, con, judges, [], judgesPerMatch).map((j) => j.id);
        pairings.push({
          id: uid(),
          tournamentId,
          round: round + 1,
          matchNumber: matchNum++,
          proTeamId: pro.id,
          conTeamId: con.id,
          topicId: nextTopic(),
          judgeIds,
          status: 'pending',
        });
      }
    }
    const fixed = arr[0];
    const rotated = [fixed, arr[n - 1], ...arr.slice(1, n - 1)];
    arr = rotated;
  }

  return pairings;
};

export const generateSwissRound = (
  teams: Team[],
  round: number,
  history: MatchPairing[],
  tournamentId: string,
  topics: Topic[],
  judges: Judge[],
  format: DebateFormat,
  judgesPerMatch: number,
  teamRankings: TeamRanking[]
): MatchPairing[] => {
  const pairings: MatchPairing[] = [];
  const availableTopics = shuffle(topics.filter((t) => t.formats.includes(format)));
  let topicIdx = 0;
  const nextTopic = () => {
    const id = availableTopics[topicIdx % Math.max(1, availableTopics.length)]?.id;
    topicIdx++;
    return id ?? (topics[0]?.id || '');
  };

  const rankingMap: Record<string, number> = {};
  teamRankings.forEach((r) => {
    rankingMap[r.teamId] = (r.rank ?? 9999) + (r.ballots * 0.01) + (r.avgScore * 0.0001);
  });

  const sortedTeams = [...teams].sort((a, b) => {
    const ra = rankingMap[a.id] ?? a.seed;
    const rb = rankingMap[b.id] ?? b.seed;
    return ra - rb;
  });

  const playedBefore: Record<string, Set<string>> = {};
  teams.forEach((t) => (playedBefore[t.id] = new Set()));
  history.forEach((h) => {
    if (h.status !== 'finished') return;
    if (h.proTeamId && playedBefore[h.proTeamId]) playedBefore[h.proTeamId].add(h.conTeamId);
    if (h.conTeamId && playedBefore[h.conTeamId]) playedBefore[h.conTeamId].add(h.proTeamId);
  });

  const used = new Set<string>();
  let matchNum = 1;

  for (let i = 0; i < sortedTeams.length; i++) {
    const t1 = sortedTeams[i];
    if (used.has(t1.id)) continue;
    used.add(t1.id);

    let opponent: Team | null = null;
    for (let j = i + 1; j < sortedTeams.length; j++) {
      const t2 = sortedTeams[j];
      if (used.has(t2.id)) continue;
      if (!playedBefore[t1.id]?.has(t2.id)) {
        opponent = t2;
        break;
      }
    }

    if (!opponent) {
      for (let j = i + 1; j < sortedTeams.length; j++) {
        const t2 = sortedTeams[j];
        if (!used.has(t2.id)) {
          opponent = t2;
          break;
        }
      }
    }

    if (opponent) {
      used.add(opponent.id);
      const proFirst = round % 2 === 0;
      const pro = proFirst ? t1 : opponent;
      const con = proFirst ? opponent : t1;
      const judgeIds = assignJudges(pro, con, judges, [], judgesPerMatch).map((j) => j.id);
      pairings.push({
        id: uid(),
        tournamentId,
        round,
        matchNumber: matchNum++,
        proTeamId: pro.id,
        conTeamId: con.id,
        topicId: nextTopic(),
        judgeIds,
        status: 'pending',
      });
    }
  }

  return pairings;
};

export const assignJudges = (
  proTeam: Team | null,
  conTeam: Team | null,
  judges: Judge[],
  alreadyAssigned: string[],
  count: number
): Judge[] => {
  const scored: { judge: Judge; score: number }[] = judges
    .filter((j) => !alreadyAssigned.includes(j.id))
    .map((j) => {
      let score = 0;
      if (proTeam) {
        if (j.avoidTeams.includes(proTeam.id)) score -= 1000;
        if (j.avoidInstitutions.includes(proTeam.institution)) score -= 500;
        proTeam.players.forEach((p) => {
          if (j.avoidPlayers.includes(p.id)) score -= 800;
        });
      }
      if (conTeam) {
        if (j.avoidTeams.includes(conTeam.id)) score -= 1000;
        if (j.avoidInstitutions.includes(conTeam.institution)) score -= 500;
        conTeam.players.forEach((p) => {
          if (j.avoidPlayers.includes(p.id)) score -= 800;
        });
      }
      if (proTeam && j.institution === proTeam.institution) score -= 50;
      if (conTeam && j.institution === conTeam.institution) score -= 50;
      score += Math.random() * 10;
      return { judge: j, score };
    });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.judge);
};

export const checkAvoidanceConflicts = (
  match: MatchPairing,
  teams: Team[],
  judges: Judge[]
): AvoidanceConflict[] => {
  const conflicts: AvoidanceConflict[] = [];
  const proTeam = teams.find((t) => t.id === match.proTeamId);
  const conTeam = teams.find((t) => t.id === match.conTeamId);
  if (!proTeam || !conTeam) return conflicts;

  match.judgeIds.forEach((judgeId) => {
    const j = judges.find((x) => x.id === judgeId);
    if (!j) return;

    const checkTeam = (team: Team, side: string) => {
      if (j.avoidTeams.includes(team.id)) {
        conflicts.push({
          judgeId: j.id,
          judgeName: j.name,
          teamId: team.id,
          teamName: team.name,
          reason: `评委与${side}队伍存在回避关系`,
          type: 'team',
        });
      }
      if (j.avoidInstitutions.includes(team.institution)) {
        conflicts.push({
          judgeId: j.id,
          judgeName: j.name,
          teamId: team.id,
          teamName: team.name,
          reason: `评委需回避${team.institution}`,
          type: 'institution',
        });
      }
      team.players.forEach((p) => {
        if (j.avoidPlayers.includes(p.id)) {
          conflicts.push({
            judgeId: j.id,
            judgeName: j.name,
            teamId: team.id,
            teamName: team.name,
            reason: `评委需回避选手${p.name}`,
            type: 'player',
          });
        }
      });
    };
    checkTeam(proTeam, '正方');
    checkTeam(conTeam, '反方');
  });

  return conflicts;
};

export const assignTopicsToMatches = (
  matches: MatchPairing[],
  topics: Topic[],
  format: DebateFormat
): MatchPairing[] => {
  const valid = shuffle(topics.filter((t) => t.formats.includes(format)));
  if (valid.length === 0) return matches;
  return matches.map((m, i) => ({
    ...m,
    topicId: valid[i % valid.length].id,
  }));
};

export const advanceSingleElimination = (
  pairings: MatchPairing[],
  newRound: number
): MatchPairing[] => {
  const prevRound = pairings.filter((m) => m.round === newRound - 1);
  const nextRound = pairings.filter((m) => m.round === newRound);

  const placeholders: Record<string, string> = {};
  for (let i = 0; i < prevRound.length; i += 2) {
    const ma = prevRound[i];
    const mb = prevRound[i + 1];
    const idx = Math.floor(i / 2);
    if (nextRound[idx]) {
      placeholders[nextRound[idx].proTeamId] =
        ma.winner === 'pro' ? ma.proTeamId : ma.winner === 'con' ? ma.conTeamId : '';
      placeholders[nextRound[idx].conTeamId] = mb
        ? mb.winner === 'pro'
          ? mb.proTeamId
          : mb.winner === 'con'
          ? mb.conTeamId
          : ''
        : '';
    }
  }

  return pairings.map((m) => {
    if (m.round !== newRound) return m;
    const proId = placeholders[m.proTeamId] || m.proTeamId;
    const conId = placeholders[m.conTeamId] || m.conTeamId;
    return { ...m, proTeamId: proId, conTeamId: conId };
  });
};
