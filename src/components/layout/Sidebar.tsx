import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Gavel,
  FileText,
  Trophy,
  Timer,
  Award,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Medal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { path: '/', name: '赛事概览', icon: LayoutDashboard },
  { path: '/teams', name: '参赛队伍', icon: Users },
  { path: '/judges', name: '评委管理', icon: Gavel },
  { path: '/topics', name: '辩题库', icon: FileText },
  { path: '/tournament', name: '赛制编排', icon: Trophy },
  { path: '/live', name: '比赛现场', icon: Timer },
  { path: '/judge', name: '评委打分', icon: Award },
  { path: '/ranking', name: '成绩排行', icon: BarChart3 },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-ivory-50 border-r border-navy-100/80',
        'flex flex-col transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-0 md:w-20' : 'w-0 md:w-[260px]',
        collapsed ? 'overflow-hidden' : 'overflow-hidden',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-5 h-16 border-b border-navy-100/80',
          'transition-all duration-300',
          collapsed && 'md:px-3 md:justify-center',
        )}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-navy flex items-center justify-center shadow-card">
          <Medal className="w-5 h-5 text-gold-300" />
        </div>
        <div
          className={cn(
            'flex flex-col transition-opacity duration-200 whitespace-nowrap',
            collapsed && 'md:opacity-0 md:w-0 md:overflow-hidden',
          )}
        >
          <span className="font-serif text-lg font-bold text-navy-900 leading-tight">
            辩经论坛
          </span>
          <span className="text-xs text-navy-500 leading-tight">
            2026 春季冠军赛
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.name : undefined}
              className={cn(
                'sidebar-nav-item group',
                isActive && 'sidebar-nav-item-active',
                collapsed && 'md:justify-center md:px-2',
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-transform duration-200',
                  isActive ? 'text-gold-300' : 'text-navy-400 group-hover:text-navy-700',
                  isActive && 'group-hover:scale-110',
                )}
              />
              <span
                className={cn(
                  'transition-all duration-200',
                  collapsed && 'md:opacity-0 md:w-0 md:overflow-hidden md:hidden',
                )}
              >
                {item.name}
              </span>
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse-slow" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-navy-100/80 p-3">
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
            'text-navy-500 hover:text-navy-900 hover:bg-navy-50',
            'transition-all duration-200 text-sm font-medium',
            collapsed && 'md:justify-center md:px-2',
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>收起侧边栏</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
