import React, { useCallback } from 'react';
import { useDragAndDrop, type DragSource } from '@/hooks/useDragAndDrop';
import { EditableMatchCard } from './EditableMatchCard';
import type { MatchPairing, Team, Topic } from '@/types';

/**
 * 拖拽编排网格组件属性
 */
interface DragDropMatchGridProps {
  matches: MatchPairing[];
  getTeamById: (id: string) => Team | undefined;
  getTopicById: (id: string) => Topic | undefined;
  checkMatchConflicts: (matchId: string) => Array<{ judgeName: string; teamName: string; reason: string }>;
  swapMatchTeams: (matchId1: string, matchId2: string, side1: 'pro' | 'con', side2: 'pro' | 'con') => void;
  swapMatchSides: (matchId: string) => void;
  isEditable?: boolean;
}

/**
 * 冲突告警组件（从TournamentPage提取，单一职责：展示单场比赛的回避冲突）
 */
const MatchConflictAlert: React.FC<{
  matchId: string;
  checkMatchConflicts: (matchId: string) => Array<{ judgeName: string; teamName: string; reason: string }>;
}> = ({ matchId, checkMatchConflicts }) => {
  const conflicts = checkMatchConflicts(matchId);
  if (conflicts.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50/70 p-3">
      <div className="flex items-start gap-2">
        <span className="text-red-500 mt-0.5 flex-shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-red-700 mb-1">回避冲突告警</p>
          <ul className="space-y-0.5">
            {conflicts.map((c, i) => (
              <li key={i} className="text-[11px] text-red-600 leading-tight">
                · 评委「{c.judgeName}」与「{c.teamName}」：{c.reason}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

/**
 * 拖拽式对阵编排网格
 * 单一职责：
 * - 管理一轮比赛内的拖拽状态
 * - 处理队伍交换/正反方交换逻辑
 * - 渲染所有比赛卡片及冲突提示
 */
export const DragDropMatchGrid: React.FC<DragDropMatchGridProps> = ({
  matches,
  getTeamById,
  getTopicById,
  checkMatchConflicts,
  swapMatchTeams,
  swapMatchSides,
  isEditable = true,
}) => {
  const {
    isDragging,
    isDragOver,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useDragAndDrop<DragSource>();

  /**
   * 处理拖拽开始
   */
  const onDragStart = useCallback((matchId: string, side: 'pro' | 'con', teamId: string) => {
    handleDragStart({ matchId, side, teamId });
  }, [handleDragStart]);

  /**
   * 处理放置事件，执行队伍交换
   */
  const onDrop = useCallback((e: React.DragEvent, targetMatchId: string, targetSide: 'pro' | 'con') => {
    const result = handleDrop(e, { matchId: targetMatchId, side: targetSide });
    if (!result) return;

    const { source, target } = result;

    if (source.matchId === target.matchId && source.side === target.side) {
      return;
    }

    if (source.matchId === target.matchId) {
      swapMatchSides(source.matchId);
    } else {
      swapMatchTeams(source.matchId, target.matchId, source.side, target.side);
    }
  }, [handleDrop, swapMatchSides, swapMatchTeams]);

  /**
   * 处理正反方交换
   */
  const onSwapSides = useCallback((matchId: string) => {
    swapMatchSides(matchId);
  }, [swapMatchSides]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map((match) => {
        const proTeam = getTeamById(match.proTeamId);
        const conTeam = getTeamById(match.conTeamId);
        const topic = getTopicById(match.topicId);

        return (
          <div key={match.id} className="transition-all duration-200">
            <EditableMatchCard
              match={match}
              proTeam={proTeam}
              conTeam={conTeam}
              topic={topic}
              isEditable={isEditable}
              isProDragging={isDragging(match.id, 'pro')}
              isConDragging={isDragging(match.id, 'con')}
              isProDragOver={isDragOver(match.id, 'pro')}
              isConDragOver={isDragOver(match.id, 'con')}
              onDragStart={onDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={onDrop}
              onSwapSides={onSwapSides}
            />
            <MatchConflictAlert matchId={match.id} checkMatchConflicts={checkMatchConflicts} />
          </div>
        );
      })}
    </div>
  );
};

export default DragDropMatchGrid;
