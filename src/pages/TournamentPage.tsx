import { useState, useMemo, useCallback } from 'react';
import { useDebateStore } from '@/store/debateStore';
import { MatchCard } from '@/components/cards/MatchCard';
import { EditableMatchCard } from '@/components/tournament/EditableMatchCard';
import type { DragLocation } from '@/components/tournament/DraggableTeamSlot';
import Empty from '@/components/ui/Empty';
import { AlertTriangle, Swords, ListTree, Sparkles, RefreshCw, GripVertical } from 'lucide-react';
import type { DebateFormat, TournamentType, MatchPairing, Team } from '@/types';

const formatOptions: { value: DebateFormat; label: string }[] = [
  { value: 'parliamentary', label: '议会制' },
  { value: 'mandarin', label: '华语' },
  { value: 'moot_court', label: '模拟法庭' },
  { value: 'british_parliamentary', label: 'BP' },
];

const typeOptions: { value: TournamentType; label: string }[] = [
  { value: 'single_elimination', label: '单败淘汰' },
  { value: 'swiss', label: '瑞士制' },
  { value: 'round_robin', label: '循环赛' },
];

/**
 * 冲突告警组件
 * 单一职责：展示单场比赛的回避冲突
 */
const ConflictAlert = ({ matchId }: { matchId: string }) => {
  const checkMatchConflicts = useDebateStore((s) => s.checkMatchConflicts);
  const conflicts = useMemo(() => checkMatchConflicts(matchId), [matchId, checkMatchConflicts]);
  if (conflicts.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50/70 p-3">
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
  );
};

/**
 * 淘汰赛对阵树视图
 * 单一职责：以树形结构展示淘汰赛晋级路径
 */
