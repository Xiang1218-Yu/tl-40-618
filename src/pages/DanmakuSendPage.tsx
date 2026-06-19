import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDebateStore } from '@/store/debateStore';
import {
  Send,
  MessageCircle,
  User,
  ThumbsUp,
  ThumbsDown,
  Scale,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Users,
  Swords,
} from 'lucide-react';
import type { Danmaku } from '@/types';

const SENDER_NAME_KEY = 'debate-danmaku-name';

const PRESET_COLORS = [
  '#0F2944',
  '#059669',
  '#EF4444',
  '#c2874f',
  '#7c3aed',
  '#db2777',
  '#0891b2',
];

const PRESET_MESSAGES = [
  '说的太精彩了！',
  '正方观点很有说服力',
  '反方逻辑严密',
  '这个例子举得好',
  '辩手气势十足',
  '支持正方！',
  '支持反方！',
  '两位都很优秀',
  '等待结辩中',
  '这场比赛太精彩了',
];

export default function DanmakuSendPage() {
  const { matchId } = useParams<{ matchId: string }>();

  const matches = useDebateStore((s) => s.matches);
  const getTeamById = useDebateStore((s) => s.getTeamById);
  const getTopicById = useDebateStore((s) => s.getTopicById);
  const sendDanmaku = useDebateStore((s) => s.sendDanmaku);
  const getDanmakuByMatch = useDebateStore((s) => s.getDanmakuByMatch);
  const subscribeDanmakuChannel = useDebateStore((s) => s.subscribeDanmakuChannel);

  const match = useMemo(() => matches.find((m) => m.id === matchId), [matches, matchId]);
  const proTeam = useMemo(() => (match ? getTeamById(match.proTeamId) : undefined), [match, getTeamById]);
  const conTeam = useMemo(() => (match ? getTeamById(match.conTeamId) : undefined), [match, getTeamById]);
  const topic = useMemo(() => (match ? getTopicById(match.topicId) : undefined), [match, getTopicById]);

  const [senderName, setSenderName] = useState(() => {
    try {
      return localStorage.getItem(SENDER_NAME_KEY) || '';
    } catch {
      return '';
    }
  });
  const [content, setContent] = useState('');
  const [senderSide, setSenderSide] = useState<'pro' | 'con' | 'neutral'>('neutral');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [recentDanmaku, setRecentDanmaku] = useState<Danmaku[]>([]);
  const [sentTip, setSentTip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId) return;
    setRecentDanmaku(getDanmakuByMatch(matchId).slice(-20).reverse());
    const unsub = subscribeDanmakuChannel(matchId, (d) => {
      setRecentDanmaku((prev) => [d, ...prev].slice(0, 30));
    });
    return unsub;
  }, [matchId, getDanmakuByMatch, subscribeDanmakuChannel]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = 0;
  }, [recentDanmaku.length]);

  const handleSend = (text?: string) => {
    const sendContent = (text ?? content).trim();
    if (!matchId) {
      setError('缺少比赛ID');
      return;
    }
    if (!senderName.trim()) {
      setError('请先输入昵称');
      return;
    }
    if (!sendContent) {
      setError('请输入弹幕内容');
      return;
    }
    if (sendContent.length > 50) {
      setError('弹幕内容不能超过50字');
      return;
    }

    try {
      localStorage.setItem(SENDER_NAME_KEY, senderName.trim());
    } catch {
      // ignore
    }

    const result = sendDanmaku(matchId, {
      content: sendContent,
      senderName: senderName.trim(),
      senderSide,
      color,
    });

    if (!result.success) {
      setError(result.error ?? '发送失败，请重试');
      setSentTip(null);
      return;
    }

    setContent('');
    setError(null);
    setSentTip('弹幕已发送 ✓');
    setTimeout(() => setSentTip(null), 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!match || !proTeam || !conTeam || !topic) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="font-serif text-xl font-bold text-navy-900 mb-2">比赛不存在</h2>
          <p className="text-sm text-navy-500">未找到该场比赛的信息，请确认链接是否正确</p>
        </div>
      </div>
    );
  }

  const sideBadgeClass = (s: 'pro' | 'con' | 'neutral') =>
    senderSide === s
      ? s === 'pro'
        ? 'bg-emerald-500 text-white ring-2 ring-emerald-200'
        : s === 'con'
        ? 'bg-red-500 text-white ring-2 ring-red-200'
        : 'bg-gradient-navy text-white ring-2 ring-navy-200'
      : 'bg-white text-navy-600 border border-navy-200 hover:border-navy-300';

  return (
    <div className="min-h-screen bg-[#FAF7F0] pb-6">
      <div className="bg-gradient-gold px-4 py-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5" />
        <div className="relative z-10 max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-widest opacity-90">
              实时弹幕互动
            </span>
          </div>
          <h1 className="font-serif text-lg font-bold leading-snug">{topic.title}</h1>
          <div className="mt-3 flex items-center gap-2">
            <span className="badge-gold !bg-white/20 !text-white !ring-white/30">
              第{match.round}轮 · #{match.matchNumber}
            </span>
            {match.status === 'ongoing' && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/90 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <Swords className="w-3 h-3" />进行中
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold uppercase text-emerald-700">正方 PRO</span>
            </div>
            <div className="text-sm font-semibold text-navy-900 line-clamp-1">{proTeam.name}</div>
            <div className="text-[10px] text-navy-500 mt-0.5 line-clamp-1">{proTeam.institution}</div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-right">
            <div className="flex items-center justify-end gap-1 mb-1">
              <span className="text-[10px] font-bold uppercase text-red-600">反方 CON</span>
              <span className="w-2 h-2 rounded-full bg-red-500" />
            </div>
            <div className="text-sm font-semibold text-navy-900 line-clamp-1">{conTeam.name}</div>
            <div className="text-[10px] text-navy-500 mt-0.5 line-clamp-1">{conTeam.institution}</div>
          </div>
        </div>

        <div className="card p-4 space-y-4">
          <div>
            <label className="label-base flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-navy-400" />
              你的昵称
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value.slice(0, 12))}
              placeholder="请输入昵称（最多12字）"
              className="input-base"
              maxLength={12}
            />
          </div>

          <div>
            <label className="label-base flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-navy-400" />
              支持立场（可选）
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSenderSide('pro')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${sideBadgeClass('pro')}`}
              >
                <ThumbsUp className="w-3.5 h-3.5 inline mr-1" />
                支持正方
              </button>
              <button
                type="button"
                onClick={() => setSenderSide('neutral')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${sideBadgeClass('neutral')}`}
              >
                <Users className="w-3.5 h-3.5 inline mr-1" />
                中立观众
              </button>
              <button
                type="button"
                onClick={() => setSenderSide('con')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${sideBadgeClass('con')}`}
              >
                <ThumbsDown className="w-3.5 h-3.5 inline mr-1" />
                支持反方
              </button>
            </div>
          </div>

          <div>
            <label className="label-base flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-navy-400" />
              弹幕颜色
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c
                      ? 'ring-2 ring-offset-2 ring-navy-300 scale-110'
                      : 'hover:scale-105'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="label-base flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-navy-400" />
              弹幕内容
            </label>
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 50))}
                onKeyDown={handleKeyDown}
                placeholder="说点什么吧，Enter 发送..."
                rows={3}
                className="input-base resize-none pr-14"
                maxLength={50}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!content.trim() || !senderName.trim()}
                className="absolute right-2 bottom-2 w-10 h-10 rounded-lg bg-gradient-navy text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-1 flex justify-between text-[11px]">
              <span className="text-navy-400">最多50字，Enter 发送</span>
              <span className={content.length >= 45 ? 'text-red-500 font-medium' : 'text-navy-400'}>
                {content.length}/50
              </span>
            </div>
          </div>

          <div>
            <label className="label-base">快捷弹幕</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_MESSAGES.map((msg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(msg)}
                  disabled={!senderName.trim()}
                  className="px-2.5 py-1 text-xs rounded-full bg-navy-50 text-navy-700 border border-navy-200 hover:bg-navy-100 hover:border-navy-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2.5 border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {sentTip && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>{sentTip}</span>
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-base font-bold text-navy-900 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-gold-500" />
              实时弹幕
            </h3>
            <span className="text-[11px] text-navy-400">最新 {recentDanmaku.length} 条</span>
          </div>
          <div
            ref={listRef}
            className="space-y-2 max-h-72 overflow-y-auto scroll-thin pr-1"
          >
            {recentDanmaku.length === 0 && (
              <div className="text-center py-8 text-sm text-navy-400">
                暂无弹幕，快来发送第一条吧！
              </div>
            )}
            {recentDanmaku.map((d) => (
              <div
                key={d.id}
                className={`rounded-lg px-3 py-2 text-sm border ${
                  d.senderSide === 'pro'
                    ? 'bg-emerald-50/50 border-emerald-200/60'
                    : d.senderSide === 'con'
                    ? 'bg-red-50/50 border-red-200/60'
                    : 'bg-navy-50/50 border-navy-200/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="text-[11px] font-semibold truncate"
                      style={{ color: d.color ?? '#0F2944' }}
                    >
                      {d.senderName}
                    </span>
                    {d.senderSide === 'pro' && (
                      <span className="text-[9px] px-1 py-px rounded bg-emerald-100 text-emerald-700 font-bold">
                        正方
                      </span>
                    )}
                    {d.senderSide === 'con' && (
                      <span className="text-[9px] px-1 py-px rounded bg-red-100 text-red-700 font-bold">
                        反方
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-navy-400 flex-shrink-0">
                    {new Date(d.createdAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-navy-800 text-sm leading-relaxed break-words">
                  {d.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
