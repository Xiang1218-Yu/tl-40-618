import { StateCreator } from 'zustand';
import {
  Team,
  Judge,
  Topic,
  TournamentConfig,
  MatchPairing,
  DebateFormat,
  AvoidanceConflict,
} from '@/types';
import {
  buildInitialTeams,
  buildInitialJudges,
  buildInitialTopics,
  buildInitialTournament,
  buildSampleMatches,
} from '@/data/mockData';
import {
  generateSingleElimination,
  generateRoundRobin,
  generateSwissRound,
  checkAvoidanceConflicts,
  advanceSingleElimination,
  assignJudges,
  swapMatchTeams,
  swapMatchSidesAndReassignJudges,
  reassignMatchJudges,
} from '@/engines/tournamentEngine';
import {
  calculateTeamRankings,
  uid,
} from '@/engines/scoringEngine';

/**
 * 赛事编排状态切片
 * 单一职责：管理队伍、评委、辩题、赛事配置和对阵编排
 */
export interface TournamentSlice {
  teams: Team[];
  judges: Judge[];
  topics: Topic[];
  tournament: TournamentConfig;
  matches: MatchPairing[];

  addTeam: (team: Omit<Team, 'id' | 'createdAt'>) => void;
  updateTeam: (id: string, patch: Partial<Team>) => void;
  removeTeam: (id: string) => void;
  bulkAddTeams: (teams: Omit<Team, 'id' | 'createdAt'>[]) => void;

  addJudge: (j: Omit<Judge, 'id'>) => void;
  updateJudge: (id: string, patch: Partial<Judge>) => void;
  removeJudge: (id: string) => void;

  addTopic: (t: Omit<Topic, 'id'>) => void;
  updateTopic: (id: string, patch: Partial<Topic>) => void;
  removeTopic: (id: string) => void;

  updateTournament: (patch: Partial<TournamentConfig>) => void;
  regenerateAllMatches: () => void;
  generateNextRound: () => void;
  updateMatch: (id: string, patch: Partial<MatchPairing>) => void;

  swapTeamsBetweenMatches: (matchIdA: string, matchIdB: string, sideA: 'pro' | 'con', sideB: 'pro' | 'con') => void;
  swapMatchSidesInMatch: (matchId: string) => void;
  autoReassignJudges: (matchId: string) => void;

  checkMatchConflicts: (matchId: string) => AvoidanceConflict[];

  getTeamById: (id: string) => Team | undefined;
  getPlayerById: (id: string) => { player: Team['players'][0]; team: Team } | undefined;
  getTopicById: (id: string) => Topic | undefined;
  getJudgeById: (id: string) => Judge | undefined;
  getMatchesByRound: (round: number) => MatchPairing[];
  getCurrentRoundMatches: () => MatchPairing[];
  isCurrentRoundFinished: () => boolean;
}

const defaultTournament = buildInitialTournament();
const defaultTeams = buildInitialTeams(8);
const defaultJudges = buildInitialJudges();
const defaultTopics = buildInitialTopics();
const defaultMatches = buildSampleMatches(defaultTeams, defaultJudges, defaultTopics, defaultTournament);

type StoreWithTournament = TournamentSlice & {
  judgeScoresByMatch: Record<string, any>;
};

export const createTournamentSlice: StateCreator<
  TournamentSlice,
  [],
  [],
  TournamentSlice
