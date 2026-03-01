import { Link } from 'react-router-dom';
import { Brain, ArrowRight, Repeat, BookOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Landing() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen grid-bg">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 h-16 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground tracking-tight">Recall</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <Button asChild variant="outline" size="sm">
            <Link to="/app">Open App</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 lg:pt-32">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground bg-card border border-border rounded-full px-4 py-1.5 mb-8">
          <Zap className="h-3 w-3 text-primary" />
          Solve once. Remember forever.
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight leading-[1.1] max-w-3xl">
          Your coding
          <br />
          <span className="text-primary">revision</span> notebook.
        </h1>

        <p className="mt-6 text-muted-foreground text-lg max-w-lg leading-relaxed">
          Save structured notes for solved problems. Automatically schedule revisions. Review calmly in a focused interface.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Button asChild size="lg" className="gap-2">
            <Link to="/app">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          {
            icon: BookOpen,
            title: 'Structured Notes',
            desc: 'Capture problem, approach, mistakes, and code in one clean view.',
          },
          {
            icon: Repeat,
            title: 'Spaced Repetition',
            desc: 'Smart scheduling based on your confidence. No manual tracking.',
          },
          {
            icon: Zap,
            title: 'Focused Review',
            desc: 'Distraction-free review mode. One problem at a time.',
          },
        ].map(f => (
          <div key={f.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors">
            <f.icon className="h-5 w-5 text-primary mb-4" />
            <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
