import { useMemo } from 'react';
import { format, parseISO, startOfDay, subDays } from 'date-fns';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Note } from '@/types/note';
import { Code2, Loader2, RefreshCw, Trophy } from 'lucide-react';
import { useRatings } from '@/hooks/useRatings';
import { useProfile } from '@/hooks/useProfile';

interface DashboardPageProps {
  notes: Note[];
}

const TAG_COLORS = ['#84cc16', '#22c55e', '#0ea5e9', '#f59e0b', '#f43f5e', '#8b5cf6', '#f97316', '#10b981'];
const DIFFICULTY_COLORS: Record<'Easy' | 'Medium' | 'Hard', string> = {
  Easy: '#22c55e',
  Medium: '#f59e0b',
  Hard: '#f43f5e',
};

function buildTypeDistribution(notes: Note[]) {
  const typeCount = new Map<string, number>();

  notes.forEach(note => {
    const source = note.tags.length > 0 ? note.tags : [note.platform];
    source.forEach(rawType => {
      const type = rawType.trim();
      if (!type) return;
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });
  });

  return Array.from(typeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));
}

function buildDifficultyDistribution(notes: Note[]) {
  const difficultyCount: Record<'Easy' | 'Medium' | 'Hard', number> = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
  };

  notes.forEach(note => {
    difficultyCount[note.difficulty] += 1;
  });

  return (Object.keys(difficultyCount) as Array<'Easy' | 'Medium' | 'Hard'>).map(key => ({
    name: key,
    value: difficultyCount[key],
  }));
}

function buildWeeklyData(notes: Note[]) {
  const days = Array.from({ length: 7 }, (_, index) => startOfDay(subDays(new Date(), 6 - index)));
  const countByDay = new Map<string, number>();

  notes.forEach(note => {
    const parsed = parseISO(note.createdAt);
    if (Number.isNaN(parsed.getTime())) return;
    const key = format(startOfDay(parsed), 'yyyy-MM-dd');
    countByDay.set(key, (countByDay.get(key) || 0) + 1);
  });

  return days.map(day => {
    const key = format(day, 'yyyy-MM-dd');
    return {
      day: format(day, 'EEE'),
      questions: countByDay.get(key) || 0,
    };
  });
}

function formatMetric(value: number | null, suffix = '') {
  if (value === null || Number.isNaN(value)) return 'N/A';
  return `${Math.round(value)}${suffix}`;
}

function formatDifficultyCount(value: number | null) {
  return value === null ? '--' : `${value}`;
}

