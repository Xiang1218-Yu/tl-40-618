import React from 'react';
import { GripVertical } from 'lucide-react';
import type { Team } from '@/types';

/**
 * 队伍槽位组件属性
 */
interface DraggableTeamSlotProps {
  team: Team | undefined;
  matchId: string;
  side: 'pro' | 'con';
  isDragging: boolean;
  isDragOver: boolean;
  isEditable: boolean;
  onDragStart: (matchId: string, side: 'pro' | 'con', teamId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, matchId: string, side: 'pro' | 'con') => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, matchId: string, side: 'pro' | 'con') => void;
}

/**
 * 可拖拽的队伍槽位组件
 * 单一职责：
 * - 渲染单个正方/反方队伍信息
 * - 处理该位置的拖拽开始/经过/离开/放置事件
 * - 根据拖拽状态提供视觉反馈
 */
export const DraggableTeamSlot: React.FC<DraggableTeamSlotProps> = ({
  team,
  matchId,
  side,
  isDragging,
  isDragOver,
  isEditable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const isPro = side === 'pro';

  const baseClasses = isPro
    ? 'border-2 border-emerald-200 bg-emerald-50/50'
    : 'border-2 border-red-200 bg-red-50/50';

  const hoverClasses = isPro
    ? 'hover:border-emerald-400 hover:bg-emerald-50'
    : 'hover:border-red-400 hover:bg-red-50';

  const dragOverClasses = isDragOver
    ? isPro
      ? 'ring-2 ring-emerald-500 ring-offset-2 border-emerald-500 bg-emerald-100 scale-[1.02]'
      : 'ring-2 ring-red-500 ring-offset-2 border-red-500 bg-red-100 scale-[1.02]'
    : '';

  const draggingClasses = isDragging ? 'opacity-40 scale-95' : '';

  const draggableProps = isEditable && team
    ? {
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', team.id);
          onDragStart(matchId, side, team.id);
        },
        onDragEnd,
      }
    : {};

  return (
    <div
      className={`rounded-lg p-3 transition-all duration-200 ${baseClasses} ${hoverClasses} ${dragOverClasses} ${draggingClasses} ${isEditable && team ? 'cursor-grab active:cursor-grabbing' : ''}`}
      onDragOver={(e) => isEditable && onDragOver(e, matchId, side)}
      onDragLeave={() => isEditable && onDragLeave()}
      onDrop={(e) => isEditable && onDrop(e, matchId, side)}
      {...draggableProps}
    >
      <div className={`flex items-center gap-1.5 mb-1 ${isPro ? '' : 'justify-end'}`}>
        {isPro && isEditable && team && (
          <GripVertical className="w-3.5 h-3.5 text-emerald-400 opacity-60 hover:opacity-100" />
        )}
        <span className={`w-2 h-2 rounded-full ${isPro ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${isPro ? 'text-emerald-700' : 'text-red-600'}`}>
          {isPro ? '正方 PRO' : '反方 CON'}
        </span>
        {!isPro && isEditable && team && (
          <GripVertical className="w-3.5 h-3.5 text-red-400 opacity-60 hover:opacity-100" />
        )}
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
        <div className={`text-navy-400 text-sm italic ${isPro ? '' : 'text-right'}`}>
          待定队伍
        </div>
      )}
    </div>
  );
};

export default DraggableTeamSlot;
