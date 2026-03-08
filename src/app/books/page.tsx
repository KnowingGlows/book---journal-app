"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, orderBy, query, Timestamp, updateDoc, doc } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { HiOutlinePlus, HiOutlineMagnifyingGlass, HiOutlineXMark } from "react-icons/hi2";

interface BookResult {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    pageCount?: number;
    imageLinks?: { thumbnail?: string };
    description?: string;
  };
}

interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  totalPages: number;
  pagesRead: number;
  status: "reading" | "to-read" | "completed";
  createdAt: { toDate: () => Date };
  completedAt?: { toDate: () => Date };
  description?: string;
}

const statusStyles: Record<string, string> = {
  reading: "bg-[#2e1065] text-violet-400 border-[#4c1d95]",
  "to-read": "bg-[#451a03] text-amber-400 border-[#78350f]",
  completed: "bg-[#022c22] text-emerald-400 border-[#064e3b]",
};

const statusLabels: Record<string, string> = {
  reading: "Reading",
  "to-read": "To Read",
  completed: "Completed",
};

export default function BooksPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchBooks = async () => {
    if (!user) return;
    const ref = collection(db, "users", user.uid, "books");
    const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
    setBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Book));
  };

  useEffect(() => {
    fetchBooks();
  }, [user]);

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(val)}`);
      const data = await res.json();
      setSearchResults(data.items || []);
      setSearching(false);
    }, 400);
  };

  const addBook = async (result: BookResult, status: "reading" | "to-read") => {
    if (!user) return;
    const { volumeInfo } = result;
    const cover = volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:") || "";
    await addDoc(collection(db, "users", user.uid, "books"), {
      title: volumeInfo.title,
      author: volumeInfo.authors?.join(", ") || "Unknown",
      cover,
      totalPages: volumeInfo.pageCount || 0,
      pagesRead: 0,
      status,
      description: volumeInfo.description || "",
      createdAt: Timestamp.now(),
      readingLog: [],
      notes: [],
    });
    setShowModal(false);
    setSearchQuery("");
    setSearchResults([]);
    fetchBooks();
  };

  const filteredBooks = filter === "all" ? books : books.filter((b) => b.status === filter);

  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">
        <div className="animate-fade-in max-w-5xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Books</h2>
              <p className="mt-1 text-sm text-zinc-500">{books.length} books in your library</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500"
            >
              <HiOutlinePlus className="h-4 w-4" />
              Add Book
            </button>
          </div>

          {/* Filters */}
          <div className="mt-6 flex gap-2">
            {["all", "reading", "to-read", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === f
                    ? "bg-[#2e1065] text-violet-400"
                    : "text-zinc-500 hover:bg-[#1a1a1e] hover:text-zinc-300"
                }`}
              >
                {f === "all" ? "All" : statusLabels[f]}
              </button>
            ))}
          </div>

          {/* Book Grid */}
          {filteredBooks.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1e1e22] py-16 text-zinc-600">
              <p className="text-sm">No books found</p>
              <button onClick={() => setShowModal(true)} className="mt-3 text-xs text-violet-400 hover:text-violet-300">
                Add your first book
              </button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredBooks.map((book) => (
                <Link
                  key={book.id}
                  href={`/books/${book.id}`}
                  className="group rounded-2xl border border-[#1e1e22] bg-[#111113] p-4 transition-all hover:border-[#2a2a2e] hover:bg-[#161618]"
                >
                  {book.cover ? (
                    <img src={book.cover} alt={book.title} className="mx-auto h-44 rounded-lg object-cover shadow-lg transition-transform group-hover:scale-[1.02]" />
                  ) : (
                    <div className="mx-auto flex h-44 w-28 items-center justify-center rounded-lg bg-[#1a1a1e] text-xs text-zinc-500">No cover</div>
                  )}
                  <p className="mt-3 truncate text-sm font-medium text-zinc-200 group-hover:text-white">{book.title}</p>
                  <p className="truncate text-xs text-zinc-500">{book.author}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium ${statusStyles[book.status]}`}>
                      {statusLabels[book.status]}
                    </span>
                    {book.status === "reading" && book.totalPages > 0 && (
                      <span className="text-[10px] text-zinc-600">
                        {Math.round((book.pagesRead / book.totalPages) * 100)}%
                      </span>
                    )}
                  </div>
                  {book.status === "reading" && book.totalPages > 0 && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#1a1a1e]">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${Math.min(100, (book.pagesRead / book.totalPages) * 100)}%` }}
                      />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Add Book Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000e6] backdrop-blur-sm">
            <div className="animate-fade-in w-full max-w-lg rounded-2xl border border-[#1e1e22] bg-[#111113] p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Add a Book</h3>
                <button onClick={() => { setShowModal(false); setSearchQuery(""); setSearchResults([]); }} className="text-zinc-500 hover:text-zinc-300">
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>

              <div className="relative mt-4">
                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search for a book..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full rounded-xl border border-[#27272a] bg-[#1a1a1e] py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-[#6d28d9]"
                  autoFocus
                />
              </div>

              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                {searching && <p className="py-4 text-center text-xs text-zinc-500">Searching...</p>}
                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="py-4 text-center text-xs text-zinc-500">No results found</p>
                )}
                {searchResults.map((result) => (
                  <div key={result.id} className="flex items-center gap-3 rounded-xl border border-[#1e1e22] bg-[#141416] p-3">
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
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => addBook(result, "reading")}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-[10px] font-medium text-white hover:bg-violet-500"
                      >
                        Reading
                      </button>
                      <button
                        onClick={() => addBook(result, "to-read")}
                        className="rounded-lg border border-[#27272a] px-3 py-1.5 text-[10px] font-medium text-zinc-400 hover:bg-[#1a1a1e]"
                      >
                        To Read
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
