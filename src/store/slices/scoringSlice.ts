import { StateCreator } from 'zustand';
import {
  MatchPairing,
  Team,
  MatchScore,
} from '@/types';
import {
  finalizeMatchResult,
  calculateTeamRankings,
  TeamRanking,
  calculateMatchJudgeStats,
  JudgeScoreForm,
} from '@/engines/scoringEngine';

/**
 * 评分与统计状态切片
 * 单一职责：管理评委打分、比赛结果确定和队伍排名计算
 */
export interface ScoringSlice {
  judgeScoresByMatch: Record<string, JudgeScoreForm[]>;

  submitJudgeScores: (matchId: string, form: JudgeScoreForm) => void;
  finalizeMatch: (matchId: string) => void;
  recalculateAllRankings: () => TeamRanking[];
  getMatchResult: (matchId: string) => { winner: 'pro' | 'con' | 'tie'; proScore: number; conScore: number } | null;
}

type StoreWithScoring = ScoringSlice & {
  matches: MatchPairing[];
};

export const createScoringSlice: StateCreator<
  ScoringSlice,
  [],
  [],
  ScoringSlice
> = (set, get) => ({
  judgeScoresByMatch: {},

  submitJudgeScores: (matchId, form) => {
    set((s) => {
      const list = s.judgeScoresByMatch[matchId] ?? [];
      const idx = list.findIndex((x) => x.judgeId === form.judgeId);
      const next = [...list];
      if (idx >= 0) next[idx] = form;
      else next.push(form);
      return { judgeScoresByMatch: { ...s.judgeScoresByMatch, [matchId]: next } };
    });
  },

  finalizeMatch: (matchId) => {
    const s = get() as StoreWithScoring;
    const scoreForms = s.judgeScoresByMatch[matchId] ?? [];
    const match = s.matches.find((m) => m.id === matchId);
    if (!match || scoreForms.length === 0) return;

    const {
      winner,
      proTotal,
      conTotal,
      proJudgeVotes,
      conJudgeVotes,
      tie,
    } = finalizeMatchResult(scoreForms);

    const matchScore: MatchScore = {
      matchId,
      judgeScores: [],
      proTeamTotal: proTotal,
      conTeamTotal: conTotal,
      playerScores: [],
    };

    set((st) => ({
      matches: st.matches.map((m) => {
        if (m.id !== matchId) return m;
        return {
          ...m,
          winner: winner === 'draw' ? 'draw' : winner,
          scores: matchScore,
          tie,
          proJudgeVotes,
          conJudgeVotes,
          status: 'finished' as const,
          finishedAt: Date.now(),
        } as MatchPairing;
      }),
    }));
  },

  recalculateAllRankings: () => {
    const s = get() as StoreWithScoring & { teams: Team[] };
    return calculateTeamRankings(s.matches, s.teams.filter((t) => !t.id.startsWith('__')));
  },

  getMatchResult: (matchId) => {
    const s = get() as StoreWithScoring;
    const scores = s.judgeScoresByMatch[matchId] ?? [];
    if (scores.length === 0) return null;
    const stats = calculateMatchJudgeStats(scores);
    return {
      winner: stats.majorityWinner,
      proScore: stats.proTotal,
      conScore: stats.conTotal,
    };
  },
});
