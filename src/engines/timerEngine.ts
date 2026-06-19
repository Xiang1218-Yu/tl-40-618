import { DebateFormat, TimerState, TimerStageState } from '@/types';
import { getFormatRules } from './formatRules';

export const createTimerState = (format: DebateFormat, resumeStageIndex = 0): TimerState => {
  const rules = getFormatRules(format);
  const stageConfig = rules.stages[resumeStageIndex] ?? rules.stages[0];
  return {
    format,
    isRunning: false,
    isFinished: false,
    hasStarted: false,
    current: {
      stageIndex: resumeStageIndex,
      stageConfig,
      remainingSeconds: stageConfig.duration,
      totalSeconds: stageConfig.duration,
    },
  };
};

export const tick = (state: TimerState, deltaSeconds = 1): TimerState => {
  if (!state.isRunning || state.isFinished) return state;

  const remaining = state.current.remainingSeconds - deltaSeconds;

  if (remaining <= 0) {
    const nextIndex = state.current.stageIndex + 1;
    const rules = getFormatRules(state.format);

    if (nextIndex >= rules.stages.length) {
      return {
        ...state,
        isRunning: false,
        isFinished: true,
        current: {
          ...state.current,
          remainingSeconds: 0,
        },
      };
    }

    const nextStage = rules.stages[nextIndex];
    return {
      ...state,
      hasStarted: true,
      current: {
        stageIndex: nextIndex,
        stageConfig: nextStage,
        remainingSeconds: nextStage.duration,
        totalSeconds: nextStage.duration,
      },
    };
  }

  return {
    ...state,
    hasStarted: true,
    current: {
      ...state.current,
      remainingSeconds: remaining,
    },
  };
};

export const nextStage = (state: TimerState): TimerState => {
  const nextIndex = state.current.stageIndex + 1;
  const rules = getFormatRules(state.format);

  if (nextIndex >= rules.stages.length) {
    return { ...state, isRunning: false, isFinished: true };
  }

  const nextStageConfig = rules.stages[nextIndex];
  return {
    ...state,
    isRunning: false,
    current: {
      stageIndex: nextIndex,
      stageConfig: nextStageConfig,
      remainingSeconds: nextStageConfig.duration,
      totalSeconds: nextStageConfig.duration,
    },
  };
};

export const prevStage = (state: TimerState): TimerState => {
  const prevIndex = state.current.stageIndex - 1;
  if (prevIndex < 0) return resetStage(state);

  const rules = getFormatRules(state.format);
  const prevStageConfig = rules.stages[prevIndex];
  return {
    ...state,
    isRunning: false,
    isFinished: false,
    current: {
      stageIndex: prevIndex,
      stageConfig: prevStageConfig,
      remainingSeconds: prevStageConfig.duration,
      totalSeconds: prevStageConfig.duration,
    },
  };
};

export const resetStage = (state: TimerState): TimerState => {
  return {
    ...state,
    isRunning: false,
    current: {
      ...state.current,
      remainingSeconds: state.current.totalSeconds,
    },
  };
};

export const start = (state: TimerState): TimerState => {
  if (state.isFinished) return state;
  return { ...state, isRunning: true };
};

export const pause = (state: TimerState): TimerState => {
  return { ...state, isRunning: false };
};

export const toggle = (state: TimerState): TimerState => {
  if (state.isFinished) return state;
  return state.isRunning ? pause(state) : start(state);
};

export const goToStage = (state: TimerState, stageIndex: number): TimerState => {
  const rules = getFormatRules(state.format);
  if (stageIndex < 0 || stageIndex >= rules.stages.length) return state;
  const targetStage = rules.stages[stageIndex];
  return {
    ...state,
    isRunning: false,
    isFinished: false,
    current: {
      stageIndex,
      stageConfig: targetStage,
      remainingSeconds: targetStage.duration,
      totalSeconds: targetStage.duration,
    },
  };
};

export const getTimeDisplay = (seconds: number): string => {
  const abs = Math.abs(seconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const getProgressPercent = (stage: TimerStageState): number => {
  if (stage.totalSeconds === 0) return 0;
  return Math.max(0, Math.min(1, stage.remainingSeconds / stage.totalSeconds));
};

export const isUrgent = (stage: TimerStageState): boolean => {
  return stage.remainingSeconds <= 10 && stage.remainingSeconds > 0;
};

export const getStageSideColor = (side?: string): string => {
  switch (side) {
    case 'pro': return 'text-emerald-600';
    case 'con': return 'text-red-500';
    case 'judge': return 'text-navy-600';
    case 'both': return 'text-gold-600';
    default: return 'text-navy-700';
  }
};

export const getStageSideBg = (side?: string): string => {
  switch (side) {
    case 'pro': return 'bg-emerald-50 border-emerald-200';
    case 'con': return 'bg-red-50 border-red-200';
    case 'judge': return 'bg-navy-50 border-navy-200';
    case 'both': return 'bg-gold-50 border-gold-200';
    default: return 'bg-navy-50 border-navy-200';
  }
};
