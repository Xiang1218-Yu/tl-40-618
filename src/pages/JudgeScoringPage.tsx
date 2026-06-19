import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Award, MessageSquare, CheckCircle2, Users, ChevronDown,
  Sparkles, Send, Scale, Trophy, User, Scroll,
  ArrowLeft, Crown,
} from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import { FORMAT_RULES } from '@/engines/formatRules';
import { BP_ROLE_LABELS, isBPFormat } from '@/engines/scoringEngine';
import type { JudgeScore, PlayerScore, Player, BPRole, Team, ScoringCriterion } from '@/types';
import { cn } from '@/lib/utils';

const QUICK_COMMENTS = ['论点清晰', '反应敏捷', '论据不足', '表达流畅', '台风稳健', '逻辑严密', '反驳有力', '配合默契'];
const BP_ROLES: BPRole[] = ['og', 'oo', 'cg', 'co'];
const BP_ROLE_COLORS: Record<BPRole, string> = {
  og: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  oo: 'bg-red-50 border-red-300 text-red-800',
  cg: 'bg-teal-50 border-teal-300 text-teal-800',
  co: 'bg-orange-50 border-orange-300 text-orange-800',
};
const BP_ROLE_GRADIENT: Record<BPRole, string> = {
  og: 'bg-gradient-to-r from-emerald-600 to-emerald-500',
  oo: 'bg-gradient-to-r from-red-600 to-red-500',
  cg: 'bg-gradient-to-r from-teal-600 to-teal-500',
  co: 'bg-gradient-to-r from-orange-600 to-orange-500',
};

