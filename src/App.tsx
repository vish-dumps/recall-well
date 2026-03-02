import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { useNotes } from "@/hooks/useNotes";
import { useTheme } from "@/hooks/useTheme";
import { AppLayout } from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import NotesPage from "@/pages/NotesPage";
import GroupsPage from "@/pages/GroupsPage";
import GroupQuestionsPage from "@/pages/GroupQuestionsPage";
import AddNotePage from "@/pages/AddNotePage";
import NoteViewPage from "@/pages/NoteViewPage";
import ReviewPage from "@/pages/ReviewPage";
import DashboardPage from "@/pages/DashboardPage";
import ProfilePage from "@/pages/ProfilePage";
import NotFound from "./pages/NotFound";
import { Note } from "./types/note";
import { RatingsProvider } from "@/hooks/useRatings";

const queryClient = new QueryClient();

function AppRoutes() {
  const { notes, customGroups, createCustomGroup, addNote, updateNote, deleteNote, getDueNotes, reviewNote } = useNotes();
  useTheme(); // ensure theme class is applied
  const dueNotes = getDueNotes();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={
        <AppLayout dueCount={dueNotes.length} fullWidth disableMainScroll>
          <DashboardPage notes={notes} />
        </AppLayout>
      } />
      <Route path="/app" element={
        <AppLayout dueCount={dueNotes.length}>
          <NotesPage notes={notes} onUpdate={updateNote} />
        </AppLayout>
      } />
      <Route path="/groups" element={
        <AppLayout dueCount={dueNotes.length}>
          <GroupsPage notes={notes} customGroups={customGroups} onCreateGroup={createCustomGroup} />
        </AppLayout>
      } />
      <Route path="/groups/:groupId" element={
        <AppLayout dueCount={dueNotes.length}>
          <GroupQuestionsPage notes={notes} customGroups={customGroups} onUpdate={updateNote} />
        </AppLayout>
      } />
      <Route path="/new" element={
        <AppLayout dueCount={dueNotes.length} fullWidth>
          <AddNotePage onSave={addNote} />
        </AppLayout>
      } />
      <Route path="/note/:id" element={
        <AppLayout dueCount={dueNotes.length} fullWidth>
          <NoteViewPage
            notes={notes}
            customGroups={customGroups}
            onCreateGroup={createCustomGroup}
            onDelete={deleteNote}
            onUpdate={updateNote}
          />
        </AppLayout>
      } />
      <Route path="/edit/:id" element={
        <AppLayout dueCount={dueNotes.length} fullWidth>
          <EditNoteWrapper notes={notes} onSave={addNote} onUpdate={updateNote} />
        </AppLayout>
      } />
      <Route path="/review" element={
        <AppLayout dueCount={dueNotes.length}>
          <ReviewPage dueNotes={dueNotes} onReview={reviewNote} />
        </AppLayout>
      } />
      <Route path="/profile" element={
        <AppLayout dueCount={dueNotes.length}>
          <ProfilePage />
        </AppLayout>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

type SaveNoteInput = Omit<Note, "id" | "revisionInterval" | "nextRevisionDate" | "createdAt" | "updatedAt">;

function EditNoteWrapper({
  notes,
  onSave,
  onUpdate,
}: {
  notes: Note[];
  onSave: (note: SaveNoteInput) => Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
}) {
  const params = useParams();
  const note = notes.find((n) => n.id === params.id);
  if (!note) return <div className="text-muted-foreground">Note not found.</div>;
  return <AddNotePage onSave={onSave} editNote={note} onUpdate={onUpdate} />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RatingsProvider>
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </RatingsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
