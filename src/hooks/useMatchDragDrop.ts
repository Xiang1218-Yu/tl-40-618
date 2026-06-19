import { useState, useCallback } from 'react';

/**
 * 拖拽源/目标标识
 * 单一职责：仅描述拖拽位置，不含业务逻辑
 */
export interface DragDropLocation {
  matchId: string;
  side: 'pro' | 'con';
}

/**
 * 对阵拖拽 Hook
 * 职责：管理拖拽状态（拖拽中/悬停目标），提供拖拽事件处理函数
 * 不直接操作 store，由调用方在 drop 时执行业务交换
 */
export function useMatchDragDrop(
  onDrop: (source: DragDropLocation, target: DragDropLocation) => void
) {
  const [dragging, setDragging] = useState<DragDropLocation | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DragDropLocation | null>(null);

  /**
   * 开始拖拽
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent, matchId: string, side: 'pro' | 'con') => {
      setDragging({ matchId, side });
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ matchId, side }));
    },
    []
  );

  /**
   * 拖拽经过目标区域
   */
  const handleDragOver = useCallback(
    (e: React.DragEvent, matchId: string, side: 'pro' | 'con') => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setHoverTarget({ matchId, side });
    },
    []
  );

  /**
   * 离开目标区域
   */
  const handleDragLeave = useCallback(() => {
    setHoverTarget(null);
  }, []);

  /**
   * 放下
   */
  const handleDrop = useCallback(
    (e: React.DragEvent, matchId: string, side: 'pro' | 'con') => {
      e.preventDefault();
      if (dragging) {
        onDrop(dragging, { matchId, side });
      }
      setDragging(null);
      setHoverTarget(null);
    },
    [dragging, onDrop]
  );

  /**
   * 拖拽结束（无论是否成功）
   */
  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setHoverTarget(null);
  }, []);

  /**
   * 判断某个位置是否是当前悬停目标
   */
  const isHovering = useCallback(
    (matchId: string, side: 'pro' | 'con') => {
      return (
        hoverTarget?.matchId === matchId && hoverTarget?.side === side
      );
    },
    [hoverTarget]
  );

  /**
   * 判断某个位置是否是正在被拖拽的源
   */
  const isDragging = useCallback(
    (matchId: string, side: 'pro' | 'con') => {
      return (
        dragging?.matchId === matchId && dragging?.side === side
      );
    },
    [dragging]
  );

  return {
    dragging,
    hoverTarget,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    isHovering,
    isDragging,
  };
}
