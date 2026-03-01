import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { useNotes } from "@/hooks/useNotes";
import { useTheme } from "@/hooks/useTheme";
import { AppLayout } from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import NotesPage from "@/pages/NotesPage";
import AddNotePage from "@/pages/AddNotePage";
import NoteViewPage from "@/pages/NoteViewPage";
import ReviewPage from "@/pages/ReviewPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { notes, addNote, updateNote, deleteNote, getDueNotes, reviewNote } = useNotes();
  useTheme(); // ensure theme class is applied
  const dueNotes = getDueNotes();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={
        <AppLayout dueCount={dueNotes.length}>
          <NotesPage notes={notes} />
        </AppLayout>
      } />
      <Route path="/new" element={
        <AppLayout dueCount={dueNotes.length}>
          <AddNotePage onSave={addNote} />
        </AppLayout>
      } />
      <Route path="/note/:id" element={
        <AppLayout dueCount={dueNotes.length}>
          <NoteViewPage notes={notes} onDelete={deleteNote} />
        </AppLayout>
      } />
      <Route path="/edit/:id" element={
        <AppLayout dueCount={dueNotes.length}>
          <EditNoteWrapper notes={notes} onSave={addNote} onUpdate={updateNote} />
        </AppLayout>
      } />
      <Route path="/review" element={
        <AppLayout dueCount={dueNotes.length}>
          <ReviewPage dueNotes={dueNotes} onReview={reviewNote} />
        </AppLayout>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function EditNoteWrapper({ notes, onSave, onUpdate }: { notes: any[]; onSave: any; onUpdate: any }) {
  const params = useParams();
  const note = notes.find((n: any) => n.id === params.id);
  if (!note) return <div className="text-muted-foreground">Note not found.</div>;
  return <AddNotePage onSave={onSave} editNote={note} onUpdate={onUpdate} />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
