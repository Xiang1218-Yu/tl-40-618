import { useMemo } from 'react';
import { Clock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import { getFormatRules } from '@/engines/formatRules';
import {
  getTimeDisplay,
  getStageSideColor,
  getStageSideBg,
  goToStage,
} from '@/engines/timerEngine';
import type { DebateStageConfig } from '@/types';

interface StageListProps {
  format?: 'parliamentary' | 'mandarin' | 'moot_court' | 'british_parliamentary';
  className?: string;
}

export const StageList = ({ format, className = '' }: StageListProps) => {
  const currentTimer = useDebateStore((s) => s.currentTimer);
  const setTimer = useDebateStore((s) => s.setTimer);
  const tournament = useDebateStore((s) => s.tournament);

  const activeFormat = format ?? currentTimer?.format ?? tournament.format;
  const rules = useMemo(() => getFormatRules(activeFormat), [activeFormat]);

  const handleStageClick = (index: number) => {
    if (!currentTimer) return;
    setTimer(goToStage(currentTimer, index));
  };

  const getStageStatus = (stage: DebateStageConfig, index: number) => {
    if (!currentTimer) return 'upcoming';
    const currentIndex = currentTimer.current.stageIndex;
    if (index < currentIndex) return 'done';
    if (index === currentIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-semibold text-navy-900">
            {rules.label}
          </h3>
          <p className="text-xs text-navy-500 mt-0.5">{rules.description}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-navy-500 bg-navy-50 px-3 py-1.5 rounded-full">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono">
            {getTimeDisplay(
              rules.stages.reduce((acc, s) => acc + s.duration, 0)
            )}
          </span>
          <span className="text-navy-400">总计</span>
        </div>
      </div>

      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 scroll-thin">
        {rules.stages.map((stage, index) => {
          const status = getStageStatus(stage, index);
          const sideColor = getStageSideColor(stage.side);
          const sideBg = getStageSideBg(stage.side);

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => handleStageClick(index)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg border text-left transition-all duration-200 group ${
                status === 'active'
                  ? `${sideBg} shadow-md ring-2 ring-offset-1 ring-offset-white ring-gold-400/50 scale-[1.01]`
                  : status === 'done'
                  ? 'bg-ivory-100/50 border-navy-100 opacity-60 hover:opacity-80 hover:bg-navy-50'
                  : 'bg-white border-navy-100 hover:border-navy-200 hover:bg-navy-50/50'
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  status === 'active'
                    ? 'bg-gradient-navy text-white shadow-sm'
                    : status === 'done'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-navy-100 text-navy-600 group-hover:bg-navy-200'
                }`}
              >
                {status === 'done' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold truncate ${
                      status === 'active'
                        ? sideColor
                        : status === 'done'
                        ? 'text-navy-500 line-through decoration-navy-300'
                        : 'text-navy-800'
                    }`}
                  >
                    {stage.name}
                  </span>
                  {status === 'active' && (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-gold text-white">
                      当前
                    </span>
                  )}
                </div>
                {stage.side && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[11px] font-medium ${
                        status === 'done' ? 'text-navy-400' : sideColor
                      }`}
                    >
                      {stage.side === 'pro' && '正方'}
                      {stage.side === 'con' && '反方'}
                      {stage.side === 'judge' && '法官'}
                      {stage.side === 'both' && '双方'}
                    </span>
                    {typeof stage.speakerIndex === 'number' && (
                      <span
                        className={`text-[11px] ${
                          status === 'done' ? 'text-navy-400' : 'text-navy-500'
                        }`}
                      >
                        · 第{stage.speakerIndex + 1}辩手
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 flex items-center gap-2">
                <span
                  className={`font-mono text-sm tabular-nums ${
                    status === 'active'
                      ? 'text-navy-900 font-semibold'
                      : status === 'done'
                      ? 'text-navy-400 line-through'
                      : 'text-navy-600'
                  }`}
                >
                  {getTimeDisplay(stage.duration)}
                </span>
                <ChevronRight
                  className={`w-4 h-4 transition-colors ${
                    status === 'active'
                      ? 'text-gold-500'
                      : 'text-navy-300 group-hover:text-navy-500'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StageList;
