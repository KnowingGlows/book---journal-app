"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, orderBy, query, Timestamp, deleteDoc, doc } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { format } from "date-fns";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";

const moods = [
  { label: "Great", value: "great", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { label: "Good", value: "good", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  { label: "Okay", value: "okay", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { label: "Bad", value: "bad", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { label: "Awful", value: "awful", color: "bg-red-500/10 text-red-400 border-red-500/20" },
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
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("good");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
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

  const createEntry = async () => {
    if (!user || !title.trim()) return;
    await addDoc(collection(db, "users", user.uid, "journals"), {
      title: title.trim(),
      content: content.trim(),
      mood,
      tags,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    setTitle("");
    setContent("");
    setMood("good");
    setTags([]);
    setShowNew(false);
    fetchEntries();
  };

  const deleteEntry = async (entryId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !confirm("Delete this journal entry?")) return;
    await deleteDoc(doc(db, "users", user.uid, "journals", entryId));
    fetchEntries();
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput("");
  };

  const allTags = Array.from(new Set(entries.flatMap((e) => e.tags || [])));
  const filteredEntries = filter === "all" ? entries : entries.filter((e) => e.mood === filter || (e.tags || []).includes(filter));

  const moodColor = (m: string) => moods.find((mood) => mood.value === m)?.color || "bg-zinc-800 text-zinc-400";

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
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500"
            >
              <HiOutlinePlus className="h-4 w-4" />
              New Entry
            </button>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filter === "all" ? "bg-violet-500/10 text-violet-400" : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
              }`}
            >
              All
            </button>
            {moods.map((m) => (
              <button
                key={m.value}
                onClick={() => setFilter(m.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === m.value ? m.color.replace("/10", "/20") : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
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
                  filter === tag ? "bg-violet-500/10 text-violet-400" : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* Entries */}
          {filteredEntries.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 text-zinc-600">
              <p className="text-sm">No journal entries yet</p>
              <button onClick={() => setShowNew(true)} className="mt-3 text-xs text-violet-400 hover:text-violet-300">
                Write your first entry
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {filteredEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/journal/${entry.id}`}
                  className="group block rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900"
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
                          <span key={tag} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">#{tag}</span>
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

        {/* New Entry Modal */}
        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="animate-fade-in w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-white">New Journal Entry</h3>

              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500/50"
                autoFocus
              />

              <textarea
                placeholder="Write your thoughts..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="mt-3 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500/50"
              />

              <div className="mt-3">
                <p className="mb-2 text-xs text-zinc-500">How are you feeling?</p>
                <div className="flex gap-2">
                  {moods.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMood(m.value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        mood === m.value ? m.color : "border-zinc-800 text-zinc-600 hover:text-zinc-400"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-2 text-xs text-zinc-500">Tags</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-800/30 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500/50"
                  />
                  <button onClick={addTag} className="rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800">Add</button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400">
                        #{tag}
                        <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="text-zinc-600 hover:text-red-400">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => { setShowNew(false); setTitle(""); setContent(""); setTags([]); }}
                  className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={createEntry}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500"
                >
                  Save Entry
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
