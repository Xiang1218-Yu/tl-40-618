import { cn } from '@/lib/utils';

interface RankBadgeProps {
  rank: number;
}

export default function RankBadge({ rank }: RankBadgeProps) {
  const isTop3 = rank >= 1 && rank <= 3;

  const gradientClass =
    rank === 1
      ? 'bg-gradient-rank-1 text-amber-900'
      : rank === 2
        ? 'bg-gradient-rank-2 text-slate-700'
        : rank === 3
          ? 'bg-gradient-rank-3 text-amber-50'
          : 'bg-navy-100 text-navy-500';

  const ringClass =
    rank === 1
      ? 'ring-2 ring-amber-400/50'
      : rank === 2
        ? 'ring-2 ring-slate-400/50'
        : rank === 3
          ? 'ring-2 ring-orange-700/30'
          : 'ring-1 ring-navy-200/60';

  const shadowClass = isTop3
    ? 'shadow-md'
    : 'shadow-sm';

  return (
    <div
      className={cn(
        'badge',
        'min-w-[40px] justify-center text-sm font-bold',
        'py-1.5 px-3 rounded-xl',
        gradientClass,
        ringClass,
        shadowClass,
      )}
    >
      {isTop3 ? (
        <span className="flex items-center gap-1">
          <span className="text-base leading-none">
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
          </span>
          <span>No.{rank}</span>
        </span>
      ) : (
        <span>No.{rank}</span>
      )}
    </div>
  );
}
