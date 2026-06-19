import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ReactNode } from 'react';

type StatColor = 'navy' | 'gold' | 'emerald' | 'red';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  trend?: string;
  color?: StatColor;
}

const colorMap: Record<StatColor, { bg: string; iconBg: string; iconText: string; trend: string }> = {
  navy: {
    bg: 'bg-gradient-to-br from-navy-500 to-navy-700',
    iconBg: 'bg-white/15',
    iconText: 'text-white',
    trend: 'text-navy-50',
  },
  gold: {
    bg: 'bg-gradient-to-br from-gold-400 to-gold-600',
    iconBg: 'bg-white/15',
    iconText: 'text-white',
    trend: 'text-gold-50',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    iconBg: 'bg-white/15',
    iconText: 'text-white',
    trend: 'text-emerald-50',
  },
  red: {
    bg: 'bg-gradient-to-br from-red-500 to-red-700',
    iconBg: 'bg-white/15',
    iconText: 'text-white',
    trend: 'text-red-50',
  },
};

export default function StatCard({
  title,
  value,
  icon,
  trend,
  color = 'navy',
}: StatCardProps) {
  const c = colorMap[color];
  const isTrendUp = trend?.startsWith('+') ?? false;
  const isTrendDown = trend?.startsWith('-') ?? false;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 text-white shadow-card',
        'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300',
        'stagger-fade-in flex flex-col gap-3',
        c.bg,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            c.iconBg,
            c.iconText,
          )}
        >
          {icon}
        </div>
      </div>

      {trend && (
        <div className={cn('flex items-center gap-1 text-xs font-medium', c.trend)}>
          {isTrendUp && <TrendingUp className="h-3.5 w-3.5" />}
          {isTrendDown && <TrendingDown className="h-3.5 w-3.5" />}
          <span>{trend}</span>
        </div>
      )}

      <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/5" />
      <div className="absolute right-8 -top-8 h-24 w-24 rounded-full bg-white/5" />
    </div>
  );
}
