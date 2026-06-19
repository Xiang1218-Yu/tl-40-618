import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MessageSquare, Scale, Trophy, Swords } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import type { MatchPairing, MatchStatus } from '@/types';

interface MatchCardProps {
  matchId: string;
  className?: string;
}

const StatusBadge = ({ status }: { status: MatchStatus }) => {
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

export const MatchCard = ({ matchId, className = '' }: MatchCardProps) => {
  const navigate = useNavigate();
  const matches = useDebateStore((s) => s.matches);
  const getTeamById = useDebateStore((s) => s.getTeamById);
  const getTopicById = useDebateStore((s) => s.getTopicById);
  const getJudgeById = useDebateStore((s) => s.getJudgeById);

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

  if (!match || !proTeam || !conTeam || !topic) {
    return (
      <div className={`card p-5 ${className}`}>
        <div className="text-navy-500 text-sm text-center py-8">
          比赛数据加载中...
        </div>
      </div>
    );
  }

  const handleClick = () => {
    navigate(`/live/${matchId}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`card cursor-pointer p-5 group ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="badge-gold">
            第{match.round}轮
          </span>
          <span className="text-xs font-medium text-navy-500">
            #{match.matchNumber}
          </span>
        </div>
        <StatusBadge status={match.status} />
      </div>

      <div className="mb-4">
        <div className="flex items-start gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-gold-500 mt-0.5 flex-shrink-0" />
          <p className="font-serif text-base font-semibold text-navy-900 leading-snug group-hover:text-navy-700 transition-colors line-clamp-2">
            {topic.title}
          </p>
        </div>
        <div className="flex items-start gap-4 ml-6 text-xs text-navy-500">
          <span className="flex-1">
            <span className="text-emerald-600 font-medium">正方：</span>
            {topic.proSide}
          </span>
          <span className="flex-1">
            <span className="text-red-500 font-medium">反方：</span>
            {topic.conSide}
          </span>
        </div>
      </div>

      <div className="relative flex items-stretch gap-2">
        <div className="flex-1 rounded-lg border-2 border-emerald-200 bg-emerald-50/50 p-3 group-hover:border-emerald-400 group-hover:bg-emerald-50 transition-all duration-200">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
              正方 PRO
            </span>
          </div>
          <div className="font-serif font-bold text-navy-900 text-sm leading-tight line-clamp-1 group-hover:text-emerald-800 transition-colors">
            {proTeam.name}
          </div>
          <div className="text-[11px] text-navy-500 mt-0.5 line-clamp-1">
            {proTeam.institution}
          </div>
        </div>

        <div className="relative flex items-center justify-center px-1">
          <div className="absolute inset-y-3 left-1/2 w-px bg-gradient-to-b from-transparent via-gold-400 to-transparent" />
          <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-gold text-white shadow-md group-hover:scale-110 transition-transform duration-200">
            <Swords className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 rounded-lg border-2 border-red-200 bg-red-50/50 p-3 group-hover:border-red-400 group-hover:bg-red-50 transition-all duration-200">
          <div className="flex items-center justify-end gap-1.5 mb-1">
            <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wide">
              反方 CON
            </span>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <div className="font-serif font-bold text-navy-900 text-sm leading-tight text-right line-clamp-1 group-hover:text-red-800 transition-colors">
            {conTeam.name}
          </div>
          <div className="text-[11px] text-navy-500 mt-0.5 text-right line-clamp-1">
            {conTeam.institution}
          </div>
        </div>
      </div>

      {match.status === 'finished' && match.winner && (
        <div className="mt-4 pt-4 border-t border-navy-100 flex items-center justify-center gap-2">
          <Trophy className="w-4 h-4 text-gold-500" />
          <span className="text-sm font-semibold">
            {match.winner === 'pro' && (
              <span className="text-emerald-700">
                正方 {proTeam.name} 获胜
              </span>
            )}
            {match.winner === 'con' && (
              <span className="text-red-600">
                反方 {conTeam.name} 获胜
              </span>
            )}
            {match.winner === 'draw' && (
              <span className="text-navy-700">平局</span>
            )}
          </span>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-navy-100 flex items-center justify-between text-xs text-navy-500">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span>{judgeCount} 位评委</span>
        </div>
        <span className="font-medium text-navy-400 group-hover:text-gold-600 group-hover:translate-x-0.5 transition-all inline-flex items-center gap-1">
          查看详情
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </div>
  );
};

export default MatchCard;
