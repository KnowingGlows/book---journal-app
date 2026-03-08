"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { HiOutlineArrowLeft } from "react-icons/hi2";

interface BookData {
  title: string;
  author: string;
  cover: string;
  noteContent?: string;
  notes?: unknown[];
}

export default function BookNotesPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const bookRef = user ? doc(db, "users", user.uid, "books", id as string) : null;

  const fetchBook = async () => {
    if (!bookRef) return;
    const snap = await getDoc(bookRef);
    if (snap.exists()) {
      const data = snap.data() as BookData;
      setBook(data);
      // Use noteContent field, or migrate old notes array to a single string
      if (data.noteContent !== undefined) {
        setContent(data.noteContent);
      } else if (data.notes && Array.isArray(data.notes) && data.notes.length > 0) {
        // Migrate old per-entry notes into a single document
        const migrated = (data.notes as { text: string; page?: number }[])
          .map((n) => (n.page ? `[p. ${n.page}] ${n.text}` : n.text))
          .join("\n\n");
        setContent(migrated);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBook();
  }, [user, id]);

  const saveContent = useCallback(
    async (text: string) => {
      if (!bookRef) return;
      setSaveStatus("saving");
      await updateDoc(bookRef, { noteContent: text });
      setSaveStatus("saved");
    },
    [bookRef]
  );

  const handleChange = (text: string) => {
    setContent(text);
    setSaveStatus("unsaved");
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveContent(text), 1000);
  };

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  // Ctrl+S / Cmd+S to save immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveContent(content);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [content, saveContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.max(textareaRef.current.scrollHeight, 500) + "px";
    }
  }, [content]);

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

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 min-h-screen bg-[#09090b] p-8">
        <div className="animate-fade-in mx-auto max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href={`/books/${id}`}
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300"
            >
              <HiOutlineArrowLeft className="h-4 w-4" /> Back to {book.title}
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-zinc-600">{wordCount} words</span>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                  saveStatus === "saved"
                    ? "bg-[#022c22] text-emerald-400"
                    : saveStatus === "saving"
                    ? "bg-[#451a03] text-amber-400"
                    : "bg-[#1a1a1e] text-zinc-500"
                }`}
              >
                {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving..." : "Unsaved"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {book.cover && (
              <img src={book.cover} alt={book.title} className="h-16 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-xl font-bold text-white">Notes</h1>
              <p className="text-sm text-zinc-500">{book.title} by {book.author}</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[#1e1e22] bg-[#111113] p-6">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Start writing your notes, highlights, thoughts, important passages..."
              className="w-full resize-none border-none bg-transparent text-sm leading-relaxed text-zinc-200 placeholder-zinc-700 outline-none"
              style={{ minHeight: "500px" }}
              autoFocus
            />
          </div>

          <p className="mt-3 text-center text-[10px] text-zinc-700">
            Auto-saves as you type &middot; {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+S to save instantly
          </p>
        </div>
      </main>
    </AuthGuard>
  );
}
