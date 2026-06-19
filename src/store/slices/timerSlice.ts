import { StateCreator } from 'zustand';

/**
 * 计时器状态切片
 * 单一职责：管理比赛发言/环节计时器
 */
export interface TimerSlice {
  timerState: {
    running: boolean;
    phase: 'pro' | 'con';
    remaining: number;
    totalDuration: number;
  };
  startTimer: (phase: 'pro' | 'con', duration: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  tickTimer: () => void;
}

export const createTimerSlice: StateCreator<
  TimerSlice,
  [],
  [],
  TimerSlice
> = (set) => ({
  timerState: {
    running: false,
    phase: 'pro',
    remaining: 180,
    totalDuration: 180,
  },

  startTimer: (phase, duration) =>
    set({
      timerState: {
        running: true,
        phase,
        remaining: duration,
        totalDuration: duration,
      },
    }),

  pauseTimer: () =>
    set((s) => ({
      timerState: { ...s.timerState, running: false },
    })),

  resumeTimer: () =>
    set((s) => ({
      timerState: { ...s.timerState, running: true },
    })),

  resetTimer: () =>
    set((s) => ({
      timerState: { ...s.timerState, running: false, remaining: s.timerState.totalDuration },
    })),

  tickTimer: () =>
    set((s) => ({
      timerState: {
        ...s.timerState,
        remaining: Math.max(0, s.timerState.remaining - 1),
        running: s.timerState.remaining > 1 ? s.timerState.running : false,
      },
    })),
});
