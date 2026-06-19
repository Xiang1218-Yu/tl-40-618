import { Link } from 'react-router-dom';
import { Award, Users, ChevronRight, Scale } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import { cn } from '@/lib/utils';

export default function JudgeScoringListPage() {
  const store = useDebateStore();
  const judges = store.judges;
  const matches = store.matches.filter((m) => m.status === 'ongoing' || m.status === 'finished');

  if (judges.length === 0) {
    return (
      <div className="card p-16 text-center">
        <Scale className="w-16 h-16 mx-auto mb-4 text-navy-200" />
        <p className="font-serif text-xl text-navy-400">暂无评委</p>
        <p className="text-sm text-navy-400 mt-2">请先在「评委管理」中添加评委</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="card p-16 text-center">
        <Scale className="w-16 h-16 mx-auto mb-4 text-navy-200" />
        <p className="font-serif text-xl text-navy-400">暂无可评分的比赛</p>
        <p className="text-sm text-navy-400 mt-2">比赛开始后即可进行评分</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-navy flex items-center justify-center shadow-card">
          <Award className="w-5 h-5 text-gold-200" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy-900">评委打分</h1>
          <p className="text-sm text-navy-500">选择比赛和评委，进入评分面板</p>
        </div>
      </div>

      {matches.map((match) => {
        const proTeam = store.getTeamById(match.proTeamId);
        const conTeam = store.getTeamById(match.conTeamId);
        const topic = store.getTopicById(match.topicId);
        const matchJudges = match.judgeIds
          .map((id) => store.getJudgeById(id))
          .filter(Boolean);
        const judgeScores = store.judgeScoresByMatch[match.id] ?? [];
        const submittedIds = new Set(judgeScores.map((js) => js.judgeId));

        return (
          <div key={match.id} className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-bold',
                    match.status === 'ongoing'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-navy-50 text-navy-400'
                  )}>
                    {match.status === 'ongoing' ? '进行中' : '已结束'}
                  </span>
                  <span className="text-xs text-navy-500">
                    第 {match.round} 轮 · 场次 {match.matchNumber}
                  </span>
                </div>
                {topic && (
                  <p className="font-serif font-bold text-navy-900">{topic.title}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 rounded-lg bg-navy-50/60 px-4 py-2.5 text-center">
                <p className="text-xs text-navy-500">正方</p>
                <p className="font-serif font-bold text-navy-900">{proTeam?.name ?? '—'}</p>
              </div>
              <span className="text-xs text-navy-400 font-bold">VS</span>
              <div className="flex-1 rounded-lg bg-gold-50/60 px-4 py-2.5 text-center">
                <p className="text-xs text-gold-700">反方</p>
                <p className="font-serif font-bold text-navy-900">{conTeam?.name ?? '—'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-navy-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-gold-500" />
                评委列表
                <span className="text-xs font-normal text-navy-500">
                  ({judgeScores.length}/{matchJudges.length} 已提交)
                </span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {matchJudges.map((j) => {
                  if (!j) return null;
                  const isSubmitted = submittedIds.has(j.id);
                  return (
                    <Link
                      key={j.id}
                      to={`/judge/${match.id}?j=${j.id}`}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
                        isSubmitted
                          ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                          : 'bg-white border-navy-100 hover:border-gold-300 hover:shadow-sm'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white',
                          isSubmitted ? 'bg-emerald-500' : 'bg-gradient-navy'
                        )}>
                          {j.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-navy-900">{j.name}</p>
                          <p className="text-xs text-navy-500">{j.institution}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSubmitted ? (
                          <span className="text-xs text-emerald-600 font-bold">已提交</span>
                        ) : (
                          <span className="text-xs text-gold-600 font-bold">待评分</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-navy-300" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
