"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { HiOutlineArrowLeft, HiOutlineTrash } from "react-icons/hi2";

const moods = [
  { label: "Great", value: "great", color: "bg-[#022c22] text-emerald-400 border-[#064e3b]" },
  { label: "Good", value: "good", color: "bg-[#2e1065] text-violet-400 border-[#4c1d95]" },
  { label: "Okay", value: "okay", color: "bg-[#451a03] text-amber-400 border-[#78350f]" },
  { label: "Bad", value: "bad", color: "bg-[#431407] text-orange-400 border-[#7c2d12]" },
  { label: "Awful", value: "awful", color: "bg-[#450a0a] text-red-400 border-[#7f1d1d]" },
];

export default function JournalDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("good");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const entryRef = user ? doc(db, "users", user.uid, "journals", id as string) : null;

  useEffect(() => {
    if (!entryRef) return;
    getDoc(entryRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTitle(data.title || "");
        setContent(data.content || "");
        setMood(data.mood || "good");
        setTags(data.tags || []);
      }
      setLoading(false);
    });
  }, [user, id]);

  const triggerSave = (updates: { title?: string; content?: string; mood?: string; tags?: string[] }) => {
    if (!entryRef) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaving(true);
    saveTimeout.current = setTimeout(async () => {
      await updateDoc(entryRef, { ...updates, updatedAt: Timestamp.now() });
      setSaving(false);
    }, 800);
  };

  const setAndSaveTitle = (val: string) => { setTitle(val); triggerSave({ title: val, content, mood, tags }); };
  const setAndSaveContent = (val: string) => { setContent(val); triggerSave({ title, content: val, mood, tags }); };
  const setAndSaveMood = (val: string) => { setMood(val); triggerSave({ title, content, mood: val, tags }); };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || tags.includes(tag)) { setTagInput(""); return; }
    const next = [...tags, tag];
    setTags(next);
    setTagInput("");
    triggerSave({ title, content, mood, tags: next });
  };

  const removeTag = (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    triggerSave({ title, content, mood, tags: next });
  };

  const deleteEntry = async () => {
    if (!entryRef || !confirm("Delete this journal entry?")) return;
    await deleteDoc(entryRef);
    router.push("/journal");
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

  return (
    <AuthGuard>
      <Sidebar />
      <main className="ml-64 flex h-screen flex-col bg-[#09090b] p-8">
        <div className="animate-fade-in flex flex-1 flex-col">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <Link href="/journal" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300">
              <HiOutlineArrowLeft className="h-4 w-4" /> Back to Journal
            </Link>
            <div className="flex items-center gap-3">
              {saving && <span className="text-xs text-zinc-600">Saving…</span>}
              <button
                onClick={deleteEntry}
                className="flex items-center gap-2 rounded-xl border border-[#1e1e22] px-3 py-2 text-xs text-zinc-400 hover:border-[#991b1b] hover:text-red-400"
              >
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Title */}
          <input
            type="text"
            placeholder="Give your entry a title..."
            value={title}
            onChange={(e) => setAndSaveTitle(e.target.value)}
            className="w-full border-none bg-transparent text-2xl font-bold text-white placeholder-zinc-700 outline-none"
            autoFocus
          />

          {/* Mood */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {moods.map((m) => (
              <button
                key={m.value}
                onClick={() => setAndSaveMood(m.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  mood === m.value ? m.color : "border-[#1e1e22] text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-lg bg-[#1a1a1e] px-2.5 py-1 text-xs text-zinc-400">
                #{tag}
                <button onClick={() => removeTag(tag)} className="ml-0.5 text-zinc-600 hover:text-red-400">&times;</button>
              </span>
            ))}
            <input
              type="text"
              placeholder="+ add tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              className="w-24 border-none bg-transparent text-xs text-zinc-500 placeholder-zinc-700 outline-none"
            />
          </div>

          {/* Content */}
          <textarea
            placeholder="Start writing..."
            value={content}
            onChange={(e) => setAndSaveContent(e.target.value)}
            className="mt-8 flex-1 w-full resize-none border-none bg-transparent text-[15px] leading-[1.75] text-zinc-200 placeholder-zinc-700 outline-none"
          />
        </div>
      </main>
    </AuthGuard>
  );
}
