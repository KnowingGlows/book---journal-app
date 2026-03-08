"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { format } from "date-fns";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";

const moods = [
  { label: "Great", value: "great", color: "bg-[#022c22] text-emerald-400 border-[#064e3b]" },
  { label: "Good", value: "good", color: "bg-[#2e1065] text-violet-400 border-[#4c1d95]" },
  { label: "Okay", value: "okay", color: "bg-[#451a03] text-amber-400 border-[#78350f]" },
  { label: "Bad", value: "bad", color: "bg-[#431407] text-orange-400 border-[#7c2d12]" },
  { label: "Awful", value: "awful", color: "bg-[#450a0a] text-red-400 border-[#7f1d1d]" },
];

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  createdAt: { toDate: () => Date };
}

export default function JournalPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filter, setFilter] = useState("all");

  const fetchEntries = async () => {
    if (!user) return;
    const ref = collection(db, "users", user.uid, "journals");
    const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
    setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as JournalEntry));
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  const deleteEntry = async (entryId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !confirm("Delete this journal entry?")) return;
    await deleteDoc(doc(db, "users", user.uid, "journals", entryId));
    fetchEntries();
  };

  const allTags = Array.from(new Set(entries.flatMap((e) => e.tags || [])));
  const filteredEntries = filter === "all" ? entries : entries.filter((e) => e.mood === filter || (e.tags || []).includes(filter));

  const moodColor = (m: string) => moods.find((mood) => mood.value === m)?.color || "bg-[#1a1a1e] text-zinc-400";

  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">
        <div className="animate-fade-in max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Journal</h2>
              <p className="mt-1 text-sm text-zinc-500">{entries.length} entries</p>
            </div>
            <Link
              href="/journal/new"
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500"
            >
              <HiOutlinePlus className="h-4 w-4" />
              New Entry
            </Link>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filter === "all" ? "bg-[#2e1065] text-violet-400" : "text-zinc-500 hover:bg-[#1a1a1e] hover:text-zinc-300"
              }`}
            >
              All
            </button>
            {moods.map((m) => (
              <button
                key={m.value}
                onClick={() => setFilter(m.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === m.value ? m.color.replace("/10", "/20") : "text-zinc-500 hover:bg-[#1a1a1e] hover:text-zinc-300"
                }`}
              >
                {m.label}
              </button>
            ))}
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilter(tag)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === tag ? "bg-[#2e1065] text-violet-400" : "text-zinc-500 hover:bg-[#1a1a1e] hover:text-zinc-300"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* Entries */}
          {filteredEntries.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1e1e22] py-16 text-zinc-600">
              <p className="text-sm">No journal entries yet</p>
              <Link href="/journal/new" className="mt-3 text-xs text-violet-400 hover:text-violet-300">
                Write your first entry
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {filteredEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/journal/${entry.id}`}
                  className="group block rounded-2xl border border-[#1e1e22] bg-[#111113] p-5 transition-all hover:border-[#2a2a2e] hover:bg-[#161618]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-zinc-200 group-hover:text-white">{entry.title}</h3>
                        <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium ${moodColor(entry.mood)}`}>
                          {moods.find((m) => m.value === entry.mood)?.label || entry.mood}
                        </span>
                      </div>
                      {entry.content && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500">{entry.content}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-zinc-600">
                          {entry.createdAt?.toDate ? format(entry.createdAt.toDate(), "MMM d, yyyy 'at' h:mm a") : ""}
                        </span>
                        {(entry.tags || []).map((tag) => (
                          <span key={tag} className="rounded bg-[#1a1a1e] px-1.5 py-0.5 text-[10px] text-zinc-500">#{tag}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteEntry(entry.id, e)}
                      className="ml-3 rounded-lg p-1.5 text-zinc-700 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </main>
    </AuthGuard>
  );
}