const BracketView = ({ matches, getTeamById }: {
  matches: MatchPairing[];
  getTeamById: (id: string) => Team | undefined;
}) => {
  const rounds = useMemo(() => {
    const maxR = Math.max(...matches.map((m) => m.round), 1);
    return Array.from({ length: maxR }, (_, i) => i + 1);
  }, [matches]);

  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex gap-8 min-w-max p-4">
        {rounds.map((round) => {
          const roundMatches = matches.filter((m) => m.round === round);
          return (
            <div key={round} className="flex flex-col justify-around gap-6" style={{ minWidth: 260 }}>
              <div className="text-center mb-2">
                <span className="badge-gold">R{round}</span>
              </div>
              <div className="flex flex-col justify-around gap-6 flex-1">
                {roundMatches.map((m) => {
                  const pro = getTeamById(m.proTeamId);
                  const con = getTeamById(m.conTeamId);
                  const won = m.winner;
                  return (
                    <div key={m.id} className="relative card p-3 text-sm">
                      <div className={`rounded-md px-2.5 py-1.5 mb-1 ${won === 'pro' ? 'bg-emerald-50 border border-emerald-200' : won === 'con' ? 'opacity-50' : 'bg-emerald-50/50 border border-emerald-100'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-navy-800 truncate">{pro?.name ?? '待定'}</span>
                          {won === 'pro' && <span className="text-emerald-600 text-xs font-bold">✓</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-center text-gold-500 text-[10px] font-semibold py-0.5">VS</div>
                      <div className={`rounded-md px-2.5 py-1.5 ${won === 'con' ? 'bg-red-50 border border-red-200' : won === 'pro' ? 'opacity-50' : 'bg-red-50/50 border border-red-100'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-navy-800 truncate">{con?.name ?? '待定'}</span>
                          {won === 'con' && <span className="text-red-600 text-xs font-bold">✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function TournamentPage() {
  const tournament = useDebateStore((s) => s.tournament);
  const matches = useDebateStore((s) => s.matches);
  const updateTournament = useDebateStore((s) => s.updateTournament);
  const regenerateAllMatches = useDebateStore((s) => s.regenerateAllMatches);
  const generateNextRound = useDebateStore((s) => s.generateNextRound);
  const isCurrentRoundFinished = useDebateStore((s) => s.isCurrentRoundFinished);
  const getTeamById = useDebateStore((s) => s.getTeamById);
  const getMatchesByRound = useDebateStore((s) => s.getMatchesByRound);
  const swapTeamsBetweenMatches = useDebateStore((s) => s.swapTeamsBetweenMatches);
  const swapMatchSidesInMatch = useDebateStore((s) => s.swapMatchSidesInMatch);

  const [activeRound, setActiveRound] = useState<number>(tournament.currentRound);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('list');
  const [editMode, setEditMode] = useState(true);
  const [dragSource, setDragSource] = useState<DragLocation | null>(null);

  const totalRounds = tournament.totalRounds;
  const roundList = useMemo(
    () => Array.from({ length: totalRounds }, (_, i) => i + 1),
    [totalRounds]
  );
  const roundMatches = getMatchesByRound(activeRound);
  const canGenerateNext = useMemo(() => {
    if (tournament.currentRound >= totalRounds) return false;
    return isCurrentRoundFinished();
  }, [tournament.currentRound, totalRounds, isCurrentRoundFinished]);

  const isSingleElim = tournament.type === 'single_elimination';

  /**
   * 处理拖拽开始
   */
  const handleDragStart = useCallback((loc: DragLocation) => {
    setDragSource(loc);
  }, []);

  /**
   * 处理拖拽结束
   */
  const handleDragEnd = useCallback(() => {
    setDragSource(null);
  }, []);

  /**
   * 处理队伍放置（交换对阵）
   */
  const handleDrop = useCallback((source: DragLocation, target: DragLocation) => {
    setDragSource(null);

    // 同一场比赛内交换正反方
    if (source.matchId === target.matchId) {
      if (source.side !== target.side) {
        swapMatchSidesInMatch(source.matchId);
      }
      return;
    }

    // 跨比赛交换队伍
    swapTeamsBetweenMatches(
      source.matchId,
      target.matchId,
      source.side,
      target.side
    );
  }, [swapTeamsBetweenMatches, swapMatchSidesInMatch]);

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-serif text-xl font-bold text-navy-900 flex items-center gap-2">
              <Swords className="w-5 h-5 text-gold-500" />
              赛制编排
            </h2>
            <p className="text-sm text-navy-500 mt-0.5">配置赛事参数并自动生成对阵，支持拖拽微调</p>
          </div>
          <div className="flex items-center gap-2">
            {!isSingleElim && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  editMode
                    ? 'bg-gold-100 text-gold-700 border border-gold-200'
                    : 'bg-navy-50 text-navy-600 border border-navy-200'
                }`}
              >
                <GripVertical className="w-3.5 h-3.5" />
                {editMode ? '微调模式（开）' : '微调模式（关）'}
              </button>
            )}
            {isSingleElim && (
              <div className="flex items-center gap-1 rounded-lg bg-navy-50 p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-navy-900' : 'text-navy-500 hover:text-navy-700'}`}
                >
                  <ListTree className="w-3.5 h-3.5 inline mr-1" />列表视图
                </button>
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'tree' ? 'bg-white shadow-sm text-navy-900' : 'text-navy-500 hover:text-navy-700'}`}
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1" />对阵树视图
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label-base">赛事名称</label>
            <input
              type="text"
              value={tournament.name}
              onChange={(e) => updateTournament({ name: e.target.value })}
              placeholder="请输入赛事名称"
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">辩论类型</label>
            <select
              value={tournament.format}
              onChange={(e) => updateTournament({ format: e.target.value as DebateFormat })}
              className="input-base"
            >
              {formatOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">赛制类型</label>
            <select
              value={tournament.type}
              onChange={(e) => updateTournament({ type: e.target.value as TournamentType })}
              className="input-base"
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">总轮次</label>
            <input
              type="number"
              min={1}
              max={20}
              value={tournament.totalRounds}
              onChange={(e) => updateTournament({ totalRounds: Math.max(1, parseInt(e.target.value) || 1) })}
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">每场评委数</label>
            <input
              type="number"
              min={1}
              max={9}
              value={tournament.judgesPerMatch}
              onChange={(e) => updateTournament({ judgesPerMatch: Math.max(1, parseInt(e.target.value) || 1) })}
              className="input-base"
            />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={regenerateAllMatches} className="btn-gold flex-1">
              <Sparkles className="w-4 h-4" />
              应用配置并生成对阵
            </button>
          </div>
        </div>

        {editMode && !isSingleElim && roundMatches.length > 0 && (
          <div className="mb-4 rounded-lg bg-emerald-50/70 border border-emerald-200 p-3">
            <div className="flex items-start gap-2">
              <GripVertical className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-emerald-700">拖拽微调模式已开启</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  拖拽队伍卡片可在不同场次间交换队伍位置；同一场次内拖拽可交换正反方立场；点击 ↔ 按钮也可快速交换立场；点击 ↻ 按钮自动重新分配评委
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-navy-100">
          <button
            onClick={generateNextRound}
            disabled={!canGenerateNext}
            className="btn-primary"
          >
            <RefreshCw className="w-4 h-4" />
            一键生成下一轮
          </button>
          <span className="ml-3 text-xs text-navy-400">
            当前进度：第 {tournament.currentRound} / {totalRounds} 轮
            {!canGenerateNext && tournament.currentRound < totalRounds && '（当前轮未结束）'}
          </span>
        </div>
      </div>

      {matches.length === 0 ? (
        <Empty
          title="暂无对阵数据"
          description="请先配置赛制参数并点击「应用配置并生成对阵」按钮"
        />
      ) : (
        <>
          <div className="flex items-center gap-1 border-b border-navy-200 overflow-x-auto">
            {roundList.map((r) => (
              <button
                key={r}
                onClick={() => setActiveRound(r)}
                className={`px-5 py-3 text-sm font-medium transition-all whitespace-nowrap relative ${
                  activeRound === r
                    ? 'text-gold-600 font-semibold'
                    : 'text-navy-500 hover:text-navy-800'
                }`}
              >
                R{r}
                {activeRound === r && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-gold rounded-t" />
                )}
              </button>
            ))}
          </div>

          <div>
            {isSingleElim && viewMode === 'tree' ? (
              <BracketView matches={matches} getTeamById={getTeamById} />
            ) : roundMatches.length === 0 ? (
              <Empty title="本轮暂无对阵" description={`第${activeRound}轮尚未生成对阵`} />
            ) : editMode && !isSingleElim ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fade-in">
                {roundMatches.map((m) => (
                  <EditableMatchCard
                    key={m.id}
                    matchId={m.id}
                    dragSource={dragSource}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fade-in">
                {roundMatches.map((m) => (
                  <div key={m.id}>
                    <MatchCard matchId={m.id} />
                    <ConflictAlert matchId={m.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
