import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDebateStore } from '@/store/debateStore';
import DebateTimer from '@/components/timer/DebateTimer';
import StageList from '@/components/timer/StageList';
import Empty from '@/components/ui/Empty';
import Modal from '@/components/ui/Modal';
import QRCodeDisplay from '@/components/danmaku/QRCodeDisplay';
import DanmakuDisplay from '@/components/danmaku/DanmakuDisplay';
import {
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  Swords,
  Star,
  X,
  AlertTriangle,
  StopCircle,
} from 'lucide-react';
import type { JudgeScore } from '@/types';

const TeamPanel = ({
  side,
  teamName,
  institution,
  players,
  isWinner,
}: {
  side: 'pro' | 'con';
  teamName: string;
  institution: string;
  players: { name: string; role: string }[];
  isWinner?: boolean;
}) => {
  const isPro = side === 'pro';
  return (
    <div
      className={`flex-1 rounded-xl border-2 p-5 relative ${
        isPro
          ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white'
          : 'border-red-300 bg-gradient-to-br from-red-50 to-white'
      } ${isWinner ? 'ring-2 ring-gold-400 ring-offset-2 shadow-lg' : ''}`}
    >
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="badge-gold px-3 py-1 shadow-md">
            <Trophy className="w-3.5 h-3.5" /> 获胜
          </span>
        </div>
      )}
      <div className={`flex items-center gap-2 mb-3 ${isPro ? '' : 'justify-end'}`}>
        <span
          className={`w-2.5 h-2.5 rounded-full ${isPro ? 'bg-emerald-500' : 'bg-red-500'}`}
        />
        <span
          className={`text-xs font-bold uppercase tracking-wider ${isPro ? 'text-emerald-700' : 'text-red-600'}`}
        >
          {isPro ? '正方 PRO' : '反方 CON'}
        </span>
      </div>
      <h3
        className={`font-serif text-xl font-bold text-navy-900 mb-1 ${isPro ? '' : 'text-right'}`}
      >
        {teamName}
      </h3>
      <p className={`text-sm text-navy-500 mb-4 ${isPro ? '' : 'text-right'}`}>
        {institution}
      </p>
      <div className={`space-y-1.5 ${isPro ? '' : 'text-right'}`}>
        {players.map((p, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-sm ${isPro ? '' : 'flex-row-reverse'}`}
          >
            <span className="w-16 text-xs font-medium text-navy-400">{p.role}</span>
            <span className="text-navy-800 font-medium">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function LiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const matches = useDebateStore((s) => s.matches);
  const getTeamById = useDebateStore((s) => s.getTeamById);
  const getTopicById = useDebateStore((s) => s.getTopicById);
  const getJudgeById = useDebateStore((s) => s.getJudgeById);
  const getPlayerById = useDebateStore((s) => s.getPlayerById);
  const judgeScoresByMatch = useDebateStore((s) => s.judgeScoresByMatch);

  const match = useMemo(() => matches.find((m) => m.id === matchId), [matches, matchId]);
  const proTeam = useMemo(() => match ? getTeamById(match.proTeamId) : undefined, [match, getTeamById]);
  const conTeam = useMemo(() => match ? getTeamById(match.conTeamId) : undefined, [match, getTeamById]);
  const topic = useMemo(() => match ? getTopicById(match.topicId) : undefined, [match, getTopicById]);
  const judgeScores = useMemo<JudgeScore[]>(() => matchId ? (judgeScoresByMatch[matchId] ?? []) : [], [matchId, judgeScoresByMatch]);
  const isFinished = match?.status === 'finished';
  const mvpPlayer = useMemo(() => match?.scores?.mvpPlayerId ? getPlayerById(match.scores.mvpPlayerId) : null, [match, getPlayerById]);

  const getAllJudgesSubmitted = useDebateStore((s) => s.getAllJudgesSubmitted);
  const getUnsubmittedJudges = useDebateStore((s) => s.getUnsubmittedJudges);
  const finalizeMatch = useDebateStore((s) => s.finalizeMatch);
  const setTimer = useDebateStore((s) => s.setTimer);
  const currentTimer = useDebateStore((s) => s.currentTimer);

  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  const allSubmitted = matchId ? getAllJudgesSubmitted(matchId) : false;
  const unsubmitted = matchId ? getUnsubmittedJudges(matchId) : [];

  const handleEndMatch = () => {
    if (!matchId) return;
    const result = finalizeMatch(matchId);
    if (!result.success && result.error) {
      setEndError(result.error);
    } else {
      setConfirmEndOpen(false);
      if (currentTimer) {
        setTimer({ ...currentTimer, isRunning: false, isFinished: true });
      }
    }
  };

  if (!match || !proTeam || !conTeam || !topic) {
    return <Empty title="比赛不存在" description="未找到该场比赛的信息，请返回上一页重试" />;
  }

  const proPlayers = proTeam.players.map((p) => ({ name: p.name, role: p.role }));
  const conPlayers = conTeam.players.map((p) => ({ name: p.name, role: p.role }));

  return (
    <div className="space-y-6 relative">
      <div className="absolute top-0 right-0 z-30 hidden lg:block" style={{ width: 220 }}>
        {matchId && (
          <QRCodeDisplay
            matchId={matchId}
            matchTitle={`${proTeam.name} vs ${conTeam.name}`}
          />
        )}
      </div>

      {endError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 animate-fade-up">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-800 mb-0.5">无法结束比赛</p>
            <p className="text-sm text-red-600">{endError}</p>
          </div>
          <button onClick={() => setEndError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-2 lg:pr-[240px]">
        <button onClick={() => navigate(-1)} className="btn-secondary !px-3 !py-2">← 返回</button>
        <div className="flex items-center gap-2">
          <span className="badge-gold">第{match.round}轮 · #{match.matchNumber}</span>
          {match.status === 'pending' && <span className="badge-blue">待开始</span>}
          {match.status === 'ongoing' && <span className="badge-gold"><Swords className="w-3 h-3" />进行中</span>}
          {match.status === 'finished' && <span className="badge-green"><Trophy className="w-3 h-3" />已结束</span>}
        </div>
        <div className="ml-auto flex gap-2 items-center">
          <div className="lg:hidden">
            {matchId && (
              <QRCodeDisplay
                matchId={matchId}
                matchTitle={`${proTeam.name} vs ${conTeam.name}`}
                size={120}
              />
            )}
          </div>
          <div className="text-sm text-navy-500 self-center">
            已提交 <span className="font-bold text-navy-800">{judgeScores.length}</span> / {match.judgeIds.length} 位评委
          </div>
          {!isFinished && (
            <button
              onClick={() => {
                setEndError(null);
                setConfirmEndOpen(true);
              }}
              disabled={!allSubmitted}
              className={allSubmitted ? 'btn-gold' : 'btn-secondary opacity-60 cursor-not-allowed'}
              title={!allSubmitted ? '所有评委提交评分后才能结束比赛' : ''}
            >
              <StopCircle className="w-4 h-4" />结束比赛
            </button>
          )}
        </div>
      </div>

      <div className="flex items-stretch gap-4 lg:pr-[240px]">
        <TeamPanel
          side="pro"
          teamName={proTeam.name}
          institution={proTeam.institution}
          players={proPlayers}
          isWinner={match.winner === 'pro'}
        />

        <div className="flex flex-col items-center justify-center w-[280px] flex-shrink-0">
          <div className="w-full rounded-xl bg-gradient-gold p-5 text-white shadow-card text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-1.5 mb-3 opacity-90">
                <Star className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-widest">
                  辩题 TOPIC
                </span>
                <Star className="w-3.5 h-3.5" />
              </div>
              <h2 className="font-serif text-lg font-bold mb-4 leading-snug">
                {topic.title}
              </h2>
              <div className="space-y-2 text-[11px] text-left">
                <div className="flex items-start gap-2 rounded-lg bg-white/15 px-3 py-2">
                  <span className="font-bold text-emerald-200 flex-shrink-0">正方</span>
                  <span className="leading-relaxed opacity-95">{topic.proSide}</span>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-white/15 px-3 py-2">
                  <span className="font-bold text-red-200 flex-shrink-0">反方</span>
                  <span className="leading-relaxed opacity-95">{topic.conSide}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <TeamPanel
          side="con"
          teamName={conTeam.name}
          institution={conTeam.institution}
          players={conPlayers}
          isWinner={match.winner === 'con'}
        />
      </div>

      <div className="grid grid-cols-2 gap-5 lg:pr-[240px]">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gold-500" />
            <h3 className="font-serif text-lg font-bold text-navy-900">辩论计时</h3>
          </div>
          <DebateTimer matchId={matchId} />
        </div>
        <StageList />
      </div>

      {matchId && (
        <div className="lg:pr-[240px]">
          <DanmakuDisplay matchId={matchId} />
        </div>
      )}

      {isFinished && match.scores && (
        <div className="card p-6 bg-gradient-to-br from-gold-50/50 to-white">
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-5 h-5 text-gold-500" />
            <h3 className="font-serif text-xl font-bold text-navy-900">比赛成绩汇总</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5 text-center">
              <div className="text-xs font-semibold text-emerald-700 mb-1">正方总分</div>
              <div className="font-mono text-3xl font-bold text-navy-900">{match.scores.proTeamTotal.toFixed(1)}</div>
              <div className="text-xs text-emerald-600 mt-1">{proTeam.name}</div>
            </div>
            <div className="rounded-xl bg-gradient-gold p-5 text-white text-center shadow-md relative overflow-hidden">
              {mvpPlayer && (
                <>
                  <div className="absolute inset-0 bg-white/10" />
                  <div className="relative z-10">
                    <div className="text-xs font-semibold opacity-90 mb-1"><Trophy className="w-3.5 h-3.5 inline mr-1" />MVP 最佳辩手</div>
                    <div className="font-serif text-2xl font-bold">{mvpPlayer.name}</div>
                    <div className="text-xs opacity-90 mt-1">{mvpPlayer.role}</div>
                  </div>
                </>
              )}
            </div>
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5 text-center">
              <div className="text-xs font-semibold text-red-600 mb-1">反方总分</div>
              <div className="font-mono text-3xl font-bold text-navy-900">{match.scores.conTeamTotal.toFixed(1)}</div>
              <div className="text-xs text-red-600 mt-1">{conTeam.name}</div>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold text-navy-700 mb-3">评委投票方向</div>
            <div className="flex flex-wrap gap-2">
              {match.scores.judgeScores.map((js) => {
                const judge = getJudgeById(js.judgeId);
                const dir = js.proTeamScore > js.conTeamScore ? 'pro' : js.conTeamScore > js.proTeamScore ? 'con' : 'draw';
                return (
                  <div key={js.judgeId} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${dir === 'pro' ? 'bg-emerald-50 border border-emerald-200' : dir === 'con' ? 'bg-red-50 border border-red-200' : 'bg-navy-50 border border-navy-200'}`}>
                    <Users className="w-3.5 h-3.5 text-navy-500" />
                    <span className="font-medium text-navy-800">{judge?.name ?? '匿名评委'}</span>
                    <span className={`text-xs font-bold ${dir === 'pro' ? 'text-emerald-600' : dir === 'con' ? 'text-red-600' : 'text-navy-500'}`}>
                      {dir === 'pro' ? `→ 正方 ${js.proTeamScore}` : dir === 'con' ? `→ 反方 ${js.conTeamScore}` : '平局'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gold-500" />
            <h3 className="font-serif text-xl font-bold text-navy-900">评委打分入口</h3>
          </div>
          <span className="text-sm text-navy-500">已提交 {judgeScores.length} / {match.judgeIds.length}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {match.judgeIds.map((jid) => {
            const judge = getJudgeById(jid);
            const submitted = judgeScores.find((s) => s.judgeId === jid);
            return (
              <button key={jid} onClick={() => navigate(`/judge/${matchId}?j=${jid}`)}
                className={`card p-4 text-left group transition-all hover:-translate-y-0.5 ${submitted ? 'bg-emerald-50/50 border-emerald-200' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-navy-900 text-base">{judge?.name ?? '未知评委'}</div>
                    <div className="text-xs text-navy-500 mt-0.5">{judge?.institution}{judge?.title ? ` · ${judge.title}` : ''}</div>
                  </div>
                  {submitted
                    ? <span className="badge-green"><CheckCircle2 className="w-3 h-3" /> 已提交</span>
                    : <span className="badge-blue">待评分</span>}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-navy-100">
                  <span className="text-xs text-navy-400">
                    {submitted ? `提交于 ${new Date(submitted.submittedAt).toLocaleString()}` : '点击进入评分页面'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-600 group-hover:text-gold-700">进入 <ArrowRight className="w-3 h-3" /></span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Modal
        open={confirmEndOpen}
        onClose={() => setConfirmEndOpen(false)}
        title="确认结束比赛"
        footer={
          <>
            <button onClick={() => setConfirmEndOpen(false)} className="btn-secondary">
              取消
            </button>
            <button
              onClick={handleEndMatch}
              disabled={!allSubmitted}
              className={allSubmitted ? 'btn-gold' : 'btn-secondary opacity-50 cursor-not-allowed'}
            >
              <CheckCircle2 className="w-4 h-4" />确认结束
            </button>
          </>
        }
      >
        <div className="py-2 space-y-4">
          {!allSubmitted && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 mb-1">还有评委未提交评分</p>
                <p className="text-sm text-red-600">
                  未提交：{unsubmitted.map((jid) => getJudgeById(jid)?.name).filter(Boolean).join('、')}
                </p>
              </div>
            </div>
          )}
          {allSubmitted && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-800 mb-1">所有评委已提交评分</p>
                <p className="text-sm text-emerald-600">
                  共 {match.judgeIds.length} 位评委，评分全部提交完成，可以结束比赛
                </p>
              </div>
            </div>
          )}
          <div>
            <p className="text-sm text-navy-700 font-medium mb-2">比赛信息</p>
            <div className="bg-ivory-100 rounded-lg p-4 space-y-1 text-sm">
              <p><span className="text-navy-500">对阵：</span>{proTeam.name} vs {conTeam.name}</p>
              <p><span className="text-navy-500">辩题：</span>{topic.title}</p>
              <p><span className="text-navy-500">场次：</span>第{match.round}轮 · 第{match.matchNumber}场</p>
            </div>
          </div>
          <p className="text-xs text-navy-500">
            结束后将自动计算比赛结果、生成排名，且无法重新开始计时。请确认。
          </p>
        </div>
      </Modal>
    </div>
  );
}
