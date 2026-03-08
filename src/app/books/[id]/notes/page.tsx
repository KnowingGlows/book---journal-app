"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { format } from "date-fns";
import { HiOutlineArrowLeft, HiOutlineTrash, HiOutlinePlus } from "react-icons/hi2";

interface NoteEntry {
  id: string;
  text: string;
  page?: number;
  createdAt: string;
}

interface BookData {
  title: string;
  author: string;
  cover: string;
  notes: NoteEntry[];
}

export default function BookNotesPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [notePage, setNotePage] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const bookRef = user ? doc(db, "users", user.uid, "books", id as string) : null;

  const fetchBook = async () => {
    if (!bookRef) return;
    const snap = await getDoc(bookRef);
    if (snap.exists()) setBook(snap.data() as BookData);
    setLoading(false);
  };

  useEffect(() => {
    fetchBook();
  }, [user, id]);

  const addNote = async () => {
    if (!bookRef || !book || !noteText.trim()) return;
    const note: NoteEntry = {
      id: Date.now().toString(),
      text: noteText.trim(),
      page: notePage ? parseInt(notePage) : undefined,
      createdAt: new Date().toISOString(),
    };
    const updatedNotes = [...(book.notes || []), note];
    await updateDoc(bookRef, { notes: updatedNotes });
    setNoteText("");
    setNotePage("");
    fetchBook();
  };

  const deleteNote = async (noteId: string) => {
    if (!bookRef || !book) return;
    const updatedNotes = (book.notes || []).filter((n) => n.id !== noteId);
    await updateDoc(bookRef, { notes: updatedNotes });
    fetchBook();
  };

  const saveEdit = async (noteId: string) => {
    if (!bookRef || !book || !editText.trim()) return;
    const updatedNotes = (book.notes || []).map((n) =>
      n.id === noteId ? { ...n, text: editText.trim() } : n
    );
    await updateDoc(bookRef, { notes: updatedNotes });
    setEditingId(null);
    setEditText("");
    fetchBook();
  };

  if (loading) {
    return (
      <AuthGuard>
        <Sidebar />
        <main className="ml-64 flex min-h-screen items-center justify-center bg-[#09090b]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
        </main>
      </AuthGuard>
    );
  }

  if (!book) {
    return (
      <AuthGuard>
        <Sidebar />
        <main className="ml-64 flex min-h-screen items-center justify-center bg-[#09090b]">
          <p className="text-zinc-500">Book not found</p>
        </main>
      </AuthGuard>
    );
  }

  const notes = [...(book.notes || [])].reverse();
  const filteredNotes = search
    ? notes.filter(
        (n) =>
          n.text.toLowerCase().includes(search.toLowerCase()) ||
          (n.page && n.page.toString().includes(search))
      )
    : notes;

  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 min-h-screen bg-[#09090b] p-8">
        <div className="animate-fade-in max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href={`/books/${id}`}
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300"
            >
              <HiOutlineArrowLeft className="h-4 w-4" /> Back to {book.title}
            </Link>
            <span className="text-xs text-zinc-600">{notes.length} notes</span>
          </div>

          <div className="flex items-center gap-4">
            {book.cover && (
              <img src={book.cover} alt={book.title} className="h-16 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-xl font-bold text-white">Notes & Passages</h1>
              <p className="text-sm text-zinc-500">{book.title} by {book.author}</p>
            </div>
          </div>

          {/* Add note */}
          <div className="mt-8 rounded-2xl border border-[#1e1e22] bg-[#111113] p-5">
            <div className="flex items-center gap-2">
              <HiOutlinePlus className="h-4 w-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-white">Add a Note</h3>
            </div>
            <div className="mt-3 flex gap-3">
              <input
                type="number"
                placeholder="Page #"
                value={notePage}
                onChange={(e) => setNotePage(e.target.value)}
                className="w-24 rounded-xl border border-[#1e1e22] bg-[#141416] px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-[#6d28d9]"
                min="1"
              />
              <textarea
                placeholder="Write a note, highlight, or important passage..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addNote();
                  }
                }}
                rows={2}
                className="flex-1 resize-none rounded-xl border border-[#1e1e22] bg-[#141416] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-[#6d28d9]"
              />
            </div>
            <div className="mt-3 flex justify-between items-center">
              <p className="text-[10px] text-zinc-700">Shift+Enter for new line, Enter to save</p>
              <button
                onClick={addNote}
                disabled={!noteText.trim()}
                className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-50"
              >
                Add Note
              </button>
            </div>
          </div>

          {/* Search */}
          {notes.length > 3 && (
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-6 w-full rounded-xl border border-[#1e1e22] bg-[#141416] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-[#6d28d9]"
            />
          )}

          {/* Notes list */}
          {filteredNotes.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1e1e22] py-16">
              <p className="text-sm text-zinc-600">
                {search ? "No notes match your search" : "No notes yet. Add your first one above!"}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="group rounded-2xl border border-[#1e1e22] bg-[#111113] p-4 transition-all hover:border-[#2a2a2e]"
                >
                  {editingId === note.id ? (
                    <div>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-[#1e1e22] bg-[#141416] px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-[#6d28d9]"
                        autoFocus
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => saveEdit(note.id)}
                          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-[#1e1e22] px-3 py-1.5 text-xs text-zinc-400 hover:bg-[#1a1a1e]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {note.page && (
                            <span className="rounded bg-[#27272a] px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                              p. {note.page}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-600">
                            {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 transition-all group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setEditingId(note.id);
                              setEditText(note.text);
                            }}
                            className="rounded-lg px-2 py-1 text-[10px] text-zinc-500 hover:bg-[#1a1a1e] hover:text-zinc-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="rounded-lg p-1 text-zinc-700 hover:text-red-400"
                          >
                            <HiOutlineTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                        {note.text}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
