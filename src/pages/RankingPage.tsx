import { useState } from 'react';
import { Trophy, Users, Medal, FileDown, RefreshCw, BarChart3, User } from 'lucide-react';
import { useDebateStore } from '@/store/debateStore';
import RankBadge from '@/components/ui/RankBadge';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts';

export default function RankingPage() {
  const store = useDebateStore();
  const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams');
  const [refreshKey, setRefreshKey] = useState(0);

  const teamRankings = store.teamRankings();
  const playerRankings = store.playerRankings();

  const top10Teams = teamRankings.slice(0, 10).map((r) => ({
    name: r.teamName.length > 6 ? r.teamName.slice(0, 6) + '…' : r.teamName,
    积分: Number(r.totalScore.toFixed(1)),
    获票数: r.ballots,
  }));

  const top3Players = playerRankings.slice(0, 3);
  const radarData = [
    { subject: '平均分', ...Object.fromEntries(top3Players.map((p, i) => [`第${i + 1}名`, Number(p.avgScore.toFixed(1))])) },
    { subject: 'MVP率', ...Object.fromEntries(top3Players.map((p, i) => [`第${i + 1}名`, p.totalMatches > 0 ? Number(((p.mvpCount / p.totalMatches) * 100).toFixed(1)) : 0])) },
    { subject: '出场率', ...Object.fromEntries(top3Players.map((p, i) => [`第${i + 1}名`, Math.min(100, p.totalMatches * 25)])) },
    { subject: '总得分', ...Object.fromEntries(top3Players.map((p, i) => [`第${i + 1}名`, Number((Math.min(p.totalScore, 500) / 5).toFixed(1))])) },
  ];

  const getTeamRowClass = (rank?: number) => {
    if (rank === 1) return 'bg-gradient-rank-1/15';
    if (rank === 2) return 'bg-gradient-rank-2/20';
    if (rank === 3) return 'bg-gradient-rank-3/15';
    return '';
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleExport = () => {
    const content = `赛事排名报告\n\n队伍积分榜:\n${teamRankings.map((r) => `No.${r.rank} ${r.teamName}(${r.institution}) 胜${r.wins}/负${r.losses}/平${r.draws} 胜率${(r.winRate * 100).toFixed(1)}% 积分${r.totalScore.toFixed(1)}`).join('\n')}\n\n最佳辩手榜:\n${playerRankings.map((r) => `No.${r.rank} ${r.playerName}(${r.teamName}) 出场${r.totalMatches} MVP${r.mvpCount} 平均${r.avgScore.toFixed(1)}`).join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `赛事报告_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const playerRowHighlight = (rank?: number) =>
    rank === 1
      ? 'bg-gradient-rank-1/15 font-bold'
      : rank === 2
      ? 'bg-gradient-rank-2/20 font-semibold'
      : rank === 3
      ? 'bg-gradient-rank-3/15 font-semibold'
      : '';

  return (
    <div className="space-y-6 pb-16" key={refreshKey}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-navy-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-gold-500" />赛事排行榜
          </h2>
          <p className="text-sm text-navy-500 mt-1">实时统计所有已完成比赛数据</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('teams')}
          className={cn(
            'px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2',
            activeTab === 'teams'
              ? 'bg-gradient-navy text-white shadow-card'
              : 'bg-white border border-navy-200 text-navy-700 hover:bg-navy-50'
          )}
        >
          <Users className="w-4 h-4" />队伍积分榜
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={cn(
            'px-6 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2',
            activeTab === 'players'
              ? 'bg-gradient-gold text-white shadow-card'
              : 'bg-white border border-navy-200 text-navy-700 hover:bg-navy-50'
          )}
        >
          <Medal className="w-4 h-4" />最佳辩手榜
        </button>
      </div>

      {activeTab === 'teams' && (
        <div className="space-y-6 stagger-fade-in">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-50 text-navy-700">
                    <th className="px-4 py-3 text-left">排名</th>
                    <th className="px-4 py-3 text-left">队伍</th>
                    <th className="px-4 py-3 text-left">学校</th>
                    <th className="px-4 py-3 text-center">胜/负/平</th>
                    <th className="px-4 py-3 text-center">胜率</th>
                    <th className="px-4 py-3 text-center">获票数</th>
                    <th className="px-4 py-3 text-center">总积分</th>
                    <th className="px-4 py-3 text-center">平均分</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRankings.map((r) => (
                    <tr
                      key={r.teamId}
                      className={cn('border-t border-navy-100 transition-colors hover:bg-navy-50/50', getTeamRowClass(r.rank))}
                    >
                      <td className="px-4 py-3"><RankBadge rank={r.rank ?? 0} /></td>
                      <td className="px-4 py-3 font-serif font-bold text-navy-900">{r.teamName}</td>
                      <td className="px-4 py-3 text-navy-600">{r.institution}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-600 font-semibold">{r.wins}</span>
                        <span className="text-navy-400"> / </span>
                        <span className="text-red-500 font-semibold">{r.losses}</span>
                        <span className="text-navy-400"> / </span>
                        <span className="text-gold-600 font-semibold">{r.draws}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-navy-800">{(r.winRate * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center font-medium text-navy-700">{r.ballots}</td>
                      <td className="px-4 py-3 text-center font-bold text-navy-900">{r.totalScore.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center text-gold-700 font-semibold">{r.avgScore.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="flex items-center gap-2 mb-4 text-navy-900">
              <BarChart3 className="w-5 h-5 text-gold-500" />前10名队伍积分对比
            </h3>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10Teams} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#1b3f6c' }} axisLine={{ stroke: '#b8cfe8' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#1b3f6c' }} axisLine={{ stroke: '#b8cfe8' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #b8cfe8', boxShadow: '0 4px 20px -4px rgba(15,41,68,0.15)' }}
                    labelStyle={{ color: '#0F2944', fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 12 }} />
                  <Bar dataKey="积分" fill="#0F2944" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="获票数" fill="#D4A574" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'players' && (
        <div className="space-y-6 stagger-fade-in">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gold-50/80 text-navy-700">
                    <th className="px-4 py-3 text-left">排名</th>
                    <th className="px-4 py-3 text-left">姓名</th>
                    <th className="px-4 py-3 text-left">队伍</th>
                    <th className="px-4 py-3 text-center">出场</th>
                    <th className="px-4 py-3 text-center">MVP</th>
                    <th className="px-4 py-3 text-center">总得分</th>
                    <th className="px-4 py-3 text-center">平均分</th>
                  </tr>
                </thead>
                <tbody>
                  {playerRankings.map((r) => (
                    <tr
                      key={r.playerId}
                      className={cn('border-t border-navy-100 transition-colors hover:bg-gold-50/40', playerRowHighlight(r.rank))}
                    >
                      <td className="px-4 py-3"><RankBadge rank={r.rank ?? 0} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-navy flex items-center justify-center">
                            <User className="w-4 h-4 text-gold-200" />
                          </div>
                          <span className="font-serif font-bold text-navy-900">{r.playerName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-navy-600">{r.teamName}</td>
                      <td className="px-4 py-3 text-center text-navy-700">{r.totalMatches}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('badge', r.mvpCount > 0 ? 'badge-gold' : 'bg-navy-50 text-navy-500 ring-1 ring-navy-200/40')}>
                          <Medal className="w-3 h-3" />{r.mvpCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-navy-900">{r.totalScore.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center text-gold-700 font-semibold">{r.avgScore.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="flex items-center gap-2 mb-4 text-navy-900">
              <Medal className="w-5 h-5 text-gold-500" />前三名能力雷达对比
            </h3>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%" margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="#b8cfe8" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#1b3f6c' }} />
                  <PolarRadiusAxis tick={{ fontSize: 10, fill: '#8aafd6' }} axisLine={false} />
                  <Radar name="第1名" dataKey="第1名" stroke="#D4A574" fill="#D4A574" fillOpacity={0.45} strokeWidth={2} />
                  <Radar name="第2名" dataKey="第2名" stroke="#5485bf" fill="#5485bf" fillOpacity={0.35} strokeWidth={2} />
                  <Radar name="第3名" dataKey="第3名" stroke="#8b5735" fill="#8b5735" fillOpacity={0.3} strokeWidth={2} />
                  <Legend wrapperStyle={{ paddingTop: 8 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #b8cfe8', boxShadow: '0 4px 20px -4px rgba(15,41,68,0.15)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3 pt-2">
        <button className="btn-primary px-6 py-2.5" onClick={handleExport}>
          <FileDown className="w-4 h-4" />导出赛事报告
        </button>
        <button className="btn-secondary px-6 py-2.5" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" />刷新排名
        </button>
      </div>
    </div>
  );
}
