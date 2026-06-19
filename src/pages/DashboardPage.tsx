import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Gavel,
  Swords,
  Trophy,
  Shuffle,
  ChevronRight,
  UserPlus,
  Hammer,
  Scale,
  Clock,
  Medal,
} from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import StatCard from '@/components/ui/StatCard';
import MatchCard from '@/components/cards/MatchCard';
import type { MatchStatus, TournamentType } from '@/types';

const typeLabels: Record<TournamentType, string> = {
  single_elimination: '单败淘汰赛',
  round_robin: '循环赛',
  swiss: '瑞士轮',
};

function StatusBadge({ status }: { status: MatchStatus }) {
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
        <span className="badge-gold animate-pulse-slow">
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
  }
}

function formatTime(ts?: number) {
  if (!ts) return '待定';
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const teams = useDebateStore((s) => s.teams);
  const judges = useDebateStore((s) => s.judges);
  const matches = useDebateStore((s) => s.matches);
  const tournament = useDebateStore((s) => s.tournament);
  const regenerateAllMatches = useDebateStore((s) => s.regenerateAllMatches);
  const generateNextRound = useDebateStore((s) => s.generateNextRound);
  const isCurrentRoundFinished = useDebateStore((s) => s.isCurrentRoundFinished);
  const getCurrentRoundMatches = useDebateStore((s) => s.getCurrentRoundMatches);
  const getTeamById = useDebateStore((s) => s.getTeamById);

  const validTeams = useMemo(() => teams.filter((t) => !t.id.startsWith('__')), [teams]);
  const finishedCount = useMemo(() => matches.filter((m) => m.status === 'finished').length, [matches]);
  const currentMatches = useMemo(() => getCurrentRoundMatches(), [matches, tournament.currentRound]);
  const todayMatches = useMemo(() => {
    return matches
      .filter((m) => m.status !== 'finished')
      .sort((a, b) => (a.startedAt ?? 0) - (a.round * 10000) - ((b.startedAt ?? 0) - (b.round * 10000)))
      .slice(0, 8);
  }, [matches]);
  const canNextRound = isCurrentRoundFinished();

  return (
    <div className="space-y-6 stagger-fade-in">
      <div className="card-navy p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-gold-400/10 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-gold-400/10 translate-y-1/2 -translate-x-1/4" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-gold shadow-lg">
              <Medal className="h-8 w-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="badge bg-gold-400/20 text-gold-200 ring-1 ring-gold-300/30">
                  {typeLabels[tournament.type]}
                </span>
                <span className="badge bg-white/10 text-gold-100 ring-1 ring-white/10">
                  {tournament.totalRounds} 轮 · {tournament.judgesPerMatch} 评委
                </span>
              </div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-white leading-tight truncate">
                {tournament.name}
              </h1>
              {tournament.description && (
                <p className="mt-2 text-sm text-white/70 max-w-2xl line-clamp-2">
                  {tournament.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-white/80 shrink-0">
            <Clock className="w-5 h-5 text-gold-300" />
            <span className="text-sm">
              当前进度：第 <span className="font-bold text-gold-300">{tournament.currentRound}</span> 轮
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="参赛队伍" value={validTeams.length} color="navy" icon={<Users className="h-6 w-6" />} trend="本赛季注册" />
        <StatCard title="评委团" value={judges.length} color="gold" icon={<Gavel className="h-6 w-6" />} trend="专业评审" />
        <StatCard title="总比赛数" value={matches.length} color="emerald" icon={<Swords className="h-6 w-6" />} trend="赛程安排" />
        <StatCard title="已完成" value={finishedCount} color="red" icon={<Trophy className="h-6 w-6" />} trend={matches.length > 0 ? `${Math.round((finishedCount / matches.length) * 100)}% 完成率` : undefined} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={regenerateAllMatches} disabled={validTeams.length < 2} className="btn-gold">
          <Shuffle className="w-4 h-4" />生成对阵表
        </button>
        <button onClick={generateNextRound} disabled={!canNextRound || tournament.currentRound >= tournament.totalRounds} className="btn-primary">
          <ChevronRight className="w-4 h-4" />进入下一轮
        </button>
        <button onClick={() => navigate('/teams')} className="btn-secondary">
          <UserPlus className="w-4 h-4" />新增队伍
        </button>
        <button onClick={() => navigate('/judges')} className="btn-secondary">
          <Hammer className="w-4 h-4" />添加评委
        </button>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-serif text-xl font-bold text-navy-900 flex items-center gap-2">
              <Swords className="w-5 h-5 text-gold-500" />当前轮次概览
            </h2>
            <p className="mt-1 text-sm text-navy-500">
              第 <span className="font-semibold text-navy-800">{tournament.currentRound}</span> 轮 / 共{' '}
              <span className="font-semibold text-navy-800">{tournament.totalRounds}</span> 轮 · {currentMatches.length} 场
            </p>
          </div>
          {canNextRound && tournament.currentRound < tournament.totalRounds && (
            <button onClick={generateNextRound} className="btn-gold text-sm py-2 px-4">
              <ChevronRight className="w-4 h-4" />推进下一轮
            </button>
          )}
        </div>
        {currentMatches.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {currentMatches.map((m) => <MatchCard key={m.id} matchId={m.id} />)}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-navy-50 text-navy-400 mb-3">
              <Shuffle className="w-8 h-8" />
            </div>
            <p className="font-serif text-navy-700 font-medium mb-1">暂无当前轮次比赛</p>
            <p className="text-sm text-navy-500 mb-4">点击按钮生成对阵表开始赛事</p>
            <button onClick={regenerateAllMatches} disabled={validTeams.length < 2} className="btn-gold text-sm">
              <Shuffle className="w-4 h-4" />生成对阵表
            </button>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-serif text-xl font-bold text-navy-900 flex items-center gap-2 mb-5">
          <Clock className="w-5 h-5 text-gold-500" />今日赛程时间线
        </h2>
        {todayMatches.length > 0 ? (
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-gold-300 via-navy-200 to-transparent" />
            {todayMatches.map((m, idx) => {
              const pro = getTeamById(m.proTeamId);
              const con = getTeamById(m.conTeamId);
              return (
                <div key={m.id} className="relative animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className={`absolute -left-[1px] top-3 w-[15px] h-[15px] rounded-full border-2 border-white shadow-sm ${m.status === 'ongoing' ? 'bg-gradient-gold animate-pulse-slow' : m.status === 'finished' ? 'bg-emerald-500' : 'bg-navy-300'}`} />
                  <div className="card p-4 hover:border-gold-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono font-semibold text-navy-600 bg-navy-50 px-2.5 py-1 rounded-lg">{formatTime(m.startedAt)}</span>
                        <span className="badge-gold text-[11px]">第{m.round}轮 · #{m.matchNumber}</span>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-emerald-700 truncate">正方：{pro?.name ?? '轮空'}</p>
                        <p className="text-[11px] text-navy-400 truncate">{pro?.institution}</p>
                      </div>
                      <div className="flex-shrink-0 px-2 py-1 rounded-full bg-gradient-gold text-white text-xs font-bold">VS</div>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-sm font-medium text-red-600 truncate">反方：{con?.name ?? '轮空'}</p>
                        <p className="text-[11px] text-navy-400 truncate">{con?.institution}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ivory-100 text-navy-400 mb-3">
              <Clock className="w-8 h-8" />
            </div>
            <p className="font-serif text-navy-700 font-medium mb-1">今日暂无赛程</p>
            <p className="text-sm text-navy-500">生成对阵表后将自动显示赛程安排</p>
          </div>
        )}
      </div>
    </div>
  );
}
