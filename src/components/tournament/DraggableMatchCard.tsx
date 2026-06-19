import { useMemo } from 'react';
import { GripVertical, Swords, Users, MessageSquare } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import type { MatchPairing } from '@/types';
import { cn } from '@/lib/utils';

/**
 * 队伍槽位 Props
 * 单一职责：仅渲染单个队伍的可拖拽区域
 */
interface TeamSlotProps {
  teamId: string;
  teamName: string;
  institution: string;
  side: 'pro' | 'con';
  matchId: string;
  isDragging: boolean;
  isHovering: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

/**
 * 单个队伍槽位组件
 * 职责：渲染队伍信息 + 拖拽交互样式
 */
function TeamSlot({
  teamName,
  institution,
  side,
  isDragging,
  isHovering,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: TeamSlotProps) {
  const isPro = side === 'pro';
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'relative flex-1 rounded-lg border-2 p-3 cursor-grab active:cursor-grabbing transition-all duration-200 select-none group',
        isPro
          ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 hover:bg-emerald-50'
          : 'border-red-200 bg-red-50/50 hover:border-red-400 hover:bg-red-50',
        isDragging && 'opacity-40 scale-95',
        isHovering && 'ring-2 ring-gold-400 ring-offset-2 scale-105 shadow-lg'
      )}
    >
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 transition-opacity">
        <GripVertical className="w-3.5 h-3.5 text-navy-400" />
      </div>
      <div className={cn('flex items-center gap-1.5 mb-1', !isPro && 'justify-end')}>
        <span className={cn('w-2 h-2 rounded-full', isPro ? 'bg-emerald-500' : 'bg-red-500')} />
        <span className={cn(
          'text-[11px] font-semibold uppercase tracking-wide',
          isPro ? 'text-emerald-700' : 'text-red-600'
        )}>
          {isPro ? '正方 PRO' : '反方 CON'}
        </span>
      </div>
      <div className={cn(
        'font-serif font-bold text-navy-900 text-sm leading-tight line-clamp-1 pl-4',
        !isPro && 'text-right pr-4'
      )}>
        {teamName}
      </div>
      <div className={cn(
        'text-[11px] text-navy-500 mt-0.5 line-clamp-1 pl-4',
        !isPro && 'text-right pr-4'
      )}>
        {institution}
      </div>
    </div>
  );
}

/**
 * 可拖拽比赛卡片 Props
 */
interface DraggableMatchCardProps {
  matchId: string;
  dragHandlers: {
    handleDragStart: (e: React.DragEvent, matchId: string, side: 'pro' | 'con') => void;
    handleDragOver: (e: React.DragEvent, matchId: string, side: 'pro' | 'con') => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent, matchId: string, side: 'pro' | 'con') => void;
    handleDragEnd: () => void;
    isHovering: (matchId: string, side: 'pro' | 'con') => boolean;
    isDragging: (matchId: string, side: 'pro' | 'con') => boolean;
  };
}

/**
 * 可拖拽对阵卡片组件
 * 职责：渲染单场比赛，提供正反方两个拖拽槽位
 * 单一职责：不处理拖拽逻辑本身，由 hook 注入 handlers
 * 注意：始终内置冲突告警显示，便于微调时实时查看回避冲突
 */
export function DraggableMatchCard({
  matchId,
  dragHandlers,
}: DraggableMatchCardProps) {
  const matches = useDebateStore((s) => s.matches);
  const getTeamById = useDebateStore((s) => s.getTeamById);
  const getTopicById = useDebateStore((s) => s.getTopicById);
  const getJudgeById = useDebateStore((s) => s.getJudgeById);
  const checkMatchConflicts = useDebateStore((s) => s.checkMatchConflicts);

  const match = useMemo(
    () => matches.find((m) => m.id === matchId),
    [matches, matchId]
  ) as MatchPairing | undefined;

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

  const judgeCount = useMemo(() => {
    if (!match) return 0;
    return match.judgeIds.filter((id) => getJudgeById(id)).length;
  }, [match, getJudgeById]);

  /**
   * 实时计算冲突，拖拽微调时也能看到告警
   */
  const conflicts = useMemo(
    () => checkMatchConflicts(matchId),
    [matchId, checkMatchConflicts]
  );

  if (!match || !proTeam || !conTeam || !topic) {
    return (
      <div className="card p-5">
        <div className="text-navy-500 text-sm text-center py-8">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="badge-gold">第{match.round}轮</span>
            <span className="text-xs font-medium text-navy-500">#{match.matchNumber}</span>
            <span className="text-[10px] text-navy-400 ml-1 flex items-center gap-1">
              <GripVertical className="w-3 h-3" />拖拽调整
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-navy-500">
            <Users className="w-3.5 h-3.5" />
            <span>{judgeCount} 位评委</span>
          </div>
        </div>

        <div className="mb-3 pb-3 border-b border-navy-100">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-gold-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium text-navy-800 leading-snug line-clamp-1">
              {topic.title}
            </p>
          </div>
        </div>

        <div className="relative flex items-stretch gap-2">
          <TeamSlot
            teamId={proTeam.id}
            teamName={proTeam.name}
            institution={proTeam.institution}
            side="pro"
            matchId={matchId}
            isDragging={dragHandlers.isDragging(matchId, 'pro')}
            isHovering={dragHandlers.isHovering(matchId, 'pro')}
            onDragStart={(e) => dragHandlers.handleDragStart(e, matchId, 'pro')}
            onDragOver={(e) => dragHandlers.handleDragOver(e, matchId, 'pro')}
            onDragLeave={dragHandlers.handleDragLeave}
            onDrop={(e) => dragHandlers.handleDrop(e, matchId, 'pro')}
            onDragEnd={dragHandlers.handleDragEnd}
          />

          <div className="relative flex items-center justify-center px-1">
            <div className="absolute inset-y-3 left-1/2 w-px bg-gradient-to-b from-transparent via-gold-400 to-transparent" />
            <div className="relative z-10 flex items-center justify-center w-9 h-9 rounded-full bg-gradient-gold text-white shadow-md">
              <Swords className="w-4 h-4" />
            </div>
          </div>

          <TeamSlot
            teamId={conTeam.id}
            teamName={conTeam.name}
            institution={conTeam.institution}
            side="con"
            matchId={matchId}
            isDragging={dragHandlers.isDragging(matchId, 'con')}
            isHovering={dragHandlers.isHovering(matchId, 'con')}
            onDragStart={(e) => dragHandlers.handleDragStart(e, matchId, 'con')}
            onDragOver={(e) => dragHandlers.handleDragOver(e, matchId, 'con')}
            onDragLeave={dragHandlers.handleDragLeave}
            onDrop={(e) => dragHandlers.handleDrop(e, matchId, 'con')}
            onDragEnd={dragHandlers.handleDragEnd}
          />
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50/70 p-3">
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
      )}
    </div>
  );
}
