"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp, arrayUnion, deleteDoc } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { HiOutlineArrowLeft, HiOutlineTrash, HiOutlinePencil, HiOutlineMagnifyingGlass, HiOutlineXMark } from "react-icons/hi2";

interface ReadingLogEntry {
  date: string;
  pages: number;
}

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
  totalPages: number;
  pagesRead: number;
  status: "reading" | "to-read" | "completed";
  createdAt: { toDate: () => Date };
  completedAt?: { toDate: () => Date };
  description?: string;
  readingLog: ReadingLogEntry[];
  notes: NoteEntry[];
  noteContent?: string;
}

const statusStyles: Record<string, string> = {
  reading: "bg-[#2e1065] text-violet-400 border-[#4c1d95]",
  "to-read": "bg-[#451a03] text-amber-400 border-[#78350f]",
  completed: "bg-[#022c22] text-emerald-400 border-[#064e3b]",
};

export default function BookDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagesToday, setPagesToday] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSearch, setEditSearch] = useState("");
  const [editResults, setEditResults] = useState<{ id: string; volumeInfo: { title: string; authors?: string[]; pageCount?: number; imageLinks?: { thumbnail?: string }; description?: string } }[]>([]);
  const [editSearching, setEditSearching] = useState(false);
  const editTimeout = useRef<NodeJS.Timeout | null>(null);

  const bookRef = user ? doc(db, "users", user.uid, "books", id as string) : null;

  const fetchBook = async () => {
    if (!bookRef) return;
    const snap = await getDoc(bookRef);
    if (snap.exists()) {
      setBook(snap.data() as BookData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBook();
  }, [user, id]);

  const logPages = async () => {
    if (!bookRef || !book || !pagesToday) return;
    const pages = parseInt(pagesToday);
    if (isNaN(pages) || pages <= 0) return;

    const newPagesRead = book.pagesRead + pages;
    const entry: ReadingLogEntry = { date: new Date().toISOString(), pages };

    await updateDoc(bookRef, {
      pagesRead: newPagesRead,
      readingLog: arrayUnion(entry),
    });
    setPagesToday("");
    fetchBook();
  };

  const changeStatus = async (newStatus: "reading" | "to-read" | "completed") => {
    if (!bookRef) return;
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "completed") {
      updates.completedAt = Timestamp.now();
    }
    await updateDoc(bookRef, updates);
    fetchBook();
  };

  const deleteBook = async () => {
    if (!bookRef) return;
    if (!confirm("Are you sure you want to delete this book?")) return;
    await deleteDoc(bookRef);
    router.push("/books");
  };

  const handleEditSearch = (val: string) => {
    setEditSearch(val);
    if (editTimeout.current) clearTimeout(editTimeout.current);
    if (val.length < 2) { setEditResults([]); return; }
    setEditSearching(true);
    editTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      setEditResults(data.items || []);
      setEditSearching(false);
    }, 400);
  };

  const replaceBook = async (result: { volumeInfo: { title: string; authors?: string[]; pageCount?: number; imageLinks?: { thumbnail?: string }; description?: string } }) => {
    if (!bookRef) return;
    const { volumeInfo } = result;
    const cover = volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:") || "";
    await updateDoc(bookRef, {
      title: volumeInfo.title,
      author: volumeInfo.authors?.join(", ") || "Unknown",
      cover,
      totalPages: volumeInfo.pageCount || 0,
      description: volumeInfo.description || "",
    });
    setShowEditModal(false);
    setEditSearch("");
    setEditResults([]);
    fetchBook();
  };

  if (loading) {
    return (
      <AuthGuard>
        <Sidebar />
        <main className="ml-64 flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
        </main>
      </AuthGuard>
    );
  }

  if (!book) {
    return (
      <AuthGuard>
        <Sidebar />
        <main className="ml-64 flex min-h-screen items-center justify-center">
          <p className="text-zinc-500">Book not found</p>
        </main>
      </AuthGuard>
    );
  }

  const progress = book.totalPages > 0 ? Math.min(100, Math.round((book.pagesRead / book.totalPages) * 100)) : 0;
  const startDate = book.createdAt?.toDate ? book.createdAt.toDate() : null;
  const endDate = book.completedAt?.toDate ? book.completedAt.toDate() : null;
  const daysReading = startDate ? differenceInDays(endDate || new Date(), startDate) + 1 : 0;
  const avgPagesPerDay = daysReading > 0 && book.pagesRead > 0 ? Math.round(book.pagesRead / daysReading) : 0;

  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">
        <div className="animate-fade-in max-w-4xl">
          <Link href="/books" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300">
            <HiOutlineArrowLeft className="h-4 w-4" /> Back to Books
          </Link>

          {/* Header */}
          <div className="flex gap-6">
            {book.cover ? (
              <img src={book.cover} alt={book.title} className="h-56 rounded-xl object-cover shadow-2xl" />
            ) : (
              <div className="flex h-56 w-36 items-center justify-center rounded-xl bg-[#1a1a1e] text-sm text-zinc-500">No cover</div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{book.title}</h1>
              <p className="mt-1 text-sm text-zinc-400">by {book.author}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(["reading", "to-read", "completed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      book.status === s ? statusStyles[s] : "border-[#1e1e22] text-zinc-600 hover:border-[#2a2a2e] hover:text-zinc-400"
                    }`}
                  >
                    {s === "reading" ? "Reading" : s === "to-read" ? "To Read" : "Completed"}
                  </button>
                ))}
                <button onClick={() => { setShowEditModal(true); setEditSearch(book.title); handleEditSearch(book.title); }} className="ml-auto rounded-lg border border-[#1e1e22] p-1.5 text-zinc-600 transition-all hover:border-violet-500/30 hover:text-violet-400">
                  <HiOutlinePencil className="h-4 w-4" />
                </button>
                <button onClick={deleteBook} className="rounded-lg border border-[#1e1e22] p-1.5 text-zinc-600 transition-all hover:border-red-500/30 hover:text-red-400">
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </div>

              {/* Stats */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Pages Read", value: `${book.pagesRead}/${book.totalPages || "?"}` },
                  { label: "Progress", value: `${progress}%` },
                  { label: "Days Reading", value: daysReading },
                  { label: "Avg Pages/Day", value: avgPagesPerDay },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-[#1e1e22] bg-[#111113] px-3 py-2.5">
                    <p className="text-[10px] text-zinc-500">{stat.label}</p>
                    <p className="text-lg font-semibold text-zinc-200">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              {book.totalPages > 0 && (
                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1e]">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {startDate && (
                <p className="mt-3 text-xs text-zinc-600">
                  Started {format(startDate, "MMMM d, yyyy")}
                  {endDate && ` - Finished ${format(endDate, "MMMM d, yyyy")}`}
                </p>
              )}
            </div>
          </div>

          {/* Log pages */}
          {book.status === "reading" && (
            <div className="mt-8 rounded-2xl border border-[#1e1e22] bg-[#111113] p-5">
              <h3 className="text-sm font-semibold text-white">Log Today&apos;s Reading</h3>
              <div className="mt-3 flex gap-3">
                <input
                  type="number"
                  placeholder="Pages read today"
                  value={pagesToday}
                  onChange={(e) => setPagesToday(e.target.value)}
                  className="w-48 rounded-xl border border-[#1e1e22] bg-[#141416] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-[#6d28d9]"
                  min="1"
                />
                <button
                  onClick={logPages}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500"
                >
                  Log
                </button>
              </div>
            </div>
          )}

          {/* Reading Log */}
          {book.readingLog && book.readingLog.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[#1e1e22] bg-[#111113] p-5">
              <h3 className="text-sm font-semibold text-white">Reading Log</h3>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {[...book.readingLog].reverse().map((entry, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-[#141416] px-3 py-2">
                    <span className="text-xs text-zinc-400">{format(new Date(entry.date), "MMM d, yyyy 'at' h:mm a")}</span>
                    <span className="text-xs font-medium text-violet-400">+{entry.pages} pages</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <Link
            href={`/books/${id}/notes`}
            className="mt-6 flex items-center justify-between rounded-2xl border border-[#1e1e22] bg-[#111113] p-5 transition-all hover:border-[#2a2a2e] hover:bg-[#161618]"
          >
            <div>
              <h3 className="text-sm font-semibold text-white">Notes</h3>
              <p className="mt-1 text-xs text-zinc-500">
                {book.noteContent
                  ? `${book.noteContent.trim().split(/\s+/).length} words`
                  : "No notes yet. Tap to start writing."}
              </p>
            </div>
            <span className="text-xs text-violet-400">Open editor &rarr;</span>
          </Link>

          {/* Description */}
          {book.description && (
            <div className="mt-6 rounded-2xl border border-[#1e1e22] bg-[#111113] p-5">
              <h3 className="text-sm font-semibold text-white">About this Book</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{book.description}</p>
            </div>
          )}
        </div>

        {/* Edit Book Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000e6] backdrop-blur-sm">
            <div className="animate-fade-in w-full max-w-lg rounded-2xl border border-[#1e1e22] bg-[#111113] p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Replace Book Info</h3>
                <button onClick={() => { setShowEditModal(false); setEditSearch(""); setEditResults([]); }} className="text-zinc-500 hover:text-zinc-300">
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Search for the correct book to update title, author, cover & page count.</p>

              <div className="relative mt-4">
                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search for the correct book..."
                  value={editSearch}
                  onChange={(e) => handleEditSearch(e.target.value)}
                  className="w-full rounded-xl border border-[#27272a] bg-[#1a1a1e] py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-[#6d28d9]"
                  autoFocus
                />
              </div>

              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                {editSearching && <p className="py-4 text-center text-xs text-zinc-500">Searching...</p>}
                {!editSearching && editSearch.length >= 2 && editResults.length === 0 && (
                  <p className="py-4 text-center text-xs text-zinc-500">No results found</p>
                )}
                {editResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => replaceBook(result)}
                    className="flex w-full items-center gap-3 rounded-xl border border-[#1e1e22] bg-[#141416] p-3 text-left transition-all hover:border-[#2a2a2e] hover:bg-[#1a1a1e]"
                  >
                    {result.volumeInfo.imageLinks?.thumbnail ? (
                      <img src={result.volumeInfo.imageLinks.thumbnail.replace("http:", "https:")} alt="" className="h-16 w-11 rounded object-cover" />
                    ) : (
                      <div className="flex h-16 w-11 items-center justify-center rounded bg-[#27272a] text-[8px] text-zinc-500">No img</div>
                    )}
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium text-zinc-200">{result.volumeInfo.title}</p>
                      <p className="truncate text-xs text-zinc-500">{result.volumeInfo.authors?.join(", ") || "Unknown"}</p>
                      {result.volumeInfo.pageCount && (
                        <p className="text-xs text-zinc-600">{result.volumeInfo.pageCount} pages</p>
                      )}
                    </div>
                    <span className="rounded-lg bg-violet-600 px-3 py-1.5 text-[10px] font-medium text-white">Select</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
