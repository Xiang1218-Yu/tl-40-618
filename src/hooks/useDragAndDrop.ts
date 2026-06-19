import { useState, useCallback, useRef } from 'react';

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
 * 使用useRef存储最新状态以避免React事件闭包陷阱
 */
export function useDragAndDrop<T extends DragSource>() {
  const [dragSource, setDragSourceState] = useState<T | null>(null);
  const [dragOverTarget, setDragOverTargetState] = useState<DropTarget | null>(null);

  /**
   * 使用ref保存最新状态，确保事件处理器总能访问到当前值
   */
  const dragSourceRef = useRef<T | null>(null);
  const dragOverTargetRef = useRef<DropTarget | null>(null);

  /**
   * 设置拖拽源状态（同时更新ref）
   */
  const setDragSource = useCallback((source: T | null) => {
    dragSourceRef.current = source;
    setDragSourceState(source);
  }, []);

  /**
   * 设置悬停目标状态（同时更新ref）
   */
  const setDragOverTarget = useCallback((target: DropTarget | null) => {
    dragOverTargetRef.current = target;
    setDragOverTargetState(target);
  }, []);

  /**
   * 开始拖拽
   */
  const handleDragStart = useCallback((source: T) => {
    dragSourceRef.current = source;
    setDragSourceState(source);
  }, []);

  /**
   * 拖拽结束
   */
  const handleDragEnd = useCallback(() => {
    dragSourceRef.current = null;
    dragOverTargetRef.current = null;
    setDragSourceState(null);
    setDragOverTargetState(null);
  }, []);

  /**
   * 拖拽经过目标区域
   */
  const handleDragOver = useCallback((e: React.DragEvent, target: DropTarget) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverTargetRef.current = target;
    setDragOverTargetState(target);
  }, []);

  /**
   * 离开目标区域
   */
  const handleDragLeave = useCallback(() => {
    dragOverTargetRef.current = null;
    setDragOverTargetState(null);
  }, []);

  /**
   * 放置到目标区域，返回源和目标用于执行交换
   * 使用ref读取最新dragSource避免闭包问题
   */
  const handleDrop = useCallback((e: React.DragEvent, target: DropTarget): { source: T; target: DropTarget } | null => {
    e.preventDefault();
    const source = dragSourceRef.current;
    if (!source) return null;

    const result = { source, target };
    dragSourceRef.current = null;
    dragOverTargetRef.current = null;
    setDragSourceState(null);
    setDragOverTargetState(null);
    return result;
  }, []);

  /**
   * 判断某个位置是否是当前拖拽悬停的目标
   */
  const isDragOver = useCallback((matchId: string, side: 'pro' | 'con'): boolean => {
    const target = dragOverTargetRef.current;
    return target?.matchId === matchId && target?.side === side;
  }, []);

  /**
   * 判断某个位置是否是拖拽源
   */
  const isDragging = useCallback((matchId: string, side: 'pro' | 'con'): boolean => {
    const source = dragSourceRef.current;
    return source?.matchId === matchId && source?.side === side;
  }, []);

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
