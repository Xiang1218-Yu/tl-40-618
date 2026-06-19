import { cn } from '@/lib/utils';
import { Building2, Pencil, Trash2, User } from 'lucide-react';
import type { Team } from '@/types';

interface TeamCardProps {
  team: Team;
  onEdit?: (team: Team) => void;
  onDelete?: (team: Team) => void;
}

const roleColors: Record<string, string> = {
  一辩: 'badge-blue',
  二辩: 'badge-gold',
  三辩: 'badge-green',
  四辩: 'badge-red',
  替补: 'badge',
};

function PlayerAvatar({ name, role }: { name: string; role: string }) {
  const initial = name.slice(0, 1);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-navy-100 to-ivory-200 text-lg font-semibold text-navy-700 ring-2 ring-white shadow-sm">
          <User className="h-6 w-6 text-navy-500" strokeWidth={1.8} />
          <span className="absolute inset-0 flex items-center justify-center text-navy-700 font-bold">
            {initial}
          </span>
        </div>
      </div>
      <div className="text-center w-full">
        <p className="truncate text-sm font-medium text-navy-800 max-w-[80px]">{name}</p>
        <span className={cn('mt-1 text-[10px]', roleColors[role] ?? 'badge')}>
          {role}
        </span>
      </div>
    </div>
  );
}

export default function TeamCard({ team, onEdit, onDelete }: TeamCardProps) {
  const mainPlayers = team.players.filter((p) => p.role !== '替补').slice(0, 4);
  const subs = team.players.filter((p) => p.role === '替补');

  return (
    <div className="card p-6 animate-fade-up group">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-navy text-white shadow-card">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-navy-500 mb-0.5">{team.institution}</p>
            <h3 className="font-serif text-xl font-bold text-navy-900 truncate">{team.name}</h3>
            <p className="mt-1 text-xs text-navy-400">
              种子位 #{team.seed} · 共 {team.players.length} 名队员
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onEdit && (
            <button
              onClick={() => onEdit(team)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-700"
              aria-label="编辑"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(team)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="删除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start justify-around gap-2 rounded-xl bg-gradient-to-br from-ivory-50 to-ivory-100 p-4 ring-1 ring-navy-100/50">
        {mainPlayers.length > 0 ? (
          mainPlayers.map((player) => (
            <PlayerAvatar key={player.id} name={player.name} role={player.role} />
          ))
        ) : (
          <div className="py-6 text-sm text-navy-400">暂无选手信息</div>
        )}
      </div>

      {subs.length > 0 && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-navy-500">替补：</span>
          {subs.map((s) => (
            <span key={s.id} className="badge bg-navy-50 text-navy-600 text-[11px]">
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
