import { Link } from 'react-router-dom';
import { Timer, Play, CheckCircle2, Trophy, Users } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import { cn } from '@/lib/utils';

export default function LiveMatchListPage() {
  const store = useDebateStore();
  const matches = store.matches;

  const ongoing = matches.filter((m) => m.status === 'ongoing');
  const scheduled = matches.filter((m) => m.status === 'pending');
  const finished = matches.filter((m) => m.status === 'finished');

  const statusLabel: Record<string, { text: string; color: string }> = {
    pending: { text: '未开始', color: 'bg-navy-100 text-navy-600' },
    ongoing: { text: '进行中', color: 'bg-emerald-100 text-emerald-700' },
    finished: { text: '已结束', color: 'bg-navy-50 text-navy-400' },
  };

  const renderMatch = (match: typeof matches[0]) => {
    const proTeam = store.getTeamById(match.proTeamId);
    const conTeam = store.getTeamById(match.conTeamId);
    const topic = store.getTopicById(match.topicId);
    const st = statusLabel[match.status] ?? statusLabel.pending;
    const judgeScores = store.judgeScoresByMatch[match.id] ?? [];

    return (
      <Link
        key={match.id}
        to={`/live/${match.id}`}
        className={cn(
          'card p-5 hover:shadow-card-hover transition-all group cursor-pointer',
          match.status === 'ongoing' && 'ring-2 ring-emerald-200'
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold', st.color)}>
              {st.text}
            </span>
            <span className="text-xs text-navy-500">
              第 {match.round} 轮 · 场次 {match.matchNumber}
            </span>
          </div>
          {match.status === 'ongoing' && (
            <Play className="w-5 h-5 text-emerald-500 animate-pulse" />
          )}
          {match.status === 'finished' && (
            <CheckCircle2 className="w-5 h-5 text-navy-300" />
          )}
        </div>

        {topic && (
          <p className="font-serif font-bold text-navy-900 text-sm mb-2 line-clamp-1">
            {topic.title}
          </p>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-lg bg-navy-50/60 px-3 py-2 text-center">
            <p className="text-xs text-navy-500">正方</p>
            <p className="font-serif font-bold text-navy-900 text-sm">{proTeam?.name ?? '—'}</p>
          </div>
          <span className="text-xs text-navy-400 font-bold">VS</span>
          <div className="flex-1 rounded-lg bg-gold-50/60 px-3 py-2 text-center">
            <p className="text-xs text-gold-700">反方</p>
            <p className="font-serif font-bold text-navy-900 text-sm">{conTeam?.name ?? '—'}</p>
          </div>
        </div>

        {match.status !== 'pending' && (
          <div className="flex items-center gap-4 mt-3 text-xs text-navy-500">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {match.judgeIds.length} 位评委
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {judgeScores.length} 已提交
            </span>
          </div>
        )}
      </Link>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-navy flex items-center justify-center shadow-card">
          <Timer className="w-5 h-5 text-gold-200" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy-900">比赛现场</h1>
          <p className="text-sm text-navy-500">查看所有比赛状态，进入实时计时与评分</p>
        </div>
      </div>

      {ongoing.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 mb-4 font-serif text-lg font-bold text-navy-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            进行中 ({ongoing.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ongoing.map(renderMatch)}
          </div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 mb-4 font-serif text-lg font-bold text-navy-900">
            <span className="w-2 h-2 rounded-full bg-navy-400" />
            未开始 ({scheduled.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduled.map(renderMatch)}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 mb-4 font-serif text-lg font-bold text-navy-900">
            <span className="w-2 h-2 rounded-full bg-navy-300" />
            已结束 ({finished.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {finished.map(renderMatch)}
          </div>
        </section>
      )}

      {matches.length === 0 && (
        <div className="card p-16 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-navy-200" />
          <p className="font-serif text-xl text-navy-400">暂无比赛</p>
          <p className="text-sm text-navy-400 mt-2">请先在「赛制编排」中生成对阵表</p>
        </div>
      )}
    </div>
  );
}
