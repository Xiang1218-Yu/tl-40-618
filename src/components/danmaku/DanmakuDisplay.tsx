import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDebateStore } from '@/store/debateStore';
import {
  MessageSquareText,
  Eye,
  EyeOff,
  Trash2,
  Settings,
  X,
  ChevronUp,
  ChevronDown,
  Layers,
} from 'lucide-react';
import type { Danmaku } from '@/types';

interface FloatingItem {
  id: string;
  danmaku: Danmaku;
  top: number;
  row: number;
  duration: number;
  startTime: number;
  estimatedWidth: number;
}

interface DanmakuDisplayProps {
  matchId: string;
}

const FLOATING_HEIGHT = 38;
const ROW_SPACING = 10;
const MIN_HORIZONTAL_GAP = 160;

export const DanmakuDisplay = ({ matchId }: DanmakuDisplayProps) => {
  const getDanmakuByMatch = useDebateStore((s) => s.getDanmakuByMatch);
  const subscribeDanmakuChannel = useDebateStore((s) => s.subscribeDanmakuChannel);
  const isDanmakuEnabled = useDebateStore((s) => s.isDanmakuEnabled);
  const setDanmakuEnabled = useDebateStore((s) => s.setDanmakuEnabled);
  const clearDanmakuByMatch = useDebateStore((s) => s.clearDanmakuByMatch);

  const [enabled, setEnabled] = useState(() => isDanmakuEnabled(matchId));
  const [showSettings, setShowSettings] = useState(false);
  const [showList, setShowList] = useState(false);
  const [floating, setFloating] = useState<FloatingItem[]>([]);
  const [allDanmaku, setAllDanmaku] = useState<Danmaku[]>([]);
  const [mode, setMode] = useState<'scroll' | 'list'>('scroll');
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [, forceTick] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const mountCounter = useRef(0);
  const poolIndexRef = useRef(0);
  const rowLastLaunchRef = useRef<Map<number, number>>(new Map());
  const rowLastItemRightRef = useRef<Map<number, number>>(new Map());

  const speedMs = useMemo(() => {
    switch (speed) {
      case 'slow':
        return 18000;
      case 'fast':
        return 9000;
      default:
        return 13000;
    }
  }, [speed]);

  const getMaxRows = useCallback(() => {
    const containerH = containerRef.current?.clientHeight ?? 280;
    return Math.max(1, Math.floor((containerH - 24) / (FLOATING_HEIGHT + ROW_SPACING)));
  }, []);

  const estimateWidth = useCallback((d: Danmaku) => {
    return Math.min(420, 130 + d.content.length * 17 + d.senderName.length * 10);
  }, []);

  const sideColorClass = (side?: 'pro' | 'con' | 'neutral') => {
    switch (side) {
      case 'pro':
        return 'bg-emerald-600/90 border-emerald-400/50';
      case 'con':
        return 'bg-rose-600/90 border-rose-400/50';
      default:
        return 'bg-navy-800/90 border-navy-600/50';
    }
  };

  const launchDanmaku = useCallback(
    (d: Danmaku, now: number): FloatingItem | null => {
      const maxRows = getMaxRows();
      const containerW = containerRef.current?.clientWidth ?? 600;
      const duration = speedMs;
      const estW = estimateWidth(d);

      let chosenRow = -1;
      let chosenGap = -Infinity;

      for (let r = 0; r < maxRows; r++) {
        const lastLaunch = rowLastLaunchRef.current.get(r) ?? -Infinity;
        const lastItemRightAt = rowLastItemRightRef.current.get(r) ?? -Infinity;
        const timeSinceLaunch = now - lastLaunch;
        const timeSinceItemPassed = now - lastItemRightAt;

        if (timeSinceLaunch < 450) continue;

        const itemEntryOverhead = ((estW + MIN_HORIZONTAL_GAP) / (containerW + estW)) * duration;
        if (timeSinceItemPassed < itemEntryOverhead * 0.6) continue;

        const gapScore = Math.min(timeSinceLaunch, timeSinceItemPassed * 1.2);
        if (gapScore > chosenGap) {
          chosenGap = gapScore;
          chosenRow = r;
        }
      }

      if (chosenRow === -1) return null;

      mountCounter.current += 1;
      const item: FloatingItem = {
        id: d.id + '-' + mountCounter.current,
        danmaku: d,
        row: chosenRow,
        top: 12 + chosenRow * (FLOATING_HEIGHT + ROW_SPACING),
        duration,
        startTime: now,
        estimatedWidth: estW,
      };

      rowLastLaunchRef.current.set(chosenRow, now);

      return item;
    },
    [speedMs, getMaxRows, estimateWidth]
  );

  useEffect(() => {
    setAllDanmaku(getDanmakuByMatch(matchId).slice(-200));
    poolIndexRef.current = 0;
    const unsub = subscribeDanmakuChannel(matchId, (d) => {
      setAllDanmaku((prev) => {
        const exists = prev.some((x) => x.id === d.id);
        if (exists) return prev;
        const next = [...prev, d].slice(-400);
        return next;
      });
    });
    return unsub;
  }, [matchId, getDanmakuByMatch, subscribeDanmakuChannel]);

  useEffect(() => {
    if (mode !== 'scroll' || !enabled) {
      setFloating([]);
      rowLastLaunchRef.current.clear();
      rowLastItemRightRef.current.clear();
      return;
    }

    const containerW = containerRef.current?.clientWidth ?? 600;
    let raf = 0;
    let lastSpawnCheck = 0;

    const tick = () => {
      const now = performance.now();

      setFloating((prev) => {
        const alive: FloatingItem[] = [];
        const recycled: FloatingItem[] = [];

        for (const f of prev) {
          const elapsed = now - f.startTime;
          const progress = elapsed / f.duration;

          if (progress < 1) {
            alive.push(f);

            const curRightX =
              containerW + 20 - (containerW + f.estimatedWidth + 40) * progress + f.estimatedWidth;
            if (curRightX < containerW * 0.55) {
              const current = rowLastItemRightRef.current.get(f.row) ?? -Infinity;
              const whenRightPasses =
                f.startTime + ((containerW + 20) / (containerW + f.estimatedWidth + 40)) * f.duration;
              if (whenRightPasses > current) {
                rowLastItemRightRef.current.set(f.row, whenRightPasses);
              }
            }
          } else {
            recycled.push(f);
          }
        }

        return alive;
      });

      if (now - lastSpawnCheck > 250) {
        lastSpawnCheck = now;

        setFloating((prev) => {
          const pool = allDanmaku;
          if (pool.length === 0) return prev;

          const maxRows = getMaxRows();
          const targetItemsPerRow = 1.8;
          const targetTotal = Math.max(4, Math.min(maxRows * 3, Math.floor(maxRows * targetItemsPerRow)));

          if (prev.length >= targetTotal) return prev;

          const toAdd: FloatingItem[] = prev.slice();
          let attempts = 0;
          let launched = 0;
          const maxLaunches = 3;

          while (toAdd.length < targetTotal && attempts < pool.length * 2 && launched < maxLaunches) {
            attempts++;
            const idx = poolIndexRef.current % pool.length;
            poolIndexRef.current = (poolIndexRef.current + 1) % pool.length;
            const d = pool[idx];
            if (!d) continue;

            const item = launchDanmaku(d, now + attempts * 10);
            if (item) {
              toAdd.push(item);
              launched++;
            }
          }

          return toAdd;
        });
      }

      forceTick((x) => x + 1);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [mode, enabled, speedMs, allDanmaku, launchDanmaku, getMaxRows]);

  useEffect(() => {
    if (listScrollRef.current && mode === 'list') {
      listScrollRef.current.scrollTop = listScrollRef.current.scrollHeight;
    }
  }, [allDanmaku.length, mode]);

  useEffect(() => {
    if (historyScrollRef.current && showList) {
      historyScrollRef.current.scrollTop = 0;
    }
  }, [allDanmaku.length, showList]);

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    setDanmakuEnabled(matchId, next);
    if (!next) {
      setFloating([]);
    }
  };

  const handleClear = () => {
    if (window.confirm('确定要清空当前比赛的所有弹幕吗？')) {
      clearDanmakuByMatch(matchId);
      setAllDanmaku([]);
      setFloating([]);
      poolIndexRef.current = 0;
    }
  };

  return (
    <div className="card p-0 overflow-hidden relative animate-fade-in-scale">
      <div className="flex items-center justify-between px-4 py-3 border-b border-navy-100 bg-gradient-to-r from-navy-50/50 to-gold-50/50">
        <div className="flex items-center gap-2">
          <MessageSquareText className="w-4 h-4 text-gold-500" />
          <h3 className="font-serif text-base font-bold text-navy-900">实时弹幕</h3>
          <span className="text-[11px] text-navy-400">共 {allDanmaku.length} 条</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex bg-navy-100/60 rounded-lg p-0.5 mr-2">
            <button
              type="button"
              onClick={() => setMode('scroll')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                mode === 'scroll'
                  ? 'bg-white text-navy-800 shadow-sm'
                  : 'text-navy-500 hover:text-navy-700'
              }`}
            >
              <Layers className="w-3 h-3 inline mr-1" />
              飘屏
            </button>
            <button
              type="button"
              onClick={() => setMode('list')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                mode === 'list'
                  ? 'bg-white text-navy-800 shadow-sm'
                  : 'text-navy-500 hover:text-navy-700'
              }`}
            >
              列表
            </button>
          </div>

          <button
            type="button"
            onClick={toggleEnabled}
            title={enabled ? '关闭弹幕显示' : '开启弹幕显示'}
            className={`p-1.5 rounded-md transition-colors ${
              enabled
                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                : 'bg-navy-50 text-navy-400 hover:bg-navy-100'
            }`}
          >
            {enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            title="弹幕设置"
            className={`p-1.5 rounded-md transition-colors ${
              showSettings
                ? 'bg-gold-50 text-gold-600 hover:bg-gold-100'
                : 'bg-navy-50 text-navy-500 hover:bg-navy-100'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowList((v) => !v)}
            title={showList ? '收起弹幕历史' : '展开弹幕历史'}
            className={`p-1.5 rounded-md transition-colors bg-navy-50 text-navy-500 hover:bg-navy-100`}
          >
            {showList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="px-4 py-3 border-b border-navy-100 bg-navy-50/30 space-y-3 animate-fade-in-scale">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-navy-700">弹幕开关</span>
                <button
                  type="button"
                  onClick={toggleEnabled}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enabled ? 'bg-emerald-500' : 'bg-navy-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              清空弹幕
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-navy-700 w-16 flex-shrink-0">滚动速度</span>
            <div className="flex bg-white rounded-lg p-0.5 border border-navy-200 flex-1 max-w-xs">
              {(['slow', 'normal', 'fast'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    speed === s
                      ? 'bg-gradient-navy text-white shadow-sm'
                      : 'text-navy-500 hover:text-navy-700'
                  }`}
                >
                  {s === 'slow' ? '慢' : s === 'normal' ? '中' : '快'}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-navy-400">
            提示：当前状态为{' '}
            <span className={enabled ? 'text-emerald-600 font-semibold' : 'text-navy-500'}>
              {enabled ? '弹幕显示中（无限循环）' : '弹幕已关闭'}
            </span>
            ，观众扫码即可发送实时弹幕互动。
          </div>
        </div>
      )}

      {!enabled && (
        <div className="flex items-center justify-center py-14 text-navy-400 text-sm">
          <div className="text-center">
            <EyeOff className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">弹幕显示已关闭</p>
            <p className="text-xs text-navy-300 mt-1">点击上方眼睛图标开启显示</p>
          </div>
        </div>
      )}

      {enabled && mode === 'scroll' && (
        <div
          ref={containerRef}
          className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900"
          style={{ height: 280 }}
        >
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.05) 0%, transparent 50%)',
            }}
          />
          {floating.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-xs">
              等待观众弹幕，扫码发送即可在此显示...
            </div>
          )}
          {floating.map((f) => {
            const elapsed = performance.now() - f.startTime;
            const progress = Math.max(0, Math.min(1, elapsed / f.duration));
            const containerW = containerRef.current?.clientWidth ?? 600;
            const startX = containerW + 20;
            const endX = -f.estimatedWidth - 40;
            const currentX = startX + (endX - startX) * progress;
            return (
              <div
                key={f.id}
                className={`absolute pointer-events-none px-3 py-1.5 rounded-full text-white text-sm font-medium backdrop-blur-[2px] shadow-xl border whitespace-nowrap flex items-center ${sideColorClass(
                  f.danmaku.senderSide
                )}`}
                style={{
                  top: f.top,
                  left: currentX,
                  maxWidth: 420,
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  opacity: progress < 0.04 ? progress / 0.04 : progress > 0.95 ? (1 - progress) / 0.05 : 1,
                }}
              >
                <span
                  className="font-bold mr-1.5 flex-shrink-0"
                  style={{ color: f.danmaku.color ?? '#fde68a' }}
                >
                  {f.danmaku.senderName}
                </span>
                <span className="opacity-60 mr-1 flex-shrink-0">:</span>
                <span className="truncate">{f.danmaku.content}</span>
              </div>
            );
          })}
        </div>
      )}

      {enabled && mode === 'list' && (
        <div
          ref={listScrollRef}
          className="overflow-y-auto scroll-thin bg-gradient-to-b from-white to-navy-50/30"
          style={{ height: 280 }}
        >
          {allDanmaku.length === 0 ? (
            <div className="flex items-center justify-center py-14 text-navy-300 text-sm">
              暂无弹幕消息
            </div>
          ) : (
            <div className="p-3 space-y-1.5">
              {allDanmaku.slice(-120).map((d, idx) => (
                <div
                  key={d.id}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm border ${
                    d.senderSide === 'pro'
                      ? 'bg-emerald-50/70 border-emerald-100'
                      : d.senderSide === 'con'
                      ? 'bg-rose-50/70 border-rose-100'
                      : 'bg-white/80 border-navy-100'
                  }`}
                  style={{
                    animation: `fadeInScale 0.3s ease-out both`,
                    animationDelay: `${Math.min(idx * 12, 300)}ms`,
                  }}
                >
                  <span
                    className="text-[11px] font-semibold flex-shrink-0 min-w-0 max-w-[100px] truncate"
                    style={{ color: d.color ?? '#0F2944' }}
                  >
                    {d.senderName}
                  </span>
                  {d.senderSide && d.senderSide !== 'neutral' && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${
                        d.senderSide === 'pro'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {d.senderSide === 'pro' ? '正' : '反'}
                    </span>
                  )}
                  <span className="text-navy-700 break-words flex-1 leading-relaxed">
                    {d.content}
                  </span>
                  <span className="text-[10px] text-navy-300 flex-shrink-0 ml-auto pt-0.5 tabular-nums">
                    {new Date(d.createdAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showList && (
        <div
          ref={historyScrollRef}
          className="border-t border-navy-100 overflow-y-auto scroll-thin bg-white"
          style={{ maxHeight: 240 }}
        >
          <div className="px-3 py-2 text-[11px] text-navy-400 border-b border-navy-50 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-sm">
            <span className="font-medium">弹幕历史记录（最新在前）</span>
            <button
              type="button"
              onClick={() => setShowList(false)}
              className="text-navy-400 hover:text-navy-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {allDanmaku.length === 0 ? (
            <div className="py-10 text-center text-xs text-navy-300">暂无弹幕历史</div>
          ) : (
            <div className="p-2.5 space-y-1">
              {allDanmaku
                .slice()
                .reverse()
                .slice(0, 200)
                .map((d) => (
                  <div
                    key={d.id}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded-md text-xs border border-transparent hover:border-navy-100 hover:bg-navy-50/50 transition-colors"
                  >
                    <span
                      className="font-semibold flex-shrink-0 min-w-0 max-w-[90px] truncate"
                      style={{ color: d.color ?? '#0F2944' }}
                    >
                      {d.senderName}
                    </span>
                    {d.senderSide && d.senderSide !== 'neutral' && (
                      <span
                        className={`text-[9px] px-1 py-px rounded font-bold flex-shrink-0 ${
                          d.senderSide === 'pro'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {d.senderSide === 'pro' ? '正' : '反'}
                      </span>
                    )}
                    <span className="text-navy-700 break-words flex-1 leading-relaxed">
                      {d.content}
                    </span>
                    <span className="text-[10px] text-navy-300 flex-shrink-0 ml-1 tabular-nums">
                      {new Date(d.createdAt).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DanmakuDisplay;
