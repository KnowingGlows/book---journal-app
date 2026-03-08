"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { format } from "date-fns";
import { HiOutlineArrowLeft, HiOutlineTrash, HiOutlinePencilSquare } from "react-icons/hi2";

const moods = [
  { label: "Great", value: "great", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { label: "Good", value: "good", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  { label: "Okay", value: "okay", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { label: "Bad", value: "bad", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { label: "Awful", value: "awful", color: "bg-red-500/10 text-red-400 border-red-500/20" },
];

interface JournalData {
  title: string;
  content: string;
  mood: string;
  tags: string[];
  createdAt: { toDate: () => Date };
  updatedAt: { toDate: () => Date };
}

export default function JournalDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("good");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const entryRef = user ? doc(db, "users", user.uid, "journals", id as string) : null;

  const fetchEntry = async () => {
    if (!entryRef) return;
    const snap = await getDoc(entryRef);
    if (snap.exists()) {
      const data = snap.data() as JournalData;
      setEntry(data);
      setTitle(data.title);
      setContent(data.content);
      setMood(data.mood);
      setTags(data.tags || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntry();
  }, [user, id]);

  const saveEntry = async () => {
    if (!entryRef) return;
    await updateDoc(entryRef, {
      title: title.trim(),
      content: content.trim(),
      mood,
      tags,
      updatedAt: Timestamp.now(),
    });
    setEditing(false);
    fetchEntry();
  };

  const deleteEntry = async () => {
    if (!entryRef || !confirm("Delete this journal entry?")) return;
    await deleteDoc(entryRef);
    router.push("/journal");
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagInput("");
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

  if (!entry) {
    return (
      <AuthGuard>
        <Sidebar />
        <main className="ml-64 flex min-h-screen items-center justify-center">
          <p className="text-zinc-500">Entry not found</p>
        </main>
      </AuthGuard>
    );
  }

  const moodData = moods.find((m) => m.value === (editing ? mood : entry.mood));

  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 min-h-screen p-8">
        <div className="animate-fade-in max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/journal" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300">
              <HiOutlineArrowLeft className="h-4 w-4" /> Back to Journal
            </Link>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(!editing)}
                className="flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800"
              >
                <HiOutlinePencilSquare className="h-4 w-4" />
                {editing ? "Cancel" : "Edit"}
              </button>
              <button
                onClick={deleteEntry}
                className="flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:border-red-500/30 hover:text-red-400"
              >
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </div>
          </div>

          {editing ? (
            <div className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3 text-lg font-semibold text-zinc-100 outline-none focus:border-violet-500/50"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-800/30 px-4 py-3 text-sm leading-relaxed text-zinc-100 outline-none focus:border-violet-500/50"
              />
              <div>
                <p className="mb-2 text-xs text-zinc-500">Mood</p>
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
              <div>
                <p className="mb-2 text-xs text-zinc-500">Tags</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add tag..."
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
              <button
                onClick={saveEntry}
                className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-500"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <article>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{entry.title}</h1>
                {moodData && (
                  <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${moodData.color}`}>
                    {moodData.label}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-zinc-600">
                  {entry.createdAt?.toDate ? format(entry.createdAt.toDate(), "EEEE, MMMM d, yyyy 'at' h:mm a") : ""}
                </span>
                {entry.updatedAt?.toDate && entry.createdAt?.toDate && entry.updatedAt.toDate().getTime() !== entry.createdAt.toDate().getTime() && (
                  <span className="text-xs text-zinc-700">(edited)</span>
                )}
              </div>
              {(entry.tags || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-500">#{tag}</span>
                  ))}
                </div>
              )}
              <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {entry.content || <span className="text-zinc-600 italic">No content</span>}
              </div>
            </article>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
