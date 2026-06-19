import { create } from 'zustand';
import { createTournamentSlice, type TournamentSlice } from './slices/tournamentSlice';
import { createScoringSlice, type ScoringSlice } from './slices/scoringSlice';
import { createTimerSlice, type TimerSlice } from './slices/timerSlice';
import { createDanmakuSlice, type DanmakuSlice } from './slices/danmakuSlice';

/**
 * 全局辩论赛事 Store
 * 架构说明：使用 zustand slices 模式按单一职责拆分：
 * - tournamentSlice: 赛事配置、队伍/评委/辩题管理、对阵编排
 * - scoringSlice: 评委打分、比赛结果、排名统计
 * - timerSlice: 发言环节计时器
 * - danmakuSlice: 观众弹幕
 */
export type DebateStore = TournamentSlice & ScoringSlice & TimerSlice & DanmakuSlice;

export const useDebateStore = create<DebateStore>()((...a) => ({
  ...createTournamentSlice(...a),
  ...createScoringSlice(...a),
  ...createTimerSlice(...a),
  ...createDanmakuSlice(...a),
}));
