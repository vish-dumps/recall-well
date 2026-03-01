import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, RotateCcw, Plus, LogOut, Brain, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Notes', path: '/app', icon: FileText },
  { label: 'Review', path: '/review', icon: RotateCcw },
  { label: 'New', path: '/new', icon: Plus },
];

interface AppLayoutProps {
  children: ReactNode;
  dueCount?: number;
}

export function AppLayout({ children, dueCount = 0 }: AppLayoutProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen w-full grid-bg">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-card/80 backdrop-blur-sm flex flex-col justify-between p-4 shrink-0">
        <div>
          <Link to="/app" className="flex items-center gap-2 mb-10 px-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground tracking-tight">Recall</span>
          </Link>

          <nav className="space-y-1">
            {navItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.label === 'Review' && dueCount > 0 && (
                    <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-mono">
                      {dueCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2">
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="w-full justify-start gap-3 text-muted-foreground">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <p className="text-sm text-muted-foreground font-mono">
            {dueCount > 0 ? (
              <>Revisions due today: <span className="text-primary font-medium">{dueCount}</span></>
            ) : (
              'All caught up ✓'
            )}
          </p>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
