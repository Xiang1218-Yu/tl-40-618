import { useMemo, useState } from 'react';
import { GripVertical, Swords, AlertTriangle, MoveRight } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import type { MatchPairing } from '@/types';

/**
 * 拖拽载荷类型：
 * 描述一次拖拽中被抓起的「某场比赛-某一方位」的队伍卡片
 */
interface DragPayload {
  matchId: string;
  side: 'pro' | 'con';
}

/**
 * 单个队伍方位卡片：作为拖拽源 + 释放目标
 * 单一职责：仅负责渲染一方队伍并响应原生 HTML5 拖拽事件
 */
interface TeamSlotProps {
  matchId: string;
  side: 'pro' | 'con';
  teamName: string;
  institution: string;
  disabled: boolean;
  isDraggingOver: boolean;
  onDragStart: (payload: DragPayload) => void;
  onDragEnd: () => void;
  onDragOverSlot: (payload: DragPayload) => void;
  onDropToSlot: (payload: DragPayload) => void;
  onLeaveSlot: () => void;
}

const TeamSlot = ({
  matchId,
  side,
  teamName,
  institution,
  disabled,
  isDraggingOver,
  onDragStart,
  onDragEnd,
  onDragOverSlot,
  onDropToSlot,
  onLeaveSlot,
}: TeamSlotProps) => {
  // 颜色随方位自适应
  const colorClass =
    side === 'pro'
      ? 'border-emerald-200 bg-emerald-50/60 hover:border-emerald-400'
      : 'border-red-200 bg-red-50/60 hover:border-red-400';
  const labelClass = side === 'pro' ? 'text-emerald-700' : 'text-red-600';

  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => {
        if (disabled) return;
        // 写入数据用于跨浏览器兼容
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', `${matchId}:${side}`);
        onDragStart({ matchId, side });
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOverSlot({ matchId, side });
      }}
      onDragLeave={onLeaveSlot}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        onDropToSlot({ matchId, side });
      }}
      className={[
        'flex-1 rounded-lg border-2 p-3 transition-all select-none',
        colorClass,
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
        isDraggingOver ? 'ring-2 ring-gold-400 ring-offset-1 scale-[1.02]' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <GripVertical className="w-3 h-3 text-navy-400" />
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${labelClass}`}>
          {side === 'pro' ? '正方 PRO' : '反方 CON'}
        </span>
      </div>
      <div className="font-serif font-bold text-navy-900 text-sm leading-tight line-clamp-1">
        {teamName || '待定'}
      </div>
      <div className="text-[11px] text-navy-500 mt-0.5 line-clamp-1">{institution}</div>
    </div>
  );
};

/**
 * 拖拽式对阵列表
 * 单一职责：在指定轮次内，把「自动生成」后的对阵以可拖拽卡片方式展示，
 *           允许用户通过拖动队伍卡片完成对阵微调；不负责生成对阵或评分逻辑。
 */
interface DraggableMatchListProps {
  matches: MatchPairing[];
}

export const DraggableMatchList = ({ matches }: DraggableMatchListProps) => {
  const getTeamById = useDebateStore((s) => s.getTeamById);
  const swapMatchTeams = useDebateStore((s) => s.swapMatchTeams);
  const checkMatchConflicts = useDebateStore((s) => s.checkMatchConflicts);

  // 当前正在拖拽的源 + 当前 hover 目标，用于 UI 高亮
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DragPayload | null>(null);

  // 对每场比赛预计算冲突，便于内联展示
  const conflictMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof checkMatchConflicts>>();
    matches.forEach((m) => {
      map.set(m.id, checkMatchConflicts(m.id));
    });
    return map;
  }, [matches, checkMatchConflicts]);

  // 拖拽生命周期：开始 / 结束 / hover / 释放
  const handleDragStart = (payload: DragPayload) => setDragging(payload);
  const handleDragEnd = () => {
    setDragging(null);
    setHoverTarget(null);
  };
  const handleDragOverSlot = (payload: DragPayload) => setHoverTarget(payload);
  const handleLeaveSlot = () => setHoverTarget(null);

  const handleDrop = (target: DragPayload) => {
    if (!dragging) return;
    // 调用 store 完成实际队伍互换
    swapMatchTeams(dragging.matchId, dragging.side, target.matchId, target.side);
    setDragging(null);
    setHoverTarget(null);
  };

  if (matches.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* 操作提示条：让用户知道可以拖拽 */}
      <div className="flex items-center gap-2 rounded-lg border border-gold-200 bg-gold-50/60 px-3 py-2 text-xs text-navy-700">
        <MoveRight className="w-3.5 h-3.5 text-gold-600" />
        <span>
          支持拖拽微调：将任一方队伍卡片拖到其它对阵的任意方位即可交换。仅「待开始」的比赛可调整。
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map((m) => {
          const pro = getTeamById(m.proTeamId);
          const con = getTeamById(m.conTeamId);
          const conflicts = conflictMap.get(m.id) ?? [];
          const disabled = m.status !== 'pending';

          return (
            <div
              key={m.id}
              className={[
                'card p-4 transition-all',
                disabled ? 'opacity-80' : '',
                dragging && dragging.matchId === m.id ? 'ring-1 ring-gold-300' : '',
              ].join(' ')}
            >
              {/* 对阵基本信息 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="badge-gold">第{m.round}轮</span>
                  <span className="text-xs font-medium text-navy-500">#{m.matchNumber}</span>
                </div>
                {disabled && (
                  <span className="text-[11px] text-navy-400">已开始/结束，不可拖拽</span>
                )}
              </div>

              {/* 双方队伍卡片：可拖拽 */}
              <div className="relative flex items-stretch gap-2">
                <TeamSlot
                  matchId={m.id}
                  side="pro"
                  teamName={pro?.name ?? ''}
                  institution={pro?.institution ?? ''}
                  disabled={disabled}
                  isDraggingOver={
                    !!hoverTarget && hoverTarget.matchId === m.id && hoverTarget.side === 'pro'
                  }
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOverSlot={handleDragOverSlot}
                  onDropToSlot={handleDrop}
                  onLeaveSlot={handleLeaveSlot}
                />

                <div className="relative flex items-center justify-center px-1">
                  <div className="relative z-10 flex items-center justify-center w-9 h-9 rounded-full bg-gradient-gold text-white shadow-md">
                    <Swords className="w-3.5 h-3.5" />
                  </div>
                </div>

                <TeamSlot
                  matchId={m.id}
                  side="con"
                  teamName={con?.name ?? ''}
                  institution={con?.institution ?? ''}
                  disabled={disabled}
                  isDraggingOver={
                    !!hoverTarget && hoverTarget.matchId === m.id && hoverTarget.side === 'con'
                  }
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOverSlot={handleDragOverSlot}
                  onDropToSlot={handleDrop}
                  onLeaveSlot={handleLeaveSlot}
                />
              </div>

              {/* 拖拽后实时显示回避冲突，便于用户即刻校验 */}
              {conflicts.length > 0 && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50/70 p-2">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-red-700 mb-0.5">回避冲突</p>
                      <ul className="space-y-0.5">
                        {conflicts.map((c, i) => (
                          <li key={i} className="text-[11px] text-red-600 leading-tight">
                            评委「{c.judgeName}」与「{c.teamName}」：{c.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DraggableMatchList;