> = (set, get) => ({
  teams: defaultTeams,
  judges: defaultJudges,
  topics: defaultTopics,
  tournament: defaultTournament,
  matches: defaultMatches,

  addTeam: (team) =>
    set((s) => ({
      teams: [
        ...s.teams,
        { ...team, id: uid(), createdAt: Date.now() },
      ],
    })),
  updateTeam: (id, patch) =>
    set((s) => ({
      teams: s.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  removeTeam: (id) =>
    set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),
  bulkAddTeams: (list) =>
    set((s) => ({
      teams: [
        ...s.teams,
        ...list.map((t, i) => ({
          ...t,
          id: uid(),
          createdAt: Date.now() + i,
        })),
      ],
    })),

  addJudge: (j) => set((s) => ({ judges: [...s.judges, { ...j, id: uid() }] })),
  updateJudge: (id, patch) =>
    set((s) => ({
      judges: s.judges.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    })),
  removeJudge: (id) => set((s) => ({ judges: s.judges.filter((j) => j.id !== id) })),

  addTopic: (t) => set((s) => ({ topics: [...s.topics, { ...t, id: uid() }] })),
  updateTopic: (id, patch) =>
    set((s) => ({
      topics: s.topics.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  removeTopic: (id) => set((s) => ({ topics: s.topics.filter((t) => t.id !== id) })),

  updateTournament: (patch) =>
    set((s) => ({ tournament: { ...s.tournament, ...patch } })),

  regenerateAllMatches: () => {
    const s = get();
    const { teams, judges, topics, tournament } = s;
    const validTeams = teams.filter((t) => t.id !== '__bye__' && !t.id.startsWith('__'));
    if (validTeams.length < 2) return;

    let matches: MatchPairing[] = [];
    const fmt = tournament.format;
    const jpm = tournament.judgesPerMatch;
    const id = tournament.id;

    switch (tournament.type) {
      case 'single_elimination':
        matches = generateSingleElimination(validTeams, id, topics, judges, fmt, jpm);
        break;
      case 'round_robin':
        matches = generateRoundRobin(validTeams, id, topics, judges, fmt, jpm);
        break;
      case 'swiss':
        {
          const rankings = calculateTeamRankings([], validTeams);
          matches = generateSwissRound(
            validTeams,
            1,
            [],
            id,
            topics,
            judges,
            fmt,
            jpm,
            rankings
          );
        }
        break;
    }

    const totalRounds =
      tournament.type === 'round_robin'
        ? Math.max(...matches.map((m) => m.round), 1)
        : tournament.type === 'single_elimination'
        ? Math.max(...matches.map((m) => m.round), 1)
        : tournament.totalRounds;

    set({
      matches,
      tournament: {
        ...tournament,
        currentRound: 1,
        totalRounds,
      },
      judgeScoresByMatch: {},
    } as Partial<StoreWithTournament>);
  },

  generateNextRound: () => {
    const s = get() as StoreWithTournament;
    const { matches, tournament, teams, judges, topics } = s;
    const { currentRound, type, format, judgesPerMatch, id, totalRounds } = tournament;
    const curMatches = matches.filter((m: MatchPairing) => m.round === currentRound);
    const allFinished = curMatches.length > 0 && curMatches.every((m: MatchPairing) => m.status === 'finished');
    if (!allFinished) return;
    if (currentRound >= totalRounds) return;

    const nextRound = currentRound + 1;
    const validTeams = teams.filter((t: Team) => !t.id.startsWith('__'));

    if (type === 'single_elimination') {
      const advanced = advanceSingleElimination(matches, nextRound);
      const withJudges = advanced.map((m) => {
        if (m.round !== nextRound) return m;
        const pro = validTeams.find((t) => t.id === m.proTeamId);
        const con = validTeams.find((t) => t.id === m.conTeamId);
        const assignedIds = advanced
          .filter((mm) => mm.round === nextRound)
          .flatMap((mm) => mm.judgeIds);
        const js = assignJudges(pro ?? null, con ?? null, judges, assignedIds, judgesPerMatch);
        return { ...m, judgeIds: js.map((j) => j.id) };
      });
      set({
        matches: withJudges,
        tournament: { ...tournament, currentRound: nextRound },
      } as Partial<StoreWithTournament>);
      return;
    }

    if (type === 'round_robin') {
      set({ tournament: { ...tournament, currentRound: nextRound } } as Partial<StoreWithTournament>);
      return;
    }

    if (type === 'swiss') {
      const history = matches.filter((m) => m.status === 'finished');
      const rankings = calculateTeamRankings(matches, validTeams);
      const newMatches = generateSwissRound(
        validTeams,
        nextRound,
        history,
        id,
        topics,
        judges,
        format,
        judgesPerMatch,
        rankings
      );
      set({
        matches: [...matches, ...newMatches],
        tournament: { ...tournament, currentRound: nextRound },
      } as Partial<StoreWithTournament>);
    }
  },

  updateMatch: (id, patch) =>
    set((s) => ({
      matches: s.matches.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  swapTeamsBetweenMatches: (matchIdA, matchIdB, sideA, sideB) => {
    set((s) => {
      const matchA = s.matches.find((m) => m.id === matchIdA);
      const matchB = s.matches.find((m) => m.id === matchIdB);
      if (!matchA || !matchB) return s;
      // 必须是同一轮次才能交换
      if (matchA.round !== matchB.round) return s;
      const sameRoundMatches = s.matches.filter((m) => m.round === matchA.round);
      return {
        matches: swapMatchTeams(
          s.matches,
          matchIdA,
          matchIdB,
          sideA,
          sideB,
          s.teams,
          s.judges,
          s.tournament.judgesPerMatch,
          sameRoundMatches
        ),
      };
    });
  },

  swapMatchSidesInMatch: (matchId) => {
    set((s) => {
      const match = s.matches.find((m) => m.id === matchId);
      if (!match) return s;
      const sameRoundMatches = s.matches.filter((m) => m.round === match.round);
      return {
        matches: swapMatchSidesAndReassignJudges(
          s.matches,
          matchId,
          s.teams,
          s.judges,
          s.tournament.judgesPerMatch,
          sameRoundMatches
        ),
      };
    });
  },

  autoReassignJudges: (matchId) => {
    set((s) => {
      const match = s.matches.find((m) => m.id === matchId);
      if (!match) return s;
      const sameRoundMatches = s.matches.filter((m) => m.round === match.round);
      return {
        matches: reassignMatchJudges(
          s.matches,
          matchId,
          s.teams,
          s.judges,
          s.tournament.judgesPerMatch,
          sameRoundMatches
        ),
      };
    });
  },

  checkMatchConflicts: (matchId) => {
    const s = get();
    const m = s.matches.find((x) => x.id === matchId);
    if (!m) return [];
    return checkAvoidanceConflicts(m, s.teams, s.judges);
  },

  getTeamById: (id) => get().teams.find((t) => t.id === id),
  getPlayerById: (id) => {
    for (const t of get().teams) {
      const p = t.players.find((pp) => pp.id === id);
      if (p) return { player: p, team: t };
    }
    return undefined;
  },
  getTopicById: (id) => get().topics.find((t) => t.id === id),
  getJudgeById: (id) => get().judges.find((j) => j.id === id),
  getMatchesByRound: (round) => get().matches.filter((m) => m.round === round),
  getCurrentRoundMatches: () => get().matches.filter((m) => m.round === get().tournament.currentRound),
  isCurrentRoundFinished: () => {
    const cur = get().getCurrentRoundMatches();
    return cur.length > 0 && cur.every((m) => m.status === 'finished');
  },
});
