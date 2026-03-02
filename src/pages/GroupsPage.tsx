import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Sparkles, FolderPlus, Pin, Hash, Layers } from 'lucide-react';
import { Note, normalizeGroupName, toGroupKey } from '@/types/note';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GroupCard, buildCustomGroupCards, buildSmartGroups } from '@/lib/groups';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GroupsPageProps {
  notes: Note[];
  customGroups: string[];
  onCreateGroup: (groupName: string) => string | null;
}

function getGroupGradient(group: GroupCard) {
  if (group.id === 'pinned') {
    return 'from-sky-500/20 via-transparent to-transparent';
  }

  if (group.id === 'difficulty:easy') {
    return 'from-emerald-500/25 via-transparent to-transparent';
  }

  if (group.id === 'difficulty:medium') {
    return 'from-amber-500/25 via-transparent to-transparent';
  }

  if (group.id === 'difficulty:hard') {
    return 'from-red-500/25 via-transparent to-transparent';
  }

  if (group.kind === 'tag') {
    return 'from-cyan-500/20 via-transparent to-transparent';
  }

  return 'from-primary/20 via-transparent to-transparent';
}

function getGroupIcon(group: GroupCard) {
  if (group.id === 'pinned') return Pin;
  if (group.kind === 'tag') return Hash;
  if (group.kind === 'custom') return FolderPlus;
  return Layers;
}

export default function GroupsPage({ notes, customGroups, onCreateGroup }: GroupsPageProps) {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const smartGroups = useMemo(() => buildSmartGroups(notes), [notes]);
  const customGroupCards = useMemo(() => buildCustomGroupCards(customGroups, notes), [customGroups, notes]);

  const handleCreateGroup = () => {
    const normalized = normalizeGroupName(newGroupName);
    if (!normalized) {
      toast.error('Group name is required');
      return;
    }

    const created = onCreateGroup(normalized);
    if (!created) {
      toast.error('Could not create group');
      return;
    }

    const createdGroupId = `custom:${toGroupKey(created)}`;
    setNewGroupName('');
    setCreateDialogOpen(false);
    navigate(`/groups/${encodeURIComponent(createdGroupId)}`);
    toast.success(`Group ready: ${created}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-display tracking-wide text-foreground">GROUPS</h1>
        <p className="text-xs font-mono text-muted-foreground">Click any card to open its questions page</p>
      </div>

      <section className="rounded-2xl border border-border bg-card/40 p-4 md:p-5">
        <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Auto Groups
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {smartGroups.map(group => {
            const Icon = getGroupIcon(group);
            return (
              <Link
                key={group.id}
                to={`/groups/${encodeURIComponent(group.id)}`}
                className="group relative min-h-[148px] overflow-hidden rounded-2xl border border-border bg-card/70 p-5 text-left transition-colors hover:border-primary/40"
              >
                <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', getGroupGradient(group))} />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/85 text-sm font-mono text-foreground">
                      {group.count}
                    </span>
                  </div>
                  <div className="mt-auto">
                    <p className="font-display text-xl uppercase tracking-wide text-foreground">{group.label}</p>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card/40 p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-foreground">Your Groups</p>
          <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)} className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Group
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {customGroupCards.map(group => {
            const Icon = getGroupIcon(group);
            return (
              <Link
                key={group.id}
                to={`/groups/${encodeURIComponent(group.id)}`}
                className="group relative min-h-[148px] overflow-hidden rounded-2xl border border-border bg-card/70 p-5 text-left transition-colors hover:border-primary/40"
              >
                <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', getGroupGradient(group))} />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/85 text-sm font-mono text-foreground">
                      {group.count}
                    </span>
                  </div>
                  <div className="mt-auto">
                    <p className="font-display text-xl uppercase tracking-wide text-foreground">{group.label}</p>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="flex min-h-[148px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 transition-colors hover:border-primary/40"
            title="Create group"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border text-3xl text-muted-foreground">
              +
            </span>
          </button>
        </div>
      </section>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>Create a custom bucket to organize your saved questions.</DialogDescription>
          </DialogHeader>
          <Input
            value={newGroupName}
            onChange={event => setNewGroupName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCreateGroup();
              }
            }}
            placeholder="e.g. Binary Search Grind"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
