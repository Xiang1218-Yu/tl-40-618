import { useMemo } from 'react';
import { MessageSquare, Swords, RefreshCw, ArrowLeftRight, AlertTriangle, Users } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import { DraggableTeamSlot, type DragLocation } from './DraggableTeamSlot';

interface EditableMatchCardProps {
  matchId: string;
  dragSource: DragLocation | null;
  onDragStart: (loc: DragLocation) => void;
  onDragEnd: () => void;
  onDrop: (source: DragLocation, target: DragLocation) => void;
}

/**
 * 可编辑的对阵卡片组件
 * 单一职责：展示单场比赛对阵信息，并集成拖拽功能与操作按钮
 */
export const EditableMatchCard = ({
  matchId,
  dragSource,
  onDragStart,
  onDragEnd,
  onDrop,
}: EditableMatchCardProps) => {
  const matches = useDebateStore((s) => s.matches);
  const getTeamById = useDebateStore((s) => s.getTeamById);
  const getTopicById = useDebateStore((s) => s.getTopicById);
  const getJudgeById = useDebateStore((s) => s.getJudgeById);
  const checkMatchConflicts = useDebateStore((s) => s.checkMatchConflicts);
  const swapMatchSidesInMatch = useDebateStore((s) => s.swapMatchSidesInMatch);
  const autoReassignJudges = useDebateStore((s) => s.autoReassignJudges);

  const match = useMemo(
    () => matches.find((m) => m.id === matchId),
    [matches, matchId]
  );

  const proTeam = useMemo(
    () => (match ? getTeamById(match.proTeamId) : undefined),
    [match, getTeamById]
  );

  const conTeam = useMemo(
    () => (match ? getTeamById(match.conTeamId) : undefined),
    [match, getTeamById]
  );

  const topic = useMemo(
    () => (match ? getTopicById(match.topicId) : undefined),
    [match, getTopicById]
  );

  const conflicts = useMemo(
    () => checkMatchConflicts(matchId),
    [matchId, checkMatchConflicts]
  );

  const judgeCount = useMemo(() => {
    if (!match) return 0;
    return match.judgeIds.filter((id) => getJudgeById(id)).length;
  }, [match, getJudgeById]);

  /**
   * 判断当前槽位是否是放置目标
   */
  const isDropTarget = (side: 'pro' | 'con'): boolean => {
    if (!dragSource) return false;
    if (dragSource.matchId === matchId && dragSource.side === side) return false;
    return true;
  };

  /**
   * 处理槽位放置事件
   */
  const handleSlotDrop = (targetSide: 'pro' | 'con', source: DragLocation) => {
    onDrop(source, { matchId, side: targetSide });
  };

  if (!match) {
    return (
      <div className="card p-5">
        <div className="text-navy-500 text-sm text-center py-8">比赛数据加载中...</div>
      </div>
    );
  }

  const canEdit = match.status === 'pending';

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="badge-gold">第{match.round}轮</span>
          <span className="text-xs font-medium text-navy-500">#{match.matchNumber}</span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => swapMatchSidesInMatch(matchId)}
              className="p-1.5 rounded-md text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors"
              title="交换正反方立场"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => autoReassignJudges(matchId)}
              className="p-1.5 rounded-md text-navy-400 hover:text-gold-600 hover:bg-gold-50 transition-colors"
              title="自动重新分配评委（避开回避关系）"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {topic && (
        <div className="mb-4">
          <div className="flex items-start gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-gold-500 mt-0.5 flex-shrink-0" />
            <p className="font-serif text-sm font-semibold text-navy-900 leading-snug line-clamp-2">
              {topic.title}
            </p>
          </div>
        </div>
      )}

      <div className="relative flex items-stretch gap-2 mb-4">
        <div className="flex-1">
          <DraggableTeamSlot
            team={proTeam}
            side="pro"
            matchId={matchId}
            isDropTarget={canEdit && isDropTarget('pro')}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDrop={(source) => handleSlotDrop('pro', source)}
          />
        </div>

        <div className="relative flex items-center justify-center px-1">
          <div className="absolute inset-y-3 left-1/2 w-px bg-gradient-to-b from-transparent via-gold-400 to-transparent" />
          <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-gold text-white shadow-md">
            <Swords className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1">
          <DraggableTeamSlot
            team={conTeam}
            side="con"
            matchId={matchId}
            isDropTarget={canEdit && isDropTarget('con')}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDrop={(source) => handleSlotDrop('con', source)}
          />
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50/70 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
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
      )}

      <div className="pt-3 border-t border-navy-100 flex items-center justify-between text-xs text-navy-500">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span>{judgeCount} 位评委</span>
        </div>
        {canEdit && (
          <span className="text-navy-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              拖拽队伍可调整对阵
            </span>
          </span>
        )}
      </div>
    </div>
  );
};
