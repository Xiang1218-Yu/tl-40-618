import React, { useCallback } from 'react';
import { Swords, ArrowLeftRight, Scale, Trophy, MessageSquare } from 'lucide-react';
import { DraggableTeamSlot } from './DraggableTeamSlot';
import type { Team, MatchPairing, MatchStatus, Topic } from '@/types';

/**
 * 可编辑对阵卡片属性
 */
interface EditableMatchCardProps {
  match: MatchPairing;
  proTeam: Team | undefined;
  conTeam: Team | undefined;
  topic: Topic | undefined;
  isEditable: boolean;
  isProDragging: boolean;
  isConDragging: boolean;
  isProDragOver: boolean;
  isConDragOver: boolean;
  onDragStart: (matchId: string, side: 'pro' | 'con', teamId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, matchId: string, side: 'pro' | 'con') => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, matchId: string, side: 'pro' | 'con') => void;
  onSwapSides: (matchId: string) => void;
}

/**
 * 比赛状态徽章组件
 */
const StatusBadge: React.FC<{ status: MatchStatus }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return (
        <span className="badge-blue">
          <Scale className="w-3 h-3" />
          待开始
        </span>
      );
    case 'ongoing':
      return (
        <span className="badge-gold">
          <Swords className="w-3 h-3" />
          进行中
        </span>
      );
    case 'finished':
      return (
        <span className="badge-green">
          <Trophy className="w-3 h-3" />
          已结束
        </span>
      );
    default:
      return null;
  }
};

/**
 * 可编辑的比赛对阵卡片
 * 单一职责：
 * - 展示单场比赛的完整信息（辩题、正反方队伍、状态）
 * - 组合两个可拖拽队伍槽位
 * - 提供正反方交换按钮
 */
export const EditableMatchCard: React.FC<EditableMatchCardProps> = ({
  match,
  proTeam,
  conTeam,
  topic,
  isEditable,
  isProDragging,
  isConDragging,
  isProDragOver,
  isConDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onSwapSides,
}) => {
  const handleSwapSides = useCallback(() => {
    if (isEditable) {
      onSwapSides(match.id);
    }
  }, [isEditable, match.id, onSwapSides]);

  const handleDragOver = useCallback((e: React.DragEvent, side: 'pro' | 'con') => {
    onDragOver(e, match.id, side);
  }, [match.id, onDragOver]);

  const handleDrop = useCallback((e: React.DragEvent, side: 'pro' | 'con') => {
    onDrop(e, match.id, side);
  }, [match.id, onDrop]);

  const handleDragStart = useCallback((side: 'pro' | 'con', teamId: string) => {
    const team = side === 'pro' ? proTeam : conTeam;
    if (team) {
      onDragStart(match.id, side, teamId);
    }
  }, [conTeam, match.id, onDragStart, proTeam]);

  return (
    <div className="card p-4 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="badge-gold">第{match.round}轮</span>
          <span className="text-xs font-medium text-navy-500">#{match.matchNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={match.status} />
          {isEditable && match.status === 'pending' && proTeam && conTeam && (
            <button
              onClick={handleSwapSides}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-navy-500 hover:text-navy-700 hover:bg-navy-50 transition-colors"
              title="交换正反方"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              交换
            </button>
          )}
        </div>
      </div>

      {topic && (
        <div className="mb-3 pb-3 border-b border-navy-100">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-gold-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium text-navy-800 leading-snug line-clamp-2">
              {topic.title}
            </p>
          </div>
        </div>
      )}

      <div className="relative flex items-stretch gap-2">
        <div className="flex-1">
          <DraggableTeamSlot
            team={proTeam}
            matchId={match.id}
            side="pro"
            isDragging={isProDragging}
            isDragOver={isProDragOver}
            isEditable={isEditable && match.status === 'pending'}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={onDragLeave}
            onDrop={handleDrop}
          />
        </div>

        <div className="relative flex items-center justify-center px-1">
          <div className="absolute inset-y-3 left-1/2 w-px bg-gradient-to-b from-transparent via-gold-400 to-transparent" />
          <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-gold text-white shadow-md flex-shrink-0">
            <Swords className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1">
          <DraggableTeamSlot
            team={conTeam}
            matchId={match.id}
            side="con"
            isDragging={isConDragging}
            isDragOver={isConDragOver}
            isEditable={isEditable && match.status === 'pending'}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={onDragLeave}
            onDrop={handleDrop}
          />
        </div>
      </div>
    </div>
  );
};

export default EditableMatchCard;
