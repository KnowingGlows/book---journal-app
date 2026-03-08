"use client";

import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import Link from "next/link";
import { HiOutlineBookOpen, HiOutlinePencilSquare } from "react-icons/hi2";
import { format } from "date-fns";

interface BookData {
  id: string;
  title: string;
  author: string;
  cover: string;
  status: "reading" | "to-read" | "completed";
}

interface JournalData {
  id: string;
  title: string;
  createdAt: { toDate: () => Date };
  mood?: string;
}

export default function Home() {
  const { user } = useAuth();
  const [recentBooks, setRecentBooks] = useState<BookData[]>([]);
  const [recentJournals, setRecentJournals] = useState<JournalData[]>([]);
  const [bookCounts, setBookCounts] = useState({ reading: 0, completed: 0, toRead: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const booksRef = collection(db, "users", user.uid, "books");
      const booksSnap = await getDocs(query(booksRef, orderBy("createdAt", "desc"), limit(4)));
      const books = booksSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BookData));
      setRecentBooks(books);

      const allBooksSnap = await getDocs(booksRef);
      const counts = { reading: 0, completed: 0, toRead: 0 };
      allBooksSnap.docs.forEach((d) => {
        const s = d.data().status;
        if (s === "reading") counts.reading++;
        else if (s === "completed") counts.completed++;
        else counts.toRead++;
      });
      setBookCounts(counts);

      const journalRef = collection(db, "users", user.uid, "journals");
      const journalSnap = await getDocs(query(journalRef, orderBy("createdAt", "desc"), limit(3)));
      setRecentJournals(journalSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as JournalData));
    };
    fetchData();
  }, [user]);

  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">
        <div className="animate-fade-in max-w-5xl">
          <h2 className="text-2xl font-bold text-white">
            Welcome back{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Here&apos;s what&apos;s happening with your reading & journal.</p>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: "Currently Reading", value: bookCounts.reading, color: "text-violet-400" },
              { label: "Completed", value: bookCounts.completed, color: "text-emerald-400" },
              { label: "To Read", value: bookCounts.toRead, color: "text-amber-400" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <p className="text-xs text-zinc-500">{stat.label}</p>
                <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Recent Books */}
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Recent Books</h3>
              <Link href="/books" className="text-xs text-violet-400 hover:text-violet-300">View all</Link>
            </div>
            {recentBooks.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-12 text-zinc-600">
                <HiOutlineBookOpen className="mb-2 h-8 w-8" />
                <p className="text-sm">No books yet. Start tracking your reading!</p>
                <Link href="/books" className="mt-3 text-xs text-violet-400 hover:text-violet-300">Add your first book</Link>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-4 gap-4">
                {recentBooks.map((book) => (
                  <Link key={book.id} href={`/books/${book.id}`} className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900">
                    {book.cover ? (
                      <img src={book.cover} alt={book.title} className="mx-auto h-40 rounded-lg object-cover shadow-lg" />
                    ) : (
                      <div className="mx-auto flex h-40 w-28 items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-500">No cover</div>
                    )}
                    <p className="mt-3 truncate text-sm font-medium text-zinc-200 group-hover:text-white">{book.title}</p>
                    <p className="truncate text-xs text-zinc-500">{book.author}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Journal */}
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Recent Journal Entries</h3>
              <Link href="/journal" className="text-xs text-violet-400 hover:text-violet-300">View all</Link>
            </div>
            {recentJournals.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-12 text-zinc-600">
                <HiOutlinePencilSquare className="mb-2 h-8 w-8" />
                <p className="text-sm">No journal entries yet. Start writing!</p>
                <Link href="/journal" className="mt-3 text-xs text-violet-400 hover:text-violet-300">Write your first entry</Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentJournals.map((entry) => (
                  <Link key={entry.id} href={`/journal/${entry.id}`} className="block rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-zinc-200">{entry.title}</p>
                      <span className="text-xs text-zinc-600">
                        {entry.createdAt?.toDate ? format(entry.createdAt.toDate(), "MMM d, yyyy") : ""}
                      </span>
                    </div>
                    {entry.mood && <span className="mt-1 inline-block text-xs text-zinc-500">{entry.mood}</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
