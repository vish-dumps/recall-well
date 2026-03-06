import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Sparkles, FolderPlus, Pin, Hash, Layers, Heart } from 'lucide-react';
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
  pinnedGroups: string[];
  onCreateGroup: (groupName: string) => string | null;
  onTogglePinGroup: (groupId: string) => void;
}

function getGroupGradient(group: GroupCard) {
  if (group.id === 'favorite') {
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
  if (group.id === 'favorite') return Heart;
  if (group.kind === 'tag') return Hash;
  if (group.kind === 'custom') return FolderPlus;
  return Layers;
}

export default function GroupsPage({ notes, customGroups, pinnedGroups, onCreateGroup, onTogglePinGroup }: GroupsPageProps) {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const smartGroups = useMemo(() => buildSmartGroups(notes), [notes]);
  const customGroupCards = useMemo(() => buildCustomGroupCards(customGroups, notes), [customGroups, notes]);

  const allGroups = useMemo(() => {
    const favoriteGroup = smartGroups.find(g => g.id === 'favorite');
    const otherSmartGroups = smartGroups.filter(g => g.id !== 'favorite');

    const pinned = [...otherSmartGroups, ...customGroupCards].filter(g => pinnedGroups.includes(g.id));
    const unpinnedAuto = otherSmartGroups.filter(g => !pinnedGroups.includes(g.id));
    const unpinnedCustom = customGroupCards.filter(g => !pinnedGroups.includes(g.id));

    const result = [];
    if (favoriteGroup) result.push(favoriteGroup);
    result.push(...pinned);
    result.push(...unpinnedAuto);
    result.push(...unpinnedCustom);
    return result;
  }, [smartGroups, customGroupCards, pinnedGroups]);

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
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            All Groups
          </p>
          <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)} className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Group
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {allGroups.map(group => {
            const Icon = getGroupIcon(group);
            const isPinned = pinnedGroups.includes(group.id);
            const isFavoriteCard = group.id === 'favorite';
            return (
              <div key={group.id} className="relative group/card h-full">
                <Link
                  to={`/groups/${encodeURIComponent(group.id)}`}
                  className={cn(
                    "group relative block min-h-[148px] overflow-hidden rounded-2xl border bg-card/70 p-5 text-left transition-colors hover:border-primary/40 h-full",
                    isFavoriteCard ? "border-sky-500/30" : (isPinned ? "border-primary/30" : "border-border")
                  )}
                >
                  <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', getGroupGradient(group))} />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between">
                      <Icon className={cn("h-5 w-5", isFavoriteCard ? "text-sky-500" : "text-muted-foreground")} />
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/85 text-sm font-mono text-foreground">
                        {group.count}
                      </span>
                    </div>
                    <div className="mt-auto">
                      <p className={cn("font-display text-xl uppercase tracking-wide", isFavoriteCard ? "text-sky-500" : "text-foreground")}>{group.label}</p>
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    </div>
                  </div>
                </Link>
                {!isFavoriteCard && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onTogglePinGroup(group.id);
                    }}
                    className={cn(
                      "absolute top-4 right-16 p-2 rounded-full transition-all duration-200 z-10",
                      isPinned
                        ? "opacity-100 bg-primary/10 text-primary hover:bg-primary/20"
                        : "opacity-0 group-hover/card:opacity-100 bg-background/80 text-muted-foreground hover:bg-muted"
                    )}
                    title={isPinned ? "Unpin group" : "Pin group to top"}
                  >
                    <Pin className={cn("h-4 w-4", isPinned && "fill-primary")} />
                  </button>
                )}
              </div>
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
