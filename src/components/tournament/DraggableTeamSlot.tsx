import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import type { Team } from '@/types';

/**
 * 拖拽源/目标位置标识
 */
export interface DragLocation {
  matchId: string;
  side: 'pro' | 'con';
}

interface DraggableTeamSlotProps {
  team: Team | undefined;
  side: 'pro' | 'con';
  matchId: string;
  isDropTarget: boolean;
  onDragStart: (loc: DragLocation) => void;
  onDragEnd: () => void;
  onDrop: (loc: DragLocation) => void;
}

/**
 * 可拖拽的队伍槽位组件
 * 单一职责：处理单个队伍槽位的拖拽交互UI
 */
export const DraggableTeamSlot = ({
  team,
  side,
  matchId,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDrop,
}: DraggableTeamSlotProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const isPro = side === 'pro';

  /**
   * 开始拖拽
   */
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ matchId, side }));
    onDragStart({ matchId, side });
  };

  /**
   * 拖拽结束
   */
  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  /**
   * 拖拽经过时允许放置
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  /**
   * 放置目标
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain')) as DragLocation;
      onDrop(data);
    } catch {
      // ignore parse error
    }
  };

  /**
   * 根据状态和侧别获取样式类名
   */
  const getContainerClassName = () => {
    if (isPro) {
      if (isDropTarget) {
        return 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300';
      }
      if (isDragging) {
        return 'border-emerald-300 bg-emerald-50/50 opacity-50';
      }
      return 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 hover:bg-emerald-50 cursor-grab active:cursor-grabbing';
    } else {
      if (isDropTarget) {
        return 'border-red-500 bg-red-100 ring-2 ring-red-300';
      }
      if (isDragging) {
        return 'border-red-300 bg-red-50/50 opacity-50';
      }
      return 'border-red-200 bg-red-50/50 hover:border-red-400 hover:bg-red-50 cursor-grab active:cursor-grabbing';
    }
  };

  return (
    <div
      draggable={!!team && !team.id.startsWith('__')}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative rounded-lg border-2 p-3 transition-all duration-200 ${getContainerClassName()}`}
    >
      {team && !team.id.startsWith('__') && (
        <div className={`absolute top-1.5 ${isPro ? 'left-1.5' : 'right-1.5'} opacity-40 hover:opacity-80 transition-opacity`}>
          <GripVertical className={`w-3.5 h-3.5 ${isPro ? 'text-emerald-500' : 'text-red-500'}`} />
        </div>
      )}

      <div className={`flex items-center gap-1.5 mb-1 ${isPro ? '' : 'justify-end'}`}>
        {isPro && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${isPro ? 'text-emerald-700' : 'text-red-700'}`}>
          {isPro ? '正方 PRO' : '反方 CON'}
        </span>
        {!isPro && <span className="w-2 h-2 rounded-full bg-red-500" />}
      </div>

      {team ? (
        <>
          <div className={`font-serif font-bold text-navy-900 text-sm leading-tight line-clamp-1 ${isPro ? '' : 'text-right'}`}>
            {team.name}
          </div>
          <div className={`text-[11px] text-navy-500 mt-0.5 line-clamp-1 ${isPro ? '' : 'text-right'}`}>
            {team.institution}
          </div>
        </>
      ) : (
        <div className="font-serif font-bold text-navy-400 text-sm leading-tight text-center py-1">
          待定
        </div>
      )}
    </div>
  );
};
