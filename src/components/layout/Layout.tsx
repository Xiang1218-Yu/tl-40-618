import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-ivory-100 font-sans">
      <div
        className={cn(
          'fixed inset-0 z-30 bg-navy-900/50 backdrop-blur-sm md:hidden',
          'transition-opacity duration-300',
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] md:hidden',
          'transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <MobileSidebarWrapper onClose={() => setMobileMenuOpen(false)} />
      </div>

      <div className="hidden md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      <div
        className={cn(
          'flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out',
          sidebarCollapsed ? 'md:pl-20' : 'md:pl-[260px]',
        )}
      >
        <TopNav onMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 w-full">
          <div className="w-full px-4 md:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </main>

        <footer className="px-4 md:px-6 lg:px-8 py-4 border-t border-navy-100/60 bg-ivory-50/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-navy-400">
            <span className="font-serif">
              © 2026 辩经论坛 · 专业辩论赛管理系统
            </span>
            <span>v0.1.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function MobileSidebarWrapper({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative w-full h-full bg-ivory-50 border-r border-navy-100 shadow-2xl">
      <Sidebar collapsed={false} onToggle={onClose} />
    </div>
  );
}
