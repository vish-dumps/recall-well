import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  FolderTree,
  NotebookPen,
  RotateCcw,
  Plus,
  UserCircle2,
  Brain,
  Sun,
  Moon,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: BarChart3 },
  { label: 'Notes', path: '/app', icon: FileText },
  { label: 'General Notes', path: '/general-notes', icon: NotebookPen },
  { label: 'Groups', path: '/groups', icon: FolderTree },
  { label: 'Review', path: '/review', icon: RotateCcw },
  { label: 'New', path: '/new', icon: Plus },
  { label: 'Profile', path: '/profile', icon: UserCircle2 },
];

interface AppLayoutProps {
  children: ReactNode;
  dueCount?: number;
  fullWidth?: boolean;
  disableMainScroll?: boolean;
}

export function AppLayout({ children, dueCount = 0, fullWidth = false, disableMainScroll = false }: AppLayoutProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  const sidebarWidthClass = useMemo(() => (desktopSidebarCollapsed ? 'w-[76px]' : 'w-56'), [desktopSidebarCollapsed]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const isActivePath = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname.startsWith('/note/') || location.pathname.startsWith('/edit/');
    }

    if (path === '/groups') {
      return location.pathname === '/groups' || location.pathname.startsWith('/groups/');
    }

    return location.pathname === path;
  };

  return (
    <div className="relative min-h-screen w-full grid-bg overflow-hidden">
      {isMobile && mobileSidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/30"
          aria-label="Close sidebar"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 border-r border-border bg-card/90 backdrop-blur-sm flex flex-col justify-between p-3 transition-transform duration-300',
          sidebarWidthClass,
          isMobile ? (mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
        )}
      >
        <div>
          <Link to="/dashboard" className={cn('flex items-center mb-8', desktopSidebarCollapsed ? 'justify-center' : 'gap-2 px-2')}>
            <Brain className="h-5 w-5 text-primary" />
            {!desktopSidebarCollapsed && (
              <span className="font-display text-foreground tracking-tight text-lg">Recall</span>
            )}
          </Link>

          <nav className="space-y-1">
            {navItems.map(item => {
              const active = isActivePath(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center rounded-lg text-sm transition-colors',
                    desktopSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {!desktopSidebarCollapsed && item.label}
                  {!desktopSidebarCollapsed && item.label === 'Review' && dueCount > 0 && (
                    <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-mono">
                      {dueCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn('w-full text-muted-foreground', desktopSidebarCollapsed ? 'justify-center px-2' : 'justify-start gap-3')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!desktopSidebarCollapsed && (theme === 'dark' ? 'Light mode' : 'Dark mode')}
        </Button>
      </aside>

      <div
        className={cn(
          'min-h-screen flex flex-1 flex-col min-w-0 transition-[margin-left] duration-300',
          isMobile ? 'ml-0' : desktopSidebarCollapsed ? 'ml-[76px]' : 'ml-56'
        )}
      >
        <header className="h-14 border-b border-border bg-card/70 backdrop-blur-sm flex items-center px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0 w-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isMobile) {
                  setMobileSidebarOpen(prev => !prev);
                } else {
                  setDesktopSidebarCollapsed(prev => !prev);
                }
              }}
              className="shrink-0"
              aria-label="Toggle sidebar"
            >
              {isMobile ? (
                <Menu className="h-4 w-4" />
              ) : desktopSidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>

            <p className="text-sm text-muted-foreground font-mono truncate">
              {dueCount > 0 ? (
                <>
                  Revisions due today: <span className="text-primary font-medium">{dueCount}</span>
                </>
              ) : (
                'All caught up'
              )}
            </p>
          </div>
        </header>

        <main className={cn('flex-1', disableMainScroll ? 'overflow-hidden' : 'overflow-y-auto', fullWidth ? 'p-0' : 'p-4 md:p-6 lg:p-8')}>
          <div className={cn('animate-fade-in', fullWidth ? 'w-full h-full' : 'max-w-5xl mx-auto h-full')}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
