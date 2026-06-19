import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  Trophy,
  Settings,
  HelpCircle,
  Menu,
  Home,
  X,
  User,
  LogOut,
  Info,
  Gauge,
  Clock,
  Award,
  FileQuestion,
  BookOpen,
  ChevronDown,
  Bell,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebateStore } from '@/store/debateStore';
import { FORMAT_RULES } from '@/engines/formatRules';
import type { DebateFormat, TournamentType } from '@/types';

const breadcrumbMap: Record<string, { label: string; icon?: React.ComponentType<{ className?: string }> }> = {
  '/': { label: '赛事概览', icon: Home },
  '/teams': { label: '参赛队伍' },
  '/judges': { label: '评委管理' },
  '/topics': { label: '辩题库' },
  '/tournament': { label: '赛制编排' },
  '/live': { label: '比赛现场' },
  '/judge': { label: '评委打分' },
  '/ranking': { label: '成绩排行' },
};

interface TopNavProps {
  onMobileMenu: () => void;
}

export default function TopNav({ onMobileMenu }: TopNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const store = useDebateStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [tempName, setTempName] = useState(store.tournament.name);
  const [tempFormat, setTempFormat] = useState<DebateFormat>(store.tournament.format);
  const [tempType, setTempType] = useState<TournamentType>(store.tournament.type);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        setHelpOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const getBreadcrumbs = () => {
    const crumbs: { label: string; path: string; icon?: React.ComponentType<{ className?: string }> }[] = [
      { label: '首页', path: '/', icon: Home },
    ];

    const basePath = '/' + location.pathname.split('/')[1];
    const current = breadcrumbMap[basePath];
    if (current && basePath !== '/') {
      crumbs.push({ label: current.label, path: basePath });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const handleSaveSettings = () => {
    store.updateTournament({
      name: tempName,
      format: tempFormat,
      type: tempType,
    });
    setSettingsOpen(false);
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-ivory-50/80 backdrop-blur-xl border-b border-navy-100/80">
      <div className="h-full flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMobileMenu}
            className={cn(
              'md:hidden flex-shrink-0 w-10 h-10 rounded-lg',
              'flex items-center justify-center',
              'text-navy-600 hover:text-navy-900 hover:bg-navy-50',
              'transition-all duration-200',
            )}
          >
            <Menu className="w-5 h-5" />
          </button>

          <nav className="flex items-center gap-1.5 text-sm font-sans min-w-0">
            {breadcrumbs.map((crumb, index) => {
              const Icon = crumb.icon;
              const isLast = index === breadcrumbs.length - 1;

              return (
                <div key={crumb.path + index} className="flex items-center gap-1.5 min-w-0">
                  <Link
                    to={crumb.path}
                    className={cn(
                      'flex items-center gap-1.5 transition-all duration-200',
                      'truncate max-w-[160px]',
                      isLast
                        ? 'text-navy-900 font-semibold font-serif'
                        : 'text-navy-500 hover:text-navy-700',
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                    <span className="truncate">{crumb.label}</span>
                  </Link>
                  {!isLast && (
                    <ChevronRight className="w-3.5 h-3.5 text-navy-300 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-navy/5 border border-navy-100">
            <Trophy className="w-4 h-4 text-gold-600 flex-shrink-0" />
            <span className="text-sm font-serif font-semibold text-navy-800 truncate max-w-[180px]">
              {store.tournament.name}
            </span>
          </div>

          <button
            onClick={() => setHelpOpen(true)}
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              'text-navy-500 hover:text-navy-900 hover:bg-navy-50',
              'transition-all duration-200 hover:shadow-sm',
            )}
            title="帮助中心"
          >
            <HelpCircle className="w-[18px] h-[18px]" />
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              'text-navy-500 hover:text-navy-900 hover:bg-navy-50',
              'transition-all duration-200 hover:shadow-sm',
            )}
            title="赛事设置"
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>

          <div className="w-px h-6 bg-navy-200 mx-1 hidden md:block" />

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={cn(
                'flex items-center gap-2 pl-1 pr-3 h-10 rounded-full',
                'hover:bg-navy-50 transition-all duration-200',
                userMenuOpen && 'bg-navy-100',
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full',
                  'bg-gradient-gold flex items-center justify-center',
                  'text-white font-serif font-bold text-sm shadow-sm',
                )}
              >
                主
              </div>
              <span className="hidden lg:block text-sm font-medium text-navy-800">
                总裁判
              </span>
              <ChevronDown className={cn('w-3.5 h-3.5 text-navy-400 transition-transform hidden lg:block', userMenuOpen && 'rotate-180')} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 card py-2 shadow-card-hover z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-navy-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center text-white font-serif font-bold">
                      主
                    </div>
                    <div>
                      <p className="font-serif font-bold text-navy-900">总裁判</p>
                      <p className="text-xs text-navy-500">赛事管理员</p>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); setSettingsOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-navy-700 hover:bg-navy-50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />赛事设置
                  </button>
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/judges'); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-navy-700 hover:bg-navy-50 transition-colors"
                  >
                    <User className="w-4 h-4" />评委管理
                  </button>
                  <button
                    onClick={() => { setUserMenuOpen(false); navigate('/ranking'); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-navy-700 hover:bg-navy-50 transition-colors"
                  >
                    <Award className="w-4 h-4" />成绩排行
                  </button>
                </div>
                <div className="border-t border-navy-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {settingsOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fade-in"
             onClick={() => setSettingsOpen(false)}>
          <div className="card w-full max-w-lg p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl font-bold text-navy-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gold-500" />赛事设置
              </h2>
              <button onClick={() => setSettingsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="label-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold-500" />赛事名称
                </label>
                <input
                  type="text"
                  className="input-base"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gold-500" />辩论类型
                  </label>
                  <select
                    className="input-base"
                    value={tempFormat}
                    onChange={(e) => setTempFormat(e.target.value as DebateFormat)}
                  >
                    {Object.entries(FORMAT_RULES).map(([key, rule]) => (
                      <option key={key} value={key}>{rule.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label-base flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-gold-500" />赛制类型
                  </label>
                  <select
                    className="input-base"
                    value={tempType}
                    onChange={(e) => setTempType(e.target.value as TournamentType)}
                  >
                    <option value="single_elimination">单败淘汰</option>
                    <option value="round_robin">循环赛</option>
                    <option value="swiss">瑞士轮</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-navy-50/60 rounded-xl border border-navy-100">
                <p className="text-sm text-navy-600">
                  <Info className="w-4 h-4 inline mr-1.5 text-navy-400" />
                  修改赛制类型后，需要在「赛制编排」中重新生成对阵表。
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setSettingsOpen(false)} className="btn-secondary">
                取消
              </button>
              <button onClick={handleSaveSettings} className="btn-gold">
                保存设置
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {helpOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fade-in"
             onClick={() => setHelpOpen(false)}>
          <div className="card w-full max-w-xl p-6 animate-scale-in max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl font-bold text-navy-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-gold-500" />帮助中心
              </h2>
              <button onClick={() => setHelpOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-navy-50/60 border border-navy-100">
                <h3 className="font-serif font-bold text-navy-900 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gold-500" />计时器使用
                </h3>
                <ul className="text-sm text-navy-600 space-y-1.5 list-disc list-inside">
                  <li>点击「开始」按钮启动计时，再次点击暂停</li>
                  <li>点击「下一阶段」进入下一个计时阶段</li>
                  <li>剩余时间少于30秒时数字变为金色警示</li>
                  <li>计时器状态自动保存，刷新页面不丢失</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-gold-50/60 border border-gold-100">
                <h3 className="font-serif font-bold text-navy-900 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-gold-500" />评委评分
                </h3>
                <ul className="text-sm text-navy-600 space-y-1.5 list-disc list-inside">
                  <li>每位评委独立打分，系统自动汇总</li>
                  <li>团队分 + 选手分加权计算总分</li>
                  <li>所有评委提交后，比赛才可结束</li>
                  <li>BP赛制支持4队独立评分与排名</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <h3 className="font-serif font-bold text-navy-900 mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold-500" />赛制编排
                </h3>
                <ul className="text-sm text-navy-600 space-y-1.5 list-disc list-inside">
                  <li>支持单败淘汰、循环赛、瑞士轮三种赛制</li>
                  <li>自动生成对阵表，随机分配辩题</li>
                  <li>自动检测选手与评委回避</li>
                  <li>比赛结束后自动推进下一轮</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-navy-50/60 border border-navy-100">
                <h3 className="font-serif font-bold text-navy-900 mb-2 flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-gold-500" />常见问题
                </h3>
                <div className="text-sm text-navy-600 space-y-2">
                  <p><strong>Q: 如何添加队伍？</strong></p>
                  <p className="pl-4">A: 在「参赛队伍」页面点击「添加队伍」或使用「批量导入」。</p>
                  <p><strong>Q: 比赛能暂停吗？</strong></p>
                  <p className="pl-4">A: 可以，计时器支持暂停/继续，刷新后状态保留。</p>
                  <p><strong>Q: 评分提交后能修改吗？</strong></p>
                  <p className="pl-4">A: 提交后不支持修改，请确认后再提交。</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={() => setHelpOpen(false)} className="btn-gold">
                我知道了
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
