import { useState, useCallback } from 'react';

/**
 * 拖拽源数据类型
 * 标识被拖拽的队伍来自哪场比赛的哪个位置
 */
export interface DragSource {
  matchId: string;
  side: 'pro' | 'con';
  teamId: string;
}

/**
 * 放置目标数据类型
 */
export interface DropTarget {
  matchId: string;
  side: 'pro' | 'con';
}

/**
 * 拖拽状态管理Hook
 * 遵循单一职责原则：仅管理拖拽源状态和拖拽事件
 */
export function useDragAndDrop<T extends DragSource>() {
  const [dragSource, setDragSource] = useState<T | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<DropTarget | null>(null);

  /**
   * 开始拖拽
   */
  const handleDragStart = useCallback((source: T) => {
    setDragSource(source);
  }, []);

  /**
   * 拖拽结束
   */
  const handleDragEnd = useCallback(() => {
    setDragSource(null);
    setDragOverTarget(null);
  }, []);

  /**
   * 拖拽经过目标区域
   */
  const handleDragOver = useCallback((e: React.DragEvent, target: DropTarget) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(target);
  }, []);

  /**
   * 离开目标区域
   */
  const handleDragLeave = useCallback(() => {
    setDragOverTarget(null);
  }, []);

  /**
   * 放置到目标区域，返回源和目标用于执行交换
   */
  const handleDrop = useCallback((e: React.DragEvent, target: DropTarget): { source: T; target: DropTarget } | null => {
    e.preventDefault();
    if (!dragSource) return null;

    const result = { source: dragSource, target };
    setDragSource(null);
    setDragOverTarget(null);
    return result;
  }, [dragSource]);

  /**
   * 判断某个位置是否是当前拖拽悬停的目标
   */
  const isDragOver = useCallback((matchId: string, side: 'pro' | 'con'): boolean => {
    return dragOverTarget?.matchId === matchId && dragOverTarget?.side === side;
  }, [dragOverTarget]);

  /**
   * 判断某个位置是否是拖拽源
   */
  const isDragging = useCallback((matchId: string, side: 'pro' | 'con'): boolean => {
    return dragSource?.matchId === matchId && dragSource?.side === side;
  }, [dragSource]);

  return {
    dragSource,
    isDragging,
    isDragOver,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
