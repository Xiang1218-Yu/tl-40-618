import { StateCreator } from 'zustand';
import type { DanmakuMessage } from '@/types';
import { uid } from '@/engines/scoringEngine';

/**
 * 弹幕状态切片
 * 单一职责：管理观众弹幕消息
 */
export interface DanmakuSlice {
  danmaku: DanmakuMessage[];
  danmakuEnabled: boolean;
  addDanmaku: (text: string) => void;
  toggleDanmaku: () => void;
}

export const createDanmakuSlice: StateCreator<
  DanmakuSlice,
  [],
  [],
  DanmakuSlice
> = (set) => ({
  danmaku: [],
  danmakuEnabled: true,

  addDanmaku: (text) => {
    if (!text.trim()) return;
    set((s) => {
      const msg: DanmakuMessage = {
        id: uid(),
        text: text.trim(),
        timestamp: Date.now(),
      };
      return {
        danmaku: [...s.danmaku.slice(-99), msg],
      };
    });
  },

  toggleDanmaku: () =>
    set((s) => ({
      danmakuEnabled: !s.danmakuEnabled,
    })),
});