export default function JudgeScoringPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [searchParams] = useSearchParams();
  const urlJudgeId = searchParams.get('j');

  const store = useDebateStore();
  const match = store.matches.find((m) => m.id === matchId);
  const proTeam = match ? store.getTeamById(match.proTeamId) : undefined;
  const conTeam = match ? store.getTeamById(match.conTeamId) : undefined;
  const topic = match ? store.getTopicById(match.topicId) : undefined;
  const rules = FORMAT_RULES[store.tournament.format];
  const criteria = rules.scoringCriteria;
  const isBP = isBPFormat(store.tournament.format) && !!match?.bpTeams;

  const bpTeamData = useMemo(() => {
    if (!isBP || !match?.bpTeams) return null;
    const result: Record<BPRole, { team: typeof proTeam; players: Player[] }> = {
      og: { team: undefined, players: [] },
      oo: { team: undefined, players: [] },
      cg: { team: undefined, players: [] },
      co: { team: undefined, players: [] },
    };
    BP_ROLES.forEach((role) => {
      const team = store.getTeamById(match.bpTeams![role]);
      result[role] = { team, players: team?.players ?? [] };
    });
    return result;
  }, [isBP, match, store]);

  const eligibleJudges = useMemo(
    () => (match ? match.judgeIds.map((id) => store.getJudgeById(id)).filter(Boolean) : []),
    [match, store]
  );

  const [selectedJudgeId, setSelectedJudgeId] = useState<string>(urlJudgeId ?? '');
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeSide, setActiveSide] = useState<'pro' | 'con'>('pro');
  const [activeBPRole, setActiveBPRole] = useState<BPRole>('og');
  const [activePlayerIdx, setActivePlayerIdx] = useState<Record<string, number>>({ pro: 0, con: 0 });

  const judgeId = selectedJudgeId || urlJudgeId || '';
  const judge = judgeId ? store.getJudgeById(judgeId) : undefined;
  const baseScore: JudgeScore = useMemo(
    () => (matchId && judgeId ? store.getOrCreateJudgeScore(matchId, judgeId) : ({} as JudgeScore)),
    [matchId, judgeId, store]
  );
  const [score, setScore] = useState<JudgeScore>(baseScore);

  const proPlayers = proTeam?.players ?? [];
  const conPlayers = conTeam?.players ?? [];

  const updateTeamScore = (side: 'pro' | 'con', v: number) =>
    setScore((s) => ({ ...s, [side === 'pro' ? 'proTeamScore' : 'conTeamScore']: v }));

  const updateBPTeamScore = (role: BPRole, v: number) =>
    setScore((s) => ({
      ...s,
      fourTeamScores: { ...s.fourTeamScores, [role]: v },
    }));

  const updateBPRanking = (role: BPRole, v: number) =>
    setScore((s) => ({
      ...s,
      fourTeamRankings: { ...s.fourTeamRankings, [role]: v },
    }));

  const updatePlayerScore = (side: 'pro' | 'con', playerId: string, cid: string, v: number) => {
    setScore((s) => {
      const key = side === 'pro' ? 'proPlayerScores' : 'conPlayerScores';
      const existing = s[key][playerId] ?? { criteriaScores: {}, total: 0 };
      const criteriaScores = { ...existing.criteriaScores, [cid]: v };
      const total = criteria.reduce((sum, c) => sum + (criteriaScores[c.id] ?? 0) * c.weight, 0);
      return { ...s, [key]: { ...s[key], [playerId]: { criteriaScores, total } } };
    });
  };

  const updateBPPlayerScore = (role: BPRole, playerId: string, cid: string, v: number) => {
    setScore((s) => {
      if (!s.fourTeamPlayerScores) return s;
      const roleScores = s.fourTeamPlayerScores[role] ?? {};
      const existing = roleScores[playerId] ?? { criteriaScores: {}, total: 0 };
      const criteriaScores = { ...existing.criteriaScores, [cid]: v };
      const total = criteria.reduce((sum, c) => sum + (criteriaScores[c.id] ?? 0) * c.weight, 0);
      return {
        ...s,
        fourTeamPlayerScores: {
          ...s.fourTeamPlayerScores,
          [role]: { ...roleScores, [playerId]: { criteriaScores, total } },
        },
      };
    });
  };

  const updateComment = (f: 'pro' | 'con' | 'general', v: string) =>
    setScore((s) => ({ ...s, comments: { ...s.comments, [f]: v } }));

  const appendChip = (f: 'pro' | 'con' | 'general', chip: string) => {
    const cur = score.comments[f] ?? '';
    updateComment(f, cur ? `${cur}${cur.endsWith('。') || cur.endsWith('；') ? '' : '；'}${chip}；` : `${chip}；`);
  };

  const handleSubmit = () => {
    if (!matchId || !judgeId) return;
    store.submitJudgeScore(matchId, judgeId, score);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const canSubmit = !!judgeId && !!matchId;

  if (!match) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="card p-10 text-center text-navy-500">
          <Scale className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>未找到该比赛</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (matchId) {
              window.location.href = `/live/${matchId}`;
            } else {
              window.history.back();
            }
          }}
          className="btn-secondary !px-3 !py-2"
        >
          <ArrowLeft className="w-4 h-4" />返回比赛现场
        </button>
        {isBP && <span className="badge-gold">BP 英国议会制 · 四队评分</span>}
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-gradient-navy rounded-2xl shadow-card-hover px-10 py-8 text-white animate-scale-in">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-3 text-gold-200" />
            <p className="text-xl font-serif font-bold">评分提交成功</p>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-navy-500">
              <Trophy className="w-4 h-4 text-gold-500" />
              <span>第 {match.round} 轮 · 场次 {match.matchNumber}</span>
            </div>
            {!urlJudgeId && (
              <div className="relative w-72">
                <select className="input-base pr-10 appearance-none cursor-pointer" value={selectedJudgeId}
                  onChange={(e) => setSelectedJudgeId(e.target.value)}>
                  <option value="">请选择评委</option>
                  {eligibleJudges.map((j) => (
                    <option key={j.id} value={j.id}>{j.name} · {j.institution}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400 pointer-events-none" />
              </div>
            )}
            {judge && (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-navy flex items-center justify-center shadow-card">
                  <User className="w-5 h-5 text-gold-200" />
                </div>
                <div>
                  <p className="font-serif font-bold text-navy-900 text-lg">{judge.name}</p>
                  <p className="text-xs text-navy-500">{judge.institution}{judge.title ? ` · ${judge.title}` : ''}</p>
                </div>
              </div>
            )}
          </div>
          {topic && (
            <div className="max-w-md text-right">
              <div className="badge-gold mb-2"><Scroll className="w-3 h-3" />辩题</div>
              <p className="font-serif font-bold text-navy-900">{topic.title}</p>
              <p className="text-xs text-navy-500 mt-1">正方：{topic.proSide} / 反方：{topic.conSide}</p>
            </div>
          )}
        </div>

        {isBP && bpTeamData ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {BP_ROLES.map((role) => {
              const data = bpTeamData[role];
              return (
                <div key={role} className={cn('rounded-xl p-3 border', BP_ROLE_COLORS[role])}>
                  <div className="text-xs font-bold mb-1">{BP_ROLE_LABELS[role]}</div>
                  <p className="font-serif font-bold text-sm">{data.team?.name ?? '—'}</p>
                  <p className="text-xs opacity-70">{data.team?.institution ?? ''}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="rounded-xl p-4 bg-navy-50/60 border border-navy-100">
              <div className="flex items-center gap-2 text-xs text-navy-500 mb-1"><Award className="w-3.5 h-3.5" />正方队伍</div>
              <p className="font-serif font-bold text-navy-900">{proTeam?.name}</p>
              <p className="text-xs text-navy-500">{proTeam?.institution}</p>
            </div>
            <div className="rounded-xl p-4 bg-gold-50/60 border border-gold-100">
              <div className="flex items-center gap-2 text-xs text-gold-700 mb-1"><Award className="w-3.5 h-3.5" />反方队伍</div>
              <p className="font-serif font-bold text-navy-900">{conTeam?.name}</p>
              <p className="text-xs text-navy-500">{conTeam?.institution}</p>
            </div>
          </div>
        )}
      </div>

      {isBP ? (
        <BPScoringPanel
          score={score}
          bpTeamData={bpTeamData!}
          criteria={criteria}
          activeBPRole={activeBPRole}
          setActiveBPRole={setActiveBPRole}
          updateBPTeamScore={updateBPTeamScore}
          updateBPRanking={updateBPRanking}
          updateBPPlayerScore={updateBPPlayerScore}
        />
      ) : (
        <StandardScoringPanel
          score={score}
          proPlayers={proPlayers}
          conPlayers={conPlayers}
          criteria={criteria}
          activeSide={activeSide}
          setActiveSide={setActiveSide}
          activePlayerIdx={activePlayerIdx}
          setActivePlayerIdx={setActivePlayerIdx}
          updateTeamScore={updateTeamScore}
          updatePlayerScore={updatePlayerScore}
        />
      )}

      <div className="card p-6 space-y-5">
        <h3 className="flex items-center gap-2 text-navy-900"><MessageSquare className="w-5 h-5 text-gold-500" />评语录入</h3>
        <div className="flex flex-wrap gap-2">
          {QUICK_COMMENTS.map((chip) => (
            <button key={chip} onClick={() => appendChip('general', chip)}
              className="px-3 py-1.5 text-xs rounded-full bg-navy-50 text-navy-700 hover:bg-gold-100 hover:text-gold-800 border border-navy-100 transition-all">
              + {chip}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['pro', 'con', 'general'] as const).map((f) => (
            <div key={f} className="space-y-2">
              <label className="label-base">{f === 'pro' ? '正方评语' : f === 'con' ? '反方评语' : '总评'}</label>
              <textarea rows={5} className="input-base resize-none"
                placeholder={f === 'pro' ? '请输入正方评语...' : f === 'con' ? '请输入反方评语...' : '请输入总体评价...'}
                value={score.comments?.[f] ?? ''} onChange={(e) => updateComment(f, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end sticky bottom-6">
        <button className="btn-gold px-8 py-3 text-base" disabled={!canSubmit} onClick={handleSubmit}>
          <Send className="w-4 h-4" />提交评分
        </button>
      </div>
    </div>
  );
}

function StandardScoringPanel({
  score, proPlayers, conPlayers, criteria, activeSide, setActiveSide,
  activePlayerIdx, setActivePlayerIdx, updateTeamScore, updatePlayerScore,
}: {
  score: JudgeScore;
  proPlayers: Player[];
  conPlayers: Player[];
  criteria: ScoringCriterion[];
  activeSide: 'pro' | 'con';
  setActiveSide: (s: 'pro' | 'con') => void;
  activePlayerIdx: Record<string, number>;
  setActivePlayerIdx: (fn: (s: Record<string, number>) => Record<string, number>) => void;
  updateTeamScore: (side: 'pro' | 'con', v: number) => void;
  updatePlayerScore: (side: 'pro' | 'con', playerId: string, cid: string, v: number) => void;
}) {
  const players = { pro: proPlayers, con: conPlayers };
  const sidePlayers = players[activeSide];
  const curIdx = activePlayerIdx[activeSide] ?? 0;
  const activePlayer = sidePlayers[curIdx];
  const sideScores: Record<string, PlayerScore> = activeSide === 'pro' ? score.proPlayerScores : score.conPlayerScores;
  const activePS = activePlayer ? sideScores[activePlayer.id] : undefined;

  return (
    <>
      <div className="card p-6">
        <h3 className="flex items-center gap-2 mb-5 text-navy-900"><Scale className="w-5 h-5 text-gold-500" />团队评分</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {(['pro', 'con'] as const).map((side) => {
            const v = side === 'pro' ? score.proTeamScore : score.conTeamScore;
            const isNavy = side === 'pro';
            const bg = isNavy ? 'bg-gradient-navy' : 'bg-gradient-gold';
            return (
              <div key={side} className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-serif font-bold text-navy-700">{isNavy ? '正方团队分' : '反方团队分'}</span>
                  <div className={cn('inline-flex items-center justify-center min-w-[72px] px-4 py-1.5 rounded-xl text-sm font-bold text-white shadow-card', bg)}>
                    {v} / 100
                  </div>
                </div>
                <div className="relative pt-2">
                  <input type="range" min={0} max={100} value={v}
                    onChange={(e) => updateTeamScore(side, Number(e.target.value))}
                    className={cn('range-slider', !isNavy && '[&::-webkit-slider-thumb]:!bg-gradient-gold')} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="flex items-center gap-2 mb-4 text-navy-900"><Users className="w-5 h-5 text-gold-500" />选手打分</h3>
        <div className="flex gap-2 mb-5">
          {(['pro', 'con'] as const).map((t) => (
            <button key={t} onClick={() => setActiveSide(t)}
              className={cn('px-5 py-2 rounded-lg font-medium text-sm transition-all',
                activeSide === t
                  ? t === 'pro' ? 'bg-gradient-navy text-white shadow-card' : 'bg-gradient-gold text-white shadow-card'
                  : 'bg-navy-50 text-navy-600 hover:bg-navy-100')}>
              {t === 'pro' ? '正方选手' : '反方选手'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-5">
          {sidePlayers.map((p, idx) => {
            const ps = sideScores[p.id];
            const total = ps?.total ?? 0;
            return (
              <button key={p.id} onClick={() => setActivePlayerIdx((s) => ({ ...s, [activeSide]: idx }))}
                className={cn('px-4 py-2 rounded-lg text-sm transition-all border',
                  curIdx === idx ? 'border-gold-400 bg-gold-50 text-navy-900 font-bold shadow-sm'
                    : 'border-navy-100 bg-white text-navy-600 hover:bg-navy-50')}>
                {p.role} · {p.name}<span className="ml-2 text-xs opacity-70">{total.toFixed(1)}</span>
              </button>
            );
          })}
        </div>
        {activePlayer && (
          <div className="space-y-4 stagger-fade-in">
            <div className="flex items-center justify-between">
              <p className="font-serif font-bold text-navy-900">{activePlayer.role} · {activePlayer.name}</p>
              <div className="badge-gold"><Sparkles className="w-3 h-3" />合计 {(activePS?.total ?? 0).toFixed(1)} 分</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {criteria.map((c) => {
                const v = activePS?.criteriaScores?.[c.id] ?? 0;
                return (
                  <div key={c.id} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-navy-800">{c.name}</p>
                        <p className="text-xs text-navy-500">{c.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-navy-900">{v}<span className="text-xs text-navy-400">/{c.maxScore}</span></p>
                        <p className="text-[10px] text-gold-600 font-medium">权重 {(c.weight * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <input type="range" min={0} max={c.maxScore} value={v}
                      onChange={(e) => updatePlayerScore(activeSide, activePlayer.id, c.id, Number(e.target.value))}
                      className="range-slider" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function BPScoringPanel({
  score, bpTeamData, criteria, activeBPRole, setActiveBPRole,
  updateBPTeamScore, updateBPRanking, updateBPPlayerScore,
}: {
  score: JudgeScore;
  bpTeamData: Record<BPRole, { team: Team | undefined; players: Player[] }>;
  criteria: ScoringCriterion[];
  activeBPRole: BPRole;
  setActiveBPRole: (r: BPRole) => void;
  updateBPTeamScore: (role: BPRole, v: number) => void;
  updateBPRanking: (role: BPRole, v: number) => void;
  updateBPPlayerScore: (role: BPRole, playerId: string, cid: string, v: number) => void;
}) {
  const activePlayers = bpTeamData[activeBPRole]?.players ?? [];
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const activePlayer = activePlayers[activePlayerIdx];
  const activePS = score.fourTeamPlayerScores?.[activeBPRole]?.[activePlayer?.id ?? ''];

  return (
    <>
      <div className="card p-6">
        <h3 className="flex items-center gap-2 mb-5 text-navy-900">
          <Scale className="w-5 h-5 text-gold-500" />四队评分
          <span className="text-xs text-navy-500 font-normal ml-2">为每队打分并排名（1-4名）</span>
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {BP_ROLES.map((role) => {
            const v = score.fourTeamScores?.[role] ?? 0;
            const rank = score.fourTeamRankings?.[role] ?? 0;
            const teamName = bpTeamData[role]?.team?.name ?? '—';
            return (
              <div key={role} className={cn('rounded-xl border-2 p-4 transition-all', BP_ROLE_COLORS[role],
                activeBPRole === role ? 'ring-2 ring-gold-400 ring-offset-2' : '')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold">{BP_ROLE_LABELS[role]}</span>
                  <span className="text-xs opacity-70">{teamName}</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <input type="range" min={0} max={100} value={v}
                    onChange={(e) => updateBPTeamScore(role, Number(e.target.value))}
                    className="range-slider flex-1" />
                  <span className="font-mono text-lg font-bold min-w-[40px] text-right">{v}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-gold-500" />
                  <label className="text-xs text-navy-600">名次</label>
                  <select value={rank} onChange={(e) => updateBPRanking(role, Number(e.target.value))}
                    className="input-base py-1 px-2 text-sm w-20">
                    <option value={1}>第1名</option>
                    <option value={2}>第2名</option>
                    <option value={3}>第3名</option>
                    <option value={4}>第4名</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="flex items-center gap-2 mb-4 text-navy-900"><Users className="w-5 h-5 text-gold-500" />选手打分</h3>
        <div className="flex flex-wrap gap-2 mb-5">
          {BP_ROLES.map((role) => (
            <button key={role} onClick={() => { setActiveBPRole(role); setActivePlayerIdx(0); }}
              className={cn('px-4 py-2 rounded-lg font-medium text-sm transition-all border-2',
                activeBPRole === role
                  ? BP_ROLE_COLORS[role].replace('bg-', 'bg-').replace('border-', 'ring-2 ring-gold-400 ring-offset-1 border-')
                  : 'border-navy-100 bg-white text-navy-600 hover:bg-navy-50')}>
              {BP_ROLE_LABELS[role]}
            </button>
          ))}
        </div>
        {activePlayers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {activePlayers.map((p, idx) => {
              const ps = score.fourTeamPlayerScores?.[activeBPRole]?.[p.id];
              const total = ps?.total ?? 0;
              return (
                <button key={p.id} onClick={() => setActivePlayerIdx(idx)}
                  className={cn('px-3 py-1.5 rounded-lg text-sm transition-all border',
                    activePlayerIdx === idx ? 'border-gold-400 bg-gold-50 text-navy-900 font-bold'
                      : 'border-navy-100 bg-white text-navy-600 hover:bg-navy-50')}>
                  {p.name}<span className="ml-1.5 text-xs opacity-70">{total.toFixed(1)}</span>
                </button>
              );
            })}
          </div>
        )}
        {activePlayer && (
          <div className="space-y-4 stagger-fade-in">
            <div className="flex items-center justify-between">
              <p className="font-serif font-bold text-navy-900">{BP_ROLE_LABELS[activeBPRole]} · {activePlayer.name}</p>
              <div className="badge-gold"><Sparkles className="w-3 h-3" />合计 {(activePS?.total ?? 0).toFixed(1)} 分</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {criteria.map((c) => {
                const v = activePS?.criteriaScores?.[c.id] ?? 0;
                return (
                  <div key={c.id} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-navy-800">{c.name}</p>
                        <p className="text-xs text-navy-500">{c.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-navy-900">{v}<span className="text-xs text-navy-400">/{c.maxScore}</span></p>
                        <p className="text-[10px] text-gold-600 font-medium">权重 {(c.weight * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <input type="range" min={0} max={c.maxScore} value={v}
                      onChange={(e) => updateBPPlayerScore(activeBPRole, activePlayer.id, c.id, Number(e.target.value))}
                      className="range-slider" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