export default function DashboardPage({ notes }: DashboardPageProps) {
  const { profile } = useProfile();
  const { ratings, loading: ratingsLoading, error: ratingsError, refreshRatings } = useRatings();

  const typeDistribution = useMemo(() => buildTypeDistribution(notes), [notes]);
  const difficultyDistribution = useMemo(() => buildDifficultyDistribution(notes), [notes]);
  const weeklyData = useMemo(() => buildWeeklyData(notes), [notes]);
  const leetcodeStats = ratings?.leetcode;
  const codeforcesStats = ratings?.codeforces;
  const leetcodeDifficulty = leetcodeStats?.difficultyCounts ?? {
    easy: null,
    medium: null,
    hard: null,
  };
  const hasQuestionData = notes.length > 0;
  const hasHandles = Boolean(profile.leetcodeId || profile.codeforcesId);
  const showManualReloadHint = hasHandles && !ratings && !ratingsLoading && !ratingsError;
  const displayName = profile.name?.trim() || 'Coder';

  return (
    <div className="h-[calc(100vh-theme(spacing.14))] w-full max-w-[1600px] mx-auto flex flex-col overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="shrink-0">
        <p className="text-l text-muted-foreground">Welcome</p>
        <h1 className="mt-8 text-6xl md:text-7xl xl:text-8xl font-display leading-[0.95] text-foreground">
          {displayName}
        </h1>
      </div>

      {/* Spacer to dynamically push cards to the bottom if space allows */}
      <div className="flex-1 min-h-[1.5rem]" />

      {/* Cards Section - anchored at bottom, guaranteed full height without squishing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-5 shrink-0 h-max w-full pb-2">

        {/* Question Mix Card */}
        <Card className="rounded-3xl flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Question Mix</CardTitle>
            <CardDescription>
              Outer ring: tags | Inner ring: difficulty
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0 flex-1 flex flex-col">
            {!hasQuestionData ? (
              <p className="text-sm text-muted-foreground h-full flex items-center justify-center">
                No questions tracking yet. Add notes to view your mix.
              </p>
            ) : (
              <div className="flex-1 flex items-center justify-center relative min-h-[260px]">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-5xl font-display text-foreground">{notes.length}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Total</span>
                </div>

                <div className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      {/* Outer Ring: Tags / Types */}
                      <Pie
                        data={typeDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={85}
                        outerRadius={115}
                        paddingAngle={2}
                        stroke="transparent"
                      >
                        {typeDistribution.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={TAG_COLORS[index % TAG_COLORS.length]}
                          />
                        ))}
                      </Pie>

                      {/* Inner Ring: Difficulty */}
                      <Pie
                        data={difficultyDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        stroke="transparent"
                      >
                        {difficultyDistribution.map(entry => (
                          <Cell
                            key={entry.name}
                            fill={
                              DIFFICULTY_COLORS[
                              entry.name as 'Easy' | 'Medium' | 'Hard'
                              ]
                            }
                          />
                        ))}
                      </Pie>

                      <RechartsTooltip
                        formatter={(value: number, name: string) => [
                          `${value} Question${value === 1 ? '' : 's'}`,
                          name,
                        ]}
                        labelFormatter={() => 'Question Type'}
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid hsl(var(--border))',
                          backgroundColor: 'hsl(var(--card))',
                          color: 'hsl(var(--foreground))',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          padding: '8px 14px'
                        }}
                        itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '14px', fontWeight: 500 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions Trend Card */}
        <Card className="rounded-3xl flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Questions Trend</CardTitle>
            <CardDescription>Last 7 days line curve</CardDescription>
          </CardHeader>

          <CardContent className="pt-0 flex-1">
            <div className="h-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weeklyData}
                  margin={{ top: 8, right: 10, left: -14, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="questions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="rounded-3xl flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg">Stats Card</CardTitle>
                <CardDescription>
                  LeetCode + Codeforces live ratings
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 rounded-full"
                title="Reload ratings"
                onClick={() => void refreshRatings()}
                disabled={!hasHandles || ratingsLoading}
              >
                {ratingsLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0 flex-1">
            {!hasHandles ? (
              <p className="text-sm text-muted-foreground h-full flex items-center justify-center text-center px-2">
                Add your handles on Profile page to load ratings.
              </p>
            ) : ratingsLoading && !ratings ? (
              <div className="h-full flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching latest ratings...
              </div>
            ) : showManualReloadHint ? (
              <p className="text-sm text-muted-foreground h-full flex items-center justify-center text-center px-2">
                Ratings are loaded on demand. Click reload in the top-right.
              </p>
            ) : ratingsError && !ratings ? (
              <p className="text-sm text-destructive h-full flex items-center justify-center text-center px-2">{ratingsError}</p>
            ) : (
              <div className="h-full flex flex-col gap-3">
                {ratingsError && (
                  <p className="text-xs text-destructive">{ratingsError}</p>
                )}
                <div className="rounded-2xl border border-cyan-700/40 bg-cyan-950/40 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-cyan-100 text-base font-semibold">
                      LeetCode
                    </p>
                    <Code2 className="h-4 w-4 text-cyan-200" />
                  </div>

                  <p className="text-4xl font-bold text-white/95">
                    {formatMetric(leetcodeStats?.rating ?? null)}
                  </p>

                  <p className="text-xs text-cyan-100/90 mt-1">
                    Rank: {leetcodeStats?.rank || 'N/A'} | Solved:{' '}
                    {formatMetric(leetcodeStats?.solved ?? null)}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs font-semibold">
                    <div className="rounded-xl bg-black/25 py-2 text-emerald-300">
                      EASY
                      <div className="text-lg text-white leading-tight">
                        {formatDifficultyCount(leetcodeDifficulty.easy)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-black/25 py-2 text-amber-300">
                      MED
                      <div className="text-lg text-white leading-tight">
                        {formatDifficultyCount(leetcodeDifficulty.medium)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-black/25 py-2 text-rose-300">
                      HARD
                      <div className="text-lg text-white leading-tight">
                        {formatDifficultyCount(leetcodeDifficulty.hard)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/70 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-muted-foreground">
                      Codeforces
                    </p>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <p className="text-2xl font-semibold">
                    {formatMetric(codeforcesStats?.rating ?? null)}
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    Rank: {codeforcesStats?.rank || 'N/A'} | Max:{' '}
                    {formatMetric(codeforcesStats?.maxRating ?? null)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
